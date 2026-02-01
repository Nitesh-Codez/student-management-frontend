import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { 
  FaStar, FaRegStar, FaSearch, FaMicrophone, 
  FaChartLine, FaFilter, FaExclamationTriangle, 
  FaLightbulb, FaAward 
} from "react-icons/fa";

const API_URL = "https://student-management-system-4-hose.onrender.com/api/feedback/admin/all";

/* ================= HELPERS ================= */

const monthNames = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const getMonthLabel = (m, y) => `${monthNames[m - 1]} ${y}`;

const AdminFeedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isListening, setIsListening] = useState(false);

  /* ================= FETCH ================= */

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

  /* ================= LOGIC ================= */

  const calcSentiment = (mcq) => {
    if (!mcq || mcq.length === 0) return { pos: 0 };
    const posCount = mcq.filter((i) => i.answer <= 2).length;
    return { pos: Math.round((posCount / mcq.length) * 100) };
  };

  const getRemarks = (pos) => {
    if (pos >= 95) return { text: "Excellence Teaching Skills", color: "#6d28d9" };
    if (pos >= 80) return { text: "Highly Interactive", color: "#7c3aed" };
    if (pos >= 60) return { text: "Satisfactory Performance", color: "#8b5cf6" };
    if (pos >= 40) return { text: "Needs Improvement", color: "#475569" };
    return { text: "Critical Support Required", color: "#dc2626" };
  };

  /* ================= SPLIT MONTHS ================= */

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  const currentMonthFeedbacks = feedbacks.filter(
    (f) => f.month === currentMonth && f.year === currentYear
  );

  const previousMonthGroups = feedbacks
    .filter((f) => !(f.month === currentMonth && f.year === currentYear))
    .reduce((acc, f) => {
      const key = `${f.year}-${f.month}`;
      if (!acc[key]) {
        acc[key] = {
          label: getMonthLabel(f.month, f.year),
          items: [],
        };
      }
      acc[key].items.push(f);
      return acc;
    }, {});

  /* ================= TABLE RENDER ================= */

  const renderTable = (list) => (
    <table style={enterpriseTable}>
      <thead>
        <tr style={tableHeaderRow}>
          <th style={th}>Student Details</th>
          <th style={th}>Rating</th>
          <th style={th}>Issue</th>
          <th style={th}>Suggestion</th>
          <th style={th}>Satisfaction</th>
          <th style={th}>Remarks</th>
          <th style={th}>Class</th>
        </tr>
      </thead>
      <tbody>
        {list
          .filter((f) =>
            f.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map((f, idx) => {
            const { pos } = calcSentiment(f.mcq_answers);
            const remark = getRemarks(pos);
            const isCritical = f.rating <= 2;

            return (
              <motion.tr key={idx} className="row-hover">
                <td style={td}>
                  <div style={identityGroup}>
                    <div
                      style={{
                        ...avatarStyle,
                        background: isCritical ? "#fee2e2" : "#ddd6fe",
                        color: isCritical ? "#dc2626" : "#6d28d9",
                      }}
                    >
                      {f.name.charAt(0)}
                    </div>
                    <div>
                      <div style={empName}>{f.name}</div>
                      <div style={empId}>UID-{f.student_id}</div>
                    </div>
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
                          width: `${pos}%`,
                          background:
                            "linear-gradient(90deg,#a78bfa,#6d28d9)",
                        }}
                      />
                    </div>
                    <span style={sentimentLabel}>{pos}%</span>
                  </div>
                </td>

                <td style={td}>
                  <div
                    style={{
                      ...remarkBadge,
                      color: remark.color,
                      border: `1px solid ${remark.color}`,
                    }}
                  >
                    <FaAward size={10} /> {remark.text}
                  </div>
                </td>

                <td style={td}>
                  <span style={deptBadge}>{f.class}</span>
                </td>
              </motion.tr>
            );
          })}
      </tbody>
    </table>
  );

  /* ================= JSX ================= */

  return (
    <div style={appContainer}>
      {/* HEADER */}
      <header style={headerSection}>
        <div style={brandGroup}>
          <div style={logoBox}>
            <FaChartLine />
          </div>
          <div>
            <h1 style={mainTitle}>Feedback Dashboard</h1>
            <p style={subTitle}>Monthly Analytics</p>
          </div>
        </div>
      </header>

      {/* SEARCH */}
      <div style={commandBar}>
        <div style={voiceSearchWrapper}>
          <FaSearch style={searchIcon} />
          <input
            placeholder="Search student..."
            style={searchField}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            style={{ ...micBtn, color: isListening ? "#ff4d4d" : "#6d28d9" }}
            onClick={handleVoiceSearch}
          >
            <FaMicrophone />
          </button>
        </div>
        <button style={filterBtn}>
          <FaFilter /> Filter
        </button>
      </div>

      {/* DATA */}
      <main>
        <h2 style={sectionTitle}>
          Current Month – {getMonthLabel(currentMonth, currentYear)}
        </h2>
        {renderTable(currentMonthFeedbacks)}

        <h2 style={sectionTitle}>Previous Month Feedback</h2>
        {Object.values(previousMonthGroups).map((grp) => (
          <div key={grp.label}>
            <h3 style={monthHeader}>{grp.label}</h3>
            {renderTable(grp.items)}
          </div>
        ))}

        {loading && <div style={loaderStyle}>Loading...</div>}
      </main>
    </div>
  );
};

/* ================= STYLES ================= */

const appContainer = { background: "#fff", minHeight: "100vh", minWidth: "1400px"  };
const headerSection = { padding: "25px 40px", background: "#0f172a", color: "#fff", minWidth: "1200px"  };
const brandGroup = { display: "flex", gap: "15px", alignItems: "center" };
const logoBox = { width: 40, height: 40, background: "#6d28d9", display: "flex", alignItems: "center", justifyContent: "center" };
const mainTitle = { fontSize: 22, fontWeight: 800 };
const subTitle = { fontSize: 12, opacity: 0.7 };

const commandBar = { padding: 20, display: "flex", gap: 10 };
const voiceSearchWrapper = { position: "relative", flex: 1 };
const searchIcon = { position: "absolute", top: 12, left: 12 };
const searchField = { width: "100%", padding: "12px 50px" };
const micBtn = { position: "absolute", right: 10, top: 8, background: "none", border: "none" };
const filterBtn = { padding: "10px 15px", background: "#0f172a", color: "#fff" };

const enterpriseTable = { width: "100%", borderCollapse: "collapse", minWidth: 1200 };
const tableHeaderRow = { background: "#0f172a", color: "#fff" };
const th = { padding: 15 };
const td = { padding: 15, borderBottom: "1px solid #e2e8f0" };

const identityGroup = { display: "flex", gap: 10 };
const avatarStyle = { width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 };
const empName = { fontWeight: 800 };
const empId = { fontSize: 11 };

const ratingBox = { display: "flex", gap: 4 };
const ratingNum = { fontWeight: 800 };

const sentimentWrapper = { width: 100 };
const barTrack = { height: 6, background: "#eee" };
const barFill = { height: "100%" };
const sentimentLabel = { fontSize: 11 };

const remarkBadge = { padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 800 };
const deptBadge = { background: "#0f172a", color: "#fff", padding: "4px 8px" };

const sectionTitle = { padding: "20px 40px", fontWeight: 900 };
const monthHeader = { padding: "10px 40px", background: "#f1f5f9", fontWeight: 800 };
const loaderStyle = { textAlign: "center", padding: 50 };

export default AdminFeedback;
