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
  FaInfoCircle,
  FaExclamationTriangle
} from "react-icons/fa";

/* =========================================================
   SIMPLE ENGLISH QUESTIONS (At least 2 lines each)
========================================================= */
const createQuestions = (subjectName) => [
  {
    question: `Does the teacher explain ${subjectName} topics clearly so that you can understand easily?`,
    options: ["Very Clearly", "Good Explanation", "Hard to Understand", "Not Clear At All"],
  },
  {
    question: `Is your attendance marked regularly and on time during ${subjectName} classes?`,
    options: ["Always On Time", "Usually On Time", "Sometimes Late", "Never Marked On Time"],
  },
  {
    question: `Are tests, quizzes, and homework for ${subjectName} given and checked on time?`,
    options: ["Always On Time", "Mostly On Time", "Often Late", "Rarely Conducted"],
  },
  {
    question: `How is the speed of teaching and syllabus coverage for ${subjectName}?`,
    options: ["Perfect Speed", "Good Speed", "Too Fast for Me", "Too Slow"],
  },
  {
    question: `Does the teacher clear your doubts and answer your questions in ${subjectName} class?`,
    options: ["Always Cleared", "Mostly Cleared", "Sometimes Ignored", "Never Answered"],
  },
  {
    question: `How is the discipline and environment in the classroom during ${subjectName} lectures?`,
    options: ["Very Good", "Good", "Average", "Needs Improvement"],
  },
  {
    question: `How helpful and complete are the study notes and practice materials provided for ${subjectName}?`,
    options: ["Very Helpful", "Good Notes", "Average Quality", "Poor or No Notes"],
  },
  {
    question: `Does the teacher start and end the ${subjectName} class on time?`,
    options: ["Always On Time", "Usually On Time", "Often Late", "Always Late"],
  },
  {
    question: `How do you feel about the amount of homework and practice work given for ${subjectName}?`,
    options: ["Perfect Amount", "Easy to Complete", "A Bit Too Much", "Too Much Homework"],
  },
  {
    question: `Overall, how happy and satisfied are you with the teaching in ${subjectName}?`,
    options: ["Very Happy", "Satisfied", "Neutral", "Not Satisfied"],
  },
];

export default function StudentFeedback({ studentId: propStudentId }) {
  /* READ USER, CLASS & SESSION FROM LOCALSTORAGE */
  let localUser = null;
  try {
    const rawUser = localStorage.getItem("user");
    if (rawUser) localUser = JSON.parse(rawUser);
  } catch (e) {
    console.error("Error parsing user from localStorage", e);
  }

  const studentId = propStudentId || localUser?.id || localUser?.student_id;
  const studentClass =
    localUser?.studentClass ||
    localUser?.className ||
    localUser?.class_name ||
    localStorage.getItem("studentClass") ||
    localStorage.getItem("className") ||
    "10th";

  const currentSession =
    localUser?.session ||
    localStorage.getItem("session") ||
    "2026-2027";

  /* STATES */
  const [subjectsList, setSubjectsList] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [mcqAnswers, setMcqAnswers] = useState(Array(10).fill(null));
  const [suggestion, setSuggestion] = useState("");
  const [problem, setProblem] = useState("");
  const [rating, setRating] = useState(0);

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [targetDate, setTargetDate] = useState({
    monthName: "",
    num: 0,
    year: 0,
  });

  /* FETCH CLASS SUBJECTS & SUBMITTED STATUS */
  useEffect(() => {
    const fetchData = async () => {
      const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];

      const date = new Date();
      const monthIndex = date.getMonth();
      const year = date.getFullYear();

      setTargetDate({
        monthName: months[monthIndex],
        num: monthIndex + 1,
        year: year,
      });

      try {
        setLoading(true);
        setErrorMessage("");

        const [listRes, feedbackRes] = await Promise.all([
          api.get(`/api/feedback/class-sub-teacher/${studentClass}`),
          api.get(`/api/feedback/student/${studentId}?month=${monthIndex + 1}&year=${year}`)
        ]);

        const completedKeys = new Set(
          feedbackRes.data?.feedbacks?.map(
            (f) => `${f.subject || f.subject_name}_${f.teacher_id}`
          ) || []
        );

        const rawTeachers = listRes.data?.teachers || listRes.data || [];

        const mappedTeachers = rawTeachers.map((item, idx) => {
          const teacherId = item.teacherId ?? item.teacher_id ?? item.id;
          const teacherName = item.teacherName || item.name || "Assigned Faculty";
          const subjectName = item.subjectName || item.subject_name || item.subject;
          const key = `${subjectName}_${teacherId}`;

          return {
            ...item,
            teacherId,
            teacherName,
            subjectName,
            uniqueId: `${teacherId}_${subjectName}_${idx}`,
            isCompleted: completedKeys.has(key),
          };
        });

        setSubjectsList(mappedTeachers);
      } catch (error) {
        console.error("Error fetching class feedback subjects:", error);
        setErrorMessage("Failed to load feedback details. Please check connection.");
      } finally {
        setLoading(false);
      }
    };

    if (studentClass && studentId) {
      fetchData();
    }
  }, [studentClass, studentId]);

  /* START FORM */
  const handleStartFeedback = (subjectItem) => {
    setSelectedSubject(subjectItem);
    setCurrentStep(0);
    setMcqAnswers(Array(10).fill(null));
    setSuggestion("");
    setProblem("");
    setRating(0);
    setSubmitted(false);
    setErrorMessage("");
  };

  /* SELECT OPTION */
  const handleOptionSelect = (index) => {
    const updated = [...mcqAnswers];
    updated[currentStep] = index + 1;
    setMcqAnswers(updated);

    if (currentStep < 9) {
      setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
      }, 200);
    } else {
      setTimeout(() => {
        setCurrentStep(10);
      }, 200);
    }
  };

  /* SUBMIT FEEDBACK */
  const handleSubmit = async () => {
    const unansweredIndex = mcqAnswers.findIndex((ans) => ans === null);
    if (unansweredIndex !== -1) {
      setErrorMessage(`Please answer Question ${unansweredIndex + 1} before submitting.`);
      setCurrentStep(unansweredIndex);
      return;
    }

    if (rating === 0 || !selectedSubject) {
      setErrorMessage("Please select a star rating before submitting.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");

      await api.post("/api/feedback/student/submit", {
        student_id: studentId,
        teacher_id: selectedSubject.teacherId, // Actual Teacher ID submitted
        subject: selectedSubject.subjectName,
        month: targetDate.num,
        year: targetDate.year,
        mcqAnswers,
        suggestion,
        problem,
        rating,
      });

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
      setErrorMessage(error.response?.data?.error || error.response?.data?.message || "Unable to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={loadingPage}>
        <div style={loadingCard}>
          <div style={loadingSpinner} />
          <h3 style={{ margin: "14px 0 6px", fontSize: "15px", color: "#1E293B" }}>
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
  const activeQuestions = selectedSubject ? createQuestions(selectedSubject.subjectName) : [];
  const progress = currentStep < 10 ? (answeredCount / 10) * 100 : 100;

  return (
    <div style={appContainer}>
      {/* HEADER */}
      <header style={headerSection}>
        <div style={brandGroup}>
          <div style={logoBox}>
            <FaGraduationCap />
          </div>
          <div>
            <h1 style={mainTitle}>Monthly Academic Feedback</h1>
            <p style={subTitle}>Class {studentClass} • Session {currentSession}</p>
          </div>
        </div>

        <div style={monthPill}>
          <span style={monthLabel}>Cycle</span>
          <strong style={monthValue}>
            {targetDate.monthName} {targetDate.year}
          </strong>
        </div>
      </header>

      {/* ERROR BANNER */}
      {errorMessage && (
        <div style={errorBanner}>
          <FaExclamationTriangle style={{ fontSize: "15px", color: "#DC2626" }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main style={contentWrapper}>
        <div style={centerPanel}>
          {!selectedSubject ? (
            /* SUBJECT LIST VIEW */
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={noticeBanner}>
                <FaInfoCircle style={{ fontSize: "16px", color: "#3B82F6", flexShrink: 0 }} />
                <span>
                  Please complete monthly evaluations for all assigned subjects and faculties in Class {studentClass}.
                </span>
              </div>

              {subjectsList.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#64748B" }}>
                  No assigned subjects or teachers found for Class {studentClass}.
                </div>
              ) : (
                subjectsList.map((item) => (
                  <div key={item.uniqueId} style={subjectRowCard}>
                    <div style={cardAccentStrip} />

                    <div style={cardContent}>
                      {/* TEACHER PHOTO */}
                      <div style={avatarBox}>
                        {item.teacherPhoto || item.photo ? (
                          <img
                            src={item.teacherPhoto || item.photo}
                            alt={item.teacherName}
                            style={teacherPhotoImg}
                          />
                        ) : (
                          <FaUserTie style={{ fontSize: "22px", color: "#94A3B8" }} />
                        )}
                      </div>

                      {/* DETAILS & SUBMIT BUTTON */}
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div>
                          <span style={subjectTag}>{item.subjectName}</span>
                          <h3 style={teacherNameText}>{item.subjectName}</h3>
                          
                          {/* TEACHER NAME WITH TEACHER ID IN BRACKETS */}
                          <span style={facultySubText}>
                            Faculty: <strong>{item.teacherName} [ID: {item.teacherId}]</strong>
                          </span>
                        </div>

                        <div style={{ marginTop: "6px" }}>
                          {item.isCompleted ? (
                            <div style={doneBadge}>
                              <FaCheckCircle style={{ fontSize: "12px" }} />
                              <span>Done Feedback</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartFeedback(item)}
                              style={submitFeedbackBtn}
                            >
                              <FaCommentDots style={{ fontSize: "12px" }} />
                              <span>Submit Feedback</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
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
                {selectedSubject.teacherPhoto || selectedSubject.photo ? (
                  <img
                    src={selectedSubject.teacherPhoto || selectedSubject.photo}
                    alt={selectedSubject.teacherName}
                    style={activeTeacherAvatar}
                  />
                ) : (
                  <div style={{ ...activeTeacherAvatar, display: "flex", alignItems: "center", justifyContent: "center", background: "#E2E8F0" }}>
                    <FaUserTie style={{ color: "#64748B" }} />
                  </div>
                )}
                <div>
                  <span style={activeSubTag}>{selectedSubject.subjectName}</span>
                  <h3 style={activeSubTeacher}>
                    {selectedSubject.teacherName} [ID: {selectedSubject.teacherId}]
                  </h3>
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
                      Thank you! Your feedback for <strong>{selectedSubject.subjectName}</strong> ({selectedSubject.teacherName} [ID: {selectedSubject.teacherId}]) has been submitted.
                    </p>
                    <button
                      onClick={() => setSelectedSubject(null)}
                      style={compactPrimaryBtn}
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
                          {currentStep + 1} <span style={{ fontSize: "13px", color: "#94A3B8" }}>/ 10</span>
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
                      
                      <h2 style={boldQuestionText}>
                        {activeQuestions[currentStep]?.question}
                      </h2>
                      
                      <p style={chooseText}>Select your response below:</p>

                      <div style={tabularOptionsGrid}>
                        {activeQuestions[currentStep]?.options.map((option, index) => {
                          const active = mcqAnswers[currentStep] === index + 1;
                          return (
                            <motion.button
                              key={index}
                              whileHover={{ y: -1 }}
                              whileTap={{ scale: 0.99 }}
                              onClick={() => handleOptionSelect(index)}
                              style={tableRowOptionBtn(active)}
                            >
                              <span style={optCircle(active)}>
                                {String.fromCharCode(65 + index)}
                              </span>
                              <span style={{ flex: 1, fontWeight: "600", fontSize: "13px" }}>{option}</span>
                              {active && <FaCheckCircle style={{ color: "#4F46E5", fontSize: "14px" }} />}
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
                        placeholder={`What could be improved in ${selectedSubject.subjectName} teaching or coursework?`}
                        style={inputStyle}
                      />
                    </div>

                    <div style={fieldGroup}>
                      <label style={labelStyle}>ISSUES / PROBLEMS FACED (IF ANY)</label>
                      <textarea
                        value={problem}
                        onChange={(e) => setProblem(e.target.value)}
                        placeholder={`Mention any difficulties faced during ${selectedSubject.subjectName} classes...`}
                        style={inputStyle}
                      />
                    </div>

                    <div style={ratingSection}>
                      <h3 style={ratingTitle}>Overall Subject & Teacher Rating</h3>
                      <p style={ratingSub}>Tap a star to rate your overall experience for {selectedSubject.subjectName}</p>
                      <div style={starsContainer}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <motion.button
                            key={star}
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setRating(star)}
                            style={starButton}
                            type="button"
                          >
                            <FaStar style={{ color: star <= rating ? "#F59E0B" : "#CBD5E1" }} />
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleSubmit}
                      disabled={rating === 0 || submitting || answeredCount < 10}
                      style={{
                        ...compactPrimaryBtn,
                        opacity: rating === 0 || submitting || answeredCount < 10 ? 0.5 : 1,
                        cursor: rating === 0 || submitting || answeredCount < 10 ? "not-allowed" : "pointer",
                      }}
                    >
                      <FaPaperPlane style={{ fontSize: "12px" }} /> {submitting ? "Submitting..." : "Submit Feedback"}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>

      {/* BOTTOM NAVIGATION */}
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
            {activeQuestions.map((_, index) => (
              <div
                key={index}
                style={dotStyle(mcqAnswers[index] !== null, currentStep === index)}
              />
            ))}
          </div>

          <button
            onClick={() => setCurrentStep(Math.min(10, currentStep + 1))}
            disabled={mcqAnswers[currentStep] === null}
            style={{
              ...navBtn,
              opacity: mcqAnswers[currentStep] === null ? 0.4 : 1,
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
   STYLING OBJECTS
========================================================= */
const appContainer = { minHeight: "100vh", width: "100%", background: "#F8FAFC", fontFamily: "'Inter', system-ui, -apple-system, sans-serif", color: "#0F172A", display: "flex", flexDirection: "column" };
const headerSection = { width: "100%", background: "#FFFFFF", borderBottom: "1px solid #E2E8F0", padding: "14px 28px", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" };
const brandGroup = { display: "flex", alignItems: "center", gap: "12px" };
const logoBox = { width: "38px", height: "38px", borderRadius: "10px", background: "linear-gradient(135deg, #4F46E5, #6366F1)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", boxShadow: "0 4px 12px rgba(79, 70, 229, 0.2)" };
const mainTitle = { margin: 0, fontSize: "17px", fontWeight: "800", color: "#0F172A", letterSpacing: "-0.3px" };
const subTitle = { margin: "2px 0 0", fontSize: "12px", color: "#64748B", fontWeight: "500" };
const monthPill = { background: "#F1F5F9", border: "1px solid #E2E8F0", padding: "4px 12px", borderRadius: "8px", textAlign: "right" };
const monthLabel = { display: "block", fontSize: "9px", color: "#64748B", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" };
const monthValue = { display: "block", color: "#4F46E5", fontSize: "12px", fontWeight: "800" };
const contentWrapper = { flex: 1, width: "100%", padding: "24px 16px 100px", boxSizing: "border-box" };
const centerPanel = { width: "100%", maxWidth: "720px", margin: "0 auto" };
const noticeBanner = { display: "flex", alignItems: "center", gap: "10px", background: "#EFF6FF", border: "1px solid #DBEAFE", padding: "12px 16px", borderRadius: "10px", fontSize: "12px", color: "#1E40AF", lineHeight: "1.4" };
const errorBanner = { margin: "14px auto 0", maxWidth: "720px", display: "flex", alignItems: "center", gap: "10px", background: "#FEF2F2", border: "1px solid #FECACA", padding: "10px 14px", borderRadius: "8px", color: "#991B1B", fontSize: "12px", fontWeight: "600" };
const subjectRowCard = { background: "#FFFFFF", borderRadius: "12px", border: "1px solid #E2E8F0", display: "flex", overflow: "hidden", boxShadow: "0 2px 8px rgba(15,23,42,0.03)" };
const cardAccentStrip = { width: "4px", background: "linear-gradient(180deg, #F59E0B, #D97706)" };
const cardContent = { flex: 1, padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: "16px" };
const avatarBox = { width: "48px", height: "48px", borderRadius: "50%", overflow: "hidden", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #E2E8F0", flexShrink: 0 };
const teacherPhotoImg = { width: "100%", height: "100%", objectFit: "cover" };
const subjectTag = { display: "inline-block", background: "#FEF3C7", color: "#B45309", fontSize: "10px", fontWeight: "800", padding: "2px 6px", borderRadius: "4px", marginBottom: "3px" };
const teacherNameText = { margin: 0, fontSize: "15px", fontWeight: "700", color: "#1E293B" };
const facultySubText = { display: "block", marginTop: "2px", fontSize: "11px", color: "#64748B", fontWeight: "500" };

const submitFeedbackBtn = { display: "inline-flex", alignItems: "center", gap: "6px", background: "#4F46E5", color: "#FFFFFF", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer" };
const doneBadge = { display: "inline-flex", alignItems: "center", gap: "5px", background: "#ECFDF5", color: "#047857", border: "1px solid #A7F3D0", padding: "5px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "700" };

const backToListBtn = { display: "inline-flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "#4F46E5", fontSize: "12px", fontWeight: "700", cursor: "pointer", marginBottom: "14px" };
const activeSubjectHeader = { background: "#FFFFFF", padding: "12px 16px", borderRadius: "10px", border: "1px solid #E2E8F0", marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px" };
const activeTeacherAvatar = { width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", border: "1.5px solid #E2E8F0" };
const activeSubTag = { fontSize: "10px", color: "#4F46E5", fontWeight: "800", textTransform: "uppercase" };
const activeSubTeacher = { margin: "1px 0 0", fontSize: "15px", fontWeight: "800", color: "#0F172A" };
const questionTop = { display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "8px" };
const smallLabel = { display: "block", fontSize: "9px", color: "#94A3B8", fontWeight: "800", letterSpacing: "0.5px" };
const questionNumber = { display: "block", marginTop: "1px", fontSize: "18px", color: "#0F172A", fontWeight: "900" };
const answeredText = { fontSize: "11px", color: "#64748B", fontWeight: "600" };
const progressTrack = { width: "100%", height: "5px", background: "#E2E8F0", borderRadius: "10px", overflow: "hidden", marginBottom: "18px" };
const progressFill = { height: "100%", background: "linear-gradient(90deg, #4F46E5, #6366F1)", borderRadius: "10px" };

const questionCard = { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "16px", padding: "22px", boxShadow: "0 4px 16px rgba(15,23,42,0.02)" };
const questionIcon = { width: "36px", height: "36px", borderRadius: "10px", background: "#EEF2FF", color: "#4F46E5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", marginBottom: "12px" };

const boldQuestionText = { margin: 0, color: "#0F172A", fontSize: "16px", lineHeight: "1.5", fontWeight: "800", letterSpacing: "-0.2px" };
const chooseText = { margin: "8px 0 16px", color: "#64748B", fontSize: "11px", fontWeight: "500" };

const tabularOptionsGrid = { display: "flex", flexDirection: "column", border: "1px solid #CBD5E1", borderRadius: "10px", overflow: "hidden", background: "#FFFFFF" };
const tableRowOptionBtn = (active) => ({
  width: "100%", padding: "12px 14px", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "10px", textAlign: "left",
  border: "none", borderBottom: "1px solid #E2E8F0", background: active ? "#EEF2FF" : "#FFFFFF", color: active ? "#312E81" : "#1E293B",
  cursor: "pointer", transition: "all .15s ease"
});

const optCircle = (active) => ({ width: "24px", height: "24px", minWidth: "24px", borderRadius: "6px", background: active ? "#4F46E5" : "#F1F5F9", color: active ? "#FFFFFF" : "#64748B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "800" });

const finalBox = { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "16px", padding: "22px" };
const finalHeader = { display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" };
const finalIcon = { width: "38px", height: "38px", borderRadius: "10px", background: "#EEF2FF", color: "#4F46E5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" };
const finalTitle = { margin: 0, fontSize: "18px", fontWeight: "800", color: "#0F172A" };
const finalSubTitle = { margin: "2px 0 0", color: "#64748B", fontSize: "11px" };
const fieldGroup = { marginBottom: "14px" };
const labelStyle = { display: "block", marginBottom: "5px", color: "#475569", fontSize: "10px", fontWeight: "800", letterSpacing: "0.5px" };
const inputStyle = { width: "100%", minHeight: "70px", boxSizing: "border-box", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F8FAFC", color: "#0F172A", outline: "none", resize: "vertical", fontSize: "12px", fontFamily: "inherit" };
const ratingSection = { marginTop: "10px", marginBottom: "18px", padding: "14px", textAlign: "center", borderRadius: "10px", background: "#F8FAFC", border: "1px solid #E2E8F0" };
const ratingTitle = { margin: 0, color: "#0F172A", fontSize: "13px", fontWeight: "800" };
const ratingSub = { margin: "3px 0 8px", color: "#94A3B8", fontSize: "10px" };
const starsContainer = { display: "flex", justifyContent: "center", gap: "6px" };
const starButton = { border: "none", background: "transparent", padding: "2px", cursor: "pointer", fontSize: "24px" };

const compactPrimaryBtn = { width: "100%", height: "38px", borderRadius: "8px", background: "#4F46E5", color: "#FFFFFF", border: "none", fontWeight: "800", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", cursor: "pointer" };
const successCard = { textAlign: "center", background: "#FFFFFF", borderRadius: "16px", padding: "28px", border: "1px solid #E2E8F0" };
const successIcon = { width: "48px", height: "48px", borderRadius: "50%", background: "#ECFDF5", color: "#10B981", fontSize: "24px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" };
const successTitle = { margin: 0, fontSize: "18px", fontWeight: "800", color: "#0F172A" };
const successText = { margin: "6px 0 20px", color: "#64748B", fontSize: "12px", lineHeight: "1.4" };
const bottomNav = { position: "fixed", bottom: 0, left: 0, width: "100%", boxSizing: "border-box", padding: "10px 24px", background: "rgba(255,255,255,0.96)", backdropFilter: "blur(12px)", borderTop: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", zIndex: 20 };
const navBtn = { border: "1px solid #CBD5E1", background: "#FFFFFF", color: "#475569", height: "34px", padding: "0 14px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", fontWeight: "700", cursor: "pointer" };
const dotsContainer = { display: "flex", alignItems: "center", gap: "4px" };
const dotStyle = (filled, current) => ({
  width: current ? "16px" : "5px",
  height: "5px",
  borderRadius: "8px",
  background: current ? "#4F46E5" : filled ? "#A5B4FC" : "#CBD5E1",
  transition: "all .2s ease"
});
const loadingPage = { minHeight: "100vh", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center" };
const loadingCard = { textAlign: "center", background: "#FFFFFF", padding: "28px", borderRadius: "14px", border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" };
const loadingSpinner = { border: "2.5px solid #F3F3F3", borderTop: "2.5px solid #4F46E5", borderRadius: "50%", width: "24px", height: "24px", animation: "spin 1s linear infinite", margin: "0 auto" };