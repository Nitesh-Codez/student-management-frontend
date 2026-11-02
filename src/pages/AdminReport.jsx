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
  const [reportMode, setReportMode] = useState("single");
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
  const [availableExamTypes, setAvailableExamTypes] = useState(["PRE-FINAL", "FINAL", "PRE-FINAL REAPPEAR", "FINAL REAPPEAR"]);

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
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
    if (avg >= 85) return "Excellent overall performance. Attendance, academic performance and assignment completion are well maintained.";
    if (avg >= 70) return "Good overall progress. The student is performing consistently, with some scope for improvement.";
    if (avg >= 50) return "Average performance. More focus is recommended on attendance, test preparation and regular assignment completion.";
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
      average: Number(((attendancePercentage + marksPercentage + assignmentPercentage) / 3).toFixed(2)),
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
          `/api/exams-details/student/${selectedStudentId}/monthly-report/?month=${encodeURIComponent(monthParam)}`
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
            ? `/api/exam/admin/exam-results?exam_type=${encodeURIComponent(examType)}&session=${encodeURIComponent(examSession)}`
            : `/api/exam/admin/supplementary-students?exam_type=${encodeURIComponent(examType)}&session=${encodeURIComponent(examSession)}`;

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

    const x = 14, y = 50, w = 182, h = 52;
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

    const left = x + 7, right = x + 98;
    const r1 = y + 20, r2 = y + 29, r3 = y + 38, r4 = y + 47;

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
      body: [[
        attendance.present || 0,
        attendance.absent || 0,
        attendance.holiday || 0,
        attendance.workingDays || 0,
        `${attendance.percentage || 0}%`,
      ]],
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
      `During ${monthName}, the student was present on ${attendance.present || 0} working days and absent on ${attendance.absent || 0} days. Total working days: ${attendance.workingDays || 0}. Attendance: ${attendance.percentage || 0}%.`,
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
      ? marks.map((m, i) => [i + 1, m.subject || "N/A", m.total_marks ?? "-", m.obtained_marks ?? "-", formatDate(m.test_date), m.status || "-"])
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
    doc.text(getRemark(analysis.attendance, analysis.marks, analysis.assignments), 14, y, { maxWidth: 180 });
  };

  const generatePDF = async () => {
    if (!reportData) return null;
    const doc = new jsPDF("p", "mm", "a4");
    const student = reportData.student || {};
    const monthly = Array.isArray(reportData.monthly) ? reportData.monthly : [];
    if (!monthly.length) return null;

    const firstMonth = monthly[0]?.month || reportData.period?.from || singleMonth;
    const lastMonth = monthly[monthly.length - 1]?.month || reportData.period?.to || firstMonth;
    const periodName = firstMonth === lastMonth ? `${formatMonth(firstMonth)} Report` : `${formatMonth(firstMonth)} - ${formatMonth(lastMonth)} Report`;

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
            .map((sub) => `${sub.subject}: ${sub.obtained_marks}/${sub.total_marks} (Theory: ${sub.theory_marks})`)
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
      const file = new File([blob], `Smart_Students_Classes_Report_${studentName.replace(/\s+/g, "_")}.pdf`, { type: "application/pdf" });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Smart Students Classes - ${studentName}`,
          text: `Hello, please find the Smart Students Classes PDF report of ${studentName}.`,
          files: [file],
        });
      } else {
        window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hello, report for ${studentName}`)}`, "_blank");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPdfLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <>
      <style>{`
        *{box-sizing:border-box;}
        .report-container{background:#f3f4f6;min-height:100vh;padding:20px;font-family:Inter,Arial,sans-serif;}
        .report-wrapper{width:100%;max-width:1400px;margin:auto;display:flex;flex-direction:column;gap:20px;}
        .report-card{background:#fff;padding:20px;border-radius:12px;box-shadow:0 4px 18px rgba(0,0,0,.06);}
        .top-header{display:flex;justify-content:space-between;align-items:center;gap:15px;flex-wrap:wrap;}
        
        /* Compact Left-aligned form grids */
        .form-grid{display:grid;grid-template-columns:260px 260px;gap:15px;justify-content:start;}
        .month-grid{display:grid;grid-template-columns:260px 260px;gap:15px;justify-content:start;}
        
        .stats-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;}
        .profile-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
        
        /* 30% width compact buttons */
        .action-btn{width:30%; padding:9px 12px;border:0;border-radius:6px;font-weight:600;cursor:pointer;font-size:12px;display:inline-flex;align-items:center;justify-content:center;gap:5px;}
        .toggle-btn{width:30%; padding:8px 12px;border:0;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;text-align:center;}
        
        /* Month input styling */
        .custom-month-input {
          width: 100%;
          max-width: 260px;
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          font-size: 13px;
          font-family: Inter, sans-serif;
          color: #1e293b;
          background: #fff;
          outline: none;
        }
        input[type="month"]::-webkit-datetime-edit {
          font-family: 'Inter', sans-serif;
          color: #1e293b;
        }

        .table-scroll{overflow-x:auto;width:100%;margin-top:15px;}
        .report-table{width:100%;border-collapse:collapse;min-width:650px;font-size:12px;}
        .report-table th{padding:10px;background:#1a237e;color:#fff;text-align:left;white-space:nowrap;}
        .report-table td{padding:9px 10px;border-bottom:1px solid #eee;white-space:nowrap;}
        .month-badge{background:#e0e7ff;color:#1e3a8a;padding:5px 10px;border-radius:20px;font-size:11px;font-weight:700;}
        .month-stat{padding:10px;border-radius:6px;background:#f8fafc;border:1px solid #e2e8f0;text-align:center;}
        .month-stat-value{font-size:16px;font-weight:800;display:block;color:#1e293b;}
        .month-stat-label{font-size:10px;color:#64748b;display:block;margin-top:2px;}
      `}</style>

      <div className="report-container">
        <div className="report-wrapper">
          <div className="report-card">
            <div className="top-header">
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, background: "#e0e7ff", color: "#1e3a8a", padding: "3px 8px", borderRadius: 4 }}>
                  SmartZone Management
                </span>
                <h2 style={{ color: "#1a237e", margin: "7px 0 0", fontSize: 20 }}>
                  📊 Reports Dashboard
                </h2>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Teacher: {TEACHER_NAME}</div>
              </div>
            </div>

            {/* REPORT TYPE SWITCHER */}
            <div style={{ marginTop: 15, display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => setReportType("monthly")}
                className="toggle-btn"
                style={{ background: reportType === "monthly" ? "#1a237e" : "#e2e8f0", color: reportType === "monthly" ? "#fff" : "#334155" }}
              >
                Monthly Report
              </button>
              <button
                type="button"
                onClick={() => setReportType("exam")}
                className="toggle-btn"
                style={{ background: reportType === "exam" ? "#1a237e" : "#e2e8f0", color: reportType === "exam" ? "#fff" : "#334155" }}
              >
                Exam / Supplementary
              </button>
            </div>

            {/* FORM CONTROLS */}
            <form onSubmit={handleFetchReport} style={{ marginTop: 15 }}>
              {reportType === "monthly" ? (
                <>
                  <div className="form-grid">
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>Select Class</label>
                      <select
                        value={selectedClass}
                        onChange={(e) => {
                          setSelectedClass(e.target.value);
                          setSelectedStudentId("");
                        }}
                        style={{ width: "100%", maxWidth: "260px", padding: 8, borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }}
                      >
                        <option value="">-- Choose Class --</option>
                        {classes.map((cls) => (
                          <option key={cls} value={cls}>Class {cls}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>Select Student</label>
                      <select
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                        disabled={!selectedClass}
                        style={{ width: "100%", maxWidth: "260px", padding: 8, borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }}
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

                  <div style={{ marginTop: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>Report Mode</label>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => setReportMode("single")}
                        className="toggle-btn"
                        style={{ background: reportMode === "single" ? "#374151" : "#f1f5f9", color: reportMode === "single" ? "#fff" : "#334155" }}
                      >
                        Single Month
                      </button>
                      <button
                        type="button"
                        onClick={() => setReportMode("range")}
                        className="toggle-btn"
                        style={{ background: reportMode === "range" ? "#374151" : "#f1f5f9", color: reportMode === "range" ? "#fff" : "#334155" }}
                      >
                        Date Range
                      </button>
                    </div>
                  </div>

                  {reportMode === "single" ? (
                    <div style={{ marginTop: 12 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>Month</label>
                      <input
                        type="month"
                        value={singleMonth}
                        onChange={(e) => setSingleMonth(e.target.value)}
                        className="custom-month-input"
                      />
                    </div>
                  ) : (
                    <div className="month-grid" style={{ marginTop: 12 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>From Month</label>
                        <input
                          type="month"
                          value={fromMonth}
                          onChange={(e) => setFromMonth(e.target.value)}
                          className="custom-month-input"
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>To Month</label>
                        <input
                          type="month"
                          value={toMonth}
                          onChange={(e) => setToMonth(e.target.value)}
                          className="custom-month-input"
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* EXAM REPORT DYNAMIC DROPDOWNS */
                <div className="form-grid">
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>Exam Type</label>
                    <select
                      value={examType}
                      onChange={(e) => setExamType(e.target.value)}
                      style={{ width: "100%", maxWidth: "260px", padding: 8, borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }}
                    >
                      {availableExamTypes.map((et) => (
                        <option key={et} value={et}>{et}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>Session</label>
                    <select
                      value={examSession}
                      onChange={(e) => setExamSession(e.target.value)}
                      style={{ width: "100%", maxWidth: "260px", padding: 8, borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }}
                    >
                      {availableSessions.map((ses) => (
                        <option key={ses} value={ses}>{ses}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ gridColumn: "span 2" }}>
                    <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>Exam Category</label>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => setExamCategory("all")}
                        className="toggle-btn"
                        style={{ background: examCategory === "all" ? "#374151" : "#f1f5f9", color: examCategory === "all" ? "#fff" : "#334155" }}
                      >
                        All Exam Results
                      </button>
                      <button
                        type="button"
                        onClick={() => setExamCategory("supplementary")}
                        className="toggle-btn"
                        style={{ background: examCategory === "supplementary" ? "#374151" : "#f1f5f9", color: examCategory === "supplementary" ? "#fff" : "#334155" }}
                      >
                        Failed / Supplementary
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {error && <div style={{ marginTop: 12, color: "#dc2626", fontSize: 12, fontWeight: 600 }}>⚠️ {error}</div>}

              <button
                type="submit"
                disabled={reportLoading}
                className="action-btn"
                style={{ marginTop: 15, background: "#1a237e", color: "#fff", width: "30%", height: 38 }}
              >
                {reportLoading ? "Fetching..." : "Generate Report"}
              </button>
            </form>
          </div>

          {/* MONTHLY REPORT RESULTS DISPLAY */}
          {reportData && reportData.student && (
            <div className="report-card">
              <div className="top-header" style={{ marginBottom: 15 }}>
                <h3 style={{ color: "#1a237e", margin: 0, fontSize: 16 }}>📋 Student Profile & Summary</h3>
                <div style={{ display: "flex", gap: 8, width: "100%", justifyContent: "flex-end" }}>
                  <button type="button" onClick={downloadPDF} className="action-btn" disabled={pdfLoading} style={{ background: "#15803d", color: "#fff" }}>
                    {downloadedTick ? "📥 Downloaded ✅" : "📥 Download PDF"}
                  </button>
                  <button type="button" onClick={sharePDFReport} className="action-btn" disabled={pdfLoading} style={{ background: "#2563eb", color: "#fff" }}>
                    📤 WhatsApp
                  </button>
                </div>
              </div>
              <div className="profile-grid" style={{ marginTop: 12 }}>
                <div className="month-stat">
                  <span className="month-stat-value" style={{ fontSize: 14 }}>{reportData.student.name}</span>
                  <span className="month-stat-label">Student Name</span>
                </div>
                <div className="month-stat">
                  <span className="month-stat-value" style={{ fontSize: 14 }}>Class {reportData.student.class}</span>
                  <span className="month-stat-label">Class</span>
                </div>
                <div className="month-stat">
                  <span className="month-stat-value" style={{ fontSize: 14 }}>{reportData.student.mobile || "N/A"}</span>
                  <span className="month-stat-label">Mobile</span>
                </div>
              </div>

              {Array.isArray(reportData.monthly) &&
                reportData.monthly.map((m, idx) => {
                  const analysis = getMonthAnalysis(m);
                  return (
                    <div key={idx} style={{ marginTop: 20, borderTop: "1px solid #e2e8f0", paddingTop: 15 }}>
                      <div className="top-header">
                        <h4 style={{ margin: 0, color: "#1a237e", fontSize: 14 }}>{formatMonth(m.month)} Performance</h4>
                        <span className="month-badge">Overall Score: {analysis.average}%</span>
                      </div>
                      <div className="stats-grid" style={{ marginTop: 10 }}>
                        <div className="month-stat">
                          <span className="month-stat-value">{analysis.attendance}%</span>
                          <span className="month-stat-label">Attendance</span>
                        </div>
                        <div className="month-stat">
                          <span className="month-stat-value">{analysis.marks}%</span>
                          <span className="month-stat-label">Marks</span>
                        </div>
                        <div className="month-stat">
                          <span className="month-stat-value">{analysis.assignments}%</span>
                          <span className="month-stat-label">Assignments</span>
                        </div>
                        <div className="month-stat">
                          <span className="month-stat-value">{analysis.average}%</span>
                          <span className="month-stat-label">Average</span>
                        </div>
                        <div className="month-stat">
                          <span className="month-stat-value">
                            {m.attendance?.summary?.present || 0}/{m.attendance?.summary?.workingDays || 0}
                          </span>
                          <span className="month-stat-label">Present/Total</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* EXAM REPORT RESULTS TABLE / CARDS DISPLAY & DOWNLOAD BUTTON */}
          {examData.length > 0 && (
            <div className="report-card">
              <div className="top-header" style={{ marginBottom: 15 }}>
                <h3 style={{ color: "#1a237e", margin: 0, fontSize: 16 }}>
                  📝 Exam Results ({examType} - {examSession})
                </h3>
                <button
                  type="button"
                  onClick={downloadExamPDF}
                  className="action-btn"
                  disabled={pdfLoading}
                  style={{ background: "#15803d", color: "#fff" }}
                >
                  {examDownloadedTick ? "📥 Downloaded ✅" : "📥 Download Exam PDF"}
                </button>
              </div>

              {examCategory === "all" ? (
                <div className="table-scroll">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>S.No</th>
                        <th>Student Name</th>
                        <th>Class</th>
                        <th>Exam Type</th>
                        <th>Total Subjects</th>
                        <th>Max Marks</th>
                        <th>Obtained Marks</th>
                        <th>Percentage</th>
                        <th>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {examData.map((item, index) => (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td style={{ fontWeight: 600 }}>{item.student_name}</td>
                          <td>{item.student_class}</td>
                          <td>{item.exam_type}</td>
                          <td>{item.total_subjects}</td>
                          <td>{item.maximum_marks}</td>
                          <td>{item.obtained_marks}</td>
                          <td>{item.percentage}%</td>
                          <td>
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 700,
                                background: item.result === "Pass" ? "#dcfce7" : "#fee2e2",
                                color: item.result === "Pass" ? "#166534" : "#991b1b",
                              }}
                            >
                              {item.result}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* DETAILED CARDS FOR FAILED / SUPPLEMENTARY STUDENTS */
                <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                  {examData.map((item, index) => (
                    <div key={index} style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: 15, background: "#f8fafc" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: 8 }}>
                        <div>
                          <b style={{ fontSize: 15, color: "#1a237e" }}>{index + 1}. {item.student_name}</b> (Class: {item.student_class})
                        </div>
                        <span style={{ background: "#fee2e2", color: "#991b1b", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                          Failed Subjects: {item.failed_subject_count}
                        </span>
                      </div>

                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Failed Subjects Breakdown:</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
                          {item.failed_subjects?.map((sub, sIdx) => (
                            <div key={sIdx} style={{ background: "#fff", border: "1px solid #fecaca", borderRadius: 6, padding: 10, fontSize: 12 }}>
                              <div style={{ fontWeight: 700, color: "#b91c1c", marginBottom: 4 }}>📌 {sub.subject}</div>
                              <div>Obtained Marks: <b>{sub.obtained_marks} / {sub.total_marks}</b></div>
                              <div>Theory Marks: <b>{sub.theory_marks}</b></div>
                              <div>Required: {sub.required_marks} | Shortage: <span style={{ color: "#dc2626", fontWeight: 700 }}>{sub.shortage_marks}</span></div>
                              <div>Status: <span style={{ color: "#dc2626", fontWeight: 700 }}>{sub.status}</span></div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginTop: 10, fontSize: 11, color: "#64748b", display: "flex", gap: 15 }}>
                        <span>Passed Subjects Count: <b>{item.passed_subject_count}</b></span>
                        <span>Failed Sub Obtained Marks: <b>{item.failed_subject_obtained_marks}</b></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminReport;