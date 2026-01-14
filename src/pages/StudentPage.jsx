import React, { useEffect, useState } from "react";
import axios from "axios";

// ================= API URLs =================
const API_URL = "https://student-management-system-4-hose.onrender.com";
const ASSIGNMENTS_API = `${API_URL}/api/assignments/class`;
const SUBMIT_API = `${API_URL}/api/assignments/student/upload`;
const DELETE_API = `${API_URL}/api/assignments`;

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
      const res = await axios.get(
        `${ASSIGNMENTS_API}/${studentClass}/${studentId}`
      );
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
    fd.append("uploaded_at", new Date().toISOString());

    try {
      const res = await axios.post(SUBMIT_API, fd);
      if (res.data.success) {
        alert("Assignment Submitted!");
        fetchTasks();
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  // ===== DELETE SUBMISSION =====
  const handleDeleteSubmission = async (submissionId) => {
    if (!window.confirm("Remove your submission?")) return;
    try {
      await axios.delete(`${DELETE_API}/${submissionId}`);
      fetchTasks();
    } catch (err) {
      alert("Delete failed");
    }
  };

  // ===== HELPERS =====
  const formatDateTime = (dateStr) =>
    dateStr
      ? new Date(dateStr).toLocaleString("en-IN", { hour12: false })
      : "-";

  const renderRating = (rating) => {
    if (!rating)
      return <p style={{ color: "#f39c12" }}>🕒 Grading Pending</p>;

    return (
      <div>
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            style={{
              fontSize: 32,
              color: i <= rating ? "#f1c40f" : "#ccc",
            }}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <div style={pageStyle}>
      <div style={pageHeader}>
        <h2>Hello, <b>{user.name || "Student"}</b> 👋</h2>
        <p>Check Your Assignments</p>
      </div>

      {tasks.map((task) => {
        const isSubmitted = task.status === "SUBMITTED";

        return (
          <div key={task.id} style={taskCard}>
            <div style={taskHeader}>{task.task_title}</div>
            <div style={taskBody}>
              <p><b>Subject:</b> {task.subject}</p>
              <p><b>Deadline:</b> {formatDateTime(task.deadline)}</p>

              {/* ===== VIEW TASK (ADMIN FILE) ===== */}
              {task.task_file && (
                <button
                  style={viewBtn}
                  onClick={() => window.open(task.task_file, "_blank")}
                >
                  📄 View Task
                </button>
              )}

              <p>
                <b>Status:</b>{" "}
                <span style={{ color: isSubmitted ? "green" : "red" }}>
                  {task.status}
                </span>
              </p>

              {isSubmitted ? (
                <>
                  <p><b>Submitted At:</b> {formatDateTime(task.uploaded_at)}</p>

                  {task.student_file && (
                    <button
                      style={{ ...viewBtn, background: "#8e44ad" }}
                      onClick={() =>
                        window.open(task.student_file, "_blank")
                      }
                    >
                      🧾 View My Submission
                    </button>
                  )}

                  {/* ===== GRADING ===== */}
                  {renderRating(task.rating)}

                  {/* ===== REMOVE AS LINK ===== */}
                  <div>
                    <p
  onClick={() =>
    handleDeleteSubmission(task.student_submission_id)
  }
  style={{
    marginTop: "10px",
    color: "#e74c3c",
    fontWeight: "bold",
    fontSize: "16px",
    cursor: "pointer",
    textDecoration: "underline"
  }}
>
  ❌ Remove Submission
</p>

                  </div>
</>
) : (
  <>
    <input
      type="file"
      onChange={(e) =>
        setFiles({ ...files, [task.id]: e.target.files[0] })
      }
    />

    <div style={{ marginTop: "18px" }}>
      <button style={submitBtn} onClick={() => handleSubmit(task)}>
        Submit Assignment
      </button>
    </div>
  </>
)}
</div>

          </div>
        );
      })}
    </div>
  );
}

/* ================= STYLES ================= */
const pageStyle = { background: "#eafaf1", minHeight: "100vh" };
const pageHeader = { background: "#2ecc71", color: "#fff", padding: 18, textAlign: "center" };
const taskCard = { background: "#fff", margin: "25px auto", width: "90%", maxWidth: 850, borderRadius: 10 };
const taskHeader = { background: "#27ae60", color: "#fff", padding: 12 };
const taskBody = { padding: 16 };
const submitBtn = { background: "#27ae60", color: "#fff", padding: "8px 18px", border: "none" };
const viewBtn = { background: "#3498db", color: "#fff", padding: "6px 14px", border: "none", marginRight: 8 };
