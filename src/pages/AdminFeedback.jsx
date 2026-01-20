import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { 
  FaStar, FaRegStar, FaSearch, FaMicrophone, 
  FaChartLine, FaFilter, FaExclamationTriangle, 
  FaLightbulb, FaAward 
} from "react-icons/fa";

const API_URL = "https://student-management-system-4-hose.onrender.com/api/feedback/admin/all";

const AdminFeedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isListening, setIsListening] = useState(false);

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(API_URL);
      setFeedbacks(res.data.feedbacks || []);
    } catch (err) {
      console.error("Database Synchronization Failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFeedbacks(); }, [fetchFeedbacks]);

  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Browser not supported");
    const recognition = new SpeechRecognition();
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (e) => setSearchTerm(e.results[0][0].transcript);
    recognition.start();
  };

  const calcSentiment = (mcq) => {
    if (!mcq || mcq.length === 0) return { pos: 0 };
    const posCount = mcq.filter(item => item.answer <= 2).length;
    const posPercent = Math.round((posCount / mcq.length) * 100);
    return { pos: posPercent };
  };

  // Logic for dynamic Remarks
  const getRemarks = (pos) => {
    if (pos >= 95) return { text: "Excellence Teaching Skills", color: "#6d28d9" };
    if (pos >= 80) return { text: "Highly Interactive", color: "#7c3aed" };
    if (pos >= 60) return { text: "Satisfactory Performance", color: "#8b5cf6" };
    if (pos >= 40) return { text: "Needs Improvement", color: "#475569" };
    return { text: "Critical Support Required", color: "#dc2626" };
  };

  return (
    <div style={appContainer}>
      {/* 1. TOP HEADER */}
      <header style={headerSection}>
        <div style={brandGroup}>
          <div style={logoBox}><FaChartLine /></div>
          <div>
            <h1 style={mainTitle}>Please Check Your Feedback Status !!</h1>
            <p style={subTitle}>Student Sentiment Analytics Dashboard</p>
          </div>
        </div>
        <div style={statsContainer}>
          <div style={statItem}>
            <span style={statVal}>{feedbacks.length}</span>
            <span style={statLab}>Total Feedbacks</span>
          </div>
          <div style={statDivider} />
          <div style={statItem}>
            <span style={{...statVal, color: '#a78bfa'}}>
              {feedbacks.length > 0 ? Math.round(feedbacks.reduce((acc, f) => acc + f.rating, 0) / feedbacks.length * 20) : 0}%
            </span>
            <span style={statLab}>Satisfaction Index</span>
          </div>
        </div>
      </header>

      {/* 2. SEARCH BAR */}
      <div style={commandBar}>
        <div style={searchCluster}>
          <div style={voiceSearchWrapper}>
            <FaSearch style={searchIcon} />
            <input 
              type="text" 
              placeholder="Search student..." 
              style={searchField}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button 
              style={{...micBtn, color: isListening ? '#ff4d4d' : '#6d28d9'}} 
              onClick={handleVoiceSearch}
            >
              <FaMicrophone />
            </button>
          </div>
        </div>
        <div style={actionCluster}>
          <button style={filterBtn}><FaFilter /> Advanced Filter</button>
        </div>
      </div>

      {/* 3. MAIN DATA TABLE */}
      <main style={gridWrapper}>
        <div style={scrollContainer}>
          <table style={enterpriseTable}>
            <thead>
              <tr style={tableHeaderRow}>
                <th style={th}>Student Details</th>
                <th style={th}>Rating</th>
                <th style={th}>Issue Reported</th>
                <th style={th}>Suggestions</th>
                <th style={th}>Overall Satisfaction</th>
                <th style={th}>Admin Remarks</th>
                <th style={th}>Class</th>
              </tr>
            </thead>
            <tbody>
              {feedbacks
                .filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((f, idx) => {
                  const { pos } = calcSentiment(f.mcq_answers);
                  const remark = getRemarks(pos);
                  const isCritical = f.rating <= 2;

                  return (
                    <motion.tr 
                      key={idx} 
                      style={dataRowStyle} 
                      className="row-hover"
                    >
                      <td style={td}>
                        <div style={identityGroup}>
                          <div style={{...avatarStyle, background: isCritical ? '#fee2e2' : '#ddd6fe', color: isCritical ? '#dc2626' : '#6d28d9'}}>
                            {f.name.charAt(0)}
                          </div>
                          <div>
                            <div style={empName}>{f.name}</div>
                            <div style={empId}>UID-0{idx + 101}</div>
                          </div>
                        </div>
                      </td>
                      <td style={td}>
                        <div style={ratingBox}>
                          {[...Array(5)].map((_, i) => (
                            i < f.rating ? <FaStar key={i} color="#f59e0b" /> : <FaRegStar key={i} color="#94a3b8" />
                          ))}
                          <span style={ratingNum}>{f.rating}/5</span>
                        </div>
                      </td>
                      <td style={td}>
                        <div style={contentRow}>
                          <FaExclamationTriangle size={12} color={isCritical ? "#dc2626" : "#475569"} />
                          <span style={textStyle}>{f.problem || "None"}</span>
                        </div>
                      </td>
                      <td style={td}>
                        <div style={contentRow}>
                          <FaLightbulb size={12} color="#6d28d9" />
                          <span style={textStyle}>{f.suggestion || "N/A"}</span>
                        </div>
                      </td>
                      <td style={td}>
                        <div style={sentimentWrapper}>
                          <div style={barTrack}>
                            {/* Bar is now Purple/Violet */}
                            <div style={{...barFill, width: `${pos}%`, background: 'linear-gradient(90deg, #a78bfa, #6d28d9)'}} />
                          </div>
                          <span style={{...sentimentLabel, color: '#6d28d9'}}>
                            {pos}% Harmony
                          </span>
                        </div>
                      </td>
                      <td style={td}>
                        <div style={{...remarkBadge, color: remark.color, border: `1px solid ${remark.color}`}}>
                          <FaAward size={10} style={{marginRight: '5px'}} />
                          {remark.text}
                        </div>
                      </td>
                      <td style={td}><span style={deptBadge}>{f.class}</span></td>
                    </motion.tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        {loading && <div style={loaderStyle}>Analyzing Feedback Streams...</div>}
      </main>

      <style>{`
        .row-hover:hover { background-color: #f5f3ff !important; }
        ::-webkit-scrollbar { height: 6px; }
        ::-webkit-scrollbar-thumb { background: #c4b5fd; border-radius: 10px; }
      `}</style>
    </div>
  );
};

// ============ REFINED STYLES ============
const appContainer = { background: "#fff", minHeight: "100vh", width: "100vw", overflowX: "hidden", fontFamily: "'Inter', sans-serif" };
const headerSection = { display: "flex", justifyContent: "space-between", padding: "25px 40px", background: "#0f172a", color: "#fff", borderBottom: "4px solid #6d28d9" };
const brandGroup = { display: "flex", alignItems: "center", gap: "15px" };
const logoBox = { width: "40px", height: "40px", background: "#6d28d9", borderRadius: "8px", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "20px" };
const mainTitle = { fontSize: "22px", margin: 0, fontWeight: "800", letterSpacing: "-0.5px" };
const subTitle = { fontSize: "12px", opacity: 0.7, margin: 0 };

const statsContainer = { display: "flex", gap: "25px" };
const statItem = { textAlign: "right" };
const statVal = { display: "block", fontSize: "20px", fontWeight: "800" };
const statLab = { fontSize: "10px", opacity: 0.7, textTransform: "uppercase" };
const statDivider = { width: "1px", background: "rgba(255,255,255,0.2)" };

const commandBar = { display: "flex", justifyContent: "space-between", padding: "15px 40px", borderBottom: "2px solid #e2e8f0", background: "#fff" };
const searchCluster = { flex: 0.4 };
const voiceSearchWrapper = { position: "relative", display: "flex", alignItems: "center" };
const searchIcon = { position: "absolute", left: "12px", color: "#000" };
const searchField = { width: "100%", padding: "12px 70px", borderRadius: "8px", border: "2px solid #000", background: "#fff", fontSize: "14px", color: "#000", fontWeight: "600" };
const micBtn = { position: "absolute", right: "12px", background: "none", border: "none", cursor: "pointer", fontSize: "16px" };

const actionCluster = { display: "flex", gap: "10px" };
const filterBtn = { background: "#0f172a", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "13px" };

const gridWrapper = { width: "100%" };
const scrollContainer = { overflowX: "auto", width: "100%" };
const enterpriseTable = { width: "100%", borderCollapse: "collapse", minWidth: "1300px" };

const tableHeaderRow = { background: "#0f172a" }; 
const th = { padding: "18px 40px", textAlign: "left", fontSize: "16px", color: "#ffffff", textTransform: "uppercase", fontWeight: "800", letterSpacing: "1px" };

const td = { padding: "18px 40px", borderBottom: "1px solid #e2e8f0", verticalAlign: "middle" };
const dataRowStyle = { transition: "0.2s" };

const identityGroup = { display: "flex", alignItems: "center", gap: "12px" };
const avatarStyle = { width: "38px", height: "38px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "15px" };
const empName = { fontWeight: "900", color: "#000", fontSize: "15px" };
const empId = { fontSize: "11px", color: "#475569", fontWeight: "700" };

const ratingBox = { display: "flex", alignItems: "center", gap: "4px" };
const ratingNum = { fontSize: "13px", color: "#000", marginLeft: "5px", fontWeight: "900" };

const contentRow = { display: "flex", alignItems: "flex-start", gap: "8px", maxWidth: "250px" };
const textStyle = { fontSize: "13px", color: "#000", lineHeight: "1.5", fontWeight: "600" };

const sentimentWrapper = { width: "120px" };
const barTrack = { width: "100%", height: "8px", background: "#f3f4f6", borderRadius: "10px", overflow: "hidden", marginBottom: "4px" };
const barFill = { height: "100%", borderRadius: "10px", transition: "width 1s ease" };
const sentimentLabel = { fontSize: "11px", fontWeight: "900" };

const remarkBadge = { padding: "6px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "800", display: "inline-flex", alignItems: "center", textTransform: "uppercase" };

const deptBadge = { background: "#0f172a", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", color: "#fff", fontWeight: "900" };
const loaderStyle = { textAlign: "center", padding: "80px", color: "#6d28d9", fontWeight: "800", fontSize: "16px" };

export default AdminFeedback;