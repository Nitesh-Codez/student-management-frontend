import React, { useEffect, useState } from "react";
import axios from "axios";
import { 
  FaGraduationCap, FaSave, FaEdit, FaPlusCircle, FaFilter, 
  FaTrash, FaUsers, FaCalendarAlt, FaLaptop, FaMobileAlt, FaStar, FaCheckCircle
} from "react-icons/fa";

const API_URL = "https://student-management-system-4-hose.onrender.com";

const AdminAddMarks = () => {
  const subjectsByClass = {
    "1st": ["Math","English","Hindi","EVS","Math Viva","English Viva","Hindi Viva","EVS Viva"],
    "2nd": ["Math","English","Hindi","EVS","Math Viva","English Viva","Hindi Viva","EVS Viva"],
    "3rd": ["Math","English","Hindi","EVS","Math Viva","English Viva","Hindi Viva","EVS Viva"],
    "4th": ["Math","English","Hindi","EVS","Math Viva","English Viva","Hindi Viva","EVS Viva"],
    "5th": ["Math","English","Hindi","EVS","Math Viva","English Viva","Hindi Viva","EVS Viva"],
    "6th": ["Math","English","Hindi","Science","Math Viva","English Viva","Hindi Viva","Science Viva"],
    "7th": ["Math","English","Hindi","Science","Civics","Geography","Economics","History","Math Viva","English Viva","Hindi Viva","Science Viva","Civics Viva","Geography Viva","Economics Viva","History Viva"],
    "8th": ["Math","English","Science","Hindi","Civics","Geography","Economics","History","Math Viva","English Viva","Science Viva","Hindi Viva","Civics Viva","Geography Viva","Economics Viva","History Viva"],
    "9th": ["Math","English","Hindi","Science","S.S.T","Math Viva","English Viva","Hindi Viva","Science Viva","S.S.T Viva"],
    "10th":["Math","English","Hindi","Science","S.S.T","Math Viva","English Viva","Hindi Viva","Science Viva","S.S.T Viva"],
    "11th":["Chemistry","Math","English","Physics","Biology","Chemistry Viva","Math Viva","English Viva","Physics Viva","Biology Viva"],
    "12th":["Chemistry","Math","English","Physics","Biology","Chemistry Viva","Math Viva","English Viva","Physics Viva","Biology Viva"],
  };

  const classColorPalette = {
    "1st": { bg: "#e0f2fe", text: "#0369a1", border: "#bae6fd" },
    "2nd": { bg: "#dcfce7", text: "#15803d", border: "#bbf7d0" },
    "3rd": { bg: "#fef9c3", text: "#a16207", border: "#fef08a" },
    "4th": { bg: "#f3e8ff", text: "#6b21a8", border: "#e9d5ff" },
    "5th": { bg: "#ffe4e6", text: "#be123c", border: "#fecdd3" },
    "6th": { bg: "#e2e8f0", text: "#334155", border: "#cbd5e1" },
    "7th": { bg: "#ffedd5", text: "#c2410c", border: "#fed7aa" },
    "8th": { bg: "#ccfbf1", text: "#0f766e", border: "#99f6e4" },
    "9th": { bg: "#fae8ff", text: "#86198f", border: "#f5d0fe" },
    "10th": { bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" },
    "11th": { bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" },
    "12th": { bg: "#fff1f2", text: "#9f1239", border: "#fecdd3" },
  };

  const subjectColors = [
    { bg: "#2563eb", text: "#ffffff", columnBg: "#eff6ff", metaBg: "#dbeafe" }, 
    { bg: "#16a34a", text: "#ffffff", columnBg: "#f0fdf4", metaBg: "#dcfce7" }, 
    { bg: "#7c3aed", text: "#ffffff", columnBg: "#f5f3ff", metaBg: "#ede9fe" }, 
    { bg: "#ea580c", text: "#ffffff", columnBg: "#fff7ed", metaBg: "#ffedd5" }, 
    { bg: "#0891b2", text: "#ffffff", columnBg: "#ecfeff", metaBg: "#cffafe" }, 
    { bg: "#db2777", text: "#ffffff", columnBg: "#fdf2f8", metaBg: "#fce7f3" }, 
    { bg: "#4f46e5", text: "#ffffff", columnBg: "#eef2ff", metaBg: "#e0e7ff" }, 
    { bg: "#059669", text: "#ffffff", columnBg: "#f0fdfa", metaBg: "#ccfbf1" }, 
    { bg: "#dc2626", text: "#ffffff", columnBg: "#fef2f2", metaBg: "#fee2e2" }, 
    { bg: "#9333ea", text: "#ffffff", columnBg: "#faf5ff", metaBg: "#f3e8ff" }, 
  ];

  const [allStudents, setAllStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [subject, setSubject] = useState("");
  const [marks, setMarks] = useState("");
  const [maxMarks, setMaxMarks] = useState(100);
  const [testDate, setTestDate] = useState(new Date().toISOString().split("T")[0]);
  const [message, setMessage] = useState({ text: "", type: "" });

  const [allMarks, setAllMarks] = useState([]);
  const [searchClass, setSearchClass] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [searchName, setSearchName] = useState(""); 
  const [secretKey, setSecretKey] = useState("");

  const [editId, setEditId] = useState(null);
  const [editMarks, setEditMarks] = useState("");
  const [editTotal, setEditTotal] = useState(maxMarks);
  const [editSubject, setEditSubject] = useState("");
  const [editDate, setEditDate] = useState("");
  const [viewMode, setViewMode] = useState("laptop");

  useEffect(() => {
    axios.get(`${API_URL}/api/students`).then(res => {
      if (res.data.success) {
        setAllStudents(res.data.students);
        setClasses([...new Set(res.data.students.map(s => s.class))]);
      }
    });
  }, []);

  useEffect(() => {
    setStudents(selectedClass ? allStudents.filter(s => s.class === selectedClass) : []);
  }, [selectedClass, allStudents]);

  const fetchAllMarks = async () => {
    const res = await axios.get(`${API_URL}/api/marks/admin/marks`);
    if (res.data.success) setAllMarks(res.data.data);
  };

  useEffect(() => { fetchAllMarks(); }, []);

  const filteredMarks = allMarks.filter(m => {
    const tDate = new Date(m.test_date);
    const startDate = new Date("2026-04-01");
    const endDate = new Date("2027-03-31");
    
    const isCurrentSession = tDate >= startDate && tDate <= endDate;
    const matchesClass = searchClass ? m.class === searchClass : true;
    const matchesDate = searchDate ? new Date(m.test_date).toISOString().split("T")[0] === searchDate : true;
    const matchesName = searchName ? m.name.toLowerCase().includes(searchName.toLowerCase()) : true;
    
    return isCurrentSession && matchesClass && matchesDate && matchesName;
  });

  const handleAddMarks = async () => {
    if (!selectedStudent || !subject || !marks) {
      return setMessage({ text: "Please fill all fields!", type: "error" });
    }
    const res = await axios.post(`${API_URL}/api/marks/add`, {
      studentId: selectedStudent, subject, marks: +marks, maxMarks: +maxMarks, date: testDate
    });
    if (res.data.success) {
      setMessage({ text: "Marks Added Successfully!", type: "success" });
      setMarks(""); setSubject(""); setSelectedStudent("");
      fetchAllMarks();
      setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    }
  };

  const handleUpdate = async (record) => {
    try {
      await axios.put(
        `${API_URL}/api/marks/admin/marks/${record.id}`,
        {
          subject: editSubject || record.subject,
          marks: +editMarks,
          maxMarks: +editTotal,
          date: editDate || record.test_date
        },
        { headers: { "x-head-secret": secretKey } }
      );
      setEditId(null);
      setSecretKey("");
      fetchAllMarks();
      setMessage({ text: "Record Updated Successfully!", type: "success" });
      setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    } catch (err) {
      setMessage({ text: "Only HEAD can edit marks!", type: "error" });
      setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this record?");
    if (!confirmDelete) return;

    try {
      await axios.delete(`${API_URL}/api/marks/admin/marks/${id}`, {
        headers: { "x-head-secret": secretKey }
      });
      setMessage({ text: "Record Deleted Successfully!", type: "success" });
      fetchAllMarks();
      setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    } catch (err) {
      setMessage({ text: "Only HEAD can delete marks!", type: "error" });
      setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    }
  };

  const getSuperGroupedData = () => {
    const hierarchy = {};
    filteredMarks.forEach(m => {
      const cls = m.class;
      const sub = m.subject;
      const dateObj = new Date(m.test_date);
      const formattedDate = !isNaN(dateObj) 
        ? dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : "N/A";
      
      const testKey = `${m.test_date}-${m.total_marks}`;

      if (!hierarchy[cls]) hierarchy[cls] = {};
      if (!hierarchy[cls][sub]) hierarchy[cls][sub] = {};
      
      if (!hierarchy[cls][sub][testKey]) {
        hierarchy[cls][sub][testKey] = {
          date: formattedDate,
          maxMarks: m.total_marks,
          students: []
        };
      }
      hierarchy[cls][sub][testKey].students.push(m);
    });
    return hierarchy;
  };

  const superGroupedData = getSuperGroupedData();

  return (
    <div style={styles.page}>
      <div style={styles.glowOrb1}></div>
      <div style={styles.glowOrb2}></div>

      <div style={styles.container}>
        
        {/* HEADER */}
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <FaGraduationCap size={50} className="floating" style={{ color: "#0f172a" }} />
          </div>
          <h2 style={styles.heading}>Smart Student Dashboard</h2>
          <div style={styles.badge}>Academic Session: 2026-2027</div>
        </div>

        {message.text && (
          <div style={message.type === "error" ? styles.errorMsg : styles.successMsg}>
            <span style={{ fontSize: '18px', marginRight: '8px' }}>{message.type === "error" ? "⚠️" : "⚡"}</span>
            {message.text}
          </div>
        )}

        {/* ADD MARKS CARD */}
        <div style={styles.glassCard}>
          <h3 style={styles.cardTitle}><FaPlusCircle size={22} style={{ color: "#1e293b" }} /> Add Marks Entry</h3>
          <div style={styles.grid}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Class</label>
              <select style={styles.input} value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                <option value="" style={styles.optionLight}>Select Class</option>
                {classes.map((c, i) => <option key={i} style={styles.optionLight}>{c}</option>)}
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Student</label>
              <select style={styles.input} value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
                <option value="" style={styles.optionLight}>Select Student</option>
                {students.map(s => <option key={s.id} value={s.id} style={styles.optionLight}>{s.name}</option>)}
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Subject</label>
              <select style={styles.input} value={subject} onChange={e => setSubject(e.target.value)}>
                <option value="" style={styles.optionLight}>Select Subject</option>
                {subjectsByClass[selectedClass]?.map((s, i) => <option key={i} style={styles.optionLight}>{s}</option>)}
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Marks Obtained</label>
              <input style={styles.input} type="number" placeholder="Enter Marks" value={marks} onChange={e => setMarks(e.target.value)} />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Max Total</label>
              <input style={styles.input} type="number" value={maxMarks} onChange={e => setMaxMarks(e.target.value)} />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Test Date</label>
              <input style={styles.input} type="date" value={testDate} onChange={e => setTestDate(e.target.value)} />
            </div>
          </div>
          <button style={styles.primaryButton} onClick={handleAddMarks}>Secure Save Entry</button>
        </div>

        {/* FILTER BOX */}
        <div style={styles.searchBox}>
          <h4 style={{ ...styles.cardTitle, color: "#1e293b", marginBottom: '15px' }}><FaFilter /> Advanced Real-time Engine</h4>
          <div style={styles.grid3}>
            <input style={styles.input} placeholder="🔍 Type Student Name..." value={searchName} onChange={e => setSearchName(e.target.value)} />
            <select style={styles.input} value={searchClass} onChange={e => setSearchClass(e.target.value)}>
              <option value="" style={styles.optionLight}>All Classes</option>
              {classes.map((c, i) => <option key={i} style={styles.optionLight}>{c}</option>)}
            </select>
            <input style={styles.input} type="date" value={searchDate} onChange={e => setSearchDate(e.target.value)} />
          </div>
        </div>

        {/* VIEW TOGGLE CONTROLS */}
        <div style={styles.meetingBar}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <FaUsers size={26} style={{ color: "#0f172a" }} />
            <h3 style={styles.meetingHeading}>PARENTS MEETING MARKS SHEET</h3>
          </div>
          
          <div style={styles.toggleGroup}>
            <button 
              style={{ ...styles.toggleBtn, ...(viewMode === "laptop" ? styles.toggleActive : {}) }}
              onClick={() => setViewMode("laptop")}
            >
              <FaLaptop size={14} /> Desktop Matrix
            </button>
            <button 
              style={{ ...styles.toggleBtn, ...(viewMode === "mobile" ? styles.toggleActive : {}) }}
              onClick={() => setViewMode("mobile")}
            >
              <FaMobileAlt size={14} /> Mobile Feed
            </button>
          </div>
        </div>

        {/* MAIN DATA SHEET */}
        {Object.keys(superGroupedData).length === 0 ? (
          <div style={styles.noDataCard}>No cryptographic records found for Academic Session 2026-27.</div>
        ) : (
          Object.entries(superGroupedData).map(([className, subjects]) => {
            const themeColors = classColorPalette[className] || { bg: "#f1f5f9", text: "#0f172a", border: "#cbd5e1" };

            return (
              <div key={className} style={styles.classContainer}>
                
                {/* Class Banner Row */}
                <div style={{
                  ...styles.classBadgeHeader,
                  background: themeColors.bg,
                  color: themeColors.text,
                  borderColor: themeColors.border
                }}>
                  CLASS {className.toUpperCase()}
                </div>
                
                <div style={styles.scrollWrapper}>
                  <div style={viewMode === "laptop" ? styles.sheetContainerGrid : styles.sheetContainerFlex}>
                    {Object.entries(subjects).map(([subjectName, tests], subIdx) => {
                      const normSubject = subjectName.toUpperCase();
                      const pickHeaderColor = subjectColors[subIdx % subjectColors.length];

                      return (
                        <div 
                          key={subjectName} 
                          style={{
                            ...styles.excelColumn,
                            background: pickHeaderColor.columnBg, 
                            borderColor: pickHeaderColor.bg
                          }}
                        >
                          
                          {/* Subject Header */}
                          <div style={{
                            ...styles.subjectHeader,
                            background: pickHeaderColor.bg,
                            color: pickHeaderColor.text
                          }}>
                            {normSubject}
                          </div>

                          <div style={styles.testsContainer}>
                            {Object.entries(tests).map(([testKey, testData]) => (
                              <div key={testKey} style={styles.singleTestBlock}>
                                
                                <div style={{
                                  ...styles.metaHeader,
                                  background: pickHeaderColor.metaBg,
                                  borderBottom: `2px solid ${pickHeaderColor.bg}`
                                }}>
                                  <span style={styles.dateText}>
                                    <FaCalendarAlt size={13} style={{ color: '#1e293b' }} /> {testData.date}
                                  </span>
                                  <span style={{...styles.testTag, borderColor: pickHeaderColor.bg}}>MM: {testData.maxMarks}</span>
                                </div>

                                <div style={styles.studentsBlock}>
                                  {testData.students.map((m) => {
                                    const percentage = (m.obtained_marks / m.total_marks) * 100;
                                    const isTopper = percentage >= 80;
                                    const isFailed = m.status !== 'Pass' || percentage < 33;
                                    const isPassOnly = !isTopper && !isFailed;

                                    return (
                                      <div 
                                        key={m.id} 
                                        style={{
                                          ...styles.studentRow,
                                          background: isFailed ? "#f0d2d2" : isTopper ? "#f0fdf4" : "#ffffff"
                                        }}
                                      >
                                        {editId === m.id ? (
                                          <div style={styles.inlineEditBox}>
                                            <input style={styles.sheetEditIn} type="number" value={editMarks} onChange={e => setEditMarks(e.target.value)} />
                                            <button style={styles.sheetSaveBtn} onClick={() => handleUpdate(m)}><FaSave /></button>
                                          </div>
                                        ) : (
                                          <div style={styles.studentInfoLine}>
                                            <span style={styles.studentNameText}>
                                              {m.name.toUpperCase()} 
                                              {isTopper && <FaStar size={18} style={styles.star3D} title="Top Scorer (80%+)" />}
                                              {isFailed && <span style={styles.failLabel}>FAIL</span>}
                                              {isPassOnly && <span style={styles.passLabel}>PASS</span>}
                                            </span>
                                            
                                            <div style={styles.rightSideRow}>
                                              <span style={styles.studentMarksText}>
                                                {m.obtained_marks}/{m.total_marks}
                                              </span>
                                              
                                              <div style={styles.actionIconGroup}>
                                                <button style={styles.iconEditBtn} onClick={() => {
                                                  const key = prompt("Enter Head Secret Key to Edit");
                                                  if (!key) return;
                                                  setSecretKey(key);
                                                  setEditId(m.id);
                                                  setEditMarks(m.obtained_marks);
                                                  setEditTotal(m.total_marks);
                                                  setEditSubject(m.subject);
                                                  setEditDate(new Date(m.test_date).toISOString().split("T")[0]);
                                                }}><FaEdit size={18} /></button>
                                                
                                                <button style={styles.iconDeleteBtn} onClick={() => {
                                                  const key = prompt("Enter Head Secret Key to Delete");
                                                  if (!key) return;
                                                  setSecretKey(key);
                                                  handleDelete(m.id);
                                                }}>×</button>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}

      </div>
      
      <style>{`
        @keyframes pulseGlow {
          0% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.05); opacity: 0.6; }
          100% { transform: scale(1); opacity: 0.4; }
        }
        .floating { animation: float 3s ease-in-out infinite; }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0px); }
        }
      `}</style>
    </div>
  );
};

const styles = {
  page: { 
    background: "#f1f5f9", minHeight: "100vh", padding: "40px 10px", color: "#1e293b", 
    fontFamily: "'Times New Roman', Times, serif", position: "relative", overflow: "hidden"
  },
  glowOrb1: {
    position: "absolute", width: "600px", height: "600px", borderRadius: "50%",
    background: "radial-gradient(circle, rgba(219,234,254,0.8) 0%, rgba(255,255,255,0) 70%)",
    top: "-150px", left: "-150px", zIndex: 0, animation: "pulseGlow 8s infinite ease-in-out"
  },
  glowOrb2: {
    position: "absolute", width: "700px", height: "700px", borderRadius: "50%",
    background: "radial-gradient(circle, rgba(243,232,255,0.9) 0%, rgba(255,255,255,0) 70%)",
    bottom: "-200px", right: "-150px", zIndex: 0, animation: "pulseGlow 10s infinite ease-in-out"
  },
  container: { maxWidth: "100%", padding: "0 10px", margin: "0 auto", position: "relative", zIndex: 1 },
  header: { textAlign: "center", marginBottom: "45px", display: "flex", flexDirection: "column", alignItems: "center" },
  logoContainer: {
    background: "#ffffff", border: "2px solid #cbd5e1", padding: "18px", borderRadius: "50%", marginBottom: "15px", boxShadow: "0 12px 28px rgba(0,0,0,0.06)"
  },
  heading: { margin: "5px 0", color: "#0f172a", fontSize: "38px", fontWeight: "800", letterSpacing: "0.5px" },
  badge: { background: "#ffffff", border: "1px solid #94a3b8", padding: "8px 20px", borderRadius: "25px", fontSize: "15px", fontWeight: "700", color: "#1e293b", boxShadow: "0 4px 14px rgba(0,0,0,0.04)" },
  
  glassCard: { 
    background: "#ffffff", padding: "35px", borderRadius: "20px", boxShadow: "0 12px 35px rgba(0,0,0,0.05)", marginBottom: "35px", border: "1px solid #e2e8f0" 
  },
  cardTitle: { marginTop: 0, marginBottom: "30px", fontSize: "22px", display: "flex", alignItems: "center", gap: "12px", color: "#0f172a", fontWeight: "700" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "25px" },
  grid3: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "25px" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "10px" },
  label: { fontSize: "14px", fontWeight: "700", color: "#334155", letterSpacing: "0.5px" },
  input: { 
    padding: "14px 18px", borderRadius: "12px", border: "1px solid #cbd5e1", 
    background: "#ffffff", color: "#0f172a", outline: "none", fontSize: "16px", boxSizing: "border-box",
    fontFamily: "'Times New Roman', Times, serif", width: "100%", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)"
  },
  optionLight: { background: "#ffffff", color: "#0f172a", padding: "10px" },
  primaryButton: { 
    width: "100%", marginTop: "30px", padding: "16px", background: "#0f172a", 
    color: "#ffffff", border: "none", borderRadius: "12px", fontWeight: "700", fontSize: "18px",
    cursor: "pointer", boxShadow: "0 6px 16px rgba(15,23,42,0.25)", fontFamily: "'Times New Roman', Times, serif",
    transition: "all 0.2s ease"
  },
  searchBox: { 
    background: "#ffffff", padding: "30px", borderRadius: "20px", marginBottom: "45px", border: "1px solid #e2e8f0", boxShadow: "0 8px 25px rgba(0,0,0,0.03)"
  },
  
  meetingBar: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "25px", marginBottom: "30px" },
  meetingHeading: { fontSize: "24px", fontWeight: "800", color: "#0f172a", margin: 0, letterSpacing: "0.5px" },
  toggleGroup: { background: "#cbd5e1", padding: "6px", borderRadius: "12px", display: "flex", gap: "6px" },
  toggleBtn: { border: "none", background: "transparent", padding: "10px 20px", fontSize: "15px", fontWeight: "700", color: "#475569", borderRadius: "10px", cursor: "pointer", fontFamily: "'Times New Roman', Times, serif", display: "flex", alignItems: "center", gap: "6px" },
  toggleActive: { background: "#ffffff", color: "#0f172a", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" },

  noDataCard: { background: "#ffffff", padding: "50px", borderRadius: "20px", textAlign: "center", color: "#64748b", border: "1px solid #e2e8f0", fontWeight: "700", fontSize: "18px" },
  
  classContainer: { marginBottom: "45px", background: "#ffffff", padding: "30px", borderRadius: "24px", border: "1px solid #e2e8f0", boxShadow: "0 15px 40px rgba(0,0,0,0.04)" },
  
  classBadgeHeader: { 
    border: "2px solid", 
    fontWeight: "900", 
    display: "block", 
    padding: "14px 25px", 
    borderRadius: "14px", 
    fontSize: "18px", 
    marginBottom: "25px", 
    letterSpacing: "1.5px",
    boxShadow: "0 6px 16px rgba(0,0,0,0.02)",
    textAlign: "center"
  },
  
  scrollWrapper: { width: "100%", overflowX: "auto" },
  sheetContainerGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "25px" }, 
  sheetContainerFlex: { display: "flex", gap: "20px", alignItems: "flex-start" }, 
  
  excelColumn: { 
    borderRadius: "16px", 
    overflow: "hidden", 
    border: "2px solid", 
    boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
    display: "flex",
    flexDirection: "column"
  },
  
  subjectHeader: { 
    fontWeight: "900", 
    fontSize: "18px", 
    padding: "18px 16px", 
    textAlign: "center", 
    letterSpacing: "1px", 
    textShadow: "0 1px 3px rgba(0,0,0,0.2)"
  },
  
  testsContainer: { 
    padding: "16px", 
    display: "flex", 
    flexDirection: "column",
    gap: "20px" 
  },
  
  singleTestBlock: { 
    background: "#ffffff", 
    borderRadius: "12px", 
    overflow: "hidden", 
    border: "1px solid #cbd5e1",
    boxShadow: "0 4px 12px rgba(0,0,0,0.03)"
  },
  
  metaHeader: { 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center", 
    fontSize: "14px", 
    padding: "12px 14px", 
    fontWeight: "800"
  },

  dateText: { display: "flex", alignItems: "center", gap: "8px", color: "#1e293b" },
  testTag: { background: "#ffffff", padding: "4px 10px", borderRadius: "6px", color: "#0f172a", border: "1px solid", fontSize: "13px", fontWeight: "800" },
  
  studentsBlock: { padding: "4px 0" },
  studentRow: { padding: "14px 16px", fontSize: "16px", borderBottom: "1px solid #f1f5f9", transition: "all 0.2s ease" },
  studentInfoLine: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  
  studentNameText: { fontWeight: "700", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
  failLabel: { color: "#dc2626", fontSize: "12px", fontWeight: "900", background: "#fef2f2", padding: "2px 8px", borderRadius: "6px", border: "1px solid #fca5a5", letterSpacing: "0.5px" },
  passLabel: { color: "#16a34a", fontSize: "12px", fontWeight: "900", background: "#f0fdf4", padding: "2px 8px", borderRadius: "6px", border: "1px solid #bbf7d0", letterSpacing: "0.5px" },
  star3D: { color: "#eab308", filter: "drop-shadow(0 2px 4px rgba(234,179,8,0.4))" },
  
  rightSideRow: { display: "flex", alignItems: "center", gap: "12px" },
  studentMarksText: { fontWeight: "900", fontSize: "17px", color: "#000000", minWidth: "55px", textAlign: "right" }, 
  
  actionIconGroup: { display: "flex", alignItems: "center", gap: "6px", marginLeft: "10px" },
  iconEditBtn: { background: "#f1f5f9", border: "1px solid #cbd5e1", color: "#475569", padding: "6px 8px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center" },
  iconDeleteBtn: { background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontWeight: "900", fontSize: "16px", lineHeight: "1" },
  
  inlineEditBox: { display: "flex", gap: "6px", width: "100%" },
  sheetEditIn: { width: "100%", padding: "6px 10px", fontSize: "14px", border: "1px solid #cbd5e1", borderRadius: "8px", fontFamily: "'Times New Roman', Times, serif" },
  sheetSaveBtn: { background: "#0f172a", border: "none", color: "#ffffff", padding: "6px 12px", borderRadius: "8px", fontWeight: "700" },

  successMsg: { padding: "16px", background: "#f0fdf4", border: "2px solid #bbf7d0", color: "#16a34a", borderRadius: "12px", marginBottom: "25px", textAlign: "center", fontWeight: "700", fontSize: "16px" },
  errorMsg: { padding: "16px", background: "#fef2f2", border: "2px solid #fca5a5", color: "#dc2626", borderRadius: "12px", marginBottom: "25px", textAlign: "center", fontWeight: "700", fontSize: "16px" }
};

export default AdminAddMarks;