import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Products() {
  const [products, setProducts] = useState([]);

  useEffect(()=> {
    const load = async () => {
      try {
        const res = await axios.get("/list_products");
        setProducts(res.data.products || []);
      } catch (err) {
        console.error("Products load", err);
        setProducts([]);
      }
    };
    load();
  }, []);

  return (
    <div style={{ padding:12 }}>
      <h2>Products</h2>
      {products.length === 0 && <div>No products uploaded yet. Use Upload Products.</div>}
      {products.map((p, i)=> (
        <div key={i} style={{ border: "1px solid #eee", padding: 8, marginBottom: 8 }}>
          <div style={{ fontWeight:700 }}>{p.name || p.Name}</div>
          <div>Type: {p.type || p.Type}</div>
          <div>Finish: {p.finish || p.Finish}</div>
          <div>Pack: {p.pack || p.Pack}</div>
          <div>Coverage: {p.coverage || p.Coverage}</div>
          <div>Price per litre: {p.price_per_litre || p.price || p.Price}</div>
        </div>
      ))}
    </div>
  );
}
