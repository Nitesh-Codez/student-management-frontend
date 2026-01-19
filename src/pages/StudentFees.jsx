import React, { useState, useEffect } from "react";
import axios from "axios";

const StudentFees = ({ user }) => {
  const API_URL = process.env.REACT_APP_API_URL;

  const [fees, setFees] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [showMonths, setShowMonths] = useState(true);
  const [isCurrentMonthUnpaid, setIsCurrentMonthUnpaid] = useState(false);
  const [dynamicFee, setDynamicFee] = useState("0");

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  /* ================= FETCH FEES ================= */
  useEffect(() => {
    if (!user) return;

    const fetchFees = async () => {
      try {
        const res = await axios.get(
          `${API_URL}/api/fees/student/${user.id}`
        );

        if (res.data.success) {
          const feesData = res.data.fees;
          setFees(feesData);

          const sorted = [...feesData].sort(
            (a, b) => new Date(b.payment_date) - new Date(a.payment_date)
          );
          setDynamicFee(sorted[0]?.amount || "500");

          const now = new Date();
          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();

          const paidThisMonth = feesData.some(f => {
            const d = new Date(f.payment_date);
            return (
              d.getMonth() === currentMonth &&
              d.getFullYear() === currentYear
            );
          });

          setIsCurrentMonthUnpaid(!paidThisMonth);
        }
      } catch (err) {
        console.error("Fetch fees error:", err);
      }
    };

    fetchFees();
  }, [user, API_URL]);

  /* ================= PHONEPE PAYMENT ================= */
  const handlePayment = async () => {
    try {
      const res = await axios.post(
        `${API_URL}/api/fees/phonepe/pay`,
        {
          student_id: user.id,
          student_name: user.name,
          class_name: user.class_name,
          amount: Number(dynamicFee)
        }
      );

      if (res.data.success && res.data.redirectUrl) {
        // ✅ CORRECT (web + app compatible)
        window.location.href = res.data.redirectUrl;
      } else {
        alert("Unable to start payment. Try again.");
      }
    } catch (err) {
      console.error("Payment error:", err);
      alert("Payment failed. Please try later.");
    }
  };

  /* ================= HELPERS ================= */
  const formatDate = d =>
    new Date(d).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });

  const formatTime = t => {
    if (!t) return "--:--";
    const [h, m] = t.split(":");
    const d = new Date();
    d.setHours(h, m);
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusStyle = status => {
    if (status === "Late") return "status-late";
    if (status === "Early") return "status-early";
    return "status-paid";
  };

  const filteredFees =
    selectedMonth === null
      ? []
      : fees.filter(
          f => new Date(f.payment_date).getMonth() === selectedMonth
        );

  /* ================= UI ================= */
  return (
    <div style={styles.page}>

      {isCurrentMonthUnpaid && (
        <div className="fee-notice-banner">
          <div style={styles.noticeContent}>
            <span style={styles.noticeIcon}>⚠️</span>
            <div>
              <h4 style={{ margin: 0, color: "#fff" }}>
                Fees Pending!
              </h4>
              <p style={{ marginTop: 4, fontSize: 13 }}>
                Pay ₹{dynamicFee} for {months[new Date().getMonth()]}
              </p>
            </div>
          </div>

          <button onClick={handlePayment} style={styles.payNowBtn}>
            Pay ₹{dynamicFee}
          </button>
        </div>
      )}

      <h2 style={styles.heading}>
        {showMonths ? "Financial Overview" : months[selectedMonth]}
      </h2>

      {showMonths ? (
        <div style={styles.gridContainer}>
          {months.map((m, i) => (
            <div
              key={i}
              className="month-card-new"
              onClick={() => {
                setSelectedMonth(i);
                setShowMonths(false);
              }}
            >
              <div style={styles.monthIndex}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div style={styles.monthLabel}>{m}</div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <button
            onClick={() => setShowMonths(true)}
            className="back-btn-modern"
          >
            ← Back
          </button>

          {filteredFees.length === 0 ? (
            <p>No records found</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredFees.map(f => (
                  <tr key={f.id}>
                    <td>{formatDate(f.payment_date)}</td>
                    <td>{formatTime(f.payment_time)}</td>
                    <td>₹{f.amount}</td>
                    <td>
                      <span
                        className={`status-pill ${getStatusStyle(
                          f.status
                        )}`}
                      >
                        {f.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
};

/* ================= STYLES ================= */
const styles = {
  page: { padding: "40px", background: "#0a0b10", color: "#fff" },
  noticeContent: { display: "flex", gap: 15 },
  noticeIcon: { fontSize: 28 },
  payNowBtn: {
    background: "#fff",
    color: "#ff416c",
    border: "none",
    padding: "10px 20px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "bold"
  },
  heading: { fontSize: 30, marginBottom: 30 },
  gridContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))",
    gap: 20
  },
  monthIndex: { fontSize: 40, opacity: 0.1 },
  monthLabel: { fontSize: 18 },
  table: { width: "100%", marginTop: 20 }
};

export default StudentFees;
