
import React, {
  useEffect,
  useState,
  useCallback,
  useRef
} from "react";

import api from "../services/api";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

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

  const [examStep, setExamStep] = useState(1);
  const [showInstructions, setShowInstructions] = useState(true);

  const [violations, setViolations] = useState(
    () => Number(localStorage.getItem(VIOLATION_KEY) || 0)
  );

  const [warningModal, setWarningModal] = useState(false);
  const [faceWarningModal, setFaceWarningModal] = useState(false);

  const [aiMessage, setAiMessage] = useState(
    "I am watching you. Keep your focus on the screen."
  );

  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [faceStatus, setFaceStatus] = useState("Waiting for face...");

  const videoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const animationRef = useRef(null);

  const submittingRef = useRef(false);
  const violationRef = useRef(
    Number(localStorage.getItem(VIOLATION_KEY) || 0)
  );

  const lastViolationRef = useRef(0);
  const missingSinceRef = useRef(null);
  const lookingAwaySinceRef = useRef(null);
  const violationActiveRef = useRef(false);
  const lastVideoTimeRef = useRef(-1);

  // Voice warning
  const speak = useCallback((message) => {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(message);
    speech.rate = 0.9;
    speech.pitch = 0.8;
    speech.volume = 1;

    window.speechSynthesis.speak(speech);
  }, []);

  // Camera permission
  const requestCameraPermission = async () => {
    try {
      setCameraError("");

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera requires HTTPS or localhost.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });

      streamRef.current = stream;
      setCameraStream(stream);
      setExamStep(2);

    } catch (error) {
      console.error(error);
      setCameraError(
        error.message || "Please allow camera permission."
      );
    }
  };

  // Attach camera to both preview and exam video elements
  useEffect(() => {
    if (!cameraStream) return;

    [videoRef.current, previewVideoRef.current].forEach((video) => {
      if (video) {
        video.srcObject = cameraStream;
        video.play().catch(console.error);
      }
    });
  }, [cameraStream, examStep, showInstructions]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setCameraStream(null);
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      landmarkerRef.current?.close();
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Fetch quiz
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await api.get(`/api/quiz/${id}`);
        const quizData = res.data;

        setQuiz(quizData);

        const q =
          typeof quizData.questions === "string"
            ? JSON.parse(quizData.questions)
            : quizData.questions;

        setQuestions(q || []);

        const savedAnswers = localStorage.getItem(ANSWERS_KEY);

        setAnswers(
          savedAnswers
            ? JSON.parse(savedAnswers)
            : new Array((q || []).length).fill(null)
        );

        const savedExpiry = localStorage.getItem(TIMER_KEY);

        const expiryTime = savedExpiry
          ? Number(savedExpiry)
          : Date.now() + Number(quizData.timer_minutes) * 60 * 1000;

        if (!savedExpiry) {
          localStorage.setItem(TIMER_KEY, expiryTime.toString());
        }

        setTimeLeft(
          Math.max(0, Math.floor((expiryTime - Date.now()) / 1000))
        );

      } catch (error) {
        console.error("Quiz loading error:", error);
      }
    };

    fetchQuiz();
  }, [id, TIMER_KEY, ANSWERS_KEY]);

  // Submit quiz
  const handleSubmit = useCallback(
    async (finalAnswers = answers, reason = "manual") => {
      if (submittingRef.current || result) return;

      submittingRef.current = true;
      setSubmitting(true);

      try {
        const currentUser = JSON.parse(
          localStorage.getItem("user") || "{}"
        );

        const res = await api.post("/api/quiz/submit", {
          student_id: studentId,
          quiz_id: id,
          answers: finalAnswers,
          stream: currentUser?.stream || "",
          session: currentUser?.session || "",
          submission_reason: reason
        });

        localStorage.removeItem(TIMER_KEY);
        localStorage.removeItem(ANSWERS_KEY);
        localStorage.removeItem(VIOLATION_KEY);

        stopCamera();
        setResult(res.data.data || res.data);

      } catch (error) {
        console.error("Quiz submission error:", error);

        alert("Quiz submission failed. Please contact your teacher.");

        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [
      answers,
      studentId,
      id,
      result,
      TIMER_KEY,
      ANSWERS_KEY,
      VIOLATION_KEY,
      stopCamera
    ]
  );

  // Register violations
  const registerViolation = useCallback(
    (reason) => {
      if (submittingRef.current || result) return;

      // Avoid repeatedly counting the same continuous issue
      if (violationActiveRef.current) return;

      const now = Date.now();

      if (now - lastViolationRef.current < 1500) return;

      lastViolationRef.current = now;
      violationActiveRef.current = true;

      const next = violationRef.current + 1;

      violationRef.current = next;
      setViolations(next);

      localStorage.setItem(VIOLATION_KEY, String(next));

      if (next === 1) {
        const message =
          reason === "face_missing"
            ? "Face not found. Please come back in front of the camera."
            : "Don't cheat! Keep your face straight and look at the screen.";

        setAiMessage(message);
        setFaceWarningModal(false);
        setWarningModal(true);

        speak(
          reason === "face_missing"
            ? "Face not found. Please come back in front of the camera."
            : "Don't cheat. Keep your face straight. This is your first warning."
        );

      } else {
        setAiMessage("Second violation detected. Quiz submitting.");
        setWarningModal(false);
        setFaceWarningModal(false);

        speak("Second warning. Your quiz is being submitted.");

        handleSubmit(answers, "proctoring_violation");
      }
    },
    [answers, handleSubmit, result, VIOLATION_KEY, speak]
  );

  // Real MediaPipe face detection
  useEffect(() => {
    if (showInstructions || !cameraStream || result) return;

    let active = true;

    const initializeFaceDetector = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);

        const detector = await FaceLandmarker.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath: MODEL_URL,
              delegate: "GPU"
            },
            runningMode: "VIDEO",
            numFaces: 1
          }
        );

        if (!active) {
          detector.close();
          return;
        }

        landmarkerRef.current = detector;

        const detect = () => {
          if (!active || submittingRef.current) return;

          const video = videoRef.current;
          const landmarker = landmarkerRef.current;

          if (
            video &&
            landmarker &&
            video.readyState >= 2 &&
            video.currentTime !== lastVideoTimeRef.current
          ) {
            lastVideoTimeRef.current = video.currentTime;

            const now = performance.now();
            const output = landmarker.detectForVideo(video, now);
            const faces = output.faceLandmarks || [];

            if (faces.length === 0) {
              setFaceStatus("Face not found");

              lookingAwaySinceRef.current = null;

              if (missingSinceRef.current === null) {
                missingSinceRef.current = now;
              }

              if (now - missingSinceRef.current >= 2000) {
                registerViolation("face_missing");
              }

            } else {
              missingSinceRef.current = null;

              const face = faces[0];

              // Approximate head direction using nose and eye landmarks
              const nose = face[1];
              const leftEye = face[33];
              const rightEye = face[263];

              const eyeCenter = (leftEye.x + rightEye.x) / 2;
              const eyeDistance = Math.abs(rightEye.x - leftEye.x);

              const offset =
                eyeDistance > 0
                  ? Math.abs(nose.x - eyeCenter) / eyeDistance
                  : 0;

              const lookingAway = offset > 0.20;

              if (lookingAway) {
                setFaceStatus("Looking away");

                if (lookingAwaySinceRef.current === null) {
                  lookingAwaySinceRef.current = now;
                }

                if (now - lookingAwaySinceRef.current >= 2500) {
                  registerViolation("looking_away");
                }

              } else {
                setFaceStatus("Face detected");
                lookingAwaySinceRef.current = null;

                // A new violation can only be counted after the face returns
                violationActiveRef.current = false;
              }
            }
          }

          animationRef.current = requestAnimationFrame(detect);
        };

        detect();

      } catch (error) {
        console.error("Face detector initialization error:", error);
        setFaceStatus("Face detector unavailable");
        setCameraError("AI face detector could not be loaded. Check your internet connection.");
      }
    };

    initializeFaceDetector();

    return () => {
      active = false;

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, [showInstructions, cameraStream, result, registerViolation]);

  // Camera track monitor
  useEffect(() => {
    if (!cameraStream) return;

    const track = cameraStream.getVideoTracks()[0];
    if (!track) return;

    const handleEnded = () => {
      setCameraError("Camera disconnected. Please check your camera.");
    };

    track.addEventListener("ended", handleEnded);

    return () => track.removeEventListener("ended", handleEnded);
  }, [cameraStream]);

  // Tab switching
  const handleTabViolation = useCallback(() => {
    if (result || submittingRef.current || showInstructions) return;

    const now = Date.now();

    if (now - lastViolationRef.current < 1500) return;

    lastViolationRef.current = now;

    const next = violationRef.current + 1;

    violationRef.current = next;
    setViolations(next);

    localStorage.setItem(VIOLATION_KEY, String(next));

    if (next === 1) {
      setWarningModal(true);
      setAiMessage("Don't cheat! Tab switching is not allowed.");

      speak("Warning. Do not switch tabs during your assessment.");
    } else {
      handleSubmit(answers, "tab_switch_violation");
    }
  }, [
    result,
    showInstructions,
    VIOLATION_KEY,
    handleSubmit,
    answers,
    speak
  ]);

  useEffect(() => {
    if (showInstructions || result) return;

    const visibilityHandler = () => {
      if (document.hidden) handleTabViolation();
    };

    document.addEventListener("visibilitychange", visibilityHandler);

    return () => {
      document.removeEventListener("visibilitychange", visibilityHandler);
    };
  }, [handleTabViolation, showInstructions, result]);

  // Timer
  useEffect(() => {
    if (timeLeft === null || result || showInstructions) return;

    if (timeLeft <= 0) {
      handleSubmit(answers, "time_expired");
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, result, showInstructions, handleSubmit, answers]);

  // Start quiz
  const startActualQuiz = () => {
    if (!cameraStream?.active) {
      alert("Please enable your camera first.");
      setExamStep(1);
      return;
    }

    setShowInstructions(false);
  };

  // Select answer
  const handleOptionSelect = (option) => {
    const newAnswers = [...answers];
    newAnswers[currentIdx] = option;

    setAnswers(newAnswers);

    localStorage.setItem(ANSWERS_KEY, JSON.stringify(newAnswers));
  };

  const formatMath = (text) => {
    if (!text) return "";

    let str = text.toString();

    const fractions = {
      "1/2": "½",
      "1/4": "¼",
      "3/4": "¾",
      "1/3": "⅓",
      "2/3": "⅔"
    };

    Object.keys(fractions).forEach((f) => {
      str = str.replace(new RegExp(f, "g"), fractions[f]);
    });

    return str;
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
        <span>Loading Exam...</span>
      </div>
    );
  }

  if (result) {
    const percentage = Math.round(Number(result.percentage || 0));

    return (
      <div style={styles.resultPage}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={styles.resultCard}
        >
          <div style={{ fontSize: "50px" }}>
            {percentage >= 50 ? "🏆" : "📋"}
          </div>

          <h2>Assessment Submitted</h2>
          <p style={{ color: "#64748b" }}>
            Your assessment session has concluded.
          </p>

          <div style={styles.score}>Score: {percentage}%</div>

          <button
            onClick={() => navigate("/student/quiz-dashboard")}
            style={styles.dashboardButton}
          >
            Return to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  const totalQuestions = questions.length;

  const attemptedCount = answers.filter((a) => a !== null).length;

  const progress =
    totalQuestions > 0
      ? (attemptedCount / totalQuestions) * 100
      : 0;

  const currentQuestion = questions[currentIdx];

  return (
    <div style={styles.examContainer}>
      {/* INSTRUCTIONS */}
      <AnimatePresence>
        {showInstructions && (
          <div style={styles.modalOverlay}>
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={styles.instructionCard}
            >
              {examStep === 1 ? (
                <>
                  <div style={{ fontSize: "42px" }}>📸</div>
                  <h2>Step 1: Camera Permission</h2>
                  <p>
                    Camera access is required for AI proctoring.
                    Your live camera preview will remain visible during the test.
                  </p>

                  {cameraError && (
                    <p style={styles.errorText}>{cameraError}</p>
                  )}

                  <button
                    onClick={requestCameraPermission}
                    style={styles.startExamBtn}
                  >
                    Allow Camera & Continue 📷
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: "42px" }}>👨‍🏫</div>
                  <h2>Step 2: Are You Ready?</h2>
                  <p>
                    Keep your face visible and look towards the screen.
                    Two confirmed proctoring violations will submit your test.
                  </p>

                  <video
                    ref={previewVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={styles.previewVideo}
                  />

                  <button
                    onClick={startActualQuiz}
                    style={styles.startExamBtn}
                  >
                    Start Test Now 🚀
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TAB WARNING */}
      <AnimatePresence>
        {warningModal && (
          <div style={styles.modalOverlay}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={styles.modalCard}
            >
              <div style={{ fontSize: "60px" }}>😠</div>

              <h2 style={{ color: "#dc2626" }}>
                First Warning!
              </h2>

              <p>
                Don't cheat! Keep your face straight and stay on the quiz page.
                A second violation will submit your test.
              </p>

              <button
                onClick={() => setWarningModal(false)}
                style={styles.modalButton}
              >
                I Understand
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FACE WARNING */}
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
              >
                ✕
              </button>

              <div style={{ fontSize: "45px" }}>⚠️</div>

              <h3 style={{ color: "#b91c1c" }}>
                {faceStatus === "Face not found"
                  ? "Face Not Found!"
                  : "Keep Your Face Straight!"}
              </h3>

              <p style={{ color: "#475569", fontSize: "13px" }}>
                {aiMessage}
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.liveBadge}>● LIVE</div>

          <div>
            <h1 style={styles.quizTitle}>{quiz.title}</h1>
            <span style={styles.quizSub}>
              {quiz.subject} • {totalQuestions} Qs
            </span>
          </div>
        </div>

        <div style={styles.proctorPanel}>
          <div style={styles.aiTextBox}>
            <span style={{ color: "#dc2626", fontWeight: "800" }}>
              AI TEACHER
            </span>
            <span style={{ color: "#0f172a", fontWeight: "700" }}>
              {aiMessage}
            </span>
          </div>

          <div style={styles.cameraWrapper}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={styles.webcamFeed}
            />

            <div style={styles.recDot}>LIVE</div>
          </div>
        </div>

        <div style={styles.timerDisplay}>
          ⏱ {formatTime(timeLeft)}
        </div>
      </header>

      <div style={styles.faceStatus}>
        <span
          style={{
            color:
              faceStatus === "Face detected" ? "#15803d" : "#dc2626"
          }}
        >
          ● {faceStatus}
        </span>
        <span>Warnings: {violations}/2</span>
      </div>

      {cameraError && (
        <div style={styles.errorBanner}>{cameraError}</div>
      )}

      <div style={styles.progressBarBg}>
        <motion.div
          animate={{ width: `${progress}%` }}
          style={styles.progressBarFill}
        />
      </div>

      {/* QUESTIONS */}
      <div style={styles.mainLayout}>
        <main style={styles.questionSection}>
          <div style={styles.questionCard}>
            <div style={styles.qCardHeader}>
              <span style={styles.qNumberTag}>
                Question {currentIdx + 1} of {totalQuestions}
              </span>

              <span style={styles.attemptStatus}>
                {attemptedCount} Answered
              </span>
            </div>

            <h2 style={styles.questionText}>
              {formatMath(currentQuestion?.question)}
            </h2>

            <div style={styles.optionsList}>
              {currentQuestion?.options?.map((opt, i) => {
                const selected = answers[currentIdx] === opt;
                const labels = ["A", "B", "C", "D", "E"];

                return (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleOptionSelect(opt)}
                    style={{
                      ...styles.optionItem,
                      background: selected ? "#eff6ff" : "#fff",
                      borderColor: selected ? "#2563eb" : "#e2e8f0"
                    }}
                  >
                    <div
                      style={{
                        ...styles.optionLetterBox,
                        background: selected ? "#2563eb" : "#f1f5f9",
                        color: selected ? "#fff" : "#334155"
                      }}
                    >
                      {labels[i]}
                    </div>

                    <span
                      style={{
                        color: selected ? "#1e3a8a" : "#334155",
                        fontSize: "15px",
                        fontWeight: "600",
                        flex: 1,
                        textAlign: "left"
                      }}
                    >
                      {formatMath(opt)}
                    </span>

                    <span>{selected ? "✓" : "○"}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div style={styles.footerNav}>
            <button
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((p) => p - 1)}
              style={styles.navActionBtn}
            >
              ← Prev
            </button>

            {currentIdx === totalQuestions - 1 ? (
              <button
                disabled={submitting}
                onClick={() => handleSubmit(answers, "manual")}
                style={styles.finishActionBtn}
              >
                {submitting ? "Submitting..." : "Finish ✓"}
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

      {submitting && (
        <div style={styles.submittingOverlay}>
          Submitting your quiz...
        </div>
      )}
    </div>
  );
};

/* ALL CSS IS INSIDE THIS JSX FILE */

const styles = {
  examContainer: {
    width: "100%",
    minHeight: "100vh",
    background: "#f8fafc",
    color: "#0f172a",
    display: "flex",
    flexDirection: "column"
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px",
    padding: "10px 14px",
    background: "#fff",
    borderBottom: "1px solid #e2e8f0",
    position: "sticky",
    top: 0,
    zIndex: 100
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },

  liveBadge: {
    background: "#dcfce7",
    color: "#15803d",
    padding: "3px 8px",
    borderRadius: "6px",
    fontSize: "10px",
    fontWeight: "800"
  },

  quizTitle: {
    margin: 0,
    fontSize: "14px",
    fontWeight: "700",
    maxWidth: "150px",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },

  quizSub: {
    fontSize: "11px",
    color: "#64748b"
  },

  proctorPanel: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },

  aiTextBox: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    padding: "6px 8px",
    borderRadius: "6px",
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    maxWidth: "150px",
    fontSize: "10px"
  },

  cameraWrapper: {
    width: "85px",
    height: "58px",
    background: "#000",
    borderRadius: "6px",
    border: "2px solid #16a34a",
    overflow: "hidden",
    position: "relative"
  },

  webcamFeed: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: "scaleX(-1)"
  },

  recDot: {
    position: "absolute",
    bottom: "2px",
    right: "2px",
    background: "#16a34a",
    color: "#fff",
    fontSize: "8px",
    padding: "2px 4px"
  },

  timerDisplay: {
    background: "#f1f5f9",
    padding: "7px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "bold",
    color: "#2563eb"
  },

  faceStatus: {
    display: "flex",
    justifyContent: "space-between",
    padding: "9px 16px",
    background: "#fff",
    fontSize: "12px",
    fontWeight: "700"
  },

  errorBanner: {
    padding: "10px",
    background: "#fee2e2",
    color: "#991b1b",
    textAlign: "center",
    fontSize: "13px"
  },

  progressBarBg: {
    width: "100%",
    height: "4px",
    background: "#e2e8f0"
  },

  progressBarFill: {
    height: "100%",
    background: "#2563eb"
  },

  mainLayout: {
    display: "flex",
    flex: 1,
    width: "100%",
    maxWidth: "800px",
    margin: "0 auto",
    padding: "16px",
    boxSizing: "border-box"
  },

  questionSection: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  },

  questionCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "20px"
  },

  qCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "14px"
  },

  qNumberTag: {
    background: "#eff6ff",
    color: "#2563eb",
    padding: "5px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "700"
  },

  attemptStatus: {
    fontSize: "12px",
    color: "#64748b"
  },

  questionText: {
    fontSize: "18px",
    fontWeight: "700",
    lineHeight: "1.5",
    marginBottom: "20px"
  },

  optionsList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },

  optionItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px 16px",
    borderRadius: "12px",
    border: "1px solid",
    cursor: "pointer",
    width: "100%",
    boxSizing: "border-box"
  },

  optionLetterBox: {
    width: "28px",
    height: "28px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "bold",
    flexShrink: 0
  },

  footerNav: {
    display: "flex",
    justifyContent: "space-between",
    padding: "0 4px"
  },

  navActionBtn: {
    background: "#fff",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    padding: "10px 20px",
    borderRadius: "10px",
    cursor: "pointer"
  },

  finishActionBtn: {
    background: "#059669",
    color: "#fff",
    border: "none",
    padding: "10px 24px",
    borderRadius: "10px",
    cursor: "pointer"
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.65)",
    backdropFilter: "blur(6px)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px"
  },

  instructionCard: {
    background: "#fff",
    maxWidth: "400px",
    width: "100%",
    padding: "30px",
    borderRadius: "22px",
    textAlign: "center",
    boxSizing: "border-box"
  },

  previewVideo: {
    width: "150px",
    height: "110px",
    objectFit: "cover",
    borderRadius: "10px",
    marginBottom: "15px",
    background: "#000",
    transform: "scaleX(-1)"
  },

  startExamBtn: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "12px 20px",
    borderRadius: "12px",
    fontWeight: "700",
    cursor: "pointer",
    width: "100%"
  },

  modalCard: {
    background: "#fff",
    maxWidth: "380px",
    width: "100%",
    padding: "30px",
    borderRadius: "22px",
    textAlign: "center",
    boxSizing: "border-box"
  },

  faceModalCard: {
    background: "#fff",
    border: "1px solid #fecaca",
    maxWidth: "340px",
    width: "100%",
    padding: "24px",
    borderRadius: "18px",
    textAlign: "center",
    boxShadow: "0 15px 35px rgba(239,68,68,0.15)",
    position: "relative",
    boxSizing: "border-box"
  },

  crossButton: {
    position: "absolute",
    top: "10px",
    right: "10px",
    background: "#f1f5f9",
    border: "none",
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    fontSize: "14px",
    fontWeight: "bold",
    color: "#64748b",
    cursor: "pointer"
  },

  modalButton: {
    background: "#0f172a",
    color: "#fff",
    border: "none",
    padding: "12px 20px",
    borderRadius: "12px",
    width: "100%",
    cursor: "pointer"
  },

  errorText: {
    color: "#dc2626",
    fontSize: "13px"
  },

  loadingPage: {
    width: "100vw",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center"
  },

  loadingSpinner: {
    width: "40px",
    height: "40px",
    border: "3px solid #e2e8f0",
    borderTopColor: "#2563eb",
    borderRadius: "50%",
    animation: "spin 1s linear infinite"
  },

  resultPage: {
    width: "100vw",
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f8fafc",
    padding: "20px",
    boxSizing: "border-box"
  },

  resultCard: {
    background: "#fff",
    padding: "35px",
    borderRadius: "22px",
    maxWidth: "400px",
    width: "100%",
    textAlign: "center"
  },

  score: {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#2563eb",
    margin: "20px"
  },

  dashboardButton: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "12px 20px",
    borderRadius: "12px",
    width: "100%",
    cursor: "pointer"
  },

  submittingOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.75)",
    color: "#fff",
    zIndex: 2000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    fontWeight: "bold"
  }
};

export default AttemptQuizPage;
