import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { 
  FaUserPlus, FaTrashAlt, FaSearch, FaMicrophone, 
  FaUserGraduate, FaPhoneAlt, FaTimes, 
  FaCheckCircle, FaCamera
} from "react-icons/fa";

const API_URL = "https://student-management-system-4-hose.onrender.com/api/students";

const ManageStudents = () => {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [showSlidePanel, setShowSlidePanel] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    name: "", studentClass: "", password: "", address: "", mobile: ""
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // 1. Fetch Students
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(API_URL);
      const data = res.data.success ? res.data.students : (Array.isArray(res.data) ? res.data : []);
      setStudents(data);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  // 2. Handle Inputs
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // 3. Register Student (Fixed Core Logic)
  const handleRegister = async () => {
    if (!formData.name || !formData.studentClass || !formData.password) {
      return alert("Name, Class and Password are required!");
    }

    setIsRegistering(true);

    try {
      // STEP A: Pehle Student Details bhejo (JSON)
      const studentPayload = {
        name: formData.name,
        class: formData.studentClass, // Backend expects "class"
        password: formData.password,
        mobile: formData.mobile || null,
        address: formData.address || null
      };

      const res = await axios.post(API_URL, studentPayload);

      if (res.data.success) {
        const newId = res.data.id;

        // STEP B: Agar photo hai, toh turant upload karo
        if (selectedFile) {
          const photoData = new FormData();
          // "photo" name wahi rakho jo backend router mein upload.single('...') mein hai
          photoData.append("photo", selectedFile); 

          await axios.post(`${API_URL}/${newId}/profile-photo`, photoData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }

        alert("Student Registered Successfully!");
        setShowSlidePanel(false);
        fetchStudents();
        
        // Reset Form
        setFormData({ name: "", studentClass: "", password: "", address: "", mobile: "" });
        setSelectedFile(null);
        setPreviewUrl(null);
      } else {
        alert("Registration Failed: " + res.data.message);
      }
    } catch (err) {
      console.error("Error Detail:", err.response?.data || err);
      alert("Error: " + (err.response?.data?.message || "Server error. Check console."));
    } finally {
      setIsRegistering(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Permanent deletion of record. Proceed?")) {
      try {
        await axios.delete(`${API_URL}/${id}`);
        fetchStudents();
      } catch (err) {
        alert("Delete failed");
      }
    }
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Browser not supported");
    const recognition = new SpeechRecognition();
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (e) => setSearchTerm(e.results[0][0].transcript);
    recognition.start();
  };

  return (
    <div style={ui.appContainer}>
      <header style={ui.headerSection}>
        <div style={ui.brandGroup}>
          <div style={ui.logoBox}><FaUserGraduate /></div>
          <div>
            <h1 style={ui.mainTitle}>Core Registry</h1>
            <p style={ui.subTitle}>Student Management System</p>
          </div>
        </div>
        <div style={ui.statsContainer}>
          <div style={ui.statItem}><span style={ui.statVal}>{students.length}</span><span style={ui.statLab}>Students</span></div>
        </div>
      </header>

      <div style={ui.commandBar}>
        <div style={ui.searchCluster}>
          <div style={ui.voiceSearchWrapper}>
            <FaSearch style={ui.searchIcon} />
            <input 
              type="text" placeholder="Search students..." style={ui.searchField}
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button style={{...ui.micBtn, color: isListening ? '#ff4d4d' : '#94a3b8'}} onClick={handleVoiceSearch}><FaMicrophone /></button>
          </div>
        </div>
        <button style={ui.newRegBtn} onClick={() => setShowSlidePanel(true)}><FaUserPlus /> New Registration</button>
      </div>

      <main style={ui.gridWrapper}>
        <div style={ui.scrollContainer}>
          <table style={ui.enterpriseTable}>
            <thead>
              <tr style={ui.tableHeaderRow}>
                <th style={ui.th}>Student Profile</th>
                <th style={ui.th}>Batch</th>
                <th style={ui.th}>Contact</th>
                <th style={ui.th}>Address</th>
                <th style={ui.th}>Status</th>
                <th style={ui.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {students
                .filter(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((s) => (
                <tr key={s.id} style={ui.trStyle} className="row-hover">
                  <td style={ui.td}>
                    <div style={ui.identityGroup}>
                      <div style={ui.avatarStyle}>
                        <img 
                          src={s.profile_photo || `https://ui-avatars.com/api/?name=${s.name}&background=3b82f6&color=fff`} 
                          alt="" style={ui.avatarImg}
                          onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${s.name}&background=3b82f6&color=fff`; }}
                        />
                      </div>
                      <div>
                        <div style={ui.empName}>{s.name}</div>
                        <div style={ui.empId}>UID-{s.id}</div>
                      </div>
                    </div>
                  </td>
                  {/* Backend query use "class" with double quotes, so it comes as .class */}
                  <td style={ui.td}><span style={ui.deptBadge}> {s.class}</span></td>
                  <td style={ui.td}><div style={ui.contactInfo}><FaPhoneAlt size={11}/> {s.mobile || "N/A"}</div></td>
                  <td style={ui.td}><div style={ui.addressInfo}>{s.address || "No address"}</div></td>
                  <td style={ui.td}><span style={ui.statusTag}><FaCheckCircle size={10}/> Verified</span></td>
                  <td style={ui.td}>
                    <button style={ui.rowActionBtn} onClick={() => handleDelete(s.id)}><FaTrashAlt /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && <div style={ui.loaderStyle}>Syncing records...</div>}
        {!loading && students.length === 0 && <div style={ui.loaderStyle}>No students found.</div>}
      </main>

      {/* SLIDE-OVER PANEL */}
      <div style={{...ui.sidePanel, transform: showSlidePanel ? 'translateX(0)' : 'translateX(100%)'}}>
        <div style={ui.panelHeader}>
          <h2>Registration</h2>
          <button onClick={() => setShowSlidePanel(false)} style={ui.closePanelBtn}><FaTimes /></button>
        </div>
        <div style={ui.panelBody}>
          <div style={ui.photoUploadSection}>
             <div style={ui.previewCircle}>
                {previewUrl ? <img src={previewUrl} style={ui.avatarImg} alt="Preview" /> : <FaCamera size={30} color="#cbd5e1" />}
             </div>
             <label style={ui.uploadLabel}>
                {previewUrl ? "Change Photo" : "Upload Photo"}
                <input type="file" hidden accept="image/*" onChange={handleFileChange} />
             </label>
          </div>

          <div style={ui.formGroup}>
            <label style={ui.labelStyle}>Full Name</label>
            <input name="name" style={ui.panelInput} value={formData.name} onChange={handleInputChange} placeholder="Student's Full Name" />
            
            <div style={{display:'flex', gap:10}}>
              <div style={{flex:1}}>
                <label style={ui.labelStyle}>Class</label>
                <input name="studentClass" style={ui.panelInput} value={formData.studentClass} onChange={handleInputChange} placeholder="e.g. 10th" />
              </div>
              <div style={{flex:1}}>
                <label style={ui.labelStyle}>Password</label>
                <input name="password" type="password" style={ui.panelInput} value={formData.password} onChange={handleInputChange} placeholder="Set Password" />
              </div>
            </div>

            <label style={ui.labelStyle}>Mobile Number</label>
            <input name="mobile" style={ui.panelInput} value={formData.mobile} onChange={handleInputChange} placeholder="+91..." />
            
            <label style={ui.labelStyle}>Permanent Address</label>
            <textarea name="address" style={ui.panelTextarea} value={formData.address} onChange={handleInputChange} placeholder="Full House Address" />
            
            <button style={ui.submitRegistrationBtn} onClick={handleRegister} disabled={isRegistering}>
              {isRegistering ? "Processing..." : "Complete Registration"}
            </button>
          </div>
        </div>
      </div>
      {showSlidePanel && <div style={ui.panelOverlay} onClick={() => setShowSlidePanel(false)} />}
      <style>{`.row-hover:hover { background-color: #f8fafc !important; }`}</style>
    </div>
  );
};

// ... (Baaki UI styles same hain tere purane waale)
const ui = {
  appContainer: { background: "#fff", minHeight: "100vh", width: "100vw", overflowX: "hidden", fontFamily: "'Inter', sans-serif" },
  headerSection: { display: "flex", justifyContent: "space-between", padding: "25px 40px", background: "#0f172a", color: "#fff" },
  brandGroup: { display: "flex", alignItems: "center", gap: "15px" },
  logoBox: { width: "45px", height: "45px", background: "#3b82f6", borderRadius: "12px", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "20px" },
  mainTitle: { fontSize: "20px", margin: 0, fontWeight: "800" },
  subTitle: { fontSize: "12px", opacity: 0.6, margin: 0 },
  statsContainer: { display: "flex", alignItems: "center" },
  statItem: { textAlign: "right" },
  statVal: { display: "block", fontSize: "22px", fontWeight: "800", color: "#3b82f6" },
  statLab: { fontSize: "10px", opacity: 0.5, textTransform: "uppercase", letterSpacing: "1px" },
  commandBar: { display: "flex", justifyContent: "space-between", padding: "20px 40px", borderBottom: "1px solid #f1f5f9", background: "#fff", alignItems: "center" },
  searchCluster: { flex: 0.5 },
  voiceSearchWrapper: { position: "relative", display: "flex", alignItems: "center" },
  searchIcon: { position: "absolute", left: "15px", color: "#94a3b8" },
  searchField: { width: "100%", padding: "12px 99px 12px 45px", borderRadius: "12px", border: "1px solid #e2e8f0", background: "#f8fafc", outline: "none" },
  micBtn: { position: "absolute", right: "15px", background: "none", border: "none", cursor: "pointer", fontSize: "16px" },
  newRegBtn: { background: "#3b82f6", color: "#fff", border: "none", padding: "12px 24px", borderRadius: "12px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)" },
  gridWrapper: { width: "100%" },
  scrollContainer: { overflowX: "auto" },
  enterpriseTable: { width: "100%", borderCollapse: "collapse", minWidth: "1000px" },
  tableHeaderRow: { background: "#b4c100" },
  th: { padding: "18px 40px", textAlign: "left", fontSize: "14px", color: "#000000", textTransform: "uppercase", fontWeight: "800", letterSpacing: "0.5px" },
  td: { padding: "15px 40px", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" },
  trStyle: { transition: "0.2s" },
  identityGroup: { display: "flex", alignItems: "center", gap: "15px" },
  avatarStyle: { width: "45px", height: "45px", borderRadius: "14px", overflow: "hidden", background: "#eff6ff", border: "1px solid #dbeafe" },
  avatarImg: { width: "100%", height: "100%", objectFit: "cover" },
  empName: { fontWeight: "700", color: "#1e293b", fontSize: "14px" },
  empId: { fontSize: "11px", color: "#94a3b8", marginTop: "2px" },
  deptBadge: { background: "#f1f5f9", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", color: "#475569", fontWeight: "600" },
  contactInfo: { fontSize: "13px", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" },
  addressInfo: { fontSize: "13px", color: "#64748b", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  statusTag: { padding: "5px 12px", background: "#dcfce7", color: "#15803d", borderRadius: "20px", fontSize: "10px", fontWeight: "800", display: "inline-flex", alignItems: "center", gap: "5px" },
  rowActionBtn: { background: "#fff1f2", border: "none", color: "#e11d48", padding: "10px", borderRadius: "10px", cursor: "pointer", transition: "0.2s" },
  sidePanel: { position: "fixed", top: 0, right: 0, width: "420px", height: "100%", background: "#fff", zIndex: 1000, transition: "0.4s cubic-bezier(0.4, 0, 0.2, 1)", boxShadow: "-10px 0 30px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column" },
  panelHeader: { padding: "25px", background: "#0f172a", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" },
  closePanelBtn: { background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", width: "35px", height: "35px", borderRadius: "50%", cursor: "pointer" },
  panelBody: { padding: "30px", overflowY: "auto" },
  photoUploadSection: { display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "25px" },
  previewCircle: { width: "100px", height: "100px", borderRadius: "30px", background: "#f8fafc", border: "2px dashed #cbd5e1", display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden", marginBottom: "15px" },
  uploadLabel: { color: "#3b82f6", fontSize: "13px", fontWeight: "700", cursor: "pointer", textDecoration: "underline" },
  formGroup: { display: "flex", flexDirection: "column", gap: "15px" },
  labelStyle: { fontSize: "12px", fontWeight: "700", color: "#475569", textTransform: "uppercase" },
  panelInput: { padding: "12px", border: "1px solid #e2e8f0", borderRadius: "10px", fontSize: "14px", outline: "none", background: "#f8fafc" },
  panelTextarea: { padding: "12px", border: "1px solid #e2e8f0", borderRadius: "10px", height: "100px", fontSize: "14px", outline: "none", background: "#f8fafc", resize: "none" },
  submitRegistrationBtn: { background: "#3b82f6", color: "#fff", border: "none", padding: "15px", borderRadius: "12px", fontWeight: "700", cursor: "pointer", marginTop: "10px", boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)" },
  panelOverlay: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(15, 23, 42, 0.5)", backdropFilter: "blur(4px)", zIndex: 999 },
  loaderStyle: { textAlign: "center", padding: "50px", color: "#94a3b8", fontSize: "14px", fontWeight: "600" }
};

export default ManageStudents;