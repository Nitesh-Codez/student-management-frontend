import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "";

const MarkAttendance = () => {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");
  const [selectedDate, setSelectedDate] = useState(getFormattedDate());
  const [showTable, setShowTable] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [btnDisabled, setBtnDisabled] = useState(false);

  // NEW — which batch to show
  const [batchType, setBatchType] = useState("4pm");

  function getFormattedDate(date = new Date()) {
    return (
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(date.getDate()).padStart(2, "0")
    );
  }

  // -------- FETCH STUDENTS --------
  const fetchStudents = async (date) => {
    setLoading(true);
    setSuccessMsg("");
   

    try {
      const res = await axios.get(`${API_URL}/api/attendance/list?date=${date}`);

      if (res?.data?.success) {
        const list = (res.data.students || []).map((s) => ({
          id: s.studentId,
          name: s.studentName,
          class: s.class,
          status: s.status || "Absent",
        }));

        setStudents(list);

        const allAbsent = list.length === 0 || list.every((s) => s.status === "Absent");
        setIsFirstTime(allAbsent);

        const initAtt = {};
        list.forEach((s) => {
          initAtt[s.id] = allAbsent ? "Present" : s.status;
        });
        setAttendance(initAtt);

       
      } else {
        setStudents([]);
        setAttendance({});
        setIsFirstTime(true);
        setShowTable(false);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
      setStudents([]);
      setAttendance({});
      setIsFirstTime(true);
      setShowTable(false);
    } finally {
      setLoading(false);
    }
  };

 useEffect(() => {
  // bas data fetch hoga, table tabhi dikhega jab batch click hoga
  fetchStudents(selectedDate);
  setShowTable(false);
}, [selectedDate]);


  // CHANGE STATUS
  const handleChange = (id, status) =>
    setAttendance((prev) => ({ ...prev, [id]: status }));

  // SUBMIT OR UPDATE
  const sendAttendance = async (action = "submit") => {
    setBtnDisabled(true);

    const attendanceData = students.map((s) => ({
      studentId: s.id,
      status: attendance[s.id] || "Absent",
    }));

    try {
      await axios.post(`${API_URL}/api/attendance/mark`, {
        date: selectedDate,
        attendance: attendanceData,
      });

      const msg =
        action === "submit"
          ? "Attendance Submitted Successfully!"
          : "Attendance Updated Successfully!";

      alert(msg);
      setSuccessMsg(msg);
      setShowTable(false);
    } catch (err) {
      console.error("Submit Error:", err);
      alert("Error submitting attendance");
    } finally {
      setBtnDisabled(false);
    }
  };

  const submitAttendance = () => sendAttendance("submit");
  const updateAttendance = () => sendAttendance("update");

  // FIXED BATCH SPLIT
  const batch4 = students.filter((s) => {
    const c = s.class.toUpperCase();
    const cls = parseInt(s.class, 10);
    return (
      (!isNaN(cls) && cls <= 5) ||
      c === "LKG" ||
      c === "L.K.G" ||
      c === "UKG" ||
      c === "U.K.G"
    );
  });

  const batch530 = students.filter((s) => {
    const c = s.class.toUpperCase();
    const cls = parseInt(s.class, 10);
    return (
      (!isNaN(cls) && cls >= 6) &&
      !["LKG", "L.K.G", "UKG", "U.K.G"].includes(c)
    );
  });

  // RENDER TABLE
  const renderTable = (title, list) => (
    <div className="table-wrapper">
      <h2 style={{ marginTop: "18px" }}>{title} ({list.length})</h2>

      {list.length === 0 ? (
        <p style={{ marginTop: 6 }}>No students in this batch.</p>
      ) : (
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
            {list.map((s) => (
              <tr
  key={s.id}
  style={{
    backgroundColor:
      attendance[s.id] === "Present" ? " #e9f0e9" : "#f2b0b0"
  }}
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
      )}
    </div>
  );

  return (
    <div className="attendance-container">
      <h1>Mark Attendance</h1>

      {/* BATCH SELECT — OPTION D (BIG CLICK LINKS) */}
      <div style={{ marginTop: "20px" }}>
        <h9
  style={{ cursor: "pointer", color: "blue" }}
  onClick={() => {
    setBatchType("4pm");
    setShowTable(true);
  }}
>
  🔗 4:00 PM Batch
</h9>

<h9
  style={{ cursor: "pointer", color: "blue", marginTop: "10px" }}
  onClick={() => {
    setBatchType("530pm");
    setShowTable(true);
  }}
>
  🔗 5:30 PM Batch
</h9>

      </div>

      {/* DATE PICKER */}
      <div className="date-picker">
        <label htmlFor="att-date">Select Date: </label>
        <input
          id="att-date"
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
          {batchType === "4pm" &&
            renderTable("Batch 4:00 PM (1–5 + LKG/UKG)", batch4)}

          {batchType === "530pm" &&
            renderTable("Batch 5:30 PM (Class 6+)", batch530)}

          <div style={{ marginTop: 12 }}>
            {isFirstTime ? (
              <button className="submit-btn" onClick={submitAttendance} disabled={btnDisabled}>
                Submit Attendance
              </button>
            ) : (
              <button className="submit-btn" onClick={updateAttendance} disabled={btnDisabled}>
                Update Attendance
              </button>
            )}
          </div>
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

      <style>{`
         
         
        .attendance-container {
          width: 95%;
          max-width: 980px;
          margin: 20px auto;
          font-family: Arial, sans-serif;
        }

        .attendance-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
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

        .submit-btn {
          padding: 8px 16px;
          background-color: #4caf50;
          color: white;
          border: none;
          cursor: pointer;
          border-radius: 4px;
        }

        .success-msg {
          color: green;
          margin-top: 10px;
        }
      `}</style>
    </div>
  );
};

export default MarkAttendance;