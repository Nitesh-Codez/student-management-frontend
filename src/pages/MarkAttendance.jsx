import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

const MarkAttendance = () => {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");
  const [selectedDate, setSelectedDate] = useState(getFormattedDate());
  const [showTable, setShowTable] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [btnDisabled, setBtnDisabled] = useState(false);

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

        const allAbsent = list.length === 0 || list.every((s) => s.status === "Absent");
        setIsFirstTime(allAbsent);

        const initAtt = {};
        list.forEach((s) => {
          initAtt[s.id] = allAbsent ? "Present" : s.status;
        });
        setAttendance(initAtt);

        setShowTable(allAbsent || list.length > 0); // show table if students exist
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
    setBtnDisabled(true);
    alert("Attendance Saved Successfully!");
    setShowTable(false);

    const attendanceData = students.map((s) => ({
      studentId: s.id,
      status: attendance[s.id],
    }));

    try {
      await axios.post(`${API_URL}/api/attendance/mark`, {
        date: selectedDate,
        attendance: attendanceData,
      });
      setSuccessMsg("Attendance Submitted Successfully!");
    } catch {
      alert("Error submitting attendance");
    } finally {
      setBtnDisabled(false);
    }
  };

  const updateAttendance = async () => {
    setBtnDisabled(true);
    alert("Attendance Updated Successfully!");
    setShowTable(false);

    const attendanceData = students.map((s) => ({
      studentId: s.id,
      status: attendance[s.id],
    }));

    try {
      await axios.post(`${API_URL}/api/attendance/mark`, {
        date: selectedDate,
        attendance: attendanceData,
      });
      setSuccessMsg("Attendance Updated Successfully!");
    } catch {
      alert("Error updating attendance");
    } finally {
      setBtnDisabled(false);
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
      ) : students.length === 0 ? (
        <div className="empty-state">
          <p>No students found for this date.</p>
        </div>
      ) : showTable ? (
        <>
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
                {students.map((s) => (
                  <tr
                    key={s.id}
                    className={attendance[s.id] === "Present" ? "row-present" : "row-absent"}
                  >
                    <td>{s.id}</td>
                    <td>{s.name}</td>
                    <td>{s.class}</td>
                    <td>
                      <input
                        type="radio"
                        name={`att-${s.id}`}
                        checked={attendance[s.id] === "Present"}
                        onChange={() => handleChange(s.id, "Present")}
                      />
                    </td>
                    <td>
                      <input
                        type="radio"
                        name={`att-${s.id}`}
                        checked={attendance[s.id] === "Absent"}
                        onChange={() => handleChange(s.id, "Absent")}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isFirstTime ? (
            <button className="submit-btn" onClick={submitAttendance} disabled={btnDisabled}>
              Submit Attendance
            </button>
          ) : (
            <button className="submit-btn" onClick={updateAttendance} disabled={btnDisabled}>
              Update Attendance
            </button>
          )}
        </>
      ) : (
        <>
          <p className="success-msg">{successMsg}</p>
          <button
            className="submit-btn"
            onClick={() => setShowTable(true)}
            disabled={btnDisabled}
          >
            Edit Attendance
          </button>
        </>
      )}
      <style jsx>{`
        .attendance-container {
          width: 95%;
          max-width: 900px;
          margin: 20px auto;
          font-family: Arial, sans-serif;
        }

        .date-picker {
          margin-bottom: 10px;
        }

        .attendance-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }

        .attendance-table th,
        .attendance-table td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: center;
        }

        .attendance-table th {
          background-color: #4caf50;
          color: white;
        }

        .attendance-table tr:nth-child(even) {
          background-color: #f2f2f2;
        }

        .row-present {
          background-color: #e9f0e9 !important;
        }

        .row-absent {
          background-color: #f2b0b0 !important;
        }

        .submit-btn {
          margin-top: 10px;
          padding: 8px 16px;
          background-color: #4caf50;
          color: white;
          border: none;
          cursor: pointer;
          border-radius: 4px;
        }

        .submit-btn:hover {
          background-color: #45a049;
        }

        .success-msg {
          margin-top: 10px;
          color: green;
          font-weight: bold;
        }

        .empty-state {
          text-align: center;
          margin: 50px 0;
          color: #555;
          font-size: 18px;
        }

        /* Mobile Responsive */
        @media (max-width: 600px) {
          .attendance-table th,
          .attendance-table td {
            padding: 6px;
            font-size: 14px;
          }

          .submit-btn {
            width: 100%;
            padding: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default MarkAttendance;
