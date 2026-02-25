import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const StudentQuizDashboard = () => {
  const navigate = useNavigate();
  const API_URL = "https://student-management-system-4-hose.onrender.com";

  const user = JSON.parse(localStorage.getItem("user"));
  const studentId = user?.id || user?._id;
  const userClass = user?.class;

  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const now = new Date();

  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = `
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: 100% !important;
        overflow: hidden !important;
        background-color: #F8F9FA;
      }
      #root {
        width: 100% !important;
        height: 100% !important;
        margin: 0 !important;
      }
      @keyframes thunderPulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.2); opacity: 0.8; filter: drop-shadow(0 0 5px #FF6B00); }
        100% { transform: scale(1); opacity: 1; }
      }
      .animate-thunder {
        animation: thunderPulse 1.5s infinite ease-in-out;
        display: inline-block;
      }
      ::-webkit-scrollbar { display: none; }
    `;
    document.head.appendChild(styleSheet);

    if (!userClass || !studentId) {
      setError("Session expired. Please login again.");
      setLoading(false);
      return;
    }

    const fetchQuizzes = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/quiz/class/${userClass}`);
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
        setLoading(false);
      } catch (err) {
        setError("Failed to load quizzes.");
        setLoading(false);
      }
    };
    fetchQuizzes();
    
    return () => document.head.removeChild(styleSheet);
  }, [userClass, studentId]);

  if (loading) return <div style={styles.center}>Loading Exams...</div>;

  return (
    <div style={styles.appWrapper}>
      {/* HEADER SECTION - COMPACT (ratio part 1) */}
      <div style={styles.header}>
        <div style={styles.statusBar}>
          <span style={{letterSpacing: '0.5px'}}>{now.getHours()}:{now.getMinutes() < 10 ? '0'+now.getMinutes() : now.getMinutes()}</span>
          <div style={{ display: 'flex', gap: '10px', fontSize: '14px' }}>📶 ⚡ 🔋</div>
        </div>
        <div style={styles.headerContent}>
          <div style={styles.welcomeText}>Welcome, 👋</div>
          <div style={styles.mainTitle}>{user?.name || "Student"}</div>
          <div style={styles.badgeRow}>
            <div style={styles.subTitle}>Class {userClass} • {quizzes.length} Tests</div>
          </div>
        </div>
      </div>

      {/* CONTENT AREA - EXPANDED (ratio part 3) */}
      <div style={styles.contentArea}>
        <div style={styles.dragHandle}></div>
        
        <div style={styles.topRow}>
          <div style={styles.listHeading}>Recent Quizzes</div>
          <div style={styles.dateBadge}>{now.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</div>
        </div>

        {/* SCROLLABLE LIST */}
        <div style={styles.scrollArea}>
          {quizzes.length > 0 ? (
            quizzes.map((quiz, i) => {
              const isDone = quiz.attempted;
              const percentage = isDone ? Math.round((quiz.result.score / quiz.total_marks) * 100) : 0;
              return (
                <div key={i} style={styles.quizItem}>
                  <div style={styles.itemMain}>
                    <div style={isDone ? styles.iconBoxOrange : styles.iconBoxGray}>
                      {isDone ? "✓" : <span className="animate-thunder">⚡</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={styles.itemTitle}>{quiz.title}</div>
                      <div style={styles.itemSub}>{quiz.subject} • {quiz.timer_minutes}m</div>
                    </div>
                    <div style={styles.itemRight}>
                      {isDone ? (
                        <div style={styles.scoreContainer}>
                          <div style={styles.scoreText}>{percentage}%</div>
                          <div style={styles.gradeText}>{quiz.result.grade}</div>
                        </div>
                      ) : (
                        <button onClick={() => navigate(`/student/attempt/${quiz.id}`)} style={styles.btnStart}>
                          Start
                        </button>
                      )}
                    </div>
                  </div>
                  {isDone && (
                    <div style={styles.reviewBar} onClick={() => navigate(`/student/review/${quiz.id}/${studentId}`)}>
                      <span>Performance Review</span>
                      <span>→</span>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div style={styles.empty}>No tests found.</div>
          )}
          <div style={{ height: "40px" }}></div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  appWrapper: { 
    width: "100vw", 
    height: "100vh", 
    backgroundColor: "#FF6B00", 
    display: "flex", 
    flexDirection: "column", 
    position: "fixed", 
    top: 0, 
    left: 0,
    fontFamily: "'Inter', sans-serif"
  },
  header: { 
    background: "linear-gradient(180deg, #FF6B00 0%, #FF8E3C 100%)", 
    padding: "15px 20px 45px 20px", // Padding kam ki upar se
    color: "#fff", 
    flexShrink: 0 
  },
  statusBar: { display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "700", marginBottom: "15px", opacity: 0.8 },
  headerContent: { display: "flex", flexDirection: "column" },
  welcomeText: { fontSize: "14px", fontWeight: "400", opacity: 0.9 },
  mainTitle: { fontSize: "32px", fontWeight: "900", margin: "2px 0 8px 0", letterSpacing: "-1px" }, // Font size thoda chota kiya
  badgeRow: { display: 'flex', gap: '8px' },
  subTitle: { fontSize: "11px", fontWeight: "700", background: "rgba(255,255,255,0.2)", padding: "4px 10px", borderRadius: "10px" },

  contentArea: { 
    flex: 3, // Ratio 1:3 fix
    backgroundColor: "#F8F9FA", 
    marginTop: "-25px", 
    borderTopLeftRadius: "35px", 
    borderTopRightRadius: "35px", 
    padding: "0", 
    display: "flex", 
    flexDirection: "column",
    overflow: "hidden" 
  },
  dragHandle: { width: "35px", height: "4px", backgroundColor: "#E0E0E0", borderRadius: "10px", margin: "12px auto 18px auto" },
  topRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 20px", marginBottom: "15px" },
  listHeading: { fontSize: "18px", fontWeight: "800", color: "#111" },
  dateBadge: { fontSize: "11px", fontWeight: "700", color: "#FF6B00" },

  scrollArea: { 
    flex: 1, 
    overflowY: "auto", 
    padding: "0 15px", 
    WebkitOverflowScrolling: "touch" 
  },

  quizItem: { backgroundColor: "#fff", borderRadius: "20px", padding: "15px", marginBottom: "12px", boxShadow: "0 4px 15px rgba(0,0,0,0.03)", border: "1px solid #F0F0F0" },
  itemMain: { display: "flex", alignItems: "center", gap: "12px" },
  iconBoxGray: { width: "45px", height: "45px", background: "#F5F5F5", borderRadius: "14px", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "18px" },
  iconBoxOrange: { width: "45px", height: "45px", background: "#FFF0E6", color: "#FF6B00", borderRadius: "14px", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "18px" },
  
  itemTitle: { fontWeight: "800", fontSize: "16px", color: "#222" },
  itemSub: { fontSize: "12px", color: "#999", marginTop: "1px" },
  itemRight: { marginLeft: "auto" },
  btnStart: { background: "#000", color: "#fff", border: "none", padding: "8px 18px", borderRadius: "12px", fontWeight: "800", fontSize: "13px", cursor: "pointer" },
  scoreText: { fontSize: "18px", fontWeight: "900", color: "#FF6B00" },
  gradeText: { fontSize: "10px", fontWeight: "800", color: "#BBB", textAlign: "right" },
  
  reviewBar: { marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #F8F8F8", display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: "700", color: "#FF6B00", cursor: "pointer" },
  empty: { textAlign: "center", padding: "40px 20px", color: "#ccc" },
  center: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#fff", fontSize: "18px", fontWeight: "700" }
};

export default StudentQuizDashboard;