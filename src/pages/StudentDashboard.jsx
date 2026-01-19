import React, { useState, useEffect } from "react";
import { Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import {
  FaClipboardCheck, FaMoneyBillWave, FaChartLine, FaBook,
  FaComments, FaUserGraduate, FaHome, FaUserAlt,
  FaBookOpen, FaBars, FaTimes, FaExclamationTriangle,
  FaSignOutAlt, FaRocket, FaBell, FaIdCard, FaGraduationCap, 
  FaChevronRight, FaTasks, FaQuoteLeft, FaStar, FaCalendarAlt, FaLightbulb,
  FaCheckCircle
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

const quotes = [
  "Success is not final, failure is not fatal.",
  "Your education is a dress rehearsal for a life that is yours to lead.",
  "Believe you can and you're halfway there.",
  "The beautiful thing about learning is that no one can take it away from you.",
  "Hard work beats talent when talent doesn't work hard.",
  "Dream big, start small, but most importantly, start.",
  "Every expert was once a beginner.",
  "The harder you work for something, the greater you’ll feel when you achieve it.",
  "Mistakes are proof that you are trying, keep going.",
  "Push yourself, because no one else is going to do it for you.",
  "Consistency is what transforms average into excellence.",
  "Learning is a treasure that will follow its owner everywhere.",
  "Your effort today shapes the person you’ll become tomorrow.",
  "Stay focused, stay humble, and trust your journey.",
  "Opportunities don’t happen, you create them."
];

// 🔥 AUTO CHANGING STUDY IMAGES
const studyImages = [
  "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b",
  "https://mekreview.com/wp-content/uploads/2019/05/teenage-students-in-high-school-hall-talking-PB585ER-1.jpg",
  "https://tse1.mm.bing.net/th/id/OIP.gqiK28Dtq3SXtx6HwsjlQgHaDt?rs=1&pid=ImgDetMain&o=7&rm=3",
  "https://www.pinkvilla.com/english/images/2023/04/944963614_shutterstock_695057260_1280*720.jpg",
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b",
  "https://thumbs.dreamstime.com/z/child-writes-success-depends-you-portrait-little-boy-text-isolated-white-background-77462448.jpg",
  "https://images.unsplash.com/photo-1513258496099-48168024aec0",
  "https://img.freepik.com/premium-vector/best-studenteditable-text-effect_606736-748.jpg",
  "https://images.unsplash.com/photo-1491841550275-ad7854e35ca6",
  "https://images.unsplash.com/photo-1509062522246-3755977927d7",
];

/* =========================
   NEW: NOTIFICATION MODAL
========================= */
const NotificationModal = ({ isOpen, onClose, notifications, navigate }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={overlayStyle} onClick={onClose}>
        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} style={notiModalContainer} onClick={(e) => e.stopPropagation()}>
          <div style={modalTopBar}>
            <span style={{ fontWeight: 'bold', fontSize: '18px' }}>Pending Updates</span>
            <FaTimes onClick={onClose} style={{ cursor: 'pointer' }} />
          </div>
          <div style={{ padding: '15px', maxHeight: '400px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                <FaCheckCircle fontSize="40px" style={{ marginBottom: '10px', color: '#10b981' }} />
                <p>Every Details is up to date!</p>
              </div>
            ) : (
              notifications.map((n, i) => (
                <div key={i} style={notiItemStyle} onClick={() => { navigate(n.path); onClose(); }}>
                  <div style={{ ...notiIconCircle, background: n.color }}>{n.icon}</div>
                  <div style={{ flex: 1 }}>
                    <h5 style={{ margin: 0, fontSize: '14px', color: '#1e293b' }}>{n.title}</h5>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{n.desc}</p>
                  </div>
                  <FaChevronRight style={{ fontSize: '10px', color: '#cbd5e1' }} />
                </div>
              ))
            )}
          </div>
          <button onClick={onClose} style={{ ...modalDoneBtn, borderRadius: '0 0 25px 25px' }}>Close</button>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

/* =========================
   UI COMPONENTS
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
                    <button onClick={onClose} style={feeLaterBtn}>Later</button>
                </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/* =========================
   DASHBOARD HOME
========================= */
const DashboardHome = ({ navigate, isFeeUnpaid, pendingTasks, user }) => {
  const [greeting, setGreeting] = useState("");
  const [randomQuote, setRandomQuote] = useState("");
  const [showTaskAlert, setShowTaskAlert] = useState(pendingTasks > 0);
  const [imgIndex, setImgIndex] = useState(0);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
    setRandomQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  }, []);
  useEffect(() => {
  const interval = setInterval(() => {
    setImgIndex(prev => (prev + 1) % studyImages.length);
  }, 9000);

  return () => clearInterval(interval);
}, []);

  const cards = [
    { title: "Attendance", icon: <FaClipboardCheck />, path: "attendance", grad: theme.gradients.success, sub: "Check Records" },
    { title: "Fees", icon: <FaMoneyBillWave />, path: "fees", grad: theme.gradients.warning, showNotice: isFeeUnpaid, sub: "Finance Hub" },
    { title: "Marks", icon: <FaChartLine />, path: "marks", grad: theme.gradients.info, sub: "Analytics" },
    { title: "Tasks", icon: <FaTasks />, path: "task-update", grad: theme.gradients.primary, count: pendingTasks, sub: "Assignments" },
    { title: "Study Vault", icon: <FaBookOpen />, path: "study-material", grad: theme.gradients.dark, sub: "E-Books/Notes" },
    { title: "Feedback", icon: <FaComments />, path: "feedback", grad: theme.gradients.purple, sub: "Tell us more" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <AnimatePresence>
        {showTaskAlert && pendingTasks > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            style={taskAlertBar}
          >
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <div style={alertIconBox}><FaTasks /></div>
              <span style={{fontSize: '13px', fontWeight: '600'}}>You have {pendingTasks} pending tasks!</span>
            </div>
            <FaTimes style={{cursor: 'pointer', opacity: 0.7}} onClick={() => setShowTaskAlert(false)} />
          </motion.div>
        )}
      </AnimatePresence>

 <div 
 style={modernWelcomeStyle(studyImages[imgIndex])}>


        <div style={{ zIndex: 2, flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '26px', fontWeight: 900 }}>{greeting}, {user?.name?.split(" ")[0]}!</h2>
            <div style={quoteContainer}>
                <FaQuoteLeft style={{fontSize: '10px', color: '#6366f1', marginBottom: '5px'}} />
                <p style={quoteTextStyle}>{randomQuote}</p>
            </div>
           <div style={statusPillRow}>
  <span style={statusPill}>
    <FaStar color="#62ff00" style={{ fontWeight: 'bold' }} /> 
    <span style={{ color: '#000000', marginLeft: '6px' }}>Pro Student</span>
  </span>

  <span style={statusPill}>
    <FaCalendarAlt color="#0c0fc7" /> 
    <span style={{ color: '#000000', marginLeft: '6px' }}>Class {user.class}</span>
  </span>
</div>

        </div>
        

      </div>

      <div style={cardGrid}>
        {cards.map((c, i) => (
          <motion.div key={i} whileHover={{ y: -8, scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => navigate(c.path)} style={{ ...cardBase, background: c.grad }}>
            {c.showNotice && <div style={miniNoticeBadge}>PAYMENT DUE</div>}
            {c.count > 0 && <div style={miniNoticeBadge}>{c.count} PENDING</div>}
            
            <div style={cardTopRow}>
                <div style={iconCircle}>{c.icon}</div>
                <FaChevronRight style={{opacity: 0.5}} />
            </div>

            <div style={cardBottomBody}>
              <h3 style={cardMainTitle}>{c.title}</h3>
              <p style={{margin: 0, fontSize: '11px', opacity: 0.8}}>{c.sub}</p>
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
  const [isNotiOpen, setIsNotiOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user")) || { id: 101, name: "Student", class: "10th" };
    setUser(storedUser);

    const fetchData = async () => {
      try {
        let activeNotis = [];

        // 1. Photo Fetch Logic Fix
        const photoRes = await axios.get(`${API_URL}/api/students/${storedUser.id}/profile-photo`);
        let currentPhoto = "/default-profile.png";
        if (photoRes.data.success && photoRes.data.user?.profile_photo) {
          currentPhoto = photoRes.data.user.profile_photo;
          setUser(prev => ({ ...prev, photo: currentPhoto }));
        }

        // 2. Fetch Tasks
        const taskRes = await axios.get(`${API_URL}/api/assignments/class/${storedUser.class}/${storedUser.id}`);
        if (taskRes.data.success) {
           const count = taskRes.data.assignments.filter(t => t.status !== "SUBMITTED").length;
           setPendingTasks(count);
           if (count > 0) {
             activeNotis.push({ title: "Tasks Pending", desc: `You have ${count} assignments left.`, icon: <FaTasks />, path: "task-update", color: '#6366f1' });
           }
        }

        // 3. Fetch Fees
        const feeRes = await axios.get(`${API_URL}/api/fees/student/${storedUser.id}`);
        if (feeRes.data.success) {
          const feesData = feeRes.data.fees;
          if (feesData.length > 0) {
              const sorted = [...feesData].sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
              setDynamicFeeAmount(sorted[0]?.amount || "500");
          }
          const paidThisMonth = feesData.some(f => new Date(f.payment_date).getMonth() === new Date().getMonth());
          if (!paidThisMonth) { 
            setIsFeeUnpaid(true); 
            setShowFeePopup(true); 
            activeNotis.push({ title: "Fees Pending", desc: "This month's fee is due.", icon: <FaMoneyBillWave />, path: "fees", color: '#f59e0b' });
          }
        }

        // 4. Fetch Marks & "Seen" logic
        const marksRes = await axios.get(`${API_URL}/api/marks/student/${storedUser.id}`);
        if(marksRes.data.success) {
            const currentMarksCount = marksRes.data.marks.length;
            const lastSeenMarks = localStorage.getItem(`lastMarksCount_${storedUser.id}`) || 0;
            
            if (currentMarksCount > parseInt(lastSeenMarks)) {
              activeNotis.push({ title: "New Marks", desc: "Your gradebook has been updated.", icon: <FaChartLine />, path: "marks", color: '#10b981' });
            }
        }

        setNotifications(activeNotis);
      } catch (err) { console.error(err); }
    };
    fetchData();
  }, []);

  // Update marks 'seen' status when visiting marks page
  useEffect(() => {
    if (location.pathname.includes('marks') && user) {
       axios.get(`${API_URL}/api/marks/student/${user.id}`).then(res => {
         if(res.data.success) {
           localStorage.setItem(`lastMarksCount_${user.id}`, res.data.marks.length);
           setNotifications(prev => prev.filter(n => n.path !== 'marks'));
         }
       });
    }
  }, [location.pathname, user]);

  if (!user) return null;

  return (
    <div style={masterWrapper}>
      <header style={headerWrapper}>
        <div style={headerContent}>
          <div style={headerLeft}>
            <div style={iconBtnStyle} onClick={() => setSidebarOpen(true)}><FaBars /></div>
            <h1 style={brandLogo}>𝐒mart𝐙one</h1>
          </div>
          <div style={headerRight}>
             <div style={notiBox} onClick={() => setIsNotiOpen(true)}>
                <FaBell />
                {notifications.length > 0 && <span style={redBadge}>{notifications.length}</span>}
             </div>
            <div style={profileTrigger} onClick={() => setIsPhotoOpen(true)}>
              <img src={user.photo || "/default-profile.png"} style={headerAvatar} alt="user" />
            </div>
          </div>
        </div>
      </header>

      <NotificationModal 
        isOpen={isNotiOpen} 
        onClose={() => setIsNotiOpen(false)} 
        notifications={notifications} 
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
                <h4 style={{ color: "white", margin: 0 }}>SmartZone Portal</h4>
              </div>
              <nav style={drawerNav}>
                {[
                  { name: "Terminal", path: "/student", icon: <FaHome /> },
                  { name: "Profile", path: "profile", icon: <FaUserAlt /> },
                  { name: "Assignments", path: "task-update", icon: <FaTasks /> },
                  { name: "Accounts", path: "fees", icon: <FaMoneyBillWave /> },
                  { name: "Attendance", path: "attendance", icon: <FaClipboardCheck /> },
                  { name: "Gradebook", path: "marks", icon: <FaChartLine /> },
                  { name: "Study Lab", path: "study-material", icon: <FaBookOpen /> },
                  { name: "Connect", path: "chat", icon: <FaComments /> },
                ].map((item, idx) => (
                  <Link key={idx} to={item.path} onClick={() => setSidebarOpen(false)} style={drawerLinkStyle(location.pathname.includes(item.path))}>
                    {item.icon} {item.name}
                  </Link>
                ))}
                <div style={logoutBtnStyle} onClick={() => {localStorage.clear(); window.location.reload();}}>
                   <FaSignOutAlt /> Terminate Session
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
   STYLING
========================= */
const masterWrapper = { minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter', sans-serif", color: "#1e293b" };
const headerWrapper = { position: "fixed", top: 15, left: 0, width: "100%", zIndex: 1000, display: "flex", justifyContent: "center", padding: "0 15px" };
const headerContent = { width: "100%", maxWidth: "1100px", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(15px)", borderRadius: "20px", padding: "8px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 10px 25px rgba(0,0,0,0.05)", border: "1px solid rgba(255,255,255,0.3)" };
const brandLogo = { margin: 0, fontSize: 20, fontWeight: 900, background: theme.gradients.primary, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" };
const headerAvatar = { width: 38, height: 38, borderRadius: "12px", border: "2px solid #6366f1", objectFit: "cover" };
const headerRight = { display: "flex", alignItems: "center", gap: 12 };
const headerLeft = { display: "flex", alignItems: "center", gap: 12 };
const iconBtnStyle = { cursor: "pointer", color: "#6366f1", background: "#f1f5f9", padding: "10px", borderRadius: "10px" };

// NOTIFICATION MODAL STYLES
const notiModalContainer = { width: '100%', maxWidth: '380px', background: '#fff', borderRadius: '25px', overflow: 'hidden' };
const notiItemStyle = { display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' };
const notiIconCircle = { width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' };
const imageBox = {
  width: '70px',
  height: '70px',
  borderRadius: '16px',
  overflow: 'hidden',
  border: '2px solid #6366f1',
};

const studyImg = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const taskAlertBar = { background: '#fffbeb', border: '1px solid #fef3c7', padding: '12px 20px', borderRadius: '18px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#92400e', overflow: 'hidden' };
const alertIconBox = { width: '30px', height: '30px', background: '#fef3c7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const modernWelcomeStyle = (img) => ({
  position: 'relative',
  width: '100%',
  minHeight: '450px',
  padding: '30px 20px',
  borderRadius: '20px',
  marginBottom: '20px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
  alignItems: 'flex-start',
  boxShadow: '0 14px 25px rgba(0,0,0,0.1)',
  border: '1px solid #e2e8f0',
  color: '#fff',
  backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${img})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat'
});



const quoteContainer = { marginTop: '10px' };
const quoteTextStyle = { margin: 0, fontSize: '13px', color: '#ffffff', fontStyle: 'italic', lineHeight: '1.4' };
const statusPillRow = { display: 'flex', gap: '8px', marginTop: '15px' };
const statusPill = { background: '#f8fafc', padding: '4px 12px', borderRadius: '20px', fontSize: '10px', fontWeight: 'bold', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '5px' };
const cardGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 15 };
const cardBase = { position: "relative", borderRadius: "24px", padding: "20px", color: "#fff", cursor: "pointer", minHeight: "160px", display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: '0 10px 20px rgba(0,0,0,0.1)' };
const cardTopRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' };
const iconCircle = { width: '45px', height: '45px', background: 'rgba(255,255,255,0.2)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' };
const cardMainTitle = { margin: '0', fontSize: '18px', fontWeight: '800' };
const cardBottomBody = { display: 'flex', flexDirection: 'column', gap: '2px' };
const mainBody = { padding: "110px 1px 20px", maxWidth: "1100px", margin: "0 auto" };
const miniNoticeBadge = { position: "absolute", top: "15px", right: "15px", background: "#fff", color: "#ef4444", padding: "4px 8px", borderRadius: "8px", fontSize: "9px", fontWeight: "900" };
const sideDrawer = { position: "fixed", top: 0, left: 0, bottom: 0, width: 260, background: "#0f172a", zIndex: 2001, padding: "30px 20px" };
const sideOverlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(5px)", zIndex: 2000 };
const drawerHeader = { display: "flex", alignItems: "center", gap: 12, marginBottom: 35 };
const drawerLogo = { width: 40, height: 40, background: theme.gradients.primary, borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: 'white' };
const drawerNav = { display: "flex", flexDirection: "column", gap: 8 };
const drawerLinkStyle = (active) => ({ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderRadius: "14px", textDecoration: "none", color: active ? "white" : "#94a3b8", background: active ? "#6366f1" : "transparent", fontWeight: 600, fontSize: '14px' });
const logoutBtnStyle = { marginTop: '30px', padding: '14px 18px', color: '#f87171', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' };
const mobileBar = { position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: '#0f172a', padding: '12px 30px', borderRadius: '40px', display: 'flex', gap: '35px', color: 'white', fontSize: '20px', zIndex: 1000, boxShadow: '0 10px 30px rgba(0,0,0,0.4)' };
const overlayStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)", zIndex: 5000, display: "flex", alignItems: "center", justifyContent: "center", padding: '20px' };
const bigRectContainer = { width: '100%', maxWidth: '400px', background: '#fff', borderRadius: '25px', overflow: 'hidden' };
const modalTopBar = { background: '#f8fafc', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' };
const modalMainContent = { padding: '25px', textAlign: 'center' };
const bigRectPhoto = { width: '140px', height: '140px', borderRadius: '20px', objectFit: 'cover', marginBottom: '15px', border: '3px solid #6366f1' };
const modalDetails = { textAlign: 'center' };
const badgeRow = { display: 'flex', justifyContent: 'center', gap: '8px', margin: '12px 0' };
const infoBadge = { background: '#f1f5f9', padding: '5px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '5px' };
const modalQuotes = { fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', margin: '15px 0' };
const modalDoneBtn = { width: '100%', padding: '12px', border: 'none', background: theme.gradients.primary, color: 'white', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' };
const feeModalOverlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(5px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, padding: '20px' };
const feeRectCard = { display: 'flex', width: '100%', maxWidth: '450px', background: '#fff', borderRadius: '25px', overflow: 'hidden' };
const feeLeftAccent = { width: '70px', background: theme.gradients.danger, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' };
const feeRightContent = { flex: 1, padding: '25px' };
const feeAmountBox = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#fff1f2', borderRadius: '12px' };
const feePayBtnNew = { flex: 1, padding: '10px', border: 'none', borderRadius: '10px', background: '#1e293b', color: '#fff', fontWeight: 'bold' };
const feeLaterBtn = { padding: '10px', border: '1px solid #e2e8f0', borderRadius: '10px', background: 'transparent' };
const notiBox = { position: 'relative', fontSize: '20px', color: '#94a3b8', cursor: 'pointer', padding: '5px' };
const redBadge = { position: 'absolute', top: 0, right: 0, background: '#ef4444', color: 'white', fontSize: '9px', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' };
const profileTrigger = { cursor: 'pointer' };

export default StudentDashboard;