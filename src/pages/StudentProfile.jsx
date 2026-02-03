import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_URL = "https://student-management-system-4-hose.onrender.com";

const StudentProfile = () => {
  const [profile, setProfile] = useState({});
  const [locked, setLocked] = useState({});
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [popup, setPopup] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();

  const fieldGroups = {
    1: ["code", "name", "father_name", "mother_name", "dob", "gender", "category"],
    2: ["address", "city", "district", "state", "pincode"],
    3: ["email", "mobile", "blood_group", "aadhaar"] 
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return navigate("/login");
    fetchData(user.id);
  }, [navigate]);

  const fetchData = async (userId) => {
    try {
      const [profileRes, allReqRes] = await Promise.all([
        axios.get(`${API_URL}/api/students/profile?id=${userId}`),
        axios.get(`${API_URL}/api/students/edit-requests?id=${userId}`)
      ]);

      if (profileRes.data.success) {
        const studentProfile = profileRes.data.student;
        setProfile(studentProfile);

        const initialLocks = {};
        Object.values(fieldGroups).flat().forEach(key => {
          initialLocks[key] = !!(studentProfile[key] && studentProfile[key].toString().trim() !== "");
        });

        const studentAll = allReqRes.data.requests || [];
        setAllRequests(studentAll);

        const now = new Date();
        studentAll.forEach(r => {
          if (r.status === "approved") {
            const approvedTime = new Date(r.action_at || now);
            const diffHours = (now - approvedTime) / (1000 * 60 * 60);
            if (diffHours <= 24) initialLocks[r.field_name] = false;
          }
        });
        
        setLocked(initialLocks);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await axios.put(`${API_URL}/api/students/update/${profile.id}`, profile);
      if(res.data.success) {
        setPopup("Profile saved successfully ✅");
        setIsEditing(false);
        if (res.data.student) setProfile(res.data.student); 
        fetchData(profile.id); 
      }
    } catch (err) {
      setPopup("Error saving profile ❌");
    } finally {
      setSaving(false);
      setTimeout(() => setPopup(""), 3000);
    }
  };

  const formatDate = (str) => str ? new Date(str).toLocaleDateString('en-GB') : "---";
  const formatForInput = (str) => (str && str !== "---") ? new Date(str).toISOString().split('T')[0] : "";

  const getStatusBadge = (field) => {
    const req = allRequests.find(r => r.field_name === field && r.status === "pending");
    if (req) return <span style={{ fontSize: "10px", color: "#854d0e" }}>(Pending Edit)</span>;
    return null;
  };

  if (loading) return <div style={loadingText}>Loading Profile...</div>;

  return (
    <div style={container}>
      {/* Horizontal Scroll Wrapper */}
      <div style={scrollWrapper}>
        <div style={headerStyle}>
          <img src={profile.profile_photo || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} alt="Profile" style={photo} />
          <h2 style={{ margin: "10px 0" }}>{profile.name || "New Student"}</h2>
          <p style={{ color: "#64748b" }}>Student Code: {profile.code || "Not Assigned"}</p>
        </div>

        {!isEditing ? (
          <div style={viewSection}>
            <div style={infoGrid}>
              {Object.keys(fieldGroups).map(g => 
                fieldGroups[g].map(key => (
                  <div key={key} style={infoItem}>
                    <label style={viewLabel}>{key.replace("_", " ").toUpperCase()}</label>
                    <p style={viewValue}>{key === 'dob' ? formatDate(profile[key]) : (profile[key] || "---")}</p>
                  </div>
                ))
              )}
            </div>
            <div style={btnRow}>
              <button onClick={() => setIsEditing(true)} style={primaryBtn}>Complete/Edit Profile</button>
              <button onClick={() => navigate("/student/apply-correction", { state: { profile } })} style={correctionBtnView}>
                Request Correction
              </button>
            </div>
          </div>
        ) : (
          <>
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

            <div style={formGrid}>
              {fieldGroups[step].map((key) => (
                <div key={key} style={inputGroup}>
                  <label style={labelStyle}>{key.replace("_", " ").toUpperCase()} {getStatusBadge(key)}</label>
                  <input
                    name={key}
                    type={key === "dob" ? "date" : "text"}
                    value={key === "dob" ? formatForInput(profile[key]) : (profile[key] || "")}
                    onChange={handleChange}
                    disabled={locked[key]}
                    placeholder={`Enter ${key.replace("_", " ")}`}
                    style={{
                      ...inputStyle,
                      background: locked[key] ? "#f1f5f9" : "#fff",
                      cursor: locked[key] ? "not-allowed" : "text",
                      borderColor: locked[key] ? "#cbd5e1" : "#0f0890"
                    }}
                  />
                </div>
              ))}
            </div>

            <div style={btnRow}>
              <button onClick={() => setIsEditing(false)} style={secondaryBtn}>Cancel</button>
              {step > 1 && <button onClick={() => setStep(step - 1)} style={secondaryBtn}>Back</button>}
              {step < 3 ? (
                <button onClick={() => setStep(step + 1)} style={primaryBtn}>Next</button>
              ) : (
                <button onClick={handleSave} disabled={saving} style={primaryBtn}>
                  {saving ? "Saving..." : "Save Profile"}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {popup && <div style={popupStyle}>{popup}</div>}
    </div>
  );
};

// --- STYLES ---

const loadingText = { textAlign: 'center', padding: '50px', fontSize: '20px' };

// Full width container with horizontal scroll
const container = { 
  width: "100%", 
  minHeight: "100vh",
  padding: "20px", 
  background: "#f3f4f6", // Light background for the whole page
  boxSizing: "border-box",
  overflowX: "centre" // Right-Left Scroll enable
};

// Inner wrapper to keep content together
const scrollWrapper = {
  minWidth: "300px", // Scroll starts if screen is smaller than this
  margin: "0 auto",
  padding: "40px",
  background: "#fff",
  borderRadius: "12px",
  boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
  fontFamily: "'Segoe UI', sans-serif"
};

const headerStyle = { textAlign: "center", marginBottom: "30px" };
const viewSection = { animation: "fadeIn 0.5s ease" };
const infoGrid = { 
  display: "grid", 
  // 1fr 1fr ka matlab hai do barabar hisse, lekin "minmax" use karne se ye stretch honge
  gridTemplateColumns: "repeat(2, 1fr)", 
  gap: "30px",             // Gap thoda bada kiya taaki clean lage
  background: "#f8fafc", 
  width: "100%",           // Parent container ki poori width lega
  padding: "20px",         // Andar ki padding badha di taaki box bada dikhe
  borderRadius: "15px",
  boxSizing: "border-box"  // Padding ko width ke andar rakhega
};
const infoItem = { borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" };
const viewLabel = { fontSize: "14px", fontWeight: "800", color: "#00357f", display: "block", marginBottom: "4px" };
const viewValue = { fontSize: "16px", fontWeight: "500", color: "#090d12", margin: 0 };
const correctionBtnView = { flex: 1, padding: "12px", background: "#fff", color: "#f97316", border: "1.5px solid #f97316", borderRadius: "12px", cursor: "pointer", fontWeight: "600" };
const stepperContainer = { display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "25px" };
const circle = { width: "35px", height: "35px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "14px", cursor: "pointer" };
const line = { width: "50px", height: "3px" };
const photo = { width: "160px", height: "160px", borderRadius: "50%", border: "4px solid #1710a8", objectFit: "cover", boxShadow: "0 10px 20px rgba(79, 70, 229, 0.2)" };
const formGrid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" };
const inputGroup = { marginBottom: "15px" };
const labelStyle = { fontSize: "11px", fontWeight: "bold", color: "#64748b", marginBottom: "5px", display: "block" };
const inputStyle = { width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid", outline: "none", boxSizing: "border-box", fontSize: "14px" };
const btnRow = { display: "flex", gap: "10px", marginTop: "30px" };
const primaryBtn = { flex: 1, padding: "14px", background: "#0f0890", color: "#fff", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "600", boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)" };
const secondaryBtn = { padding: "14px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "600" };
const popupStyle = { position: "fixed", bottom: "20px", right: "20px", background: "#10b981", color: "#fff", padding: "15px 25px", borderRadius: "10px", fontWeight: "600", zIndex: 1000 };

export default StudentProfile;