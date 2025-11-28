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
  const [isEditable, setIsEditable] = useState(true);
  const [showTable, setShowTable] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

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
    setShowTable(true);
    setIsEditing(false);

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

        const allAbsent = list.every((s) => s.status === "Absent");
        setIsFirstTime(allAbsent);

        const initAtt = {};
        list.forEach((s) => {
          initAtt[s.id] = allAbsent ? "Present" : s.status;
        });

        setAttendance(initAtt);
        setIsEditable(allAbsent);
      }
    } catch (err) {
      console.log(err);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchStudents(selectedDate);
  }, [selectedDate]);

  const handleChange = (id, status) => {
    setAttendance((prev) => ({ ...prev, [id]: status }));
  };

  const submitAttendance = async () => {
    try {
      const attendanceData = students.map((s) => ({
        studentId: s.id,
        status: attendance[s.id],
      }));

      await axios.post(`${API_URL}/api/attendance/mark`, {
        date: selectedDate,
        attendance: attendanceData,
      });

      setSuccessMsg("Attendance Submitted Successfully!");
      alert("Attendance Saved Successfully!");

      setShowTable(false);
      setIsEditable(false);
      setIsFirstTime(false);
      setIsEditing(false);
    } catch (err) {
      alert("Error submitting attendance");
    }
  };

  const updateAttendance = async () => {
    try {
      const attendanceData = students.map((s) => ({
        studentId: s.id,
        status: attendance[s.id],
      }));

      await axios.post(`${API_URL}/api/attendance/mark`, {
        date: selectedDate,
        attendance: attendanceData,
      });

      setSuccessMsg("Attendance Updated Successfully!");
      alert("Attendance Updated Successfully!");

      setShowTable(false);
      setIsEditable(false);
      setIsEditing(false);
    } catch (err) {
      alert("Error updating attendance");
    }
  };

  return (
    <div className="attendance-container">
      <h1>Mark Attendance</h1>

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
        <p>Loading...</p>
      ) : showTable ? (
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
                <tr
                  key={s.id}
                  className={
                    attendance[s.id] === "Present"
                      ? "row-present"
                      : "row-absent"
                  }
                >
                  <td>{s.id}</td>
                  <td>{s.name}</td>
                  <td>{s.class}</td>

                  <td>
                    <input
                      type="radio"
                      name={`att-${s.id}`}
                      disabled={!isEditable}
                      checked={attendance[s.id] === "Present"}
                      onChange={() => handleChange(s.id, "Present")}
                    />
                  </td>

                  <td>
                    <input
                      type="radio"
                      name={`att-${s.id}`}
                      disabled={!isEditable}
                      checked={attendance[s.id] === "Absent"}
                      onChange={() => handleChange(s.id, "Absent")}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {isFirstTime && !isEditing && (
            <button className="submit-btn" onClick={submitAttendance}>
              Submit Attendance
            </button>
          )}

          {isEditing && (
            <button className="submit-btn" onClick={updateAttendance}>
              Update Attendance
            </button>
          )}
        </>
      ) : (
        <>
          <p className="success-msg">{successMsg}</p>

          <button
            className="submit-btn"
            onClick={() => {
              setShowTable(true);
              setIsEditable(true);
              setIsEditing(true);
            }}
          >
            Edit Attendance
          </button>
        </>
      )}
    </div>
  );
};

export default MarkAttendance;
