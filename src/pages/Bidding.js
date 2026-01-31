import React, { useEffect, useState } from "react";

export default function Bidding() {
  const [rec, setRec] = useState(null);
  const [tender, setTender] = useState(null);
  const [minProfit, setMinProfit] = useState(3); // default 3%
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const r = localStorage.getItem("latest_recommendation");
    const t = localStorage.getItem("tender_result");
    if (r) setRec(JSON.parse(r));
    if (t) setTender(JSON.parse(t));
  }, []);

  useEffect(() => {
    if (rec && rec.suggestions) {
      // choose best that meets minProfit
      const candidates = rec.suggestions.filter(s => (s.profit_margin_pct || 0) >= Number(minProfit));
      const pool = candidates.length ? candidates : rec.suggestions;
      const best = pool.reduce((a,b) => (a.expected_win_prob > b.expected_win_prob ? a : b), pool[0]);
      setSelected(best);
    }
  }, [rec, minProfit]);

  if (!rec) return <div style={{ padding: 12 }}>No recommendations available. From Tender Result click "View Bid Recommendations".</div>;

  return (
    <div style={{ padding: 12 }}>
      <h2>Bid Recommendations</h2>

      <div style={{ marginBottom: 12 }}>
        <label>Minimum acceptable profit % (threshold): </label>
        <input type="number" value={minProfit} onChange={(e)=> setMinProfit(Number(e.target.value))} style={{ width: 80, marginLeft: 8 }} /> %
        <div style={{ color: "#666", fontSize: 12, marginTop: 6 }}>System will choose highest win-prob among suggestions that meet this profit threshold. If none meet it, best overall suggestion is selected.</div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ background: "#f7f7f7" }}>
          <tr>
            <th style={{ border: "1px solid #ddd", padding: 8 }}>Discount %</th>
            <th style={{ border: "1px solid #ddd", padding: 8 }}>Per Litre</th>
            <th style={{ border: "1px solid #ddd", padding: 8 }}>Total</th>
            <th style={{ border: "1px solid #ddd", padding: 8 }}>Profit %</th>
            <th style={{ border: "1px solid #ddd", padding: 8 }}>Win Prob</th>
          </tr>
        </thead>
        <tbody>
          {rec.suggestions.map((s, idx) => (
            <tr key={idx} style={{ background: selected === s ? "#e7f7e7" : "white" }}>
              <td style={{ border: "1px solid #ddd", padding: 8 }}>{s.discount_pct}%</td>
              <td style={{ border: "1px solid #ddd", padding: 8 }}>{s.per_litre}</td>
              <td style={{ border: "1px solid #ddd", padding: 8 }}>{s.total}</td>
              <td style={{ border: "1px solid #ddd", padding: 8 }}>{s.profit_margin_pct}%</td>
              <td style={{ border: "1px solid #ddd", padding: 8 }}>{s.expected_win_prob}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 12 }}>
        <strong>Selected (based on threshold):</strong>
        {selected ? (
          <div style={{ marginTop: 8 }}>
            <div>Discount: {selected.discount_pct}%</div>
            <div>Per Litre: {selected.per_litre}</div>
            <div>Total: {selected.total}</div>
            <div>Expected win probability: {selected.expected_win_prob}</div>

            <div style={{ marginTop: 10 }}>
              <button onClick={() => {
                // store chosen suggestion so company page knows
                localStorage.setItem("chosen_suggestion", JSON.stringify(selected));
                window.location.href = "/company";
              }}>Proceed to Company Details & Generate Final PDF</button>
            </div>
          </div>
        ) : <div>No suggestion selected</div>}
      </div>
    </div>
  );
}
