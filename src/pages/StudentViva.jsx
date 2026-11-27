import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";

const GROQ_API_KEY = (process.env.REACT_APP_GROQ_API_KEY || "").trim();
const GROQ_MODEL = (
  process.env.REACT_APP_GROQ_MODEL || "openai/gpt-oss-20b"
).trim();

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
    difficulty: row.difficulty || "Medium",
    topics: parseTopicsList(
      row.topics ?? row.viva_topics ?? row.admin_viva_topics
    ),
    total_questions: Number(row.total_questions ?? row.totalQuestions ?? 5) || 5,
  };
};

// --------------------------------------------------
// GROQ MODEL CALLER (ONLY MODEL GENERATION)
// --------------------------------------------------

function withTimeout(promise, ms = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Groq request timed out")), ms)
    ),
  ]);
}

async function callGroqChat(messages) {
  if (!GROQ_API_KEY) {
    throw new Error("Missing REACT_APP_GROQ_API_KEY");
  }

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
        temperature: 0.7,
        max_tokens: 160,
      }),
    }),
    10000
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Groq HTTP ${res.status}`);
  }

  const content = String(data?.choices?.[0]?.message?.content || "").trim();
  if (!content) {
    throw new Error("Empty response from Groq model");
  }
  return content;
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
        "You are a clear, friendly school viva examiner. Generate ONE fresh spoken viva question (1-2 short sentences) based on the topic guide. Do not read raw topic instructions aloud; ask the direct question only. Return ONLY the question.",
    },
    {
      role: "user",
      content: `Class: ${viva.class_name || "10th"}, Subject: ${viva.subject}, Difficulty: ${viva.difficulty || "Medium"}.
Topic guide: "${topic}".
Question ${questionNumber} of ${viva.total_questions}.
Already asked questions: ${JSON.stringify(askedQuestions)}.
Generate a new question that is not in already asked questions.`,
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
        "You are a live spoken viva examiner. Reply in 1 short sentence based only on the student's actual answer. Be accurate, brief, and helpful.",
    },
    {
      role: "user",
      content: `Subject: ${viva.subject}, Class: ${viva.class_name || "10th"}, Topic: "${topic}".
Question: "${question}"
Student answered: "${cleanAns}"
Is last question: ${isLastQuestion ? "yes" : "no"}.
Return ONLY the spoken reply.`,
    },
  ];

  return await callGroqChat(messages);
}

// --------------------------------------------------
// BOT AVATAR
// --------------------------------------------------

function VivaBotAvatar({ isSpeaking, isListening, isGenerating }) {
  const statusLabel = isGenerating
    ? "Generating..."
    : isSpeaking
    ? "Speaking..."
    : isListening
    ? "Listening..."
    : "Ready";

  return (
    <div
      style={{
        padding: "20px",
        borderRadius: "16px",
        backgroundColor: "#f0fdf4",
        borderWidth: "1.5px",
        borderStyle: "solid",
        borderColor: "#86efac",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <div
        style={{
          width: "76px",
          height: "76px",
          borderRadius: "50%",
          backgroundColor: isSpeaking ? "#0284c7" : "#059669",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "32px",
          fontWeight: 800,
          boxShadow: isSpeaking
            ? "0 0 0 8px rgba(2, 132, 199, 0.2)"
            : "0 0 0 8px rgba(5, 150, 105, 0.15)",
          transition: "all 0.2s ease",
        }}
      >
        🤖
      </div>

      <div style={{ fontWeight: 800, fontSize: "16px", color: "#0f172a" }}>
        SmartBot
      </div>

      <div
        style={{
          fontSize: "12.5px",
          fontWeight: 700,
          padding: "4px 12px",
          borderRadius: "999px",
          backgroundColor: "#ffffff",
          color: "#065f46",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: "#bbf7d0",
        }}
      >
        {statusLabel}
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

  // Active viva session state
  const [activeViva, setActiveViva] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [currentTopic, setCurrentTopic] = useState("");
  const [usedTopics, setUsedTopics] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [askedQuestions, setAskedQuestions] = useState([]);
  const [botReply, setBotReply] = useState("");
  const [vivaError, setVivaError] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);

  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const answerRef = useRef("");

  useEffect(() => {
    answerRef.current = answerText;
  }, [answerText]);

  const stopListening = useCallback(() => {
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
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || !activeViva || sessionDone || isGenerating) return;

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

    rec.onstart = () => setIsListening(true);
    rec.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += `${event.results[i][0].transcript} `;
      }
      setAnswerText(transcript.trim());
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => {
      setIsListening(false);
      if (shouldListenRef.current && !sessionDone && !isGenerating) {
        try {
          rec.start();
        } catch {
          // ignore
        }
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      setIsListening(false);
    }
  }, [activeViva, sessionDone, isGenerating]);

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

        utter.onstart = () => setIsSpeaking(true);
        utter.onend = () => {
          setIsSpeaking(false);
          if (!sessionDone) {
            startListening();
          }
        };
        utter.onerror = () => {
          setIsSpeaking(false);
          if (!sessionDone) {
            startListening();
          }
        };

        window.speechSynthesis.speak(utter);
      } catch {
        setIsSpeaking(false);
        startListening();
      }
    },
    [stopListening, startListening, sessionDone]
  );

  const fetchVivas = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const studentId = getLoggedInStudentId();
      const res = await api.get("/api/student/viva/available", {
        params: studentId ? { studentId } : {},
      });
      const rawList = Array.isArray(res.data?.vivas) ? res.data.vivas : [];
      const cleanList = rawList
        .filter(isVivaAvailable)
        .map(normalizeAvailableViva)
        .filter((v) => v && v.id !== undefined && v.id !== null);
      setVivas(cleanList);
    } catch (err) {
      setErrorMsg(extractApiError(err, "Unable to fetch available vivas."));
    } finally {
      setLoading(false);
    }
  }, []);

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

  const handleStartViva = async (viva) => {
    stopListening();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    const topic = pickRandomTopic(viva.topics, [], viva.subject);

    setActiveViva(viva);
    setQuestionNumber(1);
    setCurrentTopic(topic);
    setUsedTopics([topic]);
    setCurrentQuestion("");
    setAskedQuestions([]);
    setBotReply("");
    setVivaError("");
    setAnswerText("");
    setSessionDone(false);
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
    if (!activeViva || !submitted || isGenerating) return;

    stopListening();
    setAnswerText("");
    setVivaError("");
    setIsGenerating(true);

    try {
      const isLastQuestion = questionNumber >= activeViva.total_questions;
      const reply = await generateReplyFromModel({
        viva: activeViva,
        topic: currentTopic,
        question: currentQuestion,
        studentAnswer: submitted,
        isLastQuestion,
      });

      setBotReply(reply);

      if (isLastQuestion) {
        setSessionDone(true);
        setCurrentQuestion("");
        setIsGenerating(false);
        speakText(reply);
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

      speakText(`${reply} ${nextQuestion}`.trim());
    } catch (err) {
      setVivaError(err?.message || "Failed to get model response.");
      setIsGenerating(false);
      startListening();
    }
  };

  const handleExitViva = () => {
    stopListening();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setActiveViva(null);
    setSessionDone(false);
    setCurrentQuestion("");
    setBotReply("");
    setVivaError("");
    setAnswerText("");
  };

  if (activeViva) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%)",
          padding: "24px 16px",
          color: "#0f172a",
        }}
      >
        <div
          style={{
            maxWidth: "720px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
            borderRadius: "18px",
            padding: "22px",
            borderWidth: "1.5px",
            borderStyle: "solid",
            borderColor: "#cbd5e1",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#0284c7" }}>
                {activeViva.subject} • Question {questionNumber}/{activeViva.total_questions}
              </div>
              <h2 style={{ margin: "2px 0 0", fontSize: "19px", fontWeight: 800 }}>
                {activeViva.title}
              </h2>
            </div>

            <button
              type="button"
              onClick={handleExitViva}
              style={{
                padding: "7px 14px",
                borderRadius: "9px",
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: "#fca5a5",
                backgroundColor: "#fef2f2",
                color: "#b91c1c",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Exit
            </button>
          </div>

          <VivaBotAvatar
            isSpeaking={isSpeaking}
            isListening={isListening}
            isGenerating={isGenerating}
          />

          {vivaError && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                backgroundColor: "#fef2f2",
                color: "#b91c1c",
                fontWeight: 700,
                fontSize: "13px",
              }}
            >
              {vivaError}
            </div>
          )}

          {botReply && (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "12px",
                backgroundColor: "#ecfdf5",
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: "#6ee7b7",
                color: "#065f46",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              {botReply}
            </div>
          )}

          <div
            style={{
              padding: "16px",
              borderRadius: "12px",
              backgroundColor: "#f8fafc",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "#e2e8f0",
              minHeight: "64px",
            }}
          >
            {sessionDone ? (
              <div style={{ fontWeight: 800, color: "#059669" }}>
                Viva completed!
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: "16px", fontWeight: 700, lineHeight: 1.5 }}>
                {currentQuestion || "Generating question from model..."}
              </p>
            )}
          </div>

          {!sessionDone && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <textarea
                rows={3}
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder={
                  isListening
                    ? "Bolte rahiye, voice capture ho raha hai..."
                    : "Yahan answer bolein ya type karein..."
                }
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "12px",
                  borderWidth: "1.5px",
                  borderStyle: "solid",
                  borderColor: "#cbd5e1",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  style={{
                    padding: "9px 14px",
                    borderRadius: "10px",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    borderColor: "#cbd5e1",
                    backgroundColor: "#f1f5f9",
                    color: "#0f172a",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {isListening ? "Stop Mic" : "Start Mic"}
                </button>

                <button
                  type="button"
                  onClick={handleSubmitAnswer}
                  disabled={!answerText.trim() || isGenerating}
                  style={{
                    padding: "9px 18px",
                    borderRadius: "10px",
                    borderWidth: "0px",
                    borderStyle: "none",
                    backgroundColor: "#059669",
                    color: "#ffffff",
                    fontWeight: 700,
                    cursor:
                      !answerText.trim() || isGenerating
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {isGenerating ? "Sending..." : "Submit Answer"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%)",
        padding: "24px 18px",
        color: "#0f172a",
      }}
    >
      <div style={{ maxWidth: "980px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "18px",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800 }}>
            Available Vivas
          </h1>

          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: "10px",
              borderWidth: "1.5px",
              borderStyle: "solid",
              borderColor: "#cbd5e1",
              backgroundColor: "#ffffff",
              fontWeight: 700,
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
              padding: "24px",
              textAlign: "center",
              fontWeight: 700,
            }}
          >
            Loading vivas...
          </div>
        ) : errorMsg ? (
          <div
            style={{
              backgroundColor: "#fef2f2",
              borderRadius: "14px",
              padding: "16px",
              color: "#b91c1c",
              fontWeight: 700,
            }}
          >
            {errorMsg}
          </div>
        ) : filteredVivas.length === 0 ? (
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              padding: "24px",
              textAlign: "center",
              color: "#64748b",
              fontWeight: 600,
            }}
          >
            No available vivas found.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "16px",
            }}
          >
            {filteredVivas.map((viva) => (
              <div
                key={viva.id}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "14px",
                  padding: "18px",
                  borderWidth: "1.5px",
                  borderStyle: "solid",
                  borderColor: "#e2e8f0",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#0284c7",
                      backgroundColor: "#e0f2fe",
                      padding: "3px 10px",
                      borderRadius: "999px",
                    }}
                  >
                    {viva.subject}
                  </span>
                  <h3 style={{ margin: "10px 0 6px", fontSize: "17px", fontWeight: 800 }}>
                    {viva.title}
                  </h3>
                  {viva.description && (
                    <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
                      {viva.description}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleStartViva(viva)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "10px",
                    borderWidth: "0px",
                    borderStyle: "none",
                    backgroundColor: "#059669",
                    color: "#ffffff",
                    fontWeight: 700,
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