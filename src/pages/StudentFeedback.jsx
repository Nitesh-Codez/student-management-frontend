import React, { useEffect, useState } from "react";
import api from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaCheckCircle,
  FaStar,
  FaPaperPlane,
  FaLock,
  FaChevronLeft,
  FaChevronRight,
  FaClipboardList,
  FaHourglassHalf,
  FaRegSmile,
} from "react-icons/fa";

/* =========================================================
   QUESTIONS
========================================================= */

const questions = [
  {
    question: "How do you feel about Bhaiya's behavior with students?",
    options: ["Excellent", "Good", "Average", "Needs Improvement"],
  },
  {
    question: "Is Bhaiya's teaching easy to understand?",
    options: ["Very Easy", "Easy", "Somewhat Easy", "Not Easy"],
  },
  {
    question: "How is the speed of the class for you?",
    options: ["Perfect", "Good", "Too Fast", "Too Slow"],
  },
  {
    question: "How much did you understand from today's class?",
    options: ["Everything", "Most of It", "Some of It", "Very Little"],
  },
  {
    question: "How do you feel about the classroom environment?",
    options: ["Excellent", "Good", "Average", "Needs Improvement"],
  },
  {
    question: "How are the notes and study material provided in class?",
    options: ["Excellent", "Good", "Average", "Needs Improvement"],
  },
  {
    question: "Are your doubts answered clearly in class?",
    options: ["Always", "Usually", "Sometimes", "Rarely"],
  },
  {
    question: "Does the class usually start on time?",
    options: ["Always", "Usually", "Sometimes", "Rarely"],
  },
  {
    question: "How do you feel about the homework and practice work?",
    options: ["Very Easy", "Manageable", "Heavy", "Too Much"],
  },
  {
    question: "Overall, how satisfied are you with the classes?",
    options: ["Very Satisfied", "Satisfied", "Neutral", "Not Satisfied"],
  },
];

/* =========================================================
   COMPONENT
========================================================= */

export default function StudentFeedback({ studentId }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [mcqAnswers, setMcqAnswers] = useState(Array(10).fill(null));

  const [suggestion, setSuggestion] = useState("");
  const [problem, setProblem] = useState("");
  const [rating, setRating] = useState(0);

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  const [targetDate, setTargetDate] = useState({
    month: "",
    num: 0,
    year: 0,
  });

  /* =========================================================
     CHECK MONTHLY FEEDBACK
  ========================================================= */

  useEffect(() => {
    const checkFeedback = async () => {
      const months = [
        "December",
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];

      const date = new Date();

      const monthIndex = date.getMonth();
      const year = date.getFullYear();

      const displayMonth =
        monthIndex === 0 ? months[0] : months[monthIndex];

      const submitMonth = monthIndex === 0 ? 12 : monthIndex;

      const submitYear =
        monthIndex === 0 ? year - 1 : year;

      setTargetDate({
        month: displayMonth,
        num: submitMonth,
        year: submitYear,
      });

      try {
        const res = await api.get(
          `/api/feedback/student/${studentId}`
        );

        const alreadyDone =
          res.data.feedbacks?.some(
            (feedback) =>
              feedback.month === submitMonth &&
              feedback.year === submitYear
          );

        if (alreadyDone) {
          setSubmitted(true);
        }
      } catch (error) {
        console.error("Feedback check error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkFeedback();
  }, [studentId]);

  /* =========================================================
     SELECT ANSWER
  ========================================================= */

  const handleOptionSelect = (index) => {
    const updatedAnswers = [...mcqAnswers];

    updatedAnswers[currentStep] = index + 1;

    setMcqAnswers(updatedAnswers);

    if (currentStep < 10) {
      setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
      }, 300);
    }
  };

  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit = async () => {
    if (rating === 0) return;

    try {
      await api.post("/api/feedback/student/submit", {
        student_id: studentId,
        month: targetDate.num,
        year: targetDate.year,
        mcqAnswers,
        suggestion,
        problem,
        rating,
      });

      setSubmitted(true);
    } catch (error) {
      console.error("Feedback submission error:", error);
      alert("Unable to submit feedback. Please try again.");
    }
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div style={loadingPage}>
        <div style={loadingCard}>
          <div style={loadingIcon}>
            <FaClipboardList />
          </div>

          <h3>Loading Feedback</h3>

          <p>Please wait...</p>
        </div>
      </div>
    );
  }

  const answeredCount = mcqAnswers.filter(
    (answer) => answer !== null
  ).length;

  const progress =
    currentStep < 10
      ? ((currentStep + 1) / 10) * 100
      : 100;

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div style={appContainer}>

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header style={headerSection}>

        <div style={brandGroup}>

          <div style={logoBox}>
            <FaClipboardList />
          </div>

          <div>
            <h1 style={mainTitle}>
              Student Feedback
            </h1>

            <p style={subTitle}>
              Monthly Feedback Form
            </p>
          </div>

        </div>

        <div style={monthBox}>
          <span style={monthLabel}>
            Feedback Month
          </span>

          <strong style={monthValue}>
            {targetDate.month}
          </strong>
        </div>

      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main style={contentWrapper}>

        <div style={centerPanel}>

          <AnimatePresence mode="wait">

            {/* =================================================
                SUCCESS
            ================================================= */}

            {submitted ? (

              <motion.div
                initial={{
                  opacity: 0,
                  scale: 0.96,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                style={successCard}
              >

                <div style={successIcon}>
                  <FaCheckCircle />
                </div>

                <h1 style={successTitle}>
                  Thank You!
                </h1>

                <p style={successText}>
                  Your feedback has been submitted successfully.
                  Your response will help us improve the classes.
                </p>

                <div style={nextCycleBox}>

                  <FaHourglassHalf />

                  <div>
                    <span>
                      Next Feedback
                    </span>

                    <strong>
                      First week of next month
                    </strong>
                  </div>

                </div>

                <div style={lockedInfo}>
                  <FaLock />
                  Feedback is locked until the next cycle
                </div>

              </motion.div>

            ) : currentStep < 10 ? (

              /* =================================================
                 QUESTIONS
              ================================================= */

              <motion.div
                key={currentStep}
                initial={{
                  opacity: 0,
                  x: 25,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                }}
                exit={{
                  opacity: 0,
                  x: -25,
                }}
                transition={{
                  duration: 0.25,
                }}
              >

                {/* TOP INFO */}

                <div style={questionTop}>

                  <div>
                    <span style={smallLabel}>
                      Question
                    </span>

                    <strong style={questionNumber}>
                      {currentStep + 1}
                      <span>/10</span>
                    </strong>
                  </div>

                  <span style={answeredText}>
                    {answeredCount}/10 answered
                  </span>

                </div>

                {/* PROGRESS */}

                <div style={progressTrack}>
                  <motion.div
                    animate={{
                      width: `${progress}%`,
                    }}
                    transition={{
                      duration: 0.3,
                    }}
                    style={progressFill}
                  />
                </div>

                {/* QUESTION */}

                <div style={questionCard}>

                  <div style={questionIcon}>
                    <FaRegSmile />
                  </div>

                  <h2 style={qText}>
                    {questions[currentStep].question}
                  </h2>

                  <p style={chooseText}>
                    Choose one option
                  </p>

                  <div style={optionsContainer}>

                    {questions[currentStep].options.map(
                      (option, index) => {

                        const active =
                          mcqAnswers[currentStep] ===
                          index + 1;

                        return (
                          <motion.button
                            key={index}
                            whileHover={{
                              y: -2,
                            }}
                            whileTap={{
                              scale: 0.98,
                            }}
                            onClick={() =>
                              handleOptionSelect(index)
                            }
                            style={optBtn(active)}
                          >

                            <span
                              style={optCircle(active)}
                            >
                              {String.fromCharCode(
                                65 + index
                              )}
                            </span>

                            <span>
                              {option}
                            </span>

                            {active && (
                              <FaCheckCircle
                                style={{
                                  marginLeft:
                                    "auto",
                                }}
                              />
                            )}

                          </motion.button>
                        );
                      }
                    )}

                  </div>

                </div>

              </motion.div>

            ) : (

              /* =================================================
                 FINAL FORM
              ================================================= */

              <motion.div
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                style={finalBox}
              >

                <div style={finalHeader}>

                  <div style={finalIcon}>
                    <FaClipboardList />
                  </div>

                  <div>
                    <h2 style={finalTitle}>
                      Almost Done!
                    </h2>

                    <p style={finalSubTitle}>
                      Share your thoughts about this month's classes.
                    </p>
                  </div>

                </div>

                {/* SUGGESTION */}

                <div style={fieldGroup}>

                  <label style={labelStyle}>
                    Your Suggestion
                  </label>

                  <textarea
                    value={suggestion}
                    onChange={(e) =>
                      setSuggestion(e.target.value)
                    }
                    placeholder="What can we do better?"
                    style={inputStyle}
                  />

                </div>

                {/* PROBLEM */}

                <div style={fieldGroup}>

                  <label style={labelStyle}>
                    Any Problem?
                  </label>

                  <textarea
                    value={problem}
                    onChange={(e) =>
                      setProblem(e.target.value)
                    }
                    placeholder="Tell us if you are facing any problem."
                    style={inputStyle}
                  />

                </div>

                {/* RATING */}

                <div style={ratingSection}>

                  <h3 style={ratingTitle}>
                    How was your overall experience?
                  </h3>

                  <p style={ratingSub}>
                    Tap a star to give your rating
                  </p>

                  <div style={starsContainer}>

                    {[1, 2, 3, 4, 5].map(
                      (star) => (
                        <motion.button
                          key={star}
                          whileHover={{
                            scale: 1.15,
                          }}
                          whileTap={{
                            scale: 0.9,
                          }}
                          onClick={() =>
                            setRating(star)
                          }
                          style={starButton}
                        >
                          <FaStar
                            style={{
                              color:
                                star <= rating
                                  ? "#F59E0B"
                                  : "#CBD5E1",
                            }}
                          />
                        </motion.button>
                      )
                    )}

                  </div>

                  {rating > 0 && (
                    <span style={ratingValue}>
                      {rating === 5
                        ? "Excellent"
                        : rating === 4
                        ? "Very Good"
                        : rating === 3
                        ? "Good"
                        : rating === 2
                        ? "Needs Improvement"
                        : "Poor"}
                    </span>
                  )}

                </div>

                {/* SUBMIT */}

                <button
                  onClick={handleSubmit}
                  disabled={rating === 0}
                  style={{
                    ...submitBtn,
                    opacity:
                      rating === 0 ? 0.5 : 1,
                    cursor:
                      rating === 0
                        ? "not-allowed"
                        : "pointer",
                  }}
                >

                  <FaPaperPlane />

                  Submit Feedback

                </button>

                <p style={submitNote}>
                  Your feedback is private and helps us
                  improve your learning experience.
                </p>

              </motion.div>

            )}

          </AnimatePresence>

        </div>

      </main>

      {/* =====================================================
          BOTTOM NAV
      ===================================================== */}

      {!submitted && currentStep < 10 && (

        <footer style={bottomNav}>

          <button
            onClick={() =>
              setCurrentStep(
                Math.max(0, currentStep - 1)
              )
            }
            disabled={currentStep === 0}
            style={{
              ...navBtn,
              opacity:
                currentStep === 0 ? 0.4 : 1,
            }}
          >
            <FaChevronLeft />
            Previous
          </button>

          <div style={dotsContainer}>

            {questions.map((_, index) => (

              <div
                key={index}
                style={dotStyle(
                  mcqAnswers[index] !== null,
                  currentStep === index
                )}
              />

            ))}

          </div>

          <button
            onClick={() =>
              setCurrentStep(
                Math.min(10, currentStep + 1)
              )
            }
            disabled={
              currentStep >= 10 ||
              mcqAnswers[currentStep] === null
            }
            style={{
              ...navBtn,
              opacity:
                currentStep >= 10 ||
                mcqAnswers[currentStep] === null
                  ? 0.4
                  : 1,
            }}
          >
            Next
            <FaChevronRight />
          </button>

        </footer>

      )}

    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

const appContainer = {
  minHeight: "100vh",
  width: "100%",
  background: "#F8FAFC",
  fontFamily:
    "'Inter', 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
  color: "#0F172A",
  display: "flex",
  flexDirection: "column",
};

/* =========================================================
   LOADING
========================================================= */

const loadingPage = {
  minHeight: "100vh",
  background: "#F8FAFC",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "'Inter', sans-serif",
};

const loadingCard = {
  textAlign: "center",
  background: "#FFFFFF",
  padding: "40px",
  borderRadius: "20px",
  border: "1px solid #E2E8F0",
  boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
};

const loadingIcon = {
  width: "55px",
  height: "55px",
  margin: "0 auto 18px",
  borderRadius: "16px",
  background: "#EEF2FF",
  color: "#4F46E5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px",
};

const loadingText = {};

/* =========================================================
   HEADER
========================================================= */

const headerSection = {
  width: "100%",
  background: "#FFFFFF",
  borderBottom: "1px solid #E2E8F0",
  padding: "17px 30px",
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const brandGroup = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const logoBox = {
  width: "42px",
  height: "42px",
  borderRadius: "12px",
  background: "#EEF2FF",
  color: "#4F46E5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "17px",
};

const mainTitle = {
  margin: 0,
  fontSize: "17px",
  fontWeight: "800",
  color: "#0F172A",
};

const subTitle = {
  margin: "3px 0 0",
  fontSize: "10px",
  color: "#94A3B8",
  fontWeight: "600",
};

const monthBox = {
  textAlign: "right",
};

const monthLabel = {
  display: "block",
  fontSize: "9px",
  color: "#94A3B8",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.6px",
};

const monthValue = {
  display: "block",
  marginTop: "3px",
  color: "#4F46E5",
  fontSize: "14px",
  fontWeight: "800",
};

/* =========================================================
   CONTENT
========================================================= */

const contentWrapper = {
  flex: 1,
  width: "100%",
  overflowY: "auto",
  padding: "35px 20px 100px",
  boxSizing: "border-box",
};

const centerPanel = {
  width: "100%",
  maxWidth: "700px",
  margin: "0 auto",
};

/* =========================================================
   QUESTION
========================================================= */

const questionTop = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  marginBottom: "10px",
};

const smallLabel = {
  display: "block",
  fontSize: "10px",
  color: "#94A3B8",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const questionNumber = {
  display: "block",
  marginTop: "2px",
  fontSize: "20px",
  color: "#0F172A",
  fontWeight: "900",
};

const questionNumberSpan = {};

const answeredText = {
  fontSize: "11px",
  color: "#64748B",
  fontWeight: "600",
};

const progressTrack = {
  width: "100%",
  height: "6px",
  background: "#E2E8F0",
  borderRadius: "20px",
  overflow: "hidden",
  marginBottom: "22px",
};

const progressFill = {
  height: "100%",
  background:
    "linear-gradient(90deg, #4F46E5, #6366F1)",
  borderRadius: "20px",
};

const questionCard = {
  background: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: "22px",
  padding: "30px",
  boxShadow: "0 10px 30px rgba(15,23,42,0.05)",
};

const questionIcon = {
  width: "42px",
  height: "42px",
  borderRadius: "12px",
  background: "#EEF2FF",
  color: "#4F46E5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "17px",
  marginBottom: "18px",
};

const qText = {
  margin: 0,
  color: "#0F172A",
  fontSize: "22px",
  lineHeight: 1.45,
  fontWeight: "800",
};

const chooseText = {
  margin: "9px 0 22px",
  color: "#94A3B8",
  fontSize: "12px",
};

const optionsContainer = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const optBtn = (active) => ({
  width: "100%",
  minHeight: "58px",
  padding: "10px 15px",
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  textAlign: "left",
  borderRadius: "13px",
  border: active
    ? "1px solid #4F46E5"
    : "1px solid #E2E8F0",
  background: active
    ? "#EEF2FF"
    : "#FFFFFF",
  color: active
    ? "#3730A3"
    : "#334155",
  fontSize: "14px",
  fontWeight: "700",
  cursor: "pointer",
  transition: "all .2s ease",
  boxShadow: active
    ? "0 4px 12px rgba(79,70,229,0.10)"
    : "none",
});

const optCircle = (active) => ({
  width: "30px",
  height: "30px",
  minWidth: "30px",
  borderRadius: "9px",
  background: active
    ? "#4F46E5"
    : "#F1F5F9",
  color: active
    ? "#FFFFFF"
    : "#64748B",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "11px",
  fontWeight: "900",
});

/* =========================================================
   BOTTOM NAV
========================================================= */

const bottomNav = {
  position: "fixed",
  bottom: 0,
  left: 0,
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 25px",
  background: "rgba(255,255,255,0.96)",
  backdropFilter: "blur(12px)",
  borderTop: "1px solid #E2E8F0",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "15px",
  zIndex: 20,
};

const navBtn = {
  border: "1px solid #E2E8F0",
  background: "#FFFFFF",
  color: "#475569",
  height: "38px",
  padding: "0 15px",
  borderRadius: "10px",
  display: "flex",
  alignItems: "center",
  gap: "7px",
  fontSize: "11px",
  fontWeight: "800",
  cursor: "pointer",
};

const dotsContainer = {
  display: "flex",
  alignItems: "center",
  gap: "5px",
};

const dotStyle = (filled, current) => ({
  width: current ? "18px" : "6px",
  height: "6px",
  borderRadius: "10px",
  background: current
    ? "#4F46E5"
    : filled
    ? "#A5B4FC"
    : "#CBD5E1",
  transition: "all .25s ease",
});

/* =========================================================
   FINAL FORM
========================================================= */

const finalBox = {
  background: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: "22px",
  padding: "30px",
  boxShadow: "0 10px 30px rgba(15,23,42,0.05)",
};

const finalHeader = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  marginBottom: "28px",
};

const finalIcon = {
  width: "45px",
  height: "45px",
  borderRadius: "13px",
  background: "#EEF2FF",
  color: "#4F46E5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const finalTitle = {
  margin: 0,
  fontSize: "22px",
  fontWeight: "900",
  color: "#0F172A",
};

const finalSubTitle = {
  margin: "4px 0 0",
  color: "#64748B",
  fontSize: "12px",
};

const fieldGroup = {
  marginBottom: "18px",
};

const labelStyle = {
  display: "block",
  marginBottom: "7px",
  color: "#334155",
  fontSize: "11px",
  fontWeight: "800",
};

const inputStyle = {
  width: "100%",
  minHeight: "90px",
  boxSizing: "border-box",
  padding: "13px",
  borderRadius: "12px",
  border: "1px solid #E2E8F0",
  background: "#F8FAFC",
  color: "#0F172A",
  outline: "none",
  resize: "vertical",
  fontSize: "13px",
  fontFamily: "inherit",
};

const ratingSection = {
  marginTop: "8px",
  marginBottom: "20px",
  padding: "20px",
  textAlign: "center",
  borderRadius: "16px",
  background: "#F8FAFC",
  border: "1px solid #E2E8F0",
};

const ratingTitle = {
  margin: 0,
  color: "#0F172A",
  fontSize: "14px",
  fontWeight: "800",
};

const ratingSub = {
  margin: "5px 0 12px",
  color: "#94A3B8",
  fontSize: "11px",
};

const starsContainer = {
  display: "flex",
  justifyContent: "center",
  gap: "8px",
};

const starButton = {
  border: "none",
  background: "transparent",
  padding: "3px",
  cursor: "pointer",
  fontSize: "27px",
};

const ratingValue = {
  display: "block",
  marginTop: "8px",
  color: "#F59E0B",
  fontSize: "11px",
  fontWeight: "800",
};

const submitBtn = {
  width: "100%",
  height: "48px",
  border: "none",
  borderRadius: "12px",
  background:
    "linear-gradient(135deg, #4F46E5, #6366F1)",
  color: "#FFFFFF",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "9px",
  fontSize: "13px",
  fontWeight: "800",
};

const submitNote = {
  margin: "12px 0 0",
  textAlign: "center",
  color: "#94A3B8",
  fontSize: "10px",
};

/* =========================================================
   SUCCESS
========================================================= */

const successCard = {
  background: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: "24px",
  padding: "55px 30px",
  textAlign: "center",
  boxShadow: "0 15px 40px rgba(15,23,42,0.07)",
};

const successIcon = {
  width: "78px",
  height: "78px",
  margin: "0 auto 20px",
  borderRadius: "50%",
  background: "#ECFDF5",
  color: "#10B981",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "42px",
};

const successTitle = {
  margin: 0,
  color: "#0F172A",
  fontSize: "28px",
  fontWeight: "900",
};

const successText = {
  maxWidth: "430px",
  margin: "12px auto 25px",
  color: "#64748B",
  fontSize: "14px",
  lineHeight: 1.7,
};

const nextCycleBox = {
  display: "inline-flex",
  alignItems: "center",
  gap: "12px",
  textAlign: "left",
  padding: "12px 18px",
  borderRadius: "12px",
  background: "#F8FAFC",
  border: "1px solid #E2E8F0",
  color: "#4F46E5",
};

const nextCycleBoxText = {};

const lockedInfo = {
  marginTop: "25px",
  paddingTop: "18px",
  borderTop: "1px solid #E2E8F0",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "7px",
  color: "#94A3B8",
  fontSize: "10px",
  fontWeight: "700",
};