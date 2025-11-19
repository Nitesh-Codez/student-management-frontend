import React, { useState, useEffect } from "react";

const StudentAttendance = ({ user }) => {
  const [attendance, setAttendance] = useState([]);
  const [month, setMonth] = useState(""); // YYYY-MM
  const [filteredAttendance, setFilteredAttendance] = useState([]);
  const [percentage, setPercentage] = useState(0);

  // Fetch attendance
  useEffect(() => {
    if (!user) return;
    fetch(`http://student-management-system-32lc.onrender.com/api/attendance/${user.id}`)
      .then(res => res.json())
      .then(data => setAttendance(data.success ? data.attendance : []))
      .catch(err => console.log(err));
  }, [user]);

  // Auto-select current month
  useEffect(() => {
    const today = new Date();
    const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    setMonth(monthStr);
  }, []);

  // Filter attendance and calculate percentage
  useEffect(() => {
    if (!month) return;
    const [y, m] = month.split("-");
    const filtered = attendance.filter(a => {
      const d = new Date(a.date);
      return d.getFullYear() === +y && d.getMonth() + 1 === +m;
    });
    setFilteredAttendance(filtered);

    const total = filtered.length;
    const presentCount = filtered.filter(r => r.status === "Present").length;
    const absentCount = filtered.filter(r => r.status === "Absent").length;

    let perc = total > 0 ? (presentCount / total) * 100 - absentCount * 0.3 : 0;
    if (perc < 0) perc = 0;
    setPercentage(perc.toFixed(2));
  }, [month, attendance]);

  const getCircleColor = perc =>
    perc >= 85 ? "#28a745" : perc >= 75 ? "#ffc107" : "#dc3545";

  const formatDate = isoDate => {
    const d = new Date(isoDate);
    return `${String(d.getDate()).padStart(2, "0")}/${String(
      d.getMonth() + 1
    ).padStart(2, "0")}/${d.getFullYear()}`;
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
        background: "#f0f2f5",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <h1 style={{ marginBottom: "30px", color: "#343a40" }}>
        Welcome, {user?.name}
      </h1>

      <div style={{ marginBottom: "40px", display: "flex", alignItems: "center" }}>
        <label
          style={{
            marginRight: "15px",
            fontWeight: "bold",
            fontSize: "16px",
            color: "#495057",
          }}
        >
          Select Month:
        </label>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          style={{
            padding: "8px 12px",
            fontSize: "16px",
            borderRadius: "6px",
            border: "1px solid #ced4da",
          }}
        />
      </div>

      {month && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "40px",
            background: "#fff",
            padding: "20px 30px",
            borderRadius: "12px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              backgroundColor: getCircleColor(percentage),
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: "#fff",
              fontWeight: "bold",
              fontSize: "22px",
              boxShadow: "0 0 15px rgba(0,0,0,0.2)",
              marginRight: "25px",
            }}
          >
            {percentage}%
          </div>
          <div style={{ fontSize: "18px", fontWeight: "bold", color: "#495057" }}>
            {filteredAttendance.filter(r => r.status === "Present").length}/
            {filteredAttendance.length} Days Present
          </div>
        </div>
      )}

      {filteredAttendance.length === 0 ? (
        <p style={{ fontSize: "18px", color: "#6c757d" }}>
          No attendance records found for this month.
        </p>
      ) : (
        <div style={{ width: "100%", maxWidth: "700px" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              borderRadius: "10px",
              overflow: "hidden",
              boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
              background: "#fff",
            }}
          >
            <thead style={{ background: "#343a40", color: "#fff" }}>
              <tr>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendance.map((r, index) => (
                <tr
                  key={index}
                  style={{
                    backgroundColor:
                      r.status === "Absent" ? "#f8d7da" : "#d4edda",
                    color: r.status === "Absent" ? "#721c24" : "#155724",
                    fontWeight: "500",
                  }}
                >
                  <td style={tdStyle}>{formatDate(r.date)}</td>
                  <td style={tdStyle}>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const thStyle = {
  border: "1px solid #dee2e6",
  padding: "12px",
  textAlign: "center",
};
const tdStyle = {
  border: "1px solid #dee2e6",
  padding: "12px",
  textAlign: "center",
};

export default StudentAttendance;
