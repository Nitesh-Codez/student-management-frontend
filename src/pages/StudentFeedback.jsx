import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { FaCheckCircle, FaStar, FaPaperPlane, FaLock, FaChevronLeft, FaChevronRight, FaCrown, FaClipboardList, FaHourglassHalf } from "react-icons/fa";

const API_URL = "https://student-management-system-4-hose.onrender.com";

const questions = [
  { question: "How do you feel about Bhaiya’s behavior with students and the way he supports and motivates you during the class?", options: ["Excellent", "Good", "Average", "Not Good"] },
  { question: "Is Bhaiya’s teaching style easy to understand, and are the concepts explained in a clear and simple manner?", options: ["Very Clear", "Clear", "Somewhat Clear", "Not Clear"] },
  { question: "How do you feel about the speed of teaching in the class? Is it comfortable for you to follow and learn properly?", options: ["Perfect Speed", "Mostly Fine", "Too Fast", "Too Slow"] },
  { question: "After attending today’s class, how much of the topic do you feel you have understood?", options: ["Completely", "Mostly", "Partially", "Not at All"] },
  { question: "How would you describe the overall classroom environment, including discipline, energy, and student interaction?", options: ["Very Positive", "Good", "Average", "Poor"] },
  { question: "What is your opinion about the quality of notes, explanations, and study material provided during the class?", options: ["Excellent", "Good", "Average", "Needs Improvement"] },
  { question: "When you ask doubts in the class, how effectively and clearly are your questions answered by Bhaiya?", options: ["Very Clearly", "Clearly", "Sometimes", "Rarely"] },
  { question: "Is the class usually started on time, and does Bhaiya maintain proper punctuality throughout the session?", options: ["Always On Time", "Mostly On Time", "Sometimes Late", "Often Late"] },
  { question: "Considering this month’s classes, how manageable do you find the homework and practice work given to you?", options: ["Very Manageable", "Manageable", "Heavy", "Too Much"] },
  { question: "Overall, thinking about your learning progress and experience during this month, how satisfied are you with the classes?", options: ["Very Satisfied", "Satisfied", "Neutral", "Not Satisfied"] }
];

export default function StudentFeedback({ studentId }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [mcqAnswers, setMcqAnswers] = useState(Array(10).fill(null));
  const [suggestion, setSuggestion] = useState("");
  const [problem, setProblem] = useState("");
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [targetDate, setTargetDate] = useState({ month: "", num: 0, year: 0 });

  useEffect(() => {
    // Prevent global scrolling/bouncing on mobile
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    
    const checkAndSetDate = async () => {
      const months = ["December","January","February","March","April","May","June","July","August","September","October","November","December"];
      const d = new Date();
      let mIdx = d.getMonth(); 
      let year = d.getFullYear();
      let displayMonth = mIdx === 0 ? months[0] : months[mIdx];
      let submitMonth = mIdx === 0 ? 12 : mIdx;
      let submitYear = mIdx === 0 ? year - 1 : year;
      setTargetDate({ month: displayMonth, num: submitMonth, year: submitYear });

      try {
        const res = await axios.get(`${API_URL}/api/feedback/student/${studentId}`);
        const alreadyDone = res.data.feedbacks?.some(f => f.month === submitMonth && f.year === submitYear);
        if (alreadyDone) setSubmitted(true);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    checkAndSetDate();

    return () => {
        document.body.style.overflow = "auto";
        document.body.style.position = "static";
    };
  }, [studentId]);

  const handleOptionSelect = (index) => {
    const newAns = [...mcqAnswers];
    newAns[currentStep] = index + 1;
    setMcqAnswers(newAns);
    if (currentStep < 10) setTimeout(() => setCurrentStep(currentStep + 1), 400);
  };

  const handleSubmit = async () => {
    try {
      await axios.post(`${API_URL}/api/feedback/student/submit`, {
        student_id: studentId, month: targetDate.num, year: targetDate.year,
        mcqAnswers, suggestion, problem, rating
      });
      setSubmitted(true);
    } catch (err) { alert("Submission failed"); }
  };

  if (loading) return <div style={appContainer}><div style={goldText}>Syncing Golden Data...</div></div>;

  return (
    <div style={appContainer}>
      <header style={headerSection}>
        <div style={brandGroup}>
          <div style={logoBox}><FaClipboardList color="black" /></div>
          <div>
            <h1 style={mainTitle}>Student Feedback</h1>
            <p style={subTitle}>Monthly Performance Registry</p>
          </div>
        </div>
        <div style={statsContainer}>
          <div style={statItem}>
            <span style={statVal}>{targetDate.month}</span>
            <span style={statLab}>Feedback Cycle</span>
          </div>
          <div style={statDivider} />
          <div style={statItem}>
            <span style={statVal}>{submitted ? 'Done' : `${currentStep < 10 ? currentStep + 1 : '10'}/10`}</span>
            <span style={statLab}>Status</span>
          </div>
        </div>
      </header>

      <div style={commandBar}>
        <div style={statusCluster}>
          <span style={submitted ? lockedBadge : activeBadge}>{submitted ? "Record Locked" : "Session Active"}</span>
          <span style={sessionInfo}>UID-{studentId} • {targetDate.month} {targetDate.year} Report</span>
        </div>
      </div>

      <main style={contentWrapper}>
        <div style={centerPanel}>
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={successCard}>
                <div style={successIconBox}>
                    <FaCheckCircle size={80} color="#fbbf24" style={{ filter: 'drop-shadow(0 0 20px rgba(251,191,36,0.3))' }} />
                </div>
                <h1 style={goldHeading}>Thank you for submitting your feedback!</h1>
                <p style={successSubText}>The next feedback form will appear in the first week of next month.</p>
                <div style={infoRow}>
                    <div style={infoItem}>
                        <FaHourglassHalf color="#fbbf24" />
                        <span>Next Cycle: {new Date().getMonth() === 11 ? 'January' : 'Next Month'}</span>
                    </div>
                </div>
                <div style={lockBadgeBig}><FaLock /> ACCESS RESTRICTED UNTIL NEXT CYCLE</div>
              </motion.div>
            ) : currentStep < 10 ? (
              <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ minHeight: '500px' }}>
                <p style={qText}>{questions[currentStep].question}</p>
                <div style={optionsContainer}>
                  {questions[currentStep].options.map((opt, i) => (
                    <motion.button 
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      key={i} 
                      onClick={() => handleOptionSelect(i)} 
                      style={optBtn(mcqAnswers[currentStep] === i + 1)}
                    >
                      <span style={optCircle(mcqAnswers[currentStep] === i + 1)}>{i + 1}</span>
                      {opt}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={finalBox}>
                <h3 style={goldHeadingSmall}>Overall Feedback</h3>
                <p style={{color: '#94a3b8', marginBottom: '30px', fontSize: '14px'}}>Please provide one problem and one suggestion to help us improve.</p>
                <label style={labelStyle}>Suggestions for improvement</label>
                <textarea placeholder="How can we make your learning better?" onChange={e => setSuggestion(e.target.value)} style={inputStyle} />
                <label style={labelStyle}>Current challenges or problems</label>
                <textarea placeholder="Describe any issues you are facing..." onChange={e => setProblem(e.target.value)} style={inputStyle} />
                <div style={ratingSection}>
                  <p style={{ color: '#fff', marginBottom: '15px', fontWeight: 'bold' }}>Overall Experience Rating</p>
                  <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                    {[1,2,3,4,5].map(s => <FaStar key={s} onClick={() => setRating(s)} color={s <= rating ? "#fbbf24" : "#334155"} style={{ cursor:'pointer', fontSize: 40, transition: '0.3s' }} />)}
                  </div>
                </div>
                <button onClick={handleSubmit} disabled={rating === 0} style={submitBtn}>SUBMIT GOLDEN FEEDBACK</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {!submitted && (
        <footer style={bottomNav}>
          <button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} style={navBtn} disabled={currentStep === 0}>
            <FaChevronLeft /> Previous
          </button>
          <div style={trackDots}>
            {questions.map((_, i) => (
              <div key={i} style={dotStyle(mcqAnswers[i] !== null, currentStep === i)} />
            ))}
          </div>
          <button onClick={() => setCurrentStep(Math.min(10, currentStep + 1))} style={navBtn} disabled={currentStep >= 10 || (currentStep < 10 && mcqAnswers[currentStep] === null)}>
            Next <FaChevronRight />
          </button>
        </footer>
      )}
    </div>
  );
}

// ================= STYLES (UPDATED FOR NO-DRAG) =================

const appContainer = { 
  background: "#0a0a0a", 
  height: "100vh", 
  width: "100vw", 
  display: "flex", 
  flexDirection: "column", 
  fontFamily: "'Inter', sans-serif", 
  color: "#fff", 
  overflow: "hidden",
  position: "fixed", // Fixes the background
  top: 0,
  left: 0,
  touchAction: "none", // Prevents pulling/dragging the whole page
  userSelect: "none"   // Prevents text selection while dragging
};

const headerSection = { display: "flex", justifyContent: "space-between", padding: "20px 30px", background: "#111", borderBottom: "1px solid #222", flexShrink: 0 };
const brandGroup = { display: "flex", alignItems: "center", gap: "15px" };
const logoBox = { width: "40px", height: "40px", background: "#fbbf24", borderRadius: "8px", display: "flex", justifyContent: "center", alignItems: "center" };
const mainTitle = { fontSize: "18px", margin: 0, fontWeight: "700", color: "#fff" };
const subTitle = { fontSize: "10px", opacity: 0.5, margin: 0, textTransform: 'uppercase', letterSpacing: '1px' };
const statsContainer = { display: "flex", gap: "20px" };
const statItem = { textAlign: "right" };
const statVal = { display: "block", fontSize: "16px", fontWeight: "700", color: "#fbbf24" };
const statLab = { fontSize: "9px", opacity: 0.5, textTransform: "uppercase" };
const statDivider = { width: "1px", background: "#222" };

const commandBar = { display: "flex", justifyContent: "space-between", padding: "10px 30px", borderBottom: "1px solid #222", background: "#0f0f0f", flexShrink: 0 };
const statusCluster = { display: "flex", alignItems: "center", gap: "12px" };
const activeBadge = { background: "rgba(251, 191, 36, 0.1)", color: "#fbbf24", padding: "4px 10px", borderRadius: "6px", fontSize: "10px", fontWeight: "700", border: "1px solid rgba(251,191,36,0.2)" };
const lockedBadge = { background: "rgba(148, 163, 184, 0.1)", color: "#94a3b8", padding: "4px 10px", borderRadius: "6px", fontSize: "10px", fontWeight: "700", border: "1px solid rgba(148, 163, 184, 0.2)" };
const sessionInfo = { fontSize: "11px", color: "#64748b" };

const contentWrapper = { 
  flex: 1, 
  display: "flex", 
  justifyContent: "center", 
  padding: "30px 20px", 
  overflowY: "auto", // Only this area scrolls if needed
  background: "#0a0a0a",
  touchAction: "pan-y" // Allows vertical scrolling inside main content ONLY
};

const centerPanel = { width: "100%", maxWidth: "600px" };
const qText = { fontSize: "22px", fontWeight: "700", marginBottom: "30px", color: "#f8fafc", lineHeight: "1.4" };
const optionsContainer = { display: "flex", flexDirection: "column", gap: "12px" };

const optBtn = (active) => ({ 
  display: 'flex', alignItems: 'center', width: '100%', padding: '18px', 
  borderRadius: '16px', background: active ? 'linear-gradient(135deg, #fbbf24, #d97706)' : '#171717', 
  color: active ? '#000' : '#cbd5e1', border: active ? 'none' : '1px solid #334155', 
  cursor: 'pointer', textAlign: 'left', fontSize: '16px', fontWeight: '700', transition: '0.2s'
});

const optCircle = (active) => ({
  width: '24px', height: '24px', borderRadius: '50%', background: active ? 'rgba(0,0,0,0.2)' : '#262626',
  color: active ? '#000' : '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px', fontSize: '11px', fontWeight: '900'
});

const finalBox = { display: 'flex', flexDirection: 'column' };
const goldHeadingSmall = { color: '#fbbf24', fontSize: '24px', fontWeight: '800', marginBottom: '10px' };
const labelStyle = { fontSize: '12px', color: '#94a3b8', marginBottom: '8px', display: 'block', fontWeight: '700', textTransform: 'uppercase' };
const inputStyle = { width: '100%', padding: '15px', borderRadius: '12px', background: '#111', color: '#fff', marginBottom: '20px', border: '1px solid #334155', outline: 'none', resize: 'none', fontSize: '14px' };
const ratingSection = { margin: '10px 0 30px 0', textAlign: 'center', background: '#111', padding: '20px', borderRadius: '20px', border: '1px solid #222' };
const submitBtn = { background: 'linear-gradient(135deg, #fbbf24, #d97706)', padding: '18px', border: 'none', borderRadius: '12px', color: '#000', fontWeight: '900', fontSize: '16px', cursor: 'pointer' };

const bottomNav = { padding: "20px 30px", borderTop: "1px solid #222", background: "#111", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 };
const navBtn = { background: "#171717", border: "1px solid #334155", color: "#fbbf24", padding: "10px 20px", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", fontWeight: "600", fontSize: '13px' };
const trackDots = { display: "flex", gap: "8px" };
const dotStyle = (filled, current) => ({
  width: current ? "20px" : "8px", height: "8px", borderRadius: "10px",
  background: current ? "#fbbf24" : (filled ? "rgba(251, 191, 36, 0.4)" : "#334155"),
  transition: "0.3s"
});

const successCard = { textAlign: 'center', padding: '50px 30px', background: '#111', borderRadius: '30px', border: '1px solid #222' };
const successIconBox = { marginBottom: '20px' };
const goldHeading = { fontSize: '28px', fontWeight: '900', color: '#fbbf24', margin: '0 0 15px 0', lineHeight: '1.2' };
const successSubText = { color: '#94a3b8', fontSize: '16px', marginBottom: '30px', maxWidth: '400px', marginInline: 'auto' };
const infoRow = { display: 'flex', justifyContent: 'center', marginBottom: '30px' };
const infoItem = { display: 'flex', alignItems: 'center', gap: '10px', background: '#171717', padding: '10px 20px', borderRadius: '12px', border: '1px solid #222', color: '#cbd5e1', fontSize: '13px' };
const lockBadgeBig = { fontSize: '11px', color: '#444', letterSpacing: '2px', fontWeight: 'bold', borderTop: '1px solid #222', paddingTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' };
const goldText = { color: '#fbbf24', fontWeight: '900', textAlign: 'center', padding: '100px', fontSize: '18px' };