import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const StudentFees = ({ user }) => {
  const API_URL = process.env.REACT_APP_API_URL;
  const [fees, setFees] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [showMonths, setShowMonths] = useState(true); // Show/hide month buttons

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

          // Store last-month fee status
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

  // Filter fees for the NEXT month of selected month
  const filteredFees =
    selectedMonth === null
      ? []
      : fees.filter((f) => {
          const feeMonth = new Date(f.payment_date).getMonth();
          const nextMonth = (selectedMonth + 1) % 12; // next month logic
          return feeMonth === nextMonth;
        });

  // Update month selection handler
  const handleMonthSelect = (i) => {
    setSelectedMonth(i);
    setShowMonths(false); // Hide months after selection
  };

  return (
    <div style={styles.page}>
      {/* Dynamic Heading */}
      <h2 style={styles.heading}>
        {showMonths
          ? "Select the Month for Fee"
          : selectedMonth !== null
          ? `You are viewing your ${months[selectedMonth]} fees (which have been paid in  ${months[(selectedMonth + 1) % 12]})`
          : "Go Back to Months"}
      </h2>

      {/* Show Months Button */}
      {!showMonths && (
        <Link
          onClick={() => setShowMonths(true)}
          style={{
            margin: "15px auto",
            display: "block",
            padding: "12px 24px",
            background: "#1f3c88",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          Please click here for viewing the lists of Months
        </Link>
      )}

      {/* Vertical Month Buttons */}
      {showMonths && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: "12px",
            marginBottom: "20px",
            width: "100%",
            maxWidth: "250px",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {months.map((m, i) => (
            <button
              key={i}
              onClick={() => handleMonthSelect(i)}
              style={{
                padding: "16px 28px",
                background: selectedMonth === i ? "#1f3c88" : "#d5def3",
                color: selectedMonth === i ? "#fff" : "#333",
                borderRadius: "8px",
                border: "none",
                fontSize: "18px",
                width: "100%",
                cursor: "pointer",
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
                    <tr key={f.id} style={{ background: rowColor(f.status) }}>
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

      {/* Media Queries */}
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
  heading: {
    textAlign: "center",
    color: "#1f3c88",
    fontSize: "24px",
    marginBottom: "20px",
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
