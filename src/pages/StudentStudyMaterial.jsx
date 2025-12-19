import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "https://student-management-system-4-hose.onrender.com";

const StudentStudyMaterial = () => {
  const studentClass = localStorage.getItem("studentClass"); // ✅ DIRECT SOURCE

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ================= STYLES =================
  const styles = {
    container: {
      maxWidth: "900px",
      margin: "40px auto",
      padding: "25px",
      background: "#fff",
      borderRadius: "16px",
      boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
      fontFamily: "Poppins, sans-serif",
    },
    heading: {
      textAlign: "center",
      marginBottom: "25px",
      color: "#333",
    },
    card: {
      padding: "18px",
      borderRadius: "12px",
      marginBottom: "15px",
      background: "#f7f9ff",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    title: {
      fontWeight: "600",
      fontSize: "16px",
      color: "#222",
    },
    meta: {
      fontSize: "13px",
      color: "#666",
      marginTop: "4px",
    },
    button: {
      padding: "8px 14px",
      background: "#4a90e2",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      fontWeight: "600",
    },
    msg: {
      textAlign: "center",
      padding: "15px",
      color: "#555",
      fontWeight: "600",
    },
  };

  // ================= FETCH MATERIAL =================
  useEffect(() => {
    if (!studentClass) {
      setError("Student class not found");
      return;
    }

    setLoading(true);
    setError("");

    axios
      .get(`${API_URL}/api/study-material/${studentClass}`)
      .then((res) => {
        if (res.data.success) {
          setMaterials(res.data.materials);
        } else {
          setMaterials([]);
        }
      })
      .catch(() => {
        setError("Failed to load study material");
      })
      .finally(() => setLoading(false));
  }, [studentClass]);

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>
        Study Material – Class {studentClass}
      </h2>

      {loading && <p style={styles.msg}>Loading...</p>}
      {error && <p style={styles.msg}>{error}</p>}

      {!loading && materials.length === 0 && !error && (
        <p style={styles.msg}>No study material available</p>
      )}

      {materials.map((item) => (
        <div key={item.id} style={styles.card}>
          <div>
            <div style={styles.title}>{item.title}</div>
            <div style={styles.meta}>Subject: {item.subject}</div>
          </div>

          <a
            href={`${API_URL}/${item.file_path}`}
            target="_blank"
            rel="noreferrer"
          >
            <button style={styles.button}>View / Download</button>
          </a>
        </div>
      ))}
    </div>
  );
};

export default StudentStudyMaterial;
