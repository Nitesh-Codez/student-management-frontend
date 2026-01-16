import React, { useState, useEffect } from "react";
import axios from "axios";

const StudentFees = ({ user }) => {
  const API_URL = process.env.REACT_APP_API_URL;
  const [fees, setFees] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [showMonths, setShowMonths] = useState(true);
  const [isCurrentMonthUnpaid, setIsCurrentMonthUnpaid] = useState(false);
  const [dynamicFee, setDynamicFee] = useState("0");

  const MY_UPI_ID = "9302122613@ybl";

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    if (!user) return;

    const fetchFees = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/fees/student/${user.id}`);    

        if (res.data.success) {
          const feesData = res.data.fees;
          setFees(feesData);

          const sortedFees = [...feesData].sort(
            (a, b) => new Date(b.payment_date) - new Date(a.payment_date)
          );
          setDynamicFee(sortedFees[0]?.amount || "500");

          const today = new Date();
          const currentMonth = today.getMonth();
          const currentYear = today.getFullYear();

          const hasPaidCurrentMonth = feesData.some((f) => {
            const fd = new Date(f.payment_date);
            return fd.getMonth() === currentMonth && fd.getFullYear() === currentYear;
          });

          setIsCurrentMonthUnpaid(!hasPaidCurrentMonth);
        }
      } catch (err) {
        console.log("Error fetching fees:", err);
      }
    };

    fetchFees();
  }, [user, API_URL]);

  const handlePayment = () => {
    const upiUrl = `upi://pay?pa=${MY_UPI_ID}&pn=SmartZone&am=${dynamicFee}&cu=INR&tn=Fees_${months[new Date().getMonth()]}`;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      window.location.href = upiUrl;
    } else {
      alert("Please open this on your mobile to pay directly via PhonePe/GPay.");
    }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });

  const formatTime = (t) => {
    if (!t) return "--:--";
    const [h, m] = t.split(":");
    const d = new Date();
    d.setHours(h, m);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getStatusStyle = (status) => {
    if (status === "Late") return "status-late";
    if (status === "Early") return "status-early";
    return "status-paid";
  };

  const filteredFees = selectedMonth === null ? [] : fees.filter((f) => {
    const feeMonth = new Date(f.payment_date).getMonth();
    return feeMonth === selectedMonth;
  });

  return (
    <div style={styles.page}>
      {isCurrentMonthUnpaid && (
        <div className="fee-notice-banner">
          <div style={styles.noticeContent}>
            <span style={styles.noticeIcon}>⚠️</span>
            <div>
              <h4 style={{ margin: 0, color: '#fff' }}>Fees Pending!</h4>
              <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "rgba(255,255,255,0.8)" }}>
                Your regular fee of <b>₹{dynamicFee}</b> for {months[new Date().getMonth()]} is pending.
              </p>
            </div>
          </div>
          <button type="button" onClick={handlePayment} style={styles.payNowBtn}>
            Pay ₹{dynamicFee} Now
          </button>
        </div>
      )}

      <div style={styles.headerContainer}>
        <div style={styles.headerGlow}></div>
        <h2 style={styles.heading}>
          {showMonths ? "Financial Overview" : months[selectedMonth]}
        </h2>
        <p style={styles.subText}>
          {showMonths ? "Select a billing cycle to review statements" : `Transaction history for ${months[selectedMonth]}`}
        </p>
      </div>

      {showMonths ? (
        <div style={styles.gridContainer}>
          {months.map((m, i) => (
            <div key={i} style={styles.monthWrapper} onClick={() => { setSelectedMonth(i); setShowMonths(false); }}>
              <div className="month-card-new">
                <div style={styles.monthIndex}>{String(i + 1).padStart(2, '0')}</div>
                <div style={styles.monthLabel}>{m}</div>
                <div style={styles.tapIndicator}>View Details →</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.detailContainer}>
          <div style={styles.actionRow}>
            <button type="button" onClick={() => setShowMonths(true)} className="back-btn-modern">
              <span style={{ marginRight: "8px" }}>←</span> Back to Months
            </button>
          </div>

          <div className="glass-panel">
            {filteredFees.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>📂</div>
                <p>No records for this month.</p>
              </div>
            ) : (
              <div style={styles.tableResponsive}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeader}>
                      <th>TRANSACTION DATE</th>
                      <th>TIMESTAMP</th>
                      <th>AMOUNT</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFees.map((f) => (
                      <tr key={f.id || Math.random()} className="table-row-modern">
                        <td data-label="DATE">{formatDate(f.payment_date)}</td>
                        <td data-label="TIME">{formatTime(f.payment_time)}</td>
                        <td data-label="AMOUNT" style={styles.amountText}>₹ {f.amount}</td>
                        <td data-label="STATUS">
                          <span className={`status-pill ${getStatusStyle(f.status)}`}>
                            {f.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');

          .fee-notice-banner {
            background: linear-gradient(90deg, #ff4b2b, #ff416c);
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 35px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 10px 25px rgba(255, 75, 43, 0.3);
            animation: slideDown 0.6s cubic-bezier(0.23, 1, 0.32, 1);
          }

          .month-card-new {
            background: linear-gradient(145deg, #161b22, #0d1117);
            border: 1px solid #30363d;
            border-radius: 16px;
            padding: 30px 20px;
            cursor: pointer;
            transition: all 0.4s ease;
            position: relative;
            overflow: hidden;
          }

          .month-card-new:hover {
            transform: translateY(-8px);
            border-color: #6366f1;
            box-shadow: 0 10px 30px rgba(99, 102, 241, 0.15);
          }

          .status-pill {
            padding: 6px 14px; border-radius: 8px; font-size: 11px; font-weight: 700;
          }

          .status-paid { background: rgba(46, 160, 67, 0.15); color: #3fb950; border: 1px solid rgba(46, 160, 67, 0.3); }
          .status-late { background: rgba(248, 81, 73, 0.15); color: #f85149; border: 1px solid rgba(248, 81, 73, 0.3); }

          @keyframes slideDown { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }

          @media (max-width: 768px) {
            .fee-notice-banner { flex-direction: column; text-align: center; gap: 15px; }
            .payNowBtn { width: 100%; }
          }
        `}
      </style>
    </div>
  );
};

const styles = {
  page: { padding: "60px 5%", minHeight: "100vh", background: "#0a0b10", color: "#fff" },
  noticeContent: { display: "flex", alignItems: "center", gap: "15px" },
  noticeIcon: { fontSize: "28px" },
  payNowBtn: {
    background: "#fff",
    color: "#ff416c",
    border: "none",
    padding: "12px 25px",
    borderRadius: "10px",
    fontWeight: "800",
    cursor: "pointer",
    fontSize: "14px",
    transition: "0.3s",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
  },
  headerContainer: { position: "relative", marginBottom: "50px" },
  headerGlow: { position: "absolute", top: "-50px", left: "0", width: "200px", height: "150px", background: "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)" },
  heading: { fontSize: "36px", fontWeight: "800", marginBottom: "10px", letterSpacing: "-1px" },
  subText: { color: "#8b949e", fontSize: "16px" },
  gridContainer: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "25px" },
  monthIndex: { fontSize: "48px", fontWeight: "800", opacity: "0.05", position: "absolute", right: "15px", top: "10px" },
  monthLabel: { fontSize: "20px", fontWeight: "600", color: "#c9d1d9" },
  table: { width: "100%", borderCollapse: "collapse" },
  tableHeader: { textAlign: "left", color: "#484f58", fontSize: "12px", letterSpacing: "1.5px", paddingBottom: "15px" },
  amountText: { color: "#f0f6fc", fontWeight: "700" },
  emptyState: { textAlign: "center", padding: "60px", color: "#484f58" }
};

export default StudentFees;
