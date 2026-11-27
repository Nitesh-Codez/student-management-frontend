import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import api from "../services/api";
import StudentViva from "./StudentViva";

const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const SESSION_MODES = [
  "General English Interview",
  "Academic Interview",
  "Job Interview",
  "Student Viva"
];
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
  if (propUser && typeof propUser === "object") return propUser;

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

/* SmartBot Eye Tracker Component ("Smart" Robot Eye) */
const SmartRobotEye = ({ pupilOffset, isListening, isSpeaking, countdown }) => {
  return (
    <div style={styles.robotCard}>
      <div style={styles.robotEyeSocket}>
        <div
          style={{
            ...styles.robotIris,
            transform: `translate(${pupilOffset.x}px, ${pupilOffset.y}px)`
          }}
        >
          <div style={styles.robotPupil}>
            <div style={styles.robotGlint} />
          </div>
        </div>
      </div>

      <div style={styles.robotMeta}>
        <div style={styles.robotNameRow}>
          <span style={styles.robotNameText}>Smart</span>
          <span style={styles.robotStatusPill}>
            {countdown !== null
              ? `Next in ${countdown}...`
              : isListening
              ? "Listening"
              : isSpeaking
              ? "Speaking"
              : "Tracking"}
          </span>
        </div>
        <div style={styles.robotSubText}>SmartBot Eye • Looking at you</div>
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
  // "welcome" | "dashboard" | "setup" | "interview" | "report" | "history" | "viva"
  const [view, setView] = useState("welcome");

  const localUserObj = useMemo(() => getLocalUserObject(propUser), [propUser]);
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

  // Voice & Robot Eye states
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [listeningMode, setListeningMode] = useState(null); // null | "name" | "answer"
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });
  const [silenceCountdown, setSilenceCountdown] = useState(null); // 5..1 or null

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const hasSpokenInAnswerRef = useRef(false);
  const answerRef = useRef("");
  const handledNextActionRef = useRef(false);

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Session configuration state (includes Student Viva in dropdown)
  const [level, setLevel] = useState("Beginner");
  const [interviewType, setInterviewType] = useState("General English Interview");
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [starting, setStarting] = useState(false);

  // Active interview/viva state
  const [interviewId, setInterviewId] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState("");
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

  // Eye tracking based on mouse movement + subtle SmartBot gaze
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

  useEffect(() => {
    return () => {
      stopListening();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [stopListening]);

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
        const modeLabel =
          interviewType === "Student Viva" ? "Student Viva" : interviewType;
        const welcomeLine = `${greeting} ${verifiedName}! Hello, I am SmartBot, I will take this ${modeLabel}. Please choose or confirm your interview type to begin.`;
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
            // User is actively speaking -> reset 5..4..3..2..1 silence countdown
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

  const fetchHistory = async () => {
    setLoadingHistory(true);
    setErrorMsg("");
    try {
      const res = await api.get("/api/interview/history");
      const list = Array.isArray(res.data?.interviews)
        ? res.data.interviews
        : Array.isArray(res.data)
        ? res.data
        : [];
      setHistory(list);
    } catch (err) {
      setErrorMsg(
        err?.response?.data?.message || "Failed to load interview history."
      );
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

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

  const handleSessionModeSelect = (selectedMode) => {
    setErrorMsg("");
    setInterviewType(selectedMode);
    if (selectedMode === "Student Viva") {
      stopListening();
      setView("viva");
      const vivaIntro = `${getTimeGreeting()}! Hello, I am SmartBot, I will take this Student Viva.`;
      speakText(vivaIntro);
    } else if (view === "viva") {
      setView("setup");
    }
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
    setStarting(true);
    setErrorMsg("");
    setEvaluation(null);
    setAnswer("");

    try {
      const res = await api.post("/api/interview/start", {
        level,
        interviewType: chosenMode,
        totalQuestions
      });

      const createdId = res.data?.interviewId;
      const firstQuestion = res.data?.question;

      if (!createdId || !firstQuestion) {
        throw new Error("Missing interviewId or question from server.");
      }

      setInterviewId(createdId);
      const qNum = Number(res.data?.questionNumber) || 1;
      setQuestionNumber(qNum);
      setCurrentQuestion(firstQuestion);
      setView("interview");

      const promptSpeech = `Question ${qNum}. ${firstQuestion}`;
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
      const res = await api.post("/api/interview/evaluate", {
        interviewId,
        question: currentQuestion,
        answer: currentAns
      });

      const rawEval = res.data?.evaluation || {};
      const parsedEval = {
        grammarScore: rawEval.grammarScore ?? 0,
        fluencyScore: rawEval.fluencyScore ?? 0,
        vocabularyScore: rawEval.vocabularyScore ?? 0,
        relevanceScore: rawEval.relevanceScore ?? 0,
        feedback: rawEval.feedback || "",
        mistakes: parseMistakes(rawEval.mistakes),
        improvedAnswer: rawEval.improvedAnswer || ""
      };
      setEvaluation(parsedEval);

      if (parsedEval.feedback) {
        speakText(parsedEval.feedback);
      }
    } catch (err) {
      setErrorMsg(
        err?.response?.data?.message || "Unable to evaluate answer."
      );
    } finally {
      setEvaluating(false);
    }
  };

  const handleOpenReport = async (targetId) => {
    const id = targetId || interviewId;
    if (!id) return;

    stopListening();
    setLoadingReport(true);
    setErrorMsg("");
    setFloatingReportOpen(true);
    setView("report");

    try {
      const res = await api.get(`/api/interview/report/${id}`);
      const built = buildReportSummary(
        res.data?.interview,
        res.data?.answers,
        level,
        interviewType
      );
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
  };

  const handleCompleteInterview = async () => {
    if (!interviewId) return;
    stopListening();
    setCompleting(true);
    setErrorMsg("");

    try {
      await api.post("/api/interview/complete", { interviewId });
      await fetchHistory();
      await handleOpenReport(interviewId);
    } catch (err) {
      setErrorMsg(
        err?.response?.data?.message || "Unable to complete session."
      );
    } finally {
      setCompleting(false);
    }
  };

  const handleNextQuestion = useCallback(async () => {
    if (!interviewId) return;
    stopListening();
    setLoadingNext(true);
    setErrorMsg("");

    try {
      const res = await api.get(`/api/interview/next/${interviewId}`);
      if (res.data?.completed) {
        await handleCompleteInterview();
        return;
      }

      const nextQ = res.data?.question || "";
      const nextNum = Number(res.data?.questionNumber) || questionNumber + 1;
      setCurrentQuestion(nextQ);
      setQuestionNumber(nextNum);
      setAnswer("");
      setEvaluation(null);

      speakText(`Question ${nextNum}. ${nextQ}`, () => {
        startVoiceRecognition("answer");
      });
    } catch (err) {
      setErrorMsg(
        err?.response?.data?.message || "Unable to generate next question."
      );
    } finally {
      setLoadingNext(false);
    }
  }, [
    interviewId,
    stopListening,
    questionNumber,
    speakText,
    startVoiceRecognition
  ]);

  // When user stops speaking and 5..4..3..2..1 finishes: say thank you for what they told & move to next question
  useEffect(() => {
    advanceAfterSilenceRef.current = async () => {
      const spokenAnswer = answerRef.current.trim();
      const thankLine = spokenAnswer
        ? "Thank you for what you told me. Moving to the next question."
        : "Thank you. Moving to the next question.";

      speakText(thankLine, async () => {
        if (questionNumber < totalQuestions) {
          await handleNextQuestion();
        } else {
          await handleCompleteInterview();
        }
      });
    };
  }, [speakText, questionNumber, totalQuestions, handleNextQuestion]);

  const progressPercent = useMemo(() => {
    if (!totalQuestions) return 0;
    const completedSteps = evaluation ? questionNumber : questionNumber - 1;
    return Math.max(
      0,
      Math.min(100, Math.round((completedSteps / totalQuestions) * 100))
    );
  }, [questionNumber, totalQuestions, evaluation]);

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes micPulse {
          0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.55); }
          70% { box-shadow: 0 0 0 14px rgba(220, 38, 38, 0); }
          100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
        }
        .ssc-card-anim { animation: fadeSlideUp 0.45s ease-out both; }
        .ssc-mic-active { animation: micPulse 1.5s infinite; }
      `}</style>

      <div style={styles.container}>
        {/* Top Header + SmartBot Eye */}
        <header style={styles.header} className="ssc-card-anim">
          <div style={{ flex: 1, minWidth: "260px" }}>
            <div style={styles.brandBadgeRow}>
              <span style={styles.pill}>🎓 Smart Students Classes</span>
              {isAuthenticated && studentName && (
                <span style={styles.studentChip}>
                  ✓ {studentName} • {studentClass}
                </span>
              )}
              {isSpeaking && (
                <span style={styles.speakingTag}>🔊 SmartBot Speaking...</span>
              )}
            </div>
            <h1 style={styles.title}>SmartBot AI Interview &amp; Viva</h1>
            <p style={styles.subtitle}>
              {getTimeGreeting()} — Hello, I am SmartBot, I will take this{" "}
              <strong>{interviewType}</strong>.
            </p>
          </div>

          <SmartRobotEye
            pupilOffset={pupilOffset}
            isListening={Boolean(listeningMode)}
            isSpeaking={isSpeaking}
            countdown={silenceCountdown}
          />

          <div style={styles.navButtons}>
            <select
              aria-label="Select Interview or Student Viva"
              value={view === "viva" ? "Student Viva" : interviewType}
              onChange={(e) => handleSessionModeSelect(e.target.value)}
              style={styles.selectNav}
            >
              {SESSION_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>

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
                fetchHistory();
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
              style={styles.navBtn}
            >
              {floatingReportOpen ? "Hide Report" : "Show Report"}
            </button>
          </div>
        </header>

        {errorMsg && (
          <div role="alert" style={styles.errorBox}>
            <span>⚠️ {errorMsg}</span>
            <button
              type="button"
              onClick={() => setErrorMsg("")}
              style={styles.errorDismiss}
            >
              Close
            </button>
          </div>
        )}

        {/* RENDERED STUDENT VIVA PAGE WHEN SELECTED IN DROPDOWN */}
        {view === "viva" && (
          <section style={styles.sectionCard} className="ssc-card-anim">
            <div style={styles.vivaTopBar}>
              <div>
                <span style={styles.pill}>SmartBot Viva Mode</span>
                <h2 style={{ ...styles.sectionTitle, marginTop: "6px" }}>
                  Student Viva Portal
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setInterviewType("General English Interview");
                  setView("setup");
                }}
                style={styles.navBtn}
              >
                ← Back to AI Interview Setup
              </button>
            </div>
            <StudentViva />
          </section>
        )}

        {/* STEP 1: GREETING + SMARTBOT INTRO + NAME VERIFICATION */}
        {view === "welcome" && (
          <div style={styles.welcomeCard} className="ssc-card-anim">
            <div style={styles.welcomeGrid}>
              <div style={styles.welcomeHero}>
                <div style={styles.liveTag}>
                  <span style={styles.liveDot} /> {getTimeGreeting().toUpperCase()} • SMARTBOT READY
                </div>
                <h2 style={styles.welcomeHeading}>
                  Hello, I am <span style={styles.welcomeHighlight}>SmartBot</span>
                </h2>
                <p style={styles.welcomeText}>
                  I will take this <strong>{interviewType}</strong>. Speak your name to verify your profile, select your interview type, and I will listen as you answer.
                </p>

                <div style={styles.aiPreviewBox}>
                  <div style={styles.aiAvatar}>🤖</div>
                  <div>
                    <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "14px" }}>
                      SmartBot Intro &amp; Status
                    </div>
                    <div style={{ color: "#475569", fontSize: "12.5px", marginTop: "3px" }}>
                      {authStatusMsg}
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.voiceVerifyBox}>
                <h3 style={styles.formHeading}>Speak Your Name to Begin</h3>
                <p style={styles.formSub}>
                  Local Profile Name:{" "}
                  <strong>{localExpectedName || "Not set in local user object"}</strong>
                </p>

                <div style={{ marginBottom: "10px" }}>
                  <label htmlFor="sscModeSelectWelcome" style={styles.label}>
                    Select Type (Interview / Student Viva)
                  </label>
                  <select
                    id="sscModeSelectWelcome"
                    value={interviewType}
                    onChange={(e) => handleSessionModeSelect(e.target.value)}
                    style={styles.textInput}
                  >
                    {SESSION_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: "10px" }}>
                  <label htmlFor="sscClassSelect" style={styles.label}>
                    Class
                  </label>
                  <select
                    id="sscClassSelect"
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                    style={styles.textInput}
                  >
                    {STUDENT_CLASSES.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.micCenterBlock}>
                  {listeningMode === "name" ? (
                    <button
                      type="button"
                      onClick={stopListening}
                      style={styles.stopMicBtn}
                      className="ssc-mic-active"
                    >
                      🛑 Listening Name... Tap to Stop
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startVoiceRecognition("name")}
                      style={styles.bigMicBtn}
                    >
                      🎤 Speak Your Name Now
                    </button>
                  )}
                </div>

                {spokenNameRaw && (
                  <div style={styles.heardBox}>
                    <span>
                      Heard: <strong>&ldquo;{spokenNameRaw}&rdquo;</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => verifySpokenName(spokenNameRaw)}
                      style={styles.smallVerifyBtn}
                    >
                      Verify Now
                    </button>
                  </div>
                )}

                {isAuthenticated && (
                  <button
                    type="button"
                    onClick={() => setView("setup")}
                    style={styles.primaryBtn}
                  >
                    Continue to Type Selection →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: SELECT INTERVIEW / VIVA TYPE ONCE VERIFIED */}
        {view === "setup" && (
          <section style={styles.sectionCard} className="ssc-card-anim">
            <h2 style={styles.sectionTitle}>Select Your Interview / Viva Type</h2>
            <p style={styles.sectionSub}>
              SmartBot will adapt to <strong>{interviewType}</strong> for{" "}
              <strong>{studentName || "Student"}</strong> ({studentClass}).
            </p>

            <form onSubmit={handleStartSubmit} style={styles.formStack}>
              <div>
                <label htmlFor="sscSetupTypeSelect" style={styles.label}>
                  Choose Session Type
                </label>
                <select
                  id="sscSetupTypeSelect"
                  value={interviewType}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    setInterviewType(nextType);
                    speakText(
                      `${nextType} selected. Hello, I am SmartBot, I will take this ${nextType}.`
                    );
                  }}
                  style={styles.textInput}
                >
                  {SESSION_MODES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={styles.label}>Quick Mode Chips</label>
                <div style={styles.chipRow}>
                  {SESSION_MODES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setInterviewType(type);
                        if (type === "Student Viva") {
                          setView("viva");
                        }
                      }}
                      style={{
                        ...styles.optionChip,
                        ...(interviewType === type ? styles.optionChipActive : {})
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={styles.label}>Difficulty Level</label>
                <div style={styles.chipRow}>
                  {LEVELS.map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setLevel(lvl)}
                      style={{
                        ...styles.optionChip,
                        ...(level === lvl ? styles.optionChipActive : {})
                      }}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={styles.label}>Number of Questions</label>
                <div style={styles.chipRow}>
                  {QUESTION_COUNTS.map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setTotalQuestions(cnt)}
                      style={{
                        ...styles.optionChip,
                        ...(totalQuestions === cnt ? styles.optionChipActive : {})
                      }}
                    >
                      {cnt} Questions
                    </button>
                  ))}
                </div>
              </div>

              <div style={styles.actionRow}>
                <button
                  type="submit"
                  disabled={starting}
                  style={styles.primaryBtn}
                >
                  {starting
                    ? "Starting with SmartBot..."
                    : `🎙️ Start ${interviewType}`}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* STEP 3: LIVE INTERVIEW / VIVA WITH SILENCE COUNTDOWN 5..4..3..2..1 */}
        {view === "interview" && (
          <section style={styles.sectionCard} className="ssc-card-anim">
            <div style={styles.progressHeader}>
              <span style={styles.qBadge}>
                Question {questionNumber} of {totalQuestions}
              </span>
              <span style={styles.qMeta}>
                {interviewType} • {level}
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

            {silenceCountdown !== null && (
              <div style={styles.countdownBanner}>
                ⏳ Silence detected — moving to next question in{" "}
                <strong>{silenceCountdown}</strong>...
              </div>
            )}

            <div style={styles.questionBox}>
              <div style={styles.questionTopLine}>
                <div style={styles.questionLabel}>SmartBot Question</div>
                <button
                  type="button"
                  onClick={() => speakText(currentQuestion)}
                  style={styles.repeatBtn}
                >
                  🔊 Repeat Question
                </button>
              </div>
              <p style={styles.questionText}>{currentQuestion}</p>
            </div>

            <form onSubmit={handleEvaluateAnswer} style={styles.formStack}>
              <div>
                <div style={styles.answerLabelRow}>
                  <label htmlFor="sscAnswerBox" style={styles.label}>
                    Your Spoken / Typed Answer
                  </label>
                  {listeningMode === "answer" ? (
                    <button
                      type="button"
                      onClick={stopListening}
                      style={styles.stopAnswerMicBtn}
                      className="ssc-mic-active"
                    >
                      🛑 Stop Listening
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startVoiceRecognition("answer")}
                      style={styles.startAnswerMicBtn}
                    >
                      🎤 Speak Answer
                    </button>
                  )}
                </div>

                <textarea
                  id="sscAnswerBox"
                  rows={5}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Speak your answer—when you stop speaking, SmartBot counts 5, 4, 3, 2, 1, thanks you, and moves to the next question..."
                  style={styles.textarea}
                  disabled={evaluating || Boolean(evaluation)}
                />
              </div>

              {!evaluation && (
                <div style={styles.actionRow}>
                  <button
                    type="submit"
                    disabled={evaluating}
                    style={styles.primaryBtn}
                  >
                    {evaluating ? "Evaluating Answer..." : "Evaluate Answer"}
                  </button>
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    disabled={loadingNext}
                    style={styles.navBtn}
                  >
                    {loadingNext ? "Loading..." : "Next Question →"}
                  </button>
                </div>
              )}
            </form>

            {evaluation && (
              <div style={styles.evalBox}>
                <h3 style={styles.evalHeading}>SmartBot Feedback &amp; Scores</h3>

                <div style={styles.scoreGrid}>
                  <ScoreCard label="Grammar" score={evaluation.grammarScore} />
                  <ScoreCard label="Fluency" score={evaluation.fluencyScore} />
                  <ScoreCard label="Vocabulary" score={evaluation.vocabularyScore} />
                  <ScoreCard label="Relevance" score={evaluation.relevanceScore} />
                </div>

                {evaluation.feedback && (
                  <p style={styles.feedbackText}>{evaluation.feedback}</p>
                )}

                {evaluation.mistakes.length > 0 && (
                  <div style={styles.mistakeList}>
                    <strong>Areas to Watch:</strong>
                    <ul style={{ margin: "6px 0 0 18px" }}>
                      {evaluation.mistakes.map((m, idx) => (
                        <li key={idx}>
                          <strong>{m.mistake}</strong>
                          {m.explanation ? ` — ${m.explanation}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {evaluation.improvedAnswer && (
                  <div style={styles.improvedBox}>
                    <strong>Improved Sample Answer:</strong>
                    <p style={{ margin: "4px 0 0" }}>{evaluation.improvedAnswer}</p>
                  </div>
                )}

                <div style={styles.actionRow}>
                  {questionNumber < totalQuestions ? (
                    <button
                      type="button"
                      onClick={handleNextQuestion}
                      disabled={loadingNext}
                      style={styles.primaryBtn}
                    >
                      {loadingNext ? "Loading Next..." : "Next Question →"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCompleteInterview}
                      disabled={completing}
                      style={styles.completeBtn}
                    >
                      {completing ? "Completing..." : "Complete & View Report"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* DASHBOARD VIEW */}
        {view === "dashboard" && (
          <section style={styles.sectionCard} className="ssc-card-anim">
            <div style={styles.sectionTopRow}>
              <div>
                <h2 style={styles.sectionTitle}>Student Performance Dashboard</h2>
                <p style={styles.sectionSub}>
                  {studentName
                    ? `Track your progress, ${studentName} (${studentClass}).`
                    : "Track your AI interview and viva progress."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setErrorMsg("");
                  setView(isAuthenticated ? "setup" : "welcome");
                }}
                style={styles.primaryBtn}
              >
                + Start New Session
              </button>
            </div>

            <div style={styles.statsGrid}>
              <div style={styles.statBox}>
                <div style={styles.statLabel}>Total Sessions</div>
                <div style={styles.statNumber}>{dashboardStats.totalInterviews}</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statLabel}>Average Score</div>
                <div style={styles.statNumber}>{dashboardStats.averageScore}/100</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statLabel}>Best Score</div>
                <div style={styles.statNumber}>{dashboardStats.bestScore}/100</div>
              </div>
            </div>
          </section>
        )}

        {/* FULL REPORT VIEW */}
        {view === "report" && (
          <section style={styles.sectionCard} className="ssc-card-anim">
            <h2 style={styles.sectionTitle}>Session Performance Report</h2>
            {loadingReport ? (
              <p style={styles.mutedText}>Generating your report...</p>
            ) : reportData ? (
              <div style={styles.formStack}>
                <div style={styles.overallBanner}>
                  <div>
                    <div style={{ fontSize: "12px", color: "#475569", fontWeight: 700 }}>
                      OVERALL SCORE
                    </div>
                    <div style={styles.overallScoreBig}>
                      {reportData.overallScore} / 100
                    </div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: "13px", color: "#334155" }}>
                    <div>
                      <strong>Type:</strong> {reportData.interviewType}
                    </div>
                    <div>
                      <strong>Level:</strong> {reportData.level}
                    </div>
                  </div>
                </div>

                <div style={styles.scoreGrid}>
                  <ScoreCard label="Grammar" score={reportData.grammarScore} />
                  <ScoreCard label="Fluency" score={reportData.fluencyScore} />
                  <ScoreCard label="Vocabulary" score={reportData.vocabularyScore} />
                  <ScoreCard label="Relevance" score={reportData.relevanceScore} />
                </div>

                <div style={styles.reportBlock}>
                  <strong>Strengths</strong>
                  <ul style={{ margin: "6px 0 0 18px" }}>
                    {reportData.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div style={styles.reportBlock}>
                  <strong>Actionable Tips</strong>
                  <ul style={{ margin: "6px 0 0 18px" }}>
                    {reportData.suggestions.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>

                <div style={styles.actionRow}>
                  <button
                    type="button"
                    onClick={() => setView("setup")}
                    style={styles.primaryBtn}
                  >
                    Start Another Session
                  </button>
                </div>
              </div>
            ) : (
              <p style={styles.mutedText}>No report available yet.</p>
            )}
          </section>
        )}

        {/* HISTORY VIEW */}
        {view === "history" && (
          <section style={styles.sectionCard} className="ssc-card-anim">
            <h2 style={styles.sectionTitle}>Past Sessions</h2>
            {loadingHistory ? (
              <p style={styles.mutedText}>Loading session history...</p>
            ) : history.length === 0 ? (
              <p style={styles.mutedText}>No past sessions found yet.</p>
            ) : (
              <div style={styles.historyList}>
                {history.map((item, idx) => {
                  const id = item.id ?? item.interviewId ?? idx;
                  const score = item.overall_score ?? item.overallScore ?? "—";
                  return (
                    <div key={id} style={styles.historyRow}>
                      <div>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>
                          {item.interview_type || item.interviewType || "Session"} •{" "}
                          {item.level || "Beginner"}
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                          Score: <strong>{score}</strong>
                        </div>
                      </div>
                      {item.id && (
                        <button
                          type="button"
                          onClick={() => handleOpenReport(item.id)}
                          style={styles.smallVerifyBtn}
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

      {/* FLOATING REPORT CARD */}
      {floatingReportOpen && (
        <aside style={styles.floatingReportBox} aria-label="Floating Report Summary">
          <div style={styles.floatingHeader}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 800, color: "#1e3a8a" }}>
                📄 Live / Latest Report
              </div>
              <div style={{ fontSize: "11px", color: "#475569" }}>
                {interviewType} • Q{questionNumber}/{totalQuestions}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFloatingReportOpen(false)}
              style={styles.floatingCloseBtn}
              aria-label="Close floating report"
            >
              ✕
            </button>
          </div>

          <div style={styles.floatingBody}>
            {reportData ? (
              <>
                <div style={styles.floatingScoreRow}>
                  <span>Overall Score</span>
                  <strong>{reportData.overallScore} / 100</strong>
                </div>
                <div style={styles.floatingMetrics}>
                  <span>Grammar: {reportData.grammarScore}</span>
                  <span>Fluency: {reportData.fluencyScore}</span>
                  <span>Vocab: {reportData.vocabularyScore}</span>
                  <span>Relevance: {reportData.relevanceScore}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setView("report")}
                  style={styles.floatingFullBtn}
                >
                  Open Full Report
                </button>
              </>
            ) : evaluation ? (
              <>
                <div style={styles.floatingScoreRow}>
                  <span>Latest Q{questionNumber}</span>
                  <strong>Evaluated</strong>
                </div>
                <div style={styles.floatingMetrics}>
                  <span>Grammar: {evaluation.grammarScore}</span>
                  <span>Fluency: {evaluation.fluencyScore}</span>
                  <span>Vocab: {evaluation.vocabularyScore}</span>
                  <span>Relevance: {evaluation.relevanceScore}</span>
                </div>
              </>
            ) : (
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                Complete an answer or finish a session to view live report metrics here.
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
};

const styles = {
  page: {
    position: "relative",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #eff6ff 0%, #eef2ff 50%, #f0fdf4 100%)",
    color: "#0f172a",
    padding: "24px 16px 80px",
    overflowX: "hidden"
  },
  container: {
    position: "relative",
    zIndex: 1,
    maxWidth: "1060px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "18px"
  },
  header: {
    backgroundColor: "#ffffff",
    border: "1.5px solid #dbeafe",
    borderRadius: "16px",
    padding: "18px 22px",
    boxShadow: "0 6px 20px rgba(37, 99, 235, 0.07)",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "14px"
  },
  brandBadgeRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "8px",
    marginBottom: "6px"
  },
  pill: {
    backgroundColor: "#e0e7ff",
    color: "#3730a3",
    padding: "3px 10px",
    borderRadius: "999px",
    fontSize: "11.5px",
    fontWeight: 700
  },
  studentChip: {
    backgroundColor: "#dcfce7",
    color: "#15803d",
    padding: "3px 10px",
    borderRadius: "999px",
    fontSize: "11.5px",
    fontWeight: 700
  },
  speakingTag: {
    backgroundColor: "#fef3c7",
    color: "#b45309",
    padding: "3px 10px",
    borderRadius: "999px",
    fontSize: "11.5px",
    fontWeight: 700
  },
  title: {
    margin: 0,
    fontSize: "23px",
    fontWeight: 800,
    color: "#0f172a"
  },
  subtitle: {
    margin: "4px 0 0",
    fontSize: "13px",
    color: "#475569"
  },
  robotCard: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "#f8fbff",
    border: "1.5px solid #c7d2fe",
    borderRadius: "14px",
    padding: "8px 12px"
  },
  robotEyeSocket: {
    width: "46px",
    height: "46px",
    borderRadius: "999px",
    backgroundColor: "#ffffff",
    border: "2.5px solid #4f46e5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0
  },
  robotIris: {
    width: "24px",
    height: "24px",
    borderRadius: "999px",
    background: "radial-gradient(circle at 35% 35%, #38bdf8 0%, #2563eb 65%, #1e1b4b 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 0.1s ease-out"
  },
  robotPupil: {
    width: "10px",
    height: "10px",
    borderRadius: "999px",
    backgroundColor: "#0f172a",
    position: "relative"
  },
  robotGlint: {
    width: "4px",
    height: "4px",
    borderRadius: "999px",
    backgroundColor: "#ffffff",
    position: "absolute",
    top: "1px",
    left: "1px"
  },
  robotMeta: {
    display: "flex",
    flexDirection: "column",
    gap: "2px"
  },
  robotNameRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  robotNameText: {
    fontSize: "13px",
    fontWeight: 800,
    color: "#1e1b4b"
  },
  robotStatusPill: {
    fontSize: "10.5px",
    fontWeight: 700,
    backgroundColor: "#eef2ff",
    color: "#4338ca",
    padding: "1px 7px",
    borderRadius: "999px"
  },
  robotSubText: {
    fontSize: "11px",
    color: "#64748b"
  },
  navButtons: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "8px",
    width: "100%",
    paddingTop: "8px",
    borderTop: "1px solid #f1f5f9"
  },
  selectNav: {
    height: "36px",
    padding: "0 10px",
    borderRadius: "8px",
    border: "1.5px solid #c7d2fe",
    backgroundColor: "#eef2ff",
    color: "#3730a3",
    fontSize: "12.5px",
    fontWeight: 700,
    cursor: "pointer"
  },
  navBtn: {
    height: "36px",
    padding: "0 12px",
    borderRadius: "8px",
    border: "1.5px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#1e293b",
    fontSize: "12.5px",
    fontWeight: 700,
    cursor: "pointer"
  },
  navBtnActive: {
    backgroundColor: "#4f46e5",
    borderColor: "#4f46e5",
    color: "#ffffff"
  },
  voiceOnBtn: {
    borderColor: "#86efac",
    backgroundColor: "#f0fdf4",
    color: "#15803d"
  },
  errorBox: {
    backgroundColor: "#fff1f2",
    border: "1.5px solid #fda4af",
    borderRadius: "12px",
    padding: "12px 16px",
    color: "#be123c",
    fontSize: "13px",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px"
  },
  errorDismiss: {
    border: "1px solid #fda4af",
    backgroundColor: "#ffffff",
    color: "#be123c",
    borderRadius: "6px",
    padding: "4px 10px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer"
  },
  vivaTopBar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "14px",
    paddingBottom: "12px",
    borderBottom: "1px solid #e2e8f0"
  },
  welcomeCard: {
    backgroundColor: "#ffffff",
    border: "1.5px solid #dbeafe",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 6px 20px rgba(37, 99, 235, 0.07)"
  },
  welcomeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
    gap: "24px",
    alignItems: "center"
  },
  welcomeHero: {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  liveTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    alignSelf: "flex-start",
    backgroundColor: "#eef2ff",
    color: "#3730a3",
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: 800
  },
  liveDot: {
    width: "7px",
    height: "7px",
    borderRadius: "999px",
    backgroundColor: "#4f46e5"
  },
  welcomeHeading: {
    margin: 0,
    fontSize: "28px",
    fontWeight: 800,
    lineHeight: 1.2,
    color: "#0f172a"
  },
  welcomeHighlight: {
    color: "#4f46e5"
  },
  welcomeText: {
    margin: 0,
    fontSize: "13.5px",
    color: "#475569",
    lineHeight: 1.55
  },
  aiPreviewBox: {
    marginTop: "6px",
    backgroundColor: "#f8fbff",
    border: "1.5px solid #c7d2fe",
    borderRadius: "12px",
    padding: "12px 14px",
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  aiAvatar: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    backgroundColor: "#eef2ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    flexShrink: 0
  },
  voiceVerifyBox: {
    backgroundColor: "#f8fbff",
    border: "1.5px solid #dbeafe",
    borderRadius: "14px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  formHeading: {
    margin: 0,
    fontSize: "17px",
    fontWeight: 800,
    color: "#0f172a"
  },
  formSub: {
    margin: 0,
    fontSize: "12.5px",
    color: "#475569"
  },
  label: {
    display: "block",
    fontSize: "12.5px",
    fontWeight: 700,
    color: "#1e293b",
    marginBottom: "6px"
  },
  textInput: {
    width: "100%",
    height: "38px",
    padding: "0 12px",
    borderRadius: "8px",
    border: "1.5px solid #cbd5e1",
    backgroundColor: "#ffffff",
    fontSize: "13px",
    fontWeight: 600
  },
  micCenterBlock: {
    display: "flex",
    justifyContent: "center",
    margin: "4px 0"
  },
  bigMicBtn: {
    width: "100%",
    height: "44px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg, #4f46e5 0%, #0284c7 100%)",
    color: "#ffffff",
    fontSize: "13.5px",
    fontWeight: 700,
    cursor: "pointer"
  },
  stopMicBtn: {
    width: "100%",
    height: "44px",
    borderRadius: "10px",
    border: "none",
    backgroundColor: "#dc2626",
    color: "#ffffff",
    fontSize: "13.5px",
    fontWeight: 700,
    cursor: "pointer"
  },
  heardBox: {
    backgroundColor: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    padding: "8px 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    fontSize: "12.5px"
  },
  smallVerifyBtn: {
    padding: "5px 10px",
    borderRadius: "6px",
    border: "1px solid #c7d2fe",
    backgroundColor: "#eef2ff",
    color: "#3730a3",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer"
  },
  primaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    height: "38px",
    padding: "0 16px",
    borderRadius: "8px",
    border: "none",
    background: "linear-gradient(135deg, #4f46e5 0%, #0284c7 100%)",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer"
  },
  completeBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    height: "38px",
    padding: "0 16px",
    borderRadius: "8px",
    border: "none",
    background: "linear-gradient(135deg, #059669 0%, #0284c7 100%)",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer"
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    border: "1.5px solid #dbeafe",
    borderRadius: "16px",
    padding: "22px 24px",
    boxShadow: "0 6px 20px rgba(37, 99, 235, 0.07)"
  },
  sectionTopRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "18px"
  },
  sectionTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 800,
    color: "#0f172a"
  },
  sectionSub: {
    margin: "4px 0 0",
    fontSize: "13px",
    color: "#475569"
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "14px"
  },
  statBox: {
    backgroundColor: "#f8fbff",
    border: "1.5px solid #dbeafe",
    borderRadius: "12px",
    padding: "16px"
  },
  statLabel: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#64748b"
  },
  statNumber: {
    fontSize: "24px",
    fontWeight: 800,
    color: "#0f172a",
    marginTop: "6px"
  },
  formStack: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    marginTop: "14px"
  },
  chipRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px"
  },
  optionChip: {
    height: "36px",
    padding: "0 14px",
    borderRadius: "8px",
    border: "1.5px solid #cbd5e1",
    backgroundColor: "#f8fbff",
    color: "#1e293b",
    fontSize: "12.5px",
    fontWeight: 700,
    cursor: "pointer"
  },
  optionChipActive: {
    backgroundColor: "#eef2ff",
    borderColor: "#4f46e5",
    color: "#3730a3"
  },
  actionRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "6px"
  },
  progressHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "12.5px",
    fontWeight: 700,
    marginBottom: "8px"
  },
  qBadge: {
    backgroundColor: "#eef2ff",
    color: "#3730a3",
    padding: "3px 10px",
    borderRadius: "999px"
  },
  qMeta: {
    color: "#64748b"
  },
  progressTrack: {
    width: "100%",
    height: "8px",
    borderRadius: "999px",
    backgroundColor: "#e2e8f0",
    overflow: "hidden",
    marginBottom: "14px"
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #4f46e5 0%, #0284c7 100%)",
    transition: "width 0.25s ease"
  },
  countdownBanner: {
    backgroundColor: "#fef3c7",
    border: "1.5px solid #f59e0b",
    color: "#92400e",
    borderRadius: "10px",
    padding: "8px 14px",
    fontSize: "13px",
    fontWeight: 700,
    marginBottom: "12px"
  },
  questionBox: {
    backgroundColor: "#f8fbff",
    border: "1.5px solid #dbeafe",
    borderRadius: "12px",
    padding: "16px"
  },
  questionTopLine: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px"
  },
  questionLabel: {
    fontSize: "11.5px",
    fontWeight: 800,
    color: "#4f46e5",
    textTransform: "uppercase"
  },
  repeatBtn: {
    padding: "4px 10px",
    borderRadius: "6px",
    border: "1px solid #c7d2fe",
    backgroundColor: "#ffffff",
    color: "#3730a3",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer"
  },
  questionText: {
    margin: "8px 0 0",
    fontSize: "16px",
    fontWeight: 700,
    color: "#0f172a",
    lineHeight: 1.5
  },
  answerLabelRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    marginBottom: "6px"
  },
  startAnswerMicBtn: {
    padding: "5px 12px",
    borderRadius: "8px",
    border: "1px solid #c7d2fe",
    backgroundColor: "#eef2ff",
    color: "#3730a3",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer"
  },
  stopAnswerMicBtn: {
    padding: "5px 12px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#dc2626",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer"
  },
  textarea: {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "1.5px solid #cbd5e1",
    backgroundColor: "#f8fbff",
    fontSize: "13.5px",
    lineHeight: 1.5,
    resize: "vertical"
  },
  evalBox: {
    marginTop: "18px",
    paddingTop: "18px",
    borderTop: "1.5px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    gap: "14px"
  },
  evalHeading: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 800,
    color: "#0f172a"
  },
  scoreGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "12px"
  },
  scoreCard: {
    backgroundColor: "#f8fbff",
    border: "1px solid #dbeafe",
    borderRadius: "12px",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px"
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
    alignItems: "baseline",
    gap: "1px"
  },
  scoreTitle: {
    fontSize: "12.5px",
    fontWeight: 700,
    color: "#1e293b"
  },
  scoreBadge: {
    fontSize: "11px",
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: "999px"
  },
  feedbackText: {
    margin: 0,
    fontSize: "13px",
    color: "#1e293b",
    lineHeight: 1.5,
    backgroundColor: "#f8fbff",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #dbeafe"
  },
  mistakeList: {
    fontSize: "12.5px",
    color: "#9f1239",
    backgroundColor: "#fff1f2",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #fecdd3"
  },
  improvedBox: {
    fontSize: "12.5px",
    color: "#065f46",
    backgroundColor: "#ecfdf5",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #a7f3d0"
  },
  overallBanner: {
    backgroundColor: "#eef2ff",
    border: "1.5px solid #c7d2fe",
    borderRadius: "12px",
    padding: "16px 20px",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px"
  },
  overallScoreBig: {
    fontSize: "28px",
    fontWeight: 800,
    color: "#3730a3"
  },
  reportBlock: {
    backgroundColor: "#f8fbff",
    border: "1px solid #dbeafe",
    borderRadius: "10px",
    padding: "12px 16px",
    fontSize: "13px",
    color: "#1e293b"
  },
  historyList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "14px"
  },
  historyRow: {
    backgroundColor: "#f8fbff",
    border: "1px solid #dbeafe",
    borderRadius: "10px",
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px"
  },
  mutedText: {
    fontSize: "13px",
    color: "#64748b",
    marginTop: "12px"
  },
  floatingReportBox: {
    position: "fixed",
    right: "18px",
    bottom: "18px",
    width: "280px",
    zIndex: 45,
    backgroundColor: "#ffffff",
    border: "1.5px solid #c7d2fe",
    borderRadius: "14px",
    boxShadow: "0 14px 32px rgba(15, 23, 42, 0.16)",
    overflow: "hidden"
  },
  floatingHeader: {
    background: "linear-gradient(90deg, #e0e7ff 0%, #e0f2fe 100%)",
    padding: "10px 12px",
    borderBottom: "1px solid #c7d2fe",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  floatingCloseBtn: {
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    borderRadius: "6px",
    padding: "2px 7px",
    fontSize: "11px",
    fontWeight: 700,
    cursor: "pointer"
  },
  floatingBody: {
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  floatingScoreRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "12.5px",
    color: "#1e293b"
  },
  floatingMetrics: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "4px 8px",
    fontSize: "11.5px",
    color: "#475569",
    backgroundColor: "#f8fbff",
    padding: "8px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0"
  },
  floatingFullBtn: {
    marginTop: "2px",
    height: "32px",
    borderRadius: "7px",
    border: "none",
    backgroundColor: "#4f46e5",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer"
  }
};

export default AiInterview;