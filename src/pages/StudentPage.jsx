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

  const user = JSON.parse(localStorage.getItem("user")) || {};
  const studentClass = user.class || "";
  const studentId = user.id || "";

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

  return (
    <div style={pageStyle}>
      {/* ===== PAGE HEADER ===== */}
      <div style={pageHeader}>
  <h2 style={{ margin: 0, color: "#221b2e" }}>
    Hello, <b>{user.name || "Student"}</b> 👋
  </h2>
  <p style={{ marginTop: 6, fontSize: 3, color: "#000000" }}>
    Check Your Task!
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
        tasks.map(task => (
          <div key={task.id} style={taskCard}>
            
            {/* ===== GREEN STRIP ===== */}
            <div style={taskHeader}>
              {task.task_title || "Untitled Task"}
            </div>

            {/* ===== CONTENT ===== */}
            <div style={taskBody}>
              <p><b>Subject:</b> {task.subject}</p>
              <p>
                <b>Deadline:</b>{" "}
                {task.deadline
                  ? new Date(task.deadline).toLocaleString()
                  : "No deadline"}
              </p>

              <p>
                <b>Status:</b>{" "}
                <span style={{
                  color: task.status === "SUBMITTED" ? "#2ecc71" : "#e74c3c",
                  fontWeight: "bold"
                }}>
                  {task.status}
                </span>
              </p>

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
        ))
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
  color: "white",
  padding: 18,
  textAlign: "center",
  fontSize: 22,
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
