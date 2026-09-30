import React, { useState, useEffect } from "react";
import { FaDownload, FaTimes, FaCheckCircle, FaFileInvoiceDollar, FaExclamationTriangle, FaSpinner, FaReceipt, FaCreditCard, FaCalendarAlt } from "react-icons/fa";
import api from "../services/api";

const StudentFees = ({ user }) => {
  const [feeRecords, setFeeRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentGroups, setRecentGroups] = useState({});
  const [selectedGroupForPdf, setSelectedGroupForPdf] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const currentUser = user || JSON.parse(localStorage.getItem("user")) || {};
  const activeSession = localStorage.getItem("session") || "2026-27";

  const monthNamesMap = {
    1: "January", 2: "February", 3: "March", 4: "April",
    5: "May", 6: "June", 7: "July", 8: "August",
    9: "September", 10: "October", 11: "November", 12: "December"
  };

  const getMonthName = (rawMonth) => {
    if (rawMonth === null || rawMonth === undefined || rawMonth === "") return "Current Month";
    const parsedNum = parseInt(rawMonth, 10);
    if (!isNaN(parsedNum) && monthNamesMap[parsedNum]) {
      return monthNamesMap[parsedNum];
    }
    const lower = String(rawMonth).trim().toLowerCase();
    const foundEntry = Object.entries(monthNamesMap).find(([num, name]) => name.toLowerCase() === lower);
    if (foundEntry) {
      return foundEntry[1];
    }
    return String(rawMonth).charAt(0).toUpperCase() + String(rawMonth).slice(1);
  };

  useEffect(() => {
    const fetchFeeData = async () => {
      try {
        setLoading(true);
        const studentId = currentUser?.id || currentUser?.student_id || 3;
        
        const response = await api.get(`/api/fees/${studentId}`, {
          params: { session: activeSession }
        });
        
        const data = response.data;
        const records = Array.isArray(data) ? data : data.records || data.fees || [];

        // STRICT AUGUST 2026 ONWARDS FILTERING
        // August 2026 = Month 8 (or year 2026, month >= 8)
        const cutoffDate = new Date("2026-08-01");

        const filteredRecords = records.filter(record => {
          const recordDateStr = record.date || record.created_at || record.payment_date;
          
          if (recordDateStr) {
            const recDate = new Date(recordDateStr);
            if (recDate < cutoffDate) {
              return false; // August 2026 se pehle ke records hide kar do
            }
          }

          // Month-based check if date is missing
          const rawMonth = record.month ?? record.fee_month ?? record.feeMonth;
          let monthNum = parseInt(rawMonth, 10);
          
          if (isNaN(monthNum)) {
            const lowerStr = String(rawMonth || "").trim().toLowerCase();
            const matched = Object.entries(monthNamesMap).find(([num, name]) => name.toLowerCase() === lowerStr);
            if (matched) {
              monthNum = parseInt(matched[0], 10);
            }
          }

          // Agar month explicitly 1 se 7 (Jan to July) diya hai, toh hata do
          if (!isNaN(monthNum) && monthNum < 8) {
            return false;
          }

          return true;
        });

        setFeeRecords(filteredRecords);
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Failed to fetch fee records from server");
      } finally {
        setLoading(false);
      }
    };

    fetchFeeData();
  }, [currentUser, activeSession]);

  useEffect(() => {
    const grouped = {};
    feeRecords.forEach((record, index) => {
      const key = record.slipNo || record.receiptNo || `slip-${index}`;
      const rawMonth = record.month ?? record.fee_month ?? record.feeMonth;
      const formattedMonthName = getMonthName(rawMonth);

      if (!grouped[key]) {
        grouped[key] = {
          slipNo: record.slipNo || record.receiptNo || `REC-${index + 100}`,
          monthName: formattedMonthName,
          date: record.date || record.payment_date || record.created_at || new Date().toISOString(),
          transactions: []
        };
      }
      grouped[key].transactions.push(record);
    });
    setRecentGroups(grouped);
  }, [feeRecords]);

  const handleGeneratePdf = (group) => {
    setSelectedGroupForPdf(group);
    setShowPreviewModal(true);
  };

  const handleConfirmDownload = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ ...styles.container, display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <div style={{ textAlign: "center", color: "#64748b" }}>
          <FaSpinner className="fa-spin" size={32} color="#2563eb" style={{ marginBottom: "12px" }} />
          <p style={{ margin: 0, fontSize: "14px", fontWeight: "500" }}>Loading verified fee records...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div
  style={{
    ...styles.emptyCard,
    marginTop: "250px",
    padding: "32px 24px",
    border: "1px solid #0b0505",
    borderRadius: "16px",
    background: "linear-gradient(135deg, #fff7f7, #fef2f2)",
    color: "#1aa559",
    textAlign: "center",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.06)",
    maxWidth: "500px",
    marginLeft: "auto",
    marginRight: "auto",
  }}
>
  <div
    style={{
      width: "52px",
      height: "52px",
      margin: "0 auto 14px",
      borderRadius: "50%",
      background: "#fee2e2",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "24px",
    }}
  >
    ₹
  </div>

  <p
    style={{
      margin: "0 0 8px",
      fontSize: "18px",
      fontWeight: "800",
      color: "#269651",
    }}
  >
    No Fee Records Found
  </p>

  <p
    style={{
      margin: 0,
      fontSize: "13px",
      color: "#6b7280",
      lineHeight: "1.5",
    }}
  >
    {error || "No fee records are available for this student."}
  </p>
</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header Section */}
      <div style={styles.headerCard}>
        <div style={styles.headerTitleContainer}>
          <FaFileInvoiceDollar size={24} color="#2563eb" />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={styles.headerTitle}>Fee Ledger & Digital Receipts</h2>
              <span style={styles.topSessionBadge}>Session: {activeSession}</span>
            </div>
            <p style={styles.headerSub}>View detailed payment records starting from August 2026 onwards</p>
          </div>
        </div>
      </div>

      {/* Fee Info Snippet */}
      <div style={styles.feeInfoSnippet}>
        <h4 style={styles.sectionTitle}>Smart Students Classes - Secure Fee Portal</h4>
        <p style={{ fontSize: "13px", color: "#475569", margin: 0 }}>
          Showing official payment records and digital fee receipts from August 2026 onwards.
        </p>
      </div>

      {/* Transactions List */}
      <h3 style={styles.sectionTitle}>Verified Payment Records</h3>
      {Object.keys(recentGroups).length === 0 ? (
        <div style={styles.emptyCard}>
          <FaReceipt size={32} color="#cbd5e1" style={{ marginBottom: "10px" }} />
          <p style={{ fontWeight: "600", color: "#475569", margin: "0 0 4px 0" }}>No fee records found</p>
          <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>No fee payment records found from August 2026 onwards.</p>
        </div>
      ) : (
        Object.entries(recentGroups).map(([key, group]) => (
          <div key={key} style={styles.recordCard}>
            <div style={styles.recordHeader}>
              <div>
                <span style={styles.monthBadge}><FaCalendarAlt style={{ marginRight: "6px", color: "#2563eb" }} />{group.monthName}</span>
                <span style={styles.slipText}>Receipt #{group.slipNo}</span>
              </div>
              <button
                style={styles.downloadButton}
                onClick={() => handleGeneratePdf(group)}
              >
                <FaDownload style={{ marginRight: "6px" }} /> View & Download Receipt
              </button>
            </div>

            <div style={styles.transactionList}>
              {group.transactions.map((t, idx) => (
                <div key={idx} style={styles.transactionItem}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: "700", color: "#1e293b", fontSize: "15px" }}>₹{t.amount}</span>
                      <span style={styles.modeBadge}>
                        <FaCreditCard size={10} style={{ marginRight: "4px" }} /> {t.mode || t.payment_mode || "Online / Cash"}
                      </span>
                    </div>
                    {t.remarks && <span style={{ fontSize: "12px", color: "#64748b" }}>Note: {t.remarks}</span>}
                    {t.transaction_id && <span style={{ fontSize: "11px", color: "#94a3b8" }}>Txn ID: {t.transaction_id}</span>}
                  </div>
                  <div style={styles.successBadge}>
                    <FaCheckCircle style={{ marginRight: "4px" }} /> Paid ({t.formattedDate || t.date?.split("T")[0] || "Verified"})
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Restriction Notice Banner */}
      <div style={styles.restrictionBanner}>
        <div style={styles.restrictionIconContainer}>
          <FaExclamationTriangle size={18} color="#d97706" />
        </div>
        <div style={styles.restrictionContent}>
          <div style={styles.restrictionTitle}>Important Note on Fee Receipts</div>
          <p style={styles.restrictionText}>
            Official receipts generated through this portal are digitally signed and verified. For any ledger discrepancies, please contact the administration desk directly.
          </p>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: "16px", color: "#1e293b" }}>Official Fee Receipt Preview</h3>
              <button
                style={styles.modalCloseButton}
                onClick={() => {
                  setShowPreviewModal(false);
                  setSelectedGroupForPdf(null);
                }}
              >
                <FaTimes />
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={{ padding: "24px", background: "#ffffff", borderRadius: "8px", height: "100%", overflowY: "auto", border: "1px solid #e2e8f0" }}>
                <h3 style={{ textAlign: "center", color: "#1e293b", margin: "0 0 4px 0", fontSize: "18px" }}>Smart Students Classes</h3>
                <p style={{ textAlign: "center", fontSize: "12px", color: "#64748b", margin: "0 0 4px 0" }}>Official Fee Receipt • Session {activeSession}</p>
                <p style={{ textAlign: "center", fontSize: "11px", color: "#94a3b8", margin: "0 0 16px 0" }}>Suraiya Pura Behind Girls College Morar, Gwalior | Contact: Admin Desk</p>
                <hr style={{ border: "0", borderTop: "1px solid #cbd5e1", margin: "12px 0" }} />
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px", margin: "14px 0", background: "#f8fafc", padding: "12px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                  <div><b>Student Name:</b> {currentUser?.name || currentUser?.studentName || "Nitesh Kushwah"}</div>
                  <div><b>Student ID:</b> {currentUser?.id || currentUser?.student_id || "119"}</div>
                  <div><b>Class / Stream:</b> {currentUser?.class || "10th"} {currentUser?.stream ? `(${currentUser.stream})` : ""}</div>
                  <div><b>Receipt No:</b> {selectedGroupForPdf?.slipNo}</div>
                  <div><b>Fee Month:</b> {selectedGroupForPdf?.monthName}</div>
                  <div><b>Status:</b> <span style={{ color: "#16a34a", fontWeight: "600" }}>Paid & Verified</span></div>
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px" }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9", textAlign: "left", fontSize: "13px" }}>
                      <th style={{ padding: "10px", border: "1px solid #cbd5e1" }}>Fee Description</th>
                      <th style={{ padding: "10px", border: "1px solid #cbd5e1" }}>Payment Mode</th>
                      <th style={{ padding: "10px", border: "1px solid #cbd5e1" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedGroupForPdf?.transactions.map((tx, i) => (
                      <tr key={i} style={{ fontSize: "13px" }}>
                        <td style={{ padding: "10px", border: "1px solid #cbd5e1" }}>
                          Tuition & Academic Fee - {selectedGroupForPdf.monthName}
                          {tx.remarks && <div style={{ fontSize: "11px", color: "#64748b" }}>{tx.remarks}</div>}
                        </td>
                        <td style={{ padding: "10px", border: "1px solid #cbd5e1" }}>{tx.mode || tx.payment_mode || "Online"}</td>
                        <td style={{ padding: "10px", border: "1px solid #cbd5e1", fontWeight: "600" }}>₹{tx.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "14px", fontSize: "15px", fontWeight: "700", color: "#1e293b", background: "#f8fafc", padding: "10px", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                  Total Amount Paid: ₹{selectedGroupForPdf?.transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0)}
                </div>

                <div style={{ marginTop: "24px", padding: "12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "11px", color: "#475569", lineHeight: "1.5" }}>
                  <p style={{ margin: "0 0 4px 0", fontWeight: "600", color: "#334155" }}>Terms & Conditions / Declaration:</p>
                  <ol style={{ margin: 0, paddingLeft: "16px" }}>
                    <li>Fees once paid through this portal are strictly non-refundable and non-transferable under any circumstances.</li>
                    <li>This computer-generated digital receipt is valid for official record keeping and academic verification.</li>
                  </ol>
                </div>

                <div style={{ marginTop: "24px", display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#475569", alignItems: "flex-end" }}>
                  <span>Verified Digital Receipt</span>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: "700", color: "#1e293b" }}>Nitesh Kushwah</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Smart Students Classes Authority</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                style={styles.secondaryButton}
                onClick={() => {
                  setShowPreviewModal(false);
                  setSelectedGroupForPdf(null);
                }}
              >
                Cancel
              </button>
              <button style={styles.primaryButton} onClick={handleConfirmDownload}>
                <FaDownload style={{ marginRight: "6px" }} /> Print / Download Receipt PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: "16px",
    maxWidth: "800px",
    margin: "0 auto",
    fontFamily: "'Inter', sans-serif",
    backgroundColor: "#f8fafc",
    minHeight: "100vh"
  },
  headerCard: {
    background: "#ffffff",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    marginBottom: "16px"
  },
  headerTitleContainer: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  headerTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#1e293b",
    margin: 0
  },
  headerSub: {
    fontSize: "13px",
    color: "#64748b",
    marginTop: "4px",
    marginBottom: 0
  },
  topSessionBadge: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#2563eb",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    padding: "4px 10px",
    borderRadius: "20px"
  },
  feeInfoSnippet: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    padding: "16px",
    borderRadius: "12px",
    marginBottom: "20px"
  },
  sectionTitle: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#334155",
    marginBottom: "12px"
  },
  emptyCard: {
    background: "#ffffff",
    padding: "32px 24px",
    borderRadius: "12px",
    textAlign: "center",
    color: "#64748b",
    border: "1px solid #e2e8f0"
  },
  recordCard: {
    background: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    border: "1px solid #e2e8f0",
    marginBottom: "16px",
    overflow: "hidden"
  },
  recordHeader: {
    background: "#f8fafc",
    padding: "14px 16px",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  monthBadge: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#1e293b",
    marginRight: "10px",
    display: "inline-flex",
    alignItems: "center"
  },
  slipText: {
    fontSize: "12px",
    color: "#64748b",
    background: "#e2e8f0",
    padding: "2px 8px",
    borderRadius: "4px"
  },
  modeBadge: {
    fontSize: "11px",
    color: "#475569",
    background: "#f1f5f9",
    padding: "2px 6px",
    borderRadius: "4px",
    display: "inline-flex",
    alignItems: "center",
    border: "1px solid #e2e8f0"
  },
  downloadButton: {
    background: "#2563eb",
    color: "#ffffff",
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "500",
    cursor: "pointer",
    display: "flex",
    alignItems: "center"
  },
  transactionList: {
    padding: "16px"
  },
  transactionItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 0",
    borderBottom: "1px solid #f1f5f9",
    fontSize: "14px"
  },
  successBadge: {
    display: "flex",
    alignItems: "center",
    color: "#16a34a",
    fontSize: "13px",
    fontWeight: "500",
    background: "#dcfce7",
    padding: "4px 10px",
    borderRadius: "6px"
  },
  restrictionBanner: {
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: "12px",
    padding: "16px",
    display: "flex",
    gap: "14px",
    marginTop: "20px"
  },
  restrictionIconContainer: {
    display: "flex",
    alignItems: "flex-start",
    paddingTop: "2px"
  },
  restrictionContent: {
    flex: 1
  },
  restrictionTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#92400e",
    marginBottom: "4px"
  },
  restrictionText: {
    fontSize: "13px",
    color: "#b45309",
    margin: 0,
    lineHeight: "1.4"
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: "20px"
  },
  modalContent: {
    background: "#ffffff",
    borderRadius: "12px",
    width: "100%",
    maxWidth: "680px",
    height: "85vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
  },
  modalHeader: {
    padding: "16px 20px",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  modalCloseButton: {
    background: "transparent",
    border: "none",
    fontSize: "16px",
    color: "#64748b",
    cursor: "pointer"
  },
  modalBody: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: "16px",
    overflowY: "auto"
  },
  modalFooter: {
    padding: "16px 20px",
    borderTop: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    background: "#ffffff"
  },
  secondaryButton: {
    background: "#f1f5f9",
    color: "#334155",
    border: "1px solid #cbd5e1",
    padding: "8px 16px",
    borderRadius: "6px",
    fontWeight: "500",
    cursor: "pointer"
  },
  primaryButton: {
    background: "#2563eb",
    color: "#ffffff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    fontWeight: "500",
    cursor: "pointer",
    display: "flex",
    alignItems: "center"
  }
};

export default StudentFees;