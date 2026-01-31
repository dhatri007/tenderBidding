import React, { useState } from "react";
import axios from "axios";

export default function UploadProducts() {
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");

  const upload = async () => {
    if (!file) return alert("Choose CSV file first");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await axios.post("/upload_products", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setMsg(`Uploaded ${res.data.count} products`);
    } catch (err) {
      console.error("Upload products err", err);
      setMsg("Upload failed");
    }
  };

  return (
    <div style={{ padding: 12 }}>
      <h2>Upload Products CSV</h2>
      <p>CSV columns: name,type,finish,pack,coverage,price_per_litre, etc.</p>
      <input type="file" accept=".csv" onChange={(e)=> setFile(e.target.files[0])} />
      <div style={{ marginTop: 8 }}>
        <button onClick={upload}>Upload</button>
      </div>
      {msg && <div style={{ marginTop: 8 }}>{msg}</div>}
    </div>
  );
}
