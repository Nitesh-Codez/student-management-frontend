import React, { useState, useEffect, useMemo } from "react";
import api from "../services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

  const [whatsappNumber, setWhatsappNumber] = useState("");

  /* =========================================================
     HELPERS
  ========================================================= */

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
    marksPercentage = 0,
    assignmentPercentage = 0
  ) => {
    const average =
      (Number(attendance) +
        Number(marksPercentage) +
        Number(assignmentPercentage)) /
      3;

    if (average >= 85)
      return "Excellent overall performance. Attendance, academic performance and assignment completion are well maintained.";

    if (average >= 70)
      return "Good overall progress. The student is performing consistently, with some scope for improvement.";

    if (average >= 50)
      return "Average performance. More focus is recommended on attendance, test preparation and regular assignment completion.";

    return "Performance needs attention. Regular attendance, academic practice and assignment completion should be improved.";
  };

  /* =========================================================
     FETCH STUDENTS
  ========================================================= */

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.get(
        "/api/students/students-basic-info"
      );

      const raw = res.data.students || res.data || [];

      const array = Array.isArray(raw)
        ? raw
        : Object.values(raw);

      setStudents(
        array.map((s, index) => ({
          ...s,
          id: s.id || s._id || index + 1,
          class:
            s.class ||
            s.class_name ||
            s.grade ||
            s.standard ||
            "N/A",
          photo:
            s.photo ||
            s.profile_pic ||
            s.image ||
            "",
        }))
      );
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

  /* =========================================================
     FILTERS
  ========================================================= */

  const classes = useMemo(
    () =>
      [...new Set(
        students.map(
          (s) => s.class || s.class_name
        )
      )].sort(),
    [students]
  );

  const filteredStudents = useMemo(
    () =>
      students.filter(
        (s) =>
          (s.class || s.class_name) ===
          selectedClass
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

  /* =========================================================
     GET MONTH LIST
  ========================================================= */

  const getSelectedMonths = () => {
    if (reportMode === "single") {
      return [singleMonth];
    }

    const months = [];

    let current = getMonthNumber(fromMonth);
    const end = getMonthNumber(toMonth);

    while (current <= end) {
      const year = Math.floor(
        (current - 1) / 12
      );

      const month =
        ((current - 1) % 12) + 1;

      months.push(
        `${year}-${String(month).padStart(
          2,
          "0"
        )}`
      );

      current++;
    }

    return months;
  };

  /* =========================================================
     FETCH REPORT
  ========================================================= */

  const handleFetchReport = async (e) => {
    e.preventDefault();

    setError(null);

    if (!selectedStudentId) {
      setError("Please select a student first.");
      return;
    }

    let monthParam = "";

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

      monthParam = getSelectedMonths().join(",");
    }

    setReportLoading(true);

    try {
      const res = await api.get(
        `/api/exams-details/student/${selectedStudentId}/monthly-report/?month=${encodeURIComponent(
          monthParam
        )}`
      );

      setReportData(res.data);
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

  /* =========================================================
     PHOTO
  ========================================================= */

  const getBase64ImageFromUrl = async (
    imageUrl
  ) => {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();

      return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onloadend = () =>
          resolve(reader.result);

        reader.onerror = () =>
          resolve(null);

        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  /* =========================================================
     MONTH ANALYSIS
  ========================================================= */

  const getMonthAnalysis = (monthData) => {
    const attendance =
      monthData?.attendance?.summary || {};

    const marks =
      monthData?.marks?.records || [];

    const assignments =
      monthData?.assignments?.summary || {};

    const totalObtained = marks.reduce(
      (sum, m) =>
        sum + Number(m.obtained_marks || 0),
      0
    );

    const totalMarks = marks.reduce(
      (sum, m) =>
        sum + Number(m.total_marks || 0),
      0
    );

    const marksPercentage =
      totalMarks > 0
        ? (totalObtained / totalMarks) * 100
        : 0;

    const assignmentPercentage =
      assignments.assigned > 0
        ? (assignments.submitted /
            assignments.assigned) *
          100
        : 0;

    const att = Number(
      attendance.percentage || 0
    );

    return {
      attendance: Number(att.toFixed(2)),
      marks: Number(
        marksPercentage.toFixed(2)
      ),
      assignments: Number(
        assignmentPercentage.toFixed(2)
      ),
      average: Number(
        (
          (att +
            marksPercentage +
            assignmentPercentage) /
          3
        ).toFixed(2)
      ),
    };
  };

  /* =========================================================
     PDF HEADER
  ========================================================= */

  const drawPDFHeader = (
    doc,
    student,
    periodText
  ) => {
    doc.setFillColor(26, 35, 126);
    doc.rect(
      0,
      0,
      210,
      38,
      "F"
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(15);
    doc.setTextColor(
      255,
      255,
      255
    );

    doc.text(
      "EduFlow - SMART STUDENTS",
      14,
      14
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(9);

    doc.text(
      "Comprehensive Academic & Activity Progress Report",
      14,
      21
    );

    doc.text(
      `Report Period: ${periodText}`,
      14,
      29
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(9);
    doc.setTextColor(
      50,
      50,
      50
    );

    doc.text(
      `Student Name: ${(
        student.name || ""
      ).toUpperCase()}`,
      14,
      48
    );

    doc.text(
      `Class: ${student.class || "N/A"}`,
      120,
      48
    );

    doc.text(
      `Batch: ${student.batch || "N/A"}`,
      14,
      55
    );

    doc.text(
      `Session: ${student.session || "N/A"}`,
      120,
      55
    );

    doc.text(
      `Email: ${student.email || "N/A"}`,
      14,
      62
    );
  };

  /* =========================================================
     PDF FOOTER
  ========================================================= */

  const drawPDFFooter = (doc) => {
    const pageCount =
      doc.getNumberOfPages();

    for (
      let i = 1;
      i <= pageCount;
      i++
    ) {
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
        "EduFlow Smart Students - Administration",
        14,
        287
      );

      doc.text(
        `Page ${i} of ${pageCount}`,
        170,
        287
      );
    }
  };

  /* =========================================================
     ADD MONTH TO PDF
  ========================================================= */

  const addMonthToPDF = (
    doc,
    monthData,
    index
  ) => {
    const monthName = formatMonth(
      monthData.month
    );

    const attendance =
      monthData.attendance?.summary || {};

    const marks =
      monthData.marks?.records || [];

    const assignments =
      monthData.assignments?.records || [];

    const assignmentSummary =
      monthData.assignments?.summary || {};

    const analysis =
      getMonthAnalysis(monthData);

    doc.addPage();

    const student =
      reportData.student || {};

    drawPDFHeader(
      doc,
      student,
      monthName
    );

    let y = 72;

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
      `${index + 1}. ${monthName} Monthly Report`,
      14,
      y
    );

    y += 9;

    /* ANALYSIS */

    doc.setFontSize(11);

    doc.text(
      `${monthName} Performance Analysis`,
      14,
      y
    );

    y += 4;

    autoTable(doc, {
      startY: y,
      head: [[
        "Attendance",
        "Test Score",
        "Assignments",
        "Overall Index",
      ]],
      body: [[
        `${analysis.attendance}%`,
        `${analysis.marks}%`,
        `${analysis.assignments}%`,
        `${analysis.average}%`,
      ]],
      theme: "grid",
      headStyles: {
        fillColor: [26, 35, 126],
        textColor: [255, 255, 255],
        fontSize: 8,
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
      doc.lastAutoTable.finalY + 10;

    /* ATTENDANCE */

    doc.setFontSize(11);

    doc.text(
      `${monthName} Attendance`,
      14,
      y
    );

    y += 4;

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
        fontSize: 8,
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
      doc.lastAutoTable.finalY + 7;

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(9);

    doc.text(
      `In ${monthName}, the student was present on ${
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

    y += 12;

    /* MARKS */

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(11);
    doc.setTextColor(
      26,
      35,
      126
    );

    doc.text(
      `${monthName} Test Performance`,
      14,
      y
    );

    y += 4;

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
          `No tests recorded for ${monthName}`,
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
      doc.lastAutoTable.finalY + 7;

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(9);

    doc.text(
      marks.length
        ? `${marks.length} test(s) were conducted during ${monthName}. The combined test score was ${analysis.marks}%.`
        : `No tests were recorded during ${monthName}.`,
      14,
      y,
      {
        maxWidth: 180,
      }
    );

    y += 12;

    /* ASSIGNMENTS */

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(11);
    doc.setTextColor(
      26,
      35,
      126
    );

    doc.text(
      `${monthName} Assignments`,
      14,
      y
    );

    y += 4;

    autoTable(doc, {
      startY: y,
      head: [[
        "Assigned",
        "Submitted",
        "Pending",
        "Completion %",
      ]],
      body: [[
        assignmentSummary.assigned || 0,
        assignmentSummary.submitted || 0,
        assignmentSummary.pending || 0,
        `${analysis.assignments}%`,
      ]],
      theme: "grid",
      headStyles: {
        fillColor: [26, 35, 126],
        textColor: [255, 255, 255],
        fontSize: 8,
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
      doc.lastAutoTable.finalY + 7;

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
            `No assignments recorded for ${monthName}`,
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
      margin: {
        left: 14,
        right: 14,
      },
      styles: {
        overflow: "linebreak",
      },
    });

    y =
      doc.lastAutoTable.finalY + 10;

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
      `${monthName} Overall Remark`,
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

  /* =========================================================
     GENERATE COMPLETE PDF
  ========================================================= */

  const generatePDF = async () => {
    if (!reportData) return null;

    const doc = new jsPDF(
      "p",
      "mm",
      "a4"
    );

    const student =
      reportData.student || {};

    const overall =
      reportData.overall || {};

    const attendance =
      overall.attendance?.summary || {};

    const marks =
      overall.marks?.records || [];

    /* =====================================================
       COVER / OVERALL PAGE
    ===================================================== */

    drawPDFHeader(
      doc,
      student,
      reportData.period
        ? `${reportData.period.from || ""} to ${
            reportData.period.to || ""
          }`
        : "Selected Months"
    );

    /* PHOTO */

    if (activeStudent?.photo) {
      const photo =
        await getBase64ImageFromUrl(
          activeStudent.photo
        );

      if (photo) {
        try {
          doc.addImage(
            photo,
            "JPEG",
            165,
            7,
            30,
            30
          );

          doc.setDrawColor(
            255,
            255,
            255
          );

          doc.rect(
            165,
            7,
            30,
            30
          );
        } catch {}
      }
    }

    let y = 74;

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
      "Overall Performance Summary",
      14,
      y
    );

    y += 5;

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
        attendance.workingDays || 0,
        attendance.present || 0,
        attendance.absent || 0,
        attendance.holiday || 0,
        `${attendance.percentage || 0}%`,
      ]],
      theme: "grid",
      headStyles: {
        fillColor: [26, 35, 126],
        textColor: [255, 255, 255],
        fontSize: 8,
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
      doc.lastAutoTable.finalY + 12;

    /* MONTH LIST */

    doc.setFontSize(11);

    doc.text(
      "Included Months",
      14,
      y
    );

    y += 4;

    const monthRows =
      (reportData.monthly || []).map(
        (m, i) => {
          const analysis =
            getMonthAnalysis(m);

          return [
            i + 1,
            formatMonth(m.month),
            `${analysis.attendance}%`,
            `${analysis.marks}%`,
            `${analysis.assignments}%`,
            `${analysis.average}%`,
          ];
        }
      );

    autoTable(doc, {
      startY: y,
      head: [[
        "S.No",
        "Month",
        "Attendance",
        "Test Score",
        "Assignments",
        "Overall",
      ]],
      body:
        monthRows.length
          ? monthRows
          : [[
              "-",
              "No monthly data",
              "-",
              "-",
              "-",
              "-",
            ]],
      theme: "grid",
      headStyles: {
        fillColor: [26, 35, 126],
        textColor: [255, 255, 255],
        fontSize: 8,
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
      doc.lastAutoTable.finalY + 12;

    /* OVERALL MARKS */

    doc.setFontSize(11);

    doc.text(
      "Overall Test Records",
      14,
      y
    );

    y += 4;

    const overallMarkRows =
      marks.length
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

    /* =====================================================
       EVERY SELECTED MONTH
    ===================================================== */

    const monthly =
      reportData.monthly || [];

    monthly.forEach(
      (monthData, index) => {
        addMonthToPDF(
          doc,
          monthData,
          index
        );
      }
    );

    /* FOOTER */

    drawPDFFooter(doc);

    return doc;
  };

  /* =========================================================
     DOWNLOAD PDF
  ========================================================= */

  const downloadPDF = async () => {
    if (!reportData) return;

    try {
      setPdfLoading(true);

      const doc =
        await generatePDF();

      const student =
        reportData.student || {};

      doc.save(
        `EduFlow_Report_${(
          student.name || "Student"
        ).replace(/\s+/g, "_")}.pdf`
      );
    } catch (err) {
      console.error(err);

      alert(
        "Failed to export PDF: " +
          err.message
      );
    } finally {
      setPdfLoading(false);
    }
  };

  /* =========================================================
     WHATSAPP TEXT
  ========================================================= */

  const createWhatsAppText = () => {
    if (!reportData) return "";

    const student =
      reportData.student || {};

    let text =
      `*EduFlow - SMART STUDENTS*\n` +
      `*Comprehensive Academic & Activity Progress Report*\n\n`;

    text +=
      `*Student:* ${student.name || "N/A"}\n`;
    text +=
      `*Class:* ${student.class || "N/A"}\n`;
    text +=
      `*Batch:* ${student.batch || "N/A"}\n`;
    text +=
      `*Session:* ${student.session || "N/A"}\n`;
    text +=
      `*Period:* ${
        reportData.period?.from || ""
      } to ${
        reportData.period?.to || ""
      }\n\n`;

    const overall =
      reportData.overall?.attendance
        ?.summary || {};

    text += `*OVERALL ATTENDANCE*\n`;
    text += `Working Days: ${
      overall.workingDays || 0
    }\n`;
    text += `Present: ${
      overall.present || 0
    }\n`;
    text += `Absent: ${
      overall.absent || 0
    }\n`;
    text += `Holiday: ${
      overall.holiday || 0
    }\n`;
    text += `Attendance: ${
      overall.percentage || 0
    }%\n\n`;

    (reportData.monthly || []).forEach(
      (m, index) => {
        const monthName =
          formatMonth(m.month);

        const att =
          m.attendance?.summary || {};

        const marks =
          m.marks?.records || [];

        const assignments =
          m.assignments?.records || [];

        const assignmentSummary =
          m.assignments?.summary || {};

        const analysis =
          getMonthAnalysis(m);

        text +=
          `━━━━━━━━━━━━━━\n`;
        text +=
          `*${index + 1}. ${monthName}*\n`;
        text +=
          `━━━━━━━━━━━━━━\n`;

        text += `Attendance: ${
          analysis.attendance
        }%\n`;
        text += `Test Score: ${
          analysis.marks
        }%\n`;
        text += `Assignment Completion: ${
          analysis.assignments
        }%\n`;
        text += `Overall Index: ${
          analysis.average
        }%\n\n`;

        text += `*Attendance*\n`;
        text += `Present: ${
          att.present || 0
        } | Absent: ${
          att.absent || 0
        } | Holiday: ${
          att.holiday || 0
        }\n`;
        text += `Working Days: ${
          att.workingDays || 0
        }\n\n`;

        text += `*Tests*\n`;

        if (marks.length) {
          marks.forEach((m) => {
            text +=
              `${m.subject || "N/A"}: ${
                m.obtained_marks ?? "-"
              }/${m.total_marks ?? "-"} | ${
                m.status || "-"
              } | ${formatDate(
                m.test_date
              )}\n`;
          });
        } else {
          text += "No tests recorded.\n";
        }

        text += `\n*Assignments*\n`;

        text += `Assigned: ${
          assignmentSummary.assigned || 0
        } | Submitted: ${
          assignmentSummary.submitted || 0
        } | Pending: ${
          assignmentSummary.pending || 0
        }\n`;

        if (assignments.length) {
          assignments.forEach((a) => {
            text +=
              `${a.subject || "N/A"} - ${
                a.task_title || "N/A"
              } | ${
                a.status || "-"
              } | ${
                a.rating
                  ? `${a.rating}/5`
                  : "Not Done"
              }\n`;
          });
        } else {
          text +=
            "No assignments recorded.\n";
        }

        text += `\n*Remark:*\n`;
        text +=
          getRemark(
            analysis.attendance,
            analysis.marks,
            analysis.assignments
          ) + "\n\n";
      }
    );

    text +=
      `\n*EduFlow Smart Students - Administration*`;

    return text;
  };

  /* =========================================================
     WHATSAPP TEXT SEND
  ========================================================= */

  const sendWhatsAppText = () => {
    if (!reportData) return;

    let number =
      whatsappNumber.replace(
        /\D/g,
        ""
      );

    if (!number) {
      alert(
        "Please enter WhatsApp number."
      );
      return;
    }

    /* India number */

    if (
      number.length === 10 &&
      !number.startsWith("91")
    ) {
      number = "91" + number;
    }

    const text =
      createWhatsAppText();

    const url =
      `https://wa.me/${number}?text=${encodeURIComponent(
        text
      )}`;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  };

  /* =========================================================
     SHARE PDF
  ========================================================= */

  const sharePDF = async () => {
    if (!reportData) return;

    try {
      setPdfLoading(true);

      const doc =
        await generatePDF();

      const blob =
        doc.output("blob");

      const student =
        reportData.student || {};

      const fileName =
        `EduFlow_Report_${(
          student.name ||
          "Student"
        ).replace(/\s+/g, "_")}.pdf`;

      const file =
        new File(
          [blob],
          fileName,
          {
            type: "application/pdf",
          }
        );

      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({
          files: [file],
        })
      ) {
        await navigator.share({
          title:
            "EduFlow Student Report",
          text:
            `Student Monthly Report - ${
              student.name || ""
            }`,
          files: [file],
        });
      } else {
        alert(
          "PDF sharing is not supported on this device/browser. Please download the PDF and share it on WhatsApp."
        );
      }
    } catch (err) {
      if (
        err?.name !==
        "AbortError"
      ) {
        console.error(err);
        alert(
          "Unable to share PDF."
        );
      }
    } finally {
      setPdfLoading(false);
    }
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <>
      <style>{`
        *{box-sizing:border-box}

        .report-container{
          background:#f3f4f6;
          min-height:100vh;
          padding:20px;
          font-family:Inter,Arial,sans-serif
        }

        .report-wrapper{
          width:100%;
          max-width:1400px;
          margin:auto;
          display:flex;
          flex-direction:column;
          gap:20px
        }

        .report-card{
          background:white;
          padding:24px;
          border-radius:14px;
          box-shadow:0 4px 18px rgba(0,0,0,.06)
        }

        .top-header{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:15px;
          flex-wrap:wrap
        }

        .form-grid,
        .month-grid{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:15px
        }

        .stats-grid{
          display:grid;
          grid-template-columns:repeat(5,1fr);
          gap:12px
        }

        .analysis-grid{
          display:grid;
          grid-template-columns:repeat(4,1fr);
          gap:12px
        }

        .profile-grid{
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:12px
        }

        .action-btn{
          width:30%;
          min-width:180px;
          padding:12px 16px;
          border:0;
          border-radius:8px;
          font-weight:700;
          cursor:pointer;
          font-size:13px
        }

        .toggle-container{
          display:flex;
          gap:10px
        }

        .toggle-btn{
          width:30%;
          min-width:130px;
          padding:10px;
          border:0;
          border-radius:7px;
          cursor:pointer;
          font-weight:700;
          font-size:12px
        }

        .table-scroll{
          overflow-x:auto;
          width:100%
        }

        .report-table{
          width:100%;
          border-collapse:collapse;
          min-width:650px;
          font-size:13px
        }

        .report-table th{
          padding:11px;
          background:#1a237e;
          color:white;
          text-align:left;
          white-space:nowrap
        }

        .report-table td{
          padding:10px;
          border-bottom:1px solid #eee;
          white-space:nowrap
        }

        .month-title{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
          flex-wrap:wrap
        }

        .month-badge{
          background:#e0e7ff;
          color:#1e3a8a;
          padding:6px 12px;
          border-radius:20px;
          font-size:12px;
          font-weight:700
        }

        .analysis-box{
          padding:14px;
          border-radius:10px;
          border:1px solid #e2e8f0;
          background:#f8fafc
        }

        .analysis-value{
          font-size:21px;
          font-weight:800;
          color:#1e293b
        }

        .analysis-label{
          font-size:11px;
          color:#64748b;
          margin-top:4px;
          font-weight:600
        }

        .whatsapp-box{
          display:flex;
          gap:10px;
          margin-top:15px;
          flex-wrap:wrap
        }

        .whatsapp-input{
          flex:1;
          min-width:220px;
          padding:11px 12px;
          border:1px solid #cbd5e1;
          border-radius:8px;
          font-size:14px
        }

        @media(max-width:900px){
          .stats-grid{
            grid-template-columns:repeat(3,1fr)
          }

          .analysis-grid{
            grid-template-columns:repeat(2,1fr)
          }

          .profile-grid{
            grid-template-columns:repeat(2,1fr)
          }
        }

        @media(max-width:650px){
          .report-container{
            padding:10px
          }

          .report-card{
            padding:15px;
            border-radius:10px
          }

          .form-grid,
          .month-grid,
          .profile-grid{
            grid-template-columns:1fr
          }

          .stats-grid{
            grid-template-columns:repeat(2,1fr)
          }

          .analysis-grid{
            grid-template-columns:1fr 1fr
          }

          .action-btn{
            width:30%;
            min-width:140px;
            font-size:11px;
            padding:10px 8px
          }

          .toggle-container{
            flex-wrap:wrap
          }

          .toggle-btn{
            width:30%;
            min-width:120px;
            font-size:11px
          }

          .whatsapp-box{
            flex-direction:column
          }

          .whatsapp-input{
            width:100%
          }
        }

        @media(max-width:400px){
          .action-btn,
          .toggle-btn{
            width:100%;
            min-width:0
          }
        }
      `}</style>

      <div className="report-container">
        <div className="report-wrapper">

          {/* =================================================
              MAIN FORM
          ================================================= */}

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
              </div>

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
                    onClick={downloadPDF}
                    className="action-btn"
                    disabled={pdfLoading}
                    style={{
                      background:"#15803d",
                      color:"white",
                      opacity:pdfLoading
                        ? .6
                        : 1,
                    }}
                  >
                    {pdfLoading
                      ? "Preparing..."
                      : "📥 Download PDF"}
                  </button>

                  <button
                    onClick={sharePDF}
                    className="action-btn"
                    disabled={pdfLoading}
                    style={{
                      background:"#2563eb",
                      color:"white",
                    }}
                  >
                    📤 Share PDF
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
                    }}
                    style={inputStyle}
                  >
                    <option value="">
                      -- Choose Class --
                    </option>

                    {classes.map(
                      (c, i) => (
                        <option
                          key={i}
                          value={c}
                        >
                          Class {c}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>
                    Report Duration
                  </label>

                  <div className="toggle-container">

                    <button
                      type="button"
                      className="toggle-btn"
                      onClick={() =>
                        setReportMode(
                          "single"
                        )
                      }
                      style={{
                        background:
                          reportMode ===
                          "single"
                            ? "#1a237e"
                            : "#e2e8f0",
                        color:
                          reportMode ===
                          "single"
                            ? "white"
                            : "#333",
                      }}
                    >
                      Single Month
                    </button>

                    <button
                      type="button"
                      className="toggle-btn"
                      onClick={() =>
                        setReportMode(
                          "range"
                        )
                      }
                      style={{
                        background:
                          reportMode ===
                          "range"
                            ? "#1a237e"
                            : "#e2e8f0",
                        color:
                          reportMode ===
                          "range"
                            ? "white"
                            : "#333",
                      }}
                    >
                      Multiple Months
                    </button>

                  </div>
                </div>

              </div>

              {reportMode ===
              "single" ? (

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

              <div>
                <label style={labelStyle}>
                  Student Profile
                </label>

                <select
                  value={
                    selectedStudentId
                  }
                  onChange={(e) =>
                    setSelectedStudentId(
                      e.target.value
                    )
                  }
                  style={inputStyle}
                  disabled={
                    !selectedClass
                  }
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
                        {s.roll_no
                          ? ` (Roll: ${s.roll_no})`
                          : ""}
                      </option>
                    )
                  )}
                </select>
              </div>

              {activeStudent && (
                <div
                  className="student-preview"
                  style={{
                    display:"flex",
                    alignItems:"center",
                    gap:14,
                    background:"#f8fafc",
                    padding:12,
                    borderRadius:10,
                    border:"1px solid #cbd5e1",
                  }}
                >

                  <div
                    style={{
                      width:50,
                      height:50,
                      borderRadius:10,
                      overflow:"hidden",
                      background:"#94a3b8",
                      display:"flex",
                      alignItems:"center",
                      justifyContent:"center",
                      flexShrink:0,
                    }}
                  >
                    {activeStudent.photo ? (
                      <img
                        src={
                          activeStudent.photo
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
                          color:"white",
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

                  <div
                    style={{
                      overflow:"hidden",
                    }}
                  >
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
                        marginTop:3,
                      }}
                    >
                      Class:{" "}
                      {activeStudent.class} |
                      Email:{" "}
                      {activeStudent.email ||
                        "N/A"}
                    </div>
                  </div>

                </div>
              )}

              <button
                type="submit"
                disabled={
                  reportLoading ||
                  loading
                }
                className="action-btn"
                style={{
                  background:"#1a237e",
                  color:"white",
                  opacity:
                    reportLoading ||
                    loading
                      ? .6
                      : 1,
                }}
              >
                {reportLoading
                  ? "Generating..."
                  : "Generate Report 🔍"}
              </button>

            </form>

            {/* =================================================
                WHATSAPP
            ================================================= */}

            {reportData && (
              <div
                style={{
                  marginTop:20,
                  padding:15,
                  background:"#f0fdf4",
                  border:"1px solid #bbf7d0",
                  borderRadius:10,
                }}
              >

                <div
                  style={{
                    fontWeight:700,
                    color:"#166534",
                    marginBottom:5,
                  }}
                >
                  📱 Send Report on WhatsApp
                </div>

                <div
                  style={{
                    fontSize:12,
                    color:"#64748b",
                    marginBottom:10,
                  }}
                >
                  Enter WhatsApp number. The
                  complete selected-month report
                  will be prepared as a WhatsApp
                  message.
                </div>

                <div className="whatsapp-box">

                  <input
                    className="whatsapp-input"
                    type="tel"
                    placeholder="Enter WhatsApp Number"
                    value={
                      whatsappNumber
                    }
                    onChange={(e) =>
                      setWhatsappNumber(
                        e.target.value
                      )
                    }
                  />

                  <button
                    type="button"
                    onClick={
                      sendWhatsAppText
                    }
                    className="action-btn"
                    style={{
                      background:"#16a34a",
                      color:"white",
                      width:"auto",
                      minWidth:180,
                    }}
                  >
                    💬 Send WhatsApp
                  </button>

                </div>

              </div>
            )}

          </div>

          {/* =================================================
              REPORT
          ================================================= */}

          {reportData && (
            <>

              {/* PROFILE */}

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
                    <strong>Session:</strong>{" "}
                    {reportData.student?.session}
                  </div>

                  <div>
                    <strong>From:</strong>{" "}
                    {reportData.period?.from}
                  </div>

                  <div>
                    <strong>To:</strong>{" "}
                    {reportData.period?.to}
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
                          ?.percentage ||
                        0
                      }%`,
                      "Attendance",
                    ],
                  ].map(
                    ([value, label], i) => (
                      <div
                        key={i}
                        style={{
                          padding:14,
                          borderRadius:9,
                          background:"#f8fafc",
                          textAlign:"center",
                          border:
                            "1px solid #e2e8f0",
                        }}
                      >
                        <div
                          style={{
                            fontSize:20,
                            fontWeight:800,
                            color:"#1e293b",
                          }}
                        >
                          {value || 0}
                        </div>

                        <div
                          style={{
                            fontSize:10,
                            color:"#64748b",
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

              {/* MONTH BY MONTH */}

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
                      key={monthData.month}
                    >

                      <div className="month-title">

                        <div>
                          <h3
                            style={{
                              margin:
                                "0 0 5px",
                              color:"#1a237e",
                            }}
                          >
                            📅 {monthName}
                          </h3>

                          <div
                            style={{
                              fontSize:12,
                              color:"#64748b",
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
                          margin:"15px 0",
                        }}
                      />

                      <h4
                        style={{
                          color:"#334155",
                          margin:
                            "0 0 12px",
                        }}
                      >
                        🔎 {monthName} Performance
                        Analysis
                      </h4>

                      <div className="analysis-grid">

                        {[
                          [
                            analysis.attendance,
                            "Attendance",
                          ],
                          [
                            analysis.marks,
                            "Test Score",
                          ],
                          [
                            analysis.assignments,
                            "Assignment Completion",
                          ],
                          [
                            analysis.average,
                            "Overall Index",
                          ],
                        ].map(
                          ([v, l]) => (
                            <div
                              className="analysis-box"
                              key={l}
                            >
                              <div className="analysis-value">
                                {v}%
                              </div>

                              <div className="analysis-label">
                                {l}
                              </div>
                            </div>
                          )
                        )}

                      </div>

                      <h4
                        style={{
                          color:"#1a237e",
                          margin:
                            "22px 0 10px",
                        }}
                      >
                        📅 {monthName} Attendance
                      </h4>

                      <div className="stats-grid">

                        <div style={monthStat}>
                          <b>
                            {att.present || 0}
                          </b>
                          <small>
                            Present (P)
                          </small>
                        </div>

                        <div style={monthStat}>
                          <b>
                            {att.absent || 0}
                          </b>
                          <small>
                            Absent (A)
                          </small>
                        </div>

                        <div style={monthStat}>
                          <b>
                            {att.holiday || 0}
                          </b>
                          <small>
                            Holiday (H)
                          </small>
                        </div>

                        <div style={monthStat}>
                          <b>
                            {att.workingDays ||
                              0}
                          </b>
                          <small>
                            Working Days
                          </small>
                        </div>

                        <div
                          style={{
                            ...monthStat,
                            background:
                              "#e0e7ff",
                          }}
                        >
                          <b>
                            {att.percentage ||
                              0}
                            %
                          </b>
                          <small>
                            Attendance %
                          </small>
                        </div>

                      </div>

                      <div
                        style={{
                          background:"#f8fafc",
                          borderLeft:
                            "4px solid #1a237e",
                          padding:12,
                          borderRadius:7,
                          marginTop:12,
                          fontSize:13,
                          color:"#334155",
                        }}
                      >
                        <strong>
                          Attendance Analysis:
                        </strong>{" "}
                        In {monthName}, the
                        student was present on{" "}
                        <strong>
                          {att.present || 0}
                        </strong>{" "}
                        working days and absent
                        on{" "}
                        <strong>
                          {att.absent || 0}
                        </strong>{" "}
                        days. Attendance was{" "}
                        <strong>
                          {att.percentage || 0}%
                        </strong>.
                      </div>

                      <h4
                        style={{
                          color:"#1a237e",
                          margin:
                            "22px 0 10px",
                        }}
                      >
                        📝 {monthName} Test
                        Performance
                      </h4>

                      <div className="table-scroll">

                        <table className="report-table">

                          <thead>
                            <tr>
                              <th>Subject</th>
                              <th>Total</th>
                              <th>Obtained</th>
                              <th>Date</th>
                              <th>Status</th>
                            </tr>
                          </thead>

                          <tbody>

                            {marks.length ? (
                              marks.map(
                                (m) => (
                                  <tr
                                    key={m.id}
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
                                      {m.status}
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
                                  No tests recorded
                                  for {monthName}.
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
                          background:"#f8fafc",
                          borderRadius:7,
                          fontSize:13,
                        }}
                      >
                        <strong>
                          Academic Analysis:
                        </strong>{" "}
                        {marks.length
                          ? `${marks.length} test(s) were conducted during ${monthName}. The combined test score was ${analysis.marks}%.`
                          : `No tests were recorded during ${monthName}.`}
                      </div>

                      <h4
                        style={{
                          color:"#1a237e",
                          margin:
                            "22px 0 10px",
                        }}
                      >
                        📚 {monthName} Assignments
                      </h4>

                      <div className="stats-grid">

                        <div style={monthStat}>
                          <b>
                            {
                              assignmentSummary.assigned ||
                              0
                            }
                          </b>
                          <small>
                            Assigned
                          </small>
                        </div>

                        <div style={monthStat}>
                          <b>
                            {
                              assignmentSummary.submitted ||
                              0
                            }
                          </b>
                          <small>
                            Submitted
                          </small>
                        </div>

                        <div style={monthStat}>
                          <b>
                            {
                              assignmentSummary.pending ||
                              0
                            }
                          </b>
                          <small>
                            Pending
                          </small>
                        </div>

                        <div
                          style={{
                            ...monthStat,
                            background:
                              "#e0e7ff",
                          }}
                        >
                          <b>
                            {
                              analysis.assignments
                            }%
                          </b>
                          <small>
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
                              <th>Subject</th>
                              <th>Task</th>
                              <th>Deadline</th>
                              <th>Rating</th>
                              <th>Status</th>
                            </tr>
                          </thead>

                          <tbody>

                            {(
                              monthData
                                .assignments
                                ?.records || []
                            ).length ? (

                              monthData.assignments.records.map(
                                (a) => {
                                  const pending =
                                    a.status?.toUpperCase() ===
                                    "PENDING";

                                  return (
                                    <tr
                                      key={
                                        a.assignment_id
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
                                        {pending
                                          ? "Not Done"
                                          : `⭐ ${
                                              a.rating ||
                                              0
                                            }/5`}
                                      </td>

                                      <td>
                                        {a.status}
                                      </td>
                                    </tr>
                                  );
                                }
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
                                  No assignments
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
                          marginTop:18,
                          padding:14,
                          background:"#f8fafc",
                          borderRadius:9,
                          borderLeft:
                            "4px solid #1a237e",
                        }}
                      >
                        <div
                          style={{
                            fontWeight:700,
                            color:"#1a237e",
                            marginBottom:5,
                          }}
                        >
                          💡 {monthName} Overall
                          Remark
                        </div>

                        <div
                          style={{
                            fontSize:13,
                            color:"#334155",
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

              {/* OVERALL MARKS */}

              <div className="report-card">

                <h3
                  style={{
                    color:"#1a237e",
                    marginTop:0,
                  }}
                >
                  📝 Overall Test Records
                </h3>

                <div className="table-scroll">

                  <table className="report-table">

                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Total Marks</th>
                        <th>Obtained</th>
                        <th>Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>

                      {(
                        reportData.overall
                          ?.marks?.records || []
                      ).map((m) => (
                        <tr key={m.id}>

                          <td>
                            <strong>
                              {m.subject}
                            </strong>
                          </td>

                          <td>
                            {m.total_marks}
                          </td>

                          <td>
                            {m.obtained_marks}
                          </td>

                          <td>
                            {formatDate(
                              m.test_date
                            )}
                          </td>

                          <td>
                            {m.status}
                          </td>

                        </tr>
                      ))}

                    </tbody>
                  </table>

                </div>

              </div>

            </>
          )}

        </div>
      </div>
    </>
  );
};

/* =========================================================
   STYLES
========================================================= */

const inputStyle = {
  padding:"11px 12px",
  borderRadius:8,
  border:"1px solid #cbd5e1",
  fontSize:14,
  width:"100%",
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

const monthStat = {
  padding:13,
  borderRadius:8,
  background:"#f8fafc",
  border:"1px solid #e2e8f0",
  textAlign:"center",
};

monthStat.b = {
  fontSize:19,
  display:"block",
};

monthStat.small = {
  fontSize:10,
  color:"#64748b",
};

export default AdminReport;