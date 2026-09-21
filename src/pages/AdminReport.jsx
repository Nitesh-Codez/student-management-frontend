import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const TEACHER_NAME = "Nitesh Kushwah/Vandana kushwah";

const AdminReport = () => {
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const [reportMode, setReportMode] = useState("single");
  const [singleMonth, setSingleMonth] = useState("2026-08");
  const [fromMonth, setFromMonth] = useState("2026-08");
  const [toMonth, setToMonth] = useState("2026-09");

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState(null);

  /* ================= HELPERS ================= */

  const formatMonth = (month) => {
    if (!month) return "";

    const [year, m] = month.split("-");

    return new Date(
      Number(year),
      Number(m) - 1,
      1
    ).toLocaleDateString("en-IN", {
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

  const getRemark = (
    attendance = 0,
    marks = 0,
    assignments = 0
  ) => {
    const avg =
      (Number(attendance) +
        Number(marks) +
        Number(assignments)) /
      3;

    if (avg >= 85) {
      return "Excellent overall performance. Attendance, academic performance and assignment completion are well maintained.";
    }

    if (avg >= 70) {
      return "Good overall progress. The student is performing consistently, with some scope for improvement.";
    }

    if (avg >= 50) {
      return "Average performance. More focus is recommended on attendance, test preparation and regular assignment completion.";
    }

    return "Performance needs attention. Regular attendance, academic practice and assignment completion should be improved.";
  };

  const getSelectedMonths = () => {
    if (reportMode === "single") {
      return [singleMonth];
    }

    const months = [];

    let current = getMonthNumber(fromMonth);
    const end = getMonthNumber(toMonth);

    while (current <= end) {
      const year = Math.floor((current - 1) / 12);
      const month = ((current - 1) % 12) + 1;

      months.push(
        `${year}-${String(month).padStart(2, "0")}`
      );

      current++;
    }

    return months;
  };

  const getMonthAnalysis = (monthData) => {
    const attendance =
      monthData?.attendance?.summary || {};

    const marks =
      monthData?.marks?.records || [];

    const assignments =
      monthData?.assignments?.summary || {};

    const obtained = marks.reduce(
      (sum, m) =>
        sum + Number(m.obtained_marks || 0),
      0
    );

    const total = marks.reduce(
      (sum, m) =>
        sum + Number(m.total_marks || 0),
      0
    );

    const marksPercentage =
      total > 0
        ? (obtained / total) * 100
        : 0;

    const assigned = Number(
      assignments.assigned || 0
    );

    const submitted = Number(
      assignments.submitted || 0
    );

    const assignmentPercentage =
      assigned > 0
        ? (submitted / assigned) * 100
        : 0;

    const attendancePercentage = Number(
      attendance.percentage || 0
    );

    return {
      attendance: Number(
        attendancePercentage.toFixed(2)
      ),
      marks: Number(
        marksPercentage.toFixed(2)
      ),
      assignments: Number(
        assignmentPercentage.toFixed(2)
      ),
      average: Number(
        (
          (attendancePercentage +
            marksPercentage +
            assignmentPercentage) /
          3
        ).toFixed(2)
      ),
    };
  };

  /* ================= FETCH STUDENTS ================= */

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.get(
        "/api/students/students-basic-info"
      );

      const raw =
        res.data?.students ||
        res.data ||
        [];

      const list = Array.isArray(raw)
        ? raw
        : Object.values(raw);

      setStudents(
        list.map((s, index) => ({
          ...s,

          id:
            s.id ||
            s._id ||
            index + 1,

          name:
            s.name ||
            "Unnamed Student",

          class:
            s.class ||
            s.class_name ||
            s.grade ||
            "N/A",

          mobile:
            s.mobile || "",

          batch:
            s.batch || "",

          batch_time:
            s.batch_time || "",

          session:
            s.session || "",

          profile_photo:
            s.profile_photo || "",

          photo:
            s.profile_photo ||
            s.photo ||
            s.image ||
            "",

          stream:
            s.stream || "",

          joining_date:
            s.joining_date || null,
        }))
      );
    } catch (err) {
      console.error(err);

      setError(
        "Failed to load students data from server."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const classes = useMemo(
    () =>
      [
        ...new Set(
          students
            .map((s) => s.class)
            .filter(Boolean)
        ),
      ].sort(),
    [students]
  );

  const filteredStudents = useMemo(
    () =>
      students.filter(
        (s) => s.class === selectedClass
      ),
    [students, selectedClass]
  );

  const activeStudent = useMemo(
    () =>
      students.find(
        (s) =>
          String(s.id) ===
          String(selectedStudentId)
      ),
    [students, selectedStudentId]
  );

  /* ================= FETCH REPORT ================= */

  const handleFetchReport = async (e) => {
    e.preventDefault();

    setError(null);

    if (!selectedStudentId) {
      setError("Please select a student first.");
      return;
    }

    let monthParam;

    if (reportMode === "single") {
      if (!/^\d{4}-\d{2}$/.test(singleMonth)) {
        setError(
          "Please enter month in YYYY-MM format."
        );
        return;
      }

      monthParam = singleMonth;
    } else {
      if (
        !/^\d{4}-\d{2}$/.test(fromMonth) ||
        !/^\d{4}-\d{2}$/.test(toMonth)
      ) {
        setError(
          "Please enter both months in YYYY-MM format."
        );
        return;
      }

      if (
        getMonthNumber(fromMonth) >
        getMonthNumber(toMonth)
      ) {
        setError(
          "From Month cannot be greater than To Month."
        );
        return;
      }

      monthParam =
        getSelectedMonths().join(",");
    }

    setReportLoading(true);

    try {
      const res = await api.get(
        `/api/exams-details/student/${selectedStudentId}/monthly-report/?month=${encodeURIComponent(
          monthParam
        )}`
      );

      const data = res.data || {};

      /*
       * Merge student data.
       * Basic information API is treated as the
       * main source for mobile/profile/batch/session.
       */
      const reportStudent = {
        ...(data.student || {}),
        ...(activeStudent || {}),
      };

      const finalStudent = {
        ...reportStudent,

        name:
          activeStudent?.name ||
          data.student?.name ||
          "Student",

        class:
          activeStudent?.class ||
          data.student?.class ||
          "N/A",

        mobile:
          activeStudent?.mobile ||
          data.student?.mobile ||
          "",

        batch:
          activeStudent?.batch ||
          data.student?.batch ||
          "",

        batch_time:
          activeStudent?.batch_time ||
          data.student?.batch_time ||
          "",

        session:
          activeStudent?.session ||
          data.student?.session ||
          "",

        profile_photo:
          activeStudent?.profile_photo ||
          data.student?.profile_photo ||
          data.student?.photo ||
          "",

        stream:
          activeStudent?.stream ||
          data.student?.stream ||
          "",

        joining_date:
          activeStudent?.joining_date ||
          data.student?.joining_date ||
          null,
      };

      setReportData({
        ...data,
        student: finalStudent,
      });

      /*
       * IMPORTANT:
       * Generate Report does ONLY generate the report.
       * No auto-send, no confirmation popup here.
       */
    } catch (err) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          "Failed to fetch student monthly report."
      );

      setReportData(null);
    } finally {
      setReportLoading(false);
    }
  };

  /* ================= IMAGE ================= */

  const getBase64ImageFromUrl = async (url) => {
    if (!url) return null;

    try {
      const response = await fetch(url);
      const blob = await response.blob();

      return await new Promise((resolve) => {
        const reader = new FileReader();

        reader.onloadend = () =>
          resolve(reader.result);

        reader.onerror = () =>
          resolve(null);

        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error(
        "Profile image error:",
        err
      );

      return null;
    }
  };

  /* ================= PDF HEADER ================= */

  const drawPDFHeader = (
    doc,
    student,
    periodText
  ) => {
    doc.setFillColor(26, 35, 126);
    doc.rect(0, 0, 210, 43, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);

    doc.text(
      "EduFlow - SMART STUDENTS",
      14,
      13
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    doc.text(
      "Academic & Activity Progress Report",
      14,
      20
    );

    doc.text(
      `Report Period: ${periodText}`,
      14,
      27
    );

    doc.text(
      `Teacher: ${TEACHER_NAME}`,
      14,
      34
    );

    doc.setTextColor(40, 40, 40);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);

    doc.text(
      `Student Name: ${(
        student.name || "N/A"
      ).toUpperCase()}`,
      14,
      53
    );

    doc.text(
      `Class: ${student.class || "N/A"}`,
      120,
      53
    );

    doc.text(
      `Batch: ${student.batch || "N/A"}`,
      14,
      60
    );

    doc.text(
      `Batch Time: ${
        student.batch_time || "N/A"
      }`,
      120,
      60
    );

    doc.text(
      `Session: ${student.session || "N/A"}`,
      14,
      67
    );

    doc.text(
      `Contact No.: ${
        student.mobile || "N/A"
      }`,
      120,
      67
    );

    doc.text(
      `Joining Date: ${formatDate(
        student.joining_date
      )}`,
      14,
      74
    );

    if (student.stream) {
      doc.text(
        `Stream: ${student.stream}`,
        120,
        74
      );
    }
  };

  /* ================= PDF FOOTER ================= */

  const drawPDFFooter = (doc) => {
    const pages =
      doc.getNumberOfPages();

    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(8);
      doc.setTextColor(
        100,
        100,
        100
      );

      doc.text(
        `Teacher: ${TEACHER_NAME} | Smart Students`,
        14,
        287
      );

      doc.text(
        `Page ${i} of ${pages}`,
        170,
        287
      );
    }
  };

  /* ================= MONTH PDF ================= */

  const addMonthToPDF = (
    doc,
    monthData,
    student
  ) => {
    const monthName =
      formatMonth(monthData.month);

    const attendance =
      monthData.attendance?.summary ||
      {};

    const marks =
      monthData.marks?.records || [];

    const assignments =
      monthData.assignments?.records ||
      [];

    const assignmentSummary =
      monthData.assignments?.summary ||
      {};

    const analysis =
      getMonthAnalysis(monthData);

    doc.addPage();

    drawPDFHeader(
      doc,
      student,
      monthName
    );

    let y = 88;

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(13);
    doc.setTextColor(
      26,
      35,
      126
    );

    doc.text(
      `${monthName} Monthly Report`,
      14,
      y
    );

    y += 10;

    /* ATTENDANCE */

    doc.setFontSize(12);

    doc.text(
      "Attendance",
      14,
      y
    );

    y += 5;

    autoTable(doc, {
      startY: y,

      head: [[
        "Present",
        "Absent",
        "Holiday",
        "Working Days",
        "Attendance %",
      ]],

      body: [[
        attendance.present || 0,
        attendance.absent || 0,
        attendance.holiday || 0,
        attendance.workingDays || 0,
        `${attendance.percentage || 0}%`,
      ]],

      theme: "grid",

      headStyles: {
        fillColor: [26, 35, 126],
        textColor: [255, 255, 255],
      },

      bodyStyles: {
        fontSize: 9,
        halign: "center",
      },

      margin: {
        left: 14,
        right: 14,
      },
    });

    y =
      doc.lastAutoTable.finalY +
      8;

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(9);
    doc.setTextColor(
      50,
      50,
      50
    );

    doc.text(
      `The student was present on ${
        attendance.present || 0
      } working days and absent on ${
        attendance.absent || 0
      } days. Attendance was ${
        attendance.percentage || 0
      }%.`,
      14,
      y,
      {
        maxWidth: 180,
      }
    );

    y += 14;

    /* MARKS */

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(12);
    doc.setTextColor(
      26,
      35,
      126
    );

    doc.text(
      "Marks / Test Performance",
      14,
      y
    );

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
      : [[
          "-",
          "No tests recorded",
          "-",
          "-",
          "-",
          "-",
        ]];

    autoTable(doc, {
      startY: y,

      head: [[
        "S.No",
        "Subject",
        "Total",
        "Obtained",
        "Test Date",
        "Status",
      ]],

      body: markRows,

      theme: "grid",

      headStyles: {
        fillColor: [26, 35, 126],
        textColor: [255, 255, 255],
      },

      bodyStyles: {
        fontSize: 8,
      },

      margin: {
        left: 14,
        right: 14,
      },
    });

    y =
      doc.lastAutoTable.finalY +
      8;

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(9);

    doc.text(
      marks.length
        ? `${marks.length} test(s) were conducted during ${monthName}. Combined test score: ${analysis.marks}%.`
        : `No tests were recorded during ${monthName}.`,
      14,
      y,
      {
        maxWidth: 180,
      }
    );

    y += 14;

    /* ASSIGNMENTS */

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(12);
    doc.setTextColor(
      26,
      35,
      126
    );

    doc.text(
      "Assignments",
      14,
      y
    );

    y += 6;

    const assigned = Number(
      assignmentSummary.assigned || 0
    );

    /*
     * If assignments are zero:
     * DO NOT create any assignment table.
     */

    if (assigned === 0) {
      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(10);
      doc.setTextColor(
        50,
        50,
        50
      );

      doc.text(
        "No assignments were assigned by faculty.",
        14,
        y,
        {
          maxWidth: 180,
        }
      );

      y += 12;
    } else {
      autoTable(doc, {
        startY: y,

        head: [[
          "Assigned",
          "Submitted",
          "Pending",
          "Completion %",
        ]],

        body: [[
          assigned,
          assignmentSummary.submitted || 0,
          assignmentSummary.pending || 0,
          `${analysis.assignments}%`,
        ]],

        theme: "grid",

        headStyles: {
          fillColor: [26, 35, 126],
          textColor: [255, 255, 255],
        },

        bodyStyles: {
          fontSize: 9,
          halign: "center",
        },

        margin: {
          left: 14,
          right: 14,
        },
      });

      y =
        doc.lastAutoTable.finalY +
        7;

      const assignmentRows =
        assignments.length
          ? assignments.map((a, i) => [
              i + 1,
              a.subject || "N/A",
              a.task_title || "N/A",
              formatDate(a.deadline),
              a.rating
                ? `${a.rating}/5`
                : "Not Done",
              a.status || "-",
            ])
          : [[
              "-",
              "No assignment records",
              "-",
              "-",
              "-",
              "-",
            ]];

      autoTable(doc, {
        startY: y,

        head: [[
          "S.No",
          "Subject",
          "Task",
          "Deadline",
          "Rating",
          "Status",
        ]],

        body: assignmentRows,

        theme: "grid",

        headStyles: {
          fillColor: [26, 35, 126],
          textColor: [255, 255, 255],
          fontSize: 7.5,
        },

        bodyStyles: {
          fontSize: 7.5,
        },

        columnStyles: {
          2: {
            cellWidth: 55,
          },
        },

        styles: {
          overflow: "linebreak",
        },

        margin: {
          left: 14,
          right: 14,
        },
      });

      y =
        doc.lastAutoTable.finalY +
        9;
    }

    /* REMARK */

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(10);
    doc.setTextColor(
      26,
      35,
      126
    );

    doc.text(
      "Overall Remark",
      14,
      y
    );

    y += 6;

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(9);
    doc.setTextColor(
      50,
      50,
      50
    );

    doc.text(
      getRemark(
        analysis.attendance,
        analysis.marks,
        analysis.assignments
      ),
      14,
      y,
      {
        maxWidth: 180,
      }
    );
  };

  /* ================= GENERATE PDF ================= */

  const generatePDF = async () => {
    if (!reportData) return null;

    const doc = new jsPDF(
      "p",
      "mm",
      "a4"
    );

    const student =
      reportData.student || {};

    const monthly =
      reportData.monthly || [];

    const firstMonth =
      monthly[0]?.month ||
      reportData.period?.from ||
      singleMonth;

    const lastMonth =
      monthly[monthly.length - 1]?.month ||
      reportData.period?.to ||
      firstMonth;

    const periodName =
      firstMonth === lastMonth
        ? formatMonth(firstMonth)
        : `${formatMonth(firstMonth)} - ${formatMonth(
            lastMonth
          )}`;

    /* ================= FIRST PAGE ================= */

    drawPDFHeader(
      doc,
      student,
      periodName
    );

    /* PROFILE PHOTO */

    const photoUrl =
      student.profile_photo ||
      student.photo ||
      activeStudent?.profile_photo ||
      "";

    if (photoUrl) {
      const photo =
        await getBase64ImageFromUrl(
          photoUrl
        );

      if (photo) {
        try {
          doc.addImage(
            photo,
            "JPEG",
            164,
            5,
            32,
            32
          );

          doc.setDrawColor(
            255,
            255,
            255
          );

          doc.rect(
            164,
            5,
            32,
            32
          );
        } catch (err) {
          console.error(
            "PDF photo error:",
            err
          );
        }
      }
    }

    let y = 88;

    /* REPORT TITLE */

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(17);
    doc.setTextColor(
      26,
      35,
      126
    );

    doc.text(
      `${formatMonth(
        firstMonth
      )} Session Report of Student`,
      14,
      y
    );

    y += 13;

    /* ================= ATTENDANCE ================= */

    doc.setFontSize(12);

    doc.text(
      "Attendance",
      14,
      y
    );

    y += 5;

    const overallAttendance =
      reportData.overall?.attendance
        ?.summary || {};

    autoTable(doc, {
      startY: y,

      head: [[
        "Working Days",
        "Present",
        "Absent",
        "Holiday",
        "Attendance %",
      ]],

      body: [[
        overallAttendance.workingDays || 0,
        overallAttendance.present || 0,
        overallAttendance.absent || 0,
        overallAttendance.holiday || 0,
        `${
          overallAttendance.percentage ||
          0
        }%`,
      ]],

      theme: "grid",

      headStyles: {
        fillColor: [26, 35, 126],
        textColor: [255, 255, 255],
      },

      bodyStyles: {
        fontSize: 9,
        halign: "center",
      },

      margin: {
        left: 14,
        right: 14,
      },
    });

    y =
      doc.lastAutoTable.finalY +
      12;

    /* ================= MARKS ================= */

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(12);

    doc.text(
      "Marks",
      14,
      y
    );

    y += 5;

    const overallMarks =
      reportData.overall?.marks
        ?.records || [];

    const overallMarkRows =
      overallMarks.length
        ? overallMarks.map((m, i) => [
            i + 1,
            m.subject || "N/A",
            m.total_marks ?? "-",
            m.obtained_marks ?? "-",
            formatDate(m.test_date),
            m.status || "-",
          ])
        : [[
            "-",
            "No tests recorded",
            "-",
            "-",
            "-",
            "-",
          ]];

    autoTable(doc, {
      startY: y,

      head: [[
        "S.No",
        "Subject",
        "Total",
        "Obtained",
        "Date",
        "Status",
      ]],

      body: overallMarkRows,

      theme: "grid",

      headStyles: {
        fillColor: [26, 35, 126],
        textColor: [255, 255, 255],
        fontSize: 8,
      },

      bodyStyles: {
        fontSize: 8,
      },

      margin: {
        left: 14,
        right: 14,
      },
    });

    y =
      doc.lastAutoTable.finalY +
      12;

    /* ================= ASSIGNMENTS ================= */

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(12);

    doc.text(
      "Assignments",
      14,
      y
    );

    y += 6;

    const firstAssignments =
      monthly.reduce(
        (sum, m) =>
          sum +
          Number(
            m.assignments?.summary
              ?.assigned || 0
          ),
        0
      );

    if (firstAssignments === 0) {
      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(10);

      doc.text(
        "No assignments were assigned by faculty.",
        14,
        y
      );
    } else {
      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(10);

      doc.text(
        "Assignments were assigned during the selected report period.",
        14,
        y
      );
    }

    /* ================= MONTH PAGES ================= */

    monthly.forEach(
      (monthData) => {
        addMonthToPDF(
          doc,
          monthData,
          student
        );
      }
    );

    drawPDFFooter(doc);

    return doc;
  };

  /* ================= NORMALIZE MOBILE ================= */
  /* ================= NORMALIZE MOBILE ================= */

  const getWhatsAppNumber = (student) => {
    let number = String(student?.mobile || "").replace(/\D/g, "");

    if (number.length === 10) {
      number = `91${number}`;
    }

    return number;
  };

  /* ================= SHARE PDF ================= */

 const sharePDFReport = async () => {
  if (!reportData) return;

  const student = reportData.student || activeStudent || {};
  const studentName = student.name || "Student";
  const whatsapp = getWhatsAppNumber(student);

  if (!whatsapp) {
    alert("Student WhatsApp number is not available.");
    return;
  }

  if (!window.confirm(
    `Are you sure you want to share PDF report with ${studentName}?`
  )) return;

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

    if (
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({
        title: `Smart Students Classes - ${studentName}`,
        text: `Hello, please find the Smart Students Classes PDF report of ${studentName}.`,
        files: [file],
      });
    } else {
      const url = `https://wa.me/${whatsapp}?text=${encodeURIComponent(
        `Hello, please find the Smart Students Classes PDF report of ${studentName}.`
      )}`;

      window.open(url, "_blank");
      alert("This browser cannot attach PDF directly. Use mobile Chrome/Edge with WhatsApp.");
    }
  } catch (err) {
    if (err?.name !== "AbortError") {
      console.error("Share PDF Error:", err);
      alert("Unable to share PDF report.");
    }
  } finally {
    setPdfLoading(false);
  }
};
  /* ================= DOWNLOAD PDF ================= */

  const downloadPDF = async () => {
    if (!reportData) return;

    try {
      setPdfLoading(true);

      const doc =
        await generatePDF();

      if (!doc) return;

      const student =
        reportData.student || {};

      const fileName =
        `EduFlow_Report_${(
          student.name ||
          "Student"
        ).replace(
          /\s+/g,
          "_"
        )}.pdf`;

      doc.save(fileName);
    } catch (err) {
      console.error(err);

      alert(
        "Failed to export PDF."
      );
    } finally {
      setPdfLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <>
      <style>{`
        *{
          box-sizing:border-box;
        }

        .report-container{
          background:#f3f4f6;
          min-height:100vh;
          padding:20px;
          font-family:Inter,Arial,sans-serif;
        }

        .report-wrapper{
          width:100%;
          max-width:1400px;
          margin:auto;
          display:flex;
          flex-direction:column;
          gap:20px;
        }

        .report-card{
          background:#fff;
          padding:24px;
          border-radius:14px;
          box-shadow:0 4px 18px rgba(0,0,0,.06);
        }

        .top-header{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:15px;
          flex-wrap:wrap;
        }

        .form-grid,
        .month-grid{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:15px;
        }

        .stats-grid{
          display:grid;
          grid-template-columns:repeat(5,1fr);
          gap:12px;
        }

        .profile-grid{
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:12px;
        }

        .action-btn{
          padding:12px 12px;
          border:0;
          border-radius:8px;
          font-weight:700;
          cursor:pointer;
          font-size:13px;
          width:60%;
          height :50px;
        }
          .action-sharebtn{
          padding:12px 12px;
          border:0;
          border-radius:8px;
          font-weight:700;
          cursor:pointer;
          font-size:13px;
          width:30%;
          height :50px;
        }

        .generate-btn{
          width:30%;
          height :50px;
          
        }

        .toggle-container{
          display:flex;
          gap:10px;
        }

        .toggle-btn{
          width:20px;
          height :30px;
          padding:10px;
          border:0;
          border-radius:7px;
          cursor:pointer;
          font-weight:700;
          font-size:12px;
        }

        .table-scroll{
          overflow-x:auto;
          width:100%;
        }

        .report-table{
          width:100%;
          border-collapse:collapse;
          min-width:650px;
          font-size:13px;
        }

        .report-table th{
          padding:11px;
          background:#1a237e;
          color:#fff;
          text-align:left;
          white-space:nowrap;
        }

        .report-table td{
          padding:10px;
          border-bottom:1px solid #eee;
          white-space:nowrap;
        }

        .month-title{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
          flex-wrap:wrap;
        }

        .month-badge{
          background:#e0e7ff;
          color:#1e3a8a;
          padding:6px 12px;
          border-radius:20px;
          font-size:12px;
          font-weight:700;
        }

        .month-stat{
          padding:13px;
          border-radius:8px;
          background:#f8fafc;
          border:1px solid #e2e8f0;
          text-align:center;
        }

        .month-stat-value{
          font-size:19px;
          font-weight:800;
          display:block;
          color:#1e293b;
        }

        .month-stat-label{
          font-size:10px;
          color:#64748b;
          display:block;
          margin-top:4px;
        }

        .share-box{
          margin-top:20px;
          padding:15px;
          background:#eff6ff;
          border:1px solid #bfdbfe;
          border-radius:10px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:15px;
          flex-wrap:wrap;
        }

        @media(max-width:900px){
          .stats-grid{
            grid-template-columns:repeat(3,1fr);
          }

          .profile-grid{
            grid-template-columns:repeat(2,1fr);
          }
        }

        @media(max-width:650px){
          .report-container{
            padding:10px;
          }

          .report-card{
            padding:15px;
          }

          .form-grid,
          .month-grid,
          .profile-grid{
            grid-template-columns:1fr;
          }

          .stats-grid{
            grid-template-columns:repeat(2,1fr);
          }

          .generate-btn{
            width:20%;
            height :40px;
            padding : 12px 12px;
          }

          .toggle-container{
            flex-wrap:wrap;
          }

          .toggle-btn{
            width:20%;
            height :35px;
            padding:5px 12px;
            

          .share-box{
            flex-direction:column;
            align-items:stretch;
          }

          .share-box .action-btn{
            width:30%;
          }
        }

        @media(max-width:400px){
          .action-btn,
          .toggle-btn{
            width:30%;
            min-width:0;
          }
        }
      `}</style>

      <div className="report-container">
        <div className="report-wrapper">

          {/* ================= MAIN FORM ================= */}

          <div className="report-card">

            <div className="top-header">

              <div>
                <span
                  style={{
                    fontSize:11,
                    fontWeight:700,
                    background:"#e0e7ff",
                    color:"#1e3a8a",
                    padding:"5px 9px",
                    borderRadius:5,
                  }}
                >
                  EduFlow Management
                </span>

                <h2
                  style={{
                    color:"#1a237e",
                    margin:"9px 0 0",
                    fontSize:22,
                  }}
                >
                  📊 Student Monthly Report
                </h2>

                <div
                  style={{
                    fontSize:12,
                    color:"#64748b",
                    marginTop:5,
                  }}
                >
                  Teacher: {TEACHER_NAME}
                </div>
              </div>

              {/* PDF ACTIONS */}

              {reportData && (
                <div
                  style={{
                    display:"flex",
                    gap:8,
                    flexWrap:"wrap",
                    justifyContent:"flex-end",
                  }}
                >

                  <button
                    type="button"
                    onClick={downloadPDF}
                    className="action-btn"
                    disabled={pdfLoading}
                    style={{
                      background:"#15803d",
                      color:"#fff",
                      opacity:
                        pdfLoading ? 0.6 : 1,
                    }}
                  >
                    {pdfLoading
                      ? "Preparing..."
                      : "📥 Download PDF"}
                  </button>

                  <button
                    type="button"
                    onClick={sharePDFReport}
                    className="action-btn"
                    disabled={pdfLoading}
                    style={{
                      background:"#2563eb",
                      color:"#fff",
                      opacity:
                        pdfLoading ? 0.6 : 1,
                    }}
                  >
                    📤 Share with{" "}
                    {reportData.student?.name ||
                      "Student"}
                  </button>

                </div>
              )}
            </div>

            <p
              style={{
                fontSize:13,
                color:"#64748b",
                margin:"15px 0 20px",
              }}
            >
              Select class, student and report
              duration to view attendance, marks,
              assignments and performance analysis.
            </p>

            {error && (
              <div
                style={{
                  background:"#fee2e2",
                  color:"#991b1b",
                  padding:12,
                  borderRadius:8,
                  marginBottom:15,
                  fontSize:13,
                }}
              >
                ⚠️ {error}
              </div>
            )}

            <form
              onSubmit={handleFetchReport}
              style={{
                display:"flex",
                flexDirection:"column",
                gap:16,
              }}
            >

              <div className="form-grid">

                {/* CLASS */}

                <div>
                  <label style={labelStyle}>
                    Class Category
                  </label>

                  <select
                    value={selectedClass}
                    onChange={(e) => {
                      setSelectedClass(
                        e.target.value
                      );

                      setSelectedStudentId("");

                      setReportData(null);
                    }}
                    style={inputStyle}
                  >
                    <option value="">
                      -- Choose Class --
                    </option>

                    {classes.map((c) => (
                      <option
                        key={c}
                        value={c}
                      >
                        Class {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* REPORT MODE */}

                <div>
                  <label style={labelStyle}>
                    Report Duration
                  </label>

                  <div className="toggle-container">

                    <button
                      type="button"
                      className="toggle-btn"
                      onClick={() =>
                        setReportMode("single")
                      }
                      style={{
                        background:
                          reportMode === "single"
                            ? "#1a237e"
                            : "#e2e8f0",

                        color:
                          reportMode === "single"
                            ? "#fff"
                            : "#333",
                      }}
                    >
                      Single Month
                    </button>

                    <button
                      type="button"
                      className="toggle-btn"
                      onClick={() =>
                        setReportMode("range")
                      }
                      style={{
                        background:
                          reportMode === "range"
                            ? "#1a237e"
                            : "#e2e8f0",

                        color:
                          reportMode === "range"
                            ? "#fff"
                            : "#333",
                      }}
                    >
                      Multiple Months
                    </button>

                  </div>
                </div>

              </div>

              {/* MONTH */}

              {reportMode === "single" ? (
                <div>
                  <label style={labelStyle}>
                    Target Month
                  </label>

                  <input
                    type="month"
                    value={singleMonth}
                    onChange={(e) =>
                      setSingleMonth(
                        e.target.value
                      )
                    }
                    style={inputStyle}
                    required
                  />
                </div>
              ) : (
                <div className="month-grid">

                  <div>
                    <label style={labelStyle}>
                      From Month
                    </label>

                    <input
                      type="month"
                      value={fromMonth}
                      onChange={(e) =>
                        setFromMonth(
                          e.target.value
                        )
                      }
                      style={inputStyle}
                      required
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      To Month
                    </label>

                    <input
                      type="month"
                      value={toMonth}
                      onChange={(e) =>
                        setToMonth(
                          e.target.value
                        )
                      }
                      style={inputStyle}
                      required
                    />
                  </div>

                </div>
              )}

              {/* STUDENT */}

              <div>
                <label style={labelStyle}>
                  Student Profile
                </label>

                <select
                  value={selectedStudentId}
                  onChange={(e) =>
                    setSelectedStudentId(
                      e.target.value
                    )
                  }
                  style={inputStyle}
                  disabled={!selectedClass}
                >
                  <option value="">
                    {selectedClass
                      ? "-- Choose Student --"
                      : "Select Class First"}
                  </option>

                  {filteredStudents.map(
                    (s) => (
                      <option
                        key={s.id}
                        value={s.id}
                      >
                        {s.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* STUDENT PREVIEW */}

              {activeStudent && (
                <div
                  style={{
                    display:"flex",
                    alignItems:"center",
                    gap:14,
                    background:"#f8fafc",
                    padding:12,
                    borderRadius:10,
                    border:
                      "1px solid #cbd5e1",
                  }}
                >

                  <div
                    style={{
                      width:55,
                      height:55,
                      borderRadius:10,
                      overflow:"hidden",
                      background:"#94a3b8",
                      display:"flex",
                      alignItems:"center",
                      justifyContent:"center",
                      flexShrink:0,
                    }}
                  >
                    {activeStudent.profile_photo ? (
                      <img
                        src={
                          activeStudent.profile_photo
                        }
                        alt=""
                        style={{
                          width:"100%",
                          height:"100%",
                          objectFit:"cover",
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          color:"#fff",
                          fontSize:18,
                          fontWeight:700,
                        }}
                      >
                        {activeStudent.name
                          ?.charAt(0)
                          .toUpperCase() ||
                          "S"}
                      </span>
                    )}
                  </div>

                  <div>
                    <div
                      style={{
                        fontWeight:700,
                        color:"#1e293b",
                      }}
                    >
                      {activeStudent.name}
                    </div>

                    <div
                      style={{
                        fontSize:12,
                        color:"#64748b",
                        marginTop:4,
                        lineHeight:1.6,
                      }}
                    >
                      Class:{" "}
                      {activeStudent.class}

                      {" | "}

                      Mobile:{" "}
                      {activeStudent.mobile ||
                        "N/A"}

                      {" | "}

                      Batch:{" "}
                      {activeStudent.batch ||
                        "N/A"}

                      {" | "}

                      Batch Time:{" "}
                      {activeStudent.batch_time ||
                        "N/A"}

                      {" | "}

                      Session:{" "}
                      {activeStudent.session ||
                        "N/A"}
                    </div>
                  </div>

                </div>
              )}

              {/* GENERATE */}

              <button
                type="submit"
                disabled={
                  reportLoading ||
                  loading
                }
                className="action-btn generate-btn"
                style={{
                  background:"#1a237e",
                  color:"#fff",
                  opacity:
                    reportLoading ||
                    loading
                      ? 0.6
                      : 1,
                }}
              >
                {reportLoading
                  ? "Generating..."
                  : "Generate Report 🔍"}
              </button>

            </form>

            {/* SHARE INFO */}

            {reportData && (
              <div className="share-box">

                <div>
                  <div
                    style={{
                      fontWeight:700,
                      color:"#1d4ed8",
                      marginBottom:4,
                    }}
                  >
                    📤 Share Student Report
                  </div>

                  <div
                    style={{
                      fontSize:12,
                      color:"#64748b",
                    }}
                  >
                    Share PDF report with{" "}
                    <strong>
                      {reportData.student?.name ||
                        "Student"}
                    </strong>
                    . Student mobile number is
                    automatically taken from the
                    student profile.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={sharePDFReport}
                  className="action-sharebtn"
                  disabled={pdfLoading}
                  style={{
                    background:"#2563eb",
                    color:"#fff",
                    minWidth:200,
                  }}
                >
                  📤 Share with{" "}
                  {reportData.student?.name ||
                    "Student"}
                </button>

              </div>
            )}

          </div>

          {/* ================= REPORT ================= */}

          {reportData && (
            <>

              {/* STUDENT SUMMARY */}

              <div className="report-card">

                <h3
                  style={{
                    margin:"0 0 15px",
                    color:"#1a237e",
                    borderBottom:
                      "2px solid #e0e7ff",
                    paddingBottom:8,
                  }}
                >
                  👤 Student Summary
                </h3>

                <div className="profile-grid">

                  <div>
                    <strong>Name:</strong>{" "}
                    {reportData.student?.name}
                  </div>

                  <div>
                    <strong>Class:</strong>{" "}
                    {reportData.student?.class}
                  </div>

                  <div>
                    <strong>Batch:</strong>{" "}
                    {reportData.student?.batch ||
                      "N/A"}
                  </div>

                  <div>
                    <strong>Batch Time:</strong>{" "}
                    {reportData.student?.batch_time ||
                      "N/A"}
                  </div>

                  <div>
                    <strong>Session:</strong>{" "}
                    {reportData.student?.session ||
                      "N/A"}
                  </div>

                  <div>
                    <strong>Contact:</strong>{" "}
                    {reportData.student?.mobile ||
                      "N/A"}
                  </div>

                  <div>
                    <strong>Stream:</strong>{" "}
                    {reportData.student?.stream ||
                      "N/A"}
                  </div>

                  <div>
                    <strong>Joining Date:</strong>{" "}
                    {formatDate(
                      reportData.student
                        ?.joining_date
                    )}
                  </div>

                  <div>
                    <strong>Teacher:</strong>{" "}
                    {TEACHER_NAME}
                  </div>

                  <div>
                    <strong>From:</strong>{" "}
                    {reportData.period?.from ||
                      "N/A"}
                  </div>

                  <div>
                    <strong>To:</strong>{" "}
                    {reportData.period?.to ||
                      "N/A"}
                  </div>

                </div>

              </div>

              {/* OVERALL */}

              <div className="report-card">

                <h3
                  style={{
                    color:"#1a237e",
                    marginTop:0,
                  }}
                >
                  📈 Overall Performance
                </h3>

                <div className="stats-grid">

                  {[
                    [
                      reportData.overall
                        ?.attendance
                        ?.summary
                        ?.workingDays,
                      "Working Days",
                    ],

                    [
                      reportData.overall
                        ?.attendance
                        ?.summary
                        ?.present,
                      "Present",
                    ],

                    [
                      reportData.overall
                        ?.attendance
                        ?.summary
                        ?.absent,
                      "Absent",
                    ],

                    [
                      reportData.overall
                        ?.attendance
                        ?.summary
                        ?.holiday,
                      "Holiday",
                    ],

                    [
                      `${
                        reportData.overall
                          ?.attendance
                          ?.summary
                          ?.percentage || 0
                      }%`,
                      "Attendance",
                    ],
                  ].map(
                    ([value, label]) => (
                      <div
                        key={label}
                        style={{
                          padding:14,
                          borderRadius:9,
                          background:
                            "#f8fafc",
                          textAlign:
                            "center",
                          border:
                            "1px solid #e2e8f0",
                        }}
                      >
                        <div
                          style={{
                            fontSize:20,
                            fontWeight:800,
                            color:
                              "#1e293b",
                          }}
                        >
                          {value || 0}
                        </div>

                        <div
                          style={{
                            fontSize:10,
                            color:
                              "#64748b",
                            marginTop:4,
                          }}
                        >
                          {label}
                        </div>
                      </div>
                    )
                  )}

                </div>

              </div>

              {/* MONTHLY REPORT */}

              {reportData.monthly?.map(
                (monthData, index) => {
                  const monthName =
                    formatMonth(
                      monthData.month
                    );

                  const att =
                    monthData.attendance
                      ?.summary || {};

                  const marks =
                    monthData.marks
                      ?.records || [];

                  const assignments =
                    monthData.assignments
                      ?.records || [];

                  const assignmentSummary =
                    monthData.assignments
                      ?.summary || {};

                  const analysis =
                    getMonthAnalysis(
                      monthData
                    );

                  return (
                    <div
                      className="report-card"
                      key={
                        monthData.month
                      }
                    >

                      <div className="month-title">

                        <div>
                          <h3
                            style={{
                              margin:
                                "0 0 5px",
                              color:
                                "#1a237e",
                            }}
                          >
                            📅 {monthName}
                          </h3>

                          <div
                            style={{
                              fontSize:12,
                              color:
                                "#64748b",
                            }}
                          >
                            Monthly Academic &
                            Activity Report
                          </div>
                        </div>

                        <span className="month-badge">
                          Month {index + 1}
                        </span>

                      </div>

                      <hr
                        style={{
                          border:0,
                          borderTop:
                            "1px solid #e2e8f0",
                          margin:
                            "15px 0",
                        }}
                      />

                      {/* ATTENDANCE */}

                      <h4
                        style={{
                          color:
                            "#1a237e",
                          margin:
                            "0 0 12px",
                        }}
                      >
                        📅 Attendance
                      </h4>

                      <div className="stats-grid">

                        {[
                          [
                            att.present || 0,
                            "Present (P)",
                          ],

                          [
                            att.absent || 0,
                            "Absent (A)",
                          ],

                          [
                            att.holiday || 0,
                            "Holiday (H)",
                          ],

                          [
                            att.workingDays ||
                              0,
                            "Working Days",
                          ],

                          [
                            `${
                              att.percentage ||
                              0
                            }%`,
                            "Attendance %",
                          ],
                        ].map(
                          ([value, label]) => (
                            <div
                              className="month-stat"
                              key={label}
                            >
                              <b className="month-stat-value">
                                {value}
                              </b>

                              <small className="month-stat-label">
                                {label}
                              </small>
                            </div>
                          )
                        )}

                      </div>

                      <div
                        style={{
                          background:
                            "#f8fafc",
                          borderLeft:
                            "4px solid #1a237e",
                          padding:12,
                          borderRadius:7,
                          marginTop:12,
                          fontSize:13,
                          color:
                            "#334155",
                        }}
                      >
                        <strong>
                          Attendance Analysis:
                        </strong>{" "}
                        Present:{" "}
                        <strong>
                          {att.present || 0}
                        </strong>
                        , Absent:{" "}
                        <strong>
                          {att.absent || 0}
                        </strong>
                        , Attendance:{" "}
                        <strong>
                          {att.percentage ||
                            0}
                          %
                        </strong>
                        .
                      </div>

                      {/* MARKS */}

                      <h4
                        style={{
                          color:
                            "#1a237e",
                          margin:
                            "22px 0 10px",
                        }}
                      >
                        📝 Marks / Test
                        Performance
                      </h4>

                      <div className="table-scroll">

                        <table className="report-table">

                          <thead>
                            <tr>
                              <th>
                                Subject
                              </th>

                              <th>
                                Total
                              </th>

                              <th>
                                Obtained
                              </th>

                              <th>
                                Date
                              </th>

                              <th>
                                Status
                              </th>
                            </tr>
                          </thead>

                          <tbody>

                            {marks.length ? (
                              marks.map(
                                (m) => (
                                  <tr
                                    key={
                                      m.id ||
                                      `${m.subject}-${m.test_date}`
                                    }
                                  >
                                    <td>
                                      <strong>
                                        {m.subject}
                                      </strong>
                                    </td>

                                    <td>
                                      {
                                        m.total_marks
                                      }
                                    </td>

                                    <td>
                                      {
                                        m.obtained_marks
                                      }
                                    </td>

                                    <td>
                                      {formatDate(
                                        m.test_date
                                      )}
                                    </td>

                                    <td>
                                      {
                                        m.status
                                      }
                                    </td>
                                  </tr>
                                )
                              )
                            ) : (
                              <tr>
                                <td
                                  colSpan="5"
                                  style={{
                                    textAlign:
                                      "center",
                                    padding:20,
                                  }}
                                >
                                  No tests
                                  recorded for{" "}
                                  {monthName}.
                                </td>
                              </tr>
                            )}

                          </tbody>

                        </table>

                      </div>

                      <div
                        style={{
                          marginTop:10,
                          padding:12,
                          background:
                            "#f8fafc",
                          borderRadius:7,
                          fontSize:13,
                        }}
                      >
                        <strong>
                          Academic Analysis:
                        </strong>{" "}

                        {marks.length
                          ? `${marks.length} test(s) were conducted. Combined test score was ${analysis.marks}%.`
                          : `No tests were recorded during ${monthName}.`}
                      </div>

                      {/* ASSIGNMENTS */}

                      <h4
                        style={{
                          color:
                            "#1a237e",
                          margin:
                            "22px 0 10px",
                        }}
                      >
                        📚 Assignments
                      </h4>

                      {Number(
                        assignmentSummary.assigned ||
                          0
                      ) === 0 ? (

                        <div
                          style={{
                            padding:14,
                            background:
                              "#f8fafc",
                            borderRadius:8,
                            borderLeft:
                              "4px solid #1a237e",
                            fontSize:13,
                            color:
                              "#334155",
                          }}
                        >
                          No assignments were
                          assigned by faculty.
                        </div>

                      ) : (

                        <>

                          <div className="stats-grid">

                            <div className="month-stat">
                              <b className="month-stat-value">
                                {
                                  assignmentSummary.assigned
                                }
                              </b>

                              <small className="month-stat-label">
                                Assigned
                              </small>
                            </div>

                            <div className="month-stat">
                              <b className="month-stat-value">
                                {
                                  assignmentSummary.submitted ||
                                  0
                                }
                              </b>

                              <small className="month-stat-label">
                                Submitted
                              </small>
                            </div>

                            <div className="month-stat">
                              <b className="month-stat-value">
                                {
                                  assignmentSummary.pending ||
                                  0
                                }
                              </b>

                              <small className="month-stat-label">
                                Pending
                              </small>
                            </div>

                            <div
                              className="month-stat"
                              style={{
                                background:
                                  "#e0e7ff",
                              }}
                            >
                              <b className="month-stat-value">
                                {
                                  analysis.assignments
                                }
                                %
                              </b>

                              <small className="month-stat-label">
                                Completion
                              </small>
                            </div>

                          </div>

                          <div
                            className="table-scroll"
                            style={{
                              marginTop:12,
                            }}
                          >

                            <table className="report-table">

                              <thead>
                                <tr>
                                  <th>
                                    Subject
                                  </th>

                                  <th>
                                    Task
                                  </th>

                                  <th>
                                    Deadline
                                  </th>

                                  <th>
                                    Rating
                                  </th>

                                  <th>
                                    Status
                                  </th>
                                </tr>
                              </thead>

                              <tbody>

                                {assignments.length ? (
                                  assignments.map(
                                    (a) => (
                                      <tr
                                        key={
                                          a.assignment_id ||
                                          `${a.subject}-${a.task_title}`
                                        }
                                      >

                                        <td>
                                          <strong>
                                            {
                                              a.subject
                                            }
                                          </strong>
                                        </td>

                                        <td>
                                          {
                                            a.task_title
                                          }
                                        </td>

                                        <td>
                                          {formatDate(
                                            a.deadline
                                          )}
                                        </td>

                                        <td>
                                          {a.status
                                            ?.toUpperCase() ===
                                          "PENDING"
                                            ? "Not Done"
                                            : `⭐ ${
                                                a.rating ||
                                                0
                                              }/5`}
                                        </td>

                                        <td>
                                          {
                                            a.status
                                          }
                                        </td>

                                      </tr>
                                    )
                                  )
                                ) : (
                                  <tr>
                                    <td
                                      colSpan="5"
                                      style={{
                                        textAlign:
                                          "center",
                                        padding:20,
                                      }}
                                    >
                                      No assignment
                                      records.
                                    </td>
                                  </tr>
                                )}

                              </tbody>

                            </table>

                          </div>

                        </>
                      )}

                      {/* REMARK */}

                      <div
                        style={{
                          marginTop:18,
                          padding:14,
                          background:
                            "#f8fafc",
                          borderRadius:9,
                          borderLeft:
                            "4px solid #1a237e",
                        }}
                      >

                        <div
                          style={{
                            fontWeight:700,
                            color:
                              "#1a237e",
                            marginBottom:5,
                          }}
                        >
                          💡 Overall Remark
                        </div>

                        <div
                          style={{
                            fontSize:13,
                            color:
                              "#334155",
                            lineHeight:1.5,
                          }}
                        >
                          {getRemark(
                            analysis.attendance,
                            analysis.marks,
                            analysis.assignments
                          )}
                        </div>

                      </div>

                    </div>
                  );
                }
              )}

            </>
          )}

        </div>
      </div>
    </>
  );
};

/* ================= STYLES ================= */

const inputStyle = {
  padding:"11px 12px",
  borderRadius:8,
  border:"1px solid #cbd5e1",
  fontSize:14,
  width:"30%",
  background:"white",
  outline:"none",
};

const labelStyle = {
  fontSize:12,
  fontWeight:700,
  color:"#475569",
  marginBottom:6,
  display:"block",
};

export default AdminReport;