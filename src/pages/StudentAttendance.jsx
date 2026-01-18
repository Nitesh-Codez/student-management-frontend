import React, { useEffect, useState, useCallback } from "react";

const StudentAttendance = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const API_URL = process.env.REACT_APP_API_URL;

  const [attendance, setAttendance] = useState([]);
  const [month, setMonth] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [percentage, setPercentage] = useState(0);
  const [marks, setMarks] = useState(0);
  const [todayStatus, setTodayStatus] = useState(null);

  // 🔵 PREMIUM COLOR PALETTE
  const colors = {
   present: "#28a745",  // <--- Ye raha aapka Green color code
  absent: "#dc3545",
  holiday: "#ffc107", // Amber
    notMarked: "#94a3b8", 
    primary: "#0f172a", // Navy Blue (Big Company Style)
    accent: "#3b82f6",  // Royal Blue
    bg: "#ffffff"
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
    <div style={pageWrapper}>
      {/* --- 1. MINIMALIST HEADER --- */}
      <div style={headerSection}>
        <div>
          <h1 style={mainTitle}>Attendance Analytics</h1>
          <p style={subTitle}>Tracking performance for <span style={{color: colors.accent, fontWeight: '700'}}>{user?.name}</span></p>
        </div>
        <div style={monthPickerWrapper}>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={monthInput}
          />
        </div>
      </div>

      {/* --- 2. HERO SUMMARY (Edge-to-Edge feel) --- */}
      <div style={heroCard}>
        <div style={heroText}>
          <div style={classBadge}>Batch: {user?.class || "N/A"}</div>
          <h2 style={{fontSize: '32px', margin: '10px 0 5px 0'}}>{percentage}%</h2>
          <p style={{opacity: 0.7, fontSize: '14px', margin: 0}}>Total Monthly Attendance</p>
          <div style={marksTag}>
            Attendance Marks: <span style={{fontWeight: '800'}}>{marks}</span>
          </div>
        </div>
        
        {/* Progress Ring */}
        <div style={{
          width: "110px", height: "110px", borderRadius: "50%",
          border: `10px solid ${getPercentageColor(percentage)}`,
          display: "flex", justifyContent: "center", alignItems: "center",
          boxShadow: `0 0 20px ${getPercentageColor(percentage)}44`,
          background: 'rgba(255,255,255,0.05)'
        }}>
          <span style={{fontSize: '20px', fontWeight: '800'}}>{marks}Marks</span>
        </div>
      </div>

      {/* --- 3. QUICK STATS BAR --- */}
      <div style={statsRow}>
        <div style={statBox}>
          <span style={{...statNum, color: colors.present}}>{filtered.filter(a => a.status === "Present").length}</span>
          <span style={statLabel}>Present</span>
        </div>
        <div style={statBox}>
          <span style={{...statNum, color: colors.absent}}>{filtered.filter(a => a.status === "Absent").length}</span>
          <span style={statLabel}>Absent</span>
        </div>
        <div style={statBox}>
          <span style={{...statNum, color: colors.holiday}}>{filtered.filter(a => a.status === "Holiday").length}</span>
          <span style={statLabel}>Holidays</span>
        </div>
      </div>

      {/* --- 4. DATA LOG (Full Edge-to-Edge) --- */}
      <div style={logContainer}>
        <div style={logHeader}>
          <h3 style={{margin: 0, fontSize: '16px', fontWeight: '700'}}>Recent Activity</h3>
          <span style={{fontSize: '12px', color: colors.accent}}>Today: {todayStatus || "Pending"}</span>
        </div>
        
        <div style={listWrapper}>
          {filtered.length === 0 ? (
            <div style={emptyState}>No records discovered for this period.</div>
          ) : (
            [...filtered]
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map((a, i) => (
                <div key={i} style={attendanceItem}>
                  <div style={dateSection}>
                    <div style={dateText}>{formatDate(a.date)}</div>
                    <div style={dayText}>{new Date(a.date).toLocaleDateString('en-US', { weekday: 'long' })}</div>
                  </div>
                  <div style={{
                    ...statusPill,
                    backgroundColor: getStatusColor(a.status, colors) + "15",
                    color: getStatusColor(a.status, colors),
                    border: `1px solid ${getStatusColor(a.status, colors)}33`
                  }}>
                    {a.status}
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      <style>{`
        body { margin: 0; background: #fff; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
};

// --- STYLING (The "Wow" Factor) ---

const pageWrapper = {
  minHeight: "100vh",
  width: "100vw",
  background: "#fff",
  padding: "0 0 50px 0",
  fontFamily: "'Inter', sans-serif",
  color: "#0f172a"
};

const headerSection = {
  padding: "40px 30px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  borderBottom: "1px solid #f1f5f9"
};

const mainTitle = { fontSize: "24px", fontWeight: "800", margin: 0, letterSpacing: "-0.5px" };
const subTitle = { fontSize: "14px", color: "#64748b", margin: "5px 0 0 0" };

const monthPickerWrapper = {
  background: "#f1f5f9",
  padding: "8px 15px",
  borderRadius: "12px",
  border: "1px solid #e2e8f0"
};

const monthInput = {
  border: "none",
  background: "transparent",
  fontWeight: "700",
  fontSize: "14px",
  color: "#0f172a",
  outline: "none"
};

const heroCard = {
  margin: "30px",
  background: "#0f172a",
  borderRadius: "24px",
  padding: "40px",
  color: "#fff",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  boxShadow: "0 20px 40px rgba(15, 23, 42, 0.2)"
};

const heroText = { display: "flex", flexDirection: "column" };

const classBadge = {
  background: "rgba(255,255,255,0.1)",
  padding: "4px 12px",
  borderRadius: "8px",
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "1px",
  width: "fit-content"
};

const marksTag = {
  marginTop: "15px",
  fontSize: "13px",
  background: "#3b82f6",
  padding: "6px 12px",
  borderRadius: "30px",
  width: "fit-content"
};

const statsRow = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: "1px",
  background: "#f1f5f9",
  margin: "0 30px 40px 30px",
  borderRadius: "20px",
  overflow: "hidden",
  border: "1px solid #f1f5f9"
};

const statBox = {
  background: "#fff",
  padding: "20px",
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  gap: "5px"
};

const statNum = { fontSize: "20px", fontWeight: "800" };
const statLabel = { fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "600" };

const logContainer = { padding: "0 30px" };
const logHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px"
};

const listWrapper = { display: "flex", flexDirection: "column", gap: "12px" };

const attendanceItem = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "15px 0",
  borderBottom: "1px solid #f1f5f9"
};

const dateSection = { display: "flex", flexDirection: "column" };
const dateText = { fontSize: "15px", fontWeight: "700", color: "#1e293b" };
const dayText = { fontSize: "12px", color: "#94a3b8" };

const statusPill = {
  padding: "6px 16px",
  borderRadius: "10px",
  fontSize: "11px",
  fontWeight: "800",
  textTransform: "uppercase"
};

const emptyState = {
  textAlign: "center",
  padding: "40px",
  color: "#94a3b8",
  fontSize: "14px",
  fontStyle: "italic"
};

const getStatusColor = (status, colors) => {
  switch (status) {
    case "Present": return colors.present;
    case "Absent": return colors.absent;
    case "Holiday": return colors.holiday;
    default: return colors.notMarked;
  }
};

export default StudentAttendance;