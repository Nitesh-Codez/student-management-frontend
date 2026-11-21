import React, { useState, useEffect } from "react";
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
  const streams = ["None", "PCM", "PCB", "Arts", "Commerce", "Chemistry,Maths", "Hindi English"];

  const [activeTab, setActiveTab] = useState("create");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({});
  const [quizzes, setQuizzes] = useState([]);

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
    } catch (e) {
      return [];
    }
  };

  // Convert DB timestamp to datetime-local input format (YYYY-MM-DDTHH:mm)
  const toDateTimeLocal = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const offsetMs = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
  };

  // Format date & time cleanly for display
  const formatDateTime = (value) => {
    if (!value) return "Not set";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Determine quiz schedule badge
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
      setQuizzes(res.data || []);
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
      alert("Update failed");
    } finally {
      setLoading(false);
    }
  };

  // 3b. Edit Schedule & Timer -> PUT /api/quiz/admin/edit-quiz/:quizId
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
    } catch (err) {
      alert("Error creating quiz");
    } finally {
      setLoading(false);
    }
  };

  // 5. Fetch Results & Map quiz_id if needed
  const fetchResults = async (className, session, stream) => {
    if (!className || !session) return alert("Select filters first!");
    setLoading(true);
    try {
      const [res, quizListRes] = await Promise.all([
        api.get(`/api/quiz/admin/results/${className}`, {
          params: { session, stream }
        }),
        api.get(`/api/quiz/class/${className}`, {
          params: { session, stream }
        }).catch(() => ({ data: [] }))
      ]);

      const quizMap = new Map();
      (quizListRes.data || []).forEach((item) => {
        if (item.title && item.id) {
          quizMap.set(item.title.trim().toLowerCase(), item.id);
        }
      });

      const grouped = (res.data || []).reduce((acc, curr) => {
        const key = curr.quiz_title || "Untitled Quiz";
        if (!acc[key]) acc[key] = [];
        acc[key].push({
          ...curr,
          resolved_quiz_id:
            curr.quiz_id ??
            curr.quizId ??
            quizMap.get(key.trim().toLowerCase()) ??
            null,
          resolved_student_id: curr.student_id ?? curr.studentId ?? null
        });
        return acc;
      }, {});

      setResults(grouped);
    } catch (err) {
      alert("Error fetching results");
    } finally {
      setLoading(false);
    }
  };

  // 6. Renew Student Quiz Attempt -> DELETE /api/quiz/admin/renew-quiz/:quizId/:studentId
  const handleRenewStudentAttempt = async (quizId, studentId, studentName, quizTitle) => {
    if (!quizId || !studentId) {
      return alert("student_id or quiz_id missing. Add qr.student_id and qr.quiz_id in getAdminResults SELECT.");
    }
    const confirmed = window.confirm(
      `Renew "${quizTitle}" for ${studentName || `Student #${studentId}`}? Previous attempt will be deleted.`
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      await api.delete(`/api/quiz/admin/renew-quiz/${quizId}/${studentId}`);
      alert(`Attempt renewed for ${studentName || `Student #${studentId}`}.`);
      fetchResults(selectedClass, selectedSession, selectedStream);
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to renew student attempt");
    } finally {
      setLoading(false);
    }
  };

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
            Schedule quiz windows (`start_at` / `end_at`), edit questions & timers, and renew student attempts.
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
            <FaCalendarAlt /> Manage & Schedule
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("results")}
            style={{
              ...styles.tabBtn,
              ...(activeTab === "results" ? styles.activeTabResults : {})
            }}
          >
            <FaCheckCircle /> Results & Renew
          </button>
        </div>

        {/* CREATE TAB */}
        {activeTab === "create" && (
          <div style={styles.panel}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>Create New Quiz</h3>
              <span style={styles.helperText}>Optional start & end timestamps control quiz availability.</span>
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
              <h3 style={styles.sectionTitle}>Manage Quizzes & Schedule</h3>
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

              return (
                <div key={q.id} style={styles.quizCard}>
                  <div style={styles.quizCardTop}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <h4 style={styles.quizTitle}>{q.title}</h4>
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
              <h3 style={styles.sectionTitle}>Quiz Reports & Attempt Renewal</h3>
              <span style={styles.helperText}>Includes IST attempt timestamps and one-click attempt renewal.</span>
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
                style={styles.saveBtn}
                onClick={() => fetchResults(selectedClass, selectedSession, selectedStream)}
                disabled={loading}
              >
                {loading ? "Loading..." : "Get Reports"}
              </button>
            </div>

            {Object.keys(results).length === 0 && (
              <div style={styles.emptyState}>
                Select Session and Class, then click Get Reports to view student results.
              </div>
            )}

            {Object.keys(results).map((quizTitle) => {
              const rows = results[quizTitle];
              const sample = rows[0] || {};

              return (
                <div key={quizTitle} style={styles.resultGroup}>
                  <div style={styles.resultHeader}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>Quiz: {quizTitle}</div>
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
                          <th style={styles.th}>Student Name</th>
                          <th style={styles.th}>Score</th>
                          <th style={styles.th}>Grade</th>
                          <th style={styles.th}>Attempted At</th>
                          <th style={styles.th}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => {
                          const attemptValue = r.attempted_at || r.formatted_date;
                          return (
                            <tr key={r.result_id ?? i} style={styles.tableRow}>
                              <td style={styles.td}>{r.student_name}</td>
                              <td style={styles.td}>
                                {r.score}/{r.total_marks}
                              </td>
                              <td
                                style={{
                                  ...styles.td,
                                  color: Number(r.percentage) < 40 ? "#dc2626" : "#15803d",
                                  fontWeight: 700
                                }}
                              >
                                {r.grade} ({r.percentage}%)
                              </td>
                              <td style={styles.td}>
                                {attemptValue ? formatDateTime(attemptValue) : "—"}
                              </td>
                              <td style={styles.td}>
                                <button
                                  type="button"
                                  style={styles.renewBtn}
                                  onClick={() =>
                                    handleRenewStudentAttempt(
                                      r.resolved_quiz_id,
                                      r.resolved_student_id,
                                      r.student_name,
                                      quizTitle
                                    )
                                  }
                                >
                                  <FaRedo /> Renew
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

      {/* SCHEDULE & TIMER EDIT MODAL */}
      {scheduleModalQuiz && (
        <div style={styles.modalBackdrop} onClick={() => setScheduleModalQuiz(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={{ margin: 0, color: "#0f172a" }}>Edit Quiz Schedule</h3>
                <small style={{ color: "#64748b" }}>{scheduleModalQuiz.title}</small>
              </div>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setScheduleModalQuiz(null)}
                style={styles.closeBtn}
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} style={{ marginTop: "16px" }}>
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

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Created At</label>
                <input
                  type="datetime-local"
                  style={styles.input}
                  value={scheduleForm.created_at}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, created_at: e.target.value })}
                />
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setScheduleModalQuiz(null)}
                  style={styles.secondaryBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.saveBtn}
                  disabled={loading}
                >
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
    color: "#0f172a",
    padding: "28px 16px",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  shell: {
    maxWidth: "1200px",
    margin: "0 auto"
  },
  headerCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "22px 26px",
    marginBottom: "18px",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)"
  },
  badgePill: {
    display: "inline-block",
    fontSize: "12px",
    fontWeight: 600,
    color: "#1d4ed8",
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    padding: "4px 10px",
    borderRadius: "999px",
    marginBottom: "8px"
  },
  title: {
    margin: "0 0 6px 0",
    fontSize: "25px",
    fontWeight: 700,
    color: "#0f172a"
  },
  subtitle: {
    margin: 0,
    fontSize: "14px",
    color: "#475569"
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
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#334155",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer"
  },
  activeTabCreate: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
    color: "#ffffff"
  },
  activeTabManage: {
    backgroundColor: "#4f46e5",
    borderColor: "#4f46e5",
    color: "#ffffff"
  },
  activeTabResults: {
    backgroundColor: "#059669",
    borderColor: "#059669",
    color: "#ffffff"
  },
  panel: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "24px",
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)"
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: "8px",
    paddingBottom: "14px",
    marginBottom: "20px",
    borderBottom: "1px solid #e2e8f0"
  },
  sectionTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 700,
    color: "#0f172a"
  },
  helperText: {
    fontSize: "13px",
    color: "#64748b"
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "22px"
  },
  filterBar: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    alignItems: "center",
    marginBottom: "20px",
    padding: "14px",
    backgroundColor: "#f8fafc",
    borderRadius: "10px",
    border: "1px solid #e2e8f0"
  },
  filterInput: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    fontSize: "14px",
    minWidth: "180px"
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
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    fontSize: "14px",
    boxSizing: "border-box"
  },
  questionsToolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "14px"
  },
  subHeading: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 700,
    color: "#0f172a"
  },
  questionCard: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "18px",
    marginBottom: "14px"
  },
  questionTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px"
  },
  qBadge: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#1e293b",
    backgroundColor: "#e2e8f0",
    padding: "4px 10px",
    borderRadius: "6px"
  },
  optionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "10px",
    marginTop: "10px"
  },
  quizCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
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
    fontSize: "12.5px",
    color: "#334155",
    backgroundColor: "#f8fafc",
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    marginTop: "10px"
  },
  actionGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px"
  },
  primaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    padding: "10px 16px",
    borderRadius: "8px",
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
    gap: "7px",
    padding: "8px 13px",
    borderRadius: "8px",
    border: "1px solid #c7d2fe",
    backgroundColor: "#eef2ff",
    color: "#3730a3",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer"
  },
  darkBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    padding: "8px 13px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#1e293b",
    color: "#ffffff",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer"
  },
  saveBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    padding: "9px 15px",
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
    gap: "7px",
    padding: "8px 13px",
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
    borderRadius: "6px",
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
    backgroundColor: "#f1f5f9",
    color: "#334155",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer"
  },
  renewBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    borderRadius: "7px",
    border: "1px solid #fde68a",
    backgroundColor: "#fffbeb",
    color: "#b45309",
    fontWeight: 600,
    fontSize: "12.5px",
    cursor: "pointer"
  },
  publishBtn: {
    width: "100%",
    padding: "14px",
    borderRadius: "10px",
    border: "none",
    backgroundColor: "#059669",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: "15px",
    marginTop: "18px",
    cursor: "pointer"
  },
  inlineEditor: {
    marginTop: "18px",
    paddingTop: "16px",
    borderTop: "1px solid #e2e8f0"
  },
  inlineQuestionBox: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "14px",
    marginBottom: "12px"
  },
  emptyState: {
    textAlign: "center",
    padding: "30px 16px",
    color: "#64748b",
    backgroundColor: "#f8fafc",
    borderRadius: "10px",
    border: "1px dashed #cbd5e1",
    fontSize: "14px"
  },
  resultGroup: {
    marginTop: "18px",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    overflow: "hidden",
    backgroundColor: "#ffffff"
  },
  resultHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px",
    padding: "12px 16px",
    backgroundColor: "#f1f5f9",
    borderBottom: "1px solid #e2e8f0"
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
    fontSize: "12px",
    fontWeight: 600,
    backgroundColor: "#ffffff",
    color: "#334155",
    padding: "3px 10px",
    borderRadius: "999px",
    border: "1px solid #cbd5e1"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse"
  },
  tableHeadRow: {
    backgroundColor: "#f8fafc",
    borderBottom: "1px solid #e2e8f0"
  },
  th: {
    padding: "12px 16px",
    textAlign: "left",
    fontSize: "12px",
    fontWeight: 700,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.03em"
  },
  tableRow: {
    borderBottom: "1px solid #f1f5f9"
  },
  td: {
    padding: "13px 16px",
    fontSize: "14px",
    color: "#1e293b"
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    zIndex: 1000
  },
  modalCard: {
    width: "100%",
    maxWidth: "460px",
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    padding: "22px",
    boxShadow: "0 20px 25px -5px rgba(15, 23, 42, 0.15)",
    border: "1px solid #e2e8f0"
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: "12px",
    borderBottom: "1px solid #e2e8f0"
  },
  closeBtn: {
    border: "none",
    background: "transparent",
    color: "#64748b",
    fontSize: "16px",
    cursor: "pointer",
    padding: "4px"
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "18px",
    paddingTop: "14px",
    borderTop: "1px solid #e2e8f0"
  }
};

export default AdminQuizPage;