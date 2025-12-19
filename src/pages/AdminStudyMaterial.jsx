import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "https://student-management-system-4-hose.onrender.com";

const AdminStudyMaterial = () => {
  const [allStudents, setAllStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [file, setFile] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [message, setMessage] = useState("");

  // ================= STYLES =================
  const styles = {
    container: {
      maxWidth: "550px",
      margin: "40px auto",
      padding: "25px",
      background: "#fff",
      borderRadius: "15px",
      boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
      fontFamily: "Poppins, sans-serif",
    },
    heading: {
      textAlign: "center",
      marginBottom: "20px",
      color: "#333",
    },
    label: {
      display: "block",
      marginTop: "12px",
      marginBottom: "5px",
      fontWeight: "600",
    },
    input: {
      width: "100%",
      padding: "12px",
      border: "1px solid #ccc",
      borderRadius: "8px",
      fontSize: "15px",
    },
    button: {
      width: "100%",
      padding: "12px",
      background: "#4a90e2",
      border: "none",
      color: "white",
      marginTop: "18px",
      fontSize: "16px",
      borderRadius: "8px",
      cursor: "pointer",
      fontWeight: "600",
    },
    msg: {
      marginTop: "15px",
      padding: "10px",
      textAlign: "center",
      borderRadius: "8px",
      background: "#f0f4ff",
      color: "#3551c9",
      fontWeight: "600",
    },
    material: {
      padding: "10px",
      borderBottom: "1px solid #ddd",
    },
    link: {
      color: "#4a90e2",
      textDecoration: "none",
      fontWeight: "600",
    },
  };

  // ================= FETCH CLASSES =================
  useEffect(() => {
    axios
      .get(`${API_URL}/api/students`)
      .then((res) => {
        if (res.data.success) {
          setAllStudents(res.data.students);
          const uniqueClasses = [
            ...new Set(res.data.students.map((s) => s.class)),
          ];
          setClasses(uniqueClasses);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  // ================= FETCH MATERIAL BY CLASS =================
  useEffect(() => {
    if (!selectedClass) {
      setMaterials([]);
      return;
    }

    axios
      .get(`${API_URL}/api/study-material/${selectedClass}`)
      .then((res) => {
        if (res.data.success) {
          setMaterials(res.data.materials);
        }
      })
      .catch((err) => console.error(err));
  }, [selectedClass]);

  // ================= UPLOAD HANDLER =================
  const handleUpload = async () => {
    if (!title || !subject || !selectedClass || !file) {
      setMessage("Please fill all fields and select PDF");
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
        setMessage("Study material uploaded successfully!");
        setTitle("");
        setSubject("");
        setFile(null);

        // refresh list
        const refreshed = await axios.get(
          `${API_URL}/api/study-material/${selectedClass}`
        );
        setMaterials(refreshed.data.materials);
      }
    } catch (err) {
      console.error(err);
      setMessage("Error uploading study material");
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Upload Study Material</h2>

      <label style={styles.label}>Class</label>
      <select
        style={styles.input}
        value={selectedClass}
        onChange={(e) => setSelectedClass(e.target.value)}
      >
        <option value="">Select Class</option>
        {classes.map((c, i) => (
          <option key={i} value={c}>
            {c}
          </option>
        ))}
      </select>

      <label style={styles.label}>Title</label>
      <input
        style={styles.input}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Chapter / Topic name"
      />

      <label style={styles.label}>Subject</label>
      <input
        style={styles.input}
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject name"
      />

      <label style={styles.label}>PDF File</label>
      <input
        style={styles.input}
        type="file"
        accept="application/pdf"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <button style={styles.button} onClick={handleUpload}>
        Upload Material
      </button>

      {message && <p style={styles.msg}>{message}</p>}

      {materials.length > 0 && (
        <>
          <h3 style={{ marginTop: "25px" }}>Uploaded Materials</h3>
          {materials.map((m) => (
            <div key={m.id} style={styles.material}>
              <p>
                <strong>{m.title}</strong> ({m.subject})
              </p>
              <a
                href={`${API_URL}/${m.file_path}`}
                target="_blank"
                rel="noreferrer"
                style={styles.link}
              >
                View / Download PDF
              </a>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default AdminStudyMaterial;
