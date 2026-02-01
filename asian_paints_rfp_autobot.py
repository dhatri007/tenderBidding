from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
import csv
import io
import uuid

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PRODUCTS = []
HISTORY = []

@app.get("/")
def health():
    return {"status": "Backend running"}

# ---------------- UPLOAD PRODUCTS ----------------
@app.post("/upload_products")
async def upload_products(file: UploadFile = File(...)):
    global PRODUCTS
    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode()))
    PRODUCTS = [row for row in reader]

    return {
        "message": "Products uploaded successfully",
        "total_products": len(PRODUCTS)
    }

# ---------------- PROCESS TENDER ----------------
@app.post("/process_tender_pdf")
async def process_tender_pdf(file: UploadFile = File(...)):
    tender_id = str(uuid.uuid4())[:8]

    summary = {
        "Tender ID": tender_id,
        "Detected Product": "Exterior Emulsion Paint",
        "Quantity": "800 Litres",
        "Finish": "Matt",
        "Environment": "Exterior"
    }

    best_product = PRODUCTS[0] if PRODUCTS else {
        "name": "Asian Paints Apex Ultima",
        "price_per_litre": "420"
    }

    pricing = {
        "Base Price": 420,
        "Discount": "3%",
        "Final Bid Price": 407,
        "Total Value": 325600
    }

    result = {
        "summary": summary,
        "matched_product": best_product,
        "pricing": pricing
    }

    HISTORY.append(result)
    return result

# ---------------- QUICK PROFILE ----------------
@app.get("/quick_profile")
def quick_profile():
    return {
        "Company Strength": "Strong FMCG brand",
        "Product Coverage": "Interior, Exterior, Waterproofing",
        "Recommendation": "High suitability for tender"
    }

# ---------------- BID RECOMMENDATION ----------------
@app.get("/bid_recommendations")
def bid_recommendations():
    return {
        "Recommended Discount": "3–4%",
        "Expected Win Probability": "72%",
        "Strategy": "Competitive pricing with maintained margin"
    }

# ---------------- GENERATE PROPOSAL ----------------
@app.get("/generate_proposal")
def generate_proposal():
    file_name = "final_tender_proposal.pdf"
    c = canvas.Canvas(file_name, pagesize=A4)
    c.drawString(50, 800, "FINAL TENDER PROPOSAL")
    c.drawString(50, 760, "Company: Asian Paints")
    c.drawString(50, 740, "Recommended Bid: ₹3,25,600")
    c.drawString(50, 720, "Winning Probability: High")
    c.save()

    return {
        "message": "Final proposal generated",
        "file": file_name
    }

# ---------------- DASHBOARD ----------------
@app.get("/dashboard")
def dashboard():
    return {
        "Total Tenders": len(HISTORY),
        "Success Rate": "72%",
        "Processed Today": len(HISTORY)
    }

# ---------------- HISTORY ----------------
@app.get("/history")
def history():
    return HISTORY