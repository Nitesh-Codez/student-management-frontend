import React, { useEffect, useState, useCallback } from "react";
import api from "../services/api";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import jsPDF from "jspdf";

const DASHBOARD_BG_IMAGE =
  "https://img.freepik.com/premium-photo/young-athletes-from-school-sports-team-holding-winning-trophy-kids-champion-sport-team-boys-holding-prize-cup-children-rising-winner-golden-cup_1028938-275638.jpg";

const format12HourClock = (value) => {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number" || /^\d{1,2}(:\d{2}(:\d{2})?)?$/.test(String(value).trim())) {
    const parts = String(value).trim().split(":");
    let hour = Number(parts[0]);
    const minute = Number(parts[1] || 0);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return String(value);
    const period = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${String(minute).padStart(2, "0")} ${period}`;
  }

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
};

const formatAttemptedDateTime = (ts) => {
  if (!ts) return null;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return format12HourClock(ts);

  const datePart = d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short"
  });
  const timePart = d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
  return `${datePart}, ${timePart}`;
};

const normalizeText = (val) =>
  String(val ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

// Preserves Hindi / Devanagari & Unicode characters while cleaning control chars
const sanitizeQuizTitle = (rawTitle) => {
  const cleaned = String(rawTitle ?? "")
    .normalize("NFC")
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
    .replace(/\(\s*-\s*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (
    !cleaned ||
    cleaned === "-" ||
    cleaned.toLowerCase() === "practice quiz" ||
    cleaned.toLowerCase() === "assessment"
  ) {
    return "";
  }
  return cleaned;
};

// Comma aur spaces hata ke case-insensitive words/subjects nikalta hai
export const getStreamSubjects = (streamValue) => {
  if (!streamValue) return [];
  return String(streamValue)
    .toLowerCase()
    .split(",")
    .flatMap((part) => part.trim().split(/\s+/))
    .map((word) => word.trim())
    .filter(Boolean)
    .sort();
};

// Comma aur case-sensitive se free stream match ("Hindi English" === "Hindi,English" === "Hindi, English")
export const isStreamMatch = (studentStream, quizStream) => {
  const quizSubjects = getStreamSubjects(quizStream);

  // Empty/null quiz stream means stream-independent quiz
  if (quizSubjects.length === 0) {
    return true;
  }

  const studentSubjects = getStreamSubjects(studentStream);
  if (studentSubjects.length !== quizSubjects.length) {
    return false;
  }

  return quizSubjects.every((subj, idx) => subj === studentSubjects[idx]);
};

export const isQuizVisibleToStudent = (quiz, { userClass, userSession, userStream }) => {
  if (!quiz) return false;

  const quizClass = quiz.class_name ?? quiz.class;
  if (userClass && quizClass && normalizeText(quizClass) !== normalizeText(userClass)) {
    return false;
  }

  const quizSession = quiz.session;
  if (userSession && quizSession && normalizeText(quizSession) !== normalizeText(userSession)) {
    return false;
  }

  return isStreamMatch(userStream, quiz.stream);
};

// Helper to wrap Hindi + English text cleanly on Canvas for PDF generation
const wrapCanvasText = (ctx, text, maxWidth) => {
  const str = String(text || "").trim();
  if (!str) return [""];

  const paragraphs = str.split(/\n+/);
  const lines = [];

  for (const para of paragraphs) {
    const tokens = para.split(/(\s+)/);
    let currentLine = "";

    for (const token of tokens) {
      if (!token) continue;
      const testLine = currentLine + token;
      if (ctx.measureText(testLine).width <= maxWidth || !currentLine.trim()) {
        currentLine = testLine;
      } else {
        lines.push(currentLine.trim());
        currentLine = token.trimStart();
      }
    }
    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }
  }

  return lines.length > 0 ? lines : [str];
};

const StudentQuizDashboard = () => {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();

  // User session details (supports param/query override as well)
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const studentId =
    params.studentId ||
    searchParams.get("student_id") ||
    user?.id ||
    user?._id;
  const routeQuizId =
    params.quizId || params.id || searchParams.get("quiz_id") || null;
  const userClass = user?.class;
  const userSession = user?.session;
  const userStream = user?.stream;

  const [quizzes, setQuizzes] = useState([]);
  const [quizTitleMap, setQuizTitleMap] = useState({});
  const [filteredQuizzes, setFilteredQuizzes] = useState([]);
  const [subjects, setSubjects] = useState(["All"]);
  const [activeSubject, setActiveSubject] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const formatScheduleTime = (ts) => {
    if (!ts) return null;
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return format12HourClock(ts);
    const datePart = d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short"
    });
    const timePart = d.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
    return `${datePart}, ${timePart}`;
  };

  const getWindowState = useCallback(
    (quizItem) => {
      const start = quizItem.start_at ? new Date(quizItem.start_at) : null;
      const end = quizItem.end_at ? new Date(quizItem.end_at) : null;
      const validStart = start && !Number.isNaN(start.getTime()) ? start : null;
      const validEnd = end && !Number.isNaN(end.getTime()) ? end : null;

      if (validStart && now < validStart) {
        return {
          status: "upcoming",
          label: "Upcoming",
          buttonText: "Not Started Yet",
          canStart: false,
          badgeBg: "#FEF3C7",
          badgeColor: "#92400E"
        };
      }

      if (validEnd && now > validEnd) {
        return {
          status: "closed",
          label: "Closed",
          buttonText: "Quiz finished",
          canStart: false,
          badgeBg: "#FEE2E2",
          badgeColor: "#991B1B"
        };
      }

      if (validStart || validEnd) {
        return {
          status: "open",
          label: "Live Window",
          buttonText: "Start Test ⚡",
          canStart: true,
          badgeBg: "#DCFCE7",
          badgeColor: "#166534"
        };
      }

      return {
        status: "always_open",
        label: "Open",
        buttonText: "Start Test ⚡",
        canStart: true,
        badgeBg: "#E0F2FE",
        badgeColor: "#075985"
      };
    },
    [now]
  );

  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = `
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
      body {
        margin: 0;
        font-family: 'Noto Sans Devanagari', 'Plus Jakarta Sans', sans-serif;
        background-color: #F8FAFC;
        color: #1E293B;
      }
      .no-scrollbar::-webkit-scrollbar { display: none; }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .quiz-card {
        animation: fadeIn 0.35s ease-out forwards;
        transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
      }
      .quiz-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 30px -8px rgba(0, 0, 0, 0.14);
        border-color: #94A3B8;
      }

      .hover-text-transition {
        transition: color 0.3s ease, transform 0.3s ease;
      }
      .hover-text-transition:hover {
        color: #4F46E5;
        transform: translateX(4px);
      }

      .certificate-btn {
        transition: all 0.2s ease;
      }
      .certificate-btn:hover {
        background-color: #047857 !important;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .spinner { animation: spin 1s linear infinite; }
    `;
    document.head.appendChild(styleSheet);

    if (!userClass || !studentId) {
      setError("Session expired. Please login again.");
      setLoading(false);
      return () => {
        if (document.head.contains(styleSheet)) {
          document.head.removeChild(styleSheet);
        }
      };
    }

    let isMounted = true;

    const fetchQuizzes = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Quiz API (/api/quiz/class/...) se id aur title le kar map banao
        const res = await api.get(`/api/quiz/class/${userClass}`, {
          params: {
            session: userSession,
            stream: userStream,
            student_id: studentId,
            ...(routeQuizId ? { quiz_id: routeQuizId } : {})
          }
        });

        const quizList = Array.isArray(res.data) ? res.data : res.data?.quizzes || [];

        const titleMapFromQuizApi = {};
        quizList.forEach((q) => {
          const titleVal = sanitizeQuizTitle(q.title || q.quiz_title);
          if (!titleVal) return;
          if (q.id !== undefined && q.id !== null) {
            titleMapFromQuizApi[String(q.id)] = titleVal;
          }
          if (q.quiz_id !== undefined && q.quiz_id !== null) {
            titleMapFromQuizApi[String(q.quiz_id)] = titleVal;
          }
        });

        // 2. Score/Grade status API (/api/quiz/status/...) se attempt result lo
        const statusRequests = quizList.map((q) => {
          const qId = q.quiz_id ?? q.id;
          return api
            .get(`/api/quiz/status/${qId}/${studentId}`, {
              params: { student_id: studentId, quiz_id: qId }
            })
            .catch(() => ({ data: {} }));
        });

        const statusResults = await Promise.all(statusRequests);

        const updatedQuizzes = quizList.map((q, index) => {
          const qId = q.quiz_id ?? q.id;
          const st = statusResults[index]?.data || {};
          const attempted = Boolean(st.attempted);
          const resultObj = attempted ? st.result || null : null;

          const matchedQuizId = qId;

          const authoritativeTitle =
            sanitizeQuizTitle(resultObj?.quiz_title) ||
            sanitizeQuizTitle(st?.quiz_title) ||
            sanitizeQuizTitle(q.title) ||
            sanitizeQuizTitle(q.quiz_title) ||
            "Assessment";

          if (matchedQuizId !== undefined && matchedQuizId !== null) {
            titleMapFromQuizApi[String(matchedQuizId)] = authoritativeTitle;
          }

          const rawAttemptedAt =
            resultObj?.attempted_at ||
            resultObj?.attemptedAt ||
            st.attempted_at ||
            st.attemptedAt ||
            resultObj?.submitted_at ||
            resultObj?.created_at ||
            q.attempted_at ||
            null;

          return {
            ...q,
            quiz_id: qId,
            matched_quiz_id: matchedQuizId,
            quiz_title: authoritativeTitle,
            title: authoritativeTitle,
            student_id: studentId,
            attempted,
            result: resultObj,
            attempted_at: rawAttemptedAt
          };
        });

        const visibleQuizzes = updatedQuizzes.filter((quiz) =>
          isQuizVisibleToStudent(quiz, { userClass, userSession, userStream })
        );

        if (!isMounted) return;

        setQuizTitleMap(titleMapFromQuizApi);
        setQuizzes(visibleQuizzes);

        const nextSubjects = [
          "All",
          ...new Set(visibleQuizzes.map((q) => q.subject).filter(Boolean))
        ];
        setSubjects(nextSubjects);

        const resolvedSubject =
          activeSubject === "All" || nextSubjects.includes(activeSubject)
            ? activeSubject
            : "All";
        setActiveSubject(resolvedSubject);

        setFilteredQuizzes(
          resolvedSubject === "All"
            ? visibleQuizzes
            : visibleQuizzes.filter((q) => q.subject === resolvedSubject)
        );
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        setError("Failed to fetch dashboard data.");
        setLoading(false);
      }
    };

    fetchQuizzes();
    return () => {
      isMounted = false;
      if (document.head.contains(styleSheet)) {
        document.head.removeChild(styleSheet);
      }
    };
  }, [userClass, studentId, userSession, userStream, routeQuizId]);

  const handleSubjectFilter = (sub) => {
    setActiveSubject(sub);
    setFilteredQuizzes(sub === "All" ? quizzes : quizzes.filter((q) => q.subject === sub));
  };

// Generates A4 Landscape PDF supporting Hindi (Devanagari) + English text
const generateCertificate = async (
  ansQuizId,
  directQuizTitle,
  scorePercent,
  grade
) => {
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  const studentName =
    String(user?.name || "Valued Student")
      .normalize("NFC")
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
      .trim() || "Valued Student";

  const matchedQuiz = quizzes.find(
    (q) =>
      String(q.matched_quiz_id) === String(ansQuizId) ||
      String(q.quiz_id) === String(ansQuizId) ||
      String(q.id) === String(ansQuizId)
  );

  const rawTitle =
    sanitizeQuizTitle(directQuizTitle) ||
    sanitizeQuizTitle(matchedQuiz?.result?.quiz_title) ||
    sanitizeQuizTitle(matchedQuiz?.quiz_title) ||
    (ansQuizId !== undefined && ansQuizId !== null
      ? sanitizeQuizTitle(quizTitleMap[String(ansQuizId)])
      : "") ||
    sanitizeQuizTitle(matchedQuiz?.title) ||
    "Assessment";

  const cleanTitle = rawTitle || "Assessment";
  const cleanGrade = String(grade || "A").trim() || "A";
  const fontFamily = "'Noto Sans Devanagari', 'Plus Jakarta Sans', sans-serif";

  // High-DPI canvas for A4 landscape (297mm x 210mm)
  const scale = 2;
  const width = 1122;
  const height = 794;

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  // Background & Borders
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);

  ctx.lineWidth = 6;
  ctx.strokeStyle = "#1E3A8A";
  ctx.strokeRect(28, 28, width - 56, height - 56);

  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "#059669";
  ctx.strokeRect(40, 40, width - 80, height - 80);

  const centerX = width / 2;

  // Institution Header
  ctx.textAlign = "center";
  ctx.fillStyle = "#0F172A";
  ctx.font = `800 32px ${fontFamily}`;
  ctx.fillText("SMART STUDENT CLASSES", centerX, 92);

  ctx.fillStyle = "#047857";
  ctx.font = `600 16px ${fontFamily}`;
  ctx.fillText(
    "EXCELLENCE IN ACADEMIC ASSESSMENT & ACHIEVEMENT",
    centerX,
    122
  );

  // Main Certificate Title
  ctx.fillStyle = "#1E3A8A";
  ctx.font = `800 38px ${fontFamily}`;
  ctx.fillText("CERTIFICATE OF ACHIEVEMENT", centerX, 178);

  // Certification Statement
  ctx.fillStyle = "#64748B";
  ctx.font = `500 18px ${fontFamily}`;
  ctx.fillText("This is to certify that", centerX, 222);

  // Student Name
  ctx.fillStyle = "#0F172A";
  ctx.font = `800 36px ${fontFamily}`;
  ctx.fillText(studentName, centerX, 272);

  // Achievement Description
  ctx.fillStyle = "#475569";
  ctx.font = `500 17px ${fontFamily}`;
  ctx.fillText(
    "has successfully completed the quiz assessment",
    centerX,
    314
  );

  // Quiz Title - Normal Text (No Box)
  ctx.fillStyle = "#1E3A8A";
  ctx.font = `700 24px ${fontFamily}`;

  const titleLines = wrapCanvasText(ctx, cleanTitle, 850).slice(0, 2);

  if (titleLines.length === 1) {
    ctx.fillText(titleLines[0], centerX, 365);
  } else {
    ctx.fillText(titleLines[0], centerX, 355);
    ctx.fillText(titleLines[1], centerX, 387);
  }

  // Appreciation Line
  const afterTitleY = titleLines.length > 1 ? 420 : 398;

  ctx.fillStyle = "#475569";
  ctx.font = `500 16.5px ${fontFamily}`;
  ctx.fillText(
    "Demonstrated dedication and commitment to academic learning",
    centerX,
    afterTitleY
  );

  // Score / Class / Grade Box
  const scoreBoxY = afterTitleY + 22;

  ctx.fillStyle = "#ECFDF5";
  ctx.strokeStyle = "#059669";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.roundRect(150, scoreBoxY, width - 300, 66, 12);
  ctx.fill();
  ctx.stroke();

  ctx.font = `700 20px ${fontFamily}`;

  ctx.fillStyle = "#0F172A";
  ctx.fillText(
    `CLASS ${userClass || "N/A"}`,
    285,
    scoreBoxY + 40
  );

  ctx.fillStyle = "#047857";
  ctx.fillText(
    `SCORE ${scorePercent}%`,
    centerX,
    scoreBoxY + 40
  );

  ctx.fillStyle = "#1E3A8A";
  ctx.fillText(
    `GRADE ${cleanGrade}`,
    835,
    scoreBoxY + 40
  );

  // Closing Remark
  ctx.fillStyle = "#475569";
  ctx.font = `600 16.5px ${fontFamily}`;
  ctx.fillText(
    "We appreciate your efforts and wish you continued success.",
    centerX,
    scoreBoxY + 108
  );

  // Footer Date & Authority
  const sigLineY = 668;
  const issueDateStr = new Date().toLocaleDateString("hi-IN");

  // Date Signature Line
  ctx.strokeStyle = "#64748B";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(110, sigLineY);
  ctx.lineTo(340, sigLineY);
  ctx.stroke();

  ctx.fillStyle = "#64748B";
  ctx.font = `500 15px ${fontFamily}`;
  ctx.fillText(
    `Date / दिनांक: ${issueDateStr}`,
    225,
    sigLineY + 24
  );

  // Authority Signature Line
  ctx.strokeStyle = "#059669";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(780, sigLineY);
  ctx.lineTo(1010, sigLineY);
  ctx.stroke();

  ctx.fillStyle = "#64748B";
  ctx.font = `500 15px ${fontFamily}`;
  ctx.fillText(
    "Authority Signature",
    895,
    sigLineY + 24
  );

  ctx.fillStyle = "#047857";
  ctx.font = `700 15px ${fontFamily}`;
  ctx.fillText(
    "Head of Smart Student Classes",
    895,
    sigLineY + 48
  );

  // Generate PDF
  const imgData = canvas.toDataURL("image/png", 1.0);

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  pdf.addImage(imgData, "PNG", 0, 0, 297, 210);

  // Safe filename (Hindi + English supported)
  const safeName = studentName.replace(/[^\p{L}\p{N}_-]+/gu, "_");
  const safeQuiz = cleanTitle.replace(/[^\p{L}\p{N}_-]+/gu, "_");

  pdf.save(`Certificate_${safeName}_${safeQuiz}.pdf`);
};

  const totalQuizzes = quizzes.length;
  const completedQuizzes = quizzes.filter((q) => q.attempted).length;
  const pendingQuizzes = totalQuizzes - completedQuizzes;

  if (error) {
    return (
      <div
        style={{
          ...styles.appContainer,
          backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.86), rgba(248, 250, 252, 0.9)), url(${DASHBOARD_BG_IMAGE})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          backgroundRepeat: "no-repeat"
        }}
      >
        <div style={styles.center}>
          <p style={{ fontWeight: "700", color: "#EF4444", fontSize: "15px" }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        ...styles.appContainer,
        backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.84), rgba(248, 250, 252, 0.88)), url(${DASHBOARD_BG_IMAGE})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        backgroundRepeat: "no-repeat"
      }}
      data-student-id={studentId}
    >
      <header style={styles.header}>
        <div style={styles.headerContentWrapper}>
          <div style={styles.headerLeft}>
            <span style={styles.welcomeText}>🚀 Welcome back, Champion!</span>
            <h1 style={styles.userName}>{user?.name || "Smart Student"}</h1>
            <p style={styles.headerSubtitle}>
              &quot;Excellence is not an act, but a habit. Conquer your tests &amp; win amazing prizes today!&quot;
            </p>
            <div style={styles.metaRow}>
              <span style={styles.metaBadge}>Class {userClass}</span>
              <span style={styles.metaBadge}>ID: {studentId}</span>
              {userSession && <span style={styles.metaBadge}>Session {userSession}</span>}
              {userStream && <span style={styles.metaBadge}>{userStream}</span>}
            </div>
          </div>

          <div style={styles.statsContainer}>
            <div style={styles.statBox}>
              <span style={styles.statNumber}>{totalQuizzes}</span>
              <span style={styles.statLabel}>Total Quizzes</span>
            </div>
            <div style={styles.statBox}>
              <span style={{ ...styles.statNumber, backgroundColor: "#abff58", color: "#116c4f" }}>
                {completedQuizzes}
              </span>
              <span style={styles.statLabel}>Completed</span>
            </div>
            <div style={styles.statBox}>
              <span style={{ ...styles.statNumber, backgroundColor: "#ff6df3", color: "#0f172a" }}>
                {pendingQuizzes}
              </span>
              <span style={styles.statLabel}>Pending</span>
            </div>
          </div>
        </div>
      </header>

      <main style={styles.mainContent}>
        <div style={styles.controlBar}>
          <div>
            <h2 style={styles.sectionTitle}>{activeSubject} Assessments &amp; Prizes</h2>
            <p style={styles.sectionSubtitle}>
              Score 85% or above to instantly download your official Smart Student Merit Certificate!
            </p>
          </div>

          <div style={styles.tabSection} className="no-scrollbar">
            {subjects.map((sub, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSubjectFilter(sub)}
                style={{
                  ...styles.tab,
                  backgroundColor: activeSubject === sub ? "#0F172A" : "#FFFFFF",
                  color: activeSubject === sub ? "#FFFFFF" : "#475569",
                  boxShadow: activeSubject === sub ? "0 4px 12px rgba(15, 23, 42, 0.2)" : "none",
                  border: activeSubject === sub ? "none" : "1px solid #E2E8F0"
                }}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={styles.loadingCard}>
            <div className="spinner" style={styles.spinnerIcon}></div>
            <p style={{ fontWeight: "700", color: "#0F172A", marginTop: "12px", fontSize: "14px" }}>
              Please wait Loading your Quizzes.....
            </p>
          </div>
        ) : (
          <div style={styles.quizList}>
            {filteredQuizzes.length > 0 ? (
              filteredQuizzes.map((quiz, idx) => {
                const qId = quiz.quiz_id ?? quiz.id;
                const ansQuizId = quiz.quiz_id ?? quiz.id;
                const quizTitleForCert =
                  sanitizeQuizTitle(quiz.result?.quiz_title) ||
                  sanitizeQuizTitle(quiz.quiz_title) ||
                  sanitizeQuizTitle(quizTitleMap[String(ansQuizId)]) ||
                  sanitizeQuizTitle(quiz.title) ||
                  "Assessment";
                const sId = quiz.student_id || studentId;
                const isDone = quiz.attempted;
                const computedPercent =
                  isDone && quiz.total_marks
                    ? Math.round(((quiz.result?.score || 0) / quiz.total_marks) * 100)
                    : 0;
                const scorePercent =
                  isDone && quiz.result?.percentage !== undefined && quiz.result?.percentage !== null
                    ? Math.round(Number(quiz.result.percentage))
                    : computedPercent;
                const quizPrize = quiz.prize || "Exciting Certificate";
                const canGetCertificate = isDone && scorePercent >= 85;
                const windowState = getWindowState(quiz);
                const startText = formatScheduleTime(quiz.start_at);
                const endText = formatScheduleTime(quiz.end_at);
                const attemptedAtText = formatAttemptedDateTime(quiz.attempted_at);

                return (
                  <div
                    key={qId || idx}
                    data-quiz-id={qId}
                    data-student-id={sId}
                    style={styles.card}
                    className="quiz-card"
                  >
                    <div style={styles.cardLeft}>
                      <div style={isDone ? styles.statusIconDone : styles.statusIconPending}>
                        {isDone ? "🏆" : "🔥"}
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                          <span style={styles.tagSubject}>{quiz.subject}</span>
                          <span style={styles.idChip}>Quiz ID: {qId}</span>
                          {!isDone && (
                            <span
                              style={{
                                ...styles.windowBadge,
                                backgroundColor: windowState.badgeBg,
                                color: windowState.badgeColor
                              }}
                            >
                              {windowState.label}
                            </span>
                          )}
                        </div>

                        <h3 style={styles.quizTitle}>{quizTitleForCert}</h3>

                        <div style={styles.quizMetaInfo}>
                          <span>⏱️ {quiz.timer_minutes} mins</span>
                          <span>•</span>
                          <span>📋 {quiz.total_marks || 0} Marks</span>
                          {isDone && attemptedAtText && (
                            <>
                              <span>•</span>
                              <span>🕒 Attempted: <strong>{attemptedAtText}</strong></span>
                            </>
                          )}
                        </div>

                        {(startText || endText) && (
                          <div style={styles.scheduleLine}>
                            {startText && <span>🗓️ Starts: <strong>{startText}</strong></span>}
                            {endText && <span>⏳ Ends: <strong>{endText}</strong></span>}
                          </div>
                        )}

                        <div style={styles.prizeBadge}>
                          📜 <strong>Win Certificate:</strong> {quizPrize}
                        </div>
                      </div>
                    </div>

                    <div style={styles.cardRight}>
                      {isDone ? (
                        <div style={styles.scoreBlock}>
                          <div style={styles.scoreValue}>{scorePercent}%</div>
                          <div style={styles.gradeBadge}>Grade: {quiz.result?.grade || "N/A"}</div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          data-quiz-id={qId}
                          data-student-id={sId}
                          disabled={!windowState.canStart}
                          onClick={() =>
                            navigate(`/student/attempt/${qId}`, {
                              state: { quiz_id: qId, student_id: sId }
                            })
                          }
                          style={{
                            ...styles.startButton,
                            ...(!windowState.canStart ? styles.disabledStartButton : {})
                          }}
                        >
                          {windowState.buttonText}
                        </button>
                      )}
                    </div>

                    {isDone && (
                      <div style={styles.cardFooter}>
                        <span style={styles.feedbackText}>
                          {scorePercent >= 85
                            ? "🌟 Target Achieved! Certificate Unlocked!"
                            : `🌟 Completed! (Score ${scorePercent}% - Need 85% for Certificate)`}
                          {attemptedAtText ? ` • Attempted at ${attemptedAtText}` : ""}
                        </span>

                        <div style={styles.footerActionGroup}>
                          {canGetCertificate && (
                            <button
                              type="button"
                              onClick={() =>
                                generateCertificate(
                                  ansQuizId,
                                  quizTitleForCert,
                                  scorePercent,
                                  quiz.result?.grade || "A"
                                )
                              }
                              style={styles.certificateButton}
                              className="certificate-btn"
                            >
                              🎓 Download Certificate (PDF)
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/student/review/${qId}/${sId}`, {
                                state: { quiz_id: qId, student_id: sId }
                              })
                            }
                            style={styles.reviewButton}
                            className="hover-text-transition"
                          >
                            View Analytics &rarr;
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div style={styles.emptyState}>
                <div style={{ fontSize: "40px", marginBottom: "10px" }}>🎯</div>
                <p style={{ margin: 0, fontWeight: "700", color: "#1E293B", fontSize: "16px" }}>All caught up!</p>
                <p style={{ margin: "5px 0 0 0", color: "#64748B", fontSize: "13px" }}>
                  No pending tasks under this category. Great job!
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

const styles = {
  appContainer: {
    minHeight: "100vh",
    backgroundColor: "#F8FAFC",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box"
  },
  header: {
    position: "relative",
    zIndex: 2,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderBottom: "1px solid #E2E8F0",
    padding: "36px 40px",
    boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.04)"
  },
  headerContentWrapper: {
    maxWidth: "1150px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "24px"
  },
  headerLeft: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    maxWidth: "640px"
  },
  welcomeText: {
    fontSize: "18px",
    fontWeight: "800",
    color: "#5e0347",
    letterSpacing: "0.4px"
  },
  userName: {
    fontSize: "30px",
    fontWeight: "800",
    color: "#0F172A",
    margin: 0,
    letterSpacing: "-0.5px"
  },
  headerSubtitle: {
    fontSize: "13px",
    color: "#64748B",
    fontStyle: "italic",
    margin: "2px 0 6px 0",
    fontWeight: "500"
  },
  metaRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginTop: "4px"
  },
  metaBadge: {
    backgroundColor: "#539115",
    color: "#ffffff",
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "13.5px",
    fontWeight: "600",
    border: "1px solid #E2E8F0"
  },
  statsContainer: {
    display: "flex",
    gap: "14px",
    flexWrap: "wrap"
  },
  statBox: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: "14px",
    padding: "16px 20px",
    textAlign: "center",
    minWidth: "90px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
  },
  statNumber: {
    display: "block",
    fontSize: "22px",
    fontWeight: "800",
    backgroundColor: "#ffbc58",
    color: "#0F172A",
    borderRadius: "8px",
    padding: "2px 8px",
    marginBottom: "4px"
  },
  statLabel: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#932d11",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },
  mainContent: {
    position: "relative",
    zIndex: 1,
    maxWidth: "1150px",
    width: "100%",
    margin: "0 auto",
    padding: "36px 20px",
    boxSizing: "border-box",
    flex: 1
  },
  controlBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
    marginBottom: "24px",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: "18px 22px",
    borderRadius: "16px",
    border: "1px solid #E2E8F0"
  },
  sectionTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "800",
    color: "#0F172A"
  },
  sectionSubtitle: {
    margin: "4px 0 0 0",
    fontSize: "13px",
    color: "#475569"
  },
  tabSection: {
    display: "flex",
    gap: "8px",
    overflowX: "auto",
    maxWidth: "100%"
  },
  tab: {
    padding: "8px 16px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    whiteSpace: "nowrap"
  },
  quizList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    border: "1px solid #E2E8F0",
    borderRadius: "18px",
    padding: "20px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
    boxShadow: "0 4px 16px -4px rgba(15, 23, 42, 0.06)"
  },
  cardLeft: {
    display: "flex",
    alignItems: "flex-start",
    gap: "16px",
    flex: "1 1 520px"
  },
  statusIconDone: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    backgroundColor: "#DCFCE7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    flexShrink: 0
  },
  statusIconPending: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    backgroundColor: "#FEF3C7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    flexShrink: 0
  },
  tagSubject: {
    backgroundColor: "#DBEAFE",
    color: "#1E40AF",
    padding: "3px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "700"
  },
  idChip: {
    backgroundColor: "#F1F5F9",
    color: "#475569",
    padding: "3px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "600"
  },
  windowBadge: {
    padding: "3px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "700"
  },
  quizTitle: {
    margin: "4px 0 6px 0",
    fontSize: "18px",
    fontWeight: "800",
    color: "#0F172A"
  },
  quizMetaInfo: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    fontSize: "13px",
    color: "#475569",
    marginBottom: "6px"
  },
  scheduleLine: {
    display: "flex",
    gap: "14px",
    flexWrap: "wrap",
    fontSize: "12.5px",
    color: "#334155",
    marginBottom: "8px"
  },
  prizeBadge: {
    display: "inline-block",
    backgroundColor: "#FFFBEB",
    border: "1px solid #FDE68A",
    color: "#92400E",
    padding: "4px 10px",
    borderRadius: "8px",
    fontSize: "12.5px"
  },
  cardRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  scoreBlock: {
    textAlign: "right"
  },
  scoreValue: {
    fontSize: "24px",
    fontWeight: "800",
    color: "#047857"
  },
  gradeBadge: {
    fontSize: "12.5px",
    fontWeight: "700",
    color: "#1E3A8A",
    backgroundColor: "#EFF6FF",
    padding: "2px 10px",
    borderRadius: "999px",
    marginTop: "2px"
  },
  startButton: {
    backgroundColor: "#1E3A8A",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "12px",
    padding: "11px 20px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer"
  },
  disabledStartButton: {
    backgroundColor: "#CBD5E1",
    color: "#475569",
    cursor: "not-allowed"
  },
  cardFooter: {
    width: "100%",
    borderTop: "1px solid #E2E8F0",
    paddingTop: "12px",
    marginTop: "4px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px"
  },
  feedbackText: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#334155"
  },
  footerActionGroup: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap"
  },
  certificateButton: {
    backgroundColor: "#059669",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "10px",
    padding: "8px 14px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer"
  },
  reviewButton: {
    backgroundColor: "transparent",
    color: "#1E3A8A",
    border: "none",
    fontSize: "13.5px",
    fontWeight: "700",
    cursor: "pointer",
    padding: "6px 8px"
  },
  emptyState: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: "16px",
    padding: "40px 20px",
    textAlign: "center",
    border: "1px solid #E2E8F0"
  },
  loadingCard: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: "16px",
    padding: "40px 20px",
    textAlign: "center",
    border: "1px solid #E2E8F0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  },
  center: {
    minHeight: "60vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    textAlign: "center"
  },
  spinnerIcon: {
    width: "34px",
    height: "34px",
    border: "4px solid #E2E8F0",
    borderTop: "4px solid #1E3A8A",
    borderRadius: "50%"
  }
};

export default StudentQuizDashboard;