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
  const [summaryData, setSummaryData] = useState(null);
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

    if (diffDays === 0) {
      const day = today.getDay();
      if ((day === 0 || day === 6) && today.getHours() < 14) return false;
      if (!(day === 0 || day === 6) && today.getHours() < 16) return false;
    }
    return true;
  };

  const getInfoMessage = (dateStr) => {
    const selected = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.floor((today - selected) / (1000 * 60 * 60 * 24));
    if (diffDays > 5) return "Attendance records older than 5 days cannot be edited.";
    if (diffDays === 0 && today.getHours() < 16) return "Today's attendance can only be marked after 4:00 PM.";
    return "";
  };

  const fetchStudents = useCallback(async (date) => {
    setLoading(true);
    setSuccessMsg("");
    setInfoMsg("");
    setSummaryData(null);

    try {
      const bannedRes = await axios.get(`${API_URL}/api/auth/banned-students`).catch(() => ({ data: { success: false, students: [] } }));
      const bannedList = bannedRes?.data?.success ? (bannedRes.data.students || []) : [];
      
      const bannedIds = new Set(bannedList.map(b => String(b.id || b.studentId)));
      const bannedNames = new Set(bannedList.map(b => (b.name || "").trim().toLowerCase()));

      const res = await axios.get(`${API_URL}/api/attendance/list?date=${date}`);
      if (res?.data?.success) {
        let list = (res.data.students || [])
          .filter((s) => {
            const sId = String(s.studentId || s.id);
            const sName = (s.studentName || s.name || "").trim().toLowerCase();
            return !bannedIds.has(sId) && !bannedNames.has(sName);
          })
          .map((s) => ({
            id: s.studentId || s.id,
            name: s.studentName || s.name,
            class: s.class,
            status: s.status || "Absent",
          }));

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
  }, []);

  useEffect(() => {
    fetchStudents(selectedDate);
  }, [selectedDate, fetchStudents]);

  const handleChange = (id, status) =>
    setAttendance((prev) => ({ ...prev, [id]: status }));

  const sendAttendance = async (action = "submit") => {
    setBtnDisabled(true);

    const batchStudents = batchType === "4pm"
      ? students.filter(
          (s) =>
            s.batch === "4pm" ||
            (!s.batch &&
              ((!isNaN(parseInt(s.class, 10)) && parseInt(s.class, 10) <= 5) ||
                ["LKG", "L.K.G", "UKG", "U.K.G"].includes(String(s.class).toUpperCase())))
        )
      : students.filter(
          (s) =>
            s.batch === "530pm" ||
            (!s.batch &&
              !["LKG","UKG","L.K.G","U.K.G"].includes(String(s.class).toUpperCase()) &&
              parseInt(s.class, 10) >= 6)
        );

    const attendanceData = batchStudents.map((s) => ({
      studentId: s.id,
      status: attendance[s.id] || "Absent",
    }));

    const totalStudents = batchStudents.length;
    const totalPresent = batchStudents.filter((s) => (attendance[s.id] || "Absent") === "Present").length;
    const totalAbsent = batchStudents.filter((s) => (attendance[s.id] || "Absent") === "Absent").length;
    const totalHoliday = batchStudents.filter((s) => (attendance[s.id] || "Absent") === "Holiday").length;

    try {
      await axios.post(`${API_URL}/api/attendance/mark`, {
        date: selectedDate,
        attendance: attendanceData,
      });

      const msg =
        action === "submit"
          ? "Attendance Submitted Successfully!"
          : "Attendance Updated Successfully!";

      setSuccessMsg(msg);
      setSummaryData({ totalStudents, totalPresent, totalAbsent, totalHoliday });
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

  const batch4 = students.filter(
    (s) =>
      s.batch === "4pm" ||
      (!s.batch &&
        ((!isNaN(parseInt(s.class, 10)) && parseInt(s.class, 10) <= 5) ||
          ["LKG", "L.K.G", "UKG", "U.K.G"].includes(String(s.class).toUpperCase())))
  );

  const batch530 = students.filter(
    (s) =>
      s.batch === "530pm" ||
      (!s.batch &&
        !["LKG","UKG","L.K.G","U.K.G"].includes(String(s.class).toUpperCase()) &&
        parseInt(s.class, 10) >= 6)
  );

  const renderTable = (title, list) => (
    <div className="table-wrapper">
      <h2 style={{ marginTop: "18px", fontSize: "18px", color: "#111827" }}>
        {title} ({list.length})
      </h2>
      {list.length === 0 ? (
        <p style={{ marginTop: 6, color: "#6b7280" }}>No active students found in this batch.</p>
      ) : (
        <table className="attendance-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Class</th>
              <th>Present</th>
              <th>Absent</th>
              <th>Holiday</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr
                key={s.id}
                style={{
                  backgroundColor:
                    attendance[s.id] === "Present"
                      ? "#d1fae5" // Darker Green
                      : attendance[s.id] === "Absent"
                      ? "#f19d9d" // Darker Red
                      : "#f0e6a0", // Darker Yellow
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
                <td>
                  <input
                    type="radio"
                    name={`att-${s.id}`}
                    checked={attendance[s.id] === "Holiday"}
                    onChange={() => handleChange(s.id, "Holiday")}
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
      <div className="header-banner">
        <h1>Smart Student Attendance Portal</h1>
        <p style={{fontSize:'25px'}}>
          Manage daily attendance for your batches (4:00 PM and 5:30 PM). 
          Today's attendance can be marked after 4:00 PM, and records can be updated for up to the past 5 days. 
          Suspended or banned students are automatically filtered out.
        </p>
      </div>

      <div className="controls-row">
        <div className="batch-selector">
          <span
            className={`batch-link ${batchType === "4pm" ? "active" : ""}`}
            onClick={() => {
              setBatchType("4pm");
              setShowTable(true);
            }}
          >
            4:00 PM Batch
          </span>
          <span
            className={`batch-link ${batchType === "530pm" ? "active" : ""}`}
            onClick={() => {
              setBatchType("530pm");
              setShowTable(true);
            }}
          >
            5:30 PM Batch
          </span>
        </div>

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
      </div>

      {loading ? (
        <p className="loading-text">Loading student records...</p>
      ) : infoMsg ? (
        <div className="info-msg">{infoMsg}</div>
      ) : showTable ? (
        <>
          {batchType === "4pm" && renderTable("Batch 4:00 PM (Classes: LKG, UKG, 1st to 5th)", batch4)}
          {batchType === "530pm" && renderTable("Batch 5:30 PM (Classes: 6th and above)", batch530)}

          <div style={{ marginTop: 20 }}>
            {isFirstTime ? (
              <button className="submit-btn" onClick={submitAttendance} disabled={btnDisabled}>
                Submit Attendance
              </button>
            ) : (
              <button className="submit-btn" onClick={updateAttendance} disabled={!editAllowed || btnDisabled}>
                Update Attendance
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="action-card-prompt">
          <p>Selected Date: <strong>{selectedDate}</strong></p>
          <button className="submit-btn" onClick={() => setShowTable(true)} disabled={btnDisabled}>
            {selectedDate === getFormattedDate() ? "Mark Today's Attendance Now" : "View / Edit Attendance"}
          </button>
        </div>
      )}

      {summaryData && (
        <div className="summary-card">
          <h3>Attendance Summary Report ({batchType === "4pm" ? "4:00 PM Batch" : "5:30 PM Batch"})</h3>
          <div className="summary-grid">
            <div className="summary-item total">
              <span>Total Students</span>
              <strong>{summaryData.totalStudents}</strong>
            </div>
            <div className="summary-item present">
              <span>Present</span>
              <strong>{summaryData.totalPresent}</strong>
            </div>
            <div className="summary-item absent">
              <span>Absent</span>
              <strong>{summaryData.totalAbsent}</strong>
            </div>
            <div className="summary-item holiday">
              <span>Holiday</span>
              <strong>{summaryData.totalHoliday}</strong>
            </div>
          </div>
          {successMsg && <div className="success-msg">{successMsg}</div>}
        </div>
      )}

      <style>{`
        .attendance-container { 
          width: 95%; 
          max-width: 1000px; 
          margin: 24px auto; 
          font-family: 'Inter', system-ui, sans-serif; 
          color: #1f2937;
          background: #ffffff;
          padding: 28px;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 4px 20px rgba(0,0,0,0.05);
        }
        .header-banner {
          background: linear-gradient(135deg, #1d166a 0%, #6d28d9 100%);
          color: #ffffff;
          padding: 20px 24px;
          border-radius: 12px;
          margin-bottom: 20px;
        }
        .header-banner h1 { font-size: 22px; font-weight: 700; margin: 0 0 8px 0; }
        .header-banner p { font-size: 13px; margin: 0; color: #e0e7ff; line-height: 1.5; }
        
        .controls-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 20px;
          background: #f9fafb;
          padding: 12px 16px;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
        }
        .batch-selector { display: flex; gap: 10px; }
        .batch-link { cursor: pointer; color: #4338ca; font-weight: 600; font-size: 13px; padding: 8px 14px; background: #ede9fe; border-radius: 6px; transition: 0.2s; border: 1px solid #ddd6fe; }
        .batch-link.active { background: #4338ca; color: #fff; border-color: #4338ca; }
        
        .date-picker { display: flex; align-items: center; gap: 10px; font-weight: 600; font-size: 13px; color: #4b5563; }
        .date-picker input { padding: 7px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; outline: none; background: #ffffff; color: #1f2937; }
        
        .action-card-prompt {
          text-align: center;
          padding: 30px;
          background: #f9fafb;
          border-radius: 10px;
          border: 1px dashed #cbd5e1;
        }
        .action-card-prompt p { margin: 0 0 14px 0; font-size: 14px; color: #4b5563; }

        .attendance-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        .attendance-table th, .attendance-table td { border: 1px solid #d1d5db; padding: 10px; text-align: center; font-size: 14px; }
        .attendance-table th { background-color: #3730a3; color: white; font-weight: 600; }
        
        .submit-btn { padding: 10px 22px; background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%); color: white; border: none; cursor: pointer; border-radius: 8px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 12px rgba(67,56,202,0.25); transition: 0.2s; }
        .submit-btn:hover { opacity: 0.95; transform: translateY(-1px); }
        .submit-btn:disabled { background: #9ca3af; cursor: not-allowed; box-shadow: none; }
        
        .success-msg { color: #047857; font-weight: 600; margin-top: 12px; font-size: 14px; }
        .info-msg { margin-top: 16px; padding: 12px; background: #fee2e2; border: 1px solid #fca5a5; color: #b91c1c; font-weight: 600; font-size: 14px; border-radius: 8px; }
        .loading-text { font-size: 14px; color: #6b7280; margin-top: 10px; text-align: center; padding: 20px; }
        
        .summary-card {
          margin-top: 24px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          animation: fadeIn 0.3s ease-in-out;
        }
        .summary-card h3 { margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #111827; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; }
        .summary-item { background: #ffffff; padding: 14px; border-radius: 8px; border: 1px solid #e5e7eb; display: flex; flex-direction: column; gap: 4px; text-align: center; }
        .summary-item span { font-size: 12px; color: #4b5563; font-weight: 600; text-transform: uppercase; }
        .summary-item strong { font-size: 20px; color: #111827; }
        .summary-item.present strong { color: #047857; }
        .summary-item.absent strong { color: #b91c1c; }
        .summary-item.holiday strong { color: #b45309; }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default MarkAttendance;