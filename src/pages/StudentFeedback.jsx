import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaArrowRight, FaArrowLeft, FaCheck, FaStar, 
  FaPaperPlane, FaCommentAlt, FaExclamationTriangle 
} from "react-icons/fa";

const API_URL = "https://student-management-system-4-hose.onrender.com";

const questions = [
  { question: "How would you rate Bhaiya's behavior this month?", options: ["Very Friendly", "Friendly", "Neutral", "Not Friendly"] },
  { question: "Clarity of lesson explanations?", options: ["Crystal Clear", "Mostly Clear", "Somewhat", "Not Clear"] },
  { question: "Suitability of the teaching pace?", options: ["Perfect", "Good", "Moderate", "Too Fast/Slow"] },
  { question: "Your level of understanding?", options: ["Complete", "Most of it", "Partial", "Very Little"] },
  { question: "Frequency of anger in class?", options: ["Never", "Rarely", "Sometimes", "Often"] },
  { question: "Overall teaching quality?", options: ["Excellent", "Good", "Average", "Poor"] },
  { question: "Your active participation?", options: ["Very Active", "Active", "Passive", "Quiet"] },
  { question: "Homework explanation helpfulness?", options: ["Very Helpful", "Helpful", "Decent", "Not Helpful"] },
  { question: "Classroom environment comfort?", options: ["Very Comfortable", "Good", "Neutral", "Uncomfortable"] },
  { question: "Overall satisfaction for the month?", options: ["Super Satisfied", "Satisfied", "Neutral", "Unsatisfied"] }
];

export default function StudentFeedback({ studentId }) {
  const [currentStep, setCurrentStep] = useState(0); // 0 to 9 for MCQs, 10 for suggestions
  const [mcqAnswers, setMcqAnswers] = useState(Array(questions.length).fill(null));
  const [suggestion, setSuggestion] = useState("");
  const [problem, setProblem] = useState("");
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [monthLabel, setMonthLabel] = useState("");

  useEffect(() => {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const d = new Date();
    setMonthLabel(months[d.getMonth() === 0 ? 11 : d.getMonth() - 1]);
  }, []);

  const handleOption = (oIdx) => {
    const newAnswers = [...mcqAnswers];
    newAnswers[currentStep] = oIdx + 1;
    setMcqAnswers(newAnswers);
    // Auto-advance after a short delay
    setTimeout(() => {
      if (currentStep < questions.length) setCurrentStep(prev => prev + 1);
    }, 400);
  };

  const handleSubmit = async () => {
    try {
      const now = new Date();
      await axios.post(`${API_URL}/api/feedback/student/submit`, {
        student_id: studentId,
        month: now.getMonth() === 0 ? 12 : now.getMonth(),
        year: now.getFullYear(),
        mcqAnswers, suggestion, problem, rating
      });
      setSubmitted(true);
    } catch { alert("Error submitting feedback."); }
  };

  if (submitted) return <SuccessScreen month={monthLabel} />;

  const isMCQDone = currentStep < questions.length;

  return (
    <div style={pageWrapper}>
      {/* Background Decor */}
      <div style={blob1} />
      <div style={blob2} />

      <div style={mainContainer}>
        {/* Header Stats */}
        <div style={headerNav}>
          <div style={stepIndicator}>Question {currentStep + 1} of {questions.length + 1}</div>
          <div style={progressContainer}>
            <motion.div 
              style={progressFill} 
              animate={{ width: `${((currentStep + 1) / (questions.length + 1)) * 100}%` }} 
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {isMCQDone ? (
            <motion.div 
              key={currentStep}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              style={questionSection}
            >
              <h2 style={questionTitle}>{questions[currentStep].question}</h2>
              <div style={optionsContainer}>
                {questions[currentStep].options.map((opt, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.02, x: 10 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleOption(i)}
                    style={optionBtn(mcqAnswers[currentStep] === i + 1)}
                  >
                    <span style={optionNum}>{i + 1}</span>
                    <span style={optionLabel}>{opt}</span>
                    {mcqAnswers[currentStep] === i + 1 && <FaCheck style={checkIcon} />}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="final-step"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={finalSection}
            >
              <h2 style={questionTitle}>Final Details</h2>
              <div style={inputGroup}>
                <label style={fieldLabel}><FaCommentAlt /> Suggestion</label>
                <textarea 
                  style={textInput} 
                  placeholder="How can we improve?" 
                  value={suggestion} 
                  onChange={e => setSuggestion(e.target.value)}
                />
              </div>
              <div style={inputGroup}>
                <label style={fieldLabel}><FaExclamationTriangle /> Problems Faced</label>
                <textarea 
                  style={textInput} 
                  placeholder="Any issues this month?" 
                  value={problem} 
                  onChange={e => setProblem(e.target.value)}
                />
              </div>
              <div style={ratingWrapper}>
                <label style={fieldLabel}>Overall Month Rating</label>
                <div style={starBox}>
                  {[1,2,3,4,5].map(s => (
                    <FaStar 
                      key={s} 
                      onClick={() => setRating(s)}
                      style={starIcon(s <= rating)}
                    />
                  ))}
                </div>
              </div>
              <button 
                style={submitBtn(mcqAnswers.includes(null) || rating === 0)} 
                disabled={mcqAnswers.includes(null) || rating === 0}
                onClick={handleSubmit}
              >
                Submit Feedback <FaPaperPlane />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Navigation */}
        <div style={footerNav}>
          <button 
            disabled={currentStep === 0} 
            onClick={() => setCurrentStep(prev => prev - 1)} 
            style={navBtn}
          >
            <FaArrowLeft /> Previous
          </button>
          {isMCQDone && mcqAnswers[currentStep] !== null && (
            <button onClick={() => setCurrentStep(prev => prev + 1)} style={navBtn}>
              Next <FaArrowRight />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Success Component ---
const SuccessScreen = ({ month }) => (
  <div style={successOverlay}>
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={successCard}>
      <div style={checkCircle}><FaCheck /></div>
      <h2 style={{ fontSize: 28, fontWeight: 800 }}>Feedback Received</h2>
      <p style={{ color: "#64748b", margin: "10px 0 25px" }}>
        Your review for <b>{month}</b> has been recorded securely.
      </p>
      <button onClick={() => window.location.reload()} style={primaryBtn}>Done</button>
    </motion.div>
  </div>
);

/* ================= STYLES ================= */
const pageWrapper = { 
  minHeight: "100vh", background: "#0f172a", display: "flex", 
  alignItems: "center", justifyContent: "center", padding: "20px", 
  overflow: "hidden", position: "relative", fontFamily: "'Inter', sans-serif"
};

const mainContainer = {
  width: "100%", maxWidth: "600px", background: "rgba(255, 255, 255, 0.03)",
  backdropFilter: "blur(20px)", borderRadius: "32px", padding: "40px",
  border: "1px solid rgba(255, 255, 255, 0.1)", zIndex: 10, position: "relative"
};

const headerNav = { marginBottom: 40 };
const stepIndicator = { color: "#94a3b8", fontSize: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 };
const progressContainer = { width: "100%", height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 10 };
const progressFill = { height: "100%", background: "linear-gradient(90deg, #6366f1, #a855f7)", borderRadius: 10 };

const questionSection = { minHeight: "350px" };
const questionTitle = { color: "#fff", fontSize: 24, fontWeight: 700, lineHeight: 1.4, marginBottom: 30 };

const optionsContainer = { display: "flex", flexDirection: "column", gap: 12 };
const optionBtn = (active) => ({
  display: "flex", alignItems: "center", width: "100%", padding: "18px 24px",
  background: active ? "rgba(99, 102, 241, 0.2)" : "rgba(255, 255, 255, 0.05)",
  border: `1px solid ${active ? "#6366f1" : "rgba(255, 255, 255, 0.1)"}`,
  borderRadius: "16px", color: "#fff", cursor: "pointer", textAlign: "left",
  transition: "0.2s ease"
});

const optionNum = { fontSize: 12, fontWeight: 800, background: "rgba(255,255,255,0.1)", padding: "4px 8px", borderRadius: "6px", marginRight: 15, color: "#94a3b8" };
const optionLabel = { fontSize: 16, fontWeight: 500, flex: 1 };
const checkIcon = { color: "#6366f1" };

const footerNav = { display: "flex", justifyContent: "space-between", marginTop: 40, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 20 };
const navBtn = { background: "none", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600 };

const finalSection = { display: "flex", flexDirection: "column", gap: 20 };
const inputGroup = { display: "flex", flexDirection: "column", gap: 8 };
const fieldLabel = { color: "#94a3b8", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 };
const textInput = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "15px", color: "#fff", outline: "none", minHeight: "80px" };
const ratingWrapper = { textAlign: "center", margin: "10px 0" };
const starBox = { display: "flex", justifyContent: "center", gap: 10, marginTop: 10 };
const starIcon = (active) => ({ fontSize: 32, cursor: "pointer", color: active ? "#f59e0b" : "rgba(255,255,255,0.1)", transition: "0.2s" });

const submitBtn = (disabled) => ({
  padding: "18px", borderRadius: "16px", border: "none", 
  background: disabled ? "#334155" : "linear-gradient(135deg, #6366f1, #a855f7)",
  color: "#fff", fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
  display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 10
});

const blob1 = { position: "absolute", top: "-10%", left: "-10%", width: "40%", height: "40%", background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)" };
const blob2 = { position: "absolute", bottom: "-10%", right: "-10%", width: "50%", height: "50%", background: "radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)" };

const successOverlay = { position: "fixed", inset: 0, background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 };
const successCard = { textAlign: "center", background: "rgba(255,255,255,0.03)", padding: "50px", borderRadius: "32px", border: "1px solid rgba(255,255,255,0.1)", maxWidth: "400px" };
const checkCircle = { width: 80, height: 80, background: "rgba(16, 185, 129, 0.1)", color: "#10b981", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 32 };
const primaryBtn = { padding: "12px 40px", borderRadius: "12px", border: "none", background: "#6366f1", color: "#fff", fontWeight: 600, cursor: "pointer" };