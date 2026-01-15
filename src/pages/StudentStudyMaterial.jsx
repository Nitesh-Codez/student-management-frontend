import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaFilePdf, FaDownload, FaTimes, 
  FaSearch, FaArrowRight, FaShapes 
} from "react-icons/fa";


const API_URL = "https://student-management-system-4-hose.onrender.com";

const subjectThemes = {
  Math: { grad: "linear-gradient(135deg, #FF6B6B 0%, #EE5253 100%)", light: "#FFF0F0" },
  Science: { grad: "linear-gradient(135deg, #1DD1A1 0%, #10AC84 100%)", light: "#EBFAF7" },
  English: { grad: "linear-gradient(135deg, #54A0FF 0%, #2E86DE 100%)", light: "#F0F7FF" },
  Hindi: { grad: "linear-gradient(135deg, #FECA57 0%, #FF9F43 100%)", light: "#FFF9F0" },
  Physics: { grad: "linear-gradient(135deg, #5F27CD 0%, #341F97 100%)", light: "#F5F2FF" },
  Default: { grad: "linear-gradient(135deg, #8395A7 0%, #576574 100%)", light: "#F8F9FA" }
};

const StudentStudyMaterial = () => {
  const studentClass = localStorage.getItem("studentClass")?.replace("class-", "") || "10";
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewFile, setViewFile] = useState(null);

  useEffect(() => {
    setLoading(true);
    axios.get(`${API_URL}/api/study-material/${studentClass}`)
      .then(res => res.data.success && setMaterials(res.data.materials))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [studentClass]);

  const filteredMaterials = materials.filter(m => 
    m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const grouped = filteredMaterials.reduce((acc, item) => {
    acc[item.subject] = acc[item.subject] || [];
    acc[item.subject].push(item);
    return acc;
  }, {});

  return (
    <div style={styles.pageContainer}>
      {/* --- PREMIUM PDF VIEWER --- */}
      <AnimatePresence>
        {viewFile && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={styles.viewerOverlay}>
            <div style={styles.viewerNav}>
              <span style={{fontWeight: 700}}>Reading Mode</span>
              <button style={styles.closeCircle} onClick={() => setViewFile(null)}><FaTimes /></button>
            </div>
            <iframe src={viewFile} title="Reader" style={styles.iframeStyle} />
          </motion.div>
        )}
      </AnimatePresence>

      <div style={styles.contentWrapper}>
        {/* --- HERO SECTION --- */}
        <header style={styles.hero}>
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={styles.heroIcon}>
            <FaShapes />
          </motion.div>
          <h1 style={styles.mainTitle}>Study Material</h1>
          <p style={styles.subtitle}>Class {studentClass} • Premium Learning Resources</p>

          {/* Search Bar */}
          <div style={styles.searchContainer}>
            <FaSearch style={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Search chapters, subjects or topics..." 
              style={styles.searchInput}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </header>

        {/* --- MATERIALS LIST --- */}
        {loading ? (
          <div style={styles.loader}>Optimizing Library...</div>
        ) : (
          Object.keys(grouped).map((subject, idx) => (
            <motion.section 
              key={subject}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              style={styles.subjectSection}
            >
              <div style={styles.subjectHeader}>
                <div style={{...styles.colorBar, background: subjectThemes[subject]?.grad || subjectThemes.Default.grad}} />
                <h2 style={styles.subjectName}>{subject}</h2>
                <span style={styles.countBadge}>{grouped[subject].length} Files</span>
              </div>

              <div style={styles.grid}>
                {grouped[subject].map((item, i) => (
                  <motion.div 
                    key={item.id}
                    whileHover={{ scale: 1.02, y: -5 }}
                    style={{...styles.materialCard, background: subjectThemes[subject]?.light || subjectThemes.Default.light}}
                  >
                    <div style={{...styles.fileIconBox, color: "#FFF", background: subjectThemes[subject]?.grad || subjectThemes.Default.grad}}>
                      <FaFilePdf />
                    </div>
                    <div style={styles.cardContent}>
                      <h4 style={styles.fileTitle}>{item.title}</h4>
                      <div style={styles.cardActions}>
                        <button onClick={() => setViewFile(item.file_path)} style={styles.actionLink}>
                          View Now <FaArrowRight fontSize={12} />
                        </button>
                        <a href={item.file_path} download style={styles.downloadCircle}>
                          <FaDownload />
                        </a>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          ))
        )}
      </div>
    </div>
  );
};

const styles = {
  pageContainer: { minHeight: "100vh", background: "#F4F7FE", paddingBottom: "100px" },
  contentWrapper: { maxWidth: "1100px", margin: "0 auto", padding: "0 25px" },
  hero: { textAlign: "center", padding: "60px 0 40px", display: "flex", flexDirection: "column", alignItems: "center" },
  heroIcon: { fontSize: "40px", color: "#6366F1", marginBottom: "15px" },
  mainTitle: { fontSize: "42px", fontWeight: "900", color: "#1E293B", margin: 0, letterSpacing: "-1px" },
  subtitle: { color: "#64748B", fontSize: "18px", marginTop: "8px" },
  
  searchContainer: { 
    position: "relative", width: "100%", maxWidth: "550px", marginTop: "35px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.05)"
  },
  searchIcon: { position: "absolute", left: "20px", top: "50%", transform: "translateY(-50%)", color: "#94A3B8" },
  searchInput: { 
    width: "100%", padding: "18px 20px 18px 55px", borderRadius: "20px", border: "none", 
    fontSize: "16px", outline: "none", color: "#1E293B", fontWeight: "500"
  },

  subjectSection: { marginTop: "50px" },
  subjectHeader: { display: "flex", alignItems: "center", gap: "15px", marginBottom: "25px" },
  colorBar: { width: "6px", height: "30px", borderRadius: "10px" },
  subjectName: { fontSize: "24px", fontWeight: "800", color: "#1E293B", margin: 0 },
  countBadge: { background: "#FFF", padding: "5px 12px", borderRadius: "10px", fontSize: "12px", fontWeight: "700", color: "#64748B", border: "1px solid #E2E8F0" },

  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" },
  materialCard: { 
    padding: "20px", borderRadius: "24px", display: "flex", alignItems: "flex-start", gap: "15px",
    border: "1px solid rgba(0,0,0,0.03)", transition: "0.3s"
  },
  fileIconBox: { 
    minWidth: "50px", height: "50px", borderRadius: "16px", display: "flex", 
    alignItems: "center", justifyContent: "center", fontSize: "20px" 
  },
  cardContent: { flex: 1 },
  fileTitle: { fontSize: "16px", fontWeight: "700", color: "#1E293B", margin: "0 0 12px 0", lineHeight: "1.4" },
  cardActions: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  actionLink: { 
    background: "none", border: "none", color: "#6366F1", fontWeight: "700", 
    fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", padding: 0 
  },
  downloadCircle: { 
    width: "32px", height: "32px", borderRadius: "50%", background: "#FFF", 
    display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B", 
    fontSize: "12px", boxShadow: "0 4px 10px rgba(0,0,0,0.05)", textDecoration: "none" 
  },

  viewerOverlay: { position: "fixed", inset: 0, background: "#FFF", zIndex: 9999, display: "flex", flexDirection: "column" },
  viewerNav: { padding: "15px 25px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #EEE" },
  closeCircle: { width: "40px", height: "40px", borderRadius: "50%", border: "none", background: "#F1F5F9", cursor: "pointer" },
  iframeStyle: { width: "100%", flex: 1, border: "none" },
  loader: { textAlign: "center", padding: "100px", fontSize: "18px", color: "#6366F1", fontWeight: "700" }
};

export default StudentStudyMaterial;