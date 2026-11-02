import React, { useState, useEffect, useRef } from "react";
import api from "../../services/api";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const ExaminationResult = () => {
  const [allMarks, setAllMarks] = useState([]); 
  const [filteredMarks, setFilteredMarks] = useState([]); 
  const [studentInfo, setStudentInfo] = useState(null);
  const [message, setMessage] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStep, setVerifyStep] = useState("");
  const [showLockedPopup, setShowLockedPopup] = useState(false);
  
  const [showResult, setShowResult] = useState(() => {
    return localStorage.getItem("show_result_view") === "true";
  });

  const [session] = useState(() => localStorage.getItem("session") || "2026-27");
  const [isLocked, setIsLocked] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const [isDrawing, setIsDrawing] = useState(false);
  const [activeSignType, setActiveSignType] = useState(null);
  const [teacherSign, setTeacherSign] = useState(null);
  const [principalSign, setPrincipalSign] = useState(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const marksheetRef = useRef(null);

  const isAdmin = new URLSearchParams(window.location.search).get("admin") === "true";
  const user = JSON.parse(localStorage.getItem("user"));
  const userRef = useRef(user);

const targetDateStr = "2026-11-02T14:00:00+05:30";

  useEffect(() => {
    const targetDate = new Date(targetDateStr); 

    const calculateTime = () => {
      const now = new Date();
      const difference = targetDate - now;

      if (difference <= 0) {
        setIsLocked(false);
      } else {
        setIsLocked(true);
        const d = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hrs = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const mins = Math.floor((difference / 1000 / 60) % 60);
        const secs = Math.floor((difference / 1000) % 60);
        setTimeLeft({ days: d, hours: hrs, minutes: mins, seconds: secs });
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

    if (savedMarks) setAllMarks(JSON.parse(savedMarks));
    if (savedTeacherSign) setTeacherSign(savedTeacherSign);
    if (savedPrincipalSign) setPrincipalSign(savedPrincipalSign);

    if (userRef.current?.id) {
      api.get(`/api/students/profile?id=${userRef.current.id}`)
        .then(res => {
          if (res.data.success) setStudentInfo(res.data.student);
        })
        .catch(err => console.error("Profile API Error:", err));
    }
    generateCaptcha();
  }, []);

  useEffect(() => {
    if (allMarks.length > 0) {
      setFilteredMarks(allMarks.filter((m) => m.session?.trim() === session.trim()));
    } else {
      setFilteredMarks([]);
    }
  }, [allMarks, session]);

  const startDrawing = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const rect = canvasRef.current.getBoundingClientRect();
    ctxRef.current.lineTo(e.clientX - rect.left, e.clientY - rect.top);
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
      setShowLockedPopup(true);
      return;
    }
    if (captchaInput.toUpperCase() !== captcha) {
      setMessage("❌ Invalid Security Captcha Code!");
      generateCaptcha();
      return;
    }

    setIsVerifying(true);
    setVerifyStep("Processing your Request.....");

    setTimeout(() => {
      setVerifyStep("wait...");
      setTimeout(() => {
        setVerifyStep("Fetching Verified Marksheet Data...");
        api.post(`/api/new-marks/check`, {
          studentId: userRef.current.id,
          studentName: userRef.current.name,
        })
        .then((res) => {
          setIsVerifying(false);
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
        .catch(() => {
          setIsVerifying(false);
          setMessage("Server error. Please try again.");
        });
      }, 1000);
    }, 1000);
  };

  const handleDownloadPDF = async () => {
    const input = marksheetRef.current;
    if (!input) return;
    try {
      const canvas = await html2canvas(input, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Marksheet_${studentInfo?.name || "Student"}_${session}.pdf`);
    } catch (err) {
      console.error("PDF Generation failed:", err);
      window.print();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("show_result_view");
    setShowResult(false);
  };

  const overall = (() => {
    let o = 0, t = 0;
    filteredMarks.forEach(m => { o += Number(m.obtained_marks); t += Number(m.total_marks); });
    return {
      o: Number(o.toFixed(2)),
      t: Number(t.toFixed(2)),
      p: t ? ((o / t) * 100).toFixed(2) : "0.00"
    };
  })();

  const currentExamType = filteredMarks.length > 0 ? filteredMarks[0].exam_type?.toUpperCase() : "EXAMINATION";

  const getGrade = (p) => {
    if (p >= 85) return "A+"; if (p >= 75) return "A";
    if (p >= 60) return "B"; if (p >= 33) return "C";
    return "D";
  };

  // Chote size ke circular timers
  const renderCircleTimer = (val, max, label) => {
    const strokeDasharray = 220;
    const offset = strokeDasharray - (strokeDasharray * (val / max));
    return (
      <div style={circleContainerStyle}>
        <svg width="65" height="65" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle 
            cx="50" cy="50" r="42" fill="none" stroke="#16a34a" strokeWidth="8" 
            strokeDasharray={strokeDasharray}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s linear", transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
          />
        </svg>
        <div style={circleInnerTextStyle}>
          <span style={{ fontSize: "1.1rem", fontWeight: "900", color: "#0f172a" }}>{String(val).padStart(2, '0')}</span>
          <span style={{ fontSize: "0.48rem", fontWeight: "bold", color: "#64748b", letterSpacing: "0.5px", textTransform: "uppercase" }}>{label}</span>
        </div>
      </div>
    );
  };

  if (!showResult) {
    return (
      <div style={whitePortalWrapper}>
        <style>{`
          @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
          .modal-animation { animation: fadeIn 0.2s ease-out forwards; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          .spinner { animation: spin 0.8s linear infinite; }
        `}</style>

        {showLockedPopup && (
          <div style={modalOverlay}>
            <div style={modalContentBox} className="modal-animation">
              <button onClick={() => setShowLockedPopup(false)} style={closeModalBtn}>✕</button>
              <div style={{ fontSize: "2.4rem", marginBottom: "4px" }}>🔒</div>
              <h3 style={{ color: "#c0392b", margin: "0 0 4px 0", fontWeight: "900", fontSize: "1.1rem" }}>Portal Currently Locked</h3>
              <p style={{ color: "#475569", fontSize: "0.8rem", lineHeight: "1.4", margin: "0 0 12px 0" }}>
                Official examination results for session <b>{session}</b> will be declared on <b>05 November 2026 at 02:00 PM IST</b>.
              </p>
              <button onClick={() => setShowLockedPopup(false)} style={popupOkBtn}>Got It</button>
            </div>
          </div>
        )}

        <div style={edgeToEdgeCard}>
          <div style={topHeaderSection}>
            <div style={emblemBadge}>CENTRAL EVALUATION BOARD</div>
            <h1 style={mainHeading}>SMART STUDENTS CLASSES</h1>
            <p style={subHeadingDesc}>Annual Academic Evaluation & Verified Result Gateway • Session {session}</p>
          </div>

          {isVerifying ? (
            <div style={verifyingBox}>
              <div className="spinner" style={spinnerStyle}></div>
              <p style={{ color: "#16a34a", fontWeight: "bold", marginTop: "10px", fontSize: "0.95rem" }}>{verifyStep}</p>
              <p style={{ color: "#64748b", fontSize: "0.75rem", marginTop: "2px" }}>Establishing secure encrypted connection...</p>
            </div>
          ) : (
            <>
              {isLocked && !isAdmin ? (
                <div style={countdownCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={liveBadge}>🔴 LIVE COUNTDOWN</span>
                    <span style={{ fontSize: "0.7rem", fontWeight: "700", color: "#64748b" }}>Release: 05 Nov 2026, 02:00 PM</span>
                  </div>
                  <div style={circlesGrid}>
                    {renderCircleTimer(timeLeft.days, 30, "Days")}
                    {renderCircleTimer(timeLeft.hours, 24, "Hours")}
                    {renderCircleTimer(timeLeft.minutes, 60, "Mins")}
                    {renderCircleTimer(timeLeft.seconds, 60, "Secs")}
                  </div>
                </div>
              ) : (
                isAdmin && (
                  <div style={adminNoticeBar}>
                    ⚡ BOARD ADMIN OVERRIDE IS CURRENTLY ACTIVE
                  </div>
                )
              )}

              <div style={formSection}>
                <div style={formRow}>
                  <div style={{ flex: 1 }}>
                    <label style={formLabel}>SECURITY VERIFICATION CODE</label>
                    <div style={captchaWrapper}>
                      <div style={captchaText}>{captcha}</div>
                      <button onClick={generateCaptcha} style={refreshBtn} title="Refresh Captcha">🔄</button>
                    </div>
                  </div>

                  <div style={{ flex: 1 }}>
                    <label style={formLabel}>ENTER CAPTCHA CODE</label>
                    <input 
                      value={captchaInput} 
                      onChange={e => setCaptchaInput(e.target.value)} 
                      placeholder="Type CAPTCHA" 
                      style={inputStyle} 
                    />
                  </div>
                </div>

                <button 
                  onClick={handleCheckResult} 
                  style={{ ...submitBtn, background: (isLocked && !isAdmin) ? "#475569" : "#16a34a" }}
                >
                  {isLocked && !isAdmin ? "View Results➔" : "Proceed & Processing Your Request ➔"}
                </button>
                {message && <p style={{ color: "#ef4444", marginTop: "6px", fontSize: "0.8rem", textAlign: "center", fontWeight: "700" }}>{message}</p>}
              </div>
            </>
          )}

          <div style={footerNote}>
            Authorized & Verified Examination Control Division • Smart Students Classes, Gwalior
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={marksheetPageWrapper} className="page-wrapper">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0mm !important; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; -webkit-print-color-adjust: exact !important; }
          body * { visibility: hidden !important; }
          #printable-marksheet, #printable-marksheet * { visibility: visible !important; }
          #printable-marksheet {
            position: absolute !important; left: 0 !important; top: 0 !important; width: 210mm !important; height: 297mm !important;
            margin: 0 !important; padding: 10mm !important; box-shadow: none !important; border: none !important; box-sizing: border-box !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {activeSignType && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3 style={{color: '#1a237e', marginBottom: '15px'}}>Draw Signature for {activeSignType.toUpperCase()}</h3>
            <canvas ref={canvasRef} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} style={canvasStyle} onMouseEnter={initCanvas} />
            <div style={{ marginTop: '20px' }}>
              <button onClick={saveSignature} style={{ ...miniBtn, background: '#16a34a' }}>Save Signature</button>
              <button onClick={clearCanvas} style={{ ...miniBtn, background: '#f39c12' }}>Clear</button>
              <button onClick={() => setActiveSignType(null)} style={{ ...miniBtn, background: '#e74c3c' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div style={horizontalScrollContainer}>
        <div ref={marksheetRef} id="printable-marksheet" className="marksheet-frame" style={marksheetFrame}>
          <div style={outerBorder} className="outer-border">
            <div style={headerSection}>
              <div style={{ width: "110px" }}><img src="/logo.png" alt="Logo" style={{ width: "100px" }} onError={(e) => e.target.style.display='none'}/></div>
              <div style={{ flex: 1, textAlign: "center" }}>
                <h1 style={academyName}>SMART STUDENTS CLASSES</h1>
                <p style={subHeader}>CENTRAL BOARD OF EDUCATION • PERFORMANCE STATEMENT</p>
                <div style={examBadge}>{currentExamType} EXAMINATION RESULT ({session})</div>
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
                    <th style={{ ...th, width: "50px" }}>SR. NO</th>
                    <th style={{ ...th, textAlign: "left", width: "240px" }}>SUBJECT NAME</th>
                    <th style={{ ...th, width: "80px" }}>MAX MARKS</th>
                    <th style={{ ...th, width: "90px" }}>THEORY<br />(75)</th>
                    <th style={{ ...th, width: "120px" }}>VIVA / BEHAVIOUR<br />(10)</th>
                    <th style={{ ...th, width: "100px" }}>ATTENDANCE<br />(5)</th>
                    <th style={{ ...th, width: "80px" }}>TASK<br />(10)</th>
                    <th style={{ ...th, width: "90px" }}>OBTAINED<br />(100)</th>
                    <th style={{ ...th, width: "90px" }}>REMARK</th>
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
                          <span style={{ color: perc >= 33 ? "#16a34a" : "#c0392b", fontWeight: "bold" }}>
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
                      <span style={{ padding: "4px 10px", background: overall.p >= 33 ? "#16a34a" : "#c0392b", color: "#fff", borderRadius: "4px", fontSize: "0.8rem" }}>
                        {getGrade(overall.p)}
                      </span>
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
                <div style={summaryRow}><span>STATUS:</span> <b style={{ color: overall.p >= 33 ? "#16a34a" : "red" }}>{overall.p >= 33 ? "PASSED" : "FAILED"}</b></div>
                <div style={summaryRow}><span>FINAL GRADE:</span> <b>{getGrade(overall.p)}</b></div>
              </div>
            </div>

            <div style={signatureArea}>
              <div style={sigBox}>
                <div style={sigImageContainer}>
                  {teacherSign ? <img src={teacherSign} alt="Sign" style={{ height: "50px" }} /> : <span style={cursiveName}>Vandana Kushwah</span>}
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
                  {principalSign ? <img src={principalSign} alt="Sign" style={{ height: "50px" }} /> : <span style={cursiveName}>Nitesh Kushwah</span>}
                </div>
                <div style={sigLine}></div>
                <p style={{ fontWeight: "bold", color: "#000", margin: '2px 0', fontSize: '0.8rem' }}>NITESH KUSHWAH</p>
                <p style={sigLabel}>Principal</p>
                {isAdmin && <button onClick={() => setActiveSignType('principal')} className="no-print" style={drawBtn}>Draw Sign</button>}
              </div>
            </div>
            <div style={{textAlign: 'center', marginTop: '20px', fontSize: '0.65rem', color: '#777', fontStyle: 'italic'}}>Note: This is an electronically generated report card verified by Smart Students Classes Central Portal.</div>
          </div>
        </div>
      </div>

      <div style={actionButtons} className="no-print">
        <button onClick={() => window.print()} style={printBtn}>🖨️ Print Marksheet</button>
        <button onClick={handleDownloadPDF} style={downloadBtn}>📥 Download Official PDF</button>
        <button onClick={handleLogout} style={backBtn}>⬅️ Back to Portal</button>
      </div>
    </div>
  );
};

/* ============= STYLES (COMPACT WHITE THEME & CORNER-TO-CORNER) ============= */
const whitePortalWrapper = { minHeight: "100vh", width: "100%", display: "flex", justifyContent: "center", alignItems: "center", background: "#f8fafc", padding: "10px", boxSizing: "border-box", overflowY: "auto" };
const edgeToEdgeCard = { background: "#ffffff", width: "100%", maxWidth: "560px", minHeight: "560px", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "20px 30px", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0", boxSizing: "border-box", margin: "auto" };

const topHeaderSection = { textAlign: "center", borderBottom: "2px solid #f1f5f9", paddingBottom: "10px" };
const emblemBadge = { background: "#f0fdf4", color: "#15803d", padding: "3px 12px", borderRadius: "20px", display: "inline-block", fontSize: "0.7rem", fontWeight: "800", letterSpacing: "1px", border: "1px solid #dcfce7", marginBottom: "4px" };
const mainHeading = { color: "#0f172a", fontSize: "1.7rem", fontWeight: "900", margin: "2px 0", letterSpacing: "0.5px" };
const subHeadingDesc = { color: "#64748b", fontSize: "0.78rem", fontWeight: "500", margin: 0 };

const countdownCard = { background: "#f8fafc", borderRadius: "10px", padding: "10px 15px", border: "1px solid #e2e8f0" };
const liveBadge = { background: "#278727", color: "#fff", padding: "6px 6px",marginRight: "20px", borderRadius: "8px", fontSize: "0.65rem", fontWeight: "650", letterSpacing: "0.5px" };
const circlesGrid = { display: "flex", justifyContent: "space-around", alignItems: "center" };
const circleContainerStyle = { position: "relative", width: "65px", height: "65px", display: "flex", justifyContent: "center", alignItems: "center" };
const circleInnerTextStyle = { position: "absolute", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" };

const adminNoticeBar = { background: "#d1fae5", color: "#065f46", padding: "10px", borderRadius: "8px", fontWeight: "bold", textAlign: "center", fontSize: "0.85rem", border: "1px solid #a7f3d0" };

const formSection = { background: "#ffffff", padding: "2px 0" };
const formRow = { display: "flex", gap: "12px", marginBottom: "10px", textAlign: "left" };
const formLabel = { fontSize: "0.7rem", fontWeight: "800", color: "#334155", display: "block", marginBottom: "4px", letterSpacing: "0.5px" };
const captchaWrapper = { display: "flex", alignItems: "center", background: "#f8fafc", borderRadius: "6px", padding: "4px 10px", border: "1px solid #cbd5e1" };
const captchaText = { fontSize: "1.5rem", fontWeight: "900", letterSpacing: "6px", color: "#16a34a", fontStyle: "italic", flex: 1 };
const refreshBtn = { background: "none", border: "none", fontSize: "1rem", cursor: "pointer", padding: "2px" };
const inputStyle = { width: "120%", padding: "9px", border: "2px solid #cbd5e1", borderRadius: "6px", fontSize: "0.9rem", fontWeight: "700", textAlign: "center", outline: "none", boxSizing: "border-box" };
const submitBtn = { width: "60%", padding: "6px", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.95rem", fontWeight: "400", letterSpacing: "0.5px", cursor: "pointer", boxShadow: "0 4px 10px rgba(22, 163, 74, 0.25)" };

const footerNote = { textAlign: "center", color: "#94a3b8", fontSize: "0.7rem", fontWeight: "500", borderTop: "1px solid #f1f5f9", paddingTop: "6px" };

const verifyingBox = { padding: "25px 15px", textAlign: "center" };
const spinnerStyle = { width: "38px", height: "38px", border: "3px solid #e2e8f0", borderTop: "3px solid #16a34a", borderRadius: "50%", margin: "0 auto" };

const modalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' };
const modalContentBox = { background: '#fff', padding: '20px 18px', borderRadius: '12px', textAlign: 'center', boxShadow: "0 15px 30px rgba(0,0,0,0.3)", width: '90%', maxWidth: '340px', position: 'relative' };
const closeModalBtn = { position: 'absolute', top: '8px', right: '10px', background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#64748b', fontWeight: 'bold' };
const popupOkBtn = { padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', width: '100%' };

const modalContent = { background: '#fff', padding: '30px', borderRadius: '15px', textAlign: 'center', boxShadow: "0 10px 30px rgba(0,0,0,0.3)" };
const canvasStyle = { border: '2px dashed #1a237e', background: '#f9f9f9', cursor: 'crosshair', borderRadius: "8px" };
const miniBtn = { padding: '10px 18px', color: '#fff', border: 'none', borderRadius: '6px', margin: '0 5px', cursor: 'pointer', fontWeight: 'bold' };
const drawBtn = { fontSize: '0.65rem', marginTop: '4px', cursor: 'pointer', background: '#34495e', color: '#fff', border: "none", padding: '4px 10px', borderRadius: "4px" };
const marksheetPageWrapper = { background: "#1e272e", minHeight: "100vh", padding: "20px 0", fontFamily: "'Segoe UI', Roboto, sans-serif" };
const horizontalScrollContainer = { width: "100%", overflowX: "auto" };
const marksheetFrame = { width: "900px",minHeight: "1050px", margin: "0 auto", background: "#fff", padding: "20px", boxShadow: "0 15px 40px rgba(0,0,0,0.6)", borderRadius: "8px" };
const outerBorder = { border: "4px double #1a237e", padding: "20px", position: "relative" };
const headerSection = { display: "flex", alignItems: "center", borderBottom: "3px solid #1a237e", paddingBottom: "10px", marginBottom: "15px" };
const academyName = { margin: 0, color: "#1a237e", fontSize: "2.4rem", fontWeight: "900", letterSpacing: "0.5px" };
const subHeader = { margin: "2px 0", color: "#c0392b", fontSize: "0.85rem", fontWeight: "bold", letterSpacing: "1.5px" };
const examBadge = { background: "#1a237e", color: "#fff", padding: "6px 20px", borderRadius: "4px", display: "inline-block", marginTop: "8px", fontSize: "0.85rem", fontWeight: "bold" };
const studentPhoto = { width: "105px", height: "125px", border: "2px solid #1a237e", objectFit: "cover", borderRadius: "4px" };
const photoPlaceholder = { width: "105px", height: "125px", border: "1px dashed #bbb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", color: "#999", fontWeight: "bold" };
const detailsGrid = { marginBottom: "15px", background: "#f8f9fa", padding: "10px", border: "1px solid #e1e8ed", borderRadius: "6px" };
const infoTable = { width: "100%", borderCollapse: "collapse" };
const infoTd = { padding: "6px", fontSize: "0.85rem", color: "#2c3e50" };
const marksTable = { width: "100%", borderCollapse: "collapse" };
const tableHeaderRow = { background: "#1a237e", color: "#fff" };
const th = { padding: "8px 4px", border: "1px solid #fff", fontSize: "0.80rem", fontWeight: "700", textAlign: "center" };
const td = { padding: "8px 4px", border: "1px solid #1a237e", fontSize: "0.85rem", textAlign: "center", color: "#333" };
const tableRowStyle = { borderBottom: "1px solid #ccc" };
const bottomGrid = { display: "flex", justifyContent: "space-between", marginTop: "15px", gap: "20px" };
const gradingChart = { flex: 1, padding: "10px", border: "1px solid #ddd", background: "#fafafa", borderRadius: "6px" };
const resultSummaryBoard = { width: "240px", border: "2px solid #1a237e", padding: "10px", background: "#f1f3f9", borderRadius: "6px" };
const summaryRow = { display: "flex", justifyContent: "space-between", margin: "4px 0", fontSize: "0.9rem" };
const signatureArea = { display: "flex", justifyContent: "space-between", marginTop: "35px", textAlign: "center" };
const sigBox = { width: "180px", display: "flex", flexDirection: "column", alignItems: "center" };
const sigLine = { borderBottom: "1.5px solid #000", width: "100%", margin: "4px 0" };
const sigLabel = { fontSize: "0.7rem", color: "#555", fontWeight: "500" };
const sigImageContainer = { height: "50px", display: "flex", alignItems: "flex-end", justifyContent: "center", marginBottom: "4px" };
const cursiveName = { fontFamily: "'Dancing Script', cursive", fontSize: "1.4rem", color: "#1a237e", opacity: 0.4 };
const curvedSealContainer = { width: "80px", height: "80px", margin: "0 auto" };
const svgSeal = { width: "100%", height: "100%" };
const sealTextStyle = { fontSize: "8.5px", fontWeight: "bold", fill: "#1a237e" };
const actionButtons = { textAlign: "center", padding: "20px 0", display: "flex", justifyContent: "center", gap: "15px", flexWrap: "wrap" };
const printBtn = { padding: "10px 24px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "20px", cursor: "pointer", fontWeight: "bold", fontSize: "0.9rem", boxShadow: "0 4px 12px rgba(22, 163, 74, 0.3)" };
const downloadBtn = { padding: "10px 24px", background: "#0284c7", color: "#fff", border: "none", borderRadius: "20px", cursor: "pointer", fontWeight: "bold", fontSize: "0.9rem", boxShadow: "0 4px 12px rgba(2, 132, 199, 0.3)" };
const backBtn = { padding: "10px 24px", background: "#dc2626", color: "#fff", border: "none", borderRadius: "20px", cursor: "pointer", fontSize: "0.9rem", boxShadow: "0 4px 12px rgba(220, 38, 38, 0.3)", fontWeight: "bold" };

export default ExaminationResult;