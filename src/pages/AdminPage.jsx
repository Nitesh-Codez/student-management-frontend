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

  // ✅ Fetch classes
  useEffect(() => {
    axios
      .get(CLASSES_API_URL)
      .then((res) => {
        if (res.data.success) {
          const fetchedClasses = res.data.classes;
          setClasses(fetchedClasses);

          const defaultSubjects = {};
          fetchedClasses.forEach((cls) => {
            defaultSubjects[cls.class] = [
              "Math",
              "English",
              "Hindi",
              "Science",
            ];
          });
          setSubjectsByClass(defaultSubjects);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  // ✅ Upload assignment
  const handleSubmit = async () => {
    if (!file || !className || !taskTitle || !subject || !deadline) {
      return alert("Please fill all fields");
    }

    // ✅ logged-in user
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return alert("User not logged in");

    const formData = new FormData();
    formData.append("file", file);

    // 🔥 IMPORTANT — backend + DB matching names
    formData.append("uploader_id", user.id);
    formData.append("uploader_role", user.role);
    formData.append("task_title", taskTitle);
    formData.append("subject", subject);
    formData.append("class", className);
    formData.append("deadline", deadline);

    try {
      const res = await axios.post(
        `${API_URL}/api/assignments/admin/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      alert(res.data.success ? "Assignment Uploaded!" : res.data.message);

      // reset
      setFile(null);
      setTaskTitle("");
      setSubject("");
      setClassName("");
      setDeadline("");
    } catch (err) {
      console.error("Upload error:", err.response?.data || err);
      alert(err.response?.data?.message || "Upload failed");
    }
  };

  return (
    <div style={{ padding: 40, minHeight: "100vh", background: "#f5f6fa" }}>
      <h2 style={{ textAlign: "center", marginBottom: 30 }}>
        Admin Task Upload
      </h2>

      <div style={formStyle}>
        <input
          placeholder="Task Title"
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
          style={inputStyle}
        />

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

        <input
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          style={inputStyle}
        />

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
};

const inputStyle = {
  padding: "12px",
  borderRadius: 8,
  border: "1px solid #ccc",
};

const buttonStyle = {
  padding: "14px",
  background: "#4a90e2",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
};
