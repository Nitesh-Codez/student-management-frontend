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

  // "code" added to Step 1
  const fieldGroups = {
    1: ["code", "name", "father_name", "mother_name", "dob", "gender", "category"],
    2: ["address", "city", "state", "pincode", "district"],
    3: ["email", "mobile", "blood_group"]
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return navigate("/login");

    const fetchData = async () => {
      try {
        const [profileRes, allReqRes] = await Promise.all([
          axios.get(`${API_URL}/api/students/profile?id=${user.id}`),
          axios.get(`${API_URL}/api/students/edit-requests?id=${user.id}`)
        ]);

        if (profileRes.data.success) {
          const studentProfile = profileRes.data.student;
          setProfile(studentProfile);

          const initialLocks = {};
          Object.keys(studentProfile).forEach(key => {
            initialLocks[key] = !!(studentProfile[key]);
          });

          const studentAll = allReqRes.data.requests;
          setAllRequests(studentAll);

          const now = new Date();
          studentAll.forEach(r => {
            if (r.status === "approved") {
              const approvedTime = new Date(r.updated_at || r.action_at || now);
              const diffHours = (now - approvedTime) / (1000 * 60 * 60);
              if (diffHours <= 24) initialLocks[r.field_name] = false;
            }
          });
          setLocked(initialLocks);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  const handleChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });

  const handleSave = async () => {
    try {
      setSaving(true);
      // Data format synced with your backend UPDATE query
      await axios.put(`${API_URL}/api/students/update/${profile.id}`, profile);
      setPopup("Profile updated successfully ✅");
      setIsEditing(false);
      setTimeout(() => setPopup(""), 3000);
    } catch (err) {
      setPopup("Error saving profile ❌");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatForInput = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const getStatusBadge = (field) => {
    const req = allRequests.find(r => r.field_name === field);
    if (!req || req.status === "rejected") return null;
    const colors = { approved: "#166534", pending: "#854d0e" };
    return <span style={{ fontSize: "10px", marginLeft: "5px", color: colors[req.status] }}>({req.status})</span>;
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>Loading Profile...</div>;

  return (
    <div style={container}>
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <img src={profile.profile_photo || "/default-profile.png"} alt="Profile" style={photo} />
        <h2 style={{ margin: "10px 0 5px" }}>{profile.name}</h2>
        <p style={{ color: "#64748b", fontSize: "14px" }}>Student ID: {profile.id}</p>
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
          
          <div style={{ marginTop: "30px", display: "flex", gap: "10px" }}>
            <button onClick={() => setIsEditing(true)} style={primaryBtn}>Edit Profile</button>
            <button 
              onClick={() => navigate("/student/apply-correction", { state: { profile } })} 
              style={correctionBtnView}
            >
              Apply for Correction
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={stepperContainer}>
            {[1, 2, 3].map((num) => (
              <React.Fragment key={num}>
                <div 
                  style={{
                    ...circle, 
                    background: step >= num ? "#4f46e5" : "#e2e8f0",
                    color: step >= num ? "#fff" : "#64748b"
                  }}
                  onClick={() => setStep(num)}
                >
                  {num}
                </div>
                {num < 3 && <div style={{...line, background: step > num ? "#4f46e5" : "#e2e8f0"}} />}
              </React.Fragment>
            ))}
          </div>
          
          <p style={stepTitle}>{step === 1 ? "Personal Details" : step === 2 ? "Address Details" : "Contact Details"}</p>

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
                  style={{
                    ...inputStyle,
                    background: locked[key] ? "#f8fafc" : "#fff",
                    borderColor: locked[key] ? "#e2e8f0" : "#4f46e5"
                  }}
                />
              </div>
            ))}
          </div>

          <div style={btnRow}>
            <button onClick={() => setIsEditing(false)} style={secondaryBtn}>Cancel</button>
            <div style={{ display: "flex", gap: "10px", flex: 2 }}>
                {step > 1 && <button onClick={() => setStep(step - 1)} style={secondaryBtn}>Back</button>}
                {step < 3 ? (
                <button onClick={() => setStep(step + 1)} style={primaryBtn}>Next</button>
                ) : (
                <button onClick={handleSave} disabled={saving} style={primaryBtn}>
                    {saving ? "Saving..." : "Save Profile"}
                </button>
                )}
            </div>
          </div>
        </>
      )}

      {(!isEditing || step === 3) && allRequests.length > 0 && (
        <div style={{ marginTop: "40px", overflowX: "auto", borderTop: "2px solid #f1f5f9", paddingTop: "20px" }}>
          <h4 style={{marginBottom: '15px', color: '#1e293b'}}>Recent Correction Requests</h4>
          <table style={tableStyle}>
            <thead>
              <tr style={{textAlign: 'left', fontSize: '12px', color: '#666'}}>
                <th>Field</th>
                <th>Requested Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {allRequests.map(r => (
                <tr key={r.id} style={{fontSize: '13px', borderBottom: '1px solid #f9f9f9'}}>
                  <td style={{padding: '10px 0'}}>{r.field_name.toUpperCase()}</td>
                  <td>{r.requested_value}</td>
                  <td style={{ color: r.status === 'approved' ? 'green' : r.status === 'rejected' ? 'red' : 'orange', fontWeight: 'bold' }}>
                    {r.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {popup && <div style={popupStyle}>{popup}</div>}
    </div>
  );
};

// --- Styles ---
const container = { maxWidth: "1800px", margin: "20px auto", padding: "10px", background: "#fff", borderRadius: "12px", boxShadow: "0 20px 40px rgba(0,0,0,0.08)", fontFamily: "'Segoe UI', sans-serif" };
const viewSection = { animation: "fadeIn 0.5s ease" };
const infoGrid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", background: "#f8fafc", padding: "25px", borderRadius: "15px" };
const infoItem = { borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" };
const viewLabel = { fontSize: "14px", fontWeight: "800", color: "#00357f", display: "block", marginBottom: "4px" };
const viewValue = { fontSize: "16px", fontWeight: "500", color: "#090d12", margin: 0 };
const correctionBtnView = { flex: 1, padding: "12px", background: "#fff", color: "#f97316", border: "1.5px solid #f97316", borderRadius: "12px", cursor: "pointer", fontWeight: "600" };
const stepperContainer = { display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "5px" };
const circle = { width: "35px", height: "35px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "14px", cursor: "pointer" };
const line = { width: "50px", height: "3px" };
const stepTitle = { textAlign: "center", fontWeight: "700", color: "#1e293b", marginBottom: "25px", fontSize: "18px" };
const photo = { width: "120px", height: "120px", borderRadius: "50%", border: "4px solid #1710a8", objectFit: "cover", boxShadow: "0 10px 20px rgba(79, 70, 229, 0.2)" };
const formGrid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" };
const inputGroup = { marginBottom: "15px" };
const labelStyle = { fontSize: "11px", fontWeight: "bold", color: "#64748b", marginBottom: "5px", display: "block" };
const inputStyle = { width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid", outline: "none", boxSizing: "border-box", fontSize: "14px" };
const btnRow = { display: "flex", gap: "10px", marginTop: "30px" };
const primaryBtn = { flex: 1, padding: "14px", background: "#0f0890", color: "#fff", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "600", boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)" };
const secondaryBtn = { padding: "14px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "600" };
const tableStyle = { width: "100%", marginTop: "10px", borderCollapse: "collapse" };
const popupStyle = { position: "fixed", bottom: "20px", right: "20px", background: "#10b981", color: "#fff", padding: "15px 25px", borderRadius: "10px", fontWeight: "600" };

export default StudentProfile;