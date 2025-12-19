import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "https://student-management-system-4-hose.onrender.com";

const subjectColors = {
  Math: "#ff6b6b",
  English: "#4dabf7",
  Hindi: "#ffd43b",
  Science: "#69db7c",
  "S.S.T": "#9775fa",
  Physics: "#38d9a9",
  Chemistry: "#ff922b",
  Biology: "#51cf66",
  Default: "#4a90e2",
};

const StudentStudyMaterial = () => {
  const studentClass = localStorage.getItem("studentClass");

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewFile, setViewFile] = useState(null);

  // ================= FETCH =================
  useEffect(() => {
    if (!studentClass) {
      setError("Student class not found");
      return;
    }

    setLoading(true);
    axios
      .get(`${API_URL}/api/study-material/${studentClass}`)
      .then((res) => {
        if (res.data.success) {
          setMaterials(res.data.materials);
        }
      })
      .catch(() => setError("Failed to load study material"))
      .finally(() => setLoading(false));
  }, [studentClass]);

  // ================= VIEW HANDLER =================
  const openView = (path) => {
    const cleanPath = path.startsWith("/") ? path : "/" + path;
    setViewFile(encodeURI(cleanPath));
  };

  // ================= GROUP =================
  const grouped = materials.reduce((acc, item) => {
    acc[item.subject] = acc[item.subject] || [];
    acc[item.subject].push(item);
    return acc;
  }, {});

  return (
    <>
      {/* ================= FULL SCREEN VIEW ================= */}
      {viewFile && (
        <div style={styles.viewerOverlay}>
          <button style={styles.closeBtn} onClick={() => setViewFile(null)}>
            ✖ Close
          </button>

          <iframe
            src={`${API_URL}${viewFile}`}
            title="PDF Viewer"
            style={styles.viewerIframe}
          />
        </div>
      )}

      {/* ================= MAIN ================= */}
      <div style={styles.container}>
        <h2 style={styles.heading}>
          📚 Study Material – Class {studentClass}
        </h2>

        {loading && <p style={styles.msg}>Loading...</p>}
        {error && <p style={styles.error}>{error}</p>}

        {!loading && materials.length === 0 && !error && (
          <p style={styles.msg}>No study material available</p>
        )}

        {Object.keys(grouped).map((subject) => (
          <div key={subject} style={styles.subjectBlock}>
            <h3
              style={{
                ...styles.subjectTitle,
                background: subjectColors[subject] || subjectColors.Default,
              }}
            >
              {subject}
            </h3>

            {grouped[subject].map((item) => (
              <div key={item.id} style={styles.card}>
                <span style={styles.fileTitle}>{item.title}</span>

                <div style={styles.btnGroup}>
                  {/* 👁 VIEW */}
                  <button
                    style={styles.viewBtn}
                    onClick={() => openView(item.file_path)}
                  >
                    👁 View
                  </button>

                  {/* 📥 DOWNLOAD */}
                  <a
                    href={`${API_URL}/api/study-material/download/${item.id}`}
                    style={styles.downloadBtn}
                  >
                    📥 Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
};

// ================= STYLES =================
const styles = {
  container: {
    maxWidth: "900px",
    margin: "30px auto",
    padding: "20px",
    background: "#fff",
    borderRadius: "18px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
    fontFamily: "Poppins, sans-serif",
  },
  heading: { textAlign: "center", marginBottom: "30px", fontSize: "24px" },
  subjectBlock: { marginBottom: "25px" },
  subjectTitle: {
    padding: "12px 16px",
    borderRadius: "12px",
    color: "#fff",
    fontSize: "18px",
    marginBottom: "12px",
  },
  card: {
    background: "#f8f9ff",
    padding: "14px 16px",
    borderRadius: "12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  fileTitle: { fontSize: "15px", fontWeight: "500" },
  btnGroup: { display: "flex", gap: "10px" },
  viewBtn: {
    background: "#38d9a9",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
  },
  downloadBtn: {
    background: "#4a90e2",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: "8px",
    textDecoration: "none",
  },
  msg: { textAlign: "center", padding: "15px" },
  error: { textAlign: "center", padding: "15px", color: "red" },

  viewerOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "#000",
    zIndex: 9999,
  },
  viewerIframe: { width: "100%", height: "100%", border: "none" },
  closeBtn: {
    position: "absolute",
    top: "15px",
    right: "20px",
    background: "red",
    color: "#fff",
    border: "none",
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer",
  },
};

export default StudentStudyMaterial;
