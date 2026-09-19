import React, { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import { motion, AnimatePresence } from "framer-motion";

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

const normalizeBatch = (batch) => {
  if (!batch) return "batch1";

  const v = String(batch).trim().toLowerCase().replace(/\s+/g, "");

  return ["batch1", "batch-1"].includes(v)
    ? "batch1"
    : ["batch2", "batch-2"].includes(v)
    ? "batch2"
    : ["batch3", "batch-3"].includes(v)
    ? "batch3"
    : "batch1";
};

const getFormattedDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

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

  // REPORT
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

  // ==================================================
  // FETCH STUDENTS
  // ==================================================

  const fetchStudents = useCallback(
    async (date) => {
      setLoading(true);
      setSuccessMsg("");
      setInfoMsg("");
      setSummaryData(null);

      try {
        const bannedRes = await api
          .get("/api/auth/banned-students")
          .catch(() => ({
            data: { success: false, students: [] },
          }));

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

        const res = await api.get(
          `/api/attendance/list?date=${date}`
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

            const name = String(
              s.studentName || s.name || ""
            )
              .trim()
              .toLowerCase();

            return (
              !bannedIds.has(id) &&
              !bannedNames.has(name)
            );
          })
          .map((s) => {
            const id = s.studentId || s.id;

            const batch = normalizeBatch(
              batchOverrides[String(id)] ||
                s.batch ||
                customBatchMap[String(id)] ||
                "batch1"
            );

            return {
              id,
              name: s.studentName || s.name,
              class: s.class,
              status: s.status || "Absent",
              batch,
              batchTime:
                s.batchTime ||
                BATCHES[batch]?.time ||
                "Not Assigned",
            };
          });

        setStudents(list);

        const existing = list.some(
          (s) => s.status !== "Absent"
        );

        setIsFirstTime(
          !existing &&
            list.every((s) => s.status === "Absent")
        );

        const initial = {};

        list.forEach(
          (s) =>
            (initial[s.id] = s.status || "Absent")
        );

        setAttendance(initial);
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

  // ==================================================
  // ATTENDANCE
  // ==================================================

  const handleChange = (id, status) =>
    setAttendance((prev) => ({
      ...prev,
      [id]: status,
    }));

  const handleMarkAll = (status, list) => {
    const updated = { ...attendance };

    list.forEach(
      (s) => (updated[s.id] = status)
    );

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

    const counts = ["Present", "Absent", "Holiday"].reduce(
      (a, status) => ({
        ...a,
        [status.toLowerCase()]: list.filter(
          (s) =>
            (attendance[s.id] || "Absent") === status
        ).length,
      }),
      {}
    );

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

  // ==================================================
  // BATCH LISTS
  // ==================================================

  const getBatchStudents = (batch) =>
    students.filter(
      (s) => normalizeBatch(s.batch) === batch
    );

  const batch1 = getBatchStudents("batch1");
  const batch2 = getBatchStudents("batch2");
  const batch3 = getBatchStudents("batch3");

  // ==================================================
  // SHIFT STUDENTS
  // ==================================================

  const getFilteredShiftStudents = (batch) => {
    const q = shiftSearchQuery.trim().toLowerCase();
    const list = getBatchStudents(batch);

    if (!q) return list;

    return list.filter(
      (s) =>
        String(s.id).toLowerCase().includes(q) ||
        String(s.name || "")
          .toLowerCase()
          .includes(q) ||
        String(s.class || "")
          .toLowerCase()
          .includes(q)
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
    const list =
      getFilteredShiftStudents(shiftSourceBatch);

    const ids = list.map((s) => String(s.id));

    const all = ids.every((id) =>
      selectedShiftStudents.includes(id)
    );

    setSelectedShiftStudents((prev) =>
      all
        ? prev.filter((id) => !ids.includes(id))
        : [...new Set([...prev, ...ids])]
    );
  };

  const clearShiftStudents = () =>
    setSelectedShiftStudents([]);

  const shiftSelectedStudents = async () => {
    if (shiftSourceBatch === shiftTargetBatch)
      return alert(
        "Source and target batch must be different."
      );

    if (!selectedShiftStudents.length)
      return alert(
        "Please select at least one student to continue."
      );

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
          api.put(
            `/api/attendance/student/${student.id}/batch`,
            {
              batch: shiftTargetBatch,
            }
          )
        )
      );

      if (
        results.some(
          (r) => !r?.data?.success
        )
      ) {
        throw new Error(
          "Some students could not be shifted."
        );
      }

      const overrides = {
        ...batchOverrides,
      };

      selected.forEach(
        (s) =>
          (overrides[String(s.id)] =
            shiftTargetBatch)
      );

      setBatchOverrides(overrides);

      localStorage.setItem(
        "smartStudentBatchOverrides",
        JSON.stringify(overrides)
      );

      setStudents((prev) =>
        prev.map((s) =>
          selectedShiftStudents.includes(
            String(s.id)
          )
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

  // ==================================================
  // TOTALS
  // ==================================================

  const totalCombinedStudents = students.length;

  const totalCombinedPresent = students.filter(
    (s) =>
      (attendance[s.id] || "Absent") ===
      "Present"
  ).length;

  const totalCombinedAbsent = students.filter(
    (s) =>
      (attendance[s.id] || "Absent") ===
      "Absent"
  ).length;

  const totalCombinedHoliday = students.filter(
    (s) =>
      (attendance[s.id] || "Absent") ===
      "Holiday"
  ).length;

  const filterBySearch = (list) => {
    const q = searchQuery.trim().toLowerCase();

    if (!q) return list;

    return list.filter(
      (s) =>
        String(s.name)
          .toLowerCase()
          .includes(q) ||
        String(s.id)
          .toLowerCase()
          .includes(q) ||
        String(s.class)
          .toLowerCase()
          .includes(q)
    );
  };

  // ==================================================
  // REPORT
  // ==================================================

  const fetchReportData = async () => {
    const start = new Date(
      `${startDate}T00:00:00`
    );

    const end = new Date(
      `${endDate}T00:00:00`
    );

    if (start > end) {
      throw new Error(
        "Start date cannot be after end date."
      );
    }

    const dates = [];

    for (
      let d = new Date(start);
      d <= end;
      d.setDate(d.getDate() + 1)
    ) {
      dates.push(getFormattedDate(d));
    }

    const map = {};

    for (const date of dates) {
      try {
        const res = await api.get(
          `/api/attendance/list?date=${date}`
        );

        if (!res?.data?.success) continue;

        (res.data.students || []).forEach((s) => {
          const id = s.studentId || s.id;
          const name =
            s.studentName || s.name || "";

          const batch = normalizeBatch(
            batchOverrides[String(id)] ||
              s.batch ||
              customBatchMap[String(id)] ||
              "batch1"
          );

          if (
            reportBatch !== "all" &&
            batch !== reportBatch
          ) {
            return;
          }

          if (
            reportStudent !== "all" &&
            String(id) !==
              String(reportStudent)
          ) {
            return;
          }

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

          const status =
            s.status || "Absent";

          const shortStatus =
            status === "Present"
              ? "P"
              : status === "Holiday"
              ? "H"
              : "A";

          map[id].dates[date] =
            shortStatus;

          if (status === "Present") {
            map[id].present++;
          } else if (
            status === "Holiday"
          ) {
            map[id].holiday++;
          } else {
            map[id].absent++;
          }
        });
      } catch (err) {
        console.error(
          `Report fetch failed for ${date}:`,
          err
        );
      }
    }

    return Object.values(map)
      .sort((a, b) =>
        String(a.studentName).localeCompare(
          String(b.studentName)
        )
      )
      .map((r) => ({
        ...r,
        total:
          r.present +
          r.absent +
          r.holiday,

        percentage:
          r.present + r.absent
            ? (
                (r.present /
                  (r.present + r.absent)) *
                100
              ).toFixed(1)
            : "0.0",
      }));
  };

  // ==================================================
  // CSV
  // ==================================================

  const csvEscape = (v) =>
    `"${String(v ?? "").replace(
      /"/g,
      '""'
    )}"`;

  const downloadCSV = (rows) => {
    const start = new Date(
      `${startDate}T00:00:00`
    );

    const end = new Date(
      `${endDate}T00:00:00`
    );

    const dates = [];

    for (
      let d = new Date(start);
      d <= end;
      d.setDate(d.getDate() + 1)
    ) {
      dates.push(getFormattedDate(d));
    }

    const formatDate = (date) =>
      new Date(
        `${date}T00:00:00`
      ).toLocaleDateString("en-IN", {
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
      ...dates.map(
        (date) => r.dates[date] || "-"
      ),
      r.present,
      r.absent,
      r.holiday,
      r.total,
      `${r.percentage}%`,
    ]);

    const csv = [headers, ...data]
      .map((row) =>
        row.map(csvEscape).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download = `SmartStudents_Attendance_${startDate}_to_${endDate}${
      reportStudent !== "all"
        ? `_Student_${reportStudent}`
        : ""
    }.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    setSuccessMsg(
      "Attendance CSV downloaded successfully."
    );
  };

  // ==================================================
  // PDF
  // ==================================================

  const downloadPDF = (rows) => {
    const start = new Date(
      `${startDate}T00:00:00`
    );

    const end = new Date(
      `${endDate}T00:00:00`
    );

    const dates = [];

    for (
      let d = new Date(start);
      d <= end;
      d.setDate(d.getDate() + 1)
    ) {
      dates.push(getFormattedDate(d));
    }

    const generatedAt =
      new Date().toLocaleString(
        "en-IN",
        {
          day: "2-digit",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }
      );

    const formatDate = (date) =>
      new Date(
        `${date}T00:00:00`
      ).toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );

    const fullStartDate =
      new Date(
        `${startDate}T00:00:00`
      ).toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }
      );

    const fullEndDate =
      new Date(
        `${endDate}T00:00:00`
      ).toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }
      );

    const totalP = rows.reduce(
      (a, r) => a + r.present,
      0
    );

    const totalA = rows.reduce(
      (a, r) => a + r.absent,
      0
    );

    const totalH = rows.reduce(
      (a, r) => a + r.holiday,
      0
    );

    const win = window.open(
      "",
      "_blank",
      "width=1400,height=900"
    );

    if (!win) {
      alert(
        "Please allow pop-ups to generate the PDF report."
      );
      return;
    }

    const dateHeaders = dates
      .map(
        (date) => `
          <th class="date-head">
            ${formatDate(date)}
          </th>
        `
      )
      .join("");

    const tableRows = rows
      .map((r) => {
        const dateCells = dates
          .map((date) => {
            const status =
              r.dates[date] || "-";

            const cls =
              status === "P"
                ? "status-p"
                : status === "A"
                ? "status-a"
                : status === "H"
                ? "status-h"
                : "status-empty";

            return `
              <td class="${cls}">
                ${status}
              </td>
            `;
          })
          .join("");

        return `
          <tr>

            <td class="id-cell">
              #${r.studentId}
            </td>

            <td class="name-cell">
              ${r.studentName}
            </td>

            <td>
              <span class="class-badge">
                Class ${r.class || "—"}
              </span>
            </td>

            ${dateCells}

            <td class="count-cell">
              <div class="count-box">
                <span class="count-p">
                  P: ${r.present}
                </span>

                <span class="count-a">
                  A: ${r.absent}
                </span>

                <span class="count-h">
                  H: ${r.holiday}
                </span>
              </div>
            </td>

            <td class="total-cell">
              ${r.total}
            </td>

            <td class="percentage-cell">
              ${r.percentage}%
            </td>

          </tr>
        `;
      })
      .join("");

    win.document.write(`
      <!DOCTYPE html>

      <html>

      <head>

        <title>
          Smart Students Attendance Report
        </title>

        <style>

          * {
            box-sizing: border-box;
          }

          body {
            font-family:
              Arial,
              sans-serif;

            margin: 25px;
            color: #111827;
            background: #ffffff;
          }

          .header {
            text-align: center;
            margin-bottom: 18px;
          }

          .header h1 {
            margin: 0;
            font-size: 25px;
            color: #312e81;
          }

          .header h2 {
            margin: 5px 0;
            font-size: 18px;
            color: #4338ca;
          }

          .header p {
            margin: 4px;
            color: #64748b;
            font-size: 11px;
          }

          .period {
            display: inline-block;
            margin-top: 5px;
            padding: 7px 13px;
            border-radius: 20px;
            background: #eef2ff;
            color: #3730a3;
            font-weight: bold;
            font-size: 11px;
          }

          .generated {
            margin-top: 6px;
            font-size: 10px;
            color: #64748b;
          }

          .summary {
            display: grid;
            grid-template-columns:
              repeat(4, 1fr);
            gap: 10px;
            margin: 18px 0;
          }

          .card {
            border-radius: 10px;
            padding: 11px;
            text-align: center;
            border: 1px solid #e5e7eb;
          }

          .card.students {
            background: #eef2ff;
            color: #3730a3;
          }

          .card.present {
            background: #dcfce7;
            color: #166534;
          }

          .card.absent {
            background: #fee2e2;
            color: #991b1b;
          }

          .card.holiday {
            background: #fef3c7;
            color: #92400e;
          }

          .card span {
            display: block;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
          }

          .card strong {
            display: block;
            font-size: 20px;
            margin-top: 4px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
          }

          th {
            background: #312e81;
            color: #ffffff;
            padding: 8px 6px;
            text-align: center;
            border: 1px solid #4338ca;
            white-space: nowrap;
          }

          .date-head {
            min-width: 62px;
            font-size: 8px;
          }

          td {
            padding: 7px 5px;
            border: 1px solid #dbe2ea;
            text-align: center;
            font-weight: 600;
          }

          tbody tr:nth-child(even) {
            background: #f8fafc;
          }

          .id-cell {
            color: #475569;
            font-weight: 800;
            white-space: nowrap;
          }

          .name-cell {
            text-align: left;
            min-width: 130px;
            font-weight: 800;
            white-space: nowrap;
          }

          .class-badge {
            background: #f1f5f9;
            color: #475569;
            padding: 3px 6px;
            border-radius: 5px;
            white-space: nowrap;
          }

          .status-p {
            background: #dcfce7 !important;
            color: #166534 !important;
            font-size: 12px;
            font-weight: 900;
          }

          .status-a {
            background: #fee2e2 !important;
            color: #b91c1c !important;
            font-size: 12px;
            font-weight: 900;
          }

          .status-h {
            background: #fef3c7 !important;
            color: #92400e !important;
            font-size: 12px;
            font-weight: 900;
          }

          .status-empty {
            background: #f8fafc !important;
            color: #94a3b8 !important;
          }

          .count-cell {
            min-width: 115px;
            background: #f8fafc;
          }

          .count-box {
            display: flex;
            flex-direction: column;
            gap: 2px;
            font-size: 8px;
            font-weight: 800;
          }

          .count-p {
            color: #15803d;
          }

          .count-a {
            color: #dc2626;
          }

          .count-h {
            color: #d97706;
          }

          .total-cell {
            font-weight: 900;
            color: #3730a3;
          }

          .percentage-cell {
            font-weight: 900;
            color: #047857;
          }

          .legend {
            display: flex;
            justify-content: center;
            gap: 14px;
            margin: 15px 0;
            font-size: 10px;
            font-weight: 800;
          }

          .legend span {
            padding: 5px 10px;
            border-radius: 6px;
          }

          .legend-p {
            background: #dcfce7;
            color: #166534;
          }

          .legend-a {
            background: #fee2e2;
            color: #b91c1c;
          }

          .legend-h {
            background: #fef3c7;
            color: #92400e;
          }

          .footer {
            text-align: center;
            margin-top: 18px;
            padding-top: 10px;
            border-top: 1px solid #e5e7eb;
            color: #94a3b8;
            font-size: 9px;
          }

          @media print {

            @page {
              size: A4 landscape;
              margin: 8mm;
            }

            body {
              margin: 8px;
            }

            .status-p {
              background: #dcfce7 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .status-a {
              background: #fee2e2 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .status-h {
              background: #fef3c7 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            th,
            .card,
            .legend span {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }

        </style>

      </head>

      <body>

        <div class="header">

          <h1>
            SMART STUDENTS CLASSES
          </h1>

          <h2>
            Attendance Report
          </h2>

          <div class="period">
            ${fullStartDate} → ${fullEndDate}
          </div>

          <p>
            ${
              reportStudent === "all"
                ? reportBatch === "all"
                  ? "All Students"
                  : BATCHES[reportBatch]?.label
                : `Student: ${
                    rows[0]?.studentName ||
                    reportStudent
                  }`
            }
          </p>

          <div class="generated">
            Generated At: ${generatedAt}
          </div>

        </div>

        <div class="summary">

          <div class="card students">
            <span>Students</span>
            <strong>
              ${rows.length}
            </strong>
          </div>

          <div class="card present">
            <span>Total Present</span>
            <strong>
              ${totalP}
            </strong>
          </div>

          <div class="card absent">
            <span>Total Absent</span>
            <strong>
              ${totalA}
            </strong>
          </div>

          <div class="card holiday">
            <span>Total Holiday</span>
            <strong>
              ${totalH}
            </strong>
          </div>

        </div>

        <div class="legend">

          <span class="legend-p">
            P = Present
          </span>

          <span class="legend-a">
            A = Absent
          </span>

          <span class="legend-h">
            H = Holiday
          </span>

        </div>

        <table>

          <thead>

            <tr>

              <th>ID</th>

              <th>
                Student Name
              </th>

              <th>
                Class
              </th>

              ${dateHeaders}

              <th>
                Count
              </th>

              <th>
                Total
              </th>

              <th>
                Attendance %
              </th>

            </tr>

          </thead>

          <tbody>
            ${tableRows}
          </tbody>

        </table>

        <div class="footer">

          Smart Students Classes
          • Attendance Management System

          <br />

          Generated automatically on
          ${generatedAt}

        </div>

      </body>

      </html>
    `);

    win.document.close();
    win.focus();

    setTimeout(() => {
      win.print();
    }, 700);

    setSuccessMsg(
      "Colorful attendance PDF generated. Select 'Save as PDF' to save it."
    );
  };

  // ==================================================
  // DOWNLOAD REPORT
  // ==================================================

  const handleDownloadReport = async (format) => {
    try {
      setReportLoading(true);

      const rows =
        await fetchReportData();

      if (!rows.length) {
        alert(
          "No attendance records found for the selected criteria."
        );
        return;
      }

      if (format === "csv") {
        downloadCSV(rows);
      } else {
        downloadPDF(rows);
      }
    } catch (err) {
      console.error(
        "Report Error:",
        err
      );

      alert(
        err.message ||
          "Failed to generate report."
      );
    } finally {
      setReportLoading(false);
    }
  };

  // ==================================================
  // ATTENDANCE TABLE
  // ==================================================

  const renderTable = (title, list) => {
    const filtered =
      filterBySearch(list);

    const count = (status) =>
      list.filter(
        (s) =>
          (attendance[s.id] ||
            "Absent") === status
      ).length;

    return (
      <div className="table-wrapper">

        <div className="table-header-row">

          <div>

            <h2>
              {title} ({list.length})
            </h2>

            <div className="quick-stats-pills">

              <span className="pill green">
                🟢 Present:{" "}
                {count("Present")}
              </span>

              <span className="pill red">
                🔴 Absent:{" "}
                {count("Absent")}
              </span>

              <span className="pill yellow">
                🟡 Holiday:{" "}
                {count("Holiday")}
              </span>

            </div>

          </div>

          <div className="table-actions-group">

            <input
              className="search-input"
              placeholder="🔍 Search student..."
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(
                  e.target.value
                )
              }
            />

            {editAllowed && (
              <div className="bulk-buttons">

                <button
                  className="bulk-btn green"
                  onClick={() =>
                    handleMarkAll(
                      "Present",
                      list
                    )
                  }
                >
                  All Present
                </button>

                <button
                  className="bulk-btn red"
                  onClick={() =>
                    handleMarkAll(
                      "Absent",
                      list
                    )
                  }
                >
                  All Absent
                </button>

                <button
                  className="bulk-btn yellow"
                  onClick={() =>
                    handleMarkAll(
                      "Holiday",
                      list
                    )
                  }
                >
                  All Holiday
                </button>

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
                  const status =
                    attendance[s.id] ||
                    "Absent";

                  return (
                    <motion.tr
                      key={s.id}
                      initial={{
                        opacity: 0,
                      }}
                      animate={{
                        opacity: 1,
                      }}
                      style={{
                        background:
                          status ===
                          "Present"
                            ? "#5bd57b"
                            : status ===
                              "Absent"
                            ? "#f8b8b8"
                            : "#d1f0bb",
                      }}
                    >

                      <td className="student-id-cell">
                        #{s.id}
                      </td>

                      <td className="student-name-cell">
                        {s.name}
                      </td>

                      <td>
                        <span className="class-badge">
                          Class {s.class}
                        </span>
                      </td>

                      {[
                        "Present",
                        "Absent",
                        "Holiday",
                      ].map((value) => (
                        <td key={value}>

                          <label
                            className={`radio-label ${
                              value ===
                              "Present"
                                ? "green"
                                : value ===
                                  "Absent"
                                ? "red"
                                : "yellow"
                            } ${
                              status ===
                              value
                                ? "selected"
                                : ""
                            }`}
                          >

                            <input
                              type="radio"
                              name={`att-${s.id}`}
                              checked={
                                status ===
                                value
                              }
                              onChange={() =>
                                handleChange(
                                  s.id,
                                  value
                                )
                              }
                              disabled={
                                !editAllowed
                              }
                            />

                            <span>
                              {value}
                            </span>

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

  // ==================================================
  // UI
  // ==================================================

  return (
    <div className="attendance-container">

      <div className="header-banner">

        <div className="header-inner">

          <div>
            <h1>
              Smart Students • Attendance Management
            </h1>

            <p>
              Manage daily attendance across all
              three scheduled batches.
            </p>
          </div>

          <button
            className="report-download-btn"
            onClick={() =>
              setShowReportModal(true)
            }
          >
            📊 Attendance Reports
          </button>

        </div>

      </div>

      {/* BATCH SELECTOR */}

      <div className="controls-row">

        <div className="batch-selector">

          {Object.entries(BATCHES).map(
            ([key, batch]) => (
              <button
                key={key}
                className={`batch-link ${
                  batchType === key
                    ? "active"
                    : ""
                }`}
                onClick={() => {
                  setBatchType(key);
                  setShowTable(true);
                }}
              >
                <b>{batch.label}</b>
                <span>
                  {batch.time}
                </span>
              </button>
            )
          )}

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

          <label>
            📅 Date
          </label>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) =>
              setSelectedDate(
                e.target.value
              )
            }
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
        <div className="info-msg">
          ⚠️ {infoMsg}
        </div>
      ) : showTable ? (
        <motion.div
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
        >

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
              onClick={() =>
                setShowTable(false)
              }
            >
              ← Back
            </button>

            <button
              className={`submit-btn ${
                !isFirstTime
                  ? "update"
                  : ""
              }`}
              onClick={() =>
                sendAttendance(
                  isFirstTime
                    ? "submit"
                    : "update"
                )
              }
              disabled={
                btnDisabled ||
                !editAllowed
              }
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
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          className="action-card-prompt"
        >

          <div className="prompt-badge">
            Selected Date:{" "}
            <strong>
              {selectedDate}
            </strong>
          </div>

          <p>
            Ready to manage attendance logs
            for this session?
          </p>

          <button
            className="submit-btn large"
            onClick={() =>
              setShowTable(true)
            }
            disabled={btnDisabled}
          >
            {isFirstTime
              ? selectedDate ===
                getFormattedDate()
                ? "Mark Today's Attendance"
                : "Mark Attendance"
              : "Edit Attendance"}
          </button>

          {students.length > 0 && (
            <div className="overview-combined-card">

              <h4>
                Attendance Overview ·{" "}
                {selectedDate}
              </h4>

              <div className="overview-grid">

                <div className="overview-item total">
                  <span>
                    Total Students
                  </span>
                  <strong>
                    {totalCombinedStudents}
                  </strong>
                </div>

                <div className="overview-item present">
                  <span>
                    Total Present
                  </span>
                  <strong>
                    {totalCombinedPresent}
                  </strong>
                </div>

                <div className="overview-item absent">
                  <span>
                    Total Absent
                  </span>
                  <strong>
                    {totalCombinedAbsent}
                  </strong>
                </div>

                <div className="overview-item holiday">
                  <span>
                    Total Holiday
                  </span>
                  <strong>
                    {totalCombinedHoliday}
                  </strong>
                </div>

              </div>

            </div>
          )}

        </motion.div>
      )}

      {/* SUMMARY */}

      {summaryData && (
        <AnimatePresence>

          <motion.div
            initial={{
              opacity: 0,
              scale: 0.95,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            className="summary-card"
          >

            <h3>
              Attendance Summary ·{" "}
              {BATCHES[batchType]?.label} ·{" "}
              {BATCHES[batchType]?.time}
            </h3>

            <div className="summary-grid">

              {[
                [
                  "Total Students",
                  summaryData.totalStudents,
                  "total",
                ],
                [
                  "Total Present",
                  summaryData.totalPresent,
                  "present",
                ],
                [
                  "Total Absent",
                  summaryData.totalAbsent,
                  "absent",
                ],
                [
                  "Total Holiday",
                  summaryData.totalHoliday,
                  "holiday",
                ],
              ].map(
                ([label, value, cls]) => (
                  <div
                    className={`summary-item ${cls}`}
                    key={label}
                  >
                    <span>
                      {label}
                    </span>

                    <strong>
                      {value}
                    </strong>
                  </div>
                )
              )}

            </div>

            {successMsg && (
              <div className="success-msg">
                {successMsg}
              </div>
            )}

          </motion.div>

        </AnimatePresence>
      )}

      {/* ==================================================
          MANAGE BATCH MODAL
      ================================================== */}

      {showEditBatches && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (
              e.target ===
                e.currentTarget &&
              !shiftLoading
            ) {
              setShowEditBatches(false);
              clearShiftStudents();
              setShiftSearchQuery("");
            }
          }}
        >

          <motion.div
            initial={{
              opacity: 0,
              y: 18,
              scale: 0.97,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            className="modal-card edit-batch-modal"
          >

            <div className="manage-batch-topbar">

              <div className="manage-batch-title-wrap">

                <div className="manage-batch-icon">
                  ⇄
                </div>

                <div>

                  <h3>
                    Manage Batch Assignments
                  </h3>

                  <p>
                    Select students and move
                    them to another scheduled
                    batch. Changes are saved
                    to the database.
                  </p>

                </div>

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

              {["source", "target"].map(
                (type, index) => {
                  const value =
                    type === "source"
                      ? shiftSourceBatch
                      : shiftTargetBatch;

                  return (
                    <React.Fragment
                      key={type}
                    >

                      {index === 1 && (
                        <div className="batch-flow-arrow">
                          →
                        </div>
                      )}

                      <div className="batch-flow-side">

                        <span className="flow-label">
                          {type ===
                          "source"
                            ? "FROM"
                            : "TO"}
                        </span>

                        <select
                          className={`batch-flow-select ${type}`}
                          value={value}
                          onChange={(e) => {
                            if (
                              type ===
                              "source"
                            ) {
                              setShiftSourceBatch(
                                e.target
                                  .value
                              );
                              clearShiftStudents();
                              setShiftSearchQuery(
                                ""
                              );
                            } else {
                              setShiftTargetBatch(
                                e.target
                                  .value
                              );
                            }
                          }}
                          disabled={
                            shiftLoading
                          }
                        >
                          {Object.entries(
                            BATCHES
                          ).map(
                            ([
                              key,
                              batch,
                            ]) => (
                              <option
                                key={key}
                                value={key}
                              >
                                {batch.label} ·{" "}
                                {batch.time}
                              </option>
                            )
                          )}
                        </select>

                        <span className="flow-count">
                          {
                            getBatchStudents(
                              value
                            ).length
                          }{" "}
                          students
                        </span>

                      </div>

                    </React.Fragment>
                  );
                }
              )}

            </div>

            {shiftSourceBatch ===
              shiftTargetBatch && (
              <div className="batch-warning">
                ⚠️ Source and target batch
                cannot be the same.
              </div>
            )}

            <div className="student-selection-card">

              <div className="selection-header">

                <div>

                  <div className="selection-title">
                    Select Students

                    <span className="selection-count">
                      {
                        getBatchStudents(
                          shiftSourceBatch
                        ).length
                      }
                    </span>
                  </div>

                  <div className="selection-subtitle">
                    Students currently
                    assigned to{" "}
                    <strong>
                      {
                        BATCHES[
                          shiftSourceBatch
                        ].label
                      }
                    </strong>
                  </div>

                </div>

                <div className="selection-actions">

                  <button
                    className="selection-action primary"
                    onClick={
                      selectAllShiftStudents
                    }
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
                    onClick={
                      clearShiftStudents
                    }
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

                <span className="shift-search-icon">
                  ⌕
                </span>

                <input
                  className="shift-search-input"
                  value={
                    shiftSearchQuery
                  }
                  onChange={(e) =>
                    setShiftSearchQuery(
                      e.target.value
                    )
                  }
                  placeholder="Search by student name, ID or class..."
                  disabled={
                    shiftLoading
                  }
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
                      getBatchStudents(
                        shiftSourceBatch
                      ).length
                    }
                  </strong>
                </span>

                <span className="selected-counter">
                  {
                    selectedShiftStudents.length
                  }{" "}
                  selected
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
                        selected
                          ? "selected"
                          : ""
                      }`}
                    >

                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          toggleShiftStudent(
                            st.id
                          )
                        }
                        disabled={
                          shiftLoading
                        }
                      />

                      <span className="student-avatar">
                        {String(
                          st.name || "?"
                        )
                          .trim()
                          .charAt(0)
                          .toUpperCase()}
                      </span>

                      <span className="student-info">

                        <span className="student-main">

                          <strong>
                            {st.name}
                          </strong>

                          <span className="student-meta">
                            ID #{st.id}
                          </span>

                        </span>

                        <span className="student-class">
                          Class{" "}
                          {st.class ||
                            "—"}
                        </span>

                      </span>

                      <span
                        className={`student-check ${
                          selected
                            ? "visible"
                            : ""
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

                    <div className="empty-shift-icon">
                      ⌕
                    </div>

                    <strong>
                      No students found
                    </strong>

                    <span>
                      Try another name, ID
                      or class.
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

              <div className="shift-summary-icon">
                ⇄
              </div>

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
                  if (shiftLoading)
                    return;

                  setShowEditBatches(false);
                  clearShiftStudents();
                  setShiftSearchQuery("");
                }}
              >
                Cancel
              </button>

              <button
                className="shift-confirm-btn"
                onClick={
                  shiftSelectedStudents
                }
                disabled={
                  shiftLoading ||
                  !selectedShiftStudents.length ||
                  shiftSourceBatch ===
                    shiftTargetBatch
                }
              >
                {shiftLoading
                  ? "Saving Changes..."
                  : `⇄ Shift ${
                      selectedShiftStudents.length ||
                      ""
                    } Student${
                      selectedShiftStudents.length ===
                      1
                        ? ""
                        : "s"
                    }`}
              </button>

            </div>

          </motion.div>

        </div>
      )}

      {/* ==================================================
          REPORT MODAL
      ================================================== */}

      {showReportModal && (
        <div className="modal-backdrop">

          <motion.div
            initial={{
              opacity: 0,
              scale: 0.95,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            className="modal-card report-modal"
          >

            <div className="edit-batch-header">

              <div>

                <h3>
                  📊 Attendance Reports
                </h3>

                <p>
                  One student per row with
                  date-wise P, A, H and
                  attendance counts.
                </p>

              </div>

              <button
                className="close-modal-btn"
                onClick={() =>
                  setShowReportModal(false)
                }
                disabled={
                  reportLoading
                }
              >
                ✕
              </button>

            </div>

            <div className="modal-form-group">

              <label>
                📅 Quick Select Month
              </label>

              <input
                type="month"
                defaultValue={startDate.slice(
                  0,
                  7
                )}
                onChange={
                  handleMonthPresetChange
                }
              />

            </div>

            <div className="modal-form-row">

              <div className="modal-form-group">

                <label>
                  Start Date
                </label>

                <input
                  type="date"
                  value={startDate}
                  onChange={(e) =>
                    setStartDate(
                      e.target.value
                    )
                  }
                />

              </div>

              <div className="modal-form-group">

                <label>
                  End Date
                </label>

                <input
                  type="date"
                  value={endDate}
                  onChange={(e) =>
                    setEndDate(
                      e.target.value
                    )
                  }
                />

              </div>

            </div>

            <div className="modal-form-group">

              <label>
                Batch
              </label>

              <select
                value={reportBatch}
                onChange={(e) => {
                  setReportBatch(
                    e.target.value
                  );
                  setReportStudent("all");
                }}
              >

                <option value="all">
                  All Batches
                </option>

                {Object.entries(
                  BATCHES
                ).map(
                  ([key, batch]) => (
                    <option
                      key={key}
                      value={key}
                    >
                      {batch.label} ·{" "}
                      {batch.time}
                    </option>
                  )
                )}

              </select>

            </div>

            {/* SINGLE STUDENT REPORT */}

            <div className="modal-form-group">

              <label>
                Student Report
              </label>

              <select
                value={reportStudent}
                onChange={(e) =>
                  setReportStudent(
                    e.target.value
                  )
                }
              >

                <option value="all">
                  All Students
                </option>

                {students
                  .filter(
                    (s) =>
                      reportBatch ===
                        "all" ||
                      normalizeBatch(
                        s.batch
                      ) ===
                        reportBatch
                  )
                  .sort((a, b) =>
                    String(
                      a.name
                    ).localeCompare(
                      String(b.name)
                    )
                  )
                  .map((s) => (
                    <option
                      key={s.id}
                      value={s.id}
                    >
                      #{s.id} · {s.name} ·
                      Class {s.class}
                    </option>
                  ))}

              </select>

            </div>

            {reportStudent !==
              "all" && (
              <div className="individual-report-note">
                👤 Individual student
                report selected. Only
                this student's attendance
                will be included.
              </div>
            )}

            <div className="report-note">

              ℹ️ Report format:

              <b>
                {" "}
                Student → Every Date
                (P/A/H) → P/A/H Count →
                Total → Attendance %
              </b>

              <br />

              <span>
                🟢 P = Present &nbsp;
                🔴 A = Absent &nbsp;
                🟡 H = Holiday
              </span>

            </div>

            <div className="modal-buttons">

              <button
                className="secondary-btn"
                onClick={() =>
                  setShowReportModal(false)
                }
                disabled={
                  reportLoading
                }
              >
                Cancel
              </button>

              <button
                className="report-action-btn csv"
                onClick={() =>
                  handleDownloadReport(
                    "csv"
                  )
                }
                disabled={
                  reportLoading
                }
              >
                {reportLoading
                  ? "Generating..."
                  : "⬇ CSV"}
              </button>

              <button
                className="report-action-btn pdf"
                onClick={() =>
                  handleDownloadReport(
                    "pdf"
                  )
                }
                disabled={
                  reportLoading
                }
              >
                {reportLoading
                  ? "Generating..."
                  : "🖨 PDF"}
              </button>

            </div>

          </motion.div>

        </div>
      )}

      {/* ==================================================
          CSS
      ================================================== */}

      <style>{`
        *{box-sizing:border-box}

        .attendance-container{
          width:95%;
          max-width:1100px;
          margin:30px auto;
          font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;
          color:#1f2937;
          background:#fff;
          padding:28px;
          border-radius:20px;
          border:1px solid #e5e7eb;
          box-shadow:0 10px 30px rgba(0,0,0,.04)
        }

        .header-banner{
          background:linear-gradient(135deg,#1d166a,#6d28d9);
          color:#fff;
          padding:22px 24px;
          border-radius:14px;
          margin-bottom:20px
        }

        .header-inner{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:16px;
          flex-wrap:wrap
        }

        .header-banner h1{
          font-size:22px;
          font-weight:800;
          margin:0 0 6px
        }

        .header-banner p{
          font-size:13px;
          margin:0;
          color:#e0e7ff
        }

        .report-download-btn{
          background:#fff;
          color:#4338ca;
          font-weight:700;
          font-size:12px;
          padding:9px 13px;
          border-radius:8px;
          border:0;
          cursor:pointer
        }

        .controls-row{
          display:flex;
          justify-content:space-between;
          align-items:center;
          flex-wrap:wrap;
          gap:14px;
          margin-bottom:20px;
          background:#f9fafb;
          padding:13px 15px;
          border-radius:12px;
          border:1px solid #e5e7eb
        }

        .batch-selector{
          display:flex;
          gap:7px;
          flex-wrap:wrap;
          align-items:center
        }

        .batch-link{
          height:36px;
          cursor:pointer;
          color:#3730a3;
          font-weight:700;
          font-size:11px;
          padding:6px 10px;
          background:#fff;
          border-radius:8px;
          border:1px solid #dbe2ea;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:5px;
          white-space:nowrap
        }

        .batch-link.active{
          background:#4338ca;
          color:#fff;
          border-color:#4338ca
        }

        .batch-link span{
          font-size:10px;
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
          gap:8px;
          font-weight:600;
          font-size:12px;
          color:#4b5563;
          background:#fff;
          border:1px solid #e5e7eb;
          padding:6px 8px 6px 10px;
          border-radius:8px
        }

        .date-picker input{
          padding:6px 9px;
          border:1px solid #d1d5db;
          border-radius:6px;
          font-size:12px
        }

        .action-card-prompt{
          text-align:center;
          padding:35px 20px;
          background:#f8fafc;
          border-radius:14px;
          border:2px dashed #cbd5e1;
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:15px
        }

        .action-card-prompt p{
          margin:0;
          color:#64748b;
          font-size:14px
        }

        .prompt-badge{
          background:#e0e7ff;
          color:#3730a3;
          padding:6px 13px;
          border-radius:20px;
          font-size:12px;
          font-weight:600
        }

        .overview-combined-card{
          width:100%;
          max-width:650px;
          margin-top:10px;
          background:#fff;
          border:1px solid #e2e8f0;
          border-radius:12px;
          padding:16px
        }

        .overview-combined-card h4{
          margin:0 0 12px;
          font-size:14px
        }

        .overview-grid,
        .summary-grid{
          display:grid;
          grid-template-columns:repeat(4,1fr);
          gap:9px
        }

        .overview-item,
        .summary-item{
          background:#f8fafc;
          padding:10px;
          border-radius:8px;
          border:1px solid #e2e8f0;
          display:flex;
          flex-direction:column;
          gap:3px;
          text-align:center
        }

        .overview-item span,
        .summary-item span{
          font-size:9px;
          color:#64748b;
          font-weight:700;
          text-transform:uppercase
        }

        .overview-item strong,
        .summary-item strong{
          font-size:18px
        }

        .overview-item.present strong,
        .summary-item.present strong{
          color:#059669
        }

        .overview-item.absent strong,
        .summary-item.absent strong{
          color:#dc2626
        }

        .overview-item.holiday strong,
        .summary-item.holiday strong{
          color:#d97706
        }

        .table-wrapper{
          background:#fff;
          border:1px solid #e5e7eb;
          border-radius:14px;
          padding:18px;
          overflow:hidden
        }

        .table-header-row{
          display:flex;
          justify-content:space-between;
          align-items:center;
          flex-wrap:wrap;
          gap:14px;
          margin-bottom:14px;
          border-bottom:1px solid #f3f4f6;
          padding-bottom:14px
        }

        .table-header-row h2{
          margin:0;
          font-size:18px;
          color:#111827
        }

        .quick-stats-pills{
          display:flex;
          gap:7px;
          margin-top:7px;
          flex-wrap:wrap
        }

        .pill{
          font-size:10px;
          font-weight:700;
          padding:4px 8px;
          border-radius:20px
        }

        .pill.green{
          background:#d1fae5;
          color:#065f46
        }

        .pill.red{
          background:#fee2e2;
          color:#991b1b
        }

        .pill.yellow{
          background:#fef3c7;
          color:#92400e
        }

        .table-actions-group{
          display:flex;
          align-items:center;
          gap:8px;
          flex-wrap:wrap
        }

        .search-input{
          height:36px;
          width:220px;
          padding:7px 11px;
          border:1px solid #d1d5db;
          border-radius:7px;
          font-size:12px
        }

        .bulk-buttons{
          display:flex;
          gap:5px
        }

        .bulk-btn{
          height:36px;
          font-size:10px;
          font-weight:700;
          padding:6px 9px;
          border-radius:6px;
          border:0;
          cursor:pointer
        }

        .bulk-btn.green{
          background:#a7f3d0;
          color:#065f46
        }

        .bulk-btn.red{
          background:#fecaca;
          color:#991b1b
        }

        .bulk-btn.yellow{
          background:#fde68a;
          color:#92400e
        }

        .table-container-scroll{
          overflow-x:auto;
          border-radius:8px;
          border:1px solid #e5e7eb
        }

        .attendance-table{
          width:100%;
          border-collapse:collapse;
          text-align:left;
          min-width:720px
        }

        .attendance-table th,
        .attendance-table td{
          padding:10px 13px;
          font-size:13px;
          border-bottom:1px solid #f3f4f6
        }

        .attendance-table th{
          background:#3730a3;
          color:#fff;
          font-weight:600
        }

        .student-id-cell{
          font-weight:700;
          color:#4b5563
        }

        .student-name-cell{
          font-weight:700;
          color:#1f2937
        }

        .class-badge{
          background:#f3f4f6;
          color:#374151;
          padding:3px 7px;
          border-radius:6px;
          font-size:11px;
          font-weight:600
        }

        .radio-label{
          display:inline-flex;
          align-items:center;
          gap:5px;
          cursor:pointer;
          font-weight:600;
          font-size:11px;
          padding:5px 8px;
          border-radius:6px
        }

        .radio-label input{
          width:15px;
          height:15px
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

        .empty-table-message{
          text-align:center;
          color:#6b7280;
          font-size:13px
        }

        .bottom-actions{
          margin-top:20px;
          display:flex;
          justify-content:flex-end;
          gap:9px
        }

        .submit-btn,
        .secondary-btn,
        .shift-confirm-btn,
        .report-action-btn{
          min-height:40px;
          padding:9px 18px;
          border-radius:8px;
          font-weight:700;
          font-size:12px;
          cursor:pointer;
          border:0
        }

        .submit-btn{
          background:linear-gradient(135deg,#4338ca,#6d28d9);
          color:#fff
        }

        .submit-btn.update{
          background:linear-gradient(135deg,#059669,#10b981)
        }

        .submit-btn.large{
          padding:12px 25px;
          font-size:14px
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

        .success-msg{
          color:#047857;
          font-weight:700;
          margin-top:12px;
          font-size:13px;
          background:#ecfdf5;
          padding:9px;
          border-radius:8px;
          border:1px solid #a7f3d0;
          text-align:center
        }

        .info-msg{
          margin-top:16px;
          padding:13px 16px;
          background:#fef2f2;
          border:1px solid #fecaca;
          color:#b91c1c;
          font-weight:600;
          font-size:13px;
          border-radius:9px
        }

        .summary-card{
          margin-top:20px;
          background:#f8fafc;
          border:1px solid #e2e8f0;
          border-radius:14px;
          padding:20px
        }

        .summary-card h3{
          margin-top:0;
          font-size:16px
        }

        .summary-item{
          background:#fff;
          padding:13px;
          border-radius:9px
        }

        .summary-item span{
          font-size:11px
        }

        .loading-container{
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          padding:40px;
          gap:12px
        }

        .spinner{
          width:38px;
          height:38px;
          border:4px solid #e0e7ff;
          border-top:4px solid #4338ca;
          border-radius:50%;
          animation:spin .8s linear infinite
        }

        .loading-text{
          font-size:13px;
          color:#6b7280;
          font-weight:600
        }

        .modal-backdrop{
          position:fixed;
          inset:0;
          background:rgba(0,0,0,.5);
          display:flex;
          align-items:center;
          justify-content:center;
          z-index:1000;
          padding:20px;
          backdrop-filter:blur(4px)
        }

        .modal-card{
          background:#fff;
          padding:24px;
          border-radius:15px;
          width:100%;
          max-width:520px;
          box-shadow:0 20px 25px -5px rgba(0,0,0,.1);
          border:1px solid #e5e7eb;
          max-height:94vh;
          overflow-y:auto
        }

        .edit-batch-modal{
          max-width:760px
        }

        .edit-batch-header,
        .manage-batch-topbar{
          display:flex;
          justify-content:space-between;
          gap:15px;
          align-items:flex-start;
          margin-bottom:18px
        }

        .edit-batch-header h3,
        .manage-batch-topbar h3{
          margin:0 0 5px;
          font-size:18px
        }

        .edit-batch-header p,
        .manage-batch-topbar p{
          margin:0;
          color:#6b7280;
          font-size:12px;
          line-height:1.5
        }

        .close-modal-btn{
          border:0;
          background:#f3f4f6;
          color:#374151;
          width:32px;
          height:32px;
          border-radius:8px;
          cursor:pointer;
          font-weight:800
        }

        .modal-form-group{
          margin-bottom:14px;
          display:flex;
          flex-direction:column;
          gap:6px
        }

        .modal-form-group label{
          font-size:12px;
          font-weight:700;
          color:#374151
        }

        .modal-form-group input,
        .modal-form-group select{
          padding:9px 11px;
          border:1px solid #d1d5db;
          border-radius:7px;
          font-size:13px;
          outline:0;
          background:#fff
        }

        .modal-form-row{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:10px
        }

        .modal-buttons{
          display:flex;
          justify-content:flex-end;
          align-items:center;
          gap:8px;
          margin-top:20px;
          flex-wrap:wrap
        }

        .batch-flow-card{
          display:grid;
          grid-template-columns:1fr 48px 1fr;
          align-items:center;
          gap:10px;
          padding:13px;
          border-radius:14px;
          background:#f8fafc;
          border:1px solid #e2e8f0;
          margin-bottom:12px
        }

        .flow-label{
          display:block;
          margin-bottom:6px;
          color:#94a3b8;
          font-size:9px;
          font-weight:900
        }

        .batch-flow-select{
          width:100%;
          min-height:42px;
          padding:8px 10px;
          border-radius:9px;
          border:1px solid #cbd5e1;
          background:#fff;
          font-size:12px;
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
          margin-top:6px;
          color:#64748b;
          font-size:10px
        }

        .batch-flow-arrow{
          width:38px;
          height:38px;
          margin:auto;
          display:flex;
          align-items:center;
          justify-content:center;
          border-radius:50%;
          background:#fff;
          border:1px solid #dbe2ea;
          color:#4338ca;
          font-size:18px;
          font-weight:900
        }

        .batch-warning{
          padding:10px 12px;
          margin-bottom:12px;
          border-radius:9px;
          background:#fff7ed;
          border:1px solid #fed7aa;
          color:#9a3412;
          font-size:11px;
          font-weight:700
        }

        .student-selection-card{
          border:1px solid #e2e8f0;
          border-radius:14px;
          overflow:hidden;
          background:#fff
        }

        .selection-header{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          padding:13px 14px;
          background:#fafbff;
          border-bottom:1px solid #eef2f7
        }

        .selection-title{
          display:flex;
          align-items:center;
          gap:7px;
          color:#111827;
          font-size:13px;
          font-weight:800
        }

        .selection-count{
          min-width:22px;
          height:22px;
          padding:0 6px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          border-radius:20px;
          background:#eef2ff;
          color:#4338ca;
          font-size:10px
        }

        .selection-subtitle{
          margin-top:4px;
          color:#64748b;
          font-size:10px
        }

        .selection-actions{
          display:flex;
          gap:6px;
          flex-wrap:wrap
        }

        .selection-action{
          min-height:31px;
          padding:6px 9px;
          border:1px solid #dbe2ea;
          border-radius:7px;
          background:#fff;
          color:#475569;
          cursor:pointer;
          font-size:10px;
          font-weight:800
        }

        .selection-action.primary{
          color:#4338ca;
          border-color:#c7d2fe;
          background:#eef2ff
        }

        .shift-search-wrap{
          position:relative;
          display:flex;
          align-items:center;
          margin:12px 13px 8px
        }

        .shift-search-icon{
          position:absolute;
          left:11px;
          color:#94a3b8;
          font-size:20px
        }

        .shift-search-input{
          width:100%;
          height:38px;
          padding:8px 36px 8px 34px;
          border:1px solid #dbe2ea;
          border-radius:9px;
          background:#f8fafc;
          font-size:11px
        }

        .shift-list-summary{
          display:flex;
          justify-content:space-between;
          padding:0 14px 8px;
          color:#94a3b8;
          font-size:10px
        }

        .selected-counter{
          color:#4338ca;
          font-weight:800
        }

        .shift-student-list{
          max-height:285px;
          overflow-y:auto;
          padding:4px 8px 8px;
          border-top:1px solid #f1f5f9
        }

        .shift-student-row{
          display:flex;
          align-items:center;
          gap:10px;
          min-height:52px;
          padding:7px 9px;
          margin-top:5px;
          border-radius:10px;
          cursor:pointer;
          background:#fff;
          border:1px solid #edf2f7
        }

        .shift-student-row.selected{
          background:#eef2ff;
          border-color:#c7d2fe
        }

        .shift-student-row input{
          width:17px;
          height:17px;
          accent-color:#4338ca
        }

        .student-avatar{
          width:34px;
          height:34px;
          display:flex;
          align-items:center;
          justify-content:center;
          border-radius:9px;
          background:#f1f5f9;
          color:#475569;
          font-size:12px;
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
          gap:10px
        }

        .student-main{
          display:flex;
          flex-direction:column;
          gap:3px
        }

        .student-main strong{
          font-size:12px
        }

        .student-meta{
          color:#94a3b8;
          font-size:9px;
          font-weight:700
        }

        .student-class{
          padding:4px 7px;
          border-radius:6px;
          background:#f8fafc;
          border:1px solid #e2e8f0;
          color:#64748b;
          font-size:9px;
          font-weight:800
        }

        .student-check{
          width:22px;
          height:22px;
          display:flex;
          align-items:center;
          justify-content:center;
          border-radius:50%;
          background:#e2e8f0;
          color:transparent;
          font-size:11px
        }

        .student-check.visible{
          background:#4338ca;
          color:#fff
        }

        .empty-shift-list{
          min-height:150px;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          gap:5px;
          color:#64748b
        }

        .empty-shift-icon{
          font-size:20px
        }

        .shift-action-summary{
          display:flex;
          align-items:center;
          gap:10px;
          margin-top:12px;
          padding:10px 12px;
          border:1px solid #e2e8f0;
          border-radius:10px;
          background:#f8fafc
        }

        .shift-action-summary.has-selection{
          background:#eef2ff;
          border-color:#c7d2fe
        }

        .shift-summary-icon{
          width:32px;
          height:32px;
          display:flex;
          align-items:center;
          justify-content:center;
          border-radius:8px;
          background:#e2e8f0
        }

        .has-selection .shift-summary-icon{
          background:#4338ca;
          color:#fff
        }

        .shift-summary-text{
          display:flex;
          flex-direction:column;
          gap:2px
        }

        .shift-summary-text strong{
          font-size:11px
        }

        .shift-summary-text span{
          color:#64748b;
          font-size:10px
        }

        .shift-confirm-btn{
          background:linear-gradient(
            135deg,
            #4338ca,
            #6d28d9
          );
          color:#fff
        }

        .shift-confirm-btn:disabled{
          background:#cbd5e1;
          color:#64748b;
          cursor:not-allowed
        }

        .report-note,
        .individual-report-note{
          padding:9px 11px;
          border-radius:7px;
          font-size:10px;
          line-height:1.5;
          margin-top:5px
        }

        .report-note{
          background:#f8fafc;
          border:1px solid #e2e8f0;
          color:#64748b
        }

        .individual-report-note{
          background:#eef2ff;
          border:1px solid #c7d2fe;
          color:#4338ca;
          font-weight:600
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
            width:calc(100% - 20px);
            margin:10px auto;
            padding:14px;
            border-radius:14px
          }

          .header-banner{
            padding:18px
          }

          .header-banner h1{
            font-size:19px
          }

          .report-download-btn{
            width:100%
          }

          .batch-selector{
            width:100%
          }

          .batch-link{
            font-size:10px;
            padding:6px 8px
          }

          .edit-batches-btn{
            flex:1
          }

          .date-picker{
            width:100%;
            justify-content:space-between
          }

          .date-picker input{
            flex:1
          }

          .overview-grid,
          .summary-grid{
            grid-template-columns:repeat(2,1fr)
          }

          .table-wrapper{
            padding:12px
          }

          .table-actions-group,
          .search-input{
            width:100%
          }

          .bulk-buttons{
            width:100%;
            display:grid;
            grid-template-columns:repeat(3,1fr)
          }

          .bottom-actions{
            flex-direction:column
          }

          .bottom-actions button{
            width:100%
          }

          .modal-backdrop{
            padding:10px
          }

          .modal-card{
            padding:17px
          }

          .modal-form-row{
            grid-template-columns:1fr
          }

          .batch-flow-card{
            grid-template-columns:1fr;
            gap:8px
          }

          .batch-flow-arrow{
            transform:rotate(90deg)
          }

          .selection-header{
            align-items:flex-start;
            flex-direction:column
          }

          .selection-actions{
            width:100%
          }

          .selection-action{
            flex:1
          }

          .student-info{
            flex-wrap:wrap
          }

          .student-class{
            margin-left:auto
          }

          .modal-buttons{
            width:100%
          }

          .modal-buttons button{
            flex:1
          }
        }

        @keyframes spin{
          0%{
            transform:rotate(0deg)
          }

          100%{
            transform:rotate(360deg)
          }
        }
      `}</style>

    </div>
  );
};

export default MarkAttendance;