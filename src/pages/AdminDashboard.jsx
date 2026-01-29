import React, { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  FaUserGraduate, FaMoneyBillWave, FaClipboardCheck, FaUpload,
  FaBookOpen, FaFileUpload, FaStar, FaComments, FaChartBar,
  FaArrowRight, FaThLarge, FaSearch, FaBell, FaCog, FaChevronRight, FaBars, FaLayersGroup
} from "react-icons/fa";

const AdminDashboard = () => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  // Default hide karne ke liye isse false rakha hai
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Dynamic stats: 45 Batches (jaisa aapne manga tha)
  const [stats, setStats] = useState({ students: 0, batches: 0 });

  useEffect(() => {
    // API simulation
    setStats({ students: 45, batches: 2 });
  }, []);

  const links = [
    { title: "Manage Students", path: "manage-students", icon: <FaUserGraduate />, color: "#6366f1", category: "Academic" },
    { title: "Manage Fees", path: "manage-fees", icon: <FaMoneyBillWave />, color: "#10b981", category: "Finance" },
    { title: "Mark Attendance", path: "mark-attendance", icon: <FaClipboardCheck />, color: "#f59e0b", category: "Daily" },
    { title: "View Attendance", path: "attendance-view", icon: <FaChartBar />, color: "#8b5cf6", category: "Reports" },
    { title: "Upload Homework", path: "upload-homework", icon: <FaUpload />, color: "#ef4444", category: "Academic" },
    { title: "Study Material", path: "study-material", icon: <FaBookOpen />, color: "#3b82f6", category: "Academic" },
    { title: "Add Marks", path: "add-marks", icon: <FaStar />, color: "#ec4899", category: "Exams" },
    { title: "Add Exam Marks", path: "add-exam-marks", icon: <FaFileUpload />, color: "#6d28d9", category: "Exams" },
    { title: "Reports", path: "reports", icon: <FaChartBar />, color: "#475569", category: "Reports" },
    { title: "Student Submission", path: "student-submission", icon: <FaFileUpload />, color: "#06b6d4", category: "Review" },
    { title: "Student Feedback", path: "admin-feedback", icon: <FaStar />, color: "#f97316", category: "Support" },
    { title: "Student Chat", path: "admin-chat", icon: <FaComments />, color: "#2dd4bf", category: "Support" },
  ];

  const filteredLinks = links.filter(link => 
    link.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isBaseAdmin = location.pathname === "/admin" || location.pathname === "/admin/";

  return (
    <div style={layout}>
      {/* Sidebar - Collapsed by default (80px) */}
      <aside style={{...sidebar, width: isSidebarOpen ? '260px' : '80px'}}>
        <div style={logoSection}>
          <div style={logoIcon}><FaThLarge /></div>
          {isSidebarOpen && <span style={logoText}>EduFlow</span>}
        </div>
        
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={toggleBtn}>
          {isSidebarOpen ? <FaChevronLeft /> : <FaBars />}
        </button>

        <nav style={navLinks}>
          {isSidebarOpen && <div style={navLabel}>Main Menu</div>}
          {links.map((link) => (
            <Link 
              key={link.path} 
              to={link.path} 
              style={{...sideNavLink, justifyContent: isSidebarOpen ? 'flex-start' : 'center'}}
              title={!isSidebarOpen ? link.title : ""}
            >
              <span style={{color: link.color, fontSize: '18px', display: 'flex'}}>{link.icon}</span>
              {isSidebarOpen && <span style={navText}>{link.title}</span>}
            </Link>
          ))}
        </nav>

        {isSidebarOpen && (
          <div style={sidebarFooter}>
            <div style={activeStatus}><span style={dot}></span> Live</div>
            <p style={{margin: '4px 0 0', fontSize: '10px', color: '#94a3b8'}}>Panel v2.5</p>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main style={mainContent}>
        {isBaseAdmin ? (
          <div style={contentWrapper}>
            {/* Top Bar */}
            <header style={topNav}>
              <div style={searchBar}>
                <FaSearch style={{color: '#94a3b8'}} />
                <input 
                  type="text" 
                  placeholder="Find anything..." 
                  style={searchInput} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div style={topNavActions}>
                <div style={iconBtn}><FaBell /></div>
                <div style={userProfile}>
                  <img src="https://ui-avatars.com/api/?name=Nitesh&background=6366f1&color=fff" alt="user" style={avatar}/>
                  <span className="hide-mobile">Nitesh Admin</span>
                </div>
              </div>
            </header>

            {/* Hero Section - Staff replaced with Batches */}
            <section style={hero}>
              <div style={heroText}>
                <h1 style={greeting}>Admin Dashboard</h1>
                <p style={subGreeting}>Managing {stats.batches} active batches today.</p>
              </div>
              <div style={statsOverview}>
                <div style={statItem}>
                  <h3 style={statNum}>{stats.students.toLocaleString()}</h3>
                  <p style={statLabel}>Total Students</p>
                </div>
                <div style={divider}></div>
                <div style={statItem}>
                  <h3 style={statNum}>{stats.batches}</h3>
                  <p style={statLabel}>Total Batches</p>
                </div>
              </div>
            </section>

            {/* Responsive Cards Grid */}
            <div style={grid}>
              {filteredLinks.map((link) => (
                <Link to={link.path} key={link.title} className="glass-card" style={cardStyle}>
                  <div style={{ ...iconBox, background: link.color }}>
                    {link.icon}
                  </div>
                  <div style={cardInfo}>
                    <span style={categoryLabel}>{link.category}</span>
                    <h3 style={cardTitle}>{link.title}</h3>
                  </div>
                  <div className="arrow-btn" style={arrowBtn}>
                    <FaArrowRight size={12} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div style={outletStyle}><Outlet /></div>
        )}
      </main>

      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
          
          * { box-sizing: border-box; font-family: 'Outfit', sans-serif; }
          body { margin: 0; background: #f8fafc; }

          .glass-card {
            position: relative;
            background: rgba(255, 255, 255, 0.8) !important;
            border: 1px solid #fff !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
          }
          
          .glass-card:hover {
            transform: translateY(-5px);
            background: #fff !important;
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05);
            border-color: #6366f1 !important;
          }

          .glass-card:hover .arrow-btn {
            background: #6366f1;
            color: #fff;
          }

          /* Mobile Optimization */
          @media (max-width: 768px) {
            aside {
              position: fixed !important;
              height: 100vh;
              width: ${isSidebarOpen ? '260px' : '0px'} !important;
              padding: ${isSidebarOpen ? '25px 15px' : '0px'} !important;
              overflow: hidden;
            }
            main { padding: 15px !important; }
            .hide-mobile { display: none; }
            .stats-container { flex-direction: column; gap: 15px; }
            header { gap: 10px; }
            .search-bar { width: 100% !important; }
            .hero-section { padding: 25px !important; flex-direction: column; text-align: center; gap: 20px; }
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </div>
  );
};

// --- Icons for Toggle ---
const FaChevronLeft = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 320 512" height="1em" width="1em"><path d="M34.52 239.03L228.87 44.69c9.37-9.37 24.57-9.37 33.94 0l22.67 22.67c9.36 9.36 9.37 24.52.04 33.9L131.49 256l154.02 154.75c9.34 9.38 9.32 24.54-.04 33.9l-22.67 22.67c-9.37 9.37-24.57 9.37-33.94 0L34.52 272.97c-9.37-9.37-9.37-24.57 0-33.94z"></path></svg>;

// --- Styling Objects ---
const layout = { display: 'flex', minHeight: '100vh', color: '#1e293b' };

const sidebar = { 
  background: '#fff', 
  borderRight: '1px solid #eef2f6', 
  padding: '25px 15px', 
  display: 'flex', 
  flexDirection: 'column', 
  position: 'sticky', 
  top: 0, 
  height: '100vh',
  zIndex: 1000,
  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
};

const logoSection = { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', paddingLeft: '8px' };
const logoIcon = { background: '#6366f1', color: '#fff', padding: '10px', borderRadius: '12px', display: 'flex', fontSize: '20px' };
const logoText = { fontSize: '22px', fontWeight: '800', color: '#1e293b', letterSpacing: '-0.5px' };

const toggleBtn = {
  position: 'absolute', right: '-12px', top: '30px', width: '26px', height: '26px',
  borderRadius: '50%', background: '#6366f1', color: '#fff', border: 'none',
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)', zIndex: 1001
};

const navLinks = { display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', overflowX: 'hidden' };
const navLabel = { fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', margin: '20px 0 10px 12px', letterSpacing: '1px' };

const sideNavLink = { 
  display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 15px', 
  textDecoration: 'none', color: '#64748b', fontWeight: '500', borderRadius: '12px', 
  fontSize: '14px', transition: '0.2s'
};

const navText = { animation: 'fadeIn 0.3s ease' };

const mainContent = { flex: 1, padding: '30px', minWidth: 0, transition: 'all 0.3s ease' };
const contentWrapper = { maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.5s ease' };

const topNav = { display: 'flex', justifyContent: 'space-between', marginBottom: '35px', alignItems: 'center', gap: '20px' };
const searchBar = { background: '#fff', padding: '12px 20px', borderRadius: '15px', display: 'flex', alignItems: 'center', gap: '12px', flex: 1, maxWidth: '400px', border: '1px solid #eef2f6' };
const searchInput = { border: 'none', outline: 'none', fontSize: '14px', width: '100%' };

const topNavActions = { display: 'flex', alignItems: 'center', gap: '15px' };
const iconBtn = { background: '#fff', padding: '12px', borderRadius: '14px', color: '#64748b', border: '1px solid #eef2f6', cursor: 'pointer', display: 'flex' };
const userProfile = { display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', padding: '5px 15px 5px 5px', borderRadius: '50px', fontWeight: '600', fontSize: '13px', border: '1px solid #eef2f6' };
const avatar = { width: '34px', height: '34px', borderRadius: '50%' };

const hero = { 
  background: '#1e293b', 
  padding: '40px', borderRadius: '30px', marginBottom: '35px', 
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
  color: '#fff', position: 'relative', overflow: 'hidden' 
};

const heroText = { zIndex: 1 };
const greeting = { margin: 0, fontSize: '30px', fontWeight: '800' };
const subGreeting = { margin: '5px 0 0', opacity: 0.6, fontSize: '15px' };

const statsOverview = { 
  display: 'flex', alignItems: 'center', gap: '30px', 
  background: 'rgba(255,255,255,0.05)', padding: '15px 25px', 
  borderRadius: '20px', backdropFilter: 'blur(10px)' 
};

const statItem = { textAlign: 'center' };
const statNum = { margin: 0, fontSize: '24px', fontWeight: '800' };
const statLabel = { margin: '2px 0 0', fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' };
const divider = { width: '1px', height: '35px', background: 'rgba(255,255,255,0.1)' };

const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' };
const cardStyle = { padding: '25px', borderRadius: '24px', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '15px' };
const iconBox = { width: '50px', height: '50px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '20px' };
const cardInfo = { display: 'flex', flexDirection: 'column' };
const categoryLabel = { fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' };
const cardTitle = { margin: '4px 0 0', fontSize: '17px', color: '#1e293b', fontWeight: '700' };
const arrowBtn = { position: 'absolute', bottom: '25px', right: '25px', width: '30px', height: '30px', background: '#f8fafc', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' };

const sidebarFooter = { marginTop: 'auto', background: '#f8fafc', padding: '15px', borderRadius: '15px' };
const activeStatus = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#10b981' };
const dot = { width: '6px', height: '6px', background: '#10b981', borderRadius: '50%' };
const outletStyle = { animation: 'fadeIn 0.4s ease' };

export default AdminDashboard;