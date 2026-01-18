import React, { useState, useEffect } from "react";
import { Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import {
  FaClipboardCheck, FaMoneyBillWave, FaChartLine, FaBook,
  FaComments, FaUserGraduate, FaHome, FaUserAlt,
  FaBookOpen, FaLayerGroup, FaBars, FaTimes, FaFire, FaExclamationTriangle,
  FaMoon, FaSun, FaSignOutAlt
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

// Sub-Components
import StudentAttendance from "./StudentAttendance";
import StudentFees from "./StudentFees";
import StudentsMarks from "./StudentsMarks";
import HomeworkStudent from "./HomeworkStudent";
import StudentProfile from "./StudentProfile";
import StudentStudyMaterial from "./StudentStudyMaterial";
import StudentNewMarks from "./StudentNewMarks";
import StudentPage from "./StudentPage";
import StudentFeedback from "./StudentFeedback";
import StudentChat from "./StudentChat";

const API_URL = "https://student-management-system-4-hose.onrender.com";

const theme = {
  gradients: {
    primary: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
    success: "linear-gradient(135deg, #10b981 0%, #3b82f6 100%)",
    warning: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
    info: "linear-gradient(135deg, #0ea5e9 0%, #2dd4bf 100%)",
    purple: "linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)",
    dark: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    danger: "linear-gradient(135deg, #ff4b2b 0%, #ff416c 100%)",
  }
};

/* =========================
   NEW FEATURE: PHOTO MODAL
========================= */
const PhotoModal = ({ isOpen, photo, onClose }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={overlayStyle} onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0, borderRadius: "100%" }}
          animate={{ scale: 1, borderRadius: "20px" }}
          exit={{ scale: 0 }}
          style={bigPhotoContainer}
          onClick={(e) => e.stopPropagation()}
        >
          <img src={photo || "/default-profile.png"} style={bigPhotoStyle} alt="User" />
          <div style={closePhotoBtn} onClick={onClose}><FaTimes /></div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

/* =========================
   FEE POPUP MODAL
========================= */
const FeePopup = ({ isOpen, onClose, amount }) => {
  const MY_UPI_ID = "9302122613@ybl";
  const handlePayNow = () => {
    const upiUrl = `upi://pay?pa=${MY_UPI_ID}&pn=SmartZone&am=${amount}&cu=INR&tn=MonthlyFees`;
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      window.location.href = upiUrl;
    } else {
      alert(`Please open on mobile to pay ₹${amount} via UPI.`);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={modalOverlay}>
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} style={modalContent}>
            <div style={modalIcon}><FaExclamationTriangle /></div>
            <h2 style={{ color: "#1e293b" }}>Fees Pending!</h2>
            <p style={{ color: "#64748b", margin: "15px 0" }}>Your fee (<b>₹{amount}</b>) is due. Pay now to continue.</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={handlePayNow} style={modalPayBtn}>Pay Now</button>
              <button onClick={onClose} style={modalCloseBtn}>Later</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/* =========================
   DASHBOARD HOME VIEW
========================= */
const DashboardHome = ({ navigate, isFeeUnpaid, user }) => {
  const [greeting, setGreeting] = useState("");
  
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  const cards = [
    { title: "Attendance", icon: <FaClipboardCheck />, path: "attendance", grad: theme.gradients.success },
    { title: "Fees", icon: <FaMoneyBillWave />, path: "fees", grad: theme.gradients.warning, showNotice: true },
    { title: "Marks", icon: <FaChartLine />, path: "marks", grad: theme.gradients.info },
    { title: "Homework", icon: <FaBook />, path: "homework", grad: theme.gradients.primary },
    { title: "Study Vault", icon: <FaBookOpen />, path: "study-material", grad: theme.gradients.dark },
    { title: "Feedback", icon: <FaComments />, path: "feedback", grad: theme.gradients.purple },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div style={welcomeSection}>
         <h2 style={{ margin: 0 }}>{greeting}, {user?.name?.split(" ")[0]}! ✨</h2>
         <p style={{ color: "#64748b" }}>You have {isFeeUnpaid ? "pending fees" : "all clear"} today.</p>
      </div>
      <div style={cardGrid}>
        {cards.map((c, i) => (
          <motion.div key={i} whileHover={{ y: -12, scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={() => navigate(c.path)} style={{ ...cardBase, background: c.grad }}>
            {c.showNotice && isFeeUnpaid && <div style={miniNoticeBadge}>PAY FEE!</div>}
            <div style={cardIconBox}>{c.icon}</div>
            <div style={cardBody}>
              <h3 style={cardMainTitle}>{c.title}</h3>
              <span style={cardLinkText}>View Records →</span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

/* =========================
   STUDENT DASHBOARD
========================= */
const StudentDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [isFeeUnpaid, setIsFeeUnpaid] = useState(false);
  const [showFeePopup, setShowFeePopup] = useState(false);
  const [dynamicFeeAmount, setDynamicFeeAmount] = useState("500");
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { name: "Dashboard", path: "/student", icon: <FaHome /> },
    { name: "Profile", path: "profile", icon: <FaUserAlt /> },
    { name: "Fees", path: "fees", icon: <FaMoneyBillWave /> },
    { name: "Attendance", path: "attendance", icon: <FaClipboardCheck /> },
    { name: "Marks", path: "marks", icon: <FaChartLine /> },
    { name: "Exam Results", path: "exam-results", icon: <FaLayerGroup /> },
    { name: "Homework", path: "homework", icon: <FaBook /> },
    { name: "Study Material", path: "study-material", icon: <FaBookOpen /> },
    { name: "Task Updates", path: "task-update", icon: <FaFire /> },
    { name: "Feedback", path: "feedback", icon: <FaComments /> },
    { name: "Chat", path: "chat", icon: <FaComments /> },
  ];

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user")) || { id: 101, name: "Student", class: "10th" };
    setUser(storedUser);

    const fetchData = async () => {
      try {
        const taskRes = await axios.get(`${API_URL}/api/assignments/class/${storedUser.class}/${storedUser.id}`);
        if (taskRes.data.success) setPendingTasks(taskRes.data.assignments.filter(t => t.status !== "SUBMITTED").length);

        const feeRes = await axios.get(`${API_URL}/api/fees/student/${storedUser.id}`);
        if (feeRes.data.success) {
          const feesData = feeRes.data.fees;
          if (feesData.length > 0) {
            const sorted = [...feesData].sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
            setDynamicFeeAmount(sorted[0].amount);
          }
          const paidThisMonth = feesData.some(f => new Date(f.payment_date).getMonth() === new Date().getMonth());
          if (!paidThisMonth) { setIsFeeUnpaid(true); setShowFeePopup(true); }
        }

        const photoRes = await axios.get(`${API_URL}/api/students/${storedUser.id}/profile-photo`);
        if (photoRes.data.success && photoRes.data.user?.profile_photo) {
          setUser(prev => ({ ...prev, photo: photoRes.data.user.profile_photo }));
        }
      } catch (err) { console.error(err); }
    };
    fetchData();
  }, []);

  if (!user) return null;

  return (
    <div style={masterWrapper}>
      <Header user={user} pendingCount={pendingTasks} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} onPhotoClick={() => setIsPhotoOpen(true)} />
      <FeePopup isOpen={showFeePopup} onClose={() => setShowFeePopup(false)} amount={dynamicFeeAmount} />
      <PhotoModal isOpen={isPhotoOpen} photo={user.photo} onClose={() => setIsPhotoOpen(false)} />

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} style={sideOverlay} />
            <motion.aside initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} style={sideDrawer}>
              <div style={drawerHeader}>
                <div style={drawerLogo}><FaUserGraduate /></div>
                <h4 style={{ color: "white", margin: 0 }}>Student Panel</h4>
              </div>
              <nav style={drawerNav}>
                {menuItems.map((item, idx) => (
                  <Link 
                    key={idx} to={item.path} 
                    onClick={() => setSidebarOpen(false)} 
                    style={drawerLink(location.pathname.includes(item.path) || (item.path === "/student" && location.pathname === "/student"))}
                  >
                    {item.icon} {item.name}
                  </Link>
                ))}
                <div style={logoutBtn} onClick={() => {localStorage.clear(); navigate('/login')}}>
                   <FaSignOutAlt /> Logout
                </div>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main style={mainBody}>
        <Routes>
          <Route index element={<DashboardHome navigate={navigate} isFeeUnpaid={isFeeUnpaid} user={user} />} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="fees" element={<StudentFees user={user} />} />
          <Route path="attendance" element={<StudentAttendance user={user} />} />
          <Route path="marks" element={<StudentsMarks user={user} />} />
          <Route path="exam-results" element={<StudentNewMarks />} />
          <Route path="homework" element={<HomeworkStudent />} />
          <Route path="study-material" element={<StudentStudyMaterial />} />
          <Route path="task-update" element={<StudentPage studentId={user.id} />} />
          <Route path="feedback" element={<StudentFeedback studentId={user.id} />} />
          <Route path="chat" element={<StudentChat user={user} />} />
        </Routes>
      </main>
    </div>
  );
};

/* =========================
   HEADER COMPONENT
========================= */
const Header = ({ user, pendingCount, toggleSidebar, onPhotoClick }) => {
  const [showAlert, setShowAlert] = useState(false);
  useEffect(() => { if (pendingCount > 0) { setShowAlert(true); setTimeout(() => setShowAlert(false), 6000); } }, [pendingCount]);

  return (
    <>
      <header style={headerWrapper}>
        <div style={headerContent}>
          <div style={headerLeft}>
            <div style={iconBtn} onClick={toggleSidebar}><FaBars /></div>
            <h1 style={brandLogo}>𝐒mart𝐙one</h1>
          </div>
          <div style={headerRight}>
            <div style={profileTrigger}>
              <div style={profileInfo}>
                <span style={roleText}>Class {user.class}</span>
                <span style={userName}>{user.name?.split(" ")[0]}</span>
              </div>
              <motion.img 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                src={user.photo || "/default-profile.png"} 
                style={headerAvatar} 
                alt="user" 
                onClick={onPhotoClick}
              />
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {showAlert && (
          <motion.div initial={{ y: -100, x: "-50%" }} animate={{ y: 100, x: "-50%" }} exit={{ y: -100, x: "-50%" }} style={floatingAlert}>
            <div style={alertIcon}><FaFire /></div>
            <div style={alertText}>You have <b>{pendingCount} tasks</b> pending!</div>
            <div style={{ marginLeft: "auto", cursor: "pointer" }} onClick={() => setShowAlert(false)}><FaTimes /></div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/* =========================
   STYLES
========================= */
const masterWrapper = { minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter', sans-serif" };
const headerWrapper = { position: "fixed", top: 20, left: 0, width: "100%", zIndex: 1000, display: "flex", justifyContent: "center", padding: "0 20px" };
const headerContent = { width: "100%", maxWidth: "1200px", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)", borderRadius: "24px", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.08)", border: "1px solid rgba(255,255,255,0.3)" };
const headerLeft = { display: "flex", alignItems: "center", gap: 20 };
const iconBtn = { cursor: "pointer", fontSize: 20, color: "#6366f1", background: "#f1f5f9", padding: "10px", borderRadius: "12px", display: "flex" };
const brandLogo = { margin: 0, fontSize: 22, fontWeight: 900, background: theme.gradients.primary, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" };
const headerRight = { display: "flex", alignItems: "center", gap: 15 };
const profileTrigger = { display: "flex", alignItems: "center", gap: 12 };
const profileInfo = { textAlign: "right", display: "flex", flexDirection: "column" };
const roleText = { fontSize: 10, color: "#94a3b8", fontWeight: 700 };
const userName = { fontSize: 15, fontWeight: 700 };
const headerAvatar = { width: 42, height: 42, borderRadius: "50%", border: "2px solid #6366f1", objectFit: "cover", cursor: "pointer", boxShadow: "0 4px 10px rgba(99, 102, 241, 0.3)" };
const floatingAlert = { position: "fixed", top: 0, left: "50%", zIndex: 2000, background: "#1e293b", padding: "16px 24px", borderRadius: "20px", display: "flex", alignItems: "center", gap: 15, color: "#fff", minWidth: "320px", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" };
const alertIcon = { width: 35, height: 35, background: "#ef4444", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" };
const alertText = { fontSize: 14 };
const mainBody = { padding: "140px 24px 60px", maxWidth: "1200px", margin: "0 auto" };
const welcomeSection = { marginBottom: "30px", padding: "0 10px" };

// PHOTO MODAL STYLES
const overlayStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)", zIndex: 5000, display: "flex", alignItems: "center", justifyContent: "center" };
const bigPhotoContainer = { position: "relative", width: "300px", height: "300px", background: "#fff", padding: "8px", borderRadius: "50%", border: "5px solid #6366f1", boxShadow: "0 0 50px rgba(99, 102, 241, 0.5)" };
const bigPhotoStyle = { width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" };
const closePhotoBtn = { position: "absolute", top: -10, right: -10, background: "#ef4444", color: "white", width: "40px", height: "40px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 5px 15px rgba(0,0,0,0.2)" };

const miniNoticeBadge = { position: "absolute", top: "20px", right: "20px", background: "white", color: "#ef4444", padding: "6px 12px", borderRadius: "10px", fontSize: "11px", fontWeight: "900", border: "1px solid #ef4444" };
const modalOverlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000 };
const modalContent = { background: "white", padding: "40px", borderRadius: "35px", maxWidth: "400px", textAlign: "center" };
const modalIcon = { fontSize: "50px", color: "#ef4444", marginBottom: "20px" };
const modalPayBtn = { flex: 1, background: theme.gradients.danger, color: "white", border: "none", padding: "15px", borderRadius: "15px", fontWeight: "bold", cursor: "pointer" };
const modalCloseBtn = { flex: 1, background: "#f1f5f9", color: "#64748b", border: "none", padding: "15px", borderRadius: "15px", fontWeight: "bold", cursor: "pointer" };
const cardGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 30 };
const cardBase = { position: "relative", borderRadius: "40px", padding: "40px", color: "#fff", cursor: "pointer", height: "220px", display: "flex", flexDirection: "column", justifyContent: "space-between", transition: "0.3s" };
const cardIconBox = { fontSize: 45, opacity: 0.9 };
const cardBody = { zIndex: 2 };
const cardMainTitle = { fontSize: 24, fontWeight: 800 };
const cardLinkText = { fontSize: 14, opacity: 0.8 };
const sideDrawer = { position: "fixed", top: 0, left: 0, bottom: 0, width: 280, background: "#0f172a", zIndex: 2001, padding: "40px 25px" };
const sideOverlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(8px)", zIndex: 2000 };
const drawerHeader = { display: "flex", alignItems: "center", gap: 15, marginBottom: 40 };
const drawerLogo = { width: 45, height: 45, background: theme.gradients.primary, borderRadius: "14px", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 };
const drawerNav = { display: "flex", flexDirection: "column", gap: 10 };
const drawerLink = (active) => ({ display: "flex", alignItems: "center", gap: 15, padding: "16px 20px", borderRadius: "18px", textDecoration: "none", color: active ? "white" : "#94a3b8", background: active ? "#6366f1" : "transparent", fontWeight: active ? 700 : 500, transition: "0.3s" });
const logoutBtn = { display: "flex", alignItems: "center", gap: 15, padding: "16px 20px", borderRadius: "18px", color: "#ef4444", fontWeight: 700, cursor: "pointer", marginTop: "20px", border: "1px solid rgba(239, 68, 68, 0.2)" };

export default StudentDashboard;