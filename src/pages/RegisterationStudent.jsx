import React, { useState, useEffect } from "react";
import axios from "axios";

/**
 * API CONFIGURATION
 * Backend base URL for student management
 */
const API_URL = "https://student-management-system-4-hose.onrender.com";

const RegistrationStudent = () => {
  // --- STATE MANAGEMENT ---
  const [step, setStep] = useState(1);
  const [searchCode, setSearchCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [popup, setPopup] = useState(null);
  const [remainingUpdates, setRemainingUpdates] = useState(3);

  // Initial Form Structure (All fields accounted for)
  const initialForm = {
    id: "",
    code: "", 
    name: "", 
    father_name: "", 
    mother_name: "", 
    dob: "", 
    gender: "", 
    stream: "", 
    category: "",
    address: "", 
    city: "", 
    district: "", 
    state: "", 
    pincode: "",
    email: "", 
    mobile: "", 
    blood_group: "", 
    aadhaar: "", 
    class: "", 
    session: "2026-27", 
    profile_photo: ""
  };

  const [formData, setFormData] = useState(initialForm);

  /**
   * FIELD GROUPS FOR MULTI-STEP FORM
   * Organized for better UX on mobile/web
   */
  const fieldGroups = {
    1: ["code", "name", "father_name", "mother_name", "dob", "gender", "category"],
    2: ["address", "city", "district", "state", "pincode"],
    3: ["session", "class", "stream", "email", "mobile", "blood_group", "aadhaar"]
  };

  // --- HELPER FUNCTIONS ---

  // Formats date strings safely for HTML5 date inputs
  const formatForInput = (str) => {
    if (!str || str === "---") return "";
    try {
      return new Date(str).toISOString().split('T')[0];
    } catch (e) {
      return "";
    }
  };

  // Generic change handler for all inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * POPUP SYSTEM
   * Center-aligned animated notification
   */
  const showPopup = (msg, bg = "#10b981") => {
    setPopup({ msg, bg });
    setTimeout(() => setPopup(null), 3000);
  };

  // --- API HANDLERS ---

  /**
   * FETCH STUDENT DATA
   * Retrieves profile and checks edit request limits simultaneously
   */
  const fetchStudent = async () => {
    if (!searchCode) {
      return showPopup("Please enter a Student ID! ⚠️", "#f59e0b");
    }
    
    setLoading(true);
    try {
      const [profileRes, allReqRes] = await Promise.all([
        axios.get(`${API_URL}/api/students/profile?id=${searchCode}`),
        axios.get(`${API_URL}/api/students/edit-requests?id=${searchCode}`)
      ]);

      if (profileRes.data.success) {
        const student = profileRes.data.student;
        const sanitizedData = {};
        
        // Ensure no null values are passed to controlled components
        Object.keys(initialForm).forEach(key => {
          sanitizedData[key] = student[key] || ""; 
        });

        setFormData(sanitizedData);
        
        // Calculate remaining edit quota
        const left = profileRes.data.remainingUpdates !== undefined 
          ? profileRes.data.remainingUpdates 
          : Math.max(0, 3 - (allReqRes.data.requests?.length || 0));
          
        setRemainingUpdates(left);
        showPopup("Student record loaded successfully! ✅");
      } else {
        showPopup("No student found with this ID! ❌", "#ef4444");
      }
    } catch (err) {
      showPopup("Fetch failed! Connection error. ❌", "#ef4444");
    } finally {
      setLoading(false);
    }
  };

  /**
   * SAVE / UPDATE HANDLER
   * Handles both new registration and existing profile updates
   */
  const handleSave = async () => {
    // Check constraints for existing students
    if (formData.id) {
      if (remainingUpdates <= 0) {
        return showPopup("Update limit reached (3/3)! 🛑", "#ef4444");
      }

      const confirmUpdate = window.confirm(
        "⚠️ WARNING: Your attendance will be RESET to 0% after update. Continue?"
      );
      if (!confirmUpdate) return;
    }

    setSaving(true);
    try {
      const endpoint = formData.id 
        ? `${API_URL}/api/students/update/${formData.id}` 
        : `${API_URL}/api/students/add`;
      
      const method = formData.id ? "put" : "post";
      const res = await axios[method](endpoint, formData);

      if (res.data.success) {
        if (formData.id) {
          const left = res.data.remainingUpdates !== undefined 
            ? res.data.remainingUpdates 
            : (remainingUpdates - 1);
          
          showPopup(`Profile Updated! Attendance Reset ❗ (Left: ${left})`);
          setRemainingUpdates(left);
        } else {
          showPopup("Student Registered Successfully! 🎓");
          // Reset form on new registration
          setFormData(initialForm);
          setStep(1);
          setSearchCode("");
        }
      }
    } catch (err) {
      showPopup("Save failed! Please check fields. ❌", "#ef4444");
    } finally {
      setSaving(false);
    }
  };

  // --- RENDER ---
  return (
    <div style={containerStyle}>
      {/* Global CSS for Animations */}
      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: translate(-50%, -60%) scale(0.9); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .custom-input:focus {
          border-color: #0f0890 !important;
          box-shadow: 0 0 0 4px rgba(15, 8, 144, 0.1);
        }
        select { cursor: pointer; }
      `}</style>

      <div style={appCardStyle}>
        
        {/* PROFILE HEADER SECTION */}
        <div style={headerSection}>
          <div style={photoWrapper}>
             <img 
               src={formData.profile_photo || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} 
               alt="Profile" 
               style={photoStyle} 
             />
             <div style={photoBadge}>{formData.id ? "ACTIVE" : "PROFILE"}</div>
          </div>
          <div style={headerTextWrapper}>
             <h2 style={mainTitle}>Student Registration</h2>
             <p style={subTitle}>Session: <span style={{fontWeight: '700'}}>{formData.session || "---"}</span></p>
             {formData.id && (
               <div style={{
                 ...quotaBadge, 
                 background: remainingUpdates > 0 ? "#e0e7ff" : "#fee2e2",
                 color: remainingUpdates > 0 ? "#4338ca" : "#dc2626"
               }}>
                 Quota: {remainingUpdates} Updates Left
               </div>
             )}
          </div>
        </div>

        {/* SEARCH ACTION BAR */}
        <div style={searchRow}>
          <input
            style={searchInput}
            placeholder="Enter Student ID (e.g. STU101)..."
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
          />
          <button 
            onClick={fetchStudent} 
            style={fetchBtn} 
            disabled={loading}
          >
            {loading ? "Searching..." : "Fetch Profile"}
          </button>
        </div>

        {/* PROGRESS STEPPER */}
        <div style={stepperWrapper}>
          {[1, 2, 3].map((num) => (
            <React.Fragment key={num}>
              <div 
                style={{ 
                  ...stepCircle, 
                  background: step >= num ? "#0f0890" : "#f1f5f9", 
                  color: step >= num ? "#fff" : "#94a3b8",
                  border: step >= num ? "none" : "1px solid #cbd5e1"
                }} 
                onClick={() => setStep(num)}
              >
                {num}
              </div>
              {num < 3 && (
                <div style={{ 
                  ...stepLine, 
                  background: step > num ? "#0f0890" : "#e2e8f0" 
                }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* FORM GRID SECTION */}
        <div style={formGrid}>
          {fieldGroups[step].map((key) => (
            <div key={key} style={inputGroup}>
              <label style={labelStyle}>
                {key.replace("_", " ").toUpperCase()}
              </label>
              
              {/* SESSION DROPDOWN */}
              {key === "session" ? (
                <select name="session" value={formData.session || ""} onChange={handleChange} style={inputStyle} className="custom-input">
                  <option value="2025-26">2025-26</option>
                  <option value="2026-27">2026-27</option>
                  <option value="2027-28">2027-28</option>
                  <option value="2028-29">2028-29</option>
                </select>
              ) : 
              
              /* CLASS DROPDOWN (FULL LIST) */
              key === "class" ? (
                <select name="class" value={formData.class || ""} onChange={handleChange} style={inputStyle} className="custom-input">
                  <option value="">Select Class</option>
                  <optgroup label="Primary">
                    <option value="Nursery">Nursery</option>
                    <option value="L.K.G">L.K.G</option>
                    <option value="U.K.G">U.K.G</option>
                    <option value="1st">1st</option>
                  </optgroup>
                  <optgroup label="Secondary">
                    <option value="2nd">2nd</option>
                  <option value="3rd">3rd</option>
                  <option value="4th">4th</option>
                  <option value="4th">5th</option>
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
              ) : 
              
              /* STREAM DROPDOWN */
              key === "stream" ? (
                <select name="stream" value={formData.stream || ""} onChange={handleChange} style={inputStyle} className="custom-input">
                  <option value="">Select Stream</option>
                  <option value="None">None (Below 11th)</option>
                  <option value="PCM">Science (PCM)</option>
                  <option value="PCB">Science (PCB)</option>
                  <option value="Arts">Humanities (Arts)</option>
                  <option value="Commerce">Commerce</option>
                </select>
              ) : 
              
              /* GENDER DROPDOWN */
              key === "gender" ? (
                <select name="gender" value={formData.gender || ""} onChange={handleChange} style={inputStyle} className="custom-input">
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              ) : 
              
              /* GENERIC INPUTS */
              (
                <input
                  name={key}
                  className="custom-input"
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

        {/* NAVIGATION BUTTONS */}
        <div style={buttonRow}>
          {step > 1 && (
            <button 
              onClick={() => setStep(step - 1)} 
              style={backBtnStyle}
            >
              Previous
            </button>
          )}
          
          {step < 3 ? (
            <button 
              onClick={() => setStep(step + 1)} 
              style={nextBtnStyle}
            >
              Continue
            </button>
          ) : (
            <button 
              onClick={handleSave} 
              disabled={saving || (formData.id && remainingUpdates <= 0)} 
              style={{
                ...submitBtnStyle, 
                opacity: (formData.id && remainingUpdates <= 0) ? 0.6 : 1,
                cursor: (formData.id && remainingUpdates <= 0) ? 'not-allowed' : 'pointer'
              }}
            >
              {saving ? "Processing..." : (formData.id ? "Update Profile" : "Complete Registration")}
            </button>
          )}
        </div>

      </div>

      {/* CENTER ANIMATED NOTIFICATION POPUP */}
      {popup && (
        <div style={popupOverlay}>
          <div style={{ ...centerPopup, background: popup.bg }}>
            {popup.msg}
          </div>
        </div>
      )}

    </div>
  );
};

// --- MODERN STYLES (Edge-to-Edge Optimized) ---

const containerStyle = { 
  width: "100%", 
  minHeight: "100vh", 
  background: "#f8fafc", 
  display: "flex", 
  justifyContent: "center",
  alignItems: "flex-start",
  fontFamily: "'Inter', system-ui, sans-serif",
  padding: "0px" // Reset padding for edge-to-edge
};

const appCardStyle = { 
  width: "100%", 
  maxWidth: "100%", // Full width on mobile
  minHeight: "100vh",
  background: "#fff", 
  padding: "20px", 
  display: "flex",
  flexDirection: "column",
  animation: "slideUp 0.4s ease-out"
};

const headerSection = { 
  display: "flex", 
  alignItems: "center", 
  gap: "20px", 
  marginTop: "10px",
  marginBottom: "30px", 
  padding: "15px",
  background: "#f1f5f9",
  borderRadius: "20px"
};

const photoWrapper = { 
  position: "relative",
  display: "inline-block"
};

const photoStyle = { 
  width: "90px", 
  height: "90px", 
  borderRadius: "18px", 
  border: "3px solid #fff", 
  objectFit: "cover", 
  background: "#fff",
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)"
};

const photoBadge = {
  position: "absolute",
  bottom: "-8px",
  right: "-8px",
  background: "#10b981",
  color: "#fff",
  fontSize: "10px",
  fontWeight: "900",
  padding: "4px 8px",
  borderRadius: "8px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
};

const headerTextWrapper = { flex: 1 };
const mainTitle = { fontSize: "24px", fontWeight: "900", color: "#1e293b", margin: 0, letterSpacing: "-0.5px" };
const subTitle = { color: "#64748b", fontSize: "14px", marginTop: "4px" };
const quotaBadge = { display: "inline-block", padding: "4px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: "800", marginTop: "10px" };

const searchRow = { 
  display: "flex", 
  gap: "10px", 
  marginBottom: "25px", 
  background: "#fff", 
  padding: "10px", 
  borderRadius: "16px",
  border: "1px solid #e2e8f0"
};

const searchInput = { 
  flex: 1, 
  border: "none", 
  outline: "none", 
  fontSize: "15px", 
  fontWeight: "500", 
  padding: "10px" 
};

const fetchBtn = { 
  padding: "10px 20px", 
  background: "#1e293b", 
  color: "#fff", 
  border: "none", 
  borderRadius: "12px", 
  cursor: "pointer", 
  fontWeight: "700",
  transition: "all 0.2s"
};

const stepperWrapper = { 
  display: "flex", 
  alignItems: "center", 
  justifyContent: "center", 
  marginBottom: "35px" 
};

const stepCircle = { 
  width: "36px", 
  height: "36px", 
  borderRadius: "50%", 
  display: "flex", 
  alignItems: "center", 
  justifyContent: "center", 
  fontWeight: "800", 
  cursor: "pointer", 
  fontSize: "14px", 
  transition: "all 0.3s" 
};

const stepLine = { 
  width: "40px", 
  height: "3px", 
  margin: "0 10px", 
  borderRadius: "10px" 
};

const formGrid = { 
  display: "grid", 
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
  gap: "20px",
  flex: 1
};

const inputGroup = { display: "flex", flexDirection: "column", gap: "8px" };
const labelStyle = { fontSize: "11px", fontWeight: "800", color: "#94a3b8", letterSpacing: "0.05em" };

const inputStyle = { 
  padding: "14px 16px", 
  borderRadius: "14px", 
  border: "1px solid #e2e8f0", 
  outline: "none", 
  fontSize: "16px", 
  color: "#334155", 
  background: "#fcfcfd", 
  transition: "all 0.2s" 
};

const buttonRow = { 
  display: "flex", 
  gap: "15px", 
  marginTop: "40px",
  paddingBottom: "20px"
};

const nextBtnStyle = { 
  flex: 2, 
  padding: "16px", 
  background: "#0f0890", 
  color: "#fff", 
  border: "none", 
  borderRadius: "16px", 
  cursor: "pointer", 
  fontWeight: "800", 
  fontSize: "16px", 
  boxShadow: "0 10px 15px -3px rgba(15, 8, 144, 0.2)" 
};

const backBtnStyle = { 
  flex: 1, 
  padding: "16px", 
  background: "#fff", 
  color: "#64748b", 
  border: "2px solid #f1f5f9", 
  borderRadius: "16px", 
  cursor: "pointer", 
  fontWeight: "700" 
};

const submitBtnStyle = { 
  ...nextBtnStyle, 
  background: "#10b981", 
  boxShadow: "0 10px 15px -3px rgba(16, 185, 129, 0.2)" 
};

const popupOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.3)",
  backdropFilter: "blur(4px)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999
};

const centerPopup = { 
  padding: "20px 40px", 
  borderRadius: "24px", 
  color: "#fff", 
  fontWeight: "800", 
  fontSize: "18px",
  textAlign: "center",
  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
  animation: "fadeInScale 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)"
};

export default RegistrationStudent;