import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { FaGraduationCap, FaCalendarCheck, FaChartBar, FaBook, FaTasks, FaMicrophoneAlt, FaChevronRight, FaFilter, FaClock } from "react-icons/fa";

const StudentInternal = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [subjects, setSubjects] = useState([]);
  const [marksData, setMarksData] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [examType, setExamType] = useState("PRE-FINAL");

  // Marks fetch karne ka function
  const fetchStudentMarks = async () => {
    try {
      const res = await api.post(`/api/marks-new/check`, {
        studentId: user.id,
        studentName: user.name
      });
      if (res.data && res.data.success) {
        setMarksData(res.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching marks:", error);
    }
  };

  // Exam Type ke mutabiq strictly subjects fetch karna
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
          setSubjects([]); // Agar us exam type ke subjects nahi hain toh empty array
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

  // Specific subject ke liye marks nikalne ka helper
  const getMarksForSubject = (subjectName) => {
    return marksData.find(m => m.subject.toLowerCase() === subjectName.toLowerCase() && m.exam_type.toUpperCase() === examType.toUpperCase());
  };

  return (
    <div style={styles.pageContainer}>
      {/* Header & Exam Selector Section */}
      <div style={styles.headerContainer}>
        <div>
          <h1 style={styles.mainTitle}>My Courses & Internal Assessment</h1>
          <p style={styles.subTitle}>Viewing academic performance for: <b>{examType}</b></p>
        </div>
        
        <div style={styles.examSelectorBox}>
          <FaFilter color="#1a237e" />
          <span style={styles.selectorLabel}>Select Exam:</span>
          <select 
            value={examType} 
            onChange={(e) => setExamType(e.target.value)} 
            style={styles.dropdown}
          >
            <option value="PRE-FINAL">PRE-FINAL</option>
            <option value="FINAL">FINAL</option>
            <option value="REAPPEAR-1">REAPPEAR-1</option>
            <option value="REAPPEAR-2">REAPPEAR-2</option>
          </select>
        </div>
      </div>

      {/* Exam Time Table Section */}
      <div style={styles.timeTableBox}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
           <FaClock color="#059669" size={18} />
           <h3 style={{ margin: 0, fontSize: '15px', color: '#1e293b' }}>Exam Time Table - {examType}</h3>
        </div>
        <p style={{ fontSize: '13px', color: '#64748b', marginTop: '5px', marginBottom: 0 }}>
          Time table will be uploaded soon for this exam session.
        </p>
      </div>
      
      {loading ? (
        <div style={styles.loader}>Loading {examType} Subjects...</div>
      ) : subjects.length === 0 ? (
        <div style={styles.noDataContainer}>
          <h3 style={styles.noDataTitle}>No Subjects Found</h3>
          <p style={styles.noDataText}>
            No subjects are registered or assigned for the <b>{examType}</b> exam type yet.
          </p>
        </div>
      ) : (
        <div style={styles.courseGrid}>
          {subjects.map((subject, index) => {
            const m = getMarksForSubject(subject);
            return (
              <div key={index} style={styles.subjectCard}>
                <div style={styles.cardHeader}>
                  <FaGraduationCap size={22} color="#fff" />
                  <h3 style={styles.subName}>{subject.toUpperCase()}</h3>
                </div>
                
                <div style={styles.optionsList}>
                  <OptionItem icon={<FaCalendarCheck size={14}/>} label="Attendance" value={m?.attendance_marks ? `${m.attendance_marks} / 5` : null} />
                  <OptionItem icon={<FaChartBar size={14}/>} label="Total Marks" value={m?.obtained_marks ? `${m.obtained_marks} / ${m.total_marks}` : null} />
                  <OptionItem icon={<FaBook size={14}/>} label="Theory" value={m?.theory_marks || null} />
                  <OptionItem icon={<FaTasks size={14}/>} label="Task" value={m?.task || null} />
                  <OptionItem icon={<FaMicrophoneAlt size={14}/>} label="Viva" value={m?.viva_marks || null} />
                </div>

                <button style={styles.viewBtn}>View Details <FaChevronRight size={10}/></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const OptionItem = ({ icon, label, value }) => (
  <div style={styles.optionRow}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={styles.iconBox}>{icon}</span>
      <span style={styles.optLabel}>{label}</span>
    </div>
    <span style={{ 
      ...styles.optValue, 
      color: value ? "#1a237e" : "#d97706" 
    }}>
      {value || "Uploaded Soon"}
    </span>
  </div>
);

const styles = {
  pageContainer: { padding: "40px", background: "#f1f5f9", minHeight: "100vh", fontFamily: "sans-serif" },
  headerContainer: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px", flexWrap: "wrap", gap: "15px" },
  mainTitle: { color: "#1a237e", margin: 0, borderLeft: "6px solid #1a237e", paddingLeft: "15px", fontSize: "24px" },
  subTitle: { color: "#64748b", margin: "5px 0 0 21px", fontSize: "14px" },
  examSelectorBox: { display: "flex", alignItems: "center", background: "#fff", padding: "10px 15px", borderRadius: "10px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", gap: "10px" },
  selectorLabel: { fontWeight: "bold", fontSize: "13px", color: "#334155" },
  dropdown: { padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#f8fafc", fontWeight: "600", color: "#1a237e", cursor: "pointer" },
  
  timeTableBox: { background: "#fff", padding: "15px 20px", borderRadius: "12px", marginBottom: "25px", borderLeft: "4px solid #059669", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" },

  noDataContainer: { background: "#fff", maxWidth: "450px", margin: "50px auto", padding: "30px", borderRadius: "12px", textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" },
  noDataTitle: { color: "#1e293b", margin: "0 0 10px 0", fontSize: "18px" },
  noDataText: { color: "#64748b", fontSize: "13px", margin: 0, lineHeight: "1.5" },

  courseGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "25px" },
  subjectCard: { background: "#fff", borderRadius: "15px", padding: "20px", boxShadow: "0 10px 20px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0" },
  cardHeader: { background: "#1a237e", padding: "12px 15px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "12px", marginBottom: "15px" },
  subName: { color: "#fff", margin: 0, fontSize: "16px", letterSpacing: "0.5px" },
  
  optionsList: { display: "flex", flexDirection: "column", gap: "8px" },
  optionRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" },
  iconBox: { color: "#1a237e", display: "flex", alignItems: "center" },
  optLabel: { fontSize: "13px", fontWeight: "600", color: "#334155" },
  optValue: { fontSize: "13px", fontWeight: "bold" },
  
  viewBtn: { width: "100%", marginTop: "15px", padding: "9px", background: "#059669", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", fontSize: "13px" },
  loader: { height: "40vh", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "16px", fontWeight: "bold", color: "#475569" }
};

export default StudentInternal;