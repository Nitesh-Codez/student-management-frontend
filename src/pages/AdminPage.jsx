import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "https://student-management-system-4-hose.onrender.com";
const CLASSES_API_URL = `${API_URL}/api/new-marks/classes`;

export default function AdminPage() {
  const [file, setFile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [className, setClassName] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [subjectsByClass, setSubjectsByClass] = useState({});
  const [deadline, setDeadline] = useState("");

  // Fetch classes dynamically from API
  useEffect(() => {
    axios
      .get(CLASSES_API_URL)
      .then((res) => {
        if (res.data.success) {
          const fetchedClasses = res.data.classes; // array of objects
          setClasses(fetchedClasses);

          // Optional: map subjects for each class
          const defaultSubjects = {};
          fetchedClasses.forEach((cls) => {
            defaultSubjects[cls.class] = ["Math", "English", "Hindi", "Science"];
          });
          setSubjectsByClass(defaultSubjects);
        }
      })
      .catch((err) => console.error("Error fetching classes:", err));
  }, []);

  const handleSubmit = async () => {
    if (!file || !className || !taskTitle || !subject || !deadline) {
      return alert("Please fill all fields");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("uploader_id", 1); // Admin id
    formData.append("uploader_role", "admin");
    formData.append("task_title", taskTitle);
    formData.append("subject", subject);
    formData.append("class_name", className);
    formData.append("deadline", deadline);

    try {
      const res = await axios.post(`${API_URL}/api/assignments/admin/upload`, formData);
      alert(res.data.success ? "Uploaded!" : res.data.message);

      // Reset form
      setFile(null);
      setTaskTitle("");
      setSubject("");
      setClassName("");
      setDeadline("");
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed");
    }
  };

  return (
    <div
      style={{
        padding: 40,
        fontFamily: "Poppins, sans-serif",
        minHeight: "100vh",
        background: "#f5f6fa",
      }}
    >
      <h2 style={{ textAlign: "center", marginBottom: 30 }}>Admin Task Upload</h2>

      <div style={formStyle}>
        <label>Task Title</label>
        <input
          type="text"
          placeholder="Task Title"
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
          style={inputStyle}
        />

        <label>Class</label>
        <select
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          style={inputStyle}
        >
          <option value="">Select Class</option>
          {classes.map((c, i) => (
            <option key={i} value={c.class}>
              {c.class}
            </option>
          ))}
        </select>

        <label>Subject</label>
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          style={inputStyle}
          disabled={!className}
        >
          <option value="">Select Subject</option>
          {subjectsByClass[className]?.map((sub, i) => (
            <option key={i} value={sub}>
              {sub}
            </option>
          ))}
        </select>

        <label>Deadline</label>
        <input
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          style={inputStyle}
        />

        <label>File</label>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          style={inputStyle}
        />

        <button onClick={handleSubmit} style={buttonStyle}>
          Upload
        </button>
      </div>
    </div>
  );
}

const formStyle = {
  maxWidth: "700px",
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: 15,
  background: "#fff",
  padding: 30,
  borderRadius: 12,
  boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: 8,
  border: "1px solid #ccc",
  fontSize: 15,
};

const buttonStyle = {
  width: "100%",
  padding: "14px",
  background: "#4a90e2",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: 16,
  fontWeight: 600,
  cursor: "pointer",
};
