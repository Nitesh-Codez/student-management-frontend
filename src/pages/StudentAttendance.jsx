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

  // --- MONTHLY BREAKDOWN & FINAL AVERAGE STATES ---
  const [monthlyBreakdown, setMonthlyBreakdown] = useState([]);
  const [finalAverageMarks, setFinalAverageMarks] = useState(0);

  const colors = {
    present: "#1e7e34",
    absent: "#bd2130",
    holiday: "#d39e00",
    notMarked: "#64748b",
    primary: "#0f172a",
    accent: "#1e40af",
    bg: "#f8fafc",
    border: "#cbd5e1",
    lightRed: "#fef2f2",   
    lightGreen: "#f0fdf4", 
    lightYellow: "#fef9c3",
    todayDefault: "#eff6ff" 
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

  // Fetch cumulative attendance average from backend
  useEffect(() => {
    if (!user) return;

    fetch(
        `${API_URL}/api/new-marks/attendance/current-marks?studentId=${user.id}`
    )
    .then(res => res.json())
    .then(data => {
        if(data.success){
            setFinalAverageMarks(data.attendanceMarks);
        }
    })
    .catch(console.error);

  }, [user]);

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

    // Dynamic calculation for Month-wise Breakdown UI
    if (attendance.length > 0) {
      const startMonthIdx = 3; // April (0-indexed)
      const currentYear = y;
      const targetMonthIndex = m - 1; 
      let tempBreakdown = [];

      const monthNames = [
        "January", "February", "March", "April", "May", "June", 
        "July", "August", "September", "October", "November", "December"
      ];

      for (let monthIdx = startMonthIdx; monthIdx <= targetMonthIndex; monthIdx++) {
        const monthData = attendance.filter((a) => {
          const d = new Date(a.date);
          return d.getFullYear() === currentYear && d.getMonth() === monthIdx;
        });

        if (monthData.length > 0) {
          const vDays = monthData.filter((a) => a.status === "Present" || a.status === "Absent").length;
          const pDays = monthData.filter((a) => a.status === "Present").length;
          const monthlyPerc = vDays === 0 ? 0 : (pDays / vDays) * 100;
          const monthlyMark = monthlyPerc <= 75 ? 0 : Math.ceil((monthlyPerc - 75) / 5);

          tempBreakdown.push({
            monthName: monthNames[monthIdx],
            percentage: monthlyPerc.toFixed(1),
            marks: monthlyMark
          });
        }
      }
      setMonthlyBreakdown(tempBreakdown);
    }

  }, [month, attendance]);

  const formatDate = (iso) => {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div style={pageWrapper}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: "Georgia", "Times New Roman", serif; }
        body { background-color: #ffffff; color: #1e293b; -webkit-font-smoothing: antialiased; }
        .progress-ring__circle {
          transition: stroke-dashoffset 0.8s ease-in-out;
          transform: rotate(-90deg);
          transform-origin: 50% 50%;
        }
        
        /* MOBILE VIEW ME EDGE TO EDGE FIT KARNE KE LIYE MEDIA QUERY */
        @media (max-width: 768px) {
          .main-page-wrapper {
            padding: 0px !important; /* Mobile padding hatane ke liye */
          }
          .content-container {
            max-width: 100% !important;
            border-radius: 0px !important; /* Mobile me sharp corners edge to edge */
            box-shadow: none !important;
          }
          .header-section-layout {
            padding: 25px 15px 20px 15px !important;
          }
          .hero-card-layout {
            padding: 30px 15px !important;
          }
          .breakdown-table-container {
            padding: 25px 15px !important;
          }
          .activity-log-header {
            padding: 16px 15px !important;
          }
          .activity-log-item {
            padding: 16px 15px !important;
          }
        }
      `}</style>

      {/* Added class 'main-page-wrapper' to handle dynamic mobile padding */}
      <div className="main-page-wrapper" style={pageWrapperStyleInner}>
        
        {/* Added class 'content-container' to collapse styles on mobile device screens */}
        <div className="content-container" style={containerLayout}>
          
          {/* --- REFINED HEADER --- */}
          <div className="header-section-layout" style={headerSection}>
            <div style={{display: 'flex', flexDirection: 'column'}}>
              <span style={headerTag}>Smart Students Classes</span>
              <h1 style={mainTitle}>Attendance Ledger & Performance Report</h1>
              <p style={subTitle}>Academic Record for: <span style={{color: colors.primary, fontStyle: 'italic'}}>{user?.name}</span></p>
            </div>
            <div style={monthPickerWrapper}>
              <label style={pickerLabel}>Select Month: </label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                style={monthInput}
              />
            </div>
          </div>

          {/* --- HERO DASHBOARD SECTION --- */}
          <div className="hero-card-layout" style={heroCard}>
            <div style={heroText}>
              <div style={classBadge}>Current Batch: {user?.class || "N/A"}</div>
              <h2 style={{fontSize: '38px', margin: '14px 0 6px 0', fontWeight: "normal"}}>{percentage}%</h2>
              <div style={marksLabelLine}>Monthly Attendance Percentage</div>
            </div>
            
            {/* Animated Circular Progress */}
            <div style={{ position: "relative", width: "110px", height: "110px", display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <svg width="110" height="110">
                <circle
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="5"
                  fill="transparent"
                  r={radius}
                  cx="55"
                  cy="55"
                />
                <circle
                  className="progress-ring__circle"
                  stroke={getPercentageColor(percentage)}
                  strokeWidth="5"
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
                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginTop: '2px' }}>Marks</span>
              </div>
            </div>
          </div>

          {/* --- PERFORMANCE BREAKDOWN TABLE --- */}
          <div className="breakdown-table-container" style={breakdownContainer}>
            <h3 style={sectionHeading}>Progressive Term Performance Breakdown (Since April)</h3>
            <div style={{overflowX: 'auto'}}>
              <table style={classicTable}>
                <thead>
                  <tr>
                    <th style={tableTh}>Month Sequence</th>
                    <th style={{...tableTh, textAlign: 'center'}}>Attendance Performance</th>
                    <th style={{...tableTh, textAlign: 'right'}}>Earned Marks Score</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyBreakdown.map((item, index) => (
                    <tr key={index} style={tableTr}>
                      <td style={tableTd}>{item.monthName}</td>
                      <td style={{...tableTd, textAlign: 'center'}}>{item.percentage}%</td>
                      <td style={{...tableTd, textAlign: 'right', paddingRight: '20px'}}>{item.marks}</td>
                    </tr>
                  ))}
                  <tr style={finalRowStyle}>
                    <td colSpan="2" style={{...tableTd, textAlign: "right", fontStyle: "italic", fontWeight: "normal"}}>Cumulative Attendance Marks Average:</td>
                    <td style={{...tableTd, textAlign: "right", color: "#1e40af", fontWeight: "bold", fontSize: "16px", paddingRight: '20px'}}>{finalAverageMarks}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* --- MONTHLY STATISTICS GRID --- */}
          <div style={statsRow}>
            <div style={statBox}>
              <span style={{...statNum, color: colors.present}}>{filtered.filter(a => a.status === "Present").length}</span>
              <span style={statLabel}>Days Present</span>
            </div>
            <div style={{...statBox, borderLeft: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}`}}>
              <span style={{...statNum, color: colors.absent}}>{filtered.filter(a => a.status === "Absent").length}</span>
              <span style={statLabel}>Days Absent</span>
            </div>
            <div style={statBox}>
              <span style={{...statNum, color: colors.holiday}}>{filtered.filter(a => a.status === "Holiday").length}</span>
              <span style={statLabel}>Holidays / Off</span>
            </div>
          </div>

          {/* --- DAILY ACTIVITY LOG --- */}
          <div style={logContainer}>
            <div className="activity-log-header" style={logHeader}>
              <h3 style={{fontSize: '15px', color: '#334155', fontWeight: "normal", fontStyle: 'italic'}}>Detailed Attendance Log (Current Month)</h3>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                 <div style={{width: '7px', height: '7px', borderRadius: '50%', background: todayStatus === "Present" ? colors.present : colors.accent}}></div>
                 <span style={{fontSize: '12px', color: colors.accent, letterSpacing: '0.5px'}}>
                    {todayStatus === "Not Marked" ? "STATUS PENDING" : todayStatus?.toUpperCase()}
                 </span>
              </div>
            </div>
            
            <div style={listWrapper}>
              {filtered.length === 0 ? (
                <div style={emptyState}>No attendance entries log found for the selected month.</div>
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
                      <div key={i} className="activity-log-item" style={{ ...attendanceItem, backgroundColor: rowBg, borderLeft: leftBorder }}>
                        <div style={dateSection}>
                          <div style={{...dateText, color: "#0f172a"}}>
                            {formatDate(a.date)} {isToday && <span style={{color: colors.accent, fontSize: '11px', fontStyle: 'italic', marginLeft: '6px'}}>• TODAY</span>}
                          </div>
                          <div style={dayText}>{new Date(a.date).toLocaleDateString('en-US', { weekday: 'long' })}</div>
                        </div>
                        <div style={{
                          ...statusPill,
                          backgroundColor: getStatusColor(a.status, colors) + "12",
                          color: getStatusColor(a.status, colors),
                          border: `1px solid ${getStatusColor(a.status, colors)}33`
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

      </div>
    </div>
  );
};

// --- STYLES CONFIG ---
const pageWrapper = { width: "100%", minHeight: "100vh", backgroundColor: "#ffffff" };
const pageWrapperStyleInner = { width: "100%", padding: "40px 20px" };

// Central structural block
const containerLayout = { maxWidth: "1050px", margin: "0 auto", backgroundColor: "#ffffff", borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.04)", overflow: "hidden" };

const headerSection = { padding: "35px 30px 25px 30px", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", borderBottom: "1px solid #e2e8f0", flexWrap: "wrap", gap: "20px" };
const headerTag = {
  background: "#0f172a",
  color: "#ffffff",
  padding: "4px 10px",
  borderRadius: "2px",
  fontSize: "11px",
  width: "fit-content",
  letterSpacing: "1.5px",
  display: "inline-block",
  textTransform: "uppercase",
  marginBottom: "6px"
};
const mainTitle = { fontSize: "24px", margin: 0, color: "#0f172a", fontWeight: "normal" };
const subTitle = { fontSize: "15px", color: "#64748b", marginTop: "4px" };

const monthPickerWrapper = { display: "flex", alignItems: "center", background: "#ffffff", padding: "8px 14px", borderRadius: "4px", border: "1px solid #cbd5e1" };
const pickerLabel = { fontSize: "13px", color: "#475569", marginRight: "8px", fontStyle: "italic" };
const monthInput = { border: "none", background: "transparent", outline: "none", fontSize: "13px", color: "#0f172a", cursor: "pointer" };

const heroCard = { width: "100%", background: "#1e293b", padding: "35px 30px", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" };
const heroText = { display: "flex", flexDirection: "column", flex: 1 };
const classBadge = { background: "rgba(255,255,255,0.12)", padding: "4px 10px", borderRadius: "2px", fontSize: "11px", width: "fit-content" };
const marksLabelLine = { fontSize: "15px", color: "#94a3b8", marginTop: "6px", fontStyle: "italic" };

const breakdownContainer = { padding: "35px 30px", background: "#fff", borderBottom: "1px solid #e2e8f0" };
const sectionHeading = { fontSize: "16px", color: "#0f172a", marginBottom: "16px", fontWeight: "normal", fontStyle: "italic" };
const classicTable = { width: "100%", borderCollapse: "collapse", fontSize: "14px" };
const tableTh = { borderBottom: "2px solid #0f172a", padding: "10px", color: "#0f172a", fontWeight: "600", fontStyle: "italic" };
const tableTr = { borderBottom: "1px solid #e2e8f0" };
const tableTd = { padding: "12px 10px", color: "#334155" };
const finalRowStyle = { background: "#f8fafc", borderTop: "2px solid #0f172a" };

const statsRow = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", width: "100%", background: "#ffffff", borderBottom: "1px solid #e2e8f0" };
const statBox = { padding: "20px 10px", textAlign: "center" };
const statNum = { fontSize: "24px", display: "block" };
const statLabel = { fontSize: "11px", color: "#64748b", textTransform: "uppercase", marginTop: '4px' };

const logContainer = { width: "100%" };
const logHeader = { padding: "20px 30px", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: 'center', borderBottom: "1px solid #e2e8f0" };
const listWrapper = { display: "flex", flexDirection: "column", width: "100%" };
const attendanceItem = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 30px", borderBottom: "1px solid #e2e8f0", width: "100%" };
const dateSection = { display: "flex", flexDirection: "column" };
const dateText = { fontSize: "15px" };
const dayText = { fontSize: "12px", color: "#64748b", marginTop: "2px" };
const statusPill = { padding: "4px 12px", borderRadius: "2px", fontSize: "11px" };
const emptyState = { textAlign: "center", padding: "50px 20px", color: "#94a3b8", fontStyle: 'italic', fontSize: '14px' };

const getStatusColor = (status, colors) => {
  switch (status) {
    case "Present": return colors.present;
    case "Absent": return colors.absent;
    case "Holiday": return colors.holiday;
    default: return colors.notMarked;
  }
};

export default StudentAttendance;