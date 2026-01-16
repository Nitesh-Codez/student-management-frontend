import React, { useEffect, useState } from "react";

const StudentAttendance = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const API_URL = process.env.REACT_APP_API_URL;

  const [attendance, setAttendance] = useState([]);
  const [month, setMonth] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [percentage, setPercentage] = useState(0);
  const [marks, setMarks] = useState(0);
  const [todayStatus, setTodayStatus] = useState(null);

  // 🔵 COLORS
  const colors = {
    present: "#28a745",
    absent: "#dc3545",
    holiday: "#ffc107",
    notMarked: "#6c757d",
    bgCard: "#ffffff",
    primary: "#1f3c88"
  };

  const getPercentageColor = (perc) => {
    if (perc >= 85) return colors.present;
    if (perc >= 75) return colors.holiday;
    return colors.absent;
  };

  useEffect(() => {
    if (!user) return;
    fetch(`${API_URL}/api/attendance/${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setAttendance(data.attendance);
      })
      .catch((err) => console.log("Fetch error:", err));
  }, [user, API_URL]);

  useEffect(() => {
    const today = new Date();
    setMonth(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`);
  }, []);

  useEffect(() => {
    if (!month) return;
    const [y, m] = month.split("-").map(Number);
    let data = attendance.filter((a) => {
      const d = new Date(a.date);
      return d.getFullYear() === y && d.getMonth() + 1 === m;
    });

    const today = new Date();
    if (y === today.getFullYear() && m === today.getMonth() + 1) {
      let todayRecord = data.find((a) => new Date(a.date).toDateString() === today.toDateString());
      if (!todayRecord) {
        todayRecord = { date: today.toISOString(), status: "Not Marked" };
        data.push(todayRecord);
      }
      setTodayStatus(todayRecord.status);
    } else {
      setTodayStatus(null);
    }

    setFiltered(data);

    const validDays = data.filter((a) => a.status === "Present" || a.status === "Absent").length;
    const presentDays = data.filter((a) => a.status === "Present").length;
    const perc = validDays === 0 ? 0 : (presentDays / validDays) * 100;
    setPercentage(perc.toFixed(1));
    setMarks(perc <= 75 ? 0 : Math.ceil((perc - 75) / 5));
  }, [month, attendance]);

  const formatDate = (iso) => {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa", padding: "20px", fontFamily: "'Segoe UI', Roboto, sans-serif" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        
        {/* Updated Header */}
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h1 style={{ color: colors.primary, marginBottom: "5px", fontWeight: "800" }}>Check Your Attendance</h1>
          <p style={{ color: "#444", fontSize: "18px", fontWeight: "500" }}>
            Welcome, <span style={{ color: colors.primary, borderBottom: `2px solid ${colors.primary}` }}>{user?.name || "Student"}</span>
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "25px" }}>
          <div style={{ background: "#fff", padding: "10px 20px", borderRadius: "50px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontWeight: "600", color: "#444" }}>Select Month:</span>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              style={{ border: "none", outline: "none", fontSize: "16px", cursor: "pointer", color: colors.primary, fontWeight: "bold" }}
            />
          </div>
        </div>

        {/* Top Summary Card */}
        <div style={{ background: colors.primary, borderRadius: "20px", padding: "30px", color: "#fff", boxShadow: "0 10px 20px rgba(31, 60, 136, 0.2)", display: "flex", flexWrap: "wrap", justifyContent: "space-around", alignItems: "center", marginBottom: "30px", position: "relative", overflow: "hidden" }}>
          <div style={{ zIndex: 1 }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "24px" }}>{user?.name}</h3>
            <p style={{ opacity: 0.8, margin: 0 }}>Class: {user?.class}</p>
            <div style={{ marginTop: "20px", background: "rgba(255,255,255,0.2)", padding: "10px 20px", borderRadius: "10px", display: "inline-block" }}>
              <span style={{ fontSize: "14px" }}>Attendance Marks: </span>
              <span style={{ fontSize: "20px", fontWeight: "bold" }}>{marks}</span>
            </div>
          </div>

          {/* Thick Perimeter Circle */}
          <div style={{ 
            position: "relative", 
            width: "130px", 
            height: "130px", 
            background: "transparent", 
            borderRadius: "50%", 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center", 
            border: `8px solid ${getPercentageColor(percentage)}`, // Made Border Thicker (8px)
            boxShadow: `inset 0 0 10px rgba(0,0,0,0.1), 0 0 15px ${getPercentageColor(percentage)}44` // Subtle Glow
          }}>
            <div style={{ textAlign: "center" }}>
              <span style={{ fontSize: "28px", fontWeight: "900" }}>{percentage}%</span>
              <br />
              <span style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: "bold" }}>Overall</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "15px", marginBottom: "30px" }}>
          <div style={statBox}>
            <span style={{ color: colors.present, fontSize: "24px", fontWeight: "bold" }}>{filtered.filter(a => a.status === "Present").length}</span>
            <small style={{ color: "#666", fontWeight: "600" }}>Present</small>
          </div>
          <div style={statBox}>
            <span style={{ color: colors.absent, fontSize: "24px", fontWeight: "bold" }}>{filtered.filter(a => a.status === "Absent").length}</span>
            <small style={{ color: "#666", fontWeight: "600" }}>Absent</small>
          </div>
          <div style={statBox}>
            <span style={{ color: colors.holiday, fontSize: "24px", fontWeight: "bold" }}>{filtered.filter(a => a.status === "Holiday").length}</span>
            <small style={{ color: "#666", fontWeight: "600" }}>Holidays</small>
          </div>
          <div style={statBox}>
            <span style={{ color: colors.notMarked, fontSize: "24px", fontWeight: "bold" }}>{todayStatus || "N/A"}</span>
            <small style={{ color: "#666", fontWeight: "600" }}>Today</small>
          </div>
        </div>

        {/* List View */}
        <div style={{ background: "#fff", borderRadius: "20px", padding: "20px", boxShadow: "0 5px 15px rgba(0,0,0,0.05)" }}>
          <h4 style={{ margin: "0 0 20px 0", color: "#333", fontSize: "18px" }}>Daily Attendance Log</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filtered.length === 0 ? (
              <p style={{ textAlign: "center", padding: "20px", color: "#999" }}>No records for this month.</p>
            ) : (
              [...filtered]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map((a, i) => (
                  <div key={i} style={{ ...listItem, borderLeft: `6px solid ${getStatusColor(a.status, colors)}` }}>
                    <div>
                      <div style={{ fontWeight: "bold", color: "#333", fontSize: "16px" }}>{formatDate(a.date)}</div>
                      <small style={{ color: "#888" }}>{new Date(a.date).toLocaleDateString('en-US', { weekday: 'long' })}</small>
                    </div>
                    <div style={{ ...statusBadge, backgroundColor: getStatusColor(a.status, colors) + "15", color: getStatusColor(a.status, colors) }}>
                      {a.status}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Functions & Styles
const getStatusColor = (status, colors) => {
  switch (status) {
    case "Present": return colors.present;
    case "Absent": return colors.absent;
    case "Holiday": return colors.holiday;
    default: return colors.notMarked;
  }
};

const statBox = {
  background: "#fff",
  padding: "15px",
  borderRadius: "15px",
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
  border: "1px solid #eee"
};

const listItem = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "15px 20px",
  background: "#fdfdfd",
  borderRadius: "12px",
  transition: "0.3s",
  border: "1px solid #f0f0f0"
};

const statusBadge = {
  padding: "6px 14px",
  borderRadius: "20px",
  fontSize: "12px",
  fontWeight: "bold",
  textTransform: "uppercase"
};

export default StudentAttendance;