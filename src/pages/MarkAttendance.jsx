import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "";

// Custom batch mapping (IDs with specific batch)
const customBatchMap = {
  13: "530pm",
  12: "4pm",
  24: "4pm",
  28: "4pm",
};

const MarkAttendance = () => {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");
  const [selectedDate, setSelectedDate] = useState(getFormattedDate());
  const [showTable, setShowTable] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [btnDisabled, setBtnDisabled] = useState(false);
  const [editAllowed, setEditAllowed] = useState(true);
  const [infoMsg, setInfoMsg] = useState("");
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

  const isEditAllowed = (dateStr) => {
    const selected = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.floor((today - selected) / (1000 * 60 * 60 * 24));
    if (diffDays > 5) return false;
    if (diffDays === 0 && today.getHours() < 16) return false;
    return true;
  };

  const getInfoMessage = (dateStr) => {
    const selected = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.floor((today - selected) / (1000 * 60 * 60 * 24));
    if (diffDays > 5) return "You cannot edit attendance now.";
    if (diffDays === 0 && today.getHours() < 16) return "You cannot mark attendance before 4 PM.";
    return "";
  };

  const fetchStudents = useCallback(async (date) => {
    setLoading(true);
    setSuccessMsg("");
    setInfoMsg("");

    try {
      const res = await axios.get(`${API_URL}/api/attendance/list?date=${date}`);
      if (res?.data?.success) {
        let list = (res.data.students || []).map((s) => ({
          id: s.studentId,
          name: s.studentName,
          class: s.class,
          status: s.status || "Absent",
        }));

        // Apply custom batch
        list = list.map((s) => ({
          ...s,
          batch: customBatchMap[s.id] || null,
        }));

        setStudents(list);

        const allAbsent = list.length === 0 || list.every((s) => s.status === "Absent");
        setIsFirstTime(allAbsent);

        const initAtt = {};
        list.forEach((s) => {
          initAtt[s.id] = allAbsent ? "Present" : s.status;
        });
        setAttendance(initAtt);

        const allowed = isEditAllowed(date);
        setEditAllowed(allowed);
        setShowTable(false);
        setInfoMsg(getInfoMessage(date));
      } else {
        setStudents([]);
        setAttendance({});
        setIsFirstTime(true);
        setShowTable(false);
        setEditAllowed(false);
        setInfoMsg("No students found for this date.");
      }
    } catch (err) {
      console.error("Fetch Error:", err);
      setStudents([]);
      setAttendance({});
      setIsFirstTime(true);
      setShowTable(false);
      setEditAllowed(false);
      setInfoMsg("Error fetching students.");
    } finally {
      setLoading(false);
    }
  }, []); // warning-free now

  useEffect(() => {
    fetchStudents(selectedDate);
  }, [selectedDate, fetchStudents]);

  const handleChange = (id, status) =>
    setAttendance((prev) => ({ ...prev, [id]: status }));

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

  // Batches
  const batch4 = students.filter(
    (s) =>
      s.batch === "4pm" ||
      (!s.batch &&
        ((!isNaN(parseInt(s.class, 10)) && parseInt(s.class, 10) <= 5) ||
          ["LKG", "L.K.G", "UKG", "U.K.G"].includes(s.class.toUpperCase())))
  );

  const batch530 = students.filter(
    (s) =>
      s.batch === "530pm" ||
      (!s.batch && !["LKG","UKG","L.K.G","U.K.G"].includes(s.class.toUpperCase()) && parseInt(s.class, 10) >= 6)
  );

  const renderTable = (title, list) => (
    <div className="table-wrapper">
      <h2 style={{ marginTop: "18px" }}>
        {title} ({list.length})
      </h2>
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
                    attendance[s.id] === "Present" ? "#e9f0e9" : "#f2b0b0",
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
                    disabled={!editAllowed}
                  />
                </td>
                <td>
                  <input
                    type="radio"
                    name={`att-${s.id}`}
                    checked={attendance[s.id] === "Absent"}
                    onChange={() => handleChange(s.id, "Absent")}
                    disabled={!editAllowed}
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
          style={{ cursor: "pointer", color: "blue", marginLeft: "10px" }}
          onClick={() => {
            setBatchType("530pm");
            setShowTable(true);
          }}
        >
          🔗 5:30 PM Batch
        </h9>
      </div>

      <div className="date-picker" style={{ marginTop: "12px" }}>
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
      ) : infoMsg ? (
        <div style={{ marginTop: 12, color: "red", fontWeight: "bold" }}>
          {infoMsg}
        </div>
      ) : showTable ? (
        <>
          {batchType === "4pm" &&
            renderTable("Batch 4:00 PM (1–5 + LKG/UKG)", batch4)}
          {batchType === "530pm" &&
            renderTable("Batch 5:30 PM (Class 6+)", batch530)}

          <div style={{ marginTop: 12 }}>
            {isFirstTime ? (
              <button
                className="submit-btn"
                onClick={submitAttendance}
                disabled={btnDisabled}
              >
                Submit Attendance
              </button>
            ) : (
              <button
                className="submit-btn"
                onClick={updateAttendance}
                disabled={!editAllowed || btnDisabled}
              >
                Update Attendance
              </button>
            )}
          </div>

          {successMsg && <div className="success-msg">{successMsg}</div>}
        </>
      ) : (
        <button
          className="submit-btn"
          onClick={() => setShowTable(true)}
          disabled={btnDisabled}
        >
          {selectedDate === getFormattedDate()
            ? "Mark Today's Attendance"
            : "Edit Attendance"}
        </button>
      )}

      <style>{`
        .attendance-container { width: 95%; max-width: 980px; margin: 20px auto; font-family: Arial, sans-serif; }
        .attendance-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        .attendance-table th, .attendance-table td { border: 1px solid #ddd; padding: 8px; text-align: center; }
        .attendance-table th { background-color: #4caf50; color: white; }
        .submit-btn { padding: 8px 16px; background-color: #4caf50; color: white; border: none; cursor: pointer; border-radius: 4px; }
        .submit-btn:disabled { background-color: #a0a0a0; cursor: not-allowed; }
        .success-msg { color: green; margin-top: 10px; }
      `}</style>
    </div>
  );
};

export default MarkAttendance;
