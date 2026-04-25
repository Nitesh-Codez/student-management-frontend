import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const AttemptQuizPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const API_URL = "https://student-management-system-4-hose.onrender.com";
  const user = JSON.parse(localStorage.getItem("user"));
  const studentId = user?.id || user?._id;

  const TIMER_KEY = `quiz_expiry_${id}_${studentId}`;
  const ANSWERS_KEY = `quiz_answers_${id}_${studentId}`;

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // --- MATH FORMATTING LOGIC (REFINED) ---
  const formatMath = (text) => {
    if (!text) return "";
    let str = text.toString();

    // 1. Fractions: 3/4 -> ¾
    const fractions = { "1/2": "½", "1/4": "¼", "3/4": "¾", "1/3": "⅓", "2/3": "⅔" };
    Object.keys(fractions).forEach(f => {
      str = str.replace(new RegExp(f, 'g'), fractions[f]);
    });

    // 2. Square Root: sqrt(x) -> √x
    str = str.replace(/sqrt\((.*?)\)/g, "√$1");
    str = str.replace(/sqrt/g, "√");

    // 3. Superscripts: restricted to avoid greedy matching
    const superscripts = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', 
      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
      'n': 'ⁿ', 'x': 'ˣ', 'y': 'ʸ', '+': '⁺', '-': '⁻', '(': '⁽', ')': '⁾'
    };
    
    // Regex matches ^ followed by a single char or brackets ^(abc)
    str = str.replace(/\^(\((.*?)\)|[0-9nxy+-])/g, (match, p1, p2) => {
      const content = p2 || p1; 
      return content.split('').map(char => superscripts[char] || char).join('');
    });

    // 4. Other Symbols
    str = str.replace(/pi/g, "π");
    str = str.replace(/degree/g, "°");
    str = str.replace(/!=/g, "≠");
    str = str.replace(/<=/g, "≤");
    str = str.replace(/>=/g, "≥");
    str = str.replace(/\*/g, "×"); 

    return str;
  };

  // --- SUBMIT LOGIC ---
  const handleSubmit = useCallback(async (finalAnswers = answers) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await axios.post(`${API_URL}/api/quiz/submit`, {
        student_id: studentId,
        quiz_id: id,
        answers: finalAnswers,
      });
      localStorage.removeItem(TIMER_KEY);
      localStorage.removeItem(ANSWERS_KEY);
      setResult(res.data.data || res.data);
    } catch (err) {
      console.error(err);
      alert("Error submitting quiz.");
    } finally {
      setSubmitting(false);
    }
  }, [id, studentId, answers, API_URL, submitting, TIMER_KEY, ANSWERS_KEY]);

  // --- INITIAL DATA FETCH ---
  useEffect(() => {
    document.body.style.backgroundColor = "#46a805"; 
    axios.get(`${API_URL}/api/quiz/${id}`).then((res) => {
      const quizData = res.data;
      setQuiz(quizData);
      const q = typeof quizData.questions === 'string' ? JSON.parse(quizData.questions) : quizData.questions;
      setQuestions(q);

      const savedAnswers = localStorage.getItem(ANSWERS_KEY);
      setAnswers(savedAnswers ? JSON.parse(savedAnswers) : new Array(q.length).fill(null));

      const savedExpiry = localStorage.getItem(TIMER_KEY);
      let expiryTime = savedExpiry ? parseInt(savedExpiry) : Date.now() + quizData.timer_minutes * 60 * 1000;
      if (!savedExpiry) localStorage.setItem(TIMER_KEY, expiryTime.toString());

      setTimeLeft(Math.max(0, Math.floor((expiryTime - Date.now()) / 1000)));
    });
  }, [id, API_URL, TIMER_KEY, ANSWERS_KEY]);

  // --- TIMER LOGIC ---
  useEffect(() => {
    if (timeLeft === null || result) return;
    if (timeLeft <= 0) { if (!submitting) handleSubmit(); return; }
    const timer = setInterval(() => setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, result, handleSubmit, submitting]);

  const handleOptionSelect = (opt) => {
    const newAns = [...answers];
    newAns[currentIdx] = opt;
    setAnswers(newAns);
    localStorage.setItem(ANSWERS_KEY, JSON.stringify(newAns));

    if (currentIdx < questions.length - 1) {
      setTimeout(() => {
        setCurrentIdx(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 600);
    }
  };

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!quiz) return <div style={styles.center}>Loading Premium Quiz Experience...</div>;

  if (result) return (
    <div style={styles.fullCenter}>
       <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={styles.resCard}>
         <div style={styles.resIcon}>🏆</div>
         <h2 style={{color: '#FFF', fontSize: '28px', marginBottom: '10px'}}>Quiz Finished!</h2>
         <p style={{color: '#94a3b8'}}>Your performance summary</p>
         <div style={styles.resCircle}>{Math.round(result.percentage)}%</div>
         <div style={styles.scoreRow}>
           <span>Score: {result.score}/{quiz.total_marks}</span>
         </div>
         <button onClick={() => navigate("/student/dashboard")} style={styles.finishBtn}>Go to Dashboard</button>
       </motion.div>
    </div>
  );

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <div style={styles.titleInfo}>
            <h2 style={styles.quizTitle}>{quiz.title}</h2>
            <p style={styles.subText}>{quiz.subject} • {questions.length} Questions</p>
          </div>
          <motion.div 
            animate={timeLeft < 60 ? { scale: [1, 1.05, 1] } : {}}
            transition={{ repeat: Infinity, duration: 0.5 }}
            style={{...styles.timerBox, color: timeLeft < 60 ? '#ff4d4d' : '#4ADEDE'}}
          >
            {formatTime(timeLeft)}
          </motion.div>
        </div>

        <div style={styles.bubbleScrollWrapper}>
            <div style={styles.bubbleContainer}>
                {questions.map((_, index) => {
                    const isCurrent = currentIdx === index;
                    const isAttempted = answers[index] !== null;
                    return (
                        <motion.div 
                            key={index} 
                            onClick={() => setCurrentIdx(index)}
                            whileTap={{ scale: 0.9 }}
                            style={{
                                ...styles.bubble,
                                background: isCurrent ? '#4ADEDE' : isAttempted ? '#FFF' : 'rgba(255,255,255,0.1)',
                                color: isCurrent ? '#000' : isAttempted ? '#000' : '#FFF',
                                border: isCurrent ? '2px solid #FFF' : '1px solid rgba(255,255,255,0.2)'
                            }}
                        >
                            {index + 1}
                        </motion.div>
                    );
                })}
            </div>
        </div>
      </div>

      <div style={styles.mainContent}>
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentIdx}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4 }}
            style={styles.qCard}
          >
            <div style={styles.qBadge}>Question {currentIdx + 1}</div>
            <h3 style={styles.qText}>{formatMath(questions[currentIdx]?.question)}</h3>

            <div style={styles.optionsContainer}>
              {questions[currentIdx]?.options.map((opt, i) => {
                const isSelected = answers[currentIdx] === opt;
                return (
                  <motion.div 
                    key={i} 
                    onClick={() => handleOptionSelect(opt)}
                    whileHover={{ x: 5 }}
                    style={{
                      ...styles.optionBox,
                      background: isSelected ? '#4ADEDE' : '#FFFFFF',
                      borderColor: isSelected ? '#FFF' : 'transparent',
                    }}
                  >
                    <div style={{
                        ...styles.radio, 
                        borderColor: isSelected ? '#000' : '#DDD',
                        background: isSelected ? '#000' : 'transparent'
                    }}>
                      {isSelected && <div style={styles.radioInner} />}
                    </div>
                    <span style={{
                        ...styles.optText, 
                        color: isSelected ? '#000' : '#333',
                        fontWeight: isSelected ? '700' : '500'
                    }}>{formatMath(opt)}</span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        <div style={styles.footer}>
            <button 
                disabled={currentIdx === 0}
                onClick={() => { setCurrentIdx(currentIdx - 1); window.scrollTo(0,0); }}
                style={{...styles.navBtn, opacity: currentIdx === 0 ? 0.3 : 1}}
            >
              <span>←</span> Previous
            </button>
            
            {currentIdx === questions.length - 1 ? (
                <button onClick={() => handleSubmit()} style={styles.finalBtn}>
                   {submitting ? "Processing..." : "Finish Quiz"}
                </button>
            ) : (
                <button 
                  onClick={() => { setCurrentIdx(currentIdx + 1); window.scrollTo(0,0); }} 
                  style={styles.nextBtn}
                >
                  Skip / Next <span>→</span>
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  wrapper: { width: "100%", minHeight: "100vh", background: "#4f7b31", fontFamily: "'Inter', sans-serif" },
  header: { background: "#0f172a", padding: "20px 0 15px 0", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" },
  headerTop: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 20px", marginBottom: "15px" },
  titleInfo: { textAlign: "left" },
  quizTitle: { color: "#4ADEDE", margin: 0, fontSize: "20px", fontWeight: "800", letterSpacing: "-0.5px" },
  subText: { color: "#64748b", margin: 0, fontSize: "13px", fontWeight: "500" },
  timerBox: { background: "rgba(255,255,255,0.05)", padding: "10px 18px", borderRadius: "14px", fontSize: "18px", fontWeight: "800", border: "1px solid rgba(255,255,255,0.1)" },
  bubbleScrollWrapper: { width: "100%", overflowX: "auto", paddingBottom: "5px" },
  bubbleContainer: { display: "flex", gap: "10px", padding: "0 20px" },
  bubble: { minWidth: "35px", height: "35px", borderRadius: "10px", display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer", fontSize: "14px", fontWeight: "700", transition: "0.3s all cubic-bezier(0.4, 0, 0.2, 1)" },
  mainContent: { width: "100%", maxWidth: "800px", margin: "0 auto" }, 
  qCard: { padding: "40px 20px", minHeight: "55vh" },
  qBadge: { display: "inline-block", padding: "6px 12px", background: "rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFF", fontSize: "11px", fontWeight: "900", textTransform: "uppercase", marginBottom: "15px" },
  qText: { color: "#FFF", fontSize: "26px", marginTop: "10px", lineHeight: "1.35", fontWeight: "700" },
  optionsContainer: { marginTop: "35px", display: "flex", flexDirection: "column", gap: "14px" },
  optionBox: { display: "flex", alignItems: "center", gap: "15px", padding: "22px", borderRadius: "24px", cursor: "pointer", transition: "0.2s all", boxShadow: "0 8px 20px rgba(0,0,0,0.15)", border: "2px solid transparent" },
  radio: { width: "24px", height: "24px", borderRadius: "50%", border: "2px solid", display: "flex", justifyContent: "center", alignItems: "center" },
  radioInner: { width: "10px", height: "10px", borderRadius: "50%", background: "#4ADEDE" },
  optText: { fontSize: "18px" },
  footer: { display: "flex", gap: "12px", padding: "30px 20px 50px 20px" },
  navBtn: { flex: 1, padding: "18px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.4)", background: "transparent", color: "#FFF", cursor: "pointer", fontSize: "16px", fontWeight: "600", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" },
  nextBtn: { flex: 1, padding: "18px", borderRadius: "20px", border: "none", background: "rgba(255,255,255,0.1)", color: "#FFF", fontWeight: "600", cursor: "pointer", fontSize: "16px", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" },
  finalBtn: { flex: 2, padding: "18px", borderRadius: "20px", border: "none", background: "#000", color: "#FFF", fontWeight: "800", cursor: "pointer", fontSize: "16px", boxShadow: "0 10px 25px rgba(0,0,0,0.4)" },
  center: { height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#46a805", color: "#FFF", fontWeight: "bold" },
  fullCenter: { height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#0f172a" },
  resCard: { textAlign: "center", background: "#1e293b", padding: "50px 30px", borderRadius: "40px", width: "90%", maxWidth: "450px", border: "1px solid rgba(255,255,255,0.1)" },
  resIcon: { fontSize: "60px", marginBottom: "15px" },
  resCircle: { fontSize: "65px", fontWeight: "900", color: "#4ADEDE", margin: "30px 0", textShadow: "0 0 20px rgba(74, 222, 222, 0.4)" },
  scoreRow: { fontSize: "18px", color: "#94a3b8", marginBottom: "35px" },
  finishBtn: { width: "100%", background: "#4ADEDE", border: "none", padding: "20px", borderRadius: "18px", fontWeight: "800", color: "#000", cursor: "pointer", fontSize: "16px" }
};

export default AttemptQuizPage;