import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaGraduationCap, FaPrint, FaCheckCircle, FaLock, FaSync, FaUserAlt } from "react-icons/fa";

const API_URL = process.env.REACT_APP_API_URL || "https://student-management-system-4-hose.onrender.com";

const ExamForm = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const currentYear = new Date().getFullYear();
  const academicSession = `${currentYear}-${currentYear + 1}`;

  // States
  const [examType, setExamType] = useState("PRE-FINAL");
  const [profile, setProfile] = useState(null);
  const [examData, setExamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState({ detailsCorrect: false, subjectsVerified: false, noDues: false });

  // Load Data
  const loadFullData = async () => {
    if (!user.id) return;
    setLoading(true);
    
    // Logic: Agar Reappear hai toh subject list PRE-FINAL/FINAL wali hi uthayega
    let subjectSourceType = examType;
    if (examType === "REAPPEAR-1") subjectSourceType = "PRE-FINAL";
    if (examType === "REAPPEAR-2") subjectSourceType = "FINAL";

    try {
      const [profileRes, examRes] = await Promise.all([
        axios.get(`${API_URL}/api/students/profile?id=${user.id}`),
        axios.get(`${API_URL}/api/students/my-exam-details`, {
          params: { student_id: user.id, exam_type: examType } 
        }).catch(() => ({ data: { success: false } }))
      ]);

      setProfile(profileRes.data.student);
      
      // SUBJECT FETCHING LOGIC: 
      // Agar current status Submitted hai toh wahi data dikhao, 
      // warna mapping ke hisaab se default subjects fetch karo.
      if (examRes.data?.data?.status === 'Submitted') {
        setExamData(examRes.data.data);
      } else {
        const subRes = await axios.get(`${API_URL}/api/students/my-exam-details`, {
          params: { student_id: user.id, exam_type: subjectSourceType }
        });
        setExamData({
          ...examRes.data?.data,
          subjects: subRes.data?.data?.subjects || [],
          status: examRes.data?.data?.status || 'Not Applied'
        });
      }
    } catch (err) {
      console.error("Initialization Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    loadFullData();
    setAgreed({ detailsCorrect: false, subjectsVerified: false, noDues: false });
  }, [examType]);

  const handleFinalSubmit = async () => {
    if (!agreed.detailsCorrect || !agreed.subjectsVerified || !agreed.noDues) 
      return alert("Please verify all declarations.");
    
    if (!window.confirm(`Finalize ${examType} registration? Other exam types will remain open.`)) return;
    
    try {
      await axios.post(`${API_URL}/api/students/finalize-exam`, {
        student_id: user.id, 
        exam_type: examType,
        subjects: examData?.subjects
      });
      alert(`✅ ${examType} Registration Successful!`);
      loadFullData();
    } catch (err) { alert("❌ Submission failed."); }
  };

  if (loading) return <div style={styles.loader}>Initializing Secure Portal...</div>;

  const isSubmitted = examData?.status === 'Submitted';

  return (
    <div style={styles.pageBackground}>
      {/* Horizontal & Vertical Scroll Wrapper */}
      <div style={styles.scrollContainer}>
        <div className="print-area" style={styles.a4Sheet}>
          
          <header style={styles.docHeader}>
            <div style={styles.headerTop}>
              <div style={styles.logoBox}><FaGraduationCap size={55} color="#1a237e" /></div>
              <div style={{ textAlign: 'right' }}>
                <h1 style={styles.instName}>SMART STUDENTS CLASSES</h1>
                <p style={styles.instSub}>GWALIOR'S PREMIER EDUCATIONAL INSTITUTE</p>
                <p style={styles.sessionText}>Academic Session: {academicSession} <FaSync size={10} /></p>
              </div>
            </div>
            <div style={styles.doubleDivider}></div>
          </header>

          {/* EXAM SELECTION - Ab sirf Submitted wala lock hoga */}
          <section style={styles.section}>
            <div style={styles.typeSelector}>
              <div style={{flex: 1}}>
                <label style={styles.boldLabel}>EXAMINATION TYPE:</label>
                <select 
                  value={examType} 
                  onChange={(e) => setExamType(e.target.value)} 
                  style={styles.docSelect}
                >
                  <option value="PRE-FINAL">PRE-FINAL EXAM {currentYear}</option>
                  <option value="FINAL">FINAL TERM EXAM {currentYear}</option>
                  <option value="REAPPEAR-1">RE-APPEARANCE FOR PRE-FINAL</option>
                  <option value="REAPPEAR-2">RE-APPEARANCE FOR FINAL TERM</option>
                </select>
              </div>
              {isSubmitted && <span style={styles.lockBadge}><FaLock /> {examType} LOCKED</span>}
            </div>
          </section>

          {/* STUDENT DETAILS + PHOTO BOX */}
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>I. CANDIDATE PARTICULARS</h3>
            <div style={styles.mainInfoWrapper}>
              <div style={styles.grid}>
                <InfoItem label="NAME OF STUDENT" value={profile?.name?.toUpperCase()} />
                <InfoItem label="ENROLLMENT / ROLL NO" value={profile?.code} />
                <InfoItem label="FATHER'S NAME" value={profile?.father_name?.toUpperCase()} />
                <InfoItem label="COURSE & YEAR" value={`${profile?.class || 'N/A'} (${academicSession})`} />
                <InfoItem label="MOBILE NUMBER" value={profile?.mobile} />
                <InfoItem label="GENDER" value={profile?.gender} />
              </div>
              
              {/* Photo Box Integration */}
              <div style={styles.photoContainer}>
                <div style={styles.photoBox}>
                  {profile?.profile_photo ? (
                    <img src={profile.profile_photo} alt="Student" style={styles.img} />
                  ) : (
                    <div style={styles.photoPlaceholder}><FaUserAlt size={40} color="#ccc" /><br/>PHOTO</div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* SUBJECT TABLE */}
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>II. COURSE MAPPING & SUBJECTS</h3>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>CODE</th>
                  <th style={{...styles.th, textAlign: 'left'}}>SUBJECT DESCRIPTION</th>
                  <th style={styles.th}>MAX MARKS</th>
                </tr>
              </thead>
              <tbody>
                {examData?.subjects?.length > 0 ? (
                  examData.subjects.map((s, i) => (
                    <tr key={i} style={styles.tr}>
                      <td style={styles.td}>10{i+1}</td>
                      <td style={{...styles.td, textAlign: 'left', fontWeight: 'bold'}}>{s.toUpperCase()}</td>
                      <td style={styles.td}>100</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="3" style={styles.noData}>Loading subjects for {examType}...</td></tr>
                )}
              </tbody>
            </table>
          </section>

          {/* ATTESTATION & FOOTER */}
          <section style={styles.footerSection}>
            <div style={styles.declarationZone}>
              {!isSubmitted ? (
                <div style={styles.verifyBox}>
                  <h4 style={{margin: '0 0 10px 0', fontSize: '14px', color: '#1a237e'}}>III. ATTESTATION & SUBMIT</h4>
                  <CheckItem checked={agreed.detailsCorrect} onChange={(v) => setAgreed({...agreed, detailsCorrect: v})} label="I verify that my particulars are correct." />
                  <CheckItem checked={agreed.subjectsVerified} onChange={(v) => setAgreed({...agreed, subjectsVerified: v})} label="I confirm my subjects for this cycle." />
                  <CheckItem checked={agreed.noDues} onChange={(v) => setAgreed({...agreed, noDues: v})} label="I have no outstanding dues." />
                  <button onClick={handleFinalSubmit} disabled={!agreed.detailsCorrect || !agreed.subjectsVerified || !agreed.noDues} style={styles.submitBtn}>
                    SUBMIT {examType} FORM
                  </button>
                </div>
              ) : (
                <div style={styles.successAttest}>
                  <FaCheckCircle color="#059669" size={24} />
                  <div style={{textAlign: 'left'}}>
                    <b style={{display: 'block'}}>Digitally Verified & Registered</b>
                    <small>Registration for {examType} is finalized.</small>
                  </div>
                </div>
              )}
            </div>

            <div style={styles.authSignatures}>
              <div style={styles.signBox}>
                <div style={styles.signImage}><span style={styles.cursive}>Nitesh Kushwah</span></div>
                <div style={styles.signLine}></div>
                <p style={styles.signName}>NITESH KUSHWAH</p>
                <p style={styles.signPost}>Exam Controller</p>
              </div>

              <div style={styles.sealBox}>
                <div style={styles.roundSeal}>
                  <svg viewBox="0 0 100 100">
                    <path id="circlePath" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" fill="transparent" />
                    <text style={styles.sealText}><textPath xlinkHref="#circlePath">SMART STUDENTS CLASSES • GWALIOR •</textPath></text>
                    <circle cx="50" cy="50" r="25" fill="none" stroke="#1a237e" strokeWidth="0.5" />
                    <text x="50" y="52" textAnchor="middle" style={styles.sealInner}>OFFICIAL</text>
                    <text x="50" y="60" textAnchor="middle" style={styles.sealInner}>SEAL</text>
                  </svg>
                </div>
              </div>

              <div style={styles.signBox}>
                <div style={styles.signImage}><span style={styles.cursive}>Nitesh Kushwah</span></div>
                <div style={styles.signLine}></div>
                <p style={styles.signName}>NITESH KUSHWAH</p>
                <p style={styles.signPost}>Principal</p>
              </div>
            </div>
          </section>

          <footer style={styles.docFooter}>
            <p>* This is a computer-generated document for {academicSession}. Discrepancies should be reported within 48 hours.</p>
          </footer>
        </div>
      </div>
      
      {isSubmitted && (
        <button onClick={() => window.print()} style={styles.floatingPrint}>
          <FaPrint /> Print {examType} Form
        </button>
      )}
    </div>
  );
};

const InfoItem = ({ label, value }) => (
  <div style={styles.infoField}>
    <label style={styles.fieldLabel}>{label}</label>
    <div style={styles.fieldValue}>{value || "---"}</div>
  </div>
);

const CheckItem = ({ checked, onChange, label }) => (
  <label style={styles.checkRow}>
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span>{label}</span>
  </label>
);

const styles = {
  pageBackground: { background: "#4a4a4a",width: "1050px", minHeight: "100vh", padding: "40px 15px", overflow: "hidden" },
  scrollContainer: { width: "100%", overflowX: "auto", overflowY: "auto", display: "flex", justifyContent: "flex-start", paddingBottom: "20px" },
  a4Sheet: { 
    background: "#fff", width: "950px", minHeight: "1150px", margin: "0 auto",
    padding: "60px", boxShadow: "0 0 40px rgba(0,0,0,0.5)", position: "relative", flexShrink: 0
  },
  docHeader: { marginBottom: "30px" },
  headerTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  instName: { margin: 0, color: "#1a237e", fontSize: "28px", fontWeight: "900" },
  instSub: { margin: 0, color: "#c0392b", fontSize: "12px", fontWeight: "bold", letterSpacing: "1px" },
  sessionText: { fontSize: "11px", color: "#64748b", margin: "5px 0" },
  doubleDivider: { height: "5px", borderTop: "2px solid #1a237e", borderBottom: "1.5px solid #1a237e", marginTop: "15px" },
  section: { marginBottom: "35px" },
  typeSelector: { display: "flex", alignItems: "center", gap: "20px", background: "#f8fafc", padding: "15px", borderRadius: "8px", border: "1px solid #e2e8f0" },
  docSelect: { padding: "8px 15px", fontSize: "15px", fontWeight: "bold", border: "2px solid #1a237e", borderRadius: "5px", color: "#1a237e", width: "300px" },
  lockBadge: { background: "#e11d48", color: "#fff", fontSize: "12px", padding: "6px 12px", borderRadius: "5px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "5px" },
  sectionTitle: { fontSize: "13px", fontWeight: "900", background: "#f1f5f9", padding: "10px 15px", borderLeft: "5px solid #1a237e", marginBottom: "20px" },
  mainInfoWrapper: { display: "flex", gap: "30px", justifyContent: "space-between" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 40px", flex: 1 },
  photoContainer: { width: "130px" },
  photoBox: { width: "130px", height: "150px", border: "2px solid #1a237e", background: "#f9f9f9", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  img: { width: "100%", height: "100%", objectFit: "cover" },
  photoPlaceholder: { textAlign: "center", fontSize: "10px", color: "#999" },
  infoField: { borderBottom: "1px solid #f1f5f9", paddingBottom: "5px" },
  fieldLabel: { fontSize: "9px", color: "#94a3b8", fontWeight: "bold", textTransform: "uppercase" },
  fieldValue: { fontSize: "15px", fontWeight: "700", color: "#1e293b", marginTop: "2px" },
  table: { width: "100%", borderCollapse: "collapse" },
  thRow: { background: "#1a237e", color: "#fff" },
  th: { padding: "12px", fontSize: "12px" },
  td: { padding: "15px", border: "1px solid #e2e8f0", fontSize: "14px", textAlign: "center" },
  footerSection: { marginTop: "50px" },
  authSignatures: { display: "flex", justifyContent: "space-between", marginTop: "60px", textAlign: "center" },
  signBox: { width: "180px" },
  signImage: { height: "50px", display: "flex", alignItems: "center", justifyContent: "center" },
  cursive: { fontFamily: "'Dancing Script', cursive", fontSize: "24px", color: "#1a237e" },
  signLine: { borderBottom: "1.5px solid #000", margin: "5px 0" },
  signName: { margin: 0, fontWeight: "bold", fontSize: "13px" },
  sealBox: { width: "100px" },
  roundSeal: { width: "90px", height: "90px", margin: "0 auto" },
  sealText: { fontSize: "9px", fontWeight: "bold", fill: "#1a237e" },
  sealInner: { fontSize: "9px", fill: "#1a237e", fontWeight: "bold" },
  verifyBox: { background: "#fff", border: "2px dashed #cbd5e1", padding: "25px", borderRadius: "10px" },
  checkRow: { display: "flex", gap: "10px", fontSize: "13px", marginBottom: "10px", cursor: "pointer", fontWeight: "600", alignItems: "center" },
  submitBtn: { width: "100%", padding: "15px", background: "#1a237e", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", marginTop: "10px" },
  successAttest: { display: "flex", alignItems: "center", gap: "15px", color: "#059669", background: "#f0fdf4", padding: "15px", borderRadius: "10px", border: "1px solid #bbf7d0" },
  docFooter: { borderTop: "1px solid #eee", marginTop: "40px", paddingTop: "15px", fontSize: "11px", color: "#94a3b8", textAlign: "center" },
  floatingPrint: { position: "fixed", bottom: "30px", right: "30px", padding: "15px 30px", background: "#059669", color: "#fff", borderRadius: "50px", border: "none", boxShadow: "0 5px 20px rgba(0,0,0,0.3)", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", gap: "10px", zIndex: 1000 },
  loader: { height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", color: "#fff", fontWeight: "bold", fontSize: "18px" }
};

export default ExamForm;