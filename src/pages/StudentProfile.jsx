import React, { useEffect, useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import { FaUser, FaMapMarkerAlt, FaShieldAlt, FaEdit, FaArrowLeft, FaCheckCircle, FaClock } from "react-icons/fa";

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

  const groupTitles = {
    1: { title: "Personal Information", icon: <FaUser /> },
    2: { title: "Address Details", icon: <FaMapMarkerAlt /> },
    3: { title: "Contact & Security", icon: <FaShieldAlt /> }
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return navigate("/login");
    fetchData(user.id);
  }, [navigate]);

  const fetchData = async (userId) => {
    try {
      const [profileRes, allReqRes] = await Promise.all([
        api.get(`/api/students/profile?id=${userId}`),
        api.get(`/api/students/edit-requests?id=${userId}`)
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
      const res = await api.put(`/api/students/update/${profile.id}`, profile);
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
    if (req) return <span style={pendingBadge}><FaClock size={10} /> Pending Approval</span>;
    return null;
  };

  if (loading) return <div style={loadingText}>Loading Profile...</div>;

  return (
    <div style={container}>
      <div style={scrollWrapper}>
        
        {/* Header Profile Card - Optimized Size */}
        <div style={headerStyle}>
          <div style={avatarContainer}>
            <img src={profile.profile_photo || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} alt="Profile" style={photo} />
            <div style={onlineBadge} />
          </div>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ margin: "0 0 4px 0", color: "#0f172a", fontSize: "22px", fontWeight: "800" }}>{profile.name || "New Student"}</h2>
            <p style={{ color: "#6366f1", fontWeight: "600", fontSize: "13px", margin: 0, background: "#e0e7ff", padding: "3px 10px", borderRadius: "20px", display: "inline-block" }}>
              Student ID: {profile.code || "Not Assigned"}
            </p>
          </div>
        </div>

        {!isEditing ? (
          <div style={viewSection}>
            {Object.keys(fieldGroups).map(g => (
              <div key={g} style={sectionCard}>
                <div style={sectionHeader}>
                  <span style={{ color: "#6366f1", fontSize: "16px" }}>{groupTitles[g].icon}</span>
                  <h3 style={{ margin: 0, fontSize: "15px", color: "#334155", fontWeight: "700" }}>{groupTitles[g].title}</h3>
                </div>
                <div style={infoGrid}>
                  {fieldGroups[g].map(key => (
                    <div key={key} style={infoItem}>
                      <label style={viewLabel}>{key.replace("_", " ").toUpperCase()}</label>
                      <p style={viewValue}>
                        {key === 'dob' ? formatDate(profile[key]) : (profile[key] || "---")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div style={btnRow}>
              <button onClick={() => setIsEditing(true)} style={primaryBtn}>
                <FaEdit /> Complete / Edit Profile
              </button>
              <button onClick={() => navigate("/student/apply-correction", { state: { profile } })} style={correctionBtnView}>
                Request Correction
              </button>
            </div>
          </div>
        ) : (
          <div style={editSection}>
            <div style={stepperContainer}>
              {[1, 2, 3].map((num) => (
                <React.Fragment key={num}>
                  <div 
                     style={{ ...circle, background: step >= num ? "#6366f1" : "#e2e8f0", color: step >= num ? "#fff" : "#64748b", boxShadow: step === num ? "0 0 0 4px rgba(99, 102, 241, 0.2)" : "none" }} 
                     onClick={() => setStep(num)}
                  >
                    {step > num ? <FaCheckCircle /> : num}
                  </div>
                  {num < 3 && <div style={{ ...line, background: step > num ? "#6366f1" : "#e2e8f0" }} />}
                </React.Fragment>
              ))}
            </div>

            <div style={stepTitleContainer}>
              <h3 style={{ color: "#1e293b", margin: "0 0 16px 0", fontSize: "16px" }}>
                Step {step}: {groupTitles[step].title}
              </h3>
            </div>

            <div style={formGrid}>
              {fieldGroups[step].map((key) => (
                <div key={key} style={inputGroup}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <label style={labelStyle}>{key.replace("_", " ").toUpperCase()}</label>
                    {getStatusBadge(key)}
                  </div>
                  <input
                    name={key}
                    type={key === "dob" ? "date" : "text"}
                    value={key === "dob" ? formatForInput(profile[key]) : (profile[key] || "")}
                    onChange={handleChange}
                    disabled={locked[key]}
                    placeholder={`Enter ${key.replace("_", " ")}`}
                    style={{
                      ...inputStyle,
                      background: locked[key] ? "#f8fafc" : "#fff",
                      cursor: locked[key] ? "not-allowed" : "text",
                      borderColor: locked[key] ? "#cbd5e1" : "#6366f1",
                      color: locked[key] ? "#94a3b8" : "#0f172a"
                    }}
                  />
                  {locked[key] && <span style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px", display: "block" }}>🔒 Field locked. Use correction request if needed.</span>}
                </div>
              ))}
            </div>

            <div style={btnRow}>
              <button onClick={() => setIsEditing(false)} style={secondaryBtn}>
                <FaArrowLeft /> Cancel
              </button>
              {step > 1 && <button onClick={() => setStep(step - 1)} style={secondaryBtn}>Back</button>}
              {step < 3 ? (
                <button onClick={() => setStep(step + 1)} style={primaryBtn}>Next Step</button>
              ) : (
                <button onClick={handleSave} disabled={saving} style={primaryBtn}>
                  {saving ? "Saving Changes..." : "Save Profile"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {popup && <div style={popupStyle}>{popup}</div>}
    </div>
  );
};

// --- STYLES ---

const loadingText = { textAlign: 'center', padding: '60px', fontSize: '16px', color: "#64748b", fontWeight: "600" };

const container = { 
  width: "100%", 
  minHeight: "100vh",
  padding: "24px 16px", 
  background: "#f1f5f9", 
  boxSizing: "border-box",
  fontFamily: "'Inter', 'Segoe UI', sans-serif"
};

const scrollWrapper = {
  maxWidth: "800px",
  margin: "0 auto",
  padding: "25px 30px",
  background: "#ffffff",
  borderRadius: "16px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.03)",
  border: "1px solid #e2e8f0"
};

const headerStyle = { 
  display: "flex", 
  flexDirection: "column", 
  alignItems: "center", 
  marginBottom: "24px",
  borderBottom: "1px solid #f1f5f9",
  paddingBottom: "18px"
};

const avatarContainer = { position: "relative", marginBottom: "10px" };
const photo = { 
  width: "90px", 
  height: "90px", 
  borderRadius: "50%", 
  border: "3px solid #ffffff", 
  objectFit: "cover", 
  boxShadow: "0 6px 16px rgba(99, 102, 241, 0.2)" 
};
const onlineBadge = {
  position: "absolute",
  bottom: "4px",
  right: "4px",
  width: "14px",
  height: "14px",
  background: "#10b981",
  border: "2px solid #fff",
  borderRadius: "50%"
};

const viewSection = { display: "flex", flexDirection: "column", gap: "16px" };
const editSection = { animation: "fadeIn 0.3s ease" };

const sectionCard = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "16px 20px"
};

const sectionHeader = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginBottom: "12px",
  borderBottom: "1px solid #e2e8f0",
  paddingBottom: "8px"
};

const infoGrid = { 
  display: "grid", 
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
  gap: "16px" 
};

const infoItem = { display: "flex", flexDirection: "column", gap: "2px" };
const viewLabel = { fontSize: "10px", fontWeight: "700", color: "#64748b", letterSpacing: "0.5px" };
const viewValue = { fontSize: "14px", fontWeight: "600", color: "#1e293b", margin: 0 };

const formGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" };
const inputGroup = { marginBottom: "4px" };
const labelStyle = { fontSize: "11px", fontWeight: "700", color: "#475569", letterSpacing: "0.5px" };

const inputStyle = { 
  width: "100%", 
  padding: "10px 14px", 
  borderRadius: "8px", 
  border: "1.5px solid", 
  outline: "none", 
  boxSizing: "border-box", 
  fontSize: "13px",
  transition: "all 0.2s ease"
};

const btnRow = { display: "flex", gap: "12px", marginTop: "24px" };

const primaryBtn = { 
  flex: 1, 
  padding: "12px 18px", 
  background: "#6366f1", 
  color: "#fff", 
  border: "none", 
  borderRadius: "10px", 
  cursor: "pointer", 
  fontWeight: "700", 
  fontSize: "13px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
  transition: "background 0.2s"
};

const secondaryBtn = { 
  padding: "12px 18px", 
  background: "#f1f5f9", 
  color: "#475569", 
  border: "1px solid #cbd5e1", 
  borderRadius: "10px", 
  cursor: "pointer", 
  fontWeight: "600", 
  fontSize: "13px",
  display: "flex",
  alignItems: "center",
  gap: "6px"
};

const correctionBtnView = { 
  flex: 1, 
  padding: "12px 18px", 
  background: "#fff", 
  color: "#f97316", 
  border: "1.5px solid #fdba74", 
  borderRadius: "10px", 
  cursor: "pointer", 
  fontWeight: "700",
  fontSize: "13px",
  textAlign: "center"
};

const stepperContainer = { display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" };
const circle = { width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "13px", cursor: "pointer", transition: "all 0.3s" };
const line = { width: "45px", height: "3px", transition: "background 0.3s" };

const stepTitleContainer = { textAlign: "center", borderBottom: "1px solid #f1f5f9", marginBottom: "16px" };

const pendingBadge = { 
  fontSize: "9px", 
  background: "#fef3c7", 
  color: "#b45309", 
  padding: "2px 6px", 
  borderRadius: "8px", 
  fontWeight: "700",
  display: "flex",
  alignItems: "center",
  gap: "3px"
};

const popupStyle = { 
  position: "fixed", 
  bottom: "20px", 
  right: "20px", 
  background: "#10b981", 
  color: "#fff", 
  padding: "12px 20px", 
  borderRadius: "10px", 
  fontWeight: "700", 
  boxShadow: "0 8px 20px rgba(16, 185, 129, 0.25)",
  zIndex: 1000,
  fontSize: "13px"
};

export default StudentProfile;