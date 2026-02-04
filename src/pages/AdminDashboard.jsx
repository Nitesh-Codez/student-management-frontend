import React, { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  FaUserGraduate, FaMoneyBillWave, FaClipboardCheck, FaUpload,
  FaBookOpen, FaFileUpload, FaStar, FaComments, FaChartBar,
  FaArrowRight, FaThLarge, FaSearch, FaBell, FaBars, FaChevronLeft, FaUserCircle
} from "react-icons/fa";
import axios from "axios";

const API_URL = "https://student-management-system-4-hose.onrender.com";

const AdminDashboard = () => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [stats, setStats] = useState({ students: 45, batches: 2, avgMarks: 82 });
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const [currentImg, setCurrentImg] = useState(0);

  const bgImages = [
    "https://images.unsplash.com/photo-1523050853023-8c2d27543054?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&q=80&w=1200"
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImg((prev) => (prev + 1) % bgImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Main Links for Sidebar/Grid (Excluding the ones moved to Top Nav)
  const links = [
    { title: "Manage Students", path: "manage-students", icon: <FaUserGraduate />, color: "#6366f1", category: "Academic" },
    { title: "Manage Fees", path: "manage-fees", icon: <FaMoneyBillWave />, color: "#10b981", category: "Finance" },
    { title: "Mark Attendance", path: "mark-attendance", icon: <FaClipboardCheck />, color: "#f59e0b", category: "Daily" },
    { title: "View Attendance", path: "attendance-view", icon: <FaChartBar />, color: "#8b5cf6", category: "Reports" },
    { title: "Upload Homework", path: "upload-homework", icon: <FaUpload />, color: "#ef4444", category: "Academic" },
    { title: "Add Marks", path: "add-marks", icon: <FaStar />, color: "#ec4899", category: "Exams" },
    { title: "Reports", path: "reports", icon: <FaChartBar />, color: "#475569", category: "Reports" },
    { title: "Student Chat", path: "admin-chat", icon: <FaComments />, color: "#2dd4bf", category: "Support" },
  ];

  const filteredLinks = links.filter(link =>
    link.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isBaseAdmin = location.pathname === "/admin" || location.pathname === "/admin/";

  return (
    <div style={layout}>
      {/* Sidebar */}
      <aside style={{ ...sidebar, width: isSidebarOpen ? '260px' : '80px' }}>
        <div style={logoSection}>
          <div style={logoIcon}><FaThLarge /></div>
          {isSidebarOpen && <span style={logoText}>EduFlow</span>}
        </div>
        
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={toggleBtn}>
          {isSidebarOpen ? <FaChevronLeft size={10} /> : <FaBars size={10} />}
        </button>

        <nav style={navLinks}>
          {isSidebarOpen && <div style={navLabel}>Management</div>}
          {links.map((link) => (
            <Link 
              key={link.path} 
              to={link.path} 
              className="side-nav-link"
              style={{ 
                ...sideNavLink, 
                background: location.pathname.includes(link.path) ? '#fdf2f0' : 'transparent',
                color: location.pathname.includes(link.path) ? '#f97316' : '#64748b'
              }} 
            >
              <span style={{ fontSize: '20px' }}>{link.icon}</span>
              {isSidebarOpen && <span>{link.title}</span>}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main style={mainContent}>
        <style>
          {`
            .side-nav-link:hover { background: #f8fafc; color: #f97316 !important; transform: translateX(5px); }
            .top-nav-item { position: relative; padding: 5px 0; }
            .top-nav-item::after { content: ''; position: absolute; bottom: 0; left: 0; width: 0; height: 2px; background: #fff; transition: 0.3s; }
            .top-nav-item:hover::after { width: 100%; }
            .glass-card { background: #fff; border: 1px solid #f1f5f9; transition: 0.3s; }
            .glass-card:hover { border-color: #f97316; box-shadow: 0 10px 25px -5px rgba(249,115,22,0.1); transform: translateY(-5px); }
            @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes marquee { from { transform: translateX(100%); } to { transform: translateX(-100%); } }
          `}
        </style>

        {/* COMPACT ORANGE HEADER */}
        <header style={orangeHeader}>
          <div style={headerLeft}>
            <span style={headerTag}>SMART STUDENTS</span>
            <div style={vDivider}></div>
            <div style={headerNav}>
              <Link to="admin-feedback" style={headerLink} className="top-nav-item">Feedback</Link>
              <Link to="student-submission" style={headerLink} className="top-nav-item">Submissions</Link>
              <Link to="study-material" style={headerLink} className="top-nav-item">Study Material</Link>
              <Link to="add-exam-marks" style={headerLink} className="top-nav-item">Exam Marks</Link>
            </div>
          </div>
          
          <div style={headerRight}>
            <div style={searchBox}>
              <FaSearch size={14} color="rgba(255,255,255,0.7)" />
              <input 
                type="text" 
                placeholder="Quick search..." 
                style={topSearchInput} 
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div style={headerIconBtn} onClick={() => setShowNotif(!showNotif)}>
              <FaBell size={18} />
              <span style={headerBadge}></span>
            </div>
            <div style={headerUser}>
              <img src="https://ui-avatars.com/api/?name=Nitesh+Admin&background=fff&color=f97316" style={avatarSmall} alt="admin" />
              <span>Nitesh Admin</span>
            </div>
          </div>
        </header>

        {isBaseAdmin ? (
          <div style={pagePadding}>
            {/* HERO SECTION */}
            <section style={{...hero, backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(${bgImages[currentImg]})`}}>
              <div style={heroContent}>
                <h1 style={heroTitle}>Welcome Back, Nitesh! 👋</h1>
                <p style={heroSub}>Everything looks good today. You have {stats.students} students across {stats.batches} active batches.</p>
                <div style={heroStats}>
                  <div style={hStatCard}>
                    <span style={hStatVal}>{stats.avgMarks}%</span>
                    <span style={hStatLab}>Avg. Performance</span>
                  </div>
                  <div style={hStatCard}>
                    <span style={hStatVal}>Live</span>
                    <span style={hStatLab}>System Status</span>
                  </div>
                </div>
              </div>
            </section>

            {/* DASHBOARD GRID */}
            <div style={grid}>
              {filteredLinks.map((link, index) => (
                <Link to={link.path} key={link.title} className="glass-card" style={{...cardStyle, animation: `slideIn 0.3s ease forwards ${index * 0.05}s`}}>
                  <div style={{ ...iconBox, background: link.color }}>{link.icon}</div>
                  <div>
                    <span style={cardCategory}>{link.category}</span>
                    <h3 style={cardTitle}>{link.title}</h3>
                  </div>
                  <div style={cardArrow}><FaArrowRight size={12} /></div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div style={outletStyle}><Outlet /></div>
        )}

        {/* NEWS TICKER FOOTER */}
        <footer style={footerStyle}>
          <div style={tickerWrapper}>
             <p style={tickerText}>
               Built with ❤️ for Smart Education | © 2026 EduFlow
 </p>
          </div>
        </footer>
      </main>
    </div>
  );
};

// --- STYLES (Professional & Sleek) ---
const layout = { display: 'flex', minHeight: '100vh', background: '#f8fafc' };
const sidebar = { background: '#fff', borderRight: '1px solid #e2e8f0', padding: '20px 15px', position: 'sticky', top: 0, height: '100vh', transition: '0.3s', zIndex: 1000 };
const logoSection = { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '35px', padding: '0 10px' };
const logoIcon = { background: 'linear-gradient(135deg, #f97316, #fb923c)', color: '#fff', width: '35px', height: '35px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const logoText = { fontSize: '18px', fontWeight: '800', color: '#1e293b', letterSpacing: '-0.5px' };
const toggleBtn = { position: 'absolute', right: '-12px', top: '25px', width: '24px', height: '24px', borderRadius: '50%', background: '#1e293b', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };

const navLinks = { display: 'flex', flexDirection: 'column', gap: '4px' };
const navLabel = { fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', margin: '15px 0 10px 10px' };
const sideNavLink = { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 15px', textDecoration: 'none', fontWeight: '600', borderRadius: '10px', transition: '0.2s', fontSize: '14px' };

const mainContent = { flex: 1, display: 'flex', flexDirection: 'column' };

// Compact Header
const orangeHeader = {
  height: '96px', background: 'linear-gradient(90deg, #f97316 0%, #cc4700 100%)',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '0 25px', color: '#fff', position: 'sticky', top: 0, zIndex: 1100,
  boxShadow: '0 4px 12px rgba(234, 88, 12, 0.15)'
};
const headerLeft = { display: 'flex', alignItems: 'center', gap: '30px' };
const headerTag = { fontSize: '31px', fontWeight: '800', opacity: 0.8, letterSpacing: '1px' };
const vDivider = { width: '1px', height: '20px', background: 'rgba(255,255,255,0.3)' };
const headerNav = { display: 'flex', gap: '25px' };
const headerLink = { color: '#fff', textDecoration: 'none', fontSize: '19px', fontWeight: '800' };

const headerRight = { display: 'flex', alignItems: 'center', gap: '0px' };
const searchBox = { background: 'rgb(255, 255, 255)', borderRadius: '6px', padding: '4px 6px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgb(255, 255, 255)' };
const topSearchInput = { border: 'none', background: 'transparent', color: '#fff', outline: 'none', fontSize: '13px', width: '150px' };
const headerIconBtn = { cursor: 'pointer', position: 'relative', opacity: 0.9 };
const headerBadge = { position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', background: '#fff', borderRadius: '50%' };
const headerUser = { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '600', paddingLeft: '10px', borderLeft: '1px solid rgba(255,255,255,0.3)' };
const avatarSmall = { width: '30px', height: '30px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.5)' };

const pagePadding = { padding: '30px', maxWidth: '1300px', margin: '0 auto', width: '100%' };

const hero = { 
  height: '240px', borderRadius: '24px', backgroundSize: 'cover', backgroundPosition: 'center',
  display: 'flex', alignItems: 'center', padding: '0 40px', color: '#fff', marginBottom: '35px',
  transition: '1s ease', animation: 'slideIn 0.8s ease'
};
const heroContent = { maxWidth: '600px' };
const heroTitle = { fontSize: '32px', margin: 0, fontWeight: '800' };
const heroSub = { fontSize: '15px', opacity: 0.9, margin: '10px 0 25px', lineHeight: '1.5' };
const heroStats = { display: 'flex', gap: '25px' };
const hStatCard = { background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', padding: '10px 20px', borderRadius: '12px', display: 'flex', flexDirection: 'column' };
const hStatVal = { fontSize: '18px', fontWeight: '800' };
const hStatLab = { fontSize: '11px', opacity: 0.8, textTransform: 'uppercase' };

const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px', paddingBottom: '80px' };
const cardStyle = { padding: '24px', borderRadius: '20px', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '15px', position: 'relative' };
const iconBox = { width: '45px', height: '45px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '20px' };
const cardCategory = { fontSize: '10px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' };
const cardTitle = { margin: 0, fontSize: '16px', color: '#1e293b', fontWeight: '700' };
const cardArrow = { position: 'absolute', bottom: '24px', right: '24px', color: '#cbd5e1' };

const footerStyle = { position: 'fixed', height: '56px', bottom: 0, left: 0, right: 0, background: '#1e293b', padding: '10px 0', zIndex: 1200 };
const tickerWrapper = { overflow: 'hidden', whiteSpace: 'nowrap' };
const tickerText = { display: 'inline-block', animation: 'marquee 25s linear infinite', color: '#8cde19a4', fontSize: '53px', margin: 0, paddingLeft: '100%' };
const outletStyle = { padding: '30px' };

export default AdminDashboard;