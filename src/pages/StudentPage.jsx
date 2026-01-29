import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaClock, FaCheckCircle, FaChevronDown, FaChevronUp, FaTimes, FaTrash } from "react-icons/fa";

const API_URL = "https://student-management-system-4-hose.onrender.com";
const ASSIGNMENTS_API = `${API_URL}/api/assignments/class`;
const SUBMIT_API = `${API_URL}/api/assignments/student/upload`;
const DELETE_API = `${API_URL}/api/assignments`;

export default function StudentPage() {
  const [tasks, setTasks] = useState([]);
  const [files, setFiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState(null);
  const [focusedTask, setFocusedTask] = useState(null);
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const user = JSON.parse(localStorage.getItem("user")) || {};
  const studentClass = user.class || "";
  const studentId = user.id || "";

  // Live timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch tasks
  const fetchTasks = async () => {
    if (!studentClass || !studentId) return;
    try {
      const res = await axios.get(`${ASSIGNMENTS_API}/${studentClass}/${studentId}`);
      if (res.data.success) setTasks(res.data.assignments);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, [studentClass, studentId]);

  const pendingTasks = tasks.filter((t) => t.status !== "SUBMITTED");
  const completedTasksList = tasks.filter((t) => t.status === "SUBMITTED");

  // Calculate overall marks based on rating + submission time
const calculateMarks = (task) => {
  if (!task.rating) return 0;

  const baseMarks = task.rating * 4; // rating out of 5 scaled to 20
  const deadline = new Date(task.deadline);
  const submitted = new Date(task.student_uploaded_at);

  const diffDays = Math.floor((deadline - submitted) / (1000 * 60 * 60 * 24));

  let timeModifier = 0;
  if (diffDays > 0) timeModifier = Math.min(diffDays, 3);   // early submission bonus
  else if (diffDays < 0) timeModifier = Math.max(diffDays, -3); // late submission penalty

  return Math.max(0, Math.min(20, baseMarks + timeModifier)); // clamp between 0-20
};

const ratedTasks = completedTasksList.filter((t) => t.rating);
const totalMarks = ratedTasks.reduce((sum, t) => sum + calculateMarks(t), 0);
const overallScoreOutof20 = ratedTasks.length > 0 ? (totalMarks / ratedTasks.length).toFixed(1) : 0;


  const groupedCompleted = completedTasksList.reduce((acc, task) => {
    if (!acc[task.subject]) acc[task.subject] = [];
    acc[task.subject].push(task);
    return acc;
  }, {});

  // Submit file
  const handleSubmit = async (task) => {
    const file = files[task.id];
    if (!file) return alert("Select a file first!");

    const deadline = new Date(task.deadline);
    const diffMs = currentTime - deadline;
    if (diffMs > 3 * 24 * 60 * 60 * 1000) {
      return alert("Late submission window closed (Max 3 days allowed).");
    }

    setUploadingId(task.id);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("uploader_id", studentId);
    fd.append("uploader_role", "student");
    fd.append("student_id", studentId);
    fd.append("class", studentClass);
    fd.append("task_title", task.task_title);
    fd.append("subject", task.subject);
    if (task.deadline) fd.append("deadline", task.deadline);

    try {
      const res = await axios.post(SUBMIT_API, fd, { headers: { "Content-Type": "multipart/form-data" } });
      if (res.data.success) {
        alert("Submitted successfully! 🚀");
        fetchTasks();
        setFocusedTask(null);
        setFiles((prev) => { const newFiles = { ...prev }; delete newFiles[task.id]; return newFiles; });
      }
    } catch (err) {
      console.error("Submission Error:", err.response?.data || err.message);
      alert(`Error: ${err.response?.data?.message || "Submission failed."}`);
    } finally { setUploadingId(null); }
  };

  // Delete submission
  const handleDeleteSubmission = async (submissionId) => {
    if (!window.confirm("Delete your submission?")) return;
    try { await axios.delete(`${DELETE_API}/${submissionId}`); fetchTasks(); } 
    catch { alert("Delete failed"); }
  };

  const formatDateTime = (dateStr) =>
    dateStr ? new Date(dateStr).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "-";

  // Task card
  const renderTaskCard = (task, isFull = false) => {
    const isSubmitted = task.status === "SUBMITTED";
    const deadline = new Date(task.deadline);
    const diffMs = deadline - currentTime;
    const isOverdue = diffMs < 0;
    const absDiff = Math.abs(diffMs);
    const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((absDiff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((absDiff / (1000 * 60)) % 60);
    const secs = Math.floor((absDiff / 1000) % 60);
    const isExpired = isOverdue && days >= 3;

    return (
      <div key={task.id} style={isFull ? fullViewCard : taskCard(isSubmitted)}>
        <div style={cardHeader}>
          <div style={subjectPill}>{task.subject}</div>
          <div style={statusBadge(isSubmitted)}>
            {isSubmitted ? "COMPLETED" : isExpired ? "EXPIRED" : "PENDING"}
          </div>
        </div>
        <h3 style={taskTitleText}>{task.task_title}</h3>
        <div style={infoGrid}>
          <div style={infoItem}>
            <span style={infoLabel}>DEADLINE</span>
            <span style={infoValue}>{formatDateTime(task.deadline)}</span>
          </div>
          {!isSubmitted && (
            <div style={infoItem}>
              <span style={infoLabel}>{isOverdue ? "TIME OVERDUE" : "TIME LEFT"}</span>
              <span style={{ ...infoValue, color: isOverdue ? "#ff4141" : "#00ff88", fontFamily: "monospace", fontSize: "14px" }}>
                {days}d {hours}h {mins}m {secs}s {isOverdue ? "LATE" : ""}
              </span>
            </div>
          )}
          {isSubmitted && (
            <div style={infoItem}>
              <span style={infoLabel}>SUBMITTED ON</span>
              <span style={infoValue}>
                {formatDateTime(task.student_uploaded_at)}
                {(() => {
                  const subDate = new Date(task.student_uploaded_at);
                  const subDiff = deadline - subDate;
                  const subAbs = Math.abs(subDiff);
                  const d = Math.floor(subAbs / 86400000);
                  const h = Math.floor((subAbs % 86400000) / 3600000);
                  return (
                    <span style={{ color: subDiff > 0 ? "#2fff00" : "#ff4141", marginLeft: "8px", fontSize: "12px", fontWeight: 700 }}>
                      ({d}d {h}h {subDiff > 0 ? "early" : "late"})
                    </span>
                  );
                })()}
              </span>
            </div>
          )}
        </div>
        <div style={glassDivider} />
        <div style={actionColumn}>
          {!isFull && !isSubmitted && <button style={btnSmall} onClick={() => setFocusedTask(task)}>⛶ Focus Mode</button>}
          {task.task_file && <button style={btnViewTask} onClick={() => window.open(task.task_file, "_blank")}>📖 View Question Paper</button>}
          {isSubmitted ? (
            <div style={submissionArea}>
              <button style={btnSuccess} onClick={() => window.open(task.student_file, "_blank")}>✅ My Submission</button>
              {task.rating ? (
                <div style={ratingCard}>
                  <p style={ratingLabel}>YOUR SCORE: {task.rating * 4}/20</p>
                  <div style={starRow}>
                    {[1, 2, 3, 4, 5].map((i) => <span key={i} style={{ color: i <= task.rating ? "#FFD700" : "#4b4b6b" }}>★</span>)}
                  </div>
                </div>
              ) : <div style={waitBadge}>🕒 Checking Performance...</div>}
              <button style={btnDeleteLink} onClick={() => handleDeleteSubmission(task.student_submission_id)}><FaTrash /> Remove Submission</button>
            </div>
          ) : (
            <div style={uploadZone}>
              {isExpired ? (
                <div style={{ ...customUploadBtn, borderColor: "#ff4141", color: "#ff4141", cursor: "not-allowed" }}>❌ Submission Closed (3+ Days Late)</div>
              ) : (
                <>
                  <label style={uploadLabelStyle}>
                    <input type="file" style={{ display: "none" }} onChange={(e) => setFiles({ ...files, [task.id]: e.target.files[0] })} />
                    <div style={customUploadBtn}>{files[task.id] ? `📎 ${files[task.id].name.substring(0, 20)}...` : "Select Assignment File"}</div>
                  </label>
                  <button style={uploadingId === task.id ? btnDisabled : btnSubmit} disabled={uploadingId === task.id} onClick={() => handleSubmit(task)}>
                    {uploadingId === task.id ? "UPLOADING..." : isOverdue ? "SUBMIT LATE" : "SUBMIT NOW"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={pageContainer}>
      <header style={headerStyle}>
        <div style={headerTopRow}>
          <div style={avatarBox}>{user.name?.charAt(0)}<div style={onlineDot} /></div>
          <div style={{ flex: 1 }}>
            <h2 style={userName}>Hello, {user.name?.split(" ")[0]} ✨</h2>
            <p style={userMeta}>Class {studentClass} • Score: {overallScoreOutof20}/20</p>
          </div>
        </div>
        <div style={progressCard}>
          <div style={progressTextRow}>
            <span style={progressLabel}>OVERALL PERFORMANCE</span>
            <span style={progressPercentText}>{overallScoreOutof20}/20</span>
          </div>
          <div style={progressBarBg}>
            <div style={{ ...progressBarFill, width: `${(overallScoreOutof20 / 20) * 100}%` }}>
              <div style={shimmerEffect} />
            </div>
          </div>
          <div style={marksCounterRow}>
           <span>Accuracy: <b>{(overallScoreOutof20 / 20 * 100).toFixed(0)}%</b></span>

            <span>Completed: {completedTasksList.length}/{tasks.length}</span>
          </div>
        </div>
      </header>

      {focusedTask && (
        <div style={overlay}>
          <button style={closeOverlayBtn} onClick={() => setFocusedTask(null)}><FaTimes /> Exit Focus</button>
          <div style={overlayInner}>{renderTaskCard(focusedTask, true)}</div>
        </div>
      )}

      <div style={mainContent}>
        {loading ? (
          <div style={loaderWrapper}>
            <div style={loaderSpinner} />
            <p>FETCHING DATA...</p>
          </div>
        ) : (
          <>
            {pendingTasks.length > 0 && (
              <div style={sectionBlock}>
                <h4 style={sectionTitle}><FaClock /> LIVE ASSIGNMENTS</h4>
                {pendingTasks.map((task) => renderTaskCard(task))}
              </div>
            )}

            <div style={sectionBlock}>
              <h4 style={sectionTitle}><FaCheckCircle /> COMPLETED ARCHIVE</h4>
              {Object.keys(groupedCompleted).length === 0 && pendingTasks.length === 0 ? (
                <div style={emptyBox}><h3>All Caught Up! 🌟</h3></div>
              ) : (
                Object.keys(groupedCompleted).map((subject) => (
                  <div key={subject} style={subjectAccordion}>
                    <div style={accordionHeader} onClick={() => setExpandedSubject(expandedSubject === subject ? null : subject)}>
                      <span style={{ fontWeight: "700", fontSize: "14px" }}>{subject.toUpperCase()} ({groupedCompleted[subject].length})</span>
                      {expandedSubject === subject ? <FaChevronUp /> : <FaChevronDown />}
                    </div>
                    {expandedSubject === subject && <div style={accordionBody}>{groupedCompleted[subject].map((task) => renderTaskCard(task))}</div>}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// STYLES
const pageContainer = { background: "#0f172a", minHeight: "100vh", width: "100vw", color: "#fff", paddingBottom: "40px", overflowX: "hidden", fontFamily: "'Segoe UI', sans-serif" };
const headerStyle = { padding: "40px 25px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.05)" };
const headerTopRow = { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' };
const avatarBox = { width: "55px", height: "55px", background: "linear-gradient(45deg, #6366f1, #a855f7)", borderRadius: "16px", display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: "22px", fontWeight: "bold", position: 'relative' };
const onlineDot = { width: "12px", height: "12px", background: "#00ff88", borderRadius: "50%", border: "2px solid #0f172a", position: 'absolute', bottom: -2, right: -2 };
const userName = { margin: 0, fontSize: "22px", fontWeight: "800" };
const userMeta = { margin: 0, fontSize: "13px", opacity: 0.5 };
const progressCard = { background: "rgba(0,0,0,0.2)", padding: "20px", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.08)" };
const progressTextRow = { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' };
const progressLabel = { fontSize: '10px', fontWeight: '800', color: '#818cf8', letterSpacing: '1px' };
const progressPercentText = { fontSize: '18px', fontWeight: '900' };
const progressBarBg = { height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden', position:'relative' };
const progressBarFill = { height: '100%', background: 'linear-gradient(90deg, #6366f1, #a855f7)', borderRadius: '10px', transition: 'width 1s ease' };
const marksCounterRow = { display: 'flex', justifyContent: 'space-between', fontSize: '11px', opacity: 0.5, marginTop: '10px' };
const mainContent = { padding: "25px" };
const sectionBlock = { marginBottom: "35px" };
const sectionTitle = { fontSize: "11px", fontWeight: "900", color: "#818cf8", letterSpacing: "1.5px", marginBottom: "20px", display: 'flex', alignItems: 'center', gap: '8px' };
const taskCard = (done) => ({ background: done ? "rgba(30, 41, 59, 0.4)" : "#1e293b", borderRadius: "20px", padding: "25px", marginBottom: "20px", border: done ? "1px solid rgba(0,255,136,0.1)" : "1px solid rgba(255,255,255,0.05)", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" });
const cardHeader = { display: "flex", justifyContent: "space-between", marginBottom: "15px", alignItems:'center' };
const subjectPill = { background: "#334155", padding: "5px 12px", borderRadius: "8px", fontSize: "10px", fontWeight: "800", color:'#818cf8' };
const statusBadge = (done) => ({ fontSize: "10px", fontWeight: "900", color: done ? "#00ff88" : "#fbbf24" });
const taskTitleText = { margin: "0 0 20px 0", fontSize: "18px", fontWeight: "700" };
const infoGrid = { display: "flex", gap: "25px", flexWrap: 'wrap' };
const infoItem = { display: "flex", flexDirection: "column" };
const infoLabel = { fontSize: "9px", color: "rgba(255,255,255,0.3)", fontWeight: "bold", marginBottom: "4px" };
const infoValue = { fontSize: "12px", fontWeight: '500' };
const glassDivider = { height: "1px", background: "rgba(255,255,255,0.05)", margin: "20px 0" };
const actionColumn = { display: "flex", flexDirection: "column", gap: "12px" };
const btnSmall = { background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', fontSize: '11px', padding: '8px', borderRadius: '8px', cursor: 'pointer' };
const btnViewTask = { background: "rgba(99, 102, 241, 0.1)", color: "#818cf8", padding: "14px", border: "1px solid rgba(99, 102, 241, 0.2)", borderRadius: "12px", cursor: "pointer", fontWeight: '600', fontSize:'13px' };
const uploadZone = { display: "flex", flexDirection: "column", gap: "10px" };
const uploadLabelStyle = { cursor: "pointer" };
const customUploadBtn = { background: "rgba(0,0,0,0.2)", border: "2px dashed rgba(255,255,255,0.1)", padding: "15px", borderRadius: "12px", textAlign: "center", fontSize: "13px", color: "#818cf8" };
const btnSubmit = { background: "linear-gradient(45deg, #6366f1, #a855f7)", color: "#fff", padding: "16px", border: "none", borderRadius: "12px", fontWeight: "800", cursor: "pointer" };
const btnDisabled = { ...btnSubmit, opacity: 0.5 };
const submissionArea = { display: 'flex', flexDirection: 'column', gap: '12px' };
const btnSuccess = { background: "#059669", color: "#fff", padding: "14px", borderRadius: "12px", border: "none", fontWeight: "700", fontSize:'13px' };
const ratingCard = { background: "rgba(0,0,0,0.3)", padding: "15px", borderRadius: "12px", textAlign: "center" };
const ratingLabel = { fontSize: "10px", fontWeight:'700', opacity: 0.5, marginBottom: '5px' };
const starRow = { fontSize: "22px" };
const waitBadge = { textAlign: 'center', fontSize: '12px', opacity: 0.4 };
const btnDeleteLink = { background: "none", border: "none", color: "#ef4444", fontSize: "11px", fontWeight: "700", textDecoration: "underline", cursor: 'pointer', textAlign:'center', marginTop:'5px' };
const subjectAccordion = { background: "rgba(255,255,255,0.02)", borderRadius: "15px", marginBottom: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.05)" };
const accordionHeader = { padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" };
const accordionBody = { padding: "0 15px 15px" };
const overlay = { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.98)', zIndex: 1000, padding: '20px' };
const overlayInner = { maxWidth: '500px', margin: '60px auto' };
const fullViewCard = { background: "#1e293b", padding: "30px", borderRadius: "24px", border: "2px solid #6366f1" };
const closeOverlayBtn = { background: '#ef4444', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', marginBottom: '20px' };
const shimmerEffect = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)", animation: "shimmer 2s infinite" };
const loaderWrapper = { textAlign: "center", padding: "100px 0" };
const loaderSpinner = { width: "30px", height: "30px", border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#6366f1", borderRadius: "50%", margin: "0 auto 10px", animation: "spin 1s linear infinite" };
const emptyBox = { textAlign: 'center', padding: '100px 0', opacity: 0.3 };

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = `
    @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  `;
  document.head.appendChild(styleSheet);
}
