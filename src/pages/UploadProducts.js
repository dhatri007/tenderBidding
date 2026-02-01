import React, { useState } from "react";
import axios from "axios";

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL ||
  "https://tenderbidding-2.onrender.com";

export default function UploadProducts() {
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");

  const uploadCSV = async () => {
    if (!file) {
      alert("Please select a CSV file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(
        `${BACKEND_URL}/upload_products`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setMsg(
        `✅ ${res.data.count} products uploaded successfully`
      );
    } catch (err) {
      console.error(err);
      setMsg("❌ Upload failed. Check backend.");
    }
  };

  return (
    <div className="card" style={{ maxWidth: 600, margin: "0 auto" }}>
      <h3>Upload Products CSV</h3>

      <input
        type="file"
        accept=".csv"
        className="input"
        onChange={(e) => setFile(e.target.files[0])}
        style={{ marginBottom: 12 }}
      />

      <button className="button" onClick={uploadCSV}>
        Upload Products
      </button>

      {msg && (
        <div style={{ marginTop: 16 }} className="small">
          {msg}
        </div>
      )}
    </div>
  );
}