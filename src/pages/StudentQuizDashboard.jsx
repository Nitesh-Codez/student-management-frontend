import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const StudentQuizDashboard = () => {
  const navigate = useNavigate();
  const API_URL = "https://student-management-system-4-hose.onrender.com";

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

  const now = new Date();

  useEffect(() => {
    // Injecting High-Tech Animations
    const styleSheet = document.createElement("style");
    styleSheet.innerText = `
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
      body { margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; background-color: #FF6B00; }
      .no-scrollbar::-webkit-scrollbar { display: none; }
      
      @keyframes fadeInScale {
        0% { transform: scale(0.9); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
      }
      .quiz-card { animation: fadeInScale 0.4s ease-out forwards; }
      
      @keyframes pulseDark {
        0% { box-shadow: 0 0 0 0 rgba(255, 107, 0, 0.4); }
        70% { box-shadow: 0 0 0 10px rgba(255, 107, 0, 0); }
        100% { box-shadow: 0 0 0 0 rgba(255, 107, 0, 0); }
      }
      .active-tab { animation: pulseDark 2s infinite; }
      
      @keyframes loaderSpin {
        0% { transform: rotate(0deg) scale(1); }
        50% { transform: rotate(180deg) scale(1.2); }
        100% { transform: rotate(360deg) scale(1); }
      }
      .loader-icon { animation: loaderSpin 1.5s infinite linear; }
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
        const res = await axios.get(`${API_URL}/api/quiz/class/${userClass}`, {
          params: { session: userSession, stream: userStream }
        });

        const statusRequests = res.data.map((quiz) =>
          axios.get(`${API_URL}/api/quiz/status/${quiz.id}/${studentId}`)
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

  if (loading) return (
    <div style={styles.center}>
      <div className="loader-icon" style={{fontSize: '50px'}}>⚡</div>
      <p style={{fontWeight: '800', color: '#FF6B00', marginTop: '10px'}}>Syncing Assignments...</p>
    </div>
  );

  return (
    <div style={styles.appContainer}>
      {/* MODERN HEADER */}
      <header style={styles.header}>
        <div style={styles.topBar}>
          <span>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <div style={{display: 'flex', gap: '8px'}}>📶 🔋</div>
        </div>
        <div style={styles.headerBody}>
          <span style={styles.greeting}>Good Day, 👋</span>
          <h1 style={styles.userName}>{user?.name || "Smart Student"}</h1>
          <div style={styles.pillContainer}>
            <span style={styles.pill}>Class {userClass}</span>
            <span style={styles.pill}>{userSession}</span>
          </div>
        </div>
      </header>

      {/* INTERACTIVE CONTENT */}
      <main style={styles.contentArea}>
        <div style={styles.dragHandle}></div>
        
        {/* SUBJECT TABS */}
        <section style={styles.tabSection} className="no-scrollbar">
          {subjects.map((sub, i) => (
            <button
              key={i}
              onClick={() => handleSubjectFilter(sub)}
              className={activeSubject === sub ? "active-tab" : ""}
              style={{
                ...styles.tab,
                backgroundColor: activeSubject === sub ? "#FF6B00" : "#FFF",
                color: activeSubject === sub ? "#FFF" : "#636E72",
                border: activeSubject === sub ? 'none' : '1px solid #E0E0E0'
              }}
            >
              {sub}
            </button>
          ))}
        </section>

        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>{activeSubject} Quizzes</h2>
          <span style={styles.countBadge}>{filteredQuizzes.length}</span>
        </div>

        {/* QUIZ LIST */}
        <section style={styles.quizList} className="no-scrollbar">
          {filteredQuizzes.length > 0 ? (
            filteredQuizzes.map((quiz, idx) => {
              const isDone = quiz.attempted;
              const scorePercent = isDone ? Math.round((quiz.result.score / quiz.total_marks) * 100) : 0;

              return (
                <div key={idx} style={styles.card} className="quiz-card">
                  <div style={styles.cardMain}>
                    <div style={isDone ? styles.iconBoxDone : styles.iconBoxTodo}>
                      {isDone ? "⭐" : "🔥"}
                    </div>
                    <div style={{flex: 1}}>
                      <h3 style={styles.quizTitle}>{quiz.title}</h3>
                      <p style={styles.quizMeta}>{quiz.subject} • {quiz.timer_minutes} Mins</p>
                    </div>
                    {isDone ? (
                      <div style={styles.scoreBox}>
                        <span style={styles.scoreValue}>{scorePercent}%</span>
                        <span style={styles.gradeLabel}>{quiz.result.grade}</span>
                      </div>
                    ) : (
                      <button 
                        onClick={() => navigate(`/student/attempt/${quiz.id}`)}
                        style={styles.startButton}
                      >
                        Start
                      </button>
                    )}
                  </div>
                  {isDone && (
                    <div style={styles.reviewLink} onClick={() => navigate(`/student/review/${quiz.id}/${studentId}`)}>
                      View Detailed Feedback <span>→</span>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div style={styles.emptyState}>
              <div style={{fontSize: '40px'}}>🎯</div>
              <p>Everything is complete!</p>
            </div>
          )}
          <div style={{height: '100px'}}></div>
        </section>
      </main>
    </div>
  );
};

const styles = {
  appContainer: { width: "100%", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" },
  header: { background: "#FF6B00", padding: "20px 25px 50px 25px", color: "#FFF" },
  topBar: { display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "600", marginBottom: "20px", opacity: 0.8 },
  headerBody: { display: "flex", flexDirection: "column", gap: "5px" },
  greeting: { fontSize: "14px", fontWeight: "400" },
  userName: { fontSize: "28px", fontWeight: "800", margin: 0, letterSpacing: "-0.5px" },
  pillContainer: { display: "flex", gap: "10px", marginTop: "10px" },
  pill: { background: "rgba(255,255,255,0.2)", padding: "5px 12px", borderRadius: "10px", fontSize: "11px", fontWeight: "700" },

  contentArea: { flex: 1, background: "#F8F9FA", marginTop: "-30px", borderRadius: "35px 35px 0 0", display: "flex", flexDirection: "column", boxShadow: "0 -10px 20px rgba(0,0,0,0.05)" },
  dragHandle: { width: "40px", height: "5px", background: "#DDD", borderRadius: "10px", margin: "15px auto" },
  
  tabSection: { display: "flex", overflowX: "auto", padding: "10px 20px", gap: "12px" },
  tab: { padding: "10px 20px", borderRadius: "20px", fontSize: "13px", fontWeight: "700", border: "none", cursor: "pointer", whiteSpace: "nowrap", transition: "0.3s" },

  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 25px 10px 25px" },
  sectionTitle: { fontSize: "18px", fontWeight: "800", color: "#2D3436", margin: 0 },
  countBadge: { background: "#E0E0E0", color: "#666", padding: "2px 10px", borderRadius: "10px", fontSize: "12px", fontWeight: "700" },

  quizList: { flex: 1, overflowY: "auto", padding: "10px 20px" },
  card: { background: "#FFF", borderRadius: "22px", padding: "18px", marginBottom: "15px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)", border: "1px solid #F0F0F0" },
  cardMain: { display: "flex", alignItems: "center", gap: "15px" },
  iconBoxTodo: { width: "48px", height: "48px", background: "#F5F5F5", borderRadius: "15px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" },
  iconBoxDone: { width: "48px", height: "48px", background: "#FFF0E6", borderRadius: "15px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" },
  quizTitle: { fontSize: "16px", fontWeight: "800", color: "#111", margin: 0 },
  quizMeta: { fontSize: "12px", color: "#999", marginTop: "3px" },
  
  startButton: { background: "#111", color: "#FFF", border: "none", padding: "10px 22px", borderRadius: "14px", fontWeight: "700", cursor: "pointer" },
  scoreBox: { textAlign: "right" },
  scoreValue: { display: "block", fontSize: "18px", fontWeight: "800", color: "#FF6B00" },
  gradeLabel: { fontSize: "10px", fontWeight: "700", color: "#BBB", textTransform: "uppercase" },

  reviewLink: { marginTop: "15px", paddingTop: "12px", borderTop: "1px solid #F8F8F8", color: "#FF6B00", fontSize: "12px", fontWeight: "700", display: "flex", justifyContent: "space-between", cursor: "pointer" },
  
  emptyState: { textAlign: "center", padding: "50px", color: "#999", fontWeight: "600" },
  center: { height: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: "#FFF" }
};

export default StudentQuizDashboard;