# asian_paints_rfp_autobot.py
# Full backend: PDF extraction, matching, bidding suggestions, final PDF generation, history.
# Save as /Users/apple/Documents/asian_paints_rfp_autobot/asian_paints_rfp_autobot.py

import io
import os
import re
import json
import random
from datetime import datetime
from typing import List, Dict, Any

import fitz  # PyMuPDF
import pandas as pd
from fastapi import FastAPI, UploadFile, File, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer
from reportlab.lib.styles import getSampleStyleSheet

# -------------------------
# Config & storage
# -------------------------
APP_DIR = os.path.abspath(os.path.dirname(__file__))
PRODUCTS_FILE = os.path.join(APP_DIR, "products.json")
PROPOSALS_FILE = os.path.join(APP_DIR, "proposals.json")

app = FastAPI(title="Asian Paints RFP Autobot - Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev only; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------
# Helpers for persistent data
# -------------------------
def load_json(path):
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

products_db: List[Dict[str, Any]] = load_json(PRODUCTS_FILE)
proposals_db: List[Dict[str, Any]] = load_json(PROPOSALS_FILE)

# -------------------------
# Utilities: text extraction, parsing, normalization
# -------------------------
def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text
    except Exception as e:
        raise RuntimeError(f"PDF parse failed: {e}")

def extract_quantity_litres(text: str) -> int:
    # try common patterns: "8000 Litres", "Qty: 8000", "Quantity 8000 L"
    text = text or ""
    m = re.search(r"(\d{2,7}(?:[, ]\d{3})*)\s*(?:litres|litre|ltr|ltrs|l)\b", text, re.I)
    if m:
        try:
            return int(m.group(1).replace(",", "").replace(" ", ""))
        except:
            pass
    m2 = re.search(r"(?:qty|quantity)\s*[:\-]?\s*(\d{2,7})", text, re.I)
    if m2:
        try:
            return int(m2.group(1))
        except:
            pass
    return 0

def normalize_str(s):
    if s is None:
        return ""
    return str(s).strip().lower()

# -------------------------
# Matching logic
# -------------------------
def score_product_against_tender(product: Dict[str, Any], tender_text: str) -> float:
    tender = (tender_text or "").lower()
    score = 0.0
    weights = {"type":0.4, "finish":0.2, "voc":0.15, "coverage":0.25}
    # Type
    p_type = normalize_str(product.get("type") or product.get("Type"))
    if p_type and p_type in tender:
        score += weights["type"]
    # Finish
    p_finish = normalize_str(product.get("finish") or product.get("Finish"))
    if p_finish and p_finish in tender:
        score += weights["finish"]
    # VOC
    p_voc = normalize_str(product.get("voc") or product.get("VOC"))
    if p_voc and p_voc in tender:
        score += weights["voc"]
    # Coverage approximate matching
    m = re.search(r"coverage[:\s]*([0-9]{2,4})", tender)
    if not m:
        m = re.search(r"([0-9]{2,4})\s*(?:sqft|sq ft|sqf|sqm|sq m|sq\.ft|sq\.m)", tender)
    if m:
        try:
            tender_cov = float(m.group(1))
            p_cov = float(product.get("coverage", product.get("Coverage", 0) or 0))
            if p_cov > 0:
                # coverage score 0..1 depending on closeness
                maxc = max(tender_cov, p_cov, 1.0)
                cov_score = max(0.0, 1.0 - (abs(tender_cov - p_cov) / maxc))
                score += weights["coverage"] * cov_score
        except:
            pass
    return min(1.0, score)

def compute_gaps(product: Dict[str, Any], tender_text: str) -> List[str]:
    gaps = []
    tender = (tender_text or "").lower()
    # finish requirement detection
    req_finish = None
    for f in ["matte","smooth","satin","gloss","semi-gloss","semi gloss"]:
        if f in tender:
            req_finish = f
            break
    p_finish = normalize_str(product.get("finish") or product.get("Finish"))
    if req_finish and p_finish and req_finish not in p_finish:
        gaps.append(f"Finish mismatch: tender requires '{req_finish}', product has '{p_finish}'")
    # VOC
    req_voc = None
    for v in ["ultra-low","ultra low","low","medium","high"]:
        if v in tender:
            req_voc = v
            break
    p_voc = normalize_str(product.get("voc") or product.get("VOC"))
    if req_voc and p_voc and req_voc not in p_voc:
        gaps.append(f"VOC mismatch: tender requires '{req_voc}', product has '{p_voc}'")
    # coverage
    m = re.search(r"([0-9]{2,4})\s*(?:sqft|sq ft|sqf|sqm|sq m|sq\.ft|sq\.m)", tender)
    if m:
        try:
            tender_cov = float(m.group(1))
            p_cov = float(product.get("coverage", product.get("Coverage", 0) or 0))
            if p_cov <= 0:
                gaps.append("Product coverage not specified")
            else:
                diff_pct = abs(tender_cov - p_cov) / max(tender_cov, p_cov)
                if diff_pct > 0.15:
                    gaps.append(f"Coverage diff: tender {tender_cov} vs product {p_cov} ({(diff_pct*100):.1f}%)")
        except:
            pass
    return gaps

# -------------------------
# Pricing & recommendations
# -------------------------
LOGISTICS_BY_CITY = {
    "bengaluru": 18.0, "bangalore": 18.0, "delhi": 30.0,
    "mumbai": 25.0, "hyderabad": 20.0, "chennai": 22.0, "kolkata": 28.0
}
GST_PERCENT = 18.0

def estimate_pricing_for_product(product: Dict[str,Any], quantity_litres: int, tender_city: str = None) -> Dict[str,Any]:
    # find base price key
    base_price = None
    for k in ["price_per_litre","price_per_ltr","price_per_l","price","price_per_litre_inr"]:
        if k in product:
            try:
                base_price = float(product[k])
                break
            except:
                pass
    if base_price is None:
        base_price = float(product.get("price", 0) or 0)
    logistics = LOGISTICS_BY_CITY.get((tender_city or "").strip().lower(), None)
    if logistics is None:
        logistics = round(base_price * 0.05, 2) if base_price>0 else 20.0
    tax_amount = round(base_price * (GST_PERCENT/100.0), 2)
    final_per_l = round(base_price + logistics + tax_amount, 2)
    # simple volume discounts
    discount_pct = 0.0
    if quantity_litres and quantity_litres >= 2000:
        discount_pct = 2.0
    discounted_price_per_l = round(final_per_l * (1 - discount_pct/100.0), 2)
    total_cost = round(discounted_price_per_l * (quantity_litres or 0), 2)
    return {
        "base_price": round(base_price,2),
        "logistics": round(logistics,2),
        "tax": tax_amount,
        "final_per_l_before_discount": final_per_l,
        "discount_pct": discount_pct,
        "final_per_l_after_discount": discounted_price_per_l,
        "quantity_litres": quantity_litres or 0,
        "total_cost": total_cost
    }

def compute_win_probability(score: float, price_competitiveness: float, historical_win_rate: float) -> float:
    # weighted combination with small randomness
    w_score = 0.5; w_price = 0.3; w_hist = 0.2
    prob = w_score*score + w_price*price_competitiveness + w_hist*historical_win_rate
    prob = prob * 0.95 + random.uniform(0,0.05)
    return max(0.0, min(1.0, prob))

def recommend_bid_price(product: Dict[str,Any], tender_quantity: int, baseline_total: float) -> Dict[str,Any]:
    pricing = estimate_pricing_for_product(product, tender_quantity)
    our_final_per_l = pricing["final_per_l_after_discount"]
    our_total = pricing["total_cost"]
    # price competitiveness: compare to baseline total (if any)
    price_competitiveness = 0.5
    if baseline_total > 0:
        ratio = our_total / float(baseline_total)
        if ratio <= 1.0:
            price_competitiveness = 0.7 + 0.3*(1.0 - ratio)
        else:
            price_competitiveness = max(0.0, 0.7 - 0.7*(ratio - 1.0))
    # historical simple estimate
    hist_same = [p for p in proposals_db if p.get("chosen_product_name")==product.get("name")]
    hist_type = [p for p in proposals_db if p.get("chosen_product_type")==product.get("type")]
    hist_rate_same = sum(1 for p in hist_same if p.get("outcome")=="win") / (len(hist_same) or 1)
    hist_rate_type = sum(1 for p in hist_type if p.get("outcome")=="win") / (len(hist_type) or 1)
    historical_win_rate = (hist_rate_same*0.6 + hist_rate_type*0.4)
    base_score = 0.6  # baseline if product matches
    prob_now = compute_win_probability(base_score, price_competitiveness, historical_win_rate)
    # suggestions at different discounts
    suggestion = []
    for d in [0.0, 1.0, 2.0, 3.0, 5.0]:
        suggested_per_l = round(our_final_per_l * (1 - d/100.0),2)
        suggested_total = round(suggested_per_l * tender_quantity,2)
        base_price = pricing.get("base_price") or 0.0
        profit_margin_pct = 0.0
        if base_price > 0:
            profit_margin_pct = round(((suggested_per_l - base_price) / base_price) * 100.0, 2)
        # compute competitiveness proxy
        if baseline_total>0:
            ratio2 = suggested_total / float(baseline_total)
            if ratio2 <= 1.0:
                pc2 = 0.7 + 0.3*(1.0 - ratio2)
            else:
                pc2 = max(0.0, 0.7 - 0.7*(ratio2 - 1.0))
        else:
            pc2 = price_competitiveness
        prob2 = compute_win_probability(base_score, pc2, historical_win_rate)
        suggestion.append({
            "discount_pct": d,
            "per_litre": suggested_per_l,
            "total": suggested_total,
            "expected_win_prob": round(prob2,3),
            "profit_margin_pct": profit_margin_pct
        })
    return {"current": {"per_litre": our_final_per_l, "total": our_total, "expected_win_prob": round(prob_now,3)},
            "suggestions": suggestion,
            "historical_win_rate": round(historical_win_rate,3),
            "pricing_base": pricing}

def select_best_bid_by_threshold(suggestions: List[Dict[str,Any]], base_price: float, min_profit_pct: float) -> Dict[str,Any]:
    # filter suggestions meeting min_profit_pct
    filtered = []
    for s in suggestions:
        pm = s.get("profit_margin_pct")
        if pm is None and base_price>0:
            pm = round(((s.get("per_litre") - base_price) / base_price) * 100.0, 2)
            s["profit_margin_pct"] = pm
        if pm is None:
            pm = 0.0
            s["profit_margin_pct"] = pm
        if pm >= min_profit_pct:
            filtered.append(s)
    candidates = filtered if len(filtered)>0 else suggestions
    best = max(candidates, key=lambda x: x.get("expected_win_prob", 0.0))
    return best

# -------------------------
# PDF builders (ReportLab)
# -------------------------
def build_aligned_pdf_bytes(title: str, tender_summary: str, chosen_product: Dict[str,Any], pricing: Dict[str,Any], chosen_suggestion: Dict[str,Any], company: Dict[str,Any]=None) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=18*mm, leftMargin=18*mm, topMargin=18*mm, bottomMargin=18*mm)
    styles = getSampleStyleSheet()
    elems = []
    elems.append(Paragraph(title or "Tender Proposal", styles['Title']))
    elems.append(Spacer(1,6))
    elems.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}", styles['Normal']))
    elems.append(Spacer(1,8))

    # Company details if present
    if company:
        elems.append(Paragraph("<b>Company Details</b>", styles['Heading3']))
        comp_rows = [
            ["Company", company.get("name","(not provided)")],
            ["Address", company.get("address","(not provided)")],
            ["Contact", company.get("contact_person","(not provided)")],
            ["Email", company.get("email","(not provided)")],
            ["Phone", company.get("phone","(not provided)")],
        ]
        t = Table(comp_rows, colWidths=[45*mm, 120*mm])
        t.setStyle(TableStyle([('GRID',(0,0),(-1,-1),0.25,colors.grey), ('BACKGROUND',(0,0),(1,0),colors.lightgrey)]))
        elems.append(t)
        elems.append(Spacer(1,8))

    elems.append(Paragraph("<b>Tender Summary (Extracted)</b>", styles['Heading3']))
    excerpt = (tender_summary or "")[:4000]
    elems.append(Paragraph(excerpt.replace("\n", "<br/>"), styles['Normal']))
    elems.append(Spacer(1,8))

    elems.append(Paragraph("<b>Selected Product & Tech Details</b>", styles['Heading3']))
    prod_rows = [
        ["Field","Value"],
        ["Name", chosen_product.get("name") or chosen_product.get("Name","")],
        ["Type", chosen_product.get("type") or chosen_product.get("Type","")],
        ["Finish", chosen_product.get("finish") or chosen_product.get("Finish","")],
        ["VOC", chosen_product.get("voc") or chosen_product.get("VOC","")],
        ["Pack", str(chosen_product.get("pack") or chosen_product.get("Pack",""))],
        ["Coverage", str(chosen_product.get("coverage") or chosen_product.get("Coverage","N/A"))],
    ]
    pt = Table(prod_rows, colWidths=[45*mm, 120*mm])
    pt.setStyle(TableStyle([('GRID',(0,0),(-1,-1),0.25,colors.grey), ('BACKGROUND',(0,0),(1,0),colors.lightgrey)]))
    elems.append(pt)
    elems.append(Spacer(1,8))

    elems.append(Paragraph("<b>Commercial Bid - Selected</b>", styles['Heading3']))
    bid_rows = [
        ["Discount %", chosen_suggestion.get("discount_pct")],
        ["Per Litre (final)", chosen_suggestion.get("per_litre")],
        ["Quantity (L)", pricing.get("quantity_litres")],
        ["Total", chosen_suggestion.get("total")],
        ["Expected Win Probability", chosen_suggestion.get("expected_win_prob")],
        ["Profit Margin % (approx)", chosen_suggestion.get("profit_margin_pct")],
    ]
    bt = Table(bid_rows, colWidths=[70*mm, 90*mm])
    bt.setStyle(TableStyle([('GRID',(0,0),(-1,-1),0.25,colors.grey), ('BACKGROUND',(0,0),(1,0),colors.lightgrey)]))
    elems.append(bt)
    elems.append(Spacer(1,12))

    elems.append(Paragraph("<b>Declaration & Terms</b>", styles['Heading3']))
    decls = [
        "Prices are valid for 30 days from submission.",
        "Delivery as per tender schedule; lead time to be confirmed post-order.",
        "Payment terms: as per tender / negotiated.",
        "This document is auto-generated."
    ]
    for d in decls:
        elems.append(Paragraph(d, styles['Normal']))
    elems.append(Spacer(1,18))
    elems.append(Paragraph(f"For: {company.get('name') if company else '___________________'}", styles['Normal']))
    elems.append(Spacer(1,18))
    elems.append(Paragraph("Authorized Signatory: ____________________", styles['Normal']))

    doc.build(elems)
    buf.seek(0)
    return buf.read()

# -------------------------
# Endpoints
# -------------------------
@app.get("/")
async def root():
    return {"message":"Backend running"}

@app.post("/upload_products")
async def upload_products(file: UploadFile = File(...)):
    global products_db
    content = await file.read()
    # parse CSV using pandas
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV parse error: {e}")
    records = []
    for r in df.to_dict(orient="records"):
        rec = {}
        for k,v in r.items():
            rec_key = str(k).strip()
            rec[rec_key] = v
            rec[rec_key.lower()] = v
        records.append(rec)
    products_db = records
    save_json(PRODUCTS_FILE, products_db)
    return {"message":"Products uploaded", "count": len(products_db)}

@app.get("/list_products")
async def list_products():
    return {"products": products_db}

@app.post("/process_tender_pdf")
async def process_tender_pdf(file: UploadFile = File(...)):
    pdf_bytes = await file.read()
    try:
        text = extract_text_from_pdf_bytes(pdf_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    quantity = extract_quantity_litres(text) or 0
    # scoring
    scored = []
    for p in products_db:
        try:
            sc = score_product_against_tender(p, text)
            scored.append((sc, p))
        except Exception:
            continue
    scored.sort(key=lambda x: x[0], reverse=True)
    top_matches = []
    for score_val, product in scored[:6]:
        gaps = compute_gaps(product, text)
        pricing = estimate_pricing_for_product(product, quantity)
        top_matches.append({"product": product, "score": round(score_val,3), "gaps": gaps, "pricing": pricing})
    chosen = top_matches[0] if top_matches else None
    # create simple proposal_html placeholder
    proposal_html = ""
    if chosen:
        proposal_html = f"Auto-proposal for {chosen['product'].get('name','')}"
    return {
        "extracted_text": text[:8000],
        "quantity_litres": quantity,
        "top_matches": top_matches,
        "chosen": chosen,
        "proposal_html": proposal_html
    }

@app.post("/recommend_bid")
async def recommend_bid(payload: Dict[str,Any] = Body(...)):
    product_name = payload.get("product_name")
    quantity = int(payload.get("quantity", 0) or 0)
    baseline_total = float(payload.get("baseline_total", 0) or 0)
    if not product_name:
        raise HTTPException(status_code=400, detail="product_name required")
    product = None
    for p in products_db:
        if normalize_str(p.get("name","")) == normalize_str(product_name):
            product = p
            break
    if not product:
        # fallback: match by startswith or contains
        for p in products_db:
            if product_name.lower() in (p.get("name","") or "").lower():
                product = p
                break
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    rec = recommend_bid_price(product, quantity, baseline_total)
    return {"recommendation": rec}

@app.post("/generate_proposal_pdf")
async def generate_proposal_pdf(payload: Dict[str,Any] = Body(...)):
    """
    Quick proposal generator, used by TenderResult download button.
    payload expected to be the tender result object from /process_tender_pdf
    """
    try:
        tender_summary = payload.get("extracted_text", "")
        chosen = payload.get("chosen")
        if not chosen:
            raise HTTPException(status_code=400, detail="No chosen product in payload")
        chosen_product = chosen.get("product")
        pricing = chosen.get("pricing", {})
        # choose a suggestion automatically (no discounts here)
        suggestion = {
            "discount_pct": pricing.get("discount_pct", 0),
            "per_litre": pricing.get("final_per_l_after_discount"),
            "total": pricing.get("total_cost"),
            "expected_win_prob": 0.5,
            "profit_margin_pct": round(((pricing.get("final_per_l_after_discount") - pricing.get("base_price",0)) / (pricing.get("base_price",1) or 1))*100,2)
        }
        pdf_bytes = build_aligned_pdf_bytes("Auto Proposal", tender_summary, chosen_product, pricing, suggestion, company=None)
        return StreamingResponse(io.BytesIO(pdf_bytes), media_type="application/pdf",
                                 headers={"Content-Disposition": f"attachment; filename=proposal_{int(datetime.now().timestamp())}.pdf"})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate_final_pdf")
async def generate_final_pdf(payload: Dict[str,Any] = Body(...)):
    """
    Full final PDF generator. Requires company fields (Option A).
    Expects:
    {
      tender_summary: str,
      chosen_product: {...},
      pricing: {...},
      suggestions: [...],  # optional
      min_profit_pct: float,
      company: {name, address, contact_person, email, phone},
      tender_name: str (optional)
    }
    """
    try:
        tender_summary = payload.get("tender_summary","")
        chosen_product = payload.get("chosen_product") or {}
        pricing = payload.get("pricing") or {}
        suggestions = payload.get("suggestions") or []
        min_profit_pct = float(payload.get("min_profit_pct", 0) or 0)
        company = payload.get("company") or {}
        tender_name = payload.get("tender_name", None)

        # validate company details (Option A required)
        required = ["name","address","contact_person","email","phone"]
        for r in required:
            if not company.get(r):
                raise HTTPException(status_code=400, detail=f"Company field required: {r}")

        # ensure suggestions exist server-side (if not provided)
        if not suggestions:
            # compute suggestions from chosen_product name
            product_name = chosen_product.get("name") or chosen_product.get("Name")
            product = None
            for p in products_db:
                if normalize_str(p.get("name","")) == normalize_str(product_name):
                    product = p
                    break
            if not product:
                raise HTTPException(status_code=400, detail="Product not found for suggestion generation")
            rec = recommend_bid_price(product, pricing.get("quantity_litres",0), pricing.get("total_cost",0))
            suggestions = rec.get("suggestions", [])
            base_pricing = rec.get("pricing_base", pricing)
        else:
            base_pricing = pricing

        base_price = base_pricing.get("base_price", pricing.get("base_price", 0.0) or 0.0)
        best = select_best_bid_by_threshold(suggestions, base_price, float(min_profit_pct or 0.0))

        pdf_bytes = build_aligned_pdf_bytes(tender_name or "Final Tender Submission", tender_summary, chosen_product, base_pricing, best, company)
        return StreamingResponse(io.BytesIO(pdf_bytes), media_type="application/pdf",
                                 headers={"Content-Disposition": f"attachment; filename=final_tender_{int(datetime.now().timestamp())}.pdf"})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/save_proposal")
async def save_proposal(payload: Dict[str,Any] = Body(...)):
    global proposals_db
    rec = {
        "id": int(datetime.now().timestamp()*1000),
        "timestamp": datetime.now().isoformat(),
        "tender_name": payload.get("tender_name"),
        "chosen_product_name": payload.get("chosen_product_name"),
        "chosen_product_type": payload.get("chosen_product_type"),
        "pricing": payload.get("pricing"),
        "quantity": payload.get("quantity"),
        "match_score": payload.get("match_score"),
        "outcome": payload.get("outcome", "pending"),
        "proposal_html": payload.get("proposal_html"),
    }
    proposals_db.insert(0, rec)
    save_json(PROPOSALS_FILE, proposals_db)
    return {"message":"Saved", "id": rec["id"]}

@app.get("/list_proposals")
async def list_proposals():
    return {"proposals": proposals_db}

# -------------------------
# End of file
# -------------------------
@app.get("/quick_profile")
def quick_profile():
    return {
        "company": "Asian Paints",
        "category": "FMCG - Paints",
        "strengths": ["Wide product range", "Strong logistics", "Brand trust"],
        "experience": "20+ years in government & B2B tenders"
    }


@app.get("/bid_recommendations")
def bid_recommendations():
    return {
        "recommended_bid_price": "₹12.5 Crores",
        "margin": "14%",
        "win_probability": "78%",
        "strategy": "Competitive pricing with volume discount"
    }


@app.get("/generate_proposal_pdf")
def generate_proposal_pdf():
    return {
        "status": "success",
        "message": "Final proposal PDF generated (demo mode)"
    }