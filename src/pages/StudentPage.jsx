import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "https://student-management-system-4-hose.onrender.com";
const ASSIGNMENTS_API = `${API_URL}/api/assignments/class`;
const SUBMIT_API = `${API_URL}/api/assignments/student/upload`;
const DELETE_API = `${API_URL}/api/assignments`;

export default function StudentPage() {
  const [tasks, setTasks] = useState([]);
  const [files, setFiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState(null);
  const [focusedTask, setFocusedTask] = useState(null); // Full Screen View State

  const user = JSON.parse(localStorage.getItem("user")) || {};
  const studentClass = user.class || "";
  const studentId = user.id || "";

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

  useEffect(() => {
    fetchTasks();
  }, [studentClass, studentId]);

  const completedTasks = tasks.filter((t) => t.status === "SUBMITTED").length;
  const progressPercent = tasks.length === 0 ? 0 : Math.round((completedTasks / tasks.length) * 100);

  const handleSubmit = async (task) => {
    const file = files[task.id];
    if (!file) return alert("Select a file first!");

    setUploadingId(task.id);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("uploader_id", studentId);
    fd.append("uploader_role", "student");
    fd.append("student_id", studentId);
    fd.append("class", studentClass);
    fd.append("task_title", task.task_title);
    fd.append("subject", task.subject);
    fd.append("uploaded_at", new Date().toISOString());

    try {
      const res = await axios.post(SUBMIT_API, fd);
      if (res.data.success) {
        alert("Assignment Submitted! 🚀");
        fetchTasks();
        setFocusedTask(null);
      }
    } catch (err) {
      alert("Submission failed.");
    } finally {
      setUploadingId(null);
    }
  };

  const handleDeleteSubmission = async (submissionId) => {
    if (!window.confirm("Delete your submission?")) return;
    try {
      await axios.delete(`${DELETE_API}/${submissionId}`);
      fetchTasks();
    } catch {
      alert("Delete failed");
    }
  };

  const formatDateTime = (dateStr) =>
    dateStr ? new Date(dateStr).toLocaleString("en-IN", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : "-";

  const renderTask = (task) => {
    const isSubmitted = task.status === "SUBMITTED";
    return (
      <div key={task.id} style={taskCard(isSubmitted)}>
        <div style={cardHeader}>
          <div style={subjectPill}>{task.subject}</div>
          <div style={statusBadge(isSubmitted)}>
            {isSubmitted ? "COMPLETED" : "PENDING"}
          </div>
        </div>

        <h3 style={taskTitleText}>{task.task_title}</h3>
        
        <div style={infoGrid}>
            <div style={infoItem}>
                <span style={infoLabel}>DEADLINE</span>
                <span style={infoValue}>{formatDateTime(task.deadline)}</span>
            </div>
            {isSubmitted && (
                <div style={infoItem}>
                    <span style={infoLabel}>SUBMITTED ON</span>
                    <span style={infoValue}>{formatDateTime(task.uploaded_at)}</span>
                </div>
            )}
        </div>

        <div style={glassDivider} />

        <div style={actionColumn}>
            {!focusedTask && (
                <button style={btnSmall} onClick={() => setFocusedTask(task)}>⛶ Full Focus Mode</button>
            )}
            
            {task.task_file && (
                <button style={btnViewTask} onClick={() => window.open(task.task_file, "_blank")}>
                   📖 View Question Paper
                </button>
            )}

            {isSubmitted ? (
                <div style={submissionArea}>
                    <button style={btnSuccess} onClick={() => window.open(task.student_file, "_blank")}>
                        ✅ My Submission
                    </button>
                    {task.rating ? (
                        <div style={ratingCard}>
                            <p style={ratingLabel}>GRADE</p>
                            <div style={starRow}>
                                {[1,2,3,4,5].map(i => (
                                    <span key={i} style={{color: i<=task.rating ? '#FFD700' : '#4b4b6b'}}>★</span>
                                ))}
                            </div>
                        </div>
                    ) : <div style={waitBadge}>🕒 Processing Grade...</div>}
                    <button style={btnDeleteLink} onClick={() => handleDeleteSubmission(task.student_submission_id)}>
                        Remove Submission
                    </button>
                </div>
            ) : (
              <div style={uploadZone}>
                 <label style={uploadLabel}>
                    <input type="file" style={{display: 'none'}} onChange={(e) => setFiles({ ...files, [task.id]: e.target.files[0] })} />
                    <div style={customUploadBtn}>
                        {files[task.id] ? `📎 ${files[task.id].name.substring(0,25)}` : "Select Assignment File"}
                    </div>
                 </label>
                 <button 
                    style={uploadingId === task.id ? btnDisabled : btnSubmit} 
                    disabled={uploadingId === task.id}
                    onClick={() => handleSubmit(task)}
                 >
                    {uploadingId === task.id ? "UPLOADING..." : "SUBMIT NOW"}
                 </button>
              </div>
            )}
        </div>
      </div>
    );
  };

  return (
    <div style={pageContainer}>
      {/* 1. HEADER SECTION */}
      <header style={headerStyle}>
        <div style={headerTopRow}>
            <div style={avatarBox}>
                {user.name?.charAt(0) || "S"}
                <div style={onlineDot} />
            </div>
            <div style={{ flex: 1 }}>
                <h2 style={userName}>Namaste, {user.name?.split(' ')[0] || "Student"} ✨</h2>
                <p style={userMeta}>Class {studentClass} • Academic Year 2024</p>
            </div>
        </div>

        {/* 2. PROGRESS RECTANGLE (BELOW NAME) */}
        <div style={progressCard}>
            <div style={progressTextRow}>
                <span style={progressLabel}>OVERALL COMPLETION</span>
                <span style={progressPercentText}>{progressPercent}%</span>
            </div>
            <div style={progressBarBg}>
                <div style={{...progressBarFill, width: `${progressPercent}%`}}>
                    <div style={shimmerEffect} />
                </div>
            </div>
            <p style={progressStats}>{completedTasks} of {tasks.length} assignments finished</p>
        </div>
      </header>

      {/* 3. TASK FEED */}
      <div style={mainContent}>
        <div style={sectionHeader}>
            <span style={sectionTitle}>ASSIGNMENT FEED</span>
            {focusedTask && <button style={closeBtn} onClick={() => setFocusedTask(null)}>✕ Exit Focus</button>}
        </div>

        {loading ? (
            <div style={loaderWrapper}><div style={loaderSpinner} /><p>FETCHING DATA...</p></div>
        ) : focusedTask ? (
            <div style={fullScreenWrapper}>
                {renderTask(focusedTask)}
            </div>
        ) : tasks.length === 0 ? (
          <div style={emptyBox}><h3>All Caught Up! 🌟</h3><p>No pending assignments.</p></div>
        ) : (
          tasks.map(renderTask)
        )}
      </div>
    </div>
  );
}

/* ================= PREMIER THEME: INDIGO & GLASS ================= */

const pageContainer = {
  background: "linear-gradient(135deg, #1e1e3f 0%, #2d2d5a 100%)",
  minHeight: "100vh",
  fontFamily: "'Segoe UI', sans-serif",
  color: "#fff",
  paddingBottom: "40px"
};

const headerStyle = {
  padding: "40px 20px 30px",
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(20px)",
  borderBottom: "1px solid rgba(255,255,255,0.1)"
};

const headerTopRow = { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' };

const avatarBox = {
    width: "55px", height: "55px",
    background: "linear-gradient(45deg, #6a11cb 0%, #2575fc 100%)",
    borderRadius: "16px",
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: "22px", fontWeight: "bold", position: 'relative'
};

const onlineDot = {
    width: "12px", height: "12px", background: "#00ff88",
    borderRadius: "50%", border: "2px solid #1e1e3f",
    position: 'absolute', bottom: -2, right: -2
};

const userName = { margin: 0, fontSize: "20px", fontWeight: "700" };
const userMeta = { margin: "2px 0 0", fontSize: "13px", opacity: 0.6 };

/* PROGRESS RECTANGLE CSS */
const progressCard = {
    background: "rgba(0,0,0,0.2)",
    padding: "20px",
    borderRadius: "18px",
    border: "1px solid rgba(255,255,255,0.08)"
};

const progressTextRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' };
const progressLabel = { fontSize: '11px', fontWeight: '800', color: '#a5a5ff', letterSpacing: '1px' };
const progressPercentText = { fontSize: '18px', fontWeight: '800' };

const progressBarBg = { height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' };
const progressBarFill = { 
    height: '100%', background: 'linear-gradient(90deg, #6a11cb, #2575fc)', 
    borderRadius: '10px', position: 'relative', transition: 'width 1s ease' 
};

const progressStats = { fontSize: '11px', opacity: 0.5, marginTop: '8px', textAlign: 'right' };

const mainContent = { padding: "0 15px" };
const sectionHeader = { padding: "20px 5px", display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const sectionTitle = { fontSize: "12px", fontWeight: "800", color: "#a5a5ff", letterSpacing: "1px" };
const closeBtn = { background: 'rgba(255,0,0,0.2)', border: 'none', color: '#ff7a7a', padding: '5px 12px', borderRadius: '8px', cursor: 'pointer' };

const fullScreenWrapper = { animation: 'fadeIn 0.5s ease' };

const taskCard = (done) => ({
  background: done ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)",
  borderRadius: "20px",
  padding: "25px",
  marginBottom: "15px",
  border: done ? "1px solid rgba(0,255,136,0.2)" : "1px solid rgba(255,255,255,0.1)",
  boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
});

const cardHeader = { display: "flex", justifyContent: "space-between", marginBottom: "15px" };
const subjectPill = { background: "#4e4e91", padding: "5px 12px", borderRadius: "8px", fontSize: "11px", fontWeight: "bold" };
const statusBadge = (done) => ({ fontSize: "11px", fontWeight: "900", color: done ? "#00ff88" : "#ffcc00" });

const taskTitleText = { margin: "0 0 20px 0", fontSize: "18px", fontWeight: "600" };
const infoGrid = { display: "flex", gap: "25px" };
const infoItem = { display: "flex", flexDirection: "column" };
const infoLabel = { fontSize: "9px", color: "rgba(255,255,255,0.4)", fontWeight: "bold", marginBottom: "4px" };
const infoValue = { fontSize: "13px" };
const glassDivider = { height: "1px", background: "rgba(255,255,255,0.05)", margin: "20px 0" };

const actionColumn = { display: "flex", flexDirection: "column", gap: "10px" };
const btnSmall = { background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: '#aaa', fontSize: '11px', padding: '5px', borderRadius: '5px', cursor: 'pointer' };
const btnViewTask = { background: "rgba(255,255,255,0.1)", color: "#fff", padding: "14px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "14px", cursor: "pointer", fontWeight: '600' };

const uploadZone = { display: "flex", flexDirection: "column", gap: "10px" };
const customUploadBtn = { background: "rgba(0,0,0,0.2)", border: "2px dashed rgba(255,255,255,0.2)", padding: "15px", borderRadius: "14px", textAlign: "center", fontSize: "14px", color: "#a5a5ff" };
const btnSubmit = { background: "linear-gradient(45deg, #6a11cb, #2575fc)", color: "#fff", padding: "16px", border: "none", borderRadius: "14px", fontWeight: "800", cursor: "pointer" };
const btnDisabled = { ...btnSubmit, opacity: 0.5 };

const submissionArea = { display: 'flex', flexDirection: 'column', gap: '10px' };
const btnSuccess = { background: "#00ff88", color: "#000", padding: "14px", borderRadius: "14px", border: "none", fontWeight: "800" };
const ratingCard = { background: "rgba(0,0,0,0.2)", padding: "15px", borderRadius: "15px", textAlign: "center" };
const ratingLabel = { fontSize: "9px", opacity: 0.5, marginBottom: '5px' };
const starRow = { fontSize: "20px" };
const waitBadge = { textAlign: 'center', fontSize: '12px', opacity: 0.5 };
const btnDeleteLink = { background: "none", border: "none", color: "#ff4757", fontSize: "11px", fontWeight: "700", textDecoration: "underline", cursor: 'pointer' };

const loaderWrapper = { textAlign: "center", padding: "100px 0" };
const loaderSpinner = { width: "30px", height: "30px", border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#6a11cb", borderRadius: "50%", margin: "0 auto 10px", animation: "spin 1s linear infinite" };
const emptyBox = { textAlign: 'center', padding: '100px 0', opacity: 0.5 };
const uploadLabel = { cursor: "pointer" };
const shimmerEffect = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)", animation: "shimmer 2s infinite" };

// Animations
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
@keyframes spin { 100% { transform: rotate(360deg); } }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
`;
document.head.appendChild(styleSheet);