import React, { useState, useEffect } from "react";
import axios from "axios";

const StudentFees = ({ user }) => {
  const API_URL = process.env.REACT_APP_API_URL;
  const [fees, setFees] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);

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

          // ⭐ Store last-month fee status
          const today = new Date();
          let lastMonth = today.getMonth() - 1;
          let year = today.getFullYear();

          if (lastMonth < 0) {
            lastMonth = 11;
            year = year - 1;
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
    new Date(d).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const formatTime = (t) => {
    const [h, m] = t.split(":");
    const d = new Date();
    d.setHours(h, m);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const rowColor = (status) => {
    if (status === "Late") return "#ffe6e9";
    if (status === "Early") return "#e6f7fb";
    return "#e7ffed";
  };

  // ⭐⭐ NEW LOGIC: Show next month’s fee when user clicks a month
  const filteredFees =
    selectedMonth === null
      ? []
      : fees.filter((f) => {
          const paidMonth = new Date(f.payment_date).getMonth();
          const nextMonth = (selectedMonth + 1) % 12;
          return paidMonth === nextMonth;
        });

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>Your Fee Records</h2>

      <div style={styles.monthGrid}>
        {months.map((m, i) => (
          <button
            key={i}
            onClick={() => setSelectedMonth(i)}
            style={{
              ...styles.monthButton,
              background: selectedMonth === i ? "#1f3c88" : "#d5def3",
              color: selectedMonth === i ? "white" : "#333",
            }}
          >
            {m}
          </button>
        ))}
      </div>

      <div style={styles.box}>
        {selectedMonth === null ? (
          <p style={styles.msg}>Select a month to view fee records.</p>
        ) : filteredFees.length === 0 ? (
          <p style={styles.msg}>No records for this month.</p>
        ) : (
          <>
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
                    <tr key={f.id} style={{ background: rowColor(f.status) }}>
                      <td style={styles.td}>{formatDate(f.payment_date)}</td>
                      <td style={styles.td}>{formatTime(f.payment_time)}</td>
                      <td style={styles.td}>₹ {f.amount}</td>
                      <td style={{ ...styles.td, fontWeight: "700" }}>
                        {f.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mobile-view" style={styles.mobileList}>
              {filteredFees.map((f) => (
                <div
                  key={f.id}
                  style={{
                    ...styles.card,
                    background: rowColor(f.status),
                  }}
                >
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
    padding: "20px",
    background: "#eef2f7",
    minHeight: "100vh",
    fontFamily: "Arial, sans-serif",
  },
  title: {
    textAlign: "center",
    color: "#1f3c88",
    marginBottom: "20px",
  },
  monthGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "10px",
    marginBottom: "25px",
  },
  monthButton: {
    padding: "10px",
    borderRadius: "8px",
    border: "none",
    fontWeight: "600",
    cursor: "pointer",
    transition: "0.2s",
  },
  box: {
    background: "#fff",
    padding: "15px",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
  },
  msg: {
    textAlign: "center",
    color: "#777",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "600px",
  },
  tableHeadRow: {
    background: "#1f3c88",
    color: "white",
  },
  th: {
    padding: "12px",
    textAlign: "left",
    fontSize: "14px",
  },
  td: {
    padding: "12px",
    borderBottom: "1px solid #ddd",
    fontSize: "14px",
  },
  mobileList: {
    marginTop: "10px",
    display: "none",
  },
  card: {
    padding: "12px",
    borderRadius: "10px",
    marginBottom: "12px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
    fontSize: "15px",
  },
};

export default StudentFees;
