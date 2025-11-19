// src/pages/AdminAddMarks.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

const AdminAddMarks = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [subject, setSubject] = useState("");
  const [marks, setMarks] = useState("");
  const [maxMarks, setMaxMarks] = useState("");
  const [testDate, setTestDate] = useState(new Date().toISOString().split("T")[0]); // default today
  const [message, setMessage] = useState("");

  // Fetch classes
  useEffect(() => {
    axios
      .get("http://student-management-system-32lc.onrender.com/api/marks/admin/classes")
      .then((res) => {
        if (res.data.success) setClasses(res.data.classes);
      })
      .catch((err) => console.log(err));
  }, []);

  // Fetch students based on selected class
  useEffect(() => {
    if (!selectedClass) return;
    const encodedClass = encodeURIComponent(selectedClass);

    axios
      .get(`http://localhost:5000/api/marks/admin/students/${encodedClass}`)
      .then((res) => {
        if (res.data.success) setStudents(res.data.students);
        else setStudents([]);
      })
      .catch(() => setStudents([]));
  }, [selectedClass]);

  const handleAddMarks = () => {
    if (!selectedStudent || !subject || !marks || !maxMarks || !testDate) {
      setMessage("Please fill all fields");
      return;
    }

    axios
      .post("http://localhost:5000/api/marks/admin/add", {
        studentId: selectedStudent,
        subject,
        marks,
        maxMarks,
        date: testDate,
      })
      .then((res) => {
        if (res.data.success) {
          setMessage("Marks added successfully!");
          // Clear inputs
          setSelectedClass("");
          setSelectedStudent("");
          setSubject("");
          setMarks("");
          setMaxMarks("");
          setTestDate(new Date().toISOString().split("T")[0]);
          setStudents([]);
        } else {
          setMessage(res.data.message);
        }
      })
      .catch(() => setMessage("Something went wrong"));
  };

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "#f5f7fa",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "500px",
          background: "#fff",
          padding: "30px",
          borderRadius: "16px",
          boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
          border: "1px solid #ddd",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            fontSize: "26px",
            marginBottom: "25px",
            fontWeight: "700",
            color: "#222",
          }}
        >
          Add Marks
        </h2>

        {/* CLASS */}
        <label style={{ fontWeight: "600", marginBottom: "5px", display: "block" }}>
          Class
        </label>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "10px",
            marginBottom: "20px",
            border: "1px solid #ccc",
            fontSize: "15px",
          }}
        >
          <option value="">Select Class</option>
          {classes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* STUDENT */}
        <label style={{ fontWeight: "600", marginBottom: "5px", display: "block" }}>
          Student
        </label>
        <select
          value={selectedStudent}
          onChange={(e) => setSelectedStudent(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "10px",
            marginBottom: "20px",
            border: "1px solid #ccc",
            fontSize: "15px",
          }}
        >
          <option value="">Select Student</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* SUBJECT */}
        <label style={{ fontWeight: "600", marginBottom: "5px", display: "block" }}>
          Subject
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Enter subject"
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "10px",
            marginBottom: "20px",
            border: "1px solid #ccc",
            fontSize: "15px",
          }}
        />

        {/* MARKS */}
        <label style={{ fontWeight: "600", marginBottom: "5px", display: "block" }}>
          Marks Obtained
        </label>
        <input
          type="number"
          value={marks}
          onChange={(e) => setMarks(e.target.value)}
          placeholder="Enter marks obtained"
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "10px",
            marginBottom: "20px",
            border: "1px solid #ccc",
            fontSize: "15px",
          }}
        />

        {/* TOTAL MARKS */}
        <label style={{ fontWeight: "600", marginBottom: "5px", display: "block" }}>
          Total Marks
        </label>
        <input
          type="number"
          value={maxMarks}
          onChange={(e) => setMaxMarks(e.target.value)}
          placeholder="Enter total marks for the test"
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "10px",
            marginBottom: "20px",
            border: "1px solid #ccc",
            fontSize: "15px",
          }}
        />

        {/* TEST DATE */}
        <label style={{ fontWeight: "600", marginBottom: "5px", display: "block" }}>
          Test Date
        </label>
        <input
          type="date"
          value={testDate}
          onChange={(e) => setTestDate(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "10px",
            marginBottom: "20px",
            border: "1px solid #ccc",
            fontSize: "15px",
          }}
        />

        {/* BUTTON */}
        <button
          onClick={handleAddMarks}
          style={{
            width: "100%",
            padding: "13px",
            background: "#007bff",
            color: "#fff",
            fontSize: "17px",
            borderRadius: "10px",
            border: "none",
            cursor: "pointer",
            fontWeight: "600",
            marginTop: "5px",
          }}
        >
          Add Marks
        </button>

        {message && (
          <p
            style={{
              textAlign: "center",
              marginTop: "15px",
              fontWeight: "600",
              color: message.includes("success") ? "green" : "red",
            }}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default AdminAddMarks;
