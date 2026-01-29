import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { 
  FaClock, FaCheckCircle, FaChevronDown, FaChevronUp, FaTimes, 
  FaTrash, FaCloudUploadAlt, FaBookOpen, FaAward, FaCalendarAlt, 
  FaExclamationTriangle, FaUserGraduate, FaLightbulb, FaRocket
} from "react-icons/fa";

/**
 * API CONFIGURATION
 */
const API_URL = "https://student-management-system-4-hose.onrender.com";
const ASSIGNMENTS_API = `${API_URL}/api/assignments/class`;
const SUBMIT_API = `${API_URL}/api/assignments/student/upload`;
const DELETE_API = `${API_URL}/api/assignments`;

export default function StudentPage() {
  // STATE MANAGEMENT
  const [tasks, setTasks] = useState([]);
  const [files, setFiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState(null);
  const [focusedTask, setFocusedTask] = useState(null);
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState("pending");

  // USER DATA
  const user = JSON.parse(localStorage.getItem("user")) || {};
  const studentClass = user.class || "";
  const studentId = user.id || "";

  /**
   * EFFECT: LIVE CLOCK
   */
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  /**
   * DATA FETCHING
   */
  const fetchTasks = useCallback(async () => {
    if (!studentClass || !studentId) return;
    try {
      setLoading(true);
      const res = await axios.get(`${ASSIGNMENTS_API}/${studentClass}/${studentId}`);
      if (res.data.success) {
        setTasks(res.data.assignments);
      }
    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  }, [studentClass, studentId]);

  // FIX: Added fetchTasks to dependency array
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  /**
   * PERFORMANCE LOGIC
   */
  const calculateMarks = (task) => {
    if (!task.rating) return 0;
    const baseMarks = task.rating * 4;
    const deadline = new Date(task.deadline);
    const submitted = new Date(task.student_uploaded_at);
    const diffMs = deadline - submitted;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let modifier = 0;
    if (diffDays >= 2) modifier = 2;
    else if (diffDays >= 0) modifier = 0.5;
    else modifier = Math.max(diffDays * 0.5, -5);

    return Math.max(0, Math.min(20, baseMarks + modifier));
  };

  const pendingTasks = tasks.filter((t) => t.status !== "SUBMITTED");
  const completedTasksList = tasks.filter((t) => t.status === "SUBMITTED");
  const ratedTasks = completedTasksList.filter((t) => t.rating);
  const totalPoints = ratedTasks.reduce((sum, t) => sum + calculateMarks(t), 0);
  const overallScore = ratedTasks.length > 0 ? (totalPoints / ratedTasks.length).toFixed(1) : 0;

  const groupedCompleted = completedTasksList.reduce((acc, task) => {
    if (!acc[task.subject]) acc[task.subject] = [];
    acc[task.subject].push(task);
    return acc;
  }, {});

  const handleSubmit = async (task) => {
    const file = files[task.id];
    if (!file) return alert("Please select a file first.");

    const deadline = new Date(task.deadline);
    const windowClosing = new Date(deadline.getTime() + 3 * 24 * 60 * 60 * 1000);

    if (currentTime > windowClosing) {
      return alert("Submission Window Closed. You are more than 3 days late.");
    }

    setUploadingId(task.id);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("uploader_id", studentId);
    formData.append("uploader_role", "student");
    formData.append("student_id", studentId);
    formData.append("class", studentClass);
    formData.append("task_title", task.task_title);
    formData.append("subject", task.subject);
    if (task.deadline) formData.append("deadline", task.deadline);

    try {
      const res = await axios.post(SUBMIT_API, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data.success) {
        setFiles((prev) => {
          const updated = { ...prev };
          delete updated[task.id];
          return updated;
        });
        fetchTasks();
        setFocusedTask(null);
      }
    } catch (err) {
      alert("Upload failed. Please check file size or network.");
    } finally {
      setUploadingId(null);
    }
  };

  const handleDelete = async (subId) => {
    if (!window.confirm("This will permanently remove your submission. Continue?")) return;
    try {
      await axios.delete(`${DELETE_API}/${subId}`);
      fetchTasks();
    } catch {
      alert("Unable to delete at this moment.");
    }
  };

  const formatDateTime = (str) =>
    str ? new Date(str).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "-";

  const renderTaskCard = (task, isFull = false) => {
    const isSubmitted = task.status === "SUBMITTED";
    const deadline = new Date(task.deadline);
    const diffMs = deadline - currentTime;
    const isOverdue = diffMs < 0;
    const abs = Math.abs(diffMs);
    const d = Math.floor(abs / 86400000);
    const h = Math.floor((abs % 86400000) / 3600000);
    const m = Math.floor((abs % 3600000) / 60000);
    const s = Math.floor((abs % 60000) / 1000);
    const isExpired = isOverdue && d >= 3;

    return (
      <div key={task.id} style={isFull ? styles.fullView : styles.taskCard(isSubmitted, isOverdue && !isSubmitted)}>
        <div style={styles.cardHeader}>
          <div style={styles.subjectPill}>{task.subject}</div>
          <div style={styles.statusBadge(isSubmitted, isExpired)}>
            {isSubmitted ? <FaCheckCircle /> : isExpired ? <FaExclamationTriangle /> : <FaClock />}
            {isSubmitted ? "COMPLETED" : isExpired ? "LOCKOUT" : "PENDING"}
          </div>
        </div>

        <h3 style={styles.taskTitle}>{task.task_title}</h3>

        <div style={styles.infoGrid}>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>DUE DATE</span>
            <span style={styles.infoValue}>{formatDateTime(task.deadline)}</span>
          </div>
          {!isSubmitted ? (
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>{isOverdue ? "OVERDUE BY" : "REMAINING"}</span>
              <span style={{ ...styles.infoValue, color: isOverdue ? "#ff4757" : "#2ed573", letterSpacing: '0.5px' }}>
                {d}d {h}h {m}m {s}s
              </span>
            </div>
          ) : (
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>SUBMITTED</span>
              <span style={styles.infoValue}>{formatDateTime(task.student_uploaded_at)}</span>
            </div>
          )}
        </div>

        <div style={styles.divider} />

        <div style={styles.actionRow}>
          {task.task_file && (
            <button style={styles.btnSecondary} onClick={() => window.open(task.task_file, "_blank")}>
              <FaBookOpen /> View Question
            </button>
          )}

          {isSubmitted ? (
            <div style={styles.submissionBox}>
              <button style={styles.btnSuccess} onClick={() => window.open(task.student_file, "_blank")}>
                My Submission
              </button>
              {task.rating ? (
                <div style={styles.scoreContainer}>
                  <div style={styles.scoreText}>
                    <FaAward style={{ color: '#ffa502' }} /> Score: {calculateMarks(task).toFixed(1)}/20
                  </div>
                  <div style={styles.stars}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <span key={i} style={{ color: i <= task.rating ? "#ffa502" : "#2f3542" }}>★</span>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={styles.pendingReview}>Awaiting Teacher's Review</div>
              )}
              {!task.rating && (
                <button style={styles.btnDelete} onClick={() => handleDelete(task.student_submission_id)}>
                  <FaTrash /> Remove Submission
                </button>
              )}
            </div>
          ) : (
            <div style={styles.uploadZone}>
              {isExpired ? (
                <div style={styles.lockoutMsg}>Submission blocked. Maximum delay (3 days) exceeded.</div>
              ) : (
                <>
                  <label style={styles.fileLabel}>
                    <input type="file" style={{ display: 'none' }} onChange={(e) => setFiles({ ...files, [task.id]: e.target.files[0] })} />
                    <div style={styles.fileDummy}>
                      {files[task.id] ? `📎 ${files[task.id].name.slice(0, 15)}...` : "Choose Solution File"}
                    </div>
                  </label>
                  <button 
                    style={uploadingId === task.id ? styles.btnDisabled : styles.btnSubmit(isOverdue)}
                    disabled={uploadingId === task.id}
                    onClick={() => handleSubmit(task)}
                  >
                    {uploadingId === task.id ? "Uploading..." : isOverdue ? "Submit Late" : "Submit Assignment"}
                  </button>
                </>
              )}
            </div>
          )}

          {!isFull && !isSubmitted && !isExpired && (
            <button style={styles.btnFocus} onClick={() => setFocusedTask(task)}>Full Screen View</button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.userContainer}>
          <div style={styles.avatar}>
            {user.name?.charAt(0)}
            <div style={styles.onlineSignal} />
          </div>
          <div>
            <h2 style={styles.welcomeText}>Hi, {user.name?.split(" ")[0]}! <FaRocket style={{ fontSize: '16px', color: '#70a1ff' }} /></h2>
            <p style={styles.subText}>Class {studentClass} Dashboard • 2024 Session</p>
          </div>
        </div>

        <div style={styles.performanceCard}>
          <div style={styles.perfTop}>
            <span style={styles.perfLabel}>ACADEMIC PERFORMANCE</span>
            <span style={styles.perfValue}>{overallScore}/20</span>
          </div>
          <div style={styles.barBg}>
            <div style={{ ...styles.barFill, width: `${(overallScore / 20) * 100}%` }}>
              <div style={styles.barShimmer} />
            </div>
          </div>
          <div style={styles.perfStats}>
            <span>Accuracy: <b>{(overallScore / 20 * 100).toFixed(0)}%</b></span>
            <span>Progress: {completedTasksList.length}/{tasks.length}</span>
          </div>
        </div>
      </header>

      {focusedTask && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <button style={styles.btnCloseModal} onClick={() => setFocusedTask(null)}>
              <FaTimes /> Close Focus Mode
            </button>
            {renderTaskCard(focusedTask, true)}
          </div>
        </div>
      )}

      <main style={styles.main}>
        {loading ? (
          <div style={styles.loaderContainer}>
            <div style={styles.spinner} />
            <p style={{ marginTop: '15px', opacity: 0.6, fontSize: '12px' }}>SYNCING CLASSROOM...</p>
          </div>
        ) : (
          <>
            <div style={styles.tabs}>
              <button style={activeTab === 'pending' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('pending')}>
                Assignments ({pendingTasks.length})
              </button>
              <button style={activeTab === 'completed' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('completed')}>
                Archive ({completedTasksList.length})
              </button>
            </div>

            {activeTab === 'pending' ? (
              <section style={styles.section}>
                {pendingTasks.length > 0 ? pendingTasks.map(task => renderTaskCard(task)) : (
                  <div style={styles.emptyState}>
                    <FaLightbulb style={{ fontSize: '40px', marginBottom: '15px' }} />
                    <p>No pending tasks. You're all caught up!</p>
                  </div>
                )}
              </section>
            ) : (
              <section style={styles.section}>
                {Object.keys(groupedCompleted).length > 0 ? Object.keys(groupedCompleted).map(subject => (
                  <div key={subject} style={styles.accordion}>
                    <div style={styles.accordionHeader} onClick={() => setExpandedSubject(expandedSubject === subject ? null : subject)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FaCalendarAlt style={{ color: '#70a1ff' }} />
                        <span>{subject}</span>
                        <span style={styles.countBadge}>{groupedCompleted[subject].length}</span>
                      </div>
                      {expandedSubject === subject ? <FaChevronUp /> : <FaChevronDown />}
                    </div>
                    {expandedSubject === subject && (
                      <div style={styles.accordionContent}>
                        {groupedCompleted[subject].map(task => renderTaskCard(task))}
                      </div>
                    )}
                  </div>
                )) : <div style={styles.emptyState}>No completed tasks found.</div>}
              </section>
            )}
          </>
        )}
      </main>

      <footer style={styles.footer}>
         System v4.2 • Secured Encryption • Local Time: {currentTime.toLocaleTimeString()}
      </footer>
    </div>
  );
}

const styles = {
  page: { background: "#0a0b10", minHeight: "100vh", width: "100vw", color: "#e1e1e1", fontFamily: "'Inter', sans-serif", paddingBottom: "50px" },
  header: { padding: "30px 20px", background: "linear-gradient(to bottom, #111420, #0a0b10)", borderBottom: "1px solid rgba(255,255,255,0.05)" },
  userContainer: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' },
  avatar: { width: "60px", height: "60px", background: "linear-gradient(135deg, #6c5ce7, #a29bfe)", borderRadius: "20px", display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: "24px", fontWeight: "bold", position: 'relative', boxShadow: "0 10px 20px rgba(108, 92, 231, 0.3)" },
  onlineSignal: { width: "14px", height: "14px", background: "#2ed573", borderRadius: "50%", border: "3px solid #0a0b10", position: 'absolute', bottom: -2, right: -2 },
  welcomeText: { margin: 0, fontSize: "22px", fontWeight: "700", color: "#fff" },
  subText: { margin: "2px 0 0 0", fontSize: "13px", color: "rgba(255,255,255,0.4)" },
  performanceCard: { background: "rgba(255,255,255,0.03)", padding: "20px", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: 'blur(10px)' },
  perfTop: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' },
  perfLabel: { fontSize: '11px', fontWeight: '800', color: '#70a1ff', letterSpacing: '1.5px' },
  perfValue: { fontSize: '20px', fontWeight: '800', color: '#fff' },
  barBg: { height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', position:'relative' },
  barFill: { height: '100%', background: 'linear-gradient(90deg, #6c5ce7, #a29bfe)', borderRadius: '10px', transition: 'width 1.5s ease-out' },
  barShimmer: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)" },
  perfStats: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '12px' },
  main: { padding: "20px" },
  tabs: { display: 'flex', gap: '10px', marginBottom: '25px', background: 'rgba(255,255,255,0.02)', padding: '5px', borderRadius: '14px' },
  tab: { flex: 1, padding: '12px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', borderRadius: '10px' },
  activeTab: { flex: 1, padding: '12px', background: '#2f3542', border: 'none', color: '#fff', fontSize: '13px', fontWeight: '600', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' },
  section: { marginBottom: "30px" },
  
  // FIXED SYNTAX FOR OBJECT METHODS
  taskCard(done, late) {
    return {
      background: done ? "rgba(255,255,255,0.02)" : "#161b22",
      borderRadius: "22px",
      padding: "24px",
      marginBottom: "18px",
      border: late ? "1px solid rgba(255, 71, 87, 0.3)" : "1px solid rgba(255,255,255,0.05)",
      transition: 'transform 0.2s ease'
    };
  },
  
  cardHeader: { display: "flex", justifyContent: "space-between", marginBottom: "18px", alignItems:'center' },
  subjectPill: { background: "rgba(112, 161, 255, 0.1)", color: "#70a1ff", padding: "6px 14px", borderRadius: "10px", fontSize: "11px", fontWeight: "800" },
  
  // FIXED SYNTAX FOR OBJECT METHODS
  statusBadge(done, expired) {
    return {
      display: 'flex', 
      alignItems: 'center', 
      gap: '5px', 
      fontSize: "11px", 
      fontWeight: "800", 
      color: done ? "#2ed573" : expired ? "#ff4757" : "#ffa502" 
    };
  },

  taskTitle: { margin: "0 0 18px 0", fontSize: "17px", fontWeight: "700", color: "#fff" },
  infoGrid: { display: "flex", gap: "30px", marginBottom: '20px' },
  infoItem: { display: "flex", flexDirection: "column", gap: '4px' },
  infoLabel: { fontSize: "9px", color: "rgba(255,255,255,0.3)", fontWeight: "800", letterSpacing: '1px' },
  infoValue: { fontSize: "13px", fontWeight: '600', color: '#f1f2f6' },
  divider: { height: "1px", background: "rgba(255,255,255,0.05)", margin: "0 0 20px 0" },
  actionRow: { display: "flex", flexDirection: "column", gap: "12px" },
  btnSecondary: { background: "rgba(255,255,255,0.05)", color: "#fff", padding: "12px", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", cursor: "pointer", fontSize: "13px", fontWeight: "600", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  
  btnSubmit(late) {
    return {
      background: late ? "#ff4757" : "linear-gradient(45deg, #6c5ce7, #a29bfe)",
      color: "#fff", padding: "14px", border: "none", borderRadius: "12px", fontWeight: "700", cursor: "pointer", fontSize: '14px'
    };
  },

  btnDisabled: { background: "#2f3542", color: "rgba(255,255,255,0.2)", padding: "14px", borderRadius: "12px", border: "none", cursor: 'not-allowed' },
  btnSuccess: { background: "#2ed573", color: "#fff", padding: "14px", borderRadius: "12px", border: "none", fontWeight: "700", cursor: 'pointer' },
  btnDelete: { background: "transparent", border: "1px solid rgba(255, 71, 87, 0.3)", color: "#ff4757", padding: "10px", borderRadius: "10px", fontSize: "11px", cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' },
  btnFocus: { background: 'none', border: 'none', color: '#70a1ff', fontSize: '11px', textDecoration: 'underline', cursor: 'pointer', marginTop: '5px' },
  uploadZone: { display: 'flex', flexDirection: 'column', gap: '10px' },
  fileLabel: { cursor: 'pointer' },
  fileDummy: { background: "rgba(0,0,0,0.3)", border: "2px dashed rgba(255,255,255,0.1)", padding: "15px", borderRadius: "12px", textAlign: "center", color: "#70a1ff", fontSize: "13px" },
  lockoutMsg: { padding: '15px', background: 'rgba(255, 71, 87, 0.1)', color: '#ff4757', borderRadius: '12px', fontSize: '12px', textAlign: 'center', border: '1px solid rgba(255, 71, 87, 0.2)' },
  submissionBox: { display: 'flex', flexDirection: 'column', gap: '12px' },
  scoreContainer: { background: "rgba(255, 165, 2, 0.05)", padding: "15px", borderRadius: "16px", border: "1px solid rgba(255, 165, 2, 0.2)", textAlign: 'center' },
  scoreText: { fontSize: "14px", fontWeight: '700', color: '#ffa502', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '5px' },
  stars: { fontSize: "18px" },
  pendingReview: { textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' },
  accordion: { background: "rgba(255,255,255,0.01)", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.05)", marginBottom: "15px", overflow: 'hidden' },
  accordionHeader: { padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" },
  countBadge: { background: "#2f3542", color: "#fff", padding: "2px 8px", borderRadius: "6px", fontSize: "10px", marginLeft: "10px" },
  accordionContent: { padding: "0 15px 15px" },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(5, 6, 10, 0.95)', zIndex: 9999, padding: '20px', display: 'flex', flexDirection: 'column' },
  modalContent: { maxWidth: '500px', margin: 'auto', width: '100%' },
  btnCloseModal: { background: '#ff4757', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '12px', cursor: 'pointer', marginBottom: '20px', fontWeight: '700' },
  fullView: { background: "#161b22", padding: "30px", borderRadius: "28px", border: "2px solid #6c5ce7", boxShadow: "0 0 40px rgba(108, 92, 231, 0.2)" },
  loaderContainer: { textAlign: 'center', padding: '100px 0' },
  spinner: { width: "35px", height: "35px", border: "3px solid rgba(255,255,255,0.05)", borderTopColor: "#6c5ce7", borderRadius: "50%", margin: "0 auto", animation: "spin 0.8s linear infinite" },
  emptyState: { textAlign: 'center', padding: '60px 0', opacity: 0.4 },
  footer: { textAlign: 'center', fontSize: '10px', opacity: 0.3, letterSpacing: '1px', marginTop: '20px' }
};

// GLOBAL ANIMATIONS
if (typeof document !== 'undefined') {
  const sheet = document.createElement("style");
  sheet.innerText = `
    @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
    @keyframes spin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(sheet);
}