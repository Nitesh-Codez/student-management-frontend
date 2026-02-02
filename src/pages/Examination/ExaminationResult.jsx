import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const ExaminationResult = () => {
  const [marks, setMarks] = useState([]);
  const [studentInfo, setStudentInfo] = useState(null);
  const [message, setMessage] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [showResult, setShowResult] = useState(false);

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

  useEffect(() => {
    const savedMarks = localStorage.getItem(`marks_${userRef.current?.id}`);
    const savedTeacherSign = localStorage.getItem("nitesh_sign_teacher");
    const savedPrincipalSign = localStorage.getItem("nitesh_sign_principal");

    if (savedMarks) {
      setMarks(JSON.parse(savedMarks));
      setShowResult(true);
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
        setMarks(res.data.data);
        localStorage.setItem(`marks_${userRef.current.id}`, JSON.stringify(res.data.data));
        setShowResult(true);
        setMessage("");
      } else {
        setMessage(res.data.message || "Result data not found.");
      }
    })
    .catch(() => setMessage("Server error. Please try again."));
  };

  const handleLogout = () => {
    setShowResult(false);
  };

  const overall = (() => {
    let o = 0, t = 0;
    marks.forEach(m => { o += Number(m.obtained_marks); t += Number(m.total_marks); });
    return { o, t, p: t ? ((o / t) * 100).toFixed(2) : 0 };
  })();

  const getGrade = (p) => {
    if (p >= 85) return "A+"; if (p >= 75) return "A";
    if (p >= 60) return "B"; if (p >= 33) return "C";
    return "D";
  };

  if (!showResult) {
    return (
      <div style={loginContainer}>
        <div style={loginBox}>
          <h2 style={{ color: "#1a237e", marginBottom: "5px" }}>𝐒mart 𝐒tudents 𝐂lasses</h2>
          <p style={{ color: "#555", fontSize: "0.9rem" }}>EXAM PORTAL 2025-26</p>
          <div style={{ margin: "25px 0" }}>
            <div style={captchaText}>{captcha}</div>
            <input value={captchaInput} onChange={e => setCaptchaInput(e.target.value)} placeholder="Enter Captcha" style={inputStyle} />
            <button onClick={handleCheckResult} style={btnStyle}>View Result</button>
            {message && <p style={{ color: "red", marginTop: "10px", fontSize: "0.85rem" }}>{message}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={marksheetPageWrapper}>
      {activeSignType && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3 style={{color: '#1a237e', marginBottom: '15px'}}>Draw Signature for {activeSignType.toUpperCase()}</h3>
            <canvas ref={canvasRef} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} style={canvasStyle} onMouseEnter={initCanvas} />
            <div style={{ marginTop: '20px' }}>
              <button onClick={saveSignature} style={{ ...miniBtn, background: '#27ae60' }}>Save</button>
              <button onClick={clearCanvas} style={{ ...miniBtn, background: '#f39c12' }}>Clear</button>
              <button onClick={() => setActiveSignType(null)} style={{ ...miniBtn, background: '#e74c3c' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div style={horizontalScrollContainer}>
        <div id="printable-marksheet" style={marksheetFrame}>
          <div style={outerBorder}>
            <div style={headerSection}>
              <div style={{ width: "110px" }}><img src="/logo.png" alt="Logo" style={{ width: "100px" }} onError={(e) => e.target.style.display='none'}/></div>
              <div style={{ flex: 1, textAlign: "center" }}>
                <h1 style={academyName}>SMART STUDENTS CLASSES</h1>
                <p style={subHeader}>GWALIOR'S PREMIER EDUCATIONAL INSTITUTE</p>
                <div style={examBadge}>PRE-FINAL EXAMINATION PERFORMANCE REPORT (2025-26)</div>
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

            <table style={marksTable}>
              <thead>
                <tr style={tableHeaderRow}>
                  <th style={th}>SR. NO</th>
                  <th style={{ ...th, textAlign: "left" }}>SUBJECT NAME</th>
                  <th style={th}>MAX MARKS</th>
                  <th style={th}>THEORY</th>
                  <th style={th}>PRACT/ATT.</th>
                  <th style={th}>OBTAINED</th>
                  <th style={th}>REMARK</th>
                </tr>
              </thead>
              <tbody>
                {marks.map((m, i) => {
                  const perc = (m.obtained_marks / m.total_marks) * 100;
                  return (
                    <tr key={i} style={tableRowStyle}>
                      <td style={td}>{i + 1}</td>
                      <td style={{ ...td, textAlign: "left", fontWeight: "bold" }}>{m.subject.toUpperCase()}</td>
                      <td style={td}>{m.total_marks}</td>
                      <td style={td}>{m.theory_marks}</td>
                      <td style={td}>{Number(m.viva_marks) + Number(m.attendance_marks)}</td>
                      <td style={{ ...td, fontWeight: "900", color: "#1a237e" }}>{m.obtained_marks}</td>
                      <td style={td}>{perc >= 85 ? "DISTINCTION" : perc >= 33 ? "PASSED" : "FAIL"}</td>
                    </tr>
                  );
                })}
                <tr style={{ background: "#f1f3f9", fontWeight: "900" }}>
                  <td colSpan="2" style={td}>GRAND TOTAL</td>
                  <td style={td}>{overall.t}</td>
                  <td colSpan="2" style={td}>PERCENTAGE: {overall.p}%</td>
                  <td style={td}>{overall.o}</td>
                  <td style={td}>{getGrade(overall.p)}</td>
                </tr>
              </tbody>
            </table>

            <div style={bottomGrid}>
              <div style={gradingChart}>
                <p style={{ margin: "0 0 5px 0", fontSize: "0.75rem", fontWeight: "bold", borderBottom: "1px solid #ddd" }}>GRADE SCHEME</p>
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
                  {teacherSign ? <img src={teacherSign} alt="Sign" style={{ height: "60px" }} /> : <span style={cursiveName}>Nitesh Kushwah</span>}
                </div>
                <div style={sigLine}></div>
                <p style={{ fontWeight: "bold", color: "#000", margin: '2px 0', fontSize: '0.8rem' }}>NITESH KUSHWAH</p>
                <p style={sigLabel}>Class Teacher</p>
                {isAdmin && <button onClick={() => setActiveSignType('teacher')} className="no-print" style={drawBtn}>Draw Sign</button>}
              </div>
              
              <div style={sigBox}>
                <div style={curvedSealContainer}>
                  <svg viewBox="0 0 100 100" style={svgSeal}>
                    <path id="curve" d="M 20,50 a 30,30 0 1,1 60,0 a 30,30 0 1,1 -60,0" fill="transparent" />
                    <text style={sealTextStyle}><textPath xlinkHref="#curve">SMART STUDENTS CLASSES • GWALIOR •</textPath></text>
                    <circle cx="50" cy="50" r="22" fill="none" stroke="#1a237e" strokeWidth="0.5" />
                    <text x="50" y="55" textAnchor="middle" style={{fontSize: '7px', fontWeight: 'bold', fill: '#1a237e'}}>Smart Students</text>
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

      <div style={actionButtons}>
        <button onClick={() => window.print()} style={printBtn}>Print Marksheet</button>
        <button onClick={handleLogout} style={backBtn}>Back</button>
      </div>
    </div>
  );
};

/* ============= STYLES ============= */
const modalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 };
const modalContent = { background: '#fff', padding: '30px', borderRadius: '15px', textAlign: 'center' };
const canvasStyle = { border: '2px solid #1a237e', background: '#f9f9f9', cursor: 'crosshair' };
const miniBtn = { padding: '8px 15px', color: '#fff', border: 'none', borderRadius: '4px', margin: '0 5px', cursor: 'pointer', fontWeight: 'bold' };
const drawBtn = { fontSize: '0.6rem', marginTop: '5px', cursor: 'pointer', background: '#eee', border: '1px solid #ccc', padding: '2px 5px' };
const marksheetPageWrapper = { background: "#2c3e50", minHeight: "100vh", padding: "40px 0" };
const horizontalScrollContainer = { width: "100%", overflowX: "auto" };
const marksheetFrame = { width: "1050px", margin: "0 auto", background: "#fff", padding: "20px", boxShadow: "0 0 30px rgba(0,0,0,0.5)" };
const outerBorder = { border: "4px double #1a237e", padding: "30px", minHeight: "850px" };
const headerSection = { display: "flex", alignItems: "center", borderBottom: "3px solid #1a237e", paddingBottom: "15px", marginBottom: "25px" };
const academyName = { margin: 0, color: "#1a237e", fontSize: "2.6rem", fontWeight: "900" };
const subHeader = { margin: "2px 0", color: "#c0392b", fontSize: "1rem", fontWeight: "bold" };
const examBadge = { background: "#1a237e", color: "#fff", padding: "6px 20px", borderRadius: "2px", display: "inline-block", marginTop: "10px", fontSize: "0.85rem", fontWeight: "bold" };
const studentPhoto = { width: "115px", height: "135px", border: "2px solid #1a237e" };
const photoPlaceholder = { width: "115px", height: "135px", border: "1px dashed #bbb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", color: "#999" };
const detailsGrid = { marginBottom: "25px", background: "#fcfcfc", padding: "10px", border: "1px solid #eee" };
const infoTable = { width: "100%", borderCollapse: "collapse" };
const infoTd = { padding: "6px", fontSize: "0.9rem" };
const marksTable = { width: "100%", borderCollapse: "collapse" };
const tableHeaderRow = { background: "#1a237e", color: "#fff" };
const th = { padding: "12px", border: "1px solid #fff", fontSize: "0.8rem" };
const td = { padding: "10px", border: "1px solid #1a237e", fontSize: "0.9rem", textAlign: "center" };
const tableRowStyle = { borderBottom: "1px solid #ccc" };
const bottomGrid = { display: "flex", justifyContent: "space-between", marginTop: "25px", gap: "20px" };
const gradingChart = { flex: 1, padding: "10px", border: "1px solid #ddd", background: "#fafafa" };
const resultSummaryBoard = { width: "250px", border: "2px solid #1a237e", padding: "12px", background: "#f1f3f9" };
const summaryRow = { display: "flex", justifyContent: "space-between", margin: "5px 0", fontSize: "0.9rem" };
const signatureArea = { display: "flex", justifyContent: "space-between", marginTop: "60px", textAlign: "center" };
const sigBox = { width: "200px" };
const sigLine = { borderBottom: "1.5px solid #000", margin: "5px 0" };
const sigLabel = { fontSize: "0.75rem", color: "#555" };
const sigImageContainer = { height: "60px", display: "flex", alignItems: "flex-end", justifyContent: "center" };
const cursiveName = { fontFamily: "'Dancing Script', cursive", fontSize: "1.6rem", color: "#1a237e", opacity: 0.5 };
const curvedSealContainer = { width: "90px", height: "90px", margin: "0 auto" };
const svgSeal = { width: "100%", height: "100%" };
const sealTextStyle = { fontSize: "9px", fontWeight: "bold", fill: "#1a237e" };
const actionButtons = { textAlign: "center", padding: "30px" };
const printBtn = { padding: "12px 35px", background: "#27ae60", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" };
const backBtn = { padding: "12px 35px", background: "#e74c3c", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", marginLeft: "15px" };
const loginContainer = { height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#1a237e" };
const loginBox = { background: "#fff", padding: "40px", borderRadius: "10px", width: "380px", textAlign: "center" };
const captchaText = { fontSize: "2.2rem", fontWeight: "bold", letterSpacing: "8px", color: "#1a237e", marginBottom: "15px" };
const inputStyle = { width: "100%", padding: "12px", border: "1px solid #ccc", borderRadius: "5px", marginBottom: "15px", textAlign: "center" };
const btnStyle = { width: "100%", padding: "12px", background: "#1a237e", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" };

export default ExaminationResult;