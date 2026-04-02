import React, { useState} from "react";
import axios from "axios";


const API_URL = "https://student-management-system-4-hose.onrender.com";

const RegisterationStudent = () => {
  const [step, setStep] = useState(1);
  const [searchCode, setSearchCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [popup, setPopup] = useState(null);
  const [remainingUpdates, setRemainingUpdates] = useState(3);
  

  const initialForm = {
    id: "",
    code: "", name: "", father_name: "", mother_name: "", dob: "", gender: "", stream: "", category: "",
    address: "", city: "", district: "", state: "", pincode: "",
    email: "", mobile: "", blood_group: "", aadhaar: "", class: "", session: "2026-27", profile_photo: ""
  };

  const [formData, setFormData] = useState(initialForm);

  const fieldGroups = {
    1: ["code", "name", "father_name", "mother_name", "dob", "gender", "stream", "category"],
    2: ["address", "city", "district", "state", "pincode"],
    3: ["session", "class", "email", "mobile", "blood_group", "aadhaar"]
  };

  const formatForInput = (str) => (str && str !== "---") ? new Date(str).toISOString().split('T')[0] : "";

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const fetchStudent = async () => {
    if (!searchCode) return showPopup("Enter student ID! ⚠️", "#f59e0b");
    setLoading(true);
    try {
      const [profileRes, allReqRes] = await Promise.all([
        axios.get(`${API_URL}/api/students/profile?id=${searchCode}`),
        axios.get(`${API_URL}/api/students/edit-requests?id=${searchCode}`)
      ]);

      if (profileRes.data.success) {
        // Warning Fix: Backend se aane wali null values ko empty string se replace kiya
        const student = profileRes.data.student;
        const sanitizedData = {};
        Object.keys(initialForm).forEach(key => {
          sanitizedData[key] = student[key] || ""; 
        });

        setFormData(sanitizedData);
        
        // Update Limit Logic
        const left = profileRes.data.remainingUpdates !== undefined 
          ? profileRes.data.remainingUpdates 
          : Math.max(0, 3 - (allReqRes.data.requests?.length || 0));
          
        setRemainingUpdates(left);
        showPopup("Student record loaded! ✅");
      } else {
        showPopup("No student found! ❌", "#ef4444");
      }
    } catch (err) {
      showPopup("Fetch failed! ❌", "#ef4444");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // 1. Check if Update is allowed
    if (formData.id) {
      if (remainingUpdates <= 0) {
        return showPopup("Update limit reached (3/3)! 🛑", "#ef4444");
      }

      // 2. Confirmation Popup
      const confirmUpdate = window.confirm("⚠️ Your attendance will be RESET after update! Do you want to continue?");
      if (!confirmUpdate) return;
    }

    setSaving(true);
    try {
      const endpoint = formData.id ? `${API_URL}/api/students/update/${formData.id}` : `${API_URL}/api/students/add`;
      const method = formData.id ? "put" : "post";
      const res = await axios[method](endpoint, formData);

      if (res.data.success) {
        const left = res.data.remainingUpdates !== undefined ? res.data.remainingUpdates : (remainingUpdates - 1);
        
        if (formData.id) {
          showPopup(`⚠️ Updated! Attendance Reset ❗ (Left: ${left})`);
          setRemainingUpdates(left);
        } else {
          showPopup("Student Registered! 🎓");
          setFormData(initialForm);
          setStep(1);
          setSearchCode("");
        }
      }
    } catch (err) {
      showPopup("Save failed! ❌", "#ef4444");
    } finally {
      setSaving(false);
    }
  };

  const showPopup = (msg, bg = "#10b981") => {
    setPopup({ msg, bg });
    setTimeout(() => setPopup(null), 3000);
  };

  return (
    <div style={container}>
      <div style={appCard}>
        <div style={headerStyle}>
          <div style={photoWrapper}>
             <img 
               src={formData.profile_photo || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} 
               alt="Profile" style={photoStyle} 
             />
          </div>
          <div style={headerText}>
             <h2 style={titleStyle}>Registration portal</h2>
             <p style={subtitleStyle}>Session: {formData.session || "---"}</p>
             {formData.id && (
               <p style={{color: remainingUpdates > 0 ? "#0f0890" : "red", fontSize: "12px", fontWeight: "bold"}}>
                 Remaining Updates: {remainingUpdates}
               </p>
             )}
          </div>
        </div>

        <div style={searchRow}>
          <input
            style={searchInput}
            placeholder="Search Student ID..."
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
          />
          <button onClick={fetchStudent} style={fetchBtn} disabled={loading}>{loading ? "..." : "Fetch"}</button>
        </div>

        <div style={stepperContainer}>
          {[1, 2, 3].map((num) => (
            <React.Fragment key={num}>
              <div style={{ ...circle, background: step >= num ? "#0f0890" : "#e2e8f0", color: step >= num ? "#fff" : "#64748b" }} onClick={() => setStep(num)}>{num}</div>
              {num < 3 && <div style={{ ...line, background: step > num ? "#0f0890" : "#e2e8f0" }} />}
            </React.Fragment>
          ))}
        </div>

        <div style={responsiveGrid}>
          {fieldGroups[step].map((key) => (
            <div key={key} style={inputGroup}>
              <label style={labelStyle}>{key.replace("_", " ").toUpperCase()}</label>
              
              {/* FIXED: added || "" to prevent null warnings */}
              {key === "session" ? (
                <select name="session" value={formData.session || ""} onChange={handleChange} style={inputStyle}>
                  <option value="2025-26">2025-26</option>
                  <option value="2026-27">2026-27</option>
                  <option value="2027-28">2027-28</option>
                </select>
              ) : key === "stream" ? (
                <select name="stream" value={formData.stream || ""} onChange={handleChange} style={inputStyle}>
                  <option value="">Select Stream</option>
                  <option value="PCM">PCM</option>
                  <option value="PCB">PCB</option>
                  <option value="Arts">Arts</option>
                  <option value="Commerce">Commerce</option>
                </select>
              ) : key === "gender" ? (
                <select name="gender" value={formData.gender || ""} onChange={handleChange} style={inputStyle}>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              ) : (
                <input
                  name={key}
                  type={key === "dob" ? "date" : "text"}
                  value={key === "dob" ? formatForInput(formData[key]) : (formData[key] || "")}
                  onChange={handleChange}
                  placeholder={`Enter ${key}`}
                  style={inputStyle}
                />
              )}
            </div>
          ))}
        </div>

        <div style={btnRow}>
          {step > 1 && <button onClick={() => setStep(step - 1)} style={secondaryBtn}>Back</button>}
          {step < 3 ? (
            <button onClick={() => setStep(step + 1)} style={primaryBtn}>Next</button>
          ) : (
            <button 
              onClick={handleSave} 
              disabled={saving || (formData.id && remainingUpdates <= 0)} 
              style={{...saveBtn, background: (formData.id && remainingUpdates <= 0) ? "#ccc" : "#10b981"}}
            >
              {saving ? "Wait..." : (formData.id ? "Update Profile" : "Register")}
            </button>
          )}
        </div>
      </div>
      {popup && <div style={{ ...popupStyle, background: popup.bg }}>{popup.msg}</div>}
    </div>
  );
};

// Styles (Aapki CSS same rakhi hai)
const container = { width: "100%", minHeight: "100vh", padding: "20px", background: "#f0f2f5", display: "flex", justifyContent: "center" };
const appCard = { width: "100%", maxWidth: "900px", background: "#fff", borderRadius: "20px", padding: "30px", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" };
const headerStyle = { display: "flex", alignItems: "center", gap: "20px", marginBottom: "20px" };
const photoStyle = { width: "80px", height: "80px", borderRadius: "15px", border: "2px solid #0f0890", objectFit: "cover" };
const photoWrapper = { position: "relative" };
const headerText = { textAlign: "left" };
const titleStyle = { fontSize: "22px", fontWeight: "800", margin: 0 };
const subtitleStyle = { color: "#718096", fontSize: "14px" };
const searchRow = { display: "flex", gap: "10px", marginBottom: "20px", background: "#f7fafc", padding: "10px", borderRadius: "10px" };
const searchInput = { flex: 1, border: "none", outline: "none", background: "transparent" };
const fetchBtn = { padding: "8px 15px", background: "#2d3748", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" };
const stepperContainer = { display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "30px" };
const circle = { width: "30px", height: "30px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", cursor: "pointer" };
const line = { width: "50px", height: "2px" };
const responsiveGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "15px" };
const inputGroup = { display: "flex", flexDirection: "column", gap: "5px" };
const labelStyle = { fontSize: "12px", fontWeight: "bold", color: "#4a5568" };
const inputStyle = { padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", outline: "none" };
const btnRow = { display: "flex", gap: "10px", marginTop: "30px" };
const primaryBtn = { flex: 1, padding: "12px", background: "#0f0890", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "bold" };
const secondaryBtn = { ...primaryBtn, background: "#edf2f7", color: "#4a5568" };
const saveBtn = { ...primaryBtn, background: "#10b981" };
const popupStyle = { position: "fixed", top: "20px", right: "20px", color: "#fff", padding: "10px 20px", borderRadius: "10px", zIndex: 1000 };

export default RegisterationStudent;