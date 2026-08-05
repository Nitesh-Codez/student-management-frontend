import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { 
  FaClock, FaCheckCircle, FaChevronDown, FaChevronUp, FaTimes, 
  FaTrash, FaBookOpen, FaAward, FaCalendarAlt, 
  FaExclamationTriangle, FaLightbulb, FaRocket, 
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
  const studentClass = String(user.class || "").trim();
  const studentId = user.id || "";
  const studentStream = String(user.stream || "").toLowerCase();

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

  /**
   * STRICT STREAM FILTERING FOR CLASS 12
   */
  const filterTaskByStream = (task) => {
    if (studentClass !== "12" && studentClass !== "12th") {
      return true;
    }

    const sub = (task.subject || "").trim().toLowerCase();
    const allowedStreams = studentStream
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (allowedStreams.length === 0) return false;

    const isMatched = allowedStreams.some((item) => sub.includes(item) || item.includes(sub));
    return isMatched;
  };

  const processedTasks = tasks.filter(filterTaskByStream);

  const pendingTasks = processedTasks.filter((t) => t.status !== "SUBMITTED");
  const completedTasksList = processedTasks.filter((t) => t.status === "SUBMITTED");
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
    if (!file) return alert("📁 Please select a submission file first!");

    const deadline = new Date(task.deadline);
    const windowClosing = new Date(deadline.getTime() + 3 * 24 * 60 * 60 * 1000);

    if (currentTime > windowClosing) {
      return alert("🔒 Submission Window Locked! You are more than 3 days late.");
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
      alert("❌ Upload failed. Please check file size or network connection.");
    } finally {
      setUploadingId(null);
    }
  };

  const handleDelete = async (subId) => {
    if (!window.confirm("🗑️ This will permanently remove your submission. Continue?")) return;
    try {
      await axios.delete(`${DELETE_API}/${subId}`);
      fetchTasks();
    } catch {
      alert("⚠️ Unable to delete at this moment.");
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
      <div key={task.id} style={isFull ? styles.fullView : styles.taskCard(isSubmitted, isOverdue && !isSubmitted)} className="fade-slide-in hover-card-effect">
        <div style={styles.cardHeader}>
          <div style={styles.subjectPill}>📚 {task.subject}</div>
          <div style={styles.statusBadge(isSubmitted, isExpired)}>
            {isSubmitted ? <FaCheckCircle /> : isExpired ? <FaExclamationTriangle /> : <FaClock />}
            {isSubmitted ? "✨ COMPLETED" : isExpired ? "🔒 LOCKOUT" : "⚡ PENDING"}
          </div>
        </div>

        <h3 style={styles.taskTitle}>{task.task_title}</h3>

        <div style={styles.infoGrid}>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>⏳ DUE DATE</span>
            <span style={styles.infoValue}>{formatDateTime(task.deadline)}</span>
          </div>
          {!isSubmitted ? (
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>{isOverdue ? "🔥 OVERDUE BY" : "⏱️ TIME LEFT"}</span>
              <span style={{ ...styles.infoValue, color: isOverdue ? "#8e44ad" : "#e67e22" }}>
                {isExpired ? "🔒 Locked Out" : `${d}d ${h}h ${m}m ${s}s`}
              </span>
            </div>
          ) : (
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>🚀 SUBMITTED AT</span>
              <span style={styles.infoValue}>{formatDateTime(task.student_uploaded_at)}</span>
            </div>
          )}
        </div>

        <div style={styles.divider} />

        <div style={styles.actionRow}>
          {task.task_file && (
            <button style={styles.btnSecondary } onClick={() => window.open(task.task_file, "_blank")} className="hover-btn-scale">
              <FaBookOpen /> View Question Paper
            </button>
          )}

          {isSubmitted ? (
            <div style={styles.submissionBox}>
              <button style={styles.btnSuccess} onClick={() => window.open(task.student_file, "_blank")} className="hover-btn-scale">
                📂 View My Uploaded Solution
              </button>
              {task.rating ? (
                <div style={styles.scoreContainer}>
                  <div style={styles.scoreText}>
                    <FaAward style={{ color: '#f1c40f' }} /> ⭐ Score: {calculateMarks(task).toFixed(1)} / 20
                  </div>
                  <div style={styles.stars}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <span key={i} style={{ color: i <= task.rating ? "#f1c40f" : "#dcdde1" }}>★</span>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={styles.pendingReview}>👀 Reviewing in progress by teacher...</div>
              )}
              {!task.rating && (
                <button style={styles.btnDelete} onClick={() => handleDelete(task.student_submission_id)} className="hover-btn-scale">
                  <FaTrash /> Remove Submission & Re-upload
                </button>
              )}
            </div>
          ) : (
            <div style={styles.uploadZone}>
              {isExpired ? (
                <div style={styles.lockoutMsg}>🚫 Lockout Active: Maximum 3-day deadline window exceeded!</div>
              ) : (
                <>
                  <label style={styles.fileLabel} className="hover-btn-scale">
                    <input type="file" style={{ display: 'none' }} onChange={(e) => setFiles({ ...files, [task.id]: e.target.files[0] })} />
                    <div style={styles.fileDummy}>
                      {files[task.id] ? `📎 Ready: ${files[task.id].name.slice(0, 22)}` : "📤 Click Here to Choose Document/PDF"}
                    </div>
                  </label>
                  <button 
                    style={uploadingId === task.id ? styles.btnDisabled : styles.btnSubmit(isOverdue)}
                    disabled={uploadingId === task.id}
                    onClick={() => handleSubmit(task)}
                    className="hover-btn-scale"
                  >
                    {uploadingId === task.id ? "🚀 Uploading Securely..." : isOverdue ? "🔥 Submit Late Assignment" : "✨ Turn In Assignment Now"}
                  </button>
                </>
              )}
            </div>
          )}

          {!isFull && !isSubmitted && !isExpired && (
            <button style={styles.btnFocus} onClick={() => setFocusedTask(task)} className="hover-btn-scale">🔍 Expand Focus Mode</button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.page} className="page-fade-in">
      <header style={styles.header}>
        <div style={styles.userContainer}>
          <div style={styles.avatar} className="pulse-glow">
            {user.name?.charAt(0)}
            <div style={styles.onlineSignal} />
          </div>
          <div>
            <h2 style={styles.welcomeText}>
              🌟 Welcome back, {user.name?.split(" ")[0]}! <FaRocket className="rocket-bounce" style={{ fontSize: '18px', color: '#f1c40f', display: 'inline-block' }} />
            </h2>
            <p style={styles.subText}>🎓 Class {studentClass} Dashboard • 🔮 {new Date().getFullYear()} Academic Session {studentStream ? `• 📚 ${user.stream}` : ''}</p>
          </div>
        </div>

        <div style={styles.performanceCard} className="hover-card-effect">
          <div style={styles.perfTop}>
            <span style={styles.perfLabel}>⚡ OVERALL ACADEMIC PROGRESS SCORE</span>
            <span style={styles.perfValue}>{overallScore} / 20</span>
          </div>
          <div style={styles.barBg}>
            <div style={{ ...styles.barFill, width: `${(overallScore / 20) * 100}%` }}></div>
          </div>
          <div style={styles.perfStats}>
            <span>🎯 Accuracy Rating: <b>{(overallScore / 20 * 100).toFixed(0)}%</b></span>
            <span>🏆 Completed Count: {completedTasksList.length} / {processedTasks.length}</span>
          </div>
        </div>
      </header>

      {focusedTask && (
        <div style={styles.modalOverlay} className="modal-backdrop-anim">
          <div style={styles.modalContent} className="modal-pop-anim">
            <button style={styles.btnCloseModal} onClick={() => setFocusedTask(null)} className="hover-btn-scale">
              <FaTimes /> Exit Full Focus View
            </button>
            {renderTaskCard(focusedTask, true)}
          </div>
        </div>
      )}

      <main style={styles.main}>
        {loading ? (
          <div style={styles.loaderContainer}>
            <div style={styles.spinner} />
            <p style={{ marginTop: '15px', color: '#8e44ad', fontSize: '14px', fontWeight: '600' }}>✨ Syncing Smart Classroom Data...</p>
          </div>
        ) : (
          <>
            <div style={styles.tabs}>
              <button style={activeTab === 'pending' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('pending')} className="hover-btn-scale">
                ⚡ Active Assignments ({pendingTasks.length})
              </button>
              <button style={activeTab === 'completed' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('completed')} className="hover-btn-scale">
                ✨ Past Archived Submissions ({completedTasksList.length})
              </button>
            </div>

            {activeTab === 'pending' ? (
              <section style={styles.section}>
                {pendingTasks.length > 0 ? pendingTasks.map(task => renderTaskCard(task)) : (
                  <div style={styles.emptyState}>
                    <FaLightbulb className="bulb-glow" style={{ fontSize: '45px', color: '#f1c40f', marginBottom: '15px' }} />
                    <p style={{ fontSize: '16px', fontWeight: '600', color: '#4a235a' }}>🎉 Amazing job! No pending assignments remaining.</p>
                  </div>
                )}
              </section>
            ) : (
              <section style={styles.section}>
                {Object.keys(groupedCompleted).length > 0 ? Object.keys(groupedCompleted).map(subject => (
                  <div key={subject} style={styles.accordion} className="hover-card-effect">
                    <div style={styles.accordionHeader} onClick={() => setExpandedSubject(expandedSubject === subject ? null : subject)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FaCalendarAlt style={{ color: '#8e44ad' }} />
                        <span>📘 {subject}</span>
                        <span style={styles.countBadge}>{groupedCompleted[subject].length} Submissions</span>
                      </div>
                      {expandedSubject === subject ? <FaChevronUp /> : <FaChevronDown />}
                    </div>
                    {expandedSubject === subject && (
                      <div style={styles.accordionContent} className="fade-slide-in">
                        {groupedCompleted[subject].map(task => renderTaskCard(task))}
                      </div>
                    )}
                  </div>
                )) : <div style={styles.emptyState}>📂 No past submissions archived in your portfolio yet.</div>}
              </section>
            )}
          </>
        )}
      </main>

      <footer style={styles.footer}>
        ✨ SmartZone Student Portal v4.2 • Secure Academic Workspace • {currentTime.toLocaleTimeString()} 🚀
      </footer>
    </div>
  );
}

const styles = {
  page: { background: "linear-gradient(135deg, #f9f5ff 0%, #fef9e7 100%)", minHeight: "100vh", width: "100vw", color: "#2d3436", fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif", paddingBottom: "50px" },
  header: { padding: "40px 20px", background: "linear-gradient(135deg, #2c1654 0%, #4a235a 100%)", borderBottom: "3px solid #f1c40f", boxShadow: "0 10px 30px rgba(142, 68, 173, 0.2)" },
  userContainer: { display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '30px' },
  avatar: { width: "70px", height: "70px", background: "linear-gradient(135deg, #f1c40f, #e67e22)", borderRadius: "24px", display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: "28px", fontWeight: "bold", color: "#fff", position: 'relative', boxShadow: "0 10px 25px rgba(241, 196, 15, 0.4)" },
  onlineSignal: { width: "16px", height: "16px", background: "#2ecc71", borderRadius: "50%", border: "3px solid #2c1654", position: 'absolute', bottom: -2, right: -2 },
  welcomeText: { margin: 0, fontSize: "26px", fontWeight: "800", color: "#ffffff", letterSpacing: '0.5px' },
  subText: { margin: "6px 0 0 0", fontSize: "14px", color: "#f3e5f5", fontWeight: '500' },
  performanceCard: { background: "linear-gradient(135deg, #ffffff 0%, #f4ecf7 100%)", padding: "26px", borderRadius: "24px", border: "2px solid #8e44ad", boxShadow: "0 12px 35px rgba(142, 68, 173, 0.15)", transition: 'transform 0.3s ease' },
  perfTop: { display: 'flex', justifyContent: 'space-between', marginBottom: '14px', alignItems: 'center' },
  perfLabel: { fontSize: '12px', fontWeight: '800', color: '#8e44ad', letterSpacing: '1px' },
  perfValue: { fontSize: '24px', fontWeight: '800', color: '#6c3483' },
  barBg: { height: '14px', background: '#ebd2fc', borderRadius: '14px', overflow: 'hidden', border: '1px solid #d7bde2' },
  barFill: { height: '100%', background: 'linear-gradient(90deg, #f1c40f, #8e44ad, #2980b9)', borderRadius: '14px', transition: 'width 1s ease-in-out' },
  perfStats: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#512e5f', marginTop: '14px', fontWeight: '600' },
  main: { padding: "30px 20px" },
  tabs: { display: 'flex', gap: '12px', marginBottom: '30px', background: '#eaecee', padding: '8px', borderRadius: '18px', border: '1px solid #d5dbdb' },
  tab: { flex: 1, padding: '14px', background: 'transparent', border: 'none', color: '#566573', fontSize: '14px', fontWeight: '600', cursor: 'pointer', borderRadius: '14px', transition: 'all 0.2s ease' },
  activeTab: { flex: 1, padding: '14px', background: 'linear-gradient(135deg, #8e44ad, #512e5f)', border: 'none', color: '#ffffff', fontSize: '14px', fontWeight: '700', borderRadius: '14px', boxShadow: '0 6px 20px rgba(142, 68, 173, 0.3)', transform: 'translateY(-2px)' },
  section: { marginBottom: "30px" },
  
  taskCard(done, late) {
    return {
      background: "#ffffff",
      borderRadius: "26px",
      padding: "28px",
      marginBottom: "22px",
      border: late ? "2px solid #8e44ad" : "2px solid #fcf3cf",
      boxShadow: "0 10px 30px rgba(142, 68, 173, 0.08)",
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    };
  },
  
  cardHeader: { display: "flex", justifyContent: "space-between", marginBottom: "20px", alignItems:'center' },
  subjectPill: { background: "#fef9e7", color: "#d68910", padding: "8px 16px", borderRadius: "14px", fontSize: "12px", fontWeight: "800", border: "1px solid #f9e79f", boxShadow: "0 4px 12px rgba(241, 196, 15, 0.15)" },
  
  statusBadge(done, expired) {
    return {
      display: 'flex', 
      alignItems: 'center', 
      gap: '6px', 
      fontSize: "12px", 
      fontWeight: "800", 
      color: done ? "#27ae60" : expired ? "#8e44ad" : "#f1c40f" 
    };
  },

  taskTitle: { margin: "0 0 20px 0", fontSize: "19px", fontWeight: "800", color: "#2c3e50", lineHeight: '1.4' },
  infoGrid: { display: "flex", gap: "35px", marginBottom: '22px' },
  infoItem: { display: "flex", flexDirection: "column", gap: '5px' },
  infoLabel: { fontSize: "10px", color: "#7f8c8d", fontWeight: "800", letterSpacing: '0.8px', textTransform: 'uppercase' },
  infoValue: { fontSize: "14px", fontWeight: '700', color: '#2c3e50' },
  divider: { height: "1px", background: "#f4ecf7", margin: "0 0 22px 0" },
  actionRow: { display: "flex", flexDirection: "column", gap: "14px" },
  btnSecondary: { background: "#f4ecf7", color: "#6c3483", padding: "15px", border: "1px solid #d7bde2", borderRadius: "16px", cursor: "pointer", fontSize: "14px", fontWeight: "700", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s ease' },
  
  btnSubmit(late) {
    return {
      background: late ? "linear-gradient(135deg, #8e44ad, #512e5f)" : "linear-gradient(135deg, #f1c40f, #e67e22)",
      color: "#fff", padding: "16px", border: "none", borderRadius: "16px", fontWeight: "800", cursor: "pointer", fontSize: '15px', boxShadow: "0 8px 22px rgba(241, 196, 15, 0.3)", transition: 'transform 0.2s ease, box-shadow 0.2s ease'
    };
  },

  btnDisabled: { background: "#fef9e7", color: "#f1c40f", padding: "16px", borderRadius: "16px", border: "none", cursor: 'not-allowed', fontWeight: '700' },
  btnSuccess: { background: "linear-gradient(135deg, #27ae60, #1e8449)", color: "#fff", padding: "16px", borderRadius: "16px", border: "none", fontWeight: "800", cursor: 'pointer', transition: 'opacity 0.2s ease', boxShadow: "0 6px 18px rgba(39, 174, 96, 0.3)" },
  btnDelete: { background: "transparent", border: "1px solid #e74c3c", color: "#c0392b", padding: "12px", borderRadius: "14px", fontSize: "12px", cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '700' },
  btnFocus: { background: 'none', border: 'none', color: '#8e44ad', fontSize: '13px', fontWeight: '800', cursor: 'pointer', textAlign: 'center' },
  uploadZone: { display: 'flex', flexDirection: 'column', gap: '12px' },
  fileLabel: { cursor: 'pointer' },
  fileDummy: { background: "#fef9e7", border: "2px dashed #f1c40f", padding: "18px", borderRadius: "16px", textAlign: "center", color: "#d68910", fontSize: "14px", fontWeight: '700', transition: 'background 0.2s ease', boxShadow: '0 4px 15px rgba(241, 196, 15, 0.1)' },
  lockoutMsg: { padding: '16px', background: '#f4ecf7', color: '#8e44ad', borderRadius: '16px', fontSize: '13px', textAlign: 'center', border: '2px solid #d7bde2', fontWeight: '800' },
  submissionBox: { display: 'flex', flexDirection: 'column', gap: '14px' },
  scoreContainer: { background: "linear-gradient(135deg, #fef9e7, #fdf2e9)", padding: "18px", borderRadius: "18px", border: "2px solid #f9e79f", textAlign: 'center', boxShadow: '0 6px 20px rgba(241, 196, 15, 0.15)' },
  scoreText: { fontSize: "16px", fontWeight: '800', color: '#d68910', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' },
  stars: { fontSize: "22px" },
  pendingReview: { textAlign: 'center', fontSize: '13px', color: '#d68910', fontStyle: 'italic', padding: '10px', fontWeight: '700' },
  accordion: { background: "#ffffff", borderRadius: "22px", border: "2px solid #d7bde2", marginBottom: "16px", overflow: 'hidden', transition: 'all 0.3s ease', boxShadow: '0 6px 20px rgba(142, 68, 173, 0.08)' },
  accordionHeader: { padding: "22px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontWeight: '800', color: '#2c3e50', fontSize: '15px' },
  countBadge: { background: "#f4ecf7", color: "#8e44ad", padding: "4px 12px", borderRadius: "10px", fontSize: "12px", marginLeft: "12px", border: "1px solid #d7bde2", fontWeight: '800' },
  accordionContent: { padding: "0 18px 18px" },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(44, 22, 84, 0.85)', backdropFilter: 'blur(8px)', zIndex: 9999, padding: '20px', display: 'flex', flexDirection: 'column' },
  modalContent: { maxWidth: '580px', margin: 'auto', width: '100%' },
  btnCloseModal: { background: '#f1c40f', color: '#2c1654', border: 'none', padding: '14px 26px', borderRadius: '16px', cursor: 'pointer', marginBottom: '25px', fontWeight: '800', alignSelf: 'center', transition: 'transform 0.2s ease', boxShadow: '0 8px 20px rgba(241, 196, 15, 0.3)' },
  fullView: { background: "#ffffff", padding: "35px", borderRadius: "32px", border: "3px solid #8e44ad", boxShadow: "0 25px 60px rgba(142, 68, 173, 0.3)" },
  loaderContainer: { textAlign: 'center', padding: '120px 0' },
  spinner: { width: "45px", height: "45px", border: "5px solid #f4ecf7", borderTopColor: "#8e44ad", borderRadius: "50%", margin: "0 auto", animation: "spin 1s linear infinite" },
  emptyState: { textAlign: 'center', padding: '80px 0', color: '#8e44ad', fontSize: '15px' },
  footer: { textAlign: 'center', fontSize: '12px', color: '#7f8c8d', letterSpacing: '0.5px', marginTop: '30px', fontWeight: '700' }
};

// GLOBAL ANIMATIONS & EFFECTS
if (typeof document !== 'undefined') {
  const sheet = document.createElement("style");
  sheet.innerText = `
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeInSlide {
      from { opacity: 0; transform: translateY(14px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulseGlow {
      0% { box-shadow: 0 0 0 0 rgba(241, 196, 15, 0.6); }
      70% { box-shadow: 0 0 0 15px rgba(241, 196, 15, 0); }
      100% { box-shadow: 0 0 0 0 rgba(241, 196, 15, 0); }
    }
    @keyframes rocketFloat {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-6px) rotate(8deg); }
    }
    @keyframes modalPop {
      from { opacity: 0; transform: scale(0.92); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes bulbPulse {
      0%, 100% { transform: scale(1); opacity: 0.85; }
      50% { transform: scale(1.12); opacity: 1; filter: drop-shadow(0 0 10px #f1c40f); }
    }

    .fade-slide-in {
      animation: fadeInSlide 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .page-fade-in {
      animation: fadeInSlide 0.5s ease-out forwards;
    }
    .pulse-glow {
      animation: pulseGlow 2.5s infinite;
    }
    .rocket-bounce {
      animation: rocketFloat 2s ease-in-out infinite;
    }
    .modal-pop-anim {
      animation: modalPop 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .bulb-glow {
      animation: bulbPulse 2s ease-in-out infinite;
    }

    /* Enhanced Interactive Hover Effects */
    .hover-btn-scale:hover {
      transform: translateY(-3px) scale(1.02);
      filter: brightness(1.1);
    }
    .hover-btn-scale:active {
      transform: translateY(1px) scale(0.98);
    }
    .hover-card-effect:hover {
      transform: translateY(-4px);
      box-shadow: 0 18px 45px rgba(142, 68, 173, 0.18) !important;
      border-color: #8e44ad !important;
    }

    body { margin: 0; padding: 0; background-color: #f9f5ff; }
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  `;
  document.head.appendChild(sheet);
}