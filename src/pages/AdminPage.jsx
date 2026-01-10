import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "https://student-management-system-4-hose.onrender.com";
const CLASSES_API_URL = `${API_URL}/api/new-marks/classes`;

export default function AdminPage() {
  // ================= UPLOAD STATES =================
  const [file, setFile] = useState(null);
  const [uploadClass, setUploadClass] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [deadline, setDeadline] = useState("");

  // ================= VIEW STATES =================
  const [viewClass, setViewClass] = useState("");
  const [taskSubmissions, setTaskSubmissions] = useState({});

  // ================= COMMON =================
  const [classes, setClasses] = useState([]);
  const [subjectsByClass, setSubjectsByClass] = useState({});

  // ================= FETCH CLASSES =================
  useEffect(() => {
    axios.get(CLASSES_API_URL)
      .then(res => {
        if (res.data.success) {
          setClasses(res.data.classes);
          const map = {};
          res.data.classes.forEach(c => {
            map[c.class] = ["Math", "English", "Hindi", "Science"];
          });
          setSubjectsByClass(map);
        }
      })
      .catch(err => console.error(err));
  }, []);

  // ================= FETCH TASKS + SUBMISSIONS =================
  useEffect(() => {
    if (!viewClass) {
      setTaskSubmissions({});
      return;
    }

    const fetchAll = async () => {
      try {
        const taskRes = await axios.get(
          `${API_URL}/api/assignments/admin/tasks/${viewClass}`
        );

        if (!taskRes.data.success) return;

        const tasks = taskRes.data.tasks.map(t => t.task_title);
        const result = {};

        for (let task of tasks) {
          const subRes = await axios.get(
            `${API_URL}/api/assignments/admin/submissions/${encodeURIComponent(task)}`
          );
          result[task] = subRes.data.success ? subRes.data.submissions : [];
        }

        setTaskSubmissions(result);
      } catch (err) {
        console.error(err);
      }
    };

    fetchAll();
  }, [viewClass]);

  // ================= UPLOAD =================
  const handleSubmit = async () => {
    if (!file || !uploadClass || !taskTitle || !subject || !deadline)
      return alert("Please fill all fields");

    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return alert("User not logged in");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("uploader_id", user.id);
    formData.append("uploader_role", user.role);
    formData.append("task_title", taskTitle);
    formData.append("subject", subject);
    formData.append("class", uploadClass);
    formData.append("deadline", deadline);

    try {
      const res = await axios.post(
        `${API_URL}/api/assignments/admin/upload`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      alert(res.data.success ? "Assignment Uploaded!" : res.data.message);

      setFile(null);
      setTaskTitle("");
      setSubject("");
      setUploadClass("");
      setDeadline("");

    } catch (err) {
      console.error(err);
      alert("Upload failed");
    }
  };

  // ================= RENDER =================
  return (
    <div style={{ padding: 40, minHeight: "100vh", background: "#f5f6fa" }}>

      {/* ================= UPLOAD ================= */}
      <h2 style={{ textAlign: "center" }}>Admin Task Upload</h2>

      <div style={formStyle}>
        <input
          placeholder="Task Title"
          value={taskTitle}
          onChange={e => setTaskTitle(e.target.value)}
          style={inputStyle}
        />

        <select
          value={uploadClass}
          onChange={e => setUploadClass(e.target.value)}
          style={inputStyle}
        >
          <option value="">Select Class</option>
          {classes.map(c => (
            <option key={c.class} value={c.class}>{c.class}</option>
          ))}
        </select>

        <select
          value={subject}
          onChange={e => setSubject(e.target.value)}
          style={inputStyle}
          disabled={!uploadClass}
        >
          <option value="">Select Subject</option>
          {subjectsByClass[uploadClass]?.map((s, i) => (
            <option key={i} value={s}>{s}</option>
          ))}
        </select>

        <input
          type="datetime-local"
          value={deadline}
          onChange={e => setDeadline(e.target.value)}
          style={inputStyle}
        />

        <input
          type="file"
          onChange={e => setFile(e.target.files[0])}
          style={inputStyle}
        />

        <button onClick={handleSubmit} style={buttonStyle}>
          Upload Task
        </button>
      </div>

      {/* ================= VIEW ================= */}
      <hr style={{ margin: "60px 0" }} />

      <h3>View Submissions</h3>

      <select
        value={viewClass}
        onChange={e => setViewClass(e.target.value)}
        style={inputStyle}
      >
        <option value="">Select Class</option>
        {classes.map(c => (
          <option key={c.class} value={c.class}>{c.class}</option>
        ))}
      </select>

      {!viewClass ? (
        <p style={{ marginTop: 20 }}>Select class to view submissions</p>
      ) : (
        Object.entries(taskSubmissions).map(([task, subs]) => (
          <div key={task} style={{ marginTop: 30 }}>
            <h4 style={{ color: "#4a90e2" }}>{task}</h4>

            {subs.length === 0 ? (
              <p>No submissions</p>
            ) : (
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={{ ...thTdStyle, backgroundColor: "green", color: "white" }}>
  Student
</th>
                    <th style={{ ...thTdStyle, backgroundColor: "green", color: "white" }}>Subject</th>
                    <th style={{ ...thTdStyle, backgroundColor: "green", color: "white" }}>Uploaded Time</th>
                    <th style={{ ...thTdStyle, backgroundColor: "green", color: "white" }}>Deadline</th>
                    <th style={{ ...thTdStyle, backgroundColor: "green", color: "white" }}>Status</th>
                    <th style={{ ...thTdStyle, backgroundColor: "green", color: "white" }}>File</th>
                  </tr>
                </thead>

                <tbody>
                  {subs.map(s => {
                    const uploadedAt = new Date(s.uploaded_at);
                    const dl = s.deadline ? new Date(s.deadline) : null;
                    const isLate = dl && uploadedAt > dl;

                    return (
                      <tr key={s.id}>
                        <td style={thTdStyle}>{s.student_name}</td>
                        <td style={thTdStyle}>{s.subject}</td>
                        <td style={thTdStyle}>{uploadedAt.toLocaleString()}</td>
                        <td style={thTdStyle}>{dl ? dl.toLocaleString() : "-"}</td>
                        <td
                          style={{
                            ...thTdStyle,
                            color: isLate ? "red" : "green",
                            fontWeight: "bold"
                          }}
                        >
                          {isLate ? "LATE" : "ON TIME"}
                        </td>
                        <td style={thTdStyle}>
                          <a href={s.file_path} target="_blank" rel="noreferrer">
                            View
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ================= STYLES =================
const formStyle = {
  maxWidth: "700px",
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: 15,
  background: "#fff",
  padding: 30,
  borderRadius: 12
};

const inputStyle = {
  padding: "12px",
  borderRadius: 8,
  border: "1px solid #ccc",
  marginTop: 10
};

const buttonStyle = {
  padding: "14px",
  background: "#4a90e2",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  cursor: "pointer"
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: 15,
  background: "#fff"
};

const thTdStyle = {
  border: "1px solid #ddd",
  padding: "10px",
  textAlign: "left"
};
