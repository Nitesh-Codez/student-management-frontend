import React, { useEffect, useState } from "react";
import axios from "axios";
import "./MarkAttendance.css";

const API_URL = process.env.REACT_APP_API_URL;

const MarkAttendance = () => {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");
  const [selectedDate, setSelectedDate] = useState(getFormattedDate());
  const [isEditable, setIsEditable] = useState(true); // submit or edit

  // Format date as YYYY-MM-DD
  function getFormattedDate(date = new Date()) {
    return (
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(date.getDate()).padStart(2, "0")
    );
  }

  const fetchStudents = async (date) => {
    setLoading(true);
    setSuccessMsg("");
    try {
      const res = await axios.get(`${API_URL}/api/attendance/list?date=${date}`);
      if (res.data.success) {
        const list = res.data.students.map((s) => ({
          id: s.studentId,
          name: s.studentName,
          class: s.class,
          status: s.status,
        }));

        setStudents(list);

        const initAtt = {};
        list.forEach((s) => {
          initAtt[s.id] = s.status || "Absent";
        });

        setAttendance(initAtt);

        // Determine if editable (if all absent → first time, else already marked)
        const alreadyMarked = list.some((s) => s.status !== "Absent");
        setIsEditable(!alreadyMarked);
      } else {
        console.error("Error from backend:", res.data.message);
        setStudents([]);
        setIsEditable(true);
      }
    } catch (err) {
      console.error("Error fetching students:", err);
      setStudents([]);
      setIsEditable(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents(selectedDate);
  }, [selectedDate]);

  const handleChange = (id, status) => {
    setAttendance((prev) => ({ ...prev, [id]: status }));
  };

  const handleSubmit = async () => {
    try {
      const attendanceData = students.map((s) => ({
        studentId: s.id,
        status: attendance[s.id],
      }));

      const res = await axios.post(`${API_URL}/api/attendance/mark`, {
        date: selectedDate,
        attendance: attendanceData,
      });

      if (res.data.success) {
        setSuccessMsg("Attendance recorded successfully!");
        setStudents([]); // reset list after submission
      } else {
        setSuccessMsg("Error saving attendance.");
      }
    } catch (err) {
      console.error("Error submitting attendance:", err);
      setSuccessMsg("Error saving attendance.");
    }
  };

  return (
    <div className="attendance-container">
      <h1>Mark Attendance</h1>

      {/* Date Picker */}
      <div className="date-picker">
        <label>Select Date: </label>
        <input
          type="date"
          value={selectedDate}
          max={getFormattedDate()}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      {loading ? (
        <p>Loading students...</p>
      ) : (
        <>
          {students.length === 0 ? (
            <p>No students found for this date.</p>
          ) : (
            <>
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
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td>{s.id}</td>
                      <td>{s.name}</td>
                      <td>{s.class}</td>
                      <td>
                        <input
                          type="radio"
                          name={`att-${s.id}`}
                          checked={attendance[s.id] === "Present"}
                          onChange={() => handleChange(s.id, "Present")}
                          disabled={!isEditable}
                        />
                      </td>
                      <td>
                        <input
                          type="radio"
                          name={`att-${s.id}`}
                          checked={attendance[s.id] === "Absent"}
                          onChange={() => handleChange(s.id, "Absent")}
                          disabled={!isEditable}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button
                className="submit-btn"
                onClick={handleSubmit}
                disabled={!isEditable}
              >
                {isEditable ? "Submit Attendance" : "Edit Attendance"}
              </button>

              {successMsg && <p className="success-msg">{successMsg}</p>}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default MarkAttendance;
