import React, { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "https://student-management-system-4-hose.onrender.com";

export default function ViewResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadResult = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (user) {
          const res = await axios.get(`${API_URL}/api/results/search`, {
            params: { name: user.name, cls: user.class }
          });
          setResults(res.data);
        }
      } catch (err) {
        console.log("Error fetching results");
      } finally {
        setLoading(false);
      }
    };
    loadResult();
  }, []);

  if (loading) return <div style={loader}>Fetching your records...</div>;

  return (
    <div style={{ padding: "20px" }}>
      <h3 style={{ color: "#1a237e", marginBottom: "20px" }}>Academic Records</h3>
      
      {results.length === 0 ? (
        <div style={emptyState}>No results found for your profile.</div>
      ) : (
        results.map((r, index) => (
          <div key={index} style={card}>
            <div style={cardRow}>
              <span style={termLabel}>{r.exam_term}</span>
              <span style={percText}>{r.percentage}%</span>
            </div>
            <div style={divider} />
            <div style={infoGrid}>
              <div>
                <p style={label}>Obtained</p>
                <p style={val}>{r.obtained_marks}</p>
              </div>
              <div>
                <p style={label}>Out of</p>
                <p style={val}>{r.total_max_marks}</p>
              </div>
              <div>
                <p style={label}>Status</p>
                <p style={{...val, color: r.percentage > 33 ? "green" : "red"}}>
                  {r.percentage > 33 ? "PASSED" : "FAILED"}
                </p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// Styling for View Card
const card = { background: "#fff", borderRadius: "15px", padding: "20px", marginBottom: "15px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" };
const cardRow = { display: "flex", justifyContent: "space-between", alignItems: "center" };
const termLabel = { fontWeight: "800", fontSize: "18px", color: "#333" };
const percText = { fontSize: "22px", fontWeight: "900", color: "#1a237e" };
const divider = { height: "1px", background: "#eee", margin: "15px 0" };
const infoGrid = { display: "flex", justifyContent: "space-between" };
const label = { fontSize: "12px", color: "#888", marginBottom: "4px" };
const val = { fontSize: "16px", fontWeight: "bold", margin: 0 };
const emptyState = { textAlign: "center", color: "#999", marginTop: "50px" };
const loader = { textAlign: "center", padding: "50px", color: "#1a237e", fontWeight: "bold" };