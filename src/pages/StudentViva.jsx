import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";

const GROQ_API_KEY = (process.env.REACT_APP_GROQ_API_KEY || "").trim();
const GROQ_MODEL = (
  process.env.REACT_APP_GROQ_MODEL || "openai/gpt-oss-20b"
).trim();

const VIVA_DURATION_SECONDS = 5 * 60; // 5 minutes viva timer
const GRACE_BEFORE_COUNT_MS = 6000; // Give student time to start speaking before count shows
const SILENCE_COUNT_SECONDS = 6; // Count down 6 -> 1 as plain number (no popup)
const MAX_ADMIN_PHOTOS = 5;

const extractApiError = (err, fallback) =>
  err?.response?.data?.message ||
  err?.response?.data?.error ||
  err?.message ||
  fallback;

const formatClock = (totalSec) => {
  const safe = Math.max(0, Number(totalSec) || 0);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const getLoggedInStudentId = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.id || user.studentId || user.student_id || null;
  } catch {
    return null;
  }
};

const parseTopicsList = (raw) => {
  if (Array.isArray(raw)) {
    return raw
      .map((item) =>
        typeof item === "string"
          ? item.trim()
          : String(item?.topic_name || "").trim()
      )
      .filter(Boolean);
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parseTopicsList(parsed);
    } catch {
      // ignore parse error
    }
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

const pickRandomTopic = (topics = [], usedTopics = [], fallbackSubject = "General") => {
  if (Array.isArray(topics) && topics.length > 0) {
    const unused = topics.filter((t) => !usedTopics.includes(t));
    const pool = unused.length > 0 ? unused : topics;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return fallbackSubject || "General";
};

const checkVivaAlreadyAttempted = (row) => {
  if (!row || typeof row !== "object") return false;
  if (row.already_attempted === true || row.alreadyAttempted === true) return true;
  if (row.is_attempted === true || row.isAttempted === true) return true;
  if (row.has_attempted === true || row.hasAttempted === true) return true;
  if (row.eligible === false) return true;

  const attemptStatus = String(
    row.attempt_status || row.attemptStatus || row.submission_status || ""
  ).toLowerCase();
  if (
    ["completed", "submitted", "evaluated", "done", "attempted", "finished"].includes(
      attemptStatus
    )
  ) {
    return true;
  }

  const remaining = row.remaining_attempts ?? row.remainingAttempts;
  if (remaining !== undefined && remaining !== null && Number(remaining) <= 0) {
    return true;
  }

  const attemptsUsed = Number(
    row.attempts_used ?? row.attempt_count ?? row.attemptCount ?? 0
  );
  const maxAttempts = Number(
    row.max_attempts ?? row.maxAttempts ?? row.allowed_attempts ?? 1
  );
  if (
    Number.isFinite(attemptsUsed) &&
    Number.isFinite(maxAttempts) &&
    maxAttempts > 0 &&
    attemptsUsed >= maxAttempts
  ) {
    return true;
  }

  return false;
};

const isVivaAvailable = (row) => {
  const status = String(row?.status || "").toLowerCase();
  const availStatus = String(row?.availability_status || "").toLowerCase();
  if (availStatus && availStatus !== "available" && availStatus !== "attempted") {
    return false;
  }
  if (status && status !== "active" && status !== "available") return false;
  return true;
};

const normalizeAvailableViva = (row) => {
  if (!row || typeof row !== "object") return null;
  return {
    id: row.id ?? row.viva_id,
    attempt_id:
      row.attempt_id ?? row.attemptId ?? row.active_attempt_id ?? row.id ?? row.viva_id,
    title: row.title || "Viva",
    class_name: row.class_name ?? row.className ?? "",
    subject: row.subject || "General",
    description: row.description || "",
    difficulty: row.difficulty || "Medium",
    topics: parseTopicsList(
      row.topics ?? row.viva_topics ?? row.admin_viva_topics
    ),
    total_questions: Number(row.total_questions ?? row.totalQuestions ?? 5) || 5,
    alreadyAttempted: checkVivaAlreadyAttempted(row),
  };
};

// --------------------------------------------------
// GROQ MODEL CALLER
// --------------------------------------------------

function withTimeout(promise, ms = 12000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Groq request timed out")), ms)
    ),
  ]);
}

function extractGroqText(data) {
  const msg = data?.choices?.[0]?.message;
  if (!msg) return "";

  if (typeof msg.content === "string" && msg.content.trim()) {
    return msg.content.trim();
  }

  if (Array.isArray(msg.content)) {
    const joined = msg.content
      .map((part) => (typeof part === "string" ? part : part?.text || ""))
      .join(" ")
      .trim();
    if (joined) return joined;
  }

  if (typeof data?.choices?.[0]?.text === "string" && data.choices[0].text.trim()) {
    return data.choices[0].text.trim();
  }

  return "";
}

async function callGroqChat(messages) {
  if (!GROQ_API_KEY) {
    throw new Error("Missing REACT_APP_GROQ_API_KEY");
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await withTimeout(
      fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages,
          temperature: 0.6,
          max_tokens: 450,
        }),
      }),
      12000
    );

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error?.message || `Groq HTTP ${res.status}`);
    }

    const content = extractGroqText(data);
    if (content) {
      return content;
    }
  }

  throw new Error("Empty response from Groq model");
}

async function generateQuestionFromModel({
  viva,
  topic,
  questionNumber,
  askedQuestions,
}) {
  const messages = [
    {
      role: "system",
      content:
        "You are a viva examiner. Output ONLY one short spoken question (1-2 sentences) based on the topic. No extra intro or labels.",
    },
    {
      role: "user",
      content: `Class: ${viva.class_name || "10th"}, Subject: ${viva.subject}, Difficulty: ${viva.difficulty || "Medium"}.
Topic guide: "${topic}".
Question ${questionNumber} of ${viva.total_questions}.
Already asked questions: ${JSON.stringify(askedQuestions)}.
Output ONLY the next question.`,
    },
  ];

  return await callGroqChat(messages);
}

async function generateReplyFromModel({
  viva,
  topic,
  question,
  studentAnswer,
  isLastQuestion,
}) {
  const cleanAns = String(studentAnswer || "").trim();
  if (!cleanAns) return "";

  const messages = [
    {
      role: "system",
      content:
        "You are a spoken viva examiner. Output ONLY 1 short sentence acknowledging the student's actual answer.",
    },
    {
      role: "user",
      content: `Subject: ${viva.subject}, Class: ${viva.class_name || "10th"}, Topic: "${topic}".
Question: "${question}"
Student answered: "${cleanAns}"
Is last question: ${isLastQuestion ? "yes" : "no"}.
Output ONLY the spoken reply.`,
    },
  ];

  return await callGroqChat(messages);
}

// --------------------------------------------------
// 3D SMARTBOT PANEL (EYE TRACKING + BLINK + FLOAT + WAVES)
// --------------------------------------------------

function VivaBot3DPanel({
  isSpeaking,
  isListening,
  isGenerating,
  isSubmitting,
  pupilOffset,
}) {
  const statusLabel = isSubmitting
    ? "Submitting..."
    : isGenerating
    ? "Generating..."
    : isSpeaking
    ? "Speaking..."
    : isListening
    ? "Listening..."
    : "Monitoring";

  const waveBars = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div style={vivaStyles.bot3DCard} className="viva-3d-float">
      <div style={vivaStyles.botTopRow}>
        <span style={vivaStyles.bot3DTitle}>◆ SmartBot 3D</span>
        <span style={vivaStyles.bot3DBadge}>{statusLabel}</span>
      </div>

      <div style={vivaStyles.bot3DStage}>
        <div className="viva-3d-orbit-a" style={vivaStyles.bot3DOrbitA} />
        <div className="viva-3d-orbit-b" style={vivaStyles.bot3DOrbitB} />

        <div
          className={isSpeaking ? "viva-3d-talk" : ""}
          style={vivaStyles.bot3DHead}
        >
          <div style={vivaStyles.botAntenna} />
          <div style={vivaStyles.botEyeSocket}>
            <div
              className="viva-eye-blink"
              style={{
                ...vivaStyles.botEyeBall,
                transform: `translate(${pupilOffset.x}px, ${pupilOffset.y}px)`,
              }}
            >
              <div style={vivaStyles.botPupil}>
                <div style={vivaStyles.botGlint} />
              </div>
            </div>
          </div>

          <div style={vivaStyles.botEyeSocket}>
            <div
              className="viva-eye-blink"
              style={{
                ...vivaStyles.botEyeBall,
                transform: `translate(${pupilOffset.x}px, ${pupilOffset.y}px)`,
              }}
            >
              <div style={vivaStyles.botPupil}>
                <div style={vivaStyles.botGlint} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={vivaStyles.waveStrip} aria-hidden="true">
        {waveBars.map((bar) => (
          <span
            key={bar}
            className={isListening || isSpeaking ? "viva-wave-anim" : ""}
            style={{
              ...vivaStyles.waveBar,
              background: isSpeaking
                ? "linear-gradient(180deg, #38bdf8, #818cf8)"
                : "linear-gradient(180deg, #34d399, #10b981)",
              height:
                isListening || isSpeaking
                  ? `${10 + ((bar * 6) % 16)}px`
                  : "6px",
              animationDelay: `${bar * 0.08}s`,
            }}
          />
        ))}
      </div>

      <div style={vivaStyles.bot3DFooter}>3D Eye Lock &amp; Voice Sync</div>
    </div>
  );
}

// --------------------------------------------------
// MAIN COMPONENT
// --------------------------------------------------

function StudentViva({ userId, studentName, studentClass }) {
  const [vivas, setVivas] = useState([]);
  const [completedVivaIds, setCompletedVivaIds] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Active viva session state
  const [activeViva, setActiveViva] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [currentTopic, setCurrentTopic] = useState("");
  const [usedTopics, setUsedTopics] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [askedQuestions, setAskedQuestions] = useState([]);
  const [qaPairs, setQaPairs] = useState([]);
  const [vivaError, setVivaError] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // 5-minute viva timer (05:00 -> 00:00)
  const [remainingSeconds, setRemainingSeconds] = useState(VIVA_DURATION_SECONDS);

  // Plain number-only silence countdown (shown only after grace period if no voice, no popup)
  const [silenceNumber, setSilenceNumber] = useState(null);
  const [userCurrentlySpeaking, setUserCurrentlySpeaking] = useState(false);
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });

  // Student Camera + Straight Face + Single Person + 5 Admin Snapshot Captures
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const faceDetectorRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [faceStatusMsg, setFaceStatusMsg] = useState(
    "Keep your face straight & centered"
  );
  const [faceAlert, setFaceAlert] = useState("");
  const [capturedPhotosCount, setCapturedPhotosCount] = useState(0);
  const [lastPhotoFlash, setLastPhotoFlash] = useState(false);

  // AI Proctoring (warning on 1st switch, terminate on 2nd switch; no termination count/time shown)
  const [proctorWarning, setProctorWarning] = useState("");
  const [terminatedByProctor, setTerminatedByProctor] = useState(false);
  const switchCountRef = useRef(0);
  const lastSwitchTsRef = useRef(0);

  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const answerRef = useRef("");
  const qaPairsRef = useRef([]);
  const activeVivaRef = useRef(null);
  const attemptIdRef = useRef(null);
  const currentTopicRef = useRef("");
  const currentQuestionRef = useRef("");
  const questionNumberRef = useRef(1);
  const graceTimerRef = useRef(null);
  const silenceIntervalRef = useRef(null);
  const silenceTimeoutRef = useRef(null);
  const speechResumeTimerRef = useRef(null);
  const autoAdvanceHandlerRef = useRef(null);
  const timeUpHandlerRef = useRef(null);
  const terminateSubmitHandlerRef = useRef(null);
  const photosCapturedRef = useRef(0);

  useEffect(() => {
    answerRef.current = answerText;
  }, [answerText]);

  useEffect(() => {
    qaPairsRef.current = qaPairs;
  }, [qaPairs]);

  useEffect(() => {
    activeVivaRef.current = activeViva;
  }, [activeViva]);

  useEffect(() => {
    attemptIdRef.current = attemptId;
  }, [attemptId]);

  useEffect(() => {
    currentTopicRef.current = currentTopic;
  }, [currentTopic]);

  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);

  useEffect(() => {
    questionNumberRef.current = questionNumber;
  }, [questionNumber]);

  // Eye monitoring gaze tracking
  useEffect(() => {
    const onPointerMove = (e) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / Math.max(1, cx);
      const dy = (e.clientY - cy) / Math.max(1, cy);
      setPupilOffset({
        x: Math.max(-5, Math.min(5, dx * 5)),
        y: Math.max(-4, Math.min(4, dy * 4)),
      });
    };
    window.addEventListener("pointermove", onPointerMove);
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, []);

  const clearSilenceTimers = useCallback(() => {
    if (graceTimerRef.current) {
      clearTimeout(graceTimerRef.current);
      graceTimerRef.current = null;
    }
    if (silenceIntervalRef.current) {
      clearInterval(silenceIntervalRef.current);
      silenceIntervalRef.current = null;
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    setSilenceNumber(null);
  }, []);

  // Give student grace period to start speaking first; only if still quiet, show plain number countdown
  const armSilenceCountdownAfterGrace = useCallback(() => {
    clearSilenceTimers();
    if (
      !activeViva ||
      sessionDone ||
      submitSuccess ||
      terminatedByProctor ||
      isGenerating ||
      isSubmitting ||
      isSpeaking ||
      userCurrentlySpeaking
    ) {
      return;
    }

    graceTimerRef.current = setTimeout(() => {
      if (userCurrentlySpeaking) return;

      let count = SILENCE_COUNT_SECONDS;
      setSilenceNumber(count);

      silenceIntervalRef.current = setInterval(() => {
        if (userCurrentlySpeaking) {
          clearSilenceTimers();
          return;
        }
        count -= 1;
        if (count >= 1) {
          setSilenceNumber(count);
        } else if (silenceIntervalRef.current) {
          clearInterval(silenceIntervalRef.current);
          silenceIntervalRef.current = null;
        }
      }, 1000);

      silenceTimeoutRef.current = setTimeout(() => {
        clearSilenceTimers();
        if (userCurrentlySpeaking) return;
        if (autoAdvanceHandlerRef.current) {
          autoAdvanceHandlerRef.current();
        }
      }, SILENCE_COUNT_SECONDS * 1000);
    }, GRACE_BEFORE_COUNT_MS);
  }, [
    clearSilenceTimers,
    activeViva,
    sessionDone,
    submitSuccess,
    terminatedByProctor,
    isGenerating,
    isSubmitting,
    isSpeaking,
    userCurrentlySpeaking,
  ]);

  // Stop any counting immediately when student starts speaking; re-arm grace + count if student stops
  const handleStudentSpeakingStart = useCallback(() => {
    setUserCurrentlySpeaking(true);
    clearSilenceTimers();
    if (speechResumeTimerRef.current) {
      clearTimeout(speechResumeTimerRef.current);
      speechResumeTimerRef.current = null;
    }
  }, [clearSilenceTimers]);

  const handleStudentSpeakingStop = useCallback(() => {
    setUserCurrentlySpeaking(false);
    if (speechResumeTimerRef.current) {
      clearTimeout(speechResumeTimerRef.current);
    }
    speechResumeTimerRef.current = setTimeout(() => {
      armSilenceCountdownAfterGrace();
    }, 800);
  }, [armSilenceCountdownAfterGrace]);

  const stopCameraAndPhotos = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  const captureAdminSnapshot = useCallback(async () => {
    if (photosCapturedRef.current >= MAX_ADMIN_PHOTOS) return;
    const videoEl = videoRef.current;
    if (!videoEl || videoEl.readyState < 2) return;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
    const canvas = canvasRef.current;
    canvas.width = videoEl.videoWidth || 320;
    canvas.height = videoEl.videoHeight || 240;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    const snapshotBase64 = canvas.toDataURL("image/jpeg", 0.65);

    photosCapturedRef.current += 1;
    const shotNum = photosCapturedRef.current;
    setCapturedPhotosCount(shotNum);
    setLastPhotoFlash(true);
    setTimeout(() => setLastPhotoFlash(false), 450);

    const targetId = attemptId || activeViva?.attempt_id || activeViva?.id;
    const studentId = userId || getLoggedInStudentId();
    if (targetId) {
      try {
        await api.post(`/api/student/viva/attempt/${targetId}/answer`, {
          viva_id: activeViva?.id,
          attempt_id: targetId,
          student_id: studentId,
          proctor_photo: snapshotBase64,
          photo_number: shotNum,
          total_photos: MAX_ADMIN_PHOTOS,
          event_type: "proctor_snapshot",
        });
      } catch {
        // non-blocking background snapshot upload
      }
    }
  }, [attemptId, activeViva, userId]);

  // Start camera + straight face & single-person monitoring + 5 snapshots during viva
  useEffect(() => {
    if (!activeViva || sessionDone || submitSuccess || terminatedByProctor) {
      stopCameraAndPhotos();
      return;
    }

    let cancelled = false;
    let photoIntervalId = null;
    let faceCheckIntervalId = null;

    const initCamera = async () => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setFaceStatusMsg("Camera unavailable • Stay centered");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraReady(true);

        if (typeof window !== "undefined" && "FaceDetector" in window) {
          try {
            faceDetectorRef.current = new window.FaceDetector({
              fastMode: true,
              maxDetectedFaces: 3,
            });
          } catch {
            faceDetectorRef.current = null;
          }
        }

        setTimeout(() => {
          if (!cancelled) captureAdminSnapshot();
        }, 1200);

        photoIntervalId = setInterval(() => {
          if (!cancelled && photosCapturedRef.current < MAX_ADMIN_PHOTOS) {
            captureAdminSnapshot();
          }
        }, 7000);

        faceCheckIntervalId = setInterval(async () => {
          const vid = videoRef.current;
          if (cancelled || !vid || vid.readyState < 2) return;

          if (faceDetectorRef.current) {
            try {
              const faces = await faceDetectorRef.current.detect(vid);
              if (!faces || faces.length === 0) {
                setFaceAlert("Face not in frame — look straight at camera");
                setFaceStatusMsg("No face detected");
              } else if (faces.length > 1) {
                setFaceAlert("Multiple persons detected — only 1 person allowed");
                setFaceStatusMsg("Multiple faces detected");
              } else {
                const box = faces[0].boundingBox;
                const vidW = vid.videoWidth || 1;
                const centerX = (box.x + box.width / 2) / vidW;
                if (centerX < 0.28 || centerX > 0.72) {
                  setFaceAlert("Keep your face straight & centered");
                  setFaceStatusMsg("Face off-center");
                } else {
                  setFaceAlert("");
                  setFaceStatusMsg("Face straight • Single person verified");
                }
              }
            } catch {
              setFaceAlert("");
              setFaceStatusMsg("Face straight • Camera active");
            }
          } else {
            setFaceAlert("");
            setFaceStatusMsg("Face straight • Camera active");
          }
        }, 2500);
      } catch {
        if (!cancelled) {
          setCameraReady(false);
          setFaceStatusMsg("Allow camera for straight-face monitoring");
        }
      }
    };

    initCamera();

    return () => {
      cancelled = true;
      if (photoIntervalId) clearInterval(photoIntervalId);
      if (faceCheckIntervalId) clearInterval(faceCheckIntervalId);
      stopCameraAndPhotos();
    };
  }, [
    activeViva,
    sessionDone,
    submitSuccess,
    terminatedByProctor,
    stopCameraAndPhotos,
    captureAdminSnapshot,
  ]);

  const stopListening = useCallback(() => {
    clearSilenceTimers();
    if (speechResumeTimerRef.current) {
      clearTimeout(speechResumeTimerRef.current);
      speechResumeTimerRef.current = null;
    }
    setUserCurrentlySpeaking(false);
    shouldListenRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, [clearSilenceTimers]);

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (
      !SpeechRecognition ||
      !activeViva ||
      sessionDone ||
      submitSuccess ||
      terminatedByProctor ||
      isGenerating ||
      isSubmitting
    ) {
      return;
    }

    shouldListenRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    const rec = new SpeechRecognition();
    rec.lang = "en-IN";
    rec.interimResults = true;
    rec.continuous = true;

    rec.onstart = () => {
      setIsListening(true);
      armSilenceCountdownAfterGrace();
    };

    rec.onresult = (event) => {
      handleStudentSpeakingStart();
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += `${event.results[i][0].transcript} `;
      }
      setAnswerText(transcript.trim());
      handleStudentSpeakingStop();
    };

    rec.onspeechstart = () => {
      handleStudentSpeakingStart();
    };

    rec.onspeechend = () => {
      handleStudentSpeakingStop();
    };

    rec.onerror = () => {
      setIsListening(false);
      armSilenceCountdownAfterGrace();
    };

    rec.onend = () => {
      setIsListening(false);
      if (
        shouldListenRef.current &&
        !sessionDone &&
        !submitSuccess &&
        !terminatedByProctor &&
        !isGenerating &&
        !isSubmitting
      ) {
        try {
          rec.start();
        } catch {
          armSilenceCountdownAfterGrace();
        }
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      setIsListening(false);
      armSilenceCountdownAfterGrace();
    }
  }, [
    activeViva,
    sessionDone,
    submitSuccess,
    terminatedByProctor,
    isGenerating,
    isSubmitting,
    armSilenceCountdownAfterGrace,
    handleStudentSpeakingStart,
    handleStudentSpeakingStop,
  ]);

  const speakText = useCallback(
    (text, onFinishedCallback) => {
      stopListening();
      if (!text || typeof window === "undefined" || !("speechSynthesis" in window)) {
        if (typeof onFinishedCallback === "function") {
          onFinishedCallback();
        } else {
          startListening();
        }
        return;
      }

      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1;
        utter.pitch = 1.05;

        let doneCalled = false;
        const finishOnce = () => {
          if (doneCalled) return;
          doneCalled = true;
          setIsSpeaking(false);
          if (typeof onFinishedCallback === "function") {
            onFinishedCallback();
          } else if (!sessionDone && !submitSuccess && !terminatedByProctor && !isSubmitting) {
            startListening();
          }
        };

        utter.onstart = () => {
          setIsSpeaking(true);
          clearSilenceTimers();
        };
        utter.onend = finishOnce;
        utter.onerror = finishOnce;

        window.speechSynthesis.speak(utter);
      } catch {
        setIsSpeaking(false);
        if (typeof onFinishedCallback === "function") {
          onFinishedCallback();
        } else {
          startListening();
        }
      }
    },
    [
      stopListening,
      startListening,
      sessionDone,
      submitSuccess,
      terminatedByProctor,
      isSubmitting,
      clearSilenceTimers,
    ]
  );

  useEffect(() => {
    return () => {
      stopListening();
      stopCameraAndPhotos();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [stopListening, stopCameraAndPhotos]);

  const fetchVivas = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const studentId = userId || getLoggedInStudentId();
      const [availRes, histRes] = await Promise.allSettled([
        api.get("/api/student/viva/available", {
          params: studentId ? { studentId } : {},
        }),
        api.get("/api/student/viva/history", {
          params: studentId ? { studentId } : {},
        }),
      ]);

      if (availRes.status !== "fulfilled") {
        throw availRes.reason;
      }

      const doneIds = new Set();
      if (histRes.status === "fulfilled") {
        const histRows = Array.isArray(histRes.value.data?.history)
          ? histRes.value.data.history
          : Array.isArray(histRes.value.data?.attempts)
          ? histRes.value.data.attempts
          : Array.isArray(histRes.value.data?.vivas)
          ? histRes.value.data.vivas
          : [];
        histRows.forEach((h) => {
          const vid = h?.viva_id ?? h?.vivaId ?? h?.id;
          const st = String(h?.status || "").toLowerCase();
          if (vid && (!st || ["completed", "submitted", "evaluated"].includes(st))) {
            doneIds.add(String(vid));
          }
        });
      }
      setCompletedVivaIds(Array.from(doneIds));

      const rawList = Array.isArray(availRes.value.data?.vivas)
        ? availRes.value.data.vivas
        : [];
      const cleanList = rawList
        .filter(isVivaAvailable)
        .map((row) => {
          const norm = normalizeAvailableViva(row);
          if (!norm) return null;
          const matchedDone = doneIds.has(String(norm.id));
          return {
            ...norm,
            alreadyAttempted: norm.alreadyAttempted || matchedDone,
          };
        })
        .filter((v) => v && v.id !== undefined && v.id !== null);

      setVivas(cleanList);
    } catch (err) {
      setErrorMsg(extractApiError(err, "Unable to fetch available vivas."));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchVivas();
  }, [fetchVivas]);

  const subjects = useMemo(() => {
    const set = new Set();
    vivas.forEach((v) => v.subject && set.add(v.subject));
    return ["ALL", ...Array.from(set)];
  }, [vivas]);

  const filteredVivas = useMemo(() => {
    if (selectedSubject === "ALL") return vivas;
    return vivas.filter(
      (v) => String(v.subject).toLowerCase() === selectedSubject.toLowerCase()
    );
  }, [vivas, selectedSubject]);

  const submitAllToBackend = useCallback(
    async (vivaObj, currentAttemptId, finalQaList, extraMeta = {}) => {
      setIsSubmitting(true);
      setVivaError("");
      try {
        const targetAttemptId =
          currentAttemptId || vivaObj?.attempt_id || vivaObj?.id;
        const studentId = userId || getLoggedInStudentId();

        const payload = {
          viva_id: vivaObj?.id,
          attempt_id: targetAttemptId,
          student_id: studentId,
          subject: vivaObj?.subject,
          photos_captured: photosCapturedRef.current,
          terminated: Boolean(extraMeta.terminated),
          termination_reason: extraMeta.termination_reason || null,
          questions: finalQaList.map((item) => item.question),
          answers: finalQaList.map((item) => item.answer),
          qa: finalQaList,
        };

        const res = await api.post(
          `/api/student/viva/attempt/${targetAttemptId}/submit`,
          payload
        );

        if (res.data?.success === false) {
          throw new Error(res.data?.message || "Submit rejected by server");
        }

        setCompletedVivaIds((prev) =>
          prev.includes(String(vivaObj?.id)) ? prev : [...prev, String(vivaObj?.id)]
        );
        setVivas((prev) =>
          prev.map((item) =>
            String(item.id) === String(vivaObj?.id)
              ? { ...item, alreadyAttempted: true }
              : item
          )
        );

        setSubmitSuccess(true);
        setSessionDone(true);
        setCurrentQuestion("");
      } catch (err) {
        setVivaError(extractApiError(err, "Failed to submit viva answers."));
      } finally {
        setIsSubmitting(false);
      }
    },
    [userId]
  );

  const proceedQuestionOrSubmit = useCallback(
    async ({ spokenAnswer, noAnswerNotice }) => {
      if (!activeViva || isGenerating || isSubmitting || sessionDone) return;

      stopListening();
      const hasAnswer = Boolean(String(spokenAnswer || "").trim());
      const recordedAns = hasAnswer
        ? String(spokenAnswer).trim()
        : "Not giving answer (no voice detected)";

      setAnswerText("");
      setVivaError("");
      setIsGenerating(true);

      try {
        const isLastQuestion = questionNumber >= activeViva.total_questions;
        const updatedQa = [
          ...qaPairs,
          {
            question_number: questionNumber,
            topic: currentTopic,
            question: currentQuestion,
            answer: recordedAns,
          },
        ];
        setQaPairs(updatedQa);

        const reply = hasAnswer
          ? await generateReplyFromModel({
              viva: activeViva,
              topic: currentTopic,
              question: currentQuestion,
              studentAnswer: recordedAns,
              isLastQuestion,
            })
          : "";

        if (isLastQuestion) {
          setCurrentQuestion("");
          setIsGenerating(false);
          await submitAllToBackend(activeViva, attemptId, updatedQa);
          return;
        }

        const nextNum = questionNumber + 1;
        const nextTopic = pickRandomTopic(
          activeViva.topics,
          usedTopics,
          activeViva.subject
        );

        const nextQuestion = await generateQuestionFromModel({
          viva: activeViva,
          topic: nextTopic,
          questionNumber: nextNum,
          askedQuestions,
        });

        setCurrentTopic(nextTopic);
        setUsedTopics((prev) =>
          prev.length >= activeViva.topics.length ? [nextTopic] : [...prev, nextTopic]
        );
        setQuestionNumber(nextNum);
        setCurrentQuestion(nextQuestion);
        setAskedQuestions((prev) => [...prev, nextQuestion]);
        setIsGenerating(false);

        const spokenLead = noAnswerNotice
          ? `${noAnswerNotice} ${nextQuestion}`
          : `${reply} ${nextQuestion}`.trim();
        speakText(spokenLead);
      } catch (err) {
        setVivaError(err?.message || "Failed to process question transition.");
        setIsGenerating(false);
        startListening();
      }
    },
    [
      activeViva,
      isGenerating,
      isSubmitting,
      sessionDone,
      stopListening,
      questionNumber,
      qaPairs,
      currentTopic,
      currentQuestion,
      submitAllToBackend,
      attemptId,
      usedTopics,
      askedQuestions,
      speakText,
      startListening,
    ]
  );

  // After 6..1 count without voice -> speak notice & move to next question immediately
  useEffect(() => {
    autoAdvanceHandlerRef.current = async () => {
      await proceedQuestionOrSubmit({
        spokenAnswer: "",
        noAnswerNotice: "Moving to next question, not giving answer.",
      });
    };
  }, [proceedQuestionOrSubmit]);

  // Auto-submit when 5-minute viva timer reaches 00:00
  useEffect(() => {
    timeUpHandlerRef.current = async () => {
      if (!activeViva || sessionDone || submitSuccess || isSubmitting) return;
      stopListening();
      const draftAns = String(answerRef.current || "").trim();
      const finalList =
        draftAns && currentQuestion
          ? [
              ...qaPairs,
              {
                question_number: questionNumber,
                topic: currentTopic,
                question: currentQuestion,
                answer: draftAns,
              },
            ]
          : qaPairs;
      setQaPairs(finalList);
      setAnswerText("");
      await submitAllToBackend(activeViva, attemptId, finalList);
    };
  }, [
    activeViva,
    sessionDone,
    submitSuccess,
    isSubmitting,
    stopListening,
    currentQuestion,
    qaPairs,
    questionNumber,
    currentTopic,
    submitAllToBackend,
    attemptId,
  ]);

  // Submit current answers even when terminated by proctor
  useEffect(() => {
    terminateSubmitHandlerRef.current = async () => {
      const vivaObj = activeVivaRef.current;
      if (!vivaObj) return;
      const draftAns = String(answerRef.current || "").trim();
      const baseList = qaPairsRef.current || [];
      const finalList =
        draftAns && currentQuestionRef.current
          ? [
              ...baseList,
              {
                question_number: questionNumberRef.current,
                topic: currentTopicRef.current,
                question: currentQuestionRef.current,
                answer: draftAns,
              },
            ]
          : baseList;
      setQaPairs(finalList);
      setAnswerText("");
      await submitAllToBackend(vivaObj, attemptIdRef.current, finalList, {
        terminated: true,
        termination_reason: "Repeated tab switching",
      });
    };
  }, [submitAllToBackend]);

  // 5-minute countdown tick
  useEffect(() => {
    if (!activeViva || sessionDone || submitSuccess || terminatedByProctor || isSubmitting) {
      return;
    }

    const timerId = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerId);
          if (timeUpHandlerRef.current) {
            timeUpHandlerRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [activeViva, sessionDone, submitSuccess, terminatedByProctor, isSubmitting]);

  const handleStartViva = async (viva) => {
    const isDoneAlready =
      viva.alreadyAttempted || completedVivaIds.includes(String(viva.id));
    if (isDoneAlready) {
      setErrorMsg("This viva has already been attempted. Re-attempt is not allowed.");
      return;
    }

    stopListening();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    setRemainingSeconds(VIVA_DURATION_SECONDS);
    photosCapturedRef.current = 0;
    setCapturedPhotosCount(0);
    setFaceAlert("");
    switchCountRef.current = 0;
    setProctorWarning("");
    setTerminatedByProctor(false);

    const topic = pickRandomTopic(viva.topics, [], viva.subject);

    setActiveViva(viva);
    setAttemptId(viva.attempt_id ?? viva.id);
    setQuestionNumber(1);
    setCurrentTopic(topic);
    setUsedTopics([topic]);
    setCurrentQuestion("");
    setAskedQuestions([]);
    setQaPairs([]);
    setVivaError("");
    setAnswerText("");
    setSessionDone(false);
    setSubmitSuccess(false);
    setIsGenerating(true);

    try {
      const question = await generateQuestionFromModel({
        viva,
        topic,
        questionNumber: 1,
        askedQuestions: [],
      });

      setCurrentQuestion(question);
      setAskedQuestions([question]);
      setIsGenerating(false);
      speakText(question);
    } catch (err) {
      setVivaError(err?.message || "Failed to generate question from model.");
      setIsGenerating(false);
    }
  };

  const handleSubmitAnswer = async () => {
    const submitted = String(answerRef.current || "").trim();
    if (!activeViva || !submitted || isGenerating || isSubmitting) return;
    await proceedQuestionOrSubmit({
      spokenAnswer: submitted,
      noAnswerNotice: "",
    });
  };

  const handleExitViva = () => {
    stopListening();
    stopCameraAndPhotos();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setActiveViva(null);
    setAttemptId(null);
    setRemainingSeconds(VIVA_DURATION_SECONDS);
    setSessionDone(false);
    setSubmitSuccess(false);
    setTerminatedByProctor(false);
    setProctorWarning("");
    setFaceAlert("");
    setCurrentQuestion("");
    setQaPairs([]);
    setVivaError("");
    setAnswerText("");
  };

  // AI Proctoring on active viva: 1st tab switch warns, 2nd terminates & submits (no termination count/time shown)
  useEffect(() => {
    if (!activeViva || sessionDone || submitSuccess || terminatedByProctor) {
      return;
    }

    const onViolation = () => {
      const now = Date.now();
      if (now - lastSwitchTsRef.current < 1200) return;
      lastSwitchTsRef.current = now;

      switchCountRef.current += 1;

      if (switchCountRef.current === 1) {
        const msg =
          "AI Proctor Warning: Tab switching is not allowed during the viva. Please stay on this screen.";
        setProctorWarning(msg);
        speakText(msg);
      } else {
        stopListening();
        stopCameraAndPhotos();
        setTerminatedByProctor(true);
        const termMsg =
          "Viva session terminated due to repeated tab switching. Submitting your viva.";
        setProctorWarning(termMsg);
        speakText(termMsg, () => {
          if (terminateSubmitHandlerRef.current) {
            terminateSubmitHandlerRef.current();
          }
        });
      }
    };

    const onVisibility = () => {
      if (document.hidden) onViolation();
    };
    const onBlur = () => onViolation();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
    };
  }, [
    activeViva,
    sessionDone,
    submitSuccess,
    terminatedByProctor,
    speakText,
    stopListening,
    stopCameraAndPhotos,
  ]);

  if (activeViva) {
    return (
      <div style={vivaStyles.sessionPage}>
        <style>{`
          @keyframes viva3DFloat {
            0%, 100% { transform: translateY(0px) rotateY(-3deg); }
            50% { transform: translateY(-6px) rotateY(3deg); }
          }
          @keyframes viva3DOrbitA {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes viva3DOrbitB {
            0% { transform: rotate(360deg); }
            100% { transform: rotate(0deg); }
          }
          @keyframes viva3DTalk {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.06); }
          }
          @keyframes vivaEyeBlink {
            0%, 92%, 100% { transform: scaleY(1); }
            96% { transform: scaleY(0.08); }
          }
          @keyframes vivaWave {
            0%, 100% { transform: scaleY(0.45); }
            50% { transform: scaleY(1.38); }
          }
          .viva-3d-float { animation: viva3DFloat 3s ease-in-out infinite; }
          .viva-3d-orbit-a { animation: viva3DOrbitA 7s linear infinite; }
          .viva-3d-orbit-b { animation: viva3DOrbitB 4.5s linear infinite; }
          .viva-3d-talk { animation: viva3DTalk 0.45s ease-in-out infinite; }
          .viva-eye-blink { animation: vivaEyeBlink 4.2s infinite; }
          .viva-wave-anim { animation: vivaWave 0.72s ease-in-out infinite; }
        `}</style>

        <div style={vivaStyles.sessionCard}>
          {/* Top Header + 5-Min Timer + Snapshot Counter */}
          <div style={vivaStyles.topHeaderRow}>
            <div>
              <div style={vivaStyles.topSubMeta}>
                {activeViva.subject} • Q{questionNumber}/{activeViva.total_questions} • AI Proctored
              </div>
              <h2 style={vivaStyles.topTitle}>{activeViva.title}</h2>
            </div>

            <div style={vivaStyles.topRightGroup}>
              <div
                style={{
                  ...vivaStyles.timerBadge,
                  backgroundColor: remainingSeconds <= 30 ? "#fef2f2" : "#eff6ff",
                  color: remainingSeconds <= 30 ? "#b91c1c" : "#1d4ed8",
                  borderColor: remainingSeconds <= 30 ? "#fca5a5" : "#93c5fd",
                }}
              >
                ⏱ {formatClock(remainingSeconds)}
              </div>
              <div style={vivaStyles.photoBadge}>
                📸 {capturedPhotosCount}/{MAX_ADMIN_PHOTOS}
              </div>
              <button
                type="button"
                onClick={handleExitViva}
                style={vivaStyles.exitBtn}
              >
                Exit
              </button>
            </div>
          </div>

          {proctorWarning && (
            <div style={vivaStyles.proctorBanner}>{proctorWarning}</div>
          )}

          {faceAlert && (
            <div style={vivaStyles.faceAlertBanner}>⚠️ {faceAlert}</div>
          )}

          {terminatedByProctor ? (
            <div style={vivaStyles.terminatedBox}>
              <div style={{ fontWeight: 800, fontSize: "16px", marginBottom: "6px" }}>
                Viva Terminated by AI Proctor
              </div>
              <div style={{ fontSize: "13px", color: "#475569", marginBottom: "12px" }}>
                {isSubmitting
                  ? "Submitting recorded responses..."
                  : "Repeated tab switching was detected and your session has been submitted."}
              </div>
              <button
                type="button"
                onClick={handleExitViva}
                style={vivaStyles.primaryActionBtn}
              >
                Back to Available Vivas
              </button>
            </div>
          ) : (
            <>
              {/* 1st Part Split Screen: Left = Student Straight Camera + Photo Capture, Right = 3D Robot */}
              <div style={vivaStyles.splitGrid}>
                <div style={vivaStyles.studentPaneCard}>
                  <div style={vivaStyles.paneLabelRow}>
                    <span style={vivaStyles.studentPill}>● LIVE CAM</span>
                    <span style={vivaStyles.photoMiniPill}>
                      {lastPhotoFlash
                        ? "📸 Captured!"
                        : `Admin: ${capturedPhotosCount}/${MAX_ADMIN_PHOTOS}`}
                    </span>
                  </div>

                  <div style={vivaStyles.cameraFrameBox}>
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      style={{
                        ...vivaStyles.cameraVideo,
                        display: cameraReady ? "block" : "none",
                      }}
                    />
                    {!cameraReady && (
                      <div style={vivaStyles.cameraFallback}>
                        <div style={vivaStyles.studentAvatarCircle}>
                          {(studentName || "S").charAt(0).toUpperCase()}
                        </div>
                        <div style={{ fontSize: "12px", fontWeight: 700 }}>
                          {studentName || "Student"}
                        </div>
                      </div>
                    )}
                    <div style={vivaStyles.straightGuideOval} aria-hidden="true" />
                  </div>

                  <div style={vivaStyles.faceStatusFooter}>{faceStatusMsg}</div>
                </div>

                <VivaBot3DPanel
                  isSpeaking={isSpeaking}
                  isListening={isListening}
                  isGenerating={isGenerating}
                  isSubmitting={isSubmitting}
                  pupilOffset={pupilOffset}
                />
              </div>

              {vivaError && (
                <div style={vivaStyles.errorBox}>{vivaError}</div>
              )}

              {/* Question + Plain Silence Number (no popup box) */}
              <div style={vivaStyles.questionCard}>
                {isSubmitting ? (
                  <div style={{ fontWeight: 700, color: "#0284c7", fontSize: "14px" }}>
                    Submitting all questions and answers for evaluation...
                  </div>
                ) : sessionDone || submitSuccess ? (
                  <div style={{ fontWeight: 800, color: "#059669", fontSize: "15px" }}>
                    Viva submitted successfully! Evaluation will be processed.
                  </div>
                ) : (
                  <div style={vivaStyles.questionRow}>
                    <p style={vivaStyles.questionText}>
                      {currentQuestion || "Generating question from model..."}
                    </p>
                    {silenceNumber !== null && !userCurrentlySpeaking && !isSpeaking && (
                      <span style={vivaStyles.plainCountNumber} aria-live="polite">
                        {silenceNumber}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {!sessionDone && !submitSuccess && (
                <div style={vivaStyles.inputArea}>
                  <textarea
                    rows={2}
                    value={answerText}
                    onChange={(e) => {
                      handleStudentSpeakingStart();
                      setAnswerText(e.target.value);
                      handleStudentSpeakingStop();
                    }}
                    placeholder={
                      isListening
                        ? "Bolte rahiye, SmartBot sun raha hai..."
                        : "Yahan answer bolein ya type karein..."
                    }
                    style={vivaStyles.textarea}
                  />

                  <div style={vivaStyles.actionRow}>
                    <button
                      type="button"
                      onClick={isListening ? stopListening : startListening}
                      style={vivaStyles.micBtn}
                    >
                      {isListening ? "Stop Mic" : "Start Mic"}
                    </button>

                    <button
                      type="button"
                      onClick={handleSubmitAnswer}
                      disabled={!answerText.trim() || isGenerating || isSubmitting}
                      style={{
                        ...vivaStyles.primaryActionBtn,
                        opacity:
                          !answerText.trim() || isGenerating || isSubmitting
                            ? 0.6
                            : 1,
                        cursor:
                          !answerText.trim() || isGenerating || isSubmitting
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      {isSubmitting
                        ? "Submitting..."
                        : isGenerating
                        ? "Sending..."
                        : questionNumber >= activeViva.total_questions
                        ? "Finish & Submit"
                        : "Submit Answer"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={vivaStyles.listPage}>
      <div style={{ maxWidth: "980px", margin: "0 auto" }}>
        <div style={vivaStyles.listHeader}>
          <div>
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800 }}>
              Available Vivas
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#475569" }}>
              5-minute proctored viva with live camera &amp; 3D SmartBot
            </p>
          </div>

          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            style={vivaStyles.subjectSelect}
          >
            {subjects.map((subj) => (
              <option key={subj} value={subj}>
                {subj === "ALL" ? "All Subjects" : subj}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div style={vivaStyles.infoBox}>Loading vivas...</div>
        ) : errorMsg ? (
          <div style={vivaStyles.errorBox}>{errorMsg}</div>
        ) : filteredVivas.length === 0 ? (
          <div style={vivaStyles.infoBox}>No available vivas found.</div>
        ) : (
          <div style={vivaStyles.vivaGrid}>
            {filteredVivas.map((viva) => {
              const isAttempted =
                viva.alreadyAttempted || completedVivaIds.includes(String(viva.id));

              return (
                <div
                  key={viva.id}
                  style={{
                    ...vivaStyles.vivaCard,
                    borderColor: isAttempted ? "#cbd5e1" : "#86efac",
                    background: isAttempted
                      ? "#f8fafc"
                      : "linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)",
                  }}
                >
                  <div>
                    <div style={vivaStyles.vivaCardTop}>
                      <span style={vivaStyles.subjectBadge}>{viva.subject}</span>
                      {isAttempted && (
                        <span style={vivaStyles.attemptedBadge}>
                          ✓ Attempted
                        </span>
                      )}
                    </div>
                    <h3 style={vivaStyles.vivaCardTitle}>{viva.title}</h3>
                    {viva.description && (
                      <p style={vivaStyles.vivaCardDesc}>{viva.description}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isAttempted}
                    onClick={() => handleStartViva(viva)}
                    style={{
                      ...vivaStyles.startVivaBtn,
                      backgroundColor: isAttempted ? "#94a3b8" : "#059669",
                      cursor: isAttempted ? "not-allowed" : "pointer",
                    }}
                  >
                    {isAttempted ? "Already Attempted" : "Start Viva"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const vivaStyles = {
  listPage: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #ecfdf5 0%, #eff6ff 55%, #f5f3ff 100%)",
    padding: "20px 16px",
    color: "#0f172a",
  },
  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: "18px",
  },
  subjectSelect: {
    padding: "8px 14px",
    borderRadius: "10px",
    borderWidth: "1.5px",
    borderStyle: "solid",
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    fontWeight: 700,
  },
  infoBox: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    padding: "24px",
    textAlign: "center",
    fontWeight: 700,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#e2e8f0",
  },
  vivaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "16px",
  },
  vivaCard: {
    borderRadius: "16px",
    padding: "18px",
    borderWidth: "1.5px",
    borderStyle: "solid",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "14px",
    boxShadow: "0 10px 24px -10px rgba(15, 23, 42, 0.12)",
  },
  vivaCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
  },
  subjectBadge: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#0284c7",
    backgroundColor: "#e0f2fe",
    padding: "3px 10px",
    borderRadius: "999px",
  },
  attemptedBadge: {
    fontSize: "11px",
    fontWeight: 800,
    color: "#475569",
    backgroundColor: "#e2e8f0",
    padding: "3px 9px",
    borderRadius: "999px",
  },
  vivaCardTitle: {
    margin: "10px 0 6px",
    fontSize: "17px",
    fontWeight: 800,
  },
  vivaCardDesc: {
    margin: 0,
    fontSize: "13px",
    color: "#475569",
  },
  startVivaBtn: {
    width: "100%",
    padding: "10px",
    borderRadius: "10px",
    borderWidth: "0px",
    borderStyle: "none",
    color: "#ffffff",
    fontWeight: 700,
  },
  sessionPage: {
    position: "relative",
    minHeight: "100dvh",
    maxHeight: "100dvh",
    overflow: "hidden",
    background: "linear-gradient(135deg, #090d16 0%, #172554 55%, #064e3b 100%)",
    padding: "10px 12px",
    color: "#0f172a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
  },
  sessionCard: {
    width: "100%",
    maxWidth: "760px",
    maxHeight: "97dvh",
    overflowY: "auto",
    backgroundColor: "#ffffff",
    borderRadius: "18px",
    padding: "14px",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "#a7f3d0",
    boxShadow: "0 20px 45px -12px rgba(0, 0, 0, 0.35)",
    display: "flex",
    flexDirection: "column",
    gap: "9px",
    boxSizing: "border-box",
  },
  topHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
  },
  topSubMeta: {
    fontSize: "11px",
    fontWeight: 800,
    color: "#0284c7",
  },
  topTitle: {
    margin: "1px 0 0",
    fontSize: "15px",
    fontWeight: 800,
  },
  topRightGroup: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  timerBadge: {
    fontSize: "11px",
    fontWeight: 900,
    padding: "4px 9px",
    borderRadius: "999px",
    borderWidth: "1px",
    borderStyle: "solid",
    whiteSpace: "nowrap",
  },
  photoBadge: {
    fontSize: "11px",
    fontWeight: 800,
    padding: "4px 9px",
    borderRadius: "999px",
    backgroundColor: "#eef2ff",
    color: "#3730a3",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#c7d2fe",
    whiteSpace: "nowrap",
  },
  exitBtn: {
    padding: "5px 10px",
    borderRadius: "8px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#fca5a5",
    backgroundColor: "#fef2f2",
    color: "#b91c1c",
    fontWeight: 700,
    fontSize: "12px",
    cursor: "pointer",
  },
  proctorBanner: {
    padding: "7px 12px",
    borderRadius: "10px",
    backgroundColor: "#fffbeb",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#f59e0b",
    color: "#92400e",
    fontWeight: 700,
    fontSize: "12px",
  },
  faceAlertBanner: {
    padding: "6px 12px",
    borderRadius: "10px",
    backgroundColor: "#fef2f2",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#fca5a5",
    color: "#991b1b",
    fontWeight: 800,
    fontSize: "12px",
  },
  terminatedBox: {
    padding: "20px 14px",
    borderRadius: "12px",
    backgroundColor: "#fef2f2",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#fecaca",
    textAlign: "center",
    color: "#991b1b",
  },
  splitGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  studentPaneCard: {
    padding: "10px",
    borderRadius: "14px",
    background: "linear-gradient(180deg, #f8fafc 0%, #eff6ff 100%)",
    borderWidth: "1.5px",
    borderStyle: "solid",
    borderColor: "#93c5fd",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "6px",
  },
  paneLabelRow: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "4px",
  },
  studentPill: {
    fontSize: "10px",
    fontWeight: 800,
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
    padding: "2px 7px",
    borderRadius: "999px",
  },
  photoMiniPill: {
    fontSize: "10px",
    fontWeight: 800,
    color: "#4338ca",
  },
  cameraFrameBox: {
    position: "relative",
    width: "100%",
    height: "116px",
    borderRadius: "11px",
    overflow: "hidden",
    backgroundColor: "#0f172a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraVideo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: "scaleX(-1)",
  },
  straightGuideOval: {
    position: "absolute",
    width: "68px",
    height: "88px",
    borderRadius: "50%",
    border: "1.5px dashed rgba(52, 211, 153, 0.85)",
    pointerEvents: "none",
  },
  cameraFallback: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    color: "#ffffff",
  },
  studentAvatarCircle: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  faceStatusFooter: {
    fontSize: "10.5px",
    fontWeight: 700,
    color: "#1e3a8a",
    textAlign: "center",
  },
  bot3DCard: {
    padding: "10px",
    borderRadius: "14px",
    background: "linear-gradient(160deg, #090d16 0%, #172554 55%, #064e3b 100%)",
    borderWidth: "1.5px",
    borderStyle: "solid",
    borderColor: "#38bdf8",
    boxShadow: "0 14px 28px -10px rgba(14, 165, 233, 0.5)",
    color: "#ffffff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "6px",
  },
  botTopRow: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "4px",
  },
  bot3DTitle: {
    fontWeight: 800,
    fontSize: "12px",
    color: "#7dd3fc",
  },
  bot3DBadge: {
    fontSize: "10px",
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: "999px",
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    color: "#a7f3d0",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#34d399",
  },
  bot3DStage: {
    position: "relative",
    width: "100px",
    height: "68px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  bot3DOrbitA: {
    position: "absolute",
    width: "66px",
    height: "66px",
    borderRadius: "50%",
    border: "1.5px dashed rgba(56, 189, 248, 0.65)",
  },
  bot3DOrbitB: {
    position: "absolute",
    width: "52px",
    height: "52px",
    borderRadius: "50%",
    border: "1.5px dotted rgba(52, 211, 153, 0.75)",
  },
  bot3DHead: {
    position: "relative",
    zIndex: 2,
    width: "86px",
    height: "42px",
    borderRadius: "16px",
    background: "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "#38bdf8",
    boxShadow: "0 0 18px rgba(56, 189, 248, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-evenly",
    padding: "0 6px",
  },
  botAntenna: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#38bdf8",
    position: "absolute",
    top: "-8px",
    boxShadow: "0 0 8px #38bdf8",
  },
  botEyeSocket: {
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    backgroundColor: "#e0f2fe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  botEyeBall: {
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    backgroundColor: "#0284c7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 0.08s linear",
  },
  botPupil: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    backgroundColor: "#090d16",
    position: "relative",
  },
  botGlint: {
    width: "2.5px",
    height: "2.5px",
    borderRadius: "50%",
    backgroundColor: "#ffffff",
    position: "absolute",
    top: "1px",
    right: "1px",
  },
  waveStrip: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    height: "20px",
  },
  waveBar: {
    width: "4px",
    borderRadius: "999px",
    transition: "height 0.15s ease",
  },
  bot3DFooter: {
    fontSize: "10px",
    fontWeight: 700,
    color: "#bae6fd",
  },
  errorBox: {
    padding: "8px 12px",
    borderRadius: "10px",
    backgroundColor: "#fef2f2",
    color: "#b91c1c",
    fontWeight: 700,
    fontSize: "12px",
  },
  questionCard: {
    padding: "11px 13px",
    borderRadius: "12px",
    backgroundColor: "#f8fafc",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#cbd5e1",
    minHeight: "44px",
    display: "flex",
    alignItems: "center",
  },
  questionRow: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },
  questionText: {
    margin: 0,
    fontSize: "13.5px",
    fontWeight: 700,
    lineHeight: 1.4,
    flex: 1,
  },
  plainCountNumber: {
    fontSize: "24px",
    fontWeight: 900,
    color: "#dc2626",
    lineHeight: 1,
    flexShrink: 0,
  },
  inputArea: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },
  textarea: {
    width: "100%",
    padding: "9px 11px",
    borderRadius: "10px",
    borderWidth: "1.5px",
    borderStyle: "solid",
    borderColor: "#cbd5e1",
    fontSize: "13px",
    boxSizing: "border-box",
    resize: "none",
  },
  actionRow: {
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
  },
  micBtn: {
    padding: "7px 12px",
    borderRadius: "9px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#cbd5e1",
    backgroundColor: "#f1f5f9",
    color: "#0f172a",
    fontWeight: 700,
    fontSize: "12px",
    cursor: "pointer",
  },
  primaryActionBtn: {
    padding: "7px 16px",
    borderRadius: "9px",
    borderWidth: "0px",
    borderStyle: "none",
    background: "linear-gradient(90deg, #059669 0%, #0284c7 100%)",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: "12px",
    cursor: "pointer",
  },
};

export default StudentViva;