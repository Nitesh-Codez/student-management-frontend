import React, { useState, useEffect } from "react";
import api from "../../services/api";
import {
  FaVideo,
  FaPlusCircle,
  FaSpinner,
  FaExternalLinkAlt,
  FaTimes
} from "react-icons/fa";

const AdminMeeting = () => {
  // ================= STATES =================
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // ================= FORM =================
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

  // ================= ATTENDANCE MODAL =================
  const [showModal, setShowModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // ================= FETCH MEETINGS =================
  const fetchMeetings = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/api/meeting/admin/all");

      console.log("MEETINGS RESPONSE:", response.data);

      if (
        response.data?.success &&
        Array.isArray(response.data.meetings)
      ) {
        setMeetings(response.data.meetings);
      } else {
        setMeetings([]);
      }
    } catch (err) {
      console.error("FETCH MEETINGS ERROR:", err);

      setError(
        err.response?.data?.message ||
          "Failed to load meetings."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  // ================= FORM CHANGE =================
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // ================= RESET =================
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

  // ================= CREATE MEETING =================
  const handleCreateMeeting = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      setSuccessMessage("");

      const payload = {
        ...formData,
        duration_minutes: Number(formData.duration_minutes)
      };

      console.log("CREATE MEETING PAYLOAD:", payload);

      const response = await api.post(
        "/api/meeting/admin/create",
        payload
      );

      console.log("CREATE MEETING RESPONSE:", response.data);

      if (response.data?.success) {
        setSuccessMessage(
          "Meeting created successfully!"
        );

        handleReset();
        await fetchMeetings();
      } else {
        setError(
          response.data?.message ||
            "Failed to create meeting."
        );
      }
    } catch (err) {
      console.error("CREATE MEETING ERROR:", err);

      setError(
        err.response?.data?.message ||
          "Failed to create meeting."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ================= VIEW ATTENDANCE =================
  const handleViewAttendance = async (meeting) => {
    try {
      setSelectedMeeting(meeting);
      setShowModal(true);
      setAttendanceLoading(true);
      setAttendanceData([]);
      setError("");

      const meetingId = meeting.id;

      const response = await api.get(
        `/api/meeting/admin/${meetingId}/attendance`
      );

      console.log(
        "ATTENDANCE RESPONSE:",
        response.data
      );

      if (
        response.data?.success &&
        Array.isArray(response.data.attendance)
      ) {
        setAttendanceData(response.data.attendance);
      } else {
        setAttendanceData([]);
      }
    } catch (err) {
      console.error(
        "FETCH ATTENDANCE ERROR:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to fetch attendance."
      );
    } finally {
      setAttendanceLoading(false);
    }
  };

  // ================= TYPE BADGE =================
  const renderTypeBadge = (type) => {
    if (type === "PARENTS") {
      return (
        <span
          style={{
            ...styles.badge,
            background: "#e0e7ff",
            color: "#3730a3"
          }}
        >
          Parents Meeting
        </span>
      );
    }

    return (
      <span
        style={{
          ...styles.badge,
          background: "#fef3c7",
          color: "#92400e"
        }}
      >
        Students Meeting
      </span>
    );
  };

  // ================= STATUS BADGE =================
  const renderStatusBadge = (status) => {
    const statusStyles = {
      UPCOMING: {
        background: "#e0f2fe",
        color: "#0369a1"
      },
      LIVE: {
        background: "#fee2e2",
        color: "#dc2626"
      },
      COMPLETED: {
        background: "#d1fae5",
        color: "#065f46"
      },
      CANCELLED: {
        background: "#f1f5f9",
        color: "#475569"
      }
    };

    const current =
      statusStyles[status] || statusStyles.UPCOMING;

    return (
      <span
        style={{
          ...styles.badge,
          background: current.background,
          color: current.color
        }}
      >
        {status || "UPCOMING"}
      </span>
    );
  };

  // ================= ATTENDANCE SUMMARY =================

  const totalAttended = attendanceData.length;

  const fullAttendance = attendanceData.filter(
    (item) =>
      item.attendance_status === "FULL" ||
      item.attendance_status === "ATTENDED" ||
      item.status === "FULL" ||
      item.status === "ATTENDED"
  ).length;

  const partialAttendance = attendanceData.filter(
    (item) =>
      item.attendance_status === "PARTIAL" ||
      item.status === "PARTIAL"
  ).length;

  const avgMinutes =
    totalAttended > 0
      ? Math.round(
          attendanceData.reduce(
            (total, item) =>
              total +
              Number(
                item.duration_minutes ||
                  item.attended_minutes ||
                  item.duration ||
                  0
              ),
            0
          ) / totalAttended
        )
      : 0;

  // ================= FORMAT DATE =================
  const formatDate = (date) => {
    if (!date) return "-";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return date;
    }

    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  // ================= FORMAT TIME =================
  const formatTime = (time) => {
    if (!time) return "-";

    const [hour, minute] = time.split(":");

    if (!hour || !minute) return time;

    const date = new Date();
    date.setHours(Number(hour), Number(minute));

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div style={styles.container}>

      {/* ================= HEADER ================= */}
      <div style={styles.headerSection}>
        <h1 style={styles.pageTitle}>
          Meeting Management
        </h1>

        <p style={styles.subtitle}>
          Create and manage student and parent meetings
        </p>
      </div>

      {/* ================= ALERTS ================= */}
      {error && (
        <div style={styles.errorAlert}>
          {error}
        </div>
      )}

      {successMessage && (
        <div style={styles.successAlert}>
          {successMessage}
        </div>
      )}

      {/* ================= CREATE MEETING ================= */}
      <div style={styles.card}>

        <div style={styles.cardHeader}>
          <FaPlusCircle
            style={{
              color: "#6366f1",
              marginRight: "8px"
            }}
          />

          <h3 style={styles.cardTitle}>
            Schedule a New Meeting
          </h3>
        </div>

        <form
          onSubmit={handleCreateMeeting}
          style={styles.formGrid}
        >

          {/* TITLE */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Meeting Title
            </label>

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

          {/* TYPE */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Meeting Type
            </label>

            <select
              name="meeting_type"
              value={formData.meeting_type}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="PARENTS">
                Parents Meeting
              </option>

              <option value="STUDENTS">
                Students Meeting
              </option>
            </select>
          </div>

          {/* TOPIC */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Topic
            </label>

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

          {/* ZOOM LINK */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Zoom Meeting Link
            </label>

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

          {/* DATE */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Meeting Date
            </label>

            <input
              type="date"
              name="meeting_date"
              value={formData.meeting_date}
              onChange={handleChange}
              required
              style={styles.input}
            />
          </div>

          {/* START */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Start Time
            </label>

            <input
              type="time"
              name="start_time"
              value={formData.start_time}
              onChange={handleChange}
              required
              style={styles.input}
            />
          </div>

          {/* END */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              End Time
            </label>

            <input
              type="time"
              name="end_time"
              value={formData.end_time}
              onChange={handleChange}
              required
              style={styles.input}
            />
          </div>

          {/* DURATION */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Duration (Minutes)
            </label>

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

          {/* SESSION */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Session
            </label>

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

          {/* ACTIONS */}
          <div style={styles.formActions}>

            <button
              type="button"
              onClick={handleReset}
              style={styles.secondaryButton}
            >
              Reset
            </button>

            <button
              type="submit"
              disabled={submitting}
              style={styles.primaryButton}
            >
              {submitting ? (
                <>
                  <FaSpinner className="fa-spin" />
                  <span style={{ marginLeft: "8px" }}>
                    Creating...
                  </span>
                </>
              ) : (
                "Create Meeting"
              )}
            </button>

          </div>

        </form>
      </div>

      {/* ================= ALL MEETINGS ================= */}
      <div style={styles.card}>

        <div style={styles.cardHeader}>
          <FaVideo
            style={{
              color: "#6366f1",
              marginRight: "8px"
            }}
          />

          <h3 style={styles.cardTitle}>
            All Meetings
          </h3>
        </div>

        {loading ? (
          <div style={styles.centerMessage}>
            <FaSpinner className="fa-spin" />
            <span style={{ marginLeft: "8px" }}>
              Loading meetings...
            </span>
          </div>
        ) : meetings.length === 0 ? (
          <div style={styles.centerMessage}>
            No meetings found. Schedule one above!
          </div>
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

                {meetings.map((meeting) => (
                  <tr
                    key={meeting.id}
                    style={styles.tr}
                  >

                    <td style={styles.td}>
                      <strong>
                        {meeting.title}
                      </strong>
                    </td>

                    <td style={styles.td}>
                      {renderTypeBadge(
                        meeting.meeting_type
                      )}
                    </td>

                    <td style={styles.td}>
                      {meeting.topic || "-"}
                    </td>

                    <td style={styles.td}>
                      {formatDate(
                        meeting.meeting_date
                      )}
                    </td>

                    <td style={styles.td}>
                      {formatTime(
                        meeting.start_time
                      )}{" "}
                      -{" "}
                      {formatTime(
                        meeting.end_time
                      )}
                    </td>

                    <td style={styles.td}>
                      {meeting.duration_minutes || 0} mins
                    </td>

                    <td style={styles.td}>
                      {renderStatusBadge(
                        meeting.status
                      )}
                    </td>

                    <td style={styles.td}>

                      <div style={styles.actionButtons}>

                        <button
                          onClick={() =>
                            handleViewAttendance(
                              meeting
                            )
                          }
                          style={styles.viewBtn}
                        >
                          Attendance
                        </button>

                        {meeting.meeting_link && (
                          <a
                            href={
                              meeting.meeting_link
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.zoomBtn}
                          >
                            <FaExternalLinkAlt />
                            <span>Zoom</span>
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

      {/* ================= ATTENDANCE MODAL ================= */}
      {showModal && (
        <div style={styles.modalOverlay}>

          <div style={styles.modalCard}>

            {/* MODAL HEADER */}
            <div style={styles.modalHeader}>

              <div>
                <h3 style={styles.modalTitle}>
                  Attendance
                </h3>

                <p style={styles.modalSubtitle}>
                  {selectedMeeting?.title}
                </p>
              </div>

              <button
                onClick={() => setShowModal(false)}
                style={styles.closeBtn}
              >
                <FaTimes />
              </button>

            </div>

            {/* SUMMARY */}
            <div style={styles.summaryGrid}>

              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>
                  Total Attended
                </span>

                <span style={styles.summaryValue}>
                  {totalAttended}
                </span>
              </div>

              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>
                  Full Attendance
                </span>

                <span style={styles.summaryValue}>
                  {fullAttendance}
                </span>
              </div>

              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>
                  Partial Attendance
                </span>

                <span style={styles.summaryValue}>
                  {partialAttendance}
                </span>
              </div>

              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>
                  Average Minutes
                </span>

                <span style={styles.summaryValue}>
                  {avgMinutes}m
                </span>
              </div>

            </div>

            {/* ATTENDANCE DATA */}
            <div style={styles.modalBody}>

              {attendanceLoading ? (
                <div style={styles.centerMessage}>
                  <FaSpinner className="fa-spin" />
                  <span style={{ marginLeft: "8px" }}>
                    Loading attendance...
                  </span>
                </div>
              ) : attendanceData.length === 0 ? (
                <div style={styles.centerMessage}>
                  No attendance records found for
                  this meeting.
                </div>
              ) : (
                <div style={styles.tableResponsive}>

                  <table style={styles.table}>

                    <thead>
                      <tr>
                        <th style={styles.th}>
                          Student Name
                        </th>

                        <th style={styles.th}>
                          Class
                        </th>

                        <th style={styles.th}>
                          Status
                        </th>

                        <th style={styles.th}>
                          Attended Mins
                        </th>

                        <th style={styles.th}>
                          Joined At
                        </th>

                        <th style={styles.th}>
                          Left At
                        </th>

                        <th style={styles.th}>
                          Remarks
                        </th>
                      </tr>
                    </thead>

                    <tbody>

                      {attendanceData.map(
                        (att, index) => {

                          const status =
                            att.attendance_status ||
                            att.status ||
                            "N/A";

                          const isFull =
                            status === "FULL" ||
                            status === "ATTENDED";

                          return (
                            <tr
                              key={
                                att.id || index
                              }
                              style={styles.tr}
                            >

                              <td style={styles.td}>
                                {att.student_name ||
                                  att.name ||
                                  "N/A"}
                              </td>

                              <td style={styles.td}>
                                {att.class || "N/A"}
                              </td>

                              <td style={styles.td}>

                                <span
                                  style={{
                                    ...styles.badge,
                                    background:
                                      isFull
                                        ? "#d1fae5"
                                        : "#fef3c7",
                                    color:
                                      isFull
                                        ? "#065f46"
                                        : "#92400e"
                                  }}
                                >
                                  {status}
                                </span>

                              </td>

                              <td style={styles.td}>
                                {att.duration_minutes ||
                                  att.attended_minutes ||
                                  att.duration ||
                                  0}{" "}
                                mins
                              </td>

                              <td style={styles.td}>
                                {att.joined_at
                                  ? new Date(
                                      att.joined_at
                                    ).toLocaleString(
                                      "en-IN"
                                    )
                                  : "-"}
                              </td>

                              <td style={styles.td}>
                                {att.left_at
                                  ? new Date(
                                      att.left_at
                                    ).toLocaleString(
                                      "en-IN"
                                    )
                                  : "-"}
                              </td>

                              <td style={styles.td}>
                                {att.remarks || "-"}
                              </td>

                            </tr>
                          );
                        }
                      )}

                    </tbody>

                  </table>

                </div>
              )}

            </div>

            {/* MODAL FOOTER */}
            <div style={styles.modalFooter}>

              <button
                onClick={() =>
                  setShowModal(false)
                }
                style={styles.secondaryButton}
              >
                Close
              </button>

            </div>

          </div>

        </div>
      )}
    </div>
  );
};

// ================= STYLES =================

const styles = {
  container: {
    padding: "24px",
    maxWidth: "1400px",
    margin: "0 auto",
    fontFamily:
      "'Segoe UI', Roboto, sans-serif",
    color: "#1e293b",
    background: "#f8fafc",
    minHeight: "100vh"
  },

  headerSection: {
    marginBottom: "24px"
  },

  pageTitle: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "0 0 4px 0"
  },

  subtitle: {
    fontSize: "14px",
    color: "#64748b",
    margin: 0
  },

  card: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "24px",
    boxShadow:
      "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)",
    marginBottom: "24px",
    border: "1px solid #e2e8f0"
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: "20px",
    borderBottom:
      "1px solid #f1f5f9",
    paddingBottom: "12px"
  },

  cardTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#1e293b",
    margin: 0
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "16px"
  },

  inputGroup: {
    display: "flex",
    flexDirection: "column"
  },

  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#475569",
    marginBottom: "6px"
  },

  input: {
    padding: "10px 14px",
    borderRadius: "8px",
    border:
      "1px solid #cbd5e1",
    fontSize: "14px",
    outline: "none",
    background: "#fff",
    color: "#0f172a",
    width: "100%",
    boxSizing: "border-box"
  },

  formActions: {
    gridColumn: "1 / -1",
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "12px"
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
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px"
  },

  secondaryButton: {
    background: "#f1f5f9",
    color: "#475569",
    border:
      "1px solid #cbd5e1",
    padding: "10px 20px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer"
  },

  tableResponsive: {
    overflowX: "auto",
    width: "100%"
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
    fontSize: "14px"
  },

  th: {
    background: "#f8fafc",
    color: "#475569",
    padding: "12px 16px",
    fontWeight: "600",
    borderBottom:
      "1px solid #e2e8f0",
    whiteSpace: "nowrap"
  },

  td: {
    padding: "12px 16px",
    borderBottom:
      "1px solid #f1f5f9",
    color: "#334155",
    whiteSpace: "nowrap"
  },

  tr: {
    transition:
      "background 0.1s"
  },

  badge: {
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "700",
    display: "inline-block",
    textTransform: "uppercase",
    whiteSpace: "nowrap"
  },

  actionButtons: {
    display: "flex",
    gap: "8px",
    alignItems: "center"
  },

  viewBtn: {
    background: "#e0e7ff",
    color: "#4338ca",
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer"
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
    gap: "5px"
  },

  errorAlert: {
    background: "#fee2e2",
    color: "#dc2626",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "16px",
    fontSize: "14px",
    fontWeight: "600"
  },

  successAlert: {
    background: "#d1fae5",
    color: "#065f46",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "16px",
    fontSize: "14px",
    fontWeight: "600"
  },

  centerMessage: {
    textAlign: "center",
    padding: "40px 20px",
    color: "#64748b",
    fontSize: "14px"
  },

  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background:
      "rgba(15,23,42,0.6)",
    backdropFilter:
      "blur(4px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: "16px"
  },

  modalCard: {
    background: "#ffffff",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "1100px",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    boxShadow:
      "0 20px 25px -5px rgba(0,0,0,0.1)",
    overflow: "hidden"
  },

  modalHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom:
      "1px solid #e2e8f0"
  },

  modalTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#0f172a",
    margin: 0
  },

  modalSubtitle: {
    fontSize: "13px",
    color: "#64748b",
    margin: "4px 0 0"
  },

  closeBtn: {
    background: "none",
    border: "none",
    fontSize: "18px",
    color: "#64748b",
    cursor: "pointer",
    padding: "8px"
  },

  modalBody: {
    overflowY: "auto",
    flex: 1
  },

  modalFooter: {
    padding: "16px 24px",
    borderTop:
      "1px solid #e2e8f0",
    display: "flex",
    justifyContent:
      "flex-end",
    background: "#f8fafc"
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
    padding: "16px 24px",
    background: "#f8fafc",
    borderBottom:
      "1px solid #e2e8f0"
  },

  summaryItem: {
    background: "#ffffff",
    padding: "12px 16px",
    borderRadius: "10px",
    border:
      "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column"
  },

  summaryLabel: {
    fontSize: "12px",
    color: "#64748b",
    fontWeight: "600",
    marginBottom: "4px"
  },

  summaryValue: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#0f172a"
  }
};

export default AdminMeeting;