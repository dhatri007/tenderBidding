import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Dashboard() {
  const [proposals, setProposals] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=> {
    const fetch = async () => {
      try {
        const res = await axios.get("/list_proposals");
        setProposals(res.data.proposals || []);
      } catch (err) {
        console.error("Dashboard load error", err);
        setProposals([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <div style={{ padding:12 }}>Loading dashboard...</div>;

  return (
    <div style={{ padding: 12 }}>
      <h2>Dashboard — Recent Proposals</h2>
      {(!proposals || proposals.length === 0) && <div>No proposals saved yet.</div>}
      {proposals && proposals.map(p => (
        <div key={p.id} style={{ border: "1px solid #eee", padding: 10, marginBottom: 8 }}>
          <div style={{ fontWeight:700 }}>{p.tender_name || "(no name)"}</div>
          <div>Product: {p.chosen_product_name} ({p.chosen_product_type})</div>
          <div>Match score: {p.match_score}</div>
          <div>Quantity: {p.quantity}</div>
          <div>Saved: {new Date(p.timestamp).toLocaleString()}</div>
          <div>Status: {p.outcome}</div>
        </div>
      ))}
    </div>
  );
}
