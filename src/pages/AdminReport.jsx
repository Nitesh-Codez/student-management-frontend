import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const TEACHER_NAME = "Nitesh Kushwah/Vandana kushwah";

const AdminReport = () => {
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const [reportType, setReportType] = useState("monthly"); // "monthly" or "exam"
  const [reportMode, setReportMode] = useState("single"); // "single" or "range"
  const [singleMonth, setSingleMonth] = useState("2026-08");
  const [fromMonth, setFromMonth] = useState("2026-08");
  const [toMonth, setToMonth] = useState("2026-09");

  // Exam States & Dynamic Dropdown options
  const [examType, setExamType] = useState("PRE-FINAL");
  const [examSession, setExamSession] = useState("2026-27");
  const [examCategory, setExamCategory] = useState("all"); // "all" or "supplementary"
  const [examData, setExamData] = useState([]);

  // Dynamic filter lists
  const [availableSessions, setAvailableSessions] = useState(["2026-27"]);
  const [availableExamTypes] = useState([
    "PRE-FINAL",
    "FINAL",
    "PRE-FINAL REAPPEAR",
    "FINAL REAPPEAR",
  ]);

  const [reportData, setReportData] = useState(null);
  const [, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [downloadedTick, setDownloadedTick] = useState(false);
  const [examDownloadedTick, setExamDownloadedTick] = useState(false);
  const [error, setError] = useState(null);

  /* ================= HELPERS ================= */

  const formatMonth = (month) => {
    if (!month) return "";
    const [year, m] = month.split("-");
    return new Date(Number(year), Number(m) - 1, 1).toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getMonthNumber = (month) => {
    if (!month) return 0;
    const [year, m] = month.split("-").map(Number);
    return year * 12 + m;
  };

  const getRemark = (attendance = 0, marks = 0, assignments = 0) => {
    const avg = (Number(attendance) + Number(marks) + Number(assignments)) / 3;
    if (avg >= 85)
      return "Excellent overall performance. Attendance, academic performance and assignment completion are well maintained.";
    if (avg >= 70)
      return "Good overall progress. The student is performing consistently, with some scope for improvement.";
    if (avg >= 50)
      return "Average performance. More focus is recommended on attendance, test preparation and regular assignment completion.";
    return "Performance needs attention. Regular attendance, academic practice and assignment completion should be improved.";
  };

  const getSelectedMonths = () => {
    if (reportMode === "single") return [singleMonth];
    const months = [];
    let current = getMonthNumber(fromMonth);
    const end = getMonthNumber(toMonth);
    while (current <= end) {
      const year = Math.floor((current - 1) / 12);
      const month = ((current - 1) % 12) + 1;
      months.push(`${year}-${String(month).padStart(2, "0")}`);
      current++;
    }
    return months;
  };

  const getMonthAnalysis = (monthData) => {
    const attendance = monthData?.attendance?.summary || {};
    const marks = monthData?.marks?.records || [];
    const assignments = monthData?.assignments?.summary || {};

    const obtained = marks.reduce((sum, m) => sum + Number(m.obtained_marks || 0), 0);
    const total = marks.reduce((sum, m) => sum + Number(m.total_marks || 0), 0);
    const marksPercentage = total > 0 ? (obtained / total) * 100 : 0;

    const assigned = Number(assignments.assigned || 0);
    const submitted = Number(assignments.submitted || 0);
    const assignmentPercentage = assigned > 0 ? (submitted / assigned) * 100 : 0;
    const attendancePercentage = Number(attendance.percentage || 0);

    return {
      attendance: Number(attendancePercentage.toFixed(2)),
      marks: Number(marksPercentage.toFixed(2)),
      assignments: Number(assignmentPercentage.toFixed(2)),
      average: Number(
        ((attendancePercentage + marksPercentage + assignmentPercentage) / 3).toFixed(2)
      ),
    };
  };

  /* ================= FETCH STUDENTS & METADATA ================= */

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/students/students-basic-info");
      const raw = res.data?.students || res.data || [];
      const list = Array.isArray(raw) ? raw : Object.values(raw);
      setStudents(
        list.map((s, index) => ({
          ...s,
          id: s.id || s._id || index + 1,
          name: s.name || "Unnamed Student",
          class: s.class || s.class_name || s.grade || "N/A",
          mobile: s.mobile || "",
          batch: s.batch || "",
          batch_time: s.batch_time || "",
          session: s.session || "",
          profile_photo: s.profile_photo || "",
          stream: s.stream || "",
          joining_date: s.joining_date || null,
        }))
      );

      const uniqueSessions = [...new Set(list.map((s) => s.session).filter(Boolean))];
      if (uniqueSessions.length > 0) {
        setAvailableSessions(uniqueSessions);
        setExamSession(uniqueSessions[0]);
      } else {
        setExamSession("2026-27");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load students data from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const classes = useMemo(
    () => [...new Set(students.map((s) => s.class).filter(Boolean))].sort(),
    [students]
  );

  const filteredStudents = useMemo(
    () => students.filter((s) => s.class === selectedClass),
    [students, selectedClass]
  );

  const activeStudent = useMemo(
    () => students.find((s) => String(s.id) === String(selectedStudentId)),
    [students, selectedStudentId]
  );

  /* ================= FETCH REPORT ================= */

  const handleFetchReport = async (e) => {
    e.preventDefault();
    setError(null);

    if (reportType === "monthly") {
      if (!selectedStudentId) {
        setError("Please select a student first.");
        return;
      }

      let monthParam;
      if (reportMode === "single") {
        if (!/^\d{4}-\d{2}$/.test(singleMonth)) {
          setError("Please enter month in YYYY-MM format.");
          return;
        }
        monthParam = singleMonth;
      } else {
        if (!/^\d{4}-\d{2}$/.test(fromMonth) || !/^\d{4}-\d{2}$/.test(toMonth)) {
          setError("Please enter both months in YYYY-MM format.");
          return;
        }
        if (getMonthNumber(fromMonth) > getMonthNumber(toMonth)) {
          setError("From Month cannot be greater than To Month.");
          return;
        }
        monthParam = getSelectedMonths().join(",");
      }

      setReportLoading(true);
      try {
        const res = await api.get(
          `/api/exams-details/student/${selectedStudentId}/monthly-report/?month=${encodeURIComponent(
            monthParam
          )}`
        );
        const data = res.data || {};
        const finalStudent = {
          ...(data.student || {}),
          ...(activeStudent || {}),
          name: activeStudent?.name || data.student?.name || "Student",
          class: activeStudent?.class || data.student?.class || "N/A",
          mobile: activeStudent?.mobile || data.student?.mobile || "",
          batch: activeStudent?.batch || data.student?.batch || "",
          batch_time: activeStudent?.batch_time || data.student?.batch_time || "",
          session: activeStudent?.session || data.student?.session || "",
          stream: activeStudent?.stream || data.student?.stream || "",
          joining_date: activeStudent?.joining_date || data.student?.joining_date || null,
        };
        setReportData({ ...data, student: finalStudent });
        setExamData([]);
      } catch (err) {
        console.error(err);
        setError(err?.response?.data?.message || "Failed to fetch student monthly report.");
        setReportData(null);
      } finally {
        setReportLoading(false);
      }
    } else {
      if (!examType || !examSession) {
        setError("Please provide Exam Type and Session.");
        return;
      }

      setReportLoading(true);
      try {
        const endpoint =
          examCategory === "all"
            ? `/api/exam/admin/exam-results?exam_type=${encodeURIComponent(
                examType
              )}&session=${encodeURIComponent(examSession)}`
            : `/api/exam/admin/supplementary-students?exam_type=${encodeURIComponent(
                examType
              )}&session=${encodeURIComponent(examSession)}`;

        const res = await api.get(endpoint);
        setExamData(res.data?.data || []);
        setReportData(null);
      } catch (err) {
        console.error(err);
        setError(err?.response?.data?.message || "Failed to fetch exam results.");
        setExamData([]);
      } finally {
        setReportLoading(false);
      }
    }
  };

  /* ================= PDF GENERATION ================= */

  const drawPDFHeader = (doc, student, monthName = "") => {
    doc.setFillColor(26, 35, 126);
    doc.rect(0, 0, 210, 40, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text("SmartZone - SMART STUDENTS CLASSES", 14, 13);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Academic & Activity Progress Report", 14, 20);

    if (monthName) {
      doc.text(`Monthly Report: ${monthName}`, 14, 27);
    }
    doc.text(`Teacher: ${TEACHER_NAME}`, 14, 34);

    const x = 14,
      y = 50,
      w = 182,
      h = 52;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(x, y, w, h, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(26, 35, 126);
    doc.text("STUDENT DETAILS", x + 6, y + 8);

    doc.setDrawColor(226, 232, 240);
    doc.line(x + 6, y + 11, x + w - 6, y + 11);

    doc.setFontSize(8.5);
    doc.setTextColor(45, 55, 72);

    const left = x + 7,
      right = x + 98;
    const r1 = y + 20,
      r2 = y + 29,
      r3 = y + 38,
      r4 = y + 47;

    const write = (label, value, px, py) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, px, py);
      doc.setFont("helvetica", "normal");
      doc.text(String(value || "N/A"), px + (label.length * 2.1 + 5), py);
    };

    write("Name:", String(student.name || "N/A").toUpperCase(), left, r1);
    write("Class:", student.class, right, r1);
    write("Batch:", student.batch, left, r2);
    write("Batch Time:", student.batch_time, right, r2);
    write("Session:", student.session, left, r3);
    write("Contact:", student.mobile, right, r3);
    write("Stream:", student.stream, left, r4);
    write("Joining Date:", formatDate(student.joining_date), right, r4);
  };

  const drawPDFFooter = (doc) => {
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Teacher: ${TEACHER_NAME} | Smart Students`, 14, 287);
      doc.text(`Page ${i} of ${pages}`, 170, 287);
    }
  };

  const addMonthToPDF = (doc, monthData, student) => {
    const monthName = formatMonth(monthData.month);
    const attendance = monthData?.attendance?.summary || {};
    const marks = monthData?.marks?.records || [];
    const analysis = getMonthAnalysis(monthData);

    doc.addPage();
    drawPDFHeader(doc, student, monthName);

    let y = 120;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.setTextColor(26, 35, 126);
    doc.text(`${monthName} Monthly Report`, 14, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Monthly Academic & Activity Performance", 14, y);
    y += 12;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(26, 35, 126);
    doc.text("Attendance", 14, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [["Present", "Absent", "Holiday", "Working Days", "Attendance %"]],
      body: [
        [
          attendance.present || 0,
          attendance.absent || 0,
          attendance.holiday || 0,
          attendance.workingDays || 0,
          `${attendance.percentage || 0}%`,
        ],
      ],
      theme: "grid",
      headStyles: { fillColor: [26, 35, 126], textColor: [255, 255, 255], fontSize: 8.5 },
      bodyStyles: { fontSize: 9, halign: "center" },
      margin: { left: 14, right: 14 },
    });

    y = doc.lastAutoTable.finalY + 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.text(
      `During ${monthName}, the student was present on ${
        attendance.present || 0
      } working days and absent on ${attendance.absent || 0} days. Total working days: ${
        attendance.workingDays || 0
      }. Attendance: ${attendance.percentage || 0}%.`,
      14,
      y,
      { maxWidth: 180 }
    );
    y += 14;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(26, 35, 126);
    doc.text("Marks / Test Performance", 14, y);
    y += 5;

    const markRows = marks.length
      ? marks.map((m, i) => [
          i + 1,
          m.subject || "N/A",
          m.total_marks ?? "-",
          m.obtained_marks ?? "-",
          formatDate(m.test_date),
          m.status || "-",
        ])
      : [["-", "No tests recorded", "-", "-", "-", "-"]];

    autoTable(doc, {
      startY: y,
      head: [["S.No", "Subject", "Total", "Obtained", "Test Date", "Status"]],
      body: markRows,
      theme: "grid",
      headStyles: { fillColor: [26, 35, 126], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });

    y = doc.lastAutoTable.finalY + 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(26, 35, 126);
    doc.text("Overall Remark", 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.text(getRemark(analysis.attendance, analysis.marks, analysis.assignments), 14, y, {
      maxWidth: 180,
    });
  };

  const generatePDF = async () => {
    if (!reportData) return null;
    const doc = new jsPDF("p", "mm", "a4");
    const student = reportData.student || {};
    const monthly = Array.isArray(reportData.monthly) ? reportData.monthly : [];
    if (!monthly.length) return null;

    const firstMonth = monthly[0]?.month || reportData.period?.from || singleMonth;
    const lastMonth = monthly[monthly.length - 1]?.month || reportData.period?.to || firstMonth;
    const periodName =
      firstMonth === lastMonth
        ? `${formatMonth(firstMonth)} Report`
        : `${formatMonth(firstMonth)} - ${formatMonth(lastMonth)} Report`;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(26, 35, 126);
    doc.text(periodName, 105, 145, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Smart Students Classes", 105, 155, { align: "center" });

    monthly.forEach((monthData) => addMonthToPDF(doc, monthData, student));
    drawPDFFooter(doc);
    return doc;
  };

  const downloadPDF = async () => {
    if (!reportData) return;
    try {
      setPdfLoading(true);
      const doc = await generatePDF();
      if (!doc) return;
      const student = reportData.student || {};
      const studentName = (student.name || "Student").replace(/\s+/g, "_");
      doc.save(`Smart_Students_Classes_Report_${studentName}.pdf`);

      setDownloadedTick(true);
      setTimeout(() => setDownloadedTick(false), 2500);
    } catch (err) {
      console.error(err);
      alert("Failed to export PDF.");
    } finally {
      setPdfLoading(false);
    }
  };

  const downloadExamPDF = async () => {
    if (!examData.length) return;
    try {
      setPdfLoading(true);
      const doc = new jsPDF("p", "mm", "a4");

      doc.setFillColor(26, 35, 126);
      doc.rect(0, 0, 210, 30, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text("SmartZone - SMART STUDENTS CLASSES", 14, 12);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Exam Report: ${examType} (${examSession}) | Teacher: ${TEACHER_NAME}`, 14, 21);

      let rows = [];
      let head = [];

      if (examCategory === "all") {
        head = [["S.No", "Student Name", "Class", "Total Sub", "Max", "Obtained", "%", "Result"]];
        rows = examData.map((item, idx) => [
          idx + 1,
          item.student_name,
          item.student_class,
          item.total_subjects,
          item.maximum_marks,
          item.obtained_marks,
          `${item.percentage}%`,
          item.result,
        ]);
      } else {
        head = [["S.No", "Student Name", "Class", "Failed Count", "Failed Subjects Detail"]];
        rows = examData.map((item, idx) => [
          idx + 1,
          item.student_name,
          item.student_class,
          item.failed_subject_count,
          (item.failed_subjects || [])
            .map(
              (sub) =>
                `${sub.subject}: ${sub.obtained_marks}/${sub.total_marks} (Theory: ${sub.theory_marks})`
            )
            .join("\n"),
        ]);
      }

      autoTable(doc, {
        startY: 38,
        head: head,
        body: rows,
        theme: "grid",
        headStyles: { fillColor: [26, 35, 126], fontSize: 8.5 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
      });

      doc.save(`Exam_Report_${examType}_${examSession}.pdf`);

      setExamDownloadedTick(true);
      setTimeout(() => setExamDownloadedTick(false), 2500);
    } catch (err) {
      console.error(err);
      alert("Failed to export exam PDF.");
    } finally {
      setPdfLoading(false);
    }
  };

  const sharePDFReport = async () => {
    if (!reportData) return;
    const student = reportData.student || activeStudent || {};
    const studentName = student.name || "Student";
    let whatsapp = String(student?.mobile || "").replace(/\D/g, "");
    if (whatsapp.length === 10) whatsapp = `91${whatsapp}`;

    if (!whatsapp) {
      alert("Student WhatsApp number is not available.");
      return;
    }

    try {
      setPdfLoading(true);
      const doc = await generatePDF();
      if (!doc) return;
      const blob = doc.output("blob");
      const file = new File(
        [blob],
        `Smart_Students_Classes_Report_${studentName.replace(/\s+/g, "_")}.pdf`,
        { type: "application/pdf" }
      );

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Smart Students Classes - ${studentName}`,
          text: `Hello, please find the Smart Students Classes PDF report of ${studentName}.`,
          files: [file],
        });
      } else {
        window.open(
          `https://wa.me/${whatsapp}?text=${encodeURIComponent(
            `Hello, report for ${studentName}`
          )}`,
          "_blank"
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPdfLoading(false);
    }
  };

  const monthlyList = Array.isArray(reportData?.monthly) ? reportData.monthly : [];

  /* ================= UI ================= */

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        .report-container {
          background: #f8fafc;
          min-height: 100vh;
          padding: 20px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          color: #0f172a;
        }
        .report-wrapper {
          width: 100%;
          max-width: 1320px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .report-card {
          background: #ffffff;
          padding: 22px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
        }
        .top-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }
        .badge-pill {
          font-size: 11px;
          font-weight: 700;
          background: #eef2ff;
          color: #1e3a8a;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid #c7d2fe;
          display: inline-block;
        }
        .page-title {
          color: #0f172a;
          margin: 8px 0 0;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.01em;
        }
        .teacher-sub {
          font-size: 12px;
          color: #64748b;
          margin-top: 4px;
          font-weight: 500;
        }

        /* Segmented / Button Controls */
        .btn-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 8px;
        }
        .seg-btn {
          padding: 9px 16px;
          border-radius: 9px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-width: 148px;
        }
        .seg-btn:hover {
          border-color: #94a3b8;
          background: #f8fafc;
        }
        .seg-btn.active-primary {
          background: #1e3a8a;
          color: #ffffff;
          border-color: #1e3a8a;
          box-shadow: 0 2px 8px rgba(30, 58, 138, 0.2);
        }
        .seg-btn.active-dark {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }

        .primary-submit-btn {
          margin-top: 18px;
          padding: 10px 22px;
          border-radius: 10px;
          border: none;
          background: #1e3a8a;
          color: #ffffff;
          font-weight: 700;
          font-size: 13.5px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-width: 180px;
          box-shadow: 0 4px 12px rgba(30, 58, 138, 0.18);
          transition: background 0.15s ease, transform 0.15s ease;
        }
        .primary-submit-btn:hover:not(:disabled) {
          background: #172554;
          transform: translateY(-1px);
        }
        .primary-submit-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .export-btn {
          padding: 9px 15px;
          border-radius: 9px;
          border: 1px solid transparent;
          font-weight: 600;
          font-size: 12.5px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.15s ease;
        }
        .export-btn-pdf {
          background: #1e3a8a;
          color: #ffffff;
        }
        .export-btn-pdf:hover:not(:disabled) {
          background: #172554;
        }
        .export-btn-wa {
          background: #ecfdf5;
          color: #047857;
          border-color: #a7f3d0;
        }
        .export-btn-wa:hover:not(:disabled) {
          background: #d1fae5;
        }

        /* Form & Layout Grids */
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 14px;
        }
        .month-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
          gap: 14px;
          max-width: 520px;
        }
        .field-label {
          font-size: 12px;
          font-weight: 600;
          color: #334155;
          display: block;
          margin-bottom: 6px;
        }
        .field-control {
          width: 100%;
          padding: 9px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 13px;
          font-family: inherit;
          color: #0f172a;
          background: #ffffff;
          outline: none;
          transition: border-color 0.15s ease;
        }
        .field-control:focus {
          border-color: #1e3a8a;
          box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.08);
        }
        .field-control:disabled {
          background: #f1f5f9;
          color: #94a3b8;
          cursor: not-allowed;
        }

        .profile-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 10px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 14px;
          font-size: 13px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-top: 12px;
        }
        .month-stat {
          padding: 12px;
          border-radius: 10px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          text-align: center;
        }
        .month-stat-value {
          font-size: 17px;
          font-weight: 800;
          display: block;
          color: #0f172a;
        }
        .month-stat-label {
          font-size: 11px;
          color: #64748b;
          display: block;
          margin-top: 3px;
          font-weight: 600;
        }
        .month-badge {
          background: #eef2ff;
          color: #1e3a8a;
          padding: 5px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
        }
        .table-scroll {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          width: 100%;
          margin-top: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
        }
        .report-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 600px;
          font-size: 12.5px;
        }
        .report-table th {
          padding: 10px 12px;
          background: #1e3a8a;
          color: #ffffff;
          text-align: left;
          font-weight: 700;
          white-space: nowrap;
        }
        .report-table td {
          padding: 9px 12px;
          border-bottom: 1px solid #f1f5f9;
          color: #1e293b;
        }
        .report-table tr:last-child td {
          border-bottom: none;
        }

        /* Mobile View Fixes */
        @media (max-width: 768px) {
          .report-container {
            padding: 12px;
          }
          .report-card {
            padding: 16px;
            border-radius: 12px;
          }
          .page-title {
            font-size: 19px;
          }
          .btn-row {
            flex-direction: column;
            gap: 8px;
          }
          .seg-btn {
            width: 100%;
            min-width: 0;
          }
          .primary-submit-btn {
            width: 100%;
          }
          .export-actions {
            width: 100%;
            flex-direction: column;
          }
          .export-btn {
            width: 100%;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .form-grid,
          .month-grid,
          .profile-grid {
            grid-template-columns: 1fr;
            max-width: 100%;
          }
        }
      `}</style>

      <div className="report-container">
        <div className="report-wrapper">
          {/* FILTER & CONTROLS CARD */}
          <div className="report-card">
            <div className="top-header">
              <div>
                <span className="badge-pill">SmartZone Management</span>
                <h2 className="page-title">Reports Dashboard</h2>
                <div className="teacher-sub">Teacher: {TEACHER_NAME}</div>
              </div>
            </div>

            {/* REPORT TYPE SWITCHER */}
            <div style={{ marginTop: 16 }}>
              <span className="field-label">Report Type</span>
              <div className="btn-row">
                <button
                  type="button"
                  onClick={() => setReportType("monthly")}
                  className={`seg-btn ${reportType === "monthly" ? "active-primary" : ""}`}
                >
                  Monthly Report
                </button>
                <button
                  type="button"
                  onClick={() => setReportType("exam")}
                  className={`seg-btn ${reportType === "exam" ? "active-primary" : ""}`}
                >
                  Exam / Supplementary
                </button>
              </div>
            </div>

            {/* FORM CONTROLS */}
            <form onSubmit={handleFetchReport} style={{ marginTop: 16 }}>
              {reportType === "monthly" ? (
                <>
                  <div className="form-grid">
                    <div>
                      <label className="field-label">Select Class</label>
                      <select
                        value={selectedClass}
                        onChange={(e) => {
                          setSelectedClass(e.target.value);
                          setSelectedStudentId("");
                        }}
                        className="field-control"
                      >
                        <option value="">-- Choose Class --</option>
                        {classes.map((cls) => (
                          <option key={cls} value={cls}>
                            Class {cls}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="field-label">Select Student</label>
                      <select
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                        disabled={!selectedClass}
                        className="field-control"
                      >
                        <option value="">-- Choose Student --</option>
                        {filteredStudents.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.name} {st.batch ? `(${st.batch})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <label className="field-label">Report Mode</label>
                    <div className="btn-row">
                      <button
                        type="button"
                        onClick={() => setReportMode("single")}
                        className={`seg-btn ${reportMode === "single" ? "active-dark" : ""}`}
                      >
                        Single Month
                      </button>
                      <button
                        type="button"
                        onClick={() => setReportMode("range")}
                        className={`seg-btn ${reportMode === "range" ? "active-dark" : ""}`}
                      >
                        Date Range
                      </button>
                    </div>
                  </div>

                  {reportMode === "single" ? (
                    <div style={{ marginTop: 14, maxWidth: "260px" }}>
                      <label className="field-label">Month</label>
                      <input
                        type="month"
                        value={singleMonth}
                        onChange={(e) => setSingleMonth(e.target.value)}
                        className="field-control"
                      />
                    </div>
                  ) : (
                    <div className="month-grid" style={{ marginTop: 14 }}>
                      <div>
                        <label className="field-label">From Month</label>
                        <input
                          type="month"
                          value={fromMonth}
                          onChange={(e) => setFromMonth(e.target.value)}
                          className="field-control"
                        />
                      </div>
                      <div>
                        <label className="field-label">To Month</label>
                        <input
                          type="month"
                          value={toMonth}
                          onChange={(e) => setToMonth(e.target.value)}
                          className="field-control"
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="form-grid">
                    <div>
                      <label className="field-label">Exam Type</label>
                      <select
                        value={examType}
                        onChange={(e) => setExamType(e.target.value)}
                        className="field-control"
                      >
                        {availableExamTypes.map((et) => (
                          <option key={et} value={et}>
                            {et}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="field-label">Session</label>
                      <select
                        value={examSession}
                        onChange={(e) => setExamSession(e.target.value)}
                        className="field-control"
                      >
                        {availableSessions.map((ses) => (
                          <option key={ses} value={ses}>
                            {ses}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <label className="field-label">Exam Category</label>
                    <div className="btn-row">
                      <button
                        type="button"
                        onClick={() => setExamCategory("all")}
                        className={`seg-btn ${examCategory === "all" ? "active-dark" : ""}`}
                      >
                        All Exam Results
                      </button>
                      <button
                        type="button"
                        onClick={() => setExamCategory("supplementary")}
                        className={`seg-btn ${
                          examCategory === "supplementary" ? "active-dark" : ""
                        }`}
                      >
                        Failed / Supplementary
                      </button>
                    </div>
                  </div>
                </>
              )}

              {error && (
                <div
                  style={{
                    marginTop: 14,
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#dc2626",
                    fontSize: 12.5,
                    fontWeight: 600,
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={reportLoading}
                className="primary-submit-btn"
              >
                {reportLoading ? "Fetching Report..." : "Generate Report"}
              </button>
            </form>
          </div>

          {/* MONTHLY REPORT RESULTS */}
          {reportData && reportData.student && (
            <div className="report-card">
              <div className="top-header" style={{ marginBottom: 14 }}>
                <h3 style={{ color: "#0f172a", margin: 0, fontSize: 17, fontWeight: 800 }}>
                  Student Profile &amp; Monthly Summary
                </h3>
                <div className="btn-row export-actions" style={{ marginTop: 0 }}>
                  <button
                    type="button"
                    onClick={downloadPDF}
                    disabled={pdfLoading}
                    className="export-btn export-btn-pdf"
                  >
                    {downloadedTick
                      ? "Downloaded PDF"
                      : pdfLoading
                      ? "Preparing PDF..."
                      : "Download PDF"}
                  </button>
                  <button
                    type="button"
                    onClick={sharePDFReport}
                    disabled={pdfLoading}
                    className="export-btn export-btn-wa"
                  >
                    Share on WhatsApp
                  </button>
                </div>
              </div>

              <div className="profile-grid">
                <div><strong>Name:</strong> {reportData.student.name || "N/A"}</div>
                <div><strong>Class:</strong> {reportData.student.class || "N/A"}</div>
                <div><strong>Batch:</strong> {reportData.student.batch || "N/A"}</div>
                <div><strong>Batch Time:</strong> {reportData.student.batch_time || "N/A"}</div>
                <div><strong>Session:</strong> {reportData.student.session || "N/A"}</div>
                <div><strong>Contact:</strong> {reportData.student.mobile || "N/A"}</div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 18 }}>
                {monthlyList.map((mItem, idx) => {
                  const att = mItem?.attendance?.summary || {};
                  const marks = mItem?.marks?.records || [];
                  const analysis = getMonthAnalysis(mItem);

                  return (
                    <div
                      key={mItem.month || idx}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                        padding: 16,
                        background: "#ffffff",
                      }}
                    >
                      <div className="top-header">
                        <span className="month-badge">{formatMonth(mItem.month)}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#1e3a8a" }}>
                          Overall Avg: {analysis.average}%
                        </span>
                      </div>

                      <div className="stats-grid">
                        <div className="month-stat">
                          <span className="month-stat-value">{att.present || 0}</span>
                          <span className="month-stat-label">Present</span>
                        </div>
                        <div className="month-stat">
                          <span className="month-stat-value">{att.absent || 0}</span>
                          <span className="month-stat-label">Absent</span>
                        </div>
                        <div className="month-stat">
                          <span className="month-stat-value">{att.workingDays || 0}</span>
                          <span className="month-stat-label">Working Days</span>
                        </div>
                        <div className="month-stat">
                          <span className="month-stat-value">{att.percentage || 0}%</span>
                          <span className="month-stat-label">Attendance</span>
                        </div>
                      </div>

                      <div className="table-scroll">
                        <table className="report-table">
                          <thead>
                            <tr>
                              <th>S.No</th>
                              <th>Subject</th>
                              <th>Obtained</th>
                              <th>Total</th>
                              <th>Test Date</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {marks.length > 0 ? (
                              marks.map((mk, mIdx) => (
                                <tr key={mIdx}>
                                  <td>{mIdx + 1}</td>
                                  <td>{mk.subject || "N/A"}</td>
                                  <td>{mk.obtained_marks ?? "-"}</td>
                                  <td>{mk.total_marks ?? "-"}</td>
                                  <td>{formatDate(mk.test_date)}</td>
                                  <td>{mk.status || "-"}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={6} style={{ textAlign: "center", color: "#64748b" }}>
                                  No tests recorded for this month.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div
                        style={{
                          marginTop: 12,
                          fontSize: 12.5,
                          color: "#334155",
                          background: "#f8fafc",
                          padding: "10px 12px",
                          borderRadius: 8,
                        }}
                      >
                        <strong>Remark:</strong>{" "}
                        {getRemark(analysis.attendance, analysis.marks, analysis.assignments)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* EXAM / SUPPLEMENTARY REPORT RESULTS */}
          {reportType === "exam" && examData.length > 0 && (
            <div className="report-card">
              <div className="top-header" style={{ marginBottom: 12 }}>
                <div>
                  <h3 style={{ color: "#0f172a", margin: 0, fontSize: 17, fontWeight: 800 }}>
                    {examType} ({examSession}) —{" "}
                    {examCategory === "all" ? "All Results" : "Supplementary / Failed"}
                  </h3>
                  <div className="teacher-sub">Total Records: {examData.length}</div>
                </div>
                <button
                  type="button"
                  onClick={downloadExamPDF}
                  disabled={pdfLoading}
                  className="export-btn export-btn-pdf"
                >
                  {examDownloadedTick
                    ? "Downloaded Exam PDF"
                    : pdfLoading
                    ? "Preparing PDF..."
                    : "Download Exam PDF"}
                </button>
              </div>

              <div className="table-scroll">
                <table className="report-table">
                  {examCategory === "all" ? (
                    <>
                      <thead>
                        <tr>
                          <th>S.No</th>
                          <th>Student Name</th>
                          <th>Class</th>
                          <th>Subjects</th>
                          <th>Obtained</th>
                          <th>Max</th>
                          <th>%</th>
                          <th>Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {examData.map((row, idx) => (
                          <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td><strong>{row.student_name}</strong></td>
                            <td>{row.student_class}</td>
                            <td>{row.total_subjects}</td>
                            <td>{row.obtained_marks}</td>
                            <td>{row.maximum_marks}</td>
                            <td>{row.percentage}%</td>
                            <td>{row.result}</td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  ) : (
                    <>
                      <thead>
                        <tr>
                          <th>S.No</th>
                          <th>Student Name</th>
                          <th>Class</th>
                          <th>Failed Count</th>
                          <th>Failed Subjects</th>
                        </tr>
                      </thead>
                      <tbody>
                        {examData.map((row, idx) => (
                          <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td><strong>{row.student_name}</strong></td>
                            <td>{row.student_class}</td>
                            <td>{row.failed_subject_count}</td>
                            <td>
                              {(row.failed_subjects || [])
                                .map(
                                  (sub) =>
                                    `${sub.subject} (${sub.obtained_marks}/${sub.total_marks})`
                                )
                                .join(", ")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  )}
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminReport;