import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL || "https://student-management-system-4-hose.onrender.com";

const GenerateAdmitCard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const userRef = useRef(user);

  const [profile, setProfile] = useState(null);
  const [examStatus, setExamStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const principalSign = localStorage.getItem("nitesh_sign_principal");

  const currentMonth = new Date().getMonth();
  const examType = (currentMonth >= 10 || currentMonth <= 2) ? "FINAL" : "PRE-FINAL";

  useEffect(() => {
    if (!userRef.current?.id) return;

    const loadData = async () => {
      try {
        const [profileRes, examRes] = await Promise.all([
          axios.get(`${API_URL}/api/students/profile?id=${userRef.current.id}`),
          axios.get(`${API_URL}/api/students/my-exam-details`, {
            params: { student_id: userRef.current.id, exam_type: examType }
          }).catch(() => ({ data: { success: false } }))
        ]);

        setProfile(profileRes.data.student);
        setExamStatus(examRes.data?.data?.status || "Not Applied");
        
        setTimeout(() => setLoading(false), 1500);
      } catch (err) {
        console.error("Initialization Error:", err);
        setLoading(false);
      }
    };
    loadData();
  }, [examType]);

  if (loading) return (
    <div style={styles.loaderWrapper}>
      <div className="spinner"></div>
      <p style={styles.loaderText}>Verifying Examination Records...</p>
      <style>{`.spinner { width: 40px; height: 40px; border: 3px solid #f3f3f3; border-top: 3px solid #1a237e; border-radius: 50%; animation: spin 1s linear infinite; } @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // FIXED REDIRECT LOGIC
  if (examStatus !== "Submitted") {
    return (
      <div style={styles.restrictionContainer}>
        <div style={styles.restrictionCard}>
          <div style={{fontSize: "40px", marginBottom: "10px"}}>⚠️</div>
          <h2 style={{ color: "#d32f2f", margin: "0 0 10px 0" }}>Form Submission Required</h2>
          <p style={{ color: "#555", lineHeight: "1.5" }}>
            Your <strong>{examType} Admit Card</strong> is currently locked. 
            Official regulations require a submitted Examination Form before generating an Admit Card.
          </p>
          {/* Path corrected to match your App.js routing */}
          <button onClick={() => navigate("/student/exam-form")} style={styles.actionBtn}>
            Navigate to Exam Form
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.pageWrapper}>
      <div className="card-frame" style={styles.cardFrame}>
        <div style={styles.watermark}>SMARTS CLASSES</div>
        <div style={styles.header}>
          <h2 style={styles.title}>SMARTS STUDENTS CLASSES</h2>
          <p style={styles.subtitle}>{examType} ADMIT CARD - 2026</p>
        </div>
        
        <div style={styles.content}>
          <div style={styles.details}>
            <div style={styles.row}><span style={styles.label}>STUDENT NAME:</span><span style={styles.value}>{profile?.name?.toUpperCase()}</span></div>
            <div style={styles.row}><span style={styles.label}>ROLL NO:</span><span style={styles.value}>{profile?.code}</span></div>
            <div style={styles.row}><span style={styles.label}>CLASS:</span><span style={styles.value}>{profile?.class}</span></div>
            <div style={styles.infoBox}>
               Status: Verified & Permitted for {examType} 2026
            </div>
          </div>

          <div style={styles.photoSection}>
            <div style={styles.photoBox}>
              {profile?.profile_photo ? <img src={profile.profile_photo} alt="Student" style={styles.img} /> : "PHOTO"}
            </div>
            <div style={styles.signatureArea}>
              {principalSign && <img src={principalSign} alt="Sign" style={styles.signImg} />}
              <div style={styles.signLine}>CONTROLLER OF EXAMINATIONS</div>
            </div>
          </div>
        </div>
      </div>

      <div className="no-print" style={{ marginTop: "30px" }}>
        <button onClick={() => window.print()} style={styles.printBtn}>Print Document</button>
      </div>
    </div>
  );
};

const styles = {
  pageWrapper: { display: "flex", flexDirection: "column", alignItems: "center", padding: "40px", background: "#f0f2f5", minHeight: "100vh" },
  cardFrame: { width: "700px", background: "#fff", padding: "40px", border: "2px solid #333", position: "relative", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" },
  watermark: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%) rotate(-30deg)", fontSize: "60px", color: "rgba(0,0,0,0.03)", fontWeight: "bold", pointerEvents: "none" },
  header: { textAlign: "center", borderBottom: "2px solid #1a237e", paddingBottom: "10px", marginBottom: "25px" },
  title: { margin: 0, color: "#1a237e" },
  subtitle: { margin: "5px 0 0", color: "#d32f2f", fontWeight: "bold" },
  content: { display: "flex", justifyContent: "space-between", position: "relative", zIndex: 1 },
  details: { flex: 2 },
  row: { marginBottom: "15px", display: "flex", gap: "10px", alignItems: "flex-end" },
  label: { fontSize: "11px", fontWeight: "bold", color: "#666", width: "110px" },
  value: { borderBottom: "1px solid #ddd", flex: 1, fontWeight: "bold", paddingBottom: "2px" },
  infoBox: { marginTop: "20px", padding: "10px", background: "#e8f5e9", color: "#2e7d32", fontSize: "12px", borderRadius: "4px", fontWeight: "bold", textAlign: "center" },
  photoSection: { flex: 0.8, display: "flex", flexDirection: "column", alignItems: "center" },
  photoBox: { width: "120px", height: "140px", border: "1px solid #000", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9f9f9" },
  img: { width: "100%", height: "100%", objectFit: "cover" },
  signatureArea: { marginTop: "30px", textAlign: "center", width: "100%" },
  signImg: { maxHeight: "40px" },
  signLine: { borderTop: "1px solid #000", fontSize: "9px", paddingTop: "5px", fontWeight: "bold" },
  printBtn: { padding: "12px 30px", background: "#1a237e", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" },
  loaderWrapper: { height: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" },
  loaderText: { marginTop: "10px", fontWeight: "bold" },
  restrictionContainer: { height: "90vh", display: "flex", justifyContent: "center", alignItems: "center" },
  restrictionCard: { background: "#fff", padding: "40px", borderRadius: "12px", textAlign: "center", maxWidth: "400px", boxShadow: "0 10px 25px rgba(0,0,0,0.05)" },
  actionBtn: { marginTop: "20px", padding: "12px 24px", background: "#1a237e", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }
};

export default GenerateAdmitCard;