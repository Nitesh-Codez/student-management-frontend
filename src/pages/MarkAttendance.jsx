import React, { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import { motion, AnimatePresence } from "framer-motion";

// Custom batch mapping
const customBatchMap = {
  13: "batch2",
  12: "batch1",
  24: "batch1",
  28: "batch1",
};

const BATCHES = {
  batch1: { label: "Batch 1", time: "3:00 PM - 4:30 PM" },
  batch2: { label: "Batch 2", time: "4:30 PM - 6:00 PM" },
  batch3: { label: "Batch 3", time: "6:00 PM - 7:30 PM" },
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
  const [batchType, setBatchType] = useState("batch1");
  const [searchQuery, setSearchQuery] = useState("");
  const [batchOverrides, setBatchOverrides] = useState(() => {
    try { return JSON.parse(localStorage.getItem("smartStudentBatchOverrides") || "{}"); }
    catch { return {}; }
  });
  const [showEditBatches, setShowEditBatches] = useState(false);
  const [shiftSourceBatch, setShiftSourceBatch] = useState("batch1");
  const [shiftTargetBatch, setShiftTargetBatch] = useState("batch2");
  const [selectedShiftStudents, setSelectedShiftStudents] = useState([]);

  // Date Range Report Modal / Drawer States
  const [showReportModal, setShowReportModal] = useState(false);
  const [startDate, setStartDate] = useState(getFormattedDate(new Date(new Date().setDate(1)))); // First day of current month
  const [endDate, setEndDate] = useState(getFormattedDate()); // Today
  const [reportBatch, setReportBatch] = useState("all"); // all, batch1, batch2, batch3
  const [reportLoading, setReportLoading] = useState(false);

  function getFormattedDate(date = new Date()) {
    return (
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(date.getDate()).padStart(2, "0")
    );
  }

  // Quick Month Preset Switcher helper for the report modal
  const handleMonthPresetChange = (e) => {
    const val = e.target.value;
    if (!val) return;
    const [year, month] = val.split("-");
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0); // Last day of that month
    
    // If last day is in the future compared to today, cap it to today or let full month be requested
    const today = new Date();
    const effectiveEndDay = lastDay > today ? today : lastDay;

    setStartDate(getFormattedDate(firstDay));
    setEndDate(getFormattedDate(effectiveEndDay));
  };

  const isEditAllowed = (dateStr) => true;
  const getInfoMessage = (dateStr) => "";

  const fetchStudents = useCallback(async (date) => {
    setLoading(true);
    setSuccessMsg("");
    setInfoMsg("");
    setSummaryData(null);

    try {
      const bannedRes = await api.get(`/api/auth/banned-students`).catch(() => ({ data: { success: false, students: [] } }));
      const bannedList = bannedRes?.data?.success ? (bannedRes.data.students || []) : [];
      
      const bannedIds = new Set(bannedList.map(b => String(b.id || b.studentId)));
      const bannedNames = new Set(bannedList.map(b => (b.name || "").trim().toLowerCase()));

      const res = await api.get(`/api/attendance/list?date=${date}`);
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
          batch:
            batchOverrides[String(s.id)] ||
            customBatchMap[String(s.id)] ||
            ((!isNaN(parseInt(s.class, 10)) && parseInt(s.class, 10) <= 5) ||
            ["LKG", "L.K.G", "UKG", "U.K.G"].includes(String(s.class).toUpperCase())
              ? "batch1" : "batch2"),
        }));

        setStudents(list);

        const hasExistingRecords = list.some((s) => s.status && s.status !== "Absent");
        const allAbsent = list.length === 0 || list.every((s) => s.status === "Absent");
        
        setIsFirstTime(!hasExistingRecords && allAbsent);

        const initAtt = {};
        list.forEach((s) => {
          initAtt[s.id] = s.status || "Absent";
        });
        setAttendance(initAtt);

        setEditAllowed(isEditAllowed(date));
        setShowTable(false);
        setInfoMsg(getInfoMessage(date));
      } else {
        setStudents([]);
        setAttendance({});
        setIsFirstTime(true);
        setShowTable(false);
        setEditAllowed(true);
        setInfoMsg("No students found for this date.");
      }
    } catch (err) {
      console.error("Fetch Error:", err);
      setStudents([]);
      setAttendance({});
      setIsFirstTime(true);
      setShowTable(false);
      setEditAllowed(true);
      setInfoMsg("Error fetching students.");
    } finally {
      setLoading(false);
    }
  }, [batchOverrides]);

  useEffect(() => {
    fetchStudents(selectedDate);
  }, [selectedDate, fetchStudents]);

  const handleChange = (id, status) =>
    setAttendance((prev) => ({ ...prev, [id]: status }));

  const handleMarkAll = (status, currentBatchList) => {
    const updated = { ...attendance };
    currentBatchList.forEach((s) => {
      updated[s.id] = status;
    });
    setAttendance(updated);
  };

  const sendAttendance = async (action = "submit") => {
    setBtnDisabled(true);

    const batchStudents = students.filter((s) => s.batch === batchType);

    const attendanceData = batchStudents.map((s) => ({
      studentId: s.id,
      status: attendance[s.id] || "Absent",
    }));

    const totalStudents = batchStudents.length;
    const totalPresent = batchStudents.filter((s) => (attendance[s.id] || "Absent") === "Present").length;
    const totalAbsent = batchStudents.filter((s) => (attendance[s.id] || "Absent") === "Absent").length;
    const totalHoliday = batchStudents.filter((s) => (attendance[s.id] || "Absent") === "Holiday").length;

    try {
      await api.post(`/api/attendance/mark`, {
        date: selectedDate,
        attendance: attendanceData,
      });

      const msg =
        action === "submit"
          ? "Attendance Submitted Successfully!"
          : "Attendance Updated Successfully!";

      setSuccessMsg(msg);
      setSummaryData({ totalStudents, totalPresent, totalAbsent, totalHoliday });
      setIsFirstTime(false);
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

  // ---- EXCEL / CSV & PDF RANGE DOWNLOAD HANDLERS ----
  const handleDownloadReport = async (format) => {
    if (!startDate || !endDate) {
      alert("Please select both start and end dates.");
      return;
    }
    if (startDate > endDate) {
      alert("Start Date cannot be after End Date.");
      return;
    }

    setReportLoading(true);
    try {
      const startD = new Date(startDate);
      const endD = new Date(endDate);
      const dateList = [];
      let curr = new Date(startD);

      while (curr <= endD) {
        dateList.push(getFormattedDate(curr));
        curr.setDate(curr.getDate() + 1);
      }

      // Fetch attendance data for all dates in parallel
      const promises = dateList.map(async (dt) => {
        try {
          const res = await api.get(`/api/attendance/list?date=${dt}`);
          if (res?.data?.success) {
            return { date: dt, students: res.data.students || [] };
          }
        } catch {
          // ignore failures on specific missing dates
        }
        return { date: dt, students: [] };
      });

      const results = await Promise.all(promises);

      // Get banned students to filter correctly
      const bannedRes = await api.get(`/api/auth/banned-students`).catch(() => ({ data: { success: false, students: [] } }));
      const bannedList = bannedRes?.data?.success ? (bannedRes.data.students || []) : [];
      const bannedIds = new Set(bannedList.map(b => String(b.id || b.studentId)));

      // Collect all unique students
      const studentMap = new Map();
      results.forEach(({ students }) => {
        students.forEach((s) => {
          const sId = String(s.studentId || s.id);
          if (!bannedIds.has(sId)) {
            const batch = batchOverrides[sId] || customBatchMap[sId] ||
              ((!isNaN(parseInt(s.class, 10)) && parseInt(s.class, 10) <= 5) ||
              ["LKG", "L.K.G", "UKG", "U.K.G"].includes(String(s.class).toUpperCase()) ? "batch1" : "batch2");
            
            if (reportBatch === "all" || batch === reportBatch) {
              studentMap.set(sId, {
                id: sId,
                name: s.studentName || s.name,
                class: s.class,
                batch: batch
              });
            }
          }
        });
      });

      const studentArray = Array.from(studentMap.values()).sort((a, b) => Number(a.id) - Number(b.id));

      if (studentArray.length === 0) {
        alert("No student attendance records found for the selected range/batch.");
        setReportLoading(false);
        return;
      }

      // Build attendance lookup matrix: matrix[studentId][date] = status
      const matrix = {};
      results.forEach(({ date, students }) => {
        students.forEach((s) => {
          const sId = String(s.studentId || s.id);
          if (!matrix[sId]) matrix[sId] = {};
          matrix[sId][date] = s.status || "Absent";
        });
      });

      if (format === "csv") {
        // Generate Excel / CSV Spreadsheet with explicit dates in header columns
        let csvContent = "\uFEFF"; // BOM for proper Excel UTF-8 encoding
        
        let headers = ["Student ID", "Student Name", "Class", "Batch"];
        dateList.forEach(dt => headers.push(dt)); // Full YYYY-MM-DD dates in header
        headers.push("Total Present", "Total Absent", "Total Holiday");
        csvContent += headers.join(",") + "\r\n";

        studentArray.forEach(st => {
          let row = [`"${st.id}"`, `"${st.name}"`, `"${st.class}"`, `"${st.batch}"`];
          let pCount = 0, aCount = 0, hCount = 0;

          dateList.forEach(dt => {
            const stCode = matrix[st.id]?.[dt] || "Absent";
            if (stCode === "Present") pCount++;
            else if (stCode === "Holiday") hCount++;
            else aCount++;

            row.push(`"${stCode}"`);
          });

          row.push(pCount, aCount, hCount);
          csvContent += row.join(",") + "\r\n";
        });

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Attendance_Report_${startDate}_to_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

      } else if (format === "pdf") {
        // Generate Printable Full HTML Page for PDF Download via window.print()
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
          alert("Popup blocked! Please allow popups in your browser settings to download PDF.");
          setReportLoading(false);
          return;
        }

        let html = `
          <html>
            <head>
              <title>Attendance Report (${startDate} to ${endDate})</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 15px; color: #111; }
                h2 { text-align: center; margin-bottom: 5px; color: #1d166a; }
                p.subtitle { text-align: center; font-size: 13px; color: #555; margin-top: 0; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; font-size: 9px; margin-top: 10px; }
                th, td { border: 1px solid #cbd5e1; padding: 5px 3px; text-align: center; }
                th { background-color: #1d166a; color: #fff; font-weight: bold; }
                .name-col { text-align: left; padding-left: 6px; font-weight: bold; white-space: nowrap; }
                .present { background-color: #d1fae5; color: #065f46; font-weight: bold; }
                .absent { background-color: #fee2e2; color: #991b1b; }
                .holiday { background-color: #fef3c7; color: #92400e; }
                @media print {
                  body { margin: 5px; }
                  button { display: none; }
                  @page { size: landscape; }
                }
              </style>
            </head>
            <body>
              <h2>Smart Student Classes - Attendance Report</h2>
              <p class="subtitle">Range: ${startDate} to ${endDate} | Batch: ${reportBatch === "all" ? "ALL BATCHES" : `${BATCHES[reportBatch]?.label} (${BATCHES[reportBatch]?.time})`}</p>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th class="name-col">Student Name</th>
                    <th>Class</th>
                    ${dateList.map(dt => `<th>${dt}</th>`).join("")}
                    <th>Present</th>
                    <th>Absent</th>
                    <th>Holiday</th>
                  </tr>
                </thead>
                <tbody>
        `;

        studentArray.forEach(st => {
          let pCount = 0, aCount = 0, hCount = 0;
          let rowCells = "";

          dateList.forEach(dt => {
            const stCode = matrix[st.id]?.[dt] || "Absent";
            let clsName = "absent";
            if (stCode === "Present") { pCount++; clsName = "present"; }
            else if (stCode === "Holiday") { hCount++; clsName = "holiday"; }
            else { aCount++; }

            rowCells += `<td class="${clsName}">${stCode === "Present" ? "P" : stCode === "Holiday" ? "H" : "A"}</td>`;
          });

          html += `
            <tr>
              <td>${st.id}</td>
              <td class="name-col">${st.name}</td>
              <td>${st.class}</td>
              ${rowCells}
              <td style="font-weight: bold; color: #059669;">${pCount}</td>
              <td style="font-weight: bold; color: #dc2626;">${aCount}</td>
              <td style="font-weight: bold; color: #d97706;">${hCount}</td>
            </tr>
          `;
        });

        html += `
                </tbody>
              </table>
              <div style="margin-top: 30px; text-align: center;">
                <button onclick="window.print()" style="padding: 12px 24px; background: #4338ca; color: #fff; border: none; border-radius: 6px; font-size: 14px; font-weight: bold; cursor: pointer;">Print / Save as PDF</button>
              </div>
            </body>
          </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
      }

    } catch (err) {
      console.error("Report Generation Error:", err);
      alert("Failed to generate report.");
    } finally {
      setReportLoading(false);
      setShowReportModal(false);
    }
  };

  const batch1 = students.filter((s) => s.batch === "batch1");
  const batch2 = students.filter((s) => s.batch === "batch2");
  const batch3 = students.filter((s) => s.batch === "batch3");

  const getBatchStudentsForShift = (batch) => students.filter((s) => s.batch === batch);
  const toggleShiftStudent = (id) => setSelectedShiftStudents((prev) =>
    prev.includes(String(id)) ? prev.filter((x) => x !== String(id)) : [...prev, String(id)]
  );
  const selectAllShiftStudents = () =>
    setSelectedShiftStudents(getBatchStudentsForShift(shiftSourceBatch).map((s) => String(s.id)));
  const clearShiftStudents = () => setSelectedShiftStudents([]);

  const shiftSelectedStudents = () => {
    if (shiftSourceBatch === shiftTargetBatch) return alert("Source and target batch cannot be the same.");
    if (!selectedShiftStudents.length) return alert("Please select at least one student.");
    const updated = { ...batchOverrides };
    selectedShiftStudents.forEach((id) => { updated[String(id)] = shiftTargetBatch; });
    setBatchOverrides(updated);
    localStorage.setItem("smartStudentBatchOverrides", JSON.stringify(updated));
    setSuccessMsg(`${selectedShiftStudents.length} student(s) shifted to ${BATCHES[shiftTargetBatch].label}.`);
    setSelectedShiftStudents([]);
    setShiftSourceBatch(shiftTargetBatch);
  };

  const totalCombinedStudents = students.length;
  const totalCombinedPresent = students.filter((s) => (attendance[s.id] || "Absent") === "Present").length;
  const totalCombinedAbsent = students.filter((s) => (attendance[s.id] || "Absent") === "Absent").length;
  const totalCombinedHoliday = students.filter((s) => (attendance[s.id] || "Absent") === "Holiday").length;

  const filterBySearch = (list) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        String(s.id).toLowerCase().includes(q) ||
        String(s.class).toLowerCase().includes(q)
    );
  };

  const renderTable = (title, list) => {
    const filteredList = filterBySearch(list);
    const presentCount = list.filter((s) => (attendance[s.id] || "Absent") === "Present").length;
    const absentCount = list.filter((s) => (attendance[s.id] || "Absent") === "Absent").length;
    const holidayCount = list.filter((s) => (attendance[s.id] || "Absent") === "Holiday").length;

    return (
      <div className="table-wrapper">
        <div className="table-header-row">
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", color: "#111827" }}>
              {title} ({list.length})
            </h2>
            <div className="quick-stats-pills">
              <span className="pill green">🟢 Total Present: {presentCount}</span>
              <span className="pill red">🔴 Total Absent: {absentCount}</span>
              <span className="pill yellow">🟡 Total Holiday: {holidayCount}</span>
            </div>
          </div>
          
          <div className="table-actions-group">
            <input
              type="text"
              placeholder="🔍 Search student name/ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {editAllowed && (
              <div className="bulk-buttons">
                <button type="button" className="bulk-btn green" onClick={() => handleMarkAll("Present", list)}>All Present</button>
                <button type="button" className="bulk-btn red" onClick={() => handleMarkAll("Absent", list)}>All Absent</button>
                <button type="button" className="bulk-btn yellow" onClick={() => handleMarkAll("Holiday", list)}>All Holiday</button>
              </div>
            )}
          </div>
        </div>

        {filteredList.length === 0 ? (
          <p style={{ marginTop: 15, textAlign: "center", color: "#6b7280" }}>No matching active students found.</p>
        ) : (
          <div className="table-container-scroll">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Student Name</th>
                  <th>Class</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Holiday</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((s) => {
                  const status = attendance[s.id] || "Absent";
                  return (
                    <motion.tr
                      key={s.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{
                        backgroundColor:
                          status === "Present"
                            ? "#5bd57b" 
                            : status === "Absent"
                            ? "#f8b8b8" 
                            : "#d1f0bb", 
                      }}
                    >
                      <td style={{ fontWeight: "600", color: "#4b5563" }}>#{s.id}</td>
                      <td style={{ fontWeight: "600", color: "#1f2937" }}>{s.name}</td>
                      <td><span className="class-badge">Class {s.class}</span></td>
                      <td>
                        <label className={`radio-label green ${status === "Present" ? "selected" : ""}`}>
                          <input
                            type="radio"
                            name={`att-${s.id}`}
                            checked={status === "Present"}
                            onChange={() => handleChange(s.id, "Present")}
                            disabled={!editAllowed}
                          />
                          <span>Present</span>
                        </label>
                      </td>
                      <td>
                        <label className={`radio-label red ${status === "Absent" ? "selected" : ""}`}>
                          <input
                            type="radio"
                            name={`att-${s.id}`}
                            checked={status === "Absent"}
                            onChange={() => handleChange(s.id, "Absent")}
                            disabled={!editAllowed}
                          />
                          <span>Absent</span>
                        </label>
                      </td>
                      <td>
                        <label className={`radio-label yellow ${status === "Holiday" ? "selected" : ""}`}>
                          <input
                            type="radio"
                            name={`att-${s.id}`}
                            checked={status === "Holiday"}
                            onChange={() => handleChange(s.id, "Holiday")}
                            disabled={!editAllowed}
                          />
                          <span>Holiday</span>
                        </label>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="attendance-container">
      <div className="header-banner">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "14px" }}>
          <div>
            <h1>Smart Student Attendance Portal</h1>
            <p>
              Manage daily attendance seamlessly for your 3 batches (3:00 PM-4:30 PM, 4:30 PM-6:00 PM and 6:00 PM-7:30 PM). 
              Attendance can be marked or updated for any date freely. 
            </p>
          </div>
          <button 
            type="button"
            className="report-download-btn"
            onClick={() => setShowReportModal(true)}
          >
            📊 Download Month/Date Range Report (PDF / Sheet)
          </button>
        </div>
      </div>

      <div className="controls-row">
        <div className="batch-selector">
            {Object.entries(BATCHES).map(([key, batch]) => (
              <button key={key} type="button" className={`batch-link ${batchType === key ? "active" : ""}`}
                onClick={() => { setBatchType(key); setShowTable(true); }}>
                ⏰ {batch.label} ({batch.time})
              </button>
            ))}
            <button type="button" className="batch-link edit-batches-btn"
              onClick={() => { setShowEditBatches(true); setSelectedShiftStudents([]); }}>
              ✏️ Edit Batches
            </button>
          </div>

          <div className="date-picker">
          <label htmlFor="att-date">📅 Select Date: </label>
          <input
            id="att-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p className="loading-text">Loading student records securely...</p>
        </div>
      ) : infoMsg ? (
        <div className="info-msg">⚠️ {infoMsg}</div>
      ) : showTable ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {batchType === "batch1" && renderTable("Batch 1 (3:00 PM - 4:30 PM)", batch1)}
          {batchType === "batch2" && renderTable("Batch 2 (4:30 PM - 6:00 PM)", batch2)}
          {batchType === "batch3" && renderTable("Batch 3 (6:00 PM - 7:30 PM)", batch3)}

          <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button type="button" className="secondary-btn" onClick={() => setShowTable(false)}>
              ⬅ Back to Overview
            </button>
            {isFirstTime ? (
              <button type="button" className="submit-btn" onClick={submitAttendance} disabled={btnDisabled || !editAllowed}>
                {btnDisabled ? "Submitting..." : "🚀 Submit Attendance"}
              </button>
            ) : (
              <button type="button" className="submit-btn update" onClick={updateAttendance} disabled={!editAllowed || btnDisabled}>
                {btnDisabled ? "Updating..." : "🔄 Update Attendance"}
              </button>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="action-card-prompt">
          <div className="prompt-badge">Selected Date: <strong>{selectedDate}</strong></div>
          <p>Ready to manage attendance logs for this session? Click below to load batch lists.</p>
          <button type="button" className="submit-btn large" onClick={() => setShowTable(true)} disabled={btnDisabled}>
            {isFirstTime ? (selectedDate === getFormattedDate() ? "⚡ Mark Today's Attendance Now" : "📂 Mark Attendance") : "✏️ Edit Attendance"}
          </button>

          {!loading && students.length > 0 && (
            <div className="overview-combined-card">
              <h4>📋 Combined Batches Overview ({selectedDate})</h4>
              <div className="overview-grid">
                <div className="overview-item total">
                  <span>Total Students</span>
                  <strong>{totalCombinedStudents}</strong>
                </div>
                <div className="overview-item present">
                  <span>Total Present</span>
                  <strong>{totalCombinedPresent}</strong>
                </div>
                <div className="overview-item absent">
                  <span>Total Absent</span>
                  <strong>{totalCombinedAbsent}</strong>
                </div>
                <div className="overview-item holiday">
                  <span>Total Holiday</span>
                  <strong>{totalCombinedHoliday}</strong>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {summaryData && (
        <AnimatePresence>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="summary-card"
          >
            <h3>📊 Attendance Summary Report ({BATCHES[batchType]?.label} - {BATCHES[batchType]?.time})</h3>
            <div className="summary-grid">
              <div className="summary-item total">
                <span>Total Students</span>
                <strong>{summaryData.totalStudents}</strong>
              </div>
              <div className="summary-item present">
                <span>Total Present</span>
                <strong>{summaryData.totalPresent}</strong>
              </div>
              <div className="summary-item absent">
                <span>Total Absent</span>
                <strong>{summaryData.totalAbsent}</strong>
              </div>
              <div className="summary-item holiday">
                <span>Total Holiday</span>
                <strong>{summaryData.totalHoliday}</strong>
              </div>
            </div>
            {successMsg && <div className="success-msg">🎉 {successMsg}</div>}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Edit Batches Modal */}
      {showEditBatches && (
        <div className="modal-backdrop">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="modal-card edit-batch-modal">
            <div className="edit-batch-header">
              <div>
                <h3>✏️ Edit Batches / Shift Students</h3>
                <p>Select a batch, select students, choose the target batch and shift them.</p>
              </div>
              <button type="button" className="close-modal-btn" onClick={() => setShowEditBatches(false)}>✕</button>
            </div>
            <div className="modal-form-group">
              <label>1. Select Batch</label>
              <select value={shiftSourceBatch} onChange={(e) => { setShiftSourceBatch(e.target.value); setSelectedShiftStudents([]); }}>
                {Object.entries(BATCHES).map(([key, batch]) => (
                  <option key={key} value={key}>{batch.label} — {batch.time} ({getBatchStudentsForShift(key).length} students)</option>
                ))}
              </select>
            </div>
            <div className="shift-student-box">
              <div className="shift-list-header">
                <strong>Students in {BATCHES[shiftSourceBatch].label} ({getBatchStudentsForShift(shiftSourceBatch).length})</strong>
                <div>
                  <button type="button" className="mini-btn" onClick={selectAllShiftStudents}>Select All</button>
                  <button type="button" className="mini-btn" onClick={clearShiftStudents}>Clear</button>
                </div>
              </div>
              <div className="shift-student-list">
                {getBatchStudentsForShift(shiftSourceBatch).length === 0 ? <div className="empty-shift-list">No students in this batch.</div> :
                  getBatchStudentsForShift(shiftSourceBatch).map((st) => (
                    <label key={st.id} className="shift-student-row">
                      <input type="checkbox" checked={selectedShiftStudents.includes(String(st.id))} onChange={() => toggleShiftStudent(st.id)} />
                      <span><strong>#{st.id}</strong> {st.name}<small>Class {st.class}</small></span>
                    </label>
                  ))}
              </div>
            </div>
            <div className="modal-form-group">
              <label>2. Shift Selected Students To</label>
              <select value={shiftTargetBatch} onChange={(e) => setShiftTargetBatch(e.target.value)}>
                {Object.entries(BATCHES).map(([key, batch]) => <option key={key} value={key}>{batch.label} — {batch.time}</option>)}
              </select>
            </div>
            <div className="shift-selection-info">{selectedShiftStudents.length} student(s) selected</div>
            <div className="modal-buttons">
              <button type="button" className="secondary-btn" onClick={() => { setShowEditBatches(false); setSelectedShiftStudents([]); }}>Cancel</button>
              <button type="button" className="submit-btn update" onClick={shiftSelectedStudents}
                disabled={!selectedShiftStudents.length || shiftSourceBatch === shiftTargetBatch}>🔄 Shift Students</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Date Range Report Modal */}
      {showReportModal && (
        <div className="modal-backdrop">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="modal-card"
          >
            <h3>📥 Download Month / Date Range Attendance Report</h3>
            <p>Select a quick month name or exact date range to generate full attendance sheets and PDF reports.</p>
            
            <div className="modal-form-group">
              <label>📅 Quick Select Month (Clear Month View):</label>
              <input 
                type="month" 
                defaultValue={startDate.slice(0, 7)}
                onChange={handleMonthPresetChange} 
                style={{ cursor: "pointer", background: "#fdf8f6" }}
              />
              <small style={{ color: "#6b7280", fontSize: "11px", marginTop: "2px" }}>Selecting a month automatically sets the full date range from the 1st to the end of that month.</small>
            </div>

            <div className="modal-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div className="modal-form-group">
                <label>Start Date:</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                />
              </div>
              <div className="modal-form-group">
                <label>End Date:</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                />
              </div>
            </div>

            <div className="modal-form-group">
              <label>Batch Selection:</label>
              <select value={reportBatch} onChange={(e) => setReportBatch(e.target.value)}>
                <option value="all">All Batches Combined</option>
                <option value="batch1">Batch 1 (3:00 PM - 4:30 PM)</option>
                <option value="batch2">Batch 2 (4:30 PM - 6:00 PM)</option>
                <option value="batch3">Batch 3 (6:00 PM - 7:30 PM)</option>
              </select>
            </div>

            <div className="modal-buttons">
              <button 
                type="button" 
                className="secondary-btn" 
                onClick={() => setShowReportModal(false)}
                disabled={reportLoading}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="submit-btn" 
                onClick={() => handleDownloadReport("csv")}
                disabled={reportLoading}
              >
                {reportLoading ? "Generating..." : "📈 Download Excel / CSV"}
              </button>
              <button 
                type="button" 
                className="submit-btn update" 
                onClick={() => handleDownloadReport("pdf")}
                disabled={reportLoading}
              >
                {reportLoading ? "Generating..." : "📄 Download PDF Report"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <style>{`
        .attendance-container { 
          width: 95%; 
          max-width: 1050px; 
          margin: 30px auto; 
          font-family: 'Inter', system-ui, sans-serif; 
          color: #1f2937;
          background: #ffffff;
          padding: 32px;
          border-radius: 20px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 10px 30px rgba(0,0,0,0.04);
        }
        .header-banner {
          background: linear-gradient(135deg, #1d166a 0%, #6d28d9 100%);
          color: #ffffff;
          padding: 24px 28px;
          border-radius: 14px;
          margin-bottom: 24px;
          box-shadow: 0 4px 15px rgba(109,40,217,0.2);
        }
        .header-banner h1 { font-size: 24px; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -0.5px; }
        .header-banner p { font-size: 14px; margin: 0; color: #e0e7ff; line-height: 1.6; }
        
        .report-download-btn {
          background: #ffffff;
          color: #4338ca;
          font-weight: 700;
          font-size: 13px;
          padding: 10px 16px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.1);
          transition: all 0.2s;
        }
        .report-download-btn:hover { background: #f3f4f6; transform: translateY(-1px); }

        .controls-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 24px;
          background: #f9fafb;
          padding: 16px 20px;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
        }
        .batch-selector { display: flex; gap: 12px; }
        .batch-link { 
          cursor: pointer; color: #4338ca; font-weight: 700; font-size: 14px; 
          padding: 10px 18px; background: #ede9fe; border-radius: 8px; 
          transition: all 0.2s ease; border: 1px solid #ddd6fe; 
          display: inline-flex; align-items: center; gap: 6px;
        }
        .batch-link:hover { background: #ddd6fe; transform: translateY(-1px); }
        .batch-link.active { background: #4338ca; color: #fff; border-color: #4338ca; box-shadow: 0 4px 12px rgba(67,56,202,0.3); }
        
        .date-picker { display: flex; align-items: center; gap: 10px; font-weight: 600; font-size: 14px; color: #4b5563; }
        .date-picker input { padding: 9px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none; background: #ffffff; color: #1f2937; transition: border 0.2s; }
        .date-picker input:focus { border-color: #4338ca; box-shadow: 0 0 0 3px rgba(67,56,202,0.1); }
        
        .action-card-prompt {
          text-align: center;
          padding: 35px 20px;
          background: #f8fafc;
          border-radius: 14px;
          border: 2px dashed #cbd5e1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .prompt-badge { background: #e0e7ff; color: #3730a3; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; }
        .action-card-prompt p { margin: 0; font-size: 15px; color: #4b5563; }

        .overview-combined-card {
          width: 100%;
          max-width: 650px;
          margin-top: 15px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 18px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.02);
        }
        .overview-combined-card h4 { margin: 0 0 12px 0; font-size: 15px; font-weight: 700; color: #1e293b; }
        .overview-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .overview-item { background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 4px; text-align: center; }
        .overview-item span { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; }
        .overview-item strong { font-size: 18px; color: #1e293b; }
        .overview-item.present strong { color: #059669; }
        .overview-item.absent strong { color: #dc2626; }
        .overview-item.holiday strong { color: #d97706; }

        .table-wrapper { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
        .table-header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 16px; border-bottom: 1px solid #f3f4f6; padding-bottom: 16px; }
        
        .quick-stats-pills { display: flex; gap: 10px; margin-top: 8px; flex-wrap: wrap; }
        .pill { font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 20px; background: #f3f4f6; }
        .pill.green { background: #d1fae5; color: #065f46; }
        .pill.red { background: #fee2e2; color: #991b1b; }
        .pill.yellow { background: #fef3c7; color: #92400e; }

        .table-actions-group { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .search-input { padding: 8px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 13px; outline: none; width: 220px; }
        .search-input:focus { border-color: #4338ca; box-shadow: 0 0 0 3px rgba(67,56,202,0.1); }

        .bulk-buttons { display: flex; gap: 6px; }
        .bulk-btn { font-size: 12px; font-weight: 600; padding: 7px 12px; border-radius: 6px; border: none; cursor: pointer; transition: 0.15s; }
        .bulk-btn.green { background: #a7f3d0; color: #065f46; }
        .bulk-btn.red { background: #fecaca; color: #991b1b; }
        .bulk-btn.yellow { background: #fde68a; color: #92400e; }
        .bulk-btn:hover { opacity: 0.85; transform: translateY(-1px); }

        .table-container-scroll { max-height: none; overflow-y: visible; border-radius: 8px; border: 1px solid #e5e7eb; }
        .attendance-table { width: 100%; border-collapse: collapse; text-align: left; }
        .attendance-table th, .attendance-table td { padding: 12px 16px; font-size: 14px; border-bottom: 1px solid #f3f4f6; }
        .attendance-table th { background-color: #3730a3; color: white; font-weight: 600; position: static; }
        
        .class-badge { background: #f3f4f6; color: #374151; padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: 600; }

        .radio-label { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-weight: 600; font-size: 13px; padding: 6px 10px; border-radius: 6px; transition: 0.15s; }
        .radio-label input { accent-color: #3730a3; cursor: pointer; width: 16px; height: 16px; }
        .radio-label.green.selected { background: #d1fae5; color: #065f46; }
        .radio-label.red.selected { background: #fee2e2; color: #991b1b; }
        .radio-label.yellow.selected { background: #fef3c7; color: #92400e; }

        .submit-btn { padding: 12px 26px; background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%); color: white; border: none; cursor: pointer; border-radius: 10px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 15px rgba(67,56,202,0.3); transition: 0.2s; }
        .submit-btn.update { background: linear-gradient(135deg, #059669 0%, #10b981 100%); box-shadow: 0 4px 15px rgba(16,185,129,0.3); }
        .submit-btn.large { padding: 16px 36px; font-size: 16px; }
        .submit-btn:hover { opacity: 0.95; transform: translateY(-2px); }
        .submit-btn:disabled { background: #9ca3af; cursor: not-allowed; box-shadow: none; transform: none; }

        .secondary-btn { padding: 12px 20px; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; cursor: pointer; border-radius: 10px; font-weight: 600; font-size: 14px; transition: 0.2s; }
        .secondary-btn:hover { background: #e5e7eb; }
        
        .success-msg { color: #047857; font-weight: 700; margin-top: 14px; font-size: 14px; background: #ecfdf5; padding: 10px; border-radius: 8px; border: 1px solid #a7f3d0; text-align: center; }
        .info-msg { margin-top: 16px; padding: 14px 18px; background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; font-weight: 600; font-size: 14px; border-radius: 10px; display: flex; align-items: center; gap: 8px; }
        
        .loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; gap: 12px; }
        .spinner { width: 40px; height: 40px; border: 4px solid #e0e7ff; border-top: 4px solid #4338ca; border-radius: 50%; animation: spin 0.8s linear infinite; }
        .loading-text { font-size: 14px; color: #6b7280; font-weight: 600; }
        
        .summary-card {
          margin-top: 24px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }
        .summary-card h3 { margin: 0 0 16px 0; font-size: 17px; font-weight: 700; color: #111827; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 14px; }
        .summary-item { background: #ffffff; padding: 16px; border-radius: 10px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 6px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.01); }
        .summary-item span { font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .summary-item strong { font-size: 22px; color: #1e293b; }
        .summary-item.present strong { color: #059669; }
        .summary-item.absent strong { color: #dc2626; }
        .summary-item.holiday strong { color: #d97706; }

        /* Modal Styles */
        .modal-backdrop {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .modal-card {
          background: #ffffff;
          padding: 28px;
          border-radius: 16px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .modal-card h3 { margin: 0 0 8px 0; font-size: 18px; color: #111827; font-weight: 800; }
        .modal-card p { font-size: 13px; color: #6b7280; margin-bottom: 20px; line-height: 1.5; }
        .modal-form-group { margin-bottom: 16px; display: flex; flex-direction: column; gap: 6px; }
        .modal-form-group label { font-size: 13px; font-weight: 700; color: #374151; }
        .modal-form-group input, .modal-form-group select {
          padding: 10px 14px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
        }
        .modal-form-group input:focus, .modal-form-group select:focus {
          border-color: #4338ca;
          box-shadow: 0 0 0 3px rgba(67, 56, 202, 0.1);
        }
        .modal-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 24px;
          flex-wrap: wrap;
        }
        
        .edit-batches-btn { background: #fef3c7; color: #92400e; border-color: #fde68a; }
        .edit-batches-btn:hover { background: #fde68a; }
        .edit-batch-modal { max-width: 650px; max-height: 90vh; overflow-y: auto; }
        .edit-batch-header { display: flex; justify-content: space-between; gap: 15px; align-items: flex-start; }
        .edit-batch-header p { margin-bottom: 15px; }
        .close-modal-btn { border: none; background: #f3f4f6; color: #374151; width: 34px; height: 34px; border-radius: 8px; cursor: pointer; font-weight: 800; }
        .shift-student-box { border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; margin-bottom: 16px; background: #f9fafb; }
        .shift-list-header { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 12px 14px; background: #f3f4f6; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
        .mini-btn { border: 1px solid #d1d5db; background: white; padding: 5px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; margin-left: 5px; }
        .shift-student-list { max-height: 280px; overflow-y: auto; padding: 6px; }
        .shift-student-row { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 7px; cursor: pointer; background: white; margin-bottom: 4px; }
        .shift-student-row input { width: 17px; height: 17px; accent-color: #4338ca; }
        .shift-student-row span { display: flex; align-items: center; gap: 7px; font-size: 13px; flex: 1; }
        .shift-student-row small { margin-left: auto; color: #6b7280; }
        .empty-shift-list { text-align: center; padding: 25px; color: #6b7280; font-size: 13px; }
        .shift-selection-info { background: #eef2ff; color: #3730a3; padding: 9px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; text-align: center; }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default MarkAttendance;