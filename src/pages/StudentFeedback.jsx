import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { FaCheckCircle, FaStar, FaPaperPlane, FaLock, FaChevronLeft, FaChevronRight, FaCrown, FaClipboardList, FaHourglassHalf } from "react-icons/fa";

const API_URL = "https://student-management-system-4-hose.onrender.com";

const questions = [
  { question: "How do you feel about Bhaiya's behavior and the way he supports you in class?", options: ["Excellent", "Good", "Neutral", "Angry"] },
  { question: "Is the teaching style easy to understand, and are the topics explained clearly?", options: ["Crystal Clear", "Clear", "Average", "Confusing"] },
  { question: "Do you think the speed of teaching is okay, or is it going too fast for you?", options: ["Perfect", "Good", "Fast", "Slow"] },
  { question: "Honestly, did you understand every single topic that was covered in today's class?", options: ["100%", "Mostly", "Half", "Nothing"] },
  { question: "How would you describe the overall energy and environment inside the classroom?", options: ["Very Happy", "Quiet", "Noisy", "Boring"] },
  { question: "What do you think about the quality of the notes and study materials provided to you?", options: ["Best", "Good", "Average", "Poor"] },
  { question: "When you ask a question, how fast are your doubts cleared by Bhaiya?", options: ["Instant", "Quick", "Slow", "Never"] },
  { question: "Is the class starting on the exact time, and is everyone being punctual?", options: ["Always on time", "Mostly", "Late", "Very Late"] },
  { question: "Do you feel that the amount of homework given to you is easy to manage at home?", options: ["Manageable", "Good", "Heavy", "Too Much"] },
  { question: "Looking at your overall journey, are you happy and satisfied with your learning?", options: ["Very Satisfied", "Satisfied", "OK", "Not Good"] },
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
  }, [studentId]);

  const handleOptionSelect = (index) => {
    const newAns = [...mcqAnswers];
    newAns[currentStep] = index + 1;
    setMcqAnswers(newAns);
    if (currentStep < 9) setTimeout(() => setCurrentStep(currentStep + 1), 400);
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
      {/* 1. TOP HEADER */}
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

      {/* 2. COMMAND BAR */}
      <div style={commandBar}>
        <div style={statusCluster}>
          <span style={submitted ? lockedBadge : activeBadge}>{submitted ? "Record Locked" : "Session Active"}</span>
          <span style={sessionInfo}>UID-{studentId} • {targetDate.month} {targetDate.year} Report</span>
        </div>
      </div>

      {/* 3. MAIN CONTENT */}
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

      {/* 4. FOOTER NAVIGATION */}
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

// ================= STYLES =================

const appContainer = { background: "#0a0a0a", minHeight: "100vh", width: "100vw", display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif", color: "#fff", overflow: "hidden" };

const headerSection = { display: "flex", justifyContent: "space-between", padding: "25px 40px", background: "#111", borderBottom: "1px solid #222" };
const brandGroup = { display: "flex", alignItems: "center", gap: "15px" };
const logoBox = { width: "40px", height: "40px", background: "#fbbf24", borderRadius: "8px", display: "flex", justifyContent: "center", alignItems: "center" };
const mainTitle = { fontSize: "20px", margin: 0, fontWeight: "700", color: "#fff" };
const subTitle = { fontSize: "11px", opacity: 0.5, margin: 0, textTransform: 'uppercase', letterSpacing: '1px' };
const statsContainer = { display: "flex", gap: "25px" };
const statItem = { textAlign: "right" };
const statVal = { display: "block", fontSize: "18px", fontWeight: "700", color: "#fbbf24" };
const statLab = { fontSize: "10px", opacity: 0.5, textTransform: "uppercase" };
const statDivider = { width: "1px", background: "#222" };

const commandBar = { display: "flex", justifyContent: "space-between", padding: "12px 40px", borderBottom: "1px solid #222", background: "#0f0f0f" };
const statusCluster = { display: "flex", alignItems: "center", gap: "12px" };
const activeBadge = { background: "rgba(251, 191, 36, 0.1)", color: "#fbbf24", padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", border: "1px solid rgba(251,191,36,0.2)" };
const lockedBadge = { background: "rgba(148, 163, 184, 0.1)", color: "#94a3b8", padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", border: "1px solid rgba(148, 163, 184, 0.2)" };
const sessionInfo = { fontSize: "12px", color: "#64748b" };

const contentWrapper = { flex: 1, display: "flex", justifyContent: "center", padding: "60px 20px", overflowY: "auto", background: "#0a0a0a" };
const centerPanel = { width: "100%", maxWidth: "650px", minHeight: "70vh" };

const qText = { fontSize: "26px", fontWeight: "700", marginBottom: "40px", color: "#f8fafc", lineHeight: "1.4" };
const optionsContainer = { display: "flex", flexDirection: "column", gap: "16px" };

const optBtn = (active) => ({ 
  display: 'flex', alignItems: 'center', width: '100%', padding: '22px', 
  borderRadius: '16px', background: active ? 'linear-gradient(135deg, #fbbf24, #d97706)' : '#171717', 
  color: active ? '#000' : '#cbd5e1', border: active ? 'none' : '1px solid #334155', 
  cursor: 'pointer', textAlign: 'left', fontSize: '17px', fontWeight: '700', transition: '0.2s'
});

const optCircle = (active) => ({
  width: '28px', height: '28px', borderRadius: '50%', background: active ? 'rgba(0,0,0,0.2)' : '#262626',
  color: active ? '#000' : '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px', fontSize: '12px', fontWeight: '900'
});

const finalBox = { display: 'flex', flexDirection: 'column' };
const goldHeadingSmall = { color: '#fbbf24', fontSize: '28px', fontWeight: '800', marginBottom: '10px' };
const labelStyle = { fontSize: '13px', color: '#94a3b8', marginBottom: '10px', display: 'block', fontWeight: '700', textTransform: 'uppercase' };
const inputStyle = { width: '100%', padding: '20px', borderRadius: '16px', background: '#111', color: '#fff', marginBottom: '30px', border: '1px solid #334155', outline: 'none', resize: 'none', fontSize: '15px' };
const ratingSection = { margin: '10px 0 40px 0', textAlign: 'center', background: '#111', padding: '30px', borderRadius: '24px', border: '1px solid #222' };
const submitBtn = { background: 'linear-gradient(135deg, #fbbf24, #d97706)', padding: '22px', border: 'none', borderRadius: '16px', color: '#000', fontWeight: '900', fontSize: '18px', cursor: 'pointer', boxShadow: '0 10px 30px rgba(251,191,36,0.2)' };

const bottomNav = { padding: "25px 40px", borderTop: "1px solid #222", background: "#111", display: "flex", justifyContent: "space-between", alignItems: "center" };
const navBtn = { background: "#171717", border: "1px solid #334155", color: "#fbbf24", padding: "12px 24px", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", fontWeight: "600", fontSize: '14px' };
const trackDots = { display: "flex", gap: "10px" };
const dotStyle = (filled, current) => ({
  width: current ? "24px" : "10px", height: "10px", borderRadius: "10px",
  background: current ? "#fbbf24" : (filled ? "rgba(251, 191, 36, 0.4)" : "#334155"),
  transition: "0.3s"
});

const successCard = { textAlign: 'center', padding: '60px 40px', background: '#111', borderRadius: '30px', border: '1px solid #222' };
const successIconBox = { marginBottom: '30px' };
const goldHeading = { fontSize: '32px', fontWeight: '900', color: '#fbbf24', margin: '0 0 20px 0', lineHeight: '1.2' };
const successSubText = { color: '#94a3b8', fontSize: '18px', marginBottom: '40px', maxWidth: '450px', marginInline: 'auto' };
const infoRow = { display: 'flex', justifyContent: 'center', marginBottom: '40px' };
const infoItem = { display: 'flex', alignItems: 'center', gap: '10px', background: '#171717', padding: '12px 25px', borderRadius: '12px', border: '1px solid #222', color: '#cbd5e1', fontSize: '14px' };
const lockBadgeBig = { fontSize: '12px', color: '#444', letterSpacing: '2px', fontWeight: 'bold', borderTop: '1px solid #222', paddingTop: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' };
const goldText = { color: '#fbbf24', fontWeight: '900', textAlign: 'center', padding: '100px', fontSize: '20px' };