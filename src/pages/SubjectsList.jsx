import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const SubjectsList = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const studentId = localStorage.getItem("studentId"); // Make sure studentId is stored on login

  useEffect(() => {
    axios.get("https://student-management-system-32lc.onrender.com/api/marks/subjects")
      .then(res => {
        setSubjects(res.data.subjects || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Error fetching subjects");
        setLoading(false);
      });
  }, []);

  const handleSubjectClick = (subject) => {
    if (!studentId) return setError("Student not logged in");
    navigate(`/student/marks/${subject}`);
  };

  if (loading) return <div style={{ padding: "50px", textAlign: "center" }}>Loading subjects...</div>;
  if (error) return <div style={{ padding: "50px", textAlign: "center", color: "red" }}>{error}</div>;

  return (
    <div style={{ width: "100vw", minHeight: "100vh", padding: "40px 20px", display: "flex", justifyContent: "center", background: "#eef2f3" }}>
      <div style={{ width: "100%", maxWidth: "620px", background: "white", padding: "35px", borderRadius: "18px", boxShadow: "0 8px 25px rgba(0,0,0,0.08)" }}>
        <h2 style={{ textAlign: "center", marginBottom: "25px", fontSize: "26px", fontWeight: 600, color: "#2c3e50" }}>
          📚 Available Subjects
        </h2>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {subjects.map((sub, i) => (
            <li key={i}
                style={{ padding: "12px 15px", margin: "8px 0", background: "#f8f9fa", borderRadius: "8px", fontSize: "18px", fontWeight: 500, cursor: "pointer" }}
                onClick={() => handleSubjectClick(sub)}>
              {sub}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SubjectsList;
