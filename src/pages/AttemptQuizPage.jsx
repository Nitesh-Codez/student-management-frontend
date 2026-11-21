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

const VOICE_THRESHOLD = 0.045;
const VOICE_HOLD_MS = 1200;

const AttemptQuizPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const studentId = currentUser?.id || currentUser?._id;

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
  const [waitingForStart, setWaitingForStart] = useState(false);
  const [startCountdownText, setStartCountdownText] = useState("");
  const [windowExpired, setWindowExpired] = useState(false);

  const [violations, setViolations] = useState(
    () => Number(localStorage.getItem(VIOLATION_KEY) || 0)
  );

  const [warningModal, setWarningModal] = useState(false);
  const [faceWarningModal, setFaceWarningModal] = useState(false);

  const [aiMessage, setAiMessage] = useState(
    "AI Proctoring Active: Stay focused and keep quiet."
  );

  const [cameraStream, setCameraStream] = useState(null);
  const [micStream, setMicStream] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [faceStatus, setFaceStatus] = useState("Waiting for face...");
  const [voiceStatus, setVoiceStatus] = useState("Silent");

  const videoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const micStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const voiceFrameRef = useRef(null);
  const voiceAboveSinceRef = useRef(null);

  const landmarkerRef = useRef(null);
  const animationRef = useRef(null);

  const submittingRef = useRef(false);
  const answersRef = useRef([]);
  const violationRef = useRef(
    Number(localStorage.getItem(VIOLATION_KEY) || 0)
  );

  const lastViolationRef = useRef(0);
  const missingSinceRef = useRef(null);
  const lookingAwaySinceRef = useRef(null);
  const violationActiveRef = useRef(false);
  const lastVideoTimeRef = useRef(-1);
  const autoStartedAtRef = useRef(null);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const formatCountdown = (ms) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  };

  const speak = useCallback((message) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(message);
    speech.rate = 0.95;
    speech.pitch = 0.9;
    speech.volume = 1;
    window.speechSynthesis.speak(speech);
  }, []);

  const cleanupMedia = useCallback(() => {
    if (voiceFrameRef.current) {
      cancelAnimationFrame(voiceFrameRef.current);
      voiceFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    setCameraStream(null);
    setMicStream(null);
  }, []);

  useEffect(() => {
    return () => {
      cleanupMedia();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      landmarkerRef.current?.close();
      window.speechSynthesis?.cancel();
    };
  }, [cleanupMedia]);

  const requestMediaPermissions = async () => {
    try {
      setCameraError("");

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera and microphone require HTTPS or localhost.");
      }

      const vStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });

      let aStream = null;
      try {
        aStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true
          },
          video: false
        });
      } catch {
        aStream = null;
      }

      cameraStreamRef.current = vStream;
      micStreamRef.current = aStream;
      setCameraStream(vStream);
      setMicStream(aStream);
      setExamStep(2);
    } catch (error) {
      console.error(error);
      setCameraError(
        error.message || "Please allow camera permission to continue."
      );
    }
  };

  useEffect(() => {
    if (!cameraStream) return;

    [videoRef.current, previewVideoRef.current].forEach((video) => {
      if (video) {
        video.srcObject = cameraStream;
        video.play().catch(console.error);
      }
    });
  }, [cameraStream, examStep, showInstructions]);

  const computeEffectiveExpiry = useCallback((quizData, existingExpiry = null) => {
    const durationMs =
      Math.max(1, Number(quizData.timer_minutes) || 10) * 60 * 1000;
    const startMs = quizData.start_at
      ? new Date(quizData.start_at).getTime()
      : null;
    const endMs = quizData.end_at ? new Date(quizData.end_at).getTime() : null;

    const baseStart =
      startMs && !Number.isNaN(startMs)
        ? Math.max(Date.now(), startMs)
        : Date.now();

    let targetExpiry =
      existingExpiry && !Number.isNaN(existingExpiry)
        ? existingExpiry
        : baseStart + durationMs;

    if (endMs && !Number.isNaN(endMs)) {
      targetExpiry = Math.min(targetExpiry, endMs);
    }

    return targetExpiry;
  }, []);

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

        const safeQuestions = q || [];
        setQuestions(safeQuestions);

        const savedAnswers = localStorage.getItem(ANSWERS_KEY);
        const initialAnswers = savedAnswers
          ? JSON.parse(savedAnswers)
          : new Array(safeQuestions.length).fill(null);

        setAnswers(initialAnswers);
        answersRef.current = initialAnswers;

        const nowMs = Date.now();
        const startMs = quizData.start_at
          ? new Date(quizData.start_at).getTime()
          : null;
        const endMs = quizData.end_at
          ? new Date(quizData.end_at).getTime()
          : null;

        if (endMs && !Number.isNaN(endMs) && nowMs > endMs) {
          setWindowExpired(true);
          setTimeLeft(0);
          return;
        }

        if (startMs && !Number.isNaN(startMs) && nowMs < startMs) {
          setWaitingForStart(true);
          setStartCountdownText(formatCountdown(startMs - nowMs));
        }

        const savedExpiry = localStorage.getItem(TIMER_KEY);
        const expiryTime = computeEffectiveExpiry(
          quizData,
          savedExpiry ? Number(savedExpiry) : null
        );

        localStorage.setItem(TIMER_KEY, String(expiryTime));
        setTimeLeft(Math.max(0, Math.floor((expiryTime - nowMs) / 1000)));
      } catch (error) {
        console.error("Quiz loading error:", error);
      }
    };

    fetchQuiz();
  }, [id, TIMER_KEY, ANSWERS_KEY, computeEffectiveExpiry]);

  const handleSubmit = useCallback(
    async (finalAnswers = answersRef.current, reason = "manual") => {
      if (submittingRef.current || result) return;

      submittingRef.current = true;
      setSubmitting(true);

      const evaluatedPayloadAnswers = Array.isArray(finalAnswers)
        ? finalAnswers
        : [];

      try {
        const latestUser = JSON.parse(localStorage.getItem("user") || "{}");

        const res = await api.post("/api/quiz/submit", {
          student_id: studentId,
          quiz_id: id,
          answers: evaluatedPayloadAnswers,
          stream: latestUser?.stream || "",
          session: latestUser?.session || "",
          submission_reason: reason,
          evaluate_attempted_only: true
        });

        localStorage.removeItem(TIMER_KEY);
        localStorage.removeItem(ANSWERS_KEY);
        localStorage.removeItem(VIOLATION_KEY);

        cleanupMedia();
        setResult(res.data.data || res.data);
      } catch (error) {
        console.error("Quiz submission error:", error);
        alert("Quiz submission failed. Please contact your teacher.");
        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [
      studentId,
      id,
      result,
      TIMER_KEY,
      ANSWERS_KEY,
      VIOLATION_KEY,
      cleanupMedia
    ]
  );

  // Auto-start and auto-submit monitor based on start_at and end_at
  useEffect(() => {
    if (!quiz || result || submittingRef.current) return;

    const startMs = quiz.start_at
      ? new Date(quiz.start_at).getTime()
      : null;
    const endMs = quiz.end_at ? new Date(quiz.end_at).getTime() : null;

    const checkSchedule = () => {
      const nowMs = Date.now();

      if (endMs && !Number.isNaN(endMs) && nowMs >= endMs) {
        setWaitingForStart(false);
        if (!showInstructions) {
          handleSubmit(answersRef.current, "time_expired");
        } else {
          setWindowExpired(true);
        }
        return;
      }

      if (startMs && !Number.isNaN(startMs) && nowMs < startMs) {
        setWaitingForStart(true);
        setStartCountdownText(formatCountdown(startMs - nowMs));
        return;
      }

      setWaitingForStart(false);

      if (
        startMs &&
        !Number.isNaN(startMs) &&
        autoStartedAtRef.current !== startMs
      ) {
        autoStartedAtRef.current = startMs;

        const expiryTime = computeEffectiveExpiry(quiz, null);
        localStorage.setItem(TIMER_KEY, String(expiryTime));
        setTimeLeft(Math.max(0, Math.floor((expiryTime - nowMs) / 1000)));

        if (cameraStreamRef.current?.active) {
          setShowInstructions(false);
        } else {
          setShowInstructions(true);
          setExamStep(1);
        }
      }
    };

    checkSchedule();
    const interval = setInterval(checkSchedule, 1000);
    return () => clearInterval(interval);
  }, [quiz, result, showInstructions, TIMER_KEY, computeEffectiveExpiry, handleSubmit]);

  const registerViolation = useCallback(
    (reason) => {
      if (submittingRef.current || result) return;
      if (reason !== "voice_detected" && violationActiveRef.current) return;

      const now = Date.now();
      if (now - lastViolationRef.current < 1800) return;

      lastViolationRef.current = now;
      if (reason !== "voice_detected") {
        violationActiveRef.current = true;
      }

      const next = violationRef.current + 1;
      violationRef.current = next;
      setViolations(next);

      localStorage.setItem(VIOLATION_KEY, String(next));

      if (next === 1) {
        let message =
          "Don't cheat! Keep your face straight and look at the screen.";
        if (reason === "face_missing") {
          message = "Face not found. Please stay in front of the camera.";
        } else if (reason === "voice_detected") {
          message = "Voice detected! Keep the exam room silent.";
        }

        setAiMessage(message);
        setFaceWarningModal(false);
        setWarningModal(true);
        speak(message);
      } else {
        setAiMessage("Second violation detected. Submitting quiz...");
        setWarningModal(false);
        setFaceWarningModal(false);
        speak("Second warning. Your quiz is being submitted.");
        handleSubmit(answersRef.current, "proctoring_violation");
      }
    },
    [handleSubmit, result, VIOLATION_KEY, speak]
  );

  // Voice detection monitor using Web Audio API
  useEffect(() => {
    if (
      showInstructions ||
      !micStream ||
      result ||
      waitingForStart ||
      windowExpired
    ) {
      return;
    }

    const AudioCtx =
      window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    let active = true;

    try {
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(micStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const monitorVoice = () => {
        if (!active || submittingRef.current) return;

        analyser.getByteTimeDomainData(dataArray);
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i += 1) {
          const normalized = (dataArray[i] - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);
        const now = performance.now();

        if (rms > VOICE_THRESHOLD) {
          setVoiceStatus("Voice detected");
          if (voiceAboveSinceRef.current === null) {
            voiceAboveSinceRef.current = now;
          }
          if (now - voiceAboveSinceRef.current >= VOICE_HOLD_MS) {
            voiceAboveSinceRef.current = null;
            registerViolation("voice_detected");
          }
        } else {
          setVoiceStatus("Silent");
          voiceAboveSinceRef.current = null;
        }

        voiceFrameRef.current = requestAnimationFrame(monitorVoice);
      };

      monitorVoice();
    } catch (err) {
      console.error("Voice detection error:", err);
    }

    return () => {
      active = false;
      if (voiceFrameRef.current) {
        cancelAnimationFrame(voiceFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [showInstructions, micStream, result, waitingForStart, windowExpired, registerViolation]);

  // Real MediaPipe face detection
  useEffect(() => {
    if (
      showInstructions ||
      !cameraStream ||
      result ||
      waitingForStart ||
      windowExpired
    ) {
      return;
    }

    let active = true;

    const initializeFaceDetector = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);

        const detector = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numFaces: 1
        });

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
              const nose = face[1];
              const leftEye = face[33];
              const rightEye = face[263];

              const eyeCenter = (leftEye.x + rightEye.x) / 2;
              const eyeDistance = Math.abs(rightEye.x - leftEye.x);

              const offset =
                eyeDistance > 0
                  ? Math.abs(nose.x - eyeCenter) / eyeDistance
                  : 0;

              const lookingAway = offset > 0.2;

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
        setCameraError(
          "AI face detector could not be loaded. Check your internet connection."
        );
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
  }, [
    showInstructions,
    cameraStream,
    result,
    waitingForStart,
    windowExpired,
    registerViolation
  ]);

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

  const handleTabViolation = useCallback(() => {
    if (
      result ||
      submittingRef.current ||
      showInstructions ||
      waitingForStart ||
      windowExpired
    ) {
      return;
    }

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
      handleSubmit(answersRef.current, "tab_switch_violation");
    }
  }, [
    result,
    showInstructions,
    waitingForStart,
    windowExpired,
    VIOLATION_KEY,
    handleSubmit,
    speak
  ]);

  useEffect(() => {
    if (showInstructions || result || waitingForStart || windowExpired) return;

    const visibilityHandler = () => {
      if (document.hidden) handleTabViolation();
    };

    document.addEventListener("visibilitychange", visibilityHandler);
    return () => {
      document.removeEventListener("visibilitychange", visibilityHandler);
    };
  }, [handleTabViolation, showInstructions, result, waitingForStart, windowExpired]);

  // Countdown timer: auto-submits attempted answers when time expires
  useEffect(() => {
    if (
      timeLeft === null ||
      result ||
      showInstructions ||
      waitingForStart ||
      windowExpired
    ) {
      return;
    }

    if (timeLeft <= 0) {
      handleSubmit(answersRef.current, "time_expired");
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, result, showInstructions, waitingForStart, windowExpired, handleSubmit]);

  const startActualQuiz = () => {
    if (windowExpired) {
      alert("Quiz schedule window has expired.");
      return;
    }

    if (quiz?.start_at && Date.now() < new Date(quiz.start_at).getTime()) {
      alert(
        "Quiz has not started yet. It will auto-start at the scheduled time."
      );
      return;
    }

    if (!cameraStream?.active) {
      alert("Please enable your camera first.");
      setExamStep(1);
      return;
    }

    setShowInstructions(false);
  };

  const handleOptionSelect = (option) => {
    const newAnswers = [...answers];
    newAnswers[currentIdx] = option;

    setAnswers(newAnswers);
    answersRef.current = newAnswers;
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
        <span style={{ marginTop: 12, fontWeight: 600 }}>Loading Exam...</span>
      </div>
    );
  }

  if (windowExpired && !result) {
    return (
      <div style={styles.resultPage}>
        <div style={styles.resultCard}>
          <div style={{ fontSize: "48px" }}>⏳</div>
          <h2 style={{ margin: "10px 0 6px" }}>Quiz Window Closed</h2>
          <p style={{ color: "#64748b", margin: "0 0 20px" }}>
            Scheduled end time has passed for this quiz.
          </p>
          <button
            type="button"
            onClick={() => navigate("/student/quiz-dashboard")}
            style={styles.dashboardButton}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (result) {
    const percentage = Math.round(Number(result.percentage || 0));

    return (
      <div style={styles.resultPage}>
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          style={styles.resultCard}
        >
          <div style={{ fontSize: "52px" }}>
            {percentage >= 40 ? "🏆" : "📋"}
          </div>
          <h2 style={{ margin: "10px 0 6px", color: "#0f172a" }}>
            Assessment Submitted
          </h2>
          <p style={{ color: "#64748b", margin: 0, fontSize: 14 }}>
            Evaluated based on your attempted answers.
          </p>

          <div style={styles.score}>Score: {percentage}%</div>

          <button
            type="button"
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
  const attemptedCount = answers.filter(
    (a) => a !== null && a !== undefined && String(a).trim() !== ""
  ).length;
  const progress =
    totalQuestions > 0 ? (attemptedCount / totalQuestions) * 100 : 0;

  const currentQuestion = questions[currentIdx];

  return (
    <div style={styles.examContainer}>
      {/* AUTO-START WAITING OVERLAY */}
      <AnimatePresence>
        {waitingForStart && (
          <div style={styles.modalOverlay}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={styles.instructionCard}
            >
              <div style={{ fontSize: "42px" }}>🗓️</div>
              <h2 style={{ margin: "10px 0 6px" }}>Scheduled to Auto-Start</h2>
              <p style={{ color: "#334155", fontSize: "15px", margin: "4px 0" }}>
                <strong>{quiz.title}</strong>
              </p>
              <p style={{ color: "#64748b", fontSize: "13px", margin: "4px 0" }}>
                Starts at:{" "}
                <strong>
                  {quiz.start_at
                    ? new Date(quiz.start_at).toLocaleString("en-IN")
                    : "Scheduled Time"}
                </strong>
              </p>
              <div style={styles.countdownBox}>
                Auto-starting in: <strong>{startCountdownText}</strong>
              </div>
              <button
                type="button"
                onClick={() => navigate("/student/quiz-dashboard")}
                style={{
                  ...styles.navActionBtn,
                  width: "100%",
                  marginTop: "14px"
                }}
              >
                ← Back to Dashboard
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* INSTRUCTIONS & PERMISSIONS */}
      <AnimatePresence>
        {!waitingForStart && showInstructions && (
          <div style={styles.modalOverlay}>
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={styles.instructionCard}
            >
              {examStep === 1 ? (
                <>
                  <div style={{ fontSize: "42px" }}>📸</div>
                  <h2 style={{ margin: "10px 0 8px" }}>
                    Step 1: Camera &amp; Mic Check
                  </h2>
                  <p style={{ color: "#475569", fontSize: "14px", lineHeight: 1.5 }}>
                    Camera and microphone are used for AI proctoring (face
                    focus, voice monitoring, and tab tracking).
                  </p>

                  {cameraError && (
                    <p style={styles.errorText}>{cameraError}</p>
                  )}

                  <button
                    type="button"
                    onClick={requestMediaPermissions}
                    style={styles.startExamBtn}
                  >
                    Allow Camera &amp; Mic →
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: "42px" }}>🎓</div>
                  <h2 style={{ margin: "10px 0 8px" }}>Step 2: Ready to Begin</h2>
                  <p style={{ color: "#475569", fontSize: "14px", lineHeight: 1.5 }}>
                    Keep your face visible, stay silent, and avoid switching tabs.
                    When time ends, attempted answers are auto-evaluated.
                  </p>

                  <video
                    ref={previewVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={styles.previewVideo}
                  />

                  <button
                    type="button"
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

      {/* VIOLATION WARNING MODAL */}
      <AnimatePresence>
        {warningModal && (
          <div style={styles.modalOverlay}>
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={styles.modalCard}
            >
              <div style={{ fontSize: "52px" }}>⚠️</div>
              <h2 style={{ color: "#dc2626", margin: "8px 0" }}>
                Proctoring Warning!
              </h2>
              <p style={{ color: "#475569", fontSize: "14px", lineHeight: 1.5 }}>
                {aiMessage} A second violation will automatically submit your
                test.
              </p>
              <button
                type="button"
                onClick={() => setWarningModal(false)}
                style={styles.modalButton}
              >
                I Understand
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FACE WARNING MODAL */}
      <AnimatePresence>
        {faceWarningModal && (
          <div style={styles.modalOverlay}>
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              style={styles.faceModalCard}
            >
              <button
                type="button"
                onClick={() => setFaceWarningModal(false)}
                style={styles.crossButton}
              >
                ✕
              </button>
              <div style={{ fontSize: "42px" }}>⚠️</div>
              <h3 style={{ color: "#b91c1c" }}>
                {faceStatus === "Face not found"
                  ? "Face Not Found!"
                  : "Keep Your Face Straight!"}
              </h3>
              <p style={{ color: "#475569", fontSize: "13px" }}>{aiMessage}</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PROFESSIONAL LIGHT HEADER */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.liveBadge}>● LIVE</div>
          <div>
            <h1 style={styles.quizTitle}>{quiz.title}</h1>
            <span style={styles.quizSub}>
              {quiz.subject} • {totalQuestions} Questions
            </span>
          </div>
        </div>

        <div style={styles.proctorPanel}>
          <div style={styles.aiTextBox}>
            <span style={{ color: "#1d4ed8", fontWeight: "800" }}>
              AI MONITOR
            </span>
            <span style={{ color: "#0f172a", fontWeight: "600" }}>
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
            <div style={styles.recDot}>CAM</div>
          </div>
        </div>

        <div
          style={{
            ...styles.timerDisplay,
            ...(timeLeft !== null && timeLeft <= 60 ? styles.timerUrgent : {})
          }}
        >
          ⏱ {formatTime(timeLeft)}
        </div>
      </header>

      {/* STATUS BAR */}
      <div style={styles.statusBar}>
        <span
          style={{
            color: faceStatus === "Face detected" ? "#15803d" : "#dc2626"
          }}
        >
          ● {faceStatus}
        </span>
        <span
          style={{
            color: voiceStatus === "Silent" ? "#334155" : "#dc2626"
          }}
        >
          🎙 {voiceStatus}
        </span>
        <span>Warnings: {violations}/2</span>
      </div>

      {cameraError && <div style={styles.errorBanner}>{cameraError}</div>}

      <div style={styles.progressBarBg}>
        <motion.div
          animate={{ width: `${progress}%` }}
          style={styles.progressBarFill}
        />
      </div>

      {/* QUESTION PALETTE + QUESTION CARD */}
      <div style={styles.mainLayout}>
        <div style={styles.paletteBar}>
          {questions.map((_, idx) => {
            const isAnswered =
              answers[idx] !== null &&
              answers[idx] !== undefined &&
              String(answers[idx]).trim() !== "";
            const isCurrent = idx === currentIdx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIdx(idx)}
                style={{
                  ...styles.paletteBtn,
                  background: isCurrent
                    ? "#2563eb"
                    : isAnswered
                    ? "#ecfdf5"
                    : "#ffffff",
                  color: isCurrent
                    ? "#ffffff"
                    : isAnswered
                    ? "#047857"
                    : "#475569",
                  borderColor: isCurrent
                    ? "#2563eb"
                    : isAnswered
                    ? "#86efac"
                    : "#cbd5e1"
                }}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        <main style={styles.questionSection}>
          <div style={styles.questionCard}>
            <div style={styles.qCardHeader}>
              <span style={styles.qNumberTag}>
                Question {currentIdx + 1} of {totalQuestions}
              </span>
              <span style={styles.attemptStatus}>
                {attemptedCount} of {totalQuestions} Attempted
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
                    type="button"
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleOptionSelect(opt)}
                    style={{
                      ...styles.optionItem,
                      background: selected ? "#eff6ff" : "#ffffff",
                      borderColor: selected ? "#2563eb" : "#e2e8f0"
                    }}
                  >
                    <div
                      style={{
                        ...styles.optionLetterBox,
                        background: selected ? "#2563eb" : "#f1f5f9",
                        color: selected ? "#ffffff" : "#334155"
                      }}
                    >
                      {labels[i]}
                    </div>

                    <span
                      style={{
                        color: selected ? "#1e3a8a" : "#1e293b",
                        fontSize: "15px",
                        fontWeight: "600",
                        flex: 1,
                        textAlign: "left"
                      }}
                    >
                      {formatMath(opt)}
                    </span>

                    <span style={{ fontWeight: 700 }}>{selected ? "✓" : "○"}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div style={styles.footerNav}>
            <button
              type="button"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((p) => p - 1)}
              style={{
                ...styles.navActionBtn,
                opacity: currentIdx === 0 ? 0.5 : 1
              }}
            >
              ← Prev
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit(answers, "manual")}
              style={styles.submitEarlyBtn}
            >
              Submit Test
            </button>

            {currentIdx === totalQuestions - 1 ? (
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit(answers, "manual")}
                style={styles.finishActionBtn}
              >
                {submitting ? "Submitting..." : "Finish ✓"}
              </button>
            ) : (
              <button
                type="button"
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
          Submitting and evaluating your attempted answers...
        </div>
      )}
    </div>
  );
};

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
    gap: "12px",
    padding: "12px 18px",
    background: "#ffffff",
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
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "800"
  },

  quizTitle: {
    margin: 0,
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a",
    maxWidth: "200px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },

  quizSub: {
    fontSize: "12px",
    color: "#64748b"
  },

  proctorPanel: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },

  aiTextBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    padding: "6px 10px",
    borderRadius: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    maxWidth: "210px",
    fontSize: "11px"
  },

  cameraWrapper: {
    width: "88px",
    height: "60px",
    background: "#0f172a",
    borderRadius: "8px",
    border: "2px solid #2563eb",
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
    bottom: "3px",
    right: "3px",
    background: "#2563eb",
    color: "#ffffff",
    fontSize: "8px",
    fontWeight: 700,
    padding: "1px 4px",
    borderRadius: "3px"
  },

  timerDisplay: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    padding: "8px 12px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "700",
    color: "#1d4ed8"
  },

  timerUrgent: {
    background: "#fef2f2",
    borderColor: "#fecaca",
    color: "#dc2626"
  },

  statusBar: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "10px",
    padding: "9px 18px",
    background: "#ffffff",
    borderBottom: "1px solid #f1f5f9",
    fontSize: "12px",
    fontWeight: "700"
  },

  errorBanner: {
    padding: "10px 16px",
    background: "#fef2f2",
    color: "#b91c1c",
    borderBottom: "1px solid #fecaca",
    textAlign: "center",
    fontSize: "13px",
    fontWeight: 600
  },

  progressBarBg: {
    width: "100%",
    height: "5px",
    background: "#e2e8f0"
  },

  progressBarFill: {
    height: "100%",
    background: "#2563eb"
  },

  mainLayout: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    width: "100%",
    maxWidth: "860px",
    margin: "0 auto",
    padding: "18px 16px 32px",
    gap: "14px",
    boxSizing: "border-box"
  },

  paletteBar: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    padding: "12px",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px"
  },

  paletteBtn: {
    width: "34px",
    height: "34px",
    borderRadius: "8px",
    border: "1px solid",
    fontSize: "12px",
    fontWeight: "700",
    cursor: "pointer"
  },

  questionSection: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "14px"
  },

  questionCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "24px",
    boxShadow: "0 4px 16px rgba(15, 23, 42, 0.04)"
  },

  qCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "14px"
  },

  qNumberTag: {
    background: "#eff6ff",
    color: "#2563eb",
    padding: "5px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "700"
  },

  attemptStatus: {
    fontSize: "12px",
    color: "#64748b",
    fontWeight: 600
  },

  questionText: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#0f172a",
    lineHeight: "1.55",
    margin: "0 0 20px 0"
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
    width: "30px",
    height: "30px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "700",
    flexShrink: 0
  },

  footerNav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px"
  },

  navActionBtn: {
    background: "#ffffff",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    padding: "10px 18px",
    borderRadius: "10px",
    fontWeight: 600,
    cursor: "pointer"
  },

  submitEarlyBtn: {
    background: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
    padding: "10px 16px",
    borderRadius: "10px",
    fontWeight: 700,
    cursor: "pointer"
  },

  finishActionBtn: {
    background: "#059669",
    color: "#ffffff",
    border: "none",
    padding: "10px 22px",
    borderRadius: "10px",
    fontWeight: 700,
    cursor: "pointer"
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.55)",
    backdropFilter: "blur(5px)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px"
  },

  instructionCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    maxWidth: "420px",
    width: "100%",
    padding: "28px",
    borderRadius: "20px",
    textAlign: "center",
    boxSizing: "border-box",
    boxShadow: "0 20px 45px rgba(15, 23, 42, 0.14)"
  },

  countdownBox: {
    marginTop: "12px",
    padding: "10px 14px",
    borderRadius: "10px",
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: "14px"
  },

  previewVideo: {
    width: "160px",
    height: "115px",
    objectFit: "cover",
    borderRadius: "10px",
    margin: "12px auto 16px",
    display: "block",
    background: "#0f172a",
    transform: "scaleX(-1)"
  },

  startExamBtn: {
    background: "#2563eb",
    color: "#ffffff",
    border: "none",
    padding: "12px 20px",
    borderRadius: "12px",
    fontWeight: "700",
    cursor: "pointer",
    width: "100%",
    marginTop: "8px"
  },

  modalCard: {
    background: "#ffffff",
    border: "1px solid #fecaca",
    maxWidth: "390px",
    width: "100%",
    padding: "28px",
    borderRadius: "20px",
    textAlign: "center",
    boxSizing: "border-box"
  },

  faceModalCard: {
    background: "#ffffff",
    border: "1px solid #fecaca",
    maxWidth: "350px",
    width: "100%",
    padding: "24px",
    borderRadius: "18px",
    textAlign: "center",
    boxShadow: "0 15px 35px rgba(239, 68, 68, 0.15)",
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
    color: "#ffffff",
    border: "none",
    padding: "12px 20px",
    borderRadius: "12px",
    fontWeight: 600,
    width: "100%",
    cursor: "pointer"
  },

  errorText: {
    color: "#dc2626",
    fontSize: "13px",
    fontWeight: 600
  },

  loadingPage: {
    width: "100vw",
    height: "100vh",
    background: "#f8fafc",
    color: "#0f172a",
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
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    padding: "35px",
    borderRadius: "22px",
    maxWidth: "420px",
    width: "100%",
    textAlign: "center",
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)"
  },

  score: {
    fontSize: "28px",
    fontWeight: "800",
    color: "#2563eb",
    margin: "20px 0"
  },

  dashboardButton: {
    background: "#2563eb",
    color: "#ffffff",
    border: "none",
    padding: "12px 20px",
    borderRadius: "12px",
    fontWeight: 700,
    width: "100%",
    cursor: "pointer"
  },

  submittingOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.55)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "15px",
    fontWeight: "700",
    zIndex: 1200
  }
};

export default AttemptQuizPage;