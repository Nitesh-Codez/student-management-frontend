import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "https://student-management-system-4-hose.onrender.com";
const TASKS_API_URL = `${API_URL}/api/assignments/class`; 
// backend: GET /api/assignments/class/:className

export default function StudentPage({ studentId, studentClass }) {
  const [tasks, setTasks] = useState([]);
  const [file, setFile] = useState(null);
  const [newTaskAlert, setNewTaskAlert] = useState(false);

  // ================= FETCH TASKS =================
  useEffect(() => {
    if (!studentClass) return;

    let previousIds = [];

    const fetchTasks = async () => {
      try {
        const res = await axios.get(`${TASKS_API_URL}/${studentClass}`);

        if (res.data.success) {
          const currentTasks = res.data.assignments;
          setTasks(currentTasks);

          // 🔔 new task detection
          const currentIds = currentTasks.map((t) => t.id);
          const newOnes = currentIds.filter((id) => !previousIds.includes(id));
          if (newOnes.length > 0) setNewTaskAlert(true);

          previousIds = currentIds;
        }
      } catch (err) {
        console.error("Fetch error:", err);
      }
    };

    fetchTasks();
    const interval = setInterval(fetchTasks, 15000);
    return () => clearInterval(interval);
  }, [studentClass]);

  // ================= SUBMIT ASSIGNMENT =================
  const handleSubmit = async (task) => {
    if (!file) return alert("Select a file first");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("uploader_id", studentId);
    formData.append("uploader_role", "student");
    formData.append("student_id", studentId);
    formData.append("class", studentClass); // ✅ backend expects "class"

    try {
      const res = await axios.post(
        `${API_URL}/api/assignments/admin/upload`,
        formData
      );

      alert(res.data.success ? "Assignment Submitted!" : res.data.message);
      setFile(null);

      // local status update
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, status: "SUBMITTED" } : t
        )
      );
    } catch (err) {
      console.error("Submit error:", err);
      alert("Submission failed");
    }
  };

  // ================= UI =================
  return (
    <div style={pageStyle}>
      <h2 style={{ textAlign: "center", marginBottom: 30 }}>Assignments</h2>

      {newTaskAlert && <div style={alertStyle}>📢 New Assignment Uploaded!</div>}

      {tasks.length === 0 ? (
        <div style={{ textAlign: "center", marginTop: 50, fontSize: 18 }}>
          No assignment available.
        </div>
      ) : (
        tasks.map((task) => (
          <div key={task.id} style={taskStyle}>
            <div>
              <strong>{task.task_title || "Assignment"}</strong><br />
              Subject: {task.subject || "—"} <br />
              Deadline:{" "}
              {task.deadline
                ? new Date(task.deadline).toLocaleString()
                : "No deadline"}
              <br />
              Status: <b>{task.status || "NOT SUBMITTED"}</b>
            </div>

            <div>
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => setFile(e.target.files[0])}
              />
              <br />
              <button
                onClick={() => handleSubmit(task)}
                style={buttonStyle}
              >
                Submit
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ================= STYLES =================
const pageStyle = {
  padding: 40,
  fontFamily: "Poppins, sans-serif",
  minHeight: "100vh",
  background: "#f5f6fa",
};

const taskStyle = {
  padding: 15,
  border: "1px solid #ddd",
  borderRadius: 8,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 15,
  background: "#fff",
};

const alertStyle = {
  padding: 10,
  background: "#ffecb3",
  color: "#856404",
  borderRadius: 6,
  marginBottom: 20,
  fontWeight: 600,
};

const buttonStyle = {
  padding: "8px 16px",
  marginTop: 8,
  background: "#4a90e2",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};
