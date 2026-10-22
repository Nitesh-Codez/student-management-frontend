import React, { useEffect, useState } from "react";
import api from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaCheckCircle,
  FaStar,
  FaPaperPlane,
  FaChevronLeft,
  FaChevronRight,
  FaClipboardList,
  FaRegSmile,
  FaCommentDots,
  FaUserTie,
  FaArrowLeft,
  FaGraduationCap,
  FaInfoCircle
} from "react-icons/fa";

/* =========================================================
   QUESTIONS LIST
========================================================= */
const questions = [
  {
    question: "How do you feel about the faculty's behavior with students?",
    options: ["Excellent", "Good", "Average", "Needs Improvement"],
  },
  {
    question: "Is the faculty's teaching easy to understand?",
    options: ["Very Easy", "Easy", "Somewhat Easy", "Not Easy"],
  },
  {
    question: "How is the speed of the class for you?",
    options: ["Perfect", "Good", "Too Fast", "Too Slow"],
  },
  {
    question: "How much did you understand from the lectures?",
    options: ["Everything", "Most of It", "Some of It", "Very Little"],
  },
  {
    question: "How do you feel about the classroom environment?",
    options: ["Excellent", "Good", "Average", "Needs Improvement"],
  },
  {
    question: "How are the notes and study material provided for this subject?",
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
    question: "How do you feel about the assignment and practice work?",
    options: ["Very Easy", "Manageable", "Heavy", "Too Much"],
  },
  {
    question: "Overall, how satisfied are you with this subject's teaching?",
    options: ["Very Satisfied", "Satisfied", "Neutral", "Not Satisfied"],
  },
];

export default function StudentFeedback({ studentId: propStudentId }) {
  /* =========================================================
     READ USER, CLASS & SESSION FROM LOCALSTORAGE
  ========================================================= */
  let localUser = null;
  try {
    const rawUser = localStorage.getItem("user");
    if (rawUser) localUser = JSON.parse(rawUser);
  } catch (e) {
    console.error("Error parsing user from localStorage", e);
  }

  // Dynamic values with fallbacks
  const studentId = propStudentId || localUser?.id || localUser?.student_id;
  const studentClass =
    localUser?.studentClass ||
    localUser?.className ||
    localUser?.class_name ||
    localStorage.getItem("studentClass") ||
    localStorage.getItem("className") ||
    "5th";

  const currentSession =
    localUser?.session ||
    localStorage.getItem("session") ||
    "2026-2027";

  /* =========================================================
     COMPONENT STATES
  ========================================================= */
  const [subjectsList, setSubjectsList] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [mcqAnswers, setMcqAnswers] = useState(Array(10).fill(null));
  const [suggestion, setSuggestion] = useState("");
  const [problem, setProblem] = useState("");
  const [rating, setRating] = useState(0);

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  const [targetDate, setTargetDate] = useState({
    monthName: "",
    num: 0,
    year: 0,
  });

  /* =========================================================
     FETCH CLASS SUBJECTS & SUBMITTED STATUS
  ========================================================= */
  useEffect(() => {
    const fetchData = async () => {
      const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];

      const date = new Date();
      const monthIndex = date.getMonth(); // 0-11
      const year = date.getFullYear();

      const currentMonthName = months[monthIndex];
      const submitMonthNum = monthIndex + 1; // 1-12

      setTargetDate({
        monthName: currentMonthName,
        num: submitMonthNum,
        year: year,
      });

      try {
        setLoading(true);

        // 1. Get class subjects & teacher mapping using dynamic class
        const listRes = await api.get(
          `/api/feedback/class-sub-teacher/${studentClass}`
        );

        // 2. Fetch already submitted feedbacks for student for this month & session
        const feedbackRes = await api.get(
          `/api/feedback/student/${studentId}?month=${submitMonthNum}&year=${year}`
        );

        const completedKeys = new Set(
          feedbackRes.data.feedbacks?.map(
            (f) => `${f.subject_name}_${f.teacher_id}`
          ) || []
        );

        const rawTeachers = listRes.data.teachers || [];

        // Map feedback completion status
        const mappedTeachers = rawTeachers.map((item, idx) => {
          const key = `${item.subjectName}_${item.teacherId}`;
          return {
            ...item,
            uniqueId: `${item.teacherId}_${item.subjectName}_${idx}`,
            isCompleted: completedKeys.has(key),
          };
        });

        setSubjectsList(mappedTeachers);
      } catch (error) {
        console.error("Error fetching class feedback subjects:", error);
      } finally {
        setLoading(false);
      }
    };

    if (studentClass) {
      fetchData();
    }
  }, [studentClass, studentId]);

  /* =========================================================
     START FEEDBACK FORM
  ========================================================= */
  const handleStartFeedback = (subjectItem) => {
    setSelectedSubject(subjectItem);
    setCurrentStep(0);
    setMcqAnswers(Array(10).fill(null));
    setSuggestion("");
    setProblem("");
    setRating(0);
    setSubmitted(false);
  };

  /* =========================================================
     SELECT OPTION
  ========================================================= */
  const handleOptionSelect = (index) => {
    const updated = [...mcqAnswers];
    updated[currentStep] = index + 1;
    setMcqAnswers(updated);

    if (currentStep < 10) {
      setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
      }, 220);
    }
  };

  /* =========================================================
     SUBMIT FEEDBACK
  ========================================================= */
  const handleSubmit = async () => {
    if (rating === 0 || !selectedSubject) return;

    try {
      await api.post("/api/feedback/student/submit", {
        student_id: studentId,
        teacher_id: selectedSubject.teacherId,
        subject_name: selectedSubject.subjectName,
        className: studentClass,
        session: currentSession, // Included Session
        month: targetDate.num,
        year: targetDate.year,
        mcqAnswers,
        suggestion,
        problem,
        rating,
      });

      // Local state update so badge changes to "Done Feedback"
      setSubjectsList((prev) =>
        prev.map((item) =>
          item.subjectName === selectedSubject.subjectName &&
          item.teacherId === selectedSubject.teacherId
            ? { ...item, isCompleted: true }
            : item
        )
      );

      setSubmitted(true);
    } catch (error) {
      console.error("Feedback submission error:", error);
      alert("Unable to submit feedback. Please try again.");
    }
  };

  if (loading) {
    return (
      <div style={loadingPage}>
        <div style={loadingCard}>
          <div style={loadingSpinner} />
          <h3 style={{ margin: "14px 0 6px", fontSize: "16px", color: "#1E293B" }}>
            Loading Feedback Portal...
          </h3>
          <p style={{ margin: 0, fontSize: "12px", color: "#64748B" }}>
            Fetching subjects for Class {studentClass} ({currentSession})
          </p>
        </div>
      </div>
    );
  }

  const answeredCount = mcqAnswers.filter((ans) => ans !== null).length;
  const progress = currentStep < 10 ? ((currentStep + 1) / 10) * 100 : 100;

  return (
    <div style={appContainer}>
      {/* TOP HEADER */}
      <header style={headerSection}>
        <div style={brandGroup}>
          <div style={logoBox}>
            <FaGraduationCap />
          </div>
          <div>
            <h1 style={mainTitle}>Monthly Academic Feedback</h1>
            <p style={subTitle}>
              Class {studentClass} • Session {currentSession}
            </p>
          </div>
        </div>

        <div style={monthPill}>
          <span style={monthLabel}>Cycle</span>
          <strong style={monthValue}>
            {targetDate.monthName} {targetDate.year}
          </strong>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main style={contentWrapper}>
        <div style={centerPanel}>
          {!selectedSubject ? (
            /* SUBJECT LIST VIEW */
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={noticeBanner}>
                <FaInfoCircle style={{ fontSize: "18px", color: "#3B82F6", flexShrink: 0 }} />
                <span>
                  Please complete monthly evaluations for all assigned faculties in Class {studentClass}. (Resets automatically on the 1st of every month)
                </span>
              </div>

              {subjectsList.map((item) => (
                <div key={item.uniqueId} style={subjectRowCard}>
                  <div style={cardAccentStrip} />

                  <div style={cardContent}>
                    {/* TEACHER PHOTO */}
                    <div style={avatarBox}>
                      {item.teacherPhoto ? (
                        <img
                          src={item.teacherPhoto}
                          alt={item.teacherName}
                          style={teacherPhotoImg}
                        />
                      ) : (
                        <FaUserTie style={{ fontSize: "24px", color: "#94A3B8" }} />
                      )}
                    </div>

                    {/* DETAILS */}
                    <div style={{ flex: 1 }}>
                      <span style={subjectTag}>{item.subjectName}</span>
                      <h3 style={teacherNameText}>{item.teacherName}</h3>
                      <span style={classSubText}>
                        Faculty • Class {item.className}
                      </span>
                    </div>

                    {/* ACTION BUTTON */}
                    <div>
                      {item.isCompleted ? (
                        <div style={doneBadge}>
                          <FaCheckCircle style={{ fontSize: "14px" }} />
                          <span>Done Feedback</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartFeedback(item)}
                          style={submitFeedbackBtn}
                        >
                          <FaCommentDots />
                          <span>Submit Feedback</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* QUESTION FORM SLIDER */
            <div>
              <button
                onClick={() => setSelectedSubject(null)}
                style={backToListBtn}
              >
                <FaArrowLeft /> Back to Subject List
              </button>

              <div style={activeSubjectHeader}>
                <img
                  src={selectedSubject.teacherPhoto}
                  alt={selectedSubject.teacherName}
                  style={activeTeacherAvatar}
                />
                <div>
                  <span style={activeSubTag}>{selectedSubject.subjectName}</span>
                  <h3 style={activeSubTeacher}>{selectedSubject.teacherName}</h3>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {submitted ? (
                  /* SUCCESS VIEW */
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={successCard}
                  >
                    <div style={successIcon}>
                      <FaCheckCircle />
                    </div>
                    <h1 style={successTitle}>Feedback Recorded</h1>
                    <p style={successText}>
                      Thank you! Your feedback for <strong>{selectedSubject.subjectName}</strong> ({selectedSubject.teacherName}) has been submitted.
                    </p>
                    <button
                      onClick={() => setSelectedSubject(null)}
                      style={primaryBtn}
                    >
                      Return to Courses
                    </button>
                  </motion.div>
                ) : currentStep < 10 ? (
                  /* MCQ STEPPER */
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div style={questionTop}>
                      <div>
                        <span style={smallLabel}>QUESTION</span>
                        <strong style={questionNumber}>
                          {currentStep + 1} <span style={{ fontSize: "14px", color: "#94A3B8" }}>/ 10</span>
                        </strong>
                      </div>
                      <span style={answeredText}>{answeredCount}/10 completed</span>
                    </div>

                    <div style={progressTrack}>
                      <motion.div
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                        style={progressFill}
                      />
                    </div>

                    <div style={questionCard}>
                      <div style={questionIcon}>
                        <FaRegSmile />
                      </div>
                      <h2 style={qText}>{questions[currentStep].question}</h2>
                      <p style={chooseText}>Select your response below</p>

                      <div style={optionsContainer}>
                        {questions[currentStep].options.map((option, index) => {
                          const active = mcqAnswers[currentStep] === index + 1;
                          return (
                            <motion.button
                              key={index}
                              whileHover={{ y: -1 }}
                              whileTap={{ scale: 0.99 }}
                              onClick={() => handleOptionSelect(index)}
                              style={optBtn(active)}
                            >
                              <span style={optCircle(active)}>
                                {String.fromCharCode(65 + index)}
                              </span>
                              <span style={{ flex: 1 }}>{option}</span>
                              {active && <FaCheckCircle style={{ color: "#4F46E5" }} />}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  /* FINAL STEP */
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={finalBox}
                  >
                    <div style={finalHeader}>
                      <div style={finalIcon}>
                        <FaClipboardList />
                      </div>
                      <div>
                        <h2 style={finalTitle}>Final Thoughts</h2>
                        <p style={finalSubTitle}>Share feedback for {selectedSubject.subjectName}</p>
                      </div>
                    </div>

                    <div style={fieldGroup}>
                      <label style={labelStyle}>SUGGESTIONS FOR IMPROVEMENT</label>
                      <textarea
                        value={suggestion}
                        onChange={(e) => setSuggestion(e.target.value)}
                        placeholder="What could be improved in teaching or coursework?"
                        style={inputStyle}
                      />
                    </div>

                    <div style={fieldGroup}>
                      <label style={labelStyle}>ISSUES / PROBLEMS FACED (IF ANY)</label>
                      <textarea
                        value={problem}
                        onChange={(e) => setProblem(e.target.value)}
                        placeholder="Mention any difficulties faced during classes..."
                        style={inputStyle}
                      />
                    </div>

                    <div style={ratingSection}>
                      <h3 style={ratingTitle}>Overall Subject & Teacher Rating</h3>
                      <p style={ratingSub}>Tap a star to rate your overall experience</p>
                      <div style={starsContainer}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <motion.button
                            key={star}
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setRating(star)}
                            style={starButton}
                          >
                            <FaStar style={{ color: star <= rating ? "#F59E0B" : "#CBD5E1" }} />
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleSubmit}
                      disabled={rating === 0}
                      style={{
                        ...primaryBtn,
                        opacity: rating === 0 ? 0.5 : 1,
                        cursor: rating === 0 ? "not-allowed" : "pointer",
                      }}
                    >
                      <FaPaperPlane /> Submit Feedback
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>

      {/* BOTTOM NAV */}
      {!submitted && selectedSubject && currentStep < 10 && (
        <footer style={bottomNav}>
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            style={{ ...navBtn, opacity: currentStep === 0 ? 0.4 : 1 }}
          >
            <FaChevronLeft /> Previous
          </button>

          <div style={dotsContainer}>
            {questions.map((_, index) => (
              <div
                key={index}
                style={dotStyle(mcqAnswers[index] !== null, currentStep === index)}
              />
            ))}
          </div>

          <button
            onClick={() => setCurrentStep(Math.min(10, currentStep + 1))}
            disabled={currentStep >= 10 || mcqAnswers[currentStep] === null}
            style={{
              ...navBtn,
              opacity: currentStep >= 10 || mcqAnswers[currentStep] === null ? 0.4 : 1,
            }}
          >
            Next <FaChevronRight />
          </button>
        </footer>
      )}
    </div>
  );
}

/* =========================================================
   STYLING
========================================================= */
const appContainer = {
  minHeight: "100vh",
  width: "100%",
  background: "#F8FAFC",
  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  color: "#0F172A",
  display: "flex",
  flexDirection: "column",
};

const headerSection = {
  width: "100%",
  background: "#FFFFFF",
  borderBottom: "1px solid #E2E8F0",
  padding: "16px 32px",
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
};

const brandGroup = { display: "flex", alignItems: "center", gap: "14px" };

const logoBox = {
  width: "42px",
  height: "42px",
  borderRadius: "12px",
  background: "linear-gradient(135deg, #4F46E5, #6366F1)",
  color: "#FFFFFF",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "20px",
  boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)",
};

const mainTitle = { margin: 0, fontSize: "18px", fontWeight: "800", color: "#0F172A", letterSpacing: "-0.3px" };
const subTitle = { margin: "3px 0 0", fontSize: "12px", color: "#64748B", fontWeight: "500" };

const monthPill = {
  background: "#F1F5F9",
  border: "1px solid #E2E8F0",
  padding: "6px 14px",
  borderRadius: "10px",
  textAlign: "right",
};

const monthLabel = { display: "block", fontSize: "10px", color: "#64748B", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" };
const monthValue = { display: "block", color: "#4F46E5", fontSize: "13px", fontWeight: "800" };

const contentWrapper = { flex: 1, width: "100%", padding: "28px 20px 100px", boxSizing: "border-box" };
const centerPanel = { width: "100%", maxWidth: "780px", margin: "0 auto" };

const noticeBanner = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  background: "#EFF6FF",
  border: "1px solid #DBEAFE",
  padding: "14px 18px",
  borderRadius: "12px",
  fontSize: "13px",
  color: "#1E40AF",
  lineHeight: "1.5",
};

const subjectRowCard = {
  background: "#FFFFFF",
  borderRadius: "14px",
  border: "1px solid #E2E8F0",
  display: "flex",
  overflow: "hidden",
  boxShadow: "0 4px 12px rgba(15,23,42,0.03)",
  transition: "all 0.2s ease-in-out",
};

const cardAccentStrip = { width: "5px", background: "linear-gradient(180deg, #F59E0B, #D97706)" };

const cardContent = {
  flex: 1,
  padding: "16px 20px",
  display: "flex",
  alignItems: "center",
  gap: "18px",
};

const avatarBox = {
  width: "56px",
  height: "56px",
  borderRadius: "50%",
  overflow: "hidden",
  background: "#F8FAFC",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "2px solid #E2E8F0",
  flexShrink: 0,
};

const teacherPhotoImg = { width: "100%", height: "100%", objectFit: "cover" };

const subjectTag = {
  display: "inline-block",
  background: "#FEF3C7",
  color: "#B45309",
  fontSize: "11px",
  fontWeight: "800",
  padding: "3px 8px",
  borderRadius: "6px",
  marginBottom: "4px",
  letterSpacing: "0.3px",
};

const teacherNameText = { margin: 0, fontSize: "16px", fontWeight: "700", color: "#1E293B" };
const classSubText = { display: "block", marginTop: "3px", fontSize: "12px", color: "#64748B", fontWeight: "500" };

const submitFeedbackBtn = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  background: "#4F46E5",
  color: "#FFFFFF",
  border: "none",
  padding: "10px 18px",
  borderRadius: "10px",
  fontSize: "13px",
  fontWeight: "700",
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(79,70,229,0.2)",
};

const doneBadge = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  background: "#ECFDF5",
  color: "#047857",
  border: "1px solid #A7F3D0",
  padding: "8px 16px",
  borderRadius: "10px",
  fontSize: "13px",
  fontWeight: "700",
};

const backToListBtn = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  background: "none",
  border: "none",
  color: "#4F46E5",
  fontSize: "13px",
  fontWeight: "700",
  cursor: "pointer",
  marginBottom: "16px",
};

const activeSubjectHeader = {
  background: "#FFFFFF",
  padding: "16px 20px",
  borderRadius: "14px",
  border: "1px solid #E2E8F0",
  marginBottom: "20px",
  display: "flex",
  alignItems: "center",
  gap: "14px",
};

const activeTeacherAvatar = { width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover", border: "2px solid #E2E8F0" };
const activeSubTag = { fontSize: "11px", color: "#4F46E5", fontWeight: "800", textTransform: "uppercase" };
const activeSubTeacher = { margin: "2px 0 0", fontSize: "17px", fontWeight: "800", color: "#0F172A" };

const questionTop = { display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "10px" };
const smallLabel = { display: "block", fontSize: "10px", color: "#94A3B8", fontWeight: "800", letterSpacing: "0.5px" };
const questionNumber = { display: "block", marginTop: "2px", fontSize: "22px", color: "#0F172A", fontWeight: "900" };
const answeredText = { fontSize: "12px", color: "#64748B", fontWeight: "600" };

const progressTrack = { width: "100%", height: "6px", background: "#E2E8F0", borderRadius: "20px", overflow: "hidden", marginBottom: "22px" };
const progressFill = { height: "100%", background: "linear-gradient(90deg, #4F46E5, #6366F1)", borderRadius: "20px" };

const questionCard = { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "20px", padding: "28px", boxShadow: "0 10px 25px rgba(15,23,42,0.03)" };
const questionIcon = { width: "42px", height: "42px", borderRadius: "12px", background: "#EEF2FF", color: "#4F46E5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", marginBottom: "16px" };
const qText = { margin: 0, color: "#0F172A", fontSize: "19px", lineHeight: 1.4, fontWeight: "800" };
const chooseText = { margin: "6px 0 20px", color: "#94A3B8", fontSize: "12px" };

const optionsContainer = { display: "flex", flexDirection: "column", gap: "10px" };
const optBtn = (active) => ({
  width: "100%", minHeight: "52px", padding: "12px 16px", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "12px", textAlign: "left", borderRadius: "12px",
  border: active ? "1.5px solid #4F46E5" : "1px solid #E2E8F0", background: active ? "#EEF2FF" : "#FFFFFF", color: active ? "#312E81" : "#334155", fontSize: "14px", fontWeight: "700", cursor: "pointer", transition: "all .15s ease"
});

const optCircle = (active) => ({
  width: "28px", height: "28px", minWidth: "28px", borderRadius: "8px", background: active ? "#4F46E5" : "#F1F5F9", color: active ? "#FFFFFF" : "#64748B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "800"
});

const finalBox = { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "20px", padding: "28px" };
const finalHeader = { display: "flex", alignItems: "center", gap: "14px", marginBottom: "22px" };
const finalIcon = { width: "44px", height: "44px", borderRadius: "12px", background: "#EEF2FF", color: "#4F46E5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" };
const finalTitle = { margin: 0, fontSize: "20px", fontWeight: "800", color: "#0F172A" };
const finalSubTitle = { margin: "3px 0 0", color: "#64748B", fontSize: "12px" };

const fieldGroup = { marginBottom: "16px" };
const labelStyle = { display: "block", marginBottom: "6px", color: "#475569", fontSize: "10px", fontWeight: "800", letterSpacing: "0.5px" };
const inputStyle = { width: "100%", minHeight: "80px", boxSizing: "border-box", padding: "12px", borderRadius: "10px", border: "1px solid #CBD5E1", background: "#F8FAFC", color: "#0F172A", outline: "none", resize: "vertical", fontSize: "13px", fontFamily: "inherit" };

const ratingSection = { marginTop: "10px", marginBottom: "20px", padding: "18px", textAlign: "center", borderRadius: "14px", background: "#F8FAFC", border: "1px solid #E2E8F0" };
const ratingTitle = { margin: 0, color: "#0F172A", fontSize: "14px", fontWeight: "800" };
const ratingSub = { margin: "4px 0 10px", color: "#94A3B8", fontSize: "11px" };
const starsContainer = { display: "flex", justifyContent: "center", gap: "8px" };
const starButton = { border: "none", background: "transparent", padding: "2px", cursor: "pointer", fontSize: "28px" };

const primaryBtn = { width: "100%", height: "46px", borderRadius: "10px", background: "#4F46E5", color: "#FFFFFF", border: "none", fontWeight: "800", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer" };

const bottomNav = { position: "fixed", bottom: 0, left: 0, width: "100%", boxSizing: "border-box", padding: "12px 28px", background: "rgba(255,255,255,0.96)", backdropFilter: "blur(12px)", borderTop: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "15px", zIndex: 20 };
const navBtn = { border: "1px solid #CBD5E1", background: "#FFFFFF", color: "#475569", height: "38px", padding: "0 16px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "7px", fontSize: "12px", fontWeight: "700", cursor: "pointer" };
const dotsContainer = { display: "flex", alignItems: "center", gap: "5px" };
const dotStyle = (filled, current) => ({ width: current ? "18px" : "6px", height: "6px", borderRadius: "10px", background: current ? "#4F46E5" : filled ? "#A5B4FC" : "#CBD5E1", transition: "all .2s ease" });

const loadingPage = { minHeight: "100vh", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center" };
const loadingCard = { textAlign: "center", background: "#FFFFFF", padding: "35px 40px", borderRadius: "16px", border: "1px solid #E2E8F0" };
const loadingSpinner = { width: "32px", height: "32px", margin: "0 auto", borderRadius: "50%", border: "3px solid #EEF2FF", borderTopColor: "#4F46E5", animation: "spin 1s linear infinite" };

const successCard = { textAlign: "center", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "20px", padding: "35px 25px" };
const successIcon = { width: "56px", height: "56px", margin: "0 auto 16px", borderRadius: "50%", background: "#DCFCE7", color: "#16A34A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px" };
const successTitle = { margin: 0, fontSize: "22px", fontWeight: "900", color: "#0F172A" };
const successText = { margin: "8px 0 24px", color: "#64748B", fontSize: "13px", lineHeight: "1.5" };