import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { 
  FaCalendarAlt, FaPaperPlane, FaHistory, FaCheckCircle, 
  FaTimesCircle, FaClock, FaDownload, FaSearch, 
  FaSyncAlt, FaShieldAlt, FaRegCalendarCheck, FaExclamationCircle, FaUserCircle, FaEye, FaTimes, FaPhoneAlt, FaIdCard
} from "react-icons/fa";

/**
 * @component StudentDropApply
 * @description SmartZone Official Professional Student Holiday & Leave Management Portal
 */
const StudentDropApply = () => {
  // --- States ---
  const [profile, setProfile] = useState(null);
  const [previousDrops, setPreviousDrops] = useState([]);
  const [formData, setFormData] = useState({
    start_date: "",
    end_date: "",
    reason: "",
    drop_type: ""
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // --- Tracking & Confirmation Modal States ---
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRecordForPreview, setSelectedRecordForPreview] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // --- Constants ---
  const API_URL = process.env.REACT_APP_API_URL || "https://student-management-system-4-hose.onrender.com";
  
  // Safe user identification lookup
  const getStoredUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  };
  const user = getStoredUser();
  const currentStudentId = user?.id || 1; // Fallback or active student ID

  // --- Helpers ---
  const handleResize = () => setWindowWidth(window.innerWidth);

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- Confetti Animation ---
  const triggerConfetti = useCallback(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js";
    script.onload = () => {
      if (window.confetti) {
        window.confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      }
    };
    document.body.appendChild(script);
  }, []);

  // --- Data & Profile Fetching via exact API ---
  const fetchStudentProfileAndDrops = useCallback(async () => {
    if (!currentStudentId) return;
    try {
      // Fetch exact profile details using your requested API route
      const profileRes = await axios.get(`${API_URL}/api/students/profile`, {
        params: { id: currentStudentId }
      });
      if (profileRes.data.success || profileRes.data.student) {
        setProfile(profileRes.data.student || profileRes.data.data);
      }

      // Fetch leave applications
      const dropRes = await axios.get(`${API_URL}/api/drop/my-drop-requests`, {
        params: { student_id: currentStudentId }
      });
      if (dropRes.data.success) {
        setPreviousDrops(dropRes.data.data || []);
      }
    } catch (err) {
      console.error("Error loading portal data:", err);
    }
  }, [API_URL, currentStudentId]);

  useEffect(() => {
    fetchStudentProfileAndDrops();
  }, [fetchStudentProfileAndDrops]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/drop/apply-drop`, {
        student_id: currentStudentId,
        ...formData
      });
      if (res.data.success) {
        setIsSubmitted(true);
        fetchStudentProfileAndDrops();
        setFormData({ start_date: "", end_date: "", reason: "", drop_type: "" });
        triggerConfetti();
      } else {
        alert(res.data.message || "Submission failed.");
      }
    } catch (err) {
      alert("Submission failed. Please check network connection.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => (dateString ? dateString.split("T")[0] : "N/A");

  // --- Open Preview Modal ---
  const handleOpenPreview = (record) => {
    setSelectedRecordForPreview(record);
    setShowPreviewModal(true);
  };

  // --- Confirmed PDF Generator with Full Image Support ---
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
          logging: false 
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
    }, 500);
  };

  const filteredDrops = useMemo(() => {
    return previousDrops.filter(item => {
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
    const approved = previousDrops.filter(d => d.status === "approved").length;
    const pending = previousDrops.filter(d => d.status === "pending").length;
    const rejected = previousDrops.filter(d => d.status === "rejected").length;
    return { total, approved, pending, rejected };
  }, [previousDrops]);

  // Resolved student image source
  const studentPhoto = profile?.photo_url || profile?.avatar || profile?.image || user?.photo_url || "";
  const studentName = profile?.name || user?.name || "Student Portal User";
  const studentPhone = profile?.phone || profile?.mobile || user?.phone || "Not Provided";
  const studentClass = profile?.class || profile?.batch || "Standard / Batch";

  // --- Professional High-Tech Light Theme Styles ---
  const styles = {
    wrapper: {
      minHeight: "100vh",
      background: "#f8fafc",
      fontFamily: "'Inter', 'Segoe UI', Roboto, sans-serif",
      paddingBottom: "80px",
      color: "#0f172a",
      boxSizing: "border-box"
    },
    hero: {
      background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
      padding: "36px 20px 48px",
      textAlign: "center",
      color: "#ffffff",
      boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.25)",
      width: "100%",
      boxSizing: "border-box"
    },
    container: {
      maxWidth: "1280px",
      margin: "-30px auto 0",
      padding: "0 20px",
      position: "relative",
      zIndex: 10
    },
    grid: {
      display: "grid",
      gridTemplateColumns: windowWidth > 1024 ? "1fr 1.25fr" : "1fr",
      gap: "24px",
      alignItems: "start"
    },
    card: {
      background: "#ffffff",
      borderRadius: "20px",
      padding: "28px",
      boxShadow: "0 10px 30px 0 rgba(0, 0, 0, 0.04), 0 1px 3px 0 rgba(0, 0, 0, 0.02)",
      border: "1px solid #e2e8f0"
    },
    formGroup: {
      marginBottom: "20px",
      display: "flex",
      flexDirection: "column"
    },
    label: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontWeight: "600",
      fontSize: "0.82rem",
      color: "#475569",
      marginBottom: "8px",
      textTransform: "uppercase",
      letterSpacing: "0.5px"
    },
    input: {
      width: "100%",
      padding: "12px 16px",
      borderRadius: "12px",
      border: "1px solid #cbd5e1",
      fontSize: "0.95rem",
      outline: "none",
      backgroundColor: "#f8fafc",
      color: "#0f172a",
      boxSizing: "border-box",
      transition: "all 0.2s ease"
    },
    btnPrimary: {
      width: "100%",
      padding: "14px",
      background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
      color: "#fff",
      border: "none",
      borderRadius: "12px",
      fontSize: "1rem",
      fontWeight: "600",
      cursor: "pointer",
      boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
      transition: "all 0.2s ease"
    },
    statsRow: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: "10px",
      marginBottom: "20px"
    },
    statBox: {
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      padding: "12px 6px",
      textAlign: "center"
    },
    statVal: {
      fontSize: "1.15rem",
      fontWeight: "700",
      color: "#0f172a"
    },
    statLab: {
      fontSize: "0.62rem",
      color: "#64748b",
      textTransform: "uppercase",
      fontWeight: "700",
      marginTop: "2px",
      letterSpacing: "0.3px"
    },
    historyItem: (status) => {
      const colors = { approved: "#10b981", rejected: "#ef4444", pending: "#f59e0b" };
      return {
        background: "#ffffff",
        borderRadius: "14px",
        padding: "18px",
        marginBottom: "14px",
        border: "1px solid #e2e8f0",
        borderLeft: `5px solid ${colors[status] || "#cbd5e1"}`,
        boxShadow: "0 2px 4px rgba(0,0,0,0.01)",
        transition: "all 0.2s ease"
      };
    },
    statusBadge: (status) => ({
      fontSize: "0.68rem",
      fontWeight: "700",
      padding: "4px 10px",
      borderRadius: "30px",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      backgroundColor: status === "approved" ? "#d1fae5" : status === "rejected" ? "#fee2e2" : "#fef3c7",
      color: status === "approved" ? "#047857" : status === "rejected" ? "#b91c1c" : "#b45309"
    })
  };

  return (
    <div style={styles.wrapper}>
      <style>
        {`
          .input-focus:focus { border-color: #2563eb !important; background: #ffffff !important; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12); }
          .btn-hover:hover { transform: translateY(-1px); filter: brightness(1.05); box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35); }
          .history-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.05); border-color: #94a3b8; }
          ::-webkit-scrollbar { width: 6px; }
          ::-webkit-scrollbar-track { background: #f1f5f9; }
          ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        `}
      </style>

      {/* Hero Header */}
      <header style={styles.hero}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 14px", background: "rgba(255, 255, 255, 0.15)", borderRadius: "30px", marginBottom: "12px", fontSize: "0.75rem", fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase" }}>
          <FaShieldAlt /> SmartZone Official Portal
        </div>
        <h1 style={{ fontSize: "2.1rem", fontWeight: "800", margin: "0 0 6px 0", letterSpacing: "-0.5px" }}>Student Leave & Drop Hub</h1>
        <p style={{ margin: 0, fontSize: "0.9rem", color: "rgba(255, 255, 255, 0.85)" }}>Manage academic leaves, check application status, and print secure digital certificates.</p>
      </header>

      {/* Main Container Grid */}
      <div style={styles.container}>
        <main style={styles.grid}>
          
          {/* SECTION 1: Leave Application Form */}
          <section>
            <div style={styles.card}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "22px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>
                  <FaPaperPlane />
                </div>
                <div>
                  <h2 style={{ fontSize: "1.2rem", margin: 0, color: "#0f172a", fontWeight: "700" }}>Apply for Leave</h2>
                  <p style={{ fontSize: "0.78rem", margin: "2px 0 0 0", color: "#64748b" }}>Submit holiday or drop requests directly to administration</p>
                </div>
              </div>

              {/* Student Identity Card Preview */}
              <div style={{ display: "flex", alignItems: "center", gap: "14px", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "12px 16px", borderRadius: "14px", marginBottom: "20px" }}>
                {studentPhoto ? (
                  <img 
                    src={studentPhoto} 
                    alt="Student" 
                    crossOrigin="anonymous"
                    style={{ width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover", border: "2px solid #2563eb", flexShrink: 0 }} 
                  />
                ) : (
                  <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#dbeafe", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>
                    <FaUserCircle />
                  </div>
                )}
                <div style={{ overflow: "hidden" }}>
                  <p style={{ margin: 0, fontWeight: "700", fontSize: "0.95rem", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{studentName}</p>
                  <div style={{ display: "flex", gap: "12px", marginTop: "3px", fontSize: "0.75rem", color: "#64748b" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "3px" }}><FaIdCard /> ID: {currentStudentId}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: "3px" }}><FaPhoneAlt /> {studentPhone}</span>
                  </div>
                </div>
              </div>

              {!isSubmitted ? (
                <form onSubmit={handleSubmit}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}><FaRegCalendarCheck /> Application Category</label>
                    <select 
                      name="drop_type" 
                      className="input-focus" 
                      style={styles.input} 
                      value={formData.drop_type}
                      onChange={handleChange} 
                      required
                    >
                      <option value="">Select leave category...</option>
                      <option value="temporary">Temporary Holiday</option>
                      <option value="1_day">1 Day Leave</option>
                      <option value="permanent">Permanent Drop</option>
                      <option value="emergency">Emergency Medical Leave</option>
                    </select>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}><FaCalendarAlt /> Start Date</label>
                      <input 
                        type="date" 
                        name="start_date" 
                        className="input-focus" 
                        style={styles.input} 
                        value={formData.start_date}
                        onChange={handleChange} 
                        required 
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}><FaCalendarAlt /> End Date</label>
                      <input 
                        type="date" 
                        name="end_date" 
                        className="input-focus" 
                        style={styles.input} 
                        value={formData.end_date}
                        onChange={handleChange} 
                        required 
                      />
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}><FaExclamationCircle /> Detailed Reason</label>
                    <textarea 
                      name="reason" 
                      className="input-focus" 
                      style={{ ...styles.input, height: "100px", resize: "none" }} 
                      placeholder="Explain the reason clearly for review..." 
                      value={formData.reason}
                      onChange={handleChange} 
                      required 
                    />
                  </div>

                  <button type="submit" className="btn-hover" style={styles.btnPrimary} disabled={loading}>
                    {loading ? "Submitting Application..." : "Submit Leave Application"}
                  </button>
                </form>
              ) : (
                <div style={{ textAlign: "center", padding: "40px 10px" }}>
                  <div style={{ fontSize: "48px", marginBottom: "12px" }}>🎉</div>
                  <h3 style={{ color: "#047857", marginBottom: "6px", fontSize: "1.25rem" }}>Application Submitted!</h3>
                  <p style={{ color: "#64748b", marginBottom: "20px", fontSize: "0.88rem" }}>Your application has been recorded successfully.</p>
                  <button 
                    onClick={() => setIsSubmitted(false)} 
                    style={{ ...styles.btnPrimary, width: "auto", padding: "10px 24px", background: "#475569" }}
                  >
                    Submit Another Request
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* SECTION 2: Records Tracker & PDF Certificates */}
          <section>
            <div style={styles.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "#f0fdf4", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>
                    <FaHistory />
                  </div>
                  <div>
                    <h2 style={{ fontSize: "1.2rem", margin: 0, color: "#0f172a", fontWeight: "700" }}>Leave History & Tracker</h2>
                    <p style={{ fontSize: "0.78rem", margin: "2px 0 0 0", color: "#64748b" }}>Track status & export official certificates</p>
                  </div>
                </div>
                <button 
                  onClick={fetchStudentProfileAndDrops} 
                  style={{ background: "#f8fafc", border: "1px solid #cbd5e1", color: "#475569", padding: "7px 12px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", fontWeight: "600" }}
                >
                  <FaSyncAlt /> Refresh
                </button>
              </div>

              {/* Quick Stats Grid */}
              <div style={styles.statsRow}>
                <div style={styles.statBox}>
                  <div style={styles.statVal}>{stats.total}</div>
                  <div style={styles.statLab}>Total</div>
                </div>
                <div style={styles.statBox}>
                  <div style={{ ...styles.statVal, color: "#059669" }}>{stats.approved}</div>
                  <div style={styles.statLab}>Approved</div>
                </div>
                <div style={styles.statBox}>
                  <div style={{ ...styles.statVal, color: "#d97706" }}>{stats.pending}</div>
                  <div style={styles.statLab}>Pending</div>
                </div>
                <div style={styles.statBox}>
                  <div style={{ ...styles.statVal, color: "#dc2626" }}>{stats.rejected}</div>
                  <div style={styles.statLab}>Rejected</div>
                </div>
              </div>

              {/* Search & Filter Controls */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "10px", marginBottom: "16px" }}>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <FaSearch style={{ position: "absolute", left: "14px", color: "#94a3b8", fontSize: "12px" }} />
                  <input 
                    type="text" 
                    placeholder="Search requests..." 
                    className="input-focus"
                    style={{ ...styles.input, paddingLeft: "36px", paddingTop: "10px", paddingBottom: "10px", fontSize: "0.85rem" }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select 
                  style={{ ...styles.input, width: "auto", padding: "10px 12px", fontSize: "0.85rem" }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* History List */}
              <div style={{ maxHeight: "410px", overflowY: "auto", paddingRight: "4px" }}>
                {filteredDrops.length > 0 ? (
                  filteredDrops.map((item) => (
                    <div key={item.id} className="history-card" style={styles.historyItem(item.status)}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontWeight: "700", color: "#0f172a", fontSize: "0.88rem" }}>
                          {item.drop_type?.replace("_", " ").toUpperCase()}
                        </span>
                        <span style={styles.statusBadge(item.status)}>
                          {item.status === "approved" && <FaCheckCircle />}
                          {item.status === "rejected" && <FaTimesCircle />}
                          {item.status === "pending" && <FaClock />}
                          {item.status}
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: "14px", fontSize: "0.78rem", color: "#64748b", marginBottom: "8px" }}>
                        <span>📅 <b>From:</b> {formatDate(item.start_date)}</span>
                        <span>📅 <b>To:</b> {formatDate(item.end_date)}</span>
                      </div>

                      <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", fontSize: "0.82rem", color: "#334155", border: "1px solid #e2e8f0", marginBottom: "10px" }}>
                        "{item.reason}"
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "6px", borderTop: "1px solid #f1f5f9" }}>
                        <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Ref ID: SZ-LV-{item.id}</span>
                        <button 
                          onClick={() => handleOpenPreview(item)}
                          style={{
                            background: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            color: "#1d4ed8",
                            padding: "6px 12px",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            display: "flex",
                            alignItems: "center",
                            gap: "5px"
                          }}
                        >
                          <FaEye /> View & Download
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: "center", padding: "50px 0", color: "#94a3b8" }}>
                    <div style={{ fontSize: "32px", marginBottom: "8px" }}>📂</div>
                    <p style={{ margin: 0, fontSize: "0.85rem" }}>No matching records found.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* MODAL: LIVE PREVIEW BEFORE CONFIRMATION */}
      {showPreviewModal && selectedRecordForPreview && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(15, 23, 42, 0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px" }}>
          <div style={{ background: "#ffffff", borderRadius: "18px", width: "100%", maxWidth: "620px", overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
            
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
              <h3 style={{ margin: 0, fontSize: "0.95rem", color: "#0f172a", fontWeight: "700" }}>Leave Certificate Preview</h3>
              <button onClick={() => setShowPreviewModal(false)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "16px", color: "#64748b" }}>
                <FaTimes />
              </button>
            </div>

            {/* Modal Body Preview Container */}
            <div style={{ padding: "24px", overflowY: "auto", flex: 1, background: "#f1f5f9" }}>
              <div style={{ display: "flex", justifyContent: "center" }}>
                
                {/* Visible Preview Box matching PDF format */}
                <div style={{ width: "100%", maxWidth: "540px", background: "#ffffff", color: "#0f172a", padding: "28px", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #cbd5e1" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #2563eb", paddingBottom: "14px", marginBottom: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      {studentPhoto ? (
                        <img 
                          src={studentPhoto} 
                          alt="Student" 
                          crossOrigin="anonymous"
                          style={{ width: "50px", height: "50px", borderRadius: "8px", objectFit: "cover", border: "2px solid #2563eb" }} 
                        />
                      ) : (
                        <div style={{ width: "50px", height: "50px", borderRadius: "8px", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>
                          <FaUserCircle />
                        </div>
                      )}
                      <div>
                        <h4 style={{ margin: 0, color: "#2563eb", fontSize: "15px" }}>SmartZone Academy</h4>
                        <p style={{ margin: "2px 0 0 0", color: "#64748b", fontSize: "10px" }}>Official Leave & Drop Verification Certificate</p>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ margin: 0, fontWeight: "bold", fontSize: "11px" }}>Ref: SZ-LV-{selectedRecordForPreview.id}</p>
                      <p style={{ margin: "2px 0 0 0", color: "#64748b", fontSize: "9px" }}>Date: {new Date().toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div style={{ marginBottom: "14px", background: "#f8fafc", padding: "10px 14px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                    <h5 style={{ fontSize: "10px", color: "#475569", textTransform: "uppercase", borderBottom: "1px solid #cbd5e1", paddingBottom: "3px", margin: "0 0 6px 0" }}>Student Details</h5>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "11px" }}>
                      <p style={{ margin: 0 }}><b>Name:</b> {studentName}</p>
                      <p style={{ margin: 0 }}><b>ID No:</b> {currentStudentId}</p>
                      <p style={{ margin: 0 }}><b>Class:</b> {studentClass}</p>
                      <p style={{ margin: 0 }}><b>Contact:</b> {studentPhone}</p>
                    </div>
                  </div>

                  <div style={{ marginBottom: "14px", fontSize: "11px" }}>
                    <h5 style={{ fontSize: "10px", color: "#475569", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0", paddingBottom: "3px", margin: "0 0 6px 0" }}>Leave Specifications</h5>
                    <p style={{ margin: "4px 0" }}><b>Type:</b> {selectedRecordForPreview.drop_type?.replace("_", " ").toUpperCase()}</p>
                    <p style={{ margin: "4px 0" }}><b>Duration:</b> {formatDate(selectedRecordForPreview.start_date)} to {formatDate(selectedRecordForPreview.end_date)}</p>
                    <p style={{ margin: "4px 0" }}><b>Status:</b> <span style={{ textTransform: "uppercase", fontWeight: "bold", color: selectedRecordForPreview.status === "approved" ? "#059669" : "#d97706" }}>{selectedRecordForPreview.status}</span></p>
                    <p style={{ margin: "4px 0" }}><b>Reason:</b> {selectedRecordForPreview.reason}</p>
                  </div>

                  <div style={{ marginTop: "18px", paddingTop: "10px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ fontSize: "8px", color: "#94a3b8", margin: 0 }}>SmartZone Secure Management System.</p>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontWeight: "bold", fontSize: "10px", color: "#2563eb" }}>Nitesh Kushwah</div>
                      <div style={{ fontSize: "8px", color: "#64748b" }}>Authorized Signatory</div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ padding: "16px 20px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button 
                onClick={() => setShowPreviewModal(false)}
                style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#ffffff", color: "#475569", fontWeight: "600", cursor: "pointer", fontSize: "0.85rem" }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmAndDownloadPDF}
                disabled={isGeneratingPdf}
                style={{ padding: "10px 20px", borderRadius: "8px", border: "none", background: "#2563eb", color: "#ffffff", fontWeight: "600", cursor: "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}
              >
                <FaDownload /> {isGeneratingPdf ? "Downloading..." : "Confirm & Download PDF"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* HIDDEN TEMPLATE FOR OFF-SCREEN PDF EXPORT RENDERING WITH EXACT DETAILS */}
      {selectedRecordForPreview && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
          <div 
            id={`pdf-invoice-${selectedRecordForPreview.id}`} 
            style={{ width: "600px", background: "#ffffff", color: "#0f172a", padding: "40px", fontFamily: "Arial, sans-serif" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #2563eb", paddingBottom: "20px", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                {studentPhoto ? (
                  <img 
                    src={studentPhoto} 
                    alt="Student" 
                    crossOrigin="anonymous"
                    style={{ width: "65px", height: "65px", borderRadius: "10px", objectFit: "cover", border: "2px solid #2563eb" }} 
                  />
                ) : (
                  <div style={{ width: "65px", height: "65px", borderRadius: "10px", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px" }}>
                    <FaUserCircle />
                  </div>
                )}
                <div>
                  <h1 style={{ margin: 0, color: "#2563eb", fontSize: "18px" }}>SmartZone Academy</h1>
                  <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "11px" }}>Official Leave & Drop Verification Certificate</p>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: 0, fontWeight: "bold", fontSize: "12px" }}>Receipt ID: SZ-LV-{selectedRecordForPreview.id}</p>
                <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "10px" }}>Date: {new Date().toLocaleDateString()}</p>
              </div>
            </div>

            <div style={{ marginBottom: "20px", background: "#f8fafc", padding: "12px 16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <h3 style={{ fontSize: "11px", color: "#475569", textTransform: "uppercase", borderBottom: "1px solid #cbd5e1", paddingBottom: "4px", margin: "0 0 8px 0" }}>Student Complete Details</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11px" }}>
                <p style={{ margin: 0 }}><b>Name:</b> {studentName}</p>
                <p style={{ margin: 0 }}><b>Student ID No:</b> {currentStudentId}</p>
                <p style={{ margin: 0 }}><b>Class / Batch:</b> {studentClass}</p>
                <p style={{ margin: 0 }}><b>Contact No:</b> {studentPhone}</p>
              </div>
            </div>

            <div style={{ marginBottom: "20px", fontSize: "11px" }}>
              <h3 style={{ fontSize: "11px", color: "#475569", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0", paddingBottom: "4px", margin: "0 0 8px 0" }}>Leave Specifications</h3>
              <p style={{ margin: "5px 0" }}><b>Leave Type:</b> {selectedRecordForPreview.drop_type?.replace("_", " ").toUpperCase()}</p>
              <p style={{ margin: "5px 0" }}><b>Duration:</b> {formatDate(selectedRecordForPreview.start_date)} to {formatDate(selectedRecordForPreview.end_date)}</p>
              <p style={{ margin: "5px 0" }}><b>Status:</b> <span style={{ textTransform: "uppercase", fontWeight: "bold", color: selectedRecordForPreview.status === "approved" ? "#059669" : "#d97706" }}>{selectedRecordForPreview.status}</span></p>
              <p style={{ margin: "5px 0" }}><b>Reason:</b> {selectedRecordForPreview.reason}</p>
            </div>

            <div style={{ marginTop: "30px", paddingTop: "15px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ fontSize: "9px", color: "#94a3b8", margin: 0 }}>System-generated secure receipt from SmartZone Management System.</p>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: "bold", fontSize: "11px", color: "#2563eb" }}>Nitesh Kushwah</div>
                <div style={{ fontSize: "9px", color: "#64748b" }}>Authorized Signatory (SmartZone Admin)</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDropApply;