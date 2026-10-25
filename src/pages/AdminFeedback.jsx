import React, { useEffect, useState, useCallback } from "react";
import api from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaStar, FaRegStar, FaSearch, FaMicrophone, 
  FaChartLine, FaAward, FaUserTie, FaBook, FaCalendarAlt, FaGraduationCap, FaChartPie
} from "react-icons/fa";

const API_URL = "https://student-management-system-4-hose.onrender.com/api/feedback/admin/all";

/* ================= HELPERS ================= */

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const getMonthLabel = (m, y) => `${monthNames[Number(m) - 1]} ${y}`;

const parsePercentage = (val) => {
  const num = Number(val);
  if (isNaN(num)) return 0;
  return Math.min(Math.max(num, 0), 100);
};

const getRemarks = (percentage) => {
  if (percentage >= 95) return { text: "Excellence Teaching Skills", color: "#16a34a", bg: "#dcfce7" };
  if (percentage >= 80) return { text: "Highly Interactive", color: "#22c55e", bg: "#f0fdf4" };
  if (percentage >= 60) return { text: "Satisfactory Performance", color: "#2563eb", bg: "#eff6ff" };
  if (percentage >= 40) return { text: "Needs Improvement", color: "#d97706", bg: "#fef3c7" };
  return { text: "Critical Support Required", color: "#dc2626", bg: "#fee2e2" };
};

const AdminFeedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialSplash, setInitialSplash] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [viewMode, setViewMode] = useState("table"); // "table" or "analytics"

  // Filter States
  const [selectedMonthYear, setSelectedMonthYear] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  /* ================= FETCH ================= */

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(API_URL);
      const data = res.data.feedbacks || [];
      setFeedbacks(data);

      if (data.length > 0) {
        const sorted = [...data].sort((a, b) => {
          if (b.year !== a.year) return b.year - a.year;
          return b.month - a.month;
        });
        const latest = sorted[0];
        setSelectedMonthYear(`${latest.year}-${latest.month}`);
      } else {
        const now = new Date();
        setSelectedMonthYear(`${now.getFullYear()}-${now.getMonth() + 1}`);
      }
    } catch (err) {
      console.error("Database Synchronization Failed", err);
    } finally {
      setLoading(false);
      // Brief timer for splash entrance effect
      setTimeout(() => setInitialSplash(false), 1400);
    }
  }, []);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  /* ================= VOICE SEARCH ================= */

  const handleVoiceSearch = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Browser not supported");

    const recognition = new SpeechRecognition();
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (e) =>
      setSearchTerm(e.results[0][0].transcript);
    recognition.start();
  };

  /* UNIQUE AVAILABLE MONTHS */
  const availableMonths = Array.from(
    new Set(feedbacks.map((f) => `${f.year}-${f.month}`))
  ).sort((a, b) => {
    const [y1, m1] = a.split("-").map(Number);
    const [y2, m2] = b.split("-").map(Number);
    if (y2 !== y1) return y2 - y1;
    return m2 - m1;
  });

  const classesList = [...new Set(feedbacks.map((f) => f.class || f.className).filter(Boolean))];
  const subjectsList = [...new Set(feedbacks.map((f) => f.subject || f.subject_name).filter(Boolean))];

  /* FILTER FEEDBACKS */
  const filteredFeedbacks = feedbacks.filter((f) => {
    const monthYearKey = `${f.year}-${f.month}`;
    const matchesMonth = selectedMonthYear ? monthYearKey === selectedMonthYear : true;
    const matchesSearch = (f.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (f.teacher_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (f.subject || f.subject_name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchClass = selectedClass ? (f.class === selectedClass || f.className === selectedClass) : true;
    const matchSubject = selectedSubject ? (f.subject === selectedSubject || f.subject_name === selectedSubject) : true;

    return matchesMonth && matchesSearch && matchClass && matchSubject;
  });

  /* GROUP BY CLASS -> SUBJECT */
  const groupedData = filteredFeedbacks.reduce((acc, f) => {
    const className = f.class || f.className || "General";
    const subjectName = f.subject || f.subject_name || "General Subject";

    if (!acc[className]) acc[className] = {};
    if (!acc[className][subjectName]) acc[className][subjectName] = [];

    acc[className][subjectName].push(f);
    return acc;
  }, {});

  /* OVERALL METRICS FOR SELECTED MONTH */
  const totalSubmissions = filteredFeedbacks.length;
  const avgRating = totalSubmissions > 0 
    ? (filteredFeedbacks.reduce((sum, f) => sum + Number(f.rating || 0), 0) / totalSubmissions).toFixed(1) 
    : "0.0";
  
  const avgSentiment = totalSubmissions > 0
    ? Math.round(filteredFeedbacks.reduce((sum, f) => sum + parsePercentage(f.percentage), 0) / totalSubmissions)
    : 0;

  // Determine dynamic overall color (Green vs Red spectrum)
  const overallColor = avgSentiment >= 75 ? "#16a34a" : avgSentiment >= 50 ? "#2563eb" : "#dc2626";

  /* ================= RENDER TABLE ================= */

  const renderFeedbackTable = (items) => (
    <div style={{ overflowX: "auto" }}>
      <table style={enterpriseTable}>
        <thead>
          <tr style={tableHeaderRow}>
            <th style={th}>Student Details</th>
            <th style={th}>Faculty & Teacher ID</th>
            <th style={th}>Rating</th>
            <th style={th}>Reported Issue</th>
            <th style={th}>Suggestion</th>
            <th style={th}>Teaching Skill Score</th>
            <th style={th}>Skill Remarks</th>
          </tr>
        </thead>
        <tbody>
          {items.map((f, idx) => {
            const percentage = parsePercentage(f.percentage);
            const remark = getRemarks(percentage);
            const isCritical = f.rating <= 2;
            const studentName = f.student_name || f.name || "Student";
            const subjectName = f.subject || f.subject_name || "N/A";
            const teacherName = f.teacher_name || "Assigned Faculty";

            return (
              <motion.tr key={f.id || idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={td}>
                  <div style={identityGroup}>
                    <div
                      style={{
                        ...avatarStyle,
                        background: isCritical ? "#fee2e2" : "#ddd6fe",
                        color: isCritical ? "#dc2626" : "#6d28d9",
                      }}
                    >
                      {studentName.charAt(0)}
                    </div>
                    <div>
                      <div style={empName}>{studentName}</div>
                      <div style={empId}>UID-{f.student_id}</div>
                    </div>
                  </div>
                </td>

                <td style={td}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span style={{ fontWeight: "700", color: "#1e293b", fontSize: "13px" }}>
                      <FaUserTie style={{ marginRight: "4px", color: "#6d28d9" }} /> {teacherName}
                    </span>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>
                      ID: {f.teacher_id} | Subject: {subjectName}
                    </span>
                  </div>
                </td>

                <td style={td}>
                  <div style={ratingBox}>
                    {[...Array(5)].map((_, i) =>
                      i < f.rating ? (
                        <FaStar key={i} color="#f59e0b" />
                      ) : (
                        <FaRegStar key={i} color="#94a3b8" />
                      )
                    )}
                    <span style={ratingNum}>{f.rating}/5</span>
                  </div>
                </td>

                <td style={td}>{f.problem || "None"}</td>
                <td style={td}>{f.suggestion || "N/A"}</td>

                <td style={td}>
                  <div style={sentimentWrapper}>
                    <div style={barTrack}>
                      <div
                        style={{
                          ...barFill,
                          width: `${percentage}%`,
                          background: percentage >= 75 ? "#16a34a" : percentage >= 50 ? "#2563eb" : "#dc2626",
                        }}
                      />
                    </div>
                    <span style={sentimentLabel}>{percentage}% Effectiveness</span>
                  </div>
                </td>

                <td style={td}>
                  <div
                    style={{
                      ...remarkBadge,
                      color: remark.color,
                      background: remark.bg,
                      border: `1px solid ${remark.color}`,
                    }}
                  >
                    <FaAward size={10} /> {remark.text}
                  </div>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  /* ================= JSX ================= */

  return (
    <div style={appContainer}>
      {/* INITIAL SPLASH WELCOME ANIMATION OVERLAY */}
      <AnimatePresence>
        {initialSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={splashOverlay}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, type: "spring" }}
              style={splashCircle}
            >
              <div style={splashInnerContent}>
                <FaChartLine size={32} color="#6d28d9" />
                <span style={splashSmallText}>Your Overall Feedback</span>
                <h2 style={splashBigNumber}>{avgSentiment}%</h2>
                <p style={splashSubText}>Live Analytics Initializing...</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <header style={headerSection}>
        <div style={brandGroup}>
          <div style={logoBox}>
            <FaChartLine />
          </div>
          <div>
            <h1 style={mainTitle}>Admin Teaching Skills & Feedback Dashboard</h1>
            <p style={subTitle}>Class-wise & Subject-wise Performance Analysis</p>
          </div>
        </div>
        <button
          onClick={() => setViewMode(viewMode === "table" ? "analytics" : "table")}
          style={analyticsToggleButton}
        >
          <FaChartPie style={{ marginRight: "6px" }} />
          {viewMode === "table" ? "Analysis of Your Feedback" : "View Detailed Table"}
        </button>
      </header>

      {/* COMMAND BAR & MONTH/CLASS SELECTORS */}
      <div style={commandBarContainer}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", flex: 2 }}>
          {/* MONTH SELECTOR */}
          <div style={selectWrapper}>
            <FaCalendarAlt style={{ color: "#6d28d9" }} />
            <select 
              style={selectDropdown} 
              value={selectedMonthYear} 
              onChange={(e) => setSelectedMonthYear(e.target.value)}
            >
              {availableMonths.map((ym) => {
                const [y, m] = ym.split("-");
                return (
                  <option key={ym} value={ym}>
                    Cycle: {getMonthLabel(m, y)}
                  </option>
                );
              })}
            </select>
          </div>

          {/* CLASS FILTER */}
          <select 
            style={selectDropdown} 
            value={selectedClass} 
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="">All Classes</option>
            {classesList.map((cls) => (
              <option key={cls} value={cls}>Class {cls}</option>
            ))}
          </select>

          {/* SUBJECT FILTER */}
          <select 
            style={selectDropdown} 
            value={selectedSubject} 
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            <option value="">All Subjects</option>
            {subjectsList.map((sub) => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>

        {/* VOICE / TEXT SEARCH */}
        <div style={voiceSearchWrapper}>
          <FaSearch style={searchIcon} />
          <input
            placeholder="Search student, teacher, subject..."
            style={searchField}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            style={{ ...micBtn, color: isListening ? "#ff4d4d" : "#6d28d9" }}
            onClick={handleVoiceSearch}
            title="Voice Search"
            type="button"
          >
            <FaMicrophone />
          </button>
        </div>
      </div>

      {/* SUMMARY METRICS CARDS WITH LIVE BIG CIRCLE */}
      <div style={metricsGrid}>
        <div style={metricCard}>
          {/* Live Big Circle Indicator */}
          <div style={{ ...liveCircleOuter, borderColor: overallColor }}>
            <span style={{ ...liveCircleText, color: overallColor }}>{avgSentiment}%</span>
          </div>
          <div>
            <span style={metricLabel}>Overall Feedback Score</span>
            <h3 style={metricValue}>Live Computed</h3>
          </div>
        </div>

        <div style={metricCard}>
          <div style={{ ...metricIcon, background: "#ede9fe", color: "#6d28d9" }}>
            <FaChartLine />
          </div>
          <div>
            <span style={metricLabel}>Total Submissions</span>
            <h3 style={metricValue}>{totalSubmissions}</h3>
          </div>
        </div>

        <div style={metricCard}>
          <div style={{ ...metricIcon, background: "#fef3c7", color: "#d97706" }}>
            <FaStar />
          </div>
          <div>
            <span style={metricLabel}>Average Faculty Rating</span>
            <h3 style={metricValue}>{avgRating} / 5.0</h3>
          </div>
        </div>
      </div>

      {/* STRUCTURED CONTENT AREA */}
      <main style={{ padding: "24px 32px 60px" }}>
        {loading ? (
          <div style={loaderStyle}>Loading and analyzing feedback records...</div>
        ) : Object.keys(groupedData).length === 0 ? (
          <div style={emptyState}>No feedback records found for {selectedMonthYear ? getMonthLabel(...selectedMonthYear.split("-")) : "this period"}.</div>
        ) : viewMode === "analytics" ? (
          /* ================= ANALYSIS VIEW (SUBJECT & FACULTY LIST) ================= */
          <div style={analyticsViewContainer}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", marginBottom: "16px" }}>
              Assigned Subjects & Faculty Live Effectiveness Breakdown
            </h2>
            <div style={analyticsGridList}>
              {Object.entries(groupedData).map(([className, subjects]) =>
                Object.entries(subjects).map(([subjectName, items]) => {
                  const subAvgScore = Math.round(
                    items.reduce((acc, cur) => acc + parsePercentage(cur.percentage), 0) / items.length
                  );
                  const facultyName = items[0]?.teacher_name || "Assigned Faculty";
                  const scoreColor = subAvgScore >= 75 ? "#16a34a" : subAvgScore >= 50 ? "#2563eb" : "#dc2626";

                  return (
                    <div key={`${className}-${subjectName}`} style={analyticsCardItem}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <span style={analyticsClassBadge}>Class {className}</span>
                          <h4 style={analyticsSubjectTitle}>{subjectName}</h4>
                          <p style={analyticsTeacherText}>
                            <FaUserTie style={{ marginRight: "4px", color: "#6d28d9" }} /> {facultyName}
                          </p>
                        </div>
                        <div style={{ ...analyticsScoreBadge, background: scoreColor }}>
                          {subAvgScore}%
                        </div>
                      </div>
                      <div style={{ marginTop: "14px" }}>
                        <div style={barTrack}>
                          <div style={{ ...barFill, width: `${subAvgScore}%`, background: scoreColor }} />
                        </div>
                        <span style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", display: "block" }}>
                          Based on {items.length} student submission{items.length > 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* ================= TABLE VIEW ================= */
          Object.entries(groupedData).map(([className, subjects]) => (
            <div key={className} style={classSectionContainer}>
              <div style={classHeaderBanner}>
                <FaGraduationCap style={{ fontSize: "18px", color: "#6d28d9" }} />
                <h2 style={classTitleText}>Class {className} Evaluation</h2>
              </div>

              {Object.entries(subjects).map(([subjectName, items]) => (
                <div key={subjectName} style={subjectSubSection}>
                  <div style={subjectHeaderBar}>
                    <span style={subjectTitleText}>
                      <FaBook style={{ marginRight: "6px", color: "#475569" }} /> Subject: {subjectName}
                    </span>
                    <span style={feedbackCountBadge}>{items.length} Feedback{items.length > 1 ? "s" : ""}</span>
                  </div>

                  {renderFeedbackTable(items)}
                </div>
              ))}
            </div>
          ))
        )}
      </main>
    </div>
  );
};

/* ================= STYLES ================= */

const appContainer = { background: "#f8fafc", minHeight: "100vh", width: "100%", fontFamily: "'Inter', system-ui, sans-serif" };
const headerSection = { padding: "24px 32px", background: "#0f172a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" };
const brandGroup = { display: "flex", gap: "14px", alignItems: "center" };
const logoBox = { width: 42, height: 42, borderRadius: "10px", background: "#6d28d9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", color: "#fff" };
const mainTitle = { fontSize: 18, fontWeight: 800, margin: 0 };
const subTitle = { fontSize: 12, opacity: 0.7, margin: "2px 0 0" };

const analyticsToggleButton = { background: "#6d28d9", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "8px", fontWeight: "700", fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", transition: "background 0.2s" };

const splashOverlay = { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(15, 23, 42, 0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" };
const splashCircle = { width: 220, height: 220, borderRadius: "50%", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)" };
const splashInnerContent = { textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" };
const splashSmallText = { fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" };
const splashBigNumber = { fontSize: "36px", fontWeight: "900", color: "#0f172a", margin: 0 };
const splashSubText = { fontSize: "10px", color: "#94a3b8", fontWeight: "600" };

const commandBarContainer = { padding: "16px 32px", display: "flex", gap: "12px", flexWrap: "wrap", background: "#ffffff", borderBottom: "1px solid #e2e8f0", alignItems: "center" };
const selectWrapper = { display: "flex", alignItems: "center", gap: "8px", background: "#f1f5f9", padding: "0 12px", borderRadius: "8px", border: "1px solid #cbd5e1" };
const selectDropdown = { padding: "10px 6px", borderRadius: "8px", border: "none", background: "transparent", fontSize: "13px", fontWeight: "700", color: "#1e293b", cursor: "pointer", outline: "none" };

const voiceSearchWrapper = { position: "relative", flex: 1, minWidth: "260px" };
const searchIcon = { position: "absolute", top: 13, left: 14, color: "#94a3b8" };
const searchField = { width: "100%", padding: "11px 40px 11px 38px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "13px", boxSizing: "border-box", background: "#fff" };
const micBtn = { position: "absolute", right: 10, top: 9, background: "none", border: "none", cursor: "pointer", fontSize: "16px" };

const metricsGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px", padding: "20px 32px 0" };
const metricCard = { background: "#fff", padding: "18px 20px", borderRadius: "12px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" };
const metricIcon = { width: 50, height: 50, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 };

const liveCircleOuter = { width: 50, height: 50, borderRadius: "50%", border: "4px solid", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "#f8fafc" };
const liveCircleText = { fontSize: "12px", fontWeight: "800" };

const metricLabel = { display: "block", fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" };
const metricValue = { margin: "2px 0 0", fontSize: "18px", fontWeight: "800", color: "#0f172a" };

const classSectionContainer = { marginBottom: "32px", background: "#fff", borderRadius: "16px", border: "1px solid #cbd5e1", overflow: "hidden", boxShadow: "0 4px 12px rgba(15,23,42,0.03)" };
const classHeaderBanner = { background: "#1e293b", color: "#fff", padding: "14px 20px", display: "flex", alignItems: "center", gap: "10px" };
const classTitleText = { margin: 0, fontSize: "16px", fontWeight: "800" };

const subjectSubSection = { borderTop: "1px solid #e2e8f0" };
const subjectHeaderBar = { padding: "12px 20px", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0" };
const subjectTitleText = { fontSize: "14px", fontWeight: "700", color: "#334155", display: "flex", alignItems: "center" };
const feedbackCountBadge = { fontSize: "11px", fontWeight: "700", background: "#e2e8f0", color: "#475569", padding: "3px 8px", borderRadius: "12px" };

const enterpriseTable = { width: "100%", borderCollapse: "collapse", background: "#fff" };
const tableHeaderRow = { background: "#f1f5f9", color: "#334155" };
const th = { padding: "12px 18px", fontSize: "11px", fontWeight: "800", textAlign: "left", letterSpacing: "0.5px", textTransform: "uppercase" };
const td = { padding: "14px 18px", borderBottom: "1px solid #e2e8f0", fontSize: "13px", color: "#334155", verticalAlign: "middle" };

const identityGroup = { display: "flex", gap: "10px", alignItems: "center" };
const avatarStyle = { width: 34, height: 34, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "13px", flexShrink: 0 };
const empName = { fontWeight: "700", color: "#0f172a" };
const empId = { fontSize: "11px", color: "#64748b" };

const ratingBox = { display: "flex", gap: "3px", alignItems: "center" };
const ratingNum = { fontWeight: "700", marginLeft: "6px", fontSize: "12px", color: "#1e293b" };

const sentimentWrapper = { width: "130px" };
const barTrack = { height: "6px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden", marginBottom: "4px" };
const barFill = { height: "100%", borderRadius: "4px", transition: "width 0.6s ease" };
const sentimentLabel = { fontSize: "10px", fontWeight: "700", color: "#475569" };

const remarkBadge = { padding: "5px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap" };

const analyticsViewContainer = { background: "#fff", padding: "24px", borderRadius: "16px", border: "1px solid #cbd5e1" };
const analyticsGridList = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" };
const analyticsCardItem = { background: "#f8fafc", border: "1px solid #e2e8f0", padding: "18px", borderRadius: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.01)" };
const analyticsClassBadge = { fontSize: "10px", fontWeight: "800", background: "#ede9fe", color: "#6d28d9", padding: "2px 8px", borderRadius: "6px", textTransform: "uppercase" };
const analyticsSubjectTitle = { margin: "8px 0 4px", fontSize: "15px", fontWeight: "800", color: "#0f172a" };
const analyticsTeacherText = { fontSize: "12px", color: "#64748b", margin: 0, fontWeight: "600" };
const analyticsScoreBadge = { color: "#fff", padding: "6px 10px", borderRadius: "8px", fontWeight: "800", fontSize: "13px" };

const loaderStyle = { textAlign: "center", padding: "60px", color: "#64748b", fontWeight: "600", fontSize: "14px" };
const emptyState = { padding: "50px", textAlign: "center", color: "#64748b", fontStyle: "italic", fontSize: "14px", background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0" };

export default AdminFeedback;