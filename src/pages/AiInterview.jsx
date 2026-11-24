import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import api from "../services/api";

const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const INTERVIEW_TYPES = [
  "General English",
  "Academic Interview",
  "Job Interview"
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

/* Local user object ko safely nikalne ka helper */
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

/* Spoken name ko local user ke naam se match karne ka logic */
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
  // Agar local user object mein naam set nahi hai to bolne par allow karein
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

  const rawOverall =
    interviewMeta?.overall_score ?? interviewMeta?.overallScore;
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
      `${bestSkill.name} (${bestSkill.score}/100): Relative strongest area in this session—keep building on this consistency.`
    );
  }

  const areasForImprovement = skillEntries
    .filter((s) => s.score < 75)
    .map(
      (s) =>
        `${s.name} (${s.score}/100): Needs extra focus compared to other communication skills.`
    );

  const allMistakes = safeAnswers.flatMap((a) =>
    parseMistakes(a.mistakes).map((m) => m.mistake).filter(Boolean)
  );

  const suggestions = [];
  if (grammarScore < 75) {
    suggestions.push(
      "Review tenses, subject-verb agreement, and prepositions using the improved versions shown after each answer."
    );
  }
  if (fluencyScore < 75) {
    suggestions.push(
      "Connect ideas with simple linking words (first, because, for example, however) so answers flow smoothly."
    );
  }
  if (vocabularyScore < 75) {
    suggestions.push(
      "Replace repeated basic words with clear topic-specific words suited to your interview type."
    );
  }
  if (relevanceScore < 75) {
    suggestions.push(
      "Answer the core question directly in your first sentence before adding supporting details."
    );
  }
  if (allMistakes.length > 0) {
    suggestions.push(
      `Re-practice ${Math.min(allMistakes.length, 3)} common mistake pattern${allMistakes.length === 1 ? "" : "s"} spotted during this interview.`
    );
  }
  if (suggestions.length === 0) {
    suggestions.push(
      "Try a higher difficulty level or a new interview scenario to keep building confidence."
    );
  }

  return {
    id: interviewMeta?.id,
    level: interviewMeta?.level || fallbackLevel,
    interviewType: interviewMeta?.interview_type || interviewMeta?.interviewType || fallbackType,
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
  // "welcome" | "dashboard" | "setup" | "interview" | "report" | "history"
  const [view, setView] = useState("welcome");

  // Local user object se naam aur class nikalna
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
  const [authStatusMsg, setAuthStatusMsg] = useState(
    "Tap mic or speak your name to verify with your local profile..."
  );

  // Voice states
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [listeningMode, setListeningMode] = useState(null); // null | "name" | "answer"
  const recognitionRef = useRef(null);

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Setup state
  const [level, setLevel] = useState("Beginner");
  const [interviewType, setInterviewType] = useState("General English");
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [starting, setStarting] = useState(false);

  // Active interview state
  const [interviewId, setInterviewId] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [loadingNext, setLoadingNext] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Report state
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    if (localExpectedClass) {
      setStudentClass(localExpectedClass);
    }
  }, [localExpectedClass]);

  /* AI Text-to-Speech (Bolne wala engine) */
  const speakText = useCallback(
    (text) => {
      if (!voiceEnabled || !text || typeof window === "undefined") return;
      if (!("speechSynthesis" in window)) return;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-IN";
      utterance.rate = 0.98;
      utterance.pitch = 1.02;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [voiceEnabled]
  );

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore stop errors
      }
      recognitionRef.current = null;
    }
    setListeningMode(null);
  }, []);

  useEffect(() => {
    return () => {
      stopListening();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [stopListening]);

  /* Bole gaye naam ko local user object se verify karna */
  const verifySpokenName = useCallback(
    (transcript) => {
      const clean = (transcript || "").trim();
      setSpokenNameRaw(clean);

      if (!clean) {
        const msg = "I could not hear your name clearly. Please speak again.";
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

        const successMsg = `Verified! Welcome ${verifiedName} from ${studentClass} to Smart Students Classes. Your interview setup is ready.`;
        setAuthStatusMsg(successMsg);
        speakText(successMsg);
        setView("setup");
      } else {
        setIsAuthenticated(false);
        const failMsg = `You said "${clean}", which does not match your registered profile (${
          localExpectedName || "local user"
        }). Please speak your registered credential again.`;
        setErrorMsg(failMsg);
        setAuthStatusMsg("Verification failed. Tap mic and speak your registered name.");
        speakText(failMsg);
      }
    },
    [localExpectedName, studentClass, speakText]
  );

  /* Speech Recognition (Sunne wala engine: "name" ya "answer") */
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

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }

      stopListening();
      setErrorMsg("");

      const recognition = new SpeechRecognition();
      recognition.lang = "en-IN";
      recognition.interimResults = mode === "answer";
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
          setAnswer((prev) => {
            if (!finalTranscript.trim()) return prev;
            const spacer = prev.trim() ? " " : "";
            return `${prev.trim()}${spacer}${finalTranscript.trim()}`;
          });
        }
      };

      recognition.onerror = (event) => {
        setListeningMode(null);
        if (event.error !== "aborted") {
          setErrorMsg(`Mic issue (${event.error}). Please allow microphone permission and try again.`);
        }
      };

      recognition.onend = () => {
        setListeningMode(null);
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch {
        setListeningMode(null);
      }
    },
    [stopListening, verifySpokenName]
  );

  /* Welcome screen open hote hi AI bolkar naam puchega */
  useEffect(() => {
    if (view === "welcome") {
      const greeting = `Welcome to Smart Students Classes! run by Mr. Nitesh kushwah. Now The interview is about to start. Please speak your name so I can verify your profile.`;
      setAuthStatusMsg(greeting);
      speakText(greeting);
    }
  }, [view, speakText]);

  /* Naya question aate hi AI usko bolega */
  useEffect(() => {
    if (view === "interview" && currentQuestion && !evaluation) {
      speakText(`Question ${questionNumber}. ${currentQuestion}`);
    }
  }, [view, currentQuestion, questionNumber, evaluation, speakText]);

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

  const handleStartInterview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated || !studentName) {
      setErrorMsg("Please verify your name by speaking first on the Welcome screen.");
      setView("welcome");
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
        interviewType,
        totalQuestions,
        studentName,
        studentClass,
        verifiedByVoice: true
      });

      const createdId = res.data?.interviewId;
      const firstQuestion = res.data?.question;

      if (!createdId || !firstQuestion) {
        throw new Error("Missing interviewId or question from server.");
      }

      setInterviewId(createdId);
      setQuestionNumber(Number(res.data?.questionNumber) || 1);
      setCurrentQuestion(firstQuestion);
      setView("interview");
    } catch (err) {
      setErrorMsg(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to start interview."
      );
    } finally {
      setStarting(false);
    }
  };

  const handleEvaluateAnswer = async (e) => {
    e.preventDefault();
    if (!answer.trim()) {
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
        answer
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
        `Interview completed. Your overall score is ${built.overallScore} out of 100.`
      );
    } catch (err) {
      setErrorMsg(
        err?.response?.data?.message || "Unable to load interview report."
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
        err?.response?.data?.message || "Unable to complete interview."
      );
    } finally {
      setCompleting(false);
    }
  };

  const handleNextQuestion = async () => {
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

      setCurrentQuestion(res.data?.question || "");
      setQuestionNumber(Number(res.data?.questionNumber) || questionNumber + 1);
      setAnswer("");
      setEvaluation(null);
    } catch (err) {
      setErrorMsg(
        err?.response?.data?.message || "Unable to generate next question."
      );
    } finally {
      setLoadingNext(false);
    }
  };

  const progressPercent = useMemo(() => {
    if (!totalQuestions) return 0;
    const completedSteps = evaluation ? questionNumber : questionNumber - 1;
    return Math.max(0, Math.min(100, Math.round((completedSteps / totalQuestions) * 100)));
  }, [questionNumber, totalQuestions, evaluation]);

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-16px) rotate(5deg); }
        }
        @keyframes floatReverse {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(15px) rotate(-5deg); }
        }
        @keyframes pulseGlow {
          0%, 100% { transform: scale(1); opacity: 0.55; }
          50% { transform: scale(1.12); opacity: 0.85; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes micPulse {
          0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.55); }
          70% { box-shadow: 0 0 0 14px rgba(220, 38, 38, 0); }
          100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
        }
        .ssc-card-anim { animation: fadeSlideUp 0.5s ease-out both; }
        .ssc-float-1 { animation: floatSlow 6s ease-in-out infinite; }
        .ssc-float-2 { animation: floatReverse 7s ease-in-out infinite; }
        .ssc-float-3 { animation: floatSlow 8.5s ease-in-out infinite; }
        .ssc-orb { animation: pulseGlow 7s ease-in-out infinite; }
        .ssc-mic-active { animation: micPulse 1.5s infinite; }
      `}</style>

      {/* Animated Background */}
      <div style={styles.bgLayer} aria-hidden="true">
        <div className="ssc-orb" style={styles.bgOrbBlue} />
        <div className="ssc-orb" style={styles.bgOrbGreen} />
        <div className="ssc-orb" style={styles.bgOrbAmber} />

        <div className="ssc-float-1" style={{ ...styles.floatingBadge, top: "8%", left: "5%" }}>
          🎙️ Voice-First AI Interview
        </div>
        <div className="ssc-float-2" style={{ ...styles.floatingBadge, top: "14%", right: "6%" }}>
          🎓 Smart Students Classes
        </div>
        <div className="ssc-float-3" style={{ ...styles.floatingBadge, bottom: "14%", left: "5%" }}>
          🔊 AI Speaks &amp; Listens
        </div>
        <div className="ssc-float-1" style={{ ...styles.floatingBadge, bottom: "10%", right: "6%" }}>
          ✅ Local Profile Verified
        </div>
      </div>

      <div style={styles.container}>
        {/* Header Bar */}
        <header style={styles.header} className="ssc-card-anim">
          <div>
            <div style={styles.brandBadgeRow}>
              <span style={styles.pill}>🎓 Smart Students Classes</span>
              {isAuthenticated && studentName && (
                <span style={styles.studentChip}>
                  ✓ Verified: {studentName} • {studentClass}
                </span>
              )}
              {isSpeaking && (
                <span style={styles.speakingTag}>🔊 AI Speaking...</span>
              )}
            </div>
            <h1 style={styles.title}>AI English Voice Interview</h1>
            <p style={styles.subtitle}>
              Speak your name for local verification, listen to AI questions, and answer by voice.
            </p>
          </div>

          <div style={styles.navButtons}>
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
              {voiceEnabled ? "🔊 AI Voice: ON" : "🔇 AI Voice: OFF"}
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
              Voice Verify
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
          </div>
        </header>

        {/* Error Box */}
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

        {/* VOICE NAME VERIFICATION SCREEN */}
        {view === "welcome" && (
          <div style={styles.welcomeCard} className="ssc-card-anim">
            <div style={styles.welcomeGrid}>
              <div style={styles.welcomeHero}>
                <div style={styles.liveTag}>
                  <span style={styles.liveDot} /> INTERVIEW STARTING SOON
                </div>
                <h2 style={styles.welcomeHeading}>
                  Welcome to <br />
                  <span style={styles.welcomeHighlight}>Smart Students Classes</span>
                </h2>
                <p style={styles.welcomeText}>
                  No typing needed to start. Speak your name into the microphone—we will match it with your local user profile to authenticate your session.
                </p>

                <div style={styles.aiPreviewBox} className="ssc-float-1">
                  <div style={styles.aiAvatar}>🤖</div>
                  <div>
                    <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "14px" }}>
                      AI Voice Authenticator
                    </div>
                    <div style={{ color: "#475569", fontSize: "12px", marginTop: "2px" }}>
                      {authStatusMsg}
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.voiceVerifyBox}>
                <h3 style={styles.formHeading}>Speak Your Name to Authenticate</h3>
                <p style={styles.formSub}>
                  Local Profile Name:{" "}
                  <strong>{localExpectedName || "Not set in local user object"}</strong>
                </p>

                <div style={{ marginBottom: "14px" }}>
                  <label htmlFor="sscClassSelect" style={styles.label}>
                    Select Class
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
                    <span>Heard: <strong>&ldquo;{spokenNameRaw}&rdquo;</strong></span>
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
                    style={styles.successBtnFull}
                  >
                    ✓ Verified as {studentName} — Go to Setup →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* DASHBOARD */}
        {view === "dashboard" && (
          <div className="ssc-card-anim">
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>📊</div>
                <div style={styles.statLabel}>Total Interviews</div>
                <div style={styles.statValue}>{dashboardStats.totalInterviews}</div>
                <div style={styles.statNote}>Sessions recorded</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>🎯</div>
                <div style={styles.statLabel}>Average Score</div>
                <div style={{ ...styles.statValue, color: "#1d4ed8" }}>
                  {dashboardStats.averageScore}/100
                </div>
                <div style={styles.statNote}>Communication average</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>🏆</div>
                <div style={styles.statLabel}>Best Score</div>
                <div style={{ ...styles.statValue, color: "#15803d" }}>
                  {dashboardStats.bestScore}/100
                </div>
                <div style={styles.statNote}>Highest session score</div>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardTopRow}>
                <div>
                  <h2 style={styles.cardTitle}>Recent Interview History</h2>
                  <p style={styles.cardDesc}>
                    Your latest AI English practice sessions at Smart Students Classes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setView(isAuthenticated ? "setup" : "welcome")}
                  style={styles.primaryBtn}
                >
                  {isAuthenticated ? "+ Start New Interview" : "🎤 Voice Verify to Start"}
                </button>
              </div>

              {loadingHistory ? (
                <div style={styles.emptyState}>Loading history...</div>
              ) : history.length === 0 ? (
                <div style={styles.emptyState}>
                  <p style={{ margin: "0 0 12px" }}>
                    No AI English interviews completed yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => setView(isAuthenticated ? "setup" : "welcome")}
                    style={styles.primaryBtn}
                  >
                    Start Interview
                  </button>
                </div>
              ) : (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Date</th>
                        <th style={styles.th}>Type</th>
                        <th style={styles.th}>Level</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Score</th>
                        <th style={styles.th}>Report</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.slice(0, 5).map((item) => {
                        const dt = item.started_at || item.created_at;
                        const scoreVal = Number(item.overall_score);
                        return (
                          <tr key={item.id} style={styles.tr}>
                            <td style={styles.td}>
                              {dt
                                ? new Date(dt).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric"
                                  })
                                : "—"}
                            </td>
                            <td style={styles.td}>
                              <strong>{item.interview_type}</strong>
                            </td>
                            <td style={styles.td}>
                              <span style={styles.levelTag}>{item.level}</span>
                            </td>
                            <td style={styles.td}>{item.status}</td>
                            <td style={styles.td}>
                              <span style={styles.scoreChip}>
                                {Number.isFinite(scoreVal) && scoreVal > 0
                                  ? `${scoreVal.toFixed(1)}/100`
                                  : "—"}
                              </span>
                            </td>
                            <td style={styles.td}>
                              <button
                                type="button"
                                onClick={() => handleOpenReport(item.id)}
                                style={styles.secondaryBtn}
                              >
                                View Report
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* HISTORY SCREEN */}
        {view === "history" && (
          <div style={styles.card} className="ssc-card-anim">
            <div style={styles.cardTopRow}>
              <div>
                <h2 style={styles.cardTitle}>Interview History</h2>
                <p style={styles.cardDesc}>All completed and recorded sessions.</p>
              </div>
              <button
                type="button"
                onClick={() => setView(isAuthenticated ? "setup" : "welcome")}
                style={styles.primaryBtn}
              >
                {isAuthenticated ? "+ New Interview" : "🎤 Voice Verify"}
              </button>
            </div>

            {loadingHistory ? (
              <div style={styles.emptyState}>Loading sessions...</div>
            ) : history.length === 0 ? (
              <div style={styles.emptyState}>No interview records found.</div>
            ) : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>#</th>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Level</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Score</th>
                      <th style={styles.th}>Report</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item, idx) => {
                      const dt = item.started_at || item.created_at;
                      const scoreVal = Number(item.overall_score);
                      return (
                        <tr key={item.id} style={styles.tr}>
                          <td style={styles.td}>{idx + 1}</td>
                          <td style={styles.td}>
                            {dt
                              ? new Date(dt).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric"
                                })
                              : "—"}
                          </td>
                          <td style={styles.td}>
                            <strong>{item.interview_type}</strong>
                          </td>
                          <td style={styles.td}>
                            <span style={styles.levelTag}>{item.level}</span>
                          </td>
                          <td style={styles.td}>{item.status}</td>
                          <td style={styles.td}>
                            <span style={styles.scoreChip}>
                              {Number.isFinite(scoreVal) && scoreVal > 0
                                ? `${scoreVal.toFixed(1)}/100`
                                : "—"}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <button
                              type="button"
                              onClick={() => handleOpenReport(item.id)}
                              style={styles.secondaryBtn}
                            >
                              View Report
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SETUP SCREEN */}
        {view === "setup" && (
          <form onSubmit={handleStartInterview} style={styles.card} className="ssc-card-anim">
            <div style={styles.setupBanner}>
              <div>
                <h2 style={styles.cardTitle}>
                  Ready, {studentName || "Student"} ({studentClass})
                </h2>
                <p style={styles.cardDesc}>
                  Choose level, interview category, and question count—then speak your answers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setView("welcome")}
                style={styles.secondaryBtn}
              >
                🎤 Re-Verify Voice
              </button>
            </div>

            <div style={styles.groupBlock}>
              <label style={styles.label}>English Level</label>
              <div style={styles.grid3}>
                {LEVELS.map((lvl) => {
                  const active = level === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setLevel(lvl)}
                      style={{
                        ...styles.optionCard,
                        ...(active ? styles.optionCardActive : {})
                      }}
                    >
                      <div style={styles.optionTitle}>{lvl}</div>
                      <div style={styles.optionSub}>
                        {lvl === "Beginner" && "Simple words & clear sentence feedback"}
                        {lvl === "Intermediate" && "Everyday fluency & structured ideas"}
                        {lvl === "Advanced" && "Strong vocabulary & detailed responses"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={styles.groupBlock}>
              <label style={styles.label}>Interview Type</label>
              <div style={styles.grid3}>
                {INTERVIEW_TYPES.map((type) => {
                  const active = interviewType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setInterviewType(type)}
                      style={{
                        ...styles.optionCard,
                        ...(active ? styles.optionCardActive : {})
                      }}
                    >
                      <div style={styles.optionTitle}>{type}</div>
                      <div style={styles.optionSub}>
                        {type === "General English" && "Daily communication & expression"}
                        {type === "Academic Interview" && "Studies, subjects, goals & learning"}
                        {type === "Job Interview" && "Strengths, roles, teamwork & career"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={styles.groupBlock}>
              <label style={styles.label}>Total Questions</label>
              <div style={styles.inlineChoices}>
                {QUESTION_COUNTS.map((cnt) => {
                  const active = totalQuestions === cnt;
                  return (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setTotalQuestions(cnt)}
                      style={{
                        ...styles.pillBtn,
                        ...(active ? styles.pillBtnActive : {})
                      }}
                    >
                      {cnt} Questions
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={styles.actionRow}>
              <button
                type="button"
                onClick={() => setView("dashboard")}
                style={styles.secondaryBtn}
              >
                Cancel
              </button>
              <button type="submit" disabled={starting} style={styles.primaryBtn}>
                {starting ? "Starting Voice Interview..." : "Start Voice Interview 🎙️"}
              </button>
            </div>
          </form>
        )}

        {/* LIVE VOICE INTERVIEW */}
        {view === "interview" && (
          <div style={styles.card} className="ssc-card-anim">
            <div style={styles.interviewHeader}>
              <div style={styles.badgeRow}>
                <span style={styles.liveTag}>
                  <span style={styles.liveDot} /> LIVE VOICE INTERVIEW
                </span>
                <span style={styles.levelTag}>{level}</span>
                <span style={styles.typeTag}>{interviewType}</span>
              </div>
              <div style={styles.qCountText}>
                Question {questionNumber} of {totalQuestions}
              </div>
            </div>

            <div style={styles.progressSection}>
              <div style={styles.progressMeta}>
                <span>Progress</span>
                <span>{progressPercent}%</span>
              </div>
              <div style={styles.progressTrack}>
                <div
                  style={{
                    ...styles.progressBar,
                    width: `${progressPercent}%`
                  }}
                />
              </div>
            </div>

            <div style={styles.questionBox}>
              <div style={styles.questionTopRow}>
                <div style={styles.questionCaption}>AI Question</div>
                <button
                  type="button"
                  onClick={() => speakText(currentQuestion)}
                  style={styles.listenAgainBtn}
                >
                  🔊 Listen Question Again
                </button>
              </div>
              <h2 style={styles.questionHeading}>{currentQuestion}</h2>
            </div>

            {!evaluation ? (
              <form onSubmit={handleEvaluateAnswer}>
                <div style={styles.answerHeaderRow}>
                  <label htmlFor="interviewAnswerInput" style={styles.label}>
                    Speak or Review Your Answer
                  </label>

                  {listeningMode === "answer" ? (
                    <button
                      type="button"
                      onClick={stopListening}
                      style={styles.stopMicBtn}
                      className="ssc-mic-active"
                    >
                      🛑 Stop Speaking
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startVoiceRecognition("answer")}
                      style={styles.speakAnswerBtn}
                    >
                      🎤 Speak Answer
                    </button>
                  )}
                </div>

                <textarea
                  id="interviewAnswerInput"
                  rows={6}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Tap 'Speak Answer' and talk, or type your answer here..."
                  style={styles.textarea}
                  disabled={evaluating}
                />

                <div style={styles.actionRow}>
                  <span style={styles.wordHint}>
                    {answer.trim() ? answer.trim().split(/\s+/).length : 0} words
                    {listeningMode === "answer" ? " • Mic is recording your voice..." : ""}
                  </span>
                  <button
                    type="submit"
                    disabled={evaluating}
                    style={styles.primaryBtn}
                  >
                    {evaluating ? "Evaluating Answer..." : "Submit Answer"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="ssc-card-anim">
                <div style={styles.answerPreview}>
                  <div style={styles.previewLabel}>Your Spoken / Submitted Answer</div>
                  <p style={styles.previewText}>{answer}</p>
                </div>

                <h3 style={styles.subTitle}>Evaluation &amp; Feedback</h3>
                <div style={styles.scoresGrid4}>
                  <ScoreCard label="Grammar Score" score={evaluation.grammarScore} />
                  <ScoreCard label="Fluency Score" score={evaluation.fluencyScore} />
                  <ScoreCard label="Vocabulary Score" score={evaluation.vocabularyScore} />
                  <ScoreCard label="Relevance Score" score={evaluation.relevanceScore} />
                </div>

                {evaluation.feedback && (
                  <div style={styles.infoBox}>
                    <div style={styles.infoTitle}>Overall Feedback</div>
                    <p style={styles.infoText}>{evaluation.feedback}</p>
                  </div>
                )}

                <div style={styles.infoBox}>
                  <div style={styles.infoTitle}>Mistakes Identified</div>
                  {evaluation.mistakes.length === 0 ? (
                    <p style={styles.infoText}>
                      No mistakes identified in this answer. Well done!
                    </p>
                  ) : (
                    <ul style={styles.list}>
                      {evaluation.mistakes.map((m, idx) => (
                        <li key={idx} style={styles.listItem}>
                          <strong>{m.mistake}</strong>
                          {m.explanation ? ` — ${m.explanation}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {evaluation.improvedAnswer && (
                  <div style={styles.improvedBox}>
                    <div style={styles.improvedTitle}>Improved Version of Your Answer</div>
                    <p style={styles.improvedText}>{evaluation.improvedAnswer}</p>
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
                      {loadingNext ? "Loading Next Question..." : "Next Question →"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCompleteInterview}
                      disabled={completing}
                      style={styles.successBtn}
                    >
                      {completing ? "Completing Interview..." : "Complete Interview & View Report"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* FINAL REPORT SCREEN */}
        {view === "report" && (
          <div style={styles.card} className="ssc-card-anim">
            <div style={styles.cardTopRow}>
              <div>
                <span style={styles.pill}>Final Report</span>
                <h2 style={styles.cardTitle}>
                  Interview Performance Report{studentName ? ` — ${studentName}` : ""}
                </h2>
                {reportData && (
                  <p style={styles.cardDesc}>
                    {studentClass} • {reportData.interviewType} • Level:{" "}
                    <strong>{reportData.level}</strong>
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setView("dashboard")}
                style={styles.primaryBtn}
              >
                Back to Dashboard
              </button>
            </div>

            {loadingReport ? (
              <div style={styles.emptyState}>Loading final report...</div>
            ) : !reportData ? (
              <div style={styles.emptyState}>No report available.</div>
            ) : (
              <div>
                <div style={styles.overallBox}>
                  <div>
                    <div style={styles.overallLabel}>Overall Score</div>
                    <div style={styles.overallHint}>
                      Average across {reportData.answers.length} evaluated question
                      {reportData.answers.length === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div style={styles.overallScore}>{reportData.overallScore}/100</div>
                </div>

                <div style={styles.scoresGrid4}>
                  <ScoreCard label="Grammar Score" score={reportData.grammarScore} />
                  <ScoreCard label="Fluency Score" score={reportData.fluencyScore} />
                  <ScoreCard label="Vocabulary Score" score={reportData.vocabularyScore} />
                  <ScoreCard label="Relevance Score" score={reportData.relevanceScore} />
                </div>

                <div style={styles.twoCol}>
                  <div style={styles.strengthBox}>
                    <h3 style={styles.boxHeading}>Strengths</h3>
                    <ul style={styles.list}>
                      {reportData.strengths.map((item, i) => (
                        <li key={i} style={styles.listItem}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div style={styles.improveBox}>
                    <h3 style={styles.boxHeading}>Areas for Improvement</h3>
                    {reportData.areasForImprovement.length === 0 ? (
                      <p style={styles.infoText}>
                        Strong performance across all four skill areas.
                      </p>
                    ) : (
                      <ul style={styles.list}>
                        {reportData.areasForImprovement.map((item, i) => (
                          <li key={i} style={styles.listItem}>
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div style={styles.infoBox}>
                  <h3 style={styles.boxHeading}>AI Improvement Suggestions</h3>
                  <ul style={styles.list}>
                    {reportData.suggestions.map((tip, i) => (
                      <li key={i} style={styles.listItem}>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={styles.actionRow}>
                  <button
                    type="button"
                    onClick={() => setView("setup")}
                    style={styles.primaryBtn}
                  >
                    Practice Another Interview
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AiInterview;

const styles = {
  page: {
    position: "relative",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #eff6ff 0%, #f0fdf4 50%, #fefce8 100%)",
    padding: "24px 16px 48px",
    fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
    color: "#0f172a",
    overflow: "hidden"
  },
  bgLayer: {
    position: "fixed",
    inset: 0,
    pointerEvents: "none",
    zIndex: 0,
    overflow: "hidden"
  },
  bgOrbBlue: {
    position: "absolute",
    top: "-80px",
    left: "-80px",
    width: "340px",
    height: "340px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(59,130,246,0.22) 0%, rgba(59,130,246,0) 70%)"
  },
  bgOrbGreen: {
    position: "absolute",
    bottom: "-100px",
    right: "-60px",
    width: "380px",
    height: "380px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(22,163,74,0.2) 0%, rgba(22,163,74,0) 70%)"
  },
  bgOrbAmber: {
    position: "absolute",
    top: "42%",
    right: "18%",
    width: "260px",
    height: "260px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(245,158,11,0.16) 0%, rgba(245,158,11,0) 70%)"
  },
  floatingBadge: {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 255, 0.86)",
    backdropFilter: "blur(6px)",
    border: "1px solid rgba(255,255,255,0.9)",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
    padding: "8px 14px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    color: "#1e3a8a"
  },
  container: {
    position: "relative",
    zIndex: 1,
    maxWidth: "1040px",
    margin: "0 auto"
  },
  header: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    backdropFilter: "blur(10px)",
    borderRadius: "20px",
    padding: "20px 24px",
    marginBottom: "22px",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
    border: "1px solid #e2e8f0"
  },
  brandBadgeRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "8px",
    marginBottom: "6px"
  },
  pill: {
    display: "inline-block",
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
    fontWeight: 700,
    fontSize: "12px",
    padding: "4px 12px",
    borderRadius: "999px"
  },
  studentChip: {
    display: "inline-block",
    backgroundColor: "#dcfce7",
    color: "#15803d",
    fontWeight: 700,
    fontSize: "12px",
    padding: "4px 12px",
    borderRadius: "999px"
  },
  speakingTag: {
    display: "inline-block",
    backgroundColor: "#fef3c7",
    color: "#b45309",
    fontWeight: 700,
    fontSize: "12px",
    padding: "4px 12px",
    borderRadius: "999px"
  },
  title: {
    margin: 0,
    fontSize: "24px",
    fontWeight: 800,
    color: "#0f172a"
  },
  subtitle: {
    margin: "4px 0 0",
    fontSize: "13px",
    color: "#475569"
  },
  navButtons: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    alignItems: "center"
  },
  navBtn: {
    padding: "9px 14px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#334155",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer"
  },
  voiceOnBtn: {
    backgroundColor: "#f0fdf4",
    borderColor: "#16a34a",
    color: "#15803d"
  },
  navBtnActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#2563eb",
    color: "#1d4ed8"
  },
  primaryBtn: {
    padding: "10px 18px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer"
  },
  secondaryBtn: {
    padding: "8px 14px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#1e293b",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer"
  },
  successBtn: {
    padding: "11px 20px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: "14px",
    cursor: "pointer"
  },
  errorBox: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    padding: "12px 16px",
    borderRadius: "12px",
    marginBottom: "18px",
    fontSize: "14px",
    fontWeight: 600
  },
  errorDismiss: {
    background: "none",
    border: "none",
    color: "#b91c1c",
    fontWeight: 700,
    cursor: "pointer",
    textDecoration: "underline"
  },
  welcomeCard: {
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: "24px",
    padding: "32px",
    boxShadow: "0 16px 40px rgba(15, 23, 42, 0.08)",
    border: "1px solid #e2e8f0"
  },
  welcomeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
    gap: "28px",
    alignItems: "center"
  },
  welcomeHero: { padding: "8px" },
  liveTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#dcfce7",
    color: "#15803d",
    fontWeight: 800,
    fontSize: "11px",
    letterSpacing: "0.05em",
    padding: "5px 12px",
    borderRadius: "999px",
    marginBottom: "14px"
  },
  liveDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#16a34a",
    display: "inline-block"
  },
  welcomeHeading: {
    margin: "0 0 12px",
    fontSize: "30px",
    lineHeight: 1.2,
    fontWeight: 800,
    color: "#0f172a"
  },
  welcomeHighlight: {
    background: "linear-gradient(90deg, #1d4ed8, #16a34a)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent"
  },
  welcomeText: {
    margin: "0 0 22px",
    fontSize: "15px",
    lineHeight: 1.6,
    color: "#475569"
  },
  aiPreviewBox: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    backgroundColor: "#f8fafc",
    border: "1px solid #dbeafe",
    borderRadius: "16px",
    padding: "14px 16px"
  },
  aiAvatar: {
    width: "46px",
    height: "46px",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #2563eb, #16a34a)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    flexShrink: 0
  },
  voiceVerifyBox: {
    backgroundColor: "#f8fafc",
    borderRadius: "20px",
    padding: "26px",
    border: "1px solid #e2e8f0"
  },
  formHeading: {
    margin: "0 0 4px",
    fontSize: "20px",
    fontWeight: 800,
    color: "#0f172a"
  },
  formSub: {
    margin: "0 0 16px",
    fontSize: "13px",
    color: "#475569"
  },
  textInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 14px",
    borderRadius: "12px",
    border: "1.5px solid #cbd5e1",
    backgroundColor: "#ffffff",
    fontSize: "14px",
    color: "#0f172a"
  },
  micCenterBlock: {
    display: "flex",
    justifyContent: "center",
    marginTop: "18px",
    marginBottom: "12px"
  },
  bigMicBtn: {
    width: "100%",
    padding: "15px 20px",
    borderRadius: "14px",
    border: "none",
    background: "linear-gradient(135deg, #2563eb 0%, #16a34a 100%)",
    color: "#ffffff",
    fontWeight: 800,
    fontSize: "15px",
    cursor: "pointer"
  },
  stopMicBtn: {
    padding: "11px 18px",
    borderRadius: "12px",
    border: "none",
    backgroundColor: "#dc2626",
    color: "#ffffff",
    fontWeight: 800,
    fontSize: "13px",
    cursor: "pointer"
  },
  speakAnswerBtn: {
    padding: "9px 16px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer"
  },
  heardBox: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "10px",
    padding: "10px 12px",
    fontSize: "13px",
    marginBottom: "12px"
  },
  smallVerifyBtn: {
    padding: "6px 10px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#1d4ed8",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: "12px",
    cursor: "pointer"
  },
  successBtnFull: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "12px",
    border: "none",
    backgroundColor: "#15803d",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: "14px",
    cursor: "pointer",
    marginTop: "6px"
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "20px"
  },
  statCard: {
    backgroundColor: "#ffffff",
    borderRadius: "18px",
    padding: "20px",
    border: "1px solid #e2e8f0"
  },
  statIcon: { fontSize: "22px", marginBottom: "6px" },
  statLabel: { fontSize: "13px", fontWeight: 600, color: "#64748b" },
  statValue: { fontSize: "28px", fontWeight: 800, color: "#0f172a", margin: "4px 0" },
  statNote: { fontSize: "12px", color: "#94a3b8" },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "20px",
    padding: "26px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)"
  },
  cardTopRow: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "18px"
  },
  setupBanner: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px",
    paddingBottom: "16px",
    borderBottom: "1px solid #f1f5f9"
  },
  cardTitle: { margin: 0, fontSize: "20px", fontWeight: 800, color: "#0f172a" },
  cardDesc: { margin: "4px 0 0", fontSize: "13px", color: "#64748b" },
  emptyState: {
    textAlign: "center",
    padding: "36px 16px",
    color: "#64748b",
    backgroundColor: "#f8fafc",
    borderRadius: "14px"
  },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "14px" },
  th: {
    textAlign: "left",
    padding: "12px",
    borderBottom: "2px solid #e2e8f0",
    color: "#475569",
    fontWeight: 700,
    fontSize: "12px",
    textTransform: "uppercase"
  },
  tr: { borderBottom: "1px solid #f1f5f9" },
  td: { padding: "12px", color: "#1e293b" },
  levelTag: {
    display: "inline-block",
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700
  },
  typeTag: {
    display: "inline-block",
    backgroundColor: "#f0fdf4",
    color: "#15803d",
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700
  },
  scoreChip: {
    display: "inline-block",
    backgroundColor: "#f1f5f9",
    color: "#0f172a",
    padding: "4px 10px",
    borderRadius: "8px",
    fontWeight: 700,
    fontSize: "13px"
  },
  groupBlock: { marginBottom: "22px" },
  label: {
    display: "block",
    fontSize: "14px",
    fontWeight: 700,
    color: "#1e293b",
    marginBottom: "8px"
  },
  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "12px"
  },
  optionCard: {
    textAlign: "left",
    padding: "16px",
    borderRadius: "14px",
    border: "2px solid #e2e8f0",
    backgroundColor: "#ffffff",
    cursor: "pointer"
  },
  optionCardActive: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff"
  },
  optionTitle: { fontSize: "15px", fontWeight: 700, color: "#0f172a", marginBottom: "4px" },
  optionSub: { fontSize: "12px", color: "#64748b" },
  inlineChoices: { display: "flex", gap: "12px", flexWrap: "wrap" },
  pillBtn: {
    padding: "10px 20px",
    borderRadius: "999px",
    border: "2px solid #e2e8f0",
    backgroundColor: "#ffffff",
    fontWeight: 700,
    fontSize: "13px",
    color: "#334155",
    cursor: "pointer"
  },
  pillBtnActive: {
    borderColor: "#2563eb",
    backgroundColor: "#2563eb",
    color: "#ffffff"
  },
  actionRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginTop: "20px",
    flexWrap: "wrap"
  },
  interviewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: "14px"
  },
  badgeRow: { display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" },
  qCountText: { fontSize: "14px", fontWeight: 700, color: "#1e293b" },
  progressSection: { marginBottom: "20px" },
  progressMeta: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "12px",
    fontWeight: 600,
    color: "#64748b",
    marginBottom: "6px"
  },
  progressTrack: {
    height: "10px",
    backgroundColor: "#e2e8f0",
    borderRadius: "999px",
    overflow: "hidden"
  },
  progressBar: {
    height: "100%",
    background: "linear-gradient(90deg, #2563eb, #16a34a)",
    borderRadius: "999px",
    transition: "width 0.4s ease"
  },
  questionBox: {
    background: "linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)",
    border: "1px solid #bfdbfe",
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "20px"
  },
  questionTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    marginBottom: "8px",
    flexWrap: "wrap"
  },
  questionCaption: {
    fontSize: "12px",
    fontWeight: 800,
    textTransform: "uppercase",
    color: "#1d4ed8"
  },
  listenAgainBtn: {
    padding: "6px 12px",
    borderRadius: "8px",
    border: "1px solid #93c5fd",
    backgroundColor: "#ffffff",
    color: "#1d4ed8",
    fontWeight: 700,
    fontSize: "12px",
    cursor: "pointer"
  },
  questionHeading: { margin: 0, fontSize: "19px", lineHeight: 1.5, color: "#0f172a", fontWeight: 700 },
  answerHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    marginBottom: "8px",
    flexWrap: "wrap"
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: "14px",
    border: "1.5px solid #cbd5e1",
    padding: "14px",
    fontSize: "15px",
    lineHeight: 1.6,
    fontFamily: "inherit",
    resize: "vertical"
  },
  wordHint: { fontSize: "13px", color: "#64748b" },
  answerPreview: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "14px 16px",
    marginBottom: "18px"
  },
  previewLabel: { fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "4px" },
  previewText: { margin: 0, fontSize: "14px", color: "#1e293b", lineHeight: 1.5 },
  subTitle: { margin: "0 0 12px", fontSize: "16px", fontWeight: 800, color: "#0f172a" },
  scoresGrid4: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: "14px",
    marginBottom: "18px"
  },
  scoreCard: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "16px 12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center"
  },
  circularWrapper: { position: "relative", width: "86px", height: "86px", marginBottom: "8px" },
  circularValue: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center"
  },
  scoreTitle: { fontSize: "13px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" },
  scoreBadge: { fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "999px" },
  infoBox: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "16px",
    marginBottom: "14px"
  },
  infoTitle: { fontSize: "14px", fontWeight: 800, color: "#0f172a", marginBottom: "6px" },
  infoText: { margin: 0, fontSize: "14px", color: "#334155", lineHeight: 1.6 },
  improvedBox: {
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "14px",
    padding: "16px",
    marginBottom: "14px"
  },
  improvedTitle: { fontSize: "14px", fontWeight: 800, color: "#15803d", marginBottom: "6px" },
  improvedText: { margin: 0, fontSize: "14px", color: "#14532d", lineHeight: 1.6 },
  list: { margin: 0, paddingLeft: "20px" },
  listItem: { fontSize: "14px", color: "#334155", lineHeight: 1.6, marginBottom: "6px" },
  overallBox: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    background: "linear-gradient(135deg, #1d4ed8 0%, #15803d 100%)",
    color: "#ffffff",
    borderRadius: "16px",
    padding: "20px 24px",
    marginBottom: "18px"
  },
  overallLabel: { fontSize: "17px", fontWeight: 800 },
  overallHint: { fontSize: "13px", opacity: 0.9, marginTop: "2px" },
  overallScore: { fontSize: "34px", fontWeight: 900 },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "14px",
    marginBottom: "14px"
  },
  strengthBox: {
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "14px",
    padding: "16px"
  },
  improveBox: {
    backgroundColor: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: "14px",
    padding: "16px"
  },
  boxHeading: { margin: "0 0 10px", fontSize: "15px", fontWeight: 800, color: "#0f172a" }
};
