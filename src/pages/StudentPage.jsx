import React, { useEffect, useState } from "react";
import axios from "axios";

// ================= API URLs =================
const API_URL = "https://student-management-system-4-hose.onrender.com";
const TASKS_API_URL = `${API_URL}/api/assignments/class`;
const SUBMIT_API_URL = `${API_URL}/api/assignments/student/upload`;

export default function StudentPage() {
  const [tasks, setTasks] = useState([]);
  const [files, setFiles] = useState({});
  const [showToast, setShowToast] = useState(false);
  const [now, setNow] = useState(Date.now());

  const user = JSON.parse(localStorage.getItem("user")) || {};
  const studentClass = user.class || "";
  const studentId = user.id || "";

  // ===== LIVE CLOCK =====
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ===== GLOBAL ANIMATION STYLES =====
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes floatEmoji {
        0% { transform: translateY(0) scale(1); opacity: 1; }
        50% { transform: translateY(-30px) scale(1.2); opacity: 1; }
        100% { transform: translateY(-60px) scale(1); opacity: 0; }
      }

      @keyframes motivationalText {
        0% { transform: translateY(0) scale(1); opacity: 0; }
        30% { opacity: 1; transform: translateY(-10px) scale(1.1);}
        70% { opacity: 1; transform: translateY(-20px) scale(1.1);}
        100% { opacity: 0; transform: translateY(-40px) scale(1);}
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const AnimatedEmoji = ({ emoji, color, text }) => (
    <div style={{ position: "absolute", top: 10, right: 10, textAlign: "center" }}>
      <span
        style={{
          display: "block",
          fontSize: 42, // bigger emoji
          color,
          animation: "floatEmoji 3s ease-out infinite", // continuous
        }}
      >
        {emoji}
      </span>
      <span
        style={{
          display: "block",
          fontSize: 18, // bigger text
          fontWeight: "bold",
          color,
          animation: "motivationalText 3s ease-out infinite", // continuous
          marginTop: 2,
        }}
      >
        {text}
      </span>
    </div>
  );

  // ===== FETCH TASKS =====
  const fetchTasks = async () => {
    if (!studentClass || !studentId) return;

    try {
      const res = await axios.get(`${TASKS_API_URL}/${studentClass}/${studentId}`);
      if (res.data.success) {
        if (tasks.length && res.data.assignments.length > tasks.length) {
          setShowToast(true);
          setTimeout(() => setShowToast(false), 4000);
        }
        setTasks(res.data.assignments);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 15000);
    return () => clearInterval(interval);
  }, [studentClass, studentId]);

  // ===== SUBMIT ASSIGNMENT =====
  const handleSubmit = async (task) => {
    const file = files[task.id];
    if (!file) return alert("Select file first");

    const fd = new FormData();
    fd.append("file", file);
    fd.append("uploader_id", studentId);
    fd.append("uploader_role", "student");
    fd.append("student_id", studentId);
    fd.append("class", studentClass);
    fd.append("task_title", task.task_title);
    fd.append("subject", task.subject);

    try {
      const res = await axios.post(SUBMIT_API_URL, fd);
      alert(res.data.success ? "Assignment Submitted!" : res.data.message);
      fetchTasks();
    } catch (err) {
      console.error(err);
      alert("Server error while submitting");
    }
  };

  // ===== REMOVE SUBMISSION =====
  const handleRemoveSubmission = async (task) => {
    if (!window.confirm("Remove this submission and submit again?")) return;

    try {
      const res = await axios.delete(`${API_URL}/api/assignments/${task.id}`);
      if (res.data.success) {
        alert("Submission removed. You can submit again.");
        fetchTasks();
      } else {
        alert(res.data.message || "Failed to remove submission");
      }
    } catch (err) {
      console.error(err);
      alert("Server error while removing submission");
    }
  };

  // ===== DEADLINE STATUS =====
  const getDeadlineStatus = (deadline, uploadedAt) => {
    if (!deadline) return null;

    const deadlineTime = new Date(deadline).getTime();
    const submittedTime = uploadedAt ? new Date(uploadedAt).getTime() : null;

    if (submittedTime) {
      const diff = submittedTime - deadlineTime;
      const onTime = diff <= 0;
      let lateText = "";
      if (diff > 0) {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff / (1000 * 60)) % 60);
        lateText = `Your task was submitted ${h}h ${m}min late`;
      } else if (diff < 0) {
        const h = Math.floor(Math.abs(diff) / (1000 * 60 * 60));
        const m = Math.floor((Math.abs(diff) / (1000 * 60)) % 60);
        lateText = `Your task was submitted ${h}h ${m}min earlier`;
      } else {
        lateText = "Your task was submitted on time";
      }
      return {
        onTime,
        text: onTime ? "✅ Submitted on time" : "❌ Late submission",
        lateText,
        color: onTime ? "#27ae60" : "#e74c3c",
      };
    } else {
      const diff = deadlineTime - now;
      const abs = Math.abs(diff);
      const d = Math.floor(abs / (1000 * 60 * 60 * 24));
      const h = Math.floor((abs / (1000 * 60 * 60)) % 24);
      const m = Math.floor((abs / (1000 * 60)) % 60);
      const s = Math.floor((abs / 1000) % 60);

      return {
        onTime: diff > 0,
        text: diff > 0
          ? `⏳ Time left: ${d}d ${h}h ${m}m ${s}s`
          : `❌ Late by: ${d}d ${h}h ${m}m ${s}s`,
        color: diff > 0 ? "#27ae60" : "#e74c3c",
      };
    }
  };

  return (
    <div style={pageStyle}>
      <div style={pageHeader}>
        <h2 style={{ margin: 0, color: "#0a2540" }}>
          Hello, <b>{user.name || "Student"}</b> 👋
        </h2>
        <p style={{ marginTop: 6, fontSize: 14, color: "#0a2540" }}>
          Check Your Assignments
        </p>
      </div>

      {showToast && <div style={toastStyle}>🟢 New Assignment Added</div>}

      {tasks.length === 0 ? (
        <p style={emptyStyle}>No assignments available</p>
      ) : (
        tasks.map((task) => {
          const isSubmitted = task.status === "SUBMITTED";
          const deadlineInfo = getDeadlineStatus(task.deadline, task.uploaded_at);

          return (
            <div key={task.id} style={taskCard}>
              <div style={taskHeader}>{task.task_title || "Untitled Task"}</div>
              <div style={taskBody}>
                <p>
                  <b>Subject:</b> <span style={{ fontSize: 18, fontWeight: "bold" }}>{task.subject}</span>
                </p>

                <p>
                  <b>Deadline:</b> {task.deadline ? new Date(task.deadline).toLocaleString() : "No deadline"}
                </p>

                <p>
                  <b>Status:</b>{" "}
                  <span style={{ color: isSubmitted ? "#27ae60" : "#c0392b", fontWeight: "bold" }}>
                    {task.status}
                  </span>
                </p>

                {/* ===== COUNTDOWN IF NOT SUBMITTED ===== */}
                {!isSubmitted && deadlineInfo && (
                  <p style={{ fontWeight: "bold", color: deadlineInfo.color }}>
                    {deadlineInfo.text}
                  </p>
                )}

                {/* ===== SUBMITTED INFO & RATING ===== */}
                {isSubmitted && task.uploaded_at && (
                  <div style={{ position: "relative" }}>
                    <p>
                      <b>Submitted At:</b> {new Date(task.uploaded_at).toLocaleString()}
                    </p>
                    <p style={{ marginTop: 8 }}>
                      <b>Your Grade:</b>{" "}
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span
                          key={i}
                          style={{
                            color: (task.rating || 0) >= i ? "#ffc107" : "#ccc",
                            fontSize: 38,
                            marginRight: 2,
                          }}
                        >
                          ★
                        </span>
                      ))}
                    </p>

                    {/* ===== MOTIVATIONAL ANIMATION ===== */}
                    {deadlineInfo && (
                      <AnimatedEmoji
                        emoji={deadlineInfo.onTime ? "🎉" : "😢"}
                        color={deadlineInfo.onTime ? "#27ae60" : "#e74c3c"}
                        text={
                          deadlineInfo.onTime
                            ? "Keep doing like this!"
                            : "Be on time next time!"
                        }
                      />
                    )}

                    {/* ===== LATE/EARLY DURATION ===== */}
                    {deadlineInfo && deadlineInfo.lateText && (
                      <p style={{ fontWeight: "bold", color: deadlineInfo.color, marginTop: 10 }}>
                        {deadlineInfo.lateText}
                      </p>
                    )}
                  </div>
                )}

                {/* ===== SUBMIT BUTTON ===== */}
                {!isSubmitted && (
                  <div style={{ marginTop: 10 }}>
                    <input
                      type="file"
                      onChange={(e) => setFiles({ ...files, [task.id]: e.target.files[0] })}
                    />
                    <br />
                    <button style={submitBtn} onClick={() => handleSubmit(task)}>
                      Submit Assignment
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

/* ================= STYLES ================= */
const pageStyle = { minHeight: "100vh", background: "#eafaf1", paddingBottom: 40, fontFamily: "Arial, sans-serif" };
const pageHeader = { background: "#2ecc71", padding: 18, textAlign: "center", fontWeight: "bold" };
const taskCard = { width: "90%", maxWidth: 850, margin: "25px auto", background: "#ffffff", borderRadius: 10, overflow: "hidden", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" };
const taskHeader = { background: "#27ae60", color: "white", padding: "12px 16px", fontSize: 18, fontWeight: "bold" };
const taskBody = { padding: 16, background: "#f9fffb" };
const submitBtn = { marginTop: 10, padding: "8px 18px", background: "#27ae60", color: "white", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: "bold" };
const toastStyle = { position: "fixed", top: 15, left: "50%", transform: "translateX(-50%)", background: "#2ecc71", color: "white", padding: "10px 22px", borderRadius: 20, fontWeight: "bold", zIndex: 1000 };
const emptyStyle = { textAlign: "center", marginTop: 60, fontSize: 18, color: "#555" };
