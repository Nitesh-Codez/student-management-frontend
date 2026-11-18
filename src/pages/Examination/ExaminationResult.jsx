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

  const marksheetRef = useRef(null);

  const isAdmin = new URLSearchParams(window.location.search).get("admin") === "true";
  const user = JSON.parse(localStorage.getItem("user"));
  const userRef = useRef(user);

  const targetDateStr = "2026-11-02T14:02:00+05:30";

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
    if (savedMarks) setAllMarks(JSON.parse(savedMarks));

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
                Official examination results for session <b>{session}</b> will be declared on <b>02 November 2026 at 02:00 PM IST</b>.
              </p>
              <button onClick={() => setShowLockedPopup(false)} style={popupOkBtn}>Got It</button>
            </div>
          </div>
        )}

        <div style={edgeToEdgeCard}>
          <div style={topHeaderSection}>
            <div style={emblemBadge}>OFFICIAL ACADEMIC PORTAL</div>
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
                    <span style={{ fontSize: "0.7rem", fontWeight: "700", color: "#64748b" }}>Release: 02 Nov 2026, 02:00 PM</span>
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
                    ⚡ COACHING ADMIN OVERRIDE IS CURRENTLY ACTIVE
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
                  {isLocked && !isAdmin ? "View Results ➔" : "Proceed & Processing Your Request ➔"}
                </button>
                {message && <p style={{ color: "#ef4444", marginTop: "6px", fontSize: "0.8rem", textAlign: "center", fontWeight: "700" }}>{message}</p>}
              </div>
            </>
          )}

          <div style={footerNote}>
            Smart Students Classes • Premier Coaching & Educational Institution, Gwalior
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
            position: absolute !important; left: 0 !important; top: 0 !important; width: 210mm !important; height: auto !important;
            margin: 0 !important; padding: 12mm 10mm !important; box-shadow: none !important; border: none !important; box-sizing: border-box !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div style={horizontalScrollContainer}>
        <div ref={marksheetRef} id="printable-marksheet" className="marksheet-frame" style={marksheetFrame}>
          <div style={outerBorder} className="outer-border">
            
            {/* Header Section */}
            <div style={headerSection}>
              <div style={{ width: "95px" }}>
                <img src="/logo.png" alt="Logo" style={{ width: "85px" }} onError={(e) => e.target.style.display='none'}/>
              </div>
              <div style={{ flex: 1, textAlign: "center" }}>
                <h1 style={academyName}>SMART STUDENTS CLASSES</h1>
                <p style={subHeader}>EXCELLENCE IN EDUCATION • PERFORMANCE & CONDUCT STATEMENT</p>
                <div style={examBadge}>{currentExamType} EXAMINATION RESULT • SESSION ({session})</div>
              </div>
              <div style={{ width: "115px", textAlign: "right" }}>
                {studentInfo?.profile_photo ? <img src={studentInfo.profile_photo} alt="Student" style={studentPhoto} /> : <div style={photoPlaceholder}>AFFIX PHOTO</div>}
              </div>
            </div>

            {/* Detailed Student Bio Section */}
            <div style={detailsGrid}>
              <table style={infoTable}>
                <tbody>
                  <tr>
                    <td style={infoTd}><b>STUDENT NAME</b></td>
                    <td style={infoTd}>: <span style={{fontSize: "0.85rem", fontWeight: "900", color: "#0f172a"}}>{studentInfo?.name?.toUpperCase() || userRef.current?.name?.toUpperCase()}</span></td>
                    <td style={infoTd}><b>ROLL NUMBER</b></td>
                    <td style={infoTd}>: <span style={{fontWeight: "800", color: "#0f172a"}}>{studentInfo?.code || "SSC-2026-0049"}</span></td>
                  </tr>
                  <tr>
                    <td style={infoTd}><b>FATHER'S NAME</b></td>
                    <td style={infoTd}>: <span style={{fontWeight: "700", color: "#0f172a"}}>{studentInfo?.father_name?.toUpperCase() || "MR. KUSHWAH"}</span></td>
                    <td style={infoTd}><b>MOTHER'S NAME</b></td>
                    <td style={infoTd}>: <span style={{fontWeight: "700", color: "#0f172a"}}>{studentInfo?.mother_name?.toUpperCase() || "MRS. KUSHWAH"}</span></td>
                  </tr>
                  <tr>
                    <td style={infoTd}><b>CLASS / BATCH</b></td>
                    <td style={infoTd}>: <span style={{fontWeight: "700", color: "#0f172a"}}>{studentInfo?.class || "10th CBSE / MP BOARD"}</span></td>
                    <td style={infoTd}><b>DATE OF BIRTH</b></td>
                    <td style={infoTd}>: <span style={{fontWeight: "700", color: "#0f172a"}}>{studentInfo?.dob ? new Date(studentInfo.dob).toLocaleDateString() : "15-08-2011"}</span></td>
                  </tr>
                  <tr>
                    
                    
                    <td style={infoTd}><b>DATE OF ISSUE</b></td>
                    <td style={infoTd}>: {new Date().toLocaleDateString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Marks Table Section with Light Border Header Row & Dark Inner Rows */}
            {filteredMarks.length > 0 ? (
              <table style={marksTable}>
                <thead>
                  <tr style={tableHeaderRow}>
                    <th style={{ ...th, width: "45px" }}>SR. NO</th>
                    <th style={{ ...th, textAlign: "left", width: "170px" }}>SUBJECT NAME</th>
                    <th style={{ ...th, width: "65px" }}>MAX MARKS</th>
                    <th style={{ ...th, width: "65px" }}>THEORY</th>
                    <th style={{ ...th, width: "60px" }}>VIVA</th>
                    <th style={{ ...th, width: "70px" }}>ATTENDANCE</th>
                    <th style={{ ...th, width: "55px" }}>TASK</th>
                    <th style={{ ...th, width: "75px" }}>OBTAINED</th>
                    <th style={{ ...th, width: "85px" }}>REMARK</th>
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
                  <tr style={{ background: "#f8fafc", fontWeight: "900" }}>
                    <td colSpan="2" style={td}>GRAND TOTAL</td>
                    <td style={td}>{overall.t}</td>
                    <td colSpan="4" style={td}>AGGREGATE PERCENTAGE: {overall.p}%</td>
                    <td style={{ ...td, color: "#1a237e", fontWeight: "900" }}>{overall.o}</td>
                    <td style={td}>
                      <span style={{ padding: "3px 8px", background: overall.p >= 33 ? "#16a34a" : "#c0392b", color: "#fff", borderRadius: "4px", fontSize: "0.8rem" }}>
                        {getGrade(overall.p)}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: "center", padding: "20px", fontSize: "1rem", fontWeight: "bold", color: "#c0392b", border: "1px dashed #1a237e", borderRadius: "6px" }}>
                No active exam records found for Session {session}.
              </div>
            )}

            {/* Extra Academic & Conduct Summary Block */}
            <div style={bottomGrid}>
              <div style={gradingChart}>
                <p style={{ margin: "0 0 3px 0", fontSize: "0.75rem", fontWeight: "bold", borderBottom: "1px solid #1a237e", color: "#1a237e" }}>COACHING GRADING SCHEME</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 10px", fontSize: "0.68rem", color: "#1e293b" }}>
                  <span>A+ : 85% - 100% (Distinction)</span>
                  <span>A : 75% - 84% (First Div)</span>
                  <span>B : 60% - 74% (Second Div)</span>
                  <span>C : 33% - 59% (Pass)</span>
                </div>
              </div>
              <div style={resultSummaryBoard}>
                <div style={summaryRow}><span>OVERALL STATUS:</span> <b style={{ color: overall.p >= 33 ? "#16a34a" : "red" }}>{overall.p >= 33 ? "PASSED & QUALIFIED" : "FAILED"}</b></div>
                <div style={summaryRow}><span>FINAL GRADE AWARDED:</span> <b style={{color: "#1a237e"}}>{getGrade(overall.p)}</b></div>
                <div style={summaryRow}><span>CONDUCT / DISCIPLINE:</span> <b>EXCELLENT (A+)</b></div>
              </div>
            </div>

            {/* Signature Area */}
            <div style={signatureArea}>
              <div style={sigBox}>
                <div style={sigImageContainer}></div>
                <div style={sigLine}></div>
                <p style={{ fontWeight: "bold", color: "#000", margin: '1px 0', fontSize: '0.8rem' }}>VANDANA KUSHWAH</p>
                <p style={sigLabel}>Class Teacher & Faculty</p>
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
                <p style={sigLabel}>Official Institute Seal</p>
              </div>

              <div style={sigBox}>
                <div style={sigImageContainer}></div>
                <div style={sigLine}></div>
                <p style={{ fontWeight: "bold", color: "#000", margin: '1px 0', fontSize: '0.8rem' }}>NITESH KUSHWAH</p>
                <p style={sigLabel}>Principal & Director</p>
              </div>
            </div>

            <div style={{textAlign: 'center', marginTop: '10px', fontSize: '0.65rem', color: "#475569", fontStyle: 'italic'}}>Note: This is an electronically generated and verified official academic report card issued by Smart Students Classes, Gwalior.</div>
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

/* ============= ENHANCED & BALANCED STYLES ============= */
const whitePortalWrapper = { minHeight: "100vh", width: "100%", display: "flex", justifyContent: "center", alignItems: "center", background: "#f8fafc", padding: "10px", boxSizing: "border-box", overflowY: "auto" };
const edgeToEdgeCard = { background: "#ffffff", width: "100%", maxWidth: "560px", minHeight: "560px", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "20px 30px", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0", boxSizing: "border-box", margin: "auto" };

const topHeaderSection = { textAlign: "center", borderBottom: "2px solid #1a237e", paddingBottom: "10px" };
const emblemBadge = { background: "#f0fdf4", color: "#15803d", padding: "2px 12px", borderRadius: "20px", display: "inline-block", fontSize: "0.7rem", fontWeight: "800", letterSpacing: "1px", border: "1px solid #dcfce7", marginBottom: "4px" };
const mainHeading = { color: "#1a237e", fontSize: "1.99rem", fontWeight: "900", margin: "3px 0", letterSpacing: "0.5px" };
const subHeadingDesc = { color: "#475569", fontSize: "0.78rem", fontWeight: "600", margin: 0 };

const countdownCard = { background: "#f8fafc", borderRadius: "10px", padding: "10px 15px", border: "1px solid #e2e8f0" };
const liveBadge = { background: "#278727", color: "#fff", padding: "6px 6px", marginRight: "20px", borderRadius: "8px", fontSize: "0.65rem", fontWeight: "650", letterSpacing: "0.5px" };
const circlesGrid = { display: "flex", justifyContent: "space-around", alignItems: "center" };
const circleContainerStyle = { position: "relative", width: "65px", height: "65px", display: "flex", justifyContent: "center", alignItems: "center" };
const circleInnerTextStyle = { position: "absolute", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" };

const adminNoticeBar = { background: "#d1fae5", color: "#065f46", padding: "8px", borderRadius: "8px", fontWeight: "bold", textAlign: "center", fontSize: "0.8rem", border: "1px solid #a7f3d0" };

const formSection = { background: "#ffffff", padding: "2px 0" };
const formRow = { display: "flex", gap: "12px", marginBottom: "8px", textAlign: "left" };
const formLabel = { fontSize: "0.7rem", fontWeight: "800", color: "#334155", display: "block", marginBottom: "3px", letterSpacing: "0.5px" };
const captchaWrapper = { display: "flex", alignItems: "center", background: "#f8fafc", borderRadius: "6px", padding: "4px 10px", border: "1px solid #cbd5e1" };
const captchaText = { fontSize: "1.4rem", fontWeight: "900", letterSpacing: "6px", color: "#16a34a", fontStyle: "italic", flex: 1 };
const refreshBtn = { background: "none", border: "none", fontSize: "1rem", cursor: "pointer", padding: "2px" };
const inputStyle = { width: "100%", padding: "8px", border: "2px solid #cbd5e1", borderRadius: "6px", fontSize: "0.85rem", fontWeight: "700", textAlign: "center", outline: "none", boxSizing: "border-box" };
const submitBtn = { width: "100%", padding: "9px", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.95rem", fontWeight: "600", letterSpacing: "0.5px", cursor: "pointer", boxShadow: "0 4px 10px rgba(22, 163, 74, 0.25)" };

const footerNote = { textAlign: "center", color: "#94a3b8", fontSize: "0.68rem", fontWeight: "500", borderTop: "1px solid #f1f5f9", paddingTop: "5px" };

const verifyingBox = { padding: "20px 15px", textAlign: "center" };
const spinnerStyle = { width: "35px", height: "35px", border: "3px solid #e2e8f0", borderTop: "3px solid #16a34a", borderRadius: "50%", margin: "0 auto" };

const modalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' };
const modalContentBox = { background: '#fff', padding: '20px 18px', borderRadius: '12px', textAlign: 'center', boxShadow: "0 15px 30px rgba(0,0,0,0.3)", width: '90%', maxWidth: '340px', position: 'relative' };
const closeModalBtn = { position: 'absolute', top: '8px', right: '10px', background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#64748b', fontWeight: 'bold' };
const popupOkBtn = { padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', width: '100%' };

const marksheetPageWrapper = { background: "#1e272e", minHeight: "100vh", padding: "25px 0", fontFamily: "'Segoe UI', Roboto, sans-serif", display: "flex", flexDirection: "column", alignItems: "center" };
const horizontalScrollContainer = { width: "100%", display: "flex", justifyContent: "center", overflowX: "auto", paddingBottom: "20px" };

const marksheetFrame = { width: "794px", minHeight: "1050px", background: "#ffffff", padding: "25px 35px", boxSizing: "border-box", boxShadow: "0 10px 30px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", justifyContent: "space-between" };
const outerBorder = { border: "3px double #1a237e", padding: "14px 16px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", boxSizing: "border-box", background: "#ffffff" };

const headerSection = { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #1a237e", paddingBottom: "10px" };
const academyName = { fontSize: "1.6rem", fontWeight: "900", color: "#1a237e", margin: "0", letterSpacing: "0.5px" };
const subHeader = { fontSize: "0.72rem", fontWeight: "700", color: "#334155", margin: "2px 0" };
const examBadge = { background: "#1a237e", color: "#fff", padding: "15px 25px", borderRadius: "10px", fontSize: "0.99rem", fontWeight: "bold", display: "inline-block", marginTop: "3px" };

/* Profile photo size increased */
const studentPhoto = { width: "120px", height: "130px", objectFit: "cover", border: "1px solid #1a237e", borderRadius: "4px" };
const photoPlaceholder = { width: "80px", height: "100px", border: "1px dashed #1a237e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.5rem", color: "#1a237e", textAlign: "center", background: "#f8fafc" };

const detailsGrid = { margin: "10px 0", background: "#ffffff", padding: "6px 0", borderBottom: "1px solid #1a237e" };
const infoTable = { width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" };
const infoTd = { padding: "4px 6px", color: "#0f172a" };

/* Marks table: Header row has light border, inner rows have dark/solid borders */
const marksTable = { width: "100%", borderCollapse: "collapse", margin: "10px 0", textAlign: "center", fontSize: "0.78rem" };
const tableHeaderRow = { background: "#1a237e", color: "#ffffff" };
const th = { border: "1px solid #94a3b8", padding: "7px 5px", fontWeight: "700", fontSize: "0.72rem", lineHeight: "1.1" }; // Light border for header row
const td = { border: "1px solid #1a237e", padding: "6px 5px", color: "#0f172a" }; // Dark solid border for rest of table
const tableRowStyle = { background: "#ffffff" };

const bottomGrid = { display: "flex", justifyContent: "space-between", margin: "10px 0", gap: "12px" };
const gradingChart = { border: "1px solid #1a237e", padding: "6px 10px", borderRadius: "4px", flex: 1, background: "#ffffff" };
const resultSummaryBoard = { border: "1px solid #1a237e", padding: "6px 10px", borderRadius: "4px", flex: 1, background: "#ffffff", display: "flex", flexDirection: "column", justifyContent: "center", fontSize: "0.78rem" };
const summaryRow = { display: "flex", justifyContent: "space-between", margin: "2px 0", color: "#0f172a" };

const signatureArea = { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #1a237e" };
const sigBox = { textAlign: "center", width: "30%" };
const sigImageContainer = { height: "45px" }; 
const sigLine = { borderTop: "1px solid #1a237e", width: "100%", margin: "3px 0 2px 0" };
const sigLabel = { fontSize: "0.65rem", color: "#1e293b", fontWeight: "700", textTransform: "uppercase" };

const curvedSealContainer = { width: "65px", height: "65px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", border: "2px dotted #1a237e", borderRadius: "50%", background: "#f8fafc" };
const svgSeal = { width: "60px", height: "60px" };
const sealTextStyle = { fontSize: "7px", fill: "#1a237e", fontWeight: "bold" };

const actionButtons = { display: "flex", gap: "10px", marginTop: "15px", marginBottom: "20px" };
const printBtn = { background: "#34495e", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "0.85rem" };
const downloadBtn = { background: "#16a34a", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "0.85rem" };
const backBtn = { background: "#e74c3c", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "0.85rem" };

export default ExaminationResult;