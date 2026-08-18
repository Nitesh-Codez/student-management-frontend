import React, { useEffect, useState, useCallback } from "react";
import api from "../services/api";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const AttemptQuizPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const studentId = user?.id || user?._id;

  const TIMER_KEY = `quiz_expiry_${id}_${studentId}`;
  const ANSWERS_KEY = `quiz_answers_${id}_${studentId}`;

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  /* =========================================================
     GLOBAL RESPONSIVE STYLES
  ========================================================= */

  useEffect(() => {
    const style = document.createElement("style");

    style.innerHTML = `
      * {
        box-sizing: border-box;
      }

      html,
      body,
      #root {
        margin: 0;
        padding: 0;
        width: 100%;
        min-height: 100%;
      }

      body {
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont,
          "Segoe UI", sans-serif;
        overflow-x: hidden;
      }

      button {
        font-family: inherit;
      }

      ::selection {
        background: #6366f1;
        color: #fff;
      }

      .quiz-scroll::-webkit-scrollbar {
        height: 5px;
        width: 5px;
      }

      .quiz-scroll::-webkit-scrollbar-track {
        background: transparent;
      }

      .quiz-scroll::-webkit-scrollbar-thumb {
        background: #475569;
        border-radius: 20px;
      }

      @keyframes timerPulse {
        0%, 100% {
          transform: scale(1);
        }

        50% {
          transform: scale(1.04);
        }
      }

      @keyframes glow {
        0%, 100% {
          box-shadow: 0 0 0 rgba(99,102,241,0);
        }

        50% {
          box-shadow: 0 0 28px rgba(99,102,241,.22);
        }
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(12px);
        }

        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes shimmer {
        0% {
          background-position: -500px 0;
        }

        100% {
          background-position: 500px 0;
        }
      }

      .question-card {
        animation: slideUp .35s ease;
      }

      .option-card {
        transition:
          transform .2s ease,
          border-color .2s ease,
          background .2s ease,
          box-shadow .2s ease;
      }

      .option-card:hover {
        transform: translateY(-2px);
      }

      .nav-question {
        transition:
          transform .2s ease,
          background .2s ease,
          border-color .2s ease;
      }

      .nav-question:hover {
        transform: translateY(-2px);
      }

      .action-button {
        transition:
          transform .2s ease,
          box-shadow .2s ease,
          background .2s ease;
      }

      .action-button:hover {
        transform: translateY(-2px);
      }

      @media (max-width: 700px) {

        .desktop-hide {
          display: none !important;
        }

        .mobile-full {
          width: 100% !important;
        }

        .quiz-question-text {
          font-size: 21px !important;
          line-height: 1.45 !important;
        }

        .quiz-option-text {
          font-size: 15px !important;
          line-height: 1.45 !important;
        }

        .option-card {
          padding: 16px !important;
          border-radius: 14px !important;
        }

        .question-area {
          padding: 22px 14px 30px !important;
        }

        .bottom-actions {
          padding: 12px 14px 20px !important;
        }

        .header-title {
          font-size: 15px !important;
        }

        .timer-box {
          padding: 8px 11px !important;
          font-size: 14px !important;
        }

        .question-number {
          min-width: 34px !important;
          width: 34px !important;
          height: 34px !important;
          border-radius: 9px !important;
        }

        .exam-info {
          padding: 0 14px !important;
        }
      }

      @media (min-width: 701px) {
        .question-area {
          padding-left: 30px !important;
          padding-right: 30px !important;
        }
      }
    `;

    document.head.appendChild(style);

    return () => document.head.removeChild(style);
  }, []);

  /* =========================================================
     MATH FORMAT
  ========================================================= */

  const formatMath = (text) => {
    if (!text) return "";

    let str = text.toString();

    const fractions = {
      "1/2": "½",
      "1/4": "¼",
      "3/4": "¾",
      "1/3": "⅓",
      "2/3": "⅔",
    };

    Object.keys(fractions).forEach((f) => {
      str = str.replace(
        new RegExp(f, "g"),
        fractions[f]
      );
    });

    str = str.replace(
      /sqrt\((.*?)\)/g,
      "√$1"
    );

    str = str.replace(/sqrt/g, "√");

    const superscripts = {
      0: "⁰",
      1: "¹",
      2: "²",
      3: "³",
      4: "⁴",
      5: "⁵",
      6: "⁶",
      7: "⁷",
      8: "⁸",
      9: "⁹",
      n: "ⁿ",
      x: "ˣ",
      y: "ʸ",
      "+": "⁺",
      "-": "⁻",
      "(": "⁽",
      ")": "⁾",
    };

    str = str.replace(
      /\^(\((.*?)\)|[0-9nxy+-])/g,
      (match, p1, p2) => {
        const content = p2 || p1;

        return content
          .split("")
          .map(
            (char) =>
              superscripts[char] || char
          )
          .join("");
      }
    );

    str = str.replace(/pi/g, "π");
    str = str.replace(/degree/g, "°");
    str = str.replace(/!=/g, "≠");
    str = str.replace(/<=/g, "≤");
    str = str.replace(/>=/g, "≥");
    str = str.replace(/\*/g, "×");

    return str;
  };

  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit = useCallback(
    async (finalAnswers = answers) => {
      if (submitting) return;

      setSubmitting(true);

      try {
        const res = await api.post(
          `/api/quiz/submit`,
          {
            student_id: studentId,
            quiz_id: id,
            answers: finalAnswers,
          }
        );

        localStorage.removeItem(TIMER_KEY);
        localStorage.removeItem(ANSWERS_KEY);

        setResult(res.data.data || res.data);
      } catch (err) {
        console.error(err);
        alert("Error submitting quiz.");
      } finally {
        setSubmitting(false);
      }
    },
    [
      id,
      studentId,
      answers,
      submitting,
      TIMER_KEY,
      ANSWERS_KEY,
    ]
  );

  /* =========================================================
     FETCH QUIZ
  ========================================================= */

  useEffect(() => {
    document.body.style.background = "#f8fafc";

    const fetchQuiz = async () => {
      try {
        const res = await api.get(
          `/api/quiz/${id}`
        );

        const quizData = res.data;

        setQuiz(quizData);

        const q =
          typeof quizData.questions === "string"
            ? JSON.parse(quizData.questions)
            : quizData.questions;

        setQuestions(q || []);

        const savedAnswers =
          localStorage.getItem(ANSWERS_KEY);

        setAnswers(
          savedAnswers
            ? JSON.parse(savedAnswers)
            : new Array(q.length).fill(null)
        );

        const savedExpiry =
          localStorage.getItem(TIMER_KEY);

        const expiryTime = savedExpiry
          ? parseInt(savedExpiry)
          : Date.now() +
            quizData.timer_minutes *
              60 *
              1000;

        if (!savedExpiry) {
          localStorage.setItem(
            TIMER_KEY,
            expiryTime.toString()
          );
        }

        setTimeLeft(
          Math.max(
            0,
            Math.floor(
              (expiryTime - Date.now()) / 1000
            )
          )
        );
      } catch (err) {
        console.error(
          "Quiz loading error:",
          err
        );
      }
    };

    fetchQuiz();

    return () => {
      document.body.style.background = "";
    };
  }, [id, TIMER_KEY, ANSWERS_KEY]);

  /* =========================================================
     TIMER
  ========================================================= */

  useEffect(() => {
    if (
      timeLeft === null ||
      result
    ) {
      return;
    }

    if (timeLeft <= 0) {
      if (!submitting) {
        handleSubmit();
      }

      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) =>
        prev <= 1 ? 0 : prev - 1
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [
    timeLeft,
    result,
    submitting,
    handleSubmit,
  ]);

  /* =========================================================
     ANSWER SELECT
  ========================================================= */

  const handleOptionSelect = (option) => {
    const newAnswers = [...answers];

    newAnswers[currentIdx] = option;

    setAnswers(newAnswers);

    localStorage.setItem(
      ANSWERS_KEY,
      JSON.stringify(newAnswers)
    );

    if (
      currentIdx <
      questions.length - 1
    ) {
      setTimeout(() => {
        setCurrentIdx(
          (prev) => prev + 1
        );

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }, 450);
    }
  };

  /* =========================================================
     TIME
  ========================================================= */

  const formatTime = (seconds) => {
    if (seconds === null) return "--:--";

    const mins = Math.floor(
      seconds / 60
    );

    const secs = seconds % 60;

    return `${mins}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  /* =========================================================
     STATES
  ========================================================= */

  if (!quiz) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.loadingIcon}>
          ⚡
        </div>

        <div
          style={styles.loadingSpinner}
        />

        <strong style={styles.loadingTitle}>
          Preparing your exam...
        </strong>

        <span style={styles.loadingText}>
          Please wait
        </span>
      </div>
    );
  }

  if (result) {
    const percentage = Math.round(
      Number(result.percentage || 0)
    );

    return (
      <div style={styles.resultPage}>

        <motion.div
          initial={{
            opacity: 0,
            scale: 0.85,
            y: 20,
          }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
          }}
          transition={{
            duration: 0.55,
          }}
          style={styles.resultCard}
        >

          <div style={styles.resultTopGlow} />

          <div style={styles.resultIcon}>
            {percentage >= 85
              ? "🏆"
              : percentage >= 60
              ? "🎉"
              : "📚"}
          </div>

          <div style={styles.resultLabel}>
            ASSESSMENT COMPLETE
          </div>

          <h1 style={styles.resultTitle}>
            Quiz Finished!
          </h1>

          <p style={styles.resultSubtitle}>
            Here's your performance summary
          </p>

          <div
            style={{
              ...styles.resultCircle,
              background: `conic-gradient(
                #22d3ee ${percentage * 3.6}deg,
                #334155 0deg
              )`,
            }}
          >
            <div
              style={
                styles.resultCircleInner
              }
            >
              <strong>
                {percentage}%
              </strong>

              <span>
                Score
              </span>
            </div>
          </div>

          <div style={styles.resultStats}>

            <div style={styles.resultStat}>
              <span>Correct Score</span>
              <strong>
                {result.score || 0}
              </strong>
            </div>

            <div style={styles.resultDivider} />

            <div style={styles.resultStat}>
              <span>Total Marks</span>
              <strong>
                {quiz.total_marks || 0}
              </strong>
            </div>

          </div>

          <button
            className="action-button"
            onClick={() =>
              navigate(
                "/student/dashboard"
              )
            }
            style={styles.dashboardButton}
          >
            Back to Dashboard
            <span>→</span>
          </button>

        </motion.div>
      </div>
    );
  }

  const totalQuestions =
    questions.length;

  const attemptedCount =
    answers.filter(
      (answer) => answer !== null
    ).length;

  const progress =
    totalQuestions > 0
      ? (attemptedCount /
          totalQuestions) *
        100
      : 0;

  const isLastQuestion =
    currentIdx ===
    totalQuestions - 1;

  const isFirstQuestion =
    currentIdx === 0;

  const timerDanger =
    timeLeft !== null &&
    timeLeft <= 60;

  const timerWarning =
    timeLeft !== null &&
    timeLeft <= 180 &&
    timeLeft > 60;

  const currentQuestion =
    questions[currentIdx];

  return (
    <div style={styles.exam}>

      {/* =====================================================
          TOP EXAM HEADER
      ===================================================== */}

      <header style={styles.topHeader}>

        <div
          className="exam-info"
          style={styles.headerInner}
        >

          <div style={styles.examTitleArea}>

            <div style={styles.examBrand}>
              <div
                style={styles.brandIcon}
              >
                ⚡
              </div>

              <div>
                <h1
                  className="header-title"
                  style={styles.examTitle}
                >
                  {quiz.title}
                </h1>

                <div style={styles.examMeta}>
                  {quiz.subject}
                  <span>•</span>
                  {totalQuestions} Questions
                </div>
              </div>
            </div>

          </div>

          {/* TIMER */}

          <motion.div
            animate={
              timerDanger
                ? {
                    scale: [
                      1,
                      1.05,
                      1,
                    ],
                  }
                : {}
            }
            transition={{
              repeat: Infinity,
              duration: 0.65,
            }}
            className="timer-box"
            style={{
              ...styles.timer,
              color: timerDanger
                ? "#f87171"
                : timerWarning
                ? "#fbbf24"
                : "#67e8f9",
              borderColor:
                timerDanger
                  ? "rgba(248,113,113,.4)"
                  : timerWarning
                  ? "rgba(251,191,36,.35)"
                  : "rgba(103,232,249,.2)",
              background:
                timerDanger
                  ? "rgba(127,29,29,.25)"
                  : "rgba(255,255,255,.06)",
            }}
          >
            <span style={styles.timerIcon}>
              ⏱
            </span>

            <span>
              {formatTime(timeLeft)}
            </span>
          </motion.div>

        </div>

        {/* PROGRESS */}

        <div style={styles.progressOuter}>
          <motion.div
            animate={{
              width: `${progress}%`,
            }}
            transition={{
              duration: 0.4,
            }}
            style={styles.progressInner}
          />
        </div>

        {/* QUESTION NAVIGATOR */}

        <div
          className="quiz-scroll"
          style={styles.questionNavScroll}
        >

          <div style={styles.questionNav}>

            {questions.map(
              (_, index) => {

                const isCurrent =
                  currentIdx === index;

                const isAttempted =
                  answers[index] !==
                  null;

                return (
                  <motion.button
                    key={index}
                    whileTap={{
                      scale: 0.9,
                    }}
                    className="nav-question"
                    onClick={() =>
                      setCurrentIdx(
                        index
                      )
                    }
                    style={{
                      ...styles.questionNumber,
                      background:
                        isCurrent
                          ? "#22d3ee"
                          : isAttempted
                          ? "#f8fafc"
                          : "rgba(255,255,255,.07)",
                      color:
                        isCurrent ||
                        isAttempted
                          ? "#0f172a"
                          : "#cbd5e1",
                      borderColor:
                        isCurrent
                          ? "#a5f3fc"
                          : isAttempted
                          ? "#f8fafc"
                          : "rgba(255,255,255,.1)",
                    }}
                  >
                    {index + 1}
                  </motion.button>
                );
              }
            )}

          </div>

        </div>

      </header>

      {/* =====================================================
          MAIN QUESTION AREA
      ===================================================== */}

      <main
        className="question-area"
        style={styles.questionArea}
      >

        <div style={styles.questionContainer}>

          <AnimatePresence mode="wait">

            <motion.div
              key={currentIdx}
              initial={{
                opacity: 0,
                x: 30,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              exit={{
                opacity: 0,
                x: -30,
              }}
              transition={{
                duration: 0.3,
              }}
              className="question-card"
            >

              {/* QUESTION LABEL */}

              <div style={styles.questionHeader}>

                <div
                  style={
                    styles.questionBadge
                  }
                >
                  QUESTION{" "}
                  {currentIdx + 1}
                </div>

                <span
                  style={
                    styles.questionProgressText
                  }
                >
                  {attemptedCount}/
                  {totalQuestions} answered
                </span>

              </div>

              {/* QUESTION */}

              <h2
                className="quiz-question-text"
                style={styles.questionText}
              >
                {formatMath(
                  currentQuestion?.question
                )}
              </h2>

              {/* OPTIONS */}

              <div
                style={styles.options}
              >

                {currentQuestion?.options?.map(
                  (option, index) => {

                    const selected =
                      answers[
                        currentIdx
                      ] === option;

                    const letters = [
                      "A",
                      "B",
                      "C",
                      "D",
                      "E",
                    ];

                    return (
                      <motion.button
                        key={index}
                        whileTap={{
                          scale: 0.985,
                        }}
                        onClick={() =>
                          handleOptionSelect(
                            option
                          )
                        }
                        className="option-card"
                        style={{
                          ...styles.option,
                          background:
                            selected
                              ? "linear-gradient(135deg,#ecfeff,#cffafe)"
                              : "#ffffff",
                          borderColor:
                            selected
                              ? "#22d3ee"
                              : "#e2e8f0",
                          boxShadow:
                            selected
                              ? "0 10px 30px rgba(6,182,212,.12)"
                              : "0 4px 14px rgba(15,23,42,.04)",
                        }}
                      >

                        <div
                          style={{
                            ...styles.optionLetter,
                            background:
                              selected
                                ? "#0f172a"
                                : "#f1f5f9",
                            color:
                              selected
                                ? "#fff"
                                : "#475569",
                          }}
                        >
                          {letters[index] ||
                            index + 1}
                        </div>

                        <span
                          className="quiz-option-text"
                          style={{
                            ...styles.optionText,
                            color:
                              selected
                                ? "#0f172a"
                                : "#334155",
                            fontWeight:
                              selected
                                ? 750
                                : 550,
                          }}
                        >
                          {formatMath(
                            option
                          )}
                        </span>

                        <div
                          style={{
                            ...styles.optionCheck,
                            borderColor:
                              selected
                                ? "#0891b2"
                                : "#cbd5e1",
                            background:
                              selected
                                ? "#0891b2"
                                : "#fff",
                          }}
                        >
                          {selected && (
                            <motion.span
                              initial={{
                                scale: 0,
                              }}
                              animate={{
                                scale: 1,
                              }}
                              style={
                                styles.checkMark
                              }
                            >
                              ✓
                            </motion.span>
                          )}
                        </div>

                      </motion.button>
                    );
                  }
                )}

              </div>

            </motion.div>

          </AnimatePresence>

        </div>

      </main>

      {/* =====================================================
          BOTTOM NAVIGATION
      ===================================================== */}

      <footer
        className="bottom-actions"
        style={styles.bottomBar}
      >

        <div style={styles.bottomInner}>

          <button
            disabled={isFirstQuestion}
            className="action-button"
            onClick={() => {
              if (!isFirstQuestion) {
                setCurrentIdx(
                  currentIdx - 1
                );

                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                });
              }
            }}
            style={{
              ...styles.previousButton,
              opacity:
                isFirstQuestion
                  ? 0.35
                  : 1,
              cursor:
                isFirstQuestion
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            <span>←</span>
            Previous
          </button>

          <div
            className="desktop-hide"
            style={
              styles.bottomProgress
            }
          >
            <strong>
              {currentIdx + 1}
            </strong>
            <span>
              / {totalQuestions}
            </span>
          </div>

          {isLastQuestion ? (

            <button
              disabled={submitting}
              className="action-button"
              onClick={() =>
                handleSubmit()
              }
              style={{
                ...styles.finishButton,
                opacity: submitting
                  ? 0.7
                  : 1,
              }}
            >
              {submitting
                ? "Submitting..."
                : "Finish Quiz ✓"}
            </button>

          ) : (

            <button
              className="action-button"
              onClick={() => {
                setCurrentIdx(
                  currentIdx + 1
                );

                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                });
              }}
              style={styles.nextButton}
            >
              Next
              <span>→</span>
            </button>

          )}

        </div>

      </footer>

    </div>
  );
};

/* =========================================================
   STYLES
========================================================= */

const styles = {
  exam: {
    width: "100%",
    minHeight: "100vh",
    background:
      "linear-gradient(180deg,#f8fafc 0%,#eef2ff 100%)",
    color: "#0f172a",
  },

  topHeader: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    background:
      "linear-gradient(135deg,#0f172a,#172554 60%,#312e81)",
    color: "#fff",
    boxShadow:
      "0 8px 30px rgba(15,23,42,.22)",
  },

  headerInner: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    padding: "16px 22px",
  },

  examTitleArea: {
    minWidth: 0,
    flex: 1,
  },

  examBrand: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
    minWidth: 0,
  },

  brandIcon: {
    width: "38px",
    height: "38px",
    minWidth: "38px",
    borderRadius: "11px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg,#22d3ee,#6366f1)",
    color: "#fff",
    fontSize: "17px",
    boxShadow:
      "0 6px 20px rgba(34,211,238,.22)",
  },

  examTitle: {
    margin: 0,
    color: "#fff",
    fontSize: "18px",
    fontWeight: 850,
    letterSpacing: "-.3px",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  },

  examMeta: {
    display: "flex",
    gap: "7px",
    alignItems: "center",
    marginTop: "3px",
    color: "#94a3b8",
    fontSize: "10px",
    fontWeight: 600,
  },

  timer: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: "7px",
    border: "1px solid",
    padding: "9px 14px",
    borderRadius: "11px",
    fontSize: "16px",
    fontWeight: 900,
    letterSpacing: ".5px",
    backdropFilter: "blur(12px)",
  },

  timerIcon: {
    fontSize: "15px",
  },

  progressOuter: {
    width: "100%",
    height: "4px",
    background:
      "rgba(255,255,255,.08)",
  },

  progressInner: {
    height: "100%",
    background:
      "linear-gradient(90deg,#22d3ee,#818cf8,#c084fc)",
    boxShadow:
      "0 0 14px rgba(34,211,238,.5)",
  },

  questionNavScroll: {
    width: "100%",
    overflowX: "auto",
    padding: "11px 0 12px",
  },

  questionNav: {
    display: "flex",
    gap: "7px",
    padding: "0 18px",
    minWidth: "max-content",
  },

  questionNumber: {
    width: "36px",
    height: "36px",
    minWidth: "36px",
    padding: 0,
    border: "1px solid",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: 850,
  },

  questionArea: {
    width: "100%",
    padding:
      "32px 20px 40px",
  },

  questionContainer: {
    width: "100%",
    maxWidth: "1100px",
    margin: "0 auto",
  },

  questionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    marginBottom: "17px",
  },

  questionBadge: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: "7px",
    background: "#e0e7ff",
    color: "#4338ca",
    fontSize: "9px",
    fontWeight: 900,
    letterSpacing: ".9px",
  },

  questionProgressText: {
    color: "#64748b",
    fontSize: "10px",
    fontWeight: 700,
  },

  questionText: {
    margin: 0,
    maxWidth: "1000px",
    color: "#0f172a",
    fontSize: "28px",
    lineHeight: 1.4,
    fontWeight: 800,
    letterSpacing: "-.5px",
  },

  options: {
    display: "flex",
    flexDirection: "column",
    gap: "11px",
    marginTop: "30px",
  },

  option: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "13px",
    padding: "18px",
    border: "1px solid",
    borderRadius: "14px",
    cursor: "pointer",
    textAlign: "left",
  },

  optionLetter: {
    width: "35px",
    height: "35px",
    minWidth: "35px",
    borderRadius: "9px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: 900,
  },

  optionText: {
    flex: 1,
    fontSize: "16px",
    lineHeight: 1.5,
  },

  optionCheck: {
    width: "22px",
    height: "22px",
    minWidth: "22px",
    borderRadius: "50%",
    border: "2px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  checkMark: {
    color: "#fff",
    fontSize: "12px",
    fontWeight: 900,
  },

  bottomBar: {
    position: "sticky",
    bottom: 0,
    zIndex: 90,
    width: "100%",
    background:
      "rgba(255,255,255,.94)",
    backdropFilter: "blur(18px)",
    borderTop:
      "1px solid rgba(226,232,240,.9)",
    boxShadow:
      "0 -8px 30px rgba(15,23,42,.07)",
  },

  bottomInner: {
    width: "100%",
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "12px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },

  previousButton: {
    minWidth: "120px",
    border:
      "1px solid #cbd5e1",
    background: "#fff",
    color: "#334155",
    padding: "11px 15px",
    borderRadius: "10px",
    fontSize: "11px",
    fontWeight: 800,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "8px",
  },

  nextButton: {
    minWidth: "120px",
    border: "none",
    background:
      "linear-gradient(135deg,#4f46e5,#6366f1)",
    color: "#fff",
    padding: "11px 17px",
    borderRadius: "10px",
    fontSize: "11px",
    fontWeight: 850,
    cursor: "pointer",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "9px",
    boxShadow:
      "0 7px 18px rgba(79,70,229,.22)",
  },

  finishButton: {
    minWidth: "150px",
    border: "none",
    background:
      "linear-gradient(135deg,#059669,#0d9488)",
    color: "#fff",
    padding: "11px 17px",
    borderRadius: "10px",
    fontSize: "11px",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow:
      "0 7px 18px rgba(5,150,105,.2)",
  },

  bottomProgress: {
    color: "#64748b",
    fontSize: "10px",
  },

  loadingPage: {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg,#eef2ff,#f8fafc)",
  },

  loadingIcon: {
    width: "58px",
    height: "58px",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg,#4f46e5,#06b6d4)",
    color: "#fff",
    fontSize: "24px",
    marginBottom: "17px",
  },

  loadingSpinner: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    border:
      "3px solid #e2e8f0",
    borderTopColor: "#4f46e5",
    animation:
      "spin .8s linear infinite",
  },

  loadingTitle: {
    marginTop: "15px",
    color: "#0f172a",
    fontSize: "14px",
  },

  loadingText: {
    color: "#64748b",
    fontSize: "11px",
    marginTop: "5px",
  },

  resultPage: {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    background:
      "radial-gradient(circle at top,#312e81 0%,#111827 42%,#020617 100%)",
  },

  resultCard: {
    position: "relative",
    overflow: "hidden",
    width: "100%",
    maxWidth: "470px",
    padding: "42px 28px 30px",
    borderRadius: "26px",
    background:
      "linear-gradient(145deg,#1e293b,#0f172a)",
    border:
      "1px solid rgba(255,255,255,.09)",
    boxShadow:
      "0 35px 80px rgba(0,0,0,.35)",
    textAlign: "center",
  },

  resultTopGlow: {
    position: "absolute",
    width: "180px",
    height: "180px",
    borderRadius: "50%",
    background:
      "rgba(34,211,238,.12)",
    filter: "blur(40px)",
    top: "-100px",
    left: "50%",
    transform: "translateX(-50%)",
  },

  resultIcon: {
    position: "relative",
    fontSize: "48px",
  },

  resultLabel: {
    marginTop: "12px",
    color: "#67e8f9",
    fontSize: "9px",
    fontWeight: 900,
    letterSpacing: "1.5px",
  },

  resultTitle: {
    color: "#fff",
    margin:
      "7px 0 5px",
    fontSize: "27px",
    fontWeight: 900,
  },

  resultSubtitle: {
    color: "#94a3b8",
    margin: 0,
    fontSize: "11px",
  },

  resultCircle: {
    width: "150px",
    height: "150px",
    borderRadius: "50%",
    margin: "28px auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  resultCircleInner: {
    width: "126px",
    height: "126px",
    borderRadius: "50%",
    background: "#0f172a",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },

  resultStats: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding:
      "15px 20px",
    borderRadius: "13px",
    background:
      "rgba(255,255,255,.04)",
    border:
      "1px solid rgba(255,255,255,.07)",
  },

  resultStat: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },

  resultDivider: {
    width: "1px",
    height: "35px",
    background:
      "rgba(255,255,255,.12)",
  },

  dashboardButton: {
    width: "100%",
    marginTop: "20px",
    border: "none",
    padding: "14px",
    borderRadius: "12px",
    background:
      "linear-gradient(135deg,#22d3ee,#6366f1)",
    color: "#fff",
    fontSize: "12px",
    fontWeight: 900,
    cursor: "pointer",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "9px",
  },
};

export default AttemptQuizPage;