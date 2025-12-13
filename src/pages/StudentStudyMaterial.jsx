import React, { useState, useEffect } from "react";
import axios from "axios";

const StudentStudyMaterial = ({ user }) => {
  const API_URL = process.env.REACT_APP_API_URL;

  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1️⃣ Fetch subjects based on student class
  useEffect(() => {
    if (!user) return;

    const fetchSubjects = async () => {
      try {
        const res = await axios.get(
          `${API_URL}/api/study-material/subjects/${user.class}`
        );
        if (res.data.success) {
          setSubjects(res.data.subjects);
        }
      } catch (err) {
        console.log("Error fetching subjects", err);
      }
    };

    fetchSubjects();
  }, [user, API_URL]);

  // 2️⃣ Fetch chapters when subject selected
  const handleSubjectClick = async (subject) => {
    setSelectedSubject(subject);
    setLoading(true);

    try {
      const res = await axios.get(
        `${API_URL}/api/study-material/${user.class}/${subject}`
      );
      if (res.data.success) {
        setMaterials(res.data.materials);
      }
    } catch (err) {
      console.log("Error fetching materials", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <h2 style={styles.heading}>📚 Study Material</h2>

      {/* SUBJECT SELECTION */}
      {!selectedSubject && (
        <div style={styles.subjectGrid}>
          {subjects.map((sub, i) => (
            <div
              key={i}
              style={styles.subjectCard}
              onClick={() => handleSubjectClick(sub)}
            >
              {sub}
            </div>
          ))}
        </div>
      )}

      {/* BACK BUTTON */}
      {selectedSubject && (
        <button
          style={styles.backBtn}
          onClick={() => {
            setSelectedSubject(null);
            setMaterials([]);
          }}
        >
          ← Back to Subjects
        </button>
      )}

      {/* MATERIAL LIST */}
      {selectedSubject && (
        <div style={styles.materialBox}>
          <h3 style={styles.subHeading}>
            {selectedSubject} – Chapters
          </h3>

          {loading ? (
            <p style={styles.msg}>Loading material...</p>
          ) : materials.length === 0 ? (
            <p style={styles.msg}>No material uploaded yet.</p>
          ) : (
            <div style={styles.chapterGrid}>
              {materials.map((m) => (
                <div key={m.id} style={styles.chapterCard}>
                  <h4>{m.chapter}</h4>
                  <a
                    href={m.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.downloadBtn}
                  >
                    Download PDF
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  page: {
    padding: "30px",
    minHeight: "100vh",
    background: "linear-gradient(to bottom, #eef2f7, #f7f9fc)",
    fontFamily: "'Poppins', sans-serif",
  },
  heading: {
    textAlign: "center",
    fontSize: "30px",
    fontWeight: "700",
    color: "#1f3c88",
    marginBottom: "30px",
  },
  subjectGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
  },
  subjectCard: {
    padding: "30px",
    background: "linear-gradient(135deg, #1ABC9C, #16A085)",
    color: "#fff",
    borderRadius: "18px",
    textAlign: "center",
    fontSize: "20px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
    transition: "0.3s",
  },
  backBtn: {
    marginBottom: "20px",
    padding: "12px 26px",
    borderRadius: "12px",
    border: "none",
    background: "#1f3c88",
    color: "#fff",
    cursor: "pointer",
    fontSize: "16px",
  },
  materialBox: {
    background: "#fff",
    padding: "25px",
    borderRadius: "18px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
  },
  subHeading: {
    fontSize: "22px",
    fontWeight: "600",
    marginBottom: "20px",
    color: "#333",
  },
  chapterGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "20px",
  },
  chapterCard: {
    padding: "20px",
    borderRadius: "16px",
    background: "#f7f9fc",
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
  },
  downloadBtn: {
    display: "inline-block",
    marginTop: "12px",
    padding: "10px 20px",
    background: "#1ABC9C",
    color: "#fff",
    borderRadius: "10px",
    textDecoration: "none",
    fontWeight: "600",
  },
  msg: {
    textAlign: "center",
    color: "#666",
    fontSize: "16px",
  },
};

export default StudentStudyMaterial;
