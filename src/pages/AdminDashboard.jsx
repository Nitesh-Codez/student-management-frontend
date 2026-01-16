import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  FaUserGraduate, FaMoneyBillWave, FaClipboardCheck, FaUpload,
  FaBookOpen, FaFileUpload, FaBars, FaTimes, FaStar,
  FaChartPie, FaChevronRight, FaSignOutAlt, FaBell, FaSearch,
  FaMoon, FaSun, FaUserCog
} from "react-icons/fa";

import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

// ================== 1. FEEDBACK COMPONENT ==================
const AdminFeedback = ({ darkMode }) => {
  const [feedbacks, setFeedbacks] = useState([]);

  useEffect(() => {
    axios.get("/api/feedback/admin/all")
      .then((res) => setFeedbacks(res.data.feedbacks || []))
      .catch((err) => console.error(err));
  }, []);

  const theme = darkMode ? fStyles.dark : fStyles.light;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{...fStyles.container, ...theme.bg}}>
      <div style={{...fStyles.gridHeader, ...theme.header}}>
        <div style={fStyles.heroStats}>
          <div style={fStyles.statCircle}>94% <small style={{fontSize:'10px'}}>CSAT</small></div>
          <div>
            <h2 style={{margin: 0, fontSize: '24px', color: darkMode ? '#fff' : '#1e293b'}}>Faculty Intelligence</h2>
            <p style={{margin: 0, opacity: 0.7, color: darkMode ? '#94a3b8' : '#64748b'}}>Insights from {feedbacks.length} student submissions</p>
          </div>
        </div>
      </div>

      <div style={fStyles.scrollBody}>
        <table style={fStyles.table}>
          <thead>
            <tr>
              <th style={{...fStyles.th, ...theme.th}}>Entity</th>
              <th style={{...fStyles.th, ...theme.th}}>Happiness Index</th>
              <th style={{...fStyles.th, ...theme.th}}>Notes</th>
              <th style={{...fStyles.th, ...theme.th}}>Rating</th>
              <th style={{...fStyles.th, ...theme.th}}>Action</th>
            </tr>
          </thead>
          <tbody>
            {feedbacks.map((f) => {
              const score = Math.round((f.mcq_answers?.filter(a => a.answer >= 3).length / f.mcq_answers?.length) * 100) || 0;
              return (
                <tr key={f.id} style={{borderBottom: `1px solid ${darkMode ? '#334155' : '#f1f5f9'}`}}>
                  <td style={fStyles.td}>
                    <div style={fStyles.userCell}>
                      <div style={fStyles.miniAvatar}>{f.name ? f.name[0] : "S"}</div>
                      <div>
                        <div style={{fontWeight: '700', color: darkMode ? '#e2e8f0' : '#334155'}}>{f.name}</div>
                        <div style={{fontSize: '11px', color: '#94a3b8'}}>Class {f.class}</div>
                      </div>
                    </div>
                  </td>
                  <td style={fStyles.td}>
                    <div style={fStyles.pBarTrack}><div style={fStyles.pBarFill(score)} /></div>
                    <span style={{fontSize: '11px', color: '#10b981', fontWeight: 'bold'}}>{score}% Positive</span>
                  </td>
                  <td style={fStyles.td}>
                    <div style={{...fStyles.noteBox, background: darkMode ? '#0f172a' : '#f8fafc', borderColor: darkMode ? '#334155' : '#e2e8f0', color: darkMode ? '#94a3b8' : '#475569'}}>{f.suggestion || "N/A"}</div>
                  </td>
                  <td style={fStyles.td}><span style={fStyles.ratingBadge(f.rating)}>{f.rating} ★</span></td>
                  <td style={fStyles.td}><button style={fStyles.viewBtn}>Audit</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

// ================== 2. MAIN DASHBOARD ==================
const AdminDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const isHome = location.pathname === "/admin";

  // Mock User Data with Avatar
  const user = { 
    name: "Nitesh Kumar", 
    role: "System Administrator",
    avatar: "https://ui-avatars.com/api/?name=Nitesh+Kumar&background=6366f1&color=fff" // Replace with real URL
  };

  const sidebarLinks = [
    { title: "Academic Grades", path: "add-marks", icon: <FaBookOpen /> },
    { title: "Exam Portal", path: "add-exam-marks", icon: <FaUserGraduate /> },
    { title: "Repository", path: "study-material", icon: <FaFileUpload /> },
    { title: "Reports", path: "reports", icon: <FaChartPie /> },
  ];

  const coreActions = [
    { title: "Students", sub: "Profiles & Records", path: "manage-students", icon: <FaUserGraduate />, color: "#4F46E5" },
    { title: "Revenue", sub: "Fee Management", path: "manage-fees", icon: <FaMoneyBillWave />, color: "#10B981" },
    { title: "Appraisal", sub: "Faculty Feedback", path: "admin-feedback", icon: <FaStar />, color: "#F59E0B" },
    { title: "Submissions", sub: "Student Workloads", path: "student-submission", icon: <FaUpload />, color: "#EC4899" },
  ];

  return (
    <div style={{...dStyles.viewPort, background: darkMode ? '#0f172a' : '#f1f5f9'}}>
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} style={dStyles.backdrop} />
            <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} style={dStyles.drawer}>
              <div style={dStyles.drawerTop}>
                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    <div style={{width:'30px', height:'30px', background:'#6366f1', borderRadius:'6px'}}></div>
                    <h3 style={{margin:0, letterSpacing:'1px'}}>CORE ENGINE</h3>
                </div>
                <FaTimes onClick={() => setSidebarOpen(false)} style={{cursor:'pointer', opacity:0.6}} />
              </div>
              <div style={dStyles.drawerLinks}>
                {sidebarLinks.map(l => (
                  <Link key={l.path} to={l.path} onClick={() => setSidebarOpen(false)} style={dStyles.dLink}>
                    {l.icon} {l.title}
                  </Link>
                ))}
              </div>
              <button style={dStyles.logout} onClick={() => navigate("/")}><FaSignOutAlt /> Terminate Session</button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* --- PREMIUM HEADER --- */}
      <header style={{...dStyles.header, background: darkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)', borderColor: darkMode ? '#334155' : '#e2e8f0'}}>
        <div style={dStyles.hLeft}>
          <button onClick={() => setSidebarOpen(true)} style={dStyles.burger}><FaBars /></button>
          <div style={{...dStyles.searchBar, background: darkMode ? '#0f172a' : '#f1f5f9'}}>
            <FaSearch color="#64748b" size={14} />
            <input style={{...dStyles.searchInput, color: darkMode ? '#fff' : '#1e293b'}} placeholder="Global Search..." />
          </div>
        </div>

        <div style={dStyles.hRight}>
          {/* THEME SWITCHER */}
          <button onClick={() => setDarkMode(!darkMode)} style={{...dStyles.themeToggle, background: darkMode ? '#334155' : '#e2e8f0'}}>
             {darkMode ? <FaSun color="#fbbf24" /> : <FaMoon color="#6366f1" />}
          </button>

          <Link to="mark-attendance" style={dStyles.attendanceBtn}><FaClipboardCheck /> Attendance</Link>
          
          <div style={dStyles.profileGroup}>
            <div style={dStyles.profileInfo}>
                <span style={{...dStyles.profileName, color: darkMode ? '#fff' : '#1e293b'}}>{user.name}</span>
                <span style={dStyles.profileRole}>{user.role}</span>
            </div>
            <div style={dStyles.avatarWrapper}>
                <img src={user.avatar} alt="Profile" style={dStyles.profileImg} />
                <div style={dStyles.onlineStatus}></div>
            </div>
          </div>
        </div>
      </header>

      <div style={dStyles.canvas}>
        {isHome ? (
          <div style={dStyles.homeGrid}>
            <section style={dStyles.heroBanner}>
              <h1 style={{color: darkMode ? '#fff' : '#1e293b', fontSize: '32px', marginBottom:'5px'}}>Control Center</h1>
              <p style={{color: '#94a3b8', fontSize:'15px'}}>System Overview & Strategic Operations</p>
            </section>

            <div style={dStyles.actionGrid}>
              {coreActions.map((act, i) => (
                <Link to={act.path} key={i} style={{...dStyles.actionCard, background: darkMode ? `linear-gradient(135deg, ${act.color}, #1e293b)` : act.color}}>
                  <div style={dStyles.cardIcon}>{act.icon}</div>
                  <div style={dStyles.cardInfo}>
                    <h3 style={{margin:0, fontSize:'18px'}}>{act.title}</h3>
                    <p style={{margin:0, fontSize:'12px', opacity:0.8}}>{act.sub}</p>
                  </div>
                  <FaChevronRight size={14} />
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div style={{...dStyles.outletWrapper, background: darkMode ? '#0f172a' : '#fff'}}>
             <AdminFeedback darkMode={darkMode} />
             {/* If you use actual Outlet, pass props via context or just use darkMode state */}
             <Outlet context={[darkMode]} />
          </div>
        )}
      </div>
    </div>
  );
};

// ================== CSS OBJECTS ==================
const dStyles = {
  viewPort: { height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: '"Inter", sans-serif', transition: 'all 0.3s ease' },
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 99 },
  drawer: { position: 'fixed', left: 0, top: 0, bottom: 0, width: '280px', background: '#1e293b', zIndex: 100, padding: '30px', display: 'flex', flexDirection: 'column', borderRight: '1px solid #334155', boxShadow: '20px 0 50px rgba(0,0,0,0.3)' },
  drawerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', color: '#fff' },
  drawerLinks: { display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 },
  dLink: { color: '#94a3b8', textDecoration: 'none', padding: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px', transition: '0.2s' },
  logout: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid #ef4444', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' },
  
  header: { height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px', borderBottom: '1px solid', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(10px)' },
  hLeft: { display: 'flex', alignItems: 'center', gap: '25px' },
  burger: { background: '#6366f1', border: 'none', color: '#fff', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' },
  searchBar: { padding: '10px 15px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', width: '320px', border: '1px solid rgba(100, 116, 139, 0.2)' },
  searchInput: { background: 'none', border: 'none', outline: 'none', fontSize: '14px', width: '100%' },
  
  hRight: { display: 'flex', alignItems: 'center', gap: '20px' },
  themeToggle: { border: 'none', width: '40px', height: '40px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.3s' },
  attendanceBtn: { background: '#6366f1', color: '#fff', textDecoration: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)' },
  
  profileGroup: { display: 'flex', alignItems: 'center', gap: '15px', paddingLeft: '20px', borderLeft: '1px solid rgba(100, 116, 139, 0.2)' },
  profileInfo: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' },
  profileName: { fontSize: '15px', fontWeight: '700' },
  profileRole: { fontSize: '11px', color: '#6366f1', fontWeight: '600', textTransform: 'uppercase' },
  avatarWrapper: { position: 'relative' },
  profileImg: { width: '45px', height: '45px', borderRadius: '14px', objectFit: 'cover', border: '2px solid #6366f1' },
  onlineStatus: { position: 'absolute', bottom: -2, right: -2, width: '12px', height: '12px', background: '#10b981', borderRadius: '50%', border: '2px solid #fff' },
  
  canvas: { flex: 1, overflowY: 'auto' },
  homeGrid: { padding: '50px', maxWidth: '1300px', margin: '0 auto' },
  heroBanner: { marginBottom: '40px' },
  actionGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px' },
  actionCard: { padding: '35px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '20px', textDecoration: 'none', color: '#fff', transition: 'transform 0.3s ease', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' },
  cardIcon: { fontSize: '28px', background: 'rgba(255,255,255,0.2)', padding: '18px', borderRadius: '18px' },
  cardInfo: { flex: 1 },
  outletWrapper: { height: '100%', width: '100%', transition: '0.3s' }
};

const fStyles = {
  container: { height: '100%', display: 'flex', flexDirection: 'column' },
  light: { bg: {background: '#fff'}, header: {background: '#f8fafc'}, th: {background: '#f1f5f9', color: '#64748b'} },
  dark: { bg: {background: '#0f172a'}, header: {background: '#1e293b'}, th: {background: '#1e293b', color: '#94a3b8'} },
  gridHeader: { padding: '40px', borderBottom: '1px solid rgba(100, 116, 139, 0.1)' },
  heroStats: { display: 'flex', alignItems: 'center', gap: '25px' },
  statCircle: { width: '75px', height: '75px', border: '5px solid #6366f1', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#6366f1', fontSize: '20px' },
  scrollBody: { flex: 1, overflowY: 'auto', padding: '30px 40px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '18px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' },
  td: { padding: '18px' },
  userCell: { display: 'flex', alignItems: 'center', gap: '12px' },
  miniAvatar: { width: '35px', height: '35px', background: '#6366f1', color: '#fff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
  pBarTrack: { width: '100px', height: '6px', background: 'rgba(100, 116, 139, 0.1)', borderRadius: '10px', overflow: 'hidden', marginBottom: '5px' },
  pBarFill: (p) => ({ width: `${p}%`, height: '100%', background: '#10b981' }),
  noteBox: { padding: '10px 15px', borderRadius: '10px', fontSize: '13px', border: '1px solid', lineHeight: '1.4' },
  ratingBadge: (r) => ({ padding: '5px 12px', borderRadius: '8px', background: r >= 4 ? '#dcfce7' : '#fee2e2', color: r >= 4 ? '#166534' : '#991b1b', fontWeight: 'bold', fontSize: '12px' }),
  viewBtn: { padding: '8px 16px', border: '1px solid #6366f1', color: '#6366f1', background: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }
};

export default AdminDashboard;
export { AdminFeedback };