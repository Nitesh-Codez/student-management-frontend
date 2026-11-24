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
  FaCheckCircle,
  FaFilter,
  FaFileAlt,
  FaFilePdf,
  FaPrint,
  FaEye
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

  // Tabs: "create" | "edit" | "results" | "filter" | "report"
  const [activeTab, setActiveTab] = useState("create");
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [results, setResults] = useState({});
  const [quizzes, setQuizzes] = useState([]);

  // Shared "By Class" | "By Quiz Name (All Classes)" mode across tabs
  const [lookupMode, setLookupMode] = useState("class");
  const [quizNameQuery, setQuizNameQuery] = useState("");
  const [selectedQuizTitleFilter, setSelectedQuizTitleFilter] = useState("ALL");

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSession, setSelectedSession] = useState("2026-27");
  const [selectedStream, setSelectedStream] = useState("");

  // Date-wise Filter & Report states
  const [filterDate, setFilterDate] = useState(() => {
    const now = new Date();
    return now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  });
  const [filteredQuizzes, setFilteredQuizzes] = useState([]);
  const [filteredAttempts, setFilteredAttempts] = useState([]);
  const [classRoster, setClassRoster] = useState([]);
  const [reportTotalMarks, setReportTotalMarks] = useState(10);
  const [reportSubjectFilter, setReportSubjectFilter] = useState("ALL");

  // Student breakdown modal state
  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);

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

  const showToast = (msg) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(""), 3500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const safeParse = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    try {
      return typeof data === "string" ? JSON.parse(data) : data;
    } catch {
      return [];
    }
  };

  const parseTimestampMs = (value) => {
    if (!value) return null;
    if (value instanceof Date) {
      const t = value.getTime();
      return Number.isNaN(t) ? null : t;
    }
    const str = String(value).trim();
    if (!str) return null;

    const isoNoTz = /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;
    const normalized = isoNoTz.test(str) ? `${str.replace(" ", "T")}Z` : str;
    const ms = new Date(normalized).getTime();
    return Number.isNaN(ms) ? null : ms;
  };

  const toDateTimeLocalIST = (value) => {
    const ms = parseTimestampMs(value);
    if (ms === null) return "";
    const d = new Date(ms);
    const parts = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).formatToParts(d);

    const map = {};
    parts.forEach((p) => {
      map[p.type] = p.value;
    });
    return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
  };

  const istLocalInputToIso = (localVal) => {
    if (!localVal) return null;
    const [datePart, timePart] = localVal.split("T");
    if (!datePart || !timePart) return new Date(localVal).toISOString();
    const [y, m, d] = datePart.split("-").map(Number);
    const [hh, mm] = timePart.split(":").map(Number);
    const utcMs = Date.UTC(y, m - 1, d, hh - 5, mm - 30, 0, 0);
    return new Date(utcMs).toISOString();
  };

  const formatDateTimeIST = (value) => {
    const ms = parseTimestampMs(value);
    if (ms === null) return "Not set";
    return new Date(ms).toLocaleString("en-IN", {
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
    const now = Date.now();
    const startMs = parseTimestampMs(q.start_at);
    const endMs = parseTimestampMs(q.end_at);

    if (startMs !== null && now < startMs) {
      return { label: "Scheduled", bg: "#f0f9ff", color: "#0369a1" };
    }
    if (endMs !== null && now > endMs) {
      return { label: "Closed", bg: "#f1f5f9", color: "#475569" };
    }
    if (startMs !== null || endMs !== null) {
      return { label: "Live Window", bg: "#dcfce7", color: "#15803d" };
    }
    return { label: "Always Open", bg: "#ecfdf5", color: "#047857" };
  };

  const getIstFilterStartMs = (dateStr) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split("-").map(Number);
    if (!y || !m || !d) return null;
    return Date.UTC(y, m - 1, d, -5, -30, 0, 0);
  };

  const getQuizEffectiveDateMs = (q) => {
    return (
      parseTimestampMs(q.start_at) ??
      parseTimestampMs(q.created_at) ??
      parseTimestampMs(q.updated_at)
    );
  };

  const getGradeFromPercent = (pct) => {
    if (pct >= 90) return { grade: "A+", bg: "#dcfce7", color: "#15803d" };
    if (pct >= 80) return { grade: "A", bg: "#ecfdf5", color: "#047857" };
    if (pct >= 70) return { grade: "B", bg: "#f0f9ff", color: "#0369a1" };
    if (pct >= 55) return { grade: "C", bg: "#f0fdf4", color: "#166534" };
    if (pct >= 40) return { grade: "D", bg: "#fff7ed", color: "#c2410c" };
    return { grade: "F", bg: "#f1f5f9", color: "#475569" };
  };

  const parseScoreDetail = (row, fallbackTotalQuestions = 1) => {
    const fallbackQ = Math.max(Number(fallbackTotalQuestions) || 1, 1);

    if (typeof row.score === "string" && row.score.includes("/")) {
      const [cStr, tStr] = row.score.split("/");
      const c = Number(cStr);
      const t = Number(tStr);
      const totalQ = Number.isFinite(t) && t > 0 ? t : fallbackQ;
      const correct = Number.isFinite(c) ? Math.max(0, c) : 0;
      return {
        correct,
        totalQuestions: totalQ,
        formattedFraction: `${correct} / ${totalQ}`
      };
    }

    const correct = Number(row.score ?? row.marks ?? row.correct_answers ?? 0) || 0;
    const explicitTotal =
      Number(
        row.total_questions ??
          row.total_marks ??
          row.max_score ??
          row.total ??
          0
      ) || 0;
    const totalQ = explicitTotal > 0 ? explicitTotal : fallbackQ;

    return {
      correct,
      totalQuestions: totalQ,
      formattedFraction: `${correct} / ${totalQ}`
    };
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
      showToast("Quiz deleted");
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
      showToast("Questions updated");
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
      created_at: toDateTimeLocalIST(q.created_at),
      start_at: toDateTimeLocalIST(q.start_at),
      end_at: toDateTimeLocalIST(q.end_at),
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
        created_at: istLocalInputToIso(scheduleForm.created_at),
        start_at: istLocalInputToIso(scheduleForm.start_at),
        end_at: istLocalInputToIso(scheduleForm.end_at),
        timer_minutes: Number(scheduleForm.timer_minutes) || 10
      };

      await api.put(`/api/quiz/admin/edit-quiz/${scheduleModalQuiz.id}`, payload);
      showToast("Schedule & timer updated");
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
        start_at: istLocalInputToIso(quiz.start_at),
        end_at: istLocalInputToIso(quiz.end_at)
      };

      await api.post(`/api/quiz/create`, payload);
      showToast("Quiz published");
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

  // 6. Date-Wise Filter & Report Data Loader (supports single class or quiz name across all classes)
  const fetchFilteredDateData = async (className, session, stream, dateStr) => {
    if (!session) return alert("Select Session first!");
    if (lookupMode === "class" && !className) {
      return alert("Select Class first!");
    }
    const cutoffMs = getIstFilterStartMs(dateStr);
    if (cutoffMs === null) return alert("Please select a valid Filter Date!");

    setLoading(true);
    try {
      const targetClasses =
        lookupMode === "quizNameAllClasses" ? Object.keys(subjectsByClass) : [className];
      const needle = (quizNameQuery || "").trim().toLowerCase();

      const perClassBundles = await Promise.all(
        targetClasses.map(async (cls) => {
          const quizParams = lookupMode === "quizNameAllClasses" ? { session } : { session, stream };
          const resParams = lookupMode === "quizNameAllClasses" ? { session } : { session, stream };

          const [quizRes, resultsRes, allClassResultsRes, studentsRes] = await Promise.all([
            api.get(`/api/quiz/class/${cls}`, { params: quizParams }).catch(() => ({ data: [] })),
            api.get(`/api/quiz/admin/results/${cls}`, { params: resParams }).catch(() => ({ data: [] })),
            api.get(`/api/quiz/admin/results/${cls}`, { params: { session } }).catch(() => ({ data: [] })),
            api.get(`/api/students/class/${cls}`, { params: quizParams }).catch(() => ({ data: [] }))
          ]);

          const rawQuizzes = Array.isArray(quizRes.data) ? quizRes.data : quizRes.data?.quizzes || [];
          const rawResults = Array.isArray(resultsRes.data)
            ? resultsRes.data
            : resultsRes.data?.results || [];
          const rawClassResults = Array.isArray(allClassResultsRes.data)
            ? allClassResultsRes.data
            : allClassResultsRes.data?.results || [];
          const rawStudents = Array.isArray(studentsRes.data)
            ? studentsRes.data
            : studentsRes.data?.students || [];

          return { cls, rawQuizzes, rawResults, rawClassResults, rawStudents };
        })
      );

      const quizzesAfterDate = [];
      const allowedQuizIds = new Set();
      const allowedQuizTitles = new Set();
      const quizMetaById = new Map();
      const quizMetaByTitle = new Map();

      perClassBundles.forEach(({ cls, rawQuizzes }) => {
        rawQuizzes.forEach((q) => {
          const matchesName =
            lookupMode !== "quizNameAllClasses" ||
            !needle ||
            String(q.title || "").toLowerCase().includes(needle);
          if (!matchesName) return;

          const qMs = getQuizEffectiveDateMs(q);
          if (qMs !== null && qMs >= cutoffMs) {
            const qWithClass = { ...q, class_name: q.class_name || q.class || cls };
            quizzesAfterDate.push(qWithClass);

            const qId = q.quiz_id ?? q.id;
            const qList = safeParse(q.questions);
            const meta = {
              id: qId,
              title: q.title || "Untitled Quiz",
              className: qWithClass.class_name,
              subject: q.subject || q.subject_name || "General",
              totalQuestions: qList.length || Number(q.total_questions) || 1
            };

            if (qId !== undefined && qId !== null) {
              allowedQuizIds.add(String(qId));
              quizMetaById.set(String(qId), meta);
            }
            if (q.title) {
              const tKey = String(q.title).trim().toLowerCase();
              allowedQuizTitles.add(tKey);
              quizMetaByTitle.set(tKey, meta);
            }
          }
        });
      });

      const uniqueAttemptMap = new Map();
      const rosterMap = new Map();

      perClassBundles.forEach(({ cls, rawResults, rawClassResults, rawStudents }) => {
        const normalizedResults = normalizeResultRows(rawResults, new Map(), cls);

        const attemptsAfterDate = normalizedResults.filter((row) => {
          const matchesName =
            lookupMode !== "quizNameAllClasses" ||
            !needle ||
            String(row.quiz_title || "").toLowerCase().includes(needle);
          if (!matchesName) return false;

          const rowQuizId = row.resolved_quiz_id != null ? String(row.resolved_quiz_id) : "";
          const rowTitleKey = String(row.quiz_title || "").trim().toLowerCase();
          return (
            (rowQuizId && allowedQuizIds.has(rowQuizId)) ||
            (rowTitleKey && allowedQuizTitles.has(rowTitleKey))
          );
        });

        attemptsAfterDate.forEach((row, idx) => {
          const rowQuizId = row.resolved_quiz_id != null ? String(row.resolved_quiz_id) : "";
          const rowTitleKey = String(row.quiz_title || "").trim().toLowerCase();
          const meta = quizMetaById.get(rowQuizId) || quizMetaByTitle.get(rowTitleKey);
          const quizKey = meta?.id != null ? `id:${meta.id}` : `title:${rowTitleKey}`;

          const studentIdKey =
            row.resolved_student_id != null
              ? `id:${row.resolved_student_id}`
              : `name:${String(row.student_name || `student_${idx}`).trim().toLowerCase()}`;

          const dedupKey = `${studentIdKey}__${quizKey}`;
          const parsed = parseScoreDetail(row, meta?.totalQuestions || 1);
          const ratio =
            parsed.totalQuestions > 0
              ? Math.min(Math.max(parsed.correct / parsed.totalQuestions, 0), 1)
              : 0;
          const pct = Number((ratio * 100).toFixed(1));
          const gradeObj = getGradeFromPercent(pct);

          const enriched = {
            ...row,
            class_name: row.class_name || meta?.className || cls,
            subject: row.subject || row.subject_name || meta?.subject || "General",
            quiz_title: meta?.title || row.quiz_title,
            matched_quiz_key: quizKey,
            student_key: studentIdKey,
            student_name: row.student_name || `Student #${row.resolved_student_id || idx + 1}`,
            roll_no: row.roll_no || row.enrollment_no || row.admission_no || "—",
            correct_count: parsed.correct,
            total_questions_count: parsed.totalQuestions,
            score_fraction: parsed.formattedFraction,
            accuracy_ratio: ratio,
            percentage: pct,
            grade: gradeObj.grade,
            grade_bg: gradeObj.bg,
            grade_color: gradeObj.color
          };

          const existing = uniqueAttemptMap.get(dedupKey);
          if (!existing || enriched.accuracy_ratio > existing.accuracy_ratio) {
            uniqueAttemptMap.set(dedupKey, enriched);
          }
        });

        const normalizedAllClassResults = normalizeResultRows(rawClassResults, new Map(), cls);
        normalizedAllClassResults.forEach((r, idx) => {
          const sKey =
            r.resolved_student_id != null
              ? `id:${r.resolved_student_id}`
              : `name:${String(r.student_name || `student_${idx}`).trim().toLowerCase()}`;
          if (!rosterMap.has(sKey)) {
            rosterMap.set(sKey, {
              studentKey: sKey,
              studentId: r.resolved_student_id,
              studentName: r.student_name || `Student #${r.resolved_student_id || idx + 1}`,
              rollNo: r.roll_no || r.enrollment_no || r.admission_no || "—"
            });
          }
        });

        rawStudents.forEach((st, idx) => {
          const sId = st.student_id ?? st.id ?? st.user_id ?? null;
          const sName = st.student_name || st.name || st.full_name || `Student #${sId || idx + 1}`;
          const sKey = sId != null ? `id:${sId}` : `name:${sName.trim().toLowerCase()}_${idx}`;
          if (!rosterMap.has(sKey)) {
            rosterMap.set(sKey, {
              studentKey: sKey,
              studentId: sId,
              studentName: sName,
              rollNo: st.roll_no || st.enrollment_no || st.admission_no || "—"
            });
          }
        });
      });

      Array.from(uniqueAttemptMap.values()).forEach((att) => {
        if (!rosterMap.has(att.student_key)) {
          rosterMap.set(att.student_key, {
            studentKey: att.student_key,
            studentId: att.resolved_student_id,
            studentName: att.student_name,
            rollNo: att.roll_no
          });
        }
      });

      setFilteredQuizzes(quizzesAfterDate);
      setFilteredAttempts(Array.from(uniqueAttemptMap.values()));
      setClassRoster(Array.from(rosterMap.values()));
      setReportSubjectFilter("ALL");
    } catch {
      alert("Error filtering quizzes and attempts by date");
    } finally {
      setLoading(false);
    }
  };

  const reportSubjects = useMemo(() => {
    const set = new Set();
    filteredQuizzes.forEach((q) => {
      const subj = q.subject || q.subject_name;
      if (subj) set.add(subj);
    });
    return Array.from(set);
  }, [filteredQuizzes]);

  const computedReportRows = useMemo(() => {
    const maxMarks = Math.max(Number(reportTotalMarks) || 0, 0);

    const scopedQuizzes =
      reportSubjectFilter === "ALL"
        ? filteredQuizzes
        : filteredQuizzes.filter(
            (q) => (q.subject || q.subject_name || "General") === reportSubjectFilter
          );

    const scopedQuizKeys = new Set(
      scopedQuizzes.map((q) => {
        const qId = q.quiz_id ?? q.id;
        return qId != null
          ? `id:${qId}`
          : `title:${String(q.title || "").trim().toLowerCase()}`;
      })
    );

    const scopedAttempts = filteredAttempts.filter((att) =>
      scopedQuizKeys.has(att.matched_quiz_key)
    );

    const totalQuizzesAfterDate = scopedQuizzes.length;

    const attemptsByStudent = new Map();
    scopedAttempts.forEach((att) => {
      if (!attemptsByStudent.has(att.student_key)) {
        attemptsByStudent.set(att.student_key, []);
      }
      attemptsByStudent.get(att.student_key).push(att);
    });

    const allStudentMeta = new Map();
    if (lookupMode === "class") {
      classRoster.forEach((st) => {
        allStudentMeta.set(st.studentKey, st);
      });
    }
    scopedAttempts.forEach((att) => {
      if (!allStudentMeta.has(att.student_key)) {
        allStudentMeta.set(att.student_key, {
          studentKey: att.student_key,
          studentId: att.resolved_student_id,
          studentName: att.student_name,
          rollNo: att.roll_no
        });
      }
    });

    const rows = Array.from(allStudentMeta.values()).map((st) => {
      const studentAttempts = attemptsByStudent.get(st.studentKey) || [];
      const playedCount = Math.min(studentAttempts.length, totalQuizzesAfterDate);

      const sumAccuracyRatio = studentAttempts.reduce(
        (acc, item) => acc + (item.accuracy_ratio || 0),
        0
      );
      const totalCorrect = studentAttempts.reduce(
        (acc, item) => acc + (item.correct_count || 0),
        0
      );
      const totalQuestionsSum = studentAttempts.reduce(
        (acc, item) => acc + (item.total_questions_count || 0),
        0
      );

      let calculatedMarks = 0;
      if (totalQuizzesAfterDate > 0) {
        calculatedMarks = (sumAccuracyRatio / totalQuizzesAfterDate) * maxMarks;
      }

      const roundedMarks = Number(
        Math.min(Math.max(calculatedMarks, 0), maxMarks).toFixed(2)
      );
      const avgPct =
        playedCount > 0
          ? Number(((sumAccuracyRatio / playedCount) * 100).toFixed(1))
          : 0;
      const gradeInfo = getGradeFromPercent(avgPct);

      return {
        ...st,
        playedCount,
        totalQuizzesAfterDate,
        totalCorrect,
        totalQuestionsSum,
        avgPercentage: avgPct,
        grade: gradeInfo.grade,
        gradeBg: gradeInfo.bg,
        gradeColor: gradeInfo.color,
        generatedMarks: roundedMarks,
        maxMarks,
        attemptsList: studentAttempts
      };
    });

    rows.sort((a, b) => {
      if (b.generatedMarks !== a.generatedMarks) return b.generatedMarks - a.generatedMarks;
      return a.studentName.localeCompare(b.studentName);
    });

    return {
      totalQuizzesAfterDate,
      maxMarks,
      rows
    };
  }, [
    filteredQuizzes,
    filteredAttempts,
    classRoster,
    reportTotalMarks,
    reportSubjectFilter,
    lookupMode
  ]);

  const handlePrintReport = () => {
    window.print();
  };

  // Structured, colourful vector PDF generator with clean subtle dividers & auto-download
  const handleDownloadPdfReport = () => {
    const esc = (txt) =>
      String(txt ?? "")
        .replace(/[^\x20-\x7E]/g, "-")
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");

    const scopeLabel =
      lookupMode === "quizNameAllClasses"
        ? `Quiz Name (${quizNameQuery.trim() || "All"}) - All Classes`
        : `Class ${selectedClass || "All"}`;

    const ops = [];

    // Soft sky-blue header banner (light tint, no dark blue fill)
    ops.push("0.937 0.965 1 rg"); // #eff6ff
    ops.push("36 722 540 48 re f");
    ops.push("0.749 0.859 0.996 RG"); // #bfdbfe soft border
    ops.push("1 w");
    ops.push("36 722 540 48 re S");

    ops.push("BT /F2 14.5 Tf 0.082 0.259 0.459 rg 48 747 Td");
    ops.push(`(${esc(`QUIZ MARKS REPORT - ${scopeLabel} (${selectedSession})`)}) Tj`);
    ops.push("/F1 9.5 Tf 0.278 0.333 0.412 rg 48 731 Td");
    ops.push(
      `(${esc(
        `After Date (IST): ${filterDate || "All"} | Subject: ${reportSubjectFilter} | Generated: ${new Date().toLocaleString(
          "en-IN",
          { timeZone: "Asia/Kolkata" }
        )}`
      )}) Tj ET`
    );

    // 3 Colourful Summary Cards (sky blue, mint green, warm orange tint)
    const cards = [
      {
        x: 36,
        w: 172,
        fill: "0.941 0.976 1", // #f0f9ff
        stroke: "0.729 0.902 0.992", // #bae6fd
        label: "QUIZZES AFTER DATE",
        val: String(computedReportRows.totalQuizzesAfterDate),
        valRgb: "0.012 0.412 0.631"
      },
      {
        x: 220,
        w: 172,
        fill: "0.863 0.988 0.906", // #dcfce7
        stroke: "0.525 0.937 0.675", // #86efac
        label: "TOTAL MARKS SCALE",
        val: String(computedReportRows.maxMarks),
        valRgb: "0.082 0.502 0.239"
      },
      {
        x: 404,
        w: 172,
        fill: "1 0.969 0.929", // #fff7ed
        stroke: "0.992 0.843 0.667", // #fed7aa
        label: "STUDENTS IN REPORT",
        val: String(computedReportRows.rows.length),
        valRgb: "0.761 0.255 0.047"
      }
    ];

    cards.forEach((c) => {
      ops.push(`${c.fill} rg ${c.x} 662 ${c.w} 48 re f`);
      ops.push(`${c.stroke} RG 1 w ${c.x} 662 ${c.w} 48 re S`);
      ops.push(`BT /F2 8 Tf 0.278 0.333 0.412 rg ${c.x + 10} 694 Td (${esc(c.label)}) Tj ET`);
      ops.push(`BT /F2 14 Tf ${c.valRgb} rg ${c.x + 10} 672 Td (${esc(c.val)}) Tj ET`);
    });

    // Included quizzes strip
    ops.push("0.941 0.992 0.957 rg 36 632 540 20 re f"); // #f0fdf4
    ops.push("0.733 0.969 0.812 RG 0.8 w 36 632 540 20 re S");
    ops.push(
      `BT /F2 9 Tf 0.082 0.502 0.239 rg 44 639 Td (${esc(
        `Quizzes On/After ${filterDate}: ${
          filteredQuizzes.length
            ? filteredQuizzes.map((q) => q.title).join(", ")
            : "None"
        }`
      )}) Tj ET`
    );

    // Table Header (light mint/sky header with crisp text)
    const cols = [
      { title: "#", x: 36, w: 32 },
      { title: "Student Name", x: 68, w: 172 },
      { title: "Played", x: 240, w: 72 },
      { title: "Score (R/T)", x: 312, w: 105 },
      { title: "Grade", x: 417, w: 54 },
      { title: `Marks (/${computedReportRows.maxMarks})`, x: 471, w: 105 }
    ];

    ops.push("0.937 0.965 1 rg 36 598 540 22 re f");
    ops.push("0.749 0.859 0.996 RG 0.8 w 36 598 540 22 re S");
    cols.forEach((col) => {
      ops.push(`BT /F2 9 Tf 0.082 0.259 0.459 rg ${col.x + 6} 606 Td (${esc(col.title)}) Tj ET`);
    });

    let rowY = 576;
    const rowH = 22;

    computedReportRows.rows.forEach((r, idx) => {
      if (rowY < 48) return;
      const bg = idx % 2 === 0 ? "1 1 1 rg" : "0.973 0.98 0.992 rg";
      ops.push(`${bg} 36 ${rowY} 540 ${rowH} re f`);
      ops.push("0.886 0.91 0.941 RG 0.6 w 36 " + rowY + " 540 " + rowH + " re S");

      cols.forEach((col) => {
        ops.push(`0.886 0.91 0.941 RG 0.5 w ${col.x} ${rowY} ${col.w} ${rowH} re S`);
      });

      const cells = [
        String(idx + 1),
        String(r.studentName || "").slice(0, 28),
        `${r.playedCount}/${r.totalQuizzesAfterDate}`,
        `${r.totalCorrect}/${r.totalQuestionsSum} (${r.avgPercentage}%)`,
        r.playedCount > 0 ? r.grade : "-",
        `${r.generatedMarks} / ${r.maxMarks}`
      ];

      cells.forEach((val, cIdx) => {
        const c = cols[cIdx];
        const font = cIdx === 1 || cIdx === 5 ? "/F2" : "/F1";
        const textColor =
          cIdx === 5
            ? "0.082 0.502 0.239 rg"
            : cIdx === 4
            ? "0.918 0.345 0.047 rg"
            : "0.118 0.161 0.231 rg";
        ops.push(`BT ${font} 9 Tf ${textColor} ${c.x + 6} ${rowY + 7} Td (${esc(val)}) Tj ET`);
      });

      rowY -= rowH;
    });

    const contentStream = ops.join("\n");

    const objects = [];
    objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
    objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
    objects.push(
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n"
    );
    objects.push(
      `4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`
    );
    objects.push("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");
    objects.push("6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n");

    let pdfStr = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((obj) => {
      offsets.push(pdfStr.length);
      pdfStr += obj;
    });

    const xrefStart = pdfStr.length;
    pdfStr += `xref\n0 ${objects.length + 1}\n`;
    pdfStr += "0000000000 65535 f \n";
    for (let i = 1; i <= objects.length; i++) {
      pdfStr += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }
    pdfStr += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    const blob = new Blob([pdfStr], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeTag =
      lookupMode === "quizNameAllClasses"
        ? (quizNameQuery.trim() || "All_Classes").replace(/[^a-zA-Z0-9_-]/g, "_")
        : (selectedClass || "Class").replace(/[^a-zA-Z0-9_-]/g, "_");
    link.href = url;
    link.download = `Quiz_Report_${safeTag}_${filterDate || "All"}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);

    showToast("PDF downloaded");
  };

  // 7. Renew Student Quiz Attempt -> DELETE /api/quiz/admin/renew-quiz/:quizId/:studentId
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
      showToast(`Attempt renewed for ${studentName || `Student #${studentId}`}`);
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
      if (e.key === "Escape") {
        if (scheduleModalQuiz) setScheduleModalQuiz(null);
        if (selectedStudentDetail) setSelectedStudentDetail(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [scheduleModalQuiz, selectedStudentDetail]);

  const renderModeSwitcher = () => (
    <div style={styles.modeToggleRow}>
      <button
        type="button"
        onClick={() => setLookupMode("class")}
        style={{
          ...styles.modeBtn,
          ...(lookupMode === "class" ? styles.modeBtnActive : {})
        }}
      >
        By Class
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
  );

  return (
    <div style={styles.page}>
      {toastMessage && (
        <div role="status" aria-live="polite" style={styles.toastBanner}>
          <FaCheckCircle style={{ color: "#15803d" }} />
          <span>{toastMessage}</span>
        </div>
      )}

      <div style={styles.shell}>
        {/* Top Navbar */}
        <header style={styles.navbar}>
          <div style={styles.navBrand}>
            <span style={styles.badgePill}>Admin Quiz Console</span>
            <div>
              <h1 style={styles.navTitle}>Quiz Administration Portal</h1>
              <p style={styles.navSubtitle}>
                Create &amp; schedule quizzes, view results &amp; grades, filter by date, and download marks reports.
              </p>
            </div>
          </div>

          <nav style={styles.navMenu} aria-label="Admin Quiz Navigation">
            <button
              type="button"
              onClick={() => setActiveTab("create")}
              style={{
                ...styles.navBtn,
                ...(activeTab === "create" ? styles.activeNavBlue : {})
              }}
            >
              <FaPlus /> Create Quiz
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("edit")}
              style={{
                ...styles.navBtn,
                ...(activeTab === "edit" ? styles.activeNavNeutral : {})
              }}
            >
              <FaCalendarAlt /> Manage &amp; Schedule
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("results")}
              style={{
                ...styles.navBtn,
                ...(activeTab === "results" ? styles.activeNavGreen : {})
              }}
            >
              <FaCheckCircle /> Results &amp; Renew
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("filter")}
              style={{
                ...styles.navBtn,
                ...(activeTab === "filter" ? styles.activeNavNeutral : {})
              }}
            >
              <FaFilter /> Filter
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("report")}
              style={{
                ...styles.navBtn,
                ...(activeTab === "report" ? styles.activeNavGreen : {})
              }}
            >
              <FaFileAlt /> Report
            </button>
          </nav>
        </header>

        {/* CREATE TAB */}
        {activeTab === "create" && (
          <div style={styles.panel}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>Create New Quiz</h3>
              <span style={styles.helperText}>Optional start &amp; end timestamps control quiz availability (IST).</span>
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
                <label style={styles.label}>Start At (IST)</label>
                <input
                  style={styles.input}
                  type="datetime-local"
                  value={quiz.start_at}
                  onChange={(e) => setQuiz({ ...quiz, start_at: e.target.value })}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>End At (IST)</label>
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
                    style={styles.softDangerBtn}
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
                            color: badge.color
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
                        <span><strong>Start (IST):</strong> {formatDateTimeIST(q.start_at)}</span>
                        <span><strong>End (IST):</strong> {formatDateTimeIST(q.end_at)}</span>
                        <span><strong>Created (IST):</strong> {formatDateTimeIST(q.created_at)}</span>
                      </div>
                    </div>

                    <div style={styles.actionGroup}>
                      <button
                        type="button"
                        onClick={() => openScheduleModal(q)}
                        style={styles.secondaryNeutralBtn}
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
                          style={styles.secondaryNeutralBtn}
                        >
                          <FaEdit /> Edit Questions
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteQuiz(q.id)}
                        style={styles.softDangerBtn}
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
                        style={styles.cancelBtn}
                        onClick={() => setEditingQuizId(null)}
                      >
                        <FaTimes /> Cancel Edit
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
              <h3 style={styles.sectionTitle}>Student Quiz Results &amp; Attempt Renewal</h3>
              <span style={styles.helperText}>
                Displays score (Right / Total Questions), percentage, grade, and IST attempt time.
              </span>
            </div>

            {renderModeSwitcher()}

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
                  style={styles.primaryBtn}
                  onClick={() => fetchResultsByClass(selectedClass, selectedSession, selectedStream)}
                  disabled={loading}
                >
                  <FaSearch /> {loading ? "Fetching..." : "Get Results"}
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
                  placeholder="Enter quiz name (leave blank for all quizzes across classes)..."
                  value={quizNameQuery}
                  onChange={(e) => setQuizNameQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      fetchResultsByQuizNameAllClasses(selectedSession, quizNameQuery);
                    }
                  }}
                />

                <button
                  type="button"
                  style={styles.primaryBtn}
                  onClick={() => fetchResultsByQuizNameAllClasses(selectedSession, quizNameQuery)}
                  disabled={loading}
                >
                  <FaSearch /> {loading ? "Searching All Classes..." : "Search All Classes"}
                </button>
              </div>
            )}

            {availableQuizTitles.length > 0 && (
              <div style={styles.subFilterRow}>
                <label style={styles.label}>Filter Loaded Quizzes:</label>
                <select
                  style={styles.filterInput}
                  value={selectedQuizTitleFilter}
                  onChange={(e) => setSelectedQuizTitleFilter(e.target.value)}
                >
                  <option value="ALL">All Matching Quizzes ({availableQuizTitles.length})</option>
                  {availableQuizTitles.map((t) => (
                    <option key={t} value={t}>
                      {t} ({results[t]?.length || 0})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {visibleResultEntries.length === 0 && (
              <div style={styles.emptyState}>
                No student quiz results loaded yet. Run a search above.
              </div>
            )}

            {visibleResultEntries.map(([quizTitle, rows]) => (
              <div key={quizTitle} style={styles.resultGroupCard}>
                <div style={styles.resultGroupHeader}>
                  <h4 style={styles.quizTitle}>{quizTitle}</h4>
                  <span style={styles.countPill}>{rows.length} Attempts</span>
                </div>

                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>#</th>
                        <th style={styles.th}>Student</th>
                        <th style={styles.th}>Class</th>
                        <th style={styles.th}>Score (Right / Total Q)</th>
                        <th style={styles.th}>Grade</th>
                        <th style={styles.th}>Attempted At (IST)</th>
                        <th style={styles.th}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, idx) => {
                        const qId = r.resolved_quiz_id;
                        const sId = r.resolved_student_id;
                        const studentLabel = r.student_name || `Student #${sId || idx + 1}`;
                        const detail = parseScoreDetail(r, 1);
                        const pct =
                          detail.totalQuestions > 0
                            ? Number(((detail.correct / detail.totalQuestions) * 100).toFixed(1))
                            : 0;
                        const gradeObj = getGradeFromPercent(pct);

                        return (
                          <tr key={r.id ?? `${quizTitle}-${idx}`} style={styles.tr}>
                            <td style={styles.td}>{idx + 1}</td>
                            <td style={styles.td}>
                              <div style={{ fontWeight: 700 }}>{studentLabel}</div>
                              {sId && <div style={styles.subIdText}>ID: {sId}</div>}
                            </td>
                            <td style={styles.td}>{r.class_name || selectedClass || "—"}</td>
                            <td style={styles.td}>
                              <span style={styles.scoreBadge}>{detail.formattedFraction}</span>
                              <span style={styles.pctText}> ({pct}%)</span>
                            </td>
                            <td style={styles.td}>
                              <span
                                style={{
                                  ...styles.gradeBadge,
                                  backgroundColor: gradeObj.bg,
                                  color: gradeObj.color
                                }}
                              >
                                {gradeObj.grade}
                              </span>
                            </td>
                            <td style={styles.td}>
                              {r.attempted_at ? formatDateTimeIST(r.attempted_at) : "—"}
                            </td>
                            <td style={styles.td}>
                              <button
                                type="button"
                                style={styles.renewBtn}
                                disabled={loading || !qId || !sId}
                                title={
                                  !qId || !sId
                                    ? "Missing quiz_id or student_id"
                                    : "Delete attempt & allow student to retake quiz"
                                }
                                onClick={() =>
                                  handleRenewStudentAttempt(qId, sId, studentLabel, quizTitle)
                                }
                              >
                                <FaRedo /> Renew Attempt
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FILTER TAB: Date-wise Quizzes & Who Played Them */}
        {activeTab === "filter" && (
          <div style={styles.panel}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>Date-Wise Quiz &amp; Player Filter</h3>
              <span style={styles.helperText}>
                Filter by Class or by Quiz Name across All Classes after the selected IST date.
              </span>
            </div>

            {renderModeSwitcher()}

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

              {lookupMode === "class" ? (
                <>
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
                </>
              ) : (
                <input
                  style={{ ...styles.filterInput, minWidth: "220px", flex: 1 }}
                  placeholder="Enter quiz name (optional for all quizzes)..."
                  value={quizNameQuery}
                  onChange={(e) => setQuizNameQuery(e.target.value)}
                />
              )}

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label style={styles.label}>After Date (IST):</label>
                <input
                  type="date"
                  style={styles.filterInput}
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
              </div>

              <button
                type="button"
                style={styles.primaryBtn}
                onClick={() =>
                  fetchFilteredDateData(selectedClass, selectedSession, selectedStream, filterDate)
                }
                disabled={loading}
              >
                <FaFilter /> {loading ? "Filtering..." : "Apply Date Filter"}
              </button>
            </div>

            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Scope</div>
                <div style={styles.statValue}>
                  {lookupMode === "quizNameAllClasses" ? "All Classes" : selectedClass || "—"}
                </div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Quizzes Held On/After {filterDate || "Date"}</div>
                <div style={styles.statValue}>{filteredQuizzes.length}</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Total Plays After Date</div>
                <div style={styles.statValue}>{filteredAttempts.length}</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Unique Students Played</div>
                <div style={styles.statValue}>
                  {new Set(filteredAttempts.map((a) => a.student_key)).size}
                </div>
              </div>
            </div>

            <div style={styles.resultGroupCard}>
              <div style={styles.resultGroupHeader}>
                <h4 style={styles.quizTitle}>
                  Quizzes On or After {filterDate || "Selected Date"}
                </h4>
                <span style={styles.countPill}>{filteredQuizzes.length} Quizzes</span>
              </div>

              {filteredQuizzes.length === 0 ? (
                <div style={styles.emptyState}>
                  No quizzes found on or after this date for the selected filter.
                </div>
              ) : (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>#</th>
                        <th style={styles.th}>Quiz Title</th>
                        <th style={styles.th}>Class</th>
                        <th style={styles.th}>Subject</th>
                        <th style={styles.th}>Quiz Date (IST)</th>
                        <th style={styles.th}>Players Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredQuizzes.map((q, i) => {
                        const qId = q.quiz_id ?? q.id;
                        const qKey =
                          qId != null
                            ? `id:${qId}`
                            : `title:${String(q.title || "").trim().toLowerCase()}`;
                        const playersForQuiz = filteredAttempts.filter(
                          (a) => a.matched_quiz_key === qKey
                        );

                        return (
                          <tr key={qKey || i} style={styles.tr}>
                            <td style={styles.td}>{i + 1}</td>
                            <td style={styles.td}><strong>{q.title}</strong></td>
                            <td style={styles.td}>{q.class_name || selectedClass || "—"}</td>
                            <td style={styles.td}>{q.subject || q.subject_name || "General"}</td>
                            <td style={styles.td}>
                              {formatDateTimeIST(q.start_at || q.created_at)}
                            </td>
                            <td style={styles.td}>
                              <span style={styles.countPill}>
                                {playersForQuiz.length} Student(s) Played
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={styles.resultGroupCard}>
              <div style={styles.resultGroupHeader}>
                <h4 style={styles.quizTitle}>
                  Who Played Quizzes After {filterDate || "Selected Date"}
                </h4>
                <span style={styles.countPill}>{filteredAttempts.length} Attempts</span>
              </div>

              {filteredAttempts.length === 0 ? (
                <div style={styles.emptyState}>
                  No student attempts recorded for quizzes on or after this date.
                </div>
              ) : (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>#</th>
                        <th style={styles.th}>Student Name</th>
                        <th style={styles.th}>Class</th>
                        <th style={styles.th}>Quiz Played</th>
                        <th style={styles.th}>Score (Right / Total Q)</th>
                        <th style={styles.th}>Grade</th>
                        <th style={styles.th}>Attempted At (IST)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAttempts.map((att, idx) => (
                        <tr key={att.id ?? `${att.student_key}-${att.matched_quiz_key}-${idx}`} style={styles.tr}>
                          <td style={styles.td}>{idx + 1}</td>
                          <td style={styles.td}><strong>{att.student_name}</strong></td>
                          <td style={styles.td}>{att.class_name || selectedClass || "—"}</td>
                          <td style={styles.td}>{att.quiz_title}</td>
                          <td style={styles.td}>
                            <span style={styles.scoreBadge}>{att.score_fraction}</span>
                            <span style={styles.pctText}> ({att.percentage}%)</span>
                          </td>
                          <td style={styles.td}>
                            <span
                              style={{
                                ...styles.gradeBadge,
                                backgroundColor: att.grade_bg,
                                color: att.grade_color
                              }}
                            >
                              {att.grade}
                            </span>
                          </td>
                          <td style={styles.td}>
                            {att.attempted_at ? formatDateTimeIST(att.attempted_at) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* REPORT TAB */}
        {activeTab === "report" && (
          <div style={styles.panel}>
            <div style={styles.sectionHeader}>
              <div>
                <h3 style={styles.sectionTitle}>Auto-Generated Marks Report</h3>
                <span style={styles.helperText}>
                  Switch between By Class and By Quiz Name (All Classes), set Total Marks, and download a structured PDF.
                </span>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleDownloadPdfReport}
                  style={styles.pdfBtn}
                >
                  <FaFilePdf /> Get PDF
                </button>
                <button
                  type="button"
                  onClick={handlePrintReport}
                  style={styles.printBtn}
                >
                  <FaPrint /> Print Report
                </button>
              </div>
            </div>

            {renderModeSwitcher()}

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

              {lookupMode === "class" ? (
                <>
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
                </>
              ) : (
                <input
                  style={{ ...styles.filterInput, minWidth: "220px", flex: 1 }}
                  placeholder="Enter quiz name (optional for all quizzes)..."
                  value={quizNameQuery}
                  onChange={(e) => setQuizNameQuery(e.target.value)}
                />
              )}

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label style={styles.label}>After Date (IST):</label>
                <input
                  type="date"
                  style={styles.filterInput}
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label style={styles.label}>Total Marks:</label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  style={{ ...styles.filterInput, width: "100px" }}
                  value={reportTotalMarks}
                  onChange={(e) => setReportTotalMarks(e.target.value)}
                  placeholder="10"
                />
              </div>

              <button
                type="button"
                style={styles.primaryBtn}
                onClick={() =>
                  fetchFilteredDateData(selectedClass, selectedSession, selectedStream, filterDate)
                }
                disabled={loading}
              >
                <FaSearch /> {loading ? "Calculating..." : "Generate Report"}
              </button>
            </div>

            {reportSubjects.length > 0 && (
              <div style={styles.subFilterRow}>
                <label style={styles.label}>Subject Scope:</label>
                <select
                  style={styles.filterInput}
                  value={reportSubjectFilter}
                  onChange={(e) => setReportSubjectFilter(e.target.value)}
                >
                  <option value="ALL">All Subjects ({filteredQuizzes.length} Quizzes)</option>
                  {reportSubjects.map((subj) => (
                    <option key={subj} value={subj}>{subj}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Scope &amp; Session</div>
                <div style={styles.statValue}>
                  {lookupMode === "quizNameAllClasses" ? "All Classes" : selectedClass || "—"} ({selectedSession})
                </div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Total Quizzes Held After {filterDate || "Date"}</div>
                <div style={styles.statValue}>{computedReportRows.totalQuizzesAfterDate}</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Total Marks Scale</div>
                <div style={styles.statValue}>{computedReportRows.maxMarks}</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Students in Report</div>
                <div style={styles.statValue}>{computedReportRows.rows.length}</div>
              </div>
            </div>

            <div style={styles.resultGroupCard}>
              <div style={styles.resultGroupHeader}>
                <h4 style={styles.quizTitle}>
                  Student Marks (Out of {computedReportRows.maxMarks})
                </h4>
                <span style={styles.countPill}>
                  {computedReportRows.totalQuizzesAfterDate} Quiz(zes) Held After {filterDate}
                </span>
              </div>

              {computedReportRows.rows.length === 0 ? (
                <div style={styles.emptyState}>
                  Choose options above, enter Total Marks, and click &ldquo;Generate Report&rdquo;.
                </div>
              ) : (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>#</th>
                        <th style={styles.th}>Student Name</th>
                        <th style={styles.th}>Attempted After Date</th>
                        <th style={styles.th}>Score (Right / Total Q)</th>
                        <th style={styles.th}>Grade</th>
                        <th style={styles.th}>Auto Marks (/{computedReportRows.maxMarks})</th>
                        <th style={styles.th}>Quiz History</th>
                      </tr>
                    </thead>
                    <tbody>
                      {computedReportRows.rows.map((st, index) => (
                        <tr key={st.studentKey} style={styles.tr}>
                          <td style={styles.td}><strong>{index + 1}</strong></td>
                          <td style={styles.td}>
                            <div style={{ fontWeight: 700 }}>{st.studentName}</div>
                            {st.rollNo !== "—" && (
                              <div style={styles.subIdText}>Roll/ID: {st.rollNo}</div>
                            )}
                          </td>
                          <td style={styles.td}>
                            <span style={styles.countPill}>
                              {st.playedCount} / {st.totalQuizzesAfterDate}
                            </span>
                          </td>
                          <td style={styles.td}>
                            {st.playedCount > 0 ? (
                              <>
                                <strong>{st.totalCorrect} / {st.totalQuestionsSum}</strong>
                                <span style={styles.pctText}> ({st.avgPercentage}%)</span>
                              </>
                            ) : (
                              <span style={styles.pctText}>0 / 0 (Not Attempted)</span>
                            )}
                          </td>
                          <td style={styles.td}>
                            <span
                              style={{
                                ...styles.gradeBadge,
                                backgroundColor: st.playedCount > 0 ? st.gradeBg : "#f8fafc",
                                color: st.playedCount > 0 ? st.gradeColor : "#475569"
                              }}
                            >
                              {st.playedCount > 0 ? st.grade : "—"}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <span style={styles.generatedMarksBadge}>
                              {st.generatedMarks} / {st.maxMarks}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <button
                              type="button"
                              style={styles.detailLinkBtn}
                              onClick={() =>
                                setSelectedStudentDetail({
                                  ...st,
                                  filterDate,
                                  className:
                                    lookupMode === "quizNameAllClasses"
                                      ? "All Classes"
                                      : selectedClass,
                                  session: selectedSession
                                })
                              }
                            >
                              <FaEye /> Get Details ({st.playedCount})
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* PER-STUDENT QUIZ ATTEMPT BREAKDOWN MODAL */}
      {selectedStudentDetail && (
        <div style={styles.modalBackdrop} onClick={() => setSelectedStudentDetail(null)}>
          <div
            style={{ ...styles.modalCard, maxWidth: "700px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>
                  {selectedStudentDetail.studentName} — Attempts After {selectedStudentDetail.filterDate}
                </h3>
                <p style={styles.modalSub}>
                  {selectedStudentDetail.className || "—"} • Session {selectedStudentDetail.session} • Played{" "}
                  <strong>
                    {selectedStudentDetail.playedCount} of{" "}
                    {selectedStudentDetail.totalQuizzesAfterDate}
                  </strong>{" "}
                  quizzes • Marks:{" "}
                  <strong>
                    {selectedStudentDetail.generatedMarks} / {selectedStudentDetail.maxMarks}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                aria-label="Close student breakdown"
                onClick={() => setSelectedStudentDetail(null)}
                style={styles.closeModalBtn}
              >
                <FaTimes />
              </button>
            </div>

            {selectedStudentDetail.attemptsList.length === 0 ? (
              <div style={styles.emptyState}>
                This student has not attempted any quiz on or after {selectedStudentDetail.filterDate}.
              </div>
            ) : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>#</th>
                      <th style={styles.th}>Quiz Title</th>
                      <th style={styles.th}>Subject</th>
                      <th style={styles.th}>Score</th>
                      <th style={styles.th}>Grade</th>
                      <th style={styles.th}>Attempted At (IST)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedStudentDetail.attemptsList.map((item, idx) => (
                      <tr key={item.id ?? `${item.matched_quiz_key}-${idx}`} style={styles.tr}>
                        <td style={styles.td}>{idx + 1}</td>
                        <td style={styles.td}><strong>{item.quiz_title}</strong></td>
                        <td style={styles.td}>{item.subject}</td>
                        <td style={styles.td}>
                          <span style={styles.scoreBadge}>{item.score_fraction}</span>
                          <span style={styles.pctText}> ({item.percentage}%)</span>
                        </td>
                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.gradeBadge,
                              backgroundColor: item.grade_bg,
                              color: item.grade_color
                            }}
                          >
                            {item.grade}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {item.attempted_at ? formatDateTimeIST(item.attempted_at) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setSelectedStudentDetail(null)}
                style={styles.primaryBtn}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE & TIMER MODAL */}
      {scheduleModalQuiz && (
        <div style={styles.modalBackdrop} onClick={() => setScheduleModalQuiz(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Edit Quiz Schedule &amp; Timer</h3>
                <p style={styles.modalSub}>{scheduleModalQuiz.title}</p>
              </div>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setScheduleModalQuiz(null)}
                style={styles.closeModalBtn}
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule}>
              <div style={styles.modalFormGrid}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Start At (IST)</label>
                  <input
                    type="datetime-local"
                    style={styles.input}
                    value={scheduleForm.start_at}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, start_at: e.target.value })}
                  />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>End At (IST)</label>
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
                  <label style={styles.label}>Created At (IST, Optional)</label>
                  <input
                    type="datetime-local"
                    style={styles.input}
                    value={scheduleForm.created_at}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, created_at: e.target.value })}
                  />
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setScheduleModalQuiz(null)}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={styles.saveBtn}
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
    background: "linear-gradient(180deg, #f8fafc 0%, #f0fdf4 100%)",
    padding: "24px 16px 48px",
    fontFamily: "'Segoe UI', Roboto, Arial, sans-serif",
    color: "#1e293b"
  },
  toastBanner: {
    position: "fixed",
    bottom: "20px",
    left: "20px",
    background: "#ffffff",
    color: "#1e293b",
    border: "1px solid #86efac",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.12)",
    borderRadius: "10px",
    padding: "11px 16px",
    fontSize: "13.5px",
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    zIndex: 2000
  },
  shell: {
    maxWidth: "1160px",
    margin: "0 auto"
  },
  navbar: {
    background: "#ffffff",
    borderRadius: "14px",
    padding: "18px 22px",
    boxShadow: "0 6px 20px rgba(15, 23, 42, 0.05)",
    border: "1px solid #e2e8f0",
    marginBottom: "18px",
    display: "flex",
    flexDirection: "column",
    gap: "14px"
  },
  navBrand: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    flexWrap: "wrap"
  },
  // Blue #1 of 4 (light blue tint, no dark blue)
  badgePill: {
    display: "inline-block",
    background: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
    fontWeight: 700,
    fontSize: "12px",
    padding: "5px 12px",
    borderRadius: "999px"
  },
  navTitle: {
    margin: 0,
    fontSize: "23px",
    fontWeight: 800,
    color: "#0f172a"
  },
  navSubtitle: {
    margin: "3px 0 0",
    color: "#475569",
    fontSize: "13px"
  },
  navMenu: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    paddingTop: "12px",
    borderTop: "1px solid #f1f5f9"
  },
  navBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 16px",
    borderRadius: "9px",
    border: " solid #e2e8f0",
    background: "#f8fafc",
    color: "#1e293b",
    fontWeight: 700,
    fontSize: "13.5px",
    cursor: "pointer"
  },
  // Blue #2 of 4 (light blue active pill)
  activeNavBlue: {
    background: "#eff6ff",
    color: "#1d4ed8",
    borderColor: "#93c5fd"
  },
  activeNavGreen: {
    background: "#15803d",
    color: "#ffffff",
    borderColor: "#15803d"
  },
  activeNavNeutral: {
    background: "#f0fdf4",
    color: "#166534",
    borderColor: "#86efac"
  },
  panel: {
    background: "#ffffff",
    borderRadius: "14px",
    padding: "24px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
    border: "1px solid #e2e8f0"
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px",
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
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px"
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  label: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#334155"
  },
  input: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    background: "#ffffff",
    color: "#1e293b",
    outline: "none",
    width: "100%",
    boxSizing: "border-box"
  },
  questionsToolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "22px",
    marginBottom: "12px"
  },
  subHeading: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 700,
    color: "#0f172a"
  },
  questionCard: {
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    borderRadius: "10px",
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
    background: "#dcfce7",
    color: "#15803d",
    fontWeight: 700,
    fontSize: "12px",
    padding: "4px 10px",
    borderRadius: "999px"
  },
  optionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "10px",
    marginTop: "10px"
  },
  // Blue #3 of 4 (light blue button, no dark blue)
  primaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    background: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #93c5fd",
    padding: "10px 16px",
    borderRadius: "8px",
    fontWeight: 700,
    fontSize: "13.5px",
    cursor: "pointer"
  },
  secondaryNeutralBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "#f8fafc",
    color: "#1e293b",
    border: "1px solid #cbd5e1",
    padding: "8px 12px",
    borderRadius: "8px",
    fontWeight: 700,
    fontSize: "12.5px",
    cursor: "pointer"
  },
  publishBtn: {
    marginTop: "12px",
    width: "100%",
    background: "#15803d",
    color: "#ffffff",
    border: "none",
    padding: "13px 18px",
    borderRadius: "9px",
    fontWeight: 700,
    fontSize: "15px",
    cursor: "pointer"
  },
  // Single Orange accent
  pdfBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    background: "#ea580c",
    color: "#ffffff",
    border: "none",
    padding: "9px 14px",
    borderRadius: "8px",
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer"
  },
  printBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    background: "#f8fafc",
    color: "#1e293b",
    border: "1px solid #cbd5e1",
    padding: "9px 14px",
    borderRadius: "8px",
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer"
  },
  detailLinkBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "#f0fdf4",
    color: "#15803d",
    border: "1px solid #86efac",
    padding: "6px 11px",
    borderRadius: "7px",
    fontWeight: 700,
    fontSize: "12px",
    cursor: "pointer"
  },
  filterBar: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    alignItems: "center",
    background: "#f8fafc",
    padding: "14px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    marginBottom: "18px"
  },
  filterInput: {
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    fontSize: "13.5px",
    color: "#1e293b"
  },
  modeToggleRow: {
    display: "flex",
    gap: "8px",
    marginBottom: "12px",
    flexWrap: "wrap"
  },
  modeBtn: {
    padding: "8px 14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer"
  },
  modeBtnActive: {
    background: "#15803d",
    color: "#ffffff",
    borderColor: "#15803d"
  },
  subFilterRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "16px",
    flexWrap: "wrap"
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "12px",
    marginBottom: "18px"
  },
  statCard: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "14px 16px"
  },
  statLabel: {
    fontSize: "11.5px",
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase"
  },
  statValue: {
    fontSize: "21px",
    fontWeight: 800,
    color: "#0f172a",
    marginTop: "4px"
  },
  emptyState: {
    textAlign: "center",
    padding: "28px 16px",
    color: "#64748b",
    background: "#f8fafc",
    borderRadius: "10px",
    border: "1px dashed #cbd5e1",
    fontSize: "14px"
  },
  quizCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "16px",
    marginBottom: "14px",
    background: "#ffffff"
  },
  quizCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "14px",
    flexWrap: "wrap"
  },
  quizTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 700,
    color: "#0f172a"
  },
  idTag: {
    background: "#f1f5f9",
    color: "#334155",
    fontSize: "12px",
    fontWeight: 600,
    padding: "3px 8px",
    borderRadius: "6px"
  },
  statusBadge: {
    fontSize: "12px",
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: "999px"
  },
  metaRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    fontSize: "13px",
    color: "#475569",
    marginTop: "8px"
  },
  scheduleMeta: {
    display: "flex",
    gap: "14px",
    flexWrap: "wrap",
    fontSize: "12.5px",
    color: "#334155",
    marginTop: "8px",
    background: "#f8fafc",
    padding: "8px 10px",
    borderRadius: "8px"
  },
  actionGroup: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap"
  },
  saveBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "#15803d",
    color: "#ffffff",
    border: "none",
    padding: "8px 12px",
    borderRadius: "8px",
    fontWeight: 700,
    fontSize: "12.5px",
    cursor: "pointer"
  },
  softDangerBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    background: "#f8fafc",
    color: "#475569",
    border: "1px solid #cbd5e1",
    padding: "7px 11px",
    borderRadius: "7px",
    fontWeight: 700,
    fontSize: "12px",
    cursor: "pointer"
  },
  cancelBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "#f1f5f9",
    color: "#334155",
    border: "1px solid #cbd5e1",
    padding: "8px 12px",
    borderRadius: "8px",
    fontWeight: 700,
    fontSize: "12.5px",
    cursor: "pointer"
  },
  inlineEditor: {
    marginTop: "14px",
    paddingTop: "14px",
    borderTop: "1px dashed #cbd5e1"
  },
  inlineQuestionBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "9px",
    padding: "12px",
    marginBottom: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  resultGroupCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "16px",
    marginBottom: "16px",
    background: "#ffffff"
  },
  resultGroupHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
    flexWrap: "wrap",
    gap: "8px"
  },
  countPill: {
    background: "#ecfdf5",
    color: "#15803d",
    border: "1px solid #bbf7d0",
    fontWeight: 700,
    fontSize: "12px",
    padding: "4px 10px",
    borderRadius: "999px"
  },
  tableWrap: {
    overflowX: "auto"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13.5px"
  },
  // Blue #4 of 4 (light blue header tint, no dark blue)
  th: {
    textAlign: "left",
    padding: "10px 12px",
    background: "#eff6ff",
    color: "#1d4ed8",
    fontWeight: 700,
    borderBottom: "1px solid #bfdbfe"
  },
  tr: {
    borderBottom: "1px solid #f1f5f9"
  },
  td: {
    padding: "10px 12px",
    verticalAlign: "middle",
    color: "#1e293b"
  },
  subIdText: {
    fontSize: "11.5px",
    color: "#64748b",
    marginTop: "2px"
  },
  scoreBadge: {
    background: "#dcfce7",
    color: "#15803d",
    fontWeight: 700,
    padding: "4px 9px",
    borderRadius: "6px",
    fontSize: "12.5px"
  },
  pctText: {
    fontSize: "12px",
    color: "#64748b"
  },
  gradeBadge: {
    display: "inline-block",
    fontWeight: 800,
    padding: "3px 9px",
    borderRadius: "6px",
    fontSize: "12px"
  },
  generatedMarksBadge: {
    background: "#dcfce7",
    color: "#15803d",
    border: "1px solid #86efac",
    fontWeight: 800,
    padding: "5px 11px",
    borderRadius: "7px",
    fontSize: "13px"
  },
  renewBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "#ecfdf5",
    color: "#047857",
    border: "1px solid #a7f3d0",
    padding: "7px 11px",
    borderRadius: "7px",
    fontWeight: 700,
    fontSize: "12px",
    cursor: "pointer"
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    zIndex: 1000
  },
  modalCard: {
    background: "#ffffff",
    borderRadius: "12px",
    width: "100%",
    maxWidth: "560px",
    padding: "22px",
    boxShadow: "0 20px 45px rgba(15, 23, 42, 0.16)",
    border: "1px solid #e2e8f0",
    maxHeight: "88vh",
    overflowY: "auto"
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    marginBottom: "16px",
    paddingBottom: "10px",
    borderBottom: "1px solid #f1f5f9"
  },
  modalTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 700,
    color: "#0f172a"
  },
  modalSub: {
    margin: "4px 0 0",
    fontSize: "13px",
    color: "#64748b"
  },
  closeModalBtn: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "8px",
    cursor: "pointer",
    color: "#334155"
  },
  modalFormGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px"
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "18px"
  }
};

export default AdminQuizPage;