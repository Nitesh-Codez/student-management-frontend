import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const StudentFees = ({ user }) => {
  const API_URL = process.env.REACT_APP_API_URL;
  const [fees, setFees] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [showMonths, setShowMonths] = useState(true);

  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  useEffect(() => {
    if (!user) return;

    const fetchFees = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/fees/${user.id}`);
        if (res.data.success) {
          const feesData = res.data.fees;
          setFees(feesData);

          const today = new Date();
          let lastMonth = today.getMonth() - 1;
          let year = today.getFullYear();
          if (lastMonth < 0) {
            lastMonth = 11;
            year -= 1;
          }
          const hasPaidLastMonth = feesData.some((f) => {
            const fd = new Date(f.payment_date);
            return fd.getMonth() === lastMonth && fd.getFullYear() === year;
          });
          localStorage.setItem("feesPaidLastMonth", hasPaidLastMonth);
        }
      } catch (err) {
        console.log("Error fetching fees:", err);
      }
    };

    fetchFees();
  }, [user, API_URL]);

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });

  const formatTime = (t) => {
    const [h, m] = t.split(":");
    const d = new Date();
    d.setHours(h, m);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const rowColor = (status) => {
    if (status === "Late") return "#ffe6e6";
    if (status === "Early") return "#e6f7ff";
    return "#e7ffe7";
  };

  const filteredFees = selectedMonth === null
    ? []
    : fees.filter((f) => {
        const feeMonth = new Date(f.payment_date).getMonth();
        const nextMonth = (selectedMonth + 1) % 12;
        return feeMonth === nextMonth;
      });

  const handleMonthSelect = (i) => {
    setSelectedMonth(i);
    setShowMonths(false);
  };

  return (
    <div style={styles.page}>
      <h2 style={styles.heading}>
        {showMonths
          ? "Select the Month to View Fees"
          : selectedMonth !== null
          ? `Viewing ${months[selectedMonth]} fees (Paid in ${months[(selectedMonth + 1) % 12]})`
          : "Go Back to Months"}
      </h2>

      {!showMonths && (
        <Link
          onClick={() => setShowMonths(true)}
          style={styles.backButton}
        >
          &larr; Back to Months
        </Link>
      )}

      {showMonths && (
        <div style={styles.monthButtons}>
          {months.map((m, i) => (
            <button
              key={i}
              onClick={() => handleMonthSelect(i)}
              style={{
                ...styles.monthBtn,
                background: selectedMonth === i ? "#1f3c88" : "linear-gradient(135deg, #d5def3, #f0f4fa)",
                color: selectedMonth === i ? "#fff" : "#333",
              }}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      <div style={styles.box}>
        {selectedMonth === null ? (
          <p style={styles.msg}>Select a month to view fee records.</p>
        ) : filteredFees.length === 0 ? (
          <p style={styles.msg}>No records for this month.</p>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="desktop-table" style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeadRow}>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Time</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFees.map((f) => (
                    <tr key={f.id} style={{ background: rowColor(f.status), transition: "0.3s all" }}>
                      <td style={styles.td}>{formatDate(f.payment_date)}</td>
                      <td style={styles.td}>{formatTime(f.payment_time)}</td>
                      <td style={styles.td}>₹ {f.amount}</td>
                      <td style={{ ...styles.td, fontWeight: "700" }}>{f.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="mobile-view" style={styles.mobileList}>
              {filteredFees.map((f) => (
                <div key={f.id} style={{ ...styles.card, background: rowColor(f.status) }}>
                  <p><strong>Date:</strong> {formatDate(f.payment_date)}</p>
                  <p><strong>Time:</strong> {formatTime(f.payment_time)}</p>
                  <p><strong>Amount:</strong> ₹ {f.amount}</p>
                  <p><strong>Status:</strong> {f.status}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <style>
        {`
        @media (max-width: 768px) {
          .desktop-table { display: none; }
          .mobile-view { display: block !important; }
        }
        @media (min-width: 769px) {
          .desktop-table { display: block; }
          .mobile-view { display: none; }
        }
        `}
      </style>
    </div>
  );
};

const styles = {
  page: {
    padding: "30px",
    background: "linear-gradient(to bottom, #f0f4fa, #eef2f7)",
    minHeight: "100vh",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  heading: {
    textAlign: "center",
    color: "#1f3c88",
    fontSize: "28px",
    fontWeight: "700",
    marginBottom: "30px",
    textShadow: "1px 1px 6px rgba(0,0,0,0.1)",
  },
  backButton: {
    margin: "10px auto 25px",
    display: "block",
    padding: "12px 28px",
    background: "#1f3c88",
    color: "#fff",
    borderRadius: "12px",
    textAlign: "center",
    cursor: "pointer",
    fontSize: "16px",
    textDecoration: "none",
    transition: "0.3s all",
  },
  monthButtons: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    maxWidth: "300px",
    margin: "0 auto 30px",
  },
  monthBtn: {
    padding: "16px 28px",
    borderRadius: "14px",
    border: "none",
    fontSize: "18px",
    width: "100%",
    cursor: "pointer",
    fontWeight: "600",
    boxShadow: "0 6px 18px rgba(0,0,0,0.1)",
    transition: "0.3s all",
  },
  box: {
    background: "#fff",
    padding: "25px",
    borderRadius: "18px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
  },
  msg: {
    textAlign: "center",
    color: "#555",
    fontSize: "16px",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "650px",
  },
  tableHeadRow: {
    background: "linear-gradient(90deg, #1f3c88, #4060b0)",
    color: "#fff",
  },
  th: {
    padding: "14px",
    textAlign: "left",
    fontSize: "15px",
    letterSpacing: "0.5px",
  },
  td: {
    padding: "14px",
    borderBottom: "1px solid #ddd",
    fontSize: "15px",
  },
  mobileList: {
    marginTop: "15px",
    display: "none",
  },
  card: {
    padding: "18px",
    borderRadius: "16px",
    marginBottom: "18px",
    boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
    fontSize: "15px",
    transition: "0.3s all",
  },
};

export default StudentFees;
