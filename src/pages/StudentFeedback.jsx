import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { FaCheckCircle, FaStar, FaPaperPlane, FaLock } from "react-icons/fa";

const API_URL = "https://student-management-system-4-hose.onrender.com";

const questions = [
  { question: "How was Bhaiya's behavior?", options: ["Excellent", "Good", "Neutral", "Angry"] },
  { question: "Teaching Clarity?", options: ["Crystal Clear", "Clear", "Average", "Confusing"] },
  { question: "Pace of teaching?", options: ["Perfect", "Good", "Fast", "Slow"] },
  { question: "Did you understand everything?", options: ["100%", "Mostly", "Half", "Nothing"] },
  { question: "Classroom environment?", options: ["Very Happy", "Quiet", "Noisy", "Boring"] },
  { question: "Study material quality?", options: ["Best", "Good", "Average", "Poor"] },
  { question: "Doubt solving speed?", options: ["Instant", "Quick", "Slow", "Never"] },
  { question: "Punctuality?", options: ["Always on time", "Mostly", "Late", "Very Late"] },
  { question: "Homework pressure?", options: ["Manageable", "Good", "Heavy", "Too Much"] },
  { question: "Overall happiness?", options: ["Very Satisfied", "Satisfied", "OK", "Not Good"] },
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
      } catch (err) {
        console.error("Check Error:", err);
      } finally {
        setLoading(false);
      }
    };
    checkAndSetDate();
  }, [studentId]);

  const handleSubmit = async () => {
    try {
      await axios.post(`${API_URL}/api/feedback/student/submit`, {
        student_id: studentId,
        month: targetDate.num,
        year: targetDate.year,
        mcqAnswers,
        suggestion,
        problem,
        rating
      });
      setSubmitted(true);
    } catch (err) { 
      alert(err.response?.data?.error || "Failed to submit"); 
    }
  };

  if (loading) return <div style={outerWrapper}><div className="loader"></div></div>;

  // Render Submitted View (Edge-to-Edge Dark)
  if (submitted) return (
    <div style={outerWrapper}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={successCard}>
        <FaCheckCircle style={{ fontSize: '70px', color: '#10b981', marginBottom: '20px' }} />
        <h1 style={{ fontSize: '28px', marginBottom: '10px' }}>Submitted!</h1>
        <p style={{ color: '#94a3b8', fontSize: '16px', marginBottom: '30px' }}>
          Thank you for your <b>{targetDate.month}</b> feedback. Your responses help us improve.
        </p>
        <div style={lockBadge}>
          <FaLock style={{ fontSize: '12px' }} /> ACCESS LOCKED UNTIL NEXT MONTH
        </div>
      </motion.div>
    </div>
  );

  // Render Question View (Edge-to-Edge Dark)
  return (
    <div style={outerWrapper}>
      <div style={containerStyle}>
        <div style={headerSection}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#60a5fa' }}>Monthly Feedback</h2>
            <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>{targetDate.month} {targetDate.year}</p>
          </div>
          <div style={stepCounter}>{currentStep < 10 ? `${currentStep + 1} / 10` : "Final"}</div>
        </div>

        <div style={progressContainer}>
           <div style={{ ...progressFill, width: `${(currentStep / 10) * 100}%` }} />
        </div>

        <AnimatePresence mode="wait">
          {currentStep < 10 ? (
            <motion.div 
              key={currentStep} 
              initial={{ x: 30, opacity: 0 }} 
              animate={{ x: 0, opacity: 1 }} 
              exit={{ x: -30, opacity: 0 }}
              style={{ minHeight: '320px' }}
            >
              <p style={qText}>{questions[currentStep].question}</p>
              {questions[currentStep].options.map((opt, i) => (
                <button 
                  key={i} 
                  onClick={() => {
                    const newAns = [...mcqAnswers]; 
                    newAns[currentStep] = i+1;
                    setMcqAnswers(newAns);
                    setTimeout(() => setCurrentStep(currentStep + 1), 250);
                  }} 
                  style={optBtn(mcqAnswers[currentStep] === i+1)}
                >
                  <span style={optCircle(mcqAnswers[currentStep] === i+1)}>{i+1}</span>
                  {opt}
                </button>
              ))}
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={finalBox}>
              <h3 style={{ marginBottom: '20px', color: '#60a5fa' }}>Just one more thing...</h3>
              
              <label style={labelStyle}>Any suggestions for us?</label>
              <textarea placeholder="Your thoughts..." onChange={e => setSuggestion(e.target.value)} style={inputStyle} />
              
              <label style={labelStyle}>Any problems you're facing?</label>
              <textarea placeholder="Report an issue..." onChange={e => setProblem(e.target.value)} style={inputStyle} />
              
              <div style={ratingSection}>
                <p style={{ margin: '0 0 15px 0', fontWeight: '600', color: '#f8fafc' }}>Overall Experience</p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  {[1,2,3,4,5].map(s => (
                    <FaStar 
                      key={s} 
                      onClick={() => setRating(s)} 
                      color={s <= rating ? "#f59e0b" : "#334155"} 
                      style={{ cursor:'pointer', fontSize: 38, transition: '0.3s' }} 
                    />
                  ))}
                </div>
              </div>
              
              <button 
                onClick={handleSubmit} 
                disabled={rating === 0}
                style={{ ...submitBtn, opacity: rating === 0 ? 0.5 : 1 }}
              >
                <FaPaperPlane style={{ marginRight: '10px' }} /> Submit Feedback
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ================= STYLES =================
const outerWrapper = { 
  background: '#0f172a', // Same Dark Background Edge-to-Edge
  minHeight: '100vh', 
  width: '100%', 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'center',
  padding: '15px',
  boxSizing: 'border-box',
  fontFamily: "'Inter', sans-serif"
};

const containerStyle = { 
  background: '#1e293b', 
  padding: '35px 25px', 
  borderRadius: '28px', 
  color: '#fff', 
  width: '100%', 
  maxWidth: '460px', 
  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
  border: '1px solid #334155'
};

const headerSection = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' };
const stepCounter = { background: '#0f172a', padding: '5px 12px', borderRadius: '10px', fontSize: '13px', color: '#94a3b8', border: '1px solid #334155' };

const progressContainer = { width: '100%', height: '8px', background: '#334155', borderRadius: '10px', marginBottom: '35px', overflow: 'hidden' };
const progressFill = { height: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' };

const qText = { fontSize: '22px', fontWeight: '700', marginBottom: '30px', lineHeight: '1.3', color: '#f8fafc' };

const optBtn = (active) => ({ 
  display: 'flex', alignItems: 'center', width: '100%', padding: '16px', margin: '14px 0', 
  borderRadius: '16px', background: active ? 'rgba(59, 130, 246, 0.1)' : '#0f172a', 
  color: active ? '#60a5fa' : '#cbd5e1', border: active ? '2px solid #3b82f6' : '1px solid #334155', 
  cursor: 'pointer', textAlign: 'left', fontSize: '16px', transition: '0.2s all', fontWeight: active ? '600' : '400'
});

const optCircle = (active) => ({
  width: '28px', height: '28px', borderRadius: '50%', background: active ? '#3b82f6' : '#1e293b',
  color: active ? '#fff' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center',
  marginRight: '15px', fontSize: '12px', fontWeight: 'bold', border: '1px solid #334155'
});

const labelStyle = { fontSize: '14px', color: '#94a3b8', marginBottom: '8px', display: 'block', fontWeight: '500' };
const inputStyle = { width: '100%', padding: '14px', borderRadius: '12px', background: '#0f172a', color: '#fff', marginBottom: '22px', border: '1px solid #334155', outline: 'none', resize: 'none' };
const ratingSection = { margin: '10px 0 30px 0', textAlign: 'center', background: '#0f172a', padding: '25px', borderRadius: '20px', border: '1px solid #334155' };
const submitBtn = { background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', padding: '20px', width: '100%', border: 'none', borderRadius: '16px', color: '#fff', fontWeight: 'bold', fontSize: '17px', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)' };

const successCard = { textAlign: 'center', color: '#fff', maxWidth: '400px', padding: '20px' };
const lockBadge = { marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '10px', background: '#1e293b', padding: '10px 20px', borderRadius: '12px', fontSize: '12px', color: '#64748b', border: '1px solid #334155', letterSpacing: '1px' };
const finalBox = { display: 'flex', flexDirection: 'column' };