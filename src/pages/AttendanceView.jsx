import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { 
  FaSearch, FaGraduationCap, FaChartPie, 
  FaCalendarCheck, FaTrophy, FaSyncAlt, 
  FaTimes, FaArrowRight, FaFilter 
} from "react-icons/fa";

const API_URL = "https://student-management-system-4-hose.onrender.com";

const AttendanceView = () => {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("All");
  const [activeFilter, setActiveFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // 1. MERGE BOTH APIs
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      // Dono APIs ko ek saath call kar rahe hain
      const [resStudents, resAttendance] = await Promise.all([
        axios.get(`${API_URL}/api/students`),
        axios.get(`${API_URL}/api/attendance/today-percent`)
      ]);

      const basicInfo = Array.isArray(resStudents.data) ? resStudents.data : (resStudents.data.students || []);
      const attendanceInfo = resAttendance.data.students || [];

      // Data Merging Logic: Student ID ke base par photos aur percentage ko jodna
      const mergedData = basicInfo.map(student => {
        // Attendance wali API mein match dhoondho (id ya studentId se)
        const attendanceRecord = attendanceInfo.find(a => 
          (a.studentId === student.id) || (a.id === student.id)
        );

        return {
          ...student,
          // Agar attendance API mein data hai toh wo lo, nahi toh purana marks/percentage
          percentage: attendanceRecord ? attendanceRecord.percentage : (student.percentage || student.marks || 0),
          present: attendanceRecord ? attendanceRecord.present : 0,
          total: attendanceRecord ? attendanceRecord.total : 0
        };
      });

      setStudents(mergedData);
      setFilteredStudents(mergedData);
    } catch (err) {
      console.error("Combined Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  // 2. FILTER LOGIC
  useEffect(() => {
    let result = students;
    if (activeFilter === "Top") result = result.filter(s => s.percentage >= 85);
    else if (activeFilter === "Low") result = result.filter(s => s.percentage < 60);

    if (selectedClass !== "All") result = result.filter((s) => s.class === selectedClass);

    if (searchTerm) {
      result = result.filter((s) =>
        s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id?.toString().includes(searchTerm)
      );
    }
    setFilteredStudents(result);
  }, [searchTerm, selectedClass, activeFilter, students]);

  const uniqueClasses = ["All", ...new Set(students.map((s) => s.class))].filter(Boolean);

  return (
    <div style={appContainer}>
      {/* --- DASHBOARD CARDS --- */}
      <div style={statsGrid}>
        <div style={{...statCard, borderBottom: activeFilter === "All" ? '4px solid #6366f1' : '1px solid #f1f5f9'}} onClick={() => setActiveFilter("All")}>
          <div style={{...iconCircle, background: '#eef2ff', color: '#6366f1'}}><FaGraduationCap /></div>
          <div><div style={statLabel}>Total Students</div><div style={statNumber}>{students.length}</div></div>
        </div>
        <div style={statCard}>
          <div style={{...iconCircle, background: '#fff7ed', color: '#f97316'}}><FaChartPie /></div>
          <div><div style={statLabel}>Batches</div><div style={statNumber}>{uniqueClasses.length - 1}</div></div>
        </div>
        <div style={{...statCard, borderBottom: activeFilter === "Top" ? '4px solid #22c55e' : '1px solid #f1f5f9'}} onClick={() => setActiveFilter("Top")}>
          <div style={{...iconCircle, background: '#f0fdf4', color: '#22c55e'}}><FaTrophy /></div>
          <div><div style={statLabel}>Top 85%+</div><div style={statNumber}>{students.filter(s => s.percentage >= 85).length}</div></div>
        </div>
        <div style={{...statCard, borderBottom: activeFilter === "Low" ? '4px solid #ef4444' : '1px solid #f1f5f9'}} onClick={() => setActiveFilter("Low")}>
          <div style={{...iconCircle, background: '#fef2f2', color: '#ef4444'}}><FaCalendarCheck /></div>
          <div><div style={statLabel}>Low Attendance</div><div style={statNumber}>{students.filter(s => s.percentage < 60).length}</div></div>
        </div>
      </div>

      <div style={commandBar}>
        <div style={leftBar}><h2 style={titleText}>Combined Student Analytics</h2></div>
        <div style={rightBar}>
          <div style={searchWrapper}><FaSearch style={sIcon} /><input placeholder="Search..." style={sInput} value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} /></div>
          <div style={filterBox}><FaFilter size={12} color="#94a3b8" /><select style={miniSelect} value={selectedClass} onChange={(e)=>setSelectedClass(e.target.value)}>{uniqueClasses.map(c => <option key={c} value={c}>{c === "All" ? "All Classes" : `Class ${c}`}</option>)}</select></div>
          <button onClick={fetchAllData} style={refreshBtn}><FaSyncAlt /></button>
        </div>
      </div>

      <div style={tableWrapper}>
        <table style={fullTable}>
          <thead>
            <tr style={thRow}>
              <th style={th}>STUDENT PROFILE</th>
              <th style={thC}>BATCH</th>
              <th style={thC}>ATTENDANCE %</th>
              <th style={thC}>PROGRESS</th>
              <th style={thC}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map(s => (
              <tr key={s.id} style={trStyle}>
                <td style={td}>
                  <div style={idGroup}>
                    <div style={photoBox}>
                      <img 
                        src={s.profile_photo || s.photo || `https://ui-avatars.com/api/?name=${s.name}&background=6366f1&color=fff`} 
                        alt="p" style={avatarImg}
                        onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${s.name}&background=6366f1&color=fff`; }}
                      />
                    </div>
                    <div><div style={nameTxt}>{s.name}</div><div style={subTxt}>UID: {s.id}</div></div>
                  </div>
                </td>
                <td style={tdC}><span style={batchBadge}>Class {s.class}</span></td>
                <td style={tdC}><div style={statValue}>{s.percentage}%</div></td>
                <td style={tdC}><div style={barContainer}><div style={{...barFill, width: `${s.percentage}%`, background: s.percentage >= 85 ? '#22c55e' : s.percentage < 60 ? '#ef4444' : '#6366f1' }}></div></div></td>
                <td style={tdC}><button style={viewBtn} onClick={() => setSelectedStudent(s)}>View Details</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div style={loader}>Merging Photos & Attendance Data...</div>}
      </div>

      {/* --- SIDE PANEL --- */}
      {selectedStudent && (
        <>
          <div style={overlay} onClick={() => setSelectedStudent(null)} />
          <div style={sidePanel}>
            <div style={panelBody}>
              <img src={selectedStudent.profile_photo || selectedStudent.photo || `https://ui-avatars.com/api/?name=${selectedStudent.name}&background=6366f1&color=fff`} style={largeImg} alt="p" />
              <h2>{selectedStudent.name}</h2>
              <p>Class {selectedStudent.class} | ID: {selectedStudent.id}</p>
              <div style={infoCard}>
                 <div style={infoItem}><span>Live Attendance</span><strong>{selectedStudent.percentage}%</strong></div>
                 <div style={infoItem}><span>Present Days</span><strong>{selectedStudent.present || 0}</strong></div>
                 <div style={infoItem}><span>Status</span><strong style={{color: selectedStudent.percentage >= 75 ? '#22c55e' : '#ef4444'}}>{selectedStudent.percentage >= 75 ? 'Regular' : 'Irregular'}</strong></div>
              </div>
              <button style={closeBtn} onClick={() => setSelectedStudent(null)}>Close</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Styles (Condensed)
const appContainer = { background: "#fff", minHeight: "100vh", fontFamily: "'Inter', sans-serif" };
const statsGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", borderBottom: "1px solid #f1f5f9" };
const statCard = { padding: "20px", display: "flex", alignItems: "center", gap: "15px", cursor: "pointer" };
const iconCircle = { width: "42px", height: "42px", borderRadius: "12px", display: "flex", justifyContent: "center", alignItems: "center" };
const statLabel = { fontSize: "11px", color: "#94a3b8", fontWeight: "bold" };
const statNumber = { fontSize: "20px", fontWeight: "800", color: "#1e293b" };
const commandBar = { display: "flex", justifyContent: "space-between", padding: "20px", alignItems: "center" };
const titleText = { fontSize: "18px", color: "#6366f1", fontWeight: "800" };
const rightBar = { display: "flex", gap: "12px" };
const leftBar = { display: "flex", alignItems: "center" };
const searchWrapper = { position: "relative" };
const sIcon = { position: "absolute", left: "12px", top: "12px", color: "#cbd5e1" };
const sInput = { padding: "10px 10px 10px 38px", borderRadius: "10px", border: "1px solid #e2e8f0", background: "#f8fafc", width: "180px" };
const filterBox = { display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", padding: "0 10px", borderRadius: "10px", border: "1px solid #e2e8f0" };
const miniSelect = { border: "none", background: "none", height: "40px", fontWeight: "600", outline: "none" };
const refreshBtn = { padding: "10px", borderRadius: "10px", border: "none", background: "#f1f5f9", color: "#6366f1", cursor: "pointer" };
const tableWrapper = { padding: "0 20px" };
const fullTable = { width: "100%", borderCollapse: "collapse" };
const thRow = { background: "#f8fafc" };
const th = { padding: "15px", textAlign: "left", fontSize: "11px", color: "#94a3b8", fontWeight: "bold" };
const thC = { ...th, textAlign: "center" };
const trStyle = { borderBottom: "1px solid #f1f5f9" };
const td = { padding: "12px 15px" };
const tdC = { ...td, textAlign: "center" };
const idGroup = { display: "flex", alignItems: "center", gap: "12px" };
const photoBox = { width: "42px", height: "42px", borderRadius: "50%", overflow: "hidden", border: "2px solid #eef2ff" };
const avatarImg = { width: "100%", height: "100%", objectFit: "cover" };
const nameTxt = { fontSize: "14px", fontWeight: "700" };
const subTxt = { fontSize: "11px", color: "#94a3b8" };
const batchBadge = { background: "#eef2ff", padding: "4px 10px", borderRadius: "6px", color: "#6366f1", fontSize: "11px", fontWeight: "bold" };
const statValue = { fontWeight: "800" };
const barContainer = { width: "80px", height: "6px", background: "#f1f5f9", borderRadius: "10px", margin: "0 auto" };
const barFill = { height: "100%", borderRadius: "10px" };
const viewBtn = { padding: "6px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: "11px" };
const loader = { textAlign: "center", padding: "100px", color: "#94a3b8" };
const overlay = { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.3)", zIndex: 99 };
const sidePanel = { position: "fixed", right: 0, top: 0, width: "320px", height: "100%", background: "#fff", zIndex: 100, padding: "30px" };
const panelBody = { textAlign: "center" };
const largeImg = { width: "110px", height: "110px", borderRadius: "50%", objectFit: "cover", border: "4px solid #f1f5f9" };
const infoCard = { background: "#f8fafc", borderRadius: "15px", padding: "15px", marginTop: "20px", textAlign: "left" };
const infoItem = { display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #eee" };
const closeBtn = { marginTop: "30px", width: "100%", padding: "12px", background: "#6366f1", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold" };

export default AttendanceView;