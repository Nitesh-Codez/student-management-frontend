import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const ExaminationResult = () => {
  const [allMarks, setAllMarks] = useState([]); // Store raw data from API
  const [filteredMarks, setFilteredMarks] = useState([]); // Store current session & exam type data
  const [studentInfo, setStudentInfo] = useState(null);
  const [message, setMessage] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  
  // --- Persist Result View state so it doesn't disappear on refresh ---
  const [showResult, setShowResult] = useState(() => {
    return localStorage.getItem("show_result_view") === "true";
  });

  // --- Dynamic Session From LocalStorage ---
  const [session] = useState(() => localStorage.getItem("session") || "2026-27");

  // --- Target Release Date: 12 July 2026, 02:00 PM ---
  const [isLocked, setIsLocked] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  // --- Signature States ---
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeSignType, setActiveSignType] = useState(null);
  const [teacherSign, setTeacherSign] = useState(null);
  const [principalSign, setPrincipalSign] = useState(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  // Admin access to draw signs: use URL?admin=true
  const isAdmin = new URLSearchParams(window.location.search).get("admin") === "true";

  const API_URL = process.env.REACT_APP_API_URL || "https://student-management-system-4-hose.onrender.com";
  const user = JSON.parse(localStorage.getItem("user"));
  const userRef = useRef(user);

  // --- Timer Countdown Logic ---
  useEffect(() => {
    const targetDate = new Date("2026-07-12T14:00:00+05:30"); // Target Time: Tomorrow at 2:00 PM IST

    const calculateTime = () => {
      const now = new Date();
      const difference = targetDate - now;

      if (difference <= 0) {
        setIsLocked(false);
      } else {
        setIsLocked(true);
        const hrs = Math.floor(difference / (1000 * 60 * 60));
        const mins = Math.floor((difference / 1000 / 60) % 60);
        const secs = Math.floor((difference / 1000) % 60);
        setTimeLeft({ hours: hrs, minutes: mins, seconds: secs });
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const savedMarks = localStorage.getItem(`marks_${userRef.current?.id}`);
    const savedTeacherSign = localStorage.getItem("nitesh_sign_teacher");
    const savedPrincipalSign = localStorage.getItem("nitesh_sign_principal");

    if (savedMarks) {
      const parsed = JSON.parse(savedMarks);
      setAllMarks(parsed);
    }
    if (savedTeacherSign) setTeacherSign(savedTeacherSign);
    if (savedPrincipalSign) setPrincipalSign(savedPrincipalSign);

    if (userRef.current?.id) {
      axios.get(`${API_URL}/api/students/profile?id=${userRef.current.id}`)
        .then(res => {
          if (res.data.success) setStudentInfo(res.data.student);
        })
        .catch(err => console.error("Profile API Error:", err));
    }
    generateCaptcha();
  }, [API_URL]);

  // --- Filter Marks strictly by current session ---
  useEffect(() => {
    if (allMarks.length > 0) {
      const currentSessionData = allMarks.filter(
        (m) => m.session?.trim() === session.trim()
      );
      setFilteredMarks(currentSessionData);
    } else {
      setFilteredMarks([]);
    }
  }, [allMarks, session]);

  // --- Canvas Logic ---
  const startDrawing = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    canvas.width = 400;
    canvas.height = 150;
    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1a237e";
    ctx.lineWidth = 3;
    ctxRef.current = ctx;
  };

  const saveSignature = () => {
    const dataURL = canvasRef.current.toDataURL();
    if (activeSignType === 'teacher') {
      setTeacherSign(dataURL);
      localStorage.setItem("nitesh_sign_teacher", dataURL);
    } else {
      setPrincipalSign(dataURL);
      localStorage.setItem("nitesh_sign_principal", dataURL);
    }
    setActiveSignType(null);
  };

  const clearCanvas = () => {
    ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const generateCaptcha = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setCaptcha(code);
    setCaptchaInput("");
  };

  const handleCheckResult = () => {
    if (isLocked && !isAdmin) {
      setMessage("🔒 Portal is locked until countdown ends.");
      return;
    }
    if (captchaInput.toUpperCase() !== captcha) {
      setMessage("❌ Invalid Captcha!");
      generateCaptcha();
      return;
    }
    axios.post(`${API_URL}/api/new-marks/check`, {
      studentId: userRef.current.id,
      studentName: userRef.current.name,
    })
    .then((res) => {
      if (res.data.success && res.data.data.length > 0) {
        setAllMarks(res.data.data);
        localStorage.setItem(`marks_${userRef.current.id}`, JSON.stringify(res.data.data));
        localStorage.setItem("show_result_view", "true");
        setShowResult(true);
        setMessage("");
      } else {
        setMessage(res.data.message || "Result data not found for current criteria.");
      }
    })
    .catch(() => setMessage("Server error. Please try again."));
  };

  const handleLogout = () => {
    localStorage.removeItem("show_result_view");
    setShowResult(false);
  };

  // --- Calculations for current dynamic view ---
  const overall = (() => {
    let o = 0, t = 0;
    filteredMarks.forEach(m => { o += Number(m.obtained_marks); t += Number(m.total_marks); });
    return { o, t, p: t ? ((o / t) * 100).toFixed(2) : 0 };
  })();

  const currentExamType = filteredMarks.length > 0 ? filteredMarks[0].exam_type?.toUpperCase() : "EXAMINATION";

  const getGrade = (p) => {
    if (p >= 85) return "A+"; if (p >= 75) return "A";
    if (p >= 60) return "B"; if (p >= 33) return "C";
    return "D";
  };

  if (!showResult) {
    return (
      <div style={loginContainer}>
        {/* Glowing Animation Effects */}
        <style>{`
          @keyframes pulseGlow {
            0% { transform: scale(1); box-shadow: 0 0 10px rgba(192, 57, 43, 0.5); }
            50% { transform: scale(1.02); box-shadow: 0 0 25px rgba(192, 57, 43, 0.8); }
            100% { transform: scale(1); box-shadow: 0 0 10px rgba(192, 57, 43, 0.5); }
          }
          .animated-timer {
            animation: pulseGlow 2s infinite ease-in-out;
          }
        `}</style>

        <div style={loginBox}>
          <div style={loginHeaderIcon}>🎓</div>
          <h2 style={{ color: "#1a237e", margin: "5px 0", fontWeight: "900", fontSize: "1.8rem" }}>Smart Students Classes</h2>
          <p style={{ color: "#c0392b", fontSize: "0.85rem", fontWeight: "bold", letterSpacing: "1px" }}>EXAM PORTAL {session}</p>
          
          {/* HIGH TECH ANIMATED TIMER WINDOW */}
          {isLocked && !isAdmin ? (
            <div className="animated-timer" style={timerBanner}>
              <div style={{ fontSize: "0.8rem", color: "#ef5350", fontWeight: "bold", marginBottom: "8px", letterSpacing: "1px" }}>
                🔒 RESULT WILL UNLOCK IN
              </div>
              <div style={timerDigitsContainer}>
                <div style={timeSegment}><span>{String(timeLeft.hours).padStart(2, '0')}</span><small>Hrs</small></div>
                <div style={timerColon}>:</div>
                <div style={timeSegment}><span>{String(timeLeft.minutes).padStart(2, '0')}</span><small>Min</small></div>
                <div style={timerColon}>:</div>
                <div style={timeSegment}><span>{String(timeLeft.seconds).padStart(2, '0')}</span><small>Sec</small></div>
              </div>
            </div>
          ) : (
            isAdmin && <p style={{ color: "green", fontSize: "0.85rem", fontWeight: "bold" }}>⚡ ADMIN OVERRIDE ACTIVE</p>
          )}

          <div style={{ margin: "20px 0", textAlign: "left" }}>
            <div style={captchaWrapper}>
              <div style={captchaText}>{captcha}</div>
              <button onClick={generateCaptcha} style={refreshBtn} title="Refresh Captcha">🔄</button>
            </div>
            <input 
              value={captchaInput} 
              onChange={e => setCaptchaInput(e.target.value)} 
              placeholder="Enter Captcha Security Code" 
              style={inputStyle} 
              disabled={isLocked && !isAdmin}
            />
            <button 
              onClick={handleCheckResult} 
              style={{ ...btnStyle, background: (isLocked && !isAdmin) ? "#7f8c8d" : "#1a237e", cursor: (isLocked && !isAdmin) ? "not-allowed" : "pointer" }}
              disabled={isLocked && !isAdmin}
            >
              {isLocked && !isAdmin ? "Portal Locked" : "Proceed & View Result"}
            </button>
            {message && <p style={{ color: "#d63031", marginTop: "12px", fontSize: "0.9rem", textAlign: "center", fontWeight: "600" }}>{message}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={marksheetPageWrapper}>
      <style>{`
        @media print {
          body, .page-wrapper { background: #fff !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .marksheet-frame { box-shadow: none !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
          .outer-border { padding: 15px !important; min-height: auto !important; }
        }
      `}</style>

      {activeSignType && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3 style={{color: '#1a237e', marginBottom: '15px'}}>Draw Signature for {activeSignType.toUpperCase()}</h3>
            <canvas ref={canvasRef} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} style={canvasStyle} onMouseEnter={initCanvas} />
            <div style={{ marginTop: '20px' }}>
              <button onClick={saveSignature} style={{ ...miniBtn, background: '#27ae60' }}>Save Signature</button>
              <button onClick={clearCanvas} style={{ ...miniBtn, background: '#f39c12' }}>Clear</button>
              <button onClick={() => setActiveSignType(null)} style={{ ...miniBtn, background: '#e74c3c' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div style={horizontalScrollContainer}>
        <div id="printable-marksheet" className="marksheet-frame" style={marksheetFrame}>
          <div style={outerBorder} className="outer-border">
            <div style={headerSection}>
              <div style={{ width: "110px" }}><img src="/logo.png" alt="Logo" style={{ width: "100px" }} onError={(e) => e.target.style.display='none'}/></div>
              <div style={{ flex: 1, textAlign: "center" }}>
                <h1 style={academyName}>SMART STUDENTS CLASSES</h1>
                <p style={subHeader}> PREMIER EDUCATIONAL INSTITUTE</p>
                <div style={examBadge}>{currentExamType} PERFORMANCE REPORT ({session})</div>
              </div>
              <div style={{ width: "125px", textAlign: "right" }}>
                {studentInfo?.profile_photo ? <img src={studentInfo.profile_photo} alt="Student" style={studentPhoto} /> : <div style={photoPlaceholder}>AFFIX PHOTO</div>}
              </div>
            </div>

            <div style={detailsGrid}>
              <table style={infoTable}>
                <tbody>
                  <tr>
                    <td style={infoTd}><b>STUDENT NAME</b></td><td style={infoTd}>: {studentInfo?.name?.toUpperCase() || userRef.current?.name?.toUpperCase()}</td>
                    <td style={infoTd}><b>ROLL NUMBER</b></td><td style={infoTd}>: {studentInfo?.code || "N/A"}</td>
                  </tr>
                  <tr>
                    <td style={infoTd}><b>FATHER'S NAME</b></td><td style={infoTd}>: {studentInfo?.father_name?.toUpperCase() || "N/A"}</td>
                    <td style={infoTd}><b>MOTHER'S NAME</b></td><td style={infoTd}>: {studentInfo?.mother_name?.toUpperCase() || "N/A"}</td>
                  </tr>
                  <tr>
                    <td style={infoTd}><b>CLASS / STREAM</b></td><td style={infoTd}>: {studentInfo?.class || "N/A"}</td>
                    <td style={infoTd}><b>DATE OF BIRTH</b></td><td style={infoTd}>: {studentInfo?.dob ? new Date(studentInfo.dob).toLocaleDateString() : "N/A"}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {filteredMarks.length > 0 ? (
              <table style={marksTable}>
               <thead>
  <tr style={tableHeaderRow}>
    <th style={{ ...th, width: "60px", padding: "10px 5px" }}>SR. NO</th>
    <th style={{ ...th, textAlign: "left", width: "220px", padding: "10px 10px" }}>SUBJECT NAME</th>
    <th style={{ ...th, width: "90px", padding: "10px 5px" }}>MAX MARKS</th>
    <th style={{ ...th, width: "100px", padding: "10px 5px" }}>THEORY<br />(75)</th>
    <th style={{ ...th, width: "140px", padding: "10px 5px" }}>VIVA / BEHAVIOUR<br />(10)</th>
    <th style={{ ...th, width: "110px", padding: "10px 5px" }}>ATTENDANCE<br />(5)</th>
    <th style={{ ...th, width: "90px", padding: "10px 5px" }}>TASK<br />(10)</th>
    <th style={{ ...th, width: "110px", padding: "10px 5px" }}>OBTAINED<br />(100)</th>
    <th style={{ ...th, width: "100px", padding: "10px 5px" }}>REMARK</th>
  </tr>
</thead>
                <tbody>
                  {filteredMarks.map((m, i) => {
                    const perc = (m.obtained_marks / m.total_marks) * 100;
                    return (
                      <tr key={i} style={tableRowStyle}>
                        <td style={td}>{i + 1}</td>
                        <td style={{ ...td, textAlign: "left", fontWeight: "bold" }}>{m.subject.toUpperCase()}</td>
                        <td style={td}>{m.total_marks}</td>
                        <td style={td}>{m.theory_marks}</td>
                        <td style={td}>{m.viva_marks || "0"}</td>
                        <td style={td}>{m.attendance_marks || "0"}</td>
                        <td style={td}>{m.task || "0"}</td>
                        <td style={{ ...td, fontWeight: "900", color: "#1a237e" }}>{m.obtained_marks}</td>
                        <td style={td}>
                          <span style={{ color: perc >= 33 ? "#159349" : "#c0392b", fontWeight: "bold" }}>
                            {perc >= 85 ? "DISTINCTION" : perc >= 33 ? "PASSED" : "FAIL"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{ background: "#f1f3f9", fontWeight: "900" }}>
                    <td colSpan="2" style={td}>GRAND TOTAL</td>
                    <td style={td}>{overall.t}</td>
                    <td colSpan="4" style={td}>PERCENTAGE: {overall.p}%</td>
                    <td style={{ ...td, color: "#1a237e", fontWeight: "900" }}>{overall.o}</td>
                    <td style={td}>
                      <span style={{
                        padding: "4px 10px",
                        background: overall.p >= 33 ? "#0e4826" : "#c0392b",
                        color: "#fff",
                        borderRadius: "4px",
                        fontSize: "0.8rem"
                      }}>{getGrade(overall.p)}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: "center", padding: "40px", fontSize: "1.2rem", fontWeight: "bold", color: "#c0392b", border: "1px dashed #c0392b", borderRadius: "6px" }}>
                No active exam records found for Session {session}.
              </div>
            )}

            <div style={bottomGrid}>
              <div style={gradingChart}>
                <p style={{ margin: "0 0 5px 0", fontSize: "0.75rem", fontWeight: "bold", borderBottom: "1px solid #ddd", color: "#1a237e" }}>GRADE SCHEME</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 10px", fontSize: "0.65rem" }}>
                  <span>A+ : 85% - 100%</span><span>A : 75% - 84%</span>
                  <span>B : 60% - 74%</span><span>C : 33% - 59%</span>
                </div>
              </div>
              <div style={resultSummaryBoard}>
                <div style={summaryRow}><span>STATUS:</span> <b style={{ color: overall.p >= 33 ? "green" : "red" }}>{overall.p >= 33 ? "PASSED" : "FAILED"}</b></div>
                <div style={summaryRow}><span>FINAL GRADE:</span> <b>{getGrade(overall.p)}</b></div>
              </div>
            </div>

            <div style={signatureArea}>
              <div style={sigBox}>
                <div style={sigImageContainer}>
                  {teacherSign ? <img src={teacherSign} alt="Sign" style={{ height: "60px" }} /> : <span style={cursiveName}>Vandana Kushwah</span>}
                </div>
                <div style={sigLine}></div>
                <p style={{ fontWeight: "bold", color: "#000", margin: '2px 0', fontSize: '0.8rem' }}>VANDANA KUSHWAH</p>
                <p style={sigLabel}>Class Teacher</p>
                {isAdmin && <button onClick={() => setActiveSignType('teacher')} className="no-print" style={drawBtn}>Draw Sign</button>}
              </div>
              
              <div style={sigBox}>
                <div style={curvedSealContainer}>
                  <svg viewBox="0 0 100 100" style={svgSeal}>
                    <path id="curve" d="M 20,50 a 30,30 0 1,1 60,0 a 30,30 0 1,1 -60,0" fill="transparent" />
                    <text style={sealTextStyle}><textPath xlinkHref="#curve">SMART STUDENTS CLASSES • GWALIOR •</textPath></text>
                    <circle cx="50" cy="50" r="22" fill="none" stroke="#1a237e" strokeWidth="0.5" />
                    <text x="50" y="55" textAnchor="middle" style={{fontSize: '6px', fontWeight: 'bold', fill: '#1a237e'}}>Smart Students</text>
                  </svg>
                </div>
                <p style={sigLabel}>Institute Seal</p>
              </div>

              <div style={sigBox}>
                <div style={sigImageContainer}>
                  {principalSign ? <img src={principalSign} alt="Sign" style={{ height: "60px" }} /> : <span style={cursiveName}>Nitesh Kushwah</span>}
                </div>
                <div style={sigLine}></div>
                <p style={{ fontWeight: "bold", color: "#000", margin: '2px 0', fontSize: '0.8rem' }}>NITESH KUSHWAH</p>
                <p style={sigLabel}>Principal</p>
                {isAdmin && <button onClick={() => setActiveSignType('principal')} className="no-print" style={drawBtn}>Draw Sign</button>}
              </div>
            </div>
            <div style={{textAlign: 'center', marginTop: '30px', fontSize: '0.65rem', color: '#777', fontStyle: 'italic'}}>Note: This is an electronically generated report. Any discrepancy should be reported to the office.</div>
          </div>
        </div>
      </div>

      <div style={actionButtons} className="no-print">
        <button onClick={() => window.print()} style={printBtn}>🖨️ Print Marksheet</button>
        <button onClick={handleLogout} style={backBtn}>⬅️ Back to Portal</button>
      </div>
    </div>
  );
};

/* ============= MODERNISED STYLES ============= */
const modalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 };
const modalContent = { background: '#fff', padding: '30px', borderRadius: '15px', textAlign: 'center', boxShadow: "0 10px 30px rgba(0,0,0,0.3)" };
const canvasStyle = { border: '2px dashed #1a237e', background: '#f9f9f9', cursor: 'crosshair', borderRadius: "8px" };
const miniBtn = { padding: '10px 18px', color: '#fff', border: 'none', borderRadius: '6px', margin: '0 5px', cursor: 'pointer', fontWeight: 'bold' };
const drawBtn = { fontSize: '0.65rem', marginTop: '8px', cursor: 'pointer', background: '#34495e', color: '#fff', border: "none", padding: '4px 10px', borderRadius: "4px" };
const marksheetPageWrapper = { background: "#1e272e", minHeight: "100vh", padding: "40px 0", fontFamily: "'Segoe UI', Roboto, sans-serif" };
const horizontalScrollContainer = { width: "100%", overflowX: "auto" };
const marksheetFrame = { width: "930px", margin: "0 auto", background: "#fff", padding: "25px", boxShadow: "0 15px 40px rgba(0,0,0,0.6)", borderRadius: "8px" };
const outerBorder = { border: "4px double #1a237e", padding: "30px", minHeight: "850px", position: "relative" };
const headerSection = { display: "flex", alignItems: "center", borderBottom: "3px solid #1a237e", paddingBottom: "15px", marginBottom: "25px" };
const academyName = { margin: 0, color: "#1a237e", fontSize: "2.6rem", fontWeight: "900", letterSpacing: "0.5px" };
const subHeader = { margin: "2px 0", color: "#c0392b", fontSize: "1rem", fontWeight: "bold", letterSpacing: "2px" };
const examBadge = { background: "#1a237e", color: "#fff", padding: "8px 24px", borderRadius: "4px", display: "inline-block", marginTop: "10px", fontSize: "0.9rem", fontWeight: "bold", letterSpacing: "0.5px" };
const studentPhoto = { width: "115px", height: "135px", border: "2px solid #1a237e", objectFit: "cover", borderRadius: "4px" };
const photoPlaceholder = { width: "115px", height: "135px", border: "1px dashed #bbb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", color: "#999", fontWeight: "bold" };
const detailsGrid = { marginBottom: "25px", background: "#f8f9fa", padding: "15px", border: "1px solid #e1e8ed", borderRadius: "6px" };
const infoTable = { width: "100%", borderCollapse: "collapse" };
const infoTd = { padding: "8px", fontSize: "0.9rem", color: "#2c3e50" };
const marksTable = { width: "100%", borderCollapse: "collapse" };
const tableHeaderRow = { background: "#1a237e", color: "#fff" };
const th = { padding: "14px 10px", border: "1px solid #fff", fontSize: "0.85rem", fontWeight: "700", letterSpacing: "0.5px" };
const td = { padding: "12px 10px", border: "1px solid #1a237e", fontSize: "0.9rem", textAlign: "center", color: "#333" };
const tableRowStyle = { borderBottom: "1px solid #ccc" };
const bottomGrid = { display: "flex", justifyContent: "space-between", marginTop: "25px", gap: "20px" };
const gradingChart = { flex: 1, padding: "12px", border: "1px solid #ddd", background: "#fafafa", borderRadius: "6px" };
const resultSummaryBoard = { width: "260px", border: "2px solid #1a237e", padding: "14px", background: "#f1f3f9", borderRadius: "6px" };
const summaryRow = { display: "flex", justifyContent: "space-between", margin: "6px 0", fontSize: "0.95rem" };
const signatureArea = { display: "flex", justifyContent: "space-between", marginTop: "60px", textAlign: "center" };
const sigBox = { width: "200px", display: "flex", flexDirection: "column", alignItems: "center" };
const sigLine = { borderBottom: "1.5px solid #000", width: "100%", margin: "5px 0" };
const sigLabel = { fontSize: "0.75rem", color: "#555", fontWeight: "500" };
const sigImageContainer = { height: "60px", display: "flex", alignItems: "flex-end", justifyContent: "center", marginBottom: "5px" };
const cursiveName = { fontFamily: "'Dancing Script', cursive", fontSize: "1.6rem", color: "#1a237e", opacity: 0.4 };
const curvedSealContainer = { width: "90px", height: "90px", margin: "0 auto" };
const svgSeal = { width: "100%", height: "100%" };
const sealTextStyle = { fontSize: "8.5px", fontWeight: "bold", fill: "#1a237e" };
const actionButtons = { textAlign: "center", padding: "30px 0" };
const printBtn = { padding: "14px 40px", background: "#27ae60", color: "#fff", border: "none", borderRadius: "30px", cursor: "pointer", fontWeight: "bold", fontSize: "1rem", boxShadow: "0 4px 15px rgba(39, 174, 96, 0.4)", margin: "0 10px" };
const backBtn = { padding: "14px 40px", background: "#e74c3c", color: "#fff", border: "none", borderRadius: "30px", cursor: "pointer", fontSize: "1rem", boxShadow: "0 4px 15px rgba(231, 76, 60, 0.4)", margin: "0 10px" };

// --- LOGIN BOX STYLES (PORTAL LOOK) ---
const loginContainer = { height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "linear-gradient(135deg, #1a237e 0%, #0f172a 100%)", padding: "20px" };
const loginBox = { background: "#fff", padding: "45px 40px", borderRadius: "16px", width: "420px", textAlign: "center", boxShadow: "0 20px 40px rgba(0,0,0,0.4)" };
const loginHeaderIcon = { fontSize: "3.5rem", marginBottom: "10px" };
const captchaWrapper = { display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f3f9", borderRadius: "8px", padding: "10px", marginBottom: "15px", border: "1px dashed #1a237e" };
const captchaText = { fontSize: "2.4rem", fontWeight: "900", letterSpacing: "10px", color: "#1a237e", fontStyle: "italic", textShadow: "2px 2px #cfd8dc", paddingLeft: "10px" };
const refreshBtn = { background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", marginLeft: "10px", padding: "5px" };
const inputStyle = { width: "100%", padding: "14px", border: "2px solid #e2e8f0", borderRadius: "8px", marginBottom: "20px", textAlign: "center", fontSize: "1.05rem", fontWeight: "600", letterSpacing: "1px", outline: "none" };
const btnStyle = { width: "100%", padding: "14px", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "1.1rem", boxShadow: "0 4px 12px rgba(26, 35, 126, 0.3)" };

// --- NEW ANIMATED TIMER BOX STYLES ---
const timerBanner = { background: "#10172a", borderRadius: "12px", padding: "15px", marginBottom: "20px", border: "1px solid #1e293b", textAlign: "center" };
const timerDigitsContainer = { display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" };
const timeSegment = { display: "flex", flexDirection: "column", alignItems: "center", background: "#1e293b", minWidth: "50px", padding: "6px 4px", borderRadius: "6px", color: "#fff", fontWeight: "bold" };
const timerColon = { color: "#ef5350", fontWeight: "bold", fontSize: "1.5rem", paddingBottom: "14px" };

export default ExaminationResult;