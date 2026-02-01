import React, { useState } from "react";
import axios from "axios";

const API = "https://tenderbidding-4.onrender.com";

export default function Home() {
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);

  const process = async () => {
    const form = new FormData();
    form.append("file", file);
    const res = await axios.post(`${API}/process_tender_pdf`, form);
    setData(res.data);
  };

  return (
    <div style={{ padding: 40 }}>
      <h2>Upload Tender</h2>
      <input type="file" onChange={e => setFile(e.target.files[0])} />
      <br /><br />
      <button onClick={process}>Generate Tender Summary</button>

      {data && (
        <div style={{ marginTop: 30 }}>
          <h3>Summary</h3>
          <p><b>Product:</b> {data.summary["Detected Product"]}</p>
          <p><b>Quantity:</b> {data.summary["Quantity"]}</p>

          <button onClick={() => window.open(`${API}/quick_profile`)}>
            View Quick Profile
          </button>

          <button onClick={() => window.open(`${API}/bid_recommendations`)}>
            Get Bid Recommendation
          </button>

          <button onClick={() => window.open(`${API}/generate_proposal`)}>
            Generate Final Proposal PDF
          </button>
        </div>
      )}
    </div>
  );
}