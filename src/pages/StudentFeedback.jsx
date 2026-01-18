import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaArrowRight,
  FaArrowLeft,
  FaCheck,
  FaStar,
  FaPaperPlane,
  FaCommentAlt,
  FaExclamationTriangle,
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
  { question: "Overall satisfaction for the month?", options: ["Super Satisfied", "Satisfied", "Neutral", "Unsatisfied"] },
];

export default function StudentFeedback({ studentId }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [mcqAnswers, setMcqAnswers] = useState(Array(questions.length).fill(null));
  const [suggestion, setSuggestion] = useState("");
  const [problem, setProblem] = useState("");
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [monthLabel, setMonthLabel] = useState("");

  useEffect(() => {
    const months = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December"
    ];
    const d = new Date();
    setMonthLabel(months[d.getMonth()]);
  }, []);

  /* ---------------- MCQ OPTION ---------------- */
  const handleOption = (index) => {
    const updated = [...mcqAnswers];
    updated[currentStep] = index + 1;
    setMcqAnswers(updated);
  };

  /* ---------------- SUBMIT ---------------- */
  const handleSubmit = async () => {
    try {
      if (!studentId) {
        alert("Student ID missing");
        return;
      }

      const now = new Date();

      const res = await axios.post(
        `${API_URL}/api/feedback/student/submit`,
        {
          student_id: studentId,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          mcqAnswers,
          suggestion,
          problem,
          rating,
        }
      );

      console.log("Feedback submitted:", res.data);
      setSubmitted(true);
    } catch (err) {
      console.error(err.response?.data || err.message);
      alert("Submit failed. Check console.");
    }
  };

  if (submitted) return <SuccessScreen month={monthLabel} />;

  const isMCQ = currentStep < questions.length;

  return (
    <div style={pageWrapper}>
      <div style={blob1} />
      <div style={blob2} />

      <div style={mainContainer}>
        {/* HEADER */}
        <div style={headerNav}>
          <div style={stepIndicator}>
            Question {currentStep + 1} of {questions.length + 1}
          </div>
          <div style={progressContainer}>
            <motion.div
              style={progressFill}
              animate={{
                width: `${((currentStep + 1) / (questions.length + 1)) * 100}%`,
              }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {isMCQ ? (
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
                    onClick={() => handleOption(i)}
                    whileHover={{ scale: 1.02 }}
                    style={optionBtn(mcqAnswers[currentStep] === i + 1)}
                  >
                    <span style={optionNum}>{i + 1}</span>
                    <span style={optionLabel}>{opt}</span>
                    {mcqAnswers[currentStep] === i + 1 && <FaCheck />}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            /* ---------- FINAL STEP ---------- */
            <motion.div
              key="final"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={finalSection}
            >
              <h2 style={questionTitle}>Final Details</h2>

              <div style={inputGroup}>
                <label style={fieldLabel}><FaCommentAlt /> Suggestion</label>
                <textarea
                  style={textInput}
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value)}
                />
              </div>

              <div style={inputGroup}>
                <label style={fieldLabel}><FaExclamationTriangle /> Problems</label>
                <textarea
                  style={textInput}
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                />
              </div>

              <div style={ratingWrapper}>
                <label style={fieldLabel}>Overall Rating</label>
                <div style={starBox}>
                  {[1,2,3,4,5].map((s) => (
                    <FaStar
                      key={s}
                      onClick={() => setRating(s)}
                      style={starIcon(s <= rating)}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={mcqAnswers.includes(null) || rating === 0}
                style={submitBtn(mcqAnswers.includes(null) || rating === 0)}
              >
                Submit Feedback <FaPaperPlane />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FOOTER */}
        <div style={footerNav}>
          <button
            disabled={currentStep === 0}
            onClick={() => setCurrentStep((p) => p - 1)}
            style={navBtn}
          >
            <FaArrowLeft /> Previous
          </button>

          {isMCQ && mcqAnswers[currentStep] !== null && (
            <button
              onClick={() => setCurrentStep((p) => p + 1)}
              style={navBtn}
            >
              Next <FaArrowRight />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- SUCCESS ---------- */
const SuccessScreen = ({ month }) => (
  <div style={successOverlay}>
    <motion.div animate={{ scale: 1 }} style={successCard}>
      <div style={checkCircle}><FaCheck /></div>
      <h2>Feedback Received</h2>
      <p>Your review for <b>{month}</b> submitted successfully.</p>
      <button style={primaryBtn} onClick={() => window.location.reload()}>
        Done
      </button>
    </motion.div>
  </div>
);
/* ================= STYLES ================= */

const pageWrapper = {
  minHeight: "100vh",
  background: "#0f172a",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  overflow: "hidden",
  position: "relative",
  fontFamily: "Inter, sans-serif",
};

const blob1 = {
  position: "absolute",
  top: "-10%",
  left: "-10%",
  width: "40%",
  height: "40%",
  background:
    "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
};

const blob2 = {
  position: "absolute",
  bottom: "-10%",
  right: "-10%",
  width: "50%",
  height: "50%",
  background:
    "radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)",
};

const mainContainer = {
  width: "100%",
  maxWidth: "600px",
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(20px)",
  borderRadius: "32px",
  padding: "40px",
  border: "1px solid rgba(255,255,255,0.1)",
  zIndex: 10,
};

const headerNav = { marginBottom: 40 };

const stepIndicator = {
  color: "#94a3b8",
  fontSize: 14,
  fontWeight: 600,
  marginBottom: 12,
};

const progressContainer = {
  width: "100%",
  height: 4,
  background: "rgba(255,255,255,0.1)",
  borderRadius: 10,
};

const progressFill = {
  height: "100%",
  background: "linear-gradient(90deg, #6366f1, #a855f7)",
  borderRadius: 10,
};

const questionSection = { minHeight: "350px" };

const questionTitle = {
  color: "#fff",
  fontSize: 24,
  fontWeight: 700,
  marginBottom: 30,
};

const optionsContainer = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const optionBtn = (active) => ({
  display: "flex",
  alignItems: "center",
  padding: "18px 24px",
  borderRadius: "16px",
  border: active ? "1px solid #6366f1" : "1px solid rgba(255,255,255,0.1)",
  background: active
    ? "rgba(99,102,241,0.2)"
    : "rgba(255,255,255,0.05)",
  color: "#fff",
  cursor: "pointer",
});

const optionNum = {
  marginRight: 12,
  fontWeight: 700,
  color: "#94a3b8",
};

const optionLabel = { flex: 1 };

const footerNav = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: 30,
};

const navBtn = {
  background: "none",
  border: "none",
  color: "#94a3b8",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const finalSection = {
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

const inputGroup = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const fieldLabel = {
  color: "#94a3b8",
  fontSize: 14,
  fontWeight: 600,
};

const textInput = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  padding: 15,
  color: "#fff",
  minHeight: 80,
};

const ratingWrapper = { textAlign: "center" };

const starBox = {
  display: "flex",
  justifyContent: "center",
  gap: 10,
};

const starIcon = (active) => ({
  fontSize: 32,
  cursor: "pointer",
  color: active ? "#f59e0b" : "rgba(255,255,255,0.2)",
});

const submitBtn = (disabled) => ({
  padding: 18,
  borderRadius: 16,
  border: "none",
  background: disabled
    ? "#334155"
    : "linear-gradient(135deg,#6366f1,#a855f7)",
  color: "#fff",
  cursor: disabled ? "not-allowed" : "pointer",
});

const successOverlay = {
  position: "fixed",
  inset: 0,
  background: "#0f172a",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const successCard = {
  background: "rgba(255,255,255,0.03)",
  padding: 40,
  borderRadius: 24,
  textAlign: "center",
};

const checkCircle = {
  width: 80,
  height: 80,
  borderRadius: "50%",
  background: "rgba(16,185,129,0.1)",
  color: "#10b981",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 20px",
  fontSize: 32,
};

const primaryBtn = {
  padding: "12px 40px",
  borderRadius: 12,
  border: "none",
  background: "#6366f1",
  color: "#fff",
  cursor: "pointer",
};
