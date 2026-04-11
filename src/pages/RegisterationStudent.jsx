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
    setTimeout(() => setPopup(null), 4000); // 4 seconds for better reading
  };

  // --- API HANDLERS ---

  /**
   * FETCH STUDENT DATA
   * Retrieves profile and checks update_count from your controller logic
   */
  const fetchStudent = async () => {
    if (!searchCode) {
      return showPopup("Please enter a Student ID! ⚠️", "#f59e0b");
    }
    
    setLoading(true);
    try {
      const profileRes = await axios.get(`${API_URL}/api/students/profile?id=${searchCode}`);

      if (profileRes.data.success) {
        const student = profileRes.data.student;
        const sanitizedData = {};
        
        Object.keys(initialForm).forEach(key => {
          sanitizedData[key] = student[key] || ""; 
        });

        setFormData(sanitizedData);
        
        // Backend logic: update_count check
        const count = Number(student.update_count) || 0;
        const left = Math.max(0, 3 - count);
        setRemainingUpdates(left);

        if (left <= 0) {
            showPopup("Your update chances finished. Please contact Faculty for registration! 🛑", "#ef4444");
        } else {
            showPopup("Student record loaded successfully! ✅");
        }
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
   */
  const handleSave = async () => {
    if (formData.id) {
      // Final Shield: Check remaining updates
      if (remainingUpdates <= 0) {
        return showPopup("Your update chances finished. Please contact Faculty for registration! 🛑", "#ef4444");
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
    // Backend se check karein kitne bache hain (3 - updateCount)
    const left = res.data.remainingUpdates !== undefined 
                 ? res.data.remainingUpdates 
                 : (3 - res.data.student.update_count);
    
    setRemainingUpdates(left);

    if (left <= 0) {
        // Jab 3 updates ho chuke hain aur baki 0 bache hain
        showPopup("Your Update chances finished! Now contact to Faculty. 🛑", "#ef4444");
    } else {
        // Jab 1 ya 2 updates baki hain
        showPopup(`Profile Updated! Attendance Reset ❗ (Left: ${left})`, "#10b981");
    }
} else {
    // Naya registration
    showPopup("Student Registered Successfully! 🎓", "#10b981");
    setFormData(initialForm);
    setStep(1);
    setSearchCode("");
}
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || "Save failed! Please check fields.";
      showPopup(`${errMsg} ❌`, "#ef4444");
    } finally {
      setSaving(false);
    }
  };

  // --- RENDER ---
  return (
    <div style={containerStyle}>
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
             <div style={{...photoBadge, background: formData.id ? "#10b981" : "#64748b"}}>
                {formData.id ? "ACTIVE" : "NEW"}
             </div>
          </div>
          <div style={headerTextWrapper}>
             <h2 style={mainTitle}>Student Registration</h2>
             <p style={subTitle}>Session: <span style={{fontWeight: '700'}}>{formData.session || "---"}</span></p>
             {formData.id && (
               <div style={{
                 ...quotaBadge, 
                 background: remainingUpdates > 0 ? "#e0e7ff" : "#fee2e2",
                 color: remainingUpdates > 0 ? "#4338ca" : "#dc2626",
                 border: remainingUpdates > 0 ? "1px solid #c7d2fe" : "1px solid #fecaca"
               }}>
                 {remainingUpdates > 0 
                  ? `See Expired Chances: ${remainingUpdates} Updates  Chances done` 
                  : "Update Limit Exceeded (Contact Faculty)"}
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
              
              {key === "session" ? (
                <select name="session" value={formData.session || ""} onChange={handleChange} style={inputStyle} className="custom-input">
                  <option value="2025-26">2025-26</option>
                  <option value="2026-27">2026-27</option>
                  <option value="2027-28">2027-28</option>
                </select>
              ) : 
              key === "class" ? (
                <select name="class" value={formData.class || ""} onChange={handleChange} style={inputStyle} className="custom-input">
                  <option value="">Select Class</option>
                  <optgroup label="Primary">
                    <option value="Nursery">Nursery</option>
                    <option value="L.K.G">L.K.G</option>
                    <option value="U.K.G">U.K.G</option>
                    <option value="1st">1st</option>
                    <option value="2nd">10th</option>
                    <option value="3rd">11th</option>
                    <option value="4th">12th</option>
                    <option value="5th">10th</option>
                    <option value="6th">11th</option>
                    <option value="7th">12th</option>
                    <option value="8th">12th</option>
                    <option value="9th">12th</option>
                  </optgroup>
                  <optgroup label="Higher">
                    <option value="10th">10th</option>
                    <option value="11th">11th</option>
                    <option value="12th">12th</option>
                  </optgroup>
                </select>
              ) : 
              key === "stream" ? (
                <select name="stream" value={formData.stream || ""} onChange={handleChange} style={inputStyle} className="custom-input">
                  <option value="None">None</option>
                  <option value="PCM">PCM</option>
                  <option value="PCB">PCB</option>
                  <option value="Arts">Arts</option>
                  <option value="Commerce">Commerce</option>
                </select>
              ) : 
              key === "gender" ? (
                <select name="gender" value={formData.gender || ""} onChange={handleChange} style={inputStyle} className="custom-input">
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              ) : 
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
                background: (formData.id && remainingUpdates <= 0) ? "#94a3b8" : "#10b981",
                cursor: (formData.id && remainingUpdates <= 0) ? 'not-allowed' : 'pointer',
                boxShadow: (formData.id && remainingUpdates <= 0) ? "none" : submitBtnStyle.boxShadow
              }}
            >
              {saving ? "Processing..." : (formData.id ? "Update Profile" : "Complete Registration")}
            </button>
          )}
        </div>

      </div>

      {/* CENTER ANIMATED NOTIFICATION POPUP */}
      {popup && (
        <div style={popupOverlay} onClick={() => setPopup(null)}>
          <div style={{ ...centerPopup, background: popup.bg }} onClick={e => e.stopPropagation()}>
            {popup.msg}
          </div>
        </div>
      )}

    </div>
  );
};

// --- STYLES ---
const containerStyle = { width: "100%", minHeight: "100vh", background: "#f8fafc", display: "flex", justifyContent: "center", alignItems: "flex-start", fontFamily: "'Inter', sans-serif", padding: "0px" };
const appCardStyle = { width: "100%", maxWidth: "100%", minHeight: "100vh", background: "#fff", padding: "20px", display: "flex", flexDirection: "column", animation: "slideUp 0.4s ease-out" };
const headerSection = { display: "flex", alignItems: "center", gap: "20px", marginTop: "10px", marginBottom: "30px", padding: "15px", background: "#f1f5f9", borderRadius: "20px" };
const photoWrapper = { position: "relative" };
const photoStyle = { width: "90px", height: "90px", borderRadius: "18px", border: "3px solid #fff", objectFit: "cover", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" };
const photoBadge = { position: "absolute", bottom: "-8px", right: "-8px", color: "#fff", fontSize: "10px", fontWeight: "900", padding: "4px 8px", borderRadius: "8px" };
const headerTextWrapper = { flex: 1 };
const mainTitle = { fontSize: "24px", fontWeight: "900", color: "#1e293b", margin: 0 };
const subTitle = { color: "#64748b", fontSize: "14px", marginTop: "4px" };
const quotaBadge = { display: "inline-block", padding: "6px 12px", borderRadius: "10px", fontSize: "12px", fontWeight: "800", marginTop: "10px" };
const searchRow = { display: "flex", gap: "10px", marginBottom: "25px", background: "#fff", padding: "10px", borderRadius: "16px", border: "1px solid #e2e8f0" };
const searchInput = { flex: 1, border: "none", outline: "none", fontSize: "15px", padding: "10px" };
const fetchBtn = { padding: "10px 20px", background: "#1e293b", color: "#fff", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "700" };
const stepperWrapper = { display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "35px" };
const stepCircle = { width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", cursor: "pointer" };
const stepLine = { width: "40px", height: "3px", margin: "0 10px", borderRadius: "10px" };
const formGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", flex: 1 };
const inputGroup = { display: "flex", flexDirection: "column", gap: "8px" };
const labelStyle = { fontSize: "11px", fontWeight: "800", color: "#94a3b8" };
const inputStyle = { padding: "14px 16px", borderRadius: "14px", border: "1px solid #e2e8f0", outline: "none", fontSize: "16px", background: "#fcfcfd" };
const buttonRow = { display: "flex", gap: "15px", marginTop: "40px", paddingBottom: "20px" };
const nextBtnStyle = { flex: 2, padding: "16px", background: "#0f0890", color: "#fff", border: "none", borderRadius: "16px", fontWeight: "800", fontSize: "16px", boxShadow: "0 10px 15px -3px rgba(15, 8, 144, 0.2)" };
const backBtnStyle = { flex: 1, padding: "16px", background: "#fff", color: "#64748b", border: "2px solid #f1f5f9", borderRadius: "16px", fontWeight: "700" };
const submitBtnStyle = { ...nextBtnStyle, background: "#10b981", boxShadow: "0 10px 15px -3px rgba(16, 185, 129, 0.2)" };
const popupOverlay = { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 };
const centerPopup = { padding: "30px 40px", borderRadius: "24px", color: "#fff", fontWeight: "800", fontSize: "18px", textAlign: "center", maxWidth: "80%", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)", animation: "fadeInScale 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)" };

export default RegistrationStudent;