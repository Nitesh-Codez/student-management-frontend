import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoogleGenAI } from "@google/genai";
import api from "../services/api";

// Create React App requires direct static property access for env vars
const GEMINI_API_KEY = (process.env.REACT_APP_GEMINI_API_KEY || "").trim();
const GEMINI_MODEL = (
  process.env.REACT_APP_GEMINI_MODEL || "gemini-2.5-flash"
).trim();

const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

const extractApiError = (err, fallback) =>
  err?.response?.data?.message ||
  err?.response?.data?.error ||
  err?.message ||
  fallback;

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
      // fallback comma split
    }
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

const pickRandomTopic = (topics = [], fallbackSubject = "General") => {
  if (Array.isArray(topics) && topics.length > 0) {
    return topics[Math.floor(Math.random() * topics.length)];
  }
  return fallbackSubject || "General";
};

const isVivaAvailable = (row) => {
  const status = String(row?.status || "").toLowerCase();
  const availStatus = String(row?.availability_status || "").toLowerCase();
  if (availStatus && availStatus !== "available") return false;
  if (status && status !== "active" && status !== "available") return false;
  if (row?.eligible === false) return false;
  return true;
};

const normalizeAvailableViva = (row) => {
  if (!row || typeof row !== "object") return null;
  return {
    id: row.id ?? row.viva_id,
    title: row.title || "Viva",
    class_name: row.class_name ?? row.className ?? "",
    subject: row.subject || "General",
    description: row.description || "",
    topics: parseTopicsList(row.topics ?? row.viva_topics ?? row.admin_viva_topics),
    total_questions: Number(row.total_questions ?? row.totalQuestions ?? 5) || 5,
    duration_minutes: Number(row.duration_minutes ?? row.durationMinutes ?? 10) || 10,
  };
};

// --------------------------------------------------
// GEMINI LIVE QUESTION & REPLY
// --------------------------------------------------

async function generateGeminiQuestion({ viva, topic, questionNumber, askedQuestions }) {
  if (!ai) {
    throw new Error(
      "Gemini API key missing. Add REACT_APP_GEMINI_API_KEY in .env and restart npm start."
    );
  }

  const prompt = `
You are a live AI Viva teacher taking a real-life spoken viva for Class ${viva.class_name || "School"} (${viva.subject}).
Secret topic (NEVER print or say topic name): "${topic}".
Question ${questionNumber} of ${viva.total_questions}.
Previous questions: ${JSON.stringify(askedQuestions)}.
Ask one natural, clear viva question in 1-2 short sentences that sounds great when spoken aloud.
Return ONLY the question.
`.trim();

  const res = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
  });

  return (res?.text || "").trim();
}

async function generateGeminiPostAnswerReply({ viva, topic, question, studentAnswer }) {
  if (!ai) {
    throw new Error(
      "Gemini API key missing. Add REACT_APP_GEMINI_API_KEY in .env and restart npm start."
    );
  }

  const prompt = `
You are a live AI Viva teacher in a real-life conversation with a student.
Subject: ${viva.subject}, Class: ${viva.class_name || "School"}.
Secret topic context: "${topic}".
Question asked: "${question}"
Student answered: "${studentAnswer}"

Reply naturally and warmly in 1-2 short spoken sentences acknowledging what the student told about (e.g., thanking them for explaining and briefly guiding). No robotic labels.
Return ONLY the spoken reply.
`.trim();

  const res = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
  });

  return (res?.text || "").trim();
}

// --------------------------------------------------
// LARGE 3D/5D FLYING VIVA BOT
// --------------------------------------------------

function Big3D5DBot({ isSpeaking, isListening, isGenerating }) {
  const [look, setLook] = useState({ x: 0, y: 0 });

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    setLook({
      x: Number((nx * 24).toFixed(1)),
      y: Number((ny * 18).toFixed(1)),
    });
  };

  const onLeave = () => setLook({ x: 0, y: 0 });

  const statusText = isGenerating
    ? "Thinking..."
    : isSpeaking
    ? "Speaking..."
    : isListening
    ? "Listening..."
    : "Looking at you";

  return (
    <div
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        position: "relative",
        width: "100%",
        height: "310px",
        borderRadius: "20px",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 50% 25%, #0e7490 0%, #0f172a 58%, #020617 100%)",
        border: "2px solid #38bdf8",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        perspective: "1000px",
        userSelect: "none",
      }}
    >
      {/* 5D Glow Halo */}
      <div
        style={{
          position: "absolute",
          width: "240px",
          height: "240px",
          borderRadius: "50%",
          border: isListening
            ? "2.5px dashed rgba(52, 211, 153, 0.75)"
            : "2.5px dashed rgba(56, 189, 248, 0.55)",
          transform: "rotateX(70deg)",
          animation: isSpeaking
            ? "haloPulse 1.1s ease-in-out infinite"
            : "haloSpin 11s linear infinite",
          pointerEvents: "none",
        }}
      />

      {/* Full Large Bot */}
      <div
        style={{
          position: "relative",
          width: "190px",
          height: "235px",
          transformStyle: "preserve-3d",
          transform: `rotateX(${-look.y * 0.65}deg) rotateY(${look.x * 0.75}deg)`,
          transition: "transform 0.14s ease-out",
          animation: isListening
            ? "botListenBob 2s ease-in-out infinite"
            : "botFlyBig 3.6s ease-in-out infinite",
          filter: isSpeaking
            ? "drop-shadow(0 0 24px rgba(56, 189, 248, 0.85))"
            : isListening
            ? "drop-shadow(0 0 22px rgba(16, 185, 129, 0.75))"
            : "drop-shadow(0 16px 26px rgba(2, 132, 199, 0.4))",
        }}
      >
        {/* HEAD */}
        <div
          style={{
            position: "relative",
            width: "122px",
            height: "96px",
            margin: "0 auto",
            borderRadius: "48px 48px 38px 38px",
            background:
              "linear-gradient(145deg, #ffffff 0%, #e2e8f0 62%, #94a3b8 100%)",
            border: "2.5px solid #f8fafc",
            boxShadow: "inset -8px -8px 18px rgba(15, 23, 42, 0.28)",
            transform: `translate3d(${look.x * 0.28}px, ${look.y * 0.22}px, 18px)`,
            transition: "transform 0.12s ease-out",
          }}
        >
          {/* VISOR */}
          <div
            style={{
              position: "absolute",
              top: "18px",
              left: "11px",
              right: "11px",
              height: "58px",
              borderRadius: "28px",
              backgroundColor: "#020617",
              border: "2px solid #38bdf8",
              boxShadow: isSpeaking
                ? "0 0 18px rgba(56, 189, 248, 0.95)"
                : "0 0 10px rgba(56, 189, 248, 0.5)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            {/* EYES */}
            <div
              style={{
                display: "flex",
                gap: "22px",
                transform: `translate(${look.x * 0.32}px, ${look.y * 0.25}px)`,
                transition: "transform 0.1s ease-out",
              }}
            >
              <span
                style={{
                  width: "15px",
                  height: isListening ? "15px" : "10px",
                  borderRadius: "999px",
                  backgroundColor: isListening ? "#34d399" : "#38bdf8",
                  boxShadow: isListening ? "0 0 12px #34d399" : "0 0 12px #38bdf8",
                  animation: "blinkAnim 4.2s infinite",
                }}
              />
              <span
                style={{
                  width: "15px",
                  height: isListening ? "15px" : "10px",
                  borderRadius: "999px",
                  backgroundColor: isListening ? "#34d399" : "#38bdf8",
                  boxShadow: isListening ? "0 0 12px #34d399" : "0 0 12px #38bdf8",
                  animation: "blinkAnim 4.2s infinite",
                }}
              />
            </div>

            {/* MOUTH */}
            <div
              style={{
                width: isSpeaking ? "32px" : isListening ? "22px" : "15px",
                height: isSpeaking ? "8px" : "4px",
                borderRadius: "999px",
                backgroundColor: isSpeaking ? "#7dd3fc" : "#34d399",
                animation: isSpeaking ? "talkMouth 0.25s infinite alternate" : "none",
              }}
            />
          </div>
        </div>

        {/* TORSO + ARMS */}
        <div
          style={{
            position: "relative",
            width: "102px",
            height: "74px",
            margin: "-5px auto 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* LEFT ARM */}
          <div
            style={{
              position: "absolute",
              left: "-24px",
              top: "8px",
              width: "24px",
              height: "58px",
              borderRadius: "15px",
              background: "linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%)",
              border: "2px solid #f1f5f9",
              transformOrigin: "top center",
              animation: isSpeaking
                ? "armWaveL 0.85s ease-in-out infinite"
                : "armFloat 3.2s ease-in-out infinite",
            }}
          >
            <div
              style={{
                position: "absolute",
                bottom: "-6px",
                left: "2px",
                width: "20px",
                height: "18px",
                borderRadius: "50%",
                backgroundColor: "#38bdf8",
              }}
            />
          </div>

          {/* TORSO */}
          <div
            style={{
              width: "76px",
              height: "68px",
              borderRadius: "26px 26px 34px 34px",
              background:
                "linear-gradient(150deg, #ffffff 0%, #cbd5e1 72%, #64748b 100%)",
              border: "2px solid #f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                backgroundColor: isSpeaking ? "#38bdf8" : "#10b981",
                boxShadow: isSpeaking ? "0 0 14px #38bdf8" : "0 0 10px #10b981",
              }}
            />
          </div>

          {/* RIGHT ARM */}
          <div
            style={{
              position: "absolute",
              right: "-24px",
              top: "8px",
              width: "24px",
              height: "58px",
              borderRadius: "15px",
              background: "linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%)",
              border: "2px solid #f1f5f9",
              transformOrigin: "top center",
              animation: isSpeaking
                ? "armWaveR 0.85s ease-in-out infinite"
                : "armFloat 3.2s ease-in-out infinite reverse",
            }}
          >
            <div
              style={{
                position: "absolute",
                bottom: "-6px",
                right: "2px",
                width: "20px",
                height: "18px",
                borderRadius: "50%",
                backgroundColor: "#38bdf8",
              }}
            />
          </div>
        </div>

        {/* LEGS */}
        <div
          style={{
            position: "relative",
            width: "70px",
            height: "56px",
            margin: "-2px auto 0",
            display: "flex",
            justifyContent: "space-between",
            padding: "0 6px",
          }}
        >
          <div
            style={{
              width: "22px",
              height: "46px",
              borderRadius: "10px 10px 15px 15px",
              background: "linear-gradient(180deg, #e2e8f0 0%, #64748b 100%)",
              border: "1.5px solid #f8fafc",
              transformOrigin: "top center",
              animation: "legSwing 2.3s ease-in-out infinite",
            }}
          />
          <div
            style={{
              width: "22px",
              height: "46px",
              borderRadius: "10px 10px 15px 15px",
              background: "linear-gradient(180deg, #e2e8f0 0%, #64748b 100%)",
              border: "1.5px solid #f8fafc",
              transformOrigin: "top center",
              animation: "legSwing 2.3s ease-in-out infinite reverse",
            }}
          />
        </div>
      </div>

      <div
        style={{
          marginTop: "6px",
          padding: "4px 14px",
          borderRadius: "999px",
          backgroundColor: "rgba(2, 6, 23, 0.85)",
          border: "1px solid #38bdf8",
          color: "#f8fafc",
          fontSize: "12px",
          fontWeight: 700,
          zIndex: 3,
        }}
      >
        {statusText}
      </div>
    </div>
  );
}

// --------------------------------------------------
// MAIN COMPONENT
// --------------------------------------------------

function StudentViva() {
  const [vivas, setVivas] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Active Live Viva State
  const [activeViva, setActiveViva] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [currentTopic, setCurrentTopic] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [askedQuestions, setAskedQuestions] = useState([]);
  const [botReply, setBotReply] = useState("");
  const [spokenAnswer, setSpokenAnswer] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);

  // Camera State
  const [cameraStatus, setCameraStatus] = useState("idle");

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const shouldAutoListenRef = useRef(false);
  const spokenAnswerRef = useRef("");
  const silenceTimerRef = useRef(null);

  useEffect(() => {
    spokenAnswerRef.current = spokenAnswer;
  }, [spokenAnswer]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // ----------------------------------------------
  // AUTO LISTENING ENGINE
  // ----------------------------------------------

  const stopAutoListen = useCallback(() => {
    clearSilenceTimer();
    shouldAutoListenRef.current = false;
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
  }, [clearSilenceTimer]);

  const sendSpokenAnswerRef = useRef(null);

  const startAutoListen = useCallback(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition || !activeViva || sessionDone || isGenerating) return;

    shouldAutoListenRef.current = true;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      let fullText = "";
      for (let i = 0; i < event.results.length; i++) {
        fullText += `${event.results[i][0].transcript} `;
      }
      const cleaned = fullText.trim();
      setSpokenAnswer(cleaned);

      // Auto-send 2.5s after student stops speaking
      clearSilenceTimer();
      if (cleaned) {
        silenceTimerRef.current = setTimeout(() => {
          if (sendSpokenAnswerRef.current) {
            sendSpokenAnswerRef.current();
          }
        }, 2500);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (shouldAutoListenRef.current && !isGenerating && !sessionDone) {
        try {
          recognition.start();
        } catch {
          // ignore restart collision
        }
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setIsListening(false);
    }
  }, [activeViva, sessionDone, isGenerating, clearSilenceTimer]);

  // ----------------------------------------------
  // BOT SPEAKS ONCE APPEARED -> THEN AUTO LISTENS
  // ----------------------------------------------

  const speakAndThenListen = useCallback(
    (textToSpeak) => {
      stopAutoListen();

      if (!textToSpeak || typeof window === "undefined") {
        startAutoListen();
        return;
      }

      if (!("speechSynthesis" in window)) {
        startAutoListen();
        return;
      }

      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(textToSpeak);
        utter.rate = 1;
        utter.pitch = 1.06;

        utter.onstart = () => {
          setIsSpeaking(true);
        };

        utter.onend = () => {
          setIsSpeaking(false);
          if (!sessionDone) {
            startAutoListen();
          }
        };

        utter.onerror = () => {
          setIsSpeaking(false);
          if (!sessionDone) {
            startAutoListen();
          }
        };

        window.speechSynthesis.speak(utter);
      } catch {
        setIsSpeaking(false);
        startAutoListen();
      }
    },
    [stopAutoListen, startAutoListen, sessionDone]
  );

  // ----------------------------------------------
  // FETCH AVAILABLE VIVAS ONLY
  // ----------------------------------------------

  const fetchAvailableVivas = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const studentId = getLoggedInStudentId();
      const res = await api.get("/api/student/viva/available", {
        params: studentId ? { studentId } : {},
      });
      const list = Array.isArray(res.data?.vivas) ? res.data.vivas : [];
      const filtered = list
        .filter(isVivaAvailable)
        .map(normalizeAvailableViva)
        .filter((v) => v && v.id !== undefined && v.id !== null);
      setVivas(filtered);
    } catch (err) {
      setErrorMsg(extractApiError(err, "Unable to fetch available vivas."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailableVivas();
  }, [fetchAvailableVivas]);

  const subjects = useMemo(() => {
    const set = new Set();
    vivas.forEach((v) => v.subject && set.add(v.subject));
    return ["ALL", ...Array.from(set)];
  }, [vivas]);

  const visibleVivas = useMemo(() => {
    if (selectedSubject === "ALL") return vivas;
    return vivas.filter(
      (v) => String(v.subject).toLowerCase() === selectedSubject.toLowerCase()
    );
  }, [vivas, selectedSubject]);

  // ----------------------------------------------
  // LIVE CAMERA MONITORING
  // ----------------------------------------------

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStatus("idle");
  }, []);

  useEffect(() => {
    if (!activeViva) {
      stopCamera();
      return;
    }

    let cancelled = false;
    setCameraStatus("idle");

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera unavailable");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
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
        setCameraStatus("active");
      } catch (err) {
        if (!cancelled) {
          setCameraStatus(err?.name === "NotAllowedError" ? "denied" : "error");
        }
      }
    })();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [activeViva, stopCamera]);

  // ----------------------------------------------
  // START VIVA -> BOT SPEAKS IMMEDIATELY
  // ----------------------------------------------

  const startLiveViva = async (viva) => {
    setActiveViva(viva);
    setQuestionNumber(1);
    setAskedQuestions([]);
    setSpokenAnswer("");
    setBotReply("");
    setSessionDone(false);
    setIsGenerating(true);

    try {
      const topic = pickRandomTopic(viva.topics, viva.subject);
      setCurrentTopic(topic);

      const qText = await generateGeminiQuestion({
        viva,
        topic,
        questionNumber: 1,
        askedQuestions: [],
      });

      setCurrentQuestion(qText);
      setAskedQuestions([qText]);
      setIsGenerating(false);
      speakAndThenListen(qText);
    } catch (err) {
      const msg = extractApiError(err, "Failed to generate question.");
      setCurrentQuestion(msg);
      setIsGenerating(false);
    }
  };

  // ----------------------------------------------
  // PROCESS STUDENT SPOKEN ANSWER -> BOT REPLIES -> NEXT Q
  // ----------------------------------------------

  const sendSpokenAnswer = useCallback(async () => {
    const answerText = spokenAnswerRef.current.trim();
    if (!activeViva || !answerText || isGenerating) return;

    stopAutoListen();
    setSpokenAnswer("");
    setIsGenerating(true);

    try {
      const reply = await generateGeminiPostAnswerReply({
        viva: activeViva,
        topic: currentTopic,
        question: currentQuestion,
        studentAnswer: answerText,
      });

      setBotReply(reply);

      if (questionNumber >= activeViva.total_questions) {
        setSessionDone(true);
        setCurrentQuestion("");
        setIsGenerating(false);
        speakAndThenListen(reply);
        return;
      }

      const nextNum = questionNumber + 1;
      const nextTopic = pickRandomTopic(activeViva.topics, activeViva.subject);
      setCurrentTopic(nextTopic);
      setQuestionNumber(nextNum);

      const nextQ = await generateGeminiQuestion({
        viva: activeViva,
        topic: nextTopic,
        questionNumber: nextNum,
        askedQuestions,
      });

      setCurrentQuestion(nextQ);
      setAskedQuestions((prev) => [...prev, nextQ]);
      setIsGenerating(false);

      speakAndThenListen(`${reply} ${nextQ}`.trim());
    } catch (err) {
      setBotReply(extractApiError(err, "Failed to reply."));
      setIsGenerating(false);
      startAutoListen();
    }
  }, [
    activeViva,
    isGenerating,
    stopAutoListen,
    currentTopic,
    currentQuestion,
    questionNumber,
    askedQuestions,
    speakAndThenListen,
    startAutoListen,
  ]);

  useEffect(() => {
    sendSpokenAnswerRef.current = sendSpokenAnswer;
  }, [sendSpokenAnswer]);

  const endViva = () => {
    stopAutoListen();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    stopCamera();
    setActiveViva(null);
    setSessionDone(false);
    setBotReply("");
    setCurrentQuestion("");
    setSpokenAnswer("");
  };

  // ==================================================
  // SINGLE SCREEN — 2 BOXES ONLY (1: BOT | 2: CAMERA + AUTO LISTEN)
  // ==================================================

  if (activeViva) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #ecfeff 0%, #eff6ff 55%, #f0fdf4 100%)",
          padding: "20px",
          color: "#0f172a",
        }}
      >
        <style>{`
          @keyframes botFlyBig {
            0%, 100% { transform: translateY(0px) translateX(0px); }
            25% { transform: translateY(-13px) translateX(8px); }
            50% { transform: translateY(-5px) translateX(-8px); }
            75% { transform: translateY(-15px) translateX(5px); }
          }
          @keyframes botListenBob {
            0%, 100% { transform: translateY(-3px) scale(1.02); }
            50% { transform: translateY(-10px) scale(1.04); }
          }
          @keyframes armWaveL {
            0%, 100% { transform: rotate(8deg); }
            50% { transform: rotate(-30deg); }
          }
          @keyframes armWaveR {
            0%, 100% { transform: rotate(-8deg); }
            50% { transform: rotate(30deg); }
          }
          @keyframes armFloat {
            0%, 100% { transform: rotate(4deg); }
            50% { transform: rotate(-5deg); }
          }
          @keyframes legSwing {
            0%, 100% { transform: rotate(4deg); }
            50% { transform: rotate(-8deg); }
          }
          @keyframes talkMouth {
            0% { transform: scaleX(0.8); height: 4px; }
            100% { transform: scaleX(1.35); height: 9px; }
          }
          @keyframes blinkAnim {
            0%, 92%, 100% { transform: scaleY(1); }
            96% { transform: scaleY(0.1); }
          }
          @keyframes haloSpin {
            0% { transform: rotateX(70deg) rotateZ(0deg); }
            100% { transform: rotateX(70deg) rotateZ(360deg); }
          }
          @keyframes haloPulse {
            0%, 100% { transform: rotateX(70deg) scale(1); }
            50% { transform: rotateX(70deg) scale(1.14); }
          }
        `}</style>

        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
            gap: "18px",
          }}
        >
          {/* BOX 1: AI BOT SPEAKING */}
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "2px solid #bae6fd",
              borderRadius: "20px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  color: "#0369a1",
                  backgroundColor: "#e0f2fe",
                  padding: "4px 12px",
                  borderRadius: "999px",
                }}
              >
                {activeViva.subject} • {activeViva.title}
              </span>

              <button
                type="button"
                onClick={endViva}
                style={{
                  padding: "6px 12px",
                  borderRadius: "9px",
                  border: "1.5px solid #fca5a5",
                  backgroundColor: "#fef2f2",
                  color: "#b91c1c",
                  fontWeight: 700,
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                End
              </button>
            </div>

            <Big3D5DBot
              isSpeaking={isSpeaking}
              isListening={isListening}
              isGenerating={isGenerating}
            />

            {botReply && (
              <div
                style={{
                  backgroundColor: "#ecfdf5",
                  border: "1.5px solid #6ee7b7",
                  borderRadius: "14px",
                  padding: "12px 14px",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#065f46",
                  lineHeight: 1.5,
                }}
              >
                {botReply}
              </div>
            )}

            <div
              style={{
                backgroundColor: "#f0f9ff",
                border: "1.5px solid #bae6fd",
                borderRadius: "14px",
                padding: "14px 16px",
                minHeight: "76px",
              }}
            >
              {sessionDone ? (
                <div style={{ fontWeight: 800, color: "#0f766e", fontSize: "15px" }}>
                  Viva complete. Thank you!
                </div>
              ) : isGenerating && !currentQuestion ? (
                <div style={{ color: "#64748b", fontWeight: 600 }}>
                  Preparing question...
                </div>
              ) : (
                <p
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: 700,
                    lineHeight: 1.5,
                    color: "#0f172a",
                  }}
                >
                  {currentQuestion}
                </p>
              )}
            </div>
          </div>

          {/* BOX 2: STUDENT CAMERA + AUTO LISTENING ANSWER */}
          <div
            style={{
              backgroundColor: "#0f172a",
              border: "2px solid #1e293b",
              borderRadius: "20px",
              padding: "20px",
              color: "#f8fafc",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 800, fontSize: "15px" }}>
                Student Camera & Auto Listen
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  padding: "4px 12px",
                  borderRadius: "999px",
                  backgroundColor: isListening
                    ? "rgba(16, 185, 129, 0.22)"
                    : "rgba(56, 189, 248, 0.18)",
                  color: isListening ? "#34d399" : "#7dd3fc",
                }}
              >
                {isListening ? "Mic Auto-Listening" : "Camera Proctored"}
              </span>
            </div>

            <div
              style={{
                width: "100%",
                aspectRatio: "4 / 3",
                backgroundColor: "#020617",
                borderRadius: "14px",
                overflow: "hidden",
                border: "1px solid #334155",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: "scaleX(-1)",
                  display: cameraStatus === "active" ? "block" : "none",
                }}
              />
              {cameraStatus !== "active" && (
                <div style={{ padding: "16px", textAlign: "center", fontSize: "13.5px" }}>
                  {cameraStatus === "denied"
                    ? "Camera permission denied."
                    : cameraStatus === "error"
                    ? "Camera unavailable."
                    : "Starting camera..."}
                </div>
              )}
            </div>

            {/* Live Auto-Captured Spoken Answer */}
            <div
              style={{
                backgroundColor: "#1e293b",
                borderRadius: "14px",
                padding: "12px 14px",
                minHeight: "74px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "10px",
              }}
            >
              <div style={{ fontSize: "14px", color: "#e2e8f0", lineHeight: 1.45 }}>
                {spokenAnswer ||
                  (isListening
                    ? "Bolna shuru karo, main sun raha hu..."
                    : "Bot ke bolne ke baad mic apne aap sunega...")}
              </div>

              {!sessionDone && (
                <button
                  type="button"
                  onClick={sendSpokenAnswer}
                  disabled={!spokenAnswer.trim() || isGenerating}
                  style={{
                    alignSelf: "flex-end",
                    padding: "9px 18px",
                    borderRadius: "10px",
                    border: "none",
                    background: "linear-gradient(135deg, #10b981 0%, #0284c7 100%)",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "13.5px",
                    cursor:
                      !spokenAnswer.trim() || isGenerating
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {isGenerating ? "Processing..." : "Done Speaking"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================================================
  // AVAILABLE VIVAS BY SUBJECT
  // ==================================================

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #ecfeff 0%, #eff6ff 55%, #f0fdf4 100%)",
        padding: "24px 18px",
        color: "#0f172a",
      }}
    >
      <div style={{ maxWidth: "1060px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            marginBottom: "18px",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "23px", fontWeight: 800 }}>
            Available Vivas
          </h1>

          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            style={{
              padding: "9px 14px",
              borderRadius: "10px",
              border: "1.5px solid #cbd5e1",
              backgroundColor: "#ffffff",
              fontWeight: 700,
              fontSize: "13px",
            }}
          >
            {subjects.map((subj) => (
              <option key={subj} value={subj}>
                {subj === "ALL" ? "All Subjects" : subj}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              padding: "28px",
              textAlign: "center",
              fontWeight: 700,
            }}
          >
            Loading available vivas...
          </div>
        ) : errorMsg ? (
          <div
            style={{
              backgroundColor: "#fef2f2",
              border: "1.5px solid #fca5a5",
              borderRadius: "14px",
              padding: "18px",
              color: "#b91c1c",
              fontWeight: 700,
            }}
          >
            {errorMsg}
          </div>
        ) : visibleVivas.length === 0 ? (
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              padding: "28px",
              textAlign: "center",
              color: "#64748b",
              fontWeight: 600,
            }}
          >
            No available vivas for this subject.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "16px",
            }}
          >
            {visibleVivas.map((viva) => (
              <div
                key={viva.id}
                style={{
                  backgroundColor: "#ffffff",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: "16px",
                  padding: "18px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "14px",
                }}
              >
                <div>
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#0369a1",
                      backgroundColor: "#e0f2fe",
                      padding: "3px 10px",
                      borderRadius: "999px",
                      marginBottom: "8px",
                    }}
                  >
                    {viva.subject}
                  </span>

                  <h2 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: 800 }}>
                    {viva.title}
                  </h2>

                  {viva.description && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: "13px",
                        color: "#475569",
                        whiteSpace: "pre-line",
                      }}
                    >
                      {viva.description}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => startLiveViva(viva)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "none",
                    background: "linear-gradient(135deg, #0284c7 0%, #059669 100%)",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "13.5px",
                    cursor: "pointer",
                  }}
                >
                  Start Viva
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentViva;