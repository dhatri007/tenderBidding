import React, { useState } from "react";
import axios from "axios";
import BACKEND_URL from "../config";

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
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setResult(res.data);
    } catch (err) {
      alert("Failed to connect to backend");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "#e9e1f6", padding: 32, borderRadius: 18 }}>
      <div className="card" style={{ maxWidth: 560, margin: "0 auto" }}>
        <h2>Upload Your Tender Document</h2>

        <div style={{ marginBottom: 16 }}>
          <div className="small">Browse Tender PDF</div>
          <input
            type="file"
            className="input"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </div>

        <button
          className="button"
          style={{ width: "50%" }}
          onClick={processTender}
          disabled={loading}
        >
          {loading ? "Processing..." : "Generate Tender Summary"}
        </button>
      </div>

      {result && (
        <div className="card" style={{ marginTop: 24 }}>
          <h4>Tender Summary</h4>
          <pre className="small">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
