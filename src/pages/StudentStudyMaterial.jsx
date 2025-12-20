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
  let studentClass = localStorage.getItem("studentClass")?.replace("class-", "");
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewFile, setViewFile] = useState(null);

  // ================= FETCH MATERIALS =================
  useEffect(() => {
    if (!studentClass) {
      setError("Student class not found");
      return;
    }
    setLoading(true);
    axios
      .get(`${API_URL}/api/study-material/${studentClass}`)
      .then((res) => {
        if (res.data.success) setMaterials(res.data.materials);
        else setMaterials([]);
      })
      .catch(() => setError("Failed to load study material"))
      .finally(() => setLoading(false));
  }, [studentClass]);

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
          <iframe src={viewFile} title="PDF Viewer" style={styles.viewerIframe} />
        </div>
      )}

      <div style={styles.container}>
        <h2 style={styles.heading}>📚 Study Material – Class {studentClass}</h2>

        {loading && <p style={styles.msg}>Loading...</p>}
        {error && <p style={styles.error}>{error}</p>}
        {!loading && !materials.length && !error && <p style={styles.msg}>No study material available</p>}

        {Object.keys(grouped).map((subject) => (
          <div key={subject} style={styles.subjectBlock}>
            <h3 style={{ ...styles.subjectTitle, background: subjectColors[subject] || subjectColors.Default }}>
              {subject}
            </h3>
            {grouped[subject].map((item) => (
              <div key={item.id} style={styles.card}>
                <span style={styles.fileTitle}>{item.title}</span>
                <div style={styles.btnGroup}>
                  {/* 👁 VIEW */}
                  <button style={styles.viewBtn} onClick={() => setViewFile(item.file_path)}>
                    👁 View
                  </button>

                  {/* 📥 DOWNLOAD */}
                  <a
                    href={item.file_path} // Raw PDF URL
                    download // Force download
                    target="_blank"
                    rel="noopener noreferrer"
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

const styles = {
  container: { width: "95vw", minHeight: "100vh", margin: "20px auto", padding: "25px", background: "#fff", borderRadius: "18px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", fontFamily: "Poppins, sans-serif" },
  heading: { textAlign: "center", marginBottom: "30px", fontSize: "28px" },
  subjectBlock: { marginBottom: "30px" },
  subjectTitle: { padding: "14px 18px", borderRadius: "12px", color: "#fff", fontSize: "30px", marginBottom: "14px" },
  card: { background: "#f8f9ff", padding: "1px 20px", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" },
  fileTitle: { fontSize: "20px", fontWeight: "bold" },
  btnGroup: { display: "flex", gap: "12px" },
  viewBtn: { background: "#38d9a9", color: "#fff", padding: "10px 20px", borderRadius: "6px", border: "none", cursor: "pointer" },
  downloadBtn: { background: "#4a90e2", color: "#fff", padding: "10px 20px", borderRadius: "6px", textDecoration: "none" },
  msg: { textAlign: "center", padding: "15px", fontSize: "16px" },
  error: { textAlign: "center", padding: "15px", color: "red", fontSize: "16px" },
  viewerOverlay: { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "#000", zIndex: 9999 },
  viewerIframe: { width: "100%", height: "100%", border: "none" },
  closeBtn: { position: "absolute", top: "15px", right: "0px", left: "0px", background: "red", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", zIndex: 10000 },
};

export default StudentStudyMaterial;
