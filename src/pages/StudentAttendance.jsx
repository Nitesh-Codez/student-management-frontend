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

  // --- NEW STATES FOR MONTHLY BREAKDOWN & FINAL AVERAGE ---
  const [monthlyBreakdown, setMonthlyBreakdown] = useState([]);
  const [finalAverageMarks, setFinalAverageMarks] = useState(0);

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

    // ----------------------------------------------------
    // DYNAMIC CALCULATION: April se lekar Selected Month tak har month ke marks
    // ----------------------------------------------------
    if (attendance.length > 0) {
      const startMonthIdx = 3; // April (0-indexed)
      const currentYear = y;
      const targetMonthIndex = m - 1; // Selected Month

      let totalCalculatedMarks = 0;
      let monthCountInvolved = 0;
      let tempBreakdown = [];

      const monthNames = [
        "January", "February", "March", "April", "May", "June", 
        "July", "August", "September", "October", "November", "December"
      ];

      // April se lekar chosen month tak har month ka loop chalega
      for (let monthIdx = startMonthIdx; monthIdx <= targetMonthIndex; monthIdx++) {
        const monthData = attendance.filter((a) => {
          const d = new Date(a.date);
          return d.getFullYear() === currentYear && d.getMonth() === monthIdx;
        });

        // Sirf un mahino ko target karenge jinka database me data exist karta hai
        if (monthData.length > 0) {
          const vDays = monthData.filter((a) => a.status === "Present" || a.status === "Absent").length;
          const pDays = monthData.filter((a) => a.status === "Present").length;
          const monthlyPerc = vDays === 0 ? 0 : (pDays / vDays) * 100;
          const monthlyMark = monthlyPerc <= 75 ? 0 : Math.ceil((monthlyPerc - 75) / 5);

          totalCalculatedMarks += monthlyMark;
          monthCountInvolved++;

          tempBreakdown.push({
            monthName: monthNames[monthIdx],
            percentage: monthlyPerc.toFixed(1),
            marks: monthlyMark
          });
        }
      }

      const avgMarks = monthCountInvolved === 0 ? 0 : (totalCalculatedMarks / monthCountInvolved);
      
      setMonthlyBreakdown(tempBreakdown);
      setFinalAverageMarks(avgMarks.toFixed(1));
    }

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
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: "Georgia", "Times New Roman", serif; }
        body { overflow-x: hidden; width: 100%; -webkit-font-smoothing: antialiased; background: #fafafa; }
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
          <h1 style={mainTitle}>Attendance Report</h1>
          <p style={subTitle}>Tracking Attendance for <span style={{color: colors.primary}}>{user?.name}</span></p>
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
          <h2 style={{fontSize: '36px', margin: '12px 0 4px 0', letterSpacing: '-1px', fontWeight: "normal"}}>{percentage}%</h2>
          <div style={marksLabelLine}>Monthly Attendance Score</div>
        </div>
        
        {/* Animated Circular Progress */}
        <div style={{ position: "relative", width: "110px", height: "110px", display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <svg width="110" height="110">
            <circle
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="6"
              fill="transparent"
              r={radius}
              cx="55"
              cy="55"
            />
            <circle
              className="progress-ring__circle"
              stroke={getPercentageColor(percentage)}
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              r={radius}
              cx="55"
              cy="55"
            />
          </svg>
          <div style={{ position: "absolute", textAlign: "center", display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '22px', color: '#fff', lineHeight: '1' }}>{marks}</span>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>Marks</span>
          </div>
        </div>
      </div>

      {/* --- NEW SECTION: CLASSIC MONTHLY BREAKDOWN & FINAL AVERAGE --- */}
      <div style={breakdownContainer}>
        <h3 style={sectionHeading}>Academic Attendance Ledger (From April)</h3>
        <table style={classicTable}>
          <thead>
            <tr>
              <th style={tableTh}>Month</th>
              <th style={tableTh}>Attendance %</th>
              <th style={tableTh}>Scored Marks</th>
            </tr>
          </thead>
          <tbody>
            {monthlyBreakdown.map((item, index) => (
              <tr key={index} style={tableTr}>
                <td style={tableTd}>{item.monthName}</td>
                <td style={tableTd}>{item.percentage}%</td>
                <td style={tableTd}>{item.marks}</td>
              </tr>
            ))}
            <tr style={finalRowStyle}>
              <td colSpan="2" style={{...tableTd, textAlign: "right", fontStyle: "italic"}}>Final Attendance Marks (Average):</td>
              <td style={{...tableTd, color: "#1e3a8a", fontWeight: "600"}}>{finalAverageMarks}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* --- STATS ROW --- */}
      <div style={statsRow}>
        <div style={statBox}>
          <span style={{...statNum, color: colors.present}}>{filtered.filter(a => a.status === "Present").length}</span>
          <span style={statLabel}>Present</span>
        </div>
        <div style={{...statBox, borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0'}}>
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
          <h3 style={{fontSize: '14px', color: '#475569', letterSpacing: '0.5px'}}>RECENT ACTIVITY LOG</h3>
          <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
             <div style={{width: '6px', height: '6px', borderRadius: '50%', background: todayStatus === "Present" ? colors.present : colors.accent}}></div>
             <span style={{fontSize: '11px', color: colors.accent}}>
                {todayStatus === "Not Marked" ? "STATUS PENDING" : todayStatus?.toUpperCase()}
             </span>
          </div>
        </div>
        
        <div style={listWrapper}>
          {filtered.length === 0 ? (
            <div style={emptyState}>No attendance records verified for this month.</div>
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

                if (isHoliday) { rowBg = colors.lightYellow; leftBorder = `4px solid ${colors.holiday}`; }
                else if (isToday) {
                    rowBg = isPresent ? colors.lightGreen : (isAbsent ? colors.lightRed : colors.todayDefault);
                    leftBorder = `4px solid ${isPresent ? colors.present : (isAbsent ? colors.absent : colors.accent)}`;
                } else if (isAbsent) { rowBg = colors.lightRed; leftBorder = `4px solid ${colors.absent}`; }

                return (
                  <div key={i} style={{ ...attendanceItem, backgroundColor: rowBg, borderLeft: leftBorder }}>
                    <div style={dateSection}>
                      <div style={{...dateText, color: "#1e293b"}}>
                        {formatDate(a.date)} {isToday && <span style={{color: colors.accent, fontSize: '11px', marginLeft: '4px'}}>• TODAY</span>}
                      </div>
                      <div style={dayText}>{new Date(a.date).toLocaleDateString('en-US', { weekday: 'long' })}</div>
                    </div>
                    <div style={{
                      ...statusPill,
                      backgroundColor: getStatusColor(a.status, colors) + "15",
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
const pageWrapper = { width: "100%", minHeight: "100vh", background: "#fff", paddingBottom: "60px" };

const headerSection = { padding: "30px 20px 20px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", width: "100%", borderBottom: "1px solid #e2e8f0" };
const headerTag = {
  background: "#0f172a",
  color: "#ffffff",
  padding: "4px 12px",
  borderRadius: "4px",
  fontSize: "12px",
  width: "fit-content",
  letterSpacing: "1px",
  display: "inline-block",
  whiteSpace: "nowrap" ,
  marginBottom: "8px",
  textTransform: "uppercase"
};
const mainTitle = { fontSize: "26px", margin: 0, color: "#0f172a", fontWeight: "normal" };
const subTitle = { fontSize: "16px", color: "#475569", marginTop: "4px" };

const monthPickerWrapper = { background: "#fff", padding: "8px 12px", borderRadius: "4px", border: "1px solid #cbd5e1" };
const monthInput = { 
  border: "none", 
  background: "transparent", 
  outline: "none", 
  fontSize: "13px", 
  color: "#0f172a", 
  cursor: "pointer"
};

const heroCard = { width: "100%", background: "#1e293b", padding: "30px 20px", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" };
const heroText = { display: "flex", flexDirection: "column", flex: 1 };
const classBadge = { background: "rgba(255,255,255,0.15)", padding: "3px 8px", borderRadius: "3px", fontSize: "11px", textTransform: "uppercase", width: "fit-content" };
const marksLabelLine = { fontSize: "15px", color: "#cbd5e1", marginTop: "4px" };

// --- NEW CLASSIC TABLE STYLES ---
const breakdownContainer = { padding: "25px 20px", background: "#fff", borderBottom: "1px solid #e2e8f0" };
const sectionHeading = { fontSize: "16px", color: "#0f172a", marginBottom: "12px", fontWeight: "normal", fontStyle: "italic" };
const classicTable = { width: "100%", borderCollapse: "collapse", fontSize: "14px", textAlign: "left" };
const tableTh = { borderBottom: "2px solid #0f172a", padding: "8px 10px", color: "#0f172a", fontWeight: "600" };
const tableTr = { borderBottom: "1px solid #e2e8f0" };
const tableTd = { padding: "10px", color: "#334155" };
const finalRowStyle = { background: "#f8fafc", borderTop: "2px dashed #0f172a" };

const statsRow = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", width: "100%", background: "#fff", borderBottom: "1px solid #e2e8f0" };
const statBox = { padding: "16px 10px", textAlign: "center" };
const statNum = { fontSize: "20px", display: "block" };
const statLabel = { fontSize: "11px", color: "#64748b", textTransform: "uppercase", marginTop: '2px' };

const logContainer = { width: "100%" };
const logHeader = { padding: "16px 20px", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: 'center', borderBottom: "1px solid #e2e8f0" };
const listWrapper = { display: "flex", flexDirection: "column", width: "100%" };
const attendanceItem = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #e2e8f0", width: "100%" };
const dateSection = { display: "flex", flexDirection: "column" };
const dateText = { fontSize: "15px" };
const dayText = { fontSize: "12px", color: "#64748b" };
const statusPill = { padding: "4px 10px", borderRadius: "4px", fontSize: "11px", textTransform: "uppercase" };
const emptyState = { textAlign: "center", padding: "40px 20px", color: "#94a3b8", fontStyle: 'italic', fontSize: '14px' };

const getStatusColor = (status, colors) => {
  switch (status) {
    case "Present": return colors.present;
    case "Absent": return colors.absent;
    case "Holiday": return colors.holiday;
    default: return colors.notMarked;
  }
};

export default StudentAttendance;