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
  const [now, setNow] = useState(Date.now()); // 👈 real-time clock

  const user = JSON.parse(localStorage.getItem("user")) || {};
  const studentClass = user.class || "";
  const studentId = user.id || "";

  // ===== LIVE CLOCK (EVERY SECOND) =====
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchTasks = async () => {
    if (!studentClass || !studentId) return;

    const res = await axios.get(
      `${TASKS_API_URL}/${studentClass}/${studentId}`
    );

    if (res.data.success) {
      if (tasks.length && res.data.assignments.length > tasks.length) {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 4000);
      }
      setTasks(res.data.assignments);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 15000);
    return () => clearInterval(interval);
  }, [studentClass, studentId]);

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

    const res = await axios.post(SUBMIT_API_URL, fd);
    alert(res.data.success ? "Assignment Submitted!" : res.data.message);
    fetchTasks();
  };

  // ===== DEADLINE COUNTDOWN FUNCTION =====
  const getDeadlineStatus = (deadline) => {
    if (!deadline) return null;

    const diff = new Date(deadline).getTime() - now; // future - now
    const abs = Math.abs(diff);

    const d = Math.floor(abs / (1000 * 60 * 60 * 24));
    const h = Math.floor((abs / (1000 * 60 * 60)) % 24);
    const m = Math.floor((abs / (1000 * 60)) % 60);
    const s = Math.floor((abs / 1000) % 60);

    if (diff > 0) {
      return {
        text: `⏳ Time left: ${d}d ${h}h ${m}m ${s}s`,
        color: diff < 3600000 ? "#f39c12" : "#27ae60" // <1 hour warning
      };
    } else {
      return {
        text: `❌ Late by: ${d}d ${h}h ${m}m ${s}s`,
        color: "#e74c3c"
      };
    }
  };

  return (
    <div style={pageStyle}>
      {/* ===== HEADER ===== */}
      <div style={pageHeader}>
        <h2 style={{ margin: 0, color: "#0a2540" }}>
          Hello, <b>{user.name || "Student"}</b> 👋
        </h2>
        <p style={{ marginTop: 6, fontSize: 14, color: "#0a2540" }}>
          Check Your Assignment
        </p>
      </div>

      {/* ===== NEW TASK TOAST ===== */}
      {showToast && (
        <div style={toastStyle}>
          🟢 New Assignment Added
        </div>
      )}

      {/* ===== TASK LIST ===== */}
      {tasks.length === 0 ? (
        <p style={emptyStyle}>No assignments available</p>
      ) : (
        tasks.map(task => {
          const deadlineInfo =
            task.status === "NOT SUBMITTED"
              ? getDeadlineStatus(task.deadline)
              : null;

          return (
            <div key={task.id} style={taskCard}>
              <div style={taskHeader}>
                {task.task_title || "Untitled Task"}
              </div>

              <div style={taskBody}>
                <p>
  <b>Subject:</b>{" "}
  <span style={{ fontSize: 18, fontWeight: "bold" }}>
    {task.subject}
  </span>
</p>

                <p>
                  <b>Deadline:</b>{" "}
                  {task.deadline
                    ? new Date(task.deadline).toLocaleString()
                    : "No deadline"}
                </p>

                <p>
                  <b>Status:</b>{" "}
                  <span style={{
                    color: task.status === "SUBMITTED" ? "#27ae60" : "#c0392b",
                    fontWeight: "bold"
                  }}>
                    {task.status}
                  </span>
                </p>

                {deadlineInfo && (
                  <p style={{
                    fontWeight: "bold",
                    color: deadlineInfo.color
                  }}>
                    {deadlineInfo.text}
                  </p>
                )}

                {task.status === "NOT SUBMITTED" && (
                  <div style={{ marginTop: 10 }}>
                    <input
                      type="file"
                      onChange={e =>
                        setFiles({ ...files, [task.id]: e.target.files[0] })
                      }
                    />
                    <br />
                    <button
                      style={submitBtn}
                      onClick={() => handleSubmit(task)}
                    >
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

const pageStyle = {
  minHeight: "100vh",
  background: "#eafaf1",
  paddingBottom: 40,
  fontFamily: "Arial, sans-serif"
};

const pageHeader = {
  background: "#2ecc71",
  padding: 18,
  textAlign: "center",
  fontWeight: "bold"
};

const taskCard = {
  width: "90%",
  maxWidth: 850,
  margin: "25px auto",
  background: "#ffffff",
  borderRadius: 10,
  overflow: "hidden",
  boxShadow: "0 4px 10px rgba(0,0,0,0.1)"
};

const taskHeader = {
  background: "#27ae60",
  color: "white",
  padding: "12px 16px",
  fontSize: 18,
  fontWeight: "bold"
};

const taskBody = {
  padding: 16,
  background: "#f9fffb"
};

const submitBtn = {
  marginTop: 10,
  padding: "8px 18px",
  background: "#27ae60",
  color: "white",
  border: "none",
  borderRadius: 5,
  cursor: "pointer",
  fontWeight: "bold"
};

const toastStyle = {
  position: "fixed",
  top: 15,
  left: "50%",
  transform: "translateX(-50%)",
  background: "#2ecc71",
  color: "white",
  padding: "10px 22px",
  borderRadius: 20,
  fontWeight: "bold",
  zIndex: 1000
};

const emptyStyle = {
  textAlign: "center",
  marginTop: 60,
  fontSize: 18,
  color: "#555"
};
