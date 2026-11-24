import React, { useState, useEffect, useMemo } from "react";
import api from "../services/api";
import {
  FaEdit,
  FaTrash,
  FaPlus,
  FaSave,
  FaTimes,
  FaClock,
  FaCalendarAlt,
  FaRedo,
  FaSearch,
  FaCheckCircle
} from "react-icons/fa";

const AdminQuizPage = () => {
  const subjectsByClass = {
    "L.K.G": ["Hindi", "English", "Maths", "EVS", "Reading", "Test"],
    "U.K.G": ["Hindi", "English", "Maths", "EVS", "Reading", "Test"],
    "1st": ["Hindi", "English", "EVS", "Maths", "Test"],
    "2nd": ["Hindi", "English", "EVS", "Maths", "Test"],
    "3rd": ["Hindi", "English", "EVS", "Maths", "Test"],
    "4th": ["Hindi", "English", "EVS", "Maths", "Test"],
    "5th": ["Hindi", "English", "EVS", "Maths", "Test"],
    "6th": ["Hindi", "English", "Maths", "Science", "SST", "Test"],
    "7th": ["Hindi", "English", "Maths", "Science", "SST", "Test"],
    "8th": ["Hindi", "English", "Maths", "Science", "SST", "Sanskrit", "Test"],
    "9th": ["Hindi", "English", "Maths", "Physics", "Chemistry", "Sanskrit", "Biology", "SST", "Computer", "Test"],
    "10th": ["Hindi", "English", "Maths", "Physics", "Chemistry", "Sanskrit", "Biology", "SST", "Computer", "Test"],
    "11th": ["Hindi", "English", "Maths", "Physics", "Chemistry", "Biology", "English Communication", "Test"],
    "12th": ["Hindi", "English", "Maths", "Physics", "Chemistry", "Biology", "English Communication", "Test"]
  };

  const sessions = ["2025-26", "2026-27", "2027-28"];
  const streams = ["None", "PCM", "PCB", "Arts", "Commerce", "Chemistry,Maths", "Hindi,English"];

  const [activeTab, setActiveTab] = useState("create");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({});
  const [quizzes, setQuizzes] = useState([]);

  // Quiz Name + All Classes simultaneous search state
  const [lookupMode, setLookupMode] = useState("class"); // "class" | "quizNameAllClasses"
  const [quizNameQuery, setQuizNameQuery] = useState("");
  const [selectedQuizTitleFilter, setSelectedQuizTitleFilter] = useState("ALL");

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSession, setSelectedSession] = useState("2026-27");
  const [selectedStream, setSelectedStream] = useState("");

  // Question inline edit state
  const [editingQuizId, setEditingQuizId] = useState(null);
  const [tempQuizData, setTempQuizData] = useState([]);

  // Schedule & timer edit modal state
  const [scheduleModalQuiz, setScheduleModalQuiz] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    created_at: "",
    start_at: "",
    end_at: "",
    timer_minutes: 10
  });

  // Create quiz state
  const [quiz, setQuiz] = useState({
    class_name: "",
    subject: "",
    session: "2026-27",
    stream: "",
    title: "",
    timer_minutes: 10,
    start_at: "",
    end_at: "",
    questions: []
  });

  const safeParse = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    try {
      return typeof data === "string" ? JSON.parse(data) : data;
    } catch {
      return [];
    }
  };

  const toDateTimeLocal = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const offsetMs = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
  };

  const formatDateTime = (value) => {
    if (!value) return "Not set";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  };

  const getScheduleBadge = (q) => {
    const now = new Date();
    const start = q.start_at ? new Date(q.start_at) : null;
    const end = q.end_at ? new Date(q.end_at) : null;

    if (start && now < start) {
      return { label: "Scheduled", bg: "#fef3c7", color: "#92400e", border: "#fcd34d" };
    }
    if (end && now > end) {
      return { label: "Closed", bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" };
    }
    if (start || end) {
      return { label: "Live Window", bg: "#dcfce7", color: "#166534", border: "#86efac" };
    }
    return { label: "Always Open", bg: "#e0f2fe", color: "#075985", border: "#7dd3fc" };
  };

  // 1. Fetch Quizzes for Manage Tab
  const fetchQuizzesForAdmin = async (className, session, stream) => {
    if (!className || !session) return alert("Select Class and Session!");
    setLoading(true);
    try {
      const res = await api.get(`/api/quiz/class/${className}`, {
        params: { session, stream }
      });
      setQuizzes(Array.isArray(res.data) ? res.data : res.data?.quizzes || []);
    } catch {
      alert("Error fetching quizzes");
    } finally {
      setLoading(false);
    }
  };

  // 2. Delete Quiz
  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm("Are you sure? All results will be deleted!")) return;
    try {
      setLoading(true);
      await api.delete(`/api/quiz/delete/${quizId}`);
      alert("Quiz Deleted!");
      fetchQuizzesForAdmin(selectedClass, selectedSession, selectedStream);
    } catch {
      alert("Delete failed!");
    } finally {
      setLoading(false);
    }
  };

  // 3. Inline Question Edit
  const startEditing = (q) => {
    setEditingQuizId(q.id);
    setTempQuizData(safeParse(q.questions));
  };

  const handleInlineChange = (qIdx, field, value, optIdx = null) => {
    const newData = [...tempQuizData];
    if (optIdx !== null) {
      newData[qIdx].options[optIdx] = value;
    } else {
      newData[qIdx][field] = value;
    }
    setTempQuizData(newData);
  };

  const saveUpdatedQuiz = async (quizId) => {
    try {
      setLoading(true);
      for (let i = 0; i < tempQuizData.length; i++) {
        await api.put(`/api/quiz/update/${quizId}/${i}`, tempQuizData[i]);
      }
      alert("Questions Updated Successfully!");
      setEditingQuizId(null);
      fetchQuizzesForAdmin(selectedClass, selectedSession, selectedStream);
    } catch {
      alert("Update failed");
    } finally {
      setLoading(false);
    }
  };

  // 3b. Edit Schedule & Timer
  const openScheduleModal = (q) => {
    setScheduleModalQuiz(q);
    setScheduleForm({
      created_at: toDateTimeLocal(q.created_at),
      start_at: toDateTimeLocal(q.start_at),
      end_at: toDateTimeLocal(q.end_at),
      timer_minutes: q.timer_minutes ?? 10
    });
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!scheduleModalQuiz) return;

    if (
      scheduleForm.start_at &&
      scheduleForm.end_at &&
      new Date(scheduleForm.end_at) <= new Date(scheduleForm.start_at)
    ) {
      return alert("End Time must be later than Start Time!");
    }

    setLoading(true);
    try {
      const payload = {
        created_at: scheduleForm.created_at ? new Date(scheduleForm.created_at).toISOString() : null,
        start_at: scheduleForm.start_at ? new Date(scheduleForm.start_at).toISOString() : null,
        end_at: scheduleForm.end_at ? new Date(scheduleForm.end_at).toISOString() : null,
        timer_minutes: Number(scheduleForm.timer_minutes) || 10
      };

      await api.put(`/api/quiz/admin/edit-quiz/${scheduleModalQuiz.id}`, payload);
      alert("Quiz schedule & timer updated!");
      setScheduleModalQuiz(null);
      fetchQuizzesForAdmin(selectedClass, selectedSession, selectedStream);
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to update quiz schedule");
    } finally {
      setLoading(false);
    }
  };

  // 4. Create Quiz
  const handleSubmitQuiz = async () => {
    if (!quiz.class_name || !quiz.subject || !quiz.title || !quiz.session || quiz.questions.length === 0) {
      return alert("Please fill all details and add at least one question!");
    }
    if (
      quiz.start_at &&
      quiz.end_at &&
      new Date(quiz.end_at) <= new Date(quiz.start_at)
    ) {
      return alert("End Time must be later than Start Time!");
    }

    setLoading(true);
    try {
      const payload = {
        ...quiz,
        timer_minutes: Number(quiz.timer_minutes) || 10,
        start_at: quiz.start_at ? new Date(quiz.start_at).toISOString() : null,
        end_at: quiz.end_at ? new Date(quiz.end_at).toISOString() : null
      };

      await api.post(`/api/quiz/create`, payload);
      alert("Quiz Created!");
      setQuiz({
        class_name: "",
        subject: "",
        session: "2026-27",
        stream: "",
        title: "",
        timer_minutes: 10,
        start_at: "",
        end_at: "",
        questions: []
      });
      setActiveTab("edit");
    } catch {
      alert("Error creating quiz");
    } finally {
      setLoading(false);
    }
  };

  const normalizeResultRows = (rows, quizTitleToQuizIdMap, fallbackClassName = "") =>
    (rows || []).map((curr) => {
      const title = curr.quiz_title || curr.title || "Untitled Quiz";
      const qId =
        curr.quiz_id ??
        curr.quizId ??
        quizTitleToQuizIdMap.get(title.trim().toLowerCase()) ??
        null;
      const sId =
        curr.student_id ??
        curr.studentId ??
        curr.user_id ??
        curr.id ??
        null;

      return {
        ...curr,
        quiz_title: title,
        class_name: curr.class_name || curr.class || fallbackClassName || "—",
        resolved_quiz_id: qId,
        resolved_student_id: sId,
        attempted_at:
          curr.attempted_at ||
          curr.attemptedAt ||
          curr.submitted_at ||
          curr.created_at ||
          null
      };
    });

  // 5A. Fetch Results for a single Class
  const fetchResultsByClass = async (className, session, stream) => {
    if (!className || !session) return alert("Select Class and Session first!");
    setLoading(true);
    try {
      const [res, quizListRes] = await Promise.all([
        api.get(`/api/quiz/admin/results/${className}`, {
          params: { session, stream }
        }),
        api
          .get(`/api/quiz/class/${className}`, {
            params: { session, stream }
          })
          .catch(() => ({ data: [] }))
      ]);

      const quizMap = new Map();
      const quizList = Array.isArray(quizListRes.data)
        ? quizListRes.data
        : quizListRes.data?.quizzes || [];
      quizList.forEach((item) => {
        const idVal = item.quiz_id ?? item.id;
        if (item.title && idVal) {
          quizMap.set(item.title.trim().toLowerCase(), idVal);
        }
      });

      const rawRows = Array.isArray(res.data) ? res.data : res.data?.results || [];
      const normalized = normalizeResultRows(rawRows, quizMap, className);

      const grouped = normalized.reduce((acc, row) => {
        const key = row.quiz_title || "Untitled Quiz";
        if (!acc[key]) acc[key] = [];
        acc[key].push(row);
        return acc;
      }, {});

      setResults(grouped);
      setSelectedQuizTitleFilter("ALL");
    } catch {
      alert("Error fetching results");
    } finally {
      setLoading(false);
    }
  };

  // 5B. Fetch Results by Quiz Name across ALL Classes simultaneously
  const fetchResultsByQuizNameAllClasses = async (session, searchTitle) => {
    if (!session) return alert("Select Session first!");
    const needle = (searchTitle || "").trim().toLowerCase();

    setLoading(true);
    try {
      const allClasses = Object.keys(subjectsByClass);

      const batchResponses = await Promise.all(
        allClasses.map(async (cls) => {
          const [resData, quizData] = await Promise.all([
            api
              .get(`/api/quiz/admin/results/${cls}`, { params: { session } })
              .then((r) => (Array.isArray(r.data) ? r.data : r.data?.results || []))
              .catch(() => []),
            api
              .get(`/api/quiz/class/${cls}`, { params: { session } })
              .then((r) => (Array.isArray(r.data) ? r.data : r.data?.quizzes || []))
              .catch(() => [])
          ]);

          const quizMap = new Map();
          quizData.forEach((item) => {
            const idVal = item.quiz_id ?? item.id;
            if (item.title && idVal) {
              quizMap.set(item.title.trim().toLowerCase(), idVal);
            }
          });

          return normalizeResultRows(resData, quizMap, cls);
        })
      );

      const combinedRows = batchResponses.flat().filter((row) => {
        if (!needle) return true;
        return String(row.quiz_title || "").toLowerCase().includes(needle);
      });

      const grouped = combinedRows.reduce((acc, row) => {
        const key = row.quiz_title || "Untitled Quiz";
        if (!acc[key]) acc[key] = [];
        acc[key].push(row);
        return acc;
      }, {});

      setResults(grouped);
      setSelectedQuizTitleFilter("ALL");
    } catch {
      alert("Error fetching results across classes");
    } finally {
      setLoading(false);
    }
  };

  // 6. Renew Student Quiz Attempt -> DELETE /api/quiz/admin/renew-quiz/:quizId/:studentId
  const handleRenewStudentAttempt = async (quizId, studentId, studentName, quizTitle) => {
    if (!quizId || !studentId) {
      return alert(
        "student_id or quiz_id missing. Ensure backend returns student_id and quiz_id in quiz results."
      );
    }
    const confirmed = window.confirm(
      `Renew "${quizTitle}" (Quiz ID: ${quizId}) for ${studentName || `Student #${studentId}`}? Previous attempt will be deleted.`
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      await api.delete(`/api/quiz/admin/renew-quiz/${quizId}/${studentId}`, {
        params: { quiz_id: quizId, student_id: studentId }
      });
      alert(`Attempt renewed for ${studentName || `Student #${studentId}`}.`);
      if (lookupMode === "quizNameAllClasses") {
        await fetchResultsByQuizNameAllClasses(selectedSession, quizNameQuery);
      } else {
        await fetchResultsByClass(selectedClass, selectedSession, selectedStream);
      }
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to renew student attempt");
    } finally {
      setLoading(false);
    }
  };

  const availableQuizTitles = useMemo(() => Object.keys(results), [results]);

  const visibleResultEntries = useMemo(() => {
    if (selectedQuizTitleFilter === "ALL") {
      return Object.entries(results);
    }
    return Object.entries(results).filter(([title]) => title === selectedQuizTitleFilter);
  }, [results, selectedQuizTitleFilter]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape" && scheduleModalQuiz) {
        setScheduleModalQuiz(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [scheduleModalQuiz]);

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        {/* Header */}
        <div style={styles.headerCard}>
          <span style={styles.badgePill}>Admin Quiz Console</span>
          <h1 style={styles.title}>Quiz Administration Portal</h1>
          <p style={styles.subtitle}>
            Schedule quiz windows (start_at / end_at), edit questions &amp; timers, view results by quiz name across all classes, and renew attempts.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div style={styles.tabBar}>
          <button
            type="button"
            onClick={() => setActiveTab("create")}
            style={{
              ...styles.tabBtn,
              ...(activeTab === "create" ? styles.activeTabCreate : {})
            }}
          >
            <FaPlus /> Create Quiz
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("edit")}
            style={{
              ...styles.tabBtn,
              ...(activeTab === "edit" ? styles.activeTabManage : {})
            }}
          >
            <FaCalendarAlt /> Manage &amp; Schedule
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("results")}
            style={{
              ...styles.tabBtn,
              ...(activeTab === "results" ? styles.activeTabResults : {})
            }}
          >
            <FaCheckCircle /> Results &amp; Renew
          </button>
        </div>

        {/* CREATE TAB */}
        {activeTab === "create" && (
          <div style={styles.panel}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>Create New Quiz</h3>
              <span style={styles.helperText}>Optional start &amp; end timestamps control quiz availability.</span>
            </div>

            <div style={styles.formGrid}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Session</label>
                <select
                  style={styles.input}
                  value={quiz.session}
                  onChange={(e) => setQuiz({ ...quiz, session: e.target.value })}
                >
                  <option value="">Select Session</option>
                  {sessions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Class</label>
                <select
                  style={styles.input}
                  value={quiz.class_name}
                  onChange={(e) => setQuiz({ ...quiz, class_name: e.target.value, stream: "", subject: "" })}
                >
                  <option value="">Select Class</option>
                  {Object.keys(subjectsByClass).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {(quiz.class_name === "11th" || quiz.class_name === "12th") && (
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Stream</label>
                  <select
                    style={styles.input}
                    value={quiz.stream}
                    onChange={(e) => setQuiz({ ...quiz, stream: e.target.value })}
                  >
                    <option value="">Select Stream</option>
                    {streams.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Subject</label>
                <select
                  style={styles.input}
                  value={quiz.subject}
                  onChange={(e) => setQuiz({ ...quiz, subject: e.target.value })}
                  disabled={!quiz.class_name}
                >
                  <option value="">Select Subject</option>
                  {quiz.class_name &&
                    subjectsByClass[quiz.class_name].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Quiz Title</label>
                <input
                  style={styles.input}
                  placeholder="Enter quiz title"
                  value={quiz.title}
                  onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Timer (Minutes)</label>
                <input
                  style={styles.input}
                  type="number"
                  min="1"
                  value={quiz.timer_minutes}
                  onChange={(e) => setQuiz({ ...quiz, timer_minutes: e.target.value })}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Start At</label>
                <input
                  style={styles.input}
                  type="datetime-local"
                  value={quiz.start_at}
                  onChange={(e) => setQuiz({ ...quiz, start_at: e.target.value })}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>End At</label>
                <input
                  style={styles.input}
                  type="datetime-local"
                  value={quiz.end_at}
                  onChange={(e) => setQuiz({ ...quiz, end_at: e.target.value })}
                />
              </div>
            </div>

            <div style={styles.questionsToolbar}>
              <h4 style={styles.subHeading}>Questions ({quiz.questions.length})</h4>
              <button
                type="button"
                onClick={() =>
                  setQuiz({
                    ...quiz,
                    questions: [...quiz.questions, { question: "", options: ["", "", "", ""], correctAnswer: "" }]
                  })
                }
                style={styles.primaryBtn}
              >
                <FaPlus /> Add Question
              </button>
            </div>

            {quiz.questions.map((q, i) => (
              <div key={i} style={styles.questionCard}>
                <div style={styles.questionTop}>
                  <span style={styles.qBadge}>Question {i + 1}</span>
                  <button
                    type="button"
                    aria-label={`Remove question ${i + 1}`}
                    style={styles.iconDangerBtn}
                    onClick={() => {
                      const nq = [...quiz.questions];
                      nq.splice(i, 1);
                      setQuiz({ ...quiz, questions: nq });
                    }}
                  >
                    <FaTrash /> Remove
                  </button>
                </div>

                <input
                  style={styles.input}
                  placeholder="Enter question text..."
                  value={q.question}
                  onChange={(e) => {
                    const nq = [...quiz.questions];
                    nq[i].question = e.target.value;
                    setQuiz({ ...quiz, questions: nq });
                  }}
                />

                <div style={styles.optionsGrid}>
                  {q.options.map((opt, oi) => (
                    <input
                      key={oi}
                      value={opt}
                      placeholder={`Option ${oi + 1}`}
                      onChange={(e) => {
                        const nq = [...quiz.questions];
                        nq[i].options[oi] = e.target.value;
                        setQuiz({ ...quiz, questions: nq });
                      }}
                      style={styles.input}
                    />
                  ))}
                </div>

                <div style={{ marginTop: "10px" }}>
                  <label style={styles.label}>Correct Answer</label>
                  <select
                    style={styles.input}
                    value={q.correctAnswer}
                    onChange={(e) => {
                      const nq = [...quiz.questions];
                      nq[i].correctAnswer = e.target.value;
                      setQuiz({ ...quiz, questions: nq });
                    }}
                  >
                    <option value="">Select Correct Answer</option>
                    {q.options.map((opt, oi) =>
                      opt ? (
                        <option key={oi} value={opt}>
                          {opt}
                        </option>
                      ) : null
                    )}
                  </select>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleSubmitQuiz}
              style={styles.publishBtn}
              disabled={loading}
            >
              {loading ? "Publishing Quiz..." : "Publish Quiz"}
            </button>
          </div>
        )}

        {/* MANAGE & SCHEDULE TAB */}
        {activeTab === "edit" && (
          <div style={styles.panel}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>Manage Quizzes &amp; Schedule</h3>
              <span style={styles.helperText}>Update start/end timestamps, timer, questions, or delete quizzes.</span>
            </div>

            <div style={styles.filterBar}>
              <select
                style={styles.filterInput}
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
              >
                {sessions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <select
                style={styles.filterInput}
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="">Select Class</option>
                {Object.keys(subjectsByClass).map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>

              {(selectedClass === "11th" || selectedClass === "12th") && (
                <select
                  style={styles.filterInput}
                  value={selectedStream}
                  onChange={(e) => setSelectedStream(e.target.value)}
                >
                  <option value="">Select Stream</option>
                  {streams.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              )}

              <button
                type="button"
                style={styles.primaryBtn}
                onClick={() => fetchQuizzesForAdmin(selectedClass, selectedSession, selectedStream)}
                disabled={loading}
              >
                <FaSearch /> {loading ? "Loading..." : "Search"}
              </button>
            </div>

            {quizzes.length === 0 && (
              <div style={styles.emptyState}>
                Select Session and Class, then click Search to view quizzes.
              </div>
            )}

            {quizzes.map((q) => {
              const qList = safeParse(q.questions);
              const badge = getScheduleBadge(q);
              const qId = q.quiz_id ?? q.id;

              return (
                <div key={qId} style={styles.quizCard}>
                  <div style={styles.quizCardTop}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <h4 style={styles.quizTitle}>{q.title}</h4>
                        <span style={styles.idTag}>Quiz ID: {qId}</span>
                        <span
                          style={{
                            ...styles.statusBadge,
                            backgroundColor: badge.bg,
                            color: badge.color,
                            borderColor: badge.border
                          }}
                        >
                          {badge.label}
                        </span>
                      </div>

                      <div style={styles.metaRow}>
                        <span><strong>Subject:</strong> {q.subject}</span>
                        <span>•</span>
                        <span><strong>Session:</strong> {q.session}</span>
                        <span>•</span>
                        <span><strong>Questions:</strong> {qList.length}</span>
                        <span>•</span>
                        <span><FaClock style={{ verticalAlign: "-1px" }} /> <strong>Timer:</strong> {q.timer_minutes ?? 10} mins</span>
                      </div>

                      <div style={styles.scheduleMeta}>
                        <span><strong>Start:</strong> {formatDateTime(q.start_at)}</span>
                        <span><strong>End:</strong> {formatDateTime(q.end_at)}</span>
                        <span><strong>Created:</strong> {formatDateTime(q.created_at)}</span>
                      </div>
                    </div>

                    <div style={styles.actionGroup}>
                      <button
                        type="button"
                        onClick={() => openScheduleModal(q)}
                        style={styles.scheduleBtn}
                      >
                        <FaCalendarAlt /> Edit Schedule
                      </button>

                      {editingQuizId === q.id ? (
                        <button
                          type="button"
                          onClick={() => saveUpdatedQuiz(q.id)}
                          style={styles.saveBtn}
                        >
                          <FaSave /> Save Questions
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditing(q)}
                          style={styles.darkBtn}
                        >
                          <FaEdit /> Edit Questions
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteQuiz(q.id)}
                        style={styles.dangerBtn}
                      >
                        <FaTrash /> Delete
                      </button>
                    </div>
                  </div>

                  {editingQuizId === q.id && (
                    <div style={styles.inlineEditor}>
                      {tempQuizData.map((tq, tIdx) => (
                        <div key={tIdx} style={styles.inlineQuestionBox}>
                          <label style={styles.label}>Question {tIdx + 1}</label>
                          <input
                            style={styles.input}
                            value={tq.question}
                            onChange={(e) => handleInlineChange(tIdx, "question", e.target.value)}
                          />
                          <div style={styles.optionsGrid}>
                            {tq.options.map((opt, oIdx) => (
                              <input
                                key={oIdx}
                                style={styles.input}
                                value={opt}
                                onChange={(e) => handleInlineChange(tIdx, "options", e.target.value, oIdx)}
                              />
                            ))}
                          </div>
                          <label style={styles.label}>Correct Answer</label>
                          <select
                            style={styles.input}
                            value={tq.correctAnswer}
                            onChange={(e) => handleInlineChange(tIdx, "correctAnswer", e.target.value)}
                          >
                            {tq.options.map((opt, oIdx) => (
                              <option key={oIdx} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setEditingQuizId(null)}
                        style={styles.secondaryBtn}
                      >
                        <FaTimes /> Cancel Question Edit
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* RESULTS & RENEW TAB */}
        {activeTab === "results" && (
          <div style={styles.panel}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>Quiz Reports &amp; Attempt Renewal</h3>
              <span style={styles.helperText}>
                Filter by Class or search by Quiz Name across ALL classes simultaneously.
              </span>
            </div>

            {/* Mode Switcher */}
            <div style={styles.modeSwitchRow}>
              <button
                type="button"
                onClick={() => setLookupMode("class")}
                style={{
                  ...styles.modeBtn,
                  ...(lookupMode === "class" ? styles.modeBtnActive : {})
                }}
              >
                By Class &amp; Session
              </button>
              <button
                type="button"
                onClick={() => setLookupMode("quizNameAllClasses")}
                style={{
                  ...styles.modeBtn,
                  ...(lookupMode === "quizNameAllClasses" ? styles.modeBtnActive : {})
                }}
              >
                By Quiz Name (All Classes)
              </button>
            </div>

            {lookupMode === "class" ? (
              <div style={styles.filterBar}>
                <select
                  style={styles.filterInput}
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                >
                  {sessions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <select
                  style={styles.filterInput}
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  <option value="">Select Class</option>
                  {Object.keys(subjectsByClass).map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>

                {(selectedClass === "11th" || selectedClass === "12th") && (
                  <select
                    style={styles.filterInput}
                    value={selectedStream}
                    onChange={(e) => setSelectedStream(e.target.value)}
                  >
                    <option value="">Select Stream</option>
                    {streams.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  style={styles.saveBtn}
                  onClick={() => fetchResultsByClass(selectedClass, selectedSession, selectedStream)}
                  disabled={loading}
                >
                  <FaSearch /> {loading ? "Loading..." : "Get Reports"}
                </button>
              </div>
            ) : (
              <div style={styles.filterBar}>
                <select
                  style={styles.filterInput}
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                >
                  {sessions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <input
                  style={{ ...styles.filterInput, minWidth: "240px", flex: 1 }}
                  placeholder="Enter Quiz Name (leave blank to load all quizzes across all classes)"
                  value={quizNameQuery}
                  onChange={(e) => setQuizNameQuery(e.target.value)}
                />

                <button
                  type="button"
                  style={styles.saveBtn}
                  onClick={() => fetchResultsByQuizNameAllClasses(selectedSession, quizNameQuery)}
                  disabled={loading}
                >
                  <FaSearch /> {loading ? "Scanning All Classes..." : "Search All Classes"}
                </button>
              </div>
            )}

            {/* Quick Quiz Name Dropdown Filter once results are loaded */}
            {availableQuizTitles.length > 1 && (
              <div style={styles.quickFilterRow}>
                <span style={styles.label}>Filter Loaded Quizzes:</span>
                <select
                  style={styles.filterInput}
                  value={selectedQuizTitleFilter}
                  onChange={(e) => setSelectedQuizTitleFilter(e.target.value)}
                >
                  <option value="ALL">All Matching Quizzes ({availableQuizTitles.length})</option>
                  {availableQuizTitles.map((t) => (
                    <option key={t} value={t}>
                      {t} ({results[t].length} attempts)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {visibleResultEntries.length === 0 && (
              <div style={styles.emptyState}>
                {loading
                  ? "Fetching student attempts..."
                  : "Select filters and click Get Reports / Search All Classes to view student attempts."}
              </div>
            )}

            {visibleResultEntries.map(([quizTitle, rows]) => {
              const sample = rows[0] || {};
              const headerQuizId = sample.resolved_quiz_id ?? sample.quiz_id ?? "—";

              return (
                <div key={quizTitle} style={styles.resultGroup}>
                  <div style={styles.resultHeader}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>
                        Quiz: {quizTitle} <span style={styles.idTag}>Quiz ID: {headerQuizId}</span>
                      </div>
                      {(sample.start_at || sample.end_at || sample.subject) && (
                        <div style={styles.resultSubMeta}>
                          {sample.subject && <span><strong>Subject:</strong> {sample.subject}</span>}
                          {sample.start_at && <span><strong>Start:</strong> {formatDateTime(sample.start_at)}</span>}
                          {sample.end_at && <span><strong>End:</strong> {formatDateTime(sample.end_at)}</span>}
                        </div>
                      )}
                    </div>
                    <span style={styles.countChip}>{rows.length} Attempts</span>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table style={styles.table}>
                      <thead>
                        <tr style={styles.tableHeadRow}>
                          <th style={styles.th}>Student ID</th>
                          <th style={styles.th}>Quiz ID</th>
                          <th style={styles.th}>Class</th>
                          <th style={styles.th}>Student Name</th>
                          <th style={styles.th}>Score</th>
                          <th style={styles.th}>Grade</th>
                          <th style={styles.th}>Attempted At</th>
                          <th style={styles.th}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, rIdx) => {
                          const sId = r.resolved_student_id ?? r.student_id ?? "—";
                          const qId = r.resolved_quiz_id ?? r.quiz_id ?? headerQuizId;
                          const studentName = r.student_name || r.name || `Student #${sId}`;

                          return (
                            <tr key={`${qId}-${sId}-${rIdx}`} style={styles.tableRow}>
                            <td style={styles.td}>
  <strong style={{ color: "violet" }}>{sId}</strong>
</td>
                              <td style={styles.td}> <strong style={{ color: "brown" }}>{qId}</strong></td>
                              <td style={styles.td}>{r.class_name || "—"}</td>
                              <td style={styles.td}>{studentName}</td>
                              <td style={styles.td}>{r.score ?? r.marks ?? "—"}</td>
                              <td style={styles.td}>{r.grade || "—"}</td>
                              <td style={styles.td}>{formatDateTime(r.attempted_at)}</td>
                              <td style={styles.td}>
                                <button
                                  type="button"
                                  style={styles.renewBtn}
                                  disabled={loading || !qId || qId === "—" || !sId || sId === "—"}
                                  onClick={() =>
                                    handleRenewStudentAttempt(qId, sId, studentName, quizTitle)
                                  }
                                >
                                  <FaRedo /> Renew Quiz
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SCHEDULE & TIMER MODAL */}
      {scheduleModalQuiz && (
        <div style={styles.modalBackdrop} onClick={() => setScheduleModalQuiz(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: "18px", color: "#0f172a" }}>
                Edit Schedule &amp; Timer — {scheduleModalQuiz.title}
              </h3>
              <button
                type="button"
                aria-label="Close modal"
                style={styles.closeBtn}
                onClick={() => setScheduleModalQuiz(null)}
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} style={styles.modalBody}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Created At</label>
                <input
                  type="datetime-local"
                  style={styles.input}
                  value={scheduleForm.created_at}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, created_at: e.target.value })}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Start At</label>
                <input
                  type="datetime-local"
                  style={styles.input}
                  value={scheduleForm.start_at}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, start_at: e.target.value })}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>End At</label>
                <input
                  type="datetime-local"
                  style={styles.input}
                  value={scheduleForm.end_at}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, end_at: e.target.value })}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Timer (Minutes)</label>
                <input
                  type="number"
                  min="1"
                  style={styles.input}
                  value={scheduleForm.timer_minutes}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, timer_minutes: e.target.value })}
                />
              </div>

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  style={styles.secondaryBtn}
                  onClick={() => setScheduleModalQuiz(null)}
                >
                  Cancel
                </button>
                <button type="submit" style={styles.saveBtn} disabled={loading}>
                  <FaSave /> {loading ? "Saving..." : "Save Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
    padding: "28px 16px 60px",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    color: "#0f172a"
  },
  shell: {
    maxWidth: "1120px",
    margin: "0 auto"
  },
  headerCard: {
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    color: "#ffffff",
    borderRadius: "16px",
    padding: "24px 28px",
    marginBottom: "18px",
    boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.15)"
  },
  badgePill: {
    display: "inline-block",
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    color: "#93c5fd",
    border: "1px solid rgba(147, 197, 253, 0.35)",
    borderRadius: "999px",
    padding: "4px 12px",
    fontSize: "12px",
    fontWeight: 600,
    marginBottom: "10px"
  },
  title: {
    margin: "0 0 6px",
    fontSize: "26px",
    fontWeight: 700
  },
  subtitle: {
    margin: 0,
    color: "#cbd5e1",
    fontSize: "14px"
  },
  tabBar: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: "18px"
  },
  tabBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 16px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    backgroundColor: "#ffffff",
    color: "#334155",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer"
  },
  activeTabCreate: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    borderColor: "#2563eb"
  },
  activeTabManage: {
    backgroundColor: "#d97706",
    color: "#ffffff",
    borderColor: "#d97706"
  },
  activeTabResults: {
    backgroundColor: "#059669",
    color: "#ffffff",
    borderColor: "#059669"
  },
  panel: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    padding: "24px",
    boxShadow: "0 4px 14px rgba(15, 23, 42, 0.04)"
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "18px",
    paddingBottom: "12px",
    borderBottom: "1px solid #f1f5f9"
  },
  sectionTitle: {
    margin: 0,
    fontSize: "19px",
    fontWeight: 700,
    color: "#0f172a"
  },
  helperText: {
    fontSize: "13px",
    color: "#64748b"
  },
  modeSwitchRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: "14px"
  },
  modeBtn: {
    padding: "8px 14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#f8fafc",
    color: "#334155",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer"
  },
  modeBtnActive: {
    backgroundColor: "#0f172a",
    color: "#ffffff",
    borderColor: "#0f172a"
  },
  quickFilterRow: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: "16px"
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px"
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginBottom: "10px"
  },
  label: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#334155"
  },
  input: {
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    color: "#0f172a",
    backgroundColor: "#ffffff",
    outline: "none",
    width: "100%",
    boxSizing: "border-box"
  },
  questionsToolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "18px",
    marginBottom: "12px"
  },
  subHeading: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 700
  },
  questionCard: {
    border: "1px solid #e2e8f0",
    backgroundColor: "#f8fafc",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "14px"
  },
  questionTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px"
  },
  qBadge: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#1d4ed8",
    backgroundColor: "#dbeafe",
    padding: "4px 10px",
    borderRadius: "999px"
  },
  optionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "10px",
    marginTop: "10px"
  },
  publishBtn: {
    marginTop: "14px",
    width: "100%",
    padding: "13px 18px",
    borderRadius: "12px",
    border: "none",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: "15px",
    cursor: "pointer"
  },
  filterBar: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: "18px",
    alignItems: "center"
  },
  filterInput: {
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    backgroundColor: "#ffffff",
    minWidth: "150px"
  },
  primaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    padding: "10px 15px",
    borderRadius: "10px",
    border: "none",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer"
  },
  scheduleBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #f59e0b",
    backgroundColor: "#fffbeb",
    color: "#b45309",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer"
  },
  darkBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 12px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#0f172a",
    color: "#ffffff",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer"
  },
  saveBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "9px 14px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#059669",
    color: "#ffffff",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer"
  },
  dangerBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 12px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#dc2626",
    color: "#ffffff",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer"
  },
  iconDangerBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "6px 10px",
    borderRadius: "8px",
    border: "1px solid #fecaca",
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    fontWeight: 600,
    fontSize: "12px",
    cursor: "pointer"
  },
  secondaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "9px 14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#334155",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer"
  },
  quizCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "18px",
    marginBottom: "14px",
    backgroundColor: "#ffffff"
  },
  quizCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "14px"
  },
  quizTitle: {
    margin: 0,
    fontSize: "17px",
    fontWeight: 700,
    color: "#0f172a"
  },
  idTag: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#1e40af",
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    padding: "2px 8px",
    borderRadius: "6px"
  },
  statusBadge: {
    fontSize: "12px",
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: "999px",
    border: "1px solid"
  },
  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    fontSize: "13px",
    color: "#475569",
    marginTop: "8px"
  },
  scheduleMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: "16px",
    fontSize: "12px",
    color: "#334155",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "8px 12px",
    marginTop: "10px"
  },
  actionGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px"
  },
  inlineEditor: {
    marginTop: "16px",
    paddingTop: "16px",
    borderTop: "1px dashed #cbd5e1"
  },
  inlineQuestionBox: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "14px",
    marginBottom: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  resultGroup: {
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    marginBottom: "18px",
    overflow: "hidden"
  },
  resultHeader: {
    backgroundColor: "#f8fafc",
    padding: "12px 16px",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px"
  },
  resultSubMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: "14px",
    fontSize: "12px",
    color: "#475569",
    marginTop: "4px"
  },
  countChip: {
    backgroundColor: "#e0f2fe",
    color: "#0369a1",
    fontWeight: 700,
    fontSize: "12px",
    padding: "4px 10px",
    borderRadius: "999px"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px"
  },
  tableHeadRow: {
    backgroundColor: "#f1f5f9",
    textAlign: "left"
  },
  th: {
    padding: "10px 14px",
    fontWeight: 700,
    color: "#334155",
    borderBottom: "1px solid #e2e8f0"
  },
  tableRow: {
    borderBottom: "1px solid #f1f5f9"
  },
  td: {
    padding: "10px 14px",
    color: "#0f172a"
  },
  renewBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 11px",
    borderRadius: "8px",
    border: "1px solid #93c5fd",
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    fontWeight: 600,
    fontSize: "12px",
    cursor: "pointer"
  },
  emptyState: {
    textAlign: "center",
    padding: "32px 16px",
    color: "#64748b",
    backgroundColor: "#f8fafc",
    borderRadius: "12px",
    border: "1px dashed #cbd5e1"
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    zIndex: 1000
  },
  modalCard: {
    width: "100%",
    maxWidth: "480px",
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 20px 40px rgba(15, 23, 42, 0.25)"
  },
  modalHeader: {
    padding: "16px 20px",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px"
  },
  closeBtn: {
    border: "none",
    backgroundColor: "#f1f5f9",
    color: "#334155",
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer"
  },
  modalBody: {
    padding: "18px 20px"
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "14px"
  }
};

export default AdminQuizPage;