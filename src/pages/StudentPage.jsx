import React, { useEffect, useState } from "react";
import axios from "axios";

// ================= API URLs =================
const API_URL = "https://student-management-system-4-hose.onrender.com";
const ASSIGNMENTS_API = `${API_URL}/api/assignments/class`;
const SUBMIT_API = `${API_URL}/api/assignments/student/upload`;

export default function StudentPage() {
  const [tasks, setTasks] = useState([]);
  const [files, setFiles] = useState({});
  const [now, setNow] = useState(Date.now());

  const user = JSON.parse(localStorage.getItem("user")) || {};
  const studentClass = user.class || "";
  const studentId = user.id || "";

  // ===== LIVE CLOCK =====
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ===== FETCH TASKS =====
  const fetchTasks = async () => {
    if (!studentClass || !studentId) return;
    try {
      const res = await axios.get(`${ASSIGNMENTS_API}/${studentClass}/${studentId}`);
      if (res.data.success) setTasks(res.data.assignments);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [studentClass, studentId]);

  // ===== SUBMIT =====
  const handleSubmit = async (task) => {
    if (task.status === "SUBMITTED") {
      const confirmRes = window.confirm(
        "You have already submitted this assignment. Do you want to submit again?"
      );
      if (!confirmRes) return;
    }

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
      const res = await axios.post(SUBMIT_API, fd);
      alert(res.data.success ? "Assignment Submitted!" : res.data.message);
      fetchTasks();
    } catch {
      alert("Server error");
    }
  };

  // ===== DATE FORMATTER =====
  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  // ===== DURATION FORMATTER =====
  const formatDuration = (ms) => {
    const abs = Math.abs(ms);
    const h = Math.floor(abs / (1000 * 60 * 60));
    const m = Math.floor((abs / (1000 * 60)) % 60);
    return `${h}h ${m}m`;
  };

  // ===== LIVE DEADLINE BEFORE SUBMIT =====
  const getLiveDeadlineText = (deadline) => {
    if (!deadline) return null;
    const diff = new Date(deadline).getTime() - now;
    if (diff > 0) return { text: `⏳ ${formatDuration(diff)} left`, color: "#27ae60" };
    return { text: `⚠️ You are ${formatDuration(diff)} late`, color: "#e74c3c" };
  };

  // ===== SUBMISSION STATUS AFTER SUBMIT =====
  const getSubmittedStatus = (deadline, uploadedAt) => {
    if (!deadline || !uploadedAt) return null;
    const diff = new Date(uploadedAt).getTime() - new Date(deadline).getTime();
    if (diff <= 0) return { text: `🎉 Submitted ${formatDuration(diff)} early`, color: "#27ae60" };
    return { text: `😢 Submitted ${formatDuration(diff)} late`, color: "#e74c3c" };
  };

  return (
    <div style={pageStyle}>
      <div style={pageHeader}>
        <h2>Hello, <b>{user.name || "Student"}</b> 👋</h2>
        <p>Check Your Assignments</p>
      </div>

      {tasks.length === 0 ? (
        <p style={emptyStyle}>No assignments available</p>
      ) : (
        tasks.map((task) => {
          const isSubmitted = task.status === "SUBMITTED";
          const liveTime = !isSubmitted ? getLiveDeadlineText(task.deadline) : null;
          const submittedInfo = isSubmitted ? getSubmittedStatus(task.deadline, task.uploaded_at) : null;

          return (
            <div key={task.id} style={taskCard}>
              <div style={taskHeader}>{task.task_title}</div>
              <div style={taskBody}>
                <p><b>Subject:</b> {task.subject}</p>
                <p><b>Deadline:</b> {task.deadline ? formatDateTime(task.deadline) : "No deadline"}</p>

                {task.task_file && (
                  <button style={viewBtn} onClick={() => window.open(task.task_file, "_blank")}>
                    📄 View Task
                  </button>
                )}

                <p>
                  <b>Status:</b>{" "}
                  <span style={{ fontWeight: "bold", color: isSubmitted ? "green" : "red" }}>
                    {isSubmitted ? "SUBMITTED" : "NOT SUBMITTED"}
                  </span>
                </p>

                {!isSubmitted && liveTime && (
                  <p style={{ color: liveTime.color, fontWeight: "bold" }}>{liveTime.text}</p>
                )}

                {isSubmitted && (
                  <>
                    <p><b>Submitted At:</b> {formatDateTime(task.uploaded_at)}</p>

                    {task.student_file && (
                      <button style={{ ...viewBtn, background: "#8e44ad" }} onClick={() => window.open(task.student_file, "_blank")}>
                        🧾 View My Submission
                      </button>
                    )}

                    {submittedInfo && (
                      <p style={{ fontWeight: "bold", color: submittedInfo.color }}>{submittedInfo.text}</p>
                    )}

                    {task.rating !== undefined && (
                      <p>
                        <b>Grade:</b>{" "}
                        {[1,2,3,4,5].map(i => (
                          <span key={i} style={{ color: (task.rating || 0) >= i ? "#ffc107" : "#ccc", fontSize: 24 }}>★</span>
                        ))}
                      </p>
                    )}
                  </>
                )}

                {!isSubmitted && (
                  <>
                    <input type="file" onChange={(e) => setFiles({ ...files, [task.id]: e.target.files[0] })} />
                    <br />
                    <button style={submitBtn} onClick={() => handleSubmit(task)}>Submit Assignment</button>
                  </>
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
const pageStyle = { minHeight: "100vh", background: "#eafaf1", paddingBottom: 40 };
const pageHeader = { background: "#2ecc71", padding: 18, textAlign: "center", color: "#fff" };
const taskCard = { width: "90%", maxWidth: 850, margin: "25px auto", background: "#fff", borderRadius: 10 };
const taskHeader = { background: "#27ae60", color: "#fff", padding: 12, fontWeight: "bold" };
const taskBody = { padding: 16 };
const submitBtn = { marginTop: 10, padding: "8px 18px", background: "#27ae60", color: "#fff", border: "none", borderRadius: 5 };
const viewBtn = { margin: "8px 8px 8px 0", padding: "6px 14px", background: "#3498db", color: "#fff", border: "none", borderRadius: 5, cursor: "pointer" };
const emptyStyle = { textAlign: "center", marginTop: 60 };
