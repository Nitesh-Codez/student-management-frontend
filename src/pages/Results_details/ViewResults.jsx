import React, { useState, useEffect } from "react";
import axios from "axios";

/**
 * SMART STUDENTS CLASSES - OFFICIAL RESULT PORTAL
 * Version: 5.1.0 (Strict Edge-to-Edge Layout)
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
    // Resetting body margins for strict edge-to-edge
    document.body.style.margin = "0";
    document.body.style.padding = "0";

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
        setTimeout(() => setLoading(false), 1200);
      }
    };
    loadResult();
  }, []);

  const getAutoYear = (selectedCls) => {
    const baseYear = 2025;
    const selNum = parseInt(selectedCls?.match(/\d+/)?.[0]);
    if (!currentStudentClass || !selNum) return "2025-26";
    const diff = currentStudentClass - selNum;
    const targetYear = baseYear - diff;
    return `${targetYear}-${(targetYear + 1).toString().slice(-2)}`;
  };

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
      
      {/* 1. TOP BRANDING HEADER */}
      <header style={officialHeader}>
        <div style={headerTop}>
          <div style={govTag}>SMARTZONE ACADEMICS</div>
          <div style={headerMain}>
            <div style={logoBadge}></div>
            <div style={headerTextGroup}>
              <h1 style={mainPortalTitle}>SMART STUDENTS CLASSES</h1>
              <p style={subPortalTitle}>DIGITAL EXAMINATION RECORD SYSTEM</p>
            </div>
          </div>
        </div>
        
        {/* News Ticker */}
        <div style={tickerContainer}>
          <div style={tickerLabel}>NEWS</div>
          <div style={tickerScrollArea}>
            <div style={tickerTrack}>
              Important: Examination results for Session {getAutoYear(activeClass)} are now officially verified. Students can download digital transcripts.
            </div>
          </div>
        </div>
      </header>

      <main style={contentMain}>
        
        {/* STEP 1: CLASS SELECTION */}
        {!activeClass && (
          <section style={stepSection}>
            <div style={pageLead}>
              <h2 style={pageTitle}>Record History</h2>
              <p style={pageDesc}>Welcome, <strong>{studentName}</strong>.</p>
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

        {/* STEP 2: EXAM SELECTION */}
        {activeClass && !activeExam && (
          <section style={stepSection}>
            <div style={breadCrumb}>
              <button onClick={() => setActiveClass(null)} style={backLink}>
                &#8592; Back
              </button>
            </div>
            
            <div style={pageLead}>
              <h2 style={pageTitle}>Class {activeClass} Terms</h2>
              <p style={pageDesc}>Session {getAutoYear(activeClass)}</p>
            </div>

            <div style={examButtonGroup}>
              {groupedResults[activeClass].map((exam, idx) => (
                <button key={idx} onClick={() => setActiveExam(exam)} style={examPillButton}>
                  <div style={examStatusDot}></div>
                  {exam.exam_term.toUpperCase()}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* STEP 3: FINAL MARKSHEET (Strict Edge-to-Edge) */}
        {activeExam && (
          <section style={marksheetSection}>
            <div style={breadCrumbPadding}>
              <button onClick={() => setActiveExam(null)} style={backLink}>
                &#8592; Back to Terms
              </button>
            </div>

            <div style={officialTranscriptFrame}>
              <div style={transcriptTop}>
                <h3 style={transcriptHeadline}>{activeExam.exam_term.toUpperCase()} TRANSCRIPT</h3>
                <div style={infoStrips}>
                  <div style={infoStrip}><strong>NAME:</strong> {studentName.toUpperCase()}</div>
                  <div style={infoStrip}><strong>CLASS:</strong> {activeClass} | <strong>SESSION:</strong> {getAutoYear(activeClass)}</div>
                </div>
              </div>

              <table style={transcriptTable}>
                <thead>
                  <tr>
                    <th style={thStyle}>SUBJECT</th>
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
                    <td style={tdStyle}><strong>TOTAL</strong></td>
                    <td style={tdStyle}><strong>{activeExam.total_max_marks}</strong></td>
                    <td style={tdGrandMarks}>{activeExam.obtained_marks}</td>
                  </tr>
                </tfoot>
              </table>

              <div style={performanceBanner}>
                <div style={percCol}>
                  <span style={percLabel}>PERCENTAGE</span>
                  <span style={percVal}>{activeExam.percentage}%</span>
                </div>
                <div style={divider}></div>
                <div style={statusCol}>
                  <span style={statusLabel}>STATUS</span>
                  <span style={statusVal}>{parseFloat(activeExam.percentage) >= 33 ? "PASSED" : "FAILED"}</span>
                </div>
              </div>

              <div style={footerDisclaimer}>
                <p style={{fontSize:'10px', color:'#999'}}>* Electronically generated report card.</p>
                <div style={qrPlaceholder}>[ VERIFIED ]</div>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer style={portalFooter}>
        <div style={footerBranding}> DIGITAL PORTAL</div>
        <p style={footerCopyright}>© 2026 Smart Students Classes.</p>
      </footer>

      <style>{`
        @keyframes tickerMove { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        button:active { transform: scale(0.98); }
      `}</style>
    </div>
  );
}

// --- UPDATED STYLES FOR EDGE-TO-EDGE ---

const fullWidthContainer = {
  width: "100%", minHeight: "100vh", display: "flex", flexDirection: "column",
  background: "#fff", fontFamily: "'Inter', sans-serif", margin: 0, padding: 0
};

const officialHeader = {
  width: "100%", background: "#0d47a1", color: "#fff",
  borderBottom: "4px solid #ffca28", margin: 0
};

const headerTop = { padding: "20px 10px", textAlign: "center" };
const govTag = { fontSize: "9px", letterSpacing: "1px", opacity: 0.8, marginBottom: "8px" };
const headerMain = { display: "flex", justifyContent: "center", alignItems: "center", gap: "10px" };
const logoBadge = { background: "#fff", color: "#0d47a1", padding: "8px 10px", borderRadius: "8px", fontWeight: "900", fontSize: "18px" };
const headerTextGroup = { textAlign: "left" };
const mainPortalTitle = { margin: 0, fontSize: "16px", fontWeight: "900" };
const subPortalTitle = { margin: 0, fontSize: "8px", opacity: 0.7 };

const tickerContainer = { display: "flex", background: "#ffca28", color: "#1a237e", height: "30px", alignItems: "center", overflow: "hidden" };
const tickerLabel = { background: "#b71c1c", color: "#fff", height: "100%", padding: "0 10px", fontSize: "10px", fontWeight: "900", display: "flex", alignItems: "center", zIndex: 2 };
const tickerScrollArea = { flex: 1, overflow: "hidden", whiteSpace: "nowrap" };
const tickerTrack = { display: "inline-block", animation: "tickerMove 20s linear infinite", fontSize: "11px", fontWeight: "600" };

const contentMain = { flex: 1, width: "100%", animation: "slideUp 0.4s ease-out" };
const stepSection = { padding: "20px 10px" };
const pageLead = { textAlign: "center", marginBottom: "20px" };
const pageTitle = { fontSize: "20px", color: "#1a237e", fontWeight: "800", margin: 0 };
const pageDesc = { color: "#666", fontSize: "13px", marginTop: "5px" };

const classGrid = { display: "flex", flexDirection: "column", gap: "10px" };
const classRecordCard = {
  display: "flex", alignItems: "center", padding: "15px", background: "#f8f9fa",
  border: "1px solid #eee", borderRadius: "10px", cursor: "pointer", width: "100%", textAlign: "left"
};
const folderIcon = { fontSize: "24px", marginRight: "12px" };
const classInfo = { flex: 1 };
const classLabel = { fontSize: "9px", color: "#999", fontWeight: "700" };
const classNameValue = { fontSize: "16px", fontWeight: "800", color: "#333" };
const nextArrow = { color: "#0d47a1", opacity: 0.5 };

const breadCrumb = { marginBottom: "10px" };
const backLink = { background: "#eee", border: "none", color: "#0d47a1", padding: "5px 12px", borderRadius: "5px", fontWeight: "700", cursor: "pointer", fontSize: "12px" };
const examButtonGroup = { display: "flex", flexDirection: "column", gap: "10px" };
const examPillButton = {
  padding: "15px", background: "#fff", border: "1px solid #0d47a1",
  borderRadius: "10px", color: "#0d47a1", fontWeight: "800", fontSize: "14px",
  cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", width: "100%"
};
const examStatusDot = { width: "8px", height: "8px", background: "#4caf50", borderRadius: "50%" };

const marksheetSection = { width: "100%", margin: 0 };
const breadCrumbPadding = { padding: "10px" };
const officialTranscriptFrame = { width: "100%", background: "#fff", margin: 0 };
const transcriptTop = { padding: "20px 10px", textAlign: "center", borderTop: "4px solid #0d47a1" };
const transcriptHeadline = { fontSize: "18px", color: "#0d47a1", margin: "0 0 10px 0" };
const infoStrips = { display: "flex", flexDirection: "column", gap: "4px", background: "#f8f9fa", padding: "10px" };
const infoStrip = { fontSize: "11px", color: "#333" };

const transcriptTable = { width: "100%", borderCollapse: "collapse", margin: 0 };
const thStyle = { background: "#f1f3f6", padding: "12px 10px", textAlign: "left", fontSize: "10px", fontWeight: "900", color: "#1a237e", borderBottom: "1px solid #dee2e6" };
const trStyle = { borderBottom: "1px solid #f0f0f0" };
const tdStyle = { padding: "12px 10px", fontSize: "13px", color: "#333" };
const tdMarks = { padding: "12px 10px", fontSize: "14px", fontWeight: "900", color: "#1a237e", textAlign: "right" };
const footerRowStyle = { background: "#f8f9fa", borderTop: "2px solid #0d47a1" };
const tdGrandMarks = { padding: "12px 10px", fontSize: "16px", fontWeight: "900", color: "#d32f2f", textAlign: "right" };

const performanceBanner = { 
  display: "flex", background: "#0d47a1", color: "#fff", padding: "20px 10px",
  textAlign: "center", alignItems: "center", justifyContent: "space-around"
};
const percCol = { display: "flex", flexDirection: "column" };
const percLabel = { fontSize: "10px", opacity: 0.8 };
const percVal = { fontSize: "28px", fontWeight: "900", color: "#ffca28" };
const divider = { width: "1px", height: "30px", background: "rgba(255,255,255,0.2)" };
const statusCol = { display: "flex", flexDirection: "column" };
const statusLabel = { fontSize: "10px", opacity: 0.8 };
const statusVal = { fontSize: "18px", fontWeight: "900" };

const footerDisclaimer = { padding: "20px 10px", textAlign: "center" };
const qrPlaceholder = { marginTop: "10px", fontSize: "9px", color: "#ccc", border: "1px dashed #eee", display: "inline-block", padding: "5px 15px" };

const portalFooter = { background: "#1a237e", color: "#fff", padding: "20px 10px", textAlign: "center" };
const footerBranding = { fontSize: "12px", fontWeight: "900", marginBottom: "5px" };
const footerCopyright = { fontSize: "10px", opacity: 0.6, margin: 0 };

const loaderPage = { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d47a1", color: "#fff" };
const officialLoaderBox = { textAlign: "center" };
const spinnerRing = { width: "40px", height: "40px", border: "4px solid rgba(255,255,255,0.2)", borderTopColor: "#ffca28", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 15px" };
const loaderTitle = { fontSize: "16px", fontWeight: "900", margin: 0 };
const loaderSubtitle = { fontSize: "10px", opacity: 0.7, marginTop: "5px" };