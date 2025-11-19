import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

const StudentsMarks = () => {
  const { subject } = useParams();
  const studentId = localStorage.getItem("studentId");
  const [marksData, setMarksData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!studentId) {
      setError("Student not logged in");
      setLoading(false);
      return;
    }

    axios.get(`https://student-management-system-32lc.onrender.com/api/marks/student/${studentId}/${subject}`)
      .then(res => {
        if (res.data.success) setMarksData(res.data);
        else setError(res.data.message || "Marks not found");
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Error fetching marks");
        setLoading(false);
      });
  }, [studentId, subject]);

  if (loading) return <div style={{ padding: "50px", textAlign: "center" }}>Loading marks...</div>;
  if (error) return <div style={{ padding: "50px", textAlign: "center", color: "red" }}>{error}</div>;

  return (
    <div style={{ width: "100vw", minHeight: "100vh", padding: "40px 20px", display: "flex", justifyContent: "center", background: "#eef2f3" }}>
      <div style={{ width: "100%", maxWidth: "620px", background: "white", padding: "35px", borderRadius: "18px", boxShadow: "0 8px 25px rgba(0,0,0,0.08)" }}>
        <h2 style={{ textAlign: "center", marginBottom: "25px", fontSize: "26px", fontWeight: 600, color: "#2c3e50" }}>
          📄 Marks - {marksData.subject}
        </h2>
        <p><strong>Marks:</strong> {marksData.marks} / {marksData.maxMarks}</p>
        <p><strong>Date:</strong> {marksData.date}</p>
        <p><strong>Remark:</strong> {marksData.remark || "-"}</p>
      </div>
    </div>
  );
};

export default StudentsMarks;
