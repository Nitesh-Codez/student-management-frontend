import React, { useState, useEffect } from "react";
import api from "../services/api"
import { FaSearch, FaCheckCircle, FaTimesCircle, FaClock, FaUserGraduate, FaFileAlt, FaExclamationTriangle } from "react-icons/fa";

const AdminExamFormDetails = () => {
  const [totalCount, setTotalCount] = useState(0);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // "all", "submitted", "pending"

  const API_URL = "https://student-management-system-4-hose.onrender.com";

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetching from your specified API endpoint
      const response = await api.get(`${API_URL}/api/exam/admin/total-submissions`);
      
      if (response.data && response.data.success) {
        setTotalCount(response.data.total_submissions || 0);
        setStudents(response.data.students || []);
      } else {
        setError(response.data.message || "Failed to fetch student list.");
        setStudents([]);
      }
    } catch (err) {
      console.error("API Error:", err);
      setError(err.response?.data?.message || "Network error! Could not connect to the server.");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    const name = student.student_name || "";
    const studentClass = student.student_class || "";
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          studentClass.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === "submitted") return matchesSearch && student.status?.toLowerCase() === "submitted";
    if (filterStatus === "pending") return matchesSearch && (student.status?.toLowerCase() === "pending" || !student.applied_at);
    return matchesSearch;
  });

  const submittedCount = students.filter(s => s.status?.toLowerCase() === "submitted").length;
  const pendingCount = totalCount > submittedCount ? totalCount - submittedCount : 0;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header Section */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>
              <FaFileAlt style={{ color: "#4f46e5", marginRight: "10px" }} /> Exam Form Tracking
            </h1>
            <p style={styles.subtitle}>Real-time monitoring of student exam form submissions from database</p>
          </div>
          <button style={styles.refreshBtn} onClick={fetchAllData}>
            Refresh Data
          </button>
        </div>

        {/* Analytics Summary Cards */}
        <div style={styles.statsGrid}>
          <div style={{ ...styles.statCard, borderLeft: "5px solid #4f46e5" }}>
            <div style={{ ...styles.iconBox, background: "#eef2ff", color: "#4f46e5" }}>
              <FaUserGraduate size={20} />
            </div>
            <div>
              <p style={styles.statLabel}>Total Registrations</p>
              <h3 style={styles.statValue}>{totalCount}</h3>
            </div>
          </div>
          <div style={{ ...styles.statCard, borderLeft: "5px solid #10b981" }}>
            <div style={{ ...styles.iconBox, background: "#ecfdf5", color: "#10b981" }}>
              <FaCheckCircle size={20} />
            </div>
            <div>
              <p style={styles.statLabel}>Submitted</p>
              <h3 style={styles.statValue}>{submittedCount}</h3>
            </div>
          </div>
          <div style={{ ...styles.statCard, borderLeft: "5px solid #ef4444" }}>
            <div style={{ ...styles.iconBox, background: "#fef2f2", color: "#ef4444" }}>
              <FaTimesCircle size={20} />
            </div>
            <div>
              <p style={styles.statLabel}>Pending / Left</p>
              <h3 style={styles.statValue}>{pendingCount}</h3>
            </div>
          </div>
        </div>

        {/* Controls & Filters */}
        <div style={styles.controlsBar}>
          <div style={styles.searchBox}>
            <FaSearch style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search by student name or class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          <div style={styles.filterTabs}>
            <button 
              style={{ ...styles.filterTab, ...(filterStatus === "all" ? styles.activeTab : {}) }}
              onClick={() => setFilterStatus("all")}
            >
              All
            </button>
            <button 
              style={{ ...styles.filterTab, ...(filterStatus === "submitted" ? styles.activeTab : {}) }}
              onClick={() => setFilterStatus("submitted")}
            >
              Submitted
            </button>
            <button 
              style={{ ...styles.filterTab, ...(filterStatus === "pending" ? styles.activeTab : {}) }}
              onClick={() => setFilterStatus("pending")}
            >
              Pending Left
            </button>
          </div>
        </div>

        {/* Error Banner if API fails */}
        {error && (
          <div style={styles.errorBanner}>
            <FaExclamationTriangle style={{ marginRight: "10px", color: "#dc2626" }} />
            <span>{error}</span>
          </div>
        )}

        {/* Students Table */}
        {loading ? (
          <div style={styles.centerState}>
            <p style={styles.loadingText}>Fetching live data from database...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div style={styles.centerState}>
            <p style={styles.loadingText}>No student records found in the database.</p>
          </div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.th}>Student Name</th>
                  <th style={styles.th}>Class</th>
                  <th style={styles.th}>Exam Type</th>
                  <th style={styles.th}>Subjects</th>
                  <th style={styles.th}>Session</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Submission Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, index) => {
                  const isSubmitted = student.status?.toLowerCase() === "submitted";
                  return (
                    <tr key={student.id || index} style={styles.tableRow}>
                      <td style={styles.td}>
                        <span style={styles.studentName}>{student.student_name}</span>
                        <div style={styles.subText}>ID: {student.student_id || student.id}</div>
                      </td>
                      <td style={styles.td}>{student.student_class}</td>
                      <td style={styles.td}>
                        <span style={styles.examTypeBadge}>{student.exam_type || "N/A"}</span>
                      </td>
                      <td style={styles.td}>{student.subjects  || "N/A"}</td>
                      <td style={styles.td}>{student.session_year || "2026-2027"}</td>
                      <td style={styles.td}>
                        {isSubmitted ? (
                          <span style={styles.badgeSubmitted}>
                            <FaCheckCircle style={{ marginRight: "4px" }} /> Submitted
                          </span>
                        ) : (
                          <span style={styles.badgePending}>
                            <FaTimesCircle style={{ marginRight: "4px" }} /> Pending Left
                          </span>
                        )}
                      </td>
                      <td style={styles.td}>
                        {student.applied_at ? (
                          <span style={styles.timestamp}>
                            <FaClock style={{ marginRight: "6px", color: "#4f46e5" }} /> 
                            {new Date(student.applied_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                        ) : (
                          <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Not yet submitted</span>
                        )}
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
  );
};

// --- STYLES ---
const styles = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    padding: "30px 20px",
    fontFamily: "'Segoe UI', Roboto, sans-serif",
    color: "#1e293b",
  },
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
    flexWrap: "wrap",
    gap: "15px",
  },
  title: {
    fontSize: "26px",
    fontWeight: "800",
    margin: 0,
    display: "flex",
    alignItems: "center",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: "14px",
    color: "#64748b",
    marginTop: "4px",
  },
  refreshBtn: {
    padding: "10px 20px",
    background: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(79, 70, 229, 0.2)",
    transition: "background 0.2s",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "20px",
    marginBottom: "25px",
  },
  statCard: {
    background: "#ffffff",
    padding: "20px",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
    border: "1px solid #e2e8f0",
  },
  iconBox: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    margin: 0,
    fontSize: "12px",
    color: "#64748b",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  statValue: {
    margin: "4px 0 0 0",
    fontSize: "22px",
    fontWeight: "800",
    color: "#0f172a",
  },
  controlsBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "15px",
  },
  searchBox: {
    position: "relative",
    flex: "1",
    minWidth: "280px",
  },
  searchIcon: {
    position: "absolute",
    left: "15px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#94a3b8",
  },
  searchInput: {
    width: "100%",
    padding: "12px 15px 12px 45px",
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    color: "#1e293b",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    boxShadow: "0 2px 5px rgba(0,0,0,0.02)",
  },
  filterTabs: {
    display: "flex",
    gap: "8px",
  },
  filterTab: {
    padding: "10px 16px",
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    color: "#64748b",
    borderRadius: "10px",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "13px",
    boxShadow: "0 2px 5px rgba(0,0,0,0.02)",
  },
  activeTab: {
    background: "#4f46e5",
    color: "#fff",
    borderColor: "#4f46e5",
  },
  errorBanner: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#dc2626",
    padding: "12px 20px",
    borderRadius: "12px",
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    fontSize: "14px",
    fontWeight: "600",
  },
  tableContainer: {
    background: "#ffffff",
    borderRadius: "16px",
    overflowX: "auto",
    boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
    border: "1px solid #e2e8f0",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  tableHeaderRow: {
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc",
  },
  th: {
    padding: "15px 20px",
    fontSize: "12px",
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
  },
  tableRow: {
    borderBottom: "1px solid #f1f5f9",
    transition: "background 0.2s",
  },
  td: {
    padding: "16px 20px",
    fontSize: "14px",
    color: "#334155",
  },
  studentName: {
    fontWeight: "700",
    color: "#0f172a",
    display: "block",
  },
  subText: {
    fontSize: "11px",
    color: "#64748b",
    marginTop: "2px",
  },
  examTypeBadge: {
    padding: "4px 8px",
    background: "#f1f5f9",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "600",
    color: "#475569",
  },
  badgeSubmitted: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 12px",
    background: "#ecfdf5",
    color: "#059669",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "700",
    border: "1px solid #a7f3d0",
  },
  badgePending: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 12px",
    background: "#fef2f2",
    color: "#dc2626",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "700",
    border: "1px solid #fecaca",
  },
  timestamp: {
    display: "inline-flex",
    alignItems: "center",
    color: "#475569",
    fontSize: "13px",
    fontWeight: "500",
  },
  centerState: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "50px",
    textAlign: "center",
    border: "1px solid #e2e8f0",
  },
  loadingText: {
    color: "#64748b",
    fontSize: "15px",
    margin: 0,
    fontWeight: "500",
  },
};

export default AdminExamFormDetails;