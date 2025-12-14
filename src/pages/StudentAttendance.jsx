import React, { useEffect, useState } from "react";

const StudentAttendance = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const API_URL = process.env.REACT_APP_API_URL;

  const [attendance, setAttendance] = useState([]);
  const [month, setMonth] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [percentage, setPercentage] = useState(0);
  const [todayStatus, setTodayStatus] = useState(null);

  // 🔵 COLOR LOGIC
  const getCircleColor = (perc, absentCount, total) => {
    if (total === 0) return "#f8f1e4"; // NEW MONTH → CREAM
    if (perc >= 85) return "#18a539ff"; // GREEN
    if (perc >= 75 && perc < 85) return "#b8ff11ff"; // YELLOW
    return "#ff0606ff"; // RED
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

  // 📌 FILTER MONTH + CALCULATE % + TODAY STATUS
  useEffect(() => {
    if (!month) return;

    const [y, m] = month.split("-");
    let data = attendance.filter((a) => {
      const d = new Date(a.date);
      return d.getFullYear() === +y && d.getMonth() + 1 === +m;
    });

    const today = new Date();
    let todayRecord = data.find(
      (a) => new Date(a.date).toDateString() === today.toDateString()
    );

    // If today's attendance not marked, add as "Not Marked"
    if (!todayRecord) {
      todayRecord = { date: today.toISOString(), status: "Not Marked" };
      data.push(todayRecord);
    }

    setTodayStatus(todayRecord.status);
    setFiltered(data);

    // ✅ Only count Present/Absent for percentage, ignore Holidays & Not Marked
    const validDays = data.filter(
      (a) => a.status === "Present" || a.status === "Absent"
    ).length;
    const presentDays = data.filter((a) => a.status === "Present").length;
    setPercentage(validDays === 0 ? 0 : ((presentDays / validDays) * 100).toFixed(2));
  }, [month, attendance]);

  const formatDate = (iso) => {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")}/${String(
      d.getMonth() + 1
    ).padStart(2, "0")}/${d.getFullYear()}`;
  };

  const absentCount = filtered.filter((a) => a.status === "Absent").length;

  // LIGHT COLORS FOR TODAY'S CIRCLE
  const getTodayCircleColor = (status) => {
    if (status === "Present") return "#35bc47ff"; // LIGHT GREEN
    if (status === "Absent") return "#ff0000ff";  // LIGHT RED
    if (status === "Holiday") return "#ffd500ff"; // YELLOW for holiday
    return "#d6d6d6"; // LIGHT GREY → Not Marked
  };

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
        style={{ textAlign: "center", marginBottom: "20px", color: "#1f3c88" }}
      >
        See your Attendance dear Student
      </h2>

      {/* Month Selector */}
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

      {/* Overall Card */}
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

        <div
          style={{
            marginTop: "20px",
            display: "flex",
            gap: "25px",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {/* Overall Circle */}
          <div
            style={{
              width: "110px",
              height: "110px",
              borderRadius: "50%",
              background: getCircleColor(percentage, absentCount, filtered.length),
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

          {/* Present/Total */}
          <div style={{ fontSize: "18px", fontWeight: "bold", color: "#495057" }}>
            {filtered.filter((a) => a.status === "Present").length}/
            {filtered.filter((a) => a.status === "Present" || a.status === "Absent").length} Days Present
          </div>
        </div>
      </div>

      {/* Today's Attendance Strip */}
      {todayStatus && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "10px",
            marginBottom: "15px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: getTodayCircleColor(todayStatus),
              boxShadow: "0 0 10px rgba(0,0,0,0.1)",
            }}
          ></div>
          <span style={{ fontWeight: "bold", fontSize: "16px" }}>
            Today's Attendance: {todayStatus}
          </span>
        </div>
      )}

      {/* Attendance Table */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "50%",
            tableLayout: "fixed",
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
                        a.status === "Absent"
                          ? "#de5b66ff"
                          : a.status === "Not Marked"
                          ? "#d6d6d6ff"
                          : a.status === "Holiday"
                          ? "#fee254ff"
                          : "#d8f5c6ff",
                      color:
                        a.status === "Absent"
                          ? "#721c24"
                          : a.status === "Not Marked"
                          ? "#495057"
                          : a.status === "Holiday"
                          ? "#3d3d00"
                          : "#155724",
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
