import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
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

// --------------------------------------------------
// GROQ HELPER FOR ENGLISH AI INTERVIEW
// --------------------------------------------------

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

/* 3D Talking Robot Screen Component */
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
            : "Proctoring Active"}
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
          ? "SmartBot is asking the question..."
          : isListening
          ? "SmartBot is listening to your response..."
          : "AI Proctored Session Monitoring"}
      </div>
    </div>
  );
};

/* Center Listening Mic + Live Waves */
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
          ? "Listening clearly — speak naturally, everything is running smoothly"
          : "Mic ready — auto-starts right after SmartBot finishes speaking"}
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
  // "welcome" | "dashboard" | "setup" | "interview" | "report" | "history" | "viva" | "terminated"
  const [view, setView] = useState("welcome");

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

  const [studentName, setStudentName] = useState("");
  const [studentClass, setStudentClass] = useState(localExpectedClass);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [spokenNameRaw, setSpokenNameRaw] = useState("");
  const [authStatusMsg, setAuthStatusMsg] = useState("");

  // Voice, Camera & Robot Eye states
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [listeningMode, setListeningMode] = useState(null); // null | "name" | "answer"
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });
  const [silenceCountdown, setSilenceCountdown] = useState(null); // 5..1 or null

  // AI Proctoring states (no termination countdown or limit shown to user)
  const [proctorWarningMsg, setProctorWarningMsg] = useState("");
  const tabSwitchCountRef = useRef(0);
  const lastViolationTsRef = useRef(0);

  // Candidate webcam video ref
  const candidateVideoRef = useRef(null);
  const candidateStreamRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const hasSpokenInAnswerRef = useRef(false);
  const answerRef = useRef("");
  const handledNextActionRef = useRef(false);

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Session configuration state ("English AI Interview" | "Student Viva")
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

  // Report & Floating Report Drawer state
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

  // Eye tracking based on mouse movement
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
        // ignore stop errors
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

  const startCandidateCamera = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      return;
    }
    if (candidateStreamRef.current) {
      setCameraReady(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false
      });
      candidateStreamRef.current = stream;
      if (candidateVideoRef.current) {
        candidateVideoRef.current.srcObject = stream;
      }
      setCameraReady(true);
    } catch {
      setCameraReady(false);
    }
  }, []);

  useEffect(() => {
    if (view === "interview") {
      startCandidateCamera();
    } else {
      stopCandidateCamera();
    }
  }, [view, startCandidateCamera, stopCandidateCamera]);

  useEffect(() => {
    if (cameraReady && candidateVideoRef.current && candidateStreamRef.current) {
      candidateVideoRef.current.srcObject = candidateStreamRef.current;
    }
  }, [cameraReady, view]);

  useEffect(() => {
    return () => {
      stopListening();
      stopCandidateCamera();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [stopListening, stopCandidateCamera]);

  // Ref holder for moving to next question after silence countdown
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

  const verifySpokenName = useCallback(
    (transcript) => {
      const clean = (transcript || "").trim();
      setSpokenNameRaw(clean);

      if (!clean) {
        const msg = "I could not hear your name clearly. Please speak your name again.";
        setAuthStatusMsg(msg);
        speakText(msg);
        return;
      }

      const matched = isSpokenNameVerified(clean, localExpectedName);
      if (matched) {
        const verifiedName = localExpectedName || clean;
        setStudentName(verifiedName);
        setIsAuthenticated(true);
        setErrorMsg("");
        sessionStorage.setItem("ssc_student_name", verifiedName);
        sessionStorage.setItem("ssc_student_class", studentClass);

        const greeting = getTimeGreeting();
        const welcomeLine = `${greeting} ${verifiedName}! Hello, I am SmartBot, I will take this ${interviewType}. Please confirm your setup to begin.`;
        setAuthStatusMsg(welcomeLine);
        speakText(welcomeLine);
        setView("setup");
      } else {
        setIsAuthenticated(false);
        const failMsg = `You said "${clean}", which does not match your profile (${
          localExpectedName || "local user"
        }). Please speak your registered name again.`;
        setErrorMsg(failMsg);
        setAuthStatusMsg("Verification failed. Tap mic and speak your registered name.");
        speakText(failMsg);
      }
    },
    [localExpectedName, studentClass, interviewType, speakText]
  );

  const startVoiceRecognition = useCallback(
    (mode) => {
      if (typeof window === "undefined") return;
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setErrorMsg(
          "Your browser does not support voice recognition. Please use Google Chrome or Edge."
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
          setAuthStatusMsg("Listening... Speak your name now.");
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
            verifySpokenName(finalTranscript.trim());
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

      recognition.onspeechend = () => {
        if (mode === "answer" && hasSpokenInAnswerRef.current) {
          startPostAnswerSilenceCountdown();
        }
      };

      recognition.onerror = (event) => {
        clearSilenceCountdown();
        setListeningMode(null);
        if (event.error !== "aborted") {
          setErrorMsg(
            `Mic issue (${event.error}). Please allow microphone permission and try again.`
          );
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
    [stopListening, verifySpokenName, clearSilenceCountdown, startPostAnswerSilenceCountdown]
  );

  // First thing when opening: Time-based greeting + SmartBot intro
  useEffect(() => {
    if (view === "welcome") {
      const greeting = getTimeGreeting();
      const intro = `${greeting}! Hello, I am SmartBot, I will take this ${interviewType}. Please speak your name so I can verify your profile.`;
      setAuthStatusMsg(intro);
      speakText(intro);
    }
  }, [view, interviewType, speakText]);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    setErrorMsg("");
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
    fetchHistory();
  }, [fetchHistory]);

  const dashboardStats = useMemo(() => {
    const scored = history
      .map((item) => Number(item.overall_score ?? item.overallScore))
      .filter((num) => Number.isFinite(num) && num > 0);

    if (scored.length === 0) {
      return {
        totalInterviews: history.length,
        averageScore: 0,
        bestScore: 0
      };
    }

    const total = scored.reduce((a, b) => a + b, 0);
    return {
      totalInterviews: history.length,
      averageScore: Number((total / scored.length).toFixed(1)),
      bestScore: Number(Math.max(...scored).toFixed(1))
    };
  }, [history]);

  const handleToggleMode = (targetMode) => {
    setErrorMsg("");
    setInterviewType(targetMode);
    stopListening();

    if (targetMode === "Student Viva") {
      setView("viva");
      const vivaIntro = `${getTimeGreeting()}! Hello, I am SmartBot, I will take this Student Viva.`;
      speakText(vivaIntro);
    } else {
      if (view === "viva") {
        setView(isAuthenticated ? "setup" : "welcome");
      }
      const engIntro = `${getTimeGreeting()}! Hello, I am SmartBot, I will take this English AI Interview.`;
      speakText(engIntro);
    }
  };

  const generateGroqInterviewQuestion = async ({ qNum, prevList }) => {
    const messages = [
      {
        role: "system",
        content:
          "You are a clear, polite English spoken interviewer. Output ONLY one short spoken interview question (1-2 sentences)."
      },
      {
        role: "user",
        content: `Candidate: ${studentName || "Student"}, Class/Level: ${studentClass} (${level}), Mode: English AI Interview.
Question ${qNum} of ${totalQuestions}.
Previous Q&A: ${JSON.stringify(prevList)}.
Ask a fresh, natural question.`
      }
    ];

    return await callGroqInterview(messages, 350);
  };

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

  const startSessionWithMode = async (chosenMode) => {
    if (!isAuthenticated || !studentName) {
      setErrorMsg("Please verify your name by speaking first on the Welcome screen.");
      setView("welcome");
      return;
    }

    if (chosenMode === "Student Viva") {
      stopListening();
      setView("viva");
      return;
    }

    stopListening();
    tabSwitchCountRef.current = 0;
    setProctorWarningMsg("");
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
          interviewType: chosenMode,
          totalQuestions
        });
        if (res.data?.interviewId) createdId = res.data.interviewId;
        if (res.data?.question) firstQuestion = res.data.question;
      } catch {
        // proceed with Groq directly
      }

      if (!firstQuestion) {
        firstQuestion = await generateGroqInterviewQuestion({
          qNum: 1,
          prevList: []
        });
      }

      setInterviewId(createdId);
      setQuestionNumber(1);
      setCurrentQuestion(firstQuestion);
      setView("interview");

      // After AI question finishes speaking -> auto start listening
      const promptSpeech = `Question 1. ${firstQuestion}`;
      speakText(promptSpeech, () => {
        startVoiceRecognition("answer");
      });
    } catch (err) {
      setErrorMsg(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to start session."
      );
    } finally {
      setStarting(false);
    }
  };

  const handleStartSubmit = async (e) => {
    e.preventDefault();
    await startSessionWithMode(interviewType);
  };

  const handleEvaluateAnswer = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const currentAns = answerRef.current.trim();
    if (!currentAns) {
      setErrorMsg("Please speak or write your answer before submitting.");
      return;
    }

    stopListening();
    setEvaluating(true);
    setErrorMsg("");

    try {
      let parsedEval = null;

      try {
        parsedEval = await evaluateGroqInterviewAnswer({
          questionText: currentQuestion,
          studentAns: currentAns
        });
      } catch {
        const res = await api.post("/api/interview/evaluate", {
          studentId: localUserId,
          interviewId,
          question: currentQuestion,
          answer: currentAns
        });
        const rawEval = res.data?.evaluation || {};
        parsedEval = {
          grammarScore: rawEval.grammarScore ?? 0,
          fluencyScore: rawEval.fluencyScore ?? 0,
          vocabularyScore: rawEval.vocabularyScore ?? 0,
          relevanceScore: rawEval.relevanceScore ?? 0,
          feedback: rawEval.feedback || "",
          mistakes: parseMistakes(rawEval.mistakes),
          improvedAnswer: rawEval.improvedAnswer || ""
        };
      }

      setEvaluation(parsedEval);
      setSessionRecords((prev) => [
        ...prev,
        {
          question_number: questionNumber,
          question: currentQuestion,
          student_answer: currentAns,
          grammar_score: parsedEval.grammarScore,
          fluency_score: parsedEval.fluencyScore,
          vocabulary_score: parsedEval.vocabularyScore,
          relevance_score: parsedEval.relevanceScore,
          feedback: parsedEval.feedback,
          mistakes: parsedEval.mistakes,
          improved_answer: parsedEval.improvedAnswer
        }
      ]);

      if (parsedEval.feedback) {
        speakText(parsedEval.feedback);
      }
    } catch (err) {
      setErrorMsg(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to evaluate answer."
      );
    } finally {
      setEvaluating(false);
    }
  };

  const handleOpenReport = useCallback(
    async (targetId, overrideRecords) => {
      const id = targetId || interviewId;
      stopListening();
      setLoadingReport(true);
      setErrorMsg("");
      setFloatingReportOpen(true);
      setView("report");

      try {
        const records = overrideRecords || sessionRecords;
        let meta = {
          id,
          level,
          interview_type: interviewType
        };
        let list = records;

        if (id && !String(id).startsWith("groq-")) {
          try {
            const res = await api.get(`/api/interview/report/${id}`, {
              params: localUserId ? { studentId: localUserId } : {}
            });
            if (res.data?.interview) meta = res.data.interview;
            if (Array.isArray(res.data?.answers) && res.data.answers.length > 0) {
              list = res.data.answers;
            }
          } catch {
            // use local session records
          }
        }

        const built = buildReportSummary(meta, list, level, interviewType);
        setReportData(built);
        speakText(
          `Session completed. Your overall score is ${built.overallScore} out of 100.`
        );
      } catch (err) {
        setErrorMsg(
          err?.response?.data?.message || "Unable to load report."
        );
      } finally {
        setLoadingReport(false);
      }
    },
    [interviewId, stopListening, sessionRecords, level, interviewType, localUserId, speakText]
  );

  // Auto-submit on last question with voice announcement ("Now submitting...")
  const handleCompleteInterview = useCallback(async () => {
    stopListening();
    setCompleting(true);
    setErrorMsg("");

    let updatedRecords = sessionRecords;
    const pendingAns = answerRef.current.trim();
    if (pendingAns && currentQuestion) {
      const alreadyRecorded = sessionRecords.some(
        (r) => Number(r.question_number) === Number(questionNumber)
      );
      if (!alreadyRecorded) {
        updatedRecords = [
          ...sessionRecords,
          {
            question_number: questionNumber,
            question: currentQuestion,
            student_answer: pendingAns,
            grammar_score: evaluation?.grammarScore ?? 70,
            fluency_score: evaluation?.fluencyScore ?? 70,
            vocabulary_score: evaluation?.vocabularyScore ?? 70,
            relevance_score: evaluation?.relevanceScore ?? 70,
            feedback: evaluation?.feedback || "Submitted at session end.",
            mistakes: evaluation?.mistakes || [],
            improved_answer: evaluation?.improvedAnswer || ""
          }
        ];
        setSessionRecords(updatedRecords);
      }
    }

    speakText("Now submitting your interview.", async () => {
      try {
        if (interviewId && !String(interviewId).startsWith("groq-")) {
          try {
            await api.post("/api/interview/complete", {
              studentId: localUserId,
              interviewId
            });
          } catch {
            // continue to report
          }
        }
        await fetchHistory();
        await handleOpenReport(interviewId, updatedRecords);
      } catch (err) {
        setErrorMsg(
          err?.response?.data?.message || "Unable to complete session."
        );
      } finally {
        setCompleting(false);
      }
    });
  }, [
    stopListening,
    sessionRecords,
    currentQuestion,
    questionNumber,
    evaluation,
    speakText,
    interviewId,
    localUserId,
    fetchHistory,
    handleOpenReport
  ]);

  const handleNextQuestion = useCallback(async () => {
    stopListening();
    setLoadingNext(true);
    setErrorMsg("");

    try {
      const nextNum = questionNumber + 1;
      let nextQ = "";

      if (interviewId && !String(interviewId).startsWith("groq-")) {
        try {
          const res = await api.get(`/api/interview/next/${interviewId}`, {
            params: localUserId ? { studentId: localUserId } : {}
          });
          if (res.data?.completed) {
            await handleCompleteInterview();
            return;
          }
          nextQ = res.data?.question || "";
        } catch {
          // fallback to Groq below
        }
      }

      if (!nextQ) {
        nextQ = await generateGroqInterviewQuestion({
          qNum: nextNum,
          prevList: sessionRecords
        });
      }

      setCurrentQuestion(nextQ);
      setQuestionNumber(nextNum);
      setAnswer("");
      setEvaluation(null);

      speakText(`Question ${nextNum}. ${nextQ}`, () => {
        startVoiceRecognition("answer");
      });
    } catch (err) {
      setErrorMsg(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to generate next question."
      );
    } finally {
      setLoadingNext(false);
    }
  }, [
    stopListening,
    questionNumber,
    interviewId,
    localUserId,
    handleCompleteInterview,
    sessionRecords,
    speakText,
    startVoiceRecognition
  ]);

  // When user stops speaking and 5..4..3..2..1 finishes:
  // If on last question -> say "Now submitting" & auto-submit; else -> say thank you & go next
  useEffect(() => {
    advanceAfterSilenceRef.current = async () => {
      if (questionNumber >= totalQuestions) {
        await handleCompleteInterview();
        return;
      }

      const spokenAnswer = answerRef.current.trim();
      const thankLine = spokenAnswer
        ? "Thank you for what you told me. Moving to the next question."
        : "Thank you. Moving to the next question.";

      speakText(thankLine, async () => {
        await handleNextQuestion();
      });
    };
  }, [questionNumber, totalQuestions, handleCompleteInterview, speakText, handleNextQuestion]);

  // AI Proctoring: Tab switch warning on 1st switch, terminate on 2nd switch
  // Note: Do NOT display termination timing or how many switches remain
  useEffect(() => {
    if (view !== "interview") return;

    const triggerProctorViolation = () => {
      const now = Date.now();
      if (now - lastViolationTsRef.current < 1200) return;
      lastViolationTsRef.current = now;

      tabSwitchCountRef.current += 1;

      if (tabSwitchCountRef.current === 1) {
        const warnText =
          "AI Proctor Warning: Tab switching is not allowed during the interview. Please stay on this interview screen.";
        setProctorWarningMsg(warnText);
        speakText(warnText);
      } else {
        stopListening();
        stopCandidateCamera();
        const termMsg =
          "Session terminated due to repeated tab switching detected by AI Proctor.";
        setProctorWarningMsg(termMsg);
        setView("terminated");
        speakText(termMsg);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerProctorViolation();
      }
    };

    const handleWindowBlur = () => {
      triggerProctorViolation();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [view, speakText, stopListening, stopCandidateCamera]);

  const progressPercent = useMemo(() => {
    if (!totalQuestions) return 0;
    const completedSteps = evaluation ? questionNumber : questionNumber - 1;
    return Math.max(
      0,
      Math.min(100, Math.round((completedSteps / totalQuestions) * 100))
    );
  }, [questionNumber, totalQuestions, evaluation]);

  const activeModeToggle =
    view === "viva" || interviewType === "Student Viva"
      ? "Student Viva"
      : "English AI Interview";

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes micPulse {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.55); }
          70% { box-shadow: 0 0 0 14px rgba(34, 197, 94, 0); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        @keyframes waveBounce {
          0%, 100% { transform: scaleY(0.45); }
          50% { transform: scaleY(1.35); }
        }
        @keyframes robotFloat {
          0%, 100% { transform: translateY(0px) rotateY(-4deg); }
          50% { transform: translateY(-6px) rotateY(4deg); }
        }
        @keyframes robotTalk {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-4px) scale(1.03); }
        }
        @keyframes mouthSpeak {
          0%, 100% { height: 6px; width: 26px; border-radius: 6px; }
          50% { height: 15px; width: 20px; border-radius: 10px; }
        }
        .ssc-card-anim { animation: fadeSlideUp 0.45s ease-out both; }
        .ssc-mic-active { animation: micPulse 1.5s infinite; }
        .ssc-wave-bar-active { animation: waveBounce 0.75s ease-in-out infinite; }
        .ssc-robot-float { animation: robotFloat 3s ease-in-out infinite; }
        .ssc-robot-talk { animation: robotTalk 0.5s ease-in-out infinite; }
        .ssc-mouth-speak { animation: mouthSpeak 0.28s ease-in-out infinite; }
      `}</style>

      <div style={styles.container}>
        {/* Top Header */}
        <header style={styles.header} className="ssc-card-anim">
          <div style={{ flex: 1, minWidth: "260px" }}>
            <div style={styles.brandBadgeRow}>
              <span style={styles.pill}>🎓 Smart Students Classes</span>
              <span style={styles.proctorPill}>🛡️ AI Proctored</span>
              {isAuthenticated && studentName && (
                <span style={styles.studentChip}>
                  ✓ {studentName} • {studentClass}
                </span>
              )}
              {isSpeaking && (
                <span style={styles.speakingTag}>🔊 SmartBot Speaking...</span>
              )}
            </div>
            <h1 style={styles.title}>SmartBot AI Interview</h1>
            <p style={styles.subtitle}>
              {getTimeGreeting()} — Hello, I am SmartBot, I will take this{" "}
              <strong>{activeModeToggle}</strong>.
            </p>
          </div>

          <div style={styles.navButtons}>
            {/* Only 2 Mode Toggles: English AI Interview & Student Viva */}
            <div style={styles.modeToggleGroup} role="group" aria-label="Mode Toggle">
              <button
                type="button"
                onClick={() => handleToggleMode("English AI Interview")}
                style={{
                  ...styles.toggleBtn,
                  ...(activeModeToggle === "English AI Interview"
                    ? styles.toggleBtnActive
                    : {})
                }}
              >
                English AI Interview
              </button>

              <button
                type="button"
                onClick={() => handleToggleMode("Student Viva")}
                style={{
                  ...styles.toggleBtn,
                  ...(activeModeToggle === "Student Viva"
                    ? styles.toggleBtnVivaActive
                    : {})
                }}
              >
                Student Viva
              </button>
            </div>

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
              style={{
                ...styles.navBtn,
                ...(voiceEnabled ? styles.voiceOnBtn : {})
              }}
            >
              {voiceEnabled ? "🔊 Voice: ON" : "🔇 Voice: OFF"}
            </button>

            <button
              type="button"
              onClick={() => {
                setErrorMsg("");
                setView("welcome");
              }}
              style={{
                ...styles.navBtn,
                ...(view === "welcome" ? styles.navBtnActive : {})
              }}
            >
              Verify
            </button>

            <button
              type="button"
              onClick={() => {
                setErrorMsg("");
                setView("dashboard");
              }}
              style={{
                ...styles.navBtn,
                ...(view === "dashboard" ? styles.navBtnActive : {})
              }}
            >
              Dashboard
            </button>

            <button
              type="button"
              onClick={() => {
                setErrorMsg("");
                setView("history");
                fetchHistory();
              }}
              style={{
                ...styles.navBtn,
                ...(view === "history" ? styles.navBtnActive : {})
              }}
            >
              History
            </button>

            <button
              type="button"
              onClick={() => setFloatingReportOpen((prev) => !prev)}
              style={{
                ...styles.navBtn,
                ...(floatingReportOpen ? styles.reportBtnActive : {})
              }}
            >
              {floatingReportOpen ? "Hide Report" : "Live Report"}
            </button>
          </div>
        </header>

        {proctorWarningMsg && view === "interview" && (
          <div style={styles.proctorWarningBanner} role="alert">
            <span>🛡️ {proctorWarningMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div style={styles.errorBanner} role="alert">
            <span>⚠️ {errorMsg}</span>
            <button
              type="button"
              onClick={() => setErrorMsg("")}
              style={styles.dismissBtn}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* STUDENT VIVA VIEW (Separate component) */}
        {view === "viva" && (
          <section className="ssc-card-anim" style={styles.vivaShell}>
            <div style={styles.vivaTopBar}>
              <div>
                <span style={styles.vivaBadge}>Separate Viva Module</span>
                <h2 style={styles.vivaHeading}>Student Viva</h2>
              </div>
              <button
                type="button"
                onClick={() => handleToggleMode("English AI Interview")}
                style={styles.secondaryBtn}
              >
                ← Back to English AI Interview
              </button>
            </div>
            <StudentViva
              userId={localUserId}
              studentName={studentName || localExpectedName}
              studentClass={studentClass || localExpectedClass}
            />
          </section>
        )}

        {/* TERMINATED BY AI PROCTOR */}
        {view === "terminated" && (
          <section style={styles.terminatedCard} className="ssc-card-anim">
            <div style={styles.terminatedBadge}>🛡️ AI Proctor Alert</div>
            <h2 style={styles.terminatedTitle}>Interview Session Terminated</h2>
            <p style={styles.terminatedText}>
              {proctorWarningMsg ||
                "Your session was ended due to repeated tab switching."}
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setView("setup")}
                style={styles.primaryBtn}
              >
                Return to Setup
              </button>
              <button
                type="button"
                onClick={() => {
                  setView("history");
                  fetchHistory();
                }}
                style={styles.secondaryBtn}
              >
                View History
              </button>
            </div>
          </section>
        )}

        {/* WELCOME SCREEN */}
        {view === "welcome" && (
          <section style={styles.welcomeCard} className="ssc-card-anim">
            <div style={styles.welcomeBadge}>
              {getTimeGreeting()} • SmartBot Voice Verification
            </div>
            <h2 style={styles.welcomeTitle}>
              Hello, I am SmartBot, I will take this {activeModeToggle}.
            </h2>
            <p style={styles.welcomeText}>
              Tap the microphone button and speak your name to verify against your
              account ({localExpectedName || "Local Profile"}
              {localUserId ? ` • ID: ${localUserId}` : ""}).
            </p>

            <div style={styles.statusBox}>{authStatusMsg}</div>

            <div style={styles.classSelectRow}>
              <label htmlFor="welcome-class-select" style={styles.label}>
                Student Class
              </label>
              <select
                id="welcome-class-select"
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                style={styles.select}
              >
                {STUDENT_CLASSES.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.voiceVerifyCenter}>
              <button
                type="button"
                onClick={() =>
                  listeningMode === "name"
                    ? stopListening()
                    : startVoiceRecognition("name")
                }
                className={listeningMode === "name" ? "ssc-mic-active" : ""}
                style={{
                  ...styles.bigMicBtn,
                  backgroundColor: listeningMode === "name" ? "#dc2626" : "#2563eb"
                }}
              >
                {listeningMode === "name"
                  ? "🛑 Listening... Tap to Stop"
                  : "🎤 Speak Your Name to Verify"}
              </button>

              {spokenNameRaw && (
                <div style={styles.transcriptPill}>
                  Heard: <strong>&ldquo;{spokenNameRaw}&rdquo;</strong>
                </div>
              )}

              {localExpectedName && (
                <button
                  type="button"
                  onClick={() => verifySpokenName(localExpectedName)}
                  style={styles.linkBtn}
                >
                  Quick Verify as {localExpectedName}
                </button>
              )}
            </div>
          </section>
        )}

        {/* DASHBOARD VIEW */}
        {view === "dashboard" && (
          <section className="ssc-card-anim">
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Total Interviews</div>
                <div style={styles.statValue}>{dashboardStats.totalInterviews}</div>
                <div style={styles.statHint}>Completed interview records</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Average Score</div>
                <div style={styles.statValue}>{dashboardStats.averageScore}</div>
                <div style={styles.statHint}>Out of 100 points</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Best Score</div>
                <div style={styles.statValue}>{dashboardStats.bestScore}</div>
                <div style={styles.statHint}>Highest achieved score</div>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.dashActionsHeader}>
                <div>
                  <h2 style={styles.cardTitle}>Ready for Your Next AI Interview?</h2>
                  <p style={styles.cardSubtitle}>
                    AI proctored session with live 3D SmartBot and auto-listening.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!isAuthenticated) {
                      setView("welcome");
                    } else {
                      setView("setup");
                    }
                  }}
                  style={styles.primaryBtn}
                >
                  + Start New Interview
                </button>
              </div>
            </div>
          </section>
        )}

        {/* SETUP VIEW */}
        {view === "setup" && (
          <section style={styles.card} className="ssc-card-anim">
            <h2 style={styles.cardTitle}>Configure English AI Interview</h2>
            <p style={styles.cardSubtitle}>
              {getTimeGreeting()},{" "}
              <strong>{studentName || localExpectedName || "Student"}</strong>! Select
              difficulty and question count.
            </p>

            <form onSubmit={handleStartSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Difficulty Level</label>
                <div style={styles.segmentedRow}>
                  {LEVELS.map((lvl) => {
                    const active = level === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setLevel(lvl)}
                        style={{
                          ...styles.segmentBtn,
                          ...(active ? styles.segmentBtnActive : {})
                        }}
                      >
                        {lvl}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Number of Questions</label>
                <div style={styles.segmentedRow}>
                  {QUESTION_COUNTS.map((count) => {
                    const active = totalQuestions === count;
                    return (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setTotalQuestions(count)}
                        style={{
                          ...styles.segmentBtn,
                          ...(active ? styles.segmentBtnActive : {})
                        }}
                      >
                        {count} Questions
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={styles.submitRow}>
                <button
                  type="submit"
                  disabled={starting}
                  style={{
                    ...styles.primaryBtn,
                    opacity: starting ? 0.7 : 1,
                    cursor: starting ? "not-allowed" : "pointer"
                  }}
                >
                  {starting ? "Starting..." : "Start Proctored Interview"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ACTIVE AI PROCTORED 2-SCREEN SPLIT INTERVIEW VIEW */}
        {view === "interview" && (
          <section style={styles.card} className="ssc-card-anim">
            <div style={styles.progressSection}>
              <div style={styles.progressMeta}>
                <span>
                  Question <strong>{questionNumber}</strong> of{" "}
                  <strong>{totalQuestions}</strong>
                </span>
                <span>
                  English AI Interview • {level} • 🛡️ AI Proctored
                </span>
              </div>
              <div style={styles.progressTrack}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${progressPercent}%`
                  }}
                />
              </div>
            </div>

            {/* 2-Screen Split: Left = Candidate Giving Interview, Right = 3D Talking Robot */}
            <div style={styles.splitScreenGrid}>
              <div style={styles.candidateScreenPane}>
                <div style={styles.splitPaneHeader}>
                  <span style={styles.paneTagLive}>● CANDIDATE</span>
                  <span style={styles.paneNameText}>
                    {studentName || localExpectedName || "Candidate"} ({studentClass})
                  </span>
                </div>
                <div style={styles.candidateFeedBox}>
                  <video
                    ref={candidateVideoRef}
                    autoPlay
                    muted
                    playsInline
                    style={{
                      ...styles.candidateVideo,
                      display: cameraReady ? "block" : "none"
                    }}
                  />
                  {!cameraReady && (
                    <div style={styles.candidateFallbackBox}>
                      <div style={styles.candidateAvatarCircle}>
                        {(studentName || localExpectedName || "S").charAt(0).toUpperCase()}
                      </div>
                      <div style={styles.candidateFallbackName}>
                        {studentName || localExpectedName || "Candidate"}
                      </div>
                      <div style={styles.candidateFallbackSub}>
                        Giving live interview • {level}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.robotScreenPane}>
                <Smart3DRobotStage
                  pupilOffset={pupilOffset}
                  isListening={listeningMode === "answer"}
                  isSpeaking={isSpeaking}
                  countdown={silenceCountdown}
                />
              </div>
            </div>

            {/* Center Listening Mic + Live Waves */}
            <CenterListeningWaves
              isListening={listeningMode === "answer"}
              countdown={silenceCountdown}
              onToggleMic={() =>
                listeningMode === "answer"
                  ? stopListening()
                  : startVoiceRecognition("answer")
              }
            />

            <div style={styles.questionBox}>
              <div style={styles.questionHeaderRow}>
                <span style={styles.qBadge}>Q{questionNumber}</span>
                <button
                  type="button"
                  onClick={() =>
                    speakText(`Question ${questionNumber}. ${currentQuestion}`, () => {
                      startVoiceRecognition("answer");
                    })
                  }
                  style={styles.replayBtn}
                >
                  🔊 Speak Question
                </button>
              </div>
              <p style={styles.questionText}>{currentQuestion}</p>
            </div>

            <form onSubmit={handleEvaluateAnswer} style={styles.form}>
              <div style={styles.formGroup}>
                <label htmlFor="answer-textarea" style={styles.label}>
                  Live Spoken Transcript / Answer
                </label>
                <textarea
                  id="answer-textarea"
                  rows={4}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="SmartBot is listening automatically after each question..."
                  style={styles.textarea}
                />
              </div>

              <div style={styles.interviewActions}>
                <button
                  type="submit"
                  disabled={evaluating || !answer.trim()}
                  style={{
                    ...styles.primaryBtn,
                    opacity: evaluating || !answer.trim() ? 0.65 : 1,
                    cursor:
                      evaluating || !answer.trim() ? "not-allowed" : "pointer"
                  }}
                >
                  {evaluating ? "Evaluating..." : "Evaluate Answer"}
                </button>

                {questionNumber < totalQuestions ? (
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    disabled={loadingNext}
                    style={styles.secondaryBtn}
                  >
                    {loadingNext ? "Loading Next..." : "Next Question →"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCompleteInterview}
                    disabled={completing}
                    style={styles.successBtn}
                  >
                    {completing ? "Submitting..." : "Submit Interview ✓"}
                  </button>
                )}
              </div>
            </form>

            {evaluation && (
              <div style={styles.evalBox} className="ssc-card-anim">
                <h3 style={styles.evalTitle}>Answer Evaluation</h3>

                <div style={styles.miniScoresGrid}>
                  <div style={styles.miniScoreCard}>
                    <div style={styles.miniScoreLabel}>Grammar</div>
                    <div style={styles.miniScoreNum}>{evaluation.grammarScore}/100</div>
                  </div>
                  <div style={styles.miniScoreCard}>
                    <div style={styles.miniScoreLabel}>Fluency</div>
                    <div style={styles.miniScoreNum}>{evaluation.fluencyScore}/100</div>
                  </div>
                  <div style={styles.miniScoreCard}>
                    <div style={styles.miniScoreLabel}>Vocabulary</div>
                    <div style={styles.miniScoreNum}>
                      {evaluation.vocabularyScore}/100
                    </div>
                  </div>
                  <div style={styles.miniScoreCard}>
                    <div style={styles.miniScoreLabel}>Relevance</div>
                    <div style={styles.miniScoreNum}>{evaluation.relevanceScore}/100</div>
                  </div>
                </div>

                {evaluation.feedback && (
                  <div style={styles.feedbackBlock}>
                    <strong>Feedback:</strong> {evaluation.feedback}
                  </div>
                )}

                {evaluation.mistakes && evaluation.mistakes.length > 0 && (
                  <div style={styles.mistakesBlock}>
                    <strong>Areas to Refine:</strong>
                    <ul style={styles.mistakeList}>
                      {evaluation.mistakes.map((m, idx) => (
                        <li key={idx} style={styles.mistakeItem}>
                          <span>{m.mistake}</span>
                          {m.explanation && (
                            <span style={styles.mistakeTip}> — {m.explanation}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {evaluation.improvedAnswer && (
                  <div style={styles.improvedBlock}>
                    <strong>Suggested Better Response:</strong>
                    <p style={styles.improvedText}>{evaluation.improvedAnswer}</p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* REPORT VIEW */}
        {view === "report" && (
          <section className="ssc-card-anim">
            {loadingReport ? (
              <div style={styles.card}>Loading your performance report...</div>
            ) : reportData ? (
              <>
                <div style={styles.reportHero}>
                  <div>
                    <div style={styles.reportTag}>
                      {reportData.interviewType} • {reportData.level}
                    </div>
                    <h2 style={styles.reportHeading}>Performance Summary Report</h2>
                    <p style={styles.reportSub}>
                      Candidate: <strong>{studentName || localExpectedName || "Student"}</strong>
                    </p>
                  </div>
                  <div style={styles.overallCircle}>
                    <div style={styles.overallNum}>{reportData.overallScore}</div>
                    <div style={styles.overallDenom}>/ 100</div>
                  </div>
                </div>

                <div style={styles.scoresGrid}>
                  <ScoreCard label="Grammar" score={reportData.grammarScore} />
                  <ScoreCard label="Fluency" score={reportData.fluencyScore} />
                  <ScoreCard label="Vocabulary" score={reportData.vocabularyScore} />
                  <ScoreCard label="Relevance" score={reportData.relevanceScore} />
                </div>

                <div style={styles.twoColGrid}>
                  <div style={styles.card}>
                    <h3 style={styles.sectionHeading}>Strengths</h3>
                    <ul style={styles.bulletList}>
                      {reportData.strengths.map((item, idx) => (
                        <li key={idx} style={styles.bulletItem}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div style={styles.card}>
                    <h3 style={styles.sectionHeading}>Areas for Improvement</h3>
                    {reportData.areasForImprovement.length > 0 ? (
                      <ul style={styles.bulletList}>
                        {reportData.areasForImprovement.map((item, idx) => (
                          <li key={idx} style={styles.bulletItem}>
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={styles.mutedText}>
                        Strong performance across all evaluated skills.
                      </p>
                    )}
                  </div>
                </div>

                <div style={styles.card}>
                  <h3 style={styles.sectionHeading}>Actionable Suggestions</h3>
                  <ul style={styles.bulletList}>
                    {reportData.suggestions.map((tip, idx) => (
                      <li key={idx} style={styles.bulletItem}>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={styles.card}>
                  <h3 style={styles.sectionHeading}>Question-by-Question Breakdown</h3>
                  {reportData.answers && reportData.answers.length > 0 ? (
                    <div style={styles.qaList}>
                      {reportData.answers.map((row, idx) => (
                        <div key={row.id || idx} style={styles.qaCard}>
                          <div style={styles.qaQuestion}>
                            Q{row.question_number || idx + 1}: {row.question}
                          </div>
                          <div style={styles.qaAnswer}>
                            <strong>Your Answer:</strong> {row.student_answer || row.answer}
                          </div>
                          {row.feedback && (
                            <div style={styles.qaFeedback}>
                              <strong>Feedback:</strong> {row.feedback}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={styles.mutedText}>
                      Detailed question answers will appear here once recorded.
                    </p>
                  )}
                </div>
              </>
            ) : null}
          </section>
        )}

        {/* HISTORY VIEW */}
        {view === "history" && (
          <section style={styles.card} className="ssc-card-anim">
            <div style={styles.historyHeader}>
              <div>
                <h2 style={styles.cardTitle}>Past Interviews</h2>
                <p style={styles.cardSubtitle}>
                  Review your previous AI interview attempts.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setView(isAuthenticated ? "setup" : "welcome")}
                style={styles.primaryBtn}
              >
                + Start Interview
              </button>
            </div>

            {loadingHistory ? (
              <p style={styles.mutedText}>Loading history...</p>
            ) : history.length === 0 ? (
              <div style={styles.emptyHistory}>
                <p style={styles.mutedText}>No past interviews found yet.</p>
                <button
                  type="button"
                  onClick={() => setView(isAuthenticated ? "setup" : "welcome")}
                  style={styles.primaryBtn}
                >
                  Start First Interview
                </button>
              </div>
            ) : (
              <div style={styles.historyList}>
                {history.map((item, idx) => {
                  const scoreVal = item.overall_score ?? item.overallScore;
                  const typeVal =
                    item.interview_type || item.interviewType || "English AI Interview";
                  const dateRaw = item.created_at || item.createdAt;
                  const formattedDate = dateRaw
                    ? new Date(dateRaw).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      })
                    : "Recent";

                  return (
                    <div key={item.id || idx} style={styles.historyItem}>
                      <div>
                        <div style={styles.historyTitle}>
                          {typeVal} •{" "}
                          <span style={styles.levelTag}>{item.level || "Beginner"}</span>
                        </div>
                        <div style={styles.historyMeta}>
                          {formattedDate} • Status: {item.status || "Completed"}
                        </div>
                      </div>

                      <div style={styles.historyRight}>
                        <div style={styles.historyScore}>
                          {scoreVal !== undefined && scoreVal !== null
                            ? `${Number(scoreVal).toFixed(1)}/100`
                            : "—"}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenReport(item.id)}
                          style={styles.viewReportBtn}
                        >
                          View Report
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>

      {/* FLOATING LIVE / LATEST REPORT DRAWER */}
      {floatingReportOpen && (
        <aside style={styles.floatingReportBox} className="ssc-card-anim">
          <div style={styles.floatingHeader}>
            <div>
              <div style={styles.floatingTitle}>📄 Live / Latest Report</div>
              <div style={styles.floatingSub}>
                {studentName || localExpectedName || "Student"} • Q{questionNumber}/
                {totalQuestions}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFloatingReportOpen(false)}
              style={styles.floatingCloseBtn}
              title="Minimize Report"
            >
              ✕
            </button>
          </div>

          {evaluation ? (
            <div style={styles.floatingBody}>
              <div style={styles.floatingMiniGrid}>
                <div style={styles.floatingStat}>
                  <span>Grammar</span>
                  <strong>{evaluation.grammarScore}</strong>
                </div>
                <div style={styles.floatingStat}>
                  <span>Fluency</span>
                  <strong>{evaluation.fluencyScore}</strong>
                </div>
                <div style={styles.floatingStat}>
                  <span>Vocab</span>
                  <strong>{evaluation.vocabularyScore}</strong>
                </div>
                <div style={styles.floatingStat}>
                  <span>Relevance</span>
                  <strong>{evaluation.relevanceScore}</strong>
                </div>
              </div>
              {evaluation.feedback && (
                <p style={styles.floatingFeedback}>{evaluation.feedback}</p>
              )}
              {interviewId && (
                <button
                  type="button"
                  onClick={() => handleOpenReport(interviewId)}
                  style={styles.floatingFullBtn}
                >
                  Open Full Report →
                </button>
              )}
            </div>
          ) : reportData ? (
            <div style={styles.floatingBody}>
              <div style={styles.floatingOverallRow}>
                <span>Overall Score</span>
                <strong style={{ fontSize: "18px", color: "#1d4ed8" }}>
                  {reportData.overallScore}/100
                </strong>
              </div>
              <button
                type="button"
                onClick={() => setView("report")}
                style={styles.floatingFullBtn}
              >
                View Full Summary →
              </button>
            </div>
          ) : (
            <p style={styles.floatingEmpty}>
              Complete an answer or finish an interview to view live report metrics here.
            </p>
          )}
        </aside>
      )}
    </div>
  );
};

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #eff6ff 0%, #f8fafc 45%, #eef2ff 100%)",
    padding: "28px 16px 90px",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Inter, sans-serif",
    color: "#0f172a"
  },
  container: {
    maxWidth: "1040px",
    margin: "0 auto"
  },
  header: {
    backgroundColor: "#ffffff",
    borderRadius: "18px",
    padding: "20px 24px",
    boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.08)",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "22px"
  },
  brandBadgeRow: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "6px"
  },
  pill: {
    display: "inline-block",
    backgroundColor: "#dbeafe",
    color: "#1e40af",
    fontSize: "12px",
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: "999px"
  },
  proctorPill: {
    display: "inline-block",
    backgroundColor: "#fef3c7",
    color: "#92400e",
    fontSize: "12px",
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: "999px"
  },
  studentChip: {
    display: "inline-block",
    backgroundColor: "#dcfce7",
    color: "#166534",
    fontSize: "12px",
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: "999px"
  },
  speakingTag: {
    display: "inline-block",
    backgroundColor: "#e0f2fe",
    color: "#0369a1",
    fontSize: "12px",
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: "999px"
  },
  title: {
    margin: "2px 0 4px",
    fontSize: "24px",
    fontWeight: 800,
    color: "#0f172a"
  },
  subtitle: {
    margin: 0,
    fontSize: "14px",
    color: "#475569"
  },
  navButtons: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    alignItems: "center"
  },
  modeToggleGroup: {
    display: "inline-flex",
    backgroundColor: "#e2e8f0",
    padding: "3px",
    borderRadius: "12px",
    gap: "4px"
  },
  toggleBtn: {
    padding: "7px 12px",
    borderRadius: "9px",
    border: "none",
    backgroundColor: "transparent",
    color: "#334155",
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer"
  },
  toggleBtnActive: {
    backgroundColor: "#2563eb",
    color: "#ffffff"
  },
  toggleBtnVivaActive: {
    backgroundColor: "#059669",
    color: "#ffffff"
  },
  navBtn: {
    padding: "8px 14px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#f8fafc",
    color: "#334155",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer"
  },
  navBtnActive: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    borderColor: "#2563eb"
  },
  voiceOnBtn: {
    backgroundColor: "#ecfdf5",
    color: "#047857",
    borderColor: "#6ee7b7"
  },
  reportBtnActive: {
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    borderColor: "#93c5fd"
  },
  proctorWarningBanner: {
    backgroundColor: "#fffbeb",
    border: "1px solid #f59e0b",
    color: "#92400e",
    padding: "12px 16px",
    borderRadius: "12px",
    marginBottom: "16px",
    fontSize: "14px",
    fontWeight: 700
  },
  errorBanner: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    padding: "12px 16px",
    borderRadius: "12px",
    marginBottom: "18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "14px",
    fontWeight: 500
  },
  dismissBtn: {
    background: "transparent",
    border: "none",
    color: "#991b1b",
    fontWeight: 700,
    cursor: "pointer",
    textDecoration: "underline"
  },
  vivaShell: {
    backgroundColor: "#ffffff",
    borderRadius: "18px",
    padding: "20px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.08)"
  },
  vivaTopBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    paddingBottom: "14px",
    marginBottom: "16px",
    borderBottom: "1px solid #e2e8f0"
  },
  vivaBadge: {
    display: "inline-block",
    backgroundColor: "#dcfce7",
    color: "#166534",
    fontSize: "12px",
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: "999px",
    marginBottom: "4px"
  },
  vivaHeading: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 800,
    color: "#0f172a"
  },
  terminatedCard: {
    backgroundColor: "#ffffff",
    borderRadius: "20px",
    padding: "36px 24px",
    border: "1px solid #fecaca",
    boxShadow: "0 12px 28px -8px rgba(220, 38, 38, 0.14)",
    textAlign: "center"
  },
  terminatedBadge: {
    display: "inline-block",
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    fontSize: "12px",
    fontWeight: 800,
    padding: "5px 12px",
    borderRadius: "999px",
    marginBottom: "10px"
  },
  terminatedTitle: {
    margin: "0 0 8px",
    fontSize: "24px",
    fontWeight: 800,
    color: "#7f1d1d"
  },
  terminatedText: {
    margin: "0 auto 20px",
    maxWidth: "540px",
    fontSize: "15px",
    color: "#475569",
    lineHeight: 1.55
  },
  welcomeCard: {
    backgroundColor: "#ffffff",
    borderRadius: "20px",
    padding: "34px 28px",
    boxShadow: "0 14px 30px -8px rgba(37, 99, 235, 0.12)",
    border: "1px solid #e2e8f0",
    textAlign: "center"
  },
  welcomeBadge: {
    display: "inline-block",
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    padding: "6px 14px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: 700,
    marginBottom: "12px"
  },
  welcomeTitle: {
    margin: "0 0 10px",
    fontSize: "26px",
    fontWeight: 800,
    color: "#0f172a"
  },
  welcomeText: {
    margin: "0 auto 18px",
    maxWidth: "600px",
    fontSize: "15px",
    lineHeight: 1.6,
    color: "#475569"
  },
  statusBox: {
    maxWidth: "640px",
    margin: "0 auto 18px",
    padding: "12px 16px",
    borderRadius: "12px",
    backgroundColor: "#f0f9ff",
    border: "1px solid #bae6fd",
    color: "#0c4a6e",
    fontSize: "14px",
    fontWeight: 600
  },
  classSelectRow: {
    maxWidth: "300px",
    margin: "0 auto 20px",
    textAlign: "left"
  },
  voiceVerifyCenter: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px"
  },
  bigMicBtn: {
    color: "#ffffff",
    border: "none",
    borderRadius: "999px",
    padding: "15px 28px",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer"
  },
  transcriptPill: {
    backgroundColor: "#f1f5f9",
    color: "#1e293b",
    padding: "6px 14px",
    borderRadius: "999px",
    fontSize: "13px"
  },
  linkBtn: {
    background: "transparent",
    border: "none",
    color: "#2563eb",
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer",
    textDecoration: "underline"
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "20px"
  },
  statCard: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 8px 20px -6px rgba(15, 23, 42, 0.07)",
    border: "1px solid #e2e8f0"
  },
  statLabel: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#64748b",
    marginBottom: "6px"
  },
  statValue: {
    fontSize: "30px",
    fontWeight: 800,
    color: "#0f172a",
    marginBottom: "4px"
  },
  statHint: {
    fontSize: "12px",
    color: "#94a3b8"
  },
  dashActionsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px"
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "18px",
    padding: "24px",
    boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.08)",
    border: "1px solid #e2e8f0",
    marginBottom: "20px"
  },
  cardTitle: {
    margin: "0 0 6px",
    fontSize: "20px",
    fontWeight: 700,
    color: "#0f172a"
  },
  cardSubtitle: {
    margin: "0 0 18px",
    fontSize: "14px",
    color: "#64748b"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px"
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  label: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#1e293b"
  },
  select: {
    width: "100%",
    padding: "11px 14px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    backgroundColor: "#ffffff",
    color: "#0f172a"
  },
  segmentedRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap"
  },
  segmentBtn: {
    flex: "1 1 120px",
    padding: "11px 14px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#f8fafc",
    color: "#334155",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer"
  },
  segmentBtnActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#2563eb",
    color: "#1d4ed8",
    fontWeight: 700
  },
  submitRow: {
    marginTop: "6px"
  },
  primaryBtn: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "12px",
    padding: "12px 22px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer"
  },
  secondaryBtn: {
    backgroundColor: "#f1f5f9",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    padding: "11px 18px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer"
  },
  successBtn: {
    backgroundColor: "#16a34a",
    color: "#ffffff",
    border: "none",
    borderRadius: "12px",
    padding: "11px 20px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer"
  },
  progressSection: {
    marginBottom: "18px"
  },
  progressMeta: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "13px",
    color: "#475569",
    marginBottom: "8px",
    fontWeight: 600
  },
  progressTrack: {
    width: "100%",
    height: "9px",
    backgroundColor: "#e2e8f0",
    borderRadius: "999px",
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#2563eb",
    borderRadius: "999px",
    transition: "width 0.4s ease"
  },
  splitScreenGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
    gap: "16px",
    marginBottom: "18px"
  },
  candidateScreenPane: {
    backgroundColor: "#f8fafc",
    border: "1px solid #cbd5e1",
    borderRadius: "16px",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  splitPaneHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px"
  },
  paneTagLive: {
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    fontSize: "11px",
    fontWeight: 800,
    padding: "3px 8px",
    borderRadius: "999px"
  },
  paneNameText: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#334155"
  },
  candidateFeedBox: {
    height: "210px",
    borderRadius: "12px",
    overflow: "hidden",
    backgroundColor: "#0f172a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  candidateVideo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: "scaleX(-1)"
  },
  candidateFallbackBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
    color: "#f8fafc"
  },
  candidateAvatarCircle: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    fontSize: "24px",
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  candidateFallbackName: {
    fontSize: "15px",
    fontWeight: 700
  },
  candidateFallbackSub: {
    fontSize: "12px",
    color: "#cbd5e1"
  },
  robotScreenPane: {
    background: "linear-gradient(160deg, #0f172a 0%, #1e293b 100%)",
    border: "1px solid #334155",
    borderRadius: "16px",
    padding: "14px",
    color: "#ffffff",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between"
  },
  robot3DStage: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    height: "100%",
    minHeight: "238px"
  },
  robot3DTopBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px"
  },
  robot3DPill: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#93c5fd"
  },
  robot3DStateBadge: {
    fontSize: "11px",
    fontWeight: 700,
    backgroundColor: "rgba(37, 99, 235, 0.35)",
    color: "#e0f2fe",
    padding: "2px 8px",
    borderRadius: "999px"
  },
  robot3DScene: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 0",
    perspective: "700px"
  },
  robot3DHead: {
    width: "128px",
    height: "92px",
    borderRadius: "28px",
    background: "linear-gradient(145deg, #f8fafc 0%, #cbd5e1 100%)",
    border: "3px solid #38bdf8",
    boxShadow: "0 14px 28px rgba(14, 165, 233, 0.35)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    position: "relative"
  },
  robotAntennaTop: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    backgroundColor: "#38bdf8",
    position: "absolute",
    top: "-12px",
    boxShadow: "0 0 10px #38bdf8"
  },
  robotVisor: {
    backgroundColor: "#0f172a",
    borderRadius: "16px",
    padding: "8px 14px",
    display: "flex",
    gap: "14px",
    alignItems: "center"
  },
  robot3DEye: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    backgroundColor: "#e0f2fe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  robot3DPupil: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    backgroundColor: "#1d4ed8",
    transition: "transform 0.08s linear"
  },
  robot3DMouth: {
    width: "26px",
    height: "6px",
    borderRadius: "6px",
    backgroundColor: "#0284c7"
  },
  robot3DShoulder: {
    width: "96px",
    height: "16px",
    borderRadius: "12px 12px 20px 20px",
    background: "linear-gradient(145deg, #64748b, #334155)",
    marginTop: "4px"
  },
  robot3DFooterText: {
    textAlign: "center",
    fontSize: "12px",
    color: "#cbd5e1",
    fontWeight: 600
  },
  centerWaveBox: {
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "16px",
    padding: "16px",
    marginBottom: "18px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px"
  },
  centerMicCircle: {
    width: "54px",
    height: "54px",
    borderRadius: "50%",
    border: "none",
    color: "#ffffff",
    fontSize: "24px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  waveBarsRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "5px",
    height: "36px"
  },
  waveBar: {
    width: "6px",
    borderRadius: "999px",
    backgroundColor: "#16a34a",
    transition: "height 0.15s ease"
  },
  centerWaveStatus: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#166534",
    textAlign: "center"
  },
  questionBox: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderLeft: "5px solid #2563eb",
    borderRadius: "14px",
    padding: "18px",
    marginBottom: "18px"
  },
  questionHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px"
  },
  qBadge: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: "999px"
  },
  replayBtn: {
    backgroundColor: "#e0f2fe",
    color: "#0369a1",
    border: "1px solid #bae6fd",
    borderRadius: "8px",
    padding: "5px 10px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer"
  },
  questionText: {
    margin: 0,
    fontSize: "17px",
    fontWeight: 600,
    lineHeight: 1.55,
    color: "#0f172a"
  },
  textarea: {
    width: "100%",
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
    lineHeight: 1.5,
    fontFamily: "inherit",
    resize: "vertical",
    boxSizing: "border-box"
  },
  interviewActions: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    alignItems: "center"
  },
  evalBox: {
    marginTop: "22px",
    paddingTop: "20px",
    borderTop: "1px solid #e2e8f0"
  },
  evalTitle: {
    margin: "0 0 14px",
    fontSize: "18px",
    fontWeight: 700,
    color: "#0f172a"
  },
  miniScoresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: "12px",
    marginBottom: "16px"
  },
  miniScoreCard: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "12px",
    textAlign: "center"
  },
  miniScoreLabel: {
    fontSize: "12px",
    color: "#64748b",
    fontWeight: 600
  },
  miniScoreNum: {
    fontSize: "18px",
    fontWeight: 800,
    color: "#1d4ed8",
    marginTop: "4px"
  },
  feedbackBlock: {
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "12px",
    padding: "12px 14px",
    fontSize: "14px",
    lineHeight: 1.5,
    color: "#1e3a8a",
    marginBottom: "12px"
  },
  mistakesBlock: {
    backgroundColor: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: "12px",
    padding: "12px 14px",
    fontSize: "14px",
    color: "#92400e",
    marginBottom: "12px"
  },
  mistakeList: {
    margin: "6px 0 0",
    paddingLeft: "18px"
  },
  mistakeItem: {
    marginBottom: "4px"
  },
  mistakeTip: {
    color: "#78350f",
    fontSize: "13px"
  },
  improvedBlock: {
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "12px",
    padding: "12px 14px",
    fontSize: "14px",
    color: "#166534"
  },
  improvedText: {
    margin: "6px 0 0",
    lineHeight: 1.5
  },
  reportHero: {
    backgroundColor: "#ffffff",
    borderRadius: "18px",
    padding: "24px",
    boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.08)",
    border: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
    marginBottom: "20px"
  },
  reportTag: {
    display: "inline-block",
    backgroundColor: "#e0e7ff",
    color: "#3730a3",
    fontSize: "12px",
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: "999px",
    marginBottom: "8px"
  },
  reportHeading: {
    margin: "0 0 4px",
    fontSize: "22px",
    fontWeight: 800
  },
  reportSub: {
    margin: 0,
    fontSize: "14px",
    color: "#64748b"
  },
  overallCircle: {
    width: "96px",
    height: "96px",
    borderRadius: "50%",
    backgroundColor: "#eff6ff",
    border: "4px solid #2563eb",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center"
  },
  overallNum: {
    fontSize: "24px",
    fontWeight: 800,
    color: "#1d4ed8",
    lineHeight: 1.1
  },
  overallDenom: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#64748b"
  },
  scoresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "16px",
    marginBottom: "20px"
  },
  scoreCard: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "18px",
    boxShadow: "0 8px 20px -6px rgba(15, 23, 42, 0.07)",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center"
  },
  circularWrapper: {
    position: "relative",
    width: "86px",
    height: "86px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "10px"
  },
  circularValue: {
    position: "absolute",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center"
  },
  scoreTitle: {
    fontSize: "15px",
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: "6px"
  },
  scoreBadge: {
    fontSize: "11px",
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: "999px"
  },
  twoColGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "16px"
  },
  sectionHeading: {
    margin: "0 0 12px",
    fontSize: "17px",
    fontWeight: 700,
    color: "#0f172a"
  },
  bulletList: {
    margin: 0,
    paddingLeft: "18px"
  },
  bulletItem: {
    marginBottom: "8px",
    fontSize: "14px",
    lineHeight: 1.5,
    color: "#334155"
  },
  mutedText: {
    color: "#64748b",
    fontSize: "14px",
    margin: 0
  },
  qaList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  qaCard: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "14px"
  },
  qaQuestion: {
    fontWeight: 700,
    fontSize: "14px",
    color: "#0f172a",
    marginBottom: "6px"
  },
  qaAnswer: {
    fontSize: "14px",
    color: "#334155",
    marginBottom: "6px"
  },
  qaFeedback: {
    fontSize: "13px",
    color: "#1d4ed8"
  },
  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: "16px"
  },
  emptyHistory: {
    textAlign: "center",
    padding: "28px 12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "14px"
  },
  historyList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  historyItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    padding: "16px",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    backgroundColor: "#f8fafc"
  },
  historyTitle: {
    fontSize: "15px",
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: "4px"
  },
  levelTag: {
    backgroundColor: "#e2e8f0",
    color: "#334155",
    fontSize: "12px",
    padding: "2px 8px",
    borderRadius: "999px"
  },
  historyMeta: {
    fontSize: "13px",
    color: "#64748b"
  },
  historyRight: {
    display: "flex",
    alignItems: "center",
    gap: "14px"
  },
  historyScore: {
    fontSize: "18px",
    fontWeight: 800,
    color: "#2563eb"
  },
  viewReportBtn: {
    backgroundColor: "#ffffff",
    color: "#2563eb",
    border: "1px solid #93c5fd",
    borderRadius: "10px",
    padding: "8px 14px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer"
  },
  floatingReportBox: {
    position: "fixed",
    right: "18px",
    bottom: "18px",
    width: "320px",
    maxWidth: "calc(100vw - 36px)",
    backgroundColor: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "16px",
    boxShadow: "0 18px 35px -10px rgba(15, 23, 42, 0.22)",
    zIndex: 999,
    overflow: "hidden"
  },
  floatingHeader: {
    backgroundColor: "#0f172a",
    color: "#ffffff",
    padding: "10px 14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px"
  },
  floatingTitle: {
    fontSize: "13px",
    fontWeight: 800
  },
  floatingSub: {
    fontSize: "11px",
    color: "#cbd5e1"
  },
  floatingCloseBtn: {
    background: "rgba(255,255,255,0.14)",
    border: "none",
    color: "#ffffff",
    borderRadius: "8px",
    width: "24px",
    height: "24px",
    cursor: "pointer",
    fontWeight: 700
  },
  floatingBody: {
    padding: "12px 14px"
  },
  floatingMiniGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "6px",
    marginBottom: "10px"
  },
  floatingStat: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "6px 4px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    fontSize: "11px",
    color: "#475569"
  },
  floatingFeedback: {
    margin: "0 0 10px",
    fontSize: "12px",
    color: "#334155",
    lineHeight: 1.4
  },
  floatingOverallRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
    fontSize: "13px",
    fontWeight: 700
  },
  floatingFullBtn: {
    width: "100%",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    padding: "8px 12px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer"
  },
  floatingEmpty: {
    margin: 0,
    padding: "12px 14px",
    fontSize: "12px",
    color: "#64748b",
    lineHeight: 1.45
  }
};

export default AiInterview;