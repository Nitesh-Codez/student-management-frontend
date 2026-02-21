import React, { useState, useEffect } from "react";
import axios from "axios";

/**
 * SMART STUDENTS CLASSES - OFFICIAL RESULT PORTAL
 * Version: 5.0.0 (Full Edge-to-Edge Professional Layout)
 * Optimized for Mobile & Desktop
 */

const API_URL = "https://student-management-system-4-hose.onrender.com";

export default function ViewResults() {
  // --- States ---
  const [groupedResults, setGroupedResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeClass, setActiveClass] = useState(null);
  const [activeExam, setActiveExam] = useState(null);
  const [currentStudentClass, setCurrentStudentClass] = useState(null);
  const [studentName, setStudentName] = useState("");

  // --- Data Initialization ---
  useEffect(() => {
    const loadResult = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (user && user.name) {
          setStudentName(user.name);
          const classMatch = user.class?.match(/\d+/);
          setCurrentStudentClass(classMatch ? parseInt(classMatch[0]) : null);

          const res = await axios.get(`${API_URL}/api/results/search`, {
            params: { name: user.name }
          });

          // Grouping logic for clean class-wise structure
          const grouped = res.data.reduce((acc, curr) => {
            const className = curr.class || "Other";
            if (!acc[className]) acc[className] = [];
            acc[className].push(curr);
            return acc;
          }, {});

          setGroupedResults(grouped);
        }
      } catch (err) {
        console.error("Database Connection Error:", err);
      } finally {
        // Aesthetic delay for board-like "Processing" feel
        setTimeout(() => setLoading(false), 1200);
      }
    };
    loadResult();
  }, []);

  // --- Dynamic Academic Year Logic ---
  const getAutoYear = (selectedCls) => {
    const baseYear = 2025;
    const selNum = parseInt(selectedCls?.match(/\d+/)?.[0]);
    if (!currentStudentClass || !selNum) return "2025-26";
    const diff = currentStudentClass - selNum;
    const targetYear = baseYear - diff;
    return `${targetYear}-${(targetYear + 1).toString().slice(-2)}`;
  };

  // --- Loading State Component ---
  if (loading) return (
    <div style={loaderPage}>
      <div style={officialLoaderBox}>
        <div style={spinnerRing}></div>
        <h2 style={loaderTitle}>SECURE SERVER</h2>
        <p style={loaderSubtitle}>Fetching Digital Transcripts for {studentName.toUpperCase()}...</p>
      </div>
    </div>
  );

  const classes = Object.keys(groupedResults).sort((a, b) => parseInt(b) - parseInt(a));

  return (
    <div style={fullWidthContainer}>
      
      {/* 1. TOP BRANDING HEADER (Edge-to-Edge) */}
      <header style={officialHeader}>
        <div style={headerTop}>
          <div style={govTag}> SMARTZONE ACADEMICS</div>
          <div style={headerMain}>
            <div style={logoBadge}>Smart Students Classes</div>
            <div style={headerTextGroup}>
              <h1 style={mainPortalTitle}>SMART STUDENTS CLASSES</h1>
              <p style={subPortalTitle}>NATIONAL DIGITAL EXAMINATION RECORD SYSTEM</p>
            </div>
          </div>
        </div>
        
        {/* News Ticker */}
        <div style={tickerContainer}>
          <div style={tickerLabel}>LATEST NEWS</div>
          <div style={tickerScrollArea}>
            <div style={tickerTrack}>
              Important: Examination results for Session {getAutoYear(activeClass)} are now officially verified and uploaded. Students can download their digital transcripts directly from this portal. • Please verify all marks and subjects before final submission. • SSC Examination Board is committed to 100% Transparency.
            </div>
          </div>
        </div>
      </header>

      <main style={contentMain}>
        
        {/* STEP 1: CLASS SELECTION (Horizontal Tabs Style) */}
        {!activeClass && (
          <section style={stepSection}>
            <div style={pageLead}>
              <h2 style={pageTitle}>Student Record History</h2>
              <p style={pageDesc}>Welcome, <strong>{studentName}</strong>. Select your academic grade below.</p>
            </div>
            
            <div style={classGrid}>
              {classes.map((cls) => (
                <button key={cls} onClick={() => setActiveClass(cls)} style={classRecordCard}>
                  <span style={folderIcon}>📁</span>
                  <div style={classInfo}>
                    <div style={classLabel}>ACADEMIC GRADE</div>
                    <div style={classNameValue}>CLASS {cls}</div>
                  </div>
                  <span style={nextArrow}>&#10142;</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* STEP 2: EXAM SELECTION (Official Term Pills) */}
        {activeClass && !activeExam && (
          <section style={stepSection}>
            <div style={breadCrumb}>
              <button onClick={() => setActiveClass(null)} style={backLink}>
                &#8592; Back to Class Selection
              </button>
            </div>
            
            <div style={pageLead}>
              <h2 style={pageTitle}>Examination Terms</h2>
              <p style={pageDesc}>Records found for <strong>Class {activeClass}</strong> | Session {getAutoYear(activeClass)}</p>
            </div>

            <div style={examButtonGroup}>
              {groupedResults[activeClass].map((exam, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setActiveExam(exam)} 
                  style={examPillButton}
                >
                  <div style={examStatusDot}></div>
                  {exam.exam_term.toUpperCase()}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* STEP 3: FINAL MARKSHEET (Full Edge-to-Edge) */}
        {activeExam && (
          <section style={marksheetSection}>
            <div style={breadCrumbPadding}>
              <button onClick={() => setActiveExam(null)} style={backLink}>
                &#8592; Back to Exam Terms
              </button>
            </div>

            <div style={officialTranscriptFrame}>
              {/* Header inside transcript */}
              <div style={transcriptTop}>
                <h3 style={transcriptHeadline}>{activeExam.exam_term.toUpperCase()} TRANSCRIPT</h3>
                <div style={infoStrips}>
                  <div style={infoStrip}><strong>CANDIDATE:</strong> {studentName.toUpperCase()}</div>
                  <div style={infoStrip}><strong>CLASS:</strong> {activeClass} | <strong>SESSION:</strong> {getAutoYear(activeClass)}</div>
                </div>
              </div>

              {/* Data Table - EDGE TO EDGE */}
              <table style={transcriptTable}>
                <thead>
                  <tr>
                    <th style={thStyle}>SUBJECT DESCRIPTION</th>
                    <th style={thStyle}>MAX</th>
                    <th style={thStyle}>OBTAINED</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(activeExam.marks).map(([sub, val]) => (
                    <tr key={sub} style={trStyle}>
                      <td style={tdStyle}>{sub.toUpperCase()}</td>
                      <td style={tdStyle}>100</td>
                      <td style={tdMarks}>{val}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={footerRowStyle}>
                    <td style={tdStyle}><strong>GRAND TOTAL</strong></td>
                    <td style={tdStyle}><strong>{activeExam.total_max_marks}</strong></td>
                    <td style={tdGrandMarks}>{activeExam.obtained_marks}</td>
                  </tr>
                </tfoot>
              </table>

              {/* Performance Summary Banner */}
              <div style={performanceBanner}>
                <div style={percCol}>
                  <span style={percLabel}>FINAL PERCENTAGE</span>
                  <span style={percVal}>{activeExam.percentage}%</span>
                </div>
                <div style={divider}></div>
                <div style={statusCol}>
                  <span style={statusLabel}>RESULT STATUS</span>
                  <span style={statusVal}>{parseFloat(activeExam.percentage) >= 33 ? "PASSED" : "FAILED"}</span>
                </div>
              </div>

              {/* Footer Note */}
              <div style={footerDisclaimer}>
                <p>* This is an electronically generated report card. Original hardcopy with school seal is required for official admission processes.</p>
                <div style={qrPlaceholder}>[ VERIFIED RECORD ]</div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* 4. OFFICIAL FOOTER (Edge-to-Edge) */}
      <footer style={portalFooter}>
        <div style={footerBranding}> DIGITAL PORTAL</div>
        <p style={footerCopyright}>© 2026 Smart Students Classes. Managed by National Exam Board.</p>
        <div style={footerLegal}>
          Information Technology Act 2000 Compliance | Privacy Policy | Disclaimer
        </div>
      </footer>

      {/* Global Scoped Styles */}
      <style>{`
        @keyframes tickerMove { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        
        button:hover { filter: brightness(1.1); transition: 0.3s; }
        button:active { transform: scale(0.96); }
      `}</style>
    </div>
  );
}

// --- OFFICIAL STYLING OBJECTS (450+ Lines Equivalent Structure) ---

const fullWidthContainer = {
  width: "100%", minHeight: "100vh", display: "flex", flexDirection: "column",
  background: "#f9fafb", fontFamily: "'Inter', 'Segoe UI', sans-serif"
};

// Official Header
const officialHeader = {
  width: "100%", background: "#0d47a1", color: "#fff",
  borderBottom: "5px solid #ffca28", boxShadow: "0 4px 10px rgba(0,0,0,0.1)"
};

const headerTop = { padding: "25px 15px", textAlign: "center" };
const govTag = { fontSize: "10px", letterSpacing: "2px", opacity: 0.8, marginBottom: "10px" };
const headerMain = { display: "flex", justifyContent: "center", alignItems: "center", gap: "15px" };
const logoBadge = { background: "#fff", color: "#0d47a1", padding: "10px 14px", borderRadius: "10px", fontWeight: "900", fontSize: "22px" };
const headerTextGroup = { textAlign: "left" };
const mainPortalTitle = { margin: 0, fontSize: "20px", fontWeight: "900", letterSpacing: "1px" };
const subPortalTitle = { margin: 0, fontSize: "9px", opacity: 0.7, fontWeight: "600" };

// Ticker
const tickerContainer = { display: "flex", background: "#ffca28", color: "#1a237e", height: "35px", alignItems: "center" };
const tickerLabel = { background: "#b71c1c", color: "#fff", height: "100%", padding: "0 15px", fontSize: "11px", fontWeight: "900", display: "flex", alignItems: "center" };
const tickerScrollArea = { flex: 1, overflow: "hidden", whiteSpace: "nowrap" };
const tickerTrack = { display: "inline-block", animation: "tickerMove 25s linear infinite", fontSize: "12px", fontWeight: "700" };

// Body
const contentMain = { flex: 1, width: "100%", animation: "slideUp 0.6s ease-out" };
const stepSection = { padding: "30px 15px" };
const pageLead = { textAlign: "center", marginBottom: "30px" };
const pageTitle = { fontSize: "24px", color: "#1a237e", fontWeight: "800", margin: "0 0 5px 0" };
const pageDesc = { color: "#666", fontSize: "14px" };

// Class Selection Cards
const classGrid = { display: "flex", flexDirection: "column", gap: "12px" };
const classRecordCard = {
  display: "flex", alignItems: "center", padding: "18px", background: "#fff",
  border: "1px solid #e0e6ed", borderRadius: "14px", cursor: "pointer",
  boxShadow: "0 3px 6px rgba(0,0,0,0.03)"
};
const folderIcon = { fontSize: "28px", marginRight: "15px" };
const classInfo = { flex: 1, textAlign: "left" };
const classLabel = { fontSize: "10px", color: "#999", fontWeight: "700" };
const classNameValue = { fontSize: "18px", fontWeight: "800", color: "#333" };
const nextArrow = { color: "#0d47a1", fontWeight: "bold" };

// Exam Selection (Pills Style - as per image)
const breadCrumb = { marginBottom: "15px" };
const backLink = { background: "none", border: "none", color: "#0d47a1", fontWeight: "700", cursor: "pointer", fontSize: "13px" };
const examButtonGroup = { display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center" };
const examPillButton = {
  padding: "15px 35px", background: "#fff", border: "2px solid #0d47a1",
  borderRadius: "50px", color: "#0d47a1", fontWeight: "900", fontSize: "14px",
  cursor: "pointer", display: "flex", alignItems: "center", gap: "10px",
  boxShadow: "0 4px 12px rgba(13, 71, 161, 0.15)"
};
const examStatusDot = { width: "8px", height: "8px", background: "#4caf50", borderRadius: "50%" };

// Marksheet Section (Edge-to-Edge)
const marksheetSection = { width: "100%" };
const breadCrumbPadding = { padding: "15px" };
const officialTranscriptFrame = { width: "100%", background: "#fff", boxShadow: "0 -5px 25px rgba(0,0,0,0.05)" };
const transcriptTop = { padding: "30px 15px", textAlign: "center", borderTop: "6px solid #0d47a1" };
const transcriptHeadline = { fontSize: "22px", color: "#0d47a1", margin: "0 0 15px 0", letterSpacing: "1px" };
const infoStrips = { display: "flex", flexDirection: "column", gap: "5px", background: "#f8f9fa", padding: "15px", borderRadius: "8px" };
const infoStrip = { fontSize: "12px", color: "#555" };

// Table Styles
const transcriptTable = { width: "100%", borderCollapse: "collapse" };
const thStyle = { background: "#f1f3f6", padding: "15px 12px", textAlign: "left", fontSize: "11px", fontWeight: "900", color: "#1a237e", borderBottom: "2px solid #dee2e6" };
const trStyle = { borderBottom: "1px solid #f0f0f0" };
const tdStyle = { padding: "18px 12px", fontSize: "15px", color: "#333" };
const tdMarks = { padding: "18px 12px", fontSize: "16px", fontWeight: "900", color: "#1a237e", textAlign: "right" };
const footerRowStyle = { background: "#f8f9fa", borderTop: "2px solid #0d47a1" };
const tdGrandMarks = { padding: "18px 12px", fontSize: "18px", fontWeight: "900", color: "#d32f2f", textAlign: "right" };

// Performance Banner
const performanceBanner = { 
  display: "flex", background: "#0d47a1", color: "#fff", padding: "25px 15px",
  textAlign: "center", alignItems: "center", justifyContent: "space-around"
};
const percCol = { display: "flex", flexDirection: "column" };
const percLabel = { fontSize: "11px", opacity: 0.8, fontWeight: "600" };
const percVal = { fontSize: "32px", fontWeight: "900", color: "#ffca28" };
const divider = { width: "1px", height: "40px", background: "rgba(255,255,255,0.2)" };
const statusCol = { display: "flex", flexDirection: "column" };
const statusLabel = { fontSize: "11px", opacity: 0.8, fontWeight: "600" };
const statusVal = { fontSize: "22px", fontWeight: "900" };

const footerDisclaimer = { padding: "30px 15px", textAlign: "center" };
const qrPlaceholder = { marginTop: "15px", fontSize: "10px", color: "#ccc", fontWeight: "bold", border: "1px dashed #eee", display: "inline-block", padding: "10px 20px" };

// Footer
const portalFooter = { background: "#1a237e", color: "#fff", padding: "40px 15px", textAlign: "center" };
const footerBranding = { fontSize: "14px", fontWeight: "900", marginBottom: "10px", letterSpacing: "1px" };
const footerCopyright = { fontSize: "11px", opacity: 0.7, margin: "0 0 10px 0" };
const footerLegal = { fontSize: "9px", opacity: 0.4, letterSpacing: "0.5px" };

// Loader
const loaderPage = { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d47a1", color: "#fff" };
const officialLoaderBox = { textAlign: "center" };
const spinnerRing = { width: "50px", height: "50px", border: "5px solid rgba(255,255,255,0.2)", borderTopColor: "#ffca28", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 20px" };
const loaderTitle = { fontSize: "18px", fontWeight: "900", margin: 0 };
const loaderSubtitle = { fontSize: "11px", opacity: 0.7, marginTop: "5px" };