import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { 
  FaVideo, FaPlusCircle, FaCalendarAlt, FaClock, FaUsers, 
  FaCheckCircle, FaTimesCircle, FaExclamationCircle, FaSpinner, FaExternalLinkAlt 
} from "react-icons/fa";

const AdminMeeting = () => {
  // --- States ---
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Create Form State
  const [formData, setFormData] = useState({
    title: "",
    meeting_type: "PARENTS",
    topic: "",
    meeting_link: "",
    meeting_date: "",
    start_time: "",
    end_time: "",
    duration_minutes: 45,
    session: "2026-2027"
  });

  // Attendance Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // --- Fetch All Meetings ---
  const fetchMeetings = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/api/meetings/admin/all`);
      const data = response.data;
      if (data.success && Array.isArray(data.meetings)) {
        setMeetings(data.meetings);
      } else if (Array.isArray(data)) {
        setMeetings(data);
      } else {
        setMeetings([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load meetings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  // --- Form Input Change Handler ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- Reset Form ---
  const handleReset = () => {
    setFormData({
      title: "",
      meeting_type: "PARENTS",
      topic: "",
      meeting_link: "",
      meeting_date: "",
      start_time: "",
      end_time: "",
      duration_minutes: 45,
      session: "2026-2027"
    });
    setError("");
    setSuccessMessage("");
  };

  // --- Create Meeting ---
  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const payload = {
        ...formData,
        duration_minutes: parseInt(formData.duration_minutes, 10)
      };

      const response = await api.post(`/api/meetings/admin/create`, payload);
      if (response.data.success || response.status === 200 || response.status === 201) {
        setSuccessMessage("Meeting created successfully!");
        handleReset();
        fetchMeetings();
      } else {
        setError(response.data.message || "Failed to create meeting.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred while creating the meeting.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- Fetch Attendance ---
  const handleViewAttendance = async (meeting) => {
    setSelectedMeeting(meeting);
    setShowModal(true);
    setAttendanceLoading(true);
    setAttendanceData([]);

    try {
      const response = await api.get(`/api/meetings/admin/${meeting.id || meeting._id}/attendance`);
      const data = response.data;
      if (data.success && Array.isArray(data.attendance)) {
        setAttendanceData(data.attendance);
      } else if (Array.isArray(data)) {
        setAttendanceData(data);
      } else {
        setAttendanceData([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch attendance details.");
    } finally {
      setAttendanceLoading(false);
    }
  };

  // --- Badge Render Helpers ---
  const renderTypeBadge = (type) => {
    return type === "PARENTS" ? (
      <span style={{ ...styles.badge, background: "#e0e7ff", color: "#3730a3" }}>Parents Meeting</span>
    ) : (
      <span style={{ ...styles.badge, background: "#fef3c7", color: "#92400e" }}>Students Meeting</span>
    );
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case "UPCOMING":
        return <span style={{ ...styles.badge, background: "#e0f2fe", color: "#0369a1" }}>UPCOMING</span>;
      case "LIVE":
        return <span style={{ ...styles.badge, background: "#fee2e2", color: "#dc2626" }}>LIVE</span>;
      case "COMPLETED":
        return <span style={{ ...styles.badge, background: "#d1fae5", color: "#065f46" }}>COMPLETED</span>;
      case "CANCELLED":
        return <span style={{ ...styles.badge, background: "#f1f5f9", color: "#475569" }}>CANCELLED</span>;
      default:
        return <span style={{ ...styles.badge, background: "#f1f5f9", color: "#475569" }}>{status || "UPCOMING"}</span>;
    }
  };

  // --- Attendance Summary Calculations ---
  const totalAttended = attendanceData.length;
  const fullAttendance = attendanceData.filter(item => item.status === "FULL" || item.attendance_status === "FULL").length;
  const partialAttendance = attendanceData.filter(item => item.status === "PARTIAL" || item.attendance_status === "PARTIAL").length;
  const avgMinutes = totalAttended > 0 
    ? Math.round(attendanceData.reduce((acc, curr) => acc + (curr.attended_minutes || curr.duration || 0), 0) / totalAttended) 
    : 0;

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.headerSection}>
        <h1 style={styles.pageTitle}>Meeting Management</h1>
        <p style={styles.subtitle}>Create and manage student and parent meetings</p>
      </div>

      {/* ALERTS */}
      {error && <div style={styles.errorAlert}>{error}</div>}
      {successMessage && <div style={styles.successAlert}>{successMessage}</div>}

      {/* CREATE MEETING FORM */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <FaPlusCircle style={{ color: "#6366f1", marginRight: "8px" }} />
          <h3 style={styles.cardTitle}>Schedule a New Meeting</h3>
        </div>

        <form onSubmit={handleCreateMeeting} style={styles.formGrid}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Meeting Title</label>
            <input 
              type="text" 
              name="title" 
              value={formData.title} 
              onChange={handleChange} 
              placeholder="e.g. Parents Meeting - August" 
              required 
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Meeting Type</label>
            <select 
              name="meeting_type" 
              value={formData.meeting_type} 
              onChange={handleChange} 
              style={styles.input}
            >
              <option value="PARENTS">Parents Meeting</option>
              <option value="STUDENTS">Students Meeting</option>
            </select>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Topic</label>
            <input 
              type="text" 
              name="topic" 
              value={formData.topic} 
              onChange={handleChange} 
              placeholder="e.g. Monthly Academic Performance" 
              required 
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Zoom Meeting Link</label>
            <input 
              type="url" 
              name="meeting_link" 
              value={formData.meeting_link} 
              onChange={handleChange} 
              placeholder="https://zoom.us/..." 
              required 
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Meeting Date</label>
            <input 
              type="date" 
              name="meeting_date" 
              value={formData.meeting_date} 
              onChange={handleChange} 
              required 
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Start Time</label>
            <input 
              type="time" 
              name="start_time" 
              value={formData.start_time} 
              onChange={handleChange} 
              required 
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>End Time</label>
            <input 
              type="time" 
              name="end_time" 
              value={formData.end_time} 
              onChange={handleChange} 
              required 
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Duration (Minutes)</label>
            <input 
              type="number" 
              name="duration_minutes" 
              value={formData.duration_minutes} 
              onChange={handleChange} 
              min="5" 
              required 
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Session</label>
            <input 
              type="text" 
              name="session" 
              value={formData.session} 
              onChange={handleChange} 
              placeholder="2026-2027" 
              required 
              style={styles.input}
            />
          </div>

          <div style={styles.formActions}>
            <button type="button" onClick={handleReset} style={styles.secondaryButton}>
              Reset
            </button>
            <button type="submit" disabled={submitting} style={styles.primaryButton}>
              {submitting ? <FaSpinner className="fa-spin" /> : "Create Meeting"}
            </button>
          </div>
        </form>
      </div>

      {/* MEETING LIST SECTION */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <FaVideo style={{ color: "#6366f1", marginRight: "8px" }} />
          <h3 style={styles.cardTitle}>All Meetings</h3>
        </div>

        {loading ? (
          <div style={styles.centerMessage}><FaSpinner className="fa-spin" /> Loading meetings...</div>
        ) : meetings.length === 0 ? (
          <div style={styles.centerMessage}>No meetings found. Schedule one above!</div>
        ) : (
          <div style={styles.tableResponsive}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Title</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Topic</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Time</th>
                  <th style={styles.th}>Duration</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {meetings.map((meeting, index) => (
                  <tr key={meeting.id || meeting._id || index} style={styles.tr}>
                    <td style={styles.td}><strong>{meeting.title}</strong></td>
                    <td style={styles.td}>{renderTypeBadge(meeting.meeting_type)}</td>
                    <td style={styles.td}>{meeting.topic}</td>
                    <td style={styles.td}>{meeting.meeting_date}</td>
                    <td style={styles.td}>{meeting.start_time} - {meeting.end_time}</td>
                    <td style={styles.td}>{meeting.duration_minutes} mins</td>
                    <td style={styles.td}>{renderStatusBadge(meeting.status)}</td>
                    <td style={styles.td}>
                      <div style={styles.actionButtons}>
                        <button 
                          onClick={() => handleViewAttendance(meeting)} 
                          style={styles.viewBtn}
                          title="View Attendance"
                        >
                          Attendance
                        </button>
                        {meeting.meeting_link && (
                          <a 
                            href={meeting.meeting_link} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={styles.zoomBtn}
                            title="Open Zoom"
                          >
                            <FaExternalLinkAlt /> Zoom
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ATTENDANCE MODAL */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                Attendance: {selectedMeeting?.title}
              </h3>
              <button onClick={() => setShowModal(false)} style={styles.closeBtn}>&times;</button>
            </div>

            {/* SUMMARY CARDS */}
            <div style={styles.summaryGrid}>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>Total Attended</span>
                <span style={styles.summaryValue}>{totalAttended}</span>
              </div>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>Full Attendance</span>
                <span style={styles.summaryValue}>{fullAttendance}</span>
              </div>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>Partial Attendance</span>
                <span style={styles.summaryValue}>{partialAttendance}</span>
              </div>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>Average Minutes</span>
                <span style={styles.summaryValue}>{avgMinutes}m</span>
              </div>
            </div>

            {/* ATTENDANCE TABLE */}
            {attendanceLoading ? (
              <div style={styles.centerMessage}><FaSpinner className="fa-spin" /> Loading attendance...</div>
            ) : attendanceData.length === 0 ? (
              <div style={styles.centerMessage}>No attendance records found for this meeting.</div>
            ) : (
              <div style={styles.tableResponsive}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Student Name</th>
                      <th style={styles.th}>Class</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Attended Mins</th>
                      <th style={styles.th}>Joined At</th>
                      <th style={styles.th}>Left At</th>
                      <th style={styles.th}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceData.map((att, idx) => (
                      <tr key={idx} style={styles.tr}>
                        <td style={styles.td}>{att.student_name || att.name || "N/A"}</td>
                        <td style={styles.td}>{att.class || "N/A"}</td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge,
                            background: (att.status === "FULL" || att.attendance_status === "FULL") ? "#d1fae5" : "#fef3c7",
                            color: (att.status === "FULL" || att.attendance_status === "FULL") ? "#065f46" : "#92400e"
                          }}>
                            {att.status || att.attendance_status || "N/A"}
                          </span>
                        </td>
                        <td style={styles.td}>{att.attended_minutes || att.duration || 0} mins</td>
                        <td style={styles.td}>{att.joined_at || "N/A"}</td>
                        <td style={styles.td}>{att.left_at || "N/A"}</td>
                        <td style={styles.td}>{att.remarks || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={styles.modalFooter}>
              <button onClick={() => setShowModal(false)} style={styles.secondaryButton}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Modern Styles Object ---
const styles = {
  container: {
    padding: "24px",
    maxWidth: "1200px",
    margin: "0 auto",
    fontFamily: "'Segoe UI', Roboto, sans-serif",
    color: "#1e293b",
    background: "#f8fafc",
    minHeight: "100vh"
  },
  headerSection: {
    marginBottom: "24px",
  },
  pageTitle: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "0 0 4px 0",
  },
  subtitle: {
    fontSize: "14px",
    color: "#64748b",
    margin: 0,
  },
  card: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
    marginBottom: "24px",
    border: "1px solid #e2e8f0",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: "20px",
    borderBottom: "1px solid #f1f5f9",
    paddingBottom: "12px",
  },
  cardTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#1e293b",
    margin: 0,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "16px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#475569",
    marginBottom: "6px",
  },
  input: {
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.2s",
    background: "#fff",
    color: "#0f172a"
  },
  formActions: {
    gridColumn: "1 / -1",
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "12px",
  },
  primaryButton: {
    background: "#6366f1",
    color: "#fff",
    border: "none",
    padding: "10px 20px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 2px 4px rgba(99, 102, 241, 0.3)",
  },
  secondaryButton: {
    background: "#f1f5f9",
    color: "#475569",
    border: "1px solid #cbd5e1",
    padding: "10px 20px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  tableResponsive: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
    fontSize: "14px",
  },
  th: {
    background: "#f8fafc",
    color: "#475569",
    padding: "12px 16px",
    fontWeight: "600",
    borderBottom: "1px solid #e2e8f0",
  },
  td: {
    padding: "12px 16px",
    borderBottom: "1px solid #f1f5f9",
    color: "#334155",
  },
  tr: {
    transition: "background 0.1s",
  },
  badge: {
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "700",
    display: "inline-block",
    textTransform: "uppercase",
  },
  actionButtons: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  viewBtn: {
    background: "#e0e7ff",
    color: "#4338ca",
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  zoomBtn: {
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "6px 10px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "600",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
  },
  errorAlert: {
    background: "#fee2e2",
    color: "#dc2626",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "16px",
    fontSize: "14px",
    fontWeight: "600",
  },
  successAlert: {
    background: "#d1fae5",
    color: "#065f46",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "16px",
    fontSize: "14px",
    fontWeight: "600",
  },
  centerMessage: {
    textAlign: "center",
    padding: "30px",
    color: "#64748b",
    fontSize: "14px",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(15, 23, 42, 0.6)",
    backdropFilter: "blur(4px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: "16px",
  },
  modalCard: {
    background: "#ffffff",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "900px",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid #e2e8f0",
  },
  modalTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#0f172a",
    margin: 0,
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: "24px",
    color: "#64748b",
    cursor: "pointer",
  },
  modalFooter: {
    padding: "16px 24px",
    borderTop: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "flex-end",
    background: "#f8fafc",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
    padding: "16px 24px",
    background: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
  },
  summaryItem: {
    background: "#ffffff",
    padding: "12px 16px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
  },
  summaryLabel: {
    fontSize: "12px",
    color: "#64748b",
    fontWeight: "600",
    marginBottom: "4px",
  },
  summaryValue: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#0f172a",
  }
};

export default AdminMeeting;