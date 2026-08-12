import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AdminFees = () => {
  // 1. Local storage se session uthao, agar nahi hai toh empty string
  const [selectedSession, setSelectedSession] = useState(() => {
    return localStorage.getItem("selectedSession") || "";
  });
  
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [loadingMonth, setLoadingMonth] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const navigate = useNavigate();

  // Mobile responsiveness handle karne ke liye
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 2. Jab bhi dropdown change ho, local storage update karo
  const handleSessionChange = (e) => {
    const value = e.target.value;
    setSelectedSession(value);
    localStorage.setItem("selectedSession", value);
  };

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
      alert("⚠️ Please select an academic session first!");
      return;
    }
    setLoadingMonth(monthIndex);
    setTimeout(() => {
      navigate(`/admin/details/${selectedSession}/${monthIndex}`);
      setLoadingMonth(null);
    }, 400); 
  };

  return (
    <div style={styles.pageContainer}>
      <div style={{...styles.contentWrapper, padding: isMobile ? "20px 15px" : "40px 24px"}}>
        
        <header style={styles.headerStyle}>
          <div style={styles.badge}>Administrator Portal</div>
          <h1 style={{...styles.mainTitle, fontSize: isMobile ? "1.8rem" : "2.5rem"}}>🏫 SmartZone Fee Management</h1>
          <p style={styles.subTitle}>Manage student records and generate financial reports easily.</p>
        </header>

        {/* Session Selection Section */}
        <section style={styles.selectionSection}>
          <div style={{...styles.card, padding: isMobile ? "20px" : "30px"}}>
            <div style={styles.cardHeader}>
              <span style={styles.stepCircle}>1</span>
              <label style={styles.labelStyle}>Academic Session</label>
            </div>
            <select 
              value={selectedSession} 
              onChange={handleSessionChange} 
              style={styles.selectStyle}
            >
              <option value="" disabled>-- First Select the Session --</option>
              <option value="2024-25">Academic Year 2024-2025</option>
              <option value="2025-26">Academic Year 2025-2026</option>
              <option value="2026-27">Academic Year 2026-2027</option>
              <option value="2027-28">Academic Year 2027-2028</option>
            </select>
            {selectedSession && (
              <p style={{marginTop: '10px', fontSize: '0.8rem', color: '#4CAF50', fontWeight: '600'}}>
                ✓ Active Session: {selectedSession}
              </p>
            )}
          </div>
        </section>

        <div style={styles.dividerContainer}>
          <div style={styles.dividerLine}></div>
          <span style={styles.dividerText}>Select a Month</span>
          <div style={styles.dividerLine}></div>
        </div>

        {/* Grid System - Mobile Responsive */}
        <div style={{
          ...styles.gridContainer, 
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(250px, 1fr))"
        }}>
          {months.map((m, i) => {
            const isThisLoading = loadingMonth === (i + 1);
            const isSelectable = selectedSession !== "";

            return (
              <div 
                key={i} 
                onMouseEnter={() => isSelectable && setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ 
                  ...styles.monthCard, 
                  borderTop: `6px solid ${m.color}`,
                  transform: hoveredIndex === i && !isMobile ? "translateY(-8px)" : "translateY(0)",
                  boxShadow: hoveredIndex === i ? "0 12px 30px rgba(0,0,0,0.12)" : "0 4px 15px rgba(0,0,0,0.05)",
                  opacity: isSelectable ? 1 : 0.6,
                  cursor: isSelectable ? "pointer" : "not-allowed",
                  pointerEvents: loadingMonth ? "none" : "auto"
                }}
                onClick={() => isSelectable && handleNavigation(i + 1)}
              >
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

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const styles = {
  pageContainer: { background: "#f4f7fa", minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: "#2d3436" },
  contentWrapper: { maxWidth: "1200px", margin: "0 auto" },
  headerStyle: { textAlign: "center", marginBottom: "40px" },
  badge: { display: "inline-block", padding: "6px 16px", background: "#e8eaf6", color: "#3f51b5", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "700", marginBottom: "15px" },
  mainTitle: { margin: "0 0 10px 0", fontWeight: "800", color: "#1a237e" },
  subTitle: { fontSize: "0.95rem", color: "#636e72", maxWidth: "500px", margin: "0 auto" },
  selectionSection: { display: "flex", justifyContent: "center", marginBottom: "40px" },
  card: { background: "#ffffff", borderRadius: "24px", boxShadow: "0 10px 40px rgba(0,0,0,0.04)", textAlign: "center", width: "100%", maxWidth: "450px", border: "1px solid #edf2f7" },
  cardHeader: { display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "15px" },
  stepCircle: { background: "#1a237e", color: "white", width: "26px", height: "26px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.9rem" },
  labelStyle: { fontWeight: "700", fontSize: "1.1rem" },
  selectStyle: { padding: "12px 15px", borderRadius: "10px", border: "2px solid #e2e8f0", fontSize: "1rem", width: "100%", cursor: "pointer", outline: "none" },
  dividerContainer: { display: "flex", alignItems: "center", gap: "15px", marginBottom: "30px" },
  dividerLine: { flex: 1, height: "1px", background: "#e2e8f0" },
  dividerText: { color: "#718096", fontSize: "0.8rem", fontWeight: "600", textTransform: "uppercase" },
  gridContainer: { display: "grid", gap: "25px" },
  monthCard: { background: "#ffffff", padding: "25px 20px", borderRadius: "20px", textAlign: "center", transition: "all 0.4s ease", position: "relative", overflow: "hidden" },
  spinnerOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255, 255, 255, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 },
  spinner: { width: "25px", height: "25px", border: "3px solid #f3f3f3", borderTop: "3px solid #1a237e", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  iconCircle: { width: "55px", height: "55px", borderRadius: "14px", margin: "0 auto 15px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", fontWeight: "800" },
  monthName: { margin: "0 0 12px 0", fontSize: "1.2rem", fontWeight: "700" },
  cardFooter: { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", borderTop: "1px solid #f1f5f9", paddingTop: "12px" },
  statusDot: { width: "7px", height: "7px", borderRadius: "50%" },
  actionLink: { fontSize: "0.85rem", fontWeight: "600", color: "#1a237e" },
  footerBox: { marginTop: "40px", textAlign: "center", padding: "20px", color: "#718096", fontSize: "0.8rem" }
};

export default AdminFees;