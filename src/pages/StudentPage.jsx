import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

/****************************
 * CONFIG
 ****************************/
const API_URL = "https://student-management-system-4-hose.onrender.com";
const ASSIGNMENTS_API = `${API_URL}/api/assignments/class`;
const SUBMIT_API = `${API_URL}/api/assignments/student/upload`;
const DELETE_API = `${API_URL}/api/assignments`;

/****************************
 * COMPONENT
 ****************************/
export default function StudentPage() {
  const [tasks, setTasks] = useState([]);
  const [files, setFiles] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const user = JSON.parse(localStorage.getItem("user")) || {};
  const studentClass = user.class || "";
  const studentId = user.id || "";

  /****************************
   * DATA
   ****************************/
  const fetchTasks = async () => {
    if (!studentClass || !studentId) return;
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(
        `${ASSIGNMENTS_API}/${studentClass}/${studentId}`
      );
      if (res.data?.success) setTasks(res.data.assignments || []);
      else setError("Failed to load assignments");
    } catch (e) {
      setError("Server error while fetching assignments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [studentClass, studentId]);

  /****************************
   * DERIVED STATE
   ****************************/
  const { totalTasks, completedTasks, progressPercent } = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "SUBMITTED").length;
    return {
      totalTasks: total,
      completedTasks: done,
      progressPercent: total === 0 ? 0 : Math.round((done / total) * 100),
    };
  }, [tasks]);

  /****************************
   * ACTIONS
   ****************************/
  const handleSubmit = async (task) => {
    const file = files[task.id];
    if (!file) return alert("Please select a file first");

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
      if (res.data?.success) {
        alert("Assignment submitted successfully");
        fetchTasks();
      } else {
        alert("Submission failed");
      }
    } catch {
      alert("Server error during submission");
    }
  };

  const handleDeleteSubmission = async (submissionId) => {
    if (!window.confirm("Remove your submission?")) return;
    try {
      await axios.delete(`${DELETE_API}/${submissionId}`);
      fetchTasks();
    } catch {
      alert("Delete failed");
    }
  };

  /****************************
   * HELPERS
   ****************************/
  const formatDateTime = (dateStr) =>
    dateStr ? new Date(dateStr).toLocaleString("en-IN", { hour12: false }) : "-";

  const renderRating = (rating) => {
    if (!rating) return <span className="badge pending">Grading Pending</span>;
    return (
      <div className="stars">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={i <= rating ? "on" : "off"}>★</span>
        ))}
      </div>
    );
  };

  /****************************
   * UI
   ****************************/
  return (
    <div className="page">
      <header className="header">
        <div>
          <h2>Welcome, {user.name || "Student"}</h2>
          <p className="muted">Manage and submit your assignments</p>
        </div>
        <div className="meta">
          <span className="pill">Class: {studentClass || "-"}</span>
          <span className="pill">Completed: {completedTasks}/{totalTasks}</span>
        </div>
      </header>

      <section className="progress">
        <div className="progress-info">
          <strong>Progress</strong>
          <span>{progressPercent}% {progressPercent === 100 && "✓"}</span>
        </div>
        <div className="bar">
          <div className="fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </section>

      {loading && <p className="center muted">Loading assignments…</p>}
      {error && <p className="center error">{error}</p>}

      <section className="grid">
        {tasks.map((task) => {
          const isSubmitted = task.status === "SUBMITTED";
          return (
            <article key={task.id} className="card">
              <div className="card-head">
                <h3>{task.task_title}</h3>
                <span className={`badge ${isSubmitted ? "success" : "danger"}`}>
                  {task.status}
                </span>
              </div>

              <div className="card-body">
                <div className="row">
                  <span className="label">Subject</span>
                  <span>{task.subject}</span>
                </div>
                <div className="row">
                  <span className="label">Deadline</span>
                  <span>{formatDateTime(task.deadline)}</span>
                </div>

                <div className="actions">
                  {task.task_file && (
                    <button
                      className="btn secondary"
                      onClick={() => window.open(task.task_file, "_blank")}
                    >
                      View Task
                    </button>
                  )}
                </div>

                {isSubmitted ? (
                  <>
                    <div className="row">
                      <span className="label">Submitted At</span>
                      <span>{formatDateTime(task.uploaded_at)}</span>
                    </div>

                    {task.student_file && (
                      <button
                        className="btn tertiary"
                        onClick={() => window.open(task.student_file, "_blank")}
                      >
                        View My Submission
                      </button>
                    )}

                    <div className="rating">{renderRating(task.rating)}</div>

                    <button
                      className="btn danger outline"
                      onClick={() => handleDeleteSubmission(task.student_submission_id)}
                    >
                      Remove Submission
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      type="file"
                      className="file"
                      onChange={(e) =>
                        setFiles({ ...files, [task.id]: e.target.files[0] })
                      }
                    />
                    <button className="btn primary" onClick={() => handleSubmit(task)}>
                      Submit Assignment
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </section>

      {/* ===== STYLES ===== */}
      <style>{`
        :root {
          --bg: #0b1220;
          --card: #111a2e;
          --muted: #9aa4bf;
          --text: #e6ebff;
          --primary: #4f7cff;
          --secondary: #2bd4bd;
          --danger: #ff6b6b;
          --success: #22c55e;
          --border: #1e2a4a;
        }
        * { box-sizing: border-box; }
        body { margin: 0; }
        .page {
          min-height: 100vh;
          background: radial-gradient(1200px 600px at 10% -10%, #16224a, transparent), var(--bg);
          color: var(--text);
          padding: 24px;
          font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        }
        .header {
          display: flex; justify-content: space-between; gap: 16px;
          background: linear-gradient(135deg, #1b2a6b, #1a3a8a);
          border: 1px solid var(--border);
          border-radius: 16px; padding: 20px; margin-bottom: 16px;
        }
        .header h2 { margin: 0 0 4px; }
        .muted { color: var(--muted); }
        .meta { display: flex; gap: 8px; align-items: center; }
        .pill {
          background: rgba(255,255,255,.08);
          border: 1px solid var(--border);
          padding: 6px 10px; border-radius: 999px; font-size: 12px;
        }
        .progress {
          background: var(--card); border: 1px solid var(--border);
          border-radius: 14px; padding: 14px; margin-bottom: 16px;
        }
        .progress-info { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .bar { height: 10px; background: #0e1730; border-radius: 999px; overflow: hidden; }
        .fill { height: 100%; background: linear-gradient(90deg, var(--primary), var(--secondary)); transition: width .4s ease; }
        .center { text-align: center; }
        .error { color: var(--danger); }
        .grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px;
        }
        .card {
          background: linear-gradient(180deg, #121b35, var(--card));
          border: 1px solid var(--border);
          border-radius: 18px; overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,.25);
        }
        .card-head {
          display: flex; justify-content: space-between; align-items: center;
          padding: 14px 16px; border-bottom: 1px solid var(--border);
        }
        .card-body { padding: 16px; }
        .row { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
        .label { color: var(--muted); }
        .actions { margin: 10px 0; }
        .btn {
          border-radius: 10px; padding: 10px 14px; border: 1px solid transparent;
          cursor: pointer; font-weight: 600; color: #fff; margin-right: 8px;
        }
        .btn.primary { background: var(--primary); }
        .btn.secondary { background: #355cff; }
        .btn.tertiary { background: #6b4eff; }
        .btn.danger { background: var(--danger); }
        .btn.outline { background: transparent; border-color: var(--danger); color: var(--danger); }
        .file { margin: 10px 0; }
        .badge {
          padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: 700;
        }
        .badge.success { background: rgba(34,197,94,.15); color: var(--success); }
        .badge.danger { background: rgba(255,107,107,.15); color: var(--danger); }
        .badge.pending { background: rgba(255,193,7,.15); color: #ffc107; }
        .stars { display: flex; gap: 4px; font-size: 22px; }
        .stars .on { color: #facc15; }
        .stars .off { color: #3b456b; }
        .rating { margin: 10px 0; }
      `}</style>
    </div>
  );
}
