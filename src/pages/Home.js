import React, { useState } from "react";
import axios from "axios";

export default function Home() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);

  const processTender = async () => {
    if (!file) {
      alert("Please upload a tender PDF");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const res = await axios.post("/process_tender_pdf", formData);
    setResult(res.data);
  };

  return (
    <div
      style={{
        background: "#e9e1f6",
        padding: 32,
        borderRadius: 18,
      }}
    >
      {/* UPLOAD CARD */}
      <div className="card big-card" style={{ maxWidth: 560, margin: "0 auto" }}>
        <h2 style={{ marginBottom: 20 }}>Upload Your Tender Document</h2>

        <div style={{ marginBottom: 18 }}>
          <div className="small" style={{ marginBottom: 8 }}>
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
        >
          Generate Tender Summary
        </button>
      </div>

      {result && (
        <div className="card" style={{ marginTop: 26 }}>
          <h4>Tender Summary</h4>
          <pre className="small">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
