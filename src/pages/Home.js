import React, { useState } from "react";
import axios from "axios";

/* 🔗 BACKEND URL (Render) */
const BACKEND_URL = "https://tenderbidding-2.onrender.com";

export default function Home() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  /* 📄 Process Tender PDF */
  const processTender = async () => {
    if (!file) {
      alert("Please upload a tender PDF");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(
        `${BACKEND_URL}/process_tender_pdf`,
        formData
      );

      setResult(res.data);
    } catch (err) {
      alert("Failed to process tender");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* 👤 Quick Profile */
  const viewProfile = async () => {
    const res = await axios.get(`${BACKEND_URL}/quick_profile`);
    alert(JSON.stringify(res.data, null, 2));
  };

  /* 💰 Bid Recommendation */
  const getBidRecommendations = async () => {
    const res = await axios.get(`${BACKEND_URL}/bid_recommendations`);
    alert(JSON.stringify(res.data, null, 2));
  };

  /* 📑 Proposal PDF */
  const generateProposal = async () => {
    const res = await axios.get(`${BACKEND_URL}/generate_proposal_pdf`);
    alert(res.data.message);
  };

  return (
    <div style={{ padding: 32 }}>
      {/* UPLOAD CARD */}
      <div
        style={{
          maxWidth: 650,
          margin: "0 auto",
          background: "#f3eef9",
          padding: 32,
          borderRadius: 18,
          boxShadow: "0 12px 32px rgba(0,0,0,0.15)",
        }}
      >
        <h2 style={{ marginBottom: 20 }}>
          Upload Your Tender Document
        </h2>

        <div style={{ marginBottom: 18 }}>
          <div className="small" style={{ marginBottom: 6 }}>
            Browse Tender PDF
          </div>
          <input
            type="file"
            className="input"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </div>

        <button
          className="button"
          style={{ width: "50%", marginTop: 12 }}
          onClick={processTender}
          disabled={loading}
        >
          {loading ? "Processing..." : "Generate Tender Summary"}
        </button>
      </div>

      {/* SUMMARY SECTION */}
      {result && (
        <>
          <div
            className="card"
            style={{
              marginTop: 36,
              maxWidth: 900,
              marginInline: "auto",
            }}
          >
            <h3 style={{ marginBottom: 12 }}>
              Tender Summary
            </h3>

            <div
              style={{
                background: "#faf9ff",
                border: "1px solid #ddd",
                padding: 16,
                borderRadius: 12,
                whiteSpace: "pre-wrap",
                fontSize: 14,
                overflowWrap: "break-word",
                lineHeight: 1.6,
              }}
            >
              {JSON.stringify(result.summary || result, null, 2)}
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div
            style={{
              display: "flex",
              gap: 16,
              justifyContent: "center",
              marginTop: 28,
              flexWrap: "wrap",
            }}
          >
            <button className="button secondary" onClick={viewProfile}>
              View Quick Profile Summary
            </button>

            <button className="button secondary" onClick={getBidRecommendations}>
              Get Bid Recommendations
            </button>

            <button className="button" onClick={generateProposal}>
              Generate Final Proposal PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}