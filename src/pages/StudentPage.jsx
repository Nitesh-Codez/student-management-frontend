import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "https://student-management-system-4-hose.onrender.com";
const TASKS_API_URL = `${API_URL}/api/assignments/student/tasks`;

export default function StudentPage({ studentId, studentClass }) {
  const [tasks, setTasks] = useState([]);
  const [file, setFile] = useState(null);
  const [newTaskAlert, setNewTaskAlert] = useState(false);

  // Fetch tasks for student's class
  useEffect(() => {
    if (!studentClass) return;

    let previousTasks = tasks.map((t) => t._id);

    const fetchTasks = () => {
      axios
        .get(`${TASKS_API_URL}?class_name=${studentClass}`)
        .then((res) => {
          if (res.data.success) {
            const currentTasks = res.data.tasks;
            setTasks(currentTasks);

            // Check for new tasks
            const currentIds = currentTasks.map((t) => t._id);
            const newTasks = currentIds.filter((id) => !previousTasks.includes(id));
            if (newTasks.length > 0) setNewTaskAlert(true);

            previousTasks = currentIds;
          }
        })
        .catch((err) => console.error(err));
    };

    fetchTasks();
    const interval = setInterval(fetchTasks, 15000); // Poll every 15 sec
    return () => clearInterval(interval);
  }, [studentClass, tasks]);

  const handleSubmit = async (taskId) => {
    if (!file) return alert("Select a file first");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("uploader_id", studentId);
    formData.append("uploader_role", "student");
    formData.append("student_id", studentId);
    formData.append("class_name", studentClass);
    formData.append("task_id", taskId);

    try {
      const res = await axios.post(`${API_URL}/api/assignments/student/upload`, formData);
      alert(res.data.success ? "Submitted!" : res.data.message);
      setFile(null);

      // Update task status locally
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: "Submitted" } : t))
      );
    } catch (err) {
      console.error(err);
      alert("Submission failed");
    }
  };

  return (
    <div style={{ padding: 40, fontFamily: "Poppins, sans-serif", minHeight: "100vh", background: "#f5f6fa" }}>
      <h2 style={{ textAlign: "center", marginBottom: 30 }}>Assignments</h2>

      {newTaskAlert && <div style={alertStyle}>New Task Uploaded!</div>}

      {tasks.length === 0 ? (
        <div style={{ textAlign: "center", marginTop: 50, fontSize: 18 }}>No task has been given yet.</div>
      ) : (
        tasks.map((task) => (
          <div key={task._id} style={taskStyle}>
            <div>
              <strong>{task.task_title}</strong> ({task.subject})<br/>
              Deadline: {new Date(task.deadline).toLocaleString()}<br/>
              Status: {task.status || "Not Submitted"}
            </div>
            <div>
              <input
                type="file"
                accept="image/*,.pdf"
                capture="environment"
                onChange={(e) => setFile(e.target.files[0])}
              />
              <button onClick={() => handleSubmit(task._id)} style={buttonStyle}>Submit</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// Styles
const taskStyle = { padding: 15, border: "1px solid #ddd", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 };
const alertStyle = { padding: 10, background: "#ffecb3", color: "#856404", borderRadius: 6, marginBottom: 20, fontWeight: 600 };
const buttonStyle = { padding: "10px 16px", marginTop: 5, background: "#4a90e2", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" };
