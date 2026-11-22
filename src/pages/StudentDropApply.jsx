import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../services/api";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  FaCalendarAlt,
  FaPaperPlane,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaDownload,
  FaSearch,
  FaSyncAlt,
  FaUserCircle,
  FaEye,
  FaTimes,
} from "react-icons/fa";

const StudentDropApply = () => {
  const [profile, setProfile] = useState(null);
  const [previousDrops, setPreviousDrops] = useState([]);
  const [formData, setFormData] = useState({
    start_date: "",
    end_date: "",
    reason: "",
    drop_type: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRecordForPreview, setSelectedRecordForPreview] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const getStoredUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  };

  const user = useMemo(() => getStoredUser(), []);
  const currentStudentId = user?.id || user?.student_id || 1;

  const triggerConfetti = useCallback(() => {
    if (typeof window === "undefined") return;
    const launch = () => {
      if (window.confetti) {
        window.confetti({ particleCount: 110, spread: 70, origin: { y: 0.65 } });
      }
    };
    if (window.confetti) {
      launch();
      return;
    }
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js";
    script.onload = launch;
    document.body.appendChild(script);
  }, []);

  const fetchStudentProfileAndDrops = useCallback(async () => {
    try {
      try {
        const profileRes = await api.get("/api/students/profile", {
          params: { id: currentStudentId },
        });
        if (profileRes.data?.success || profileRes.data?.student || profileRes.data?.data) {
          setProfile(profileRes.data.student || profileRes.data.data || profileRes.data);
        }
      } catch (profileErr) {
        console.warn("Profile fetch fallback:", profileErr.message);
        setProfile(user);
      }

      const dropRes = await api.get("/api/drop/my-drop-requests", {
        params: { student_id: currentStudentId },
      });

      if (
        dropRes.data?.success ||
        Array.isArray(dropRes.data?.data) ||
        Array.isArray(dropRes.data)
      ) {
        const list = dropRes.data.data || dropRes.data.requests || dropRes.data;
        setPreviousDrops(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      console.error("Error loading portal data:", err.response?.data || err.message);
    }
  }, [currentStudentId, user]);

  useEffect(() => {
    fetchStudentProfileAndDrops();
  }, [fetchStudentProfileAndDrops]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.start_date && formData.end_date && formData.end_date < formData.start_date) {
      alert("End Date cannot be earlier than Start Date.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/api/drop/apply-drop", {
        student_id: currentStudentId,
        ...formData,
      });

      if (res.data?.success) {
        setIsSubmitted(true);
        fetchStudentProfileAndDrops();
        setFormData({ start_date: "", end_date: "", reason: "", drop_type: "" });
        triggerConfetti();
      } else {
        alert(res.data?.message || "Submission failed.");
      }
    } catch (err) {
      console.error("Submit error:", err.response?.data || err.message);
      alert(err.response?.data?.message || "Submission failed. Please check network connection.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => (dateString ? String(dateString).split("T")[0] : "N/A");

  const handleOpenPreview = (record) => {
    setSelectedRecordForPreview(record);
    setShowPreviewModal(true);
  };

  const confirmAndDownloadPDF = async () => {
    if (!selectedRecordForPreview) return;
    setIsGeneratingPdf(true);

    setTimeout(async () => {
      const input = document.getElementById(`pdf-invoice-${selectedRecordForPreview.id}`);
      if (!input) {
        setIsGeneratingPdf(false);
        return;
      }
      try {
        const canvas = await html2canvas(input, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
        });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = (canvas.height * pageWidth) / canvas.width;

        pdf.addImage(imgData, "PNG", 0, 10, pageWidth, pageHeight);
        pdf.save(`SmartZone_Leave_Receipt_${selectedRecordForPreview.id}.pdf`);
        setShowPreviewModal(false);
      } catch (err) {
        console.error("PDF generation failed:", err);
        alert("Could not generate PDF receipt.");
      } finally {
        setIsGeneratingPdf(false);
      }
    }, 300);
  };

  const filteredDrops = useMemo(() => {
    return previousDrops.filter((item) => {
      const matchesSearch =
        item.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.drop_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id?.toString().includes(searchTerm);
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [previousDrops, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = previousDrops.length;
    const approved = previousDrops.filter((d) => d.status === "approved").length;
    const pending = previousDrops.filter((d) => d.status === "pending").length;
    const rejected = previousDrops.filter((d) => d.status === "rejected").length;
    return { total, approved, pending, rejected };
  }, [previousDrops]);

  const studentPhoto =
    profile?.photo_url || profile?.avatar || profile?.image || user?.photo_url || "";
  const studentName = profile?.name || user?.name || "Student Portal User";
  const studentPhone = profile?.phone || profile?.mobile || user?.phone || "Not Provided";
  const studentClass = profile?.class || profile?.batch || "Standard / Batch";

  const renderStatusPill = (status) => {
    const normalized = (status || "pending").toLowerCase();
    const map = {
      approved: { bg: "#5eae89", fg: "#fcfffe", bd: "#3e966d", icon: <FaCheckCircle size={11} /> },
      rejected: { bg: "#c63f3f", fg: "#fff7f7", bd: "#fecaca", icon: <FaTimesCircle size={11} /> },
      pending: { bg: "#fffbeb", fg: "#b45309", bd: "#fde68a", icon: <FaClock size={11} /> },
    };
    const tone = map[normalized] || map.pending;

    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          padding: "4px 10px",
          borderRadius: "6px",
          fontSize: "0.72rem",
          fontWeight: "700",
          textTransform: "uppercase",
          background: tone.bg,
          color: tone.fg,
          border: `1px solid ${tone.bd}`,
        }}
      >
        {tone.icon}
        {normalized}
      </span>
    );
  };

  return (
    <div className="sz-leave-shell">
      <style>{`
        .sz-leave-shell {
          min-height: 100vh;
          background: #f1f5f9;
          color: #0f172a;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          padding-bottom: 72px;
        }
        .sz-topbar {
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          padding: 18px 24px;
        }
        .sz-topbar-inner {
          max-width: 1320px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .sz-student-chip {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 8px 14px;
          border-radius: 12px;
        }
        .sz-workspace {
          max-width: 1320px;
          margin: 22px auto 0;
          padding: 0 24px;
          display: grid;
          grid-template-columns: 380px 1fr;
          gap: 22px;
          align-items: start;
        }
        .sz-panel {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
        }
        .sz-sticky {
          position: sticky;
          top: 20px;
        }
        .sz-label {
          display: block;
          font-size: 0.76rem;
          font-weight: 700;
          color: #334155;
          margin-bottom: 6px;
        }
        .sz-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.88rem;
          color: #0f172a;
          background: #ffffff;
          box-sizing: border-box;
          font-family: inherit;
        }
        .sz-input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }
        .sz-submit-btn {
          width: 60%;
          padding: 08px 12px;
          margin-left:65px;
          border: none;
          border-radius: 8px;
          background: #0f368d;
          color: #ffffff;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.15s ease;
        }
        .sz-submit-btn:hover:not(:disabled) {
          background: #1d4ed8;
        }
        .sz-submit-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
        .sz-kpi-strip {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 16px;
        }
        .sz-kpi-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px 12px;
        }
        .sz-kpi-num {
          font-size: 1.25rem;
          font-weight: 800;
          line-height: 1.2;
        }
        .sz-kpi-txt {
          font-size: 0.7rem;
          font-weight: 600;
          color: #64748b;
          margin-top: 2px;
        }
        .sz-toolbar {
          display: grid;
          grid-template-columns: 1fr 150px auto;
          gap: 10px;
          margin-bottom: 14px;
        }
        .sz-ghost-btn {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #334155;
          padding: 9px 12px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .sz-ghost-btn:hover {
          background: #f8fafc;
        }
        .sz-view-btn {
          background: #22416b;
          border: 1px solid #bfdbfe;
          color: #e6ecfa;
          padding: 6px 8px;
          border-radius: 7px;
          font-size: 0.76rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
        }
        .sz-view-btn:hover {
          background: #dbeafe;
        }
        .sz-table-wrap {
          overflow-x: auto;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
        }
        .sz-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.82rem;
          background: #ffffff;
        }
        .sz-table th {
          background: #f8fafc;
          color: #475569;
          font-weight: 700;
          text-align: left;
          padding: 10px 12px;
          border-bottom: 1px solid #e2e8f0;
          white-space: nowrap;
        }
        .sz-table td {
          padding: 10px 12px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }
        .sz-table tr:last-child td {
          border-bottom: none;
        }
        .sz-mobile-cards {
          display: none;
        }

        @media (max-width: 1024px) {
          .sz-workspace {
            grid-template-columns: 1fr;
          }
          .sz-sticky {
            position: static;
          }
        }

        @media (max-width: 720px) {
          .sz-topbar, .sz-workspace {
            padding-left: 12px;
            padding-right: 12px;
          }
          .sz-panel {
            padding: 15px;
          }
          .sz-kpi-strip {
            grid-template-columns: repeat(2, 1fr);
          }
          .sz-toolbar {
            grid-template-columns: 1fr;
          }
          .sz-table-wrap {
            display: none;
          }
          .sz-mobile-cards {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .sz-m-card {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 12px;
            background: #ffffff;
          }
        }
      `}</style>

      {/* Clean Light Header */}
      <div className="sz-topbar">
        <div className="sz-topbar-inner">
          <div>
            <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "#2563eb", letterSpacing: "0.5px" }}>
              SMARTZONE • LEAVE DESK
            </div>
            <h1 style={{ margin: "2px 0 0", fontSize: "1.35rem", fontWeight: "800", color: "#0f172a" }}>
              Leave &amp; Drop Requests
            </h1>
          </div>

          <div className="sz-student-chip">
            {studentPhoto ? (
              <img
                src={studentPhoto}
                alt="Student"
                crossOrigin="anonymous"
                style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              <FaUserCircle size={32} color="#64748b" />
            )}
            <div>
              <div style={{ fontSize: "0.86rem", fontWeight: "700", color: "#0f172a" }}>
                {studentName}
              </div>
              <div style={{ fontSize: "0.74rem", color: "#64748b" }}>
                ID: {currentStudentId} • {studentPhone}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Split Workspace */}
      <div className="sz-workspace">
        {/* Left Rail: New Request Form */}
        <div className="sz-panel sz-sticky">
          <h2 style={{ margin: "0 0 4px", fontSize: "1.05rem", fontWeight: "800" }}>
            New Leave Request
          </h2>
          <p style={{ margin: "0 0 16px", fontSize: "0.78rem", color: "#64748b" }}>
            Fill dates and reason to raise a request.
          </p>

          {!isSubmitted ? (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "13px" }}>
                <label className="sz-label">Request Type</label>
                <select
                  name="drop_type"
                  className="sz-input"
                  value={formData.drop_type}
                  onChange={handleChange}
                  required
                >
                  <option value="">Choose category</option>
                  <option value="temporary">Temporary Holiday</option>
                  <option value="1_day">1 Day Leave</option>
                  <option value="permanent">Permanent Drop</option>
                  <option value="emergency">Emergency Medical Leave</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "13px" }}>
                <div>
                  <label className="sz-label">
                    <FaCalendarAlt size={10} /> Start Date
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    className="sz-input"
                    value={formData.start_date}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label className="sz-label">
                    <FaCalendarAlt size={10} /> End Date
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    className="sz-input"
                    value={formData.end_date}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label className="sz-label">Reason</label>
                <textarea
                  name="reason"
                  rows={3}
                  className="sz-input"
                  style={{ resize: "vertical" }}
                  placeholder="Write reason for leave or drop..."
                  value={formData.reason}
                  onChange={handleChange}
                  required
                />
              </div>

              <button type="submit" className="sz-submit-btn" disabled={loading}>
                <FaPaperPlane size={12} />
                {loading ? "Submitting..." : "Submit Request"}
              </button>
            </form>
          ) : (
            <div style={{ padding: "24px 8px", textAlign: "center" }}>
              <FaCheckCircle size={34} color="#059669" />
              <div style={{ fontWeight: "800", fontSize: "1rem", marginTop: "10px" }}>
                Request Submitted
              </div>
              <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "6px 0 16px" }}>
                Your leave application is now visible in the log.
              </p>
              <button
                type="button"
                className="sz-ghost-btn"
                onClick={() => setIsSubmitted(false)}
              >
                Create Another
              </button>
            </div>
          )}
        </div>

        {/* Right Area: Summary Strip + Table / Mobile Cards */}
        <div className="sz-panel">
          <div className="sz-kpi-strip">
            <div className="sz-kpi-box">
              <div className="sz-kpi-num">{stats.total}</div>
              <div className="sz-kpi-txt">All Requests</div>
            </div>
            <div className="sz-kpi-box">
              <div className="sz-kpi-num" style={{ color: "#059669" }}>
                {stats.approved}
              </div>
              <div className="sz-kpi-txt">Approved</div>
            </div>
            <div className="sz-kpi-box">
              <div className="sz-kpi-num" style={{ color: "#d97706" }}>
                {stats.pending}
              </div>
              <div className="sz-kpi-txt">Pending</div>
            </div>
            <div className="sz-kpi-box">
              <div className="sz-kpi-num" style={{ color: "#dc2626" }}>
                {stats.rejected}
              </div>
              <div className="sz-kpi-txt">Rejected</div>
            </div>
          </div>

          <div className="sz-toolbar">
            <div style={{ position: "relative" }}>
              <FaSearch
                size={12}
                color="#94a3b8"
                style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                type="text"
                className="sz-input"
                style={{ paddingLeft: "32px" }}
                placeholder="Search ID, category, or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="sz-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>

            <button type="button" className="sz-ghost-btn" onClick={fetchStudentProfileAndDrops}>
              <FaSyncAlt size={10} /> Refresh
            </button>
          </div>

          {filteredDrops.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="sz-table-wrap">
                <table className="sz-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Category</th>
                      <th>Dates</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Letter</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDrops.map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: "700", color: "#64748b" }}>#{item.id}</td>
                        <td style={{ fontWeight: "700" }}>
                          {item.drop_type ? item.drop_type.replace("_", " ").toUpperCase() : "LEAVE"}
                        </td>
                        <td style={{ whiteSpace: "nowrap", color: "#475569" }}>
                          {formatDate(item.start_date)} → {formatDate(item.end_date)}
                        </td>
                        <td style={{ maxWidth: "260px", color: "#334155" }}>{item.reason}</td>
                        <td>{renderStatusPill(item.status)}</td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className="sz-view-btn"
                            onClick={() => handleOpenPreview(item)}
                          >
                            <FaEye size={11} /> PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="sz-mobile-cards">
                {filteredDrops.map((item) => (
                  <div key={item.id} className="sz-m-card">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "6px",
                      }}
                    >
                      <span style={{ fontWeight: "800", fontSize: "0.86rem" }}>
                        #{item.id} •{" "}
                        {item.drop_type ? item.drop_type.replace("_", " ").toUpperCase() : "LEAVE"}
                      </span>
                      {renderStatusPill(item.status)}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: "6px" }}>
                      {formatDate(item.start_date)} to {formatDate(item.end_date)}
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "#334155", marginBottom: "10px" }}>
                      {item.reason}
                    </div>
                    <button
                      type="button"
                      className="sz-view-btn"
                      onClick={() => handleOpenPreview(item)}
                    >
                      <FaEye size={11} /> View &amp; Download PDF
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ padding: "40px 12px", textAlign: "center", color: "#64748b", fontSize: "0.86rem" }}>
              No leave requests match your filter.
            </div>
          )}
        </div>
      </div>

      {/* Preview & PDF Modal */}
      {showPreviewModal && selectedRecordForPreview && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "14px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              width: "100%",
              maxWidth: "600px",
              overflow: "hidden",
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <strong style={{ fontSize: "0.9rem" }}>Leave Letter Preview</strong>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <FaTimes size={15} />
              </button>
            </div>

            <div style={{ padding: "16px", overflowY: "auto", background: "#f8fafc", flex: 1 }}>
              <div
                id={`pdf-invoice-${selectedRecordForPreview.id}`}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "22px",
                  color: "#0f172a",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "2px solid #16316c",
                    paddingBottom: "10px",
                    marginBottom: "14px",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "800", color: "#1d4ed8", fontSize: "14px" }}>
                      SmartZone Leave Application Letter
                    </div>
                    <div style={{ fontSize: "10px", color: "#64748b" }}>
                      Student Leave &amp; Drop Record
                    </div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: "11px" }}>
                    <div>
                      <b>Ref:</b> #{selectedRecordForPreview.id}
                    </div>
                    <div style={{ color: "#64748b", fontSize: "9.5px" }}>
                      {new Date().toLocaleDateString("en-IN")}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "6px 12px",
                    fontSize: "11.5px",
                    background: "#f8fafc",
                    padding: "10px",
                    borderRadius: "6px",
                    marginBottom: "12px",
                  }}
                >
                  <div>
                    <b>Name:</b> {studentName}
                  </div>
                  <div>
                    <b>Student ID:</b> {currentStudentId}
                  </div>
                  <div>
                    <b>Class/Batch:</b> {studentClass}
                  </div>
                  <div>
                    <b>Phone:</b> {studentPhone}
                  </div>
                </div>

                <div style={{ fontSize: "11.5px", lineHeight: "1.6" }}>
                  <div>
                    <b>Category:</b>{" "}
                    {selectedRecordForPreview.drop_type
                      ? selectedRecordForPreview.drop_type.replace("_", " ").toUpperCase()
                      : "LEAVE"}
                  </div>
                  <div>
                    <b>Period:</b> {formatDate(selectedRecordForPreview.start_date)} to{" "}
                    {formatDate(selectedRecordForPreview.end_date)}
                  </div>
                  <div>
                    <b>Status:</b> {(selectedRecordForPreview.status || "pending").toUpperCase()}
                  </div>
                  <div>
                    <b>Reason:</b> {selectedRecordForPreview.reason}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "20px",
                    paddingTop: "10px",
                    borderTop: "1px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "10px",
                  }}
                >
                  <span style={{ color: "#94a3b8" }}>SmartZone Portal</span>
                  <span style={{ fontWeight: "700", color: "#1d4ed8" }}>Nitesh Kushwah</span>
                </div>
              </div>
            </div>

            <div
              style={{
                padding: "12px 16px",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
              }}
            >
              <button
                type="button"
                className="sz-ghost-btn"
                onClick={() => setShowPreviewModal(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="sz-submit-btn"
                style={{ width: "auto", padding: "9px 16px", fontSize: "0.82rem" }}
                onClick={confirmAndDownloadPDF}
                disabled={isGeneratingPdf}
              >
                <FaDownload size={11} />
                {isGeneratingPdf ? "Exporting..." : "Download PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDropApply;