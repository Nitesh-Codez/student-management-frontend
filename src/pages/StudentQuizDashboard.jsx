import React, { useEffect, useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";

const StudentQuizDashboard = () => {
  const navigate = useNavigate();

  // User session details
  const user = JSON.parse(localStorage.getItem("user"));
  const studentId = user?.id || user?._id;
  const userClass = user?.class;
  const userSession = user?.session;
  const userStream = user?.stream;

  const [quizzes, setQuizzes] = useState([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [activeSubject, setActiveSubject] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Injecting Professional Clean Typography & Hover Animations
    const styleSheet = document.createElement("style");
    styleSheet.innerText = `
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
      body { margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; background-color: #F8FAFC; color: #1E293B; }
      .no-scrollbar::-webkit-scrollbar { display: none; }
      
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .quiz-card { 
        animation: fadeIn 0.35s ease-out forwards; 
        transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease; 
      }
      .quiz-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 30px -8px rgba(0, 0, 0, 0.08);
        border-color: #CBD5E1;
      }
      
      .hover-text-transition {
        transition: color 0.3s ease, transform 0.3s ease;
      }
      .hover-text-transition:hover {
        color: #4F46E5;
        transform: translateX(4px);
      }

      .certificate-btn {
        transition: all 0.2s ease;
      }
      .certificate-btn:hover {
        background-color: #047857 !important;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .spinner { animation: spin 1s linear infinite; }
    `;
    document.head.appendChild(styleSheet);

    if (!userClass || !studentId) {
      setError("Session expired. Please login again.");
      setLoading(false);
      return;
    }

    const fetchQuizzes = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/quiz/class/${userClass}`, {
          params: { session: userSession, stream: userStream }
        });

        const statusRequests = res.data.map((quiz) =>
          api.get(`/api/quiz/status/${quiz.id}/${studentId}`)
        );

        const statusResults = await Promise.all(statusRequests);

        const updatedQuizzes = res.data.map((quiz, index) => ({
          ...quiz,
          attempted: statusResults[index].data.attempted,
          result: statusResults[index].data.result || null,
        }));

        setQuizzes(updatedQuizzes);
        setFilteredQuizzes(updatedQuizzes);
        setSubjects(["All", ...new Set(updatedQuizzes.map(q => q.subject))]);
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch dashboard data.");
        setLoading(false);
      }
    };

    fetchQuizzes();
    return () => document.head.removeChild(styleSheet);
  }, [userClass, studentId, userSession, userStream]);

  const handleSubjectFilter = (sub) => {
    setActiveSubject(sub);
    setFilteredQuizzes(sub === "All" ? quizzes : quizzes.filter(q => q.subject === sub));
  };

  // Professional Certificate Generator PDF Function
  const generateCertificate = (quizTitle, scorePercent, grade) => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    // Outer Border Frame
    doc.setLineWidth(1.5);
    doc.setDrawColor(15, 23, 42); // Slate 900
    doc.rect(10, 10, 277, 190);

    doc.setLineWidth(0.5);
    doc.setDrawColor(79, 70, 229); // Indigo 600
    doc.rect(13, 13, 271, 184);

    // Header Branding
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    doc.text("SMART STUDENT CLASSES", 148, 28, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("EXCELLENCE IN ACADEMIC ASSESSMENT & ACHIEVEMENT", 148, 35, { align: "center" });

    // Certificate Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(30);
    doc.setTextColor(79, 70, 229);
    doc.text("CERTIFICATE OF MERIT", 148, 52, { align: "center" });

    doc.setFont("helvetica", "italic");
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text("This prestigious award is proudly presented to", 148, 62, { align: "center" });

    // Student Name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(15, 23, 42);
    doc.text(user?.name || "Valued Student", 148, 76, { align: "center" });

    // Description text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `For exceptional performance, dedication, and successfully clearing the assessment module`,
      148, 88, { align: "center" }
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(`"${quizTitle}"`, 148, 97, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `with a remarkable score of ${scorePercent}% (Grade: ${grade}), demonstrating outstanding mastery.`,
      148, 106, { align: "center" }
    );

    // Stats / Badges box layout
    doc.setLineWidth(0.3);
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(64, 118, 168, 22, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229);
    doc.text(`CLASS: ${userClass || 'N/A'}`, 90, 131, { align: "center" });
    doc.text(`FINAL SCORE: ${scorePercent}%`, 148, 131, { align: "center" });
    doc.text(`GRADE ACHIEVED: ${grade}`, 210, 131, { align: "center" });

    // Footer Signatures & Authority
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Date of Issue: " + new Date().toLocaleDateString(), 55, 172, { align: "center" });
    doc.line(30, 166, 80, 166);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Student Record", 55, 178, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Authorized Signature", 242, 172, { align: "center" });
    doc.line(215, 166, 267, 166);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Smart Student Classes Authority", 242, 178, { align: "center" });

    // Save PDF
    doc.save(`Certificate_${(user?.name || "Student").replace(/\s+/g, "_")}_${quizTitle.replace(/\s+/g, "_")}.pdf`);
  };

  // Calculations for Stats Summary
  const totalQuizzes = quizzes.length;
  const completedQuizzes = quizzes.filter(q => q.attempted).length;
  const pendingQuizzes = totalQuizzes - completedQuizzes;

  if (loading) return (
    <div style={styles.center}>
      <div className="spinner" style={styles.spinnerIcon}></div>
      <p style={{ fontWeight: '700', color: '#242341', marginTop: '16px', fontSize: '15px' }}>Loading your learning hub...</p>
    </div>
  );

  if (error) return (
    <div style={styles.center}>
      <p style={{ fontWeight: '700', color: '#EF4444', fontSize: '15px' }}>{error}</p>
    </div>
  );

  return (
    <div style={styles.appContainer}>
      {/* ULTRA CLEAN PROFESSIONAL WHITE HEADER WITH ACCENT GLOW */}
      <header style={styles.header}>
        <div style={styles.headerContentWrapper}>
          <div style={styles.headerLeft}>
            <span style={styles.welcomeText}>🚀 Welcome back, Champion!</span>
            <h1 style={styles.userName}>{user?.name || "Smart Student"}</h1>
            <p style={styles.headerSubtitle}>"Excellence is not an act, but a habit. Conquer your tests & win amazing prizes today!"</p>
            <div style={styles.metaRow}>
              <span style={styles.metaBadge}>Class {userClass}</span>
              {userSession && <span style={styles.metaBadge}>Session {userSession}</span>}
              {userStream && <span style={styles.metaBadge}>{userStream}</span>}
            </div>
          </div>
          
          <div style={styles.statsContainer}>
            <div style={styles.statBox}>
              <span style={styles.statNumber}>{totalQuizzes}</span>
              <span style={styles.statLabel}>Total Quizzes</span>
            </div>
            <div style={styles.statBox}>
              <span style={{...styles.statNumber,backgroundColor: "#abff58", color: '#116c4f'}}>{completedQuizzes}</span>
              <span style={styles.statLabel}>Completed</span>
            </div>
            <div style={styles.statBox}>
              <span style={{...styles.statNumber,backgroundColor: "#ff6df3", color: '#64ff30'}}>{pendingQuizzes}</span>
              <span style={styles.statLabel}>Pending</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main style={styles.mainContent}>
        {/* FILTERS AND TITLE BAR */}
        <div style={styles.controlBar}>
          <div>
            <h2 style={styles.sectionTitle}>{activeSubject} Assessments & Prizes</h2>
            <p style={styles.sectionSubtitle}>Score 85% or above to instantly download your official Smart Student Merit Certificate!</p>
          </div>
          
          {/* SUBJECT TABS */}
          <div style={styles.tabSection} className="no-scrollbar">
            {subjects.map((sub, i) => (
              <button
                key={i}
                onClick={() => handleSubjectFilter(sub)}
                style={{
                  ...styles.tab,
                  backgroundColor: activeSubject === sub ? '#0F172A' : '#FFFFFF',
                  color: activeSubject === sub ? '#FFFFFF' : '#475569',
                  boxShadow: activeSubject === sub ? '0 4px 12px rgba(15, 23, 42, 0.2)' : 'none',
                  border: activeSubject === sub ? 'none' : '1px solid #E2E8F0',
                }}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>

        {/* QUIZ LIST WITH PRIZE & CERTIFICATE INTEGRATION */}
        <div style={styles.quizList}>
          {filteredQuizzes.length > 0 ? (
            filteredQuizzes.map((quiz, idx) => {
              const isDone = quiz.attempted;
              const scorePercent = isDone && quiz.total_marks ? Math.round((quiz.result.score / quiz.total_marks) * 100) : 0;
              const quizPrize = quiz.prize || "Exciting Certificate";
              const canGetCertificate = isDone && scorePercent >= 85;

              return (
                <div key={idx} style={styles.card} className="quiz-card">
                  <div style={styles.cardLeft}>
                    <div style={isDone ? styles.statusIconDone : styles.statusIconPending}>
                      {isDone ? "🏆" : "🔥"}
                    </div>
                    <div>
                      <div style={styles.tagSubject}>{quiz.subject}</div>
                      <h3 style={styles.quizTitle}>{quiz.title}</h3>
                      <div style={styles.quizMetaInfo}>
                        <span>⏱️ {quiz.timer_minutes} mins</span>
                        <span>•</span>
                        <span>📋 {quiz.total_marks || 0} Questions</span>
                      </div>
                      <div style={styles.prizeBadge}>
                        📜 <strong>Win Certificate:</strong> {quizPrize}
                      </div>
                    </div>
                  </div>

                  <div style={styles.cardRight}>
                    {isDone ? (
                      <div style={styles.scoreBlock}>
                        <div style={styles.scoreValue}>{scorePercent}%</div>
                        <div style={styles.gradeBadge}>Grade: {quiz.result?.grade || 'N/A'}</div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => navigate(`/student/attempt/${quiz.id}`)}
                        style={styles.startButton}
                      >
                        Start Test ⚡
                      </button>
                    )}
                  </div>

                  {isDone && (
                    <div style={styles.cardFooter}>
                      <span style={styles.feedbackText}>
                        {scorePercent >= 85 ? "🌟 Target Achieved! Certificate Unlocked!" : `🌟 Completed! (Score ${scorePercent}% - Need 85% for Certificate)`}
                      </span>
                      
                      <div style={styles.footerActionGroup}>
                        {canGetCertificate && (
                          <button
                            onClick={() => generateCertificate(quiz.title, scorePercent, quiz.result?.grade || 'A')}
                            style={styles.certificateButton}
                            className="certificate-btn"
                          >
                            🎓 Download Certificate (PDF)
                          </button>
                        )}
                        <button 
                          onClick={() => navigate(`/student/review/${quiz.id}/${studentId}`)}
                          style={styles.reviewButton}
                          className="hover-text-transition"
                        >
                          View Analytics &rarr;
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div style={styles.emptyState}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎯</div>
              <p style={{ margin: 0, fontWeight: '700', color: '#1E293B', fontSize: '16px' }}>All caught up!</p>
              <p style={{ margin: '5px 0 0 0', color: '#64748B', fontSize: '13px' }}>No pending tasks under this category. Great job!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const styles = {
  appContainer: {
    minHeight: "100vh",
    backgroundColor: "#F8FAFC",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
  },
  header: {
    backgroundColor: "#FFFFFF",
    borderBottom: "1px solid #E2E8F0",
    padding: "36px 40px",
    boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.03)",
  },
  headerContentWrapper: {
    maxWidth: "1150px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "24px",
  },
  headerLeft: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    maxWidth: "600px",
  },
  welcomeText: {
    fontSize: "20px",
    fontWeight: "900",
    color: "#5e0347",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
  },
  userName: {
    fontSize: "30px",
    fontWeight: "800",
    color: "#0F172A",
    margin: 0,
    letterSpacing: "-0.5px",
  },
  headerSubtitle: {
    fontSize: "13px",
    color: "#64748B",
    fontStyle: "italic",
    margin: "2px 0 6px 0",
    fontWeight: "500",
  },
  metaRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginTop: "4px",
  },
  metaBadge: {
    backgroundColor: "#539115",
    color: "#ffffff",
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "13.5px",
    fontWeight: "500",
    border: "1px solid #E2E8F0",
  },
  statsContainer: {
    display: "flex",
    gap: "14px",
  },
  statBox: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: "14px",
    padding: "16px 20px",
    textAlign: "center",
    minWidth: "85px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
  },
  statNumber: {
    display: "block",
    fontSize: "22px",
    fontWeight: "800",
     backgroundColor: "#ffbc58",
    color: "#0F172A",
  },
  statLabel: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#932d11",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  mainContent: {
    maxWidth: "1150px",
    width: "100%",
    margin: "0 auto",
    padding: "36px 20px",
    boxSizing: "border-box",
    flex: 1,
  },
  controlBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: "28px",
    flexWrap: "wrap",
    gap: "16px",
  },
  sectionTitle: {
    fontSize: "22px",
    fontWeight: "800",
    color: "#0F172A",
    margin: "0 0 4px 0",
  },
  sectionSubtitle: {
    fontSize: "13px",
    color: "#64748B",
    margin: 0,
    fontWeight: "500",
  },
  tabSection: {
    display: "flex",
    gap: "10px",
    overflowX: "auto",
    maxWidth: "100%",
    paddingBottom: "4px",
  },
  tab: {
    padding: "10px 20px",
    borderRadius: "12px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.25s ease",
  },
  quizList: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: "18px",
    border: "1px solid #E2E8F0",
    padding: "22px 26px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
    boxShadow: "0 4px 20px -4px rgba(0, 0, 0, 0.03)",
  },
  cardLeft: {
    display: "flex",
    alignItems: "flex-start",
    gap: "18px",
    flex: 1,
    minWidth: "280px",
  },
  statusIconPending: {
    width: "48px",
    height: "48px",
    backgroundColor: "#FEF3C7",
    color: "#D97706",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    flexShrink: 0,
  },
  statusIconDone: {
    width: "48px",
    height: "48px",
    backgroundColor: "#D1FAE5",
    color: "#059669",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    flexShrink: 0,
  },
  tagSubject: {
    fontSize: "11px",
    fontWeight: "800",
    color: "#4F46E5",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    marginBottom: "4px",
  },
  quizTitle: {
    fontSize: "17px",
    fontWeight: "800",
    color: "#0F172A",
    margin: "0 0 6px 0",
  },
  quizMetaInfo: {
    display: "flex",
    gap: "10px",
    fontSize: "12px",
    color: "#64748B",
    fontWeight: "600",
    marginBottom: "8px",
  },
  prizeBadge: {
    fontSize: "12px",
    color: "#0D9488",
    backgroundColor: "#F0FDFA",
    border: "1px solid #CCFBF1",
    padding: "4px 10px",
    borderRadius: "8px",
    display: "inline-block",
    fontWeight: "500",
  },
  cardRight: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  startButton: {
    backgroundColor: "#0F172A",
    color: "#FFFFFF",
    border: "none",
    padding: "12px 24px",
    borderRadius: "12px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.15)",
    transition: "background 0.2s ease, transform 0.2s ease",
  },
  scoreBlock: {
    textAlign: "right",
  },
  scoreValue: {
    fontSize: "20px",
    fontWeight: "800",
    color: "#059669",
  },
  gradeBadge: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
  },
  cardFooter: {
    width: "100%",
    borderTop: "1px solid #F1F5F9",
    marginTop: "14px",
    paddingTop: "14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px",
  },
  feedbackText: {
    fontSize: "12px",
    color: "#059669",
    fontWeight: "700",
  },
  footerActionGroup: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  certificateButton: {
    backgroundColor: "#059669",
    color: "#FFFFFF",
    border: "none",
    padding: "7px 14px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "700",
    cursor: "pointer",
  },
  reviewButton: {
    background: "none",
    border: "none",
    color: "#4F46E5",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    padding: 0,
  },
  emptyState: {
    textAlign: "center",
    padding: "70px 20px",
    backgroundColor: "#FFFFFF",
    borderRadius: "18px",
    border: "1px solid #E2E8F0",
    boxShadow: "0 4px 20px -4px rgba(0, 0, 0, 0.03)",
  },
  center: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  spinnerIcon: {
    width: "40px",
    height: "40px",
    border: "4px solid #E2E8F0",
    borderTop: "4px solid #4F46E5",
    borderRadius: "50%",
  }
};

export default StudentQuizDashboard;