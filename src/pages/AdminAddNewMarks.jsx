import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "https://student-management-system-4-hose.onrender.com";

const AdminAddNewMarks = () => {
  const subjectsByClass = {
    "5th": ["Math", "English", "Hindi", "EVS"],
    "6th": ["Math", "English", "Hindi", "Science"],
    "7th": ["Math", "English", "Hindi", "Science", "Civics", "Geography", "Economics", "History"],
    "8th": ["Math", "English", "Science", "Hindi", "Civics", "Geography", "Economics", "History"],
    "9th": ["Math", "English", "Hindi", "Science", "S.S.T"],
    "10th": ["Math", "English", "Hindi", "Science", "S.S.T"],
    "11th": ["Chemistry", "Math", "English", "Physics", "Biology"],
  };

  const [allStudents, setAllStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [subject, setSubject] = useState("");

  const [theoryMarks, setTheoryMarks] = useState("");
  const [vivaMarks, setVivaMarks] = useState("");
  const [attendanceMarks, setAttendanceMarks] = useState("");
  const [totalMarks, setTotalMarks] = useState("");

  const [testDate, setTestDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [message, setMessage] = useState("");

  // Fetch students
  useEffect(() => {
    axios.get(`${API_URL}/api/students`)
      .then((res) => {
        if (res.data.success) {
          setAllStudents(res.data.students);
          setClasses([...new Set(res.data.students.map(s => s.class))]);
        }
      })
      .catch(console.error);
  }, []);

  // Filter students by class
  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      return;
    }
    setStudents(allStudents.filter(s => s.class === selectedClass));
  }, [selectedClass, allStudents]);

  // Add marks
  const handleAddMarks = async () => {
    if (
      !selectedStudent ||
      !subject ||
      theoryMarks === "" ||
      vivaMarks === "" ||
      attendanceMarks === "" ||
      !totalMarks
    ) {
      setMessage("Please fill all fields");
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/api/marks/add`, {
        studentId: selectedStudent,
        subject,
        theoryMarks: Number(theoryMarks),
        vivaMarks: Number(vivaMarks),
        attendanceMarks: Number(attendanceMarks),
        totalMarks: Number(totalMarks),
        date: testDate,
      });

      if (res.data.success) {
        setMessage("Marks added successfully!");
        setSubject("");
        setTheoryMarks("");
        setVivaMarks("");
        setAttendanceMarks("");
        setTotalMarks("");
        setSelectedStudent("");
        setSelectedClass("");
      } else {
        setMessage(res.data.message || "Error occurred!");
      }
    } catch (err) {
      console.error(err);
      setMessage("Server error while adding marks");
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Add Marks (New System)</h2>

      <label style={styles.label}>Class</label>
      <select style={styles.input} value={selectedClass}
        onChange={(e) => setSelectedClass(e.target.value)}>
        <option value="">Select Class</option>
        {classes.map((c, i) => <option key={i} value={c}>{c}</option>)}
      </select>

      <label style={styles.label}>Student</label>
      <select style={styles.input} value={selectedStudent}
        onChange={(e) => setSelectedStudent(e.target.value)}>
        <option value="">Select Student</option>
        {students.map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      <label style={styles.label}>Subject</label>
      <select style={styles.input} value={subject}
        onChange={(e) => setSubject(e.target.value)}>
        <option value="">Select Subject</option>
        {subjectsByClass[selectedClass]?.map((sub, i) => (
          <option key={i} value={sub}>{sub}</option>
        ))}
      </select>

      <label style={styles.label}>Theory Marks</label>
      <input style={styles.input} type="number"
        value={theoryMarks} onChange={(e) => setTheoryMarks(e.target.value)} />

      <label style={styles.label}>Viva Marks</label>
      <input style={styles.input} type="number"
        value={vivaMarks} onChange={(e) => setVivaMarks(e.target.value)} />

      <label style={styles.label}>Attendance Marks</label>
      <input style={styles.input} type="number"
        value={attendanceMarks} onChange={(e) => setAttendanceMarks(e.target.value)} />

      <label style={styles.label}>Total Marks</label>
      <input style={styles.input} type="number"
        value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} />

      <label style={styles.label}>Date</label>
      <input style={styles.input} type="date"
        value={testDate} onChange={(e) => setTestDate(e.target.value)} />

      <button style={styles.button} onClick={handleAddMarks}>
        Add Marks
      </button>

      {message && <p style={styles.msg}>{message}</p>}
    </div>
  );
};

// styles (same)
const styles = {
  container: {
    maxWidth: "520px",
    margin: "40px auto",
    padding: "25px",
    background: "#fff",
    borderRadius: "15px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
  },
  heading: { textAlign: "center", marginBottom: "20px" },
  label: { marginTop: "10px", fontWeight: "600", display: "block" },
  input: {
    width: "100%", padding: "10px", marginTop: "5px",
    borderRadius: "8px", border: "1px solid #ccc"
  },
  button: {
    marginTop: "18px", width: "100%", padding: "12px",
    background: "#4a90e2", color: "#fff",
    border: "none", borderRadius: "8px",
    fontWeight: "600", cursor: "pointer"
  },
  msg: {
    marginTop: "15px", textAlign: "center",
    background: "#eef3ff", padding: "10px",
    borderRadius: "8px"
  }
};

export default AdminAddNewMarks;
