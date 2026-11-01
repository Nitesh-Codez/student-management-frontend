import React, { useRef, useEffect, useState } from "react";
import { 
  FaDownload, 
  FaCheckCircle, 
  FaUserGraduate,
  FaUniversity,
  FaExclamationCircle,
  FaSpinner,
  FaCalendarAlt,
  FaCreditCard,
  FaPrint,
  FaTimes,
  FaStamp,
  FaLayerGroup
} from "react-icons/fa";
import api from "../services/api";

const MONTHS_MAP = {
  "01": "January", "1": "January",
  "02": "February", "2": "February",
  "03": "March", "3": "March",
  "04": "April", "4": "April",
  "05": "May", "5": "May",
  "06": "June", "6": "June",
  "07": "July", "7": "July",
  "08": "August", "8": "August",
  "09": "September", "9": "September",
  "10": "October", "10": "October",
  "11": "November", "11": "November",
  "12": "December", "12": "December"
};

// Helper function to convert 24-hour time to 12-hour AM/PM format
const formatTime12Hour = (timeStr) => {
  if (!timeStr) return "N/A";
  try {
    const [hours, minutes] = timeStr.split(":");
    let h = parseInt(hours, 10);
    const m = minutes || "00";
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; 
    return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
  } catch (e) {
    return timeStr;
  }
};

const StudentFees = () => {
  const printRef = useRef();

  const [fees, setFees] = useState([]);
  const [studentInfo, setStudentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

 useEffect(() => {
    const fetchFees = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const studentId = user.id || user.student_id;
        const session = localStorage.getItem("session") || "2026-27";

        if (!studentId) {
          throw new Error("Student ID not found in session storage");
        }

        setStudentInfo({
          name: user.name || user.full_name || "Student",
          rollNo: user.roll_no || user.rollNo || studentId,
          className: user.class_name || user.course || "10th",
          session: session
        });

        const feeRes = await api.get(`/api/fees/${studentId}`, {
          params: { session }
        });

        // August (Month 8) aur uske baad ke months (8, 9, 10, 11, 12) hi store honge
        const allFees = feeRes.data.fees || [];
        const filteredFees = allFees.filter(item => Number(item.fee_month) >= 8);

        setFees(filteredFees);

      } catch (err) {
        console.error("Fetch Fees Error:", err);
        setError(err.response?.data?.message || err.message || "Failed to load fee records.");
      } finally {
        setLoading(false);
      }
    };

    fetchFees();
  }, []);
  //

  const totalTransactions = fees.length;

  const handlePrintAll = () => {
    window.print();
  };

  const handleOpenPreview = (feeRecord) => {
    setSelectedReceipt(feeRecord);
    setIsPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setSelectedReceipt(null);
  };

  const handlePrintSingleReceipt = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={styles.stateContainer}>
        <FaSpinner style={styles.spinner} />
        <p style={{ marginTop: "12px", color: "#64748b", fontWeight: "500" }}>Loading fee ledger...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.stateContainer}>
        <div style={styles.errorCard}>
          <FaExclamationCircle size={32} color="#dc2626" />
          <h3 style={{ color: "#991b1b", margin: "12px 0 6px 0" }}>Unable to Fetch Fee Records</h3>
          <p style={{ color: "#7f1d1d", fontSize: "14px", margin: 0 }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.pageWrapper}>
      <div ref={printRef} style={styles.mainContainer} className="printable-area">
        
        {/* Header Section */}
        <div style={styles.header}>
          <div>
            <div style={styles.welcomeRow}>
              <h2 style={styles.welcomeText}>Welcome back, 👋 {studentInfo?.name}</h2>
            </div>
            <div style={styles.brandSubtitleRow}>
              <span style={styles.ledgerTag}>
                <FaLayerGroup style={{ marginRight: "6px" }} /> SmartZone Fee Ledger
              </span>
              <span style={styles.sessionTag}>Session: {studentInfo?.session}</span>
            </div>
          </div>

          <button style={styles.printBtn} onClick={handlePrintAll} className="no-print">
            <FaPrint style={{ marginRight: "8px" }} /> Print Statement
          </button>
        </div>

        <div style={styles.divider} />

        {/* Formal Clean Details Bar */}
        <div style={styles.formalDetailsBar}>
          <div style={styles.formalItem}>
            <span style={styles.formalLabel}>Student Name:</span>
            <span style={styles.formalVal}>{studentInfo?.name}</span>
          </div>
          <div style={styles.formalItem}>
            <span style={styles.formalLabel}>Student ID:</span>
            <span style={styles.formalVal}>#{studentInfo?.rollNo}</span>
          </div>
          <div style={styles.formalItem}>
            <span style={styles.formalLabel}>Class:</span>
            <span style={styles.formalVal}>{studentInfo?.className}</span>
          </div>
          <div style={styles.formalItem}>
            <span style={styles.formalLabel}>Session:</span>
            <span style={styles.formalVal}>{studentInfo?.session}</span>
          </div>
        </div>

        {/* Info Strip */}
        <div style={styles.textInfoBar}>
          <span>📊 Total Transactions Recorded: <strong>{totalTransactions}</strong></span>
          <span>Showing paid fee month entries below (including August &amp; onwards).</span>
        </div>

        {/* PAID MONTHS SECTION */}
        <div style={styles.sectionHeader}>
          <FaCalendarAlt style={{ marginRight: "10px", color: "#2563eb" }} />
          <h2 style={{ fontSize: "18px", margin: 0, color: "#0f172a" }}>Paid Monthly Fee Receipts</h2>
        </div>

        {fees.length === 0 ? (
          <div style={styles.emptyBox}>
            <p style={{ color: "#64748b", margin: 0 }}>No fee payments recorded yet.</p>
          </div>
        ) : (
          <div style={styles.monthsGrid}>
            {fees.map((item) => {
              const monthKey = String(item.fee_month).padStart(2, "0");
              const monthName = MONTHS_MAP[monthKey] || `Month ${item.fee_month}`;
              
              const statusLower = (item.status || "").toLowerCase();
              let stripColor = "#16a34a"; // On Time
              let statusEmoji = "✅";
              if (statusLower.includes("early")) {
                stripColor = "#22c55e"; 
                statusEmoji = "⚡";
              } else if (statusLower.includes("late") || statusLower.includes("due") || statusLower.includes("pending")) {
                stripColor = "#dc2626"; 
                statusEmoji = "⚠️";
              }

              return (
                <div key={item.id || item.fee_month} style={styles.monthCard}>
                  <div style={{ ...styles.statusStrip, backgroundColor: stripColor }} />

                  <div style={styles.monthCardContent}>
                    <div style={styles.monthHeader}>
                      <span style={styles.monthTitle}>{monthName} Fee</span>
                      <span style={{ 
                        ...styles.badgeStatus, 
                        backgroundColor: stripColor === "#dc2626" ? "#fef2f2" : "#f0fdf4",
                        color: stripColor === "#dc2626" ? "#dc2626" : "#15803d"
                      }}>
                        {statusEmoji} {item.status || "Paid"}
                      </span>
                    </div>

                    <div style={styles.paidDetails}>
                      <div style={styles.detailRow}>
                        <span>Amount Paid:</span>
                        <strong>₹{Number(item.amount).toLocaleString("en-IN")}</strong>
                      </div>
                      <div style={styles.detailRow}>
                        <span>Payment Date:</span>
                        <span>
                          📅 {item.payment_date ? new Date(item.payment_date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }) : "N/A"}
                        </span>
                      </div>
                      
                      <div style={styles.detailRowCol}>
                        <div style={styles.detailSubRow}>
                          <span style={styles.detailLabel}>Payment Mode:</span>
                          <span style={styles.highlightBadge}>💳 {item.payment_mode || "Online"}</span>
                        </div>
                        <div style={styles.detailSubRow}>
                          <span style={styles.detailLabel}>Payment Time:</span>
                          <span style={styles.highlightTime}>⏰ {formatTime12Hour(item.payment_time)}</span>
                        </div>
                      </div>

                      <button
                        style={styles.shareBtn}
                        onClick={() => handleOpenPreview(item)}
                        className="no-print"
                      >
                        <FaDownload style={{ marginRight: "6px" }} /> Share / Print Receipt
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Note */}
        <div style={styles.footerNote}>
          <p style={{ margin: 0 }}>
            <strong>Smart Students Classes:</strong> Official student digital payment records for session {studentInfo?.session}.
          </p>
        </div>

      </div>

      {/* A4 RECEIPT PREVIEW MODAL */}
      {isPreviewOpen && selectedReceipt && (
        <div style={styles.modalOverlay} className="modal-overlay-bg">
          <div style={styles.modalContent}>
            
            <div style={styles.modalHeader} className="no-print">
              <h3 style={{ margin: 0, color: "#0f172a", fontSize: "18px" }}>Receipt Preview</h3>
              <div style={{ display: "flex", gap: "10px" }}>
                <button style={styles.printBtnModal} onClick={handlePrintSingleReceipt}>
                  <FaPrint style={{ marginRight: "6px" }} /> Print A4 PDF
                </button>
                <button style={styles.closeBtn} onClick={handleClosePreview}>
                  <FaTimes size={16} />
                </button>
              </div>
            </div>

            <div style={styles.a4Page} className="single-receipt-printable">
              
              <div style={styles.receiptHeader}>
                <div style={styles.instituteBrand}>
                  <div style={styles.sealLogo}>
                    <FaUniversity size={26} color="#1e3a8a" />
                  </div>
                  <div>
                    <h2 style={styles.instituteName}>SMART STUDENTS CLASSES</h2>
                    <p style={styles.instituteSub}>Quality Education &amp; Academic Coaching Center</p>
                    <p style={styles.instituteAddress}>Official Fee Payment Receipt</p>
                  </div>
                </div>
                <div style={styles.receiptTitleBadge}>
                  ORIGINAL RECEIPT
                </div>
              </div>

              <div style={styles.a4Divider} />

              <div style={styles.receiptMetaGrid}>
                <div>
                  <span style={styles.metaLabel}>Receipt No:</span>
                  <strong style={styles.metaValue}>#SSC-{selectedReceipt.id}</strong>
                </div>
                <div>
                  <span style={styles.metaLabel}>Date:</span>
                  <strong style={styles.metaValue}>
                    {selectedReceipt.payment_date ? new Date(selectedReceipt.payment_date).toLocaleDateString("en-IN", {
                      day: '2-digit', month: 'long', year: 'numeric'
                    }) : "N/A"}
                  </strong>
                </div>
                <div>
                  <span style={styles.metaLabel}>Time:</span>
                  <strong style={styles.metaValue}>{formatTime12Hour(selectedReceipt.payment_time)}</strong>
                </div>
                <div>
                  <span style={styles.metaLabel}>Session:</span>
                  <strong style={styles.metaValue}>{selectedReceipt.session || studentInfo?.session}</strong>
                </div>
              </div>

              <div style={styles.receiptStudentCard}>
                <div style={styles.receiptGridCol}>
                  <span style={styles.rLabel}>Student Name:</span>
                  <span style={styles.rVal}>{selectedReceipt.student_name || studentInfo?.name}</span>
                </div>
                <div style={styles.receiptGridCol}>
                  <span style={styles.rLabel}>Student ID / Roll:</span>
                  <span style={styles.rVal}>#{selectedReceipt.student_id || studentInfo?.rollNo}</span>
                </div>
                <div style={styles.receiptGridCol}>
                  <span style={styles.rLabel}>Class / Standard:</span>
                  <span style={styles.rVal}>{selectedReceipt.class_name || studentInfo?.className}</span>
                </div>
                <div style={styles.receiptGridCol}>
                  <span style={styles.rLabel}>Fee Month:</span>
                  <span style={styles.rVal}>
                    {MONTHS_MAP[String(selectedReceipt.fee_month).padStart(2, "0")] || selectedReceipt.fee_month}
                  </span>
                </div>
              </div>

              <table style={styles.receiptTable}>
                <thead>
                  <tr style={styles.rTableHeader}>
                    <th style={styles.rTh}>Description</th>
                    <th style={styles.rTh}>Payment Mode</th>
                    <th style={styles.rTh}>Status</th>
                    <th style={styles.rThRight}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={styles.rTd}>
                      Monthly Tuition Fee - {MONTHS_MAP[String(selectedReceipt.fee_month).padStart(2, "0")] || selectedReceipt.fee_month} ({selectedReceipt.session || studentInfo?.session})
                    </td>
                    <td style={styles.rTd}>{selectedReceipt.payment_mode || "Online"}</td>
                    <td style={styles.rTd}>
                      <strong style={{ color: "#166534" }}>{selectedReceipt.payment_status || "Paid"}</strong> ({selectedReceipt.status || "On Time"})
                    </td>
                    <td style={styles.rTdRight}>
                      ₹{Number(selectedReceipt.amount).toLocaleString("en-IN")}
                    </td>
                  </tr>
                  <tr style={styles.rTotalRow}>
                    <td colSpan="3" style={styles.rTotalLabel}>Total Paid Amount:</td>
                    <td style={styles.rTotalVal}>₹{Number(selectedReceipt.amount).toLocaleString("en-IN")}</td>
                  </tr>
                </tbody>
              </table>

              <div style={styles.authorityArea}>
                <div style={styles.noteBox}>
                  <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>
                    • System generated verified official fee receipt.
                  </p>
                  <p style={{ margin: "3px 0 0 0", fontSize: "11px", color: "#64748b" }}>
                    • Smart Students Classes - All rights reserved.
                  </p>
                </div>

                <div style={styles.signatureContainer}>
                  <div style={styles.digitalStamp}>
                    <FaStamp size={18} color="#1e3a8a" />
                    <div style={styles.stampText}>SMART STUDENTS CLASSES</div>
                    <div style={styles.stampSub}>VERIFIED SEAL</div>
                  </div>

                  <div style={styles.signatureLineBox}>
                    <div style={styles.signFont}>Nitesh Kushwah</div>
                    <div style={styles.line}></div>
                    <span style={styles.signTitle}>Authorized Signatory</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          
          body:has(.single-receipt-printable) .printable-area {
            display: none !important;
          }

          .modal-overlay-bg {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            padding: 0 !important;
          }

          .single-receipt-printable {
            box-shadow: none !important;
            border: 2px solid #1e3a8a !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 30px !important;
            margin: 0 !important;
          }

          div[style*="pageWrapper"] {
            padding: 0 !important;
            margin: 0 !important;
          }

          div[style*="mainContainer"] {
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

const styles = {
  pageWrapper: {
    backgroundColor: "#ffffff",
    minHeight: "100vh",
    padding: "0",
    margin: "0",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  mainContainer: {
    width: "100%",
    maxWidth: "100%",
    margin: "0",
    background: "#ffffff",
    borderRadius: "0",
    border: "none",
    padding: "16px",
    boxShadow: "none",
  },
  stateContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
  },
  spinner: {
    fontSize: "36px",
    color: "#2563eb",
    animation: "spin 1s linear infinite",
  },
  errorCard: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    padding: "32px",
    borderRadius: "12px",
    textAlign: "center",
    maxWidth: "450px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
  },
  welcomeRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  welcomeText: {
    fontSize: "22px",
    fontWeight: "800",
    color: "#0f172a",
    margin: 0,
  },
  brandSubtitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginTop: "6px",
  },
  ledgerTag: {
    background: "#eff6ff",
    color: "#2563eb",
    fontSize: "12px",
    fontWeight: "700",
    padding: "4px 10px",
    borderRadius: "6px",
    display: "inline-flex",
    alignItems: "center",
  },
  sessionTag: {
    fontSize: "13px",
    color: "#64748b",
    fontWeight: "500",
  },
  printBtn: {
    background: "#103687",
    color: "#ffffff",
    border: "none",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "right",
  },
  divider: {
    margin: "18px 0",
    border: 0,
    borderTop: "1px solid #e2e8f0",
  },
  formalDetailsBar: {
    display: "flex",
    flexWrap: "wrap",
    gap: "20px",
    padding: "12px 0",
    borderBottom: "1px solid #f1f5f9",
    marginBottom: "16px",
    fontSize: "14px",
  },
  formalItem: {
    display: "flex",
    gap: "6px",
  },
  formalLabel: {
    color: "#64748b",
    fontWeight: "600",
  },
  formalVal: {
    color: "#0f172a",
    fontWeight: "700",
  },
  textInfoBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: "10px 16px",
    borderRadius: "6px",
    fontSize: "13px",
    color: "#334155",
    marginBottom: "20px",
    border: "1px solid #e2e8f0",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: "14px",
  },
  monthsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },
  monthCard: {
    position: "relative",
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    display: "flex",
    overflow: "hidden",
    boxShadow: "2px 2px 6px rgba(0,0,0,0.02)",
    minHeight: "150px",
    border:"0.5px solid black"
  },
  statusStrip: {
    width: "8px",
    flexShrink: 0,
  },
  monthCardContent: {
    padding: "16px",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  monthHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
    borderBottom: "1px solid #f1f5f9",
    paddingBottom: "8px",
  },
  monthTitle: {
    fontWeight: "700",
    fontSize: "15px",
    color: "#0f172a",
  },
  badgeStatus: {
    fontSize: "11px",
    fontWeight: "700",
    padding: "2px 8px",
    borderRadius: "6px",
  },
  paidDetails: {
    fontSize: "13px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    color: "#475569",
  },
  detailRowCol: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    margin: "4px 0",
  },
  detailSubRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "13px",
  },
  detailLabel: {
    color: "#64748b",
    fontWeight: "500",
  },
  highlightBadge: {
    backgroundColor: "#eff6ff",
    color: "#2563eb",
    padding: "2px 8px",
    borderRadius: "4px",
    fontWeight: "700",
    fontSize: "12px",
    border: "1px solid #bfdbfe",
  },
  highlightTime: {
    backgroundColor: "#f8fafc",
    color: "#0f172a",
    padding: "2px 8px",
    borderRadius: "4px",
    fontWeight: "600",
    fontSize: "12px",
    border: "1px solid #e2e8f0",
  },
  shareBtn: {
    marginTop: "10px",
    background: "#166534",
    color: "#ffffff",
    border: "none",
    padding: "8px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: {
    padding: "30px",
    textAlign: "center",
    background: "#f8fafc",
    borderRadius: "8px",
    border: "1px dashed #cbd5e1",
    marginBottom: "20px",
  },
  footerNote: {
    background: "#f8fafc",
    padding: "12px 16px",
    borderRadius: "6px",
    fontSize: "13px",
    color: "#64748b",
    borderLeft: "4px solid #2563eb",
    border: "1px solid #e2e8f0",
  },

  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    backdropFilter: "blur(4px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    padding: "10px",
  },
  modalContent: {
    background: "#ffffff",
    borderRadius: "10px",
    maxWidth: "800px",
    width: "100%",
    maxHeight: "92vh",
    overflowY: "auto",
    padding: "20px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.3)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    borderBottom: "1px solid #e2e8f0",
    paddingBottom: "10px",
  },
  printBtnModal: {
    background: "#166534",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    fontWeight: "600",
    fontSize: "13px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
  },
  closeBtn: {
    background: "#f1f5f9",
    border: "none",
    color: "#64748b",
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  a4Page: {
    background: "#ffffff",
    border: "2px solid #1e3a8a",
    borderRadius: "6px",
    padding: "30px",
    boxSizing: "border-box",
  },
  receiptHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  instituteBrand: {
    display: "flex",
    gap: "14px",
    alignItems: "center",
  },
  sealLogo: {
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    border: "2px solid #1e3a8a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#eff6ff",
  },
  instituteName: {
    fontSize: "18px",
    fontWeight: "800",
    color: "#1e3a8a",
    margin: 0,
  },
  instituteSub: {
    fontSize: "11px",
    color: "#475569",
    margin: "2px 0 0 0",
    fontWeight: "600",
  },
  instituteAddress: {
    fontSize: "10px",
    color: "#64748b",
    margin: "2px 0 0 0",
  },
  receiptTitleBadge: {
    background: "#1e3a8a",
    color: "#ffffff",
    padding: "6px 12px",
    borderRadius: "6px",
    fontWeight: "800",
    fontSize: "12px",
  },
  a4Divider: {
    margin: "16px 0",
    borderTop: "2px dashed #cbd5e1",
  },
  receiptMetaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    backgroundColor: "#f8fafc",
    padding: "10px 14px",
    borderRadius: "6px",
    border: "1px solid #e2e8f0",
    fontSize: "12px",
    marginBottom: "16px",
  },
  metaLabel: {
    color: "#64748b",
    marginRight: "4px",
  },
  metaValue: {
    color: "#0f172a",
  },
  receiptStudentCard: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    padding: "14px",
    marginBottom: "18px",
    backgroundColor: "#ffffff",
  },
  receiptGridCol: {
    display: "flex",
    justifyContent: "space-between",
    borderBottom: "1px solid #f1f5f9",
    paddingBottom: "6px",
    fontSize: "13px",
  },
  rLabel: {
    color: "#64748b",
    fontWeight: "500",
  },
  rVal: {
    color: "#0f172a",
    fontWeight: "700",
  },
  receiptTable: {
    width: "100%",
    borderCollapse: "collapse",
    marginBottom: "20px",
  },
  rTableHeader: {
    background: "#f1f5f9",
    borderBottom: "2px solid #cbd5e1",
  },
  rTh: {
    padding: "10px 12px",
    textAlign: "left",
    fontSize: "12px",
    color: "#334155",
    fontWeight: "700",
  },
  rThRight: {
    padding: "10px 12px",
    textAlign: "right",
    fontSize: "12px",
    color: "#334155",
    fontWeight: "700",
  },
  rTd: {
    padding: "10px 12px",
    fontSize: "13px",
    borderBottom: "1px solid #e2e8f0",
    color: "#1e293b",
  },
  rTdRight: {
    padding: "10px 12px",
    fontSize: "13px",
    borderBottom: "1px solid #e2e8f0",
    color: "#0f172a",
    textAlign: "right",
    fontWeight: "700",
  },
  rTotalRow: {
    background: "#f8fafc",
  },
  rTotalLabel: {
    padding: "10px 12px",
    textAlign: "right",
    fontWeight: "700",
    fontSize: "13px",
    color: "#1e3a8a",
  },
  rTotalVal: {
    padding: "10px 12px",
    textAlign: "right",
    fontWeight: "800",
    fontSize: "15px",
    color: "#1e3a8a",
  },
  authorityArea: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: "14px",
  },
  noteBox: {
    maxWidth: "50%",
  },
  signatureContainer: {
    display: "flex",
    gap: "20px",
    alignItems: "flex-end",
  },
  digitalStamp: {
    width: "95px",
    height: "95px",
    border: "2px dashed #1e3a8a",
    borderRadius: "50%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px",
    textAlign: "center",
    color: "#1e3a8a",
    transform: "rotate(-8deg)",
    backgroundColor: "#eff6ff",
  },
  stampText: {
    fontSize: "7px",
    fontWeight: "900",
    letterSpacing: "0.5px",
    marginTop: "2px",
  },
  stampSub: {
    fontSize: "6px",
    fontWeight: "700",
    color: "#166534",
  },
  signatureLineBox: {
    textAlign: "center",
    width: "120px",
  },
  signFont: {
    fontFamily: "'Times Roman', cursive, sans-serif",
    fontSize: "16px",
    color: "#1e3a8a",
    marginBottom: "2px",
  },
  line: {
    borderTop: "1px solid #0f172a",
    marginBottom: "4px",
  },
  signTitle: {
    fontSize: "10px",
    fontWeight: "600",
    color: "#475569",
  },
};

export default StudentFees;