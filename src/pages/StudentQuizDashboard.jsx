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

const sanitizeQuizTitle = (rawTitle) => {
  const cleaned = String(rawTitle ?? "")
    .normalize("NFKC")
    .replace(/[^\x20-\x7E]/g, "")
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
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
      body { margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; background-color: #F8FAFC; color: #1E293B; }
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

  // Quiz title clearly PDF certificate mein daalta hai aur GRADE box ke andar fit rakhta hai
  const generateCertificate = (
    ansQuizId,
    directQuizTitle,
    scorePercent,
    grade
  ) => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    const studentName =
      String(user?.name || "Valued Student")
        .normalize("NFKC")
        .replace(/[^\x20-\x7E]/g, "")
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

    // Outer border
    doc.setLineWidth(1.6);
    doc.setDrawColor(15, 23, 42);
    doc.rect(10, 10, 277, 190);

    // Inner border
    doc.setLineWidth(0.7);
    doc.setDrawColor(5, 150, 105);
    doc.rect(13, 13, 271, 184);

    // Institution name
    doc.setFont("times", "bold");
    doc.setFontSize(23);
    doc.setTextColor(15, 23, 42);
    doc.text("SMART STUDENT CLASSES", 148.5, 28, {
      align: "center"
    });

    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.setTextColor(4, 120, 87);
    doc.text(
      "EXCELLENCE IN ACADEMIC ASSESSMENT & ACHIEVEMENT",
      148.5,
      36,
      { align: "center" }
    );

    // Certificate heading
    doc.setFont("times", "bold");
    doc.setFontSize(28);
    doc.setTextColor(30, 58, 138);
    doc.text("CERTIFICATE OF ACHIEVEMENT", 148.5, 52, {
      align: "center"
    });

   // Certification heading
doc.setFont("times", "italic");
doc.setFontSize(13);
doc.setTextColor(100, 116, 139);
doc.text("This is to certify that", 148.5, 63, {
  align: "center"
});

// Student name
doc.setFont("times", "bold");
doc.setFontSize(26);
doc.setTextColor(15, 23, 42);
doc.text(studentName, 148.5, 76, {
  align: "center"
});

// Achievement description
doc.setFont("times", "normal");
doc.setFontSize(12.5);
doc.setTextColor(71, 85, 105);
doc.text(
  "has successfully completed the following quiz assessment",
  148.5,
  87,
  { align: "center" }
);

// Quiz Title Box
const titleLines = doc.splitTextToSize(cleanTitle, 206);
const boxHeight = titleLines.length > 1 ? 20 : 15;

doc.setLineWidth(0.7);
doc.setDrawColor(30, 58, 138);
doc.setFillColor(239, 246, 255);
doc.roundedRect(40, 92, 217, boxHeight, 3, 3, "FD");

doc.setFont("times", "bold");
doc.setFontSize(16.5);
doc.setTextColor(30, 58, 138);
doc.text(titleLines.slice(0, 2), 148.5, 102, {
  align: "center"
});
    // Appreciation message
    const messageY = 92 + boxHeight + 9;

    doc.setFont("times", "normal");
    doc.setFontSize(12);
    doc.setTextColor(71, 85, 105);
    doc.text(
      "has demonstrated dedication and commitment to academic learning",
      148.5,
      messageY,
      { align: "center" }
    );

    // Score details box (wider so GRADE fits cleanly inside)
    const scoreBoxY = messageY + 7;
    doc.setLineWidth(0.5);
    doc.setDrawColor(5, 150, 105);
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(42, scoreBoxY, 213, 20, 3, 3, "FD");

    doc.setFont("times", "bold");
    doc.setFontSize(11.5);

    doc.setTextColor(15, 23, 42);
    doc.text(`CLASS: ${userClass || "N/A"}`, 78, scoreBoxY + 12.5, {
      align: "center"
    });

    doc.setTextColor(4, 120, 87);
    doc.text(`FINAL SCORE: ${scorePercent}%`, 148.5, scoreBoxY + 12.5, {
      align: "center"
    });

    doc.setTextColor(30, 58, 138);
    doc.text(`GRADE: ${cleanGrade}`, 216, scoreBoxY + 12.5, {
      align: "center"
    });

    // Final appreciation
    doc.setFont("times", "italic");
    doc.setFontSize(12);
    doc.setTextColor(71, 85, 105);
    doc.text(
      "We appreciate your efforts and wish you continued success.",
      148.5,
      158,
      { align: "center" }
    );

    // Date and signature
    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);

    doc.text(
      "Date of Issue: " + new Date().toLocaleDateString(),
      55,
      174,
      { align: "center" }
    );

    doc.line(30, 168, 80, 168);

    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Student Record", 55, 181, {
      align: "center"
    });

    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text("Authorized Signature", 242, 174, {
      align: "center"
    });

    doc.setDrawColor(4, 120, 87);
    doc.line(215, 168, 267, 168);

    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.setTextColor(4, 120, 87);
    doc.text("Smart Student Classes Authority", 242, 181, {
      align: "center"
    });

    // Download certificate
    const safeName = studentName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeQuiz = cleanTitle.replace(/[^a-zA-Z0-9_-]/g, "_");

    doc.save(`Certificate_${safeName}_${safeQuiz}.pdf`);
  };

  const totalQuizzes = quizzes.length;
  const completedQuizzes = quizzes.filter((q) => q.attempted).length;
  const pendingQuizzes = totalQuizzes - completedQuizzes;

  if (loading)
    return (
      <div
        style={{
          ...styles.center,
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          backgroundImage: `url(${DASHBOARD_BG_IMAGE})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
      >
        <div
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.35)",
            padding: "18px 26px",
            borderRadius: "16px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}
        >
          <div className="spinner" style={styles.spinnerIcon}></div>
          <p style={{ fontWeight: "700", color: "#FFFFFF", marginTop: "12px", fontSize: "14px" }}>
            Loading your learning hub...
          </p>
        </div>
      </div>
    );

  if (error)
    return (
      <div style={styles.center}>
        <p style={{ fontWeight: "700", color: "#EF4444", fontSize: "15px" }}>{error}</p>
      </div>
    );

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

        <div style={styles.quizList}>
          {filteredQuizzes.length > 0 ? (
            filteredQuizzes.map((quiz, idx) => {
              const qId = quiz.quiz_id ?? quiz.id;
              const ansQuizId = quiz.quiz_id ?? quiz.id;
              const quizTitleForCert =
  sanitizeQuizTitle(quiz.result?.quiz_title) ||
  sanitizeQuizTitle(quiz.quiz_title) ||
  sanitizeQuizTitle(quizTitleMap[String(ansQuizId)]) ||
  sanitizeQuizTitle(quiz.title);
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
    maxWidth: "600px"
  },
  welcomeText: {
    fontSize: "20px",
    fontWeight: "900",
    color: "#5e0347",
    textTransform: "uppercase",
    letterSpacing: "0.8px"
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
    fontWeight: "500",
    border: "1px solid #E2E8F0"
  },
  statsContainer: {
    display: "flex",
    gap: "14px"
  },
  statBox: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: "14px",
    padding: "16px 20px",
    textAlign: "center",
    minWidth: "85px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
  },
  statNumber: {
    display: "block",
    fontSize: "22px",
    fontWeight: "800",
    backgroundColor: "#ffbc58",
    color: "#0F172A"
  },
  statLabel: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#932d11",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },
  mainContent: {
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
    alignItems: "flex-end",
    marginBottom: "28px",
    flexWrap: "wrap",
    gap: "16px"
  },
  sectionTitle: {
    fontSize: "22px",
    fontWeight: "800",
    color: "#0F172A",
    margin: "0 0 4px 0"
  },
  sectionSubtitle: {
    fontSize: "13px",
    color: "#64748B",
    margin: 0,
    fontWeight: "500"
  },
  tabSection: {
    display: "flex",
    gap: "10px",
    overflowX: "auto",
    maxWidth: "100%",
    paddingBottom: "4px"
  },
  tab: {
    padding: "10px 20px",
    borderRadius: "12px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.25s ease"
  },
  quizList: {
    display: "flex",
    flexDirection: "column",
    gap: "18px"
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: "18px",
    border: "1px solid #E2E8F0",
    padding: "22px 26px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
    boxShadow: "0 4px 20px -4px rgba(0, 0, 0, 0.05)"
  },
  cardLeft: {
    display: "flex",
    alignItems: "flex-start",
    gap: "18px",
    flex: 1,
    minWidth: "280px"
  },
  statusIconPending: {
    width: "48px",
    height: "48px",
    backgroundColor: "#FEF3C7",
    color: "#D97706",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    flexShrink: 0
  },
  statusIconDone: {
    width: "48px",
    height: "48px",
    backgroundColor: "#D1FAE5",
    color: "#059669",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    flexShrink: 0
  },
  tagSubject: {
    fontSize: "11px",
    fontWeight: "800",
    color: "#4F46E5",
    textTransform: "uppercase",
    letterSpacing: "0.8px"
  },
  idChip: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#475569",
    backgroundColor: "#F1F5F9",
    padding: "2px 8px",
    borderRadius: "6px"
  },
  windowBadge: {
    fontSize: "11px",
    fontWeight: "700",
    padding: "2px 8px",
    borderRadius: "999px"
  },
  quizTitle: {
    fontSize: "17px",
    fontWeight: "800",
    color: "#0F172A",
    margin: "0 0 6px 0"
  },
  quizMetaInfo: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    fontSize: "12px",
    color: "#64748B",
    fontWeight: "600",
    marginBottom: "6px"
  },
  scheduleLine: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    fontSize: "12px",
    color: "#334155",
    marginBottom: "8px"
  },
  prizeBadge: {
    fontSize: "12px",
    color: "#0D9488",
    backgroundColor: "#F0FDFA",
    border: "1px solid #CCFBF1",
    padding: "4px 10px",
    borderRadius: "8px",
    display: "inline-block",
    fontWeight: "500"
  },
  cardRight: {
    display: "flex",
    alignItems: "center",
    gap: "16px"
  },
  startButton: {
    backgroundColor: "#0F172A",
    color: "#FFFFFF",
    border: "none",
    padding: "12px 24px",
    borderRadius: "12px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.15)",
    transition: "background 0.2s ease, transform 0.2s ease"
  },
  disabledStartButton: {
    backgroundColor: "#E2E8F0",
    color: "#64748B",
    boxShadow: "none",
    cursor: "not-allowed"
  },
  scoreBlock: {
    textAlign: "right"
  },
  scoreValue: {
    fontSize: "20px",
    fontWeight: "800",
    color: "#059669"
  },
  gradeBadge: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase"
  },
  cardFooter: {
    width: "100%",
    borderTop: "1px solid #F1F5F9",
    marginTop: "14px",
    paddingTop: "14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px"
  },
  feedbackText: {
    fontSize: "12px",
    color: "#059669",
    fontWeight: "700"
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
    padding: "7px 14px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "700",
    cursor: "pointer"
  },
  reviewButton: {
    background: "none",
    border: "none",
    color: "#4F46E5",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    padding: 0
  },
  emptyState: {
    textAlign: "center",
    padding: "70px 20px",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: "18px",
    border: "1px solid #E2E8F0",
    boxShadow: "0 4px 20px -4px rgba(0, 0, 0, 0.04)"
  },
  center: {
    width: "100vw",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC"
  },
  spinnerIcon: {
    width: "40px",
    height: "40px",
    border: "4px solid #E2E8F0",
    borderTop: "4px solid #4F46E5",
    borderRadius: "50%"
  }
};

export default StudentQuizDashboard;