import React, { useState } from "react";
import axios from "axios";

const API_URL = "https://student-management-system-4-hose.onrender.com";

const RegistrationStudent = () => {
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

  const showPopup = (msg, bg = "#10b981") => {
    setPopup({ msg, bg });
    setTimeout(() => setPopup(null), 3000);
  };

  const fetchStudent = async () => {
    if (!searchCode) return showPopup("Enter student ID! ⚠️", "#f59e0b");
    setLoading(true);
    try {
      const [profileRes, allReqRes] = await Promise.all([
        axios.get(`${API_URL}/api/students/profile?id=${searchCode}`),
        axios.get(`${API_URL}/api/students/edit-requests?id=${searchCode}`)
      ]);

      if (profileRes.data.success) {
        const student = profileRes.data.student;
        const sanitizedData = {};
        Object.keys(initialForm).forEach(key => {
          sanitizedData[key] = student[key] || "";
        });

        setFormData(sanitizedData);
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
    if (formData.id) {
      if (remainingUpdates <= 0) return showPopup("Update limit reached (3/3)! 🛑", "#ef4444");
      const confirmUpdate = window.confirm("⚠️ Your attendance will be RESET after update! Continue?");
      if (!confirmUpdate) return;
    }

    setSaving(true);
    try {
      const endpoint = formData.id ? `${API_URL}/api/students/update/${formData.id}` : `${API_URL}/api/students/add`;
      const method = formData.id ? "put" : "post";
      const res = await axios[method](endpoint, formData);

      if (res.data.success) {
        if (formData.id) {
          const left = res.data.remainingUpdates !== undefined ? res.data.remainingUpdates : (remainingUpdates - 1);
          showPopup(`⚠️ Updated! Attendance Reset (Left: ${left})`);
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

  return (
    <div style={container}>
      <div style={appCard}>
        {/* Header Section */}
        <div style={headerStyle}>
          <div style={photoWrapper}>
             <img 
               src={formData.profile_photo || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} 
               alt="Profile" style={photoStyle} 
             />
          </div>
          <div style={headerText}>
             <h2 style={titleStyle}>Student Registration</h2>
             <p style={subtitleStyle}>Academic Session: <strong>{formData.session || "---"}</strong></p>
             {formData.id && (
               <div style={{...badge, background: remainingUpdates > 0 ? "#e0e7ff" : "#fee2e2", color: remainingUpdates > 0 ? "#4338ca" : "#dc2626"}}>
                 Remaining Updates: {remainingUpdates}
               </div>
             )}
          </div>
        </div>

        {/* Search Bar */}
        <div style={searchRow}>
          <input
            style={searchInput}
            placeholder="Search by Student ID (e.g. STU101)..."
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
          />
          <button onClick={fetchStudent} style={fetchBtn} disabled={loading}>
            {loading ? "Searching..." : "Fetch Profile"}
          </button>
        </div>

        {/* Modern Stepper */}
        <div style={stepperContainer}>
          {[1, 2, 3].map((num) => (
            <React.Fragment key={num}>
              <div 
                style={{ ...circle, background: step >= num ? "#0f0890" : "#f1f5f9", color: step >= num ? "#fff" : "#94a3b8", border: step >= num ? "none" : "1px solid #cbd5e1" }} 
                onClick={() => setStep(num)}
              >
                {num}
              </div>
              {num < 3 && <div style={{ ...line, background: step > num ? "#0f0890" : "#e2e8f0" }} />}
            </React.Fragment>
          ))}
        </div>

        {/* Form Grid */}
        <div style={responsiveGrid}>
          {fieldGroups[step].map((key) => (
            <div key={key} style={inputGroup}>
              <label style={labelStyle}>{key.replace("_", " ").toUpperCase()}</label>
              
              {/* Conditional Inputs */}
              {key === "session" ? (
                <select name="session" value={formData.session} onChange={handleChange} style={inputStyle}>
                  <option value="2025-26">2025-26</option>
                  <option value="2026-27">2026-27</option>
                  <option value="2027-28">2027-28</option>
                  <option value="2027-28">2028-29</option>
                  <option value="2027-28">20209-30</option>
                </select>
              ) : key === "class" ? (
                <select name="class" value={formData.class} onChange={handleChange} style={inputStyle}>
                  <option value="">Select Class</option>
                  <optgroup label="Pre-Primary">
                    <option value="Nursery">Nursery</option>
                    <option value="L.K.G">L.K.G</option>
                    <option value="U.K.G">U.K.G</option>
                  </optgroup>
                  <optgroup label="Primary">
                    <option value="1st">1st</option>
                    <option value="2nd">2nd</option>
                    <option value="3rd">3rd</option>
                    <option value="4th">4th</option>
                    <option value="5th">5th</option>
                  </optgroup>
                  <optgroup label="Middle & Secondary">
                    <option value="6th">6th</option>
                    <option value="7th">7th</option>
                    <option value="8th">8th</option>
                    <option value="9th">9th</option>
                    <option value="10th">10th</option>
                  </optgroup>
                  <optgroup label="Senior Secondary">
                    <option value="11th">11th</option>
                    <option value="12th">12th</option>
                  </optgroup>
                </select>
              ) : key === "stream" ? (
                <select name="stream" value={formData.stream} onChange={handleChange} style={inputStyle}>
                  <option value="">Select Stream</option>
                  <option value="None">None (Below 11th)</option>
                  <option value="PCM">PCM</option>
                  <option value="PCB">PCB</option>
                  <option value="Arts">Arts</option>
                  <option value="Commerce">Commerce</option>
                </select>
              ) : key === "gender" ? (
                <select name="gender" value={formData.gender} onChange={handleChange} style={inputStyle}>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              ) : (
                <input
                  name={key}
                  type={key === "dob" ? "date" : "text"}
                  value={key === "dob" ? formatForInput(formData[key]) : (formData[key] || "")}
                  onChange={handleChange}
                  placeholder={`Enter ${key.replace("_", " ")}`}
                  style={inputStyle}
                />
              )}
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div style={btnRow}>
          {step > 1 && <button onClick={() => setStep(step - 1)} style={secondaryBtn}>Previous</button>}
          {step < 3 ? (
            <button onClick={() => setStep(step + 1)} style={primaryBtn}>Continue</button>
          ) : (
            <button 
              onClick={handleSave} 
              disabled={saving || (formData.id && remainingUpdates <= 0)} 
              style={{...saveBtn, opacity: (formData.id && remainingUpdates <= 0) ? 0.6 : 1}}
            >
              {saving ? "Processing..." : (formData.id ? "Update Profile" : "Register Student")}
            </button>
          )}
        </div>
      </div>
      
      {/* Notifications */}
      {popup && <div style={{ ...popupStyle, background: popup.bg }}>{popup.msg}</div>}
    </div>
  );
};

// Enhanced Styles
const container = { 
  width: "100%", 
  minHeight: "100vh", 
  padding: "40px 20px", 
  background: "#f8fafc", 
  display: "flex", 
  justifyContent: "center",
  fontFamily: "'Inter', sans-serif"
};

const appCard = { 
  width: "100%", 
  maxWidth: "850px", 
  background: "#fff", 
  borderRadius: "24px", 
  padding: "40px", 
  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  height: "fit-content"
};

const headerStyle = { display: "flex", alignItems: "center", gap: "25px", marginBottom: "30px", borderBottom: "1px solid #f1f5f9", paddingBottom: "20px" };
const photoStyle = { width: "90px", height: "90px", borderRadius: "20px", border: "3px solid #e2e8f0", objectFit: "cover", background: "#f8fafc" };
const photoWrapper = { position: "relative" };
const headerText = { textAlign: "left" };
const titleStyle = { fontSize: "28px", fontWeight: "800", color: "#1e293b", margin: 0, letterSpacing: "-0.5px" };
const subtitleStyle = { color: "#64748b", fontSize: "15px", marginTop: "4px" };
const badge = { display: "inline-block", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "700", marginTop: "10px" };

const searchRow = { display: "flex", gap: "12px", marginBottom: "30px", background: "#f1f5f9", padding: "12px", borderRadius: "16px" };
const searchInput = { flex: 1, border: "none", outline: "none", background: "transparent", fontSize: "15px", fontWeight: "500", paddingLeft: "10px" };
const fetchBtn = { padding: "10px 20px", background: "#1e293b", color: "#fff", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "600", transition: "all 0.2s" };

const stepperContainer = { display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "40px" };
const circle = { width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", cursor: "pointer", fontSize: "14px", transition: "all 0.3s" };
const line = { width: "60px", height: "3px", margin: "0 10px", borderRadius: "10px" };

const responsiveGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" };
const inputGroup = { display: "flex", flexDirection: "column", gap: "8px" };
const labelStyle = { fontSize: "11px", fontWeight: "800", color: "#94a3b8", letterSpacing: "0.05em" };
const inputStyle = { padding: "12px 16px", borderRadius: "12px", border: "1px solid #e2e8f0", outline: "none", fontSize: "15px", color: "#334155", background: "#fcfcfd", transition: "border 0.2s" };

const btnRow = { display: "flex", gap: "15px", marginTop: "40px" };
const primaryBtn = { flex: 2, padding: "14px", background: "#0f0890", color: "#fff", border: "none", borderRadius: "14px", cursor: "pointer", fontWeight: "700", fontSize: "16px", boxShadow: "0 4px 6px -1px rgba(15, 8, 144, 0.3)" };
const secondaryBtn = { flex: 1, padding: "14px", background: "#fff", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: "14px", cursor: "pointer", fontWeight: "600" };
const saveBtn = { ...primaryBtn, background: "#10b981", boxShadow: "0 4px 6px -1px rgba(16, 185, 129, 0.3)" };

const popupStyle = { position: "fixed", bottom: "30px", right: "30px", color: "#fff", padding: "16px 24px", borderRadius: "16px", zIndex: 1000, fontWeight: "600", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", animation: "slideUp 0.3s ease-out" };

export default RegistrationStudent;