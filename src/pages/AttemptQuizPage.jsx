import React, { useEffect, useState, useCallback, useRef } from "react";
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
  const [timeLeft, setTimeLeft] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Timer sync ke liye refs
  const timerRef = useRef(null);

  // --- SUBMIT LOGIC ---
  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    
    try {
      const res = await axios.post(`${API_URL}/api/quiz/submit`, {
        student_id: studentId,
        quiz_id: id,
        answers: answers,
      });
      
      // Submit hote hi local storage se timer clear karo
      localStorage.removeItem(`quiz_expiry_${id}_${studentId}`);
      setResult(res.data.data || res.data); // Back-end response structure ke according
    } catch (err) {
      console.error(err);
      alert("Error submitting quiz.");
    } finally {
      setSubmitting(false);
    }
  }, [id, studentId, answers, API_URL, submitting]);

  // --- INITIAL LOAD ---
  useEffect(() => {
    document.body.style.overflow = "auto";
    document.body.style.backgroundColor = "#F9F9F9";

    axios.get(`${API_URL}/api/quiz/${id}`).then((res) => {
      const quizData = res.data;
      setQuiz(quizData);
      const q = typeof quizData.questions === 'string' ? JSON.parse(quizData.questions) : quizData.questions;
      setQuestions(q);
      setAnswers(new Array(q.length).fill(null));

      // TIMER PERSISTENCE LOGIC
      const storageKey = `quiz_expiry_${id}_${studentId}`;
      const savedExpiry = localStorage.getItem(storageKey);
      let expiryTime;

      if (savedExpiry) {
        expiryTime = parseInt(savedExpiry);
      } else {
        // Pehli baar start ho raha hai
        expiryTime = Date.now() + quizData.timer_minutes * 60 * 1000;
        localStorage.setItem(storageKey, expiryTime.toString());
      }

      const calculateTimeLeft = () => {
        const diff = Math.floor((expiryTime - Date.now()) / 1000);
        return diff > 0 ? diff : 0;
      };

      setTimeLeft(calculateTimeLeft());
    });
  }, [id, API_URL, studentId]);

  // --- TIMER TICK & AUTO-SUBMIT ---
  useEffect(() => {
    if (timeLeft === null || result) return;

    if (timeLeft <= 0) {
      if (!submitting) handleSubmit();
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timeLeft, result, handleSubmit, submitting]);

  const formatTime = (s) => {
    if (s === null) return "00:00";
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!quiz) return <div style={styles.center}>Loading Quiz...</div>;

  if (result) return (
    <div style={styles.fullCenter}>
      <div style={styles.resCard}>
        <h1 style={{color: '#000', fontWeight: '900', fontSize: '32px'}}>Quiz Finished</h1>
        <div style={styles.resCircle}>{Math.round(result.percentage)}%</div>
        <div style={styles.resStats}>
            <p>Score: <b>{result.score} / {quiz.total_marks}</b></p>
            <p>Grade: <b style={{color: '#FF6B00'}}>{result.grade}</b></p>
        </div>
        <button onClick={() => navigate("/student/dashboard")} style={styles.finishBtn}>Go to Dashboard</button>
      </div>
    </div>
  );

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.infoSide}>
            <h2 style={styles.quizTitle}>{quiz.title}</h2>
            <p style={styles.subjectText}>{quiz.subject} • {questions.length} Questions</p>
          </div>
          <div style={{...styles.timer, color: timeLeft < 60 ? 'red' : '#000'}}>
            {formatTime(timeLeft)}
          </div>
        </div>
        <div style={styles.progressTrack}>
          <div style={{...styles.progressFill, width: `${((currentIdx + 1) / questions.length) * 100}%`}}></div>
        </div>
      </div>

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
                    borderColor: isSelected ? '#FF6B00' : '#E0E0E0',
                    backgroundColor: isSelected ? '#FFF9F5' : '#FFF',
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
              {submitting ? "Submitting..." : "Submit Test"}
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
      </div>
    </div>
  );
};

const styles = {
  wrapper: { width: "100%", minHeight: "100vh", display: "flex", flexDirection: "column" },
  header: { position: "sticky", top: 0, background: "#FFF", zIndex: 10, borderBottom: "1px solid #EEE" },
  headerInner: { maxWidth: "800px", margin: "0 auto", padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  quizTitle: { margin: 0, fontSize: "20px", fontWeight: "900", color: "#000" },
  subjectText: { margin: "2px 0 0 0", fontSize: "12px", color: "#888", fontWeight: "600" },
  timer: { fontSize: "20px", fontWeight: "900", fontFamily: "monospace", padding: "8px 15px", background: "#F5F5F5", borderRadius: "12px" },
  progressTrack: { height: "4px", background: "#EEE", width: "100%" },
  progressFill: { height: "100%", background: "#FF6B00", transition: "width 0.3s ease" },
  mainContent: { maxWidth: "800px", margin: "0 auto", width: "100%", padding: "20px" },
  qCard: { background: "#FFF", borderRadius: "20px", padding: "25px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)", border: "1px solid #F1F1F1" },
  qHeader: { marginBottom: "10px" },
  qCount: { fontSize: "11px", fontWeight: "800", color: "#AAA", letterSpacing: "1px" },
  qText: { fontSize: "20px", fontWeight: "800", color: "#000", lineHeight: "1.4", marginBottom: "25px" },
  optionsContainer: { display: "flex", flexDirection: "column", gap: "12px" },
  optionBox: { display: "flex", alignItems: "center", gap: "12px", padding: "18px", borderRadius: "15px", border: "2px solid", cursor: "pointer", transition: "0.2s" },
  radioCircle: { width: "18px", height: "18px", borderRadius: "50%", border: "2px solid", display: "flex", justifyContent: "center", alignItems: "center" },
  radioInner: { width: "9px", height: "9px", borderRadius: "50%", background: "#FF6B00" },
  optText: { fontSize: "16px", fontWeight: "600" },
  navRow: { display: "flex", gap: "15px", marginTop: "25px" },
  backBtn: { flex: 1, padding: "16px", borderRadius: "14px", border: "1px solid #DDD", background: "#FFF", fontWeight: "800", cursor: "pointer" },
  nextBtn: { flex: 1, padding: "16px", borderRadius: "14px", border: "none", background: "#000", color: "#FFF", fontWeight: "800", cursor: "pointer" },
  submitBtn: { flex: 1, padding: "16px", borderRadius: "14px", border: "none", background: "#FF6B00", color: "#FFF", fontWeight: "800", cursor: "pointer" },
  fullCenter: { height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", textAlign: "center", background: "#FFF" },
  resCard: { padding: "30px", maxWidth: "400px", width: "90%", background: "#FFF", borderRadius: "30px", boxShadow: "0 20px 40px rgba(0,0,0,0.1)" },
  resCircle: { width: "120px", height: "120px", borderRadius: "50%", background: "#F0F0F0", color: "#FF6B00", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "32px", fontWeight: "900", margin: "20px auto", border: "5px solid #FF6B00" },
  resStats: { marginBottom: "25px", fontSize: "18px" },
  finishBtn: { background: "#000", color: "#FFF", width: "100%", padding: "16px", borderRadius: "14px", border: "none", fontWeight: "800", cursor: "pointer" },
  center: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontWeight: "900", color: "#FF6B00", fontSize: "20px" }
};

export default AttemptQuizPage;