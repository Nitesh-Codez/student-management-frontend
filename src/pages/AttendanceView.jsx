import React, { useEffect, useState, useCallback } from "react";
import api from "../services/api";
import { 
  FaSearch, FaGraduationCap, FaChartPie, 
  FaCalendarCheck, FaTrophy, FaSyncAlt, 
  FaTimes, FaCheck, FaFilter, FaUserCircle, FaEye
} from "react-icons/fa";

const AdminAttendanceRequests = () => {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("All");
  const [activeFilter, setActiveFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  
  // Selected student for individual side panel analysis
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSpecificRequests, setStudentSpecificRequests] = useState([]);

  // Active Tab: 'analytics' or 'requests'
  const [activeTab, setActiveTab] = useState("analytics");
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Month Selector for current view filtering
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  });

  // 1. FETCH ALL DATA (Students, Today Percentages, & Admin Requests API)
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [resStudents, resAttendance, resRequests] = await Promise.all([
        api.get(`/api/students`),
        api.get(`/api/attendance/today-percent`),
        api.get(`/api/attendance/admin/student-requests`).catch(() => ({ data: { success: true, requests: [] } }))
      ]);

      const basicInfo = Array.isArray(resStudents.data) ? resStudents.data : (resStudents.data.students || []);
      const attendanceInfo = resAttendance.data.students || [];
      
      // Directly extract requests array from backend response format
      const requestsData = resRequests.data.requests || resRequests.data.student || (Array.isArray(resRequests.data) ? resRequests.data : []);

      // Merge student info with live attendance info
      const mergedData = basicInfo.map(student => {
        const attendanceRecord = attendanceInfo.find(a => 
          (a.studentId === student.id) || (a.id === student.id)
        );

        return {
          ...student,
          percentage: attendanceRecord ? attendanceRecord.percentage : (student.percentage || student.marks || 0),
          present: attendanceRecord ? attendanceRecord.present : (student.present || 0),
          total: attendanceRecord ? attendanceRecord.total : (student.total || 0)
        };
      });

      setStudents(mergedData);
      setFilteredStudents(mergedData);
      setRequests(requestsData);
    } catch (err) {
      console.error("Admin Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchAllData(); 
  }, [fetchAllData]);

  // 2. HANDLE REQUEST STATUS UPDATE (Accept / Reject)
  const handleUpdateStatus = async (requestId, newStatus) => {
    setActionLoadingId(requestId);
    try {
      const res = await api.put(`/api/attendance/admin/request/${requestId}`, { status: newStatus });
      if (res.data.success) {
        setRequests(prev => prev.map(req => 
          (req._id === requestId || req.id === requestId) ? { ...req, requestStatus: newStatus } : req
        ));
      }
    } catch (err) {
      console.error("Error updating request status:", err);
      alert("Failed to update status. Please try again.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // 3. FILTER LOGIC FOR STUDENTS
  useEffect(() => {
    let result = students;
    if (activeFilter === "Top") result = result.filter(s => Number(s.percentage) >= 85);
    else if (activeFilter === "Low") result = result.filter(s => Number(s.percentage) < 60);

    if (selectedClass !== "All") result = result.filter((s) => String(s.class) === String(selectedClass));

    if (searchTerm) {
      result = result.filter((s) =>
        s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id?.toString().includes(searchTerm)
      );
    }
    setFilteredStudents(result);
  }, [searchTerm, selectedClass, activeFilter, students]);

  // Open individual student side panel & filter requests for them
  const handleOpenStudentDetails = (student) => {
    setSelectedStudent(student);
    const matchedReqs = requests.filter(r => String(r.studentId) === String(student.id) || String(r.studentId) === String(student._id));
    setStudentSpecificRequests(matchedReqs);
  };

  const uniqueClasses = ["All", ...new Set(students.map((s) => s.class))].filter(Boolean);

  const formatDate = (iso) => {
    if (!iso) return "N/A";
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div style={appContainer}>
      <style>{`
        * { box-sizing: border-box; font-family: "Georgia", "Times New Roman", serif; }
        input, select, button { font-family: inherit; }
      `}</style>

      {/* --- STATS SUMMARY CARDS (Thin / Clean Font) --- */}
      <div style={statsGrid}>
        <div style={{...statCard, borderBottom: activeFilter === "All" ? '2px solid #0f172a' : '1px solid #f1f5f9'}} onClick={() => { setActiveFilter("All"); setActiveTab("analytics"); }}>
          <div style={{...iconCircle, background: '#f8fafc', color: '#0f172a'}}><FaGraduationCap /></div>
          <div><div style={statLabel}>Total Students</div><div style={statNumber}>{students.length}</div></div>
        </div>
        <div style={statCard}>
          <div style={{...iconCircle, background: '#f8fafc', color: '#0f172a'}}><FaChartPie /></div>
          <div><div style={statLabel}>Active Batches</div><div style={statNumber}>{uniqueClasses.length - 1}</div></div>
        </div>
        <div style={{...statCard, borderBottom: activeFilter === "Top" ? '2px solid #166534' : '1px solid #f1f5f9'}} onClick={() => { setActiveFilter("Top"); setActiveTab("analytics"); }}>
          <div style={{...iconCircle, background: '#f0fdf4', color: '#166534'}}><FaTrophy /></div>
          <div><div style={statLabel}>Top 85%+ Attendance</div><div style={statNumber}>{students.filter(s => Number(s.percentage) >= 85).length}</div></div>
        </div>
        <div style={{...statCard, borderBottom: activeFilter === "Low" ? '2px solid #991b1b' : '1px solid #f1f5f9'}} onClick={() => { setActiveFilter("Low"); setActiveTab("analytics"); }}>
          <div style={{...iconCircle, background: '#fef2f2', color: '#991b1b'}}><FaCalendarCheck /></div>
          <div><div style={statLabel}>Low Attendance (&lt;60%)</div><div style={statNumber}>{students.filter(s => Number(s.percentage) < 60).length}</div></div>
        </div>
      </div>

      {/* --- COMMAND BAR & TAB NAVIGATION --- */}
      <div style={commandBar}>
        <div style={leftBar}>
          <h2 style={titleText}>Attendance & Request Control</h2>
          <div style={tabSwitchContainer}>
            <button 
              style={{...tabBtn, background: activeTab === 'analytics' ? '#0f172a' : 'transparent', color: activeTab === 'analytics' ? '#fff' : '#475569'}}
              onClick={() => setActiveTab('analytics')}
            >
              Student Analytics
            </button>
            <button 
              style={{...tabBtn, background: activeTab === 'requests' ? '#0f172a' : 'transparent', color: activeTab === 'requests' ? '#fff' : '#475569'}}
              onClick={() => setActiveTab('requests')}
            >
              Drop Requests ({requests.filter(r => !r.requestStatus || r.requestStatus?.toLowerCase() === 'pending').length})
            </button>
          </div>
        </div>

        <div style={rightBar}>
          <div style={filterBox}>
            <span style={{fontSize: '12px', color: '#64748b', fontStyle: 'italic'}}>Month:</span>
            <input 
              type="month" 
              value={currentMonth} 
              onChange={(e) => setCurrentMonth(e.target.value)} 
              style={monthInputStyle}
            />
          </div>

          {activeTab === 'analytics' && (
            <>
              <div style={searchWrapper}>
                <FaSearch style={sIcon} />
                <input placeholder="Search student..." style={sInput} value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} />
              </div>
              <div style={filterBox}>
                <FaFilter size={11} color="#64748b" />
                <select style={miniSelect} value={selectedClass} onChange={(e)=>setSelectedClass(e.target.value)}>
                  {uniqueClasses.map(c => <option key={c} value={c}>{c === "All" ? "All Classes" : `Class ${c}`}</option>)}
                </select>
              </div>
            </>
          )}
          <button onClick={fetchAllData} style={refreshBtn} title="Refresh"><FaSyncAlt /></button>
        </div>
      </div>

      {/* --- TAB 1: STUDENT ANALYTICS TABLE --- */}
      {activeTab === 'analytics' && (
        <div style={tableWrapper}>
          <table style={fullTable}>
            <thead>
              <tr style={thRow}>
                <th style={th}>STUDENT PROFILE</th>
                <th style={thC}>BATCH</th>
                <th style={thC}>PRESENT / TOTAL</th>
                <th style={thC}>ATTENDANCE %</th>
                <th style={thC}>PROGRESS</th>
                <th style={thC}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(s => (
                <tr key={s.id || s._id} style={trStyle}>
                  <td style={td}>
                    <div style={idGroup}>
                      <div style={photoBox}>
                        <img 
                          src={s.profile_photo || s.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name || 'Student')}&background=cbd5e1&color=0f172a`} 
                          alt="p" style={avatarImg}
                          onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=Student&background=cbd5e1&color=0f172a`; }}
                        />
                      </div>
                      <div>
                        <div style={nameTxt}>{s.name || "Unnamed Student"}</div>
                        <div style={subTxt}>UID: {s.id || s._id}</div>
                      </div>
                    </div>
                  </td>
                  <td style={tdC}><span style={batchBadge}>Class {s.class || "N/A"}</span></td>
                  <td style={tdC}><span style={{color: '#334155'}}>{s.present || 0} / {s.total || 0}</span></td>
                  <td style={tdC}><div style={statValue}>{s.percentage}%</div></td>
                  <td style={tdC}>
                    <div style={barContainer}>
                      <div style={{...barFill, width: `${Math.min(Math.max(s.percentage, 0), 100)}%`, background: s.percentage >= 85 ? '#166534' : s.percentage < 60 ? '#991b1b' : '#0f172a' }}></div>
                    </div>
                  </td>
                  <td style={tdC}>
                    <button style={viewBtn} onClick={() => handleOpenStudentDetails(s)}>
                      <FaEye size={12} style={{marginRight: '4px'}} /> View Profile
                    </button>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" style={{textAlign: 'center', padding: '40px', color: '#64748b', fontStyle: 'italic'}}>No matching student records found.</td>
                </tr>
              )}
            </tbody>
          </table>
          {loading && <div style={loader}>Loading Student Analytics...</div>}
        </div>
      )}

      {/* --- TAB 2: DROP / LEAVE REQUESTS TABLE --- */}
      {activeTab === 'requests' && (
        <div style={tableWrapper}>
          <table style={fullTable}>
            <thead>
              <tr style={thRow}>
                <th style={th}>STUDENT NAME & ID</th>
                <th style={thC}>DROP TYPE</th>
                <th style={thC}>DATE RANGE</th>
                <th style={th}>REASON</th>
                <th style={thC}>STATUS</th>
                <th style={thC}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req, idx) => {
                const reqStatus = req.requestStatus || "Pending";
                const isAccepted = reqStatus.toLowerCase() === "accepted";
                const isRejected = reqStatus.toLowerCase() === "rejected";

                return (
                  <tr key={req._id || req.id || idx} style={trStyle}>
                    <td style={td}>
                      <div style={{color: '#0f172a'}}>{req.studentName || `Student ID: ${req.studentId}`}</div>
                      <div style={{fontSize: '11px', color: '#64748b'}}>ID: {req.studentId}</div>
                    </td>
                    <td style={tdC}>
                      <span style={{background: '#f8fafc', padding: '3px 8px', borderRadius: '3px', fontSize: '11px', color: '#334155', border: '1px solid #cbd5e1'}}>
                        {req.dropType || "Leave"}
                      </span>
                    </td>
                    <td style={{...tdC, fontSize: '12px', color: '#334155'}}>
                      {formatDate(req.dropStartDate)} &rarr; {formatDate(req.dropEndDate)}
                    </td>
                    <td style={{...td, maxWidth: '240px', fontSize: '13px', color: '#475569', fontStyle: 'italic'}}>{req.reason || "No reason specified"}</td>
                    <td style={tdC}>
                      <span style={{
                        padding: '3px 8px', 
                        borderRadius: '3px', 
                        fontSize: '11px', 
                        background: isAccepted ? '#f0fdf4' : (isRejected ? '#fef2f2' : '#fef9c3'),
                        color: isAccepted ? '#166534' : (isRejected ? '#991b1b' : '#854d0e'),
                        border: `1px solid ${isAccepted ? '#bbf7d0' : (isRejected ? '#fecaca' : '#fef08a')}`
                      }}>
                        {reqStatus.toUpperCase()}
                      </span>
                    </td>
                    <td style={tdC}>
                      <div style={{display: 'flex', gap: '6px', justifyContent: 'center'}}>
                        <button 
                          disabled={actionLoadingId === (req._id || req.id)}
                          onClick={() => handleUpdateStatus(req._id || req.id, "Accepted")}
                          style={{...actionBtn, background: '#166534', color: '#fff'}}
                        >
                          <FaCheck size={10} /> Accept
                        </button>
                        <button 
                          disabled={actionLoadingId === (req._id || req.id)}
                          onClick={() => handleUpdateStatus(req._id || req.id, "Rejected")}
                          style={{...actionBtn, background: '#991b1b', color: '#fff'}}
                        >
                          <FaTimes size={10} /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {requests.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" style={{textAlign: 'center', padding: '40px', color: '#64748b', fontStyle: 'italic'}}>No drop or leave requests available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* --- SIDE PANEL: INDIVIDUAL STUDENT PERSONAL BREAKDOWN --- */}
      {selectedStudent && (
        <>
          <div style={overlay} onClick={() => setSelectedStudent(null)} />
          <div style={sidePanel}>
            <div style={panelHeader}>
              <h3 style={{fontSize: '16px', color: '#0f172a', fontWeight: 'normal'}}>Individual Profile View</h3>
              <button onClick={() => setSelectedStudent(null)} style={closeIconBtn}><FaTimes /></button>
            </div>

            <div style={panelBody}>
              <img 
                src={selectedStudent.profile_photo || selectedStudent.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedStudent.name || 'Student')}&background=cbd5e1&color=0f172a`} 
                style={largeImg} 
                alt="p" 
              />
              <h2 style={{marginTop: '12px', color: '#0f172a', fontSize: '18px'}}>{selectedStudent.name}</h2>
              <p style={{color: '#64748b', fontSize: '12px', marginTop: '2px', fontStyle: 'italic'}}>Class {selectedStudent.class} | ID: {selectedStudent.id}</p>
              
              <div style={infoCard}>
                 <div style={infoItem}><span>Live Attendance</span><strong>{selectedStudent.percentage}%</strong></div>
                 <div style={infoItem}><span>Present Sessions</span><strong>{selectedStudent.present || 0}</strong></div>
                 <div style={infoItem}><span>Total Sessions</span><strong>{selectedStudent.total || 0}</strong></div>
                 <div style={infoItem}>
                   <span>Category</span>
                   <strong style={{color: selectedStudent.percentage >= 75 ? '#166534' : '#991b1b'}}>
                     {selectedStudent.percentage >= 75 ? 'Regular' : 'Irregular'}
                   </strong>
                 </div>
              </div>

              {/* Personal Drop History */}
              <div style={{marginTop: '20px', textAlign: 'left'}}>
                <h4 style={{fontSize: '13px', color: '#0f172a', marginBottom: '8px', fontStyle: 'italic'}}>Student Request History</h4>
                {studentSpecificRequests.length === 0 ? (
                  <p style={{fontSize: '12px', color: '#64748b', fontStyle: 'italic'}}>No requests filed by this student.</p>
                ) : (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    {studentSpecificRequests.map((r, i) => (
                      <div key={i} style={{background: '#f8fafc', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px'}}>
                        <div style={{display: 'flex', justifyContent: 'between', marginBottom: '4px'}}>
                          <span style={{fontWeight: 'normal', color: '#0f172a'}}>{r.dropType || 'Leave'}</span>
                          <span style={{color: r.requestStatus?.toLowerCase() === 'accepted' ? '#166534' : '#991b1b', textTransform: 'uppercase'}}>{r.requestStatus || 'Pending'}</span>
                        </div>
                        <div style={{color: '#475569', fontSize: '11px'}}>{formatDate(r.dropStartDate)} &rarr; {formatDate(r.dropEndDate)}</div>
                        <div style={{color: '#334155', marginTop: '4px', fontStyle: 'italic'}}>"{r.reason}"</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// --- STYLING (Clean, Thin, Minimalist Corporate Layout) ---
const appContainer = { background: "#ffffff", minHeight: "100vh", paddingBottom: "40px" };
const statsGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", borderBottom: "1px solid #cbd5e1" };
const statCard = { padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", background: "#fff" };
const iconCircle = { width: "36px", height: "36px", borderRadius: "6px", display: "flex", justifyContent: "center", alignItems: "center", border: "1px solid #cbd5e1" };
const statLabel = { fontSize: "11px", color: "#64748b", textTransform: 'uppercase', fontStyle: 'italic' };
const statNumber = { fontSize: "20px", color: "#0f172a", marginTop: '2px' };

const commandBar = { display: "flex", justifyContent: "space-between", padding: "20px", alignItems: "center", flexWrap: 'wrap', gap: '15px', borderBottom: "1px solid #cbd5e1" };
const leftBar = { display: "flex", alignItems: "center", gap: "20px", flexWrap: 'wrap' };
const titleText = { fontSize: "16px", color: "#0f172a", fontStyle: 'italic' };
const tabSwitchContainer = { display: 'flex', gap: '4px', background: '#f8fafc', padding: '3px', borderRadius: '4px', border: '1px solid #cbd5e1' };
const tabBtn = { padding: '6px 12px', borderRadius: '3px', border: 'none', fontSize: '12px', cursor: 'pointer' };

const rightBar = { display: "flex", gap: "10px", alignItems: 'center', flexWrap: 'wrap' };
const searchWrapper = { position: "relative" };
const sIcon = { position: "absolute", left: "10px", top: "11px", color: "#64748b" };
const sInput = { padding: "8px 10px 8px 32px", borderRadius: "4px", border: "1px solid #cbd5e1", background: "#fff", width: "170px", outline: 'none', fontSize: '13px' };
const filterBox = { display: "flex", alignItems: "center", gap: "6px", background: "#fff", padding: "0 10px", borderRadius: "4px", border: "1px solid #cbd5e1", height: '36px' };
const monthInputStyle = { border: "none", background: "transparent", fontSize: "12px", color: "#0f172a", outline: 'none', cursor: 'pointer' };
const miniSelect = { border: "none", background: "none", height: "100%", outline: "none", fontSize: "12px", cursor: 'pointer', color: '#0f172a' };
const refreshBtn = { padding: "8px 10px", borderRadius: "4px", border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", cursor: "pointer", height: '36px' };

const tableWrapper = { padding: "20px", overflowX: "auto" };
const fullTable = { width: "100%", borderCollapse: "collapse", minWidth: '700px', fontSize: '13px' };
const thRow = { background: "#f8fafc", borderBottom: "1px solid #cbd5e1" };
const th = { padding: "12px 14px", textAlign: "left", fontSize: "11px", color: "#64748b", fontStyle: 'italic' };
const thC = { ...th, textAlign: "center" };
const trStyle = { borderBottom: "1px solid #e2e8f0" };
const td = { padding: "12px 14px" };
const tdC = { ...td, textAlign: "center" };
const idGroup = { display: "flex", alignItems: "center", gap: "10px" };
const photoBox = { width: "36px", height: "36px", borderRadius: "50%", overflow: "hidden", border: "1px solid #cbd5e1", flexShrink: 0 };
const avatarImg = { width: "100%", height: "100%", objectFit: "cover" };
const nameTxt = { fontSize: "13px", color: '#0f172a' };
const subTxt = { fontSize: "11px", color: "#64748b", fontStyle: 'italic' };
const batchBadge = { background: "#f8fafc", padding: "2px 8px", borderRadius: "3px", color: "#334155", fontSize: "11px", border: "1px solid #cbd5e1" };
const statValue = { color: '#0f172a' };
const barContainer = { width: "80px", height: "5px", background: "#f1f5f9", borderRadius: "2px", margin: "0 auto", overflow: 'hidden', border: "1px solid #cbd5e1" };
const barFill = { height: "100%" };
const viewBtn = { padding: "5px 10px", borderRadius: "3px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontSize: "11px", color: '#0f172a', display: 'inline-flex', alignItems: 'center' };
const actionBtn = { padding: '4px 8px', borderRadius: '3px', border: 'none', fontSize: '11px', cursor: 'pointer' };
const loader = { textAlign: "center", padding: "50px", color: "#64748b", fontStyle: 'italic', fontSize: '13px' };

const overlay = { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.2)", zIndex: 99 };
const sidePanel = { position: "fixed", right: 0, top: 0, width: "340px", height: "100%", background: "#fff", zIndex: 100, borderLeft: '1px solid #cbd5e1', overflowY: 'auto' };
const panelHeader = { padding: "16px 20px", borderBottom: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' };
const closeIconBtn = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#64748b' };
const panelBody = { padding: "20px", textAlign: "center" };
const largeImg = { width: "90px", height: "90px", borderRadius: "50%", objectFit: "cover", border: "1px solid #cbd5e1", margin: '0 auto' };
const infoCard = { background: "#f8fafc", borderRadius: "4px", padding: "12px", marginTop: "16px", textAlign: "left", border: '1px solid #cbd5e1' };
const infoItem = { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #e2e8f0", fontSize: '12px' };

export default AdminAttendanceRequests;