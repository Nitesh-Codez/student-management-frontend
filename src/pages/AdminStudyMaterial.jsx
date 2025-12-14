import React, { useState, useEffect } from "react";
import axios from "axios";

const AdminStudyMaterial = () => {
  const API_URL = process.env.REACT_APP_API_URL;

  const [className, setClassName] = useState("");
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [file, setFile] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const admin = JSON.parse(localStorage.getItem("user"));

  // Predefined subjects for each class
  const subjectsByClass = {
    "1st": ["Maths", "English", "Hindi", "EVS"],
    "2nd": ["Maths", "English", "Hindi", "EVS"],
    "3rd": ["Maths", "English", "Hindi", "EVS"],
    "4th": ["Maths", "English", "Hindi", "Science", "Social Science"],
    "5th": ["Maths", "English", "Hindi", "Science", "Social Science"],
    "6th": ["Maths", "English", "Hindi", "Science", "Social Science"],
    "7th": ["Maths", "English", "Hindi", "Science", "Social Science"],
    "8th": ["Maths", "English", "Hindi", "Science", "Social Science"],
    "9th": ["Maths", "English", "Hindi", "Science", "S.S.T"],
    "10th": ["Maths", "English", "Hindi", "Science", "S.S.T"],
    "11th": ["Physics", "Chemistry", "Biology", "Maths", "English"],
    "12th": ["Physics", "Chemistry", "Biology", "Maths", "English"],
  };

  /* ========================
     FETCH ALL MATERIALS
  ======================== */
  const fetchMaterials = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/study-material/admin/materials`);
      if (res.data.success) setMaterials(res.data.materials);
    } catch (err) {
      console.error(err);
    }
  };

  /* ========================
     FETCH ALL CLASSES
  ======================== */
  const fetchClasses = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/students`);
      if (res.data.success) {
        const uniqueClasses = [...new Set(res.data.students.map(s => s.class))];
        setClasses(uniqueClasses);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMaterials();
    fetchClasses();
  }, []);

  useEffect(() => {
    if (className) setSubjects(subjectsByClass[className] || []);
    else setSubjects([]);
    setSubject(""); // reset selected subject when class changes
  }, [className]);

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
    formData.append("file", file);
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
          {classes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={subject} onChange={e => setSubject(e.target.value)}>
          <option value="">Select Subject</option>
          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <input
          placeholder="Chapter Name"
          value={chapter}
          onChange={e => setChapter(e.target.value)}
        />

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
  form: { display: "grid", gap: "15px", maxWidth: "400px" },
  table: { width: "100%", marginTop: "20px", borderCollapse: "collapse" }
};

export default AdminStudyMaterial;
