import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "https://student-management-system-4-hose.onrender.com";

export default function AdminResult() {

  const [results, setResults] = useState([]);
  const [queries, setQueries] = useState([]);
  const [term, setTerm] = useState("");

  useEffect(() => {
    fetchResults();
  }, [term]);

  const fetchResults = async () => {
    try {
      const r = await axios.get(`${API_URL}/api/results?term=${term}`);
      const q = await axios.get(`${API_URL}/api/results/query`);

      setResults(r.data || []);
      setQueries(q.data || []);
    } catch (err) {
      console.error("Result fetch error:", err);
    }
  };

  return (
    <div style={{ padding: 20 }}>

      <h2>📊 Results</h2>

      <select onChange={e => setTerm(e.target.value)} value={term}>
        <option value="">All Terms</option>
        <option value="Terminal">Terminal</option>
        <option value="Half Yearly">Half Yearly</option>
        <option value="Final">Final</option>
      </select>

      <table border="1" width="100%" cellPadding="8" style={{ marginTop: 15 }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Class</th>
            <th>Term</th>
            <th>Percentage</th>
          </tr>
        </thead>

        <tbody>
          {results.length === 0 ? (
            <tr>
              <td colSpan="4" align="center">No results found</td>
            </tr>
          ) : (
            results.map(r => (
              <tr key={r.id}>
                <td>{r.student}</td>
                <td>{r.cls}</td>
                <td>{r.term}</td>
                <td>{r.percentage}%</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <hr style={{ margin: "25px 0" }} />

      <h2>❓ Student Queries</h2>

      {queries.length === 0 && <p>No queries available</p>}

      {queries.map(q => (
        <div
          key={q.id}
          style={{
            border: "1px solid #ccc",
            margin: "8px 0",
            padding: "10px",
            borderRadius: "6px"
          }}
        >
          <b>{q.student}</b> : {q.query}
        </div>
      ))}

    </div>
  );
}
