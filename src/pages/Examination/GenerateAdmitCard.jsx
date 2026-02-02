import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "https://student-management-system-4-hose.onrender.com";

const GenerateAdmitCard = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const userRef = useRef(user);

  const [profile, setProfile] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const principalSign = localStorage.getItem("nitesh_sign_principal");

  useEffect(() => {
    if (!userRef.current?.id) return;
    const loadData = async () => {
      try {
        const profileRes = await axios.get(`${API_URL}/api/students/profile?id=${userRef.current.id}`);
        const attRes = await axios.get(`${API_URL}/api/attendance/attendance-marks`, {
          params: { studentId: userRef.current.id, month: new Date().toISOString().slice(0, 7) },
        });
        setProfile(profileRes.data.student);
        setAttendance(attRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <div style={styles.loader}>Generating ..</div>;
  if (!profile) return <p>Data Error: Please log in again.</p>;

  const isPermitted = Number(attendance?.percentage) >= 75;

  return (
    <div style={styles.pageWrapper}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .card-frame { border: 2px solid #000 !important; box-shadow: none !important; width: 100% !important; margin: 0 !important; }
        }
        @media (max-width: 600px) {
          .card-frame { width: 98% !important; padding: 15px !important; }
          .main-content { flex-direction: column; }
          .right-section { width: 100% !important; margin-top: 20px; flex-direction: row !important; justify-content: space-around; }
        }
      `}</style>

      <div className="card-frame" style={styles.cardFrame}>
        {/* HEADER */}
        <h2 style={styles.headerTitle}>SMARTS STUDENTS CLASSES (ADMIT CARD)</h2>

        <div className="main-content" style={styles.mainContent}>
          {/* LEFT SECTION: DETAILS */}
          <div style={styles.leftSection}>
            <div style={styles.fieldRow}>
              <span style={styles.label}>STUDENT NAME:</span>
              <span style={styles.value}>{profile.name?.toUpperCase()}</span>
            </div>
            <div style={styles.fieldRow}>
              <span style={styles.label}>FATHERS NAME:</span>
              <span style={styles.value}>{profile.father_name?.toUpperCase() || "N/A"}</span>
            </div>
            <div style={styles.fieldRow}>
              <span style={styles.label}>MOTHER NAME:</span>
              <span style={styles.value}>{profile.mother_name?.toUpperCase() || "N/A"}</span>
            </div>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ ...styles.fieldRow, flex: 1 }}>
                <span style={styles.label}>CLASS:</span>
                <span style={styles.value}>{profile.class}</span>
              </div>
              <div style={{ ...styles.fieldRow, flex: 2 }}>
                <span style={styles.label}>CODE:</span>
                <span style={styles.value}>{profile.code}</span>
              </div>
            </div>

            {/* STATUS SECTION (As per Image) */}
            <div style={styles.statusSection}>
              <span style={styles.labelBold}>STATUS:</span>
              
              <div style={styles.statusOption}>
                <span>PERMITTED</span>
                <div style={{
                  ...styles.radioCircle,
                  backgroundColor: isPermitted ? "#000" : "transparent"
                }}></div>
              </div>

              <div style={styles.statusOption}>
                <span>NOT PERMITTED</span>
                <div style={{
                  ...styles.radioCircle,
                  backgroundColor: !isPermitted ? "#000" : "transparent"
                }}></div>
              </div>
            </div>
          </div>

          {/* RIGHT SECTION: PHOTO & SIGNATURE */}
          <div className="right-section" style={styles.rightSection}>
            <div style={styles.photoBox}>
              {profile.profile_photo ? (
                <img src={profile.profile_photo} alt="Student" style={styles.studentImg} />
              ) : (
                <div style={styles.photoPlaceholder}>PHOTO</div>
              )}
            </div>
            <div style={styles.signArea}>
              <div style={styles.signLine}>
                {principalSign && <img src={principalSign} alt="Sign" style={styles.signImg} />}
              </div>
              <span style={styles.signLabel}>SIGNATURE</span>
            </div>
          </div>
        </div>
      </div>

      <div className="no-print" style={styles.btnContainer}>
        <button onClick={() => window.print()} style={styles.printBtn}>Print</button>
      </div>
    </div>
  );
};

const styles = {
  pageWrapper: { minHeight: "100vh", background: "#f4f4f4", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0" },
  cardFrame: { width: "850px", background: "#fff", border: "3px solid #000", padding: "40px", boxSizing: "border-box", position: 'relative' },
  headerTitle: { textAlign: 'center', fontSize: '24px', fontWeight: '900', marginBottom: '40px', letterSpacing: '1px', borderBottom: '2px solid #eee', paddingBottom: '10px' },
  mainContent: { display: 'flex', justifyContent: 'space-between' },
  leftSection: { flex: 2 },
  fieldRow: { marginBottom: '25px', display: 'flex', alignItems: 'flex-end', gap: '10px' },
  label: { fontSize: '18px', fontWeight: '700', whiteSpace: 'nowrap' },
  labelBold: { fontSize: '20px', fontWeight: '900', marginRight: '20px' },
  value: { fontSize: '18px', borderBottom: '1px solid #000', flex: 1, paddingLeft: '10px', textTransform: 'uppercase', fontFamily: 'serif' },
  statusSection: { display: 'flex', alignItems: 'center', marginTop: '40px', gap: '30px' },
  statusOption: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px', fontWeight: '700' },
  radioCircle: { width: '35px', height: '35px', borderRadius: '50%', border: '3px solid #000' },
  
  rightSection: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between' },
  photoBox: { width: '160px', height: '180px', border: '2px solid #000', backgroundColor: '#89b4d8' }, // Blue color as per your image
  studentImg: { width: '100%', height: '100%', objectFit: 'cover' },
  photoPlaceholder: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
  
  signArea: { textAlign: 'center', width: '200px' },
  signLine: { height: '60px', borderBottom: '1px solid #000', marginBottom: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  signImg: { height: '100%' },
  signLabel: { fontSize: '18px', fontWeight: '700' },
  
  btnContainer: { marginTop: '30px' },
  printBtn: { padding: '15px 40px', background: '#000', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }
};

export default GenerateAdmitCard;