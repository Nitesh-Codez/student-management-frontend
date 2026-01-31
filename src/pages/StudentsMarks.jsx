import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

/**
 * CONFIGURING CHART ENGINE
 * We register global components required for the line graph visualization.
 */
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const StudentMarks = () => {
  // CORE DATA STATE
  const [marks, setMarks] = useState([]);
  const [message, setMessage] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [activeSubjects, setActiveSubjects] = useState([]);

  // UI POPUP STATES
  const [showPrePopup, setShowPrePopup] = useState(false);
  const [showPostPopup, setShowPostPopup] = useState(false);
  const [newSubjectNames, setNewSubjectNames] = useState("");
  const [performanceMsg, setPerformanceMsg] = useState("");
  
  // STATE FOR "LAST CHECKED" MARKS DIV
  const [latestCheckedMarks, setLatestCheckedMarks] = useState([]);

  // PERSISTENT REFERENCES
  const API_URL = process.env.REACT_APP_API_URL;
  const user = JSON.parse(localStorage.getItem("user"));
  const userRef = useRef(user);

  /**
   * SECURITY: CAPTCHA GENERATION
   * Ensures manual interaction before hitting the database.
   */
  const generateCaptcha = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous chars
    let code = "";
    for (let i = 0; i < 5; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    setCaptcha(code);
  };

  /**
   * MATH HELPER: AVERAGE CALCULATOR
   * Returns a clean percentage string.
   */
  const calculateAverage = (dataList) => {
    if (!dataList || dataList.length === 0) return 0;
    const obt = dataList.reduce((a, b) => a + Number(b.obtained_marks), 0);
    const tot = dataList.reduce((a, b) => a + Number(b.total_marks), 0);
    return tot ? ((obt / tot) * 100).toFixed(1) : 0;
  };

  /**
   * BACKGROUND SYNC: NEW MARKS DETECTOR
   * Checks for updates silently in the background.
   */
  const checkForNewMarks = (currentLocalMarks) => {
    if (!userRef.current?.id) return;

    axios
      .post(`${API_URL}/api/marks/check`, {
        studentId: userRef.current.id,
        studentName: userRef.current.name,
      })
      .then((res) => {
        if (res.data.success && res.data.data.length > 0) {
          const fetchedData = res.data.data;
          const currentIds = currentLocalMarks.map((m) => m.id);
          const newEntries = fetchedData.filter((m) => !currentIds.includes(m.id));

          if (newEntries.length > 0 && currentLocalMarks.length > 0) {
            const names = [...new Set(newEntries.map((m) => m.subject))].join(", ");
            setNewSubjectNames(names);
            // We don't set latestCheckedMarks here yet; only after Captcha verification
            setShowPrePopup(true);
          }
        }
      })
      .catch((err) => console.error("Silent background sync failed", err));
  };

  /**
   * HOOK: INITIAL LOAD
   * Pulls data from LocalStorage and starts sync.
   */
  useEffect(() => {
    generateCaptcha();
    const studentId = userRef.current?.id;
    
    // Load existing marks
    const savedMarksData = JSON.parse(localStorage.getItem("userMarks")) || {};
    const localMarks = savedMarksData[studentId] || [];
    
    // Load previously identified "latest" marks for the top div
    const savedLatest = JSON.parse(localStorage.getItem("latestCheckHistory")) || {};
    const lastEntries = savedLatest[studentId] || [];
    
    if (userRef.current && localMarks.length > 0) {
      setMarks(localMarks);
    }
    
    setLatestCheckedMarks(lastEntries);
    checkForNewMarks(localMarks);
  }, []);

  /**
   * ACTION: MANUAL MARKS UPDATE
   * Triggered after Captcha. Processes new data and calculates performance delta.
   */
  const handleCheckMarks = () => {
    if (captchaInput !== captcha) {
      setMessage("Captcha incorrect!");
      generateCaptcha();
      return;
    }

    axios
      .post(`${API_URL}/api/marks/check`, {
        studentId: userRef.current.id,
        studentName: userRef.current.name,
      })
      .then((res) => {
        if (res.data.success && res.data.data.length > 0) {
          const fetchedData = res.data.data;
          const currentIds = marks.map((m) => m.id);
          
          // Identify specifically which records were just added
          const newOnes = fetchedData.filter((m) => !currentIds.includes(m.id));
          
          const oldAvg = parseFloat(calculateAverage(marks));
          const newAvg = parseFloat(calculateAverage(fetchedData));
          const diff = (newAvg - oldAvg).toFixed(1);

          setPerformanceMsg(
            diff >= 0 
              ? `Your performance improved by ${diff}%! Great job.` 
              : `Your average dropped by ${Math.abs(diff)}%. Focus more!`
          );

          // Update State
          setMarks(fetchedData);
          if (newOnes.length > 0) {
            setLatestCheckedMarks(newOnes);
            
            // Persist the latest checked entries for the top div
            const historyStore = JSON.parse(localStorage.getItem("latestCheckHistory")) || {};
            historyStore[userRef.current.id] = newOnes;
            localStorage.setItem("latestCheckHistory", JSON.stringify(historyStore));
          }

          setMessage("Dashboard updated successfully!");
          
          // Persist all marks
          const savedMarks = JSON.parse(localStorage.getItem("userMarks")) || {};
          savedMarks[userRef.current.id] = fetchedData;
          localStorage.setItem("userMarks", JSON.stringify(savedMarks));

          setShowPrePopup(false);
          setShowPostPopup(true);
          setCaptchaInput("");
          generateCaptcha();
        } else {
          setMessage("No new test records found.");
        }
      })
      .catch(() => setMessage("Failed to connect to server."));
  };

  // --- CHART LOGIC: SORTING & COLORING ---
  const sorted = [...marks].sort(
    (a, b) => new Date(a.test_date) - new Date(b.test_date)
  );

  const subjects = [...new Set(sorted.map((m) => m.subject))];
  const colors = [
    "#D4AF37", "#FF7F50", "#87CEEB", "#90EE90",
    "#AD6E55", "#DDA0DD", "#007DD1", "#E41700",
  ];

  const visibleSubjects = activeSubjects.length > 0 ? activeSubjects : subjects;

  const labels = [
    ...new Set(
      sorted
        .filter((m) => visibleSubjects.includes(m.subject))
        .map((m) => new Date(m.test_date).toLocaleDateString())
    ),
  ];

  const datasets = visibleSubjects.map((subject, idx) => ({
    label: subject,
    data: labels.map((date) => {
      const mark = sorted.find(
        (m) =>
          m.subject === subject &&
          new Date(m.test_date).toLocaleDateString() === date
      );
      return mark
        ? +((mark.obtained_marks / mark.total_marks) * 100).toFixed(1)
        : null;
    }),
    borderColor: colors[idx % colors.length],
    backgroundColor: `${colors[idx % colors.length]}33`,
    fill: true,
    tension: 0.4,
    spanGaps: true,
    pointRadius: 5,
    pointHoverRadius: 8,
  }));

  const chartData = { labels, datasets };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 2000, easing: "easeInOutQuart" },
    plugins: {
      legend: {
        position: "top",
        onClick: (_, item) => {
          const subject = item.text;
          setActiveSubjects((prev) =>
            prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
          );
        },
      },
      title: { display: true, text: "Overall Performance Trends" },
    },
    scales: { 
      y: { beginAtZero: true, max: 100, ticks: { callback: (value) => value + "%" } },
      x: { ticks: { autoSkip: false, maxRotation: 45 } }
    },
  };

  // --- OVERALL CALCULATION FOR CIRCLE ---
  const overallPercentage = calculateAverage(marks);
  const getRemark = (p) => {
    if (p >= 85) return "Elite Performance!";
    if (p >= 60) return "Consistent Progress.";
    if (p >= 40) return "Scope for Growth.";
    return "Requires Immediate Focus.";
  };

  const dashArray = 2 * Math.PI * 45;
  const dashOffset = dashArray - (dashArray * overallPercentage) / 100;

  const grouped = marks.reduce((acc, m) => {
    if (!acc[m.subject]) acc[m.subject] = [];
    acc[m.subject].push(m);
    return acc;
  }, {});

  // --- INTERNAL STYLES ---
  const styles = {
    container: {
      margin: 0, padding: 0, fontFamily: "'Segoe UI', Tahoma, sans-serif",
      background: "#F5F6FA", minHeight: "100vh", width: "100vw",
      boxSizing: "border-box", overflowX: "hidden"
    },
    popupOverlay: {
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
      background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center",
      alignItems: "center", zIndex: 10000, padding: "20px"
    },
    popupContent: {
      background: "#fff", padding: "30px", borderRadius: "20px",
      textAlign: "center", maxWidth: "400px", width: "100%",
      boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
    },
    latestSection: {
      margin: "15px 12px", background: "#fff", padding: "15px",
      borderRadius: "15px", border: "1px solid #dcdde1",
      boxShadow: "0 2px 10px rgba(0,0,0,0.05)"
    },
    latestBadge: {
      padding: "10px 15px", borderRadius: "10px", background: "linear-gradient(to right, #2b5876, #4e4376)",
      color: "#fff", fontSize: "13px", fontWeight: "bold", whiteSpace: "nowrap",
      display: "inline-block", marginRight: "10px"
    },
    subjectCircleCard: {
      minWidth: "115px", background: "#fff", padding: "18px 10px",
      borderRadius: "18px", display: "flex", flexDirection: "column",
      alignItems: "center", boxShadow: "0 5px 15px rgba(0,0,0,0.06)",
      transition: "transform 0.3s"
    },
    tableWrapper: {
      background: "#fff", padding: "18px", borderRadius: "15px",
      margin: "20px 12px", boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
      overflowX: "auto"
    }
  };

  return (
    <div style={styles.container}>
      
      {/* 1. NOTIFICATION POPUP */}
      {showPrePopup && (
        <div style={styles.popupOverlay}>
          <div style={styles.popupContent}>
            <div style={{ fontSize: "50px", marginBottom: "10px" }}>🔔</div>
            <h2 style={{ color: "#2b5876" }}>New Marks Uploaded!</h2>
            <p style={{ color: "#666", margin: "15px 0" }}>
              Teacher has updated marks for: <br/>
              <strong style={{ color: "#D4AF37", fontSize: "18px" }}>{newSubjectNames}</strong>
            </p>
            <button 
              onClick={() => setShowPrePopup(false)}
              style={{
                background: "#3498DB", color: "#fff", border: "none",
                padding: "14px", borderRadius: "12px", width: "100%", fontWeight: "bold"
              }}
            >
              Okay, Let me check
            </button>
          </div>
        </div>
      )}

      {/* 2. PERFORMANCE POPUP */}
      {showPostPopup && (
        <div style={styles.popupOverlay}>
          <div style={styles.popupContent}>
            <h2 style={{ color: performanceMsg.includes("improved") ? "#2ECC71" : "#E74C3C" }}>
              {performanceMsg.includes("improved") ? "Well Done! 🎉" : "Keep Trying! 💪"}
            </h2>
            <p style={{ margin: "20px 0", fontSize: "17px", lineHeight: "1.6" }}>{performanceMsg}</p>
            <button 
              onClick={() => setShowPostPopup(false)}
              style={{
                background: "#2b5876", color: "#fff", border: "none",
                padding: "14px", borderRadius: "12px", width: "100%", fontWeight: "bold"
              }}
            >
              Show My Report
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{ padding: "20px 15px 5px 15px" }}>
        <h2 style={{ margin: 0, color: "#2f3640" }}>Academic Insights</h2>
        <p style={{ margin: "5px 0", color: "#7f8c8d" }}>
          Student: <strong style={{ color: "#2b5876" }}>{userRef.current?.name}</strong>
        </p>
      </div>

      {/* 3. LATEST CHECKED MARKS DIV (Specific Requirement) */}
      {latestCheckedMarks.length > 0 && (
        <div style={styles.latestSection}>
          <p style={{ margin: "0 0 10px 0", fontSize: "12px", fontWeight: "bold", color: "#E74C3C", textTransform: "uppercase" }}>
            Recently Added Scores:
          </p>
          <div style={{ display: "flex", overflowX: "auto", paddingBottom: "5px" }}>
            {latestCheckedMarks.map((m, i) => (
              <div key={i} style={styles.latestBadge}>
                {m.subject}: {m.obtained_marks}/{m.total_marks}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. CIRCULAR SUBJECT DIVS */}
      <div style={{ display: "flex", gap: "15px", overflowX: "auto", padding: "10px 12px 20px 12px", scrollbarWidth: "none" }}>
        {subjects.map((sub, idx) => {
          const subData = grouped[sub];
          const subAvg = calculateAverage(subData);
          return (
            <div key={sub} style={styles.subjectCircleCard}>
              <div style={{ position: "relative", width: "65px", height: "65px" }}>
                <svg width="65" height="65" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="transparent" stroke="#f1f2f6" strokeWidth="10" />
                  <circle 
                    cx="50" cy="50" r="42" fill="transparent" 
                    stroke={colors[idx % colors.length]} strokeWidth="10" 
                    strokeDasharray="264" strokeDashoffset={264 - (264 * subAvg) / 100}
                    strokeLinecap="round" transform="rotate(-90 50 50)"
                    style={{ transition: "stroke-dashoffset 1s ease" }}
                  />
                </svg>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "13px", fontWeight: "bold" }}>
                  {Math.round(subAvg)}%
                </div>
              </div>
              <p style={{ fontSize: "12px", marginTop: "12px", fontWeight: "bold", color: "#353b48" }}>{sub}</p>
            </div>
          );
        })}
      </div>

      {/* 5. MAIN PERCENTAGE CARD */}
      <div 
        style={{
          margin: "0 12px 25px 12px", background: "linear-gradient(135deg, #2b5876 0%, #4e4376 100%)",
          borderRadius: "24px", padding: "40px 20px", display: "flex",
          flexDirection: "column", alignItems: "center", color: "#fff",
          boxShadow: "0 12px 24px rgba(43, 88, 118, 0.3)"
        }}
      >
        <div style={{ position: "relative", width: "130px", height: "130px" }}>
          <svg width="130" height="130" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="transparent" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
            <circle cx="50" cy="50" r="45" fill="transparent" stroke="#FFD700" strokeWidth="8" 
              strokeDasharray={dashArray} strokeDashoffset={dashOffset} strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 2s cubic-bezier(0.4, 0, 0.2, 1)" }}
            />
          </svg>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "26px", fontWeight: "900" }}>
            {overallPercentage}%
          </div>
        </div>
        <h3 style={{ marginTop: "20px", fontSize: "20px", letterSpacing: "0.5px" }}>{getRemark(overallPercentage)}</h3>
        <p style={{ marginTop: "5px", fontSize: "14px", opacity: 0.7 }}>Cumulative Average Score</p>
      </div>

      {/* 6. CAPTCHA SECTION */}
      <div style={{ padding: "0 12px" }}>
        <div style={{ background: "#fff", borderRadius: "18px", padding: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ padding: "18px", background: "#f8f9fa", borderRadius: "12px", textAlign: "center", fontWeight: "900", letterSpacing: "8px", fontSize: "28px", border: "2px dashed #3498DB", color: "#2b5876", marginBottom: "15px" }}>
            {captcha}
          </div> 
          <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
              <button onClick={generateCaptcha} style={{ background: "#f1f2f6", color: "#2f3640", border: "1px solid #dcdde1", padding: "14px", borderRadius: "12px", flex: 1, fontWeight: "bold" }}>⟳ New</button>
              <input type="text" value={captchaInput} onChange={(e) => setCaptchaInput(e.target.value)} placeholder="Type Code" style={{ padding: "14px", borderRadius: "12px", flex: 2, border: "1px solid #dcdde1", fontSize: "16px", outline: "none" }} />
          </div>
          <button onClick={handleCheckMarks} style={{ padding: "16px", background: "#2ECC71", color: "#fff", borderRadius: "12px", border: "none", width: "100%", fontSize: "17px", fontWeight: "bold", cursor: "pointer", boxShadow: "0 4px 15px rgba(46, 204, 113, 0.3)" }}>
            Fetch Latest Marks
          </button>
        </div>
      </div>

      {message && <p style={{ color: message.includes("successfully") ? "#27ae60" : "#e74c3c", textAlign: "center", fontWeight: "bold", marginTop: "15px" }}>{message}</p>}

      {/* 7. GRAPH SECTION */}
      {marks.length > 0 && (
        <div style={{ ...styles.tableWrapper, marginTop: "30px" }}>
          <h4 style={{ margin: "0 0 15px 0", color: "#2f3640" }}>Performance Trajectory</h4>
          <div style={{ minWidth: "650px", height: "380px" }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      )}

      {/* 8. DETAILED SUBJECT TABLES */}
      {Object.keys(grouped).map((subject, idx) => (
        <div key={subject} style={styles.tableWrapper}>
          <h3 style={{ borderLeft: `6px solid ${colors[idx % colors.length]}`, paddingLeft: "12px", color: "#2f3640", marginBottom: "18px" }}>{subject}</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9f9fb", textAlign: "left" }}>
                <th style={{ padding: "12px", fontSize: "13px", color: "#7f8c8d" }}>Date</th>
                <th style={{ padding: "12px", fontSize: "13px", color: "#7f8c8d" }}>Max</th>
                <th style={{ padding: "12px", fontSize: "13px", color: "#7f8c8d" }}>Obt</th>
                <th style={{ padding: "12px", fontSize: "13px", color: "#7f8c8d" }}>%</th>
                <th style={{ padding: "12px", fontSize: "13px", color: "#7f8c8d" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {grouped[subject].map((m) => {
                const p = ((m.obtained_marks / m.total_marks) * 100).toFixed(1);
                const isPass = parseFloat(p) >= 33;
                return (
                  <tr key={m.id} style={{ borderBottom: "1px solid #f1f2f6" }}>
                    <td style={{ padding: "12px", fontSize: "14px" }}>{new Date(m.test_date).toLocaleDateString()}</td>
                    <td style={{ padding: "12px", fontSize: "14px" }}>{m.total_marks}</td>
                    <td style={{ padding: "12px", fontSize: "14px" }}>{m.obtained_marks}</td>
                    <td style={{ padding: "12px", fontSize: "14px", fontWeight: "bold", color: "#2b5876" }}>{p}%</td>
                    <td style={{ padding: "12px" }}>
                        <span style={{ padding: "5px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: "900", color: "#fff", background: isPass ? "#2ECC71" : "#E74C3C" }}>
                            {isPass ? "PASS" : "FAIL"}
                        </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      <div style={{ height: "60px" }}></div>
    </div>
  );
};

export default StudentMarks;