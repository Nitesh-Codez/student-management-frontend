import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaTimes,
  FaChevronLeft,
  FaStar,
  FaBolt,
  FaAward,
  FaChartLine,
  FaCheckCircle,
  FaTimesCircle,
  FaMinusCircle,
  FaTrophy,
  FaArrowUp,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";

// ======================================================
// NORMALIZE
// ======================================================
const normalize = (val) => {
  if (val === null || val === undefined) return "";

  return String(val)
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();
};

// ======================================================
// QUIZ REVIEW
// ======================================================
const QuizReview = () => {
  const { quizId, studentId } = useParams();
  const navigate = useNavigate();

  const [reviewData, setReviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [showTop, setShowTop] = useState(false);

  const questionRefs = useRef([]);
  const bubbleRefs = useRef([]);

  // ======================================================
  // FETCH
  // ======================================================
  useEffect(() => {
    window.scrollTo(0, 0);

    const fetchReviewData = async () => {
      try {
        setLoading(true);

        const response = await api.get(
          `/api/quiz/review/${quizId}/${studentId}`
        );

        if (response.data?.success) {
          setReviewData(response.data.data);
        }
      } catch (err) {
        console.error("Error fetching review:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReviewData();
  }, [quizId, studentId]);

  // ======================================================
  // SCROLL TRACKING
  // ======================================================
  useEffect(() => {
    if (!reviewData) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.dataset.index);

            setActiveQuestion(index);

            if (bubbleRefs.current[index]) {
              bubbleRefs.current[index].scrollIntoView({
                behavior: "smooth",
                inline: "center",
                block: "nearest",
              });
            }
          }
        });
      },
      {
        threshold: 0.35,
        rootMargin: "-15% 0px -55% 0px",
      }
    );

    questionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [reviewData]);

  // ======================================================
  // SHOW BACK TO TOP
  // ======================================================
  useEffect(() => {
    const handleScroll = () => {
      setShowTop(window.scrollY > 500);
    };

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ======================================================
  // JUMP
  // ======================================================
  const scrollToQuestion = (index) => {
    const element = questionRefs.current[index];

    if (!element) return;

    const y =
      element.getBoundingClientRect().top +
      window.pageYOffset -
      125;

    window.scrollTo({
      top: y,
      behavior: "smooth",
    });
  };

  // ======================================================
  // LOADING
  // ======================================================
  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <motion.div
          animate={{
            rotate: 360,
            scale: [1, 1.12, 1],
          }}
          transition={{
            rotate: {
              repeat: Infinity,
              duration: 1,
              ease: "linear",
            },
            scale: {
              repeat: Infinity,
              duration: 1.2,
            },
          }}
          style={styles.loadingIcon}
        >
          <FaChartLine />
        </motion.div>

        <div style={styles.loadingTitle}>
          Preparing Performance Report
        </div>

        <div style={styles.loadingSub}>
          Analysing your quiz performance...
        </div>
      </div>
    );
  }

  // ======================================================
  // DATA
  // ======================================================
  const {
    quiz_info = {},
    questions = [],
    student_answers = [],
    student_result = {},
  } = reviewData || {};

  const totalQuestions = questions.length;

  const correctAnswers = student_result.score || 0;

  const wrongAnswers = Math.max(
    0,
    totalQuestions - correctAnswers -
      questions.filter((_, i) => !student_answers[i]).length
  );

  const skippedAnswers = questions.filter(
    (_, i) => !student_answers[i]
  ).length;

  const scorePercent = Math.round(
    ((student_result.score || 0) /
      (totalQuestions || 1)) *
      100
  );

  const qualified = scorePercent >= 40;

  // ======================================================
  // STAR ANIMATION
  // ======================================================
  const stars = [
    { top: "8%", left: "10%", size: 13, delay: 0 },
    { top: "22%", right: "12%", size: 18, delay: 0.5 },
    { bottom: "12%", left: "8%", size: 15, delay: 1 },
    { top: "2%", right: "28%", size: 12, delay: 1.5 },
    { bottom: "18%", right: "8%", size: 17, delay: 2 },
  ];

  return (
    <>
      {/* ==================================================
          GLOBAL STYLE
      ================================================== */}
      <style>
        {`
          * {
            box-sizing: border-box;
          }

          html {
            scroll-behavior: smooth;
          }

          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #f8fafc;
            font-family:
              Inter,
              ui-sans-serif,
              system-ui,
              -apple-system,
              BlinkMacSystemFont,
              "Segoe UI",
              sans-serif;
          }

          button {
            font-family: inherit;
          }

          ::-webkit-scrollbar {
            width: 7px;
            height: 7px;
          }

          ::-webkit-scrollbar-track {
            background: #f1f5f9;
          }

          ::-webkit-scrollbar-thumb {
            background: #94a3b8;
            border-radius: 20px;
          }

          ::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }

          .quiz-option:hover {
            transform: translateX(5px);
          }

          .roadmap-item:hover {
            transform: translateY(-2px);
          }

          @media (max-width: 700px) {
            .hero-title {
              font-size: 17px !important;
            }

            .hero-score {
              font-size: 64px !important;
            }

            .stats-number {
              font-size: 20px !important;
            }

            .question-title {
              font-size: 17px !important;
            }

            .option-text {
              font-size: 14px !important;
            }

            .question-card {
              padding: 25px 16px !important;
            }
          }
        `}
      </style>

      <div style={styles.page}>

        {/* ==================================================
            HERO
        ================================================== */}
        <header style={styles.hero}>

          {/* NAVIGATION */}
          <div style={styles.navBar}>

            <button
              onClick={() => navigate(-1)}
              style={styles.navButton}
            >
              <FaChevronLeft />
            </button>

            <div style={styles.navCenter}>
              <div className="hero-title" style={styles.heroTitle}>
                {quiz_info.title || "Quiz Review"}
              </div>

              <div style={styles.heroSubtitle}>
                PERFORMANCE ANALYTICS
              </div>
            </div>

            <button
              onClick={() => navigate(-1)}
              style={styles.navButton}
            >
              <FaTimes />
            </button>

          </div>

          {/* SCORE AREA */}
          <div style={styles.scoreArea}>

            {stars.map((star, index) => (
              <motion.div
                key={index}
                animate={{
                  y: [0, -10, 0],
                  opacity: [0.4, 1, 0.4],
                  scale: [0.8, 1, 0.8],
                }}
                transition={{
                  duration: 2.8,
                  repeat: Infinity,
                  delay: star.delay,
                }}
                style={{
                  ...styles.floatingStar,
                  top: star.top,
                  left: star.left,
                  right: star.right,
                  bottom: star.bottom,
                }}
              >
                <FaStar size={star.size} />
              </motion.div>
            ))}

            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 180,
                delay: 0.1,
              }}
              style={styles.trophy}
            >
              <FaTrophy />
            </motion.div>

            <motion.div
              className="hero-score"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.7,
                delay: 0.2,
              }}
              style={styles.score}
            >
              {scorePercent}%
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              style={{
                ...styles.qualifiedBadge,
                background: qualified
                  ? "#10b981"
                  : "#ef4444",
              }}
            >
              {qualified
                ? "✓ QUALIFIED"
                : "✕ NOT QUALIFIED"}
            </motion.div>

            <div style={styles.heroMeta}>
              {quiz_info.subject && (
                <span>{quiz_info.subject}</span>
              )}

              <span>•</span>

              <span>{totalQuestions} Questions</span>
            </div>

          </div>

        </header>

        {/* ==================================================
            STATS
        ================================================== */}
        <section style={styles.statsWrapper}>
          <div style={styles.statsCard}>

            <Stat
              icon={<FaChartLine />}
              number={totalQuestions}
              label="TOTAL"
              color="#334155"
            />

            <Stat
              icon={<FaCheckCircle />}
              number={correctAnswers}
              label="CORRECT"
              color="#059669"
            />

            <Stat
              icon={<FaTimesCircle />}
              number={wrongAnswers}
              label="WRONG"
              color="#dc2626"
            />

            <Stat
              icon={<FaMinusCircle />}
              number={skippedAnswers}
              label="SKIPPED"
              color="#64748b"
              last
            />

          </div>
        </section>

        {/* ==================================================
            QUESTION ROADMAP
        ================================================== */}
        <div style={styles.roadmap}>

          <div style={styles.roadmapTop}>

            <div style={styles.roadmapTitle}>
              <FaBolt color="#f59e0b" />
              <span>Question Roadmap</span>
            </div>

            <div style={styles.progressInfo}>
              Q{activeQuestion + 1} / {totalQuestions}
            </div>

          </div>

          <div
            style={styles.roadmapScroll}
            className="no-scrollbar"
          >
            {questions.map((q, index) => {

              const isActive =
                activeQuestion === index;

              const studentChoice =
                student_answers[index];

              const isSkipped = !studentChoice;

              const isCorrect =
                normalize(studentChoice) ===
                normalize(q.answer);

              let bg = "#f8fafc";
              let color = "#64748b";
              let border = "#e2e8f0";

              if (isCorrect) {
                bg = "#ecfdf5";
                color = "#059669";
                border = "#86efac";
              }

              if (!isCorrect && !isSkipped) {
                bg = "#fef2f2";
                color = "#dc2626";
                border = "#fca5a5";
              }

              if (isActive) {
                bg = "#064e3b";
                color = "#fff";
                border = "#064e3b";
              }

              return (
                <motion.button
                  key={index}
                  ref={(el) =>
                    (bubbleRefs.current[index] = el)
                  }
                  onClick={() =>
                    scrollToQuestion(index)
                  }
                  whileTap={{ scale: 0.92 }}
                  className="roadmap-item"
                  style={{
                    ...styles.roadmapBubble,
                    background: bg,
                    color,
                    borderColor: border,
                  }}
                >
                  {index + 1}
                </motion.button>
              );
            })}
          </div>

          {/* LEGEND */}
          <div style={styles.legend}>

            <Legend
              color="#10b981"
              label="Correct"
            />

            <Legend
              color="#ef4444"
              label="Wrong"
            />

            <Legend
              color="#94a3b8"
              label="Skipped"
            />

          </div>

        </div>

        {/* ==================================================
            QUESTIONS
        ================================================== */}
        <main style={styles.questionsArea}>

          {questions.map((q, index) => {

            const studentChoice =
              student_answers[index];

            const correctAns = q.answer;

            const isSkipped = !studentChoice;

            const isCorrect =
              normalize(studentChoice) ===
              normalize(correctAns);

            return (
              <motion.section
                key={index}
                ref={(el) =>
                  (questionRefs.current[index] = el)
                }
                data-index={index}
                initial={{
                  opacity: 0,
                  y: 25,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                viewport={{
                  once: true,
                  amount: 0.1,
                }}
                transition={{
                  duration: 0.45,
                }}
                className="question-card"
                style={{
                  ...styles.questionCard,
                  borderLeft:
                    activeQuestion === index
                      ? "5px solid #047857"
                      : "5px solid transparent",
                }}
              >

                <div style={styles.questionInner}>

                  {/* QUESTION HEADER */}
                  <div style={styles.questionHeader}>

                    <div style={styles.questionNumber}>
                      QUESTION {index + 1}
                    </div>

                    <div
                      style={{
                        ...styles.status,
                        color: isSkipped
                          ? "#64748b"
                          : isCorrect
                          ? "#059669"
                          : "#dc2626",
                        background: isSkipped
                          ? "#f1f5f9"
                          : isCorrect
                          ? "#ecfdf5"
                          : "#fef2f2",
                      }}
                    >
                      {isSkipped
                        ? "SKIPPED"
                        : isCorrect
                        ? "CORRECT"
                        : "INCORRECT"}
                    </div>

                  </div>

                  {/* QUESTION */}
                  <h2
                    className="question-title"
                    style={styles.questionTitle}
                  >
                    {q.question_text ||
                      q.question ||
                      "Question"}
                  </h2>

                  {/* OPTIONS */}
                  <div style={styles.options}>

                    {q.options?.map((opt, optionIndex) => {

                      const isCorrectOption =
                        normalize(opt) ===
                        normalize(correctAns);

                      const isUserOption =
                        normalize(opt) ===
                        normalize(studentChoice);

                      let optionBackground =
                        "#ffffff";

                      let optionBorder =
                        "#e2e8f0";

                      let prefixBackground =
                        "#f1f5f9";

                      let prefixColor =
                        "#64748b";

                      if (isCorrectOption) {
                        optionBackground =
                          "#ecfdf5";

                        optionBorder =
                          "#10b981";

                        prefixBackground =
                          "#10b981";

                        prefixColor =
                          "#ffffff";
                      }

                      if (
                        isUserOption &&
                        !isCorrectOption
                      ) {
                        optionBackground =
                          "#fef2f2";

                        optionBorder =
                          "#ef4444";

                        prefixBackground =
                          "#ef4444";

                        prefixColor =
                          "#ffffff";
                      }

                      return (
                        <motion.div
                          key={optionIndex}
                          whileHover={{
                            x: 5,
                          }}
                          className="quiz-option"
                          style={{
                            ...styles.option,
                            background:
                              optionBackground,
                            borderColor:
                              optionBorder,
                          }}
                        >

                          <div
                            style={{
                              ...styles.optionPrefix,
                              background:
                                prefixBackground,
                              color:
                                prefixColor,
                            }}
                          >
                            {String.fromCharCode(
                              65 + optionIndex
                            )}
                          </div>

                          <div
                            className="option-text"
                            style={
                              styles.optionText
                            }
                          >
                            {opt}
                          </div>

                          {isCorrectOption && (
                            <FaCheckCircle
                              color="#10b981"
                              size={18}
                            />
                          )}

                          {isUserOption &&
                            !isCorrectOption && (
                              <FaTimesCircle
                                color="#ef4444"
                                size={18}
                              />
                            )}

                        </motion.div>
                      );
                    })}

                  </div>

                  {/* ANSWER SUMMARY */}
                  <div style={styles.answerSummary}>

                    <div>
                      <span style={styles.summaryLabel}>
                        YOUR ANSWER
                      </span>

                      <strong
                        style={{
                          color: isSkipped
                            ? "#64748b"
                            : isCorrect
                            ? "#059669"
                            : "#dc2626",
                        }}
                      >
                        {studentChoice ||
                          "Not Attempted"}
                      </strong>
                    </div>

                    <div>
                      <span style={styles.summaryLabel}>
                        CORRECT ANSWER
                      </span>

                      <strong
                        style={{
                          color: "#059669",
                        }}
                      >
                        {correctAns}
                      </strong>
                    </div>

                  </div>

                </div>

              </motion.section>
            );
          })}

        </main>

        {/* ==================================================
            BOTTOM
        ================================================== */}
        <footer style={styles.bottomFooter}>

          <FaAward
            size={22}
            color="#f59e0b"
          />

          <div>
            <strong>
              Performance Review Complete
            </strong>

            <span>
              Keep practising and improve your score.
            </span>
          </div>

        </footer>

        {/* ==================================================
            BACK TO TOP
        ================================================== */}
        <AnimatePresence>
          {showTop && (
            <motion.button
              initial={{
                opacity: 0,
                scale: 0.7,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                scale: 0.7,
              }}
              onClick={() =>
                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                })
              }
              style={styles.topButton}
            >
              <FaArrowUp />
            </motion.button>
          )}
        </AnimatePresence>

      </div>
    </>
  );
};

// ======================================================
// STAT COMPONENT
// ======================================================
const Stat = ({
  icon,
  number,
  label,
  color,
  last,
}) => (
  <div
    style={{
      ...styles.stat,
      borderRight: last
        ? "none"
        : "1px solid #e2e8f0",
    }}
  >
    <div
      style={{
        ...styles.statIcon,
        color,
        background: `${color}12`,
      }}
    >
      {icon}
    </div>

    <div
      className="stats-number"
      style={{
        ...styles.statNumber,
        color,
      }}
    >
      {number}
    </div>

    <div style={styles.statLabel}>
      {label}
    </div>
  </div>
);

// ======================================================
// LEGEND
// ======================================================
const Legend = ({ color, label }) => (
  <div style={styles.legendItem}>
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: color,
      }}
    />
    {label}
  </div>
);

// ======================================================
// STYLES
// ======================================================
const styles = {

  // PAGE
  page: {
    width: "100%",
    minHeight: "100vh",
    background: "#f8fafc",
    overflowX: "hidden",
  },

  // ====================================================
  // LOADING
  // ====================================================
  loadingPage: {
    minHeight: "100vh",
    width: "100%",
    background:
      "linear-gradient(135deg,#022c22,#064e3b)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    color: "#fff",
  },

  loadingIcon: {
    width: 70,
    height: 70,
    borderRadius: "22px",
    background: "rgba(255,255,255,.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 32,
    color: "#6ee7b7",
  },

  loadingTitle: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: 800,
  },

  loadingSub: {
    marginTop: 6,
    fontSize: 12,
    color: "#a7f3d0",
  },

  // ====================================================
  // HERO
  // ====================================================
  hero: {
    width: "100%",
    minHeight: 430,
    background:
      "radial-gradient(circle at 50% 10%, #047857 0%, #064e3b 38%, #022c22 100%)",
    color: "#fff",
    position: "relative",
    overflow: "hidden",
    padding: "18px 20px 65px",
  },

  navBar: {
    width: "100%",
    maxWidth: 1100,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  navButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.14)",
    background: "rgba(255,255,255,.08)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    backdropFilter: "blur(10px)",
    fontSize: 15,
  },

  navCenter: {
    textAlign: "center",
    flex: 1,
    padding: "0 15px",
  },

  heroTitle: {
    fontSize: 20,
    fontWeight: 900,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  heroSubtitle: {
    marginTop: 5,
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: 2,
    color: "#a7f3d0",
  },

  scoreArea: {
    maxWidth: 500,
    margin: "45px auto 0",
    textAlign: "center",
    position: "relative",
  },

  trophy: {
    width: 78,
    height: 78,
    borderRadius: "50%",
    margin: "0 auto 12px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background:
      "linear-gradient(145deg,rgba(255,255,255,.18),rgba(255,255,255,.04))",
    border: "1px solid rgba(255,255,255,.15)",
    color: "#facc15",
    fontSize: 34,
    boxShadow:
      "0 15px 40px rgba(0,0,0,.25)",
  },

  score: {
    fontSize: 72,
    lineHeight: 1,
    fontWeight: 950,
    letterSpacing: -4,
    textShadow:
      "0 10px 40px rgba(0,0,0,.3)",
  },

  qualifiedBadge: {
    display: "inline-flex",
    padding: "7px 18px",
    borderRadius: 30,
    marginTop: 14,
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1,
  },

  heroMeta: {
    display: "flex",
    justifyContent: "center",
    gap: 10,
    marginTop: 18,
    fontSize: 12,
    color: "#a7f3d0",
    fontWeight: 600,
  },

  floatingStar: {
    position: "absolute",
    color: "#facc15",
    zIndex: 2,
  },

  // ====================================================
  // STATS
  // ====================================================
  statsWrapper: {
    width: "100%",
    padding: "0 16px",
    marginTop: -38,
    position: "relative",
    zIndex: 10,
  },

  statsCard: {
    width: "100%",
    maxWidth: 1000,
    margin: "0 auto",
    background: "#fff",
    borderRadius: 18,
    boxShadow:
      "0 18px 50px rgba(15,23,42,.12)",
    display: "grid",
    gridTemplateColumns:
      "repeat(4,minmax(0,1fr))",
    padding: "18px 0",
  },

  stat: {
    minHeight: 75,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },

  statIcon: {
    width: 27,
    height: 27,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
  },

  statNumber: {
    fontSize: 23,
    fontWeight: 950,
    lineHeight: 1,
  },

  statLabel: {
    fontSize: 8,
    fontWeight: 900,
    color: "#94a3b8",
    letterSpacing: 1,
  },

  // ====================================================
  // ROADMAP
  // ====================================================
  roadmap: {
    width: "100%",
    position: "sticky",
    top: 0,
    zIndex: 90,
    background: "rgba(255,255,255,.96)",
    backdropFilter: "blur(18px)",
    borderBottom: "1px solid #e2e8f0",
    boxShadow:
      "0 5px 20px rgba(15,23,42,.05)",
    padding: "13px 0 10px",
  },

  roadmapTop: {
    width: "100%",
    maxWidth: 1000,
    margin: "0 auto 9px",
    padding: "0 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  roadmapTitle: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    color: "#0f172a",
    fontSize: 12,
    fontWeight: 900,
  },

  progressInfo: {
    fontSize: 10,
    fontWeight: 900,
    color: "#047857",
    background: "#ecfdf5",
    padding: "5px 10px",
    borderRadius: 20,
  },

  roadmapScroll: {
    width: "100%",
    maxWidth: 1000,
    margin: "0 auto",
    display: "flex",
    gap: 8,
    overflowX: "auto",
    padding: "3px 16px 8px",
  },

  roadmapBubble: {
    width: 40,
    minWidth: 40,
    height: 40,
    borderRadius: 11,
    border: "1.5px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
    transition: "all .2s ease",
  },

  legend: {
    maxWidth: 1000,
    margin: "1px auto 0",
    padding: "0 16px",
    display: "flex",
    gap: 15,
  },

  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontSize: 9,
    color: "#64748b",
    fontWeight: 700,
  },

  // ====================================================
  // QUESTIONS
  // ====================================================
  questionsArea: {
    width: "100%",
    background: "#f8fafc",
  },

  questionCard: {
    width: "100%",
    background: "#fff",
    borderBottom: "1px solid #e2e8f0",
    padding: "38px 20px",
    transition: "all .3s ease",
  },

  questionInner: {
    width: "100%",
    maxWidth: 1000,
    margin: "0 auto",
  },

  questionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  questionNumber: {
    background: "#ecfdf5",
    color: "#047857",
    padding: "7px 12px",
    borderRadius: 8,
    fontSize: 10,
    fontWeight: 950,
    letterSpacing: ".5px",
  },

  status: {
    padding: "6px 10px",
    borderRadius: 20,
    fontSize: 9,
    fontWeight: 950,
    letterSpacing: ".5px",
  },

  questionTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: 21,
    fontWeight: 850,
    lineHeight: 1.55,
    letterSpacing: "-.2px",
  },

  options: {
    display: "flex",
    flexDirection: "column",
    gap: 11,
    marginTop: 28,
  },

  option: {
    minHeight: 58,
    padding: "11px 14px",
    borderRadius: 14,
    border: "1.5px solid",
    display: "flex",
    alignItems: "center",
    gap: 13,
    transition:
      "transform .2s ease, box-shadow .2s ease",
    cursor: "default",
  },

  optionPrefix: {
    width: 34,
    minWidth: 34,
    height: 34,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 950,
  },

  optionText: {
    flex: 1,
    color: "#334155",
    fontSize: 15,
    lineHeight: 1.45,
    fontWeight: 650,
  },

  answerSummary: {
    marginTop: 25,
    padding: "15px 16px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: 20,
  },

  summaryLabel: {
    display: "block",
    color: "#94a3b8",
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: 1,
    marginBottom: 5,
  },

  // ====================================================
  // FOOTER
  // ====================================================
  bottomFooter: {
    width: "100%",
    background: "#022c22",
    color: "#fff",
    padding: "35px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 13,
  },

  topButton: {
    position: "fixed",
    right: 20,
    bottom: 22,
    width: 46,
    height: 46,
    borderRadius: 15,
    border: "none",
    background: "#047857",
    color: "#fff",
    boxShadow:
      "0 10px 25px rgba(4,120,87,.35)",
    cursor: "pointer",
    zIndex: 200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};

export default QuizReview;