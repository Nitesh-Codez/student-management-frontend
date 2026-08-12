import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";

const AdminFees = () => {
  const [selectedSession, setSelectedSession] = useState(() => {
    return localStorage.getItem("selectedSession") || "";
  });

  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [loadingMonth, setLoadingMonth] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [downloading, setDownloading] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const navigate = useNavigate();

  const API_BASE_URL =
    "https://student-management-system-4-hose.onrender.com";

  /* ================= MONTHS ================= */

  const months = [
    { name: "January", color: "#FF5722", label: "Jan" },
    { name: "February", color: "#E91E63", label: "Feb" },
    { name: "March", color: "#9C27B0", label: "Mar" },
    { name: "April", color: "#673AB7", label: "Apr" },
    { name: "May", color: "#3F51B5", label: "May" },
    { name: "June", color: "#2196F3", label: "Jun" },
    { name: "July", color: "#03A9F4", label: "Jul" },
    { name: "August", color: "#00BCD4", label: "Aug" },
    { name: "September", color: "#009688", label: "Sep" },
    { name: "October", color: "#4CAF50", label: "Oct" },
    { name: "November", color: "#FFC107", label: "Nov" },
    { name: "December", color: "#FF9800", label: "Dec" },
  ];

  /* ================= RESPONSIVE ================= */

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  /* ================= SESSION CHANGE ================= */

  const handleSessionChange = (e) => {
    const value = e.target.value;

    setSelectedSession(value);
    localStorage.setItem("selectedSession", value);
  };

  /* ================= MONTH NAVIGATION ================= */

  const handleNavigation = (monthIndex) => {
    if (!selectedSession) {
      alert("⚠️ Please select an academic session first!");
      return;
    }

    setLoadingMonth(monthIndex);

    setTimeout(() => {
      navigate(`/admin/details/${selectedSession}/${monthIndex}`);
      setLoadingMonth(null);
    }, 400);
  };

  /* =========================================================
     FETCH SESSION FEE DATA
  ========================================================= */

  const fetchSessionFees = async () => {
    if (!selectedSession) {
      throw new Error("Please select an academic session.");
    }

    const endpoint =
      `${API_BASE_URL}/api/fees/admin/session-monthly` +
      `?session=${encodeURIComponent(selectedSession)}`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text();

      throw new Error(
        text || `Server returned status ${response.status}`
      );
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(
        data.message || "Failed to fetch session fee records."
      );
    }

    return data;
  };

  /* =========================================================
     FORMAT DATE
  ========================================================= */

  const formatDate = (date) => {
    if (!date) return "-";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return date;
    }

    return d.toLocaleDateString("en-IN");
  };

  /* =========================================================
     FULL SESSION PDF (GROUPED BY MONTH ON SEPARATE PAGES)
  ========================================================= */

  const handleDownloadFullSessionPDF = async () => {
    if (!selectedSession) {
      alert("⚠️ Please select an academic session first!");
      return;
    }

    try {
      setDownloading(true);

      const data = await fetchSessionFees();
      const monthsData = data.months || [];

      const doc = new jsPDF("landscape", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      let pageCount = 0;

      // Loop through each month and put each month on its own new page layout
      monthsData.forEach((monthGroup, mIndex) => {
        const monthName = monthGroup.month || "Unknown Month";
        const monthFees = monthGroup.fees || [];

        if (monthFees.length === 0) return; // Skip months with no records

        if (pageCount > 0) {
          doc.addPage();
        }
        pageCount++;

        let y = 14;

        /* ================= DECORATIVE TOP BAR ================= */
        doc.setFillColor(26, 35, 126); // Deep Navy Primary Header Accent
        doc.rect(0, 0, pageWidth, 6, "F");

        y += 8;

        /* ================= HEADER ================= */
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(26, 35, 126);
        doc.text("Smart Student's Classes Fee Management System", pageWidth / 2, y, {
          align: "center",
        });

        y += 7;

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(
          `Academic Session: ${selectedSession} | Monthly Ledger Report`,
          pageWidth / 2,
          y,
          { align: "center" }
        );

        y += 10;

        /* ================= MONTH BANNER ================= */
        doc.setFillColor(232, 234, 246);
        doc.roundedRect(12, y, pageWidth - 24, 10, 2, 2, "F");

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(26, 35, 126);
        doc.text(`MONTH: ${monthName.toUpperCase()}`, 18, y + 6.5);

        const monthTotal = monthFees.reduce(
          (sum, f) => sum + Number(f.amount || 0),
          0
        );
        doc.text(
          `Total Collection: Rs. ${monthTotal.toFixed(2)} (${monthFees.length} Records)`,
          pageWidth - 18,
          y + 6.5,
          { align: "right" }
        );

        y += 16;

        /* ================= TABLE CONFIG ================= */
        const columns = [
          "S.No",
          "Date",
          "Student Name",
          "Class",
          "Amount (Rs.)",
          "Payment Mode",
          "Status",
        ];

        // Professional column coordinate spacing for Landscape A4 (297mm width)
        const columnX = [14, 28, 65, 160, 195, 225, 262];

        // Draw Table Header Background
        doc.setFillColor(241, 245, 249);
        doc.rect(12, y - 4, pageWidth - 24, 8, "F");

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(51, 65, 85);

        columns.forEach((col, index) => {
          doc.text(col, columnX[index], y);
        });

        y += 6;
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.3);
        doc.line(12, y, pageWidth - 12, y);
        y += 6;

        /* ================= TABLE ROWS ================= */
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);

        monthFees.forEach((fee, index) => {
          // If content approaches page bottom, gracefully add overflow page for this month
          if (y > pageHeight - 24) {
            doc.addPage();
            y = 20;

            // Redraw table header on continuation page
            doc.setFillColor(241, 245, 249);
            doc.rect(12, y - 4, pageWidth - 24, 8, "F");
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(51, 65, 85);
            columns.forEach((col, iIdx) => {
              doc.text(col, columnX[iIdx], y);
            });
            y += 6;
            doc.line(12, y, pageWidth - 12, y);
            y += 6;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(30, 41, 59);
          }

          const rowData = [
            String(index + 1),
            formatDate(fee.payment_date),
            String(fee.student_name || "-"),
            String(fee.class_name || "-"),
            Number(fee.amount || 0).toFixed(2),
            String(fee.payment_mode || "-"),
            String(fee.status || "-"),
          ];

          // Zebra striping for table rows
          if (index % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(12, y - 4.5, pageWidth - 24, 6.5, "F");
          }

          rowData.forEach((val, cIndex) => {
            let displayVal = val;
            if (cIndex === 2 && displayVal.length > 42) {
              displayVal = `${displayVal.substring(0, 42)}...`;
            }
            doc.text(displayVal, columnX[cIndex], y);
          });

          y += 6.5;
        });

        /* ================= PAGE FOOTER & SIGNATURE ================= */
        doc.setDrawColor(226, 232, 240);
        doc.line(12, pageHeight - 18, pageWidth - 12, pageHeight - 18);

        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`SmartZone Fee System | Session: ${selectedSession}`, 12, pageHeight - 12);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(26, 35, 126);
        doc.text("Authorized Signature: Nitesh Kushwah", pageWidth - 12, pageHeight - 12, {
          align: "right",
        });
      });

      if (pageCount === 0) {
        alert("⚠️ No records available across months to generate PDF.");
        return;
      }

      doc.save(`SmartZone_Monthly_Ledger_${selectedSession}.pdf`);
    } catch (error) {
      console.error("PDF Download Error:", error);
      alert(`❌ Error downloading PDF:\n${error.message}`);
    } finally {
      setDownloading(false);
    }
  };

  /* =========================================================
     DATE RANGE PDF
  ========================================================= */

  const handleDownloadDateRangePDF = async () => {
    if (!selectedSession) {
      alert("⚠️ Please select an academic session first!");
      return;
    }

    if (!startDate || !endDate) {
      alert("⚠️ Please select both Start Date and End Date!");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      alert("⚠️ Start Date cannot be after End Date!");
      return;
    }

    try {
      setDownloading(true);

      const data = await fetchSessionFees();

      let allFees = [];

      (data.months || []).forEach((month) => {
        (month.fees || []).forEach((fee) => {
          allFees.push({
            ...fee,
            reportMonth: month.month,
          });
        });
      });

      /* ================= FILTER DATE ================= */

      allFees = allFees.filter((fee) => {
        if (!fee.payment_date) return false;

        const paymentDate = new Date(fee.payment_date)
          .toISOString()
          .split("T")[0];

        return paymentDate >= startDate && paymentDate <= endDate;
      });

      if (allFees.length === 0) {
        alert("⚠️ No fee records found between the selected dates.");
        return;
      }

      /* ================= PDF ================= */

      const doc = new jsPDF("landscape", "mm", "a4");

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      let y = 14;

      /* ================= DECORATIVE TOP BAR ================= */
      doc.setFillColor(14, 165, 233);
      doc.rect(0, 0, pageWidth, 6, "F");

      y += 8;

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);

      doc.text("SmartZone Financial Statement", pageWidth / 2, y, {
        align: "center",
      });

      y += 7;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);

      doc.text(
        `Session: ${selectedSession} | Period: ${startDate} to ${endDate}`,
        pageWidth / 2,
        y,
        { align: "center" }
      );

      y += 12;

      const totalAmount = allFees.reduce(
        (sum, fee) => sum + Number(fee.amount || 0),
        0
      );

      // Summary Banner Box
      doc.setFillColor(240, 249, 255);
      doc.roundedRect(12, y, pageWidth - 24, 10, 2, 2, "F");

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(3, 105, 161);
      doc.text(`Total Records: ${allFees.length}`, 18, y + 6.5);
      doc.text(
        `Total Collection: Rs. ${totalAmount.toFixed(2)}`,
        pageWidth - 18,
        y + 6.5,
        { align: "right" }
      );

      y += 16;

      /* ================= TABLE ================= */

      const columns = [
        "S.No",
        "Date",
        "Student Name",
        "Class",
        "Amount (Rs.)",
        "Mode",
        "Status",
        "Month",
      ];

      const columnX = [14, 28, 60, 140, 175, 205, 238, 265];

      const drawHeader = () => {
        doc.setFillColor(241, 245, 249);
        doc.rect(12, y - 4, pageWidth - 24, 8, "F");

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(51, 65, 85);

        columns.forEach((column, index) => {
          doc.text(column, columnX[index], y);
        });

        y += 5;
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.3);
        doc.line(12, y, pageWidth - 12, y);
        y += 6;
      };

      drawHeader();

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 41, 59);

      allFees.forEach((fee, index) => {
        if (y > pageHeight - 22) {
          doc.addPage();
          y = 18;
          drawHeader();
        }

        const row = [
          String(index + 1),
          formatDate(fee.payment_date),
          String(fee.student_name || "-"),
          String(fee.class_name || "-"),
          Number(fee.amount || 0).toFixed(2),
          String(fee.payment_mode || "-"),
          String(fee.status || "-"),
          String(fee.reportMonth || "-"),
        ];

        if (index % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(12, y - 4.5, pageWidth - 24, 6.5, "F");
        }

        row.forEach((value, colIndex) => {
          let text = value;

          if (colIndex === 2 && text.length > 35) {
            text = `${text.substring(0, 35)}...`;
          }

          doc.text(text, columnX[colIndex], y);
        });

        y += 6.5;
      });

      const totalPages = doc.internal.getNumberOfPages();

      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        doc.setDrawColor(226, 232, 240);
        doc.line(12, pageHeight - 18, pageWidth - 12, pageHeight - 18);

        // Authority Signature
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(14, 165, 233);
        doc.text(
          "Authorized Signature: Nitesh Kushwah",
          pageWidth - 12,
          pageHeight - 12,
          { align: "right" }
        );

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(`SmartZone Statement | Session: ${selectedSession}`, 12, pageHeight - 12);
      }

      doc.save(`SmartZone_Statement_${startDate}_to_${endDate}.pdf`);
    } catch (error) {
      console.error("Statement Download Error:", error);
      alert(`❌ Error downloading statement PDF:\n${error.message}`);
    } finally {
      setDownloading(false);
    }
  };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div style={styles.pageContainer}>
      <div
        style={{
          ...styles.contentWrapper,
          padding: isMobile ? "20px 15px" : "40px 24px",
        }}
      >
        {/* ================= HEADER ================= */}

        <header style={styles.headerStyle}>
          <div style={styles.badge}>
            Administrator Portal
          </div>

          <h1
            style={{
              ...styles.mainTitle,
              fontSize: isMobile
                ? "1.8rem"
                : "2.5rem",
            }}
          >
            🏫 SmartZone Fee Management
          </h1>

          <p style={styles.subTitle}>
            Manage student records and generate
            financial reports easily.
          </p>
        </header>

        {/* ================= SESSION ================= */}

        <section style={styles.selectionSection}>
          <div
            style={{
              ...styles.card,
              padding: isMobile
                ? "20px"
                : "30px",
            }}
          >
            <div style={styles.cardHeader}>
              <span style={styles.stepCircle}>
                1
              </span>

              <label style={styles.labelStyle}>
                Academic Session
              </label>
            </div>

            <select
              value={selectedSession}
              onChange={handleSessionChange}
              style={styles.selectStyle}
            >
              <option value="" disabled>
                -- First Select the Session --
              </option>

              <option value="2024-25">
                Academic Year 2024-2025
              </option>

              <option value="2025-26">
                Academic Year 2025-2026
              </option>

              <option value="2026-27">
                Academic Year 2026-2027
              </option>

              <option value="2027-28">
                Academic Year 2027-2028
              </option>
            </select>

            {selectedSession && (
              <p
                style={{
                  marginTop: "10px",
                  fontSize: "0.8rem",
                  color: "#4CAF50",
                  fontWeight: "600",
                }}
              >
                ✓ Active Session: {selectedSession}
              </p>
            )}
          </div>
        </section>

        {/* ================= REPORT PANEL ================= */}

        {selectedSession && (
          <section style={styles.reportSection}>
            <div style={styles.reportCard}>
              <h3 style={styles.reportTitle}>
                📥 Official Financial Reports & Statements
                {" "}
                ({selectedSession})
              </h3>

              <div style={styles.reportGrid}>

                {/* FULL SESSION */}

                <div style={styles.reportBox}>
                  <p style={styles.reportDesc}>
                    Download complete fee records organized cleanly with each month starting on a new page.
                  </p>

                  <button
                    onClick={
                      handleDownloadFullSessionPDF
                    }
                    disabled={downloading}
                    style={{
                      ...styles.primaryButton,
                      opacity: downloading
                        ? 0.7
                        : 1,
                    }}
                  >
                    {downloading
                      ? "Generating PDF..."
                      : "📄 Download Full Session PDF"}
                  </button>
                </div>

                {/* DATE RANGE */}

                <div style={styles.reportBox}>
                  <p style={styles.reportDesc}>
                    Generate a custom date-to-date
                    financial statement.
                  </p>

                  <div
                    style={
                      styles.dateInputsContainer
                    }
                  >
                    <div style={styles.dateField}>
                      <label style={styles.dateLabel}>
                        From Date:
                      </label>

                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) =>
                          setStartDate(
                            e.target.value
                          )
                        }
                        style={styles.dateInput}
                      />
                    </div>

                    <div style={styles.dateField}>
                      <label style={styles.dateLabel}>
                        To Date:
                      </label>

                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) =>
                          setEndDate(
                            e.target.value
                          )
                        }
                        style={styles.dateInput}
                      />
                    </div>
                  </div>

                  <button
                    onClick={
                      handleDownloadDateRangePDF
                    }
                    disabled={downloading}
                    style={{
                      ...styles.secondaryButton,
                      opacity: downloading
                        ? 0.7
                        : 1,
                    }}
                  >
                    {downloading
                      ? "Generating Statement..."
                      : "📑 Download Custom Statement"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================= DIVIDER ================= */}

        <div style={styles.dividerContainer}>
          <div style={styles.dividerLine}></div>

          <span style={styles.dividerText}>
            Select a Month Ledger
          </span>

          <div style={styles.dividerLine}></div>
        </div>

        {/* ================= MONTH GRID ================= */}

        <div
          style={{
            ...styles.gridContainer,
            gridTemplateColumns: isMobile
              ? "1fr"
              : "repeat(auto-fill, minmax(250px, 1fr))",
          }}
        >
          {months.map((m, i) => {
            const isThisLoading =
              loadingMonth === i + 1;

            const isSelectable =
              selectedSession !== "";

            return (
              <div
                key={m.name}
                onMouseEnter={() =>
                  isSelectable &&
                  setHoveredIndex(i)
                }
                onMouseLeave={() =>
                  setHoveredIndex(null)
                }
                onClick={() =>
                  isSelectable &&
                  handleNavigation(i + 1)
                }
                style={{
                  ...styles.monthCard,

                  borderTop:
                    `6px solid ${m.color}`,

                  transform:
                    hoveredIndex === i &&
                    !isMobile
                      ? "translateY(-8px)"
                      : "translateY(0)",

                  boxShadow:
                    hoveredIndex === i
                      ? "0 12px 30px rgba(0,0,0,0.12)"
                      : "0 4px 15px rgba(0,0,0,0.05)",

                  opacity: isSelectable ? 1 : 0.6,

                  cursor: isSelectable
                    ? "pointer"
                    : "not-allowed",

                  pointerEvents: loadingMonth
                    ? "none"
                    : "auto",
                }}
              >
                {isThisLoading && (
                  <div style={styles.spinnerOverlay}>
                    <div style={styles.spinner}></div>
                  </div>
                )}

                <div
                  style={{
                    ...styles.iconCircle,
                    backgroundColor:
                      `${m.color}15`,
                    color: m.color,
                  }}
                >
                  {m.label}
                </div>

                <h3 style={styles.monthName}>
                  {m.name}
                </h3>

                <div style={styles.cardFooter}>
                  <span
                    style={{
                      ...styles.statusDot,
                      backgroundColor: m.color,
                    }}
                  ></span>

                  <span
                    style={styles.actionLink}
                  >
                    {isThisLoading
                      ? "Loading..."
                      : "Open Ledger →"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ================= FOOTER ================= */}

        <footer style={styles.footerBox}>
          <p>
            Logged in as: <strong>Admin</strong>
            {" "}
            | Authorized by: Nitesh Kushwah
            {" "}
            | {new Date().toLocaleDateString()}
          </p>
        </footer>
      </div>

      <style>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }

          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

/* =========================================================
   STYLES
========================================================= */

const styles = {
  pageContainer: {
    background: "#f4f7fa",
    minHeight: "100vh",
    fontFamily: "'Inter', sans-serif",
    color: "#2d3436",
  },

  contentWrapper: {
    maxWidth: "1200px",
    margin: "0 auto",
  },

  headerStyle: {
    textAlign: "center",
    marginBottom: "40px",
  },

  badge: {
    display: "inline-block",
    padding: "6px 16px",
    background: "#e8eaf6",
    color: "#3f51b5",
    borderRadius: "20px",
    fontSize: "0.85rem",
    fontWeight: "700",
    marginBottom: "15px",
  },

  mainTitle: {
    margin: "0 0 10px 0",
    fontWeight: "800",
    color: "#1a237e",
  },

  subTitle: {
    fontSize: "0.95rem",
    color: "#636e72",
    maxWidth: "500px",
    margin: "0 auto",
  },

  selectionSection: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "25px",
  },

  card: {
    background: "#ffffff",
    borderRadius: "24px",
    boxShadow: "0 10px 40px rgba(0,0,0,0.04)",
    textAlign: "center",
    width: "100%",
    maxWidth: "450px",
    border: "1px solid #edf2f7",
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    marginBottom: "15px",
  },

  stepCircle: {
    background: "#1a237e",
    color: "white",
    width: "26px",
    height: "26px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    fontSize: "0.9rem",
  },

  labelStyle: {
    fontWeight: "700",
    fontSize: "1.1rem",
  },

  selectStyle: {
    padding: "12px 15px",
    borderRadius: "10px",
    border: "2px solid #e2e8f0",
    fontSize: "1rem",
    width: "100%",
    cursor: "pointer",
    outline: "none",
  },

  reportSection: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "35px",
  },

  reportCard: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "25px",
    width: "100%",
    maxWidth: "850px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
    border: "1px solid #edf2f7",
  },

  reportTitle: {
    margin: "0 0 15px 0",
    fontSize: "1.1rem",
    color: "#1a237e",
    textAlign: "center",
    fontWeight: "700",
  },

  reportGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "20px",
  },

  reportBox: {
    background: "#f8fafc",
    padding: "18px",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },

  reportDesc: {
    fontSize: "0.85rem",
    color: "#64748b",
    margin: "0 0 15px 0",
    lineHeight: "1.4",
  },

  primaryButton: {
    background: "#1a237e",
    color: "white",
    border: "none",
    padding: "12px 15px",
    borderRadius: "8px",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "0.9rem",
    width: "100%",
  },

  secondaryButton: {
    background: "#0ea5e9",
    color: "white",
    border: "none",
    padding: "12px 15px",
    borderRadius: "8px",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "0.9rem",
    width: "100%",
  },

  dateInputsContainer: {
    display: "flex",
    gap: "10px",
    marginBottom: "15px",
  },

  dateField: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },

  dateLabel: {
    fontSize: "0.75rem",
    fontWeight: "600",
    color: "#475569",
  },

  dateInput: {
    padding: "8px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    fontSize: "0.85rem",
    outline: "none",
    width: "100%",
  },

  dividerContainer: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    marginBottom: "30px",
  },

  dividerLine: {
    flex: 1,
    height: "1px",
    background: "#e2e8f0",
  },

  dividerText: {
    color: "#718096",
    fontSize: "0.8rem",
    fontWeight: "600",
    textTransform: "uppercase",
  },

  gridContainer: {
    display: "grid",
    gap: "25px",
  },

  monthCard: {
    background: "#ffffff",
    padding: "25px 20px",
    borderRadius: "20px",
    textAlign: "center",
    transition: "all 0.4s ease",
    position: "relative",
    overflow: "hidden",
  },

  spinnerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(255,255,255,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },

  spinner: {
    width: "25px",
    height: "25px",
    border: "3px solid #f3f3f3",
    borderTop: "3px solid #1a237e",
    borderRadius: "50%",
    animation:
      "spin 0.8s linear infinite",
  },

  iconCircle: {
    width: "55px",
    height: "55px",
    borderRadius: "14px",
    margin: "0 auto 15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.2rem",
    fontWeight: "800",
  },

  monthName: {
    margin: "0 0 12px 0",
    fontSize: "1.2rem",
    fontWeight: "700",
  },

  cardFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    borderTop: "1px solid #f1f5f9",
    paddingTop: "12px",
  },

  statusDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
  },

  actionLink: {
    fontSize: "0.85rem",
    fontWeight: "600",
    color: "#1a237e",
  },

  footerBox: {
    marginTop: "40px",
    textAlign: "center",
    padding: "25px",
    color: "#718096",
    fontSize: "0.8rem",
  },
};

export default AdminFees;