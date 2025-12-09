import React, { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "https://student-management-system-4-hose.onrender.com";

const HomeworkAdmin = () => {
  const [allStudents, setAllStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [homeworkList, setHomeworkList] = useState([]);
  const [title, setTitle] = useState("");
  const [dateAssigned, setDateAssigned] = useState(new Date().toISOString().split("T")[0]);
  const [message, setMessage] = useState("");

  const styles = {
    container: { maxWidth: "500px", margin: "40px auto", padding: "25px", background: "#fff", borderRadius: "15px", boxShadow: "0 8px 20px rgba(0,0,0,0.15)", fontFamily: "Poppins, sans-serif" },
    heading: { textAlign: "center", marginBottom: "20px", color: "#333" },
    label: { display: "block", marginTop: "12px", marginBottom: "5px", fontWeight: "600" },
    input: { width: "100%", padding: "12px", border: "1px solid #ccc", borderRadius: "8px", fontSize: "15px", marginBottom: "5px" },
    button: { width: "100%", padding: "12px", background: "#1ABC9C", border: "none", color: "white", marginTop: "18px", fontSize: "16px", borderRadius: "8px", cursor: "pointer", fontWeight: "600" },
    msg: { marginTop: "15px", padding: "10px", textAlign: "center", borderRadius: "8px", background: "#f0f4ff", color: "#3551c9", fontWeight: "600" },
    card: { background: "#f5f5f5", padding: "15px", marginBottom: "15px", borderRadius: "10px" },
    listItem: { cursor: "pointer", marginBottom: "5px" }
  };

  // Fetch all students + classes
  useEffect(() => {
    axios.get(`${API_URL}/api/students`)
      .then(res => {
        if (res.data.success) {
          setAllStudents(res.data.students);
          const uniqueClasses = [...new Set(res.data.students.map(s => s.class))];
          setClasses(uniqueClasses);
        }
      })
      .catch(err => console.error(err));
  }, []);

  // Filter students by selected class
  useEffect(() => {
    if (!selectedClass) return setStudents([]);
    setStudents(allStudents.filter(s => s.class === selectedClass));
    fetchHomework(selectedClass);
  }, [selectedClass, allStudents]);

  // Fetch homework list by class
  const fetchHomework = (cls) => {
    axios.get(`${API_URL}/homework/${cls}`)
      .then(res => res.data.success && setHomeworkList(res.data.homework))
      .catch(err => console.error(err));
  };

  // Add homework
  const addHomework = () => {
    if (!title || !selectedClass || !dateAssigned) return alert("Enter all fields");
    axios.post(`${API_URL}/homework/add`, { title, class: selectedClass, date_assigned: dateAssigned })
      .then(res => {
        if (res.data.success) {
          fetchHomework(selectedClass);
          setTitle("");
          setDateAssigned(new Date().toISOString().split("T")[0]);
          setMessage("Homework added successfully!");
        }
      })
      .catch(err => console.error(err));
  };

  // Toggle homework status
  const toggleStatus = (hwId, currentStatus) => {
    const newStatus = currentStatus === "done" ? "not done" : "done";
    axios.patch(`${API_URL}/homework/status`, { homeworkId: hwId, status: newStatus })
      .then(res => res.data.success && fetchHomework(selectedClass))
      .catch(err => console.error(err));
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Admin Homework Upload</h2>

      {/* Class + Student + Title + Date */}
      <label style={styles.label}>Class</label>
      <select style={styles.input} value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
        <option value="">Select Class</option>
        {classes.map((c, i) => <option key={i} value={c}>{c}</option>)}
      </select>

      <label style={styles.label}>Student (Optional)</label>
      <select style={styles.input} value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
        <option value="">All Students</option>
        {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      <label style={styles.label}>Homework Title</label>
      <input style={styles.input} type="text" value={title} onChange={e => setTitle(e.target.value)} />

      <label style={styles.label}>Date Assigned</label>
      <input style={styles.input} type="date" value={dateAssigned} onChange={e => setDateAssigned(e.target.value)} />

      <button style={styles.button} onClick={addHomework}>Add Homework</button>
      {message && <p style={styles.msg}>{message}</p>}

      {/* Homework List */}
      {homeworkList.map((hw, idx) => (
        <div key={idx} style={styles.card}>
          <h3>{hw.title} - {hw.date_assigned}</h3>
          <ul>
            <li style={styles.listItem} onClick={() => toggleStatus(hw.id, hw.status)}>
              {hw.student_name} - <b style={{ color: hw.status === "done" ? "green" : "red" }}>{hw.status.toUpperCase()}</b>
            </li>
          </ul>
        </div>
      ))}
    </div>
  );
};

export default HomeworkAdmin;
