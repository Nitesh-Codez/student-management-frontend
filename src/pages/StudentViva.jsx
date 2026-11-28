import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";

const GROQ_API_KEY = (process.env.REACT_APP_GROQ_API_KEY || "").trim();
const GROQ_MODEL = (
  process.env.REACT_APP_GROQ_MODEL || "openai/gpt-oss-20b"
).trim();

const VIVA_DURATION_SECONDS = 5 * 60;
const SILENCE_COUNTDOWN_START = 6;
const SILENCE_COUNTDOWN_END = 0;
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
// GROQ MODEL CALLER (STRICT SINGLE QUESTION)
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

function sanitizeSingleQuestion(rawText) {
  const cleaned = String(rawText || "")
    .replace(/^(question\s*\d*\s*[:.-]\s*)/i, "")
    .replace(/\s+/g, " ")
    .trim();

  // Keep strictly one question sentence if model emits multiple questions
  const firstQuestionMatch = cleaned.match(/[^?]+\?/);
  if (firstQuestionMatch) {
    return firstQuestionMatch[0].trim();
  }

  const firstSentence = cleaned.split(/(?<=[.!?])\s+/)[0] || cleaned;
  return firstSentence.trim();
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
          temperature: 0.5,
          max_tokens: 220,
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
        "You are a viva examiner. Ask ONLY ONE single short question at a time. Never combine two questions or ask follow-up parts in the same question. No intro, no numbering, no extra text.",
    },
    {
      role: "user",
      content: `Class: ${viva.class_name || "10th"}, Subject: ${viva.subject}, Difficulty: ${viva.difficulty || "Medium"}.
Topic guide: "${topic}".
Question ${questionNumber} of ${viva.total_questions}.
Already asked questions: ${JSON.stringify(askedQuestions)}.
Output ONLY one single question.`,
    },
  ];

  const raw = await callGroqChat(messages);
  return sanitizeSingleQuestion(raw);
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
// 3D SMARTBOT PANEL (3D BODY + BLINKING/TRACKING EYES)
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
    ? "Thinking..."
    : isSpeaking
    ? "Speaking..."
    : isListening
    ? "Listening..."
    : "Monitoring";

  const waveBars = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div style={vivaStyles.boxCard} className="viva-3d-float">
      <div style={vivaStyles.boxHeaderRow}>
        <span style={vivaStyles.botTitle}>◆ SmartBot 3D</span>
        <span style={vivaStyles.botBadge}>{statusLabel}</span>
      </div>

      <div style={vivaStyles.bot3DStage}>
        <div className="viva-3d-orbit-a" style={vivaStyles.bot3DOrbitA} />
        <div className="viva-3d-orbit-b" style={vivaStyles.bot3DOrbitB} />

        {/* 3D Head + 3D Torso/Shoulders Body */}
        <div
          className={isSpeaking ? "viva-3d-talk" : ""}
          style={vivaStyles.bot3DCharacter}
        >
          <div style={vivaStyles.bot3DHead}>
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

          <div style={vivaStyles.bot3DBody}>
            <div style={vivaStyles.botCoreLight} />
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

  // Selected viva before clicking "Start Viva" once
  const [stagedViva, setStagedViva] = useState(null);
  const [hasClickedStartOnce, setHasClickedStartOnce] = useState(false);

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

  // Timer + center 6 -> 0 silence counter
  const [remainingSeconds, setRemainingSeconds] = useState(VIVA_DURATION_SECONDS);
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

  // AI Proctoring (warning on 1st switch, terminate on 2nd switch)
  const [proctorWarning, setProctorWarning] = useState("");
  const [terminatedByProctor, setTerminatedByProctor] = useState(false);
  const switchCountRef = useRef(0);
  const lastSwitchTsRef = useRef(0);

  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const answerRef = useRef("");
  const silenceIntervalRef = useRef(null);
  const silenceTimeoutRef = useRef(null);
  const speechResumeTimerRef = useRef(null);
  const autoAdvanceHandlerRef = useRef(null);
  const timeUpHandlerRef = useRef(null);
  const photosCapturedRef = useRef(0);

  const isFullscreenSessionActive = Boolean(
    activeViva && !sessionDone && !submitSuccess && !terminatedByProctor
  );

  useEffect(() => {
    answerRef.current = answerText;
  }, [answerText]);

  const requestAutoFullScreen = useCallback(async () => {
    if (typeof document === "undefined") return;
    if (document.fullscreenElement) return;
    const el = document.documentElement;
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      }
    } catch {
      // Ignore if browser blocks fullscreen
    }
  }, []);

  const exitFullScreenSafe = useCallback(async () => {
    if (typeof document === "undefined") return;
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore
    }
  }, []);

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

  const clearSilenceCounter = useCallback(() => {
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

  // Start 6 -> 0 center number counter when nobody is speaking
  const startSixToZeroSilenceCounter = useCallback(() => {
    clearSilenceCounter();
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

    let current = SILENCE_COUNTDOWN_START;
    setSilenceNumber(current);

    const stepMs = 1000;
    const totalSteps = SILENCE_COUNTDOWN_START - SILENCE_COUNTDOWN_END;

    silenceIntervalRef.current = setInterval(() => {
      if (userCurrentlySpeaking) {
        clearSilenceCounter();
        return;
      }
      current -= 1;
      if (current >= SILENCE_COUNTDOWN_END) {
        setSilenceNumber(current);
      } else if (silenceIntervalRef.current) {
        clearInterval(silenceIntervalRef.current);
        silenceIntervalRef.current = null;
      }
    }, stepMs);

    silenceTimeoutRef.current = setTimeout(() => {
      clearSilenceCounter();
      if (userCurrentlySpeaking) return;
      if (autoAdvanceHandlerRef.current) {
        autoAdvanceHandlerRef.current();
      }
    }, totalSteps * stepMs);
  }, [
    clearSilenceCounter,
    activeViva,
    sessionDone,
    submitSuccess,
    terminatedByProctor,
    isGenerating,
    isSubmitting,
    isSpeaking,
    userCurrentlySpeaking,
  ]);

  // If interrupted / student speaks, reset 6 -> 0 counter and restart from 6 once silence returns
  const handleStudentInterruptOrSpeak = useCallback(() => {
    setUserCurrentlySpeaking(true);
    clearSilenceCounter();
    if (speechResumeTimerRef.current) {
      clearTimeout(speechResumeTimerRef.current);
      speechResumeTimerRef.current = null;
    }
  }, [clearSilenceCounter]);

  const handleStudentSilenceResume = useCallback(() => {
    setUserCurrentlySpeaking(false);
    if (speechResumeTimerRef.current) {
      clearTimeout(speechResumeTimerRef.current);
    }
    speechResumeTimerRef.current = setTimeout(() => {
      startSixToZeroSilenceCounter();
    }, 500);
  }, [startSixToZeroSilenceCounter]);

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
    clearSilenceCounter();
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
  }, [clearSilenceCounter]);

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
      startSixToZeroSilenceCounter();
    };

    rec.onresult = (event) => {
      handleStudentInterruptOrSpeak();
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += `${event.results[i][0].transcript} `;
      }
      setAnswerText(transcript.trim());
      handleStudentSilenceResume();
    };

    rec.onspeechstart = () => {
      handleStudentInterruptOrSpeak();
    };

    rec.onspeechend = () => {
      handleStudentSilenceResume();
    };

    rec.onerror = () => {
      setIsListening(false);
      startSixToZeroSilenceCounter();
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
          startSixToZeroSilenceCounter();
        }
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      setIsListening(false);
      startSixToZeroSilenceCounter();
    }
  }, [
    activeViva,
    sessionDone,
    submitSuccess,
    terminatedByProctor,
    isGenerating,
    isSubmitting,
    startSixToZeroSilenceCounter,
    handleStudentInterruptOrSpeak,
    handleStudentSilenceResume,
  ]);

  const speakText = useCallback(
    (text) => {
      stopListening();
      if (!text || typeof window === "undefined" || !("speechSynthesis" in window)) {
        startListening();
        return;
      }

      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1;
        utter.pitch = 1.05;

        utter.onstart = () => {
          setIsSpeaking(true);
          clearSilenceCounter();
        };
        utter.onend = () => {
          setIsSpeaking(false);
          if (!sessionDone && !submitSuccess && !terminatedByProctor && !isSubmitting) {
            startListening();
          }
        };
        utter.onerror = () => {
          setIsSpeaking(false);
          if (!sessionDone && !submitSuccess && !terminatedByProctor && !isSubmitting) {
            startListening();
          }
        };

        window.speechSynthesis.speak(utter);
      } catch {
        setIsSpeaking(false);
        startListening();
      }
    },
    [
      stopListening,
      startListening,
      sessionDone,
      submitSuccess,
      terminatedByProctor,
      isSubmitting,
      clearSilenceCounter,
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
    async (vivaObj, currentAttemptId, finalQaList) => {
      setIsSubmitting(true);
      setVivaError("");
      clearSilenceCounter();
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
        await exitFullScreenSafe();
      } catch (err) {
        setVivaError(extractApiError(err, "Failed to submit viva answers."));
      } finally {
        setIsSubmitting(false);
      }
    },
    [userId, clearSilenceCounter, exitFullScreenSafe]
  );

  const proceedQuestionOrSubmit = useCallback(
    async ({ spokenAnswer }) => {
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
          if (reply) {
            speakText(reply);
          }
          await submitAllToBackend(activeViva, attemptId, updatedQa);
          return;
        }

        const nextQNum = questionNumber + 1;
        const nextTopic = pickRandomTopic(
          activeViva.topics,
          usedTopics,
          activeViva.subject
        );
        const nextUsedTopics = [...usedTopics, nextTopic];

        const nextQuestionText = await generateQuestionFromModel({
          viva: activeViva,
          topic: nextTopic,
          questionNumber: nextQNum,
          askedQuestions,
        });

        setQuestionNumber(nextQNum);
        setCurrentTopic(nextTopic);
        setUsedTopics(nextUsedTopics);
        setCurrentQuestion(nextQuestionText);
        setAskedQuestions((prev) => [...prev, nextQuestionText]);
        setIsGenerating(false);

        const spokenPayload = reply ? `${reply} ${nextQuestionText}` : nextQuestionText;
        speakText(spokenPayload);
      } catch (err) {
        setIsGenerating(false);
        setVivaError(extractApiError(err, "Unable to generate next question."));
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
      usedTopics,
      askedQuestions,
      submitAllToBackend,
      attemptId,
      speakText,
      startListening,
    ]
  );

  // "Done Answer" button handler: finishes current answer & moves to next question or submits
  const handleDoneAnswer = useCallback(() => {
    if (
      !activeViva ||
      isGenerating ||
      isSubmitting ||
      sessionDone ||
      terminatedByProctor
    ) {
      return;
    }
    proceedQuestionOrSubmit({ spokenAnswer: answerRef.current });
  }, [
    activeViva,
    isGenerating,
    isSubmitting,
    sessionDone,
    terminatedByProctor,
    proceedQuestionOrSubmit,
  ]);

  // "Submit Viva" button handler: submits answers collected so far
  const handleSubmitVivaNow = useCallback(async () => {
    if (!activeViva || isSubmitting || submitSuccess) return;
    stopListening();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    const trimmedCurrentAns = String(answerRef.current || "").trim();
    const finalQa =
      currentQuestion && trimmedCurrentAns && !sessionDone
        ? [
            ...qaPairs,
            {
              question_number: questionNumber,
              topic: currentTopic,
              question: currentQuestion,
              answer: trimmedCurrentAns,
            },
          ]
        : qaPairs;

    setAnswerText("");
    await submitAllToBackend(activeViva, attemptId, finalQa);
  }, [
    activeViva,
    isSubmitting,
    submitSuccess,
    stopListening,
    currentQuestion,
    sessionDone,
    qaPairs,
    questionNumber,
    currentTopic,
    attemptId,
    submitAllToBackend,
  ]);

  useEffect(() => {
    autoAdvanceHandlerRef.current = () => {
      proceedQuestionOrSubmit({ spokenAnswer: answerRef.current });
    };
  }, [proceedQuestionOrSubmit]);

  useEffect(() => {
    timeUpHandlerRef.current = async () => {
      if (!activeViva || sessionDone || submitSuccess || isSubmitting) return;
      stopListening();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

      const finalQa =
        currentQuestion && answerRef.current.trim()
          ? [
              ...qaPairs,
              {
                question_number: questionNumber,
                topic: currentTopic,
                question: currentQuestion,
                answer: answerRef.current.trim(),
              },
            ]
          : qaPairs;

      setAnswerText("");
      await submitAllToBackend(activeViva, attemptId, finalQa);
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
    attemptId,
    submitAllToBackend,
  ]);

  // 5-minute countdown timer
  useEffect(() => {
    if (!activeViva || sessionDone || submitSuccess || terminatedByProctor) {
      return;
    }

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (timeUpHandlerRef.current) {
            timeUpHandlerRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeViva, sessionDone, submitSuccess, terminatedByProctor]);

  // AI Proctoring: warn on 1st tab/window switch, terminate on 2nd switch
  useEffect(() => {
    if (!activeViva || sessionDone || submitSuccess || terminatedByProctor) {
      return;
    }

    const handleViolation = () => {
      const now = Date.now();
      if (now - lastSwitchTsRef.current < 800) return;
      lastSwitchTsRef.current = now;

      switchCountRef.current += 1;
      if (switchCountRef.current === 1) {
        setProctorWarning(
          "Warning: Tab or screen switch detected. Switching again will terminate the viva."
        );
      } else {
        stopListening();
        clearSilenceCounter();
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
        }
        setTerminatedByProctor(true);
        setSessionDone(true);
        setCurrentQuestion("");
        exitFullScreenSafe();
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        handleViolation();
      }
    };

    const onWindowBlur = () => {
      handleViolation();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, [
    activeViva,
    sessionDone,
    submitSuccess,
    terminatedByProctor,
    stopListening,
    clearSilenceCounter,
    exitFullScreenSafe,
  ]);

  // Stage a viva so the user sees the single "Start Viva" button once
  const handleSelectVivaForStart = (viva) => {
    if (viva?.alreadyAttempted || completedVivaIds.includes(String(viva?.id))) {
      setErrorMsg("You have already attempted this viva.");
      return;
    }
    setErrorMsg("");
    setHasClickedStartOnce(false);
    setStagedViva(viva);
  };

  // Launches the viva and triggers automatic full screen on click
  const startVivaSession = async (viva) => {
    if (!viva) return;
    if (viva.alreadyAttempted || completedVivaIds.includes(String(viva.id))) {
      setErrorMsg("You have already attempted this viva.");
      return;
    }

    setHasClickedStartOnce(true);
    await requestAutoFullScreen();

    stopListening();
    clearSilenceCounter();
    setErrorMsg("");
    setVivaError("");
    setProctorWarning("");
    setTerminatedByProctor(false);
    setFaceAlert("");
    setCapturedPhotosCount(0);
    photosCapturedRef.current = 0;
    switchCountRef.current = 0;
    lastSwitchTsRef.current = 0;

    setActiveViva(viva);
    setAttemptId(viva.attempt_id || viva.id);
    setQuestionNumber(1);
    setQaPairs([]);
    setAskedQuestions([]);
    setAnswerText("");
    setSessionDone(false);
    setSubmitSuccess(false);
    setRemainingSeconds(VIVA_DURATION_SECONDS);
    setIsGenerating(true);

    try {
      const studentId = userId || getLoggedInStudentId();
      let resolvedAttemptId = viva.attempt_id || viva.id;

      try {
        const startRes = await api.post(`/api/student/viva/${viva.id}/start`, {
          student_id: studentId,
        });
        resolvedAttemptId =
          startRes.data?.attempt_id ??
          startRes.data?.attemptId ??
          startRes.data?.data?.attempt_id ??
          resolvedAttemptId;
      } catch {
        // fallback to viva.attempt_id or viva.id
      }

      setAttemptId(resolvedAttemptId);

      const firstTopic = pickRandomTopic(viva.topics, [], viva.subject);
      setCurrentTopic(firstTopic);
      setUsedTopics([firstTopic]);

      const firstQuestion = await generateQuestionFromModel({
        viva,
        topic: firstTopic,
        questionNumber: 1,
        askedQuestions: [],
      });

      setCurrentQuestion(firstQuestion);
      setAskedQuestions([firstQuestion]);
      setIsGenerating(false);
      speakText(firstQuestion);
    } catch (err) {
      setIsGenerating(false);
      setVivaError(extractApiError(err, "Failed to start viva session."));
    }
  };

  const handleExitToLobby = async () => {
    stopListening();
    stopCameraAndPhotos();
    clearSilenceCounter();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    await exitFullScreenSafe();
    setActiveViva(null);
    setStagedViva(null);
    setHasClickedStartOnce(false);
    setAttemptId(null);
    setCurrentQuestion("");
    setAnswerText("");
    setQaPairs([]);
    setSessionDone(false);
    setSubmitSuccess(false);
    setTerminatedByProctor(false);
    setProctorWarning("");
    setRemainingSeconds(VIVA_DURATION_SECONDS);
    fetchVivas();
  };

  // --------------------------------------------------
  // FULL-SCREEN ACTIVE VIVA VIEW (ONLY 2 BOXES + CENTER 6->0)
  // --------------------------------------------------
  if (isFullscreenSessionActive) {
    return (
      <div style={vivaStyles.fullscreenShell}>
        <style>{vivaKeyframesCss}</style>

        {/* Top compact bar inside full screen */}
        <div style={vivaStyles.fullscreenTopBar}>
          <span style={vivaStyles.fullscreenMeta}>
            {activeViva.subject} • Q{questionNumber}/{activeViva.total_questions} •{" "}
            {formatClock(remainingSeconds)}
          </span>

          <div style={vivaStyles.fullscreenActions}>
            <button
              type="button"
              onClick={handleDoneAnswer}
              disabled={isGenerating || isSubmitting}
              style={vivaStyles.doneAnswerBtn}
            >
              Done Answer
            </button>
            <button
              type="button"
              onClick={handleSubmitVivaNow}
              disabled={isSubmitting}
              style={vivaStyles.submitVivaBtn}
            >
              {isSubmitting ? "Submitting..." : "Submit Viva"}
            </button>
          </div>
        </div>

        {proctorWarning && (
          <div style={vivaStyles.warningBanner}>{proctorWarning}</div>
        )}
        {vivaError && <div style={vivaStyles.errorBanner}>{vivaError}</div>}

        {/* Single current question */}
        <div style={vivaStyles.singleQuestionStrip}>
          {isGenerating ? (
            <span style={vivaStyles.questionText}>Preparing question...</span>
          ) : (
            <span style={vivaStyles.questionText}>{currentQuestion}</span>
          )}
        </div>

        {/* Center bare number countdown 6 -> 0 when nobody is speaking */}
        {silenceNumber !== null && (
          <div style={vivaStyles.centerSilenceNumber} aria-live="polite">
            {silenceNumber}
          </div>
        )}

        {/* Strictly 2 Boxes: 1) SmartBot 3D, 2) Student Monitoring Camera */}
        <div style={vivaStyles.twoBoxesGrid}>
          <VivaBot3DPanel
            isSpeaking={isSpeaking}
            isListening={isListening}
            isGenerating={isGenerating}
            isSubmitting={isSubmitting}
            pupilOffset={pupilOffset}
          />

          <div
            style={{
              ...vivaStyles.boxCard,
              ...(lastPhotoFlash ? vivaStyles.photoFlashRing : {}),
            }}
          >
            <div style={vivaStyles.boxHeaderRow}>
              <span style={vivaStyles.camBadge}>● LIVE CAM</span>
              <span style={vivaStyles.photoCountText}>
                📸 {capturedPhotosCount}/{MAX_ADMIN_PHOTOS}
              </span>
            </div>

            <div style={vivaStyles.videoBox}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={vivaStyles.videoElement}
              />
              {!cameraReady && (
                <div style={vivaStyles.videoPlaceholder}>{faceStatusMsg}</div>
              )}
            </div>

            <div style={vivaStyles.camFooterText}>
              {faceAlert || faceStatusMsg}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // COMPLETED / TERMINATED SUMMARY VIEW
  // --------------------------------------------------
  if (activeViva && (sessionDone || submitSuccess || terminatedByProctor)) {
    return (
      <div style={vivaStyles.lobbyContainer}>
        <style>{vivaKeyframesCss}</style>
        <div style={vivaStyles.summaryCard}>
          <h2>
            {terminatedByProctor
              ? "Viva Terminated by AI Proctoring"
              : "Viva Completed"}
          </h2>
          <p style={vivaStyles.mutedText}>
            {terminatedByProctor
              ? "Multiple tab or window switches were detected."
              : submitSuccess
              ? "Your viva responses have been submitted."
              : "Session ended."}
          </p>
          <button
            type="button"
            onClick={handleExitToLobby}
            style={vivaStyles.primaryBtn}
          >
            Back to Viva List
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // LOBBY + SINGLE "START VIVA" BUTTON BEFORE FULL SCREEN
  // --------------------------------------------------
  return (
    <div style={vivaStyles.lobbyContainer}>
      <style>{vivaKeyframesCss}</style>

      <div style={vivaStyles.lobbyHeader}>
        <div>
          <h2 style={vivaStyles.lobbyTitle}>Student Viva</h2>
          <p style={vivaStyles.mutedText}>
            {studentName ? `${studentName}` : "Candidate"}
            {studentClass ? ` (${studentClass})` : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={fetchVivas}
          style={vivaStyles.secondaryBtn}
        >
          ↻ Refresh
        </button>
      </div>

      {errorMsg && <div style={vivaStyles.errorBanner}>{errorMsg}</div>}

      {/* One-time Start Viva trigger once a viva is chosen */}
      {stagedViva && !hasClickedStartOnce && (
        <div style={vivaStyles.startGateCard}>
          <div>
            <div style={vivaStyles.stagedTitle}>
              {stagedViva.title} ({stagedViva.subject})
            </div>
            <div style={vivaStyles.mutedText}>
              Clicking Start Viva enters full screen automatically.
            </div>
          </div>
          <button
            type="button"
            onClick={() => startVivaSession(stagedViva)}
            style={vivaStyles.startVivaBtn}
          >
            Start Viva
          </button>
        </div>
      )}

      {/* Subject filter */}
      <div style={vivaStyles.filterRow}>
        {subjects.map((subj) => (
          <button
            key={subj}
            type="button"
            onClick={() => setSelectedSubject(subj)}
            style={{
              ...vivaStyles.filterChip,
              ...(selectedSubject === subj ? vivaStyles.filterChipActive : {}),
            }}
          >
            {subj}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={vivaStyles.mutedText}>Loading vivas...</p>
      ) : filteredVivas.length === 0 ? (
        <p style={vivaStyles.mutedText}>No vivas available right now.</p>
      ) : (
        <div style={vivaStyles.vivaGrid}>
          {filteredVivas.map((viva) => {
            const isDone =
              viva.alreadyAttempted || completedVivaIds.includes(String(viva.id));
            return (
              <div key={viva.id} style={vivaStyles.vivaCard}>
                <div style={vivaStyles.cardTop}>
                  <span style={vivaStyles.subjectTag}>{viva.subject}</span>
                  <span style={vivaStyles.qCountTag}>
                    {viva.total_questions} Questions
                  </span>
                </div>
                <h3 style={vivaStyles.cardTitle}>{viva.title}</h3>
                {viva.description && (
                  <p style={vivaStyles.cardDesc}>{viva.description}</p>
                )}
                <button
                  type="button"
                  disabled={isDone}
                  onClick={() => handleSelectVivaForStart(viva)}
                  style={{
                    ...vivaStyles.primaryBtn,
                    ...(isDone ? vivaStyles.disabledBtn : {}),
                  }}
                >
                  {isDone ? "Attempted" : "Select Viva"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------
// STYLES & ANIMATIONS
// --------------------------------------------------

const vivaKeyframesCss = `
@keyframes vivaFloat {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-6px); }
}
@keyframes vivaOrbitSpin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes vivaBlink {
  0%, 92%, 100% { transform: scaleY(1); }
  95%, 97% { transform: scaleY(0.08); }
}
@keyframes vivaTalkPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.04); }
}
@keyframes vivaWave {
  0%, 100% { transform: scaleY(0.5); }
  50% { transform: scaleY(1.35); }
}
.viva-3d-float {
  animation: vivaFloat 3.6s ease-in-out infinite;
}
.viva-3d-orbit-a {
  animation: vivaOrbitSpin 9s linear infinite;
}
.viva-3d-orbit-b {
  animation: vivaOrbitSpin 13s linear infinite reverse;
}
.viva-eye-blink {
  animation: vivaBlink 4.2s infinite;
}
.viva-3d-talk {
  animation: vivaTalkPulse 0.65s ease-in-out infinite;
}
.viva-wave-anim {
  animation: vivaWave 0.75s ease-in-out infinite;
}
`;

const vivaStyles = {
  fullscreenShell: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    background: "#070b14",
    color: "#f8fafc",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "18px 24px",
    overflow: "hidden",
  },
  fullscreenTopBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
  },
  fullscreenMeta: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#cbd5e1",
  },
  fullscreenActions: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  doneAnswerBtn: {
    background: "#0ea5e9",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "9px 16px",
    fontWeight: 600,
    cursor: "pointer",
  },
  submitVivaBtn: {
    background: "#16a34a",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "9px 16px",
    fontWeight: 600,
    cursor: "pointer",
  },
  singleQuestionStrip: {
    textAlign: "center",
    padding: "8px 16px",
  },
  questionText: {
    fontSize: "20px",
    fontWeight: 600,
    color: "#f1f5f9",
    lineHeight: 1.45,
  },
  centerSilenceNumber: {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 10020,
    fontSize: "88px",
    fontWeight: 800,
    lineHeight: 1,
    color: "#38bdf8",
    textShadow: "0 0 28px rgba(56, 189, 248, 0.55)",
    pointerEvents: "none",
    userSelect: "none",
  },
  twoBoxesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "24px",
    alignItems: "stretch",
    width: "100%",
    maxWidth: "1100px",
    margin: "0 auto",
    flex: 1,
    maxHeight: "74vh",
  },
  boxCard: {
    background: "rgba(15, 23, 42, 0.92)",
    border: "1px solid rgba(148, 163, 184, 0.25)",
    borderRadius: "18px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  photoFlashRing: {
    boxShadow: "0 0 0 3px #38bdf8",
  },
  boxHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  botTitle: {
    fontWeight: 700,
    color: "#38bdf8",
    fontSize: "14px",
  },
  botBadge: {
    fontSize: "12px",
    padding: "3px 10px",
    borderRadius: "999px",
    background: "rgba(56, 189, 248, 0.16)",
    color: "#7dd3fc",
    fontWeight: 600,
  },
  bot3DStage: {
    position: "relative",
    flex: 1,
    minHeight: "230px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "14px",
    background:
      "radial-gradient(circle at 50% 40%, rgba(56, 189, 248, 0.18), rgba(2, 6, 23, 0.9))",
    overflow: "hidden",
  },
  bot3DOrbitA: {
    position: "absolute",
    width: "190px",
    height: "190px",
    borderRadius: "50%",
    border: "1px dashed rgba(56, 189, 248, 0.35)",
  },
  bot3DOrbitB: {
    position: "absolute",
    width: "230px",
    height: "230px",
    borderRadius: "50%",
    border: "1px solid rgba(129, 140, 248, 0.22)",
  },
  bot3DCharacter: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
  },
  bot3DHead: {
    position: "relative",
    width: "112px",
    height: "92px",
    borderRadius: "28px",
    background: "linear-gradient(145deg, #1e293b, #0f172a)",
    border: "2px solid #38bdf8",
    boxShadow: "0 12px 28px rgba(2, 132, 199, 0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
  },
  botAntenna: {
    position: "absolute",
    top: "-12px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#34d399",
    boxShadow: "0 0 10px #34d399",
  },
  botEyeSocket: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    background: "#020617",
    border: "1px solid rgba(125, 211, 252, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  botEyeBall: {
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    background: "#e0f2fe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 0.08s linear",
  },
  botPupil: {
    position: "relative",
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#0284c7",
  },
  botGlint: {
    position: "absolute",
    top: "1px",
    right: "1px",
    width: "4px",
    height: "4px",
    borderRadius: "50%",
    background: "#ffffff",
  },
  bot3DBody: {
    width: "136px",
    height: "56px",
    borderRadius: "24px 24px 14px 14px",
    background: "linear-gradient(180deg, #1e293b, #090d16)",
    border: "1.5px solid rgba(56, 189, 248, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 10px 24px rgba(0, 0, 0, 0.45)",
  },
  botCoreLight: {
    width: "22px",
    height: "10px",
    borderRadius: "999px",
    background: "#38bdf8",
    boxShadow: "0 0 12px #38bdf8",
  },
  waveStrip: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    height: "28px",
    marginTop: "10px",
  },
  waveBar: {
    width: "5px",
    borderRadius: "999px",
    transition: "height 0.15s ease",
  },
  camBadge: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#4ade80",
  },
  photoCountText: {
    fontSize: "12px",
    color: "#cbd5e1",
  },
  videoBox: {
    position: "relative",
    flex: 1,
    minHeight: "230px",
    borderRadius: "14px",
    overflow: "hidden",
    background: "#020617",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  videoElement: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: "scaleX(-1)",
  },
  videoPlaceholder: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    textAlign: "center",
    color: "#94a3b8",
    fontSize: "14px",
  },
  camFooterText: {
    marginTop: "10px",
    fontSize: "13px",
    color: "#e2e8f0",
    textAlign: "center",
  },
  warningBanner: {
    background: "rgba(234, 179, 8, 0.16)",
    border: "1px solid #eab308",
    color: "#fde047",
    padding: "8px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    textAlign: "center",
  },
  errorBanner: {
    background: "rgba(239, 68, 68, 0.16)",
    border: "1px solid #ef4444",
    color: "#fca5a5",
    padding: "8px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    marginBottom: "12px",
  },
  lobbyContainer: {
    padding: "20px",
    maxWidth: "1080px",
    margin: "0 auto",
  },
  lobbyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  lobbyTitle: {
    margin: 0,
    fontSize: "24px",
  },
  mutedText: {
    color: "#64748b",
    margin: "4px 0 0",
    fontSize: "14px",
  },
  startGateCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid #0284c7",
    background: "#f0f9ff",
    marginBottom: "16px",
  },
  stagedTitle: {
    fontWeight: 700,
    fontSize: "16px",
    color: "#0f172a",
  },
  startVivaBtn: {
    background: "#0284c7",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "10px 20px",
    fontWeight: 700,
    cursor: "pointer",
  },
  filterRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "16px",
  },
  filterChip: {
    padding: "6px 14px",
    borderRadius: "999px",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    cursor: "pointer",
    fontSize: "13px",
  },
  filterChipActive: {
    background: "#0f172a",
    color: "#ffffff",
    borderColor: "#0f172a",
  },
  vivaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "16px",
  },
  vivaCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "16px",
    background: "#ffffff",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "10px",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subjectTag: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#0284c7",
  },
  qCountTag: {
    fontSize: "12px",
    color: "#64748b",
  },
  cardTitle: {
    margin: 0,
    fontSize: "17px",
    color: "#0f172a",
  },
  cardDesc: {
    margin: 0,
    fontSize: "13px",
    color: "#475569",
  },
  primaryBtn: {
    background: "#0f172a",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "9px 14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  secondaryBtn: {
    background: "#f1f5f9",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    padding: "8px 14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  disabledBtn: {
    background: "#94a3b8",
    cursor: "not-allowed",
  },
  summaryCard: {
    maxWidth: "480px",
    margin: "48px auto",
    padding: "24px",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    textAlign: "center",
  },
};

export default StudentViva;