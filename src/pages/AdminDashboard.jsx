import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  FaUserGraduate, FaMoneyBillWave, FaClipboardCheck, FaUpload,
  FaBookOpen, FaFileUpload, FaBars, FaTimes, FaStar,
  FaChartPie, FaChevronRight, FaSignOutAlt, FaBell, FaSearch
} from "react-icons/fa";

import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

// ================== 1. FULL-SCREEN FEEDBACK ANALYTICS ==================
const AdminFeedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);

  useEffect(() => {
    axios.get("/api/feedback/admin/all")
      .then((res) => setFeedbacks(res.data.feedbacks || []))
      .catch((err) => console.error(err));
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={fStyles.container}>
      <div style={fStyles.gridHeader}>
        <div style={fStyles.heroStats}>
          <div style={fStyles.statCircle}>94% <small>CSAT</small></div>
          <div>
            <h2 style={{margin: 0, fontSize: '28px'}}>Faculty Intelligence</h2>
            <p style={{margin: 0, opacity: 0.7}}>Analyzing {feedbacks.length} student submissions</p>
          </div>
        </div>
      </div>

      <div style={fStyles.scrollBody}>
        <table style={fStyles.table}>
          <thead>
            <tr>
              <th style={fStyles.th}>Entity</th>
              <th style={fStyles.th}>Happiness Index</th>
              <th style={fStyles.th}>Performance Notes</th>
              <th style={fStyles.th}>Rating</th>
              <th style={fStyles.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {feedbacks.map((f) => {
              const score = Math.round((f.mcq_answers?.filter(a => a.answer >= 3).length / f.mcq_answers?.length) * 100) || 0;
              return (
                <tr key={f.id} style={fStyles.tr}>
                  <td style={fStyles.td}>
                    <div style={fStyles.userCell}>
                      <div style={fStyles.miniAvatar}>{f.name[0]}</div>
                      <div>
                        <div style={{fontWeight: '700'}}>{f.name}</div>
                        <div style={{fontSize: '11px', color: '#64748b'}}>Class {f.class}</div>
                      </div>
                    </div>
                  </td>
                  <td style={fStyles.td}>
                    <div style={fStyles.pBarTrack}><div style={fStyles.pBarFill(score)} /></div>
                    <span style={{fontSize: '10px'}}>{score}% Positive</span>
                  </td>
                  <td style={fStyles.td}>
                    <div style={fStyles.noteBox}>
                      <strong>Advise:</strong> {f.suggestion || "N/A"}
                    </div>
                  </td>
                  <td style={fStyles.td}><span style={fStyles.ratingBadge(f.rating)}>{f.rating} ★</span></td>
                  <td style={fStyles.td}><button style={fStyles.viewBtn}>Deep Audit</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

// ================== 2. BIG MANAGEMENT DASHBOARD (ZERO PADDING) ==================
const AdminDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const isHome = location.pathname === "/admin";

  const sidebarLinks = [
    { title: "Academic Grades", path: "add-marks", icon: <FaBookOpen /> },
    { title: "Exam Portal", path: "add-exam-marks", icon: <FaUserGraduate /> },
    { title: "Repository", path: "study-material", icon: <FaFileUpload /> },
    { title: "Reports", path: "reports", icon: <FaChartPie /> },
  ];

  const coreActions = [
    { title: "Student Management", path: "manage-students", icon: <FaUserGraduate />, color: "#4F46E5" },
    { title: "Revenue Center", path: "manage-fees", icon: <FaMoneyBillWave />, color: "#10B981" },
    { title: "Student Appreciations", path: "admin-feedback", icon: <FaStar />, color: "#F59E0B" },
    { title: "Work Submissions", path: "student-submission", icon: <FaUpload />, color: "#EC4899" },
  ];

  return (
    <div style={dStyles.viewPort}>
      {/* SIDEBAR OVERLAY DRAWER */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} style={dStyles.backdrop} />
            <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "just" }} style={dStyles.drawer}>
              <div style={dStyles.drawerTop}>
                <h3>Workspace</h3>
                <FaTimes onClick={() => setSidebarOpen(false)} style={{cursor:'pointer'}} />
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

      {/* HEADER (FLOATING) */}
      <header style={dStyles.header}>
        <div style={dStyles.hLeft}>
          <button onClick={() => setSidebarOpen(true)} style={dStyles.burger}><FaBars /></button>
          <div style={dStyles.searchBar}><FaSearch color="#94a3b8"/><input placeholder="Search records..." /></div>
        </div>
        <div style={dStyles.hRight}>
          <Link to="mark-attendance" style={dStyles.attendanceBtn}><FaClipboardCheck /> Daily Attendance</Link>
          <div style={dStyles.notif}><FaBell /></div>
          <div style={dStyles.profile}>NK</div>
        </div>
      </header>

      {/* MAIN FULL-SCREEN CONTENT */}
      <div style={dStyles.canvas}>
        {isHome ? (
          <div style={dStyles.homeGrid}>
            <section style={dStyles.heroBanner}>
              <h1>Command Center</h1>
              <p>Hello Nitesh, your management ecosystem is performing optimally.</p>
            </section>

            <div style={dStyles.actionGrid}>
              {coreActions.map((act, i) => (
                <Link to={act.path} key={i} style={{...dStyles.actionCard, background: act.color}}>
                  <div style={dStyles.cardIcon}>{act.icon}</div>
                  <div style={dStyles.cardInfo}>
                    <h3>{act.title}</h3>
                    <p>Execute operational tasks</p>
                  </div>
                  <FaChevronRight size={14} />
                </Link>
              ))}
            </div>

            <div style={dStyles.bottomWidgets}>
              <div style={dStyles.widget}>
                <h4>Average Attendance</h4>
                <h2>92.4%</h2>
              </div>
              <div style={dStyles.widget}>
                <h4>Pending Tasks</h4>
                <h2>08</h2>
              </div>
            </div>
          </div>
        ) : (
          <div style={dStyles.outletWrapper}>
             <Outlet />
          </div>
        )}
      </div>
    </div>
  );
};

// ================== ENTERPRISE CSS (ZERO PADDING) ==================
const dStyles = {
  viewPort: { height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', background: '#0f172a', color: '#f8fafc', overflow: 'hidden' },
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', zIndex: 99 },
  drawer: { position: 'fixed', left: 0, top: 0, bottom: 0, width: '320px', background: '#1e293b', zIndex: 100, padding: '40px', display: 'flex', flexDirection: 'column', borderRight: '1px solid #334155' },
  drawerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '50px' },
  drawerLinks: { display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 },
  dLink: { color: '#94a3b8', textDecoration: 'none', padding: '15px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px', transition: '0.2s' },
  logout: { background: '#ef4444', color: '#fff', border: 'none', padding: '15px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' },
  
  header: { height: '80px', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(15px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px', borderBottom: '1px solid #334155', position: 'sticky', top: 0, zIndex: 10 },
  hLeft: { display: 'flex', alignItems: 'center', gap: '30px' },
  burger: { background: '#334155', border: 'none', color: '#fff', padding: '12px', borderRadius: '10px', cursor: 'pointer' },
  searchBar: { background: '#1e293b', padding: '10px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', width: '300px' },
  
  hRight: { display: 'flex', alignItems: 'center', gap: '25px' },
  attendanceBtn: { background: '#6366f1', color: '#fff', textDecoration: 'none', padding: '12px 20px', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' },
  profile: { width: '45px', height: '45px', background: '#6366f1', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
  
  canvas: { flex: 1, overflowY: 'auto', padding: '0' }, // ZERO PADDING
  homeGrid: { padding: '50px', maxWidth: '1400px', margin: '0 auto' },
  heroBanner: { marginBottom: '50px' },
  actionGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '40px' },
  actionCard: { padding: '40px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '25px', textDecoration: 'none', color: '#fff', transition: '0.3s transform' },
  cardIcon: { fontSize: '30px', background: 'rgba(255,255,255,0.15)', padding: '20px', borderRadius: '20px' },
  cardInfo: { flex: 1 },
  bottomWidgets: { display: 'flex', gap: '20px' },
  widget: { flex: 1, background: '#1e293b', padding: '30px', borderRadius: '24px', border: '1px solid #334155' },
  outletWrapper: { height: '100%', width: '100%', background: '#f8fafc', color: '#1e293b' }
};

const fStyles = {
  container: { height: '100%', display: 'flex', flexDirection: 'column', background: '#fff' },
  gridHeader: { background: '#f1f5f9', padding: '40px', borderBottom: '1px solid #e2e8f0' },
  heroStats: { display: 'flex', alignItems: 'center', gap: '30px' },
  statCircle: { width: '80px', height: '80px', border: '5px solid #6366f1', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '20px' },
  scrollBody: { flex: 1, overflowY: 'auto', padding: '20px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '20px', background: '#f8fafc', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' },
  td: { padding: '20px', borderBottom: '1px solid #f1f5f9' },
  userCell: { display: 'flex', alignItems: 'center', gap: '15px' },
  miniAvatar: { width: '35px', height: '35px', background: '#e0e7ff', color: '#6366f1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
  pBarTrack: { width: '100px', height: '6px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' },
  pBarFill: (p) => ({ width: `${p}%`, height: '100%', background: '#10b981' }),
  noteBox: { background: '#f8fafc', padding: '10px', borderRadius: '8px', fontSize: '12px', border: '1px solid #e2e8f0' },
  ratingBadge: (r) => ({ padding: '5px 15px', borderRadius: '20px', background: r >= 4 ? '#dcfce7' : '#fee2e2', color: r >= 4 ? '#166534' : '#991b1b', fontWeight: 'bold' }),
  viewBtn: { padding: '8px 15px', border: '1px solid #6366f1', color: '#6366f1', background: 'none', borderRadius: '8px', cursor: 'pointer' }
};

export default AdminDashboard;
export { AdminFeedback };