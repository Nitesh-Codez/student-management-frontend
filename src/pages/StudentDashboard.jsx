import React, { useState, useEffect, useCallback } from "react";
import { Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import {
  FaClipboardCheck, FaMoneyBillWave, FaChartLine,
  FaComments, FaUserGraduate, FaHome, FaUserAlt,
  FaBars, FaTimes, FaExclamationTriangle,
  FaSignOutAlt, FaBell, FaIdCard, FaGraduationCap, 
  FaChevronRight, FaTasks, FaQuoteLeft, FaStar, FaCalendarAlt,
  FaCheckCircle, FaBookOpen
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

// Sub-Components
import StudentAttendance from "./StudentAttendance";
import StudentFees from "./StudentFees";
import StudentsMarks from "./StudentsMarks";
import StudentProfile from "./StudentProfile";
import StudentStudyMaterial from "./StudentStudyMaterial";
import StudentPage from "./StudentPage";
import StudentFeedback from "./StudentFeedback";
import StudentChat from "./StudentChat";
import ApplyCorrection from "./ApplyCorrection";
/*============Record previous classes=============*/
import StudentResult from "./Results_details/StudentResult";
import ViewResults from "./Results_details/ViewResults";
import StudentQuizDashboard from "./StudentQuizDashboard";
import AttemptQuizPage from "./AttemptQuizPage";


// Examination Components
import ExamForm from "./Examination/ExamForm";
import GenerateAdmitCard from "./Examination/GenerateAdmitCard";
import ExaminationResult from "./Examination/ExaminationResult";

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
  "Believe you can and you're halfway there.",
  "The beautiful thing about learning is that no one can take it away from you.",
  "Every expert was once a beginner.",
  "Push yourself, because no one else is going to do it for you.",
];

const studyImages = [
  "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b",
  "https://mekreview.com/wp-content/uploads/2019/05/teenage-students-in-high-school-hall-talking-PB585ER-1.jpg",
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b",
  "https://images.unsplash.com/photo-1509062522246-3755977927d7",
];


/* =========================
   UI COMPONENTS (MODALS)
========================= */
const NotificationModal = ({ isOpen, onClose, notifications, navigate }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={overlayStyle} onClick={onClose}>
        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} style={notiModalContainer} onClick={(e) => e.stopPropagation()}>
          <div style={modalTopBar}>
            <span style={{ fontWeight: 'bold', fontSize: '18px' }}>Updates & Alerts</span>
            <FaTimes onClick={onClose} style={{ cursor: 'pointer' }} />
          </div>
          <div style={{ padding: '15px', maxHeight: '400px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                <FaCheckCircle fontSize="40px" style={{ marginBottom: '10px', color: '#10b981' }} />
                <p>Everything is up to date!</p>
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
          <button onClick={onClose} style={modalDoneBtn}>Close</button>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

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
                <p style={modalQuotes}>"Education is the premise of progress, in every society, in every family."</p>
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
                <p style={{fontSize: '13px', color: '#64748b', margin: '8px 0'}}>Previous month fee is pending.</p>
                <div style={feeAmountBox}>
                    <span>Amount Due:</span>
                    <span style={{fontSize: '18px', fontWeight: '900', color: '#ef4444'}}>₹{amount}</span>
                </div>
                <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
                    <button onClick={handlePayNow} style={feePayBtnNew}>Pay Now</button>
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
const DashboardHome = ({ navigate, isFeeUnpaid, pendingTasks, isFeedbackPending, user, hasNewMarks, todayClasses,setTodayClasses, dynamicFeeAmount  }) => {
 
  const [greeting, setGreeting] = useState("");
  const [randomQuote, setRandomQuote] = useState("");
  const [imgIndex, setImgIndex] = useState(0);
  const [showTaskAlert, setShowTaskAlert] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [headTeacher, setHeadTeacher] = useState(null);
  useEffect(() => {
  axios
    .get("https://student-management-system-4-hose.onrender.com/api/teachers/admin/teachers")
    .then((res) => {
      if (res.data.length > 0) {
        setHeadTeacher(res.data[1]); // first teacher = head
      }
    })
    .catch((err) => console.log(err));
}, []);

  const [attendanceStats, setAttendanceStats] = useState({
present: 0,
total: 0,
percentage: 0,
today: "Not Marked",
records:[]
});

const getPollColor = (classDate) => {

 const rec = attendanceStats.records.find(a =>
   new Date(a.date).toDateString() === new Date(classDate).toDateString()
 );

 if (!rec) return "#3b82f6";      // Not Marked
 if (rec.status === "Present") return "#22c55e";
 if (rec.status === "Absent") return "#ef4444";

 return "#0e6bff";
};



const fetchAttendance = useCallback(async () => {
  if (!user?.id) return;

  try {
    const res = await axios.get(`${API_URL}/api/attendance/${user.id}`);

    if (res.data.success) {
      const data = res.data.attendance;

      const todayStr = new Date().toDateString();

      // Find today's record
      const todayRec = data.find(
        a => new Date(a.date).toDateString() === todayStr
      );

      const [currentYear, currentMonth] = [
        new Date().getFullYear(),
        new Date().getMonth() + 1
      ];

      // Filter data for current month & year
      let monthData = data.filter(a => {
        const d = new Date(a.date);
        return d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth;
      });

      // Add today if not present
      if (!todayRec) {
        const newToday = { date: new Date().toISOString(), status: "Not Marked", isToday: true };
        monthData.push(newToday);
      } else {
        monthData = monthData.map(rec =>
          new Date(rec.date).toDateString() === todayStr
            ? { ...rec, isToday: true }
            : rec
        );
      }

      // Count present & total days, skipping holidays
      const validDays = monthData.filter(
        a => a.status === "Present" || a.status === "Absent"
      );
      const presentDays = validDays.filter(a => a.status === "Present");

      const percent = validDays.length === 0
        ? 0
        : ((presentDays.length / validDays.length) * 100).toFixed(1);

      setAttendanceStats({
        present: presentDays.length,
        total: validDays.length,
        percentage: percent,
        today: todayRec ? todayRec.status : "Not Marked",
        records: monthData
      });
    }
  } catch (err) {
    console.log("Fetch error:", err);
  }
}, [user]);

useEffect(() => {
  fetchAttendance();
}, [fetchAttendance]);

  // 2. Schedule Fetch karne ka main function
  const fetchTodaySchedule = useCallback(async () => {

  if (!user?.class) return;

  try {
    const date = selectedDate.toISOString().split("T")[0];

    const res = await axios.get(
      `${API_URL}/api/teacher-assignments/student/${user.class}/${date}`
    );

    if (res.data.success) {
      setTodayClasses(res.data.assignments);
    }

  } catch (err) {
    console.error("Schedule error:", err.response?.data || err.message);
  }

}, [user, selectedDate, setTodayClasses]);

  // 3. SINGLE useEffect - Jo date aur user dono pe chale
 useEffect(() => {
  fetchTodaySchedule();
}, [fetchTodaySchedule]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
    setRandomQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    
    const interval = setInterval(() => {
      setImgIndex(prev => (prev + 1) % studyImages.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
    setRandomQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    
    const interval = setInterval(() => {
      setImgIndex(prev => (prev + 1) % studyImages.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const cards = [
    { title: "Attendance", icon: <FaClipboardCheck />, path: "attendance", grad: theme.gradients.success, sub: "Daily Records" },
    { title: "Fees", icon: <FaMoneyBillWave />, path: "fees", grad: theme.gradients.warning, showNotice: isFeeUnpaid, sub: "Finance Status" },
    { title: "Marks", icon: <FaChartLine />, path: "marks", grad: theme.gradients.info, showNotice: hasNewMarks, sub: "Performance" },
    { title: "Tasks", icon: <FaTasks />, path: "task-update", grad: theme.gradients.primary, count: pendingTasks, sub: "Assignments" },
    { title: "Study Lab", icon: <FaBookOpen />, path: "study-material", grad: theme.gradients.dark, sub: "Library" },
    { title: "Feedback", icon: <FaStar />, path: "feedback", grad: theme.gradients.purple, showNotice: isFeedbackPending, sub: "Monthly Review" },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {pendingTasks > 0 && showTaskAlert && (
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={taskAlertBar}>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <div style={{ width: '30px', height: '30px', background: '#fef3c7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaTasks />
            </div>
            <span style={{fontSize: '14px', fontWeight: '600'}}>You have {pendingTasks} tasks pending!</span>
          </div>
          <button onClick={() => setShowTaskAlert(false)} style={alertActionBtn}>
            <FaTimes size={10} />
          </button>
        </motion.div>
      )}

      <div style={modernWelcomeStyle(studyImages[imgIndex])}>
        <div style={{ zIndex: 2 }}>
            <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 900 }}>{greeting}, {user?.name?.split(" ")[0]}!</h2>
            <div style={quoteContainer}>
                <FaQuoteLeft style={{fontSize: '12px', color: '#fff', opacity: 0.8, marginBottom: '5px'}} />
                <p style={quoteTextStyle}>{randomQuote}</p>
            </div>
            <div style={statusPillRow}>
              <span style={statusPill}><FaStar color="#f59e0b" /> Pro Learner</span>
              <span style={statusPill}><FaCalendarAlt /> Class {user.class}</span>
            </div>
        </div>
      </div>
      

      <div style={cardGrid}>
        {cards.map((c, i) => (
          <motion.div
 key={i}
 whileTap={{ scale: 0.95 }}
 onClick={() => navigate(c.path)}
 style={{
   ...cardBase,
   background: c.grad,
   overflow: c.title === "Fees" ? "visible" : "hidden"
 }}
>
            {c.title === "Fees" && isFeeUnpaid && (
  <div style={feeNoticeBox}>
    <div style={{ fontSize: "15px", fontWeight: "900" }}>
      ⚠ PAYMENT NOTICE
    </div>

    <div style={{ fontSize: "12px", marginTop: "6px" }}>
      Your monthly fee is pending.
    </div>

    <div style={{ marginTop: "6px", fontWeight: "bold" }}>
      Amount Due : ₹{dynamicFeeAmount}
    </div>

    <div style={{ fontSize: "10px", opacity: 0.8, marginTop: "4px" }}>
      Please clear dues to avoid interruption.
    </div>
  </div>
)}

{c.title === "Marks" && hasNewMarks && (
  <div style={miniNoticeBadge}>CHECK NOW</div>
)}

            {c.count > 0 && <div style={miniNoticeBadge}>{c.count} NEW</div>}
            <div style={cardTopRow}>
                <div style={iconCircle}>{c.icon}</div>
                <FaChevronRight style={{opacity: 0.5}} />
            </div>
            <div style={cardBottomBody}>

 {c.title === "Attendance" && (
  <div style={{
    display:'flex',
    alignItems:'center',
    
    gap:'12px',
    marginBottom:'10px'
  }}>

    <div style={{
      width:'105px',
      height:'105px',
      borderRadius:'50%',
      background:`conic-gradient(${attendanceStats.percentage >= 85 ? "#15ae4d" : attendanceStats.percentage >= 75 ? "#facc15" : "#ef4444"} ${attendanceStats.percentage * 3.6}deg,#ffffff33 0deg)`,
      display:'flex',
      border:'1px solid white',
      alignItems:'center',
      justifyContent:'center'
    }}>

      <div style={{
        width:'60px',
        height:'60px',
        borderRadius:'50%',
        background:'rgba(0,0,0,0.35)',
        display:'flex',
        alignItems:'center',
        justifyContent:'center',
        border:'1px solid white',
        fontSize:'11px',
        fontWeight:'bold'
      }}>
        {attendanceStats.percentage}%
      </div>

    </div>

    <div style={{fontSize:'15px'}}>
      <b>{attendanceStats.present}/{attendanceStats.total}</b>
      
    </div>

  </div>
)}


  <h3 style={cardMainTitle}>{c.title}</h3>

  <p style={{margin: 0, fontSize: '11px', opacity: 0.11}}>
    {c.sub}
  </p>

</div>

          </motion.div>
        ))}
      </div>
 {/* Today's Schedule Section */}
<div style={{ 
    width: '100%', 
    maxWidth: '1400px', 
    margin: '20px auto', 
    backgroundColor: '#fff', 
    borderRadius: '8px', 
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
    border: '1px solid #e1e8ed'
}}>
  
  {/* TOP TITLE BAR - Amizone Style */}
  <div style={{ 
      padding: '12px 15px', 
      backgroundColor: '#f5f7f9', 
      borderBottom: '1px solid #e1e8ed',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
  }}>
    <h2 style={{ margin: 0, fontSize: '18px', color: '#34495e', fontWeight: 'bold' }}>My Classes</h2>
  </div>

  {/* CONTROLS BAR */}
  <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: '12px 15px', 
      backgroundColor: '#fff'
  }}>
    <div style={{ display: 'flex', border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden' }}>
      <button 
        onClick={() => {
          const prev = new Date(selectedDate);
          prev.setDate(prev.getDate() - 1);
          setSelectedDate(prev);
        }}
        style={{ ...navBtnStyle, border: 'none', borderRight: '1px solid #ccc', borderRadius: 0, padding: '5px 12px', background: '#fff' }}
      >◀</button>
      <button 
        onClick={() => {
          const next = new Date(selectedDate);
          next.setDate(next.getDate() + 1);
          setSelectedDate(next);
        }}
        style={{ ...navBtnStyle, border: 'none', borderRight: '1px solid #ccc', borderRadius: 0, padding: '5px 12px', background: '#fff' }}
      >▶</button>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <button style={{ ...navBtnStyle, border: 'none', borderRadius: 0, padding: '5px 12px', background: '#fff' }}>📅</button>
        <input 
          type="date" 
          value={selectedDate.toISOString().split('T')[0]}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
          style={{
            position: 'absolute', top: 0, left: 0, opacity: 0, 
            width: '100%', height: '100%', cursor: 'pointer'
          }}
        />
      </div>
    </div>
    
    <div style={{ fontSize: '18px', color: '#333', fontWeight: '400', flex: 1, textAlign: 'center' }}>
      {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
    </div>
    <div style={{ width: '80px', display: 'none' }}></div> 
  </div>

  {/* DAY HEADER */}
  <div style={{ 
      padding: '10px 15px', 
      backgroundColor: '#fff', 
      borderTop: '1px solid #f1f1f1',
      borderBottom: '1px solid #f1f1f1', 
      fontWeight: 'bold', 
      color: '#000',
      fontSize: '15px'
  }}>
    {selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}
  </div>

  {/* Classes List */}
  <div style={{ width: '100%' }}>
    {todayClasses.length > 0 ? (
      todayClasses.map((cls, idx) => (
        <div key={idx} style={{ 
            display: 'flex', 
            padding: '15px', 
            borderBottom: '1px solid #eee',
            gap: '15px',
            alignItems: 'center'
        }}>
          {/* Time Slot */}
          <div style={{ 
              minWidth: '90px', 
              color: '#008ba3', 
              fontWeight: '500', 
              fontSize: '14px',
              textAlign: 'center'
          }}>
            {cls.start_time}<br/>-<br/>{cls.end_time}
          </div>

          

          {/* TEACHER PHOTO - Fixed Version */}
<div style={{ 
    width: '55px', 
    height: '55px', 
    borderRadius: '50%', 
    backgroundColor: '#f1f5f9', 
    overflow: 'hidden', 
    flexShrink: 0, 
    border: '1px solid #e2e8f0' 
}}>
  <img 
    src={
      cls.profile_photo 
      ? (cls.profile_photo.startsWith('http') 
          ? cls.profile_photo 
          : `https://student-management-system-4-hose.onrender.com/${cls.profile_photo}`)
      : `https://ui-avatars.com/api/?name=${cls.teacher_name || 'T'}&background=6366f1&color=fff`
    } 
    alt="Teacher" 
    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    onError={(e) => { 
        // Agar image path galat hua toh ye initials dikha dega
        e.target.src = `https://ui-avatars.com/api/?name=${cls.teacher_name || 'T'}&background=random`; 
    }}
  />
</div>

          {/* Class Details */}
          <div style={{ flex: 1 }}>
  {/* POLL RIGHT */}
<div style={{
width:'12px',
height:'12px',
borderRadius:'50%',
background: getPollColor(selectedDate),
boxShadow:'0 0 2px rgba(0,0,0,0.2)',
marginLeft: '110px',
marginTop:'30px',
}}/>
            <div style={{ fontWeight: 'bold', color: '#4b0082', fontSize: '14px', textTransform: 'uppercase' }}>
              {cls.subject_name}
            </div>
            <div style={{ fontSize: '13px', color: '#4b0082', marginTop: '2px' }}>
              {cls.teacher_name} <span style={{color: '#777'}}>[{cls.teacher_code || cls.teacher_id || 'ID'}]</span>
            </div>
            <div style={{ fontSize: '12px', color: '#4b0082', fontWeight: '500' }}>
              {cls.room_no || 'HOME'}
            </div>
          </div>
        </div>
      ))
    ) : (
      <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
        <p style={{ fontSize: '16px' }}>No classes scheduled for this day.</p>
      </div>
    )}


    


    
    
  </div>
  
</div>
{headTeacher && (
  <div style={{
    width: '100vw',
    position: 'relative',
    left: '50%',
    right: '50%',
    marginLeft: '-50vw',
    marginRight: '-50vw',
    backgroundColor: '#fff',
    padding: window.innerWidth < 768 ? '30px 0' : '60px 0',
    marginTop: '40px',
    borderTop: '1px solid #e2e8f0'
  }}>
    <div style={{
      maxWidth: '1100px',
      margin: '0 auto',
      padding: '0 25px',
      overflow: 'hidden' // Float clear karne ke liye
    }}>
      
      {/* SECTION HEADER */}
      <h2 style={{ 
        color: '#2d3785', 
        fontSize: window.innerWidth < 768 ? '22px' : '28px', 
        fontWeight: '900', 
        borderBottom: '3px solid #6366f1',
        paddingBottom: '12px',
        marginBottom: '30px',
        display: 'inline-block'
      }}>
        Message from the Desk of HOC
      </h2>

      <div style={{ width: '100%' }}>
        
        {/* RIGHT SIDE PHOTO: Floating technique for text wrap */}
        <div style={{ 
          float: 'right', 
          marginLeft: window.innerWidth < 768 ? '15px' : '40px',
          marginBottom: '15px',
          textAlign: 'center',
          width: window.innerWidth < 768 ? '140px' : '350px' // Controlled size
        }}>
          <div style={{
            width: '100%',
            aspectRatio: '1/1',
            borderRadius: '50%', // Circle shape
            overflow: 'hidden',
            // Fade style border
            border: '1px  rgba(99, 102, 241, 0.05)', 
            boxShadow: '0 0 0 1px rgba(99, 102, 241, 0.1), 0 10px 30px rgba(0,0,0,0.1)', 
            backgroundColor: '#f8fafc'
          }}>
            <img
              src={headTeacher.profile_photo || `https://ui-avatars.com/api/?name=${headTeacher.name}&background=2d3785&color=fff&size=512`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              alt="HOC Profile"
            />
          </div>
          <div style={{
            marginTop: '10px',
            fontSize: '10px',
            fontWeight: '900',
            color: '#10b981',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            Head of Tuition
          </div>
        </div>

        {/* TEXT AREA: Will wrap around the image */}
        <div style={{ 
          color: '#334155', 
          fontSize: window.innerWidth < 768 ? '15px' : '17px', 
          lineHeight: '1.7',
          textAlign: 'justify' // Professional look
        }}>
          
          <p style={{ marginBottom: '15px', fontWeight: '700', color: '#1e293b', fontSize: '18px' }}>
             I wish you a highly productive academic year ahead, filled with immense personal growth and learning.
          </p>

          <p style={{ marginBottom: '15px' }}>
            At <strong>SMART STUDENT CLASSES</strong>, we don't just teach subjects; we build character and competence. I truly appreciate the hard work and dedication our students show every day. It is your spirit that makes us the best.
          </p>

          <p style={{ marginBottom: '15px' }}>
            Our mission is to equip every student with the right tools and mindset to become a leader. With <strong>{headTeacher.experience_years}+ years</strong> of mentorship, I am proud that <strong>90% of our students consistently score above 90%</strong>. We appreciate your trust in our "Smart-Study" methodology to reach that 95%+ goal.
          </p>

          <p style={{ marginBottom: '20px', fontStyle: 'italic', color: '#64748b', fontWeight: '500' }}>
            "Your success is our greatest appreciation. Take care, stay disciplined, and keep striving for excellence."
          </p>

          {/* SIGNATURE SECTION */}
          <div style={{ marginTop: '30px', clear: window.innerWidth < 768 ? 'none' : 'both' }}>
            <p style={{ margin: '0', fontWeight: '600', color: '#475569' }}>All the best,</p>
            <h3 style={{ 
              margin: '5px 0 2px 0', 
              fontSize: window.innerWidth < 768 ? '20px' : '24px', 
              fontWeight: '900', 
              color: '#0f172a' 
            }}>
              {headTeacher.name}
            </h3>
            <p style={{ margin: '0', color: '#6366f1', fontWeight: '800', fontSize: '20px', letterSpacing: '1px' }}>
              HOC - SMART STUDENT CLASSES
            </p>
            <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>
              {headTeacher.qualification}
            </p>
          </div>
        </div>

      </div>
    </div>
  </div>
)}
    </motion.div>
    
  );
};


/* =========================
   STUDENT DASHBOARD MAIN
========================= */
const StudentDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [examOpen] = useState(false);
  const [pendingTasks, setPendingTasks] = useState(0);
// 1. Saari States ek saath
  const [isFeeUnpaid, setIsFeeUnpaid] = useState(false);
  const [isFeedbackPending, setIsFeedbackPending] = useState(false);
  const [hasNewMarks, setHasNewMarks] = useState(false);
  const [showFeePopup, setShowFeePopup] = useState(false);
  const [dynamicFeeAmount, setDynamicFeeAmount] = useState("500");
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  const [isNotiOpen, setIsNotiOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [todayClasses, setTodayClasses] = useState([]);
 const [openFolder, setOpenFolder] = useState(null);
   // Ab jab bhi date ya user badlega, ye fetch karega
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if(!storedUser) { navigate("/"); return; }
    setUser(storedUser);
    

    const fetchData = async () => {
      try {
        let activeNotis = [];
        const today = new Date();
        const currentMonth = today.getMonth() === 0 ? 12 : today.getMonth(); 
        const currentYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();

        const photoRes = await axios.get(`${API_URL}/api/students/${storedUser.id}/profile-photo`);
        if (photoRes.data.success && photoRes.data.user?.profile_photo) {
          setUser(prev => ({ ...prev, photo: photoRes.data.user.profile_photo }));
        }

        const taskRes = await axios.get(`${API_URL}/api/assignments/class/${storedUser.class}/${storedUser.id}`);
        if (taskRes.data.success) {
           const pending = taskRes.data.assignments.filter(t => t.status !== "SUBMITTED");
           setPendingTasks(pending.length);
           if (pending.length > 0) {
             activeNotis.push({ title: "Assignments", desc: `${pending.length} tasks are pending.`, icon: <FaTasks />, path: "task-update", color: theme.gradients.primary });
           }
        }

        const feedRes = await axios.get(`${API_URL}/api/feedback/student/${storedUser.id}`);
        if (feedRes.data.success) {
           const alreadyDone = feedRes.data.feedbacks?.some(f => f.month === currentMonth && f.year === currentYear);
           if (!alreadyDone) {
             setIsFeedbackPending(true);
             activeNotis.push({ title: "Monthly Feedback", desc: "Please submit your feedback.", icon: <FaStar />, path: "feedback", color: theme.gradients.purple });
           }
        }

        
        const feeRes = await axios.get(`${API_URL}/api/fees/student/${storedUser.id}`);

setIsFeeUnpaid(false);
setShowFeePopup(false);

if (feeRes.data.success) {

  const feesData = feeRes.data.fees || [];

  const isPaidThisMonth = feesData.some(f => {
    const fDate = new Date(f.payment_date);
    return (
      fDate.getMonth() === today.getMonth() &&
      fDate.getFullYear() === today.getFullYear() &&
      f.payment_status === "SUCCESS"
    );
  });

  if (!isPaidThisMonth) {

    const amount = feesData.length > 0 ? feesData[0].amount : "500";

    // MASTER SWITCH
    setShowFeePopup(true);

    // NOTICE depends on popup
    setIsFeeUnpaid(true);

    setDynamicFeeAmount(amount);

    activeNotis.push({
      title: "Fees Pending",
      desc: `Amount Due ₹${amount}`,
      icon: <FaMoneyBillWave />,
      path: "fees",
      color: theme.gradients.warning
    });
  }
}


        const marksRes = await axios.post(`${API_URL}/api/marks/check`, { studentId: storedUser.id, studentName: storedUser.name });
        if (marksRes.data.success && marksRes.data.data.length > 0) {
          const savedMarksData = JSON.parse(localStorage.getItem("userMarks")) || {};
          const localMarks = savedMarksData[storedUser.id] || [];
          const fetchedData = marksRes.data.data;
          const newEntries = fetchedData.filter((m) => !localMarks.map(lm => lm.id).includes(m.id));
          if (newEntries.length > 0 && localMarks.length > 0) {
            setHasNewMarks(true);
            activeNotis.push({ title: "New Marks", desc: "Check latest results.", icon: <FaChartLine />, path: "marks", color: theme.gradients.info });
          }
        }
        setNotifications(activeNotis);
      } catch (err) { console.error(err); }
    };
    fetchData();
  }, [navigate]);

  if (!user) return null;

  return (
   <div style={masterWrapper}>
  {/* --- UPDATED MAIN HEADER --- */}
  <header style={{...headerWrapper, position: 'sticky', top: 0, zIndex: 1000, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)'}}>
    <div style={headerContent}>
      <div style={headerLeft}>
        <motion.div 
          whileTap={{ scale: 0.9 }}
          style={iconBtnStyle} 
          onClick={() => setSidebarOpen(true)}
        >
          <FaBars />
        </motion.div>
        <h1 style={brandLogo}>𝐒mart𝐙one</h1>
      </div>
      <div style={headerRight}>
         <div style={notiBox} onClick={() => setIsNotiOpen(true)}>
            <FaBell />
            {notifications.length > 0 && <span style={redBadgePulse}>{notifications.length}</span>}
         </div>
        <div style={profileTrigger} onClick={() => setIsPhotoOpen(true)}>
          <div style={{padding: '2px', background: 'linear-gradient(45deg, #6366f1, #a855f7)', borderRadius: '10px'}}>
            <img src={user.photo || "/default-profile.png"} style={{...headerAvatar, display: 'block'}} alt="user" />
          </div>
        </div>
      </div>
    </div>
  </header>

  {/* --- NEW SUB-HEADER (Immediately after Header) --- */}
  <div style={subHeaderStyle}>
    <div style={subHeaderInner}>
      <div style={{display: 'flex', flexDirection: 'column'}}>
        <span style={portalBadge}>Student Portal</span>
        <h2 style={subHeaderText}>
          {location.pathname === "/student" ? " Student portal" : 
           location.pathname.includes("profile") ? "My Profile" : "Learning Space"}
        </h2>
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
         <div style={liveDot}></div>
         <span style={{fontSize: '12px', fontWeight: '600', color: '#64748b'}}>Be the Brilliant </span>
      </div>
    </div>
  </div>

      <NotificationModal isOpen={isNotiOpen} onClose={() => setIsNotiOpen(false)} notifications={notifications} navigate={navigate} />
      <FeePopup isOpen={showFeePopup} onClose={() => setShowFeePopup(false)} amount={dynamicFeeAmount} />
      <PhotoModal isOpen={isPhotoOpen} user={user} onClose={() => setIsPhotoOpen(false)} />

      {/* ================= SIDEBAR ================= */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} style={sideOverlay} />
            <motion.aside initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} style={sideDrawer}>
              <div style={drawerHeader}>
                <div style={drawerLogo}><FaUserGraduate /></div>
                <h4 style={{ color: "white", margin: 0 }}>SmartZone</h4>
              </div>

              <nav style={drawerNav}>
                <Link to="/student" onClick={() => setSidebarOpen(false)} style={drawerLinkStyle(location.pathname === "/student")}>
                  <FaHome /> Dashboard
                </Link>
                <Link to="profile" onClick={() => setSidebarOpen(false)} style={drawerLinkStyle(location.pathname.includes("profile"))}>
                  <FaUserAlt /> My Profile
                </Link>
                <Link to="task-update" onClick={() => setSidebarOpen(false)} style={drawerLinkStyle(location.pathname.includes("task-update"))}>
                  <FaTasks /> Assignments
                </Link>
                
                <Link to="fees" onClick={() => setSidebarOpen(false)} style={drawerLinkStyle(location.pathname.includes("fees"))}>
                  <FaMoneyBillWave /> Fees / Records
                </Link>
                <Link to="feedback" onClick={() => setSidebarOpen(false)} style={drawerLinkStyle(location.pathname.includes("feedback"))}>
                  <FaStar /> Feedback
                </Link>
                
                <Link to="marks" onClick={() => setSidebarOpen(false)} style={drawerLinkStyle(location.pathname.includes("marks"))}>
                  <FaChartLine /> My Marks
                </Link>
                <Link
  to="quiz-dashboard"
  onClick={() => setSidebarOpen(false)}
  style={drawerLinkStyle(location.pathname.includes("quiz-dashboard"))}
>
  📝 Practice Quiz
</Link>
                <Link to="chat" onClick={() => setSidebarOpen(false)} style={drawerLinkStyle(location.pathname.includes("chat"))}>
                  <FaComments /> Connect Chat
                </Link>
                

            {/* ===== SIDEBAR DROPDOWN ===== */}
<div
  onClick={() => setOpenFolder(prev => prev === "exam" ? null : "exam")}
  style={{...drawerLinkStyle(location.pathname.includes("exam")), cursor: 'pointer', justifyContent: 'space-between'}}
>
  <div style={{display: 'flex', alignItems: 'center', gap: 12}}><FaBookOpen /> Examination</div>
  <FaChevronRight style={{transform: openFolder === "exam" ? 'rotate(90deg)' : 'none', transition: '0.3s', fontSize: '12px'}} />
</div>

<AnimatePresence>
  {openFolder === "exam" && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      style={{ marginLeft: 25, display: "flex", flexDirection: "column", gap: 5, overflow: 'hidden' }}
    >
      <Link to="exam-form" onClick={() => setSidebarOpen(false)} style={subLinkStyle(location.pathname.includes("exam-form"))}>📄 Exam Form</Link>
      <Link to="generate-admit" onClick={() => setSidebarOpen(false)} style={subLinkStyle(location.pathname.includes("generate-admit"))}>🪪 Admit Card</Link>
      <Link to="exam-result" onClick={() => setSidebarOpen(false)} style={subLinkStyle(location.pathname.includes("exam-result"))}>📊 Exam Result</Link>
    </motion.div>
  )}
</AnimatePresence>

{/* ===== RESULTS DROPDOWN ===== */}
<div
  onClick={() => setOpenFolder(prev => prev === "result" ? null : "result")}
  style={{...drawerLinkStyle(location.pathname.includes("submit-results") || location.pathname.includes("view-results")), cursor: 'pointer', justifyContent: 'space-between'}}
>
  <div style={{display: 'flex', alignItems: 'center', gap: 12}}><FaClipboardCheck /> Results</div>
  <FaChevronRight style={{transform: openFolder === "result" ? 'rotate(90deg)' : 'none', transition: '0.3s', fontSize: '12px'}} />
</div>

<AnimatePresence>
  {openFolder === "result" && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      style={{ marginLeft: 25, display: "flex", flexDirection: "column", gap: 5, overflow: 'hidden' }}
    >
      <Link to="submit-results" onClick={() => setSidebarOpen(false)} style={subLinkStyle(location.pathname.includes("submit-results"))}>📄 Uploads Marks</Link>
      <Link to="view-results" onClick={() => setSidebarOpen(false)} style={subLinkStyle(location.pathname.includes("view-results"))}>📊 View Results Records</Link>
    </motion.div>
  )}
</AnimatePresence>
                <AnimatePresence>
                  {examOpen && (
                    
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ marginLeft: 25, display: "flex", flexDirection: "column", gap: 5, overflow: 'hidden' }}>
                      <Link to="exam-form" onClick={() => setSidebarOpen(false)} style={subLinkStyle(location.pathname.includes("exam-form"))}>📄 Exam Form</Link>
                      <Link to="generate-admit" onClick={() => setSidebarOpen(false)} style={subLinkStyle(location.pathname.includes("generate-admit"))}>🪪 Admit Card</Link>
                      <Link to="exam-result" onClick={() => setSidebarOpen(false)} style={subLinkStyle(location.pathname.includes("exam-result"))}>📊 Exam Result</Link>
                    </motion.div>
                  )}
                </AnimatePresence>
                

                <div style={logoutBtnStyle} onClick={() => { localStorage.clear(); window.location.href = "/"; }}>
                  <FaSignOutAlt /> Logout
                </div>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      

      {/* ================= MAIN CONTENT ================= */}
      <main style={mainBody}>
        <Routes>
          <Route
 index
 element={
  <DashboardHome
    navigate={navigate}
    isFeeUnpaid={isFeeUnpaid}
    isFeedbackPending={isFeedbackPending}
    pendingTasks={pendingTasks}
    user={user}
    hasNewMarks={hasNewMarks}
    todayClasses={todayClasses}
    setTodayClasses={setTodayClasses}
    dynamicFeeAmount={dynamicFeeAmount}

  />
 }
/>

          <Route path="profile" element={<StudentProfile />} />
          <Route path="fees" element={<StudentFees user={user} />} />
          <Route path="attendance" element={<StudentAttendance user={user} />} />
          <Route path="marks" element={<StudentsMarks user={user} />} />
          <Route path="study-material" element={<StudentStudyMaterial />} />
          <Route path="task-update" element={<StudentPage studentId={user.id} />} />
          <Route path="feedback" element={<StudentFeedback studentId={user.id} />} />
          <Route path="chat" element={<StudentChat user={user} />} />
          <Route path="apply-correction" element={<ApplyCorrection />} />

          <Route path="submit-results" element={<StudentResult />} />
          <Route path="view-results" element={<ViewResults />} />
          <Route path="quiz-dashboard" element={<StudentQuizDashboard />} />
          <Route path="attempt/:id" element={<AttemptQuizPage />} />

          
          {/* Internal Examination Routes */}
          <Route path="exam-form" element={<ExamForm />} />
          <Route path="generate-admit" element={<GenerateAdmitCard />} />
          <Route path="exam-result" element={<ExaminationResult />} />
        </Routes>
      </main>

      {/* Bottom Navigation for Mobile */}
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
   STYLES (SAME AS ORIGINAL)
========================= */
const subLinkStyle = (active) => ({ padding: "10px 15px", borderRadius: "10px", textDecoration: "none", color: active ? "#fff" : "#94a3b8", fontSize: "13px", fontWeight: 500, background: active ? "rgba(99, 102, 241, 0.2)" : "transparent" });
const modernWelcomeStyle = (img) => ({
  position: "relative",
  width: "100%",          // FULL WIDTH
  borderRadius: "8px",
  padding: "5px",
  color: "#fff",
  cursor: "pointer",
  minHeight: "240px",
  marginBottom: "25px",
  display: "flex",
  flexDirection: "row",  // icon left, text right
  alignItems: "center",
  justifyContent: "space-between",
 backgroundImage: `linear-gradient(45deg, rgba(0,0,0,0.7), rgba(0,0,0,0.3)), url(${img})`, backgroundSize: 'cover', backgroundPosition: 'center', overflow: 'hidden', boxShadow: '0 15px 35px rgba(0,0,0,0.15)' });
const masterWrapper = { minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter', sans-serif" };
const headerWrapper = { position: "fixed", top: 15, left: 0, width: "100%", zIndex: 1000, display: "flex", justifyContent: "center" };
const headerContent = {
  width: "95%",
  maxWidth: "1200px",
  background: "rgba(255, 255, 255, 0.75)", // Semi-transparent
  backdropFilter: "blur(12px)",             // Glass effect
  WebkitBackdropFilter: "blur(12px)",
  borderRadius: "16px",
  padding: "12px 24px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  border: "1px solid rgba(255, 255, 255, 0.3)",
  boxShadow: "0 8px 32px rgba(31, 38, 135, 0.07)"
};
const brandLogo = { 
  fontSize: "22px", 
  fontWeight: "800", 
  letterSpacing: "-0.5px",
  color: "#1e293b",
  display: "flex",
  alignItems: "center",
  gap: "8px"
};
const notiBox = { position: 'relative', fontSize: '22px', color: '#64748b', cursor: 'pointer', display: 'flex' };
const headerAvatar = { width: 48, height: 48, borderRadius: "14px", objectFit: "cover", border: "2px solid #6366f1" };
const mainBody = { padding: "5px 20px 100px", maxWidth: "1100px", margin: "0 auto" };
const taskAlertBar = { background: '#fffbeb', border: '1px solid #fef3c7', padding: '3px 15px', borderRadius: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#92400e' };
const alertActionBtn = { background: '#92400e', color: 'white', border: 'none', padding: '5px', borderRadius: '50%', cursor: 'pointer', display: 'flex' };
const quoteTextStyle = { fontSize: '14px', fontStyle: 'italic', margin: '5px 0' };
const statusPillRow = { display: 'flex', gap: '10px', marginTop: '15px' };
const statusPill = { background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(5px)', padding: '5px 12px', borderRadius: '20px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' };
const cardGrid = {
  display: "flex",
  flexDirection: "column",
  gap: "15px",
};
const cardBase = {
  position: "relative",
  width: "100%",          // FULL WIDTH
  borderRadius: "8px",
  padding: "5px",
  color: "#fff",
  cursor: "pointer",
  minHeight: "170px",
  display: "flex",
  flexDirection: "row",  // icon left, text right
  alignItems: "center",
  justifyContent: "space-between",
  boxShadow: "0 2px 6px rgba(0,0,0,0.12)"
};

const cardTopRow = { display: 'flex', justifyContent: 'space-between' };
const iconCircle = { width: '45px', height: '45px', background: 'rgba(255,255,255,0.2)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' };
const cardMainTitle = { margin: '0', fontSize: '18px', fontWeight: '700' };
const cardBottomBody = { display: 'flex', flexDirection: 'column' };
const miniNoticeBadge = { 
  position: "absolute",
  top: "8px",
  right: "8px",
  background: "#fff",
  color: "#ef4444",
  padding: "4px 10px",
  borderRadius: "8px",
  fontSize: "10px",
  fontWeight: "800",
  zIndex: 10
};
const sideDrawer = { position: "fixed", top: 0, left: 0, bottom: 0, width: 260, background: "#0f172a", zIndex: 2001, padding: "30px 20px", overflowY: 'auto' };
const sideOverlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", zIndex: 2000 };
const drawerHeader = { display: "flex", alignItems: "center", gap: 12, marginBottom: 40 };
const drawerLogo = { width: 40, height: 40, background: theme.gradients.primary, borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: 'white' };
const drawerNav = { display: "flex", flexDirection: "column", gap: 8 };
const drawerLinkStyle = (active) => ({ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderRadius: "14px", textDecoration: "none", color: active ? "white" : "#94a3b8", background: active ? "#6366f1" : "transparent", fontWeight: 600, transition: '0.2s' });
const logoutBtnStyle = { marginTop: '20px', padding: '14px 18px', color: '#f87171', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' };
const mobileBar = { position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: '#0f172a', padding: '12px 35px', borderRadius: '40px', display: 'flex', gap: '35px', color: 'white', fontSize: '22px', zIndex: 1000, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' };
const overlayStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 5000, display: "flex", alignItems: "center", justifyContent: "center", padding: '20px' };
const notiModalContainer = { width: '100%', maxWidth: '380px', background: '#fff', borderRadius: '25px', overflow: 'hidden' };
const modalTopBar = { background: '#f8fafc', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const notiItemStyle = { display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' };
const notiIconCircle = { width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' };
const bigRectContainer = { width: '100%', maxWidth: '380px', background: '#fff', borderRadius: '25px', overflow: 'hidden' };
const modalMainContent = { padding: '25px', textAlign: 'center' };
const bigRectPhoto = { width: '140px', height: '140px', borderRadius: '20px', objectFit: 'cover', marginBottom: '15px', border: '3px solid #6366f1' };
const modalDetails = { textAlign: 'center' };
const badgeRow = { display: 'flex', justifyContent: 'center', gap: '8px', margin: '15px 0' };
const infoBadge = { background: '#f1f5f9', padding: '5px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', color: '#6366f1' };
const modalQuotes = { fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', marginBottom: '20px' };
const modalDoneBtn = { width: '100%', padding: '15px', border: 'none', background: theme.gradients.primary, color: 'white', fontWeight: 'bold', cursor: 'pointer' };
const feeModalOverlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000 };
const feeRectCard = { display: 'flex', width: '90%', maxWidth: '400px', background: '#fff', borderRadius: '20px', overflow: 'hidden' };
const feeLeftAccent = { width: '60px', background: theme.gradients.danger, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' };
const feeRightContent = { flex: 1, padding: '20px' };
const feeAmountBox = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#fff1f2', borderRadius: '10px', marginTop: '10px' };
const feePayBtnNew = { flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: '#1e293b', color: '#fff', fontWeight: 'bold' };
const feeLaterBtn = { padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'transparent', cursor: 'pointer' };
const quoteContainer = { marginTop: '10px' };
const headerLeft = { display: "flex", alignItems: "center", gap: 12 };
const headerRight = { display: "flex", alignItems: "center", gap: 15 };
const iconBtnStyle = { cursor: "pointer", color: "#6366f1", fontSize: "20px" };
const profileTrigger = { cursor: "pointer", display: "flex" };
const feeNoticeBox = {
  position: "absolute",
  top: "6px",
  left: "6px",
  background: "#ff3b3b",
  color: "#fff",
  padding: "12px 10px",
  borderRadius: "10px",
  fontSize: "13px",
  fontWeight: "600",
  minWidth: "200px",
  minHeight: "70px",
  textAlign: "center",
  lineHeight: "1.4",
};

// Inhe apne existing styles/constants ke pass add karein
const subHeaderStyle = {
  background: "rgba(248, 250, 252, 0.8)",
  backdropFilter: "blur(8px)",
  padding: "8px 20px",
  borderRadius: "0 0 20px 20px",
  borderBottom: "1px solid #e2e8f0",
  display: "flex",
  justifyContent: "center",
  position: "sticky",
  top: "85px", // Adjust based on header height
  zIndex: 99,
};

const subHeaderInner = {
  width: "100%",
  maxWidth: "1100px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderLeft: "4px solid #6366f1", // Left accent line
  paddingLeft: "15px"
};

const portalBadge = {
  fontSize: "10px",
  background: "#6366f1",
  color: "#fff",
  padding: "2px 8px",
  borderRadius: "20px",
  fontWeight: "bold",
  textTransform: "uppercase",
};

const subHeaderText = {
  margin: "4px 0 0 0",
  fontSize: "16px",
  fontWeight: "700",
  color: "#1e293b",
};

const liveDot = {
  width: "8px",
  height: "8px",
  background: "#10b981",
  borderRadius: "50%",
  boxShadow: "0 0 8px #10b981",
};

const redBadgePulse = {
  position: "absolute",
  top: "-4px",
  right: "-4px",
  background: "#ef4444",
  color: "#fff",
  fontSize: "10px",
  padding: "2px 5px",
  borderRadius: "50%",
  fontWeight: "bold",
  border: "2px solid #fff",
};



const navBtnStyle = {
    background: '#fff',
    border: '1px solid #874949',
    borderRadius: '8px',
    cursor: 'pointer',
    width: '35px',
    height: '35px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#000000',
    fontSize: '14px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  };

export default StudentDashboard;