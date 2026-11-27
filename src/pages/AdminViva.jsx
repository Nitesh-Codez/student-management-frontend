import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  Award,
  Power,
  X,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Calendar,
  Clock,
  HelpCircle,
  Layers,
  Sparkles,
  RefreshCw,
  Download,
} from "lucide-react";
import api from "../services/api";

const CLASS_OPTIONS = [
  "6th",
  "7th",
  "8th",
  "9th",
  "10th",
  "11th",
  "12th",
];

const DIFFICULTY_OPTIONS = ["Easy", "Medium", "Hard"];
const STATUS_OPTIONS = ["Draft", "Active"];

const EMPTY_FORM = {
  title: "",
  class_name: "10th",
  subject: "",
  description: "",
  topics: [],
  topicInput: "",
  start_date: "",
  end_date: "",
  total_questions: 10,
  duration_minutes: 15,
  difficulty: "Medium",
  attempt_limit: 2,
  status: "Active",
};

const STYLES = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f0f9ff 0%, #eef2ff 50%, #ecfdf5 100%)",
    color: "#0f172a",
    paddingBottom: "36px",
  },
  hero: {
    background: "linear-gradient(90deg, #e0e7ff 0%, #ede9fe 52%, #e0f2fe 100%)",
    borderBottom: "1.5px solid #c7d2fe",
  },
  heroInner: {
    maxWidth: "1280px",
    margin: "0 auto",
    padding: "22px 24px",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
  },
  pillTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    color: "#4f46e5",
    border: "1px solid #c7d2fe",
    borderRadius: "999px",
    padding: "4px 10px",
    fontSize: "11px",
    fontWeight: 700,
  },
  heroTitle: {
    margin: "6px 0 2px",
    fontSize: "26px",
    fontWeight: 800,
    color: "#0f172a",
    letterSpacing: "-0.02em",
  },
  heroSubtitle: {
    margin: 0,
    fontSize: "13px",
    color: "#475569",
  },
  container: {
    maxWidth: "1280px",
    margin: "0 auto",
    padding: "20px 24px 0",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  card: {
    backgroundColor: "#ffffff",
    border: "1.5px solid #dbeafe",
    borderRadius: "14px",
    boxShadow: "0 2px 10px rgba(37, 99, 235, 0.06)",
  },
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    height: "38px",
    padding: "0 14px",
    borderRadius: "8px",
    border: "none",
    background: "linear-gradient(135deg, #4f46e5 0%, #0284c7 100%)",
    color: "#ffffff",
    fontSize: "12.5px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 3px 10px rgba(79, 70, 229, 0.22)",
  },
  btnSecondary: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    height: "38px",
    padding: "0 13px",
    borderRadius: "8px",
    border: "1.5px solid #bfdbfe",
    backgroundColor: "#ffffff",
    color: "#1e293b",
    fontSize: "12.5px",
    fontWeight: 700,
    cursor: "pointer",
  },
  input: {
    height: "36px",
    width: "100%",
    padding: "0 10px",
    borderRadius: "8px",
    border: "1.5px solid #cbd5e1",
    backgroundColor: "#f8fbff",
    color: "#0f172a",
    fontSize: "13px",
    fontWeight: 500,
    outline: "none",
  },
  select: {
    height: "36px",
    padding: "0 10px",
    borderRadius: "8px",
    border: "1.5px solid #cbd5e1",
    backgroundColor: "#f8fbff",
    color: "#1e293b",
    fontSize: "12.5px",
    fontWeight: 600,
    outline: "none",
    cursor: "pointer",
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 50,
    backgroundColor: "rgba(15, 23, 42, 0.38)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
  },
  modalHeader: {
    background: "linear-gradient(90deg, #e0e7ff 0%, #ede9fe 52%, #e0f2fe 100%)",
    borderBottom: "1.5px solid #c7d2fe",
    padding: "15px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
};

const normalizeDateInput = (rawDate) => {
  if (!rawDate) return "";
  const str = String(rawDate);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const parsed = new Date(str);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

const formatDisplayDate = (rawDate) => {
  if (!rawDate) return "—";
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return String(rawDate);
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (rawDate) => {
  if (!rawDate) return "—";
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return String(rawDate);
  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const parseTopics = (rawTopics) => {
  if (Array.isArray(rawTopics)) {
    return rawTopics.map((t) => String(t).trim()).filter(Boolean);
  }
  if (typeof rawTopics === "string" && rawTopics.trim()) {
    try {
      const parsed = JSON.parse(rawTopics);
      if (Array.isArray(parsed)) {
        return parsed.map((t) => String(t).trim()).filter(Boolean);
      }
    } catch {
      // fallback to comma-separated string
    }
    return rawTopics
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeViva = (row) => {
  if (!row || typeof row !== "object") return null;
  return {
    id: row.id ?? row.viva_id ?? row._id,
    title: row.title || "",
    class_name: row.class_name ?? row.className ?? row.class ?? "10th",
    subject: row.subject || "",
    description: row.description || "",
    topics: parseTopics(row.topics),
    start_date: normalizeDateInput(row.start_date ?? row.startDate),
    end_date: normalizeDateInput(row.end_date ?? row.endDate),
    total_questions: Number(row.total_questions ?? row.totalQuestions ?? 10) || 10,
    duration_minutes: Number(row.duration_minutes ?? row.durationMinutes ?? 15) || 15,
    difficulty: row.difficulty || "Medium",
    attempt_limit: Number(row.attempt_limit ?? row.attemptLimit ?? 1) || 1,
    status: row.status || "Draft",
    created_at: row.created_at ?? row.createdAt ?? null,
  };
};

const computeVivaBucket = (viva) => {
  const statusLower = String(viva.status || "").toLowerCase();
  const todayStr = new Date().toISOString().slice(0, 10);

  if (statusLower === "completed" || statusLower === "closed") {
    return "closed";
  }
  if (viva.end_date && viva.end_date < todayStr) {
    return "closed";
  }
  if (viva.start_date && viva.start_date > todayStr) {
    return "upcoming";
  }
  if (statusLower === "active") {
    return "active";
  }
  return "other";
};

const extractApiError = (err, fallbackMessage) => {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallbackMessage
  );
};

function AdminViva() {
  const { vivaId: routeVivaId } = useParams();

  const [vivas, setVivas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [bucketFilter, setBucketFilter] = useState("ALL");

  const [toast, setToast] = useState(null);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingVivaId, setEditingVivaId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submittingForm, setSubmittingForm] = useState(false);
  const [loadingEditItem, setLoadingEditItem] = useState(false);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedVivaDetail, setSelectedVivaDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [togglingStatusId, setTogglingStatusId] = useState(null);

  const [resultsModalOpen, setResultsModalOpen] = useState(false);
  const [resultsViva, setResultsViva] = useState(null);
  const [resultsList, setResultsList] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState(null);

  const showToast = useCallback((type, message) => {
    setToast({ id: Date.now(), type, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const fetchAllVivas = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setErrorMessage("");

      try {
        const res = await api.get("/api/admin/viva/all");
        const rawList = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.vivas)
          ? res.data.vivas
          : Array.isArray(res.data?.data)
          ? res.data.data
          : [];

        const cleaned = rawList
          .map(normalizeViva)
          .filter((item) => item && item.id !== undefined && item.id !== null);

        setVivas(cleaned);
      } catch (err) {
        const msg = extractApiError(err, "Failed to load AI vivas from server.");
        setErrorMessage(msg);
        showToast("error", msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    fetchAllVivas();
  }, [fetchAllVivas]);

  const handleViewDetails = useCallback(
    async (id) => {
      if (!id) return;
      setDetailModalOpen(true);
      setLoadingDetail(true);
      setSelectedVivaDetail(null);

      try {
        const res = await api.get(`/api/admin/viva/${id}`);
        const rawItem = res.data?.viva || res.data?.data || res.data;
        setSelectedVivaDetail(normalizeViva(rawItem));
      } catch (err) {
        showToast("error", extractApiError(err, "Unable to fetch viva details."));
        setDetailModalOpen(false);
      } finally {
        setLoadingDetail(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    if (routeVivaId) {
      handleViewDetails(routeVivaId);
    }
  }, [routeVivaId, handleViewDetails]);

  const stats = useMemo(() => {
    const total = vivas.length;
    let active = 0;
    let upcoming = 0;
    let closed = 0;

    for (const item of vivas) {
      const bucket = computeVivaBucket(item);
      if (bucket === "active") active += 1;
      else if (bucket === "upcoming") upcoming += 1;
      else if (bucket === "closed") closed += 1;
    }

    return { total, active, upcoming, closed };
  }, [vivas]);

  const filteredVivas = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return vivas.filter((item) => {
      const matchesClass =
        classFilter === "ALL" ||
        String(item.class_name).toLowerCase() === classFilter.toLowerCase();

      const matchesStatus =
        statusFilter === "ALL" ||
        String(item.status).toLowerCase() === statusFilter.toLowerCase();

      const matchesBucket =
        bucketFilter === "ALL" || computeVivaBucket(item) === bucketFilter;

      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.subject.toLowerCase().includes(q) ||
        item.topics.some((topic) => topic.toLowerCase().includes(q));

      return matchesClass && matchesStatus && matchesBucket && matchesSearch;
    });
  }, [vivas, searchQuery, classFilter, statusFilter, bucketFilter]);

  const handleExportCsv = () => {
    if (filteredVivas.length === 0) {
      showToast("error", "No vivas available to export.");
      return;
    }

    const headers = [
      "ID",
      "Title",
      "Class",
      "Subject",
      "Topics",
      "Start Date",
      "End Date",
      "Questions",
      "Duration (Mins)",
      "Difficulty",
      "Attempt Limit",
      "Status",
    ];

    const escapeCsv = (val) => {
      const str = String(val ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = filteredVivas.map((v) =>
      [
        v.id,
        v.title,
        v.class_name,
        v.subject,
        v.topics.join(" | "),
        v.start_date,
        v.end_date,
        v.total_questions,
        v.duration_minutes,
        v.difficulty,
        v.attempt_limit,
        v.status,
      ]
        .map(escapeCsv)
        .join(",")
    );

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "admit-vivas.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("success", "Exported vivas list as CSV.");
  };

  const openCreateModal = () => {
    setEditingVivaId(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setFormModalOpen(true);
  };

  const openEditModal = async (vivaItem) => {
    if (!vivaItem?.id) return;
    setEditingVivaId(vivaItem.id);
    setFormErrors({});
    setFormModalOpen(true);
    setLoadingEditItem(true);

    try {
      const res = await api.get(`/api/admin/viva/${vivaItem.id}`);
      const rawItem = res.data?.viva || res.data?.data || res.data || vivaItem;
      const normalized = normalizeViva(rawItem);

      setFormData({
        title: normalized.title,
        class_name: CLASS_OPTIONS.includes(normalized.class_name)
          ? normalized.class_name
          : "10th",
        subject: normalized.subject,
        description: normalized.description,
        topics: normalized.topics,
        topicInput: "",
        start_date: normalized.start_date,
        end_date: normalized.end_date,
        total_questions: normalized.total_questions,
        duration_minutes: normalized.duration_minutes,
        difficulty: DIFFICULTY_OPTIONS.includes(normalized.difficulty)
          ? normalized.difficulty
          : "Medium",
        attempt_limit: normalized.attempt_limit,
        status: STATUS_OPTIONS.includes(normalized.status)
          ? normalized.status
          : "Draft",
      });
    } catch (err) {
      showToast("error", extractApiError(err, "Failed to load viva for editing."));
      setFormModalOpen(false);
    } finally {
      setLoadingEditItem(false);
    }
  };

  const closeFormModal = () => {
    if (submittingForm) return;
    setFormModalOpen(false);
    setEditingVivaId(null);
    setFormErrors({});
  };

  const handleAddTopic = () => {
    const raw = formData.topicInput || "";
    const parts = raw
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length === 0) return;

    setFormData((prev) => {
      const existingLower = new Set(prev.topics.map((t) => t.toLowerCase()));
      const uniqueNew = parts.filter((p) => !existingLower.has(p.toLowerCase()));
      return {
        ...prev,
        topics: [...prev.topics, ...uniqueNew],
        topicInput: "",
      };
    });

    setFormErrors((prev) => ({ ...prev, topics: "" }));
  };

  const handleTopicKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTopic();
    }
  };

  const handleRemoveTopic = (topicToRemove) => {
    setFormData((prev) => ({
      ...prev,
      topics: prev.topics.filter((t) => t !== topicToRemove),
    }));
  };

  const validateForm = () => {
    const errors = {};
    const pendingTopics = formData.topicInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const mergedTopics = [...formData.topics, ...pendingTopics];

    if (!formData.title.trim()) {
      errors.title = "Viva title is required.";
    }
    if (!CLASS_OPTIONS.includes(formData.class_name)) {
      errors.class_name = "Select a valid class (6th to 12th).";
    }
    if (!formData.subject.trim()) {
      errors.subject = "Subject is required.";
    }
    if (!formData.description.trim()) {
      errors.description = "Description is required.";
    }
    if (mergedTopics.length === 0) {
      errors.topics = "Add at least one viva topic.";
    }
    if (!formData.start_date) {
      errors.start_date = "Start date is required.";
    }
    if (!formData.end_date) {
      errors.end_date = "End date is required.";
    }
    if (
      formData.start_date &&
      formData.end_date &&
      formData.end_date < formData.start_date
    ) {
      errors.end_date = "End date cannot be earlier than start date.";
    }
    if (
      !Number.isInteger(Number(formData.total_questions)) ||
      Number(formData.total_questions) < 1
    ) {
      errors.total_questions = "Total questions must be at least 1.";
    }
    if (
      !Number.isInteger(Number(formData.duration_minutes)) ||
      Number(formData.duration_minutes) < 1
    ) {
      errors.duration_minutes = "Duration must be at least 1 minute.";
    }
    if (
      !Number.isInteger(Number(formData.attempt_limit)) ||
      Number(formData.attempt_limit) < 1
    ) {
      errors.attempt_limit = "Attempt limit must be at least 1.";
    }
    if (!DIFFICULTY_OPTIONS.includes(formData.difficulty)) {
      errors.difficulty = "Select a valid difficulty level.";
    }
    if (!STATUS_OPTIONS.includes(formData.status)) {
      errors.status = "Select Draft or Active.";
    }

    setFormErrors(errors);
    return { isValid: Object.keys(errors).length === 0, mergedTopics };
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const { isValid, mergedTopics } = validateForm();
    if (!isValid) {
      showToast("error", "Please fix the highlighted form fields.");
      return;
    }

const payload = {
  title: formData.title.trim(),
  className: formData.class_name,
  subject: formData.subject.trim(),
  description: formData.description.trim(),
  topics: mergedTopics,
  startDate: formData.start_date,
  endDate: formData.end_date,
  totalQuestions: Number(formData.total_questions),
  durationMinutes: Number(formData.duration_minutes),
  difficulty: formData.difficulty,
  attemptLimit: Number(formData.attempt_limit),
  status: formData.status,
};

    setSubmittingForm(true);
    try {
      if (editingVivaId) {
        await api.put(`/api/admin/viva/${editingVivaId}`, payload);
        showToast("success", "Viva updated successfully.");
      } else {
        await api.post("/api/admin/viva/create", payload);
        showToast("success", "New AI Viva created successfully.");
      }

      setFormModalOpen(false);
      setEditingVivaId(null);
      setFormData(EMPTY_FORM);
      await fetchAllVivas({ silent: true });
    } catch (err) {
      showToast(
        "error",
        extractApiError(
          err,
          editingVivaId ? "Failed to update viva." : "Failed to create viva."
        )
      );
    } finally {
      setSubmittingForm(false);
    }
  };

  const handleToggleStatus = async (vivaItem) => {
    if (!vivaItem?.id) return;
    const nextStatus =
      String(vivaItem.status).toLowerCase() === "active" ? "Inactive" : "Active";

    setTogglingStatusId(vivaItem.id);
    try {
      await api.patch(`/api/admin/viva/${vivaItem.id}/status`, {
        status: nextStatus,
      });

      setVivas((prev) =>
        prev.map((row) =>
          row.id === vivaItem.id ? { ...row, status: nextStatus } : row
        )
      );

      showToast(
        "success",
        `"${vivaItem.title}" status updated to ${nextStatus}.`
      );
    } catch (err) {
      showToast("error", extractApiError(err, "Failed to update viva status."));
    } finally {
      setTogglingStatusId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) return;
    const target = deleteTarget;
    setDeletingId(target.id);

    try {
      await api.delete(`/api/admin/viva/${target.id}`);
      setVivas((prev) => prev.filter((row) => row.id !== target.id));
      showToast("success", `"${target.title}" deleted successfully.`);
      setDeleteTarget(null);
    } catch (err) {
      showToast("error", extractApiError(err, "Failed to delete viva."));
    } finally {
      setDeletingId(null);
    }
  };

  const handleViewResults = async (vivaItem) => {
    if (!vivaItem?.id) return;
    setResultsViva(vivaItem);
    setResultsList([]);
    setSelectedAttempt(null);
    setResultsModalOpen(true);
    setLoadingResults(true);

    try {
      const res = await api.get(`/api/admin/viva/${vivaItem.id}/results`);
      const rawResults = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.results)
        ? res.data.results
        : Array.isArray(res.data?.data)
        ? res.data.data
        : [];

      const normalizedResults = rawResults.map((r, index) => {
        const totalScore = Number(r.total_score ?? r.totalScore ?? r.score ?? 0);
        const maxScore = Number(
          r.max_score ??
            r.maxScore ??
            r.total_marks ??
            vivaItem.total_questions * 10 ??
            100
        );
        const rawPct = r.percentage ?? r.percent;
        const percentage =
          rawPct !== undefined && rawPct !== null && !Number.isNaN(Number(rawPct))
            ? Number(Number(rawPct).toFixed(1))
            : maxScore > 0
            ? Number(((totalScore / maxScore) * 100).toFixed(1))
            : 0;

        return {
          id: r.id ?? r.attempt_id ?? r.result_id ?? index,
          studentName: r.student_name ?? r.studentName ?? r.name ?? "Student",
          studentClass:
            r.class_name ??
            r.student_class ??
            r.className ??
            r.class ??
            vivaItem.class_name,
          rollNumber: r.roll_number ?? r.rollNumber ?? r.admission_no ?? "",
          totalScore,
          maxScore,
          percentage,
          attemptDate:
            r.attempt_date ??
            r.attemptDate ??
            r.submitted_at ??
            r.created_at ??
            null,
          attemptStatus:
            r.status ?? r.attempt_status ?? r.attemptStatus ?? "Completed",
          feedback: r.feedback ?? r.overall_feedback ?? r.remarks ?? "",
          answers: Array.isArray(r.answers)
            ? r.answers
            : Array.isArray(r.responses)
            ? r.responses
            : [],
        };
      });

      setResultsList(normalizedResults);
    } catch (err) {
      showToast("error", extractApiError(err, "Unable to fetch viva results."));
    } finally {
      setLoadingResults(false);
    }
  };

  const renderStatusBadge = (status) => {
    const s = String(status || "Draft");
    const lower = s.toLowerCase();

    if (lower === "active") {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "3px 10px",
            borderRadius: "999px",
            fontSize: "11.5px",
            fontWeight: 700,
            backgroundColor: "#dcfce7",
            color: "#15803d",
            border: "1px solid #86efac",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "999px",
              backgroundColor: "#16a34a",
            }}
          />
          Active
        </span>
      );
    }
    if (lower === "completed" || lower === "closed") {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "3px 10px",
            borderRadius: "999px",
            fontSize: "11.5px",
            fontWeight: 700,
            backgroundColor: "#e0e7ff",
            color: "#4338ca",
            border: "1px solid #a5b4fc",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "999px",
              backgroundColor: "#4f46e5",
            }}
          />
          {s}
        </span>
      );
    }
    if (lower === "inactive") {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "3px 10px",
            borderRadius: "999px",
            fontSize: "11.5px",
            fontWeight: 700,
            backgroundColor: "#fef3c7",
            color: "#b45309",
            border: "1px solid #fde68a",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "999px",
              backgroundColor: "#d97706",
            }}
          />
          Inactive
        </span>
      );
    }
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "3px 10px",
          borderRadius: "999px",
          fontSize: "11.5px",
          fontWeight: 700,
          backgroundColor: "#e0f2fe",
          color: "#0369a1",
          border: "1px solid #7dd3fc",
        }}
      >
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "999px",
            backgroundColor: "#0284c7",
          }}
        />
        {s}
      </span>
    );
  };

  const renderDifficultyBadge = (difficulty) => {
    const d = String(difficulty || "Medium");
    const lower = d.toLowerCase();

    if (lower === "hard") {
      return (
        <span
          style={{
            display: "inline-flex",
            padding: "2px 8px",
            borderRadius: "6px",
            fontSize: "11.5px",
            fontWeight: 700,
            backgroundColor: "#ffe4e6",
            color: "#be123c",
            border: "1px solid #fda4af",
          }}
        >
          {d}
        </span>
      );
    }
    if (lower === "easy") {
      return (
        <span
          style={{
            display: "inline-flex",
            padding: "2px 8px",
            borderRadius: "6px",
            fontSize: "11.5px",
            fontWeight: 700,
            backgroundColor: "#ccfbf1",
            color: "#0f766e",
            border: "1px solid #5eead4",
          }}
        >
          {d}
        </span>
      );
    }
    return (
      <span
        style={{
          display: "inline-flex",
          padding: "2px 8px",
          borderRadius: "6px",
          fontSize: "11.5px",
          fontWeight: 700,
          backgroundColor: "#fef3c7",
          color: "#b45309",
          border: "1px solid #fcd34d",
        }}
      >
        {d}
      </span>
    );
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    classFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    bucketFilter !== "ALL";

  const statCards = [
    {
      key: "ALL",
      label: "Total vivas",
      value: loading ? "—" : stats.total,
      icon: BookOpen,
    },
    {
      key: "active",
      label: "Active vivas",
      value: loading ? "—" : stats.active,
      icon: CheckCircle2,
    },
    {
      key: "upcoming",
      label: "Upcoming vivas",
      value: loading ? "—" : stats.upcoming,
      icon: Calendar,
    },
    {
      key: "closed",
      label: "Closed vivas",
      value: loading ? "—" : stats.closed,
      icon: Award,
    },
  ];

  return (
    <div style={STYLES.page}>
      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            top: "16px",
            right: "16px",
            zIndex: 60,
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            maxWidth: "420px",
            backgroundColor: "#ffffff",
            border:
              toast.type === "error"
                ? "1.5px solid #fda4af"
                : "1.5px solid #6ee7b7",
            borderLeft:
              toast.type === "error"
                ? "5px solid #e11d48"
                : "5px solid #059669",
            borderRadius: "12px",
            padding: "12px 14px",
            boxShadow: "0 10px 25px rgba(15, 23, 42, 0.14)",
            fontSize: "13px",
            fontWeight: 600,
            color: toast.type === "error" ? "#9f1239" : "#0f172a",
          }}
        >
          {toast.type === "error" ? (
            <AlertCircle
              size={18}
              style={{ color: "#e11d48", flexShrink: 0, marginTop: "1px" }}
            />
          ) : (
            <CheckCircle2
              size={18}
              style={{ color: "#059669", flexShrink: 0, marginTop: "1px" }}
            />
          )}
          <span style={{ flex: 1, lineHeight: 1.35 }}>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            style={{
              background: "transparent",
              border: "none",
              color: "#64748b",
              cursor: "pointer",
              padding: "2px",
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Top Gradient Hero Banner */}
      <div style={STYLES.hero}>
        <div style={STYLES.heroInner}>
          <div>
            <div style={STYLES.pillTag}>
              <Sparkles size={13} />
              AI Assessment Suite • Classes 6th–12th
            </div>
            <h1 style={STYLES.heroTitle}>Manage your AI vivas</h1>
            <p style={STYLES.heroSubtitle}>
              All in one place. Schedule oral assessments, filter by class or
              status, review results, and export records.
            </p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            <button
              type="button"
              onClick={() => fetchAllVivas({ silent: true })}
              disabled={refreshing || loading}
              style={{
                ...STYLES.btnSecondary,
                opacity: refreshing || loading ? 0.55 : 1,
                cursor: refreshing || loading ? "not-allowed" : "pointer",
              }}
            >
              <RefreshCw
                size={15}
                style={{
                  color: "#4f46e5",
                  animation: refreshing ? "spin 1s linear infinite" : "none",
                }}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              style={STYLES.btnPrimary}
            >
              <Plus size={16} />
              Create Viva
            </button>
          </div>
        </div>
      </div>

      <div style={STYLES.container}>
        {/* Summary Metric Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "14px",
          }}
        >
          {statCards.map((card) => {
            const IconComponent = card.icon;
            const isSelected = bucketFilter === card.key;
            return (
              <button
                key={card.key}
                type="button"
                onClick={() =>
                  setBucketFilter((prev) =>
                    prev === card.key && card.key !== "ALL" ? "ALL" : card.key
                  )
                }
                style={{
                  background: isSelected
                    ? "linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)"
                    : "#ffffff",
                  border: isSelected
                    ? "1.5px solid #4f46e5"
                    : "1.5px solid #dbeafe",
                  borderRadius: "14px",
                  padding: "16px 18px",
                  textAlign: "left",
                  cursor: "pointer",
                  boxShadow: isSelected
                    ? "0 8px 20px rgba(79, 70, 229, 0.22)"
                    : "0 2px 8px rgba(37, 99, 235, 0.06)",
                  transition: "all 0.16s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    color: isSelected ? "#e0e7ff" : "#475569",
                  }}
                >
                  <span>{card.label}</span>
                  <IconComponent
                    size={16}
                    style={{ color: isSelected ? "#ffffff" : "#4f46e5" }}
                  />
                </div>
                <div
                  style={{
                    marginTop: "10px",
                    fontSize: "28px",
                    fontWeight: 800,
                    lineHeight: 1.1,
                    color: isSelected ? "#ffffff" : "#0f172a",
                  }}
                >
                  {card.value}
                </div>
              </button>
            );
          })}
        </div>

        {/* Filter & Export Control Bar */}
        <div
          style={{
            ...STYLES.card,
            padding: "12px 16px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "10px",
              flex: 1,
            }}
          >
            <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
              <Search
                size={15}
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#6366f1",
                  pointerEvents: "none",
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, subject, or topic..."
                style={{ ...STYLES.input, paddingLeft: "34px" }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Filter size={15} style={{ color: "#4f46e5" }} />
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                aria-label="Filter by Class"
                style={STYLES.select}
              >
                <option value="ALL">All Classes</option>
                {CLASS_OPTIONS.map((cls) => (
                  <option key={cls} value={cls}>
                    Class {cls}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by Status"
              style={STYLES.select}
            >
              <option value="ALL">All Status</option>
              <option value="Active">Active</option>
              <option value="Draft">Draft</option>
              <option value="Inactive">Inactive</option>
              <option value="Completed">Completed</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setClassFilter("ALL");
                  setStatusFilter("ALL");
                  setBucketFilter("ALL");
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  height: "36px",
                  padding: "0 11px",
                  borderRadius: "8px",
                  border: "1px solid #fecdd3",
                  backgroundColor: "#fff1f2",
                  color: "#be123c",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <X size={14} />
                Reset
              </button>
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "12px",
              fontWeight: 700,
              color: "#475569",
            }}
          >
            <span>
              Showing {loading ? "…" : filteredVivas.length} of {vivas.length}
            </span>
            <button
              type="button"
              onClick={handleExportCsv}
              style={STYLES.btnSecondary}
            >
              <Download size={14} style={{ color: "#4f46e5" }} />
              Export as CSV
            </button>
          </div>
        </div>

        {/* Main Viva Listing Table */}
        <div style={{ ...STYLES.card, overflow: "hidden" }}>
          <div
            style={{
              background:
                "linear-gradient(90deg, #eff6ff 0%, #eef2ff 50%, #ecfdf5 100%)",
              borderBottom: "1.5px solid #dbeafe",
              padding: "12px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "14px",
                fontWeight: 800,
                color: "#0f172a",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Layers size={16} style={{ color: "#4f46e5" }} />
              Scheduled AI Vivas
            </h2>

            {bucketFilter !== "ALL" && (
              <span
                style={{
                  backgroundColor: "#eef2ff",
                  color: "#4338ca",
                  border: "1px solid #c7d2fe",
                  borderRadius: "999px",
                  padding: "2px 10px",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  textTransform: "capitalize",
                }}
              >
                Filter: {bucketFilter}
              </span>
            )}
          </div>

          {loading ? (
            <div
              style={{
                padding: "56px 24px",
                textAlign: "center",
                color: "#475569",
                fontSize: "13.5px",
                fontWeight: 600,
              }}
            >
              <RefreshCw
                size={22}
                style={{ color: "#4f46e5", marginBottom: "8px" }}
              />
              <div>Loading AI vivas...</div>
            </div>
          ) : errorMessage && vivas.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "42px",
                  height: "42px",
                  borderRadius: "10px",
                  backgroundColor: "#ffe4e6",
                  color: "#e11d48",
                  marginBottom: "10px",
                }}
              >
                <AlertCircle size={20} />
              </div>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 800,
                  color: "#0f172a",
                }}
              >
                Could not load vivas
              </div>
              <div
                style={{
                  fontSize: "12.5px",
                  color: "#64748b",
                  margin: "4px 0 14px",
                }}
              >
                {errorMessage}
              </div>
              <button
                type="button"
                onClick={() => fetchAllVivas()}
                style={STYLES.btnPrimary}
              >
                <RefreshCw size={14} />
                Try Again
              </button>
            </div>
          ) : filteredVivas.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "42px",
                  height: "42px",
                  borderRadius: "10px",
                  backgroundColor: "#eef2ff",
                  color: "#4f46e5",
                  marginBottom: "10px",
                }}
              >
                <BookOpen size={20} />
              </div>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 800,
                  color: "#0f172a",
                }}
              >
                {hasActiveFilters
                  ? "No matching vivas found"
                  : "No AI vivas created yet"}
              </div>
              <div
                style={{
                  fontSize: "12.5px",
                  color: "#64748b",
                  marginTop: "4px",
                }}
              >
                {hasActiveFilters
                  ? "Try adjusting your search keyword, class, status, or summary filter."
                  : "Click 'Create Viva' above to schedule a new AI oral assessment."}
              </div>
            </div>
          ) : (
            <div style={{ width: "100%", overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      backgroundColor: "#f8faff",
                      borderBottom: "1.5px solid #dbeafe",
                      color: "#334155",
                      fontSize: "11.5px",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    <th style={{ padding: "11px 14px" }}>Title &amp; Subject</th>
                    <th style={{ padding: "11px 12px" }}>Class</th>
                    <th style={{ padding: "11px 12px" }}>Topics</th>
                    <th style={{ padding: "11px 12px" }}>Schedule</th>
                    <th style={{ padding: "11px 12px" }}>Assessment</th>
                    <th style={{ padding: "11px 12px" }}>Status</th>
                    <th style={{ padding: "11px 14px", textAlign: "right" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVivas.map((viva) => {
                    const isToggling = togglingStatusId === viva.id;
                    const isDeleting = deletingId === viva.id;
                    const isActive =
                      String(viva.status).toLowerCase() === "active";

                    return (
                      <tr
                        key={viva.id}
                        style={{
                          borderBottom: "1px solid #e2e8f0",
                          backgroundColor: "#ffffff",
                        }}
                      >
                        <td
                          style={{
                            padding: "12px 14px",
                            maxWidth: "260px",
                            verticalAlign: "top",
                          }}
                        >
                          <div style={{ fontWeight: 700, color: "#1e3a8a" }}>
                            {viva.title || "Untitled Viva"}
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              fontWeight: 700,
                              color: "#4f46e5",
                              marginTop: "2px",
                            }}
                          >
                            {viva.subject || "General"}
                          </div>
                          {viva.description && (
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#64748b",
                                marginTop: "3px",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {viva.description}
                            </div>
                          )}
                        </td>

                        <td
                          style={{
                            padding: "12px",
                            whiteSpace: "nowrap",
                            verticalAlign: "top",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: 700,
                              backgroundColor: "#e0f2fe",
                              color: "#0369a1",
                              border: "1px solid #bae6fd",
                            }}
                          >
                            {viva.class_name}
                          </span>
                        </td>

                        <td
                          style={{
                            padding: "12px",
                            maxWidth: "220px",
                            verticalAlign: "top",
                          }}
                        >
                          {viva.topics.length > 0 ? (
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "4px",
                              }}
                            >
                              {viva.topics.slice(0, 3).map((topic) => (
                                <span
                                  key={topic}
                                  style={{
                                    display: "inline-flex",
                                    padding: "2px 7px",
                                    borderRadius: "6px",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    backgroundColor: "#eef2ff",
                                    color: "#3730a3",
                                    border: "1px solid #c7d2fe",
                                  }}
                                >
                                  {topic}
                                </span>
                              ))}
                              {viva.topics.length > 3 && (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    padding: "2px 7px",
                                    borderRadius: "6px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    backgroundColor: "#f1f5f9",
                                    color: "#475569",
                                  }}
                                >
                                  +{viva.topics.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: "12px" }}>
                              —
                            </span>
                          )}
                        </td>

                        <td
                          style={{
                            padding: "12px",
                            whiteSpace: "nowrap",
                            verticalAlign: "top",
                            fontSize: "12px",
                            color: "#334155",
                          }}
                        >
                          <div>Start: {formatDisplayDate(viva.start_date)}</div>
                          <div style={{ color: "#64748b", marginTop: "2px" }}>
                            End: {formatDisplayDate(viva.end_date)}
                          </div>
                        </td>

                        <td
                          style={{
                            padding: "12px",
                            whiteSpace: "nowrap",
                            verticalAlign: "top",
                            fontSize: "12px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            {renderDifficultyBadge(viva.difficulty)}
                            <span style={{ fontWeight: 700, color: "#1e293b" }}>
                              {viva.total_questions} Qs
                            </span>
                          </div>
                          <div style={{ color: "#64748b", marginTop: "4px" }}>
                            {viva.duration_minutes} min • {viva.attempt_limit}{" "}
                            {viva.attempt_limit === 1 ? "attempt" : "attempts"}
                          </div>
                        </td>

                        <td
                          style={{
                            padding: "12px",
                            whiteSpace: "nowrap",
                            verticalAlign: "top",
                          }}
                        >
                          {renderStatusBadge(viva.status)}
                        </td>

                        <td
                          style={{
                            padding: "12px 14px",
                            whiteSpace: "nowrap",
                            textAlign: "right",
                            verticalAlign: "top",
                          }}
                        >
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => handleViewDetails(viva.id)}
                              title="View Details"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "30px",
                                height: "30px",
                                borderRadius: "7px",
                                border: "1px solid #cbd5e1",
                                backgroundColor: "#ffffff",
                                color: "#334155",
                                cursor: "pointer",
                              }}
                            >
                              <Eye size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditModal(viva)}
                              title="Edit Viva"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "30px",
                                height: "30px",
                                borderRadius: "7px",
                                border: "1px solid #cbd5e1",
                                backgroundColor: "#ffffff",
                                color: "#334155",
                                cursor: "pointer",
                              }}
                            >
                              <Pencil size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleStatus(viva)}
                              disabled={isToggling}
                              title="Toggle Active / Inactive Status"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "30px",
                                height: "30px",
                                borderRadius: "7px",
                                border: isActive
                                  ? "1px solid #86efac"
                                  : "1px solid #fde68a",
                                backgroundColor: isActive
                                  ? "#dcfce7"
                                  : "#fef3c7",
                                color: isActive ? "#15803d" : "#b45309",
                                cursor: isToggling ? "not-allowed" : "pointer",
                                opacity: isToggling ? 0.6 : 1,
                              }}
                            >
                              <Power size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleViewResults(viva)}
                              title="View Student Results"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                height: "30px",
                                padding: "0 9px",
                                borderRadius: "7px",
                                border: "1px solid #c7d2fe",
                                backgroundColor: "#eef2ff",
                                color: "#4338ca",
                                fontSize: "12px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              <Award size={14} />
                              Results
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteTarget(viva)}
                              disabled={isDeleting}
                              title="Delete Viva"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "30px",
                                height: "30px",
                                borderRadius: "7px",
                                border: "1px solid #fecdd3",
                                backgroundColor: "#fff1f2",
                                color: "#be123c",
                                cursor: isDeleting ? "not-allowed" : "pointer",
                                opacity: isDeleting ? 0.6 : 1,
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
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

      {/* Create / Edit Viva Modal */}
      {formModalOpen && (
        <div style={STYLES.modalBackdrop}>
          <div
            style={{
              width: "100%",
              maxWidth: "680px",
              maxHeight: "92vh",
              overflowY: "auto",
              backgroundColor: "#ffffff",
              border: "1.5px solid #c7d2fe",
              borderRadius: "14px",
              boxShadow: "0 18px 40px rgba(15, 23, 42, 0.2)",
            }}
          >
            <div style={STYLES.modalHeader}>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: 800,
                    color: "#0f172a",
                  }}
                >
                  {editingVivaId ? "Edit AI Viva" : "Create New AI Viva"}
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#475569" }}>
                  Configure class, subject, topics, schedule, and oral assessment rules.
                </p>
              </div>
              <button
                type="button"
                onClick={closeFormModal}
                disabled={submittingForm}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "7px",
                  padding: "5px",
                  color: "#334155",
                  cursor: "pointer",
                }}
              >
                <X size={15} />
              </button>
            </div>

            {loadingEditItem ? (
              <div
                style={{
                  padding: "48px 20px",
                  textAlign: "center",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#475569",
                }}
              >
                Loading viva details...
              </div>
            ) : (
              <form
                onSubmit={handleFormSubmit}
                style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#1e293b",
                      marginBottom: "5px",
                    }}
                  >
                    Viva Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="e.g., Periodic Classification Oral Viva"
                    style={STYLES.input}
                  />
                  {formErrors.title && (
                    <div style={{ color: "#e11d48", fontSize: "11.5px", fontWeight: 600, marginTop: "4px" }}>
                      {formErrors.title}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "14px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#1e293b",
                        marginBottom: "5px",
                      }}
                    >
                      Class *
                    </label>
                    <select
                      value={formData.class_name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          class_name: e.target.value,
                        }))
                      }
                      style={{ ...STYLES.select, width: "100%" }}
                    >
                      {CLASS_OPTIONS.map((cls) => (
                        <option key={cls} value={cls}>
                          {cls}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#1e293b",
                        marginBottom: "5px",
                      }}
                    >
                      Subject *
                    </label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          subject: e.target.value,
                        }))
                      }
                      placeholder="e.g., Chemistry, Mathematics, Science"
                      style={STYLES.input}
                    />
                    {formErrors.subject && (
                      <div style={{ color: "#e11d48", fontSize: "11.5px", fontWeight: 600, marginTop: "4px" }}>
                        {formErrors.subject}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#1e293b",
                      marginBottom: "5px",
                    }}
                  >
                    Description *
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Instructions or focus areas for students..."
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1.5px solid #cbd5e1",
                      backgroundColor: "#f8fbff",
                      color: "#0f172a",
                      fontSize: "13px",
                      outline: "none",
                      resize: "vertical",
                    }}
                  />
                  {formErrors.description && (
                    <div style={{ color: "#e11d48", fontSize: "11.5px", fontWeight: 600, marginTop: "4px" }}>
                      {formErrors.description}
                    </div>
                  )}
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#1e293b",
                      marginBottom: "5px",
                    }}
                  >
                    Topics * (Press Enter or comma to add)
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      value={formData.topicInput}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          topicInput: e.target.value,
                        }))
                      }
                      onKeyDown={handleTopicKeyDown}
                      placeholder="Type topic and press Enter..."
                      style={STYLES.input}
                    />
                    <button
                      type="button"
                      onClick={handleAddTopic}
                      style={{
                        height: "36px",
                        padding: "0 14px",
                        borderRadius: "8px",
                        border: "1px solid #c7d2fe",
                        backgroundColor: "#eef2ff",
                        color: "#4338ca",
                        fontSize: "12px",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        cursor: "pointer",
                      }}
                    >
                      Add Topic
                    </button>
                  </div>

                  {formData.topics.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "6px",
                        marginTop: "8px",
                      }}
                    >
                      {formData.topics.map((topic) => (
                        <span
                          key={topic}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            backgroundColor: "#eef2ff",
                            color: "#3730a3",
                            border: "1px solid #c7d2fe",
                            borderRadius: "6px",
                            padding: "3px 8px",
                            fontSize: "11.5px",
                            fontWeight: 600,
                          }}
                        >
                          {topic}
                          <button
                            type="button"
                            onClick={() => handleRemoveTopic(topic)}
                            aria-label={`Remove ${topic}`}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#4f46e5",
                              cursor: "pointer",
                              padding: 0,
                              display: "inline-flex",
                            }}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {formErrors.topics && (
                    <div style={{ color: "#e11d48", fontSize: "11.5px", fontWeight: 600, marginTop: "4px" }}>
                      {formErrors.topics}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: "12px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#1e293b",
                        marginBottom: "5px",
                      }}
                    >
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          start_date: e.target.value,
                        }))
                      }
                      style={STYLES.input}
                    />
                    {formErrors.start_date && (
                      <div style={{ color: "#e11d48", fontSize: "11.5px", fontWeight: 600, marginTop: "4px" }}>
                        {formErrors.start_date}
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#1e293b",
                        marginBottom: "5px",
                      }}
                    >
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          end_date: e.target.value,
                        }))
                      }
                      style={STYLES.input}
                    />
                    {formErrors.end_date && (
                      <div style={{ color: "#e11d48", fontSize: "11.5px", fontWeight: 600, marginTop: "4px" }}>
                        {formErrors.end_date}
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#1e293b",
                        marginBottom: "5px",
                      }}
                    >
                      Total Questions *
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formData.total_questions}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          total_questions: e.target.value,
                        }))
                      }
                      style={STYLES.input}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#1e293b",
                        marginBottom: "5px",
                      }}
                    >
                      Duration (Mins) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formData.duration_minutes}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          duration_minutes: e.target.value,
                        }))
                      }
                      style={STYLES.input}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#1e293b",
                        marginBottom: "5px",
                      }}
                    >
                      Difficulty *
                    </label>
                    <select
                      value={formData.difficulty}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          difficulty: e.target.value,
                        }))
                      }
                      style={{ ...STYLES.select, width: "100%" }}
                    >
                      {DIFFICULTY_OPTIONS.map((diff) => (
                        <option key={diff} value={diff}>
                          {diff}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#1e293b",
                        marginBottom: "5px",
                      }}
                    >
                      Attempt Limit *
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formData.attempt_limit}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          attempt_limit: e.target.value,
                        }))
                      }
                      style={STYLES.input}
                    />
                  </div>
                </div>

                <div style={{ maxWidth: "220px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#1e293b",
                      marginBottom: "5px",
                    }}
                  >
                    Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: e.target.value,
                      }))
                    }
                    style={{ ...STYLES.select, width: "100%" }}
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "10px",
                    borderTop: "1px solid #e2e8f0",
                    paddingTop: "14px",
                    marginTop: "4px",
                  }}
                >
                  <button
                    type="button"
                    onClick={closeFormModal}
                    disabled={submittingForm}
                    style={STYLES.btnSecondary}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingForm}
                    style={STYLES.btnPrimary}
                  >
                    {editingVivaId ? "Save Changes" : "Create Viva"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* View Viva Details Modal */}
      {detailModalOpen && (
        <div style={STYLES.modalBackdrop}>
          <div
            style={{
              width: "100%",
              maxWidth: "560px",
              maxHeight: "90vh",
              overflowY: "auto",
              backgroundColor: "#ffffff",
              border: "1.5px solid #c7d2fe",
              borderRadius: "14px",
              boxShadow: "0 18px 40px rgba(15, 23, 42, 0.2)",
            }}
          >
            <div style={STYLES.modalHeader}>
              <h3
                style={{
                  margin: 0,
                  fontSize: "16px",
                  fontWeight: 800,
                  color: "#0f172a",
                }}
              >
                Viva Details
              </h3>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "7px",
                  padding: "5px",
                  color: "#334155",
                  cursor: "pointer",
                }}
              >
                <X size={15} />
              </button>
            </div>

            {loadingDetail ? (
              <div
                style={{
                  padding: "48px 20px",
                  textAlign: "center",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#475569",
                }}
              >
                Loading details...
              </div>
            ) : selectedVivaDetail ? (
              <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    gap: "10px",
                  }}
                >
                  <div>
                    <h4 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                      {selectedVivaDetail.title}
                    </h4>
                    <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#4f46e5", marginTop: "2px" }}>
                      Class {selectedVivaDetail.class_name} • {selectedVivaDetail.subject}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {renderDifficultyBadge(selectedVivaDetail.difficulty)}
                    {renderStatusBadge(selectedVivaDetail.status)}
                  </div>
                </div>

                {selectedVivaDetail.description && (
                  <div
                    style={{
                      backgroundColor: "#f8fbff",
                      border: "1px solid #dbeafe",
                      borderRadius: "8px",
                      padding: "12px",
                      fontSize: "12.5px",
                      color: "#334155",
                      lineHeight: 1.5,
                    }}
                  >
                    {selectedVivaDetail.description}
                  </div>
                )}

                <div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
                    Topics Covered
                  </div>
                  {selectedVivaDetail.topics.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {selectedVivaDetail.topics.map((topic) => (
                        <span
                          key={topic}
                          style={{
                            backgroundColor: "#eef2ff",
                            color: "#3730a3",
                            border: "1px solid #c7d2fe",
                            borderRadius: "6px",
                            padding: "3px 9px",
                            fontSize: "12px",
                            fontWeight: 600,
                          }}
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                      No topics listed.
                    </span>
                  )}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: "10px",
                    backgroundColor: "#f8fbff",
                    border: "1px solid #dbeafe",
                    borderRadius: "8px",
                    padding: "12px",
                    fontSize: "12px",
                  }}
                >
                  <div>
                    <div style={{ color: "#64748b" }}>Questions</div>
                    <div style={{ fontWeight: 700, color: "#0f172a", marginTop: "2px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <HelpCircle size={13} style={{ color: "#4f46e5" }} />
                      {selectedVivaDetail.total_questions}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#64748b" }}>Duration</div>
                    <div style={{ fontWeight: 700, color: "#0f172a", marginTop: "2px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <Clock size={13} style={{ color: "#4f46e5" }} />
                      {selectedVivaDetail.duration_minutes} mins
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#64748b" }}>Attempt Limit</div>
                    <div style={{ fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
                      {selectedVivaDetail.attempt_limit}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#64748b" }}>Start Date</div>
                    <div style={{ fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
                      {formatDisplayDate(selectedVivaDetail.start_date)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#64748b" }}>End Date</div>
                    <div style={{ fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
                      {formatDisplayDate(selectedVivaDetail.end_date)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#64748b" }}>Created</div>
                    <div style={{ fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
                      {formatDisplayDate(selectedVivaDetail.created_at)}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => setDetailModalOpen(false)}
                    style={STYLES.btnSecondary}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div style={{ ...STYLES.modalBackdrop, zIndex: 60 }}>
          <div
            style={{
              width: "100%",
              maxWidth: "420px",
              backgroundColor: "#ffffff",
              border: "1.5px solid #fecdd3",
              borderRadius: "14px",
              padding: "20px",
              boxShadow: "0 18px 40px rgba(15, 23, 42, 0.22)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "9px",
                  backgroundColor: "#ffe4e6",
                  color: "#e11d48",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Trash2 size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>
                  Delete AI Viva?
                </h3>
                <p style={{ margin: "6px 0 0", fontSize: "12.5px", color: "#475569", lineHeight: 1.45 }}>
                  Are you sure you want to delete{" "}
                  <strong style={{ color: "#0f172a" }}>"{deleteTarget.title}"</strong>?
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "18px" }}>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={Boolean(deletingId)}
                style={STYLES.btnSecondary}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={Boolean(deletingId)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  height: "38px",
                  padding: "0 14px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#e11d48",
                  color: "#ffffff",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {resultsModalOpen && (
        <div style={STYLES.modalBackdrop}>
          <div
            style={{
              width: "100%",
              maxWidth: "880px",
              maxHeight: "90vh",
              overflowY: "auto",
              backgroundColor: "#ffffff",
              border: "1.5px solid #c7d2fe",
              borderRadius: "14px",
              boxShadow: "0 18px 40px rgba(15, 23, 42, 0.2)",
            }}
          >
            <div style={STYLES.modalHeader}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                  Viva Results — {resultsViva?.title || "Assessment"}
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#475569" }}>
                  Class {resultsViva?.class_name} • {resultsViva?.subject}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setResultsModalOpen(false);
                  setSelectedAttempt(null);
                }}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "7px",
                  padding: "5px",
                  color: "#334155",
                  cursor: "pointer",
                }}
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ padding: "20px" }}>
              {loadingResults ? (
                <div
                  style={{
                    padding: "48px 20px",
                    textAlign: "center",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#475569",
                  }}
                >
                  Loading student results...
                </div>
              ) : resultsList.length === 0 ? (
                <div
                  style={{
                    backgroundColor: "#f8fbff",
                    border: "1px solid #dbeafe",
                    borderRadius: "10px",
                    padding: "36px 20px",
                    textAlign: "center",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: "#64748b",
                  }}
                >
                  No student attempts recorded for this viva yet.
                </div>
              ) : selectedAttempt ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={() => setSelectedAttempt(null)}
                      style={STYLES.btnSecondary}
                    >
                      ← Back to All Attempts
                    </button>
                    <span style={{ fontSize: "13px", fontWeight: 800, color: "#4338ca" }}>
                      Score: {selectedAttempt.totalScore} / {selectedAttempt.maxScore} (
                      {selectedAttempt.percentage}%)
                    </span>
                  </div>

                  <div
                    style={{
                      backgroundColor: "#f8fbff",
                      border: "1px solid #dbeafe",
                      borderRadius: "8px",
                      padding: "12px",
                      fontSize: "12.5px",
                    }}
                  >
                    <div style={{ fontWeight: 800, color: "#0f172a" }}>
                      {selectedAttempt.studentName}{" "}
                      {selectedAttempt.rollNumber ? `(${selectedAttempt.rollNumber})` : ""} •
                      Class {selectedAttempt.studentClass}
                    </div>
                    <div style={{ color: "#64748b", marginTop: "4px", fontSize: "12px" }}>
                      Attempted: {formatDateTime(selectedAttempt.attemptDate)} • Status:{" "}
                      {selectedAttempt.attemptStatus}
                    </div>
                    {selectedAttempt.feedback && (
                      <div
                        style={{
                          marginTop: "8px",
                          backgroundColor: "#ffffff",
                          border: "1px solid #c7d2fe",
                          borderRadius: "6px",
                          padding: "8px 10px",
                          color: "#1e293b",
                        }}
                      >
                        <strong style={{ color: "#4338ca" }}>AI Feedback: </strong>
                        {selectedAttempt.feedback}
                      </div>
                    )}
                  </div>

                  {selectedAttempt.answers.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {selectedAttempt.answers.map((ans, idx) => (
                        <div
                          key={ans.id ?? idx}
                          style={{
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            padding: "10px 12px",
                            fontSize: "12.5px",
                            backgroundColor: "#ffffff",
                          }}
                        >
                          <div style={{ fontWeight: 700, color: "#0f172a" }}>
                            Q{idx + 1}:{" "}
                            {ans.question ??
                              ans.question_text ??
                              ans.prompt ??
                              "Oral Question"}
                          </div>
                          <div style={{ color: "#475569", marginTop: "4px" }}>
                            <strong>Response: </strong>
                            {ans.answer ??
                              ans.student_answer ??
                              ans.response ??
                              "—"}
                          </div>
                          {(ans.score !== undefined || ans.feedback) && (
                            <div style={{ color: "#4338ca", marginTop: "4px", fontSize: "12px" }}>
                              {ans.score !== undefined && `Marks: ${ans.score} `}
                              {ans.feedback && `• ${ans.feedback}`}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      Question-level breakdown was not returned for this attempt.
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ width: "100%", overflowX: "auto", border: "1px solid #dbeafe", borderRadius: "10px" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      textAlign: "left",
                      fontSize: "13px",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          backgroundColor: "#f8faff",
                          borderBottom: "1px solid #dbeafe",
                          color: "#334155",
                          fontSize: "11.5px",
                          fontWeight: 800,
                          textTransform: "uppercase",
                        }}
                      >
                        <th style={{ padding: "10px 14px" }}>Student</th>
                        <th style={{ padding: "10px 12px" }}>Class</th>
                        <th style={{ padding: "10px 12px" }}>Score</th>
                        <th style={{ padding: "10px 12px" }}>%</th>
                        <th style={{ padding: "10px 12px" }}>Attempt Date</th>
                        <th style={{ padding: "10px 12px" }}>Status</th>
                        <th style={{ padding: "10px 14px", textAlign: "right" }}>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultsList.map((attempt) => (
                        <tr key={attempt.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "10px 14px", fontWeight: 700, color: "#1e3a8a" }}>
                            {attempt.studentName}
                          </td>
                          <td style={{ padding: "10px 12px", color: "#334155" }}>
                            {attempt.studentClass}
                          </td>
                          <td style={{ padding: "10px 12px", fontWeight: 800, color: "#0f172a" }}>
                            {attempt.totalScore} / {attempt.maxScore}
                          </td>
                          <td style={{ padding: "10px 12px", fontWeight: 700, color: "#059669" }}>
                            {attempt.percentage}%
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: "12px", color: "#64748b", whiteSpace: "nowrap" }}>
                            {formatDateTime(attempt.attemptDate)}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span
                              style={{
                                backgroundColor: "#f1f5f9",
                                color: "#334155",
                                padding: "2px 8px",
                                borderRadius: "999px",
                                fontSize: "11.5px",
                                fontWeight: 600,
                              }}
                            >
                              {attempt.attemptStatus}
                            </span>
                          </td>
                          <td style={{ padding: "10px 14px", textAlign: "right" }}>
                            <button
                              type="button"
                              onClick={() => setSelectedAttempt(attempt)}
                              style={{
                                padding: "4px 10px",
                                borderRadius: "6px",
                                border: "1px solid #c7d2fe",
                                backgroundColor: "#eef2ff",
                                color: "#4338ca",
                                fontSize: "12px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              View
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
        </div>
      )}
    </div>
  );
}

export default AdminViva;