import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";

const AttemptQuizPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const API_URL = "https://student-management-system-4-hose.onrender.com";
  const user = JSON.parse(localStorage.getItem("user"));
  const studentId = user?.id || user?._id;

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await axios.post(`${API_URL}/api/quiz/submit`, {
        student_id: studentId,
        quiz_id: id,
        answers: answers,
      });
      setResult(res.data);
    } catch (err) {
      alert("Error submitting quiz.");
    } finally {
      setSubmitting(false);
    }
  }, [id, studentId, answers, API_URL, submitting]);

  useEffect(() => {
    // Scrolling unlock karne ke liye
    document.body.style.overflow = "auto";
    document.body.style.backgroundColor = "#F9F9F9";

    axios.get(`${API_URL}/api/quiz/${id}`).then((res) => {
      const quizData = res.data;
      setQuiz(quizData);
      const q = typeof quizData.questions === 'string' ? JSON.parse(quizData.questions) : quizData.questions;
      setQuestions(q);
      setTimeLeft(quizData.timer_minutes * 60);
      setAnswers(new Array(q.length).fill(null));
    });
  }, [id, API_URL]);

  useEffect(() => {
    if (timeLeft === 0 && quiz && !result) { handleSubmit(); return; }
    const timer = setInterval(() => setTimeLeft(p => p > 0 ? p - 1 : 0), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, quiz, result, handleSubmit]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (!quiz) return <div style={styles.center}>Loading Questions...</div>;

  if (result) return (
    <div style={styles.fullCenter}>
      <div style={styles.resCard}>
        <h1 style={{color: '#000', fontWeight: '900', fontSize: '32px'}}>Quiz Completed</h1>
        <div style={styles.resCircle}>{result.percentage}%</div>
        <div style={styles.resStats}>
            <p>Score: <b>{result.score} / {quiz.total_marks}</b></p>
            <p>Grade: <b>{result.grade}</b></p>
        </div>
        <button onClick={() => navigate("/student/dashboard")} style={styles.finishBtn}>Return to Dashboard</button>
      </div>
    </div>
  );

  return (
    <div style={styles.wrapper}>
      {/* STICKY HEADER */}
      <div style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.infoSide}>
            <h2 style={styles.quizTitle}>{quiz.title}</h2>
            <p style={styles.subjectText}>{quiz.subject} • Assessment</p>
          </div>
          <div style={{...styles.timer, color: timeLeft < 60 ? 'red' : '#000'}}>
            {formatTime(timeLeft)}
          </div>
        </div>
        <div style={styles.progressTrack}>
          <div style={{...styles.progressFill, width: `${((currentIdx + 1) / questions.length) * 100}%`}}></div>
        </div>
      </div>

      {/* QUESTION AREA (Natural Scroll) */}
      <div style={styles.mainContent}>
        <div style={styles.qCard}>
          <div style={styles.qHeader}>
            <span style={styles.qCount}>QUESTION {currentIdx + 1} OF {questions.length}</span>
          </div>
          
          <h3 style={styles.qText}>{questions[currentIdx]?.question}</h3>

          <div style={styles.optionsContainer}>
            {questions[currentIdx]?.options.map((opt, i) => {
              const isSelected = answers[currentIdx] === opt;
              return (
                <div 
                  key={i} 
                  onClick={() => {
                    const newAns = [...answers];
                    newAns[currentIdx] = opt;
                    setAnswers(newAns);
                  }}
                  style={{
                    ...styles.optionBox,
                    borderColor: isSelected ? '#000' : '#E0E0E0',
                    backgroundColor: isSelected ? '#F0F0F0' : '#FFF',
                    transform: isSelected ? 'scale(1.01)' : 'scale(1)'
                  }}
                >
                  <div style={{...styles.radioCircle, borderColor: isSelected ? '#FF6B00' : '#CCC'}}>
                    {isSelected && <div style={styles.radioInner} />}
                  </div>
                  <span style={{...styles.optText, color: isSelected ? '#000' : '#333'}}>{opt}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* NAVIGATION BUTTONS */}
        <div style={styles.navRow}>
          <button 
            disabled={currentIdx === 0}
            onClick={() => {
                setCurrentIdx(currentIdx - 1);
                window.scrollTo(0,0);
            }}
            style={{...styles.backBtn, opacity: currentIdx === 0 ? 0.3 : 1}}
          >
            Previous
          </button>

          {currentIdx === questions.length - 1 ? (
            <button onClick={handleSubmit} disabled={submitting} style={styles.submitBtn}>
              {submitting ? "Processing..." : "Submit Test"}
            </button>
          ) : (
            <button 
                onClick={() => {
                    setCurrentIdx(currentIdx + 1);
                    window.scrollTo(0,0);
                }} 
                style={styles.nextBtn}
            >
              Next Question
            </button>
          )}
        </div>
        
        {/* Safe Area for Bottom Scroll */}
        <div style={{height: '50px'}}></div>
      </div>
    </div>
  );
};

const styles = {
  wrapper: { width: "100%", minHeight: "100vh", display: "flex", flexDirection: "column" },
  header: { position: "sticky", top: 0, background: "#FFF", zIndex: 10, borderBottom: "1px solid #EEE" },
  headerInner: { maxWidth: "800px", margin: "0 auto", padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  quizTitle: { margin: 0, fontSize: "22px", fontWeight: "900", color: "#000" },
  subjectText: { margin: "4px 0 0 0", fontSize: "13px", color: "#888", fontWeight: "600" },
  timer: { fontSize: "22px", fontWeight: "900", fontFamily: "monospace", padding: "5px 15px", background: "#F5F5F5", borderRadius: "12px" },
  
  progressTrack: { height: "5px", background: "#EEE", width: "100%" },
  progressFill: { height: "100%", background: "#FF6B00", transition: "width 0.3s ease" },

  mainContent: { maxWidth: "800px", margin: "0 auto", width: "100%", padding: "30px 20px" },
  qCard: { background: "#FFF", borderRadius: "25px", padding: "35px", boxShadow: "0 10px 30px rgba(0,0,0,0.03)", border: "1px solid #F1F1F1" },
  qHeader: { marginBottom: "15px" },
  qCount: { fontSize: "12px", fontWeight: "800", color: "#BBB", letterSpacing: "1px" },
  qText: { fontSize: "22px", fontWeight: "800", color: "#000", lineHeight: "1.4", marginBottom: "35px" },

  optionsContainer: { display: "flex", flexDirection: "column", gap: "15px" },
  optionBox: { display: "flex", alignItems: "center", gap: "15px", padding: "20px", borderRadius: "18px", border: "2px solid", cursor: "pointer", transition: "0.2s ease" },
  radioCircle: { width: "20px", height: "20px", borderRadius: "50%", border: "2px solid", display: "flex", justifyContent: "center", alignItems: "center" },
  radioInner: { width: "10px", height: "10px", borderRadius: "50%", background: "#FF6B00" },
  optText: { fontSize: "17px", fontWeight: "700" },

  navRow: { display: "flex", gap: "15px", marginTop: "30px" },
  backBtn: { flex: 1, padding: "18px", borderRadius: "15px", border: "1px solid #DDD", background: "#FFF", fontWeight: "800", cursor: "pointer" },
  nextBtn: { flex: 1, padding: "18px", borderRadius: "15px", border: "none", background: "#000", color: "#FFF", fontWeight: "800", cursor: "pointer" },
  submitBtn: { flex: 1, padding: "18px", borderRadius: "15px", border: "none", background: "#FF6B00", color: "#FFF", fontWeight: "800", cursor: "pointer" },

  fullCenter: { height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", textAlign: "center", background: "#FFF" },
  resCard: { padding: "20px", maxWidth: "400px", width: "100%" },
  resCircle: { width: "140px", height: "140px", borderRadius: "50%", background: "#000", color: "#FF6B00", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "38px", fontWeight: "900", margin: "30px auto" },
  resStats: { marginBottom: "30px", fontSize: "18px", color: "#444" },
  finishBtn: { background: "#000", color: "#FFF", padding: "16px 40px", borderRadius: "14px", border: "none", fontWeight: "800", cursor: "pointer" },
  center: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontWeight: "900", color: "#FF6B00" }
};

export default AttemptQuizPage;