import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { 
  FaClock, FaCheckCircle, FaChevronDown, FaChevronUp, FaTimes, 
  FaTrash, FaBookOpen, FaAward, FaCalendarAlt, 
  FaExclamationTriangle,FaLightbulb, FaRocket
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
              <span style={{ ...styles.infoValue, color: isOverdue ? "#e84118" : "#20bf6b" }}>
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
                View My Solution
              </button>
              {task.rating ? (
                <div style={styles.scoreContainer}>
                  <div style={styles.scoreText}>
                    <FaAward style={{ color: '#f39c12' }} /> Score: {calculateMarks(task).toFixed(1)}/20
                  </div>
                  <div style={styles.stars}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <span key={i} style={{ color: i <= task.rating ? "#f1c40f" : "#dcdde1" }}>★</span>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={styles.pendingReview}>Reviewing by Teacher...</div>
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
                <div style={styles.lockoutMsg}>Lockout: Maximum delay exceeded.</div>
              ) : (
                <>
                  <label style={styles.fileLabel}>
                    <input type="file" style={{ display: 'none' }} onChange={(e) => setFiles({ ...files, [task.id]: e.target.files[0] })} />
                    <div style={styles.fileDummy}>
                      {files[task.id] ? `📎 ${files[task.id].name.slice(0, 20)}` : "Select Submission File"}
                    </div>
                  </label>
                  <button 
                    style={uploadingId === task.id ? styles.btnDisabled : styles.btnSubmit(isOverdue)}
                    disabled={uploadingId === task.id}
                    onClick={() => handleSubmit(task)}
                  >
                    {uploadingId === task.id ? "Uploading..." : isOverdue ? "Submit Late" : "Turn In Assignment"}
                  </button>
                </>
              )}
            </div>
          )}

          {!isFull && !isSubmitted && !isExpired && (
            <button style={styles.btnFocus} onClick={() => setFocusedTask(task)}>Expand View</button>
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
            <h2 style={styles.welcomeText}>Hi, {user.name?.split(" ")[0]}! <FaRocket style={{ fontSize: '16px', color: '#4834d4' }} /></h2>
            <p style={styles.subText}>Class {studentClass} Dashboard • {new Date().getFullYear()} Session</p>
          </div>
        </div>

        <div style={styles.performanceCard}>
          <div style={styles.perfTop}>
            <span style={styles.perfLabel}>ACADEMIC PROGRESS</span>
            <span style={styles.perfValue}>{overallScore}/20</span>
          </div>
          <div style={styles.barBg}>
            <div style={{ ...styles.barFill, width: `${(overallScore / 20) * 100}%` }}></div>
          </div>
          <div style={styles.perfStats}>
            <span>Accuracy: <b>{(overallScore / 20 * 100).toFixed(0)}%</b></span>
            <span>Completed: {completedTasksList.length}/{tasks.length}</span>
          </div>
        </div>
      </header>

      {focusedTask && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <button style={styles.btnCloseModal} onClick={() => setFocusedTask(null)}>
              <FaTimes /> Exit Focus Mode
            </button>
            {renderTaskCard(focusedTask, true)}
          </div>
        </div>
      )}

      <main style={styles.main}>
        {loading ? (
          <div style={styles.loaderContainer}>
            <div style={styles.spinner} />
            <p style={{ marginTop: '15px', color: '#a4b0be', fontSize: '13px' }}>Loading Classroom...</p>
          </div>
        ) : (
          <>
            <div style={styles.tabs}>
              <button style={activeTab === 'pending' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('pending')}>
                Active Assignments ({pendingTasks.length})
              </button>
              <button style={activeTab === 'completed' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('completed')}>
                Past Submissions ({completedTasksList.length})
              </button>
            </div>

            {activeTab === 'pending' ? (
              <section style={styles.section}>
                {pendingTasks.length > 0 ? pendingTasks.map(task => renderTaskCard(task)) : (
                  <div style={styles.emptyState}>
                    <FaLightbulb style={{ fontSize: '40px', color: '#dfe6e9', marginBottom: '15px' }} />
                    <p>Hooray! No pending assignments.</p>
                  </div>
                )}
              </section>
            ) : (
              <section style={styles.section}>
                {Object.keys(groupedCompleted).length > 0 ? Object.keys(groupedCompleted).map(subject => (
                  <div key={subject} style={styles.accordion}>
                    <div style={styles.accordionHeader} onClick={() => setExpandedSubject(expandedSubject === subject ? null : subject)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FaCalendarAlt style={{ color: '#686de0' }} />
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
                )) : <div style={styles.emptyState}>No submissions archived yet.</div>}
              </section>
            )}
          </>
        )}
      </main>

      <footer style={styles.footer}>
          SmartZone Dashboard v4.2 • Secure Student Portal • {currentTime.toLocaleTimeString()}
      </footer>
    </div>
  );
}

const styles = {
  page: { background: "#F8FAFC", minHeight: "100vh", width: "100vw", color: "#2d3436", fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif", paddingBottom: "50px" },
  header: { padding: "40px 20px", background: "#ffffff", borderBottom: "1px solid #edf2f7" },
  userContainer: { display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '30px' },
  avatar: { width: "65px", height: "65px", background: "linear-gradient(135deg, #686de0, #4834d4)", borderRadius: "22px", display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: "26px", fontWeight: "bold", color: "#fff", position: 'relative', boxShadow: "0 10px 25px rgba(104, 109, 224, 0.25)" },
  onlineSignal: { width: "16px", height: "16px", background: "#2ecc71", borderRadius: "50%", border: "3px solid #fff", position: 'absolute', bottom: -2, right: -2 },
  welcomeText: { margin: 0, fontSize: "24px", fontWeight: "800", color: "#1a1c2c" },
  subText: { margin: "4px 0 0 0", fontSize: "14px", color: "#7f8c8d" },
  performanceCard: { background: "#ffffff", padding: "24px", borderRadius: "24px", border: "1px solid #edf2f7", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" },
  perfTop: { display: 'flex', justifyContent: 'space-between', marginBottom: '14px', alignItems: 'center' },
  perfLabel: { fontSize: '12px', fontWeight: '800', color: '#686de0', letterSpacing: '1px' },
  perfValue: { fontSize: '22px', fontWeight: '800', color: '#2d3436' },
  barBg: { height: '12px', background: '#f1f2f6', borderRadius: '12px', overflow: 'hidden' },
  barFill: { height: '100%', background: 'linear-gradient(90deg, #686de0, #4834d4)', borderRadius: '12px', transition: 'width 1s ease-in-out' },
  perfStats: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#95a5a6', marginTop: '14px' },
  main: { padding: "25px 20px" },
  tabs: { display: 'flex', gap: '10px', marginBottom: '30px', background: '#e2e8f0', padding: '6px', borderRadius: '16px' },
  tab: { flex: 1, padding: '14px', background: 'transparent', border: 'none', color: '#64748b', fontSize: '14px', fontWeight: '600', cursor: 'pointer', borderRadius: '12px' },
  activeTab: { flex: 1, padding: '14px', background: '#ffffff', border: 'none', color: '#4834d4', fontSize: '14px', fontWeight: '700', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
  section: { marginBottom: "30px" },
  
  taskCard(done, late) {
    return {
      background: "#ffffff",
      borderRadius: "24px",
      padding: "26px",
      marginBottom: "20px",
      border: late ? "1px solid #ff7675" : "1px solid #edf2f7",
      boxShadow: "0 10px 30px rgba(0,0,0,0.02)",
      transition: 'all 0.3s ease'
    };
  },
  
  cardHeader: { display: "flex", justifyContent: "space-between", marginBottom: "20px", alignItems:'center' },
  subjectPill: { background: "#f0f3ff", color: "#686de0", padding: "7px 15px", borderRadius: "12px", fontSize: "12px", fontWeight: "700" },
  
  statusBadge(done, expired) {
    return {
      display: 'flex', 
      alignItems: 'center', 
      gap: '6px', 
      fontSize: "12px", 
      fontWeight: "700", 
      color: done ? "#27ae60" : expired ? "#e74c3c" : "#f39c12" 
    };
  },

  taskTitle: { margin: "0 0 20px 0", fontSize: "18px", fontWeight: "700", color: "#2d3436", lineHeight: '1.4' },
  infoGrid: { display: "flex", gap: "35px", marginBottom: '22px' },
  infoItem: { display: "flex", flexDirection: "column", gap: '5px' },
  infoLabel: { fontSize: "10px", color: "#b2bec3", fontWeight: "700", letterSpacing: '0.8px', textTransform: 'uppercase' },
  infoValue: { fontSize: "14px", fontWeight: '600', color: '#2d3436' },
  divider: { height: "1px", background: "#f1f2f6", margin: "0 0 22px 0" },
  actionRow: { display: "flex", flexDirection: "column", gap: "14px" },
  btnSecondary: { background: "#f8f9fa", color: "#2d3436", padding: "14px", border: "1px solid #e9ecef", borderRadius: "14px", cursor: "pointer", fontSize: "14px", fontWeight: "600", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  
  btnSubmit(late) {
    return {
      background: late ? "#eb4d4b" : "#4834d4",
      color: "#fff", padding: "16px", border: "none", borderRadius: "14px", fontWeight: "700", cursor: "pointer", fontSize: '15px', boxShadow: "0 8px 20px rgba(72, 52, 212, 0.2)"
    };
  },

  btnDisabled: { background: "#dcdde1", color: "#95a5a6", padding: "16px", borderRadius: "14px", border: "none", cursor: 'not-allowed' },
  btnSuccess: { background: "#2ecc71", color: "#fff", padding: "16px", borderRadius: "14px", border: "none", fontWeight: "700", cursor: 'pointer' },
  btnDelete: { background: "transparent", border: "1px solid #fab1a0", color: "#ff7675", padding: "12px", borderRadius: "12px", fontSize: "12px", cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '600' },
  btnFocus: { background: 'none', border: 'none', color: '#4834d4', fontSize: '12px', fontWeight: '600', cursor: 'pointer', textAlign: 'center' },
  uploadZone: { display: 'flex', flexDirection: 'column', gap: '12px' },
  fileLabel: { cursor: 'pointer' },
  fileDummy: { background: "#fdfdfd", border: "2px dashed #dcdde1", padding: "18px", borderRadius: "14px", textAlign: "center", color: "#636e72", fontSize: "14px", fontWeight: '500' },
  lockoutMsg: { padding: '16px', background: '#fff5f5', color: '#c0392b', borderRadius: '14px', fontSize: '13px', textAlign: 'center', border: '1px solid #feb2b2', fontWeight: '600' },
  submissionBox: { display: 'flex', flexDirection: 'column', gap: '14px' },
  scoreContainer: { background: "#fff9eb", padding: "18px", borderRadius: "18px", border: "1px solid #ffeaa7", textAlign: 'center' },
  scoreText: { fontSize: "15px", fontWeight: '700', color: '#d35400', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' },
  stars: { fontSize: "20px" },
  pendingReview: { textAlign: 'center', fontSize: '13px', color: '#95a5a6', fontStyle: 'italic', padding: '10px' },
  accordion: { background: "#ffffff", borderRadius: "20px", border: "1px solid #edf2f7", marginBottom: "16px", overflow: 'hidden' },
  accordionHeader: { padding: "22px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontWeight: '700', color: '#2d3436' },
  countBadge: { background: "#f0f3ff", color: "#4834d4", padding: "3px 10px", borderRadius: "8px", fontSize: "11px", marginLeft: "12px" },
  accordionContent: { padding: "0 18px 18px" },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(255, 255, 255, 0.98)', zIndex: 9999, padding: '20px', display: 'flex', flexDirection: 'column' },
  modalContent: { maxWidth: '550px', margin: 'auto', width: '100%' },
  btnCloseModal: { background: '#2d3436', color: '#fff', border: 'none', padding: '14px 24px', borderRadius: '14px', cursor: 'pointer', marginBottom: '25px', fontWeight: '700', alignSelf: 'center' },
  fullView: { background: "#ffffff", padding: "35px", borderRadius: "32px", border: "2px solid #4834d4", boxShadow: "0 20px 50px rgba(72, 52, 212, 0.15)" },
  loaderContainer: { textAlign: 'center', padding: '120px 0' },
  spinner: { width: "40px", height: "40px", border: "4px solid #f1f2f6", borderTopColor: "#4834d4", borderRadius: "50%", margin: "0 auto", animation: "spin 1s linear infinite" },
  emptyState: { textAlign: 'center', padding: '80px 0', color: '#b2bec3', fontSize: '15px' },
  footer: { textAlign: 'center', fontSize: '11px', color: '#bdc3c7', letterSpacing: '0.5px', marginTop: '30px' }
};

// GLOBAL ANIMATIONS
if (typeof document !== 'undefined') {
  const sheet = document.createElement("style");
  sheet.innerText = `
    @keyframes spin { to { transform: rotate(360deg); } }
    body { margin: 0; padding: 0; background-color: #F8FAFC; }
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  `;
  document.head.appendChild(sheet);
}