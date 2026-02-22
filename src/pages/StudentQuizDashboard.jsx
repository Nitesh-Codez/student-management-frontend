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
    // Poori screen cover karne ke liye CSS fix
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    

    if (!userClass || !studentId) {
      setError("Session expired. Please login again.");
      setLoading(false);
      return;
    }

    const fetchQuizzes = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/quiz/class/${userClass}`);
        const quizzesData = res.data;

        const statusRequests = quizzesData.map((quiz) =>
          axios.get(`${API_URL}/api/quiz/status/${quiz.id}/${studentId}`)
        );

        const statusResults = await Promise.all(statusRequests);

        const updatedQuizzes = quizzesData.map((quiz, index) => ({
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
  }, [userClass, studentId]);

  if (loading) return <div style={styles.center}>Loading Exams...</div>;

  return (
    <div style={styles.appWrapper}>
      {/* --- ORANGE HEADER SECTION --- */}
      <div style={styles.header}>
        <div style={styles.statusBar}>
          <span>{now.getHours()}:{now.getMinutes() < 10 ? '0'+now.getMinutes() : now.getMinutes()}</span>
          <div style={{ display: 'flex', gap: '8px' }}>📶 🔋</div>
        </div>
        
        <div style={styles.headerContent}>
          <div style={styles.welcomeText}>Hello, {user?.name || "Student"}</div>
          <div style={styles.mainTitle}>Assessments</div>
          <div style={styles.subTitle}>Class {userClass} • {quizzes.length} Tests Available</div>
        </div>
      </div>

      {/* --- CONTENT AREA (WHITE) --- */}
      <div style={styles.contentArea}>
        <div style={styles.topRow}>
          <div style={styles.listHeading}>Recent Quizzes</div>
          <div style={styles.dateBadge}>{now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</div>
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
                      {isDone ? "✓" : "⚡"}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={styles.itemTitle}>{quiz.title}</div>
                      <div style={styles.itemSub}>{quiz.subject} • {quiz.timer_minutes} Mins</div>
                    </div>

                    <div style={styles.itemRight}>
                      {isDone ? (
                        <div style={styles.scoreContainer}>
                          <div style={styles.scoreText}>{percentage}%</div>
                          <div style={styles.gradeText}>Grade: {quiz.result.grade}</div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => navigate(`/student/attempt/${quiz.id}`)}
                          style={styles.btnStart}
                        >
                          Start
                        </button>
                      )}
                    </div>
                  </div>

                  {isDone && (
                    <div style={styles.reviewBar} onClick={() => navigate(`/student/review/${quiz.id}/${studentId}`)}>
                      <span>View Detailed Review & Answers</span>
                      <span>›</span>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div style={styles.empty}>No tests found for your class.</div>
          )}
          
          {/* Padding for bottom scrolling */}
          <div style={{ height: "120px" }}></div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  appWrapper: { 
    width: "100vw", 
    height: "100vh", 
    backgroundColor: "#fff", 
    display: "flex", 
    flexDirection: "column", 
    position: "fixed", 
    top: 0, 
    left: 0,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  header: { 
    background: "linear-gradient(135deg, #FF6B00 0%, #FF8E3C 100%)", 
    padding: "40px 25px 60px 25px", 
    color: "#fff", 
    flexShrink: 0 
  },
  statusBar: { 
    display: "flex", 
    justifyContent: "space-between", 
    fontSize: "14px", 
    fontWeight: "700", 
    marginBottom: "30px" 
  },
  headerContent: { display: "flex", flexDirection: "column", gap: "4px" },
  welcomeText: { fontSize: "18px", fontWeight: "500", opacity: 0.9 },
  mainTitle: { fontSize: "36px", fontWeight: "900", letterSpacing: "-1px" },
  subTitle: { fontSize: "14px", fontWeight: "600", background: "rgba(0,0,0,0.1)", width: "fit-content", padding: "4px 12px", borderRadius: "20px" },

  contentArea: { 
    flex: 1, 
    backgroundColor: "#fff", 
    marginTop: "-40px", 
    borderTopLeftRadius: "45px", 
    borderTopRightRadius: "45px", 
    padding: "35px 25px 0 25px", 
    display: "flex", 
    flexDirection: "column", 
  
  },
  topRow: { 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: "20px",
    flexShrink: 0 
  },
  listHeading: { fontSize: "20px", fontWeight: "800", color: "#000" },
  dateBadge: { fontSize: "12px", fontWeight: "700", color: "#FF6B00", background: "#FFF0E6", padding: "5px 12px", borderRadius: "10px" },

  scrollArea: { 
    flex: 1, 
    overflowY: "auto", 
    WebkitOverflowScrolling: "touch" 
  },

  quizItem: { 
    backgroundColor: "#fff", 
    borderRadius: "24px", 
    padding: "18px", 
    marginBottom: "16px", 
    boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
    border: "1px solid #f1f1f1"
  },
  itemMain: { display: "flex", alignItems: "center", gap: "15px" },
  iconBoxGray: { width: "48px", height: "48px", background: "#F5F5F5", borderRadius: "16px", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "20px" },
  iconBoxOrange: { width: "48px", height: "48px", background: "#FFF0E6", color: "#FF6B00", borderRadius: "16px", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "900", fontSize: "22px" },
  
  itemTitle: { fontWeight: "800", fontSize: "17px", color: "#000" },
  itemSub: { fontSize: "13px", color: "#888", marginTop: "2px" },
  
  itemRight: { textAlign: "right" },
  btnStart: { 
    background: "#000", 
    color: "#fff", 
    border: "none", 
    padding: "10px 20px", 
    borderRadius: "14px", 
    fontWeight: "800", 
    fontSize: "14px",
    cursor: "pointer"
  },
  scoreContainer: { display: "flex", flexDirection: "column", alignItems: "flex-end" },
  scoreText: { fontSize: "20px", fontWeight: "900", color: "#FF6B00" },
  gradeText: { fontSize: "10px", fontWeight: "700", color: "#888", textTransform: "uppercase" },

  reviewBar: { 
    marginTop: "15px", 
    paddingTop: "15px", 
    borderTop: "1px solid #f9f9f9", 
    display: "flex", 
    justifyContent: "space-between", 
    fontSize: "12px", 
    fontWeight: "700", 
    color: "#FF6B00",
    cursor: "pointer"
  },

  empty: { textAlign: "center", padding: "50px", color: "#ccc", fontWeight: "600" },
  center: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontSize: "18px", fontWeight: "700" }
};

export default StudentQuizDashboard;