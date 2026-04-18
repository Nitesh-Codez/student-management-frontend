import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * @component StudentDropApply
 * @description SmartZone Official Student Holiday Portal
 */
const StudentDropApply = () => {
  // --- States ---
  const [profile, setProfile] = useState(null);
  const [previousDrops, setPreviousDrops] = useState([]);
  const [formData, setFormData] = useState({
    start_date: "",
    end_date: "",
    reason: "",
    drop_type: ""
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // --- Constants ---
  const API_URL = process.env.REACT_APP_API_URL;
  const user = JSON.parse(localStorage.getItem("user"));

  // --- Helpers ---
  const handleResize = () => setWindowWidth(window.innerWidth);

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- Confetti Logic ---
  const triggerConfetti = useCallback(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js";
    script.onload = () => {
      window.confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => {
        window.confetti({
          particleCount: 180,
          spread: 100,
          origin: { y: 0.7 },
          colors: ["#ff0000", "#22c55e", "#2563eb", "#ffffff"]
        });
      }, 700);
    };
    document.body.appendChild(script);
  }, []);

  // --- Data Fetching ---
  const fetchDrops = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await axios.get(`${API_URL}/api/drop/my-drop-requests`, {
        params: { student_id: user.id }
      });
      if (res.data.success) {
        setPreviousDrops(res.data.data);
        // Trigger confetti only if the latest one was just approved
        if (res.data.data[0]?.status === "approved") triggerConfetti();
      }
    } catch (err) {
      console.error("Error fetching drops:", err);
    }
  }, [API_URL, user?.id, triggerConfetti]);

  useEffect(() => {
    if (!user?.id) return;
    axios.get(`${API_URL}/api/students/profile`, { params: { id: user.id } })
      .then(res => res.data.success && setProfile(res.data.student))
      .catch(err => console.error(err));
    fetchDrops();
  }, [API_URL, user?.id, fetchDrops]);

  // --- Event Handlers ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/drop/apply-drop`, {
        student_id: user?.id,
        ...formData
      });
      if (res.data.success) {
        setIsSubmitted(true);
        fetchDrops();
        setFormData({ start_date: "", end_date: "", reason: "", drop_type: "" });
      }
    } catch (err) {
      alert("Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => (dateString ? dateString.split("T")[0] : "N/A");

  // --- UI Styles Object ---
  const styles = {
    wrapper: {
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%)",
      fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      paddingBottom: "80px",
      color: "#102a43"
    },
    hero: {
      background: "linear-gradient(135deg, #102a43 0%, #243b53 100%)",
      padding: "60px 20px 100px",
      textAlign: "center",
      color: "#fff",
      boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
    },
    brand: {
      fontSize: "3.5rem",
      fontWeight: "900",
      letterSpacing: "-1px",
      margin: "0 0 10px 0",
      textShadow: "2px 2px 4px rgba(0,0,0,0.3)"
    },
    grid: {
      maxWidth: "1200px",
      margin: "-60px auto 0",
      padding: "0 20px",
      display: "grid",
      gridTemplateColumns: windowWidth > 992 ? "1.2fr 1fr" : "1fr",
      gap: "40px"
    },
    card: {
      background: "rgba(255, 255, 255, 0.95)",
      backdropFilter: "blur(10px)",
      borderRadius: "24px",
      padding: "40px",
      boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
      border: "1px solid rgba(255,255,255,0.3)"
    },
    formGroup: {
      marginBottom: "20px"
    },
    label: {
      display: "block",
      fontWeight: "600",
      fontSize: "0.9rem",
      color: "#486581",
      marginBottom: "8px",
      marginLeft: "4px"
    },
    input: {
      width: "100%",
      padding: "14px 18px",
      borderRadius: "14px",
      border: "2px solid #d9e2ec",
      fontSize: "1rem",
      transition: "all 0.3s ease",
      boxSizing: "border-box",
      outline: "none",
      backgroundColor: "#f0f4f8"
    },
    btnPrimary: {
      width: "100%",
      padding: "18px",
      background: "linear-gradient(to right, #2563eb, #1d4ed8)",
      color: "#fff",
      border: "none",
      borderRadius: "14px",
      fontSize: "1.1rem",
      fontWeight: "700",
      cursor: "pointer",
      boxShadow: "0 10px 15px rgba(37, 99, 235, 0.2)",
      transition: "transform 0.2s, box-shadow 0.2s"
    },
    historyItem: (status) => {
      const colors = {
        approved: "#22c55e",
        rejected: "#ef4444",
        pending: "#f59e0b"
      };
      return {
        background: "#fff",
        borderRadius: "18px",
        padding: "20px",
        marginBottom: "20px",
        borderLeft: `8px solid ${colors[status] || "#cbd5e1"}`,
        boxShadow: "0 8px 16px rgba(0,0,0,0.04)",
        position: "relative",
        transition: "transform 0.2s"
      };
    },
    statusBadge: (status) => ({
      fontSize: "0.75rem",
      fontWeight: "800",
      padding: "6px 12px",
      borderRadius: "50px",
      textTransform: "uppercase",
      backgroundColor: status === "approved" ? "#dcfce7" : status === "rejected" ? "#fee2e2" : "#fef9c3",
      color: status === "approved" ? "#166534" : status === "rejected" ? "#991b1b" : "#854d0e"
    }),
    marquee: {
      position: "fixed",
      bottom: 0,
      left: 0,
      width: "100%",
      background: "#102a43",
      color: "#9fb3c8",
      padding: "15px 0",
      zIndex: 1000,
      borderTop: "2px solid #243b53"
    }
  };

  return (
    <div style={styles.wrapper}>
      {/* Global CSS for Animations */}
      <style>
        {`
          @keyframes marqueeAnim { 
            0% { transform: translateX(100%); } 
            100% { transform: translateX(-100%); } 
          }
          .animate-marquee { display: inline-block; animation: marqueeAnim 30s linear infinite; white-space: nowrap; }
          .btn-hover:hover { transform: translateY(-3px); boxShadow: 0 15px 20px rgba(37, 99, 235, 0.3); opacity: 0.9; }
          .input-focus:focus { border-color: #2563eb !important; background: #fff !important; box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1); }
          .history-card:hover { transform: scale(1.02); }
        `}
      </style>

      {/* Hero Header */}
      <header style={styles.hero}>
        <h1 style={styles.brand}>𝐒mart𝐙one</h1>
        <p style={{ fontSize: "1.2rem", opacity: 0.8 }}>
          Hi {profile?.name || "Student"}, Welcome to your Leave Management Dashboard
        </p>
      </header>

      {/* Main Content Grid */}
      <main style={styles.grid}>
        
        {/* Section 1: Request Form */}
        <section>
          <div style={styles.card}>
            <h2 style={{ fontSize: "1.8rem", marginBottom: "30px", color: "#102a43" }}>
              Apply for Leave
            </h2>

            {!isSubmitted ? (
              <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Application Type</label>
                  <select 
                    name="drop_type" 
                    className="input-focus" 
                    style={styles.input} 
                    onChange={handleChange} 
                    required
                  >
                    <option value="">Choose leave category...</option>
                    <option value="temporary">Temporary Holiday</option>
                    <option value="1_day">1 Day Leave</option>
                    <option value="permanent">Permanent Drop</option>
                    <option value="emergency">Emergency Medical Leave</option>
                  </select>
                </div>

                <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>From Date</label>
                    <input 
                      type="date" 
                      name="start_date" 
                      className="input-focus" 
                      style={styles.input} 
                      onChange={handleChange} 
                      required 
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>To Date</label>
                    <input 
                      type="date" 
                      name="end_date" 
                      className="input-focus" 
                      style={styles.input} 
                      onChange={handleChange} 
                      required 
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Reason for Request</label>
                  <textarea 
                    name="reason" 
                    className="input-focus" 
                    style={{ ...styles.input, height: "120px", resize: "none" }} 
                    placeholder="Provide a detailed reason for your application..." 
                    onChange={handleChange} 
                    required 
                  />
                </div>

                <button type="submit" className="btn-hover" style={styles.btnPrimary} disabled={loading}>
                  {loading ? "Processing Application..." : "Submit My Request"}
                </button>
              </form>
            ) : (
              <div style={{ textAlign: "center", padding: "20px" }}>
                <div style={{ fontSize: "80px", marginBottom: "20px" }}>🚀</div>
                <h2 style={{ color: "#2563eb", marginBottom: "10px" }}>Application Received!</h2>
                <p style={{ color: "#486581", marginBottom: "30px" }}>Your request is currently under review by the administration.</p>
                <button 
                  onClick={() => setIsSubmitted(false)} 
                  style={{ ...styles.btnPrimary, width: "auto", padding: "12px 40px", background: "#486581" }}
                >
                  New Request
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Section 2: History List */}
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ margin: 0, fontSize: "1.5rem" }}>Recent Activity</h3>
            <span style={{ fontSize: "0.9rem", color: "#627d98" }}>Total: {previousDrops.length}</span>
          </div>

          <div style={{ maxHeight: "750px", overflowY: "auto", paddingRight: "10px" }}>
            {previousDrops.length > 0 ? (
              previousDrops.map((item) => (
                <div key={item.id} className="history-card" style={styles.historyItem(item.status)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                    <span style={{ fontWeight: "700", color: "#243b53" }}>
                      {item.drop_type?.replace("_", " ").toUpperCase()}
                    </span>
                    <span style={styles.statusBadge(item.status)}>{item.status}</span>
                  </div>

                  <div style={{ display: "flex", gap: "20px", fontSize: "0.9rem", color: "#486581", marginBottom: "15px" }}>
                    <span>📅 <b>Start:</b> {formatDate(item.start_date)}</span>
                    <span>📅 <b>End:</b> {formatDate(item.end_date)}</span>
                  </div>

                  <div style={{ 
                    background: "#f0f4f8", 
                    padding: "15px", 
                    borderRadius: "12px", 
                    fontSize: "0.95rem", 
                    lineHeight: "1.5",
                    fontStyle: "italic",
                    border: "1px dashed #cbd5e1" 
                  }}>
                    "{item.reason}"
                  </div>

                  {item.status === "approved" && (
                    <div style={{ position: "absolute", bottom: "15px", right: "15px", fontSize: "24px" }}>🎉</div>
                  )}
                </div>
              ))
            ) : (
              <div style={{ textAlign: "center", padding: "100px 0", color: "#829ab1" }}>
                <div style={{ fontSize: "50px" }}>📂</div>
                <p>No previous requests found.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Animated Footer Marquee */}
      <footer style={styles.marquee}>
        <div className="animate-marquee">
          ✨ <b>𝐒mart𝐙one Updates:</b> Best platform for your IT Career | 
          Check status daily for updates | 
          Contact support for emergency cases | 
          Stay Smart, Stay Ahead! ✨
        </div>
      </footer>
    </div>
  );
};

export default StudentDropApply;