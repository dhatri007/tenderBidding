import React, { useEffect, useState } from "react";
import axios from "axios";

export default function TenderResult() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("tender_result");
    if (stored) setData(JSON.parse(stored));
  }, []);

  const requestRecommendation = async () => {
    if (!data || !data.chosen || !data.chosen.product) return alert("No chosen product");
    try {
      setLoading(true);
      const res = await axios.post("/recommend_bid", {
        product_name: data.chosen.product.name,
        quantity: data.quantity_litres,
        baseline_total: data.chosen.pricing.total_cost,
      });
      localStorage.setItem("latest_recommendation", JSON.stringify(res.data.recommendation));
      window.location.href = "/bidding";
    } catch (err) {
      console.error("Recommendation error", err);
      alert("Failed to fetch recommendations");
    } finally {
      setLoading(false);
    }
  };

  const downloadQuickProposal = async () => {
    if (!data) return alert("No data");
    try {
      const res = await axios.post("/generate_proposal_pdf", data, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `proposal_${Date.now()}.pdf`;
      a.click();
    } catch (e) {
      console.error("PDF error", e);
      alert("Could not generate proposal PDF");
    }
  };

  if (!data) return <div style={{ padding: 12 }}>No tender processed yet. Go to Home and upload PDF.</div>;

  const chosen = data.chosen;
  const top = data.top_matches || [];

  return (
    <div style={{ padding: 12 }}>
      <h2>Tender Result</h2>

      <section style={{ marginBottom: 12 }}>
        <h4>Extracted (first 1000 chars)</h4>
        <pre style={{ background: "#f7f7f7", padding: 12, maxHeight: 160, overflow: "auto" }}>{data.extracted_text}</pre>
      </section>

      <section style={{ marginBottom: 12 }}>
        <h4>Top Matches</h4>
        {top.length === 0 && <div>No matches — upload product CSV first.</div>}
        {top.map((m, i) => (
          <div key={i} style={{ border: "1px solid #eee", padding: 10, marginBottom: 8 }}>
            <div style={{ fontWeight: 700 }}>{m.product.name || m.product.Name}</div>
            <div>Score: {m.score}</div>
            <div>Pricing total: {m.pricing?.total_cost}</div>
            <div>Gaps: {m.gaps?.length ? m.gaps.join("; ") : "None"}</div>
          </div>
        ))}
      </section>

      <section style={{ marginBottom: 12 }}>
        <h4>Chosen / Best Match</h4>
        {chosen ? (
          <div style={{ border: "1px solid #ddd", padding: 12 }}>
            <div style={{ fontWeight: 700 }}>{chosen.product.name}</div>
            <div>Match score: {chosen.score}</div>
            <div>Quantity: {data.quantity_litres}</div>
            <div>Pricing total: {chosen.pricing.total_cost}</div>
            <div style={{ marginTop: 12 }}>
              <button onClick={downloadQuickProposal} style={{ marginRight: 8 }}>Download Quick Proposal</button>
              <button onClick={requestRecommendation} disabled={loading}>{loading ? "Loading..." : "View Bid Recommendations"}</button>
              <button onClick={() => window.location.href="/company"} style={{ marginLeft: 8 }}>Enter Company & Generate Final PDF</button>
            </div>
          </div>
        ) : <div>No chosen product</div>}
      </section>
    </div>
  );
}
