import React, { useEffect, useState } from "react";
import api from "../services/api";

const StudentAttendance = () => {
  const user = JSON.parse(localStorage.getItem("user"));

  const [attendance, setAttendance] = useState([]);
  const [requests, setRequests] = useState([]);
  const [month, setMonth] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [percentage, setPercentage] = useState(0);
  const [marks, setMarks] = useState(0);
  const [todayStatus, setTodayStatus] = useState(null);

  // Modal State for viewing reason
  const [selectedReason, setSelectedReason] = useState(null);

  // --- MONTHLY BREAKDOWN & FINAL AVERAGE STATES ---
  const [monthlyBreakdown, setMonthlyBreakdown] = useState([]);
  const [finalAverageMarks, setFinalAverageMarks] = useState(0);

  // Colors palette
  const colors = {
    present: "#1e7e34",
    absent: "#bd2130",
    holiday: "#d39e00",         // Used for both holidays and standard Sundays off
    classScheduled: "#047857",   // Rich Emerald Green for scheduled classes on Sundays
    notMarked: "#64748b",
    primary: "#0f172a",
    accent: "#1e40af",
    bg: "#f8fafc",
    border: "#cbd5e1",
    lightRed: "#fef2f2",         
    lightGreen: "#f0fdf4",  
    lightYellow: "#fef9c3",      // Background tint for holidays and standard Sundays
    lightEmerald: "#ecfdf5",     // Soft emerald tint for scheduled classes on Sundays
    todayDefault: "#eff6ff",
    highlightDropBg: "#f3e8ff",  // Rich deep lavender-violet tint for Drop Applied rows
    highlightDropBorder: "#6b21a8" // Deep bold purple border/text for Drop Applied rows
  };

  const getPercentageColor = (perc) => {
    if (perc >= 85) return colors.present;
    if (perc >= 75) return colors.holiday;
    return colors.absent;
  };

  // 1. Fetch Student Attendance & Requests Records
  useEffect(() => {
    if (!user || !user.id) return;
    
    // Fetch Attendance
    api.get(`/api/attendance/${user.id}`)
      .then((res) => {
        if (res.data.success) {
          setAttendance(res.data.attendance || []);
        }
      })
      .catch((err) => console.log("Attendance fetch error:", err));

    // Fetch Drop / Leave Requests
    api.get(`/api/attendance/student/${user.id}/requests`)
      .then((res) => {
        if (res.data.success) {
          setRequests(res.data.student || []);
        }
      })
      .catch((err) => console.log("Requests fetch error:", err));

  }, [user?.id]);

  useEffect(() => {
    const today = new Date();
    setMonth(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`);
  }, []);

  // Helper to check if a specific attendance date falls inside any request drop start & end date
  const getRequestForDate = (dateStr) => {
    const currentDate = new Date(dateStr).setHours(0,0,0,0);
    return requests.find(req => {
      const start = new Date(req.dropStartDate).setHours(0,0,0,0);
      const end = new Date(req.dropEndDate).setHours(0,0,0,0);
      return currentDate >= start && currentDate <= end;
    });
  };

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

    // Valid days & Present days calculation based on Drop Request Status:
    // - If drop request status is "Accepted" -> Exclude completely from valid days & calculations.
    // - If drop request status is "Rejected" -> Count as Absent.
    const validDays = data.filter((a) => {
      const recordDate = new Date(a.date);
      const isSunday = recordDate.getDay() === 0;
      const isHoliday = a.status === "Holiday";
      const matchedReq = getRequestForDate(a.date);
      
      if (matchedReq) {
        if (matchedReq.requestStatus?.toLowerCase() === "accepted") {
          return false; // Exclude completely
        }
        // If rejected or pending, it falls back to normal status behavior below
      }
      
      const isMatchedDropAsAbsent = matchedReq && matchedReq.requestStatus?.toLowerCase() === "rejected";
      
      return ((a.status === "Present" || a.status === "Absent" || isMatchedDropAsAbsent) && !isHoliday && !isSunday) || (isSunday && (a.status === "Present" || a.status === "Absent" || isMatchedDropAsAbsent));
    }).length;

    const presentDays = data.filter((a) => {
      const recordDate = new Date(a.date);
      const isSunday = recordDate.getDay() === 0;
      const isHoliday = a.status === "Holiday";
      const matchedReq = getRequestForDate(a.date);
      
      if (matchedReq && matchedReq.requestStatus?.toLowerCase() === "accepted") {
        return false; // Exclude completely
      }
      
      return a.status === "Present" && !isHoliday && (!isSunday || (isSunday && a.status === "Present"));
    }).length;

    const perc = validDays === 0 ? 0 : (presentDays / validDays) * 100;
    
    setPercentage(perc.toFixed(1));
    setMarks(perc <= 75 ? 0 : Math.ceil((perc - 75) / 5));

    // Dynamic calculation for Month-wise Breakdown UI & Frontend Average Calculation
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
          const mValidDays = monthData.filter((a) => {
            const recordDate = new Date(a.date);
            const isSunday = recordDate.getDay() === 0;
            const isHoliday = a.status === "Holiday";
            const matchedReq = requests.find(req => {
              const start = new Date(req.dropStartDate).setHours(0,0,0,0);
              const end = new Date(req.dropEndDate).setHours(0,0,0,0);
              const cur = new Date(a.date).setHours(0,0,0,0);
              return cur >= start && cur <= end;
            });

            if (matchedReq && matchedReq.requestStatus?.toLowerCase() === "accepted") {
              return false;
            }

            const isMatchedDropAsAbsent = matchedReq && matchedReq.requestStatus?.toLowerCase() === "rejected";
            return ((a.status === "Present" || a.status === "Absent" || isMatchedDropAsAbsent) && !isHoliday && !isSunday) || (isSunday && (a.status === "Present" || a.status === "Absent" || isMatchedDropAsAbsent));
          }).length;

          const mPresentDays = monthData.filter((a) => {
            const recordDate = new Date(a.date);
            const isSunday = recordDate.getDay() === 0;
            const isHoliday = a.status === "Holiday";
            const matchedReq = requests.find(req => {
              const start = new Date(req.dropStartDate).setHours(0,0,0,0);
              const end = new Date(req.dropEndDate).setHours(0,0,0,0);
              const cur = new Date(a.date).setHours(0,0,0,0);
              return cur >= start && cur <= end;
            });

            if (matchedReq && matchedReq.requestStatus?.toLowerCase() === "accepted") {
              return false;
            }

            return a.status === "Present" && !isHoliday && (!isSunday || (isSunday && a.status === "Present"));
          }).length;

          const monthlyPerc = mValidDays === 0 ? 0 : (mPresentDays / mValidDays) * 100;
          const monthlyMark = monthlyPerc <= 75 ? 0 : Math.ceil((monthlyPerc - 75) / 5);

          tempBreakdown.push({
            monthName: monthNames[monthIdx],
            percentage: monthlyPerc.toFixed(1),
            marks: monthlyMark
          });
        }
      }
      setMonthlyBreakdown(tempBreakdown);

      if (tempBreakdown.length > 0) {
        const totalMarksSum = tempBreakdown.reduce((acc, curr) => acc + curr.marks, 0);
        const calculatedAverage = totalMarksSum / tempBreakdown.length;
        setFinalAverageMarks(calculatedAverage.toFixed(1));
      } else {
        setFinalAverageMarks((0).toFixed(1));
      }
    }

  }, [month, attendance, requests]);

  const formatDate = (iso) => {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Calculations for summary stats matching Accepted/Rejected rule
  const daysPresentCount = filtered.filter(a => {
    const recordDate = new Date(a.date);
    const isSunday = recordDate.getDay() === 0;
    const isHoliday = a.status === "Holiday";
    const matchedReq = getRequestForDate(a.date);
    if (matchedReq && matchedReq.requestStatus?.toLowerCase() === "accepted") return false;
    return a.status === "Present" && !isHoliday && !isSunday;
  }).length;

  const daysAbsentCount = filtered.filter(a => {
    const recordDate = new Date(a.date);
    const isSunday = recordDate.getDay() === 0;
    const isHoliday = a.status === "Holiday";
    const matchedReq = getRequestForDate(a.date);
    if (matchedReq && matchedReq.requestStatus?.toLowerCase() === "accepted") return false;
    const isRejected = matchedReq && matchedReq.requestStatus?.toLowerCase() === "rejected";
    return (a.status === "Absent" || isRejected) && !isHoliday && !isSunday;
  }).length;

  const holidaysCount = filtered.filter(a => a.status === "Holiday" || (new Date(a.date).getDay() === 0 && a.status !== "Present" && a.status !== "Absent" && !getRequestForDate(a.date))).length;
  
  const scheduledClassesCount = filtered.filter(a => {
    const isSunday = new Date(a.date).getDay() === 0;
    return isSunday && a.status !== "Holiday" && (a.status === "Present" || a.status === "Absent");
  }).length;

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
        @media (max-width: 768px) {
          .main-page-wrapper { padding: 0px !important; }
          .content-container { max-width: 100% !important; border-radius: 0px !important; box-shadow: none !important; }
          .header-section-layout { padding: 25px 15px 20px 15px !important; }
          .hero-card-layout { padding: 30px 15px !important; }
          .breakdown-table-container { padding: 25px 15px !important; }
          .activity-log-header { padding: 16px 15px !important; }
          .activity-log-item { padding: 16px 15px !important; }
          .stats-grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      <div className="main-page-wrapper" style={pageWrapperStyleInner}>
        <div className="content-container" style={containerLayout}>
          
          {/* --- ENHANCED HEADER --- */}
          <div className="header-section-layout" style={headerSection}>
            <div style={{display: 'flex', flexDirection: 'column'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px'}}>
                <span style={headerTag}>Smart Students Classes</span>
                <span style={liveBadgeTag}>● LIVE PORTAL</span>
              </div>
              <h1 style={mainTitle}>Attendance Ledger & Performance Report</h1>
              <p style={subTitle}>Academic Record for: <span style={{color: colors.primary, fontStyle: 'italic', fontWeight: 'normal'}}>{user?.name}</span></p>
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
              <div style={marksLabelLine}>Monthly Attendance Percentage & Computed Score</div>
            </div>
            
            <div style={{ position: "relative", width: "110px", height: "110px", display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <svg width="110" height="110">
                <circle stroke="rgba(255,255,255,0.12)" strokeWidth="5" fill="transparent" r={radius} cx="55" cy="55" />
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
                    <td style={{...tableTd, textAlign: "right", color: "#1e40af", fontWeight: "normal", fontSize: "16px", paddingRight: '20px'}}>{finalAverageMarks}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* --- 4-COLUMN STATS GRID --- */}
          <div className="stats-grid-4" style={statsRow}>
            <div style={statBox}>
              <span style={{...statNum, color: colors.present}}>{daysPresentCount}</span>
              <span style={statLabel}>Days Present</span>
            </div>
            <div style={{...statBox, borderLeft: `1px solid ${colors.border}`}}>
              <span style={{...statNum, color: colors.absent}}>{daysAbsentCount}</span>
              <span style={statLabel}>Days Absent</span>
            </div>
            <div style={{...statBox, borderLeft: `1px solid ${colors.border}`}}>
              <span style={{...statNum, color: colors.holiday}}>{holidaysCount}</span>
              <span style={statLabel}>Holidays / Off</span>
            </div>
            <div style={{...statBox, borderLeft: `1px solid ${colors.border}`}}>
              <span style={{...statNum, color: colors.classScheduled}}>{scheduledClassesCount}</span>
              <span style={statLabel}>Sunday Classes</span>
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
                    const matchedRequest = getRequestForDate(a.date);
                    const isAcceptedDrop = matchedRequest && matchedRequest.requestStatus?.toLowerCase() === "accepted";
                    const isRejectedDrop = matchedRequest && matchedRequest.requestStatus?.toLowerCase() === "rejected";
                    
                    const isAbsent = a.status === "Absent" || isRejectedDrop;
                    const isPresent = a.status === "Present" && !isAcceptedDrop;
                    const isHoliday = a.status === "Holiday";
                    const isToday = a.isToday;
                    
                    const recordDate = new Date(a.date);
                    const isSunday = recordDate.getDay() === 0;

                    const isSundayClassScheduled = isSunday && !isHoliday && (a.status === "Present" || a.status === "Absent");

                    let rowBg = "transparent";
                    let leftBorderColor = colors.border;

                    if (matchedRequest) {
                      rowBg = colors.highlightDropBg;
                      leftBorderColor = colors.highlightDropBorder;
                    } else if (isSundayClassScheduled) {
                      rowBg = colors.lightEmerald;
                      leftBorderColor = colors.classScheduled;
                    } else if (isSunday || isHoliday) { 
                      rowBg = colors.lightYellow; 
                      leftBorderColor = colors.holiday; 
                    } else if (isToday) {
                      rowBg = isPresent ? colors.lightGreen : (isAbsent ? colors.lightRed : colors.todayDefault);
                      leftBorderColor = isPresent ? colors.present : (isAbsent ? colors.absent : colors.accent);
                    } else if (isAbsent) { 
                      rowBg = colors.lightRed; 
                      leftBorderColor = colors.absent; 
                    } else if (isPresent) {
                      leftBorderColor = colors.present;
                    }

                    const dynamicLeftBorder = `4px solid ${leftBorderColor}`;

                    return (
                      <div 
                        key={i} 
                        className="activity-log-item" 
                        style={{ 
                          ...attendanceItem, 
                          backgroundColor: rowBg, 
                          borderBottom: "1px solid #e2e8f0", 
                          borderLeft: dynamicLeftBorder 
                        }}
                      >
                        <div style={dateSection}>
                          <div style={{...dateText, color: "#0f172a", fontWeight: "normal"}}>
                            {formatDate(a.date)} 
                            {isToday && <span style={{color: colors.accent, fontSize: '11px', fontStyle: 'italic', marginLeft: '6px'}}>• TODAY</span>}
                            {isSundayClassScheduled && <span style={{color: colors.classScheduled, fontSize: '11px', fontStyle: 'italic', marginLeft: '6px'}}>• CLASS SCHEDULED (SUNDAY)</span>}
                            {isSunday && !isSundayClassScheduled && !isToday && <span style={{color: colors.holiday, fontSize: '11px', fontStyle: 'italic', marginLeft: '6px'}}>• SUNDAY OFF</span>}
                          </div>
                          <div style={dayText}>
                            {recordDate.toLocaleDateString('en-US', { weekday: 'long' })}
                          </div>
                          
                          {matchedRequest && (
                            <div style={{marginTop: '6px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap'}}>
                              <span style={{fontSize: '11px', background: colors.highlightDropBorder, color: '#fff', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'normal'}}>
                                {matchedRequest.requestStatus}
                              </span>
                              <span style={{fontSize: '12px', color: '#334155', fontStyle: 'italic'}}>
                                Reason: {matchedRequest.reason.length > 40 ? matchedRequest.reason.substring(0, 40) + "..." : matchedRequest.reason}
                              </span>
                              <button 
                                onClick={() => setSelectedReason(matchedRequest.reason)}
                                style={getReasonBtn}
                              >
                                Get Reason
                              </button>
                            </div>
                          )}
                        </div>

                        <div style={{
                          ...statusPill,
                          backgroundColor: matchedRequest ? colors.highlightDropBorder + "20" : (isSundayClassScheduled ? colors.classScheduled + "20" : (isSunday || isHoliday ? colors.holiday + "20" : getStatusColor(a.status, colors) + "12")),
                          color: matchedRequest ? colors.highlightDropBorder : (isSundayClassScheduled ? colors.classScheduled : (isSunday || isHoliday ? colors.holiday : getStatusColor(a.status, colors))),
                          border: `1px solid ${matchedRequest ? colors.highlightDropBorder : (isSundayClassScheduled ? colors.classScheduled : (isSunday || isHoliday ? colors.holiday : getStatusColor(a.status, colors)))}44`,
                          fontWeight: "normal"
                        }}>
                          {matchedRequest ? `Drop (${matchedRequest.dropType} - ${matchedRequest.requestStatus})` : (isSundayClassScheduled ? `Class Scheduled (${a.status})` : (isSunday ? "Holiday / Sunday Off" : a.status))}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- REASON MODAL POPUP --- */}
      {selectedReason && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3 style={{marginBottom: '10px', color: '#0f172a', fontWeight: 'normal'}}>Drop Request Reason</h3>
            <p style={{fontSize: '14px', color: '#334155', lineHeight: '1.5', marginBottom: '20px'}}>{selectedReason}</p>
            <button onClick={() => setSelectedReason(null)} style={closeModalBtn}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- STYLES CONFIG ---
const pageWrapper = { width: "100%", minHeight: "100vh", backgroundColor: "#ffffff" };
const pageWrapperStyleInner = { width: "100%", padding: "40px 20px" };
const containerLayout = { maxWidth: "1050px", margin: "0 auto", backgroundColor: "#ffffff", borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.04)", overflow: "hidden" };

const headerSection = { padding: "35px 30px 25px 30px", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", borderBottom: "1px solid #e2e8f0", flexWrap: "wrap", gap: "20px" };
const headerTag = { background: "#0f172a", color: "#ffffff", padding: "4px 10px", borderRadius: "2px", fontSize: "11px", width: "fit-content", letterSpacing: "1.5px", display: "inline-block", textTransform: "uppercase" };
const liveBadgeTag = { background: "#dcfce7", color: "#166534", padding: "4px 8px", borderRadius: "2px", fontSize: "10px", fontWeight: "normal", letterSpacing: "1px" };
const mainTitle = { fontSize: "24px", margin: "6px 0 0 0", color: "#0f172a", fontWeight: "normal" };
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
const tableTh = { borderBottom: "2px solid #0f172a", padding: "10px", color: "#0f172a", fontWeight: "normal", fontStyle: "italic" };
const tableTr = { borderBottom: "1px solid #e2e8f0" };
const tableTd = { padding: "12px 10px", color: "#334155" };
const finalRowStyle = { background: "#f8fafc", borderTop: "2px solid #0f172a" };

const statsRow = { background: "#ffffff", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", width: "100%", borderBottom: "1px solid #e2e8f0" };
const statBox = { padding: "22px 10px", textAlign: "center" };
const statNum = { fontSize: "28px", fontWeight: "normal", display: "block" };
const statLabel = { fontSize: "11px", color: "#475569", textTransform: "uppercase", marginTop: '6px', letterSpacing: '0.5px', fontWeight: "normal" };

const logContainer = { width: "100%" };
const logHeader = { padding: "20px 30px", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: 'center', borderBottom: "1px solid #e2e8f0" };
const listWrapper = { display: "flex", flexDirection: "column", width: "100%" };
const attendanceItem = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 30px", width: "100%" };
const dateSection = { display: "flex", flexDirection: "column", maxWidth: "75%" };
const dateText = { fontSize: "15px" };
const dayText = { fontSize: "12px", color: "#64748b", marginTop: "2px" };
const statusPill = { padding: "4px 12px", borderRadius: "2px", fontSize: "11px", height: "fit-content" };
const emptyState = { textAlign: "center", padding: "50px 20px", color: "#94a3b8", fontStyle: 'italic', fontSize: '14px' };

const getReasonBtn = { background: "#6b21a8", color: "#fff", border: "none", padding: "3px 9px", borderRadius: "3px", fontSize: "11px", cursor: "pointer", fontWeight: "normal" };

// Modal Styles
const modalOverlay = { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 };
const modalContent = { backgroundColor: "#fff", padding: "25px", borderRadius: "6px", width: "90%", maxWidth: "400px", boxShadow: "0 4px 15px rgba(0,0,0,0.2)" };
const closeModalBtn = { background: "#0f172a", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "4px", cursor: "pointer", fontSize: "13px" };

const getStatusColor = (status, colors) => {
  switch (status) {
    case "Present": return colors.present;
    case "Absent": return colors.absent;
    case "Holiday": return colors.holiday;
    default: return colors.notMarked;
  }
};

export default StudentAttendance;