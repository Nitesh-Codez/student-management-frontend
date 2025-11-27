import React, { useEffect, useState } from "react";
import axios from "axios";
import "./MarkAttendance.css";

const API_URL = process.env.REACT_APP_API_URL;

const MarkAttendance = () => {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");
  const [alreadyMarked, setAlreadyMarked] = useState(false);
  const [editing, setEditing] = useState(false);

  const fetchStudents = async (selectedDate) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/attendance`, { params: { date: selectedDate } });
      const list = res.data.students || [];
      setStudents(list);

      // initialize attendance
      const initAttendance = {};
      list.forEach(s => initAttendance[s.studentId] = s.status || "Absent");
      setAttendance(initAttendance);

      // check if attendance already marked
      const allMarked = list.every(s => s.status);
      setAlreadyMarked(allMarked);
      setEditing(false);
    } catch (err) {
      console.error(err);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents(date);
  }, [date]);

  const handleDateChange = (e) => {
    const selected = e.target.value;
    setDate(selected);
    setSuccessMsg("");
    fetchStudents(selected);
  };

  const handleChange = (id, status) => {
    setAttendance(prev => ({ ...prev, [id]: status }));
  };

  const handleSubmit = async () => {
    try {
      const attendanceData = students.map(s => ({
        studentId: s.studentId,
        status: attendance[s.studentId]
      }));
      const res = await axios.post(`${API_URL}/api/attendance`, { date, attendance: attendanceData });
      if (res.data.success) setSuccessMsg("Attendance recorded successfully!");
      setAlreadyMarked(true);
      setEditing(false);
    } catch (err) {
      console.error(err);
      setSuccessMsg("Error saving attendance.");
    }
  };

  return (
    <div>
      <h1>Mark Attendance</h1>
      <label>Select Date: </label>
      <input type="date" value={date} onChange={handleDateChange} />

      {loading ? <p>Loading students...</p> : (
        <>
          {alreadyMarked && !editing ? (
            <div>
              <p>Attendance already marked for <strong>{date}</strong></p>
              <button onClick={() => setEditing(true)}>Edit Attendance</button>
            </div>
          ) : (
            <table border="1" cellPadding="5" style={{ marginTop: "10px" }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Class</th>
                  <th>Present</th>
                  <th>Absent</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.studentId}>
                    <td>{s.studentId}</td>
                    <td>{s.studentName}</td>
                    <td>{s.class}</td>
                    <td>
                      <input type="radio" name={`att-${s.studentId}`} checked={attendance[s.studentId]==="Present"} onChange={()=>handleChange(s.studentId,"Present")}/>
                    </td>
                    <td>
                      <input type="radio" name={`att-${s.studentId}`} checked={attendance[s.studentId]==="Absent"} onChange={()=>handleChange(s.studentId,"Absent")}/>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button onClick={handleSubmit} style={{ marginTop: "10px" }}>
            {editing ? "Update Attendance" : "Submit Attendance"}
          </button>
        </>
      )}

      {successMsg && <p>{successMsg}</p>}
    </div>
  );
};

export default MarkAttendance;
