import React, { useState, useEffect } from "react";
import axios from "axios";

const AdminStudyMaterial = () => {
  const API_URL = process.env.REACT_APP_API_URL;

  const [className, setClassName] = useState("");
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [file, setFile] = useState(null); // file object
  const [materials, setMaterials] = useState([]);

  const classes = [
    "L.K.G","U.K.G","1st","2nd","3rd","4th","5th",
    "6th","7th","8th","9th","10th","11th","12th"
  ];

  const subjects = ["Maths", "Science", "English", "Hindi", "Social Science"];

  const admin = JSON.parse(localStorage.getItem("user"));

  /* ========================
     FETCH ALL MATERIALS
  ======================== */
  const fetchMaterials = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/study-material/admin/all`);
      if (res.data.success) setMaterials(res.data.materials);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  /* ========================
     UPLOAD MATERIAL
  ======================== */
  const handleUpload = async () => {
    if (!className || !subject || !chapter || !file) {
      alert("All fields required");
      return;
    }

    const formData = new FormData();
    formData.append("className", className);
    formData.append("subject", subject);
    formData.append("chapter", chapter);
    formData.append("file", file); // file object
    formData.append("adminId", admin.id);

    try {
      await axios.post(`${API_URL}/api/study-material/admin/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      alert("Material Uploaded Successfully!");
      setChapter("");
      setFile(null);
      fetchMaterials();
    } catch (err) {
      console.error(err);
      alert("Upload Failed!");
    }
  };

  /* ========================
     DELETE MATERIAL
  ======================== */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this material?")) return;

    try {
      await axios.delete(`${API_URL}/api/study-material/admin/${id}`);
      fetchMaterials();
    } catch (err) {
      console.error(err);
      alert("Delete Failed!");
    }
  };

  return (
    <div style={styles.page}>
      <h2 style={styles.heading}>📤 Upload Study Material</h2>

      <div style={styles.form}>
        <select value={className} onChange={e => setClassName(e.target.value)}>
          <option value="">Select Class</option>
          {classes.map(c => <option key={c}>{c}</option>)}
        </select>

        <select value={subject} onChange={e => setSubject(e.target.value)}>
          <option value="">Select Subject</option>
          {subjects.map(s => <option key={s}>{s}</option>)}
        </select>

        <input
          placeholder="Chapter Name"
          value={chapter}
          onChange={e => setChapter(e.target.value)}
        />

        {/* 🔹 File Upload */}
        <input
          type="file"
          accept="application/pdf"
          onChange={e => setFile(e.target.files[0])}
        />

        <button onClick={handleUpload}>Upload</button>
      </div>

      <h3 style={{ marginTop: "40px" }}>📚 Uploaded Materials</h3>

      <table style={styles.table}>
        <thead>
          <tr>
            <th>Class</th>
            <th>Subject</th>
            <th>Chapter</th>
            <th>PDF</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {materials.map(m => (
            <tr key={m.id}>
              <td>{m.class}</td>
              <td>{m.subject}</td>
              <td>{m.chapter}</td>
              <td>
                {/* Download / View link */}
                <a href={m.fileUrl} target="_blank" rel="noopener noreferrer">View PDF</a>
              </td>
              <td>
                <button onClick={() => handleDelete(m.id)}>❌ Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const styles = {
  page: { padding: "30px" },
  heading: { fontSize: "28px", marginBottom: "20px" },
  form: {
    display: "grid",
    gap: "15px",
    maxWidth: "400px"
  },
  table: {
    width: "100%",
    marginTop: "20px",
    borderCollapse: "collapse"
  }
};

export default AdminStudyMaterial;
