import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../services/api";
import { motion, AnimatePresence } from "framer-motion";

const customBatchMap = { 13: "batch2", 12: "batch1", 24: "batch1", 28: "batch1" };

const BATCHES = {
  batch1: { label: "Batch 1", time: "3:00 PM - 4:30 PM" },
  batch2: { label: "Batch 2", time: "4:30 PM - 6:00 PM" },
  batch3: { label: "Batch 3", time: "6:00 PM - 7:30 PM" },
};

const normalizeBatch = (batch) => {
  const v = String(batch || "").trim().toLowerCase().replace(/\s+/g, "");
  if (["batch1", "batch-1"].includes(v)) return "batch1";
  if (["batch2", "batch-2"].includes(v)) return "batch2";
  if (["batch3", "batch-3"].includes(v)) return "batch3";
  return "batch1";
};

const getFormattedDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

const getDates = (start, end) => {
  const dates = [];
  for (
    let d = new Date(`${start}T00:00:00`);
    d <= new Date(`${end}T00:00:00`);
    d.setDate(d.getDate() + 1)
  )
    dates.push(getFormattedDate(d));
  return dates;
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
    try {
      return JSON.parse(
        localStorage.getItem("smartStudentBatchOverrides") || "{}"
      );
    } catch {
      return {};
    }
  });

  const [showEditBatches, setShowEditBatches] = useState(false);
  const [shiftSourceBatch, setShiftSourceBatch] = useState("batch1");
  const [shiftTargetBatch, setShiftTargetBatch] = useState("batch2");
  const [selectedShiftStudents, setSelectedShiftStudents] = useState([]);
  const [shiftSearchQuery, setShiftSearchQuery] = useState("");
  const [shiftLoading, setShiftLoading] = useState(false);

  const [showReportModal, setShowReportModal] = useState(false);
  const [startDate, setStartDate] = useState(
    getFormattedDate(new Date(new Date().setDate(1)))
  );
  const [endDate, setEndDate] = useState(getFormattedDate());
  const [reportBatch, setReportBatch] = useState("all");
  const [reportStudent, setReportStudent] = useState("all");
  const [reportLoading, setReportLoading] = useState(false);

  const handleMonthPresetChange = (e) => {
    if (!e.target.value) return;
    const [year, month] = e.target.value.split("-");
    const first = new Date(year, month - 1, 1);
    const last = new Date(year, month, 0);
    const today = new Date();

    setStartDate(getFormattedDate(first));
    setEndDate(getFormattedDate(last > today ? today : last));
  };

  // FETCH STUDENTS
  const fetchStudents = useCallback(
    async (date) => {
      setLoading(true);
      setSuccessMsg("");
      setInfoMsg("");
      setSummaryData(null);

      try {
        const [bannedRes, res] = await Promise.all([
          api.get("/api/auth/banned-students").catch(() => ({
            data: { success: false, students: [] },
          })),
          api.get(`/api/attendance/list?date=${date}`),
        ]);

        const banned = bannedRes?.data?.success
          ? bannedRes.data.students || []
          : [];

        const bannedIds = new Set(
          banned.map((b) => String(b.id || b.studentId))
        );
        const bannedNames = new Set(
          banned.map((b) =>
            String(b.name || "").trim().toLowerCase()
          )
        );

        if (!res?.data?.success) {
          setStudents([]);
          setAttendance({});
          setIsFirstTime(true);
          setShowTable(false);
          setInfoMsg("No students found for this date.");
          return;
        }

        const list = (res.data.students || [])
          .filter((s) => {
            const id = String(s.studentId || s.id);
            const name = String(s.studentName || s.name || "")
              .trim()
              .toLowerCase();

            return !bannedIds.has(id) && !bannedNames.has(name);
          })
          .map((s) => {
            const id = s.studentId || s.id;
            const batch = normalizeBatch(
              batchOverrides[String(id)] ||
                s.batch ||
                customBatchMap[String(id)]
            );

            return {
              id,
              name: s.studentName || s.name,
              class: s.class,
              status: s.status || "Absent",
              batch,
              batchTime:
                s.batchTime || BATCHES[batch]?.time || "Not Assigned",
            };
          });

        setStudents(list);

        const initial = {};
        let existing = false;

        list.forEach((s) => {
          initial[s.id] = s.status || "Absent";
          if (s.status !== "Absent") existing = true;
        });

        setAttendance(initial);
        setIsFirstTime(!existing);
        setEditAllowed(true);
        setShowTable(false);
      } catch (err) {
        console.error("Fetch Error:", err);
        setStudents([]);
        setAttendance({});
        setIsFirstTime(true);
        setShowTable(false);
        setInfoMsg("Error fetching students.");
      } finally {
        setLoading(false);
      }
    },
    [batchOverrides]
  );

  useEffect(() => {
    fetchStudents(selectedDate);
  }, [selectedDate, fetchStudents]);

  // ATTENDANCE
  const handleChange = (id, status) =>
    setAttendance((prev) => ({ ...prev, [id]: status }));

  const handleMarkAll = (status, list) => {
    const updated = { ...attendance };
    list.forEach((s) => (updated[s.id] = status));
    setAttendance(updated);
  };

  const sendAttendance = async (action = "submit") => {
    setBtnDisabled(true);

    const list = students.filter(
      (s) => normalizeBatch(s.batch) === batchType
    );

    const attendanceData = list.map((s) => ({
      studentId: s.id,
      status: attendance[s.id] || "Absent",
    }));

    const counts = { present: 0, absent: 0, holiday: 0 };

    list.forEach((s) => {
      const status = attendance[s.id] || "Absent";
      if (status === "Present") counts.present++;
      else if (status === "Holiday") counts.holiday++;
      else counts.absent++;
    });

    try {
      await api.post("/api/attendance/mark", {
        date: selectedDate,
        attendance: attendanceData,
      });

      setSuccessMsg(
        action === "submit"
          ? "Attendance Submitted Successfully!"
          : "Attendance Updated Successfully!"
      );

      setSummaryData({
        totalStudents: list.length,
        totalPresent: counts.present,
        totalAbsent: counts.absent,
        totalHoliday: counts.holiday,
      });

      setIsFirstTime(false);
      setShowTable(false);
    } catch (err) {
      console.error("Submit Error:", err);
      alert("Error submitting attendance");
    } finally {
      setBtnDisabled(false);
    }
  };

  // BATCH DATA
  const batch1 = useMemo(
    () => students.filter((s) => normalizeBatch(s.batch) === "batch1"),
    [students]
  );

  const batch2 = useMemo(
    () => students.filter((s) => normalizeBatch(s.batch) === "batch2"),
    [students]
  );

  const batch3 = useMemo(
    () => students.filter((s) => normalizeBatch(s.batch) === "batch3"),
    [students]
  );

  const getBatchStudents = useCallback(
    (batch) =>
      batch === "batch1"
        ? batch1
        : batch === "batch2"
        ? batch2
        : batch === "batch3"
        ? batch3
        : [],
    [batch1, batch2, batch3]
  );

  // SHIFT STUDENTS
  const getFilteredShiftStudents = (batch) => {
    const q = shiftSearchQuery.trim().toLowerCase();
    const list = getBatchStudents(batch);

    if (!q) return list;

    return list.filter(
      (s) =>
        String(s.id).toLowerCase().includes(q) ||
        String(s.name || "").toLowerCase().includes(q) ||
        String(s.class || "").toLowerCase().includes(q)
    );
  };

  const toggleShiftStudent = (id) => {
    const value = String(id);

    setSelectedShiftStudents((prev) =>
      prev.includes(value)
        ? prev.filter((x) => x !== value)
        : [...prev, value]
    );
  };

  const selectAllShiftStudents = () => {
    const ids = getFilteredShiftStudents(shiftSourceBatch).map((s) =>
      String(s.id)
    );

    const all = ids.every((id) => selectedShiftStudents.includes(id));

    setSelectedShiftStudents((prev) =>
      all
        ? prev.filter((id) => !ids.includes(id))
        : [...new Set([...prev, ...ids])]
    );
  };

  const clearShiftStudents = () => setSelectedShiftStudents([]);

  const shiftSelectedStudents = async () => {
    if (shiftSourceBatch === shiftTargetBatch)
      return alert("Source and target batch must be different.");

    if (!selectedShiftStudents.length)
      return alert("Please select at least one student to continue.");

    const selected = students.filter((s) =>
      selectedShiftStudents.includes(String(s.id))
    );

    const target = BATCHES[shiftTargetBatch];

    if (
      !window.confirm(
        `Shift ${selected.length} student(s) from ${
          BATCHES[shiftSourceBatch].label
        } to ${target.label} (${target.time})?`
      )
    )
      return;

    try {
      setShiftLoading(true);
      setSuccessMsg("");

      const results = await Promise.all(
        selected.map((student) =>
          api.put(`/api/attendance/student/${student.id}/batch`, {
            batch: shiftTargetBatch,
          })
        )
      );

      if (results.some((r) => !r?.data?.success))
        throw new Error("Some students could not be shifted.");

      const overrides = { ...batchOverrides };

      selected.forEach(
        (s) => (overrides[String(s.id)] = shiftTargetBatch)
      );

      setBatchOverrides(overrides);
      localStorage.setItem(
        "smartStudentBatchOverrides",
        JSON.stringify(overrides)
      );

      setStudents((prev) =>
        prev.map((s) =>
          selectedShiftStudents.includes(String(s.id))
            ? {
                ...s,
                batch: shiftTargetBatch,
                batchTime: target.time,
              }
            : s
        )
      );

      setSuccessMsg(
        `${selected.length} student(s) successfully shifted to ${target.label}.`
      );

      setSelectedShiftStudents([]);
      setShiftSearchQuery("");
      setShiftSourceBatch(shiftTargetBatch);

      const next = Object.keys(BATCHES).find(
        (key) => key !== shiftTargetBatch
      );

      if (next) setShiftTargetBatch(next);
    } catch (err) {
      console.error("Batch shift error:", err);
      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to shift students."
      );
    } finally {
      setShiftLoading(false);
    }
  };

  // TOTALS
  const totals = useMemo(() => {
    const result = {
      total: students.length,
      present: 0,
      absent: 0,
      holiday: 0,
    };

    students.forEach((s) => {
      const status = attendance[s.id] || "Absent";

      if (status === "Present") result.present++;
      else if (status === "Holiday") result.holiday++;
      else result.absent++;
    });

    return result;
  }, [students, attendance]);

  const filterBySearch = (list) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;

    return list.filter(
      (s) =>
        String(s.name).toLowerCase().includes(q) ||
        String(s.id).toLowerCase().includes(q) ||
        String(s.class).toLowerCase().includes(q)
    );
  };

  // REPORT
  const fetchReportData = async () => {
    if (startDate > endDate)
      throw new Error("Start date cannot be after end date.");

    const dates = getDates(startDate, endDate);

    const responses = await Promise.all(
      dates.map((date) =>
        api
          .get(`/api/attendance/list?date=${date}`)
          .then((res) => ({ date, data: res?.data }))
          .catch((error) => {
            console.error(`Report fetch failed for ${date}`, error);
            return { date, data: null };
          })
      )
    );

    const map = {};

    responses.forEach(({ date, data }) => {
      if (!data?.success) return;

      (data.students || []).forEach((s) => {
        const id = s.studentId || s.id;
        const name = s.studentName || s.name || "";

        const batch = normalizeBatch(
          batchOverrides[String(id)] ||
            s.batch ||
            customBatchMap[String(id)]
        );

        if (reportBatch !== "all" && batch !== reportBatch) return;

        if (
          reportStudent !== "all" &&
          String(id) !== String(reportStudent)
        )
          return;

        if (!map[id]) {
          map[id] = {
            studentId: id,
            studentName: name,
            class: s.class || "",
            dates: {},
            present: 0,
            absent: 0,
            holiday: 0,
          };
        }

        const status = s.status || "Absent";
        const short =
          status === "Present"
            ? "P"
            : status === "Holiday"
            ? "H"
            : "A";

        map[id].dates[date] = short;

        if (status === "Present") map[id].present++;
        else if (status === "Holiday") map[id].holiday++;
        else map[id].absent++;
      });
    });

    return Object.values(map)
      .sort((a, b) =>
        String(a.studentName).localeCompare(String(b.studentName))
      )
      .map((r) => {
        const total = r.present + r.absent + r.holiday;
        const working = r.present + r.absent;

        return {
          ...r,
          total,
          percentage: working
            ? ((r.present / working) * 100).toFixed(1)
            : "0.0",
        };
      });
  };

  // CSV
  const csvEscape = (v) =>
    `"${String(v ?? "").replace(/"/g, '""')}"`;

  const downloadCSV = (rows) => {
    const dates = getDates(startDate, endDate);

    const formatDate = (date) =>
      new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

    const headers = [
      "Student ID",
      "Student Name",
      "Class",
      ...dates.map(formatDate),
      "P Count",
      "A Count",
      "H Count",
      "Total",
      "Attendance %",
    ];

    const data = rows.map((r) => [
      r.studentId,
      r.studentName,
      r.class,
      ...dates.map((date) => r.dates[date] || "-"),
      r.present,
      r.absent,
      r.holiday,
      r.total,
      `${r.percentage}%`,
    ]);

    const csv = [headers, ...data]
      .map((row) => row.map(csvEscape).join(","))
      .join("\n");

    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" })
    );

    const link = document.createElement("a");
    link.href = url;
    link.download = `SmartStudents_Attendance_${startDate}_to_${endDate}${
      reportStudent !== "all" ? `_Student_${reportStudent}` : ""
    }.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    setSuccessMsg("Attendance CSV downloaded successfully.");
  };

  // ==================================================
  // PDF - COMPACT STUDENT WISE REPORT
  // ==================================================
  const downloadPDF = (rows) => {
    const dates = getDates(startDate, endDate);

    const generatedAt = new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const formatDate = (date) =>
      new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      });

    const fullStartDate = new Date(
      `${startDate}T00:00:00`
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const fullEndDate = new Date(
      `${endDate}T00:00:00`
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const win = window.open("", "_blank");

    if (!win) {
      alert("Please allow pop-ups to generate the PDF report.");
      return;
    }

    const dateHeaders = dates
      .map(
        (date) => `
          <th class="date-head">${formatDate(date)}</th>
        `
      )
      .join("");

    const tableRows = rows
      .map((r) => {
        const dateCells = dates
          .map((date) => {
            const status = r.dates[date] || "-";

            const cls =
              status === "P"
                ? "p"
                : status === "A"
                ? "a"
                : status === "H"
                ? "h"
                : "empty";

            return `<td class="status-cell ${cls}">${status}</td>`;
          })
          .join("");

        return `
          <tr>
            <td class="id-cell">#${r.studentId}</td>
            <td class="name-cell">${r.studentName}</td>
            <td class="class-cell">${r.class || "—"}</td>

            ${dateCells}

            <td class="count-cell p-count">${r.present}</td>
            <td class="count-cell a-count">${r.absent}</td>
            <td class="count-cell h-count">${r.holiday}</td>
            <td class="total-cell">${r.total}</td>
            <td class="percentage-cell">${r.percentage}%</td>
          </tr>
        `;
      })
      .join("");

    const reportFor =
      reportStudent === "all"
        ? reportBatch === "all"
          ? "All Students"
          : BATCHES[reportBatch]?.label
        : `Student: ${rows[0]?.studentName || reportStudent}`;

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Smart Students Attendance Report</title>

        <style>
          *{
            box-sizing:border-box;
          }

          html,body{
            margin:0;
            padding:0;
          }

          body{
            * {
  box-sizing: border-box;
  font-family: "Times New Roman", serif;
}
            color:#111827;
            font-size:8px;
            padding:10px;
          }

          .header{
            text-align:center;
            margin-bottom:9px;
          }

          h1{
            margin:0;
            font-size:18px;
            color:#312e81;
            font-weight:800;
          }

          h2{
            margin:2px 0 4px;
            font-size:12px;
            color:#4338ca;
          }

          .period{
            display:inline-block;
            padding:3px 8px;
            border-radius:10px;
            background:#eef2ff;
            color:#3730a3;
            font-size:8px;
            font-weight:700;
          }

          .report-for{
            margin:4px 0 1px;
            font-size:8px;
            font-weight:700;
            color:#374151;
          }

          .generated{
            font-size:7px;
            color:#94a3b8;
          }

          .legend{
            display:flex;
            justify-content:center;
            gap:10px;
            margin:6px 0;
            font-size:7px;
            font-weight:700;
          }

          .legend span{
            white-space:nowrap;
          }

          table{
            width:100%;
            border-collapse:collapse;
            table-layout:auto;
          }

          th{
            background:#312e81;
            color:#fff;
            border:1px solid #4338ca;
            padding:3px 2px;
            font-size:6.5px;
            font-weight:800;
            text-align:center;
            white-space:nowrap;
          }

          td{
            border:1px solid #d8dee8;
            padding:2px;
            height:19px;
            text-align:center;
            font-size:7px;
            font-weight:600;
            white-space:nowrap;
          }
.id-cell{width:30px}
.name-cell{width:100px;min-width:100px;max-width:100px}
.class-cell{width:40px}
.date-head{width:19px;min-width:19px}
.status-cell{width:19px;min-width:19px;max-width:19px}
.count-cell{width:24px;min-width:24px}
.total-cell{width:28px;min-width:28px}
.percentage-cell{width:38px;min-width:38px}

          .p{
            background:#dcfce7 !important;
            color:#166534 !important;
          }

          .a{
            background:#fee2e2 !important;
            color:#b91c1c !important;
          }

          .h{
            background:#fef3c7 !important;
            color:#92400e !important;
          }

          .empty{
            color:#94a3b8;
            background:#fff;
          }

          .count-cell{
            width:28px;
            min-width:28px;
            font-weight:900;
            font-size:7.5px;
          }

          .p-count{
            background:#f0fdf4;
            color:#047857;
          }

          .a-count{
            background:#fef2f2;
            color:#dc2626;
          }

          .h-count{
            background:#fffbeb;
            color:#d97706;
          }

          .total-cell{
            width:31px;
            min-width:31px;
            font-weight:900;
            background:#f8fafc;
          }

          .percentage-cell{
            width:43px;
            min-width:43px;
            font-size:7.5px;
            font-weight:900;
            color:#047857;
            background:#ecfdf5;
          }

          .footer{
            text-align:center;
            margin-top:7px;
            padding-top:5px;
            border-top:1px solid #e5e7eb;
            color:#94a3b8;
            font-size:6.5px;
          }

          @media print{

            @page{
              size:A4 landscape;
              margin:5mm;
            }

            body{
              padding:0;
              font-size:7px;
            }

            .header{
              margin-bottom:6px;
            }

            h1{
              font-size:16px;
            }

            h2{
              font-size:11px;
            }

            th{
              padding:2px 1px;
              font-size:6px;
            }

            td{
              height:17px;
              padding:1px;
              font-size:6.5px;
            }

            .status-cell{
              width:19px;
              min-width:19px;
              max-width:19px;
              height:17px;
              font-size:6.5px;
            }

            .name-cell{
              font-size:7px;
            }

            .count-cell{
              width:25px;
              min-width:25px;
            }

            .percentage-cell{
              width:40px;
              min-width:40px;
            }

            th,
            .p,
            .a,
            .h,
            .p-count,
            .a-count,
            .h-count,
            .percentage-cell{
              -webkit-print-color-adjust:exact !important;
              print-color-adjust:exact !important;
            }

            tr{
              page-break-inside:avoid;
            }
          }
        </style>
      </head>

      <body>

        <div class="header">
          <h1>SMART STUDENTS CLASSES</h1>
          <h2>Attendance Report</h2>

          <div class="period">
            ${fullStartDate} → ${fullEndDate}
          </div>

          <div class="report-for">
            ${reportFor}
          </div>

          <div class="generated">
            Generated At: ${generatedAt}
          </div>
        </div>

        <div class="legend">
          <span>🟢 P = Present</span>
          <span>🔴 A = Absent</span>
          <span>🟡 H = Holiday</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Student Name</th>
              <th>Class</th>

              ${dateHeaders}

              <th>P</th>
              <th>A</th>
              <th>H</th>
              <th>Total</th>
              <th>Attendance %</th>
            </tr>
          </thead>

          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="footer">
          Smart Students Classes • Attendance Record
        </div>

      </body>
      </html>
    `);

    win.document.close();
    win.focus();

    // Very small delay for faster print opening
    setTimeout(() => win.print(), 50);

    setSuccessMsg(
      "Attendance PDF generated. Select 'Save as PDF' to save it."
    );
  };

  // DOWNLOAD REPORT
  const handleDownloadReport = async (format) => {
    try {
      setReportLoading(true);

      const rows = await fetchReportData();

      if (!rows.length) {
        alert("No attendance records found for the selected criteria.");
        return;
      }

      if (format === "csv") downloadCSV(rows);
      else downloadPDF(rows);
    } catch (err) {
      console.error("Report Error:", err);
      alert(err.message || "Failed to generate report.");
    } finally {
      setReportLoading(false);
    }
  };

  // ATTENDANCE TABLE
  const renderTable = (title, list) => {
    const filtered = filterBySearch(list);

    const counts = { Present: 0, Absent: 0, Holiday: 0 };

    list.forEach((s) => {
      const status = attendance[s.id] || "Absent";
      counts[status]++;
    });

    return (
      <div className="table-wrapper">
        <div className="table-header-row">
          <div>
            <h2>
              {title} ({list.length})
            </h2>

            <div className="quick-stats-pills">
              <span className="pill green">
                🟢 Present: {counts.Present}
              </span>
              <span className="pill red">
                🔴 Absent: {counts.Absent}
              </span>
              <span className="pill yellow">
                🟡 Holiday: {counts.Holiday}
              </span>
            </div>
          </div>

          <div className="table-actions-group">
            <input
              className="search-input"
              placeholder="🔍 Search student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {editAllowed && (
              <div className="bulk-buttons">
                {[
                  ["Present", "green", "All Present"],
                  ["Absent", "red", "All Absent"],
                  ["Holiday", "yellow", "All Holiday"],
                ].map(([status, cls, text]) => (
                  <button
                    key={status}
                    className={`bulk-btn ${cls}`}
                    onClick={() => handleMarkAll(status, list)}
                  >
                    {text}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {!filtered.length ? (
          <p className="empty-table-message">
            No matching active students found.
          </p>
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
                {filtered.map((s) => {
                  const status = attendance[s.id] || "Absent";

                  return (
                    <motion.tr
                      key={s.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`row-${status.toLowerCase()}`}
                    >
                      <td className="student-id-cell">#{s.id}</td>

                      <td className="student-name-cell">{s.name}</td>

                      <td>
                        <span className="class-badge">
                          Class {s.class}
                        </span>
                      </td>

                      {["Present", "Absent", "Holiday"].map((value) => (
                        <td key={value}>
                          <label
                            className={`radio-label ${
                              value === "Present"
                                ? "green"
                                : value === "Absent"
                                ? "red"
                                : "yellow"
                            } ${status === value ? "selected" : ""}`}
                          >
                            <input
                              type="radio"
                              name={`att-${s.id}`}
                              checked={status === value}
                              onChange={() =>
                                handleChange(s.id, value)
                              }
                              disabled={!editAllowed}
                            />
                            <span>{value}</span>
                          </label>
                        </td>
                      ))}
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
        <div className="header-inner">
          <div>
            <h1>Smart Students • Mark Attendance </h1>
            <p>
              Manage daily attendance across all three scheduled batches.
            </p>
          </div>

          <button
            className="report-download-btn"
            onClick={() => setShowReportModal(true)}
          >
            📊 Attendance Reports
          </button>
        </div>
      </div>

      {/* BATCH SELECTOR */}
      <div className="controls-row">
        <div className="batch-selector">
          {Object.entries(BATCHES).map(([key, batch]) => (
            <button
              key={key}
              className={`batch-link ${
                batchType === key ? "active" : ""
              }`}
              onClick={() => {
                setBatchType(key);
                setShowTable(true);
              }}
            >
              <b>{batch.label}</b>
              <span>{batch.time}</span>
            </button>
          ))}

          <button
            className="batch-link edit-batches-btn"
            onClick={() => {
              setShowEditBatches(true);
              setSelectedShiftStudents([]);
              setShiftSearchQuery("");
            }}
          >
            ⇄ Manage Batches
          </button>
        </div>

        <div className="date-picker">
          <label>📅 Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {/* CONTENT */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
          <p className="loading-text">
            Loading student records...
          </p>
        </div>
      ) : infoMsg ? (
        <div className="info-msg">⚠️ {infoMsg}</div>
      ) : showTable ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {batchType === "batch1" &&
            renderTable(
              "Batch 1 · 3:00 PM - 4:30 PM",
              batch1
            )}

          {batchType === "batch2" &&
            renderTable(
              "Batch 2 · 4:30 PM - 6:00 PM",
              batch2
            )}

          {batchType === "batch3" &&
            renderTable(
              "Batch 3 · 6:00 PM - 7:30 PM",
              batch3
            )}

          <div className="bottom-actions">
            <button
              className="secondary-btn"
              onClick={() => setShowTable(false)}
            >
              ← Back
            </button>

            <button
              className={`submit-btn ${
                !isFirstTime ? "update" : ""
              }`}
              onClick={() =>
                sendAttendance(isFirstTime ? "submit" : "update")
              }
              disabled={btnDisabled || !editAllowed}
            >
              {btnDisabled
                ? isFirstTime
                  ? "Submitting..."
                  : "Updating..."
                : isFirstTime
                ? "Submit Attendance"
                : "Update Attendance"}
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="action-card-prompt"
        >
          <div className="prompt-badge">
            Selected Date: <strong>{selectedDate}</strong>
          </div>

          <p>Ready to manage attendance logs for this session?</p>

          <button
            className="submit-btn large"
            onClick={() => setShowTable(true)}
            disabled={btnDisabled}
          >
            {isFirstTime
              ? selectedDate === getFormattedDate()
                ? "Mark Today's Attendance"
                : "Mark Attendance"
              : "Edit Attendance"}
          </button>

          {students.length > 0 && (
            <div className="overview-combined-card">
              <h4>Attendance Overview · {selectedDate}</h4>

              <div className="overview-grid">
                {[
                  ["Total Students", totals.total, "total"],
                  ["Total Present", totals.present, "present"],
                  ["Total Absent", totals.absent, "absent"],
                  ["Total Holiday", totals.holiday, "holiday"],
                ].map(([label, value, cls]) => (
                  <div
                    className={`overview-item ${cls}`}
                    key={label}
                  >
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* SUMMARY */}
      {summaryData && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="summary-card"
          >
            <h3>
              Attendance Summary · {BATCHES[batchType]?.label} ·{" "}
              {BATCHES[batchType]?.time}
            </h3>

            <div className="summary-grid">
              {[
                ["Total Students", summaryData.totalStudents, "total"],
                ["Total Present", summaryData.totalPresent, "present"],
                ["Total Absent", summaryData.totalAbsent, "absent"],
                ["Total Holiday", summaryData.totalHoliday, "holiday"],
              ].map(([label, value, cls]) => (
                <div
                  className={`summary-item ${cls}`}
                  key={label}
                >
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>

            {successMsg && (
              <div className="success-msg">{successMsg}</div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* MANAGE BATCH MODAL */}
      {showEditBatches && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (
              e.target === e.currentTarget &&
              !shiftLoading
            ) {
              setShowEditBatches(false);
              clearShiftStudents();
              setShiftSearchQuery("");
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="modal-card edit-batch-modal"
          >
            <div className="manage-batch-topbar">
              <div>
                <h3>⇄ Manage Batch Assignments</h3>
                <p>
                  Select students and move them to another
                  scheduled batch.
                </p>
              </div>

              <button
                className="close-modal-btn"
                onClick={() => {
                  if (shiftLoading) return;
                  setShowEditBatches(false);
                  clearShiftStudents();
                  setShiftSearchQuery("");
                }}
              >
                ✕
              </button>
            </div>

            <div className="batch-flow-card">
              <div className="batch-flow-side">
                <span className="flow-label">FROM</span>

                <select
                  className="batch-flow-select source"
                  value={shiftSourceBatch}
                  onChange={(e) => {
                    setShiftSourceBatch(e.target.value);
                    clearShiftStudents();
                    setShiftSearchQuery("");
                  }}
                  disabled={shiftLoading}
                >
                  {Object.entries(BATCHES).map(
                    ([key, batch]) => (
                      <option key={key} value={key}>
                        {batch.label} · {batch.time}
                      </option>
                    )
                  )}
                </select>

                <span className="flow-count">
                  {getBatchStudents(shiftSourceBatch).length}{" "}
                  students
                </span>
              </div>

              <div className="batch-flow-arrow">→</div>

              <div className="batch-flow-side">
                <span className="flow-label">TO</span>

                <select
                  className="batch-flow-select target"
                  value={shiftTargetBatch}
                  onChange={(e) =>
                    setShiftTargetBatch(e.target.value)
                  }
                  disabled={shiftLoading}
                >
                  {Object.entries(BATCHES).map(
                    ([key, batch]) => (
                      <option key={key} value={key}>
                        {batch.label} · {batch.time}
                      </option>
                    )
                  )}
                </select>

                <span className="flow-count">
                  {getBatchStudents(shiftTargetBatch).length}{" "}
                  students
                </span>
              </div>
            </div>

            {shiftSourceBatch === shiftTargetBatch && (
              <div className="batch-warning">
                ⚠️ Source and target batch cannot be the same.
              </div>
            )}

            <div className="student-selection-card">
              <div className="selection-header">
                <div>
                  <div className="selection-title">
                    Select Students
                    <span className="selection-count">
                      {
                        getBatchStudents(shiftSourceBatch)
                          .length
                      }
                    </span>
                  </div>

                  <div className="selection-subtitle">
                    Students currently assigned to{" "}
                    <strong>
                      {BATCHES[shiftSourceBatch].label}
                    </strong>
                  </div>
                </div>

                <div className="selection-actions">
                  <button
                    className="selection-action primary"
                    onClick={selectAllShiftStudents}
                    disabled={
                      shiftLoading ||
                      !getFilteredShiftStudents(
                        shiftSourceBatch
                      ).length
                    }
                  >
                    {getFilteredShiftStudents(
                      shiftSourceBatch
                    ).length &&
                    getFilteredShiftStudents(
                      shiftSourceBatch
                    ).every((s) =>
                      selectedShiftStudents.includes(
                        String(s.id)
                      )
                    )
                      ? "✓ Clear Visible"
                      : "✓ Select Visible"}
                  </button>

                  <button
                    className="selection-action"
                    onClick={clearShiftStudents}
                    disabled={
                      shiftLoading ||
                      !selectedShiftStudents.length
                    }
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="shift-search-wrap">
                <span className="shift-search-icon">⌕</span>

                <input
                  className="shift-search-input"
                  value={shiftSearchQuery}
                  onChange={(e) =>
                    setShiftSearchQuery(e.target.value)
                  }
                  placeholder="Search student, ID or class..."
                  disabled={shiftLoading}
                />
              </div>

              <div className="shift-list-summary">
                <span>
                  Showing{" "}
                  <strong>
                    {
                      getFilteredShiftStudents(
                        shiftSourceBatch
                      ).length
                    }
                  </strong>{" "}
                  of{" "}
                  <strong>
                    {
                      getBatchStudents(shiftSourceBatch)
                        .length
                    }
                  </strong>
                </span>

                <span className="selected-counter">
                  {selectedShiftStudents.length} selected
                </span>
              </div>

              <div className="shift-student-list">
                {getFilteredShiftStudents(
                  shiftSourceBatch
                ).map((st) => {
                  const selected =
                    selectedShiftStudents.includes(
                      String(st.id)
                    );

                  return (
                    <label
                      key={st.id}
                      className={`shift-student-row ${
                        selected ? "selected" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          toggleShiftStudent(st.id)
                        }
                        disabled={shiftLoading}
                      />

                      <span className="student-avatar">
                        {String(st.name || "?")
                          .trim()
                          .charAt(0)
                          .toUpperCase()}
                      </span>

                      <span className="student-info">
                        <span className="student-main">
                          <strong>{st.name}</strong>
                          <span className="student-meta">
                            ID #{st.id}
                          </span>
                        </span>

                        <span className="student-class">
                          Class {st.class || "—"}
                        </span>
                      </span>

                      <span
                        className={`student-check ${
                          selected ? "visible" : ""
                        }`}
                      >
                        ✓
                      </span>
                    </label>
                  );
                })}

                {!getFilteredShiftStudents(
                  shiftSourceBatch
                ).length && (
                  <div className="empty-shift-list">
                    <div className="empty-shift-icon">⌕</div>
                    <strong>No students found</strong>
                    <span>
                      Try another name, ID or class.
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div
              className={`shift-action-summary ${
                selectedShiftStudents.length
                  ? "has-selection"
                  : ""
              }`}
            >
              <div className="shift-summary-icon">⇄</div>

              <div className="shift-summary-text">
                <strong>
                  {selectedShiftStudents.length
                    ? `${selectedShiftStudents.length} student(s) ready to shift`
                    : "No students selected"}
                </strong>

                <span>
                  {selectedShiftStudents.length
                    ? `They will move to ${BATCHES[shiftTargetBatch].label} · ${BATCHES[shiftTargetBatch].time}`
                    : "Select one or more students from the list above."}
                </span>
              </div>
            </div>

            <div className="modal-buttons">
              <button
                className="secondary-btn"
                onClick={() => {
                  if (shiftLoading) return;
                  setShowEditBatches(false);
                  clearShiftStudents();
                  setShiftSearchQuery("");
                }}
              >
                Cancel
              </button>

              <button
                className="shift-confirm-btn"
                onClick={shiftSelectedStudents}
                disabled={
                  shiftLoading ||
                  !selectedShiftStudents.length ||
                  shiftSourceBatch === shiftTargetBatch
                }
              >
                {shiftLoading
                  ? "Saving..."
                  : `⇄ Shift ${
                      selectedShiftStudents.length || ""
                    } Student${
                      selectedShiftStudents.length === 1
                        ? ""
                        : "s"
                    }`}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* REPORT MODAL */}
      {showReportModal && (
        <div className="modal-backdrop">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="modal-card report-modal"
          >
            <div className="edit-batch-header">
              <div>
                <h3>📊 Attendance Reports</h3>
                <p>
                  One student per row with date-wise P, A, H
                  and separate counts.
                </p>
              </div>

              <button
                className="close-modal-btn"
                onClick={() => setShowReportModal(false)}
                disabled={reportLoading}
              >
                ✕
              </button>
            </div>

            <div className="modal-form-group">
              <label>📅 Quick Select Month</label>

              <input
                type="month"
                value={startDate.slice(0, 7)}
                onChange={handleMonthPresetChange}
              />
            </div>

            <div className="modal-form-row">
              <div className="modal-form-group">
                <label>Start Date</label>

                <input
                  type="date"
                  value={startDate}
                  onChange={(e) =>
                    setStartDate(e.target.value)
                  }
                />
              </div>

              <div className="modal-form-group">
                <label>End Date</label>

                <input
                  type="date"
                  value={endDate}
                  onChange={(e) =>
                    setEndDate(e.target.value)
                  }
                />
              </div>
            </div>

            <div className="modal-form-group">
              <label>Batch</label>

              <select
                value={reportBatch}
                onChange={(e) => {
                  setReportBatch(e.target.value);
                  setReportStudent("all");
                }}
              >
                <option value="all">All Batches</option>

                {Object.entries(BATCHES).map(
                  ([key, batch]) => (
                    <option key={key} value={key}>
                      {batch.label} · {batch.time}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="modal-form-group">
              <label>Student Report</label>

              <select
                value={reportStudent}
                onChange={(e) =>
                  setReportStudent(e.target.value)
                }
              >
                <option value="all">All Students</option>

                {students
                  .filter(
                    (s) =>
                      reportBatch === "all" ||
                      normalizeBatch(s.batch) === reportBatch
                  )
                  .sort((a, b) =>
                    String(a.name).localeCompare(
                      String(b.name)
                    )
                  )
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      #{s.id} · {s.name} · Class {s.class}
                    </option>
                  ))}
              </select>
            </div>

            {reportStudent !== "all" && (
              <div className="individual-report-note">
                👤 Individual student report selected.
              </div>
            )}

            <div className="report-note">
              ℹ️ <b>
                Student → Every Date → P Count → A Count → H
                Count → Total → Attendance %
              </b>
              <br />
              🟢 P = Present &nbsp; 🔴 A = Absent &nbsp; 🟡 H =
              Holiday
            </div>

            <div className="modal-buttons report-buttons">
              <button
                className="secondary-btn"
                onClick={() => setShowReportModal(false)}
                disabled={reportLoading}
              >
                Cancel
              </button>

              <button
                className="report-action-btn csv"
                onClick={() => handleDownloadReport("csv")}
                disabled={reportLoading}
              >
                {reportLoading ? "Generating..." : "⬇ CSV"}
              </button>

              <button
                className="report-action-btn pdf"
                onClick={() => handleDownloadReport("pdf")}
                disabled={reportLoading}
              >
                {reportLoading ? "Generating..." : "🖨 PDF"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* CSS */}
      <style>{`
        *{box-sizing:border-box}

        .attendance-container{
          width:95%;
          max-width:1100px;
          margin:25px auto;
          padding:24px;
          font-family:"Times New Roman", serif;
          color:#1f2937;
          background:#fff;
          border:1px solid #e5e7eb;
          border-radius:18px;
          box-shadow:0 8px 25px rgba(0,0,0,.04)
        }

        .header-banner{
          background:linear-gradient(135deg,#1d166a,#6d28d9);
          color:#fff;
          padding:20px 22px;
          border-radius:13px;
          margin-bottom:18px
        }

        .header-inner{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:14px;
          flex-wrap:wrap
        }

        .header-banner h1{
          margin:0 0 5px;
          font-size:21px;
          font-weight:800
        }

        .header-banner p{
          margin:0;
          font-size:12px;
          color:#e0e7ff
        }

        .report-download-btn{
          min-height:38px;
          padding:8px 13px;
          border:0;
          border-radius:8px;
          background:#fff;
          color:#4338ca;
          font-size:12px;
          font-weight:800;
          cursor:pointer
        }

        .controls-row{
          display:flex;
          justify-content:space-between;
          align-items:center;
          flex-wrap:wrap;
          gap:12px;
          margin-bottom:18px;
          padding:11px 13px;
          border:1px solid #e5e7eb;
          border-radius:11px;
          background:#f9fafb
        }

        .batch-selector{
          display:flex;
          gap:6px;
          flex-wrap:wrap
        }

        .batch-link{
          min-height:36px;
          padding:6px 10px;
          border:1px solid #dbe2ea;
          border-radius:8px;
          background:#fff;
          color:#3730a3;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:5px;
          font-size:10px;
          font-weight:700;
          cursor:pointer;
          white-space:nowrap
        }

        .batch-link.active{
          background:#4338ca;
          border-color:#4338ca;
          color:#fff
        }

        .batch-link span{
          font-size:9px;
          opacity:.85
        }

        .edit-batches-btn{
          background:#fff7ed;
          color:#9a3412;
          border-color:#fed7aa
        }

        .date-picker{
          display:flex;
          align-items:center;
          gap:7px;
          padding:5px 7px 5px 9px;
          border:1px solid #e5e7eb;
          border-radius:8px;
          background:#fff;
          font-size:11px;
          font-weight:700
        }

        .date-picker input{
          padding:6px 8px;
          border:1px solid #d1d5db;
          border-radius:6px;
          font-size:11px
        }

        .action-card-prompt{
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:13px;
          padding:32px 18px;
          text-align:center;
          border:2px dashed #cbd5e1;
          border-radius:13px;
          background:#f8fafc
        }

        .action-card-prompt p{
          margin:0;
          color:#64748b;
          font-size:13px
        }

        .prompt-badge{
          padding:6px 12px;
          border-radius:20px;
          background:#e0e7ff;
          color:#3730a3;
          font-size:11px;
          font-weight:700
        }

        .submit-btn,
        .secondary-btn,
        .shift-confirm-btn,
        .report-action-btn{
          min-height:40px;
          padding:9px 16px;
          border:0;
          border-radius:8px;
          font-size:11px;
          font-weight:800;
          cursor:pointer
        }

        .submit-btn{
          background:linear-gradient(135deg,#4338ca,#6d28d9);
          color:#fff
        }

        .submit-btn.update{
          background:linear-gradient(135deg,#059669,#10b981)
        }

        .submit-btn.large{
          min-height:44px;
          padding:11px 22px;
          font-size:13px
        }

        .submit-btn:disabled{
          background:#9ca3af;
          cursor:not-allowed
        }

        .secondary-btn{
          background:#f3f4f6;
          color:#374151;
          border:1px solid #d1d5db
        }

        .overview-combined-card{
          width:100%;
          max-width:650px;
          padding:15px;
          margin-top:8px;
          border:1px solid #e2e8f0;
          border-radius:11px;
          background:#fff
        }

        .overview-combined-card h4{
          margin:0 0 10px;
          font-size:13px
        }

        .overview-grid,
        .summary-grid{
          display:grid;
          grid-template-columns:repeat(4,1fr);
          gap:8px
        }

        .overview-item,
        .summary-item{
          padding:10px;
          text-align:center;
          border:1px solid #e2e8f0;
          border-radius:8px;
          background:#f8fafc
        }

        .overview-item span,
        .summary-item span{
          display:block;
          font-size:9px;
          color:#64748b;
          font-weight:700
        }

        .overview-item strong,
        .summary-item strong{
          display:block;
          margin-top:2px;
          font-size:18px
        }

        .present strong{color:#e5e7eb}
        .absent strong{color:#dc2626}
        .holiday strong{color:#d97706}

        .table-wrapper{
          padding:16px;
          border:1px solid #e5ebe5;
          border-radius:13px;
          background:#fff;
          overflow:hidden
        }

        .table-header-row{
          display:flex;
          justify-content:space-between;
          align-items:center;
          flex-wrap:wrap;
          gap:12px;
          margin-bottom:12px;
          padding-bottom:12px;
          border-bottom:1px solid #f3f4f6
        }

        .table-header-row h2{
          margin:0;
          font-size:17px
        }

        .quick-stats-pills{
          display:flex;
          gap:6px;
          margin-top:6px;
          flex-wrap:wrap
        }

        .pill{
          padding:4px 7px;
          border-radius:20px;
          font-size:9px;
          font-weight:800
        }

        .pill.green{background:#d1fae5;color:#065f46}
        .pill.red{background:#fee2e2;color:#991b1b}
        .pill.yellow{background:#fef3c7;color:#92400e}

        .table-actions-group{
          display:flex;
          align-items:center;
          gap:7px;
          flex-wrap:wrap
        }

        .search-input{
          width:210px;
          height:36px;
          padding:7px 10px;
          border:1px solid #d1d5db;
          border-radius:7px;
          font-size:11px
        }

        .bulk-buttons{
          display:flex;
          gap:5px
        }

        .bulk-btn{
          min-height:36px;
          padding:6px 9px;
          border:0;
          border-radius:6px;
          font-size:9px;
          font-weight:800;
          cursor:pointer
        }

        .bulk-btn.green{background:#a7f3d0;color:#065f46}
        .bulk-btn.red{background:#fecaca;color:#991b1b}
        .bulk-btn.yellow{background:#fde68a;color:#92400e}

        .table-container-scroll{
          overflow-x:auto;
          border:1px solid #e5e7eb;
          border-radius:8px;
          -webkit-overflow-scrolling:touch
        }

        .attendance-table{
          width:100%;
          min-width:690px;
          border-collapse:collapse
        }

        .attendance-table th,
        .attendance-table td{
          padding:9px 10px;
          border-bottom:1px solid #f3f4f6;
          font-size:12px;
          text-align:center
        }

        .attendance-table th{
          background:#3730a3;
          color:#fff;
          font-weight:700
        }

        .attendance-table tr.row-present{background:#5bd57b}
.attendance-table tr.row-absent{background:#f8b8b8}
.attendance-table tr.row-holiday{background:yellow}

        .student-id-cell{
          color:#4b5563;
          font-weight:800
        }

        .student-name-cell{
  width:140px;
  max-width:140px;
  text-align:left!important;
  color:#1f2937;
  font-weight:800;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis
}

        .class-badge{
          padding:3px 7px;
          border-radius:6px;
          background:#f3f4f6;
          color:#374151;
          font-size:10px;
          font-weight:700
        }

        .radio-label{
          display:inline-flex;
          align-items:center;
          gap:4px;
          padding:5px 7px;
          border-radius:6px;
          font-size:10px;
          font-weight:700;
          cursor:pointer
        }

        .radio-label input{
          width:15px;
          height:15px;
          margin:0
        }

        .radio-label.green.selected{
          background:#d1fae5;
          color:#065f46
        }

        .radio-label.red.selected{
          background:#fee2e2;
          color:#991b1b
        }

        .radio-label.yellow.selected{
          background:#fef3c7;
          color:#92400e
        }

        .bottom-actions{
          display:flex;
          justify-content:flex-end;
          gap:8px;
          margin-top:18px
        }

        .success-msg{
          margin-top:10px;
          padding:8px;
          text-align:center;
          border:1px solid #a7f3d0;
          border-radius:7px;
          background:#ecfdf5;
          color:#047857;
          font-size:12px;
          font-weight:700
        }

        .info-msg{
          padding:12px;
          border:1px solid #fecaca;
          border-radius:8px;
          background:#fef2f2;
          color:#b91c1c;
          font-size:12px;
          font-weight:700
        }

        .summary-card{
          margin-top:18px;
          padding:18px;
          border:1px solid #e2e8f0;
          border-radius:13px;
          background:#f8fafc
        }

        .summary-card h3{
          margin:0 0 12px;
          font-size:15px
        }

        .loading-container{
          display:flex;
          flex-direction:column;
          align-items:center;
          padding:38px;
          gap:10px
        }

        .spinner{
          width:34px;
          height:34px;
          border:4px solid #e0e7ff;
          border-top-color:#4338ca;
          border-radius:50%;
          animation:spin .8s linear infinite
        }

        .loading-text{
          margin:0;
          color:#6b7280;
          font-size:12px;
          font-weight:600
        }

        .modal-backdrop{
          position:fixed;
          inset:0;
          z-index:1000;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:16px;
          background:rgba(0,0,0,.5)
        }

        .modal-card{
          width:100%;
          max-width:520px;
          max-height:94vh;
          overflow-y:auto;
          padding:21px;
          border:1px solid #e5e7eb;
          border-radius:14px;
          background:#fff;
          box-shadow:0 20px 25px -5px rgba(0,0,0,.12)
        }

        .edit-batch-modal{max-width:730px}

        .edit-batch-header,
        .manage-batch-topbar{
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:12px;
          margin-bottom:15px
        }

        .edit-batch-header h3,
        .manage-batch-topbar h3{
          margin:0 0 4px;
          font-size:17px
        }

        .edit-batch-header p,
        .manage-batch-topbar p{
          margin:0;
          color:#6b7280;
          font-size:11px;
          line-height:1.4
        }

        .close-modal-btn{
          width:32px;
          height:32px;
          flex:none;
          border:0;
          border-radius:7px;
          background:#f3f4f6;
          color:#374151;
          font-weight:800;
          cursor:pointer
        }

        .modal-form-group{
          display:flex;
          flex-direction:column;
          gap:5px;
          margin-bottom:12px
        }

        .modal-form-group label{
          color:#374151;
          font-size:11px;
          font-weight:800
        }

        .modal-form-group input,
        .modal-form-group select{
          width:100%;
          min-height:38px;
          padding:8px 10px;
          border:1px solid #d1d5db;
          border-radius:7px;
          outline:0;
          background:#fff;
          font-size:12px
        }

        .modal-form-row{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:9px
        }

        .modal-buttons{
          display:flex;
          justify-content:flex-end;
          gap:7px;
          margin-top:17px
        }

        .batch-flow-card{
          display:grid;
          grid-template-columns:1fr 42px 1fr;
          align-items:center;
          gap:8px;
          padding:12px;
          margin-bottom:10px;
          border:1px solid #e2e8f0;
          border-radius:12px;
          background:#f8fafc
        }

        .flow-label{
          display:block;
          margin-bottom:5px;
          color:#94a3b8;
          font-size:8px;
          font-weight:900
        }

        .batch-flow-select{
          width:100%;
          min-height:40px;
          padding:7px 9px;
          border:1px solid #cbd5e1;
          border-radius:8px;
          background:#fff;
          font-size:11px;
          font-weight:800
        }

        .batch-flow-select.source{
          border-left:4px solid #6366f1
        }

        .batch-flow-select.target{
          border-left:4px solid #059669
        }

        .flow-count{
          display:block;
          margin-top:5px;
          color:#64748b;
          font-size:9px
        }

        .batch-flow-arrow{
          display:flex;
          align-items:center;
          justify-content:center;
          width:36px;
          height:36px;
          margin:auto;
          border:1px solid #dbe2ea;
          border-radius:50%;
          background:#fff;
          color:#4338ca;
          font-weight:900
        }

        .batch-warning{
          padding:9px 11px;
          margin-bottom:10px;
          border:1px solid #fed7aa;
          border-radius:8px;
          background:#fff7ed;
          color:#9a3412;
          font-size:10px;
          font-weight:700
        }

        .student-selection-card{
          overflow:hidden;
          border:1px solid #e2e8f0;
          border-radius:12px;
          background:#fff
        }

        .selection-header{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          padding:11px 12px;
          border-bottom:1px solid #eef2f7;
          background:#fafbff
        }

        .selection-title{
          display:flex;
          align-items:center;
          gap:6px;
          font-size:12px;
          font-weight:800
        }

        .selection-count{
          min-width:21px;
          height:21px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          border-radius:20px;
          background:#eef2ff;
          color:#4338ca;
          font-size:9px
        }

        .selection-subtitle{
          margin-top:3px;
          color:#64748b;
          font-size:9px
        }

        .selection-actions{
          display:flex;
          gap:5px
        }

        .selection-action{
          min-height:30px;
          padding:5px 8px;
          border:1px solid #dbe2ea;
          border-radius:6px;
          background:#fff;
          color:#475569;
          font-size:9px;
          font-weight:800;
          cursor:pointer
        }

        .selection-action.primary{
          border-color:#c7d2fe;
          background:#eef2ff;
          color:#4338ca
        }

        .shift-search-wrap{
          position:relative;
          margin:10px 11px 7px
        }

        .shift-search-icon{
          position:absolute;
          left:10px;
          top:7px;
          color:#94a3b8;
          font-size:18px
        }

        .shift-search-input{
          width:100%;
          height:37px;
          padding:7px 10px 7px 32px;
          border:1px solid #dbe2ea;
          border-radius:8px;
          background:#f8fafc;
          font-size:10px
        }

        .shift-list-summary{
          display:flex;
          justify-content:space-between;
          padding:0 12px 7px;
          color:#94a3b8;
          font-size:9px
        }

        .selected-counter{
          color:#4338ca;
          font-weight:800
        }

        .shift-student-list{
          max-height:275px;
          overflow-y:auto;
          padding:3px 7px 7px;
          border-top:1px solid #f1f5f9
        }

        .shift-student-row{
          display:flex;
          align-items:center;
          gap:8px;
          min-height:48px;
          margin-top:4px;
          padding:6px 8px;
          border:1px solid #edf2f7;
          border-radius:8px;
          background:#fff;
          cursor:pointer
        }

        .shift-student-row.selected{
          border-color:#c7d2fe;
          background:#eef2ff
        }

        .shift-student-row input{
          width:16px;
          height:16px;
          accent-color:#4338ca
        }

        .student-avatar{
          width:31px;
          height:31px;
          display:flex;
          align-items:center;
          justify-content:center;
          flex:none;
          border-radius:8px;
          background:#f1f5f9;
          color:#475569;
          font-size:11px;
          font-weight:900
        }

        .shift-student-row.selected .student-avatar{
          background:#4338ca;
          color:#fff
        }

        .student-info{
          min-width:0;
          flex:1;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:8px
        }

        .student-main{
          display:flex;
          flex-direction:column;
          gap:2px;
          min-width:0
        }

        .student-main strong{
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
          font-size:11px
        }

        .student-meta{
          color:#94a3b8;
          font-size:8px;
          font-weight:700
        }

        .student-class{
          flex:none;
          padding:4px 6px;
          border:1px solid #e2e8f0;
          border-radius:5px;
          background:#f8fafc;
          color:#64748b;
          font-size:8px;
          font-weight:800
        }

        .student-check{
          width:21px;
          height:21px;
          display:flex;
          align-items:center;
          justify-content:center;
          flex:none;
          border-radius:50%;
          background:#e2e8f0;
          color:transparent;
          font-size:10px
        }

        .student-check.visible{
          background:#4338ca;
          color:#fff
        }

        .empty-shift-list{
          min-height:120px;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          gap:4px;
          color:#64748b;
          font-size:10px
        }

        .shift-action-summary{
          display:flex;
          align-items:center;
          gap:8px;
          margin-top:10px;
          padding:9px 10px;
          border:1px solid #e2e8f0;
          border-radius:9px;
          background:#f8fafc
        }

        .shift-action-summary.has-selection{
          border-color:#c7d2fe;
          background:#eef2ff
        }

        .shift-summary-icon{
          width:30px;
          height:30px;
          display:flex;
          align-items:center;
          justify-content:center;
          flex:none;
          border-radius:7px;
          background:#e2e8f0
        }

        .has-selection .shift-summary-icon{
          background:#4338ca;
          color:#fff
        }

        .shift-summary-text{
          display:flex;
          flex-direction:column;
          gap:2px;
          min-width:0
        }

        .shift-summary-text strong{
          font-size:10px
        }

        .shift-summary-text span{
          color:#64748b;
          font-size:9px
        }

        .shift-confirm-btn{
          background:linear-gradient(135deg,#4338ca,#6d28d9);
          color:#fff
        }

        .shift-confirm-btn:disabled{
          background:#cbd5e1;
          color:#64748b;
          cursor:not-allowed
        }

        .report-note,
        .individual-report-note{
          padding:8px 10px;
          margin-top:4px;
          border-radius:7px;
          font-size:9px;
          line-height:1.5
        }

        .report-note{
          border:1px solid #e2e8f0;
          background:#f8fafc;
          color:#64748b
        }

        .individual-report-note{
          border:1px solid #c7d2fe;
          background:#eef2ff;
          color:#4338ca;
          font-weight:700
        }

        .report-action-btn{
          color:#fff
        }

        .report-action-btn.csv{
          background:#059669
        }

        .report-action-btn.pdf{
          background:#dc2626
        }

        .report-action-btn:disabled{
          background:#9ca3af;
          cursor:not-allowed
        }

        @media(max-width:760px){

          .attendance-container{
            width:calc(100% - 12px);
            margin:6px auto;
            padding:10px;
            border-radius:12px
          }

          .header-banner{
            padding:14px;
            border-radius:10px
          }

          .header-banner h1{
            font-size:16px;
            line-height:1.3
          }

          .header-banner p{
            font-size:10px
          }

          .report-download-btn{
            width:100%;
            min-height:42px;
            font-size:12px
          }

          .controls-row{
            padding:9px;
            gap:9px
          }

          .batch-selector{
            width:100%;
            display:grid;
            grid-template-columns:repeat(3,1fr);
            gap:5px
          }

          .batch-link{
            width:100%;
            min-height:42px;
            padding:5px 3px;
            flex-direction:column;
            gap:2px;
            font-size:9px
          }

          .batch-link span{
            font-size:8px
          }

          .edit-batches-btn{
            grid-column:1/-1;
            flex-direction:row;
            min-height:40px
          }

          .date-picker{
            width:100%;
            min-height:40px;
            justify-content:space-between
          }

          .date-picker input{
            flex:1;
            min-height:34px
          }

          .overview-grid,
          .summary-grid{
            grid-template-columns:repeat(2,1fr)
          }

          .overview-item,
          .summary-item{
            padding:9px 5px
          }

          .table-wrapper{
            padding:9px
          }

          .table-header-row{
            align-items:stretch
          }

          .table-header-row h2{
            font-size:15px
          }

          .table-actions-group{
            width:100%;
            display:flex;
            flex-direction:column
          }

          .search-input{
            width:100%;
            height:40px
          }

          .bulk-buttons{
            width:100%;
            display:grid;
            grid-template-columns:repeat(3,1fr);
            gap:4px
          }

          .bulk-btn{
            min-height:40px;
            padding:5px 2px;
            font-size:8px
          }

          .bottom-actions{
            flex-direction:column-reverse;
            gap:6px
          }

          .bottom-actions button{
            width:100%;
            min-height:44px
          }

          .summary-card{
            padding:12px
          }

          .summary-card h3{
            font-size:13px;
            line-height:1.4
          }

          .modal-backdrop{
            padding:7px;
            align-items:center
          }

          .modal-card{
            max-height:96vh;
            padding:14px;
            border-radius:12px
          }

          .edit-batch-modal{
            max-width:none
          }

          .modal-form-row{
            grid-template-columns:1fr 1fr;
            gap:7px
          }

          .batch-flow-card{
            grid-template-columns:1fr;
            gap:5px;
            padding:9px
          }

          .batch-flow-arrow{
            transform:rotate(90deg);
            width:30px;
            height:30px
          }

          .selection-header{
            flex-direction:column;
            align-items:stretch
          }

          .selection-actions{
            width:100%
          }

          .selection-action{
            flex:1;
            min-height:38px
          }

          .student-info{
            min-width:0
          }

          .student-class{
            display:none
          }

          .modal-buttons{
            display:grid;
            grid-template-columns:1fr 1fr;
            width:100%
          }

          .modal-buttons button{
            min-height:42px
          }

          .report-buttons .secondary-btn{
            grid-column:1/-1
          }

          .report-action-btn{
            width:100%
          }

          .report-modal{
            max-width:none
          }

          .shift-action-summary{
            align-items:flex-start
          }
        }

        @media(max-width:380px){

          .batch-link{
            font-size:8px
          }

          .batch-link span{
            font-size:7px
          }

          .modal-form-row{
            grid-template-columns:1fr
          }

          .radio-label{
            padding:4px;
            font-size:9px
          }
        }

        @keyframes spin{
          to{transform:rotate(360deg)}
        }
      `}</style>
    </div>
  );
};

export default MarkAttendance;