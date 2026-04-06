import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const AdminFees = () => {
  const [selectedSession, setSelectedSession] = useState("2025-26");
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [loadingMonth, setLoadingMonth] = useState(null); // Spinner state
  const navigate = useNavigate();

  const months = [
    { name: "January", color: "#FF5722", label: "Jan" },
    { name: "February", color: "#E91E63", label: "Feb" },
    { name: "March", color: "#9C27B0", label: "Mar" },
    { name: "April", color: "#673AB7", label: "Apr" },
    { name: "May", color: "#3F51B5", label: "May" },
    { name: "June", color: "#2196F3", label: "Jun" },
    { name: "July", color: "#03A9F4", label: "Jul" },
    { name: "August", color: "#00BCD4", label: "Aug" },
    { name: "September", color: "#009688", label: "Sep" },
    { name: "October", color: "#4CAF50", label: "Oct" },
    { name: "November", color: "#FFC107", label: "Nov" },
    { name: "December", color: "#FF9800", label: "Dec" }
  ];

  const handleNavigation = (monthIndex) => {
    if (!selectedSession) {
      alert("Please select an academic session first.");
      return;
    }

    // Spinner Start
    setLoadingMonth(monthIndex);

    // Thoda delay feel dene ke liye (Optional: smooth transition)
    setTimeout(() => {
      navigate(`/admin/details/${selectedSession}/${monthIndex}`);
    }, 400); 
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.contentWrapper}>
        
        {/* Top Branding Header */}
        <header style={styles.headerStyle}>
          <div style={styles.badge}>Administrator Portal</div>
          <h1 style={styles.mainTitle}>🏫 SmartZone Fee Management</h1>
          <p style={styles.subTitle}>
            Configure financial records, manage student transactions, and generate monthly reports.
          </p>
        </header>

        {/* Session Selection Section */}
        <section style={styles.selectionSection}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.stepCircle}>1</span>
              <label style={styles.labelStyle}>Select Academic Session</label>
            </div>
            <select 
              value={selectedSession} 
              onChange={(e) => setSelectedSession(e.target.value)} 
              style={styles.selectStyle}
              disabled={loadingMonth !== null} // Disable while loading
            >
              <option value="2022-23">Academic Year 2024-2025</option>
              <option value="2023-24">Academic Year 2024-2025</option>
              <option value="2024-25">Academic Year 2024-2025</option>
              <option value="2025-26">Academic Year 2025-2026</option>
              <option value="2026-27">Academic Year 2026-2027</option>
              <option value="2027-28">Academic Year 2027-2028</option>
            </select>
          </div>
        </section>

        <div style={styles.dividerContainer}>
          <div style={styles.dividerLine}></div>
          <span style={styles.dividerText}>Choose a month to manage records</span>
          <div style={styles.dividerLine}></div>
        </div>

        {/* Months Grid System */}
        <div style={styles.gridContainer}>
          {months.map((m, i) => {
            const isThisLoading = loadingMonth === (i + 1);
            return (
              <div 
                key={i} 
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ 
                  ...styles.monthCard, 
                  borderTop: `6px solid ${m.color}`,
                  transform: hoveredIndex === i && !loadingMonth ? "translateY(-8px)" : "translateY(0)",
                  boxShadow: hoveredIndex === i ? "0 12px 30px rgba(0,0,0,0.12)" : "0 4px 15px rgba(0,0,0,0.05)",
                  opacity: loadingMonth && !isThisLoading ? 0.6 : 1,
                  pointerEvents: loadingMonth ? "none" : "auto"
                }}
                onClick={() => handleNavigation(i + 1)}
              >
                {/* Spinner Overlay */}
                {isThisLoading && (
                  <div style={styles.spinnerOverlay}>
                    <div style={styles.spinner}></div>
                  </div>
                )}

                <div style={{ ...styles.iconCircle, backgroundColor: `${m.color}15`, color: m.color }}>
                  {m.label}
                </div>
                <h3 style={styles.monthName}>{m.name}</h3>
                <div style={styles.cardFooter}>
                  <span style={{...styles.statusDot, backgroundColor: m.color}}></span>
                  <span style={styles.actionLink}>
                    {isThisLoading ? "Loading..." : "Open Ledger →"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <footer style={styles.footerBox}>
          <p>Logged in as: <strong>Admin</strong> | {new Date().toLocaleDateString()}</p>
        </footer>
      </div>

      {/* Global CSS for Spinner Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// --- STYLES UPDATED ---

const styles = {
  // ... (pichle saare styles same rahenge)
  pageContainer: { background: "#f4f7fa", minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: "#2d3436" },
  contentWrapper: { maxWidth: "1300px", margin: "0 auto", padding: "60px 24px" },
  headerStyle: { textAlign: "center", marginBottom: "50px" },
  badge: { display: "inline-block", padding: "6px 16px", background: "#e8eaf6", color: "#3f51b5", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "700", marginBottom: "15px" },
  mainTitle: { margin: "0 0 10px 0", fontSize: "3rem", fontWeight: "800", color: "#1a237e" },
  subTitle: { fontSize: "1.1rem", color: "#636e72", maxWidth: "600px", margin: "0 auto" },
  selectionSection: { display: "flex", justifyContent: "center", marginBottom: "60px" },
  card: { background: "#ffffff", padding: "40px", borderRadius: "24px", boxShadow: "0 10px 40px rgba(0,0,0,0.04)", textAlign: "center", width: "100%", maxWidth: "500px", border: "1px solid #edf2f7" },
  cardHeader: { display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "20px" },
  stepCircle: { background: "#1a237e", color: "white", width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" },
  labelStyle: { fontWeight: "700", fontSize: "1.2rem" },
  selectStyle: { padding: "15px 25px", borderRadius: "12px", border: "2px solid #e2e8f0", fontSize: "1.1rem", width: "100%", cursor: "pointer" },
  dividerContainer: { display: "flex", alignItems: "center", gap: "20px", marginBottom: "40px" },
  dividerLine: { flex: 1, height: "1px", background: "#e2e8f0" },
  dividerText: { color: "#718096", fontSize: "0.9rem", fontWeight: "600" },
  gridContainer: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "30px" },
  
  monthCard: { 
    background: "#ffffff", padding: "35px 25px", borderRadius: "20px", textAlign: "center", 
    cursor: "pointer", transition: "all 0.4s ease", position: "relative", overflow: "hidden" 
  },
  
  // NEW SPINNER STYLES
  spinnerOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(255, 255, 255, 0.7)", display: "flex",
    alignItems: "center", justifyContent: "center", zIndex: 2
  },
  spinner: {
    width: "30px", height: "30px", border: "3px solid #f3f3f3",
    borderTop: "3px solid #1a237e", borderRadius: "50%",
    animation: "spin 0.8s linear infinite"
  },

  iconCircle: { width: "64px", height: "64px", borderRadius: "18px", margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", fontWeight: "800" },
  monthName: { margin: "0 0 15px 0", fontSize: "1.4rem", fontWeight: "700" },
  cardFooter: { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", borderTop: "1px solid #f1f5f9", paddingTop: "15px" },
  statusDot: { width: "8px", height: "8px", borderRadius: "50%" },
  actionLink: { fontSize: "0.9rem", fontWeight: "600", color: "#1a237e" },
  footerBox: { marginTop: "60px", textAlign: "center", padding: "25px", background: "#ffffff", borderRadius: "15px", color: "#718096", fontSize: "0.9rem" }
};

export default AdminFees;