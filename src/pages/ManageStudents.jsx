import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { 
  FaUserPlus, FaTrashAlt, FaSearch, FaMicrophone, 
  FaUserGraduate, FaPhoneAlt, FaMapMarkerAlt, FaTimes, 
  FaFilter, FaFileExport, FaEllipsisV, FaCheckCircle, FaLock
} from "react-icons/fa";

const API_URL = process.env.REACT_APP_API_URL + "/api/students";

const ManageStudents = () => {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [showSlidePanel, setShowSlidePanel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "", studentClass: "", password: "", address: "", mobile: ""
  });

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(API_URL);
      if (res.data.success) setStudents(res.data.students);
    } catch (err) {
      console.error("Database Synchronization Failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Browser not supported");
    const recognition = new SpeechRecognition();
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (e) => setSearchTerm(e.results[0][0].transcript);
    recognition.start();
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async () => {
    try {
      const res = await axios.post(API_URL, formData);
      if (res.data.success) {
        setShowSlidePanel(false);
        fetchStudents();
        setFormData({ name: "", studentClass: "", password: "", address: "", mobile: "" });
      }
    } catch (err) { alert("Registration Failed"); }
  };

  const handleDelete = async (id) => {
    if (window.confirm("CRITICAL: Permanent deletion of record. Proceed?")) {
      await axios.delete(`${API_URL}/${id}`);
      fetchStudents();
    }
  };

  return (
    <div style={appContainer}>
      {/* 1. TOP HEADER */}
      <header style={headerSection}>
        <div style={brandGroup}>
          <div style={logoBox}><FaUserGraduate /></div>
          <div>
            <h1 style={mainTitle}>Core Registry</h1>
            <p style={subTitle}>Enterprise Student Information System</p>
          </div>
        </div>
        <div style={statsContainer}>
          <div style={statItem}>
            <span style={statVal}>{students.length}</span>
            <span style={statLab}>Students</span>
          </div>
          <div style={statDivider} />
          <div style={statItem}>
            <span style={statVal}>{new Set(students.map(s => s.class)).size}</span>
            <span style={statLab}>Classes</span>
          </div>
        </div>
      </header>

      {/* 2. SEARCH & ACTION BAR */}
      <div style={commandBar}>
        <div style={searchCluster}>
          <div style={voiceSearchWrapper}>
            <FaSearch style={searchIcon} />
            <input 
              type="text" 
              placeholder="Search students..." 
              style={searchField}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button 
              style={{...micBtn, color: isListening ? '#ff4d4d' : '#94a3b8'}} 
              onClick={handleVoiceSearch}
            >
              <FaMicrophone />
            </button>
          </div>
        </div>
        <div style={actionCluster}>
          <button style={newRegBtn} onClick={() => setShowSlidePanel(true)}>
            <FaUserPlus /> New Registration
          </button>
        </div>
      </div>

      {/* 3. EDGE-TO-EDGE DATA TABLE */}
      <main style={gridWrapper}>
        <div style={scrollContainer}>
          <table style={enterpriseTable}>
            <thead>
              <tr style={tableHeaderRow}>
                <th style={th}>Student Details</th>
                <th style={th}>Batch</th>
                <th style={th}>Contact</th>
                <th style={th}>Address</th>
                <th style={th}>Status</th>
                <th style={th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {students
                .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((s) => (
                <tr key={s.id} style={dataRowStyle} className="row-hover">
                  <td style={td}>
                    <div style={identityGroup}>
                      <div style={avatarStyle}>{s.name.charAt(0)}</div>
                      <div>
                        <div style={empName}>{s.name}</div>
                        <div style={empId}>UID-{s.id}</div>
                      </div>
                    </div>
                  </td>
                  <td style={td}><span style={deptBadge}>Class {s.class}</span></td>
                  <td style={td}><div style={contactInfo}><FaPhoneAlt size={11}/> {s.mobile}</div></td>
                  <td style={td}><div style={addressInfo} title={s.address}>{s.address}</div></td>
                  <td style={td}><span style={statusTag}><FaCheckCircle size={10}/> Verified</span></td>
                  <td style={td}>
                    <button style={rowActionBtn} onClick={() => handleDelete(s.id)}><FaTrashAlt /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && <div style={loaderStyle}>Syncing records...</div>}
      </main>

      {/* 4. SLIDE-OVER PANEL */}
      <div style={{...sidePanel, transform: showSlidePanel ? 'translateX(0)' : 'translateX(100%)'}}>
        <div style={panelHeader}>
          <h2>New Registration</h2>
          <button onClick={() => setShowSlidePanel(false)} style={closePanelBtn}><FaTimes /></button>
        </div>
        <div style={panelBody}>
          <div style={formGroup}>
            <label style={labelStyle}>Full Name</label>
            <input name="name" style={panelInput} placeholder="Enter Name" onChange={handleInputChange} />
            <label style={labelStyle}>Class</label>
            <input name="studentClass" style={panelInput} placeholder="e.g. 10th" onChange={handleInputChange} />
            <label style={labelStyle}>Mobile</label>
            <input name="mobile" style={panelInput} placeholder="+91" onChange={handleInputChange} />
            <label style={labelStyle}>Address</label>
            <textarea name="address" style={panelTextarea} placeholder="Full Address" onChange={handleInputChange} />
            <button style={submitRegistrationBtn} onClick={handleRegister}>Register Student</button>
          </div>
        </div>
      </div>
      {showSlidePanel && <div style={panelOverlay} onClick={() => setShowSlidePanel(false)} />}

      <style>{`
        .row-hover:hover { background-color: #f8fafc !important; }
        ::-webkit-scrollbar { height: 4px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
};

// ============ STYLES (Fixed dataRow issue) ============
const appContainer = { background: "#fff", minHeight: "100vh", width: "100vw", overflowX: "hidden" };
const headerSection = { display: "flex", justifyContent: "space-between", padding: "30px 40px", background: "#0f172a", color: "#fff" };
const brandGroup = { display: "flex", alignItems: "center", gap: "15px" };
const logoBox = { width: "40px", height: "40px", background: "#3b82f6", borderRadius: "8px", display: "flex", justifyContent: "center", alignItems: "center" };
const mainTitle = { fontSize: "22px", margin: 0, fontWeight: "700" };
const subTitle = { fontSize: "12px", opacity: 0.5, margin: 0 };
const statsContainer = { display: "flex", gap: "25px" };
const statItem = { textAlign: "right" };
const statVal = { display: "block", fontSize: "20px", fontWeight: "700" };
const statLab = { fontSize: "10px", opacity: 0.5, textTransform: "uppercase" };
const statDivider = { width: "1px", background: "rgba(255,255,255,0.1)" };

const commandBar = { display: "flex", justifyContent: "space-between", padding: "15px 40px", borderBottom: "1px solid #f1f5f9", background: "#fff" };
const searchCluster = { flex: 0.6 };
const voiceSearchWrapper = { position: "relative", display: "flex", alignItems: "center" };
const searchIcon = { position: "absolute", left: "12px", color: "#94a3b8" };
const searchField = { width: "100%", padding: "10px 40px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#f8fafc" };
const micBtn = { position: "absolute", right: "12px", background: "none", border: "none", cursor: "pointer" };
const actionCluster = { display: "flex", alignItems: "center" };
const newRegBtn = { background: "#3b82f6", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "600", cursor: "pointer" };

const gridWrapper = { width: "100%", overflow: "hidden" };
const scrollContainer = { overflowX: "auto", width: "100%" };
const enterpriseTable = { width: "100%", borderCollapse: "collapse", minWidth: "1000px" };
const tableHeaderRow = { background: "#f8fafc" };
const th = { padding: "15px 40px", textAlign: "left", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", borderBottom: "1px solid #f1f5f9" };
const td = { padding: "15px 40px", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" };
const dataRowStyle = { transition: "0.2s" };

const identityGroup = { display: "flex", alignItems: "center", gap: "12px" };
const avatarStyle = { width: "35px", height: "35px", borderRadius: "50%", background: "#eff6ff", color: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700" };
const empName = { fontWeight: "700", color: "#1e293b", fontSize: "14px" };
const empId = { fontSize: "11px", color: "#94a3b8" };
const deptBadge = { background: "#f1f5f9", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", color: "#475569" };
const contactInfo = { fontSize: "13px", color: "#1e293b", display: "flex", alignItems: "center", gap: "5px" };
const addressInfo = { fontSize: "13px", color: "#64748b", maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const statusTag = { padding: "3px 8px", background: "#dcfce7", color: "#15803d", borderRadius: "10px", fontSize: "10px", fontWeight: "700" };
const rowActionBtn = { background: "none", border: "none", color: "#cbd5e1", cursor: "pointer" };

const sidePanel = { position: "fixed", top: 0, right: 0, width: "400px", height: "100%", background: "#fff", zPath: 1000, transition: "0.3s ease", boxShadow: "-5px 0 15px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column" };
const panelHeader = { padding: "20px", background: "#0f172a", color: "#fff", display: "flex", justifyContent: "space-between" };
const closePanelBtn = { background: "none", border: "none", color: "#fff", fontSize: "18px" };
const panelBody = { padding: "20px" };
const formGroup = { display: "flex", flexDirection: "column", gap: "10px" };
const labelStyle = { fontSize: "12px", fontWeight: "700" };
const panelInput = { padding: "10px", border: "1px solid #e2e8f0", borderRadius: "6px" };
const panelTextarea = { padding: "10px", border: "1px solid #e2e8f0", borderRadius: "6px", height: "80px" };
const submitRegistrationBtn = { background: "#3b82f6", color: "#fff", border: "none", padding: "12px", borderRadius: "8px", fontWeight: "700", cursor: "pointer" };
const panelOverlay = { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.3)", backdropFilter: "blur(2px)" };
const loaderStyle = { textAlign: "center", padding: "40px", color: "#94a3b8" };

export default ManageStudents;