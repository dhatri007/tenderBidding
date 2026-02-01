import React, { useState } from "react";
import axios from "axios";

/**
 * Backend URL
 * - Uses deployed backend in production
 * - Falls back to localhost during local development
 */
const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL ||
  "https://tenderbidding-2.onrender.com";

export default function Home() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const processTender = async () => {
    if (!file) {
      alert("Please upload a tender PDF");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);

      const res = await axios.post(
        `${BACKEND_URL}/process_tender_pdf`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setResult(res.data);
    } catch (error) {
      console.error("Tender processing failed:", error);
      alert("Failed to process tender. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      {/* UPLOAD CARD */}
      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          background: "#f3eef9",
          padding: 28,
          borderRadius: 16,
          boxShadow: "0 12px 30px rgba(0,0,0,0.15)",
        }}
      >
        <h2 style={{ marginBottom: 16 }}>
          Upload Your Tender Document
        </h2>

        <div style={{ marginBottom: 16 }}>
          <label className="small">Browse Tender PDF</label>
          <input
            type="file"
            className="input"
            style={{ marginTop: 6 }}
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

      {/* SUMMARY */}
      {result && (
        <>
          <div
            className="card"
            style={{
              marginTop: 32,
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
            <button className="button secondary">
              View Quick Profile Summary
            </button>

            <button className="button secondary">
              Get Bid Recommendations
            </button>

            <button className="button">
              Generate Final Proposal PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}
