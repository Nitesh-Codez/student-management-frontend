import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "https://student-management-system-4-hose.onrender.com";

const AdminStudyMaterial = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [file, setFile] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [message, setMessage] = useState("");

  // Fetch classes
  useEffect(() => {
    axios.get(`${API_URL}/api/students`).then((res) => {
      if (res.data.success) {
        const uniqueClasses = [...new Set(res.data.students.map((s) => s.class))];
        setClasses(uniqueClasses);
      }
    });
  }, []);

  // Fetch materials
  const fetchMaterials = async (cls) => {
    try {
      const res = await axios.get(`${API_URL}/api/study-material/${cls}`);
      if (res.data.success) setMaterials(res.data.materials);
    } catch (err) {
      console.error("Fetch failed:", err.message);
    }
  };

  useEffect(() => {
    if (selectedClass) fetchMaterials(selectedClass);
  }, [selectedClass]);

  // Upload handler
  const handleUpload = async () => {
    if (!title || !subject || !selectedClass || !file) {
      setMessage("❌ Please fill all fields");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("class_name", selectedClass);
      formData.append("subject", subject);
      formData.append("file", file);

      const res = await axios.post(
        `${API_URL}/api/study-material/upload`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (res.data.success) {
        setMessage("✅ Study material uploaded successfully");
        setTitle("");
        setSubject("");
        setFile(null);
        fetchMaterials(selectedClass);
      }
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || "❌ Upload failed");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h2 style={styles.heading}>📁 Upload Study Material</h2>

        <label style={styles.label}>Class</label>
        <select
          style={styles.input}
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          <option value="">Select Class</option>
          {classes.map((c, i) => (
            <option key={i} value={c}>{c}</option>
          ))}
        </select>

        <label style={styles.label}>Title</label>
        <input
          style={styles.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Chapter / Topic"
        />

       <label style={styles.label}>Subject</label>
<select
  style={styles.input}
  value={subject}
  onChange={(e) => setSubject(e.target.value)}
>
  <option value="">Select Subject</option>
  {["Hindi", "English", "Maths", "Geography", "Civics", "History", "Science"].map((sub, i) => (
    <option key={i} value={sub}>{sub}</option>
  ))}
</select>


        <label style={styles.label}>PDF File</label>
        <input
          style={styles.input}
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files[0])}
        />
        {file && <p style={styles.fileName}>📄 Selected File: <b>{file.name}</b></p>}

        <button style={styles.button} onClick={handleUpload}>⬆ Upload Material</button>
        {message && <p style={styles.msg}>{message}</p>}
      </div>

      {materials.length > 0 && (
        <div style={styles.list}>
          <h3>📚 Uploaded Materials</h3>
          {materials.map((m) => (
            <div key={m.id} style={styles.card}>
              <div>
                <b>{m.title}</b>
                <p style={styles.subText}>{m.subject} | Class {m.class_name}</p>
              </div>
              <div style={styles.btnGroup}>
                <a
                  href={m.file_path}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.link}
                >
                  👁 View
                </a>
                <a
                  href={`${m.file_path}?fl_attachment=true`}
                  style={styles.link}
                >
                  📥 Download
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ================= STYLES =================
const styles = {
  page: { minHeight: "100vh", background: "#f4f6fb", padding: "40px", fontFamily: "Poppins, sans-serif" },
  container: { maxWidth: "520px", margin: "auto", background: "#fff", padding: "25px", borderRadius: "14px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" },
  heading: { textAlign: "center", marginBottom: "20px" },
  label: { marginTop: "12px", fontWeight: "600", display: "block" },
  input: { width: "100%", padding: "11px", marginTop: "5px", borderRadius: "8px", border: "1px solid #ccc" },
  button: { width: "100%", marginTop: "20px", padding: "12px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer" },
  msg: { marginTop: "15px", textAlign: "center", fontWeight: "600" },
  fileName: { marginTop: "8px", fontSize: "14px", color: "#444" },
  list: { maxWidth: "700px", margin: "40px auto" },
  card: { background: "#fff", padding: "15px", marginBottom: "10px", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 10px rgba(0,0,0,0.08)" },
  subText: { fontSize: "13px", color: "#666" },
  btnGroup: { display: "flex", gap: "12px" },
  link: { color: "#4a90e2", fontWeight: "600", textDecoration: "none" },
};

export default AdminStudyMaterial;
