import React, { useState, useEffect } from "react";
import axios from "axios";

const StudentFees = ({ user }) => {
  const API_URL = "https://student-management-system-4-hose.onrender.com";

  const [fees, setFees] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [showMonths, setShowMonths] = useState(true);
  const [isCurrentMonthUnpaid, setIsCurrentMonthUnpaid] = useState(false);
  const [dynamicFee, setDynamicFee] = useState("500");

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  /* ================= FETCH FEES ================= */
  useEffect(() => {
    if (!user) return;

    const fetchFees = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/fees/student/${user.id}`);
        if (res.data.success) {
          let feesData = res.data.fees;

          // logic: January ki fees December me dikhe (Payment Date - 1 Month)
          feesData = feesData.map(f => {
            const d = new Date(f.payment_date);
            let month = d.getMonth() - 1; // Subtract 1 month
            let year = d.getFullYear();

            if (month === -1) {
              month = 11; // December
              year = year - 1; // Previous Year
            }
            return { ...f, feeMonth: month, feeYear: year };
          });

          setFees(feesData);

          // Check if current month's fee is paid 
          // (Logic: Current month ki fees pichle month me pay honi chahiye thi)
          const now = new Date();
          const thisMonth = now.getMonth();
          const thisYear = now.getFullYear();

          const hasPaidNextMonthFee = feesData.some(
            f => f.feeMonth === thisMonth && 
                 f.feeYear === thisYear &&
                 f.payment_status === "SUCCESS"
          );

          setIsCurrentMonthUnpaid(!hasPaidNextMonthFee);

          if (feesData.length > 0) {
            const sorted = [...feesData].sort((a,b) => new Date(b.payment_date) - new Date(a.payment_date));
            setDynamicFee(sorted[0].amount);
          }
        }
      } catch (err) {
        console.error("Fetch fees error:", err);
      }
    };

    fetchFees();
  }, [user, API_URL]);

  /* ================= PAYMENT HANDLER ================= */
  const handlePayment = async () => {
    // Label showing which month's fee is being paid
    const currentMonthIndex = new Date().getMonth();
    const upiUrl = `upi://pay?pa=9302122613@ybl&pn=SmartZone&am=${dynamicFee}&cu=INR&tn=Fees_For_${months[currentMonthIndex]}`;
    window.location.href = upiUrl;
  };

  /* ================= HELPERS ================= */
  const formatDate = d =>
    new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });

  const formatTime = t => {
    if (!t) return "--:--";
    const [h, m] = t.split(":");
    const d = new Date();
    d.setHours(h, m);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  /* ================= FILTER BY MONTH ================= */
  const filteredFees =
    selectedMonth === null
      ? []
      : fees.filter(f => f.feeMonth === selectedMonth);

  return (
    <div style={styles.page}>
      {/* Pending Banner */}
      {isCurrentMonthUnpaid && (
        <div style={styles.feeNoticeBanner}>
          <div style={styles.noticeContent}>
            <div>
              <h4 style={{ margin: 0, color: "#fff" }}>Want to pay Advanced fee !</h4>
              <p style={{ marginTop: 4, fontSize: 13, opacity: 0.9 }}>
                 pay ₹{dynamicFee} for {months[new Date().getMonth()]} {new Date().getFullYear()}
              </p>
            </div>
          </div>
          <button onClick={handlePayment} style={styles.payNowBtn}>
            Pay Now
          </button>
        </div>
      )}

      <h2 style={styles.heading}>
        {showMonths ? "Financial Overview" : `${months[selectedMonth]} Records`}
      </h2>

      {showMonths ? (
        <div style={styles.gridContainer}>
          {months.map((m, i) => {
            const isPaid = fees.some(f => f.feeMonth === i && f.payment_status === "SUCCESS");
            return (
              <div
                key={i}
                style={{
                  ...styles.monthCard,
                  border: isPaid ? "1px solid #10b981" : "1px solid #334155",
                  background: isPaid ? "rgba(16, 185, 129, 0.1)" : "#1e293b"
                }}
                onClick={() => { setSelectedMonth(i); setShowMonths(false); }}
              >
                <div style={styles.monthIndex}>{String(i + 1).padStart(2, "0")}</div>
                <div style={styles.monthLabel}>{m}</div>
                {isPaid && <div style={styles.paidBadge}>PAID</div>}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={styles.detailContainer}>
          <button onClick={() => setShowMonths(true)} style={styles.backBtn}>← Back to Overview</button>

          {filteredFees.length === 0 ? (
            <div style={styles.noData}>No payment records found for {months[selectedMonth]}.</div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.th}>Payment Date</th>
                    <th style={styles.th}>Time</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFees.map(f => (
                    <tr key={f.id} style={styles.tr}>
                      <td style={styles.td}>{formatDate(f.payment_date)}</td>
                      <td style={styles.td}>{formatTime(f.payment_time)}</td>
                      <td style={styles.td}>₹{f.amount}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.statusPill,
                          backgroundColor: f.payment_status === "SUCCESS" ? "#10b981" : "#ef4444"
                        }}>
                          {f.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* =================== STYLES ================= */
const styles = {
  page: { padding: "40px 20px", background: "#0f172a", minHeight: "100vh", color: "#fff", fontFamily: "'Inter', sans-serif" },
  feeNoticeBanner: { 
    background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)", 
    padding: "20px", 
    borderRadius: "16px", 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: "30px",
    boxShadow: "0 10px 20px rgba(239, 68, 68, 0.2)"
  },
  noticeContent: { display: "flex", alignItems: "center", gap: 15 },
  noticeIcon: { fontSize: 32 },
  payNowBtn: { background: "#fff", color: "#ef4444", border: "none", padding: "12px 24px", borderRadius: 10, cursor: "pointer", fontWeight: "900" },
  heading: { fontSize: 28, fontWeight: 800, marginBottom: "30px", letterSpacing: "-0.5px" },
  gridContainer: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 15 },
  monthCard: { 
    padding: "25px 20px", 
    borderRadius: "18px", 
    cursor: "pointer", 
    position: "relative", 
    overflow: "hidden", 
    transition: "transform 0.2s" 
  },
  monthIndex: { fontSize: 35, fontWeight: 900, opacity: 0.1, position: "absolute", right: 10, top: 5 },
  monthLabel: { fontSize: 16, fontWeight: 600, position: "relative", zIndex: 1 },
  paidBadge: { fontSize: 10, fontWeight: 900, background: "#10b981", color: "white", padding: "2px 8px", borderRadius: "10px", marginTop: "10px", width: "fit-content" },
  backBtn: { background: "transparent", color: "#94a3b8", border: "1px solid #334155", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", marginBottom: "20px" },
  tableWrapper: { background: "#1e293b", borderRadius: "16px", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  tableHeader: { background: "#334155" },
  th: { padding: "15px", textAlign: "left", fontSize: "14px", color: "#94a3b8" },
  td: { padding: "15px", borderBottom: "1px solid #334155", fontSize: "14px" },
  statusPill: { padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", color: "#fff" },
  noData: { textAlign: "center", padding: "50px", color: "#64748b" }
};

export default StudentFees;