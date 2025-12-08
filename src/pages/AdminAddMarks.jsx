import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "https://student-management-system-4-hose.onrender.com";

const AdminAddMarks = () => {
  const subjectsByClass = {
    "5th": ["Math", "English","Hindi", "EVS"],
    "6th": ["Math", "English","Hindi", "Science"],
    "7th": ["Math", "English","Hindi", "Science", "Civics","Geography", "Economics","History"],
    "8th": ["Math", "English","Science","Hindi", "Civics","Geography", "Economics","History"],
    "9th": ["Math", "English","Hindi", "Science","S.S.T"],
    "10th": ["Math", "English", "Hindi", "Science","S.S.T"],
    "11th": ["Chemistry", "Math", "English"],
  };

  const [allStudents, setAllStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [subject, setSubject] = useState("");
  const [marks, setMarks] = useState("");
  const [maxMarks, setMaxMarks] = useState("");
  const [testDate, setTestDate] = useState(new Date().toISOString().split("T")[0]);
  const [message, setMessage] = useState("");

  // STYLES INLINE
  const styles = {
    container: {
      maxWidth: "500px",
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
      marginBottom: "5px",
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
  };

  useEffect(() => {
    axios.get(`${API_URL}/api/students`)
      .then((res) => {
        if (res.data.success) {
          setAllStudents(res.data.students);
          const uniqueClasses = [...new Set(res.data.students.map((s) => s.class))];
          setClasses(uniqueClasses);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      setSubject("");
      return;
    }
    const filtered = allStudents.filter((s) => s.class === selectedClass);
    setStudents(filtered);
    setSubject("");
  }, [selectedClass, allStudents]);

  const handleAddMarks = async () => {
    if (!selectedStudent || !subject || !marks || !maxMarks) {
      setMessage("Please fill all fields");
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/api/marks/add`, {
        studentId: selectedStudent,
        subject,
        marks: parseInt(marks),
        maxMarks: parseInt(maxMarks),
        date: testDate,
      });

      if (res.data.success) {
        setMessage("Marks added successfully!");
        setSubject("");
        setMarks("");
        setMaxMarks("");
        setSelectedStudent("");
        setSelectedClass("");
      } else {
        setMessage(res.data.message || "Error occurred!");
      }
    } catch (err) {
      console.error(err);
      setMessage("Server Error while adding marks");
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Add Marks</h2>

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

      <label style={styles.label}>Student</label>
      <select
        style={styles.input}
        value={selectedStudent}
        onChange={(e) => setSelectedStudent(e.target.value)}
      >
        <option value="">Select Student</option>
        {students.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      <label style={styles.label}>Subject</label>
      <select
        style={styles.input}
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      >
        <option value="">Select Subject</option>
        {subjectsByClass[selectedClass]?.map((sub, i) => (
          <option key={i} value={sub}>{sub}</option>
        ))}
      </select>

      <label style={styles.label}>Marks</label>
      <input
        style={styles.input}
        type="number"
        value={marks}
        onChange={(e) => setMarks(e.target.value)}
      />

      <label style={styles.label}>Total Marks</label>
      <input
        style={styles.input}
        type="number"
        value={maxMarks}
        onChange={(e) => setMaxMarks(e.target.value)}
      />

      <label style={styles.label}>Date</label>
      <input
        style={styles.input}
        type="date"
        value={testDate}
        onChange={(e) => setTestDate(e.target.value)}
      />

      <button style={styles.button} onClick={handleAddMarks}>Add Marks</button>

      {message && <p style={styles.msg}>{message}</p>}
    </div>
  );
};

export default AdminAddMarks;
