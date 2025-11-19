import React, { useState, useEffect } from "react";
import axios from "axios";

const StudentFees = ({ user }) => {
  const [fees, setFees] = useState([]);

  useEffect(() => {
    if (!user) return;
    axios
      .get(`http://student-management-system-32lc.onrender.com/api/fees/${user.id}`)
      .then((res) => {
        if (res.data.success) setFees(res.data.fees);
      })
      .catch((err) => console.log("Error fetching fees:", err));
  }, [user]);

  const formatDate = (dateStr) => {
    const options = { year: "numeric", month: "long", day: "numeric" };
    return new Date(dateStr).toLocaleDateString(undefined, options);
  };

  const formatTime = (timeStr) => {
    const [hour, minute] = timeStr.split(":");
    const date = new Date();
    date.setHours(hour, minute);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div style={{ padding: "40px", fontFamily: "Arial, sans-serif", background: "#f9f9f9", minHeight: "100vh" }}>
      <h2 style={{ marginBottom: "25px", color: "#1f3c88", textAlign: "center" }}>Your Fee Records</h2>
      {fees.length === 0 ? (
        <p style={{ textAlign: "center", color: "#555" }}>No records found.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "10px", overflow: "hidden", boxShadow: "0 5px 20px rgba(0,0,0,0.1)" }}>
          <thead>
            <tr style={{ background: "#3959a1", color: "#fff", textAlign: "left" }}>
              <th style={{ padding: "12px 15px" }}>Date</th>
              <th style={{ padding: "12px 15px" }}>Time</th>
              <th style={{ padding: "12px 15px" }}>Amount</th>
              <th style={{ padding: "12px 15px" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {fees.map((f) => (
              <tr
                key={f.id}
                style={{
                  background:
                    f.status === "Late"
                      ? "#f8d7da"
                      : f.status === "Early"
                      ? "#d1ecf1"
                      : "#d4edda",
                  textAlign: "left",
                  fontWeight: "500",
                }}
              >
                <td style={{ padding: "10px 15px" }}>{formatDate(f.payment_date)}</td>
                <td style={{ padding: "10px 15px" }}>{formatTime(f.payment_time)}</td>
                <td style={{ padding: "10px 15px" }}>₹ {f.amount}</td>
                <td style={{ padding: "10px 15px", fontWeight: "600" }}>{f.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default StudentFees;
