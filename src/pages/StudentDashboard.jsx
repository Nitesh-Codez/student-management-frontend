import React, { useState, useEffect } from "react";
import { Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import {
  FaClipboardCheck, FaMoneyBillWave, FaChartLine, FaBook,
  FaComments, FaUserGraduate, FaHome, FaUserAlt,
  FaBookOpen, FaBars, FaTimes, FaExclamationTriangle,
  FaSignOutAlt, FaRocket, FaBell, FaIdCard, FaGraduationCap, FaChevronRight, FaTasks
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

// Sub-Components
import StudentAttendance from "./StudentAttendance";
import StudentFees from "./StudentFees";
import StudentsMarks from "./StudentsMarks";
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
   PHOTO MODAL
========================= */
const PhotoModal = ({ isOpen, user, onClose }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={overlayStyle} onClick={onClose}>
        <motion.div initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, opacity: 0 }} style={bigRectContainer} onClick={(e) => e.stopPropagation()}>
          <div style={modalTopBar}>
             <span style={{fontWeight: 'bold'}}>Student Identity Pass</span>
             <FaTimes onClick={onClose} style={{cursor: 'pointer'}}/>
          </div>
          <div style={modalMainContent}>
            <img src={user.photo || "/default-profile.png"} style={bigRectPhoto} alt="User" />
            <div style={modalDetails}>
                <h2 style={{margin: '0 0 5px 0', color: '#1e293b'}}>{user.name}</h2>
                <div style={badgeRow}>
                   <span style={infoBadge}><FaIdCard /> ID: {user.id}</span>
                   <span style={infoBadge}><FaGraduationCap /> Class: {user.class}</span>
                </div>
                <p style={modalQuotes}>"Knowledge is power. Information is liberating. Education is the premise of progress."</p>
                <button onClick={onClose} style={modalDoneBtn}>Close View</button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

/* =========================
   FEE POPUP
========================= */
const FeePopup = ({ isOpen, onClose, amount }) => {
  const handlePayNow = () => {
    const upiUrl = `upi://pay?pa=9302122613@ybl&pn=SmartZone&am=${amount}&cu=INR&tn=MonthlyFees`;
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      window.location.href = upiUrl;
    } else {
      alert(`Please open on mobile to pay ₹${amount} via UPI.`);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={feeModalOverlay}>
          <motion.div initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }} style={feeRectCard}>
            <div style={feeLeftAccent}><FaExclamationTriangle fontSize="30px" /></div>
            <div style={feeRightContent}>
                <h3 style={{margin: 0, color: '#1e293b'}}>Payment Reminder</h3>
                <p style={{fontSize: '13px', color: '#64748b', margin: '8px 0'}}>Monthly tuition fee is pending.</p>
                <div style={feeAmountBox}>
                    <span>Amount Due:</span>
                    <span style={{fontSize: '18px', fontWeight: '900', color: '#ef4444'}}>₹{amount}</span>
                </div>
                <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
                    <button onClick={handlePayNow} style={feePayBtnNew}>Pay via UPI</button>
                    <button onClick={onClose} style={feeLaterBtn}>Remind Later</button>
                </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/* =========================
   NOTIFICATION DROPDOWN
========================= */
const NotificationDropdown = ({ isOpen, pendingTasks, isFeeUnpaid, navigate, onClose }) => {
    if (!isOpen) return null;
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={notiDropdownStyle}>
            <div style={notiHeader}>Notifications</div>
            <div style={notiBody}>
                {pendingTasks > 0 && (
                    <div style={notiItem} onClick={() => { navigate('task-update'); onClose(); }}>
                        <div style={{...notiIconCircle, background: '#fee2e2', color: '#ef4444'}}><FaTasks /></div>
                        <div style={notiTextContainer}>
                            <span style={notiItemTitle}>Pending Tasks</span>
                            <span style={notiItemSub}>You have {pendingTasks} tasks to complete</span>
                        </div>
                        <FaChevronRight fontSize="10px" color="#cbd5e1" />
                    </div>
                )}
                {isFeeUnpaid && (
                    <div style={notiItem} onClick={() => { navigate('fees'); onClose(); }}>
                        <div style={{...notiIconCircle, background: '#fef3c7', color: '#f59e0b'}}><FaMoneyBillWave /></div>
                        <div style={notiTextContainer}>
                            <span style={notiItemTitle}>Fees Unpaid</span>
                            <span style={notiItemSub}>Monthly fee payment is due</span>
                        </div>
                        <FaChevronRight fontSize="10px" color="#cbd5e1" />
                    </div>
                )}
                <div style={notiItem} onClick={() => { navigate('marks'); onClose(); }}>
                    <div style={{...notiIconCircle, background: '#dcfce7', color: '#10b981'}}><FaChartLine /></div>
                    <div style={notiTextContainer}>
                        <span style={notiItemTitle}>Academic Check</span>
                        <span style={notiItemSub}>Check your latest exam results</span>
                    </div>
                    <FaChevronRight fontSize="10px" color="#cbd5e1" />
                </div>
                {pendingTasks === 0 && !isFeeUnpaid && (
                    <div style={{padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px'}}>No new alerts.</div>
                )}
            </div>
        </motion.div>
    );
};

/* =========================
   DASHBOARD HOME
========================= */
const DashboardHome = ({ navigate, isFeeUnpaid, pendingTasks, user }) => {
  const [greeting, setGreeting] = useState("");
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  const cards = [
    { title: "Attendance", icon: <FaClipboardCheck />, path: "attendance", grad: theme.gradients.success },
    { title: "Fees", icon: <FaMoneyBillWave />, path: "fees", grad: theme.gradients.warning, showNotice: isFeeUnpaid },
    { title: "Marks", icon: <FaChartLine />, path: "marks", grad: theme.gradients.info },
    { title: "Tasks", icon: <FaTasks />, path: "task-update", grad: theme.gradients.primary, count: pendingTasks },
    { title: "Study Vault", icon: <FaBookOpen />, path: "study-material", grad: theme.gradients.dark },
    { title: "Feedback", icon: <FaComments />, path: "feedback", grad: theme.gradients.purple },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div style={welcomeHeader}>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px' }}>{greeting}, {user?.name?.split(" ")[0]}! ✨</h2>
            <p style={{ color: "#64748b", fontSize: '14px' }}>Check your tasks and academic progress.</p>
          </div>
          <div style={rocketIcon}><FaRocket /></div>
      </div>
      <div style={cardGrid}>
        {cards.map((c, i) => (
          <motion.div key={i} whileHover={{ y: -10, scale: 1.02 }} onClick={() => navigate(c.path)} style={{ ...cardBase, background: c.grad }}>
            {c.showNotice && <div style={miniNoticeBadge}>PAYMENT DUE</div>}
            {c.count > 0 && <div style={miniNoticeBadge}>{c.count} PENDING</div>}
            <div style={cardIconBox}>{c.icon}</div>
            <div style={cardBodyStyle}>
              <h3 style={cardMainTitle}>{c.title}</h3>
              <span style={cardLinkText}>View Details →</span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

/* =========================
   STUDENT DASHBOARD MAIN
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

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user")) || { id: 101, name: "Student", class: "10th" };
    setUser(storedUser);

    const fetchData = async () => {
      try {
        // Task Check (StudentPage Logic)
        const taskRes = await axios.get(`${API_URL}/api/assignments/class/${storedUser.class}/${storedUser.id}`);
        if (taskRes.data.success) {
           const pending = taskRes.data.assignments.filter(t => t.status !== "SUBMITTED").length;
           setPendingTasks(pending);
        }

        const feeRes = await axios.get(`${API_URL}/api/fees/student/${storedUser.id}`);
        if (feeRes.data.success) {
          const feesData = feeRes.data.fees;
          if (feesData.length > 0) {
             const sorted = [...feesData].sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
             setDynamicFeeAmount(sorted[0]?.amount || "500");
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
      <Header 
        user={user} 
        pendingCount={pendingTasks} 
        isFeeUnpaid={isFeeUnpaid}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
        onPhotoClick={() => setIsPhotoOpen(true)} 
        navigate={navigate}
      />
      
      <FeePopup isOpen={showFeePopup} onClose={() => setShowFeePopup(false)} amount={dynamicFeeAmount} />
      <PhotoModal isOpen={isPhotoOpen} user={user} onClose={() => setIsPhotoOpen(false)} />

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} style={sideOverlay} />
            <motion.aside initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} style={sideDrawer}>
              <div style={drawerHeader}>
                <div style={drawerLogo}><FaUserGraduate /></div>
                <h4 style={{ color: "white", margin: 0 }}>SmartZone Student</h4>
              </div>
              <nav style={drawerNav}>
                {[
                  { name: "Dashboard", path: "/student", icon: <FaHome /> },
                  { name: "Profile", path: "profile", icon: <FaUserAlt /> },
                  { name: "My Tasks", path: "task-update", icon: <FaTasks /> },
                  { name: "Fees", path: "fees", icon: <FaMoneyBillWave /> },
                  { name: "Attendance", path: "attendance", icon: <FaClipboardCheck /> },
                  { name: "Marks", path: "marks", icon: <FaChartLine /> },
                  { name: "Study Material", path: "study-material", icon: <FaBookOpen /> },
                  { name: "Chat", path: "chat", icon: <FaComments /> },
                ].map((item, idx) => (
                  <Link 
                    key={idx} to={item.path} 
                    onClick={() => setSidebarOpen(false)} 
                    style={drawerLinkStyle(location.pathname.includes(item.path) || (item.path === "/student" && location.pathname === "/student"))}
                  >
                    {item.icon} {item.name}
                  </Link>
                ))}
                <div style={logoutBtnStyle} onClick={() => {localStorage.clear(); navigate('/login')}}>
                   <FaSignOutAlt /> Sign Out
                </div>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main style={mainBody}>
        <Routes>
          <Route index element={<DashboardHome navigate={navigate} isFeeUnpaid={isFeeUnpaid} pendingTasks={pendingTasks} user={user} />} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="fees" element={<StudentFees user={user} />} />
          <Route path="attendance" element={<StudentAttendance user={user} />} />
          <Route path="marks" element={<StudentsMarks user={user} />} />
          <Route path="exam-results" element={<StudentNewMarks />} />
          <Route path="study-material" element={<StudentStudyMaterial />} />
          <Route path="task-update" element={<StudentPage studentId={user.id} />} />
          <Route path="feedback" element={<StudentFeedback studentId={user.id} />} />
          <Route path="chat" element={<StudentChat user={user} />} />
        </Routes>
      </main>

      <div style={mobileBar}>
         <div onClick={() => navigate('/student')}><FaHome /></div>
         <div onClick={() => navigate('chat')}><FaComments /></div>
         <div onClick={() => setIsPhotoOpen(true)}><FaUserAlt /></div>
         <div onClick={() => setSidebarOpen(true)}><FaBars /></div>
      </div>
    </div>
  );
};

/* =========================
   HEADER COMPONENT
========================= */
const Header = ({ user, pendingCount, isFeeUnpaid, toggleSidebar, onPhotoClick, navigate }) => {
  const [showNoti, setShowNoti] = useState(false);
  const notiTotal = pendingCount + (isFeeUnpaid ? 1 : 0);

  return (
      <header style={headerWrapper}>
        <div style={headerContent}>
          <div style={headerLeft}>
            <div style={iconBtnStyle} onClick={toggleSidebar}><FaBars /></div>
            <h1 style={brandLogo}>𝐒mart𝐙one</h1>
          </div>
          <div style={headerRight}>
             <div style={notiBox} onClick={() => setShowNoti(!showNoti)}>
                <FaBell />
                {notiTotal > 0 && <span style={redBadge}>{notiTotal}</span>}
                <NotificationDropdown 
                    isOpen={showNoti} 
                    pendingTasks={pendingCount} 
                    isFeeUnpaid={isFeeUnpaid} 
                    navigate={navigate} 
                    onClose={() => setShowNoti(false)}
                />
             </div>
            <div style={profileTrigger} onClick={onPhotoClick}>
              <div style={profileInfo}>
                <span style={roleText}>Class {user.class}</span>
                <span style={userNameText}>{user.name?.split(" ")[0]}</span>
              </div>
              <img src={user.photo || "/default-profile.png"} style={headerAvatar} alt="user" />
            </div>
          </div>
        </div>
      </header>
  );
};

/* =========================
   STYLING (SAME AS ORIGINAL)
========================= */
const masterWrapper = { minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter', sans-serif" };
const headerWrapper = { position: "fixed", top: 20, left: 0, width: "100%", zIndex: 1000, display: "flex", justifyContent: "center", padding: "0 20px" };
const headerContent = { width: "100%", maxWidth: "1200px", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)", borderRadius: "24px", padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.08)" };
const headerLeft = { display: "flex", alignItems: "center", gap: 15 };
const iconBtnStyle = { cursor: "pointer", fontSize: 18, color: "#6366f1", background: "#f1f5f9", padding: "10px", borderRadius: "12px", display: "flex" };
const brandLogo = { margin: 0, fontSize: 22, fontWeight: 900, background: theme.gradients.primary, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" };
const headerRight = { display: "flex", alignItems: "center", gap: 15 };
const notiBox = { position: 'relative', fontSize: '20px', color: '#94a3b8', cursor: 'pointer', padding: '5px' };
const redBadge = { position: 'absolute', top: 0, right: 0, background: '#ef4444', color: 'white', fontSize: '10px', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', fontWeight: 'bold' };
const profileTrigger = { display: "flex", alignItems: "center", gap: 10, cursor: 'pointer' };
const profileInfo = { textAlign: "right", display: "flex", flexDirection: "column" };
const roleText = { fontSize: 10, color: "#94a3b8", fontWeight: 700 };
const userNameText = { fontSize: 14, fontWeight: 700 };
const headerAvatar = { width: 40, height: 40, borderRadius: "50%", border: "2px solid #6366f1", objectFit: "cover" };

const notiDropdownStyle = { position: 'absolute', top: '45px', right: '0', width: '300px', background: '#fff', borderRadius: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', overflow: 'hidden', border: '1px solid #f1f5f9', zIndex: 1100 };
const notiHeader = { padding: '15px 20px', background: '#f8fafc', fontWeight: 'bold', fontSize: '14px', borderBottom: '1px solid #f1f5f9' };
const notiBody = { maxHeight: '350px', overflowY: 'auto' };
const notiItem = { padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', transition: '0.2s', borderBottom: '1px solid #f8fafc' };
const notiIconCircle = { width: '35px', height: '35px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' };
const notiTextContainer = { flex: 1, display: 'flex', flexDirection: 'column' };
const notiItemTitle = { fontSize: '13px', fontWeight: 'bold', color: '#1e293b' };
const notiItemSub = { fontSize: '11px', color: '#94a3b8' };

const mainBody = { padding: "140px 24px 100px", maxWidth: "1200px", margin: "0 auto" };
const welcomeHeader = { marginBottom: "30px", background: '#fff', padding: '25px', borderRadius: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const rocketIcon = { fontSize: '35px', color: '#6366f1', opacity: 0.7 };

const cardGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 25 };
const cardBase = { position: "relative", borderRadius: "35px", padding: "35px", color: "#fff", cursor: "pointer", height: "200px", display: "flex", flexDirection: "column", justifyContent: "space-between" };
const cardIconBox = { fontSize: 40, opacity: 0.9 };
const cardBodyStyle = { zIndex: 2 };
const cardMainTitle = { fontSize: 22, fontWeight: 800 };
const cardLinkText = { fontSize: 12, background: 'rgba(255,255,255,0.2)', padding: '5px 10px', borderRadius: '10px' };
const miniNoticeBadge = { position: "absolute", top: "20px", right: "20px", background: "white", color: "#ef4444", padding: "5px 10px", borderRadius: "10px", fontSize: "10px", fontWeight: "900" };

const sideDrawer = { position: "fixed", top: 0, left: 0, bottom: 0, width: 280, background: "#0f172a", zIndex: 2001, padding: "40px 25px" };
const sideOverlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(8px)", zIndex: 2000 };
const drawerHeader = { display: "flex", alignItems: "center", gap: 15, marginBottom: 40 };
const drawerLogo = { width: 45, height: 45, background: theme.gradients.primary, borderRadius: "14px", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 };
const drawerNav = { display: "flex", flexDirection: "column", gap: 10 };
const drawerLinkStyle = (active) => ({ display: "flex", alignItems: "center", gap: 15, padding: "16px 20px", borderRadius: "18px", textDecoration: "none", color: active ? "white" : "#94a3b8", background: active ? "#6366f1" : "transparent", fontWeight: active ? 700 : 500 });
const logoutBtnStyle = { display: "flex", alignItems: "center", gap: 15, padding: "16px 20px", borderRadius: "18px", color: "#ef4444", cursor: 'pointer', marginTop: '20px', fontWeight: 'bold' };

const mobileBar = { position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: '#1e293b', padding: '15px 30px', borderRadius: '50px', display: 'flex', gap: '40px', color: 'white', fontSize: '22px', zIndex: 1000, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' };

const feeModalOverlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(5px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, padding: '20px' };
const feeRectCard = { display: 'flex', width: '100%', maxWidth: '500px', background: '#fff', borderRadius: '30px', overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.2)' };
const feeLeftAccent = { width: '80px', background: theme.gradients.danger, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' };
const feeRightContent = { flex: 1, padding: '30px' };
const feeAmountBox = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: '#fff1f2', borderRadius: '15px', marginTop: '10px' };
const feePayBtnNew = { flex: 1, padding: '12px', border: 'none', borderRadius: '12px', background: '#1e293b', color: '#fff', fontWeight: 'bold', cursor: 'pointer' };
const feeLaterBtn = { padding: '12px', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'transparent', color: '#64748b', cursor: 'pointer' };

const overlayStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)", zIndex: 5000, display: "flex", alignItems: "center", justifyContent: "center", padding: '20px' };
const bigRectContainer = { width: '100%', maxWidth: '450px', background: '#fff', borderRadius: '30px', overflow: 'hidden' };
const modalTopBar = { background: '#f8fafc', padding: '15px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' };
const modalMainContent = { padding: '30px', textAlign: 'center' };
const bigRectPhoto = { width: '160px', height: '160px', borderRadius: '25px', objectFit: 'cover', marginBottom: '20px', border: '4px solid #6366f1' };
const modalDetails = { textAlign: 'center' };
const badgeRow = { display: 'flex', justifyContent: 'center', gap: '10px', margin: '15px 0' };
const infoBadge = { background: '#f1f5f9', padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '5px' };
const modalQuotes = { fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', margin: '20px 0' };
const modalDoneBtn = { width: '100%', padding: '14px', border: 'none', background: theme.gradients.primary, color: 'white', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' };

export default StudentDashboard;