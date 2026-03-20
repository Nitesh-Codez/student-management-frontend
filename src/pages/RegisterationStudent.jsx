import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_URL = "https://student-management-system-4-hose.onrender.com";

const RegisterationStudent = () => {
  const [step, setStep] = useState(1);
  const [searchCode, setSearchCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [popup, setPopup] = useState(null);
  const [allRequests, setAllRequests] = useState([]);
  const navigate = useNavigate();

  const initialForm = {
    id: "",
    code: "", name: "", father_name: "", mother_name: "", dob: "", gender: "", stream: "", category: "",
    address: "", city: "", district: "", state: "", pincode: "",
    email: "", mobile: "", blood_group: "", aadhaar: "", class: "", session: "2026-27", profile_photo: ""
  };

  const [formData, setFormData] = useState(initialForm);

  // Groups for Stepper
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
        setFormData({ ...initialForm, ...profileRes.data.student });
        setAllRequests(allReqRes.data.requests || []);
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
    setSaving(true);
    try {
      const endpoint = formData.id ? `${API_URL}/api/students/update/${formData.id}` : `${API_URL}/api/students/add`;
      const method = formData.id ? "put" : "post";
      const res = await axios[method](endpoint, formData);

      if (res.data.success) {
        showPopup(formData.id ? "Profile Updated! ✅" : "Student Registered! 🎓");
        if (!formData.id) {
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
        
        {/* Header with Responsive Layout */}
        <div style={headerStyle}>
          <div style={photoWrapper}>
             <img 
               src={formData.profile_photo || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} 
               alt="Profile" 
               style={photoStyle} 
             />
          </div>
          <div style={headerText}>
             <h2 style={titleStyle}>Admission Portal</h2>
             <p style={subtitleStyle}>Academic Session {formData.session}</p>
          </div>
        </div>

        {/* Search Section */}
        <div style={searchRow}>
          <input
            style={searchInput}
            placeholder="Search Student ID..."
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
          />
          <button onClick={fetchStudent} style={fetchBtn} disabled={loading}>
            {loading ? "..." : "Fetch"}
          </button>
        </div>

        {/* Stepper */}
        <div style={stepperContainer}>
          {[1, 2, 3].map((num) => (
            <React.Fragment key={num}>
              <div 
                style={{ ...circle, background: step >= num ? "#0f0890" : "#e2e8f0", color: step >= num ? "#fff" : "#64748b" }} 
                onClick={() => setStep(num)}
              >
                {num}
              </div>
              {num < 3 && <div style={{ ...line, background: step > num ? "#0f0890" : "#e2e8f0" }} />}
            </React.Fragment>
          ))}
        </div>

        {/* Form Content - Responsive Grid */}
        <div style={responsiveGrid}>
          {fieldGroups[step].map((key) => (
            <div key={key} style={inputGroup}>
              <label style={labelStyle}>{key.replace("_", " ").toUpperCase()}</label>
              
              {/* Conditional for Dropdowns */}
              {key === "session" ? (
                <select name="session" value={formData.session} onChange={handleChange} style={inputStyle}>
                  <option value="2025-26">2025-26</option>
                  <option value="2026-27">2026-27</option>
                  <option value="2027-28">2027-28</option>
                </select>
              ) : key === "stream" ? (
                <select name="stream" value={formData.stream} onChange={handleChange} style={inputStyle}>
                  <option value="">Select Stream</option>
                  <option value="PCM">PCM</option>
                  <option value="PCB">PCB</option>
                  <option value="Arts">Arts</option>
                  <option value="Chemistry,Maths">Chemistry,Maths</option>
                  <option value="Chemistry,Maths">Chemistry,Maths,English</option>
                  <option value="Physics,Maths">Physics,Maths</option>
                  <option value="Hindi,English">Hindi,English</option>
                  <option value="English">English</option>
                </select>
                ): key === "gender" ? (
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

        {/* Action Buttons */}
        <div style={btnRow}>
          {step > 1 && <button onClick={() => setStep(step - 1)} style={secondaryBtn}>Back</button>}
          {step < 3 ? (
            <button onClick={() => setStep(step + 1)} style={primaryBtn}>Next</button>
          ) : (
            <button onClick={handleSave} disabled={saving} style={saveBtn}>
              {saving ? "Wait..." : (formData.id ? "Update" : "Register")}
            </button>
          )}
        </div>
      </div>

      {popup && <div style={{ ...popupStyle, background: popup.bg }}>{popup.msg}</div>}
    </div>
  );
};

// --- STYLES (App-Type & Responsive) ---

const container = { 
  width: "100%", 
  minHeight: "100vh", 
  padding: "clamp(10px, 3vw, 40px)", 
  background: "#f0f2f5", 
  display: "flex", 
  justifyContent: "center", 
  alignItems: "flex-start" 
};

const appCard = { 
  width: "100%", 
  maxWidth: "900px", 
  background: "#fff", 
  borderRadius: "24px", 
  padding: "clamp(20px, 5vw, 40px)", 
  boxShadow: "0 20px 50px rgba(0,0,0,0.05)",
  border: "1px solid #eef0f2"
};

const headerStyle = { 
  display: "flex", 
  flexWrap: "wrap", 
  alignItems: "center", 
  gap: "20px", 
  marginBottom: "30px",
  justifyContent: "center"
};

const photoWrapper = { position: "relative" };
const photoStyle = { 
  width: "90px", 
  height: "90px", 
  borderRadius: "22px", 
  border: "3px solid #0f0890", 
  objectFit: "cover" 
};

const headerText = { textAlign: "left" };
const titleStyle = { fontSize: "24px", fontWeight: "800", color: "#1a202c", margin: 0 };
const subtitleStyle = { color: "#718096", fontSize: "14px", margin: "4px 0 0 0" };

const searchRow = { 
  display: "flex", 
  gap: "10px", 
  background: "#f7fafc", 
  padding: "12px", 
  borderRadius: "16px", 
  marginBottom: "30px" 
};

const searchInput = { 
  flex: 1, 
  background: "transparent", 
  border: "none", 
  outline: "none", 
  fontSize: "14px", 
  padding: "5px" 
};

const fetchBtn = { 
  padding: "8px 20px", 
  background: "#2d3748", 
  color: "#fff", 
  border: "none", 
  borderRadius: "12px", 
  cursor: "pointer", 
  fontWeight: "600" 
};

const stepperContainer = { 
  display: "flex", 
  alignItems: "center", 
  justifyContent: "center", 
  marginBottom: "40px" 
};

const circle = { 
  width: "32px", 
  height: "32px", 
  borderRadius: "10px", 
  display: "flex", 
  alignItems: "center", 
  justifyContent: "center", 
  fontWeight: "bold", 
  cursor: "pointer" 
};

const line = { width: "clamp(30px, 10vw, 80px)", height: "3px", margin: "0 10px" };

// Responsive Grid: 2 columns on Laptop, 1 on Mobile
const responsiveGrid = { 
  display: "grid", 
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
  gap: "20px" 
};

const inputGroup = { display: "flex", flexDirection: "column", gap: "6px" };
const labelStyle = { fontSize: "12px", fontWeight: "700", color: "#4a5568", letterSpacing: "0.5px" };
const inputStyle = { 
  padding: "14px", 
  borderRadius: "14px", 
  border: "1.5px solid #e2e8f0", 
  fontSize: "14px", 
  outline: "none",
  transition: "all 0.2s ease",
  background: "#fff"
};

const btnRow = { display: "flex", gap: "12px", marginTop: "40px" };
const primaryBtn = { flex: 2, padding: "16px", background: "#0f0890", color: "#fff", border: "none", borderRadius: "16px", cursor: "pointer", fontWeight: "700" };
const saveBtn = { ...primaryBtn, background: "#10b981" };
const secondaryBtn = { flex: 1, padding: "16px", background: "#edf2f7", color: "#4a5568", border: "none", borderRadius: "16px", cursor: "pointer", fontWeight: "700" };

const popupStyle = { position: "fixed", top: "20px", right: "20px", color: "#fff", padding: "12px 24px", borderRadius: "12px", fontWeight: "600", zIndex: 1000 };

export default RegisterationStudent;