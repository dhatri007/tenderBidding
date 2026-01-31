import React, { useEffect, useState } from "react";
import axios from "axios";

export default function History() {
  const [proposals, setProposals] = useState(null);

  useEffect(()=> {
    const load = async () => {
      try {
        const res = await axios.get("/list_proposals");
        setProposals(res.data.proposals || []);
      } catch (err) {
        console.error("History load err", err);
        setProposals([]);
      }
    };
    load();
  }, []);

  return (
    <div style={{ padding:12 }}>
      <h2>Proposal History</h2>
      {!proposals && <div>Loading...</div>}
      {proposals && proposals.length === 0 && <div>No history yet.</div>}
      {proposals && proposals.map(p => (
        <div key={p.id} style={{ border: "1px solid #eee", padding: 10, marginBottom: 8 }}>
          <div style={{ fontWeight:700 }}>{p.tender_name}</div>
          <div>Product: {p.chosen_product_name}</div>
          <div>Saved: {new Date(p.timestamp).toLocaleString()}</div>
          <div>Status: {p.outcome}</div>
        </div>
      ))}
    </div>
  );
}
