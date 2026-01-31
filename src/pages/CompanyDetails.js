import React, { useEffect, useState } from "react";
import axios from "axios";

export default function CompanyDetails() {
  const [company, setCompany] = useState({
    name: "", address: "", contact_person: "", email: "", phone: ""
  });
  const [minProfit, setMinProfit] = useState(3);
  const [tender, setTender] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [chosenSuggestion, setChosenSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("tender_result");
    const rec = localStorage.getItem("latest_recommendation");
    const chosen = localStorage.getItem("chosen_suggestion");
    if (t) setTender(JSON.parse(t));
    if (rec) setSuggestions(JSON.parse(rec));
    if (chosen) setChosenSuggestion(JSON.parse(chosen));
  }, []);

  const onChange = (k, v) => setCompany(prev => ({ ...prev, [k]: v }));

  const generateFinal = async () => {
    // validate
    const required = ["name", "address", "contact_person", "email", "phone"];
    for (const r of required) {
      if (!company[r] || company[r].trim() === "") {
        return alert("Please fill: " + r);
      }
    }
    if (!tender || !tender.chosen) return alert("No tender data found.");

    const chosenProduct = tender.chosen.product;
    const pricing = tender.chosen.pricing;
    const suggestions_to_send = suggestions ? (suggestions.suggestions || []) : [];

    const payload = {
      tender_summary: tender.extracted_text,
      chosen_product: chosenProduct,
      pricing: pricing,
      suggestions: suggestions_to_send,
      min_profit_pct: minProfit,
      company: company,
      tender_name: `Auto tender - ${new Date().toLocaleString()}`
    };

    try {
      setLoading(true);
      const resp = await axios.post("/generate_final_pdf", payload, { responseType: "blob" });
      const blob = new Blob([resp.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const fname = `final_tender_${Date.now()}.pdf`;
      a.download = fname;
      a.click();

      // save proposal record to history
      try {
        await axios.post("/save_proposal", {
          tender_name: payload.tender_name,
          chosen_product_name: chosenProduct.name,
          chosen_product_type: chosenProduct.type,
          pricing: pricing,
          quantity: pricing.quantity_litres,
          match_score: tender.chosen.score,
          outcome: "pending",
          proposal_html: "" // optional
        });
      } catch (err) {
        console.warn("Failed to save history:", err);
      }

      alert("Final tender PDF downloaded: " + fname);
    } catch (err) {
      console.error("Generate final PDF error", err);
      alert("Failed to generate final PDF: " + (err?.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 12 }}>
      <h2>Company Details (required)</h2>

      <div style={{ maxWidth: 720 }}>
        <label>Company Name</label><br/>
        <input value={company.name} onChange={(e)=> onChange("name", e.target.value)} style={{ width: "100%", padding: 8 }} />

        <label>Address</label><br/>
        <textarea value={company.address} onChange={(e)=> onChange("address", e.target.value)} style={{ width: "100%", padding: 8 }} rows={3} />

        <label>Contact Person</label><br/>
        <input value={company.contact_person} onChange={(e)=> onChange("contact_person", e.target.value)} style={{ width: "100%", padding: 8 }} />

        <label>Email</label><br/>
        <input value={company.email} onChange={(e)=> onChange("email", e.target.value)} style={{ width: "100%", padding: 8 }} />

        <label>Phone</label><br/>
        <input value={company.phone} onChange={(e)=> onChange("phone", e.target.value)} style={{ width: "100%", padding: 8 }} />

        <div style={{ marginTop: 12 }}>
          <label>Minimum profit % to satisfy: </label>
          <input type="number" value={minProfit} onChange={(e)=> setMinProfit(Number(e.target.value))} style={{ width: 100, marginLeft: 8 }} /> %
        </div>

        <div style={{ marginTop: 14 }}>
          <button onClick={generateFinal} disabled={loading} style={{ padding: "8px 12px" }}>
            {loading ? "Generating..." : "Generate Final Tender PDF (required fields)"}
          </button>
        </div>
      </div>
    </div>
  );
}
