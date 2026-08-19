import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

// =========================================================
// API SETUP
// =========================================================

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
  (error) => Promise.reject(error)
);

// =========================================================
// MAIN COMPONENT
// =========================================================

const StudentsMeetings = () => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("STUDENTS");
  const [currentTime, setCurrentTime] = useState(new Date());

  // Global Clock Timer (updates every second for countdowns)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Meetings from API
  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get(`/meeting/student?type=${activeTab}`);
      const data = response.data;
      let fetchedList = [];

      if (data?.success && Array.isArray(data.meetings)) {
        fetchedList = data.meetings;
      } else if (Array.isArray(data)) {
        fetchedList = data;
      } else if (Array.isArray(data?.data)) {
        fetchedList = data.data;
      }

      // Strict Filtering between Students and Parents (Case-insensitive check)
      const filtered = fetchedList.filter((m) => {
        const rawText = `${m.title || ""} ${m.topic || ""} ${m.type || ""} ${m.category || ""} ${m.meeting_type || ""}`.toLowerCase();
        const isParentMeeting =
          rawText.includes("parent") ||
          rawText.includes("parents") ||
          rawText.includes("pta");

        if (activeTab === "PARENTS") {
          return isParentMeeting;
        } else {
          return !isParentMeeting;
        }
      });

      setMeetings(filtered);
    } catch (err) {
      console.error("FETCH MEETINGS ERROR:", err);
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

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  // Auto Refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMeetings();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchMeetings]);

  // Open Meeting Link
  const handleJoinMeeting = (meeting) => {
    setError("");
    if (meeting.meeting_link) {
      window.open(meeting.meeting_link, "_blank", "noopener,noreferrer");
    } else {
      setError("Meeting link is not available.");
    }
  };

  // Date Parsing Helpers
  const getMeetingDateParts = (meetingDate) => {
    if (!meetingDate) return null;
    const str = String(meetingDate);
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  };

  const parseMeetingTime = (timeString) => {
    if (!timeString) return null;
    let value = String(timeString).trim().toUpperCase().replace(/\s+/g, " ");
    let hours, minutes;

    const twelveHourMatch = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/);
    if (twelveHourMatch) {
      hours = Number(twelveHourMatch[1]);
      minutes = Number(twelveHourMatch[2]);
      const modifier = twelveHourMatch[3];
      if (modifier === "PM" && hours < 12) hours += 12;
      if (modifier === "AM" && hours === 12) hours = 0;
      return { hours, minutes };
    }

    const plainMatch = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (plainMatch) {
      hours = Number(plainMatch[1]);
      minutes = Number(plainMatch[2]);
      if (hours >= 1 && hours <= 11) hours += 12;
      if (hours === 24) hours = 0;
      return { hours, minutes };
    }
    return null;
  };

  const getMeetingDateTime = (meeting, timeString) => {
    const dateParts = getMeetingDateParts(meeting.meeting_date);
    const timeParts = parseMeetingTime(timeString);
    if (!dateParts || !timeParts) return null;
    return new Date(
      dateParts.year,
      dateParts.month - 1,
      dateParts.day,
      timeParts.hours,
      timeParts.minutes,
      0,
      0
    );
  };

  const getMeetingStatus = (meeting) => {
    const startDateTime = getMeetingDateTime(meeting, meeting.start_time);
    const endDateTime = getMeetingDateTime(meeting, meeting.end_time);
    if (!startDateTime || !endDateTime) return "UPCOMING";

    const now = currentTime;
    if (now < startDateTime) return "UPCOMING";
    if (now >= startDateTime && now <= endDateTime) return "STARTED";
    return "DONE";
  };

  // Format Countdown String
  const getCountdownString = (startDateTime) => {
    if (!startDateTime) return "";
    const diff = startDateTime.getTime() - currentTime.getTime();
    if (diff <= 0) return "Starting shortly...";

    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `Starts in: ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
  };

  const formatDate = (date) => {
    if (!date) return "--";
    const parts = getMeetingDateParts(date);
    if (!parts) return "--";
    const localDate = new Date(parts.year, parts.month - 1, parts.day);
    return localDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return "--";
    const parsed = parseMeetingTime(timeString);
    if (!parsed) return timeString;
    const temp = new Date();
    temp.setHours(parsed.hours, parsed.minutes, 0, 0);
    return temp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  // Sort & Categorize Meetings
  const sortedMeetings = [...meetings].sort((a, b) => {
    const statusOrder = { STARTED: 0, UPCOMING: 1, DONE: 2 };
    const statusA = getMeetingStatus(a);
    const statusB = getMeetingStatus(b);
    if (statusOrder[statusA] !== statusOrder[statusB]) {
      return statusOrder[statusA] - statusOrder[statusB];
    }
    return (getMeetingDateTime(a, a.start_time)?.getTime() || 0) - (getMeetingDateTime(b, b.start_time)?.getTime() || 0);
  });

  const startedMeetings = sortedMeetings.filter((m) => getMeetingStatus(m) === "STARTED");
  const upcomingMeetings = sortedMeetings.filter((m) => getMeetingStatus(m) === "UPCOMING");
  const completedMeetings = sortedMeetings.filter((m) => getMeetingStatus(m) === "DONE");

  // Render Individual Meeting Item
  const renderMeetingRow = (meeting, index) => {
    const meetingId = meeting.id || meeting._id || index;
    const status = getMeetingStatus(meeting);
    const startDateTime = getMeetingDateTime(meeting, meeting.start_time);

    return (
      <div
        key={meetingId}
        style={{
          ...styles.listItem,
          ...(status === "STARTED" ? styles.listStarted : status === "DONE" ? styles.listDone : {}),
        }}
      >
        <div style={styles.listMainInfo}>
          <div style={styles.badgeWrapper}>
            {status === "STARTED" && <span style={styles.badgeLive}>LIVE SESSION</span>}
            {status === "UPCOMING" && <span style={styles.badgeUpcoming}>UPCOMING</span>}
            {status === "DONE" && <span style={styles.badgeDone}>CONCLUDED</span>}
            <span style={styles.sessionTag}>Session: {meeting.session || "2026-2027"}</span>
          </div>

          <h4 style={styles.listTitle}>{meeting.title || "Scheduled Meeting"}</h4>
          <p style={styles.listTopic}>
            <strong>Topic:</strong> {meeting.topic || "General Discussion"}
          </p>
        </div>

        <div style={styles.listMetaInfo}>
          <div style={styles.metaText}>
            <span>Date: {formatDate(meeting.meeting_date)}</span>
            <span>Time: {formatTime(meeting.start_time)} - {formatTime(meeting.end_time)}</span>
          </div>

          {status === "UPCOMING" && (
            <div style={styles.countdownText}>
              {getCountdownString(startDateTime)}
            </div>
          )}

          <button
            onClick={() => handleJoinMeeting(meeting)}
            disabled={!meeting.meeting_link || status === "DONE"}
            style={{
              ...styles.actionButton,
              ...(status === "DONE" || !meeting.meeting_link ? styles.buttonDisabled : {}),
            }}
          >
            {status === "DONE"
              ? "Completed"
              : status === "STARTED"
              ? "Join Live"
              : meeting.meeting_link
              ? "Join Room"
              : "Pending Link"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Top Header - Polished & Modernized Banner */}
      <div style={styles.header}>
        <div style={styles.headerLeftContent}>
          <div style={styles.brandIconWrapper}>
            <span style={styles.brandIconText}>SC</span>
          </div>
          <div>
            <h1 style={styles.title}>Smart Students Classes</h1>
            <p style={styles.subtitle}>Institutional Virtual Meeting & Lecture Management Portal</p>
          </div>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.clockBadge}>
            <span style={styles.clockDot}></span>
            {currentTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
          </div>
          <button onClick={fetchMeetings} disabled={loading} style={styles.refreshBtn}>
            {loading ? "Syncing..." : "Refresh Portal"}
          </button>
        </div>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {/* Tabs */}
      <div style={styles.tabNav}>
        <button
          onClick={() => { setActiveTab("STUDENTS"); setError(""); }}
          style={{ ...styles.tabItem, ...(activeTab === "STUDENTS" ? styles.tabActive : {}) }}
        >
          Students Meetings
        </button>
        <button
          onClick={() => { setActiveTab("PARENTS"); setError(""); }}
          style={{ ...styles.tabItem, ...(activeTab === "PARENTS" ? styles.tabActive : {}) }}
        >
          Parents Meetings (PTA)
        </button>
      </div>

      {/* Content Container */}
      <div style={styles.contentCard}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardHeading}>
            {activeTab === "PARENTS" ? "Parent-Teacher Conferences" : "Student Meetings Records"}
          </h3>
          <span style={styles.countIndicator}>{meetings.length} Total Records</span>
        </div>

        {loading ? (
          <div style={styles.statusMessage}>Retrieving records from database...</div>
        ) : meetings.length === 0 ? (
          <div style={styles.statusMessage}>No meetings scheduled under this category.</div>
        ) : (
          <div style={styles.listContainer}>
            {startedMeetings.length > 0 && (
              <div style={styles.sectionGroup}>
                <h5 style={{ ...styles.sectionTitle, color: "#047857" }}>Active Live Sessions</h5>
                {startedMeetings.map(renderMeetingRow)}
              </div>
            )}

            {upcomingMeetings.length > 0 && (
              <div style={styles.sectionGroup}>
                <h5 style={{ ...styles.sectionTitle, color: "#b45309" }}>Upcoming Schedule</h5>
                {upcomingMeetings.map(renderMeetingRow)}
              </div>
            )}

            {completedMeetings.length > 0 && (
              <div style={styles.sectionGroup}>
                <h5 style={{ ...styles.sectionTitle, color: "#475569" }}>Completed Archives</h5>
                {completedMeetings.map(renderMeetingRow)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// =========================================================
// PROFESSIONAL STYLING (Corporate & Clean)
// =========================================================

const styles = {
  container: {
    padding: "36px 32px",
    maxWidth: "1140px",
    margin: "0 auto",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    backgroundColor: "#f8fafc",
    color: "#0f172a",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "28px",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "20px 24px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.01)",
    flexWrap: "wrap",
    gap: "16px",
  },
  headerLeftContent: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  brandIconWrapper: {
    width: "48px",
    height: "48px",
    borderRadius: "10px",
    backgroundColor: "#213f86",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxShadow: "0 2px 4px rgba(15, 23, 42, 0.15)",
  },
  brandIconText: {
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: "700",
    letterSpacing: "0.5px",
  },
  title: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "0 0 2px 0",
    letterSpacing: "-0.4px",
  },
  subtitle: {
    fontSize: "12px",
    color: "#64748b",
    margin: 0,
    fontWeight: "500",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  clockBadge: {
    fontSize: "13px",
    fontWeight: "600",
    backgroundColor: "#f8fafc",
    color: "#334155",
    padding: "8px 14px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  clockDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#10b981",
    boxShadow: "0 0 0 2px rgba(16, 185, 129, 0.2)",
  },
  refreshBtn: {
    backgroundColor: "#0f172a",
    color: "#ffffff",
    border: "none",
    padding: "9px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s",
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    color: "#991b1b",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "20px",
    fontSize: "13px",
    border: "1px solid #fecaca",
  },
  tabNav: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
    borderBottom: "1px solid #e2e8f0",
    paddingBottom: "14px",
  },
  tabItem: {
    padding: "9px 20px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#475569",
    transition: "all 0.15s ease",
  },
  tabActive: {
    backgroundColor: "#b9ea28",
    color: "#1c1717",
    borderColor: "#0f172a",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.1)",
  },
  contentCard: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
    overflow: "hidden",
  },
  cardHeader: {
    padding: "18px 24px",
    backgroundColor: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardHeading: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#1e293b",
    margin: 0,
  },
  countIndicator: {
    fontSize: "12px",
    color: "#64748b",
    fontWeight: "500",
  },
  listContainer: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  sectionGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  sectionTitle: {
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    margin: "4px 0",
  },
  listItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    backgroundColor: "#ffffff",
    gap: "16px",
    flexWrap: "wrap",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  },
  listStarted: {
    borderColor: "#10b981",
    backgroundColor: "#f0fdf4",
    boxShadow: "0 0 0 1px #10b981 inset",
  },
  listDone: {
    backgroundColor: "#f8fafc",
    opacity: 0.8,
  },
  listMainInfo: {
    flex: 1,
    minWidth: "260px",
  },
  badgeWrapper: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    marginBottom: "8px",
  },
  badgeLive: {
    fontSize: "10px",
    fontWeight: "700",
    backgroundColor: "#10b981",
    color: "#ffffff",
    padding: "3px 8px",
    borderRadius: "4px",
    letterSpacing: "0.5px",
  },
  badgeUpcoming: {
    fontSize: "10px",
    fontWeight: "700",
    backgroundColor: "#f59e0b",
    color: "#ffffff",
    padding: "3px 8px",
    borderRadius: "4px",
    letterSpacing: "0.5px",
  },
  badgeDone: {
    fontSize: "10px",
    fontWeight: "700",
    backgroundColor: "#64748b",
    color: "#ffffff",
    padding: "3px 8px",
    borderRadius: "4px",
    letterSpacing: "0.5px",
  },
  sessionTag: {
    fontSize: "11px",
    color: "#64748b",
    fontWeight: "500",
  },
  listTitle: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#0f172a",
    margin: "0 0 3px 0",
  },
  listTopic: {
    fontSize: "13px",
    color: "#475569",
    margin: 0,
  },
  listMetaInfo: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
  },
  metaText: {
    display: "flex",
    flexDirection: "column",
    fontSize: "12px",
    color: "#475569",
    fontWeight: "500",
    gap: "2px",
  },
  countdownText: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#d97706",
    backgroundColor: "#fef3c7",
    padding: "6px 10px",
    borderRadius: "6px",
    border: "1px solid #fde68a",
  },
  actionButton: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    padding: "9px 16px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.15s",
  },
  buttonDisabled: {
    backgroundColor: "#cbd5e1",
    color: "#64748b",
    cursor: "not-allowed",
  },
  statusMessage: {
    padding: "48px",
    textAlign: "center",
    color: "#64748b",
    fontSize: "13px",
  },
};

export default StudentsMeetings;