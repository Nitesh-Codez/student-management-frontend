import React, { useState, useEffect } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

const StudentDropApply = () => {
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    start_date: "",
    end_date: "",
    reason: "",
    application_type: "Temporary Drop"
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applyDate, setApplyDate] = useState("");

  const API_URL = process.env.REACT_APP_API_URL;
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/students/profile`, {
          params: { id: user?.id }
        });
        if (response.data.success) {
          setProfile(response.data.student);
        }
      } catch (error) {
        console.error("Profile Error:", error);
      }
    };
    if (user?.id) fetchProfile();
  }, [API_URL, user?.id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('en-GB')} (${now.toLocaleDateString('en-US', { weekday: 'long' })})`;
    setApplyDate(formattedDate);

    try {
      const response = await axios.post(`${API_URL}/api/drop/apply-drop`, {
        ...formData,
        studentId: profile?.id,
        studentName: profile?.name,
        email: profile?.email,
        applyDate: formattedDate 
      });
      if (response.data.success) {
        setIsSubmitted(true);
      }
    } catch (error) {
      alert("Error: Connection Failed");
    }
    setLoading(false);
  };

  const handlePrintPDF = () => {
    const input = document.getElementById("full-portal-container");
    html2canvas(input, { scale: 3, useCORS: true, backgroundColor: "#ffffff" }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Application_${profile?.name || 'Student'}.pdf`);
    });
  };

  return (
    <div style={styles.pageWrapper}>
      <div id="full-portal-container" style={styles.mainCard}>
        
        {/* Modern Header */}
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.brand}>
              <h1 style={styles.mainTitle}>SMART STUDENT</h1>
              <p style={styles.subTitle}>Academic Management System</p>
            </div>
            <div style={styles.sessionPill}>
              {profile?.session || "Session 2024-25"}
            </div>
          </div>
        </header>

        <div style={styles.contentLayout}>
          {/* Profile Section (Vertical Edge-to-Edge) */}
          <aside style={styles.sidebar}>
            <div style={styles.profileHero}>
              <div style={styles.avatar}>
                {profile?.name ? profile.name.charAt(0) : "S"}
              </div>
              <h2 style={styles.userName}>{profile?.name || "Loading..."}</h2>
              <span style={styles.userId}>ID: {profile?.code || "ST-000"}</span>
            </div>

            <div style={styles.infoList}>
              <div style={styles.infoCard}>
                <label style={styles.infoLabel}>FATHER'S NAME</label>
                <div style={styles.infoValue}>{profile?.father_name || "Mr. Not Provided"}</div>
              </div>
              <div style={styles.infoCard}>
                <label style={styles.infoLabel}>MOTHER'S NAME</label>
                <div style={styles.infoValue}>{profile?.mother_name || "Mrs. Not Provided"}</div>
              </div>
              <div style={styles.infoCard}>
                <label style={styles.infoLabel}>CLASS & ROLL</label>
                <div style={styles.infoValue}>{profile?.class || "N/A"}</div>
              </div>
              <div style={styles.infoCard}>
                <label style={styles.infoLabel}>MOBILE NUMBER</label>
                <div style={styles.infoValue}>+91 {profile?.mobile || "0000000000"}</div>
              </div>
            </div>
          </aside>

          {/* Form Section */}
          <main style={styles.formContainer}>
            {!isSubmitted ? (
              <form onSubmit={handleSubmit} style={styles.form}>
                <div style={styles.sectionHeader}>
                  <h3 style={styles.formTitle}>Apply for Leave/Drop</h3>
                  <p style={styles.formDesc}>Please ensure all dates are correct before submitting.</p>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Application Type</label>
                  <select name="application_type" onChange={handleChange} style={styles.select}>
                    <option value="Temporary Drop">Temporary Drop</option>
                    <option value="Medical Leave">Medical Leave</option>
                    <option value="Permanent Withdrawal">Permanent Withdrawal</option>
                  </select>
                </div>

                {formData.application_type !== "Permanent Withdrawal" && (
                  <div style={styles.gridRow}>
                    <div style={styles.field}>
                      <label style={styles.label}>Start Date</label>
                      <input type="date" name="start_date" onChange={handleChange} required style={styles.input} />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Return Date</label>
                      <input type="date" name="end_date" onChange={handleChange} required style={styles.input} />
                    </div>
                  </div>
                )}

                <div style={styles.field}>
                  <label style={styles.label}>Reason for Application</label>
                  <textarea 
                    name="reason" 
                    rows="5" 
                    placeholder="Write detailed reason here..." 
                    onChange={handleChange} 
                    required 
                    style={styles.textarea}
                  ></textarea>
                </div>

                <button type="submit" disabled={loading} style={styles.primaryBtn}>
                  {loading ? "PROCESSING..." : "SUBMIT APPLICATION"}
                </button>
              </form>
            ) : (
              <div style={styles.successBox}>
                <div style={styles.checkCircle}>✓</div>
                <h2 style={styles.successTitle}>Application Submitted!</h2>
                <div style={styles.receipt}>
                  <div style={styles.rRow}><span>Type:</span><strong>{formData.application_type}</strong></div>
                  <div style={styles.rRow}><span>Submitted On:</span><strong>{applyDate}</strong></div>
                  <div style={styles.rRow}><span>Status:</span><strong style={{color:'#f39c12'}}>Awaiting Approval</strong></div>
                </div>
                <div style={styles.actionRow}>
                  <button onClick={handlePrintPDF} style={styles.downloadBtn}>Download PDF Receipt</button>
                  <button onClick={() => setIsSubmitted(false)} style={styles.backBtn}>Back</button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

const styles = {
  pageWrapper: { 
    background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)", 
    minHeight: "100vh", 
    padding: "clamp(10px, 3vw, 40px)",
    fontFamily: "'Segoe UI', Roboto, sans-serif"
  },
  mainCard: { 
    background: "#fff", 
    maxWidth: "1000px", 
    margin: "0 auto", 
    borderRadius: "20px", 
    boxShadow: "0 20px 40px rgba(0,0,0,0.15)", 
    overflow: "hidden" 
  },
  
  // Header
  header: { background: "#1a2a6c", color: "#fff", padding: "30px" },
  headerContent: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px" },
  mainTitle: { margin: 0, fontSize: "24px", fontWeight: "800", letterSpacing: "1.5px" },
  subTitle: { margin: 0, fontSize: "12px", opacity: 0.7, textTransform: "uppercase" },
  sessionPill: { background: "rgba(255,255,255,0.15)", padding: "8px 16px", borderRadius: "30px", fontSize: "12px", border: "1px solid rgba(255,255,255,0.3)" },

  contentLayout: { display: "flex", flexWrap: "wrap" },

  // Sidebar (Mobile Friendly Details)
  sidebar: { flex: "1 1 320px", background: "#fcfcfc", borderRight: "1px solid #eee", padding: "30px" },
  profileHero: { textAlign: "center", marginBottom: "30px" },
  avatar: { width: "80px", height: "80px", background: "linear-gradient(45deg, #1a2a6c, #b21f1f)", color: "#fff", borderRadius: "50%", margin: "0 auto 15px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", fontWeight: "bold", boxShadow: "0 10px 20px rgba(26,42,108,0.3)" },
  userName: { margin: "0", fontSize: "22px", color: "#1a2a6c" },
  userId: { fontSize: "12px", color: "#888", fontWeight: "bold" },

  infoList: { display: "flex", flexDirection: "column", gap: "12px" },
  infoCard: { 
    background: "#fff", 
    padding: "15px", 
    borderRadius: "12px", 
    border: "1px solid #efefef", 
    boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
    display: "flex",
    flexDirection: "column"
  },
  infoLabel: { fontSize: "10px", color: "#b21f1f", fontWeight: "800", marginBottom: "4px", letterSpacing: "0.5px" },
  infoValue: { fontSize: "15px", color: "#333", fontWeight: "600" },

  // Form
  formContainer: { flex: "2 1 400px", padding: "40px" },
  sectionHeader: { marginBottom: "30px" },
  formTitle: { fontSize: "24px", color: "#1a2a6c", margin: "0 0 8px 0" },
  formDesc: { color: "#777", fontSize: "14px" },

  field: { marginBottom: "20px" },
  gridRow: { display: "flex", gap: "20px", flexWrap: "wrap" },
  label: { display: "block", fontSize: "13px", fontWeight: "700", marginBottom: "8px", color: "#444" },
  input: { width: "100%", padding: "14px", border: "2px solid #eee", borderRadius: "10px", fontSize: "15px", outline: "none", transition: "all 0.3s", boxSizing: "border-box" },
  select: { width: "100%", padding: "14px", border: "2px solid #eee", borderRadius: "10px", appearance: "none", background: "#fff", cursor: "pointer" },
  textarea: { width: "100%", padding: "14px", border: "2px solid #eee", borderRadius: "10px", fontSize: "15px", resize: "none", boxSizing: "border-box" },

  primaryBtn: { 
    width: "100%", 
    padding: "16px", 
    background: "linear-gradient(to right, #1a2a6c, #b21f1f)", 
    color: "#fff", 
    border: "none", 
    borderRadius: "12px", 
    fontSize: "16px", 
    fontWeight: "bold", 
    cursor: "pointer", 
    boxShadow: "0 10px 20px rgba(178,31,31,0.2)",
    marginTop: "20px" 
  },

  // Success State
  successBox: { textAlign: "center", padding: "20px" },
  checkCircle: { width: "80px", height: "80px", background: "#27ae60", color: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px", margin: "0 auto 20px" },
  successTitle: { fontSize: "28px", color: "#27ae60" },
  receipt: { background: "#f8f9fa", padding: "20px", borderRadius: "15px", margin: "25px 0" },
  rRow: { display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #eee" },
  actionRow: { display: "flex", gap: "15px" },
  downloadBtn: { flex: 2, padding: "14px", background: "#2ecc71", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" },
  backBtn: { flex: 1, padding: "14px", background: "#ecf0f1", color: "#7f8c8d", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" }
};

export default StudentDropApply;