import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "https://student-management-system-4-hose.onrender.com";

const AdminAddMarks = () => {
  // Class-wise subjects mapping
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
  const [testDate, setTestDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [message, setMessage] = useState("");

  // FETCH ALL STUDENTS
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

  // FILTER STUDENTS BY CLASS
  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      setSubject("");
      return;
    }
    const filtered = allStudents.filter((s) => s.class === selectedClass);
    setStudents(filtered);
    setSubject(""); // Reset subject when class changes
  }, [selectedClass, allStudents]);

  // ADD MARKS
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
    <div className="container">
      <h2>Add Marks</h2>

      {/* Class Selection */}
      <label>Class</label>
      <select
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

      {/* Student Selection */}
      <label>Student</label>
      <select
        value={selectedStudent}
        onChange={(e) => setSelectedStudent(e.target.value)}
      >
        <option value="">Select Student</option>
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      {/* Subject Selection */}
      <label>Subject</label>
      <select value={subject} onChange={(e) => setSubject(e.target.value)}>
        <option value="">Select Subject</option>
        {subjectsByClass[selectedClass]?.map((sub, i) => (
          <option key={i} value={sub}>
            {sub}
          </option>
        ))}
      </select>

      {/* Marks Input */}
      <label>Marks</label>
      <input
        type="number"
        value={marks}
        onChange={(e) => setMarks(e.target.value)}
      />

      {/* Total Marks Input */}
      <label>Total Marks</label>
      <input
        type="number"
        value={maxMarks}
        onChange={(e) => setMaxMarks(e.target.value)}
      />

      {/* Test Date */}
      <label>Date</label>
      <input
        type="date"
        value={testDate}
        onChange={(e) => setTestDate(e.target.value)}
      />

      <button onClick={handleAddMarks}>Add Marks</button>

      {message && <p>{message}</p>}
    </div>
  );
};

export default AdminAddMarks;
