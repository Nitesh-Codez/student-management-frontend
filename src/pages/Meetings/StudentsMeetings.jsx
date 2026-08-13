import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

import {
  FaVideo,
  FaCalendarAlt,
  FaClock,
  FaExternalLinkAlt,
  FaUserGraduate,
  FaUserFriends,
  FaSpinner,
  FaSyncAlt
} from "react-icons/fa";

// Direct Render Backend API instance with Auth Token Interceptor
const api = axios.create({
  baseURL: "https://student-management-system-4-hose.onrender.com/api",
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const StudentsMeetings = () => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("PARENTS");

  // =========================================================
  // FETCH MEETINGS WITH QUERY PARAMS
  // =========================================================

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      console.log(`Fetching meetings for type: ${activeTab}`);

      // Hits: https://student-management-system-4-hose.onrender.com/api/meeting/student?type=...
      const response = await api.get(`/meeting/student?type=${activeTab}`);

      console.log("Meetings API Response:", response.data);

      const data = response.data;

      if (data?.success && Array.isArray(data.meetings)) {
        setMeetings(data.meetings);
      } else if (Array.isArray(data)) {
        setMeetings(data);
      } else if (Array.isArray(data?.data)) {
        setMeetings(data.data);
      } else {
        setMeetings([]);
      }

    } catch (err) {
      console.error("FETCH MEETINGS ERROR:", err);
      console.error("Status:", err.response?.status);
      console.error("Response:", err.response?.data);

      setMeetings([]);
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to load meetings from server."
      );
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // =========================================================
  // INITIAL & TAB CHANGE FETCH
  // =========================================================

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  // =========================================================
  // OPEN MEETING LINK DIRECTLY
  // =========================================================

  const handleJoinMeeting = (meeting) => {
    setError("");

    if (meeting.meeting_link) {
      window.open(meeting.meeting_link, "_blank", "noopener,noreferrer");
    } else {
      setError("Meeting link is not available.");
    }
  };

  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDate = (date) => {
    if (!date) return "Date not available";
    try {
      return new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    } catch {
      return date;
    }
  };

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.headerSection}>
        <div>
          <h1 style={styles.pageTitle}>Scheduled Meetings</h1>
          <p style={styles.subtitle}>Join your active parent and student sessions</p>
        </div>

        <button onClick={fetchMeetings} disabled={loading} style={styles.refreshButton}>
          <FaSyncAlt
            style={{
              marginRight: "7px",
              animation: loading ? "spin 1s linear infinite" : "none"
            }}
          />
          Refresh
        </button>
      </div>

      {/* ALERTS */}
      {error && <div style={styles.errorAlert}>{error}</div>}

      {/* TAB DIVIDER */}
      <div style={styles.tabContainer}>
        <button
          onClick={() => {
            setActiveTab("PARENTS");
            setError("");
          }}
          style={{
            ...styles.tabButton,
            ...(activeTab === "PARENTS" ? styles.activeTab : styles.inactiveTab)
          }}
        >
          <FaUserFriends style={{ marginRight: "8px" }} />
          Parents Meetings
        </button>

        <button
          onClick={() => {
            setActiveTab("STUDENTS");
            setError("");
          }}
          style={{
            ...styles.tabButton,
            ...(activeTab === "STUDENTS" ? styles.activeTab : styles.inactiveTab)
          }}
        >
          <FaUserGraduate style={{ marginRight: "8px" }} />
          Students Meetings
        </button>
      </div>

      {/* MAIN CARD */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <FaVideo style={{ color: "#6366f1", marginRight: "8px" }} />
          <h3 style={styles.cardTitle}>
            {activeTab === "PARENTS" ? "Parents Meeting Schedule" : "Students Meeting Schedule"}
          </h3>
        </div>

        {loading ? (
          <div style={styles.centerMessage}>
            <FaSpinner className="fa-spin" style={{ marginRight: "8px" }} /> Loading meetings...
          </div>
        ) : meetings.length === 0 ? (
          <div style={styles.emptyContainer}>
            <FaVideo style={{ fontSize: "42px", color: "#cbd5e1", marginBottom: "12px" }} />
            <p style={styles.emptyTitle}>No meetings found</p>
            <p style={styles.emptyText}>No {activeTab.toLowerCase()} meetings are scheduled at the moment.</p>
            <button onClick={fetchMeetings} style={styles.emptyRefreshButton}>
              <FaSyncAlt style={{ marginRight: "7px" }} /> Check Again
            </button>
          </div>
        ) : (
          <div style={styles.gridContainer}>
            {meetings.map((meeting, index) => {
              const meetingId = meeting.id || meeting._id || index;

              return (
                <div key={meetingId} style={styles.meetingCard}>
                  <div style={styles.meetingCardHeader}>
                    <span style={styles.badge}>{meeting.status || "UPCOMING"}</span>
                    <span style={styles.sessionBadge}>Session: {meeting.session || "2026-2027"}</span>
                  </div>

                  <h4 style={styles.meetingTitle}>{meeting.title || "Meeting"}</h4>
                  <p style={styles.meetingTopic}>
                    <strong>Topic:</strong> {meeting.topic || "General Discussion"}
                  </p>

                  <div style={styles.meetingMeta}>
                    <div style={styles.metaItem}>
                      <FaCalendarAlt style={{ color: "#6366f1", marginRight: "8px" }} />
                      <span>{formatDate(meeting.meeting_date)}</span>
                    </div>
                    <div style={styles.metaItem}>
                      <FaClock style={{ color: "#6366f1", marginRight: "8px" }} />
                      <span>
                        {meeting.start_time || "--"} - {meeting.end_time || "--"}
                        {meeting.duration_minutes ? ` (${meeting.duration_minutes} mins)` : ""}
                      </span>
                    </div>
                  </div>

                  <div style={styles.cardFooter}>
                    <button
                      onClick={() => handleJoinMeeting(meeting)}
                      disabled={!meeting.meeting_link}
                      style={{
                        ...styles.joinButton,
                        opacity: !meeting.meeting_link ? 0.6 : 1,
                        cursor: !meeting.meeting_link ? "not-allowed" : "pointer"
                      }}
                    >
                      <FaExternalLinkAlt style={{ marginRight: "7px" }} />
                      {meeting.meeting_link ? "Join Meeting" : "Link Not Available"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

const styles = {
  container: { padding: "24px", maxWidth: "1200px", margin: "0 auto", fontFamily: "'Segoe UI', Roboto, sans-serif", color: "#1e293b", background: "#f8fafc", minHeight: "100vh" },
  headerSection: { marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "15px" },
  pageTitle: { fontSize: "28px", fontWeight: "700", color: "#0f172a", margin: "0 0 4px 0" },
  subtitle: { fontSize: "14px", color: "#64748b", margin: 0 },
  refreshButton: { border: "1px solid #cbd5e1", background: "#ffffff", color: "#475569", padding: "10px 15px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", display: "flex", alignItems: "center" },
  tabContainer: { display: "flex", gap: "12px", marginBottom: "24px" },
  tabButton: { flex: 1, padding: "14px 20px", borderRadius: "12px", fontSize: "15px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #cbd5e1", transition: "all 0.2s ease" },
  activeTab: { background: "#6366f1", color: "#ffffff", borderColor: "#6366f1", boxShadow: "0 4px 12px rgba(99, 102, 241, 0.25)" },
  inactiveTab: { background: "#ffffff", color: "#64748b", borderColor: "#e2e8f0" },
  card: { background: "#ffffff", borderRadius: "16px", padding: "24px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)", border: "1px solid #e2e8f0" },
  cardHeader: { display: "flex", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" },
  cardTitle: { fontSize: "18px", fontWeight: "600", color: "#1e293b", margin: 0 },
  gridContainer: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" },
  meetingCard: { background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "20px", display: "flex", flexDirection: "column", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" },
  meetingCardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" },
  badge: { padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "700", background: "#e0f2fe", color: "#0369a1", textTransform: "uppercase" },
  sessionBadge: { fontSize: "12px", color: "#64748b", fontWeight: "600" },
  meetingTitle: { fontSize: "18px", fontWeight: "700", color: "#0f172a", margin: "0 0 6px 0" },
  meetingTopic: { fontSize: "14px", color: "#475569", margin: "0 0 16px 0" },
  meetingMeta: { display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px", background: "#f8fafc", padding: "12px", borderRadius: "8px", fontSize: "13px", color: "#334155" },
  metaItem: { display: "flex", alignItems: "center" },
  cardFooter: { marginTop: "auto", display: "flex", justifyContent: "flex-end" },
  joinButton: { background: "#6366f1", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", width: "100%", boxShadow: "0 2px 4px rgba(99, 102, 241, 0.2)" },
  errorAlert: { background: "#fee2e2", color: "#dc2626", padding: "12px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px", fontWeight: "600" },
  centerMessage: { textAlign: "center", padding: "40px", color: "#64748b", fontSize: "14px" },
  emptyContainer: { textAlign: "center", padding: "50px 20px" },
  emptyTitle: { margin: "0 0 5px", fontSize: "18px", fontWeight: "700", color: "#334155" },
  emptyText: { margin: "0 0 20px", color: "#64748b", fontSize: "14px" },
  emptyRefreshButton: { background: "#6366f1", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }
};

export default StudentsMeetings;