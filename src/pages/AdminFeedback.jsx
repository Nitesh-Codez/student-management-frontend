import React, { useEffect, useState } from "react";
import axios from "axios";

export default function AdminDashboard() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        let API = process.env.REACT_APP_API_URL || "https://student-management-system-4-hose.onrender.com";
        API = API.replace(/\/$/, "");
        const res = await axios.get(`${API}/api/feedback/admin/all`);
        setFeedbacks(res.data || []);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch feedbacks.");
      } finally {
        setLoading(false);
      }
    };
    fetchFeedbacks();
  }, []);

  const getTypeStyle = (type) => {
    switch (type?.toLowerCase()) {
      case 'complaint': return { bg: "#fee2e2", text: "#ef4444" };
      case 'suggestion': return { bg: "#fef3c7", text: "#f59e0b" };
      default: return { bg: "#dcfce7", text: "#10b981" };
    }
  };

  if (loading) return (
    <div style={styles.center}>
      <div style={styles.loader}></div>
      <p style={{marginTop: 15, color: "#94a3b8"}}>Loading Feedbacks...</p>
    </div>
  );

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Feeter</h1>
          <p style={styles.subtitle}>Manage and review student responses</p>
        </div>
        <div style={styles.statsBadge}>
          Total: {feedbacks.length}
        </div>
      </header>

      {error && <div style={styles.errorCard}>{error}</div>}

      {feedbacks.length === 0 ? (
        <div style={styles.noDataCard}>
          <span style={{fontSize: 40}}>Empty</span>
          <p>No feedbacks received yet.</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {feedbacks.map((f) => {
            const theme = getTypeStyle(f.type);
            return (
              <div key={f._id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div style={styles.avatar}>
                    {f.studentName?.charAt(0).toUpperCase() || "S"}
                  </div>
                  <div style={{flex: 1}}>
                    <h3 style={styles.studentName}>{f.studentName || "Anonymous Student"}</h3>
                    <span style={{...styles.badge, backgroundColor: theme.bg, color: theme.text}}>
                      {f.type || "Feedback"}
                    </span>
                  </div>
                </div>
                <div style={styles.cardBody}>
                  <p style={styles.comment}>"{f.comment}"</p>
                </div>
                <div style={styles.cardFooter}>
                  <span style={styles.date}>{new Date().toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  container: {
    padding: "40px 5%",
    background: "#0f172a",
    minHeight: "100vh",
    fontFamily: "'Inter', sans-serif",
    color: "#f8fafc"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "40px",
    borderBottom: "1px solid #1e293b",
    paddingBottom: "20px"
  },
  title: {
    fontSize: "32px",
    fontWeight: "800",
    margin: 0,
    background: "linear-gradient(to right, #60a5fa, #a855f7)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent"
  },
  subtitle: { color: "#94a3b8", margin: "5px 0 0 0", fontSize: "14px" },
  statsBadge: {
    background: "#1e293b",
    padding: "8px 20px",
    borderRadius: "12px",
    border: "1px solid #334155",
    fontWeight: "600",
    color: "#60a5fa"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "25px"
  },
  card: {
    background: "#1e293b",
    borderRadius: "20px",
    padding: "24px",
    border: "1px solid #334155",
    transition: "transform 0.2s, box-shadow 0.2s",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between"
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    marginBottom: "15px"
  },
  avatar: {
    width: "45px",
    height: "45px",
    borderRadius: "12px",
    background: "#334155",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    fontWeight: "bold",
    color: "#60a5fa"
  },
  studentName: { fontSize: "17px", margin: 0, fontWeight: "600", color: "#f1f5f9" },
  badge: {
    fontSize: "11px",
    padding: "3px 10px",
    borderRadius: "20px",
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: "5px",
    display: "inline-block"
  },
  cardBody: {
    margin: "15px 0",
    minHeight: "60px"
  },
  comment: {
    fontSize: "15px",
    lineHeight: "1.6",
    color: "#cbd5e1",
    fontStyle: "italic",
    margin: 0
  },
  cardFooter: {
    borderTop: "1px solid #334155",
    paddingTop: "15px",
    marginTop: "10px",
    display: "flex",
    justifyContent: "flex-end"
  },
  date: { fontSize: "12px", color: "#64748b" },
  center: { 
    height: "100vh", 
    display: "flex", 
    flexDirection: "column", 
    justifyContent: "center", 
    alignItems: "center",
    background: "#0f172a" 
  },
  loader: {
    border: "4px solid #1e293b",
    borderTop: "4px solid #60a5fa",
    borderRadius: "50%",
    width: "40px",
    height: "40px",
    animation: "spin 1s linear infinite",
  },
  errorCard: { background: "#7f1d1d", color: "#fecaca", padding: "15px", borderRadius: "10px", marginBottom: "20px" },
  noDataCard: { textAlign: "center", padding: "100px", color: "#475569" }
};