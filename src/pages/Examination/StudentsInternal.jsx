import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { 
  FaGraduationCap, 
  FaCalendarCheck, 
  FaChartBar, 
  FaBook, 
  FaTasks, 
  FaMicrophoneAlt, 
  FaChevronRight, 
  FaFilter, 
  FaClock,
  FaUserCircle,
  FaCheckCircle,
  FaAward,
  FaBookOpen,
  FaShieldAlt
} from "react-icons/fa";

const StudentInternal = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [subjects, setSubjects] = useState([]);
  const [marksData, setMarksData] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [examType, setExamType] = useState("PRE-FINAL");

  // ==================================================
  // Fetch Student Marks from API Endpoint
  // ==================================================
  const fetchStudentMarks = async () => {
    if (!user.id) return;
    try {
      const res = await api.get(`/api/new-marks/current-session-internal-marks/${user.id}`);
      if (res.data && res.data.success) {
        setMarksData(res.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching internal marks:", error);
    }
  };

  // ==================================================
  // Fetch Subjects & Marks Based on Exam Type
  // ==================================================
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await fetchStudentMarks(); 
      
      try {
        const res = await api.get(`/api/students/my-exam-details`, {
          params: { student_id: user.id, exam_type: examType }
        });
        
        const serverSubjects = res.data?.subjects || res.data?.data?.subjects;
        if (serverSubjects && Array.isArray(serverSubjects) && serverSubjects.length > 0) {
          setSubjects(serverSubjects);
        } else {
          setSubjects([]); 
        }
      } catch (error) {
        console.error("Error fetching exam details:", error);
        setSubjects([]);
      } finally {
        setLoading(false);
      }
    };

    if (user.id) {
      fetchData();
    }
  }, [examType]);

  // ==================================================
  // Helper to find specific subject marks for selected exam
  // ==================================================
  const getMarksForSubject = (subjectName) => {
    return marksData.find(m => 
      m.subject && 
      m.subject.toLowerCase() === subjectName.toLowerCase() && 
      m.exam_type && 
      m.exam_type.toUpperCase() === examType.toUpperCase()
    );
  };

  return (
    <div style={styles.pageContainer}>
      
      {/* Top Branding & Profile Banner */}
      <div style={styles.topHeaderBanner}>
        <div style={styles.brandTitleRow}>
          <h1 style={styles.brandName}>Smart<span style={{ color: "#3b82f6" }}>Zone</span></h1>
          <div style={styles.sessionBadge}>
            <FaAward color="#f59e0b" size={15} />
            <span>Academic Session: 2026-27</span>
          </div>
        </div>

        <div style={styles.bannerContent}>
          <div style={styles.bannerLeft}>
            <div style={styles.avatarBox}>
              <FaUserCircle size={42} color="#3b82f6" />
            </div>
            <div>
              <h2 style={styles.welcomeText}>Welcome, {user.name || "Bhumika"}</h2>
              <p style={styles.rollText}>Student ID: {user.id || "2"} &bull; Class: {user.className || "Registered Student"}</p>
            </div>
          </div>
          <div style={styles.portalSecurityBadge}>
            <FaShieldAlt color="#059669" size={14} />
            <span>Secure Student Portal</span>
          </div>
        </div>
      </div>

      {/* Main Title & Exam Filter Section */}
      <div style={styles.headerContainer}>
        <div>
          <h2 style={styles.mainTitle}>My Courses & Internal Assessment</h2>
          <p style={styles.subTitle}>Viewing academic performance analytics for: <span style={{ color: '#2563eb', fontWeight: '700' }}>{examType}</span></p>
        </div>
        
        <div style={styles.examSelectorBox}>
          <div style={styles.filterIconWrapper}>
            <FaFilter color="#2563eb" size={14} />
          </div>
          <span style={styles.selectorLabel}>Select Exam:</span>
          <select 
            value={examType} 
            onChange={(e) => setExamType(e.target.value)} 
            style={styles.dropdown}
          >
            <option value="PRE-FINAL">PRE-FINAL</option>
            <option value="FINAL">FINAL</option>
            <option value="REAPPEAR 1">REAPPEAR 1</option>
            <option value="REAPPEAR 2">REAPPEAR 2</option>
          </select>
        </div>
      </div>

      {/* Modern Notice / Exam Time Table Banner */}
      <div style={styles.timeTableBox}>
        <div style={styles.timeTableInner}>
          <div style={styles.timeTableIconWrapper}>
             <FaClock color="#059669" size={18} />
          </div>
          <div>
            <h3 style={styles.timeTableTitle}>Exam Time Table & Schedule &mdash; {examType}</h3>
            <p style={styles.timeTableDesc}>
              Official schedules and room assignments will be uploaded soon by your administration panel. Check back regularly for updates.
            </p>
          </div>
        </div>
        <div style={styles.statusPill}>
          <FaCheckCircle color="#059669" size={13} />
          <span>Active Portal</span>
        </div>
      </div>
      
      {/* Dynamic Content Rendering */}
      {loading ? (
        <div style={styles.loaderContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loaderText}>Loading {examType} academic records securely...</p>
        </div>
      ) : subjects.length === 0 ? (
        <div style={styles.noDataContainer}>
          <div style={styles.noDataIconBox}>
            <FaBookOpen size={36} color="#94a3b8" />
          </div>
          <h3 style={styles.noDataTitle}>No Subjects Registered</h3>
          <p style={styles.noDataText}>
            No subjects have been assigned or registered for the <b>{examType}</b> examination type under your profile yet.
          </p>
        </div>
      ) : (
        <div style={styles.courseGrid}>
          {subjects.map((subject, index) => {
            const m = getMarksForSubject(subject);
            
            // Calculate internal subtotal excluding theory (Task + Viva + Behaviour + Attendance) out of 30 strictly
            const calculatedInternalTotal = m?.total_marks !== undefined && m?.total_marks !== null && m?.total_marks !== ""
              ? Number(m.task || 0) + Number(m.viva_marks || 0) + Number(m.behaviour || 0) + Number(m.attendance_marks || 0)
              : null;

            return (
              <div key={index} style={styles.subjectCard}>
                
                {/* Subject Card Header */}
                <div style={styles.cardHeader}>
                  <div style={styles.cardHeaderIcon}>
                    <FaGraduationCap size={18} color="#ffffff" />
                  </div>
                  <h3 style={styles.subName}>{subject.toUpperCase()}</h3>
                </div>
                
                {/* Card Body Options List */}
                <div style={styles.optionsList}>
                  
                  <OptionItem 
                    icon={<FaCalendarCheck size={13}/>} 
                    label="Attendance" 
                    value={m?.attendance_marks !== undefined && m?.attendance_marks !== null ? `${m.attendance_marks} / 5` : null} 
                  />
                  
                  <OptionItem 
                    icon={<FaChartBar size={13}/>} 
                    label="Total Marks" 
                    value={
                      m?.total_marks !== undefined && m?.total_marks !== null && m?.total_marks !== ""
                        ? `${calculatedInternalTotal} / 30`
                        : null
                    } 
                  />
                  
                  <OptionItem 
                    icon={<FaBook size={13}/>} 
                    label="Theory" 
                    value={m?.theory_marks ?? null} 
                  />
                  
                  <OptionItem 
                    icon={<FaTasks size={13}/>} 
                    label="Task" 
                    value={m?.task ?? null} 
                  />
                  
                  <OptionItem 
                    icon={<FaMicrophoneAlt size={13}/>} 
                    label="Viva" 
                    value={m?.viva_marks ?? null} 
                  />

                </div>

                {/* Card Footer Action Button */}
                <button style={styles.viewBtn} onClick={() => alert(`Detailed breakdown for ${subject.toUpperCase()} - ${examType}`)}>
                  <span>View Detailed Report</span> 
                  <FaChevronRight size={10} />
                </button>

              </div>
            );
          })}
        </div>
      )}
      
      {/* Footer Branding Note */}
      <div style={styles.footerNote}>
        <p>Smart Student Management System &copy; 2026 | Secure Academic Portal</p>
      </div>

    </div>
  );
};

// ==================================================
// Reusable Sub-Component for Rows
// ==================================================
const OptionItem = ({ icon, label, value }) => (
  <div style={styles.optionRow}>
    <div style={styles.optionRowLeft}>
      <span style={styles.iconBox}>{icon}</span>
      <span style={styles.optLabel}>{label}</span>
    </div>
    <span style={{ 
      ...styles.optValue, 
      color: value !== null && value !== undefined ? "#0f172a" : "#d97706",
      background: value !== null && value !== undefined ? "#f1f5f9" : "#fffbeb",
      border: value !== null && value !== undefined ? "1px solid #e2e8f0" : "1px solid #fde68a"
    }}>
      {value !== null && value !== undefined ? value : "Uploaded Soon"}
    </span>
  </div>
);

// ==================================================
// Comprehensive High-Tech Styles Configuration
// ==================================================
const styles = {
  pageContainer: { 
    padding: "35px 40px", 
    background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)", 
    minHeight: "100vh", 
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    boxSizing: "border-box"
  },
  
  topHeaderBanner: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "22px 28px",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.04)",
    marginBottom: "25px",
    border: "1px solid rgba(226, 232, 240, 0.9)"
  },
  brandTitleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "18px",
    borderBottom: "1px solid #f1f5f9",
    paddingBottom: "14px"
  },
  brandName: {
    margin: 0,
    fontSize: "24px",
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: "-0.03em"
  },
  bannerContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "18px"
  },
  bannerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px"
  },
  avatarBox: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid #dbeafe"
  },
  welcomeText: {
    margin: "0 0 3px 0",
    fontSize: "19px",
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: "-0.02em"
  },
  rollText: {
    margin: 0,
    fontSize: "13px",
    color: "#64748b",
    fontWeight: "500"
  },
  sessionBadge: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "#fffbeb",
    border: "1px solid #fef3c7",
    padding: "6px 14px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "700",
    color: "#b45309",
    boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
  },
  portalSecurityBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "#f0fdf4",
    border: "1px solid #d1fae5",
    padding: "6px 14px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "700",
    color: "#065f46"
  },

  headerContainer: { 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: "25px", 
    flexWrap: "wrap", 
    gap: "20px",
    background: "#ffffff",
    padding: "22px 28px",
    borderRadius: "18px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -2px rgba(0, 0, 0, 0.02)",
    border: "1px solid #e2e8f0"
  },
  mainTitle: { 
    color: "#0f172a", 
    margin: 0, 
    borderLeft: "5px solid #2563eb", 
    paddingLeft: "14px", 
    fontSize: "20px",
    fontWeight: "800",
    letterSpacing: "-0.02em"
  },
  subTitle: { 
    color: "#64748b", 
    margin: "5px 0 0 19px", 
    fontSize: "13px",
    fontWeight: "500"
  },
  
  examSelectorBox: { 
    display: "flex", 
    alignItems: "center", 
    background: "#f8fafc", 
    padding: "8px 14px", 
    borderRadius: "12px", 
    border: "1px solid #cbd5e1", 
    gap: "10px",
    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)"
  },
  filterIconWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  selectorLabel: { 
    fontWeight: "600", 
    fontSize: "13px", 
    color: "#334155" 
  },
  dropdown: { 
    padding: "8px 14px", 
    borderRadius: "8px", 
    border: "1px solid #94a3b8", 
    background: "#ffffff", 
    fontWeight: "700", 
    color: "#1e3a8a", 
    cursor: "pointer",
    outline: "none",
    fontSize: "13px"
  },
  
  timeTableBox: { 
    background: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)", 
    padding: "18px 24px", 
    borderRadius: "18px", 
    marginBottom: "30px", 
    borderLeft: "6px solid #059669", 
    boxShadow: "0 4px 12px rgba(5, 150, 105, 0.04)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "15px",
    border: "1px solid #d1fae5"
  },
  timeTableInner: {
    display: "flex",
    alignItems: "flex-start",
    gap: "14px"
  },
  timeTableIconWrapper: {
    background: "#d1fae5",
    padding: "10px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  timeTableTitle: { 
    margin: "0 0 4px 0", 
    fontSize: "15px", 
    fontWeight: "700", 
    color: "#065f46"
  },
  timeTableDesc: { 
    fontSize: "13px", 
    color: "#047857", 
    margin: 0, 
    lineHeight: "1.5",
    fontWeight: "500"
  },
  statusPill: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "#ffffff",
    padding: "6px 14px",
    borderRadius: "20px",
    border: "1px solid #a7f3d0",
    fontSize: "12px",
    fontWeight: "700",
    color: "#065f46"
  },

  loaderContainer: {
    height: "45vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "15px"
  },
  spinner: {
    width: "45px",
    height: "45px",
    border: "4px solid #e2e8f0",
    borderTop: "4px solid #2563eb",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite"
  },
  loaderText: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#475569"
  },

  noDataContainer: { 
    background: "#ffffff", 
    maxWidth: "480px", 
    margin: "60px auto", 
    padding: "40px 30px", 
    borderRadius: "20px", 
    textAlign: "center", 
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.05)", 
    border: "1px solid #e2e8f0" 
  },
  noDataIconBox: {
    width: "75px",
    height: "75px",
    background: "#f1f5f9",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 18px auto"
  },
  noDataTitle: { 
    color: "#0f172a", 
    margin: "0 0 10px 0", 
    fontSize: "19px",
    fontWeight: "700" 
  },
  noDataText: { 
    color: "#64748b", 
    fontSize: "13px", 
    margin: 0, 
    lineHeight: "1.6",
    fontWeight: "500" 
  },

  courseGrid: { 
    display: "grid", 
    gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", 
    gap: "25px" 
  },
  
  subjectCard: { 
    background: "#ffffff", 
    borderRadius: "18px", 
    padding: "22px", 
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.04)", 
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    transition: "transform 0.2s ease, box-shadow 0.2s ease"
  },
  
  cardHeader: { 
    background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)", 
    padding: "14px 18px", 
    borderRadius: "12px", 
    display: "flex", 
    alignItems: "center", 
    gap: "14px", 
    marginBottom: "18px",
    boxShadow: "0 4px 6px rgba(37, 99, 235, 0.15)"
  },
  cardHeaderIcon: {
    background: "rgba(255, 255, 255, 0.15)",
    padding: "8px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  subName: { 
    color: "#ffffff", 
    margin: 0, 
    fontSize: "15px", 
    fontWeight: "700",
    letterSpacing: "0.5px" 
  },
  
  optionsList: { 
    display: "flex", 
    flexDirection: "column", 
    gap: "10px",
    marginBottom: "18px" 
  },
  
  optionRow: { 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "space-between", 
    padding: "10px 14px", 
    background: "#f8fafc", 
    borderRadius: "10px", 
    border: "1px solid #f1f5f9" 
  },
  optionRowLeft: {
    display: "flex", 
    alignItems: "center", 
    gap: "12px"
  },
  iconBox: { 
    color: "#2563eb", 
    display: "flex", 
    alignItems: "center",
    background: "#eff6ff",
    padding: "6px",
    borderRadius: "6px"
  },
  optLabel: { 
    fontSize: "13px", 
    fontWeight: "600", 
    color: "#334155" 
  },
  optValue: { 
    fontSize: "13px", 
    fontWeight: "700",
    padding: "4px 10px",
    borderRadius: "6px"
  },
  
  viewBtn: { 
    width: "100%", 
    padding: "11px", 
    background: "linear-gradient(135deg, #059669 0%, #10b981 100%)", 
    color: "#ffffff", 
    border: "none", 
    borderRadius: "10px", 
    fontWeight: "700", 
    cursor: "pointer", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    gap: "8px", 
    fontSize: "13px",
    boxShadow: "0 4px 6px rgba(5, 150, 105, 0.2)"
  },

  footerNote: {
    textAlign: "center",
    marginTop: "45px",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "500",
    borderTop: "1px solid #e2e8f0",
    paddingTop: "20px"
  }
};

export default StudentInternal;