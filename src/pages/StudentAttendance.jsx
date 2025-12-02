import React, { useEffect, useState } from "react";

const StudentAttendance = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const API_URL = process.env.REACT_APP_API_URL;

  const [attendance, setAttendance] = useState([]);
  const [month, setMonth] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [percentage, setPercentage] = useState(0);

  // 🔵 COLOR LOGIC
  const getCircleColor = (perc, absentCount, total) => {
    if (total === 0) return "#f8f1e4"; // NEW MONTH → CREAM
    if (perc >= 85) return "#28a745"; // GREEN
    if (perc <= 75) return "#e70303ff"; // YELLOW
    return "#40ff06ff"; // LOW %
  };

  // 📌 FETCH ALL STUDENT ATTENDANCE
  useEffect(() => {
    if (!user) return;

    fetch(`${API_URL}/api/attendance/${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setAttendance(data.attendance);
      })
      .catch((err) => console.log("Fetch error:", err));
  }, [user, API_URL]);

  // 📌 AUTO SET CURRENT MONTH
  useEffect(() => {
    const today = new Date();
    const m = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
    setMonth(m);
  }, []);

  // 📌 FILTER MONTH + CALCULATE %
  useEffect(() => {
    if (!month) return;

    const [y, m] = month.split("-");

    const data = attendance.filter((a) => {
      const d = new Date(a.date);
      return d.getFullYear() === +y && d.getMonth() + 1 === +m;
    });

    setFiltered(data);

    const total = data.length;
    const present = data.filter((a) => a.status === "Present").length;

    if (total === 0) {
      setPercentage(0);
      return;
    }

    const perc = ((present / total) * 100).toFixed(2);
    setPercentage(perc);
  }, [month, attendance]);

  const formatDate = (iso) => {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")}/${String(
      d.getMonth() + 1
    ).padStart(2, "0")}/${d.getFullYear()}`;
  };

  const absentCount = filtered.filter((a) => a.status === "Absent").length;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "900px",
        margin: "0 auto",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h2
        style={{
          textAlign: "center",
          marginBottom: "20px",
          color: "#1f3c88",
        }}
      >
        See your Attendance dear Student 
      </h2>

      {/* Month */}
      <div
        style={{
          marginBottom: "25px",
          display: "flex",
          gap: "15px",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <label style={{ fontWeight: "bold" }}>Current Month:</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{
            padding: "8px 12px",
            fontSize: "16px",
            borderRadius: "6px",
            border: "1px solid #ced4da",
          }}
        />
      </div>

      {/* Card */}
      <div
        style={{
          background: "#f1f5ff",
          padding: "20px",
          borderRadius: "10px",
          marginBottom: "25px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
        }}
      >
        <p>
          <strong>Name:</strong> {user?.name}
        </p>
        <p>
          <strong>Class:</strong> {user?.class}
        </p>

        {/* Circle */}
        <div
          style={{
            marginTop: "20px",
            display: "flex",
            gap: "25px",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: "110px",
              height: "110px",
              borderRadius: "50%",
              background: getCircleColor(
                percentage,
                absentCount,
                filtered.length
              ),
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: "#fff",
              fontWeight: "bold",
              fontSize: "22px",
              boxShadow: "0 0 15px rgba(0,0,0,0.2)",
            }}
          >
            {filtered.length === 0 ? "0%" : `${percentage}%`}
          </div>

          <div
            style={{
              fontSize: "18px",
              fontWeight: "bold",
              color: "#495057",
            }}
          >
            {filtered.filter((a) => a.status === "Present").length}/
            {filtered.length} Days Present
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "50%",
            tableLayout:"fixed",
            borderCollapse: "collapse",
            minWidth: "600px",
            borderRadius: "10px",
            overflow: "hidden",
            boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
          }}
        >
          <thead>
            <tr style={{ background: "#1f3c88", color: "#fff" }}>
              <th style={th}>Date</th>
              <th style={th}>Status</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="2" style={{ textAlign: "center", padding: "20px" }}>
                  No attendance records found.
                </td>
              </tr>
            ) : (
              [...filtered]
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .map((a, i) => (
                  <tr
                    key={i}
                    style={{
                      background:
                        a.status === "Absent" ? "#de5b66ff" : "#d8f5c6ff",
                      color: a.status === "Absent" ? "#721c24" : "#155724",
                      fontWeight: "500",
                    }}
                  >
                    <td style={td}>{formatDate(a.date)}</td>
                    <td style={td}>{a.status}</td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const th = {
  padding: "15px",
  border: "1px solid #ddd",
  textAlign: "center",
};

const td = {
  padding: "10px",
  border: "1px solid #866868ff",
  textAlign: "center",
};

export default StudentAttendance;
