import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";

// Icons
const HomeIcon = () => <span>🏠</span>;
const MsgIcon = () => <span>💬</span>;
const UserIcon = () => <span>👤</span>;
const MenuIcon = () => <span>☰</span>;

const API_URL = "https://student-management-system-4-hose.onrender.com";

const subjectsByClass = {
  "1st": ["Hindi", "English", "EVS", "Maths"],
  "2nd": ["Hindi", "English", "EVS", "Maths"],
  "3rd": ["Hindi", "English", "EVS", "Maths"],
  "4th": ["Hindi", "English", "EVS", "Maths"],
  "5th": ["Hindi", "English", "EVS", "Maths"],
  "6th": ["Hindi", "English", "Maths", "Sanskrit", "Science", "SST"],
  "7th": ["Hindi", "English", "Maths", "Science", "Sanskrit", "SST"],
  "8th": ["Hindi", "English", "Maths", "Science", "SST", "Sanskrit"],
  "9th": ["Hindi", "English", "Maths", "Science", "Sanskrit", "SST", "Computer"],
  "10th": ["Hindi", "English", "Maths", "Science", "Sanskrit", "SST", "Computer"],
  "11th": ["Hindi", "English", "Maths", "Physics", "Chemistry", "Biology", "Computer"],
  "12th": ["Hindi", "English", "Maths", "Physics", "Chemistry", "Biology", "Computer"]
};

export default function StudentResult() {
  const [student, setStudent] = useState("");
  const [cls, setCls] = useState("");
  const [term, setTerm] = useState("Terminal");
  const [marks, setMarks] = useState({});
  const [maxMarks, setMaxMarks] = useState(""); // Default Empty kar diya

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem("user"));
      if (userData) {
        if (userData.name) setStudent(userData.name);
         // Class bhi local storage se le li
      }
    } catch (err) {
      console.log("No user found");
    }
  }, []);

  const subjects = subjectsByClass[cls] || [];

  const stats = useMemo(() => {
    let totalObtained = 0;
    let filledSubjectsCount = 0;

    subjects.forEach((s) => {
      const markValue = marks[s];
      if (markValue !== undefined && markValue !== "" && markValue !== null) {
        totalObtained += Number(markValue);
        filledSubjectsCount++; 
      }
    });

    const currentMax = Number(maxMarks) || 0;
    const totalMax = filledSubjectsCount * currentMax;
    
    let perc = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : "0.00";

    if (Number(perc) > 100) perc = "100.00";

    return { totalObtained, totalMax, perc, filledSubjectsCount };
  }, [marks, maxMarks, subjects]);

  const submitResult = async () => {
    // Check if Max Marks is filled
    if (!maxMarks || Number(maxMarks) <= 0) {
        return alert("⚠️ Please Set Max Marks first!");
    }
    if (!student || !cls) return alert("Please fill student details");
    if (stats.filledSubjectsCount === 0) return alert("Please enter marks for subjects");

    try {
      await axios.post(`${API_URL}/api/results/add`, {
        student, 
        cls, 
        term, 
        marks, 
        percentage: stats.perc, 
        totalMarks: stats.totalMax,
        obtainedMarks: stats.totalObtained
      });
      alert("Result Saved Successfully ✅");
    } catch (error) {
      alert("Error saving result");
    }
  };

  return (
    <div style={mobileWrapper}>
      <div style={headerArea}>
        <p style={subHeaderText}>Marks and Performance Added Space</p>
        <h1 style={mainTitle}>Add Your Previous Classes Records</h1>
      </div>

      <div style={contentArea}>
        <div style={formGroup}>
          <label style={labelStyle}>Student Name</label>
          <input
            value={student}
            onChange={e => setStudent(e.target.value)}
            style={mainInput}
          />
        </div>

        <div style={flexRow}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Class</label>
            <select value={cls} onChange={e => {setCls(e.target.value); setMarks({});}} style={selectField}>
              <option value="">Select</option>
              {Object.keys(subjectsByClass).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Exam Term</label>
            <select value={term} onChange={e => setTerm(e.target.value)} style={selectField}>
              <option>Terminal</option>
              <option>Half Yearly</option>
              <option>Final</option>
            </select>
          </div>
        </div>

        <div style={{...maxMarksBox, border: !maxMarks ? "2px solid #ff5252" : "none"}}>
          <label style={labelStyle}>Set Max Marks of the Exam like 50 or 100</label>
          <input
            type="number"
            placeholder="Enter e.g. 50 or 100"
            value={maxMarks}
            onChange={e => setMaxMarks(e.target.value)}
            style={marksInputSmall}
          />
          {!maxMarks && <span style={{fontSize: '10px', color: '#ff5252'}}>Required for calculation</span>}
        </div>

        {subjects.length > 0 && (
          <div style={subjectCard}>
            <h3 style={subjectHeading}>Subject Marks:</h3>
            {subjects.map(s => (
              <div key={s} style={subjectRow}>
                <span style={subjectNameText}>{s}</span>
                <input
                  type="number"
                  placeholder="00"
                  value={marks[s] || ""}
                  onChange={e => setMarks({ ...marks, [s]: e.target.value })}
                  style={innerMarksInput}
                />
              </div>
            ))}
            
            <div style={summaryRow}>
               <p style={{fontSize: '12px', color: '#666'}}>Subjects: {stats.filledSubjectsCount}</p>
               <p>Total: <b>{stats.totalObtained} / {stats.totalMax}</b></p>
               <div style={percBadge}>
                 Percentage: <b style={{fontSize: '22px'}}>{stats.perc}%</b>
               </div>
            </div>
          </div>
        )}

        <button onClick={submitResult} style={submitBtn}>Save Result</button>
      </div>

      <div style={navContainer}>
        <div style={navBar}>
          <div style={navIcon}><HomeIcon /></div>
          <div style={navIcon}><MsgIcon /></div>
          <div style={navIcon}><UserIcon /></div>
          <div style={navIcon}><MenuIcon /></div>
        </div>
      </div>
    </div>
  );
}

// --- Styles (Shortened for brevity, use your existing styles) ---
const mobileWrapper = { background: "#f9fbff", minHeight: "100vh", fontFamily: "sans-serif", color: "#333" };
const headerArea = { padding: "40px 20px 10px 20px", textAlign: "center" };
const subHeaderText = { margin: 0, fontSize: "14px", color: "#666" };
const mainTitle = { margin: "5px 0", fontSize: "32px", color: "#1a237e", fontWeight: "800" };
const contentArea = { padding: "0 20px" };
const formGroup = { marginBottom: "20px" };
const labelStyle = { display: "block", fontSize: "14px", fontWeight: "600", color: "#444", marginBottom: "8px" };
const mainInput = { width: "100%", padding: "16px", borderRadius: "15px", border: "2px solid #eee", fontSize: "16px", boxSizing: "border-box" };
const selectField = { ...mainInput };
const flexRow = { display: "flex", gap: "15px", marginBottom: "20px" };
const maxMarksBox = { background: "#ffffff", padding: "15px", borderRadius: "18px", marginBottom: "20px", transition: '0.3s' };
const marksInputSmall = { ...mainInput, border: "none", marginTop: "5px", background: 'transparent' };
const subjectCard = { background: "#fff", padding: "20px", borderRadius: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.05)", marginBottom: "20px" };
const subjectHeading = { marginTop: 0, marginBottom: "20px" };
const subjectRow = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f0f0f0" };
const subjectNameText = { fontSize: "15px" };
const innerMarksInput = { width: "70px", padding: "10px", textAlign: "center", borderRadius: "10px", border: "1px solid #ddd" };
const summaryRow = { marginTop: '15px', textAlign: 'right' };
const percBadge = { background: "#1a237e", color: "#fff", padding: "10px", borderRadius: "12px", display: "inline-block", marginTop: "10px" };
const submitBtn = { width: "100%", padding: "18px", background: "#1a237e", color: "#fff", border: "none", borderRadius: "16px", fontWeight: "bold", cursor: "pointer", marginBottom: '100px' };
const navContainer = { position: "fixed", bottom: "20px", left: 0, right: 0, display: "flex", justifyContent: "center" };
const navBar = { width: "85%", maxWidth: "400px", height: "65px", background: "#0d1127", borderRadius: "35px", display: "flex", justifyContent: "space-around", alignItems: "center" };
const navIcon = { color: "#fff", fontSize: "22px", opacity: 0.8 };