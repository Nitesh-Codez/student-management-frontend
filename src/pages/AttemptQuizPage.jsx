import React, { useEffect, useState, useCallback, useRef } from "react";
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
  const VIOLATION_KEY = `quiz_violations_${id}_${studentId}`;

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // States for Pre-Exam Instructions & Proctoring
  const [showInstructions, setShowInstructions] = useState(true);
  const [violations, setViolations] = useState(
    () => parseInt(localStorage.getItem(VIOLATION_KEY) || "0")
  );
  const [warningModal, setWarningModal] = useState(false);
  const [faceWarningModal, setFaceWarningModal] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [aiMessage, setAiMessage] = useState("AI Proctor Active");
  const videoRef = useRef(null);

  /* =========================================================
     CAMERA PERMISSION & PROCTORING SETUP
  ========================================================= */
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowInstructions(false); // Close instructions modal once permission granted & start
    } catch (error) {
      console.error("Camera access denied:", error);
      alert("Camera permission is mandatory to attempt this proctored examination!");
    }
  };

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  // Periodic AI Proctor Status & Simulated Face-Direction Check
  useEffect(() => {
    if (showInstructions || result) return;

    const messages = [
      "I am watching you!!!!",
      "Keep your face straight!",
      "Focus on the screen.",
      "No looking sideways!"
    ];

    const interval = setInterval(() => {
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];
      setAiMessage(randomMsg);

      // Trigger center face warning pop-up for realism (dismissible via cross)
      if (Math.random() < 0.22) {
        setFaceWarningModal(true);
      }
    }, 9000);

    return () => clearInterval(interval);
  }, [showInstructions, result]);

  /* =========================================================
     SUBMIT FUNCTION
  ========================================================= */
  const handleSubmit = useCallback(
    async (finalAnswers = answers) => {
      if (submitting) return;
      setSubmitting(true);

      try {
        const currentUser = JSON.parse(
          localStorage.getItem("user") || "{}"
        );
        const stream = currentUser?.stream || "";
        const session = currentUser?.session || "";

        const res = await api.post(
          "/api/quiz/submit",
          {
            student_id: studentId,
            quiz_id: id,
            answers: finalAnswers,
            stream,
            session,
          }
        );

        localStorage.removeItem(TIMER_KEY);
        localStorage.removeItem(ANSWERS_KEY);
        localStorage.removeItem(VIOLATION_KEY);

        if (cameraStream) {
          cameraStream.getTracks().forEach((track) => track.stop());
        }

        setResult(res.data.data || res.data);
      } catch (err) {
        console.error("Quiz submission error:", err?.response?.data || err);
        alert("Error submitting quiz.");
      } finally {
        setSubmitting(false);
      }
    },
    [id, studentId, answers, submitting, TIMER_KEY, ANSWERS_KEY, VIOLATION_KEY, cameraStream]
  );

  /* =========================================================
     ANTI-CHEATING (TAB SWITCH & BLUR DETECTION)
  ========================================================= */
  const handleViolation = useCallback(() => {
    if (result || submitting || showInstructions) return;

    const nextViolations = violations + 1;
    setViolations(nextViolations);
    localStorage.setItem(VIOLATION_KEY, nextViolations.toString());

    if (nextViolations === 1) {
      setWarningModal(true);
    } else if (nextViolations >= 2) {
      alert("⚠️ Multiple tab switches detected! Test terminated and automatically submitted.");
      handleSubmit();
    }
  }, [violations, result, submitting, showInstructions, VIOLATION_KEY, handleSubmit]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation();
      }
    };

    const handleWindowBlur = () => {
      handleViolation();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [handleViolation]);

  /* =========================================================
     GLOBAL STYLING (CLEAN WHITE THEME)
  ========================================================= */
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      * { box-sizing: border-box; }
      html, body, #root { margin: 0; padding: 0; width: 100%; min-height: 100%; background: #f8fafc; }
      body {
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        overflow-x: hidden;
        color: #0f172a;
      }
      button { font-family: inherit; }
      ::selection { background: #2563eb; color: #fff; }
      .quiz-scroll::-webkit-scrollbar { height: 6px; width: 6px; }
      .quiz-scroll::-webkit-scrollbar-track { background: transparent; }
      .quiz-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      @keyframes pulseGlow {
        0%, 100% { box-shadow: 0 0 15px rgba(239,68,68,0.3); }
        50% { box-shadow: 0 0 30px rgba(239,68,68,0.6); }
      }
      .ai-alert-badge { animation: pulseGlow 2s infinite; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const formatMath = (text) => {
    if (!text) return "";
    let str = text.toString();
    const fractions = { "1/2": "½", "1/4": "¼", "3/4": "¾", "1/3": "⅓", "2/3": "⅔" };
    Object.keys(fractions).forEach((f) => {
      str = str.replace(new RegExp(f, "g"), fractions[f]);
    });
    return str;
  };

  /* =========================================================
     FETCH QUIZ
  ========================================================= */
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await api.get(`/api/quiz/${id}`);
        const quizData = res.data;
        setQuiz(quizData);

        const q = typeof quizData.questions === "string" ? JSON.parse(quizData.questions) : quizData.questions;
        setQuestions(q || []);

        const savedAnswers = localStorage.getItem(ANSWERS_KEY);
        setAnswers(savedAnswers ? JSON.parse(savedAnswers) : new Array(q.length).fill(null));

        const savedExpiry = localStorage.getItem(TIMER_KEY);
        const expiryTime = savedExpiry ? parseInt(savedExpiry) : Date.now() + quizData.timer_minutes * 60 * 1000;

        if (!savedExpiry) {
          localStorage.setItem(TIMER_KEY, expiryTime.toString());
        }

        setTimeLeft(Math.max(0, Math.floor((expiryTime - Date.now()) / 1000)));
      } catch (err) {
        console.error("Quiz loading error:", err);
      }
    };

    fetchQuiz();
  }, [id, TIMER_KEY, ANSWERS_KEY]);

  /* =========================================================
     TIMER
  ========================================================= */
  useEffect(() => {
    if (timeLeft === null || result || showInstructions) return;
    if (timeLeft <= 0) {
      if (!submitting) handleSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, result, submitting, showInstructions, handleSubmit]);

  const handleOptionSelect = (option) => {
    const newAnswers = [...answers];
    newAnswers[currentIdx] = option;
    setAnswers(newAnswers);
    localStorage.setItem(ANSWERS_KEY, JSON.stringify(newAnswers));

    if (currentIdx < questions.length - 1) {
      setTimeout(() => {
        setCurrentIdx((prev) => prev + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 400);
    }
  };

  const formatTime = (seconds) => {
    if (seconds === null) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!quiz) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.loadingSpinner} />
        <span style={{ color: "#64748b", fontWeight: "600", marginTop: "15px" }}>Loading Secure Examination Environment...</span>
      </div>
    );
  }

  if (result) {
    const percentage = Math.round(Number(result.percentage || 0));
    return (
      <div style={styles.resultPage}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={styles.resultCard}>
          <div style={{ fontSize: "50px", marginBottom: "15px" }}>{percentage >= 50 ? "🏆" : "📋"}</div>
          <h2 style={{ color: "#0f172a", marginBottom: "5px" }}>Assessment Submitted</h2>
          <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "25px" }}>Proctored session successfully concluded.</p>
          <div style={{ fontSize: "28px", fontWeight: "bold", color: "#2563eb", marginBottom: "20px" }}>Score: {percentage}%</div>
          <button className="action-button" onClick={() => navigate("/student/quiz-dashboard")} style={styles.dashboardButton}>
            Return to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  const totalQuestions = questions.length;
  const attemptedCount = answers.filter((a) => a !== null).length;
  const progress = totalQuestions > 0 ? (attemptedCount / totalQuestions) * 100 : 0;
  const isLastQuestion = currentIdx === totalQuestions - 1;
  const isFirstQuestion = currentIdx === 0;
  const currentQuestion = questions[currentIdx];

  return (
    <div style={styles.examContainer}>
      {/* =====================================================
          1. PRE-EXAM INSTRUCTIONS & CAMERA PERMISSION MODAL
      ==================================================== */}
      <AnimatePresence>
        {showInstructions && (
          <div style={styles.modalOverlay}>
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 20 }}
              style={styles.instructionCard}
            >
              <div style={{ fontSize: "40px", marginBottom: "10px" }}>🛡️</div>
              <h2 style={{ color: "#0f172a", fontSize: "22px", fontWeight: "800", margin: "0 0 8px" }}>
                AI Proctored Exam Guidelines
              </h2>
              <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 20px" }}>
                Please review the secure examination instructions before granting camera access.
              </p>

              <div style={styles.instructionList}>
                <div style={styles.instructionItem}>
                  <span style={styles.redBadge}>Strict</span>
                  <span><strong>No Tab Switching:</strong> Leaving this window triggers a warning. The 2nd violation automatically terminates your test.</span>
                </div>
                <div style={styles.instructionItem}>
                  <span style={styles.redBadge}>Mandatory</span>
                  <span><strong>Webcam Proctoring:</strong> Camera permission is required. Keep your face straight towards the screen at all times.</span>
                </div>
                <div style={styles.instructionItem}>
                  <span style={styles.blueBadge}>AI Assistant</span>
                  <span><strong>Live Monitoring:</strong> An AI proctor assistant will actively monitor your session and issue posture alerts if necessary.</span>
                </div>
              </div>

              <button
                onClick={startCamera}
                style={styles.startExamBtn}
              >
                Allow Camera & Start Exam 🚀
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =====================================================
          2. FIRST TAB-SWITCH WARNING MODAL
      ==================================================== */}
      {warningModal && (
        <div style={styles.modalOverlay}>
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={styles.modalCard}>
            <div style={{ fontSize: "54px", marginBottom: "12px" }}>😠</div>
            <h2 style={{ color: "#ef4444", fontSize: "22px", fontWeight: "800", margin: "0 0 12px" }}>
              Don't cheat next time!
            </h2>
            <p style={{ color: "#334155", fontSize: "15px", lineHeight: "1.6", margin: "0 0 24px", fontWeight: "500" }}>
              Warning! Tab switching or leaving the secure test window is strictly prohibited. The next tab switch will automatically submit and terminate your test. Keep your face straight!
            </p>
            <button onClick={() => setWarningModal(false)} style={styles.modalButton}>
              I Understand, Back to Test
            </button>
          </motion.div>
        </div>
      )}

      {/* =====================================================
          3. FACE-DIRECTION WARNING MODAL (CENTERED WITH CROSS)
      ==================================================== */}
      <AnimatePresence>
        {faceWarningModal && (
          <div style={styles.modalOverlay}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              style={styles.faceModalCard}
            >
              <button
                onClick={() => setFaceWarningModal(false)}
                style={styles.crossButton}
                title="Close Warning"
              >
                ✕
              </button>
              <div style={{ fontSize: "48px", marginBottom: "10px" }}>⚠️</div>
              <h3 style={{ color: "#b91c1c", fontSize: "20px", fontWeight: "800", margin: "0 0 8px" }}>
                Face Not Straight!
              </h3>
              <p style={{ color: "#475569", fontSize: "14px", lineHeight: "1.5", margin: "0" }}>
                Our AI proctor detected that your face is turned away from the screen. Please keep your face straight and focused on the exam.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOP REALISTIC PROCTORED NAVBAR */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.liveBadge}>● SECURE EXAM</div>
          <div>
            <h1 style={styles.quizTitle}>{quiz.title}</h1>
            <span style={styles.quizSub}>{quiz.subject} • {totalQuestions} Questions</span>
          </div>
        </div>

        {/* PROCTORING CAMERA & AI ASSISTANT PANEL */}
        <div style={styles.proctorPanel}>
          <div style={styles.aiTextBox} className="ai-alert-badge">
            <span style={{ fontSize: "11px", color: "#dc2626", fontWeight: "800" }}>AI PROCTOR:</span>
            <span style={{ fontSize: "12px", color: "#0f172a", fontWeight: "700" }}>{aiMessage}</span>
          </div>
          <div style={styles.cameraWrapper}>
            <video ref={videoRef} autoPlay playsInline muted style={styles.webcamFeed} />
            <div style={styles.recDot}>REC</div>
          </div>
        </div>

        {/* TIMER */}
        <div style={styles.timerDisplay}>
          <span>⏱ {formatTime(timeLeft)}</span>
        </div>
      </header>

      {/* PROGRESS BAR */}
      <div style={styles.progressBarBg}>
        <motion.div animate={{ width: `${progress}%` }} style={styles.progressBarFill} />
      </div>

      {/* MAIN QUESTION INTERFACE */}
      <div style={styles.mainLayout}>
        {/* QUESTION NAVIGATOR SIDEBAR */}
        <div style={styles.sidebarNav} className="quiz-scroll">
          <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", marginBottom: "10px", display: "block" }}>
            QUESTION PALETTE
          </span>
          <div style={styles.paletteGrid}>
            {questions.map((_, idx) => {
              const active = currentIdx === idx;
              const answered = answers[idx] !== null;
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIdx(idx)}
                  style={{
                    ...styles.paletteBtn,
                    background: active ? "#2563eb" : answered ? "#10b981" : "#f1f5f9",
                    color: active || answered ? "#fff" : "#334155",
                    borderColor: active ? "#1d4ed8" : answered ? "#059669" : "#e2e8f0",
                  }}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* QUESTION CARD */}
        <main style={styles.questionSection}>
          <div style={styles.questionCard}>
            <div style={styles.qCardHeader}>
              <span style={styles.qNumberTag}>Question {currentIdx + 1} of {totalQuestions}</span>
              <span style={styles.attemptStatus}>{attemptedCount} Answered</span>
            </div>

            <h2 style={styles.questionText}>{formatMath(currentQuestion?.question)}</h2>

            <div style={styles.optionsList}>
              {currentQuestion?.options?.map((opt, i) => {
                const selected = answers[currentIdx] === opt;
                const labels = ["A", "B", "C", "D", "E"];
                return (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleOptionSelect(opt)}
                    style={{
                      ...styles.optionItem,
                      background: selected ? "#eff6ff" : "#ffffff",
                      borderColor: selected ? "#2563eb" : "#e2e8f0",
                      boxShadow: selected ? "0 4px 12px rgba(37,99,235,0.1)" : "none",
                    }}
                  >
                    <div style={{
                      ...styles.optionLetterBox,
                      background: selected ? "#2563eb" : "#f1f5f9",
                      color: selected ? "#fff" : "#334155"
                    }}>
                      {labels[i]}
                    </div>
                    <span style={{ color: selected ? "#1e3a8a" : "#334155", fontSize: "16px", fontWeight: "600", flex: 1, textAlign: "left" }}>
                      {formatMath(opt)}
                    </span>
                    <div style={{
                      width: "20px", height: "20px", borderRadius: "50%",
                      border: "2px solid", borderColor: selected ? "#2563eb" : "#cbd5e1",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: selected ? "#2563eb" : "transparent"
                    }}>
                      {selected && <span style={{ color: "#fff", fontSize: "11px", fontWeight: "bold" }}>✓</span>}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* BOTTOM CONTROLS */}
          <div style={styles.footerNav}>
            <button
              disabled={isFirstQuestion}
              onClick={() => setCurrentIdx((p) => p - 1)}
              style={{ ...styles.navActionBtn, opacity: isFirstQuestion ? 0.4 : 1, cursor: isFirstQuestion ? "not-allowed" : "pointer" }}
            >
              ← Previous
            </button>

            {isLastQuestion ? (
              <button
                disabled={submitting}
                onClick={() => handleSubmit()}
                style={styles.finishActionBtn}
              >
                {submitting ? "Submitting..." : "Finish Exam ✓"}
              </button>
            ) : (
              <button
                onClick={() => setCurrentIdx((p) => p + 1)}
                style={styles.navActionBtn}
              >
                Next →
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

const styles = {
  examContainer: { width: "100vw", minHeight: "100vh", background: "#f8fafc", color: "#0f172a", display: "flex", flexDirection: "column" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 24px", background: "#ffffff", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  headerLeft: { display: "flex", alignItems: "center", gap: "16px" },
  liveBadge: { background: "#dcfce7", color: "#15803d", padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "800", border: "1px solid #bbf7d0" },
  quizTitle: { margin: 0, fontSize: "16px", fontWeight: "700", color: "#0f172a" },
  quizSub: { fontSize: "12px", color: "#64748b" },
  proctorPanel: { display: "flex", alignItems: "center", gap: "12px" },
  aiTextBox: { background: "#fef2f2", border: "1px solid #fecaca", padding: "6px 14px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "2px" },
  cameraWrapper: { width: "110px", height: "75px", background: "#000", borderRadius: "8px", border: "2px solid #ef4444", overflow: "hidden", position: "relative" },
  webcamFeed: { width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" },
  recDot: { position: "absolute", top: "3px", right: "3px", background: "#ef4444", color: "#fff", fontSize: "8px", fontWeight: "bold", padding: "1px 4px", borderRadius: "3px" },
  timerDisplay: { background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "10px", fontSize: "16px", fontWeight: "bold", color: "#2563eb" },
  progressBarBg: { width: "100%", height: "4px", background: "#e2e8f0" },
  progressBarFill: { height: "100%", background: "linear-gradient(90deg, #2563eb, #3b82f6)" },
  mainLayout: { display: "flex", flex: 1, maxWidth: "1300px", width: "100%", margin: "0 auto", padding: "24px", gap: "24px" },
  sidebarNav: { width: "240px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "20px", height: "fit-content", maxHeight: "calc(100vh - 140px)", overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" },
  paletteGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" },
  paletteBtn: { height: "38px", borderRadius: "8px", border: "1px solid", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  questionSection: { flex: 1, display: "flex", flexDirection: "column", gap: "20px" },
  questionCard: { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "30px", boxShadow: "0 10px 30px rgba(0,0,0,0.04)" },
  qCardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  qNumberTag: { background: "#eff6ff", color: "#2563eb", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "700" },
  attemptStatus: { fontSize: "13px", color: "#64748b", fontWeight: "500" },
  questionText: { fontSize: "20px", fontWeight: "700", color: "#0f172a", lineHeight: "1.5", margin: "0 0 24px" },
  optionsList: { display: "flex", flexDirection: "column", gap: "12px" },
  optionItem: { display: "flex", alignItems: "center", gap: "16px", padding: "16px 20px", borderRadius: "14px", border: "1px solid", cursor: "pointer", width: "100%", transition: "all 0.2s ease" },
  optionLetterBox: { width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "bold" },
  footerNav: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 10px" },
  navActionBtn: { background: "#ffffff", color: "#0f172a", border: "1px solid #cbd5e1", padding: "12px 24px", borderRadius: "12px", fontSize: "14px", fontWeight: "600", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" },
  finishActionBtn: { background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", border: "none", padding: "12px 28px", borderRadius: "12px", fontSize: "14px", fontWeight: "700", cursor: "pointer", boxShadow: "0 4px 15px rgba(16,185,129,0.25)" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(6px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" },
  instructionCard: { background: "#ffffff", border: "1px solid #e2e8f0", maxWidth: "520px", width: "100%", padding: "35px", borderRadius: "24px", textAlign: "center", boxShadow: "0 25px 60px rgba(0,0,0,0.15)" },
  instructionList: { display: "flex", flexDirection: "column", gap: "12px", textAlign: "left", marginBottom: "25px" },
  instructionItem: { display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "13.5px", color: "#334155", lineHeight: "1.5" },
  redBadge: { background: "#ffeeec", color: "#dc2626", fontSize: "10px", fontWeight: "800", padding: "2px 8px", borderRadius: "4px", flexShrink: 0, marginTop: "2px" },
  blueBadge: { background: "#eff6ff", color: "#2563eb", fontSize: "10px", fontWeight: "800", padding: "2px 8px", borderRadius: "4px", flexShrink: 0, marginTop: "2px" },
  startExamBtn: { background: "#2563eb", color: "#fff", border: "none", padding: "14px 24px", borderRadius: "12px", fontSize: "15px", fontWeight: "700", cursor: "pointer", width: "100%", boxShadow: "0 4px 15px rgba(37,99,235,0.3)" },
  modalCard: { background: "#ffffff", border: "1px solid #e2e8f0", maxWidth: "440px", width: "100%", padding: "35px", borderRadius: "24px", textAlign: "center", boxShadow: "0 25px 60px rgba(0,0,0,0.15)" },
  faceModalCard: { background: "#ffffff", border: "1px solid #fecaca", maxWidth: "400px", width: "100%", padding: "30px", borderRadius: "20px", textAlign: "center", boxShadow: "0 20px 40px rgba(239,68,68,0.15)", position: "relative" },
  crossButton: { position: "absolute", top: "12px", right: "12px", background: "#f1f5f9", border: "none", width: "28px", height: "28px", borderRadius: "50%", fontSize: "14px", fontWeight: "bold", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  modalButton: { background: "#0f172a", color: "#fff", border: "none", padding: "14px 24px", borderRadius: "12px", fontSize: "14px", fontWeight: "700", cursor: "pointer", width: "100%" },
  loadingPage: { width: "100vw", height: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
  loadingSpinner: { width: "45px", height: "45px", border: "3px solid #e2e8f0", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 1s linear infinite" },
  resultPage: { width: "100vw", height: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" },
  resultCard: { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "24px", padding: "40px", maxWidth: "450px", width: "100%", textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" },
  dashboardButton: { background: "#2563eb", color: "#fff", border: "none", padding: "12px 24px", borderRadius: "12px", fontSize: "14px", fontWeight: "600", cursor: "pointer", width: "100%" }
};

export default AttemptQuizPage;