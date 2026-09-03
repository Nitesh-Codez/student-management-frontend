import React, { useState, useEffect } from "react";
import api from "../../services/api";
import {
  FaGraduationCap,
  FaCalendarCheck,
  FaChartBar,
  FaTasks,
  FaMicrophoneAlt,
  FaChevronRight,
  FaFilter,
  FaClock,
  FaUserCircle,
  FaCheckCircle,
  FaAward,
  FaBookOpen,
  FaShieldAlt,
  FaSmile,
  FaStar,
  FaFilePdf,
  FaImage,
  FaDownload,
  FaExternalLinkAlt,
  FaCalendarAlt
} from "react-icons/fa";

const StudentInternal = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [subjects, setSubjects] = useState([]);
  const [marksData, setMarksData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [examType, setExamType] = useState("PRE-FINAL");

  // ==================================================
  // NEW: Academic Documents
  // ==================================================
  const [examDocuments, setExamDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  // ==================================================
  // Fetch Student Marks
  // ==================================================
  const fetchStudentMarks = async () => {
    if (!user.id) return;

    try {
      const res = await api.get(
        `/api/new-marks/current-session-internal-marks/${user.id}`
      );

      if (res.data && res.data.success) {
        setMarksData(res.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching internal marks:", error);
    }
  };

  // ==================================================
// NEW: Fetch Exam Syllabus / Timetable
// ==================================================
const fetchExamDocuments = async () => {
  const userData = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const studentClass =
    userData.class ||
    userData.className ||
    userData.class_name;

  if (!studentClass) {
    console.error("Student class not found in localStorage");
    setExamDocuments([]);
    return;
  }

  try {
    setDocumentsLoading(true);

    const res = await api.get(
      "/api/exams-details/documents",
      {
        params: {
          class_name: studentClass,
          exam_type: examType
        }
      }
    );

    if (res.data?.success) {
      setExamDocuments(
        res.data.data || res.data.documents || []
      );
    } else {
      setExamDocuments([]);
    }
  } catch (error) {
    console.error(
      "Error fetching exam documents:",
      error
    );
    setExamDocuments([]);
  } finally {
    setDocumentsLoading(false);
  }
};
  // ==================================================
  // Fetch Subjects + Marks + Documents
  // ==================================================
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      await fetchStudentMarks();
      await fetchExamDocuments();

      try {
        const res = await api.get(
          `/api/students/my-exam-details`,
          {
            params: {
              student_id: user.id,
              exam_type: examType
            }
          }
        );

        const serverSubjects =
          res.data?.subjects ||
          res.data?.data?.subjects;

        if (
          serverSubjects &&
          Array.isArray(serverSubjects) &&
          serverSubjects.length > 0
        ) {
          setSubjects(serverSubjects);
        } else {
          setSubjects([]);
        }
      } catch (error) {
        console.error("Error fetching exam details:", error);
        setSubjects([]);
      } finally {
        setLoading(false);
      }
    };

    if (user.id) {
      fetchData();
    }
  }, [examType]);

  // ==================================================
  // Helper: Subject Marks
  // ==================================================
  const getMarksForSubject = (subjectName) => {
    return marksData.find(
      (m) =>
        m.subject &&
        m.subject.toLowerCase() ===
          subjectName.toLowerCase() &&
        m.exam_type &&
        m.exam_type.toUpperCase() ===
          examType.toUpperCase()
    );
  };

  // ==================================================
  // NEW: Find Syllabus
  // ==================================================
  const syllabusDocument = examDocuments.find(
    (doc) =>
      String(doc.document_type || "").toUpperCase() ===
      "SYLLABUS"
  );

  // ==================================================
  // NEW: Find Timetable
  // ==================================================
  const timetableDocument = examDocuments.find(
    (doc) =>
      String(doc.document_type || "").toUpperCase() ===
      "TIMETABLE"
  );

  // ==================================================
  // Document Viewer
  // ==================================================
  const openDocument = (document) => {
    if (!document?.file_path) {
      alert("Document file is not available.");
      return;
    }

    window.open(
      document.file_path,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // ==================================================
  // Document Card
  // ==================================================
  const DocumentCard = ({
    title,
    document,
    icon,
    description
  }) => {
    const fileUrl = document?.file_path;

    return (
      <div style={styles.documentCard}>
        <div style={styles.documentIcon}>
          {icon}
        </div>

        <div style={styles.documentContent}>
          <h3 style={styles.documentTitle}>
            {title}
          </h3>

          <p style={styles.documentDescription}>
            {document?.title ||
              description}
          </p>

          {document?.uploaded_at && (
            <div style={styles.uploadedDate}>
              <FaCalendarAlt size={10} />
              <span>
                Uploaded:{" "}
                {new Date(
                  document.uploaded_at
                ).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        <div style={styles.documentActions}>
          {fileUrl ? (
            <>
              <button
                style={styles.viewDocumentBtn}
                onClick={() =>
                  openDocument(document)
                }
              >
                <FaExternalLinkAlt size={11} />
                View
              </button>

              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.downloadBtn}
              >
                <FaDownload size={11} />
              </a>
            </>
          ) : (
            <span style={styles.pendingDocument}>
              Not Available
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.pageContainer}>

      {/* ==================================================
          TOP BRANDING
      ================================================== */}
      <div style={styles.topHeaderBanner}>

        <div style={styles.brandTitleRow}>

          <div style={styles.brandGroup}>

            <div style={styles.brandLogoIcon}>
              <FaStar
                color="#ffffff"
                size={14}
              />
            </div>

            <h1 style={styles.brandName}>
              Smart
              <span style={{ color: "#2563eb" }}>
                Zone
              </span>
            </h1>

          </div>

          <div style={styles.sessionBadge}>
            <FaAward
              color="#d97706"
              size={14}
            />

            <span>
              Session: 2026-27
            </span>
          </div>

        </div>

        <div style={styles.bannerContent}>

          <div style={styles.bannerLeft}>

            <div style={styles.avatarBox}>
              <FaUserCircle
                size={38}
                color="#2563eb"
              />
            </div>

            <div>

              <h2 style={styles.welcomeText}>
                Welcome back,{" "}
                {user.name || "Student"}!
              </h2>

              <p style={styles.rollText}>
                ID: {user.id || "-"} &bull; Class:{" "}
                {user.className || "-"}
              </p>

            </div>

          </div>

          <div style={styles.portalSecurityBadge}>
            <FaShieldAlt
              color="#059669"
              size={13}
            />

            <span>
              Verified Secure Portal
            </span>
          </div>

        </div>
      </div>

      {/* ==================================================
          MAIN TITLE + EXAM FILTER
      ================================================== */}
      <div style={styles.headerContainer}>

        <div>

          <h2 style={styles.mainTitle}>
            Internal Assessments
          </h2>

          <p style={styles.subTitle}>
            Analytics Dashboard for:{" "}
            <span
              style={{
                color: "#2563eb",
                fontWeight: "700"
              }}
            >
              {examType}
            </span>
          </p>

        </div>

        <div style={styles.examSelectorBox}>

          <div style={styles.filterIconWrapper}>
            <FaFilter
              color="#2563eb"
              size={13}
            />
          </div>

          <span style={styles.selectorLabel}>
            Exam Period:
          </span>

          <select
            value={examType}
            onChange={(e) =>
              setExamType(e.target.value)
            }
            style={styles.dropdown}
          >
            <option value="PRE-FINAL">
              PRE-FINAL
            </option>

            <option value="FINAL">
              FINAL
            </option>

            <option value="REAPPEAR 1">
              REAPPEAR 1
            </option>

            <option value="REAPPEAR 2">
              REAPPEAR 2
            </option>
          </select>

        </div>
      </div>

      {/* ==================================================
          NEW: EXAM DOCUMENTS
      ================================================== */}
      <div style={styles.documentsSection}>

        <div style={styles.documentsHeader}>

          <div>
            <h2 style={styles.documentsMainTitle}>
              <FaBookOpen
                size={16}
                color="#2563eb"
              />

              Exam Documents
            </h2>

            <p style={styles.documentsSubTitle}>
              {examType} examination documents
            </p>
          </div>

          <div style={styles.examBadge}>
            {examType}
          </div>

        </div>

        {documentsLoading ? (

          <div style={styles.documentLoading}>
            Loading exam documents...
          </div>

        ) : (

          <div style={styles.documentsGrid}>

            {/* SYLLABUS */}

            <DocumentCard
              title="Exam Syllabus"
              document={syllabusDocument}
              icon={
                <FaBookOpen
                  size={22}
                  color="#2563eb"
                />
              }
              description={
                `View ${examType} examination syllabus`
              }
            />

            {/* TIMETABLE */}

            <DocumentCard
              title="Exam Timetable"
              document={timetableDocument}
              icon={
                <FaClock
                  size={22}
                  color="#059669"
                />
              }
              description={
                `View ${examType} examination timetable`
              }
            />

          </div>
        )}

      </div>

      {/* ==================================================
          NOTICE
      ================================================== */}
      <div style={styles.timeTableBox}>

        <div style={styles.timeTableInner}>

          <div style={styles.timeTableIconWrapper}>
            <FaClock
              color="#059669"
              size={16}
            />
          </div>

          <div>

            <h3 style={styles.timeTableTitle}>
              Schedule Announcement —{" "}
              {examType}
            </h3>

            <p style={styles.timeTableDesc}>
              Examination schedules and hall
              allocations are live. Keep track
              of your deadlines and score updates
              below.
            </p>

          </div>

        </div>

        <div style={styles.statusPill}>

          <FaCheckCircle
            color="#059669"
            size={12}
          />

          <span>
            Live Sync
          </span>

        </div>

      </div>

      {/* ==================================================
          MARKS
      ================================================== */}
      {loading ? (

        <div style={styles.loaderContainer}>

          <div style={styles.spinner}></div>

          <p style={styles.loaderText}>
            Securely loading {examType} reports...
          </p>

        </div>

      ) : subjects.length === 0 ? (

        <div style={styles.noDataContainer}>

          <div style={styles.noDataIconBox}>
            <FaBookOpen
              size={32}
              color="#64748b"
            />
          </div>

          <h3 style={styles.noDataTitle}>
            No Records Found
          </h3>

          <p style={styles.noDataText}>
            No subjects are mapped for the{" "}
            <b>{examType}</b> assessment phase
            under your current profile.
          </p>

        </div>

      ) : (

        <div style={styles.courseGrid}>

          {subjects.map((subject, index) => {

            const m =
              getMarksForSubject(subject);

            const calculatedInternalTotal =
              m?.total_marks !== undefined &&
              m?.total_marks !== null &&
              m?.total_marks !== ""
                ? (
                    Number(m.task || 0) +
                    Number(m.viva_marks || 0) +
                    Number(m.behaviour || 0) +
                    Number(m.attendance_marks || 0)
                  ).toFixed(2)
                : null;

            return (

              <div
                key={index}
                style={styles.subjectCard}
              >

                {/* SUBJECT HEADER */}

                <div style={styles.cardHeader}>

                  <div style={styles.cardHeaderIcon}>
                    <FaGraduationCap
                      size={16}
                      color="#ffffff"
                    />
                  </div>

                  <h3 style={styles.subName}>
                    {subject.toUpperCase()}
                  </h3>

                </div>

                {/* OPTIONS */}

                <div style={styles.optionsList}>

                  <OptionItem
                    icon={
                      <FaCalendarCheck
                        size={12}
                      />
                    }
                    label="Attendance"
                    value={
                      m?.attendance_marks !==
                        undefined &&
                      m?.attendance_marks !== null
                        ? `${m.attendance_marks} / 5`
                        : null
                    }
                  />

                  <OptionItem
                    icon={
                      <FaTasks size={12} />
                    }
                    label="Task Score"
                    value={
                      m?.task !== undefined &&
                      m?.task !== null
                        ? `${m.task}`
                        : null
                    }
                  />

                  <OptionItem
                    icon={
                      <FaSmile size={12} />
                    }
                    label="Behaviour"
                    value={
                      m?.behaviour !== undefined &&
                      m?.behaviour !== null
                        ? `${m.behaviour}`
                        : null
                    }
                  />

                  <OptionItem
                    icon={
                      <FaMicrophoneAlt
                        size={12}
                      />
                    }
                    label="Viva Voce"
                    value={
                      m?.viva_marks !==
                        undefined &&
                      m?.viva_marks !== null
                        ? `${m.viva_marks}`
                        : null
                    }
                  />

                  <OptionItem
                    icon={
                      <FaChartBar
                        size={12}
                      />
                    }
                    label="Overall Total"
                    value={
                      calculatedInternalTotal !==
                      null
                        ? `${calculatedInternalTotal} / 25`
                        : null
                    }
                    highlight={true}
                  />

                </div>

                {/* BUTTON */}

                <button
                  style={styles.viewBtn}
                  onClick={() =>
                    alert(
                      `Detailed breakdown for ${subject.toUpperCase()} - ${examType}`
                    )
                  }
                >

                  <span>
                    Detailed Analytics
                  </span>

                  <FaChevronRight size={9} />

                </button>

              </div>
            );
          })}

        </div>
      )}

      {/* FOOTER */}

      <div style={styles.footerNote}>
        <p>
          Smart Student Management System
          &copy; 2026 &bull; All Rights Reserved
        </p>
      </div>

    </div>
  );
};


// ==================================================
// REUSABLE OPTION ITEM
// ==================================================
const OptionItem = ({
  icon,
  label,
  value,
  highlight
}) => (

  <div
    style={{
      ...styles.optionRow,
      background: highlight
        ? "#eff6ff"
        : "#f8fafc",
      borderColor: highlight
        ? "#bfdbfe"
        : "#f1f5f9"
    }}
  >

    <div style={styles.optionRowLeft}>

      <span style={styles.iconBox}>
        {icon}
      </span>

      <span
        style={{
          ...styles.optLabel,
          color: highlight
            ? "#1e40af"
            : "#334155"
        }}
      >
        {label}
      </span>

    </div>

    <span
      style={{
        ...styles.optValue,

        color:
          value !== null &&
          value !== undefined
            ? highlight
              ? "#1d4ed8"
              : "#0f172a"
            : "#d97706",

        background:
          value !== null &&
          value !== undefined
            ? highlight
              ? "#dbeafe"
              : "#f1f5f9"
            : "#fffbeb",

        border:
          value !== null &&
          value !== undefined
            ? highlight
              ? "1px solid #93c5fd"
              : "1px solid #e2e8f0"
            : "1px solid #fde68a"
      }}
    >
      {value !== null &&
      value !== undefined
        ? value
        : "Pending"}
    </span>

  </div>
);


// ==================================================
// STYLES
// ==================================================
const styles = {

  pageContainer: {
    padding: "25px 30px",
    background:
      "linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)",
    minHeight: "100vh",
    fontFamily:
      "'Inter', system-ui, -apple-system, sans-serif",
    boxSizing: "border-box"
  },

  topHeaderBanner: {
    background: "#ffffff",
    borderRadius: "14px",
    padding: "16px 22px",
    boxShadow:
      "0 4px 15px -3px rgba(0, 0, 0, 0.05)",
    marginBottom: "20px",
    border:
      "1px solid rgba(226, 232, 240, 0.8)"
  },

  brandTitleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
    borderBottom:
      "1px solid #f1f5f9",
    paddingBottom: "10px"
  },

  brandGroup: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },

  brandLogoIcon: {
    background: "#2563eb",
    padding: "6px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },

  brandName: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: "-0.02em"
  },

  bannerContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px"
  },

  bannerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },

  avatarBox: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid #bfdbfe"
  },

  welcomeText: {
    margin: "0 0 2px 0",
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: "-0.01em"
  },

  rollText: {
    margin: 0,
    fontSize: "12px",
    color: "#64748b",
    fontWeight: "500"
  },

  sessionBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "#fffbeb",
    border: "1px solid #fef3c7",
    padding: "4px 10px",
    borderRadius: "16px",
    fontSize: "11px",
    fontWeight: "700",
    color: "#b45309"
  },

  portalSecurityBadge: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    background: "#f0fdf4",
    border: "1px solid #d1fae5",
    padding: "4px 10px",
    borderRadius: "16px",
    fontSize: "11px",
    fontWeight: "700",
    color: "#065f46"
  },

  headerContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "15px",
    background: "#ffffff",
    padding: "16px 22px",
    borderRadius: "14px",
    boxShadow:
      "0 4px 10px -2px rgba(0, 0, 0, 0.03)",
    border: "1px solid #e2e8f0"
  },

  mainTitle: {
    color: "#0f172a",
    margin: 0,
    borderLeft: "4px solid #2563eb",
    paddingLeft: "10px",
    fontSize: "17px",
    fontWeight: "800",
    letterSpacing: "-0.01em"
  },

  subTitle: {
    color: "#64748b",
    margin: "3px 0 0 14px",
    fontSize: "12px",
    fontWeight: "500"
  },

  examSelectorBox: {
    display: "flex",
    alignItems: "center",
    background: "#f8fafc",
    padding: "6px 10px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    gap: "8px"
  },

  filterIconWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },

  selectorLabel: {
    fontWeight: "600",
    fontSize: "12px",
    color: "#334155"
  },

  dropdown: {
    padding: "5px 10px",
    borderRadius: "6px",
    border: "1px solid #94a3b8",
    background: "#ffffff",
    fontWeight: "700",
    color: "#1e3a8a",
    cursor: "pointer",
    outline: "none",
    fontSize: "12px"
  },

  // ==================================================
  // DOCUMENT STYLES
  // ==================================================

  documentsSection: {
    background: "#ffffff",
    borderRadius: "14px",
    padding: "18px 20px",
    marginBottom: "20px",
    border: "1px solid #e2e8f0",
    boxShadow:
      "0 5px 15px rgba(0,0,0,0.03)"
  },

  documentsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
    flexWrap: "wrap",
    gap: "10px"
  },

  documentsMainTitle: {
    margin: 0,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "16px",
    color: "#0f172a",
    fontWeight: "800"
  },

  documentsSubTitle: {
    margin: "4px 0 0 24px",
    fontSize: "11px",
    color: "#64748b"
  },

  examBadge: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1d4ed8",
    padding: "5px 12px",
    borderRadius: "15px",
    fontSize: "10px",
    fontWeight: "800"
  },

  documentsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "12px"
  },

  documentCard: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "13px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    background: "#f8fafc"
  },

  documentIcon: {
    width: "42px",
    height: "42px",
    minWidth: "42px",
    borderRadius: "10px",
    background: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #e2e8f0"
  },

  documentContent: {
    flex: 1,
    minWidth: 0
  },

  documentTitle: {
    margin: 0,
    fontSize: "13px",
    fontWeight: "800",
    color: "#0f172a"
  },

  documentDescription: {
    margin: "3px 0",
    fontSize: "10px",
    color: "#64748b",
    lineHeight: "1.4"
  },

  uploadedDate: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "9px",
    color: "#94a3b8"
  },

  documentActions: {
    display: "flex",
    alignItems: "center",
    gap: "5px"
  },

  viewDocumentBtn: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "7px 10px",
    borderRadius: "6px",
    fontSize: "10px",
    fontWeight: "700",
    cursor: "pointer"
  },

  downloadBtn: {
    width: "28px",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#ecfdf5",
    color: "#059669",
    border: "1px solid #a7f3d0",
    borderRadius: "6px",
    textDecoration: "none"
  },

  pendingDocument: {
    fontSize: "9px",
    color: "#d97706",
    background: "#fffbeb",
    border: "1px solid #fde68a",
    padding: "5px 7px",
    borderRadius: "5px",
    fontWeight: "700"
  },

  documentLoading: {
    textAlign: "center",
    padding: "20px",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "600"
  },

  // ==================================================
  // EXISTING STYLES
  // ==================================================

  timeTableBox: {
    background:
      "linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%)",
    padding: "14px 20px",
    borderRadius: "14px",
    marginBottom: "20px",
    borderLeft: "5px solid #059669",
    boxShadow:
      "0 4px 10px rgba(5, 150, 105, 0.03)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    border: "1px solid #d1fae5"
  },

  timeTableInner: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px"
  },

  timeTableIconWrapper: {
    background: "#d1fae5",
    padding: "8px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },

  timeTableTitle: {
    margin: "0 0 2px 0",
    fontSize: "13px",
    fontWeight: "700",
    color: "#065f46"
  },

  timeTableDesc: {
    fontSize: "12px",
    color: "#047857",
    margin: 0,
    fontWeight: "500"
  },

  statusPill: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    background: "#ffffff",
    padding: "4px 10px",
    borderRadius: "16px",
    border: "1px solid #a7f3d0",
    fontSize: "11px",
    fontWeight: "700",
    color: "#065f46"
  },

  loaderContainer: {
    height: "35vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "12px"
  },

  spinner: {
    width: "36px",
    height: "36px",
    border: "3px solid #e2e8f0",
    borderTop: "3px solid #2563eb",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite"
  },

  loaderText: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#475569"
  },

  noDataContainer: {
    background: "#ffffff",
    maxWidth: "400px",
    margin: "40px auto",
    padding: "30px 20px",
    borderRadius: "16px",
    textAlign: "center",
    boxShadow:
      "0 10px 15px -3px rgba(0, 0, 0, 0.04)",
    border: "1px solid #e2e8f0"
  },

  noDataIconBox: {
    width: "60px",
    height: "60px",
    background: "#f1f5f9",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 14px auto"
  },

  noDataTitle: {
    color: "#0f172a",
    margin: "0 0 8px 0",
    fontSize: "16px",
    fontWeight: "700"
  },

  noDataText: {
    color: "#64748b",
    fontSize: "12px",
    margin: 0,
    lineHeight: "1.5",
    fontWeight: "500"
  },

  courseGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "18px"
  },

  subjectCard: {
    background: "#ffffff",
    borderRadius: "14px",
    padding: "16px",
    boxShadow:
      "0 6px 15px -3px rgba(0, 0, 0, 0.04)",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    transition: "transform 0.2s ease"
  },

  cardHeader: {
    background:
      "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
    padding: "10px 14px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "12px",
    boxShadow:
      "0 2px 4px rgba(37, 99, 235, 0.1)"
  },

  cardHeaderIcon: {
    background:
      "rgba(255, 255, 255, 0.15)",
    padding: "6px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },

  subName: {
    color: "#ffffff",
    margin: 0,
    fontSize: "13px",
    fontWeight: "700",
    letterSpacing: "0.3px"
  },

  optionsList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "14px"
  },

  optionRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 10px",
    borderRadius: "8px",
    border: "1px solid #f1f5f9"
  },

  optionRowLeft: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },

  iconBox: {
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    background: "#eff6ff",
    padding: "5px",
    borderRadius: "5px"
  },

  optLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#334155"
  },

  optValue: {
    fontSize: "12px",
    fontWeight: "700",
    padding: "3px 8px",
    borderRadius: "5px"
  },

  viewBtn: {
    width: "100%",
    padding: "9px",
    background:
      "linear-gradient(135deg, #059669 0%, #10b981 100%)",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontWeight: "700",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    fontSize: "12px",
    boxShadow:
      "0 2px 4px rgba(5, 150, 105, 0.15)"
  },

  footerNote: {
    textAlign: "center",
    marginTop: "30px",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "500",
    borderTop: "1px solid #cbd5e1",
    paddingTop: "15px"
  }
};

export default StudentInternal;