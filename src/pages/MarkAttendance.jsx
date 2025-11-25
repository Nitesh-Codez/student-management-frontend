import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import "./MarkAttendance.css";

const API_URL = process.env.REACT_APP_API_URL;

const MarkAttendance = () => {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [successMsg, setSuccessMsg] = useState("");
  const [alreadyMarked, setAlreadyMarked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/attendance?date=${date}`);
      const studentsList = res.data.students || [];
      setStudents(studentsList);

      const initAttendance = {};
      studentsList.forEach(s => {
        initAttendance[s.studentId] = s.status || "Present";
      });
      setAttendance(initAttendance);

      const allMarked = studentsList.length > 0 && studentsList.every(s => s.status);
      setAlreadyMarked(allMarked);
      setEditing(false);
      setSuccessMsg("");
    } catch (err) {
      console.error(err);
      setStudents([]);
      setAlreadyMarked(false);
      setEditing(false);
      setSuccessMsg("Server error while fetching students");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleChange = (studentId, status) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (students.length === 0) return;

    try {
      const attendanceData = students.map(s => ({
        studentId: s.studentId,
        date,
        status: attendance[s.studentId] || "Present"
      }));

      const res = await axios.post(`${API_URL}/api/attendance`, { attendance: attendanceData, date });
      if (res.data.success) {
        setSuccessMsg(editing ? `✅ Attendance updated successfully for ${date}!` : `✅ Attendance recorded successfully for ${date}!`);
        setAlreadyMarked(true);
        setEditing(false);
      } else {
        setSuccessMsg("❌ " + (res.data.message || "Failed to mark attendance"));
      }
    } catch (err) {
      console.error(err);
      setSuccessMsg("Server Error: " + err.message);
    }
  };

  const handleDateChange = (e) => {
    const selected = e.target.value;
    const today = new Date().toISOString().split("T")[0];
    if (selected > today) { alert("Cannot mark future attendance!"); return; }
    setDate(selected);
    setSuccessMsg("");
    setEditing(false);
  };

  const handleEditClick = () => {
    setEditing(true);
    setSuccessMsg("");
  };

  return (
    <div className="attendance-page">
      <div className="attendance-container">
        <h1 className="attendance-title">🎓 Mark Attendance</h1>

        {successMsg && (
          <p className={`attendance-msg ${successMsg.startsWith("✅") ? "success" : "error"}`}>
            {successMsg}
          </p>
        )}

        <div className="date-picker">
          <label>Select Date: </label>
          <input type="date" value={date} onChange={handleDateChange} />
        </div>

        {loading ? (
          <p className="loading-text">Loading students...</p>
        ) : alreadyMarked && !editing ? (
          <div className="marked-info">
            <p>Attendance already marked for <strong>{date}</strong></p>
            <button className="edit-btn" onClick={handleEditClick}>Edit Attendance</button>
          </div>
        ) : students.length === 0 ? (
          <p className="loading-text">No students found for the selected date.</p>
        ) : (
          <form>
            <div className="table-wrapper">
              <table className="attendance-table">
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
                  {students.map(s => {
                    const rowClass = attendance[s.studentId] === "Absent" ? "absent-row" : "present-row";
                    return (
                      <tr key={s.studentId} className={rowClass}>
                        <td>{s.studentId}</td>
                        <td>{s.studentName}</td>
                        <td>{s.class}</td>
                        <td>
                          <input type="radio" name={`attendance-${s.studentId}`} value="Present"
                            checked={attendance[s.studentId] === "Present"}
                            onChange={() => handleChange(s.studentId, "Present")} />
                        </td>
                        <td>
                          <input type="radio" name={`attendance-${s.studentId}`} value="Absent"
                            checked={attendance[s.studentId] === "Absent"}
                            onChange={() => handleChange(s.studentId, "Absent")} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="submit-btn-container">
              <button type="button" onClick={handleSubmit} className="submit-btn">
                {editing ? "Update Attendance" : "Submit Attendance"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default MarkAttendance;
