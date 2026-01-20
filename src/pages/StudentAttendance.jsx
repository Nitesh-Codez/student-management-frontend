import React, { useEffect, useState } from "react";

const StudentAttendance = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const API_URL = "https://student-management-system-4-hose.onrender.com";

  const [attendance, setAttendance] = useState([]);
  const [month, setMonth] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [percentage, setPercentage] = useState(0);
  const [marks, setMarks] = useState(0);
  const [todayStatus, setTodayStatus] = useState(null);

  const colors = {
    present: "#28a745",
    absent: "#dc3545",
    holiday: "#ffc107",
    notMarked: "#94a3b8",
    primary: "#0f172a",
    accent: "#3b82f6",
    bg: "#ffffff",
    lightRed: "#ffcece", // Absent row ke liye
    todayHighlight: "#b9d3f1" // Today's highlight
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
    const todayStr = today.toDateString();

    let todayRecord = data.find((a) => new Date(a.date).toDateString() === todayStr);
    
    if (y === today.getFullYear() && m === today.getMonth() + 1) {
      if (!todayRecord) {
        todayRecord = { date: today.toISOString(), status: "Not Marked", isToday: true };
        data.push(todayRecord);
      } else {
        // Tagging the existing record as today
        data = data.map(rec => new Date(rec.date).toDateString() === todayStr ? {...rec, isToday: true} : rec);
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
      {/* --- 1. HEADER --- */}
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

      {/* --- 2. HERO SUMMARY --- */}
      <div style={heroCard}>
        <div style={heroText}>
          <div style={classBadge}>Batch: {user?.class || "N/A"}</div>
          <h2 style={{fontSize: '32px', margin: '10px 0 5px 0'}}>{percentage}%</h2>
          <p style={{opacity: 0.7, fontSize: '14px', margin: 0}}>Total Monthly Attendance</p>
          <div style={marksTag}>
            Attendance Marks: <span style={{fontWeight: '800'}}>{marks}</span>
          </div>
        </div>
        
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

      {/* --- 3. QUICK STATS --- */}
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

      {/* --- 4. DATA LOG --- */}
      <div style={logContainer}>
        <div style={logHeader}>
          <h3 style={{margin: 0, fontSize: '16px', fontWeight: '700'}}>Recent Activity</h3>
          <span style={{fontSize: '12px', color: colors.accent, fontWeight: 'bold'}}>
             {todayStatus === "Present" ? "✅ Marked for Today" : todayStatus === "Absent" ? "❌ Absent Today" : "⏳ Today Pending"}
          </span>
        </div>
        
        <div style={listWrapper}>
          {filtered.length === 0 ? (
            <div style={emptyState}>No records discovered for this period.</div>
          ) : (
            [...filtered]
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map((a, i) => {
                const isAbsent = a.status === "Absent";
                const isToday = a.isToday;

                return (
                  <div key={i} style={{
                    ...attendanceItem,
                    backgroundColor: isToday ? colors.todayHighlight : (isAbsent ? colors.lightRed : "transparent"),
                    borderLeft: isToday ? `6px solid ${colors.accent}` : (isAbsent ? `6px solid ${colors.absent}` : "none"),
                    padding: "15px",
                    borderRadius: "12px",
                    boxShadow: isToday ? "0 4px 12px rgba(59, 130, 246, 0.1)" : "none",
                    marginBottom: "8px"
                  }}>
                    <div style={dateSection}>
                      <div style={{...dateText, color: isToday ? colors.accent : "#1e293b"}}>
                        {formatDate(a.date)} {isToday && "(Today)"}
                      </div>
                      <div style={dayText}>{new Date(a.date).toLocaleDateString('en-US', { weekday: 'long' })}</div>
                    </div>
                    <div style={{
                      ...statusPill,
                      backgroundColor: getStatusColor(a.status, colors) + (isToday ? "33" : "15"),
                      color: getStatusColor(a.status, colors),
                      border: `1px solid ${getStatusColor(a.status, colors)}33`,
                      transform: isToday ? "scale(1.1)" : "none"
                    }}>
                      {a.status}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
};

// --- STYLES ---

const pageWrapper = { minHeight: "100vh", width: "100%", background: "#fff", paddingBottom: "100px", fontFamily: "'Inter', sans-serif" };
const headerSection = { padding: "40px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9" };
const mainTitle = { fontSize: "22px", fontWeight: "900", margin: 0 };
const subTitle = { fontSize: "13px", color: "#64748b", margin: "4px 0 0 0" };
const monthPickerWrapper = { background: "#f8fafc", padding: "8px 12px", borderRadius: "10px", border: "1px solid #e2e8f0" };
const monthInput = { border: "none", background: "transparent", fontWeight: "bold", outline: "none", cursor: "pointer" };
const heroCard = { margin: "20px", background: "#0f172a", borderRadius: "24px", padding: "30px", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" };
const heroText = { display: "flex", flexDirection: "column" };
const classBadge = { background: "rgba(255,255,255,0.1)", padding: "4px 10px", borderRadius: "6px", fontSize: "10px", textTransform: "uppercase" };
const marksTag = { marginTop: "12px", fontSize: "12px", background: "#3b82f6", padding: "5px 12px", borderRadius: "20px", width: "fit-content" };
const statsRow = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", margin: "0 20px 30px" };
const statBox = { background: "#fff", padding: "15px", textAlign: "center", borderRadius: "16px", border: "1px solid #f1f5f9", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" };
const statNum = { fontSize: "18px", fontWeight: "900", display: "block" };
const statLabel = { fontSize: "10px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" };
const logContainer = { padding: "0 20px" };
const logHeader = { display: "flex", justifyContent: "space-between", marginBottom: "15px" };
const listWrapper = { display: "flex", flexDirection: "column" };
const attendanceItem = { display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.3s ease" };
const dateSection = { display: "flex", flexDirection: "column" };
const dateText = { fontSize: "14px", fontWeight: "800" };
const dayText = { fontSize: "11px", color: "#94a3b8" };
const statusPill = { padding: "6px 12px", borderRadius: "8px", fontSize: "10px", fontWeight: "900" };
const emptyState = { textAlign: "center", padding: "50px", color: "#cbd5e1", fontStyle: "italic" };

const getStatusColor = (status, colors) => {
  switch (status) {
    case "Present": return colors.present;
    case "Absent": return colors.absent;
    case "Holiday": return colors.holiday;
    default: return colors.notMarked;
  }
};

export default StudentAttendance;