import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

import Home from "./pages/Home";
import Products from "./pages/Products";
import UploadProducts from "./pages/UploadProducts";
import TenderResult from "./pages/TenderResult";
import CompanyDetails from "./pages/CompanyDetails";
import Bidding from "./pages/Bidding";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";

import "./index.css";

export default function App() {
  const [open, setOpen] = useState(false);

  return (
    <BrowserRouter>
      <div className="app-shell">
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "22px 24px",
            background: "#ffffff",
            borderRadius: 16,
            boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
            marginBottom: 28,
            position: "relative",
          }}
        >
          {/* BRAND */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: 12,
                background: "linear-gradient(135deg,#bfa9e9,#9c7adf)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 800,
                fontSize: 16,
              }}
            >
              AP
            </div>

            <div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>
                Asian Paints — RFP Autobot
              </div>
              <div style={{ fontSize: 13, color: "#666" }}>
                Automated tender matching • pricing • proposal generation
              </div>
            </div>
          </div>

          {/* MENU */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link to="/" className="tag">
              Home
            </Link>

            <button className="button" onClick={() => setOpen(!open)}>
              Menu ▾
            </button>

            {open && (
              <div
                className="menu-dropdown"
                style={{
                  position: "absolute",
                  right: 24,
                  top: "95%",
                  minWidth: 240,
                  zIndex: 100,
                }}
              >
                {[
                  ["Products", "/products"],
                  ["Upload Products", "/upload-products"],
                  ["Company Details", "/company"],
                  ["Bid Recommendations", "/bidding"],
                  ["Dashboard", "/dashboard"],
                  ["History", "/history"],
                ].map(([label, path]) => (
                  <Link
                    key={path}
                    to={path}
                    className="menu-item"
                    onClick={() => setOpen(false)}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </header>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/upload-products" element={<UploadProducts />} />
          <Route path="/result" element={<TenderResult />} />
          <Route path="/company" element={<CompanyDetails />} />
          <Route path="/bidding" element={<Bidding />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
