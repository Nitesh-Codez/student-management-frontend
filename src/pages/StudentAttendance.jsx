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
    lightRed: "#ffcccc",   
    lightGreen: "#95ffb1", 
    lightYellow: "#fff5b6",
    todayDefault: "#d1e8ff" 
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

  // Circular Progress Logic
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div style={pageWrapper}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow-x: hidden; width: 100%; -webkit-font-smoothing: antialiased; }
        .progress-ring__circle {
          transition: stroke-dashoffset 0.8s ease-in-out;
          transform: rotate(-90deg);
          transform-origin: 50% 50%;
        }
      `}</style>

      {/* --- REFINED HEADER --- */}
      <div style={headerSection}>
        <div style={{display: 'flex', flexDirection: 'column'}}>
          <span style={headerTag}>SMART STUDENTS CLASSES </span>
          <h1 style={mainTitle}>Attendance</h1>
          <p style={subTitle}>Tracking Attendance for <span style={{fontWeight: '700', color: colors.primary}}>{user?.name}</span></p>
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

      {/* --- HERO SECTION WITH LIVE FILLING CIRCLE --- */}
      <div style={heroCard}>
        <div style={heroText}>
          <div style={classBadge}>Batch: {user?.class || "N/A"}</div>
          <h2 style={{fontSize: '38px', margin: '12px 0 4px 0', fontWeight: '900', letterSpacing: '-1px'}}>{percentage}%</h2>
          <div style={marksLabelLine}>Monthly Attendance Score</div>
        </div>
        
        {/* Animated Circular Progress */}
        <div style={{ position: "relative", width: "110px", height: "110px", display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <svg width="110" height="110">
            {/* Background Circle */}
            <circle
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="8"
              fill="transparent"
              r={radius}
              cx="55"
              cy="55"
            />
            {/* Live Filling Circle */}
            <circle
              className="progress-ring__circle"
              stroke={getPercentageColor(percentage)}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              r={radius}
              cx="55"
              cy="55"
            />
          </svg>
          {/* Marks in Center */}
          <div style={{ position: "absolute", textAlign: "center", display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '24px', fontWeight: '900', color: '#fff', lineHeight: '1' }}>{marks}</span>
            <span style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>Marks</span>
          </div>
        </div>
      </div>

      {/* --- STATS ROW --- */}
      <div style={statsRow}>
        <div style={statBox}>
          <span style={{...statNum, color: colors.present}}>{filtered.filter(a => a.status === "Present").length}</span>
          <span style={statLabel}>Present</span>
        </div>
        <div style={{...statBox, borderLeft: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9'}}>
          <span style={{...statNum, color: colors.absent}}>{filtered.filter(a => a.status === "Absent").length}</span>
          <span style={statLabel}>Absent</span>
        </div>
        <div style={statBox}>
          <span style={{...statNum, color: colors.holiday}}>{filtered.filter(a => a.status === "Holiday").length}</span>
          <span style={statLabel}>Holidays</span>
        </div>
      </div>

      {/* --- LOG SECTION --- */}
      <div style={logContainer}>
        <div style={logHeader}>
          <h3 style={{fontSize: '13px', fontWeight: '900', letterSpacing: '0.5px', color: '#475569'}}>RECENT ACTIVITY</h3>
          <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
             <div style={{width: '6px', height: '6px', borderRadius: '50%', background: todayStatus === "Present" ? colors.present : colors.accent}}></div>
             <span style={{fontSize: '11px', color: colors.accent, fontWeight: '800'}}>
                {todayStatus === "Not Marked" ? "STATUS PENDING" : todayStatus?.toUpperCase()}
             </span>
          </div>
        </div>
        
        <div style={listWrapper}>
          {filtered.length === 0 ? (
            <div style={emptyState}>No attendance records for this month.</div>
          ) : (
            [...filtered]
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map((a, i) => {
                const isAbsent = a.status === "Absent";
                const isPresent = a.status === "Present";
                const isHoliday = a.status === "Holiday";
                const isToday = a.isToday;

                let rowBg = "transparent";
                let leftBorder = "none";

                if (isHoliday) { rowBg = colors.lightYellow; leftBorder = `6px solid ${colors.holiday}`; }
                else if (isToday) {
                    rowBg = isPresent ? colors.lightGreen : (isAbsent ? colors.lightRed : colors.todayDefault);
                    leftBorder = `6px solid ${isPresent ? colors.present : (isAbsent ? colors.absent : colors.accent)}`;
                } else if (isAbsent) { rowBg = colors.lightRed; leftBorder = `6px solid ${colors.absent}`; }

                return (
                  <div key={i} style={{ ...attendanceItem, backgroundColor: rowBg, borderLeft: leftBorder }}>
                    <div style={dateSection}>
                      <div style={{...dateText, color: "#1e293b"}}>
                        {formatDate(a.date)} {isToday && <span style={{color: colors.accent, fontSize: '10px', marginLeft: '4px'}}>• TODAY</span>}
                      </div>
                      <div style={dayText}>{new Date(a.date).toLocaleDateString('en-US', { weekday: 'long' })}</div>
                    </div>
                    <div style={{
                      ...statusPill,
                      backgroundColor: getStatusColor(a.status, colors) + "22",
                      color: getStatusColor(a.status, colors),
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
const pageWrapper = { width: "100%", minHeight: "100vh", background: "#fff", paddingBottom: "60px", overflowX: "hidden" };

const headerSection = { padding: "35px 20px 25px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", width: "100%", borderBottom: "1px solid #f1f5f9" };
const headerTag = {
  background: "linear-gradient(135deg, #0f172a 0%, #334155 100%)",
  color: "#ffffff",
  padding: "6px 15px",
  borderRadius: "12px",
  fontSize: "16px",
  fontWeight: "900",
  width: "fit-content",
  letterSpacing: "2px",
  display: "inline-block",
  whiteSpace: "nowrap" ,
  marginBottom: "10px",
  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.2)",
  textTransform: "uppercase",
  borderLeft: "4px solid #3b82f6"
};
const mainTitle = { fontSize: "28px", fontWeight: "900", margin: 0, color: "#0f172a", lineHeight: '1' };
const subTitle = { fontSize: "20px", color: "#000000", marginTop: "6px" };

const monthPickerWrapper = { background: "#f8fafc", padding: "10px 12px", borderRadius: "12px", border: "1px solid #e2e8f0" };
const monthInput = { border: "none", background: "transparent", fontWeight: "800", outline: "none", fontSize: "13px", color: "#0f172a", cursor: "pointer" };

const heroCard = { width: "100%", background: "#0f172a", padding: "35px 25px", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" };
const heroText = { display: "flex", flexDirection: "column", flex: 1 };
const classBadge = { background: "rgba(255,255,255,0.1)", padding: "5px 10px", borderRadius: "6px", fontSize: "10px", fontWeight: "700", textTransform: "uppercase", width: "fit-content" };
const marksLabelLine = { fontSize: "18px", color: "#5eff00", fontWeight: "500" };

const statsRow = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", width: "100%", background: "#fff", borderBottom: "1px solid #f1f5f9" };
const statBox = { padding: "22px 10px", textAlign: "center" };
const statNum = { fontSize: "22px", fontWeight: "900", display: "block" };
const statLabel = { fontSize: "10px", color: "#64748b", fontWeight: "800", textTransform: "uppercase", marginTop: '4px' };

const logContainer = { width: "100%" };
const logHeader = { padding: "20px", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: 'center', borderBottom: "1px solid #e2e8f0" };
const listWrapper = { display: "flex", flexDirection: "column", width: "100%" };
const attendanceItem = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px", borderBottom: "1px solid #f1f5f9", width: "100%", transition: 'background 0.3s' };
const dateSection = { display: "flex", flexDirection: "column" };
const dateText = { fontSize: "16px", fontWeight: "800", letterSpacing: '-0.2px' };
const dayText = { fontSize: "12px", color: "#94a3b8", fontWeight: '500' };
const statusPill = { padding: "7px 14px", borderRadius: "10px", fontSize: "11px", fontWeight: "900", textTransform: "uppercase", letterSpacing: '0.3px' };
const emptyState = { textAlign: "center", padding: "60px 20px", color: "#cbd5e1", fontWeight: '600', fontSize: '14px' };

const getStatusColor = (status, colors) => {
  switch (status) {
    case "Present": return colors.present;
    case "Absent": return colors.absent;
    case "Holiday": return colors.holiday;
    default: return colors.notMarked;
  }
};

export default StudentAttendance;