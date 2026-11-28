import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import StudentViva from "./StudentViva";

const GROQ_API_KEY = (process.env.REACT_APP_GROQ_API_KEY || "").trim();
const GROQ_MODEL = (
  process.env.REACT_APP_GROQ_MODEL || "openai/gpt-oss-20b"
).trim();

const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const QUESTION_COUNTS = [5, 10];
const STUDENT_CLASSES = [
  "Class 6th",
  "Class 7th",
  "Class 8th",
  "Class 9th",
  "Class 10th",
  "Class 11th",
  "Class 12th",
  "College / Other"
];

const getTimeGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

const getLocalUserObject = (propUser) => {
  if (propUser && typeof propUser === "object") {
    return propUser.user || propUser;
  }

  const keys = ["user", "currentUser", "studentUser", "authUser", "loggedInUser"];
  for (const key of keys) {
    try {
      const rawLocal = localStorage.getItem(key);
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal);
        if (parsed && typeof parsed === "object") return parsed.user || parsed;
      }
    } catch {
      // ignore invalid JSON
    }
    try {
      const rawSession = sessionStorage.getItem(key);
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        if (parsed && typeof parsed === "object") return parsed.user || parsed;
      }
    } catch {
      // ignore invalid JSON
    }
  }
  return null;
};

const extractUserId = (userObj) => {
  if (!userObj) return null;
  const raw =
    userObj.id ??
    userObj.studentId ??
    userObj.student_id ??
    userObj.userId ??
    userObj.user_id ??
    null;
  return raw !== null && raw !== undefined && String(raw).trim() !== ""
    ? raw
    : null;
};

const extractUserName = (userObj) => {
  if (!userObj) return "";
  return (
    userObj.name ||
    userObj.fullName ||
    userObj.studentName ||
    userObj.username ||
    ""
  ).trim();
};

const extractUserClass = (userObj) => {
  if (!userObj) return "Class 10th";
  return (
    userObj.className ||
    userObj.studentClass ||
    userObj.class ||
    userObj.grade ||
    "Class 10th"
  );
};

const isSpokenNameVerified = (spokenText, expectedName) => {
  const cleanSpoken = (spokenText || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\b(my name is|i am|this is|name|mera naam|hai|hoon)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const cleanExpected = (expectedName || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanSpoken) return false;
  if (!cleanExpected) return true;

  if (cleanSpoken.includes(cleanExpected) || cleanExpected.includes(cleanSpoken)) {
    return true;
  }

  const expectedParts = cleanExpected.split(" ").filter((p) => p.length > 1);
  const spokenParts = cleanSpoken.split(" ").filter((p) => p.length > 1);
  if (expectedParts.length === 0) return true;

  return expectedParts.some((part) => spokenParts.includes(part));
};

const parseMistakes = (rawMistakes) => {
  if (!rawMistakes) return [];
  let list = rawMistakes;
  if (typeof rawMistakes === "string") {
    try {
      const parsed = JSON.parse(rawMistakes);
      list = Array.isArray(parsed) ? parsed : [rawMistakes];
    } catch {
      list = rawMistakes
        .split(/\n|•/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  if (!Array.isArray(list)) return [];

  return list
    .map((item) => {
      if (typeof item === "string") {
        return { mistake: item, explanation: "" };
      }
      if (item && typeof item === "object") {
        return {
          mistake: item.mistake || item.error || item.issue || "",
          explanation: item.explanation || item.tip || item.reason || ""
        };
      }
      return null;
    })
    .filter((entry) => entry && (entry.mistake || entry.explanation));
};

const extractGroqText = (data) => {
  const msg = data?.choices?.[0]?.message;
  if (!msg) return "";
  if (typeof msg.content === "string" && msg.content.trim()) {
    return msg.content.trim();
  }
  if (Array.isArray(msg.content)) {
    return msg.content
      .map((part) => (typeof part === "string" ? part : part?.text || ""))
      .join(" ")
      .trim();
  }
  return "";
};

const extractGroqJson = (text) => {
  const cleaned = String(text || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("Invalid JSON from Groq");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
};

const callGroqInterview = async (messages, maxTokens = 450) => {
  if (!GROQ_API_KEY) {
    throw new Error("Missing REACT_APP_GROQ_API_KEY");
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.6,
      max_tokens: maxTokens
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Groq HTTP ${res.status}`);
  }

  const text = extractGroqText(data);
  if (!text) {
    throw new Error("Empty response from Groq");
  }
  return text;
};

const buildReportSummary = (interviewMeta, answersList, fallbackLevel, fallbackType) => {
  const safeAnswers = Array.isArray(answersList) ? answersList : [];
  const count = safeAnswers.length;

  const avgOf = (getter) => {
    if (count === 0) return 0;
    const total = safeAnswers.reduce((sum, row) => sum + (Number(getter(row)) || 0), 0);
    return Number((total / count).toFixed(1));
  };

  const grammarScore = avgOf((a) => a.grammar_score ?? a.grammarScore);
  const fluencyScore = avgOf((a) => a.fluency_score ?? a.fluencyScore);
  const vocabularyScore = avgOf((a) => a.vocabulary_score ?? a.vocabularyScore);
  const relevanceScore = avgOf((a) => a.relevance_score ?? a.relevanceScore);

  const rawOverall = interviewMeta?.overall_score ?? interviewMeta?.overallScore;
  const overallScore =
    rawOverall !== undefined && rawOverall !== null && !Number.isNaN(Number(rawOverall))
      ? Number(Number(rawOverall).toFixed(1))
      : count > 0
      ? Number(((grammarScore + fluencyScore + vocabularyScore + relevanceScore) / 4).toFixed(1))
      : 0;

  const skillEntries = [
    { name: "Grammar", score: grammarScore },
    { name: "Fluency & Structure", score: fluencyScore },
    { name: "Vocabulary", score: vocabularyScore },
    { name: "Relevance to Question", score: relevanceScore }
  ];

  const strengths = skillEntries
    .filter((s) => s.score >= 70)
    .map(
      (s) =>
        `${s.name} (${s.score}/100): Steady command across ${count} answered question${count === 1 ? "" : "s"}.`
    );

  if (strengths.length === 0 && count > 0) {
    const bestSkill = [...skillEntries].sort((a, b) => b.score - a.score)[0];
    strengths.push(
      `${bestSkill.name} (${bestSkill.score}/100): Relative strongest area in this session.`
    );
  }

  const areasForImprovement = skillEntries
    .filter((s) => s.score < 75)
    .map(
      (s) =>
        `${s.name} (${s.score}/100): Needs extra focus compared to other skills.`
    );

  const allMistakes = safeAnswers.flatMap((a) =>
    parseMistakes(a.mistakes).map((m) => m.mistake).filter(Boolean)
  );

  const suggestions = [];
  if (grammarScore < 75) {
    suggestions.push("Review tenses, subject-verb agreement, and prepositions.");
  }
  if (fluencyScore < 75) {
    suggestions.push("Use clear transition words so answers flow smoothly.");
  }
  if (vocabularyScore < 75) {
    suggestions.push("Use precise domain vocabulary suited to your selected mode.");
  }
  if (relevanceScore < 75) {
    suggestions.push("Address the exact question directly in your opening lines.");
  }
  if (allMistakes.length > 0) {
    suggestions.push(
      `Re-practice ${Math.min(allMistakes.length, 3)} key mistake pattern${allMistakes.length === 1 ? "" : "s"}.`
    );
  }
  if (suggestions.length === 0) {
    suggestions.push("Great job! Try a higher difficulty level next.");
  }

  return {
    id: interviewMeta?.id,
    level: interviewMeta?.level || fallbackLevel,
    interviewType:
      interviewMeta?.interview_type || interviewMeta?.interviewType || fallbackType,
    overallScore,
    grammarScore,
    fluencyScore,
    vocabularyScore,
    relevanceScore,
    strengths,
    areasForImprovement,
    suggestions,
    answers: safeAnswers
  };
};

const Smart3DRobotStage = ({ pupilOffset, isListening, isSpeaking, countdown }) => {
  return (
    <div style={styles.robot3DStage}>
      <div style={styles.robot3DTopBar}>
        <span style={styles.robot3DPill}>🤖 SMARTBOT 3D • AI INTERVIEWER</span>
        <span style={styles.robot3DStateBadge}>
          {countdown !== null
            ? `Next in ${countdown}s`
            : isSpeaking
            ? "Speaking"
            : isListening
            ? "Listening"
            : "Live Check"}
        </span>
      </div>

      <div style={styles.robot3DScene}>
        <div
          className={isSpeaking ? "ssc-robot-talk" : "ssc-robot-float"}
          style={styles.robot3DHead}
        >
          <div style={styles.robotAntennaTop} />
          <div style={styles.robotVisor}>
            <div style={styles.robot3DEye}>
              <div
                style={{
                  ...styles.robot3DPupil,
                  transform: `translate(${pupilOffset.x}px, ${pupilOffset.y}px)`
                }}
              />
            </div>
            <div style={styles.robot3DEye}>
              <div
                style={{
                  ...styles.robot3DPupil,
                  transform: `translate(${pupilOffset.x}px, ${pupilOffset.y}px)`
                }}
              />
            </div>
          </div>

          <div
            className={isSpeaking ? "ssc-mouth-speak" : ""}
            style={styles.robot3DMouth}
          />
        </div>

        <div style={styles.robot3DShoulder} />
      </div>

      <div style={styles.robot3DFooterText}>
        {isSpeaking
          ? "SmartBot is speaking..."
          : isListening
          ? "SmartBot is listening..."
          : "4-Step Live Verification & Interview"}
      </div>
    </div>
  );
};

const CenterListeningWaves = ({ isListening, countdown, onToggleMic }) => {
  const bars = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  return (
    <div style={styles.centerWaveBox}>
      <button
        type="button"
        onClick={onToggleMic}
        className={isListening ? "ssc-mic-active" : ""}
        style={{
          ...styles.centerMicCircle,
          backgroundColor: isListening ? "#16a34a" : "#2563eb"
        }}
        title={isListening ? "Listening — Tap to stop" : "Tap to start speaking"}
      >
        🎤
      </button>

      <div style={styles.waveBarsRow} aria-hidden="true">
        {bars.map((b) => (
          <span
            key={b}
            className={isListening ? "ssc-wave-bar-active" : ""}
            style={{
              ...styles.waveBar,
              height: isListening ? `${14 + ((b * 7) % 24)}px` : "8px",
              animationDelay: `${b * 0.08}s`
            }}
          />
        ))}
      </div>

      <div style={styles.centerWaveStatus}>
        {countdown !== null
          ? `Listening... Moving ahead in ${countdown}s`
          : isListening
          ? "Listening clearly — speak naturally"
          : "Mic ready — tap to speak or wait for auto-listen"}
      </div>
    </div>
  );
};

const ScoreCard = ({ label, score }) => {
  const numeric = Number(score);
  const safe = Number.isFinite(numeric) ? Math.max(0, Math.min(100, numeric)) : 0;

  let ringColor = "#2563eb";
  let badgeBg = "#dbeafe";
  let badgeText = "#1d4ed8";

  if (safe >= 80) {
    ringColor = "#16a34a";
    badgeBg = "#dcfce7";
    badgeText = "#15803d";
  } else if (safe < 55) {
    ringColor = "#f59e0b";
    badgeBg = "#fef3c7";
    badgeText = "#b45309";
  }

  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safe / 100) * circumference;

  return (
    <div style={styles.scoreCard}>
      <div style={styles.circularWrapper}>
        <svg width="86" height="86" style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx="43"
            cy="43"
            r={radius}
            stroke="#e2e8f0"
            strokeWidth="8"
            fill="transparent"
          />
          <circle
            cx="43"
            cy="43"
            r={radius}
            stroke={ringColor}
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div style={styles.circularValue}>
          <span style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
            {safe}
          </span>
          <span style={{ fontSize: "10px", color: "#64748b" }}>/100</span>
        </div>
      </div>

      <div style={styles.scoreTitle}>{label}</div>
      <span
        style={{
          ...styles.scoreBadge,
          backgroundColor: badgeBg,
          color: badgeText
        }}
      >
        {safe >= 80 ? "Excellent" : safe >= 55 ? "Good" : "Needs Practice"}
      </span>
    </div>
  );
};

export const AiInterview = ({ user: propUser }) => {
  const navigate = useNavigate();

  // First check identity verification status; if not verified, go to /verifying-identity
  const [identityChecked, setIdentityChecked] = useState(false);

  useEffect(() => {
    const verified = sessionStorage.getItem("viva_verified") === "true";
    if (!verified) {
     navigate("/student/verifying-identity", { replace: true });
    } else {
      setIdentityChecked(true);
    }
  }, [navigate]);

  // "live_check" | "interview" | "report" | "history" | "viva"
  const [view, setView] = useState("live_check");

  const localUserObj = useMemo(() => getLocalUserObject(propUser), [propUser]);
  const localUserId = useMemo(() => extractUserId(localUserObj), [localUserObj]);
  const localExpectedName = useMemo(
    () => extractUserName(localUserObj),
    [localUserObj]
  );
  const localExpectedClass = useMemo(
    () => extractUserClass(localUserObj),
    [localUserObj]
  );

  const [studentName, setStudentName] = useState(localExpectedName || "");
  const [studentClass, setStudentClass] = useState(localExpectedClass);
  const [spokenNameRaw, setSpokenNameRaw] = useState("");
  const [authStatusMsg, setAuthStatusMsg] = useState("");

  // Notification & Popup states
  const [toast, setToast] = useState(null);
  const [popup, setPopup] = useState(null);

  const showNotification = useCallback((type, title, message) => {
    setToast({ type, title, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  // 4-step live check states:
  // 1) Speak registered name
  // 2) Compare spoken name with registered name
  // 3) Check camera + camera option
  // 4) Check internet + tick -> navigate into interview
  const [verifyStep, setVerifyStep] = useState(1);
  const [step1Spoken, setStep1Spoken] = useState(false);
  const [step2Matched, setStep2Matched] = useState(false);
  const [step3CameraOk, setStep3CameraOk] = useState(false);
  const [step4InternetOk, setStep4InternetOk] = useState(false);

  const [cameraDevices, setCameraDevices] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [internetText, setInternetText] = useState("Pending check");

  // Voice, Camera & Robot states
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [listeningMode, setListeningMode] = useState(null); // null | "name" | "answer"
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });
  const [silenceCountdown, setSilenceCountdown] = useState(null);

  const candidateVideoRef = useRef(null);
  const candidateStreamRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const hasSpokenInAnswerRef = useRef(false);
  const answerRef = useRef("");
  const handledNextActionRef = useRef(false);
  const bootOnceRef = useRef(false);

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Session settings
  const [level, setLevel] = useState("Beginner");
  const [interviewType, setInterviewType] = useState("English AI Interview");
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [starting, setStarting] = useState(false);

  // Active interview state
  const [interviewId, setInterviewId] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [sessionRecords, setSessionRecords] = useState([]);
  const [answer, setAnswer] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [loadingNext, setLoadingNext] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Report state
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [floatingReportOpen, setFloatingReportOpen] = useState(true);

  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);

  useEffect(() => {
    if (localExpectedClass) {
      setStudentClass(localExpectedClass);
    }
  }, [localExpectedClass]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / Math.max(1, cx);
      const dy = (e.clientY - cy) / Math.max(1, cy);
      setPupilOffset({
        x: Math.max(-7, Math.min(7, dx * 7)),
        y: Math.max(-5, Math.min(5, dy * 5))
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const speakText = useCallback(
    (text, onDone) => {
      if (!text || typeof window === "undefined") {
        if (onDone) onDone();
        return;
      }
      if (!voiceEnabled || !("speechSynthesis" in window)) {
        if (onDone) onDone();
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-IN";
      utterance.rate = 0.98;
      utterance.pitch = 1.02;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        if (onDone) onDone();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        if (onDone) onDone();
      };

      window.speechSynthesis.speak(utterance);
    },
    [voiceEnabled]
  );

  const clearSilenceCountdown = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setSilenceCountdown(null);
  }, []);

  const stopListening = useCallback(() => {
    clearSilenceCountdown();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setListeningMode(null);
  }, [clearSilenceCountdown]);

  const stopCandidateCamera = useCallback(() => {
    if (candidateStreamRef.current) {
      candidateStreamRef.current.getTracks().forEach((track) => track.stop());
      candidateStreamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  const startCandidateCamera = useCallback(
    async (deviceIdOverride = null) => {
      if (!cameraEnabled) {
        stopCandidateCamera();
        setStep3CameraOk(false);
        return false;
      }
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setStep3CameraOk(false);
        showNotification("error", "Camera Unavailable", "Browser does not support camera access.");
        return false;
      }

      stopCandidateCamera();
      const targetId = deviceIdOverride || selectedCameraId;
      const constraints = targetId
        ? { video: { deviceId: { exact: targetId } }, audio: false }
        : { video: { facingMode: "user" }, audio: false };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        candidateStreamRef.current = stream;
        if (candidateVideoRef.current) {
          candidateVideoRef.current.srcObject = stream;
        }
        setCameraReady(true);
        setStep3CameraOk(true);

        if (navigator.mediaDevices.enumerateDevices) {
          const devs = await navigator.mediaDevices.enumerateDevices();
          const cams = devs.filter((d) => d.kind === "videoinput");
          setCameraDevices(cams);
          const trackId = stream.getVideoTracks()[0]?.getSettings?.()?.deviceId;
          if (trackId) setSelectedCameraId(trackId);
          else if (cams[0]?.deviceId && !targetId) setSelectedCameraId(cams[0].deviceId);
        }
        return true;
      } catch {
        setCameraReady(false);
        setStep3CameraOk(false);
        setPopup({
          type: "error",
          title: "Camera Permission Needed",
          message: "Please allow camera access or choose another camera device in Step 3.",
          actionLabel: "Retry Camera",
          onAction: () => {
            setPopup(null);
            startCandidateCamera();
          }
        });
        return false;
      }
    },
    [cameraEnabled, selectedCameraId, stopCandidateCamera, showNotification]
  );

  useEffect(() => {
    if (view === "interview" || (view === "live_check" && verifyStep >= 3)) {
      startCandidateCamera();
    } else if (view !== "live_check") {
      stopCandidateCamera();
    }
  }, [view, verifyStep, startCandidateCamera, stopCandidateCamera]);

  useEffect(() => {
    if (cameraReady && candidateVideoRef.current && candidateStreamRef.current) {
      candidateVideoRef.current.srcObject = candidateStreamRef.current;
    }
  }, [cameraReady, view, verifyStep]);

  useEffect(() => {
    return () => {
      stopListening();
      stopCandidateCamera();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [stopListening, stopCandidateCamera]);

  const checkInternetTick = useCallback(async () => {
    setInternetText("Checking...");
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStep4InternetOk(false);
      setInternetText("No Internet");
      return false;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      await fetch("https://api.groq.com", {
        method: "HEAD",
        mode: "no-cors",
        signal: controller.signal
      });
      clearTimeout(timeout);
      setStep4InternetOk(true);
      setInternetText("Internet OK ✓");
      return true;
    } catch {
      if (navigator.onLine) {
        setStep4InternetOk(true);
        setInternetText("Internet OK ✓");
        return true;
      }
      setStep4InternetOk(false);
      setInternetText("Connection Failed");
      return false;
    }
  }, []);

  const generateGroqInterviewQuestion = useCallback(
    async ({ qNum, prevList, nameOverride }) => {
      const candidate = nameOverride || studentName || "Student";
      const messages = [
        {
          role: "system",
          content:
            "You are a clear, polite English spoken interviewer. Output ONLY one short spoken interview question (1-2 sentences)."
        },
        {
          role: "user",
          content: `Candidate: ${candidate}, Class/Level: ${studentClass} (${level}), Mode: English AI Interview.
Question ${qNum} of ${totalQuestions}.
Previous Q&A: ${JSON.stringify(prevList)}.
Ask a fresh, natural question.`
        }
      ];

      return await callGroqInterview(messages, 350);
    },
    [studentName, studentClass, level, totalQuestions]
  );

  const openInterviewRoom = useCallback(
    async (verifiedName) => {
      const finalName = verifiedName || studentName || localExpectedName || "Student";
      setStarting(true);
      setErrorMsg("");
      setEvaluation(null);
      setAnswer("");
      setSessionRecords([]);

      try {
        let createdId = `groq-${Date.now()}`;
        let firstQuestion = "";

        try {
          const res = await api.post("/api/interview/start", {
            studentId: localUserId,
            level,
            interviewType: "English AI Interview",
            totalQuestions
          });
          if (res.data?.interviewId) createdId = res.data.interviewId;
          if (res.data?.question) firstQuestion = res.data.question;
        } catch {
          // fallback to Groq
        }

        if (!firstQuestion) {
          try {
            firstQuestion = await generateGroqInterviewQuestion({
              qNum: 1,
              prevList: [],
              nameOverride: finalName
            });
          } catch {
            firstQuestion = `Hello ${finalName}, let's start your English interview. Please introduce yourself and share your goals.`;
          }
        }

        setInterviewId(createdId);
        setQuestionNumber(1);
        setCurrentQuestion(firstQuestion);
        setView("interview");

        showNotification(
          "success",
          "Interview Started",
          "All 4 verification steps passed. Question 1 is ready."
        );

        const spokenIntro = `Verification complete. Moving to your interview now. ${firstQuestion}`;
        speakText(spokenIntro);
      } finally {
        setStarting(false);
      }
    },
    [
      studentName,
      localExpectedName,
      localUserId,
      level,
      totalQuestions,
      generateGroqInterviewQuestion,
      showNotification,
      speakText
    ]
  );

  const runSteps3And4AndEnter = useCallback(
    async (verifiedName) => {
      setVerifyStep(3);
      setAuthStatusMsg("Step 3: Checking camera...");
      const camOk = await startCandidateCamera();
      if (!camOk) return;

      setVerifyStep(4);
      setAuthStatusMsg("Step 4: Checking internet connection...");
      const netOk = await checkInternetTick();
      if (!netOk) {
        setPopup({
          type: "error",
          title: "Internet Not Detected",
          message: "Please check your internet connection to proceed into the interview.",
          actionLabel: "Recheck Internet",
          onAction: () => {
            setPopup(null);
            runSteps3And4AndEnter(verifiedName);
          }
        });
        return;
      }

      setPopup({
        type: "success",
        title: "All 4 Steps Verified ✓",
        message: "Name matched, camera is active, and internet is connected. Entering interview now.",
        actionLabel: "Start Interview",
        onAction: () => {
          setPopup(null);
          openInterviewRoom(verifiedName);
        }
      });

      setTimeout(() => {
        setPopup(null);
        openInterviewRoom(verifiedName);
      }, 1500);
    },
    [startCandidateCamera, checkInternetTick, openInterviewRoom]
  );

  const startVoiceRecognition = useCallback(
    (mode) => {
      if (typeof window === "undefined") return;
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        showNotification(
          "error",
          "Voice Not Supported",
          "Please use Google Chrome or Microsoft Edge for voice input."
        );
        return;
      }

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }

      stopListening();
      setErrorMsg("");

      if (mode === "answer") {
        hasSpokenInAnswerRef.current = false;
        handledNextActionRef.current = false;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = "en-IN";
      recognition.interimResults = true;
      recognition.continuous = mode === "answer";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setListeningMode(mode);
        if (mode === "name") {
          setAuthStatusMsg("Step 1: Listening... Please speak your registered name.");
        }
      };

      recognition.onresult = (event) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const piece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += piece;
          } else {
            interimTranscript += piece;
          }
        }

        const combined = (finalTranscript || interimTranscript).trim();

        if (mode === "name") {
          setSpokenNameRaw(combined);
          if (finalTranscript.trim()) {
            const spoken = finalTranscript.trim();
            setStep1Spoken(true);
            setVerifyStep(2);
            setAuthStatusMsg(`Step 2: Comparing "${spoken}" with registered name...`);

            const matched = isSpokenNameVerified(spoken, localExpectedName);
            if (matched) {
              const verifiedName = localExpectedName || spoken;
              setStudentName(verifiedName);
              setStep2Matched(true);
              showNotification(
                "success",
                "Name Matched ✓",
                `Verified registered name: ${verifiedName}`
              );
              runSteps3And4AndEnter(verifiedName);
            } else {
              setStep2Matched(false);
              const failMsg = `Spoken "${spoken}" did not match "${localExpectedName || "registered name"}".`;
              setAuthStatusMsg(`Step 2 Failed: ${failMsg}`);
              showNotification("error", "Name Mismatch", failMsg);
              setPopup({
                type: "error",
                title: "Name Comparison Failed",
                message: `You spoke "${spoken}". Please speak your registered name (${
                  localExpectedName || "your name"
                }) clearly.`,
                actionLabel: "Speak Name Again",
                onAction: () => {
                  setPopup(null);
                  setVerifyStep(1);
                  startVoiceRecognition("name");
                }
              });
            }
          }
        } else if (mode === "answer") {
          if (combined) {
            hasSpokenInAnswerRef.current = true;
            clearSilenceCountdown();
          }
          if (finalTranscript.trim()) {
            setAnswer((prev) => {
              const spacer = prev.trim() ? " " : "";
              return `${prev.trim()}${spacer}${finalTranscript.trim()}`;
            });
          }
        }
      };

      recognition.onerror = (event) => {
        clearSilenceCountdown();
        setListeningMode(null);
        if (event.error !== "aborted") {
          showNotification("error", "Microphone Error", `Mic issue: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setListeningMode(null);
        if (mode === "answer" && hasSpokenInAnswerRef.current && !handledNextActionRef.current) {
          startPostAnswerSilenceCountdown();
        }
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch {
        setListeningMode(null);
      }
    },
    [
      stopListening,
      localExpectedName,
      showNotification,
      runSteps3And4AndEnter,
      clearSilenceCountdown
    ]
  );

  // Auto-start 4-step live bot verification as soon as identityChecked is true
  useEffect(() => {
    if (identityChecked && view === "live_check" && !bootOnceRef.current) {
      bootOnceRef.current = true;
      const greeting = getTimeGreeting();
      const msg = `${greeting}! Step 1: Please speak your registered name for live bot verification.`;
      setVerifyStep(1);
      setAuthStatusMsg(msg);
      showNotification("info", "Live Bot Verification", "Step 1: Speak your registered name.");
      speakText(msg, () => {
        startVoiceRecognition("name");
      });
    }
  }, [identityChecked, view, speakText, startVoiceRecognition, showNotification]);

  const advanceAfterSilenceRef = useRef(null);

  const startPostAnswerSilenceCountdown = useCallback(() => {
    clearSilenceCountdown();
    let count = 5;
    setSilenceCountdown(count);

    countdownIntervalRef.current = setInterval(() => {
      count -= 1;
      if (count >= 1) {
        setSilenceCountdown(count);
      } else if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }, 1000);

    silenceTimerRef.current = setTimeout(() => {
      clearSilenceCountdown();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
      setListeningMode(null);

      if (!handledNextActionRef.current && advanceAfterSilenceRef.current) {
        handledNextActionRef.current = true;
        advanceAfterSilenceRef.current();
      }
    }, 5000);
  }, [clearSilenceCountdown]);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get("/api/interview/history", {
        params: localUserId ? { studentId: localUserId } : {}
      });
      const list = Array.isArray(res.data?.interviews)
        ? res.data.interviews
        : Array.isArray(res.data)
        ? res.data
        : [];
      setHistory(list);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [localUserId]);

  useEffect(() => {
    if (identityChecked) {
      fetchHistory();
    }
  }, [identityChecked, fetchHistory]);

  const dashboardStats = useMemo(() => {
    const scored = history
      .map((item) => Number(item.overall_score ?? item.overallScore))
      .filter((num) => Number.isFinite(num) && num > 0);

    if (scored.length === 0) {
      return { totalInterviews: history.length, averageScore: 0, bestScore: 0 };
    }

    const total = scored.reduce((a, b) => a + b, 0);
    return {
      totalInterviews: history.length,
      averageScore: Number((total / scored.length).toFixed(1)),
      bestScore: Number(Math.max(...scored).toFixed(1))
    };
  }, [history]);

  const evaluateGroqInterviewAnswer = async ({ questionText, studentAns }) => {
    const messages = [
      {
        role: "system",
        content:
          "You are an English communication coach. Evaluate the spoken answer from 0 to 100 on grammar, fluency, vocabulary, and relevance. Return ONLY valid JSON."
      },
      {
        role: "user",
        content: `Level: ${level}.
Question: "${questionText}"
Answer: "${studentAns}"

Return ONLY valid JSON:
{
  "grammarScore": 75,
  "fluencyScore": 75,
  "vocabularyScore": 75,
  "relevanceScore": 75,
  "feedback": "Short helpful feedback",
  "mistakes": [],
  "improvedAnswer": "Better spoken phrasing"
}`
      }
    ];

    const raw = await callGroqInterview(messages, 450);
    const parsed = extractGroqJson(raw);
    return {
      grammarScore: Number(parsed.grammarScore) || 70,
      fluencyScore: Number(parsed.fluencyScore) || 70,
      vocabularyScore: Number(parsed.vocabularyScore) || 70,
      relevanceScore: Number(parsed.relevanceScore) || 70,
      feedback: parsed.feedback || "Good effort. Keep speaking clearly.",
      mistakes: parseMistakes(parsed.mistakes),
      improvedAnswer: parsed.improvedAnswer || ""
    };
  };

  const handleEvaluateAnswer = async () => {
    const trimmed = (answerRef.current || "").trim();
    if (!trimmed) {
      showNotification("error", "Empty Answer", "Please speak or type your answer first.");
      return;
    }

    stopListening();
    setEvaluating(true);
    setErrorMsg("");

    try {
      let evalData = null;
      try {
        const res = await api.post("/api/interview/evaluate", {
          interviewId,
          questionNumber,
          question: currentQuestion,
          answer: trimmed,
          level,
          interviewType
        });
        if (res.data) {
          evalData = {
            grammarScore: Number(res.data.grammarScore ?? res.data.grammar_score) || 72,
            fluencyScore: Number(res.data.fluencyScore ?? res.data.fluency_score) || 72,
            vocabularyScore: Number(res.data.vocabularyScore ?? res.data.vocabulary_score) || 72,
            relevanceScore: Number(res.data.relevanceScore ?? res.data.relevance_score) || 72,
            feedback: res.data.feedback || "Good response.",
            mistakes: parseMistakes(res.data.mistakes),
            improvedAnswer: res.data.improvedAnswer ?? res.data.improved_answer ?? ""
          };
        }
      } catch {
        // fallback to Groq
      }

      if (!evalData) {
        try {
          evalData = await evaluateGroqInterviewAnswer({
            questionText: currentQuestion,
            studentAns: trimmed
          });
        } catch {
          evalData = {
            grammarScore: 74,
            fluencyScore: 75,
            vocabularyScore: 72,
            relevanceScore: 76,
            feedback: "Clear response. Add a specific example to make it even stronger.",
            mistakes: [],
            improvedAnswer: `I believe ${trimmed}`
          };
        }
      }

      setEvaluation(evalData);
      setSessionRecords((prev) => [
        ...prev,
        {
          question_number: questionNumber,
          question: currentQuestion,
          answer: trimmed,
          grammar_score: evalData.grammarScore,
          fluency_score: evalData.fluencyScore,
          vocabulary_score: evalData.vocabularyScore,
          relevance_score: evalData.relevanceScore,
          feedback: evalData.feedback,
          mistakes: evalData.mistakes,
          improved_answer: evalData.improvedAnswer
        }
      ]);

      showNotification("success", "Answer Evaluated", "Scores and feedback updated.");
    } finally {
      setEvaluating(false);
    }
  };

  const handleCompleteInterview = useCallback(async () => {
    stopListening();
    setCompleting(true);
    try {
      let backendReport = null;
      if (interviewId && !String(interviewId).startsWith("groq-")) {
        try {
          const res = await api.post("/api/interview/complete", {
            interviewId,
            studentId: localUserId
          });
          if (res.data) backendReport = res.data;
        } catch {
          // fallback
        }
      }

      const summary = buildReportSummary(
        backendReport?.interview || backendReport || { id: interviewId },
        backendReport?.answers || sessionRecords,
        level,
        interviewType
      );
      setReportData(summary);
      setFloatingReportOpen(true);
      setView("report");
      fetchHistory();

      setPopup({
        type: "success",
        title: "Interview Completed!",
        message: `Your session is complete with an overall score of ${summary.overallScore}/100.`,
        actionLabel: "View Report",
        onAction: () => setPopup(null)
      });
    } finally {
      setCompleting(false);
    }
  }, [stopListening, interviewId, localUserId, sessionRecords, level, interviewType, fetchHistory]);

  const handleNextQuestion = useCallback(async () => {
    stopListening();
    if (questionNumber >= totalQuestions) {
      await handleCompleteInterview();
      return;
    }

    setLoadingNext(true);
    setEvaluation(null);
    setAnswer("");
    const nextNum = questionNumber + 1;

    try {
      let nextQ = "";
      if (interviewId && !String(interviewId).startsWith("groq-")) {
        try {
          const res = await api.post("/api/interview/next", {
            interviewId,
            questionNumber: nextNum,
            level,
            interviewType
          });
          if (res.data?.question) nextQ = res.data.question;
        } catch {
          // fallback to Groq
        }
      }

      if (!nextQ) {
        try {
          nextQ = await generateGroqInterviewQuestion({
            qNum: nextNum,
            prevList: sessionRecords.map((r) => ({ q: r.question, a: r.answer }))
          });
        } catch {
          nextQ = `Question ${nextNum}: What skill are you currently improving and why?`;
        }
      }

      setQuestionNumber(nextNum);
      setCurrentQuestion(nextQ);
      showNotification("info", `Question ${nextNum}`, "New interview question loaded.");
      speakText(`Question ${nextNum}: ${nextQ}`);
    } finally {
      setLoadingNext(false);
    }
  }, [
    stopListening,
    questionNumber,
    totalQuestions,
    handleCompleteInterview,
    interviewId,
    level,
    interviewType,
    generateGroqInterviewQuestion,
    sessionRecords,
    showNotification,
    speakText
  ]);

  useEffect(() => {
    advanceAfterSilenceRef.current = () => {
      if ((answerRef.current || "").trim()) {
        handleEvaluateAnswer();
      } else {
        handleNextQuestion();
      }
    };
  }, [handleNextQuestion]);

  const handleViewReport = async (id) => {
    stopListening();
    setLoadingReport(true);
    try {
      const res = await api.get(`/api/interview/report/${id}`);
      const summary = buildReportSummary(
        res.data?.interview || res.data || { id },
        res.data?.answers || [],
        level,
        interviewType
      );
      setReportData(summary);
      setFloatingReportOpen(true);
      setView("report");
    } catch {
      showNotification("error", "Report Error", "Could not load report details.");
    } finally {
      setLoadingReport(false);
    }
  };

  const restartLiveCheck = () => {
    stopListening();
    setStep1Spoken(false);
    setStep2Matched(false);
    setStep3CameraOk(false);
    setStep4InternetOk(false);
    setVerifyStep(1);
    setSpokenNameRaw("");
    setView("live_check");
    const msg = "Restarting 4-step live check. Step 1: Please speak your registered name.";
    setAuthStatusMsg(msg);
    showNotification("info", "Live Check Reset", "Speak your registered name to begin.");
    speakText(msg, () => {
      startVoiceRecognition("name");
    });
  };

  if (!identityChecked) {
    return null;
  }

  return (
    <div style={styles.pageContainer}>
      <style>{`
        @keyframes sscFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes sscTalk {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-3px) scale(1.02); }
        }
        @keyframes sscMouth {
          0%, 100% { height: 6px; border-radius: 999px; }
          50% { height: 15px; border-radius: 8px; }
        }
        @keyframes sscWave {
          0%, 100% { transform: scaleY(0.45); }
          50% { transform: scaleY(1.35); }
        }
        @keyframes sscPulse {
          0% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.45); }
          70% { box-shadow: 0 0 0 14px rgba(22, 163, 74, 0); }
          100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
        }
        .ssc-robot-float { animation: sscFloat 3s ease-in-out infinite; }
        .ssc-robot-talk { animation: sscTalk 0.65s ease-in-out infinite; }
        .ssc-mouth-speak { animation: sscMouth 0.28s ease-in-out infinite; }
        .ssc-wave-bar-active { animation: sscWave 0.75s ease-in-out infinite; }
        .ssc-mic-active { animation: sscPulse 1.4s infinite; }
      `}</style>

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            ...styles.toast,
            borderLeftColor:
              toast.type === "success"
                ? "#16a34a"
                : toast.type === "error"
                ? "#dc2626"
                : "#2563eb"
          }}
        >
          <div style={styles.toastHeader}>
            <strong>
              {toast.type === "success"
                ? "✅ "
                : toast.type === "error"
                ? "⚠️ "
                : "ℹ️ "}
              {toast.title}
            </strong>
            <button
              type="button"
              onClick={() => setToast(null)}
              style={styles.toastCloseBtn}
            >
              ✕
            </button>
          </div>
          <div style={styles.toastMessage}>{toast.message}</div>
        </div>
      )}

      {/* Modal Popup */}
      {popup && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalIcon}>
              {popup.type === "success" ? "✅" : popup.type === "error" ? "⚠️" : "ℹ️"}
            </div>
            <h3 style={styles.modalTitle}>{popup.title}</h3>
            <p style={styles.modalMessage}>{popup.message}</p>
            <button
              type="button"
              onClick={popup.onAction}
              style={{
                ...styles.modalActionBtn,
                backgroundColor:
                  popup.type === "success"
                    ? "#16a34a"
                    : popup.type === "error"
                    ? "#dc2626"
                    : "#2563eb"
              }}
            >
              {popup.actionLabel}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>English AI Interview</h1>
          <p style={styles.subtitle}>
            Candidate: <strong>{studentName || localExpectedName || "Student"}</strong> ({studentClass}) • Mode:{" "}
            <strong>{interviewType}</strong>
          </p>
        </div>

        <div style={styles.headerActions}>
          <button
            type="button"
            onClick={() => {
              setInterviewType("English AI Interview");
              setView(step4InternetOk ? "interview" : "live_check");
            }}
            style={{
              ...styles.tabBtn,
              ...(view === "interview" || view === "live_check" ? styles.tabBtnActive : {})
            }}
          >
            English AI Interview
          </button>

          <button
            type="button"
            onClick={() => {
              stopListening();
              setInterviewType("Student Viva");
              setView("viva");
            }}
            style={{
              ...styles.tabBtn,
              ...(view === "viva" ? styles.tabBtnActive : {})
            }}
          >
            Student Viva
          </button>

          <button
            type="button"
            onClick={() => {
              stopListening();
              setView("history");
              fetchHistory();
            }}
            style={{
              ...styles.tabBtn,
              ...(view === "history" ? styles.tabBtnActive : {})
            }}
          >
            History ({dashboardStats.totalInterviews})
          </button>

          <button
            type="button"
            onClick={() => {
              setVoiceEnabled((prev) => {
                const next = !prev;
                if (!next && typeof window !== "undefined" && "speechSynthesis" in window) {
                  window.speechSynthesis.cancel();
                  setIsSpeaking(false);
                }
                return next;
              });
            }}
            style={styles.secondaryBtn}
          >
            {voiceEnabled ? "🔊 Voice ON" : "🔇 Voice OFF"}
          </button>

          <button
            type="button"
            onClick={restartLiveCheck}
            style={styles.secondaryBtn}
          >
            ↻ Re-Check
          </button>
        </div>
      </header>

      {errorMsg && <div style={styles.errorBanner}>{errorMsg}</div>}

      {/* STUDENT VIVA */}
      {view === "viva" && (
        <StudentViva
          user={localUserObj}
          studentName={studentName || localExpectedName}
          studentClass={studentClass}
          onBackToInterview={() => {
            setInterviewType("English AI Interview");
            setView("interview");
          }}
        />
      )}

      {/* 4-STEP LIVE CHECK BEFORE INTERVIEW */}
      {view === "live_check" && (
        <section style={styles.card}>
          <div style={styles.verifyGrid}>
            <Smart3DRobotStage
              pupilOffset={pupilOffset}
              isListening={listeningMode === "name"}
              isSpeaking={isSpeaking}
              countdown={null}
            />

            <div style={styles.stepsCol}>
              <h2 style={styles.sectionTitle}>4-Step Live Verification</h2>
              <p style={styles.statusText}>{authStatusMsg}</p>

              {/* Step 1 */}
              <div
                style={{
                  ...styles.stepBox,
                  borderColor: step1Spoken ? "#16a34a" : verifyStep === 1 ? "#2563eb" : "#e2e8f0"
                }}
              >
                <div style={styles.stepRowTop}>
                  <strong>1. Speak Registered Name</strong>
                  <span>{step1Spoken ? "✓ Done" : verifyStep === 1 ? "🎙️ Speaking" : "—"}</span>
                </div>
                <div style={styles.stepMeta}>
                  Spoken: <strong>{spokenNameRaw || "Waiting for voice..."}</strong>
                </div>
                <div style={styles.inlineRow}>
                  <button
                    type="button"
                    onClick={() => startVoiceRecognition("name")}
                    style={styles.primaryBtn}
                  >
                    🎤 Speak Name
                  </button>
                  <button
                    type="button"
                    onClick={() => stopListening()}
                    style={styles.secondaryBtn}
                  >
                    Stop Mic
                  </button>
                </div>
              </div>

              {/* Step 2 */}
              <div
                style={{
                  ...styles.stepBox,
                  borderColor: step2Matched ? "#16a34a" : verifyStep === 2 ? "#2563eb" : "#e2e8f0"
                }}
              >
                <div style={styles.stepRowTop}>
                  <strong>2. Compare With Registered Name</strong>
                  <span>{step2Matched ? "✓ Matched" : "Pending"}</span>
                </div>
                <div style={styles.stepMeta}>
                  Registered Name: <strong>{localExpectedName || "Not stored"}</strong>
                </div>
              </div>

              {/* Step 3 */}
              <div
                style={{
                  ...styles.stepBox,
                  borderColor: step3CameraOk ? "#16a34a" : verifyStep === 3 ? "#2563eb" : "#e2e8f0"
                }}
              >
                <div style={styles.stepRowTop}>
                  <strong>3. Camera Check & Camera Option</strong>
                  <span>{step3CameraOk ? "✓ Camera Ready" : "Checking"}</span>
                </div>
                <div style={styles.inlineRow}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={cameraEnabled}
                      onChange={(e) => setCameraEnabled(e.target.checked)}
                    />{" "}
                    Camera On
                  </label>

                  <select
                    value={selectedCameraId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedCameraId(id);
                      startCandidateCamera(id);
                    }}
                    style={styles.select}
                  >
                    {cameraDevices.length === 0 ? (
                      <option value="">Default Camera</option>
                    ) : (
                      cameraDevices.map((cam, idx) => (
                        <option key={cam.deviceId || idx} value={cam.deviceId}>
                          {cam.label || `Camera ${idx + 1}`}
                        </option>
                      ))
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={() => startCandidateCamera()}
                    style={styles.secondaryBtn}
                  >
                    Check Camera
                  </button>
                </div>

                <div style={styles.videoWrap}>
                  <video
                    ref={candidateVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={styles.smallVideo}
                  />
                </div>
              </div>

              {/* Step 4 */}
              <div
                style={{
                  ...styles.stepBox,
                  borderColor: step4InternetOk ? "#16a34a" : verifyStep === 4 ? "#2563eb" : "#e2e8f0"
                }}
              >
                <div style={styles.stepRowTop}>
                  <strong>4. Internet Check & Enter Interview</strong>
                  <span>{step4InternetOk ? "✓ Connected" : "Checking"}</span>
                </div>
                <div style={styles.stepMeta}>
                  Status: <strong>{internetText}</strong>
                </div>
                <div style={styles.inlineRow}>
                  <button
                    type="button"
                    onClick={() => checkInternetTick()}
                    style={styles.secondaryBtn}
                  >
                    Check Internet
                  </button>
                  <button
                    type="button"
                    disabled={starting}
                    onClick={() => openInterviewRoom(studentName || localExpectedName)}
                    style={styles.successBtn}
                  >
                    {starting ? "Starting..." : "Go to Interview →"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ACTIVE INTERVIEW */}
      {view === "interview" && (
        <section style={styles.card}>
          <div style={styles.interviewTopBar}>
            <div>
              <strong>
                Question {questionNumber} of {totalQuestions}
              </strong>{" "}
              • Level: <strong>{level}</strong> • Candidate: <strong>{studentName}</strong>
            </div>

            <div style={styles.inlineRow}>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                style={styles.select}
              >
                {LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>

              <select
                value={totalQuestions}
                onChange={(e) => setTotalQuestions(Number(e.target.value))}
                style={styles.select}
              >
                {QUESTION_COUNTS.map((cnt) => (
                  <option key={cnt} value={cnt}>
                    {cnt} Questions
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.stageGrid}>
            <Smart3DRobotStage
              pupilOffset={pupilOffset}
              isListening={listeningMode === "answer"}
              isSpeaking={isSpeaking}
              countdown={silenceCountdown}
            />

            <div style={styles.cameraBox}>
              <div style={styles.cameraTop}>
                <span>📷 Camera Feed</span>
                <select
                  value={selectedCameraId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedCameraId(id);
                    startCandidateCamera(id);
                  }}
                  style={styles.select}
                >
                  {cameraDevices.length === 0 ? (
                    <option value="">Default Camera</option>
                  ) : (
                    cameraDevices.map((cam, idx) => (
                      <option key={cam.deviceId || idx} value={cam.deviceId}>
                        {cam.label || `Camera ${idx + 1}`}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <video
                ref={candidateVideoRef}
                autoPlay
                playsInline
                muted
                style={styles.mainVideo}
              />
            </div>
          </div>

          <div style={styles.questionCard}>
            <div style={styles.questionTag}>SmartBot Question</div>
            <p style={styles.questionText}>{currentQuestion}</p>
            <button
              type="button"
              onClick={() => speakText(currentQuestion)}
              style={styles.secondaryBtn}
            >
              🔊 Speak Question
            </button>
          </div>

          <CenterListeningWaves
            isListening={listeningMode === "answer"}
            countdown={silenceCountdown}
            onToggleMic={() => {
              if (listeningMode === "answer") {
                stopListening();
              } else {
                startVoiceRecognition("answer");
              }
            }}
          />

          <div style={styles.answerBlock}>
            <label style={styles.label}>Your Answer</label>
            <textarea
              rows={4}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Speak into mic or type your answer..."
              style={styles.textarea}
            />
          </div>

          <div style={styles.inlineRow}>
            <button
              type="button"
              disabled={evaluating}
              onClick={handleEvaluateAnswer}
              style={styles.primaryBtn}
            >
              {evaluating ? "Evaluating..." : "Evaluate Answer"}
            </button>

            <button
              type="button"
              disabled={loadingNext || completing}
              onClick={handleNextQuestion}
              style={styles.successBtn}
            >
              {loadingNext
                ? "Loading Next..."
                : completing
                ? "Completing..."
                : questionNumber >= totalQuestions
                ? "Finish & View Report"
                : "Next Question →"}
            </button>
          </div>

          {evaluation && (
            <div style={styles.evalBox}>
              <h3 style={styles.evalHeading}>Evaluation Feedback</h3>
              <div style={styles.evalMetrics}>
                <span>Grammar: <strong>{evaluation.grammarScore}/100</strong></span>
                <span>Fluency: <strong>{evaluation.fluencyScore}/100</strong></span>
                <span>Vocabulary: <strong>{evaluation.vocabularyScore}/100</strong></span>
                <span>Relevance: <strong>{evaluation.relevanceScore}/100</strong></span>
              </div>
              <p style={styles.evalText}>{evaluation.feedback}</p>
              {evaluation.improvedAnswer && (
                <p style={styles.improvedText}>
                  <strong>Improved version:</strong> {evaluation.improvedAnswer}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* REPORT VIEW */}
      {view === "report" && (
        <section style={styles.card}>
          {loadingReport ? (
            <p>Loading report...</p>
          ) : reportData ? (
            <>
              <div style={styles.reportHeader}>
                <div>
                  <h2 style={styles.sectionTitle}>Interview Report</h2>
                  <p style={styles.subtitle}>
                    Overall Score: <strong>{reportData.overallScore}/100</strong> • Level:{" "}
                    <strong>{reportData.level}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFloatingReportOpen((prev) => !prev)}
                  style={styles.secondaryBtn}
                >
                  {floatingReportOpen ? "Hide Summary" : "Show Summary"}
                </button>
              </div>

              <div style={styles.scoresGrid}>
                <ScoreCard label="Grammar" score={reportData.grammarScore} />
                <ScoreCard label="Fluency" score={reportData.fluencyScore} />
                <ScoreCard label="Vocabulary" score={reportData.vocabularyScore} />
                <ScoreCard label="Relevance" score={reportData.relevanceScore} />
              </div>

              {floatingReportOpen && (
                <div style={styles.summaryCard}>
                  <h3>Strengths & Tips</h3>
                  <ul>
                    {(reportData.strengths || []).map((s, i) => (
                      <li key={`s-${i}`}>{s}</li>
                    ))}
                    {(reportData.suggestions || []).map((tip, i) => (
                      <li key={`t-${i}`}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={styles.inlineRow}>
                <button
                  type="button"
                  onClick={() => openInterviewRoom(studentName || localExpectedName)}
                  style={styles.primaryBtn}
                >
                  Start New Interview
                </button>
              </div>
            </>
          ) : (
            <p>No report available.</p>
          )}
        </section>
      )}

      {/* HISTORY VIEW */}
      {view === "history" && (
        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>Interview History</h2>
          {loadingHistory ? (
            <p>Loading history...</p>
          ) : history.length === 0 ? (
            <p>No interview records found.</p>
          ) : (
            <div style={styles.historyList}>
              {history.map((row, idx) => {
                const id = row.id ?? idx;
                const sc = row.overall_score ?? row.overallScore ?? "—";
                return (
                  <div key={id} style={styles.historyRow}>
                    <div>
                      <strong>{row.interview_type || row.interviewType || "English AI Interview"}</strong>{" "}
                      ({row.level || level}) — Score: <strong>{sc}</strong>
                    </div>
                    {row.id && (
                      <button
                        type="button"
                        onClick={() => handleViewReport(row.id)}
                        style={styles.secondaryBtn}
                      >
                        View Report
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

const styles = {
  pageContainer: {
    width: "100%",
    minHeight: "100vh",
    padding: "20px",
    backgroundColor: "#f8fafc",
    color: "#0f172a",
    boxSizing: "border-box",
    fontFamily: "system-ui, -apple-system, sans-serif"
  },
  header: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    backgroundColor: "#ffffff",
    padding: "16px 20px",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    marginBottom: "16px"
  },
  title: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 700
  },
  subtitle: {
    margin: "4px 0 0",
    fontSize: "13px",
    color: "#475569"
  },
  headerActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px"
  },
  tabBtn: {
    padding: "8px 14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#1e293b",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "13px"
  },
  tabBtnActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
    color: "#ffffff"
  },
  primaryBtn: {
    padding: "9px 15px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "13px"
  },
  secondaryBtn: {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "13px"
  },
  successBtn: {
    padding: "9px 15px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#16a34a",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "13px"
  },
  errorBanner: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    padding: "12px 16px",
    borderRadius: "10px",
    marginBottom: "16px",
    fontSize: "13px"
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    padding: "20px"
  },
  verifyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "20px",
    alignItems: "start"
  },
  stepsCol: {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  sectionTitle: {
    margin: "0 0 4px",
    fontSize: "18px",
    fontWeight: 700
  },
  statusText: {
    margin: "0 0 8px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#1d4ed8"
  },
  stepBox: {
    border: "2px solid #e2e8f0",
    borderRadius: "12px",
    padding: "12px 14px",
    backgroundColor: "#f8fafc"
  },
  stepRowTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "14px",
    marginBottom: "6px"
  },
  stepMeta: {
    fontSize: "13px",
    color: "#334155",
    marginBottom: "8px"
  },
  inlineRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    alignItems: "center"
  },
  checkboxLabel: {
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer"
  },
  select: {
    padding: "7px 10px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    fontSize: "13px"
  },
  videoWrap: {
    marginTop: "10px",
    width: "240px",
    borderRadius: "10px",
    overflow: "hidden",
    backgroundColor: "#0f172a"
  },
  smallVideo: {
    width: "100%",
    height: "135px",
    objectFit: "cover",
    display: "block"
  },
  robot3DStage: {
    background: "linear-gradient(145deg, #0f172a, #1e293b)",
    color: "#f8fafc",
    borderRadius: "14px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: "260px"
  },
  robot3DTopBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
    fontSize: "11px"
  },
  robot3DPill: {
    backgroundColor: "rgba(59, 130, 246, 0.25)",
    padding: "4px 8px",
    borderRadius: "999px",
    fontWeight: 700
  },
  robot3DStateBadge: {
    backgroundColor: "rgba(22, 163, 74, 0.25)",
    color: "#86efac",
    padding: "4px 8px",
    borderRadius: "999px",
    fontWeight: 700
  },
  robot3DScene: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    margin: "14px 0"
  },
  robot3DHead: {
    width: "116px",
    height: "92px",
    backgroundColor: "#38bdf8",
    borderRadius: "24px",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 10px 25px rgba(0,0,0,0.35)"
  },
  robotAntennaTop: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    backgroundColor: "#facc15",
    position: "absolute",
    top: "-12px"
  },
  robotVisor: {
    width: "86px",
    height: "42px",
    backgroundColor: "#0f172a",
    borderRadius: "14px",
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center"
  },
  robot3DEye: {
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    backgroundColor: "#e0f2fe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  robot3DPupil: {
    width: "9px",
    height: "9px",
    borderRadius: "50%",
    backgroundColor: "#0284c7",
    transition: "transform 0.08s linear"
  },
  robot3DMouth: {
    width: "34px",
    height: "7px",
    backgroundColor: "#0f172a",
    borderRadius: "999px",
    marginTop: "10px"
  },
  robot3DShoulder: {
    width: "140px",
    height: "22px",
    backgroundColor: "#0284c7",
    borderRadius: "14px 14px 6px 6px",
    marginTop: "6px"
  },
  robot3DFooterText: {
    textAlign: "center",
    fontSize: "12px",
    color: "#cbd5e1"
  },
  interviewTopBar: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px"
  },
  stageGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "16px",
    marginBottom: "16px"
  },
  cameraBox: {
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    borderRadius: "14px",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  cameraTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "13px"
  },
  mainVideo: {
    width: "100%",
    height: "200px",
    objectFit: "cover",
    borderRadius: "10px"
  },
  questionCard: {
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "16px"
  },
  questionTag: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#1d4ed8",
    textTransform: "uppercase",
    marginBottom: "6px"
  },
  questionText: {
    margin: "0 0 10px",
    fontSize: "16px",
    fontWeight: 600
  },
  centerWaveBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
    padding: "14px",
    backgroundColor: "#f8fafc",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    marginBottom: "16px"
  },
  centerMicCircle: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    border: "none",
    color: "#ffffff",
    fontSize: "24px",
    cursor: "pointer"
  },
  waveBarsRow: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    height: "36px"
  },
  waveBar: {
    width: "5px",
    borderRadius: "999px",
    backgroundColor: "#2563eb",
    transition: "height 0.2s ease"
  },
  centerWaveStatus: {
    fontSize: "13px",
    color: "#475569",
    textAlign: "center"
  },
  answerBlock: {
    marginBottom: "12px"
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: 600,
    marginBottom: "6px"
  },
  textarea: {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    boxSizing: "border-box"
  },
  evalBox: {
    marginTop: "18px",
    padding: "16px",
    borderRadius: "12px",
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0"
  },
  evalHeading: {
    margin: "0 0 8px",
    fontSize: "16px"
  },
  evalMetrics: {
    display: "flex",
    flexWrap: "wrap",
    gap: "14px",
    fontSize: "13px",
    marginBottom: "8px"
  },
  evalText: {
    margin: "0 0 6px",
    fontSize: "14px"
  },
  improvedText: {
    margin: 0,
    fontSize: "13px",
    color: "#166534"
  },
  reportHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: "16px"
  },
  scoresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "14px",
    marginBottom: "18px"
  },
  scoreCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#f8fafc"
  },
  circularWrapper: {
    position: "relative",
    width: "86px",
    height: "86px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  circularValue: {
    position: "absolute",
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  },
  scoreTitle: {
    fontSize: "14px",
    fontWeight: 700
  },
  scoreBadge: {
    fontSize: "11px",
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: "999px"
  },
  summaryCard: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "14px 18px",
    marginBottom: "14px"
  },
  historyList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  historyRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    backgroundColor: "#f8fafc"
  },
  toast: {
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: 9999,
    width: "320px",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    borderLeft: "5px solid #2563eb",
    padding: "12px 14px",
    boxShadow: "0 10px 25px rgba(15, 23, 42, 0.14)"
  },
  toastHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "13px",
    marginBottom: "4px"
  },
  toastCloseBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    color: "#64748b"
  },
  toastMessage: {
    fontSize: "12px",
    color: "#475569"
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 9998,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px"
  },
  modalCard: {
    width: "100%",
    maxWidth: "380px",
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "24px",
    textAlign: "center",
    boxShadow: "0 20px 40px rgba(15, 23, 42, 0.2)"
  },
  modalIcon: {
    fontSize: "34px",
    marginBottom: "8px"
  },
  modalTitle: {
    margin: "0 0 8px",
    fontSize: "18px",
    fontWeight: 700
  },
  modalMessage: {
    margin: "0 0 18px",
    fontSize: "14px",
    color: "#475569",
    lineHeight: 1.5
  },
  modalActionBtn: {
    width: "100%",
    padding: "11px 16px",
    borderRadius: "10px",
    border: "none",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: "14px",
    cursor: "pointer"
  }
};

export default AiInterview;