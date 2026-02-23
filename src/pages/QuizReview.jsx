import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaTimes, FaChevronLeft, FaCheckCircle, FaStar,
  FaRegTimesCircle, FaBolt, FaAward, FaChartLine, FaHistory 
} from 'react-icons/fa';
import { motion } from "framer-motion";
import axios from 'axios';

const QuizReview = () => {
  const { quizId, studentId } = useParams();
  const navigate = useNavigate();
  const [reviewData, setReviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeQuestion, setActiveQuestion] = useState(0); 
  const questionRefs = useRef([]);

  const API_BASE_URL = "https://student-management-system-4-hose.onrender.com";

  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.overflowX = "hidden";

    const fetchReviewData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/api/quiz/review/${quizId}/${studentId}`);
        if (response.data && response.data.success) {
          setReviewData(response.data.data);
        } else {
          setError("Failed to fetch review data.");
        }
      } catch (err) {
        setError("Network error.");
      } finally {
        setLoading(false);
      }
    };
    fetchReviewData();
  }, [quizId, studentId]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveQuestion(parseInt(entry.target.getAttribute('data-index')));
          }
        });
      },
      { threshold: 0.7, rootMargin: "-10% 0px -70% 0px" } 
    );
    questionRefs.current.forEach((ref) => { if (ref) observer.observe(ref); });
    return () => observer.disconnect();
  }, [loading, reviewData]);

  const scrollToQuestion = (index) => {
    if (questionRefs.current[index]) {
      questionRefs.current[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  if (loading) return (
    <div style={styles.centerFullPage}>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
        <FaChartLine size={40} color="#3b82f6" />
      </motion.div>
      <p style={{marginTop: '20px', fontWeight: '700'}}>Building Your Report...</p>
    </div>
  );

  const { quiz_info = {}, questions = [], student_answers = [], student_result = {} } = reviewData || {};
  
  const totalQuestions = questions.length;
  const correctCount = student_result.score || 0;
  const notAttemptedCount = questions.filter((_, idx) => !student_answers[idx]).length;
  const wrongCount = totalQuestions - correctCount - notAttemptedCount;
  const scorePercent = Math.round((correctCount / (totalQuestions || 1)) * 100);

  // Star Animation Helper
  const starAnim = (delay) => ({
    animate: {
      scale: [0, 1, 0.8, 1],
      opacity: [0, 1, 0.5, 1],
      y: [0, -15, 0],
    },
    transition: {
      duration: 3,
      repeat: Infinity,
      delay: delay,
      ease: "easeInOut"
    }
  });

  return (
    <div style={styles.fullWidthWrapper}>
      
      {/* HEADER */}
      <header style={styles.mainHeader}>
        <div style={styles.navBar}>
          <motion.button whileTap={{scale: 0.9}} onClick={() => navigate(-1)} style={styles.navActionBtn}><FaChevronLeft /></motion.button>
          <div style={styles.headerInfo}>
            <h1 style={styles.quizMainTitle}>{quiz_info.title}</h1>
            <p style={styles.quizSubTitle}>Quiz Analytics Performance</p>
          </div>
          <motion.button whileTap={{scale: 0.9}} onClick={() => navigate(-1)} style={styles.navActionBtn}><FaTimes /></motion.button>
        </div>

        <div style={styles.heroScoreContainer}>
          {/* 5 Animated Stars */}
          <motion.div {...starAnim(0)} style={{...styles.starPos, top: '-20px', left: '20%'}}><FaStar size={14} color="#FFD700" /></motion.div>
          <motion.div {...starAnim(0.5)} style={{...styles.starPos, top: '10px', right: '15%'}}><FaStar size={18} color="#FFD700" /></motion.div>
          <motion.div {...starAnim(1)} style={{...styles.starPos, bottom: '40px', left: '10%'}}><FaStar size={12} color="#FFD700" /></motion.div>
          <motion.div {...starAnim(1.5)} style={{...styles.starPos, top: '-10px', right: '30%'}}><FaStar size={15} color="#FFD700" /></motion.div>
          <motion.div {...starAnim(2)} style={{...styles.starPos, bottom: '20px', right: '10%'}}><FaStar size={14} color="#FFD700" /></motion.div>

          <div style={styles.trophyOuter}>
            <FaAward size={35} color="#FFD700" />
          </div>
          <h2 style={styles.scoreDisplay}>{scorePercent}%</h2>
          <div style={{...styles.passBadge, backgroundColor: scorePercent >= 40 ? '#10b981' : '#ef4444'}}>
            {scorePercent >= 40 ? "QUALIFIED" : "NOT QUALIFIED"}
          </div>
        </div>
      </header>

      {/* STATS STRIP */}
      <section style={styles.statsSection}>
        <div style={styles.statsGrid}>
          <div style={styles.statItem}>
            <span style={styles.statNumber}>{totalQuestions}</span>
            <span style={styles.statLabel}>TOTAL</span>
          </div>
          <div style={{...styles.statItem, color: '#10b981'}}>
            <span style={styles.statNumber}>{correctCount}</span>
            <span style={styles.statLabel}>CORRECT</span>
          </div>
          <div style={{...styles.statItem, color: '#ef4444'}}>
            <span style={styles.statNumber}>{wrongCount}</span>
            <span style={styles.statLabel}>WRONG</span>
          </div>
          <div style={{...styles.statItem, color: '#64748b', borderRight: 'none'}}>
            <span style={styles.statNumber}>{notAttemptedCount}</span>
            <span style={styles.statLabel}>SKIPPED</span>
          </div>
        </div>
      </section>

      {/* STICKY NAV MAP */}
      <div style={styles.stickyJumpWrapper}>
        <div style={styles.mapHeader}>
          <span style={styles.sectionHeading}><FaBolt color="#f59e0b" /> Roadmap</span>
          <span style={styles.activeIndicator}>Question {activeQuestion + 1} of {totalQuestions}</span>
        </div>
        <div style={styles.bubbleFlex} className="no-scrollbar">
          {questions.map((q, i) => {
            const correctAns = q.correct_option || q.correctAnswer;
            const isCorrect = student_answers[i] === correctAns;
            const isSkipped = !student_answers[i];
            const isActive = activeQuestion === i;

            return (
              <motion.button
                key={i}
                whileTap={{ scale: 0.8 }}
                onClick={() => scrollToQuestion(i)}
                style={{ 
                  ...styles.jumpBubble, 
                  background: isActive 
                    ? "radial-gradient(circle at 30% 30%, #60a5fa, #2563eb)" 
                    : (isSkipped ? "rgba(148, 163, 184, 0.1)" : (isCorrect ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)")),
                  color: isActive ? "#fff" : (isSkipped ? "#64748b" : (isCorrect ? "#10b981" : "#ef4444")),
                  border: isActive ? "none" : `1px solid currentColor`,
                  boxShadow: isActive ? "0 10px 20px rgba(37, 99, 235, 0.4)" : "none",
                  zIndex: isActive ? 2 : 1
                }}
              >
                {i + 1}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* QUESTIONS CONTENT */}
      <main style={styles.contentBody}>
        {questions.map((q, index) => {
          const studentChoice = student_answers[index];
          const correctAns = q.correct_option || q.correctAnswer;
          const isCorrect = studentChoice === correctAns;
          const isSkipped = !studentChoice;

          return (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              key={index} 
              data-index={index}
              ref={el => (questionRefs.current[index] = el)} 
              style={{
                ...styles.qCard,
                backgroundColor: activeQuestion === index ? '#f0f9ff' : '#fff',
                borderColor: activeQuestion === index ? '#bae6fd' : '#f1f5f9'
              }}
            >
              <div style={styles.qCardHeader}>
                <span style={styles.qCircleIndex}>Q. {index + 1}</span>
                <div style={styles.statusTag}>
                  {isSkipped ? <span style={{color: '#64748b'}}><FaHistory /> NOT ATTEMPTED</span> : 
                   isCorrect ? <span style={{color: '#10b981'}}><FaCheckCircle /> CORRECT</span> : 
                   <span style={{color: '#ef4444'}}><FaRegTimesCircle /> INCORRECT</span>}
                </div>
              </div>

              <h3 style={styles.questionTextTitle}>{q.question_text || q.question}</h3>

              <div style={styles.optionsWrapperGrid}>
                {q.options?.map((opt, i) => {
                  const isTheCorrectOne = opt === correctAns;
                  const isTheUserChoice = opt === studentChoice;

                  let fillBg = "#ffffff";
                  let strokeColor = "#e2e8f0";

                  if (isTheCorrectOne) { 
                    fillBg = "#ecfdf5"; 
                    strokeColor = "#10b981";
                  }
                  else if (isTheUserChoice) { 
                    fillBg = "#fef2f2"; 
                    strokeColor = "#ef4444"; 
                  }

                  return (
                    <div key={i} style={{ 
                      ...styles.optionBoxSingle, 
                      backgroundColor: fillBg, 
                      borderColor: strokeColor 
                    }}>
                      <div style={{
                        ...styles.alphaPrefix,
                        backgroundColor: isTheCorrectOne ? '#10b981' : (isTheUserChoice ? '#ef4444' : '#f1f5f9'),
                        color: isTheCorrectOne || isTheUserChoice ? '#fff' : '#64748b'
                      }}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      <p style={{...styles.optionTextContent, color: isTheCorrectOne ? '#065f46' : (isTheUserChoice ? '#991b1b' : '#334155')}}>{opt}</p>
                      {isTheCorrectOne && <FaCheckCircle color="#10b981" size={18} />}
                      {!isTheCorrectOne && isTheUserChoice && <FaRegTimesCircle color="#ef4444" size={18} />}
                    </div>
                  );
                })}
              </div>

              {!isCorrect && !isSkipped && (
                <div style={styles.answerGuide}>
                  <strong>Correct Answer:</strong> {correctAns}
                </div>
              )}
            </motion.div>
          );
        })}
      </main>

      <div style={{height: '80px', background: '#f8fafc'}} />

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  );
};

const styles = {
  fullWidthWrapper: { width: "100vw", minHeight: "100vh", backgroundColor: "#f8fafc", position: 'relative' },
  mainHeader: { 
    background: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)", 
    padding: "50px 20px 70px 20px", textAlign: "center", color: "#fff",
    borderBottomLeftRadius: '30px', borderBottomRightRadius: '30px', position: 'relative',marginBottom: '40px',
  },
  navBar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: '20px' },
  navActionBtn: { background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: "45px", height: "45px", borderRadius: "14px", display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  headerInfo: { flex: 1 },
  quizMainTitle: { fontSize: "20px", fontWeight: "900", margin: 0 },
  quizSubTitle: { fontSize: "12px", opacity: 0.7, textTransform: 'uppercase', marginTop: '5px' },
  
  heroScoreContainer: { position: 'relative', display: 'inline-block' },
  starPos: { position: 'absolute', zIndex: 1 },
  trophyOuter: { margin: "0 auto 15px", width: "75px", height: "75px", background: "rgba(255,255,255,0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" },
  scoreDisplay: { fontSize: "55px", fontWeight: "900", margin: 0 },
  passBadge: { display: "inline-block", padding: "6px 20px", borderRadius: "30px", fontSize: "11px", fontWeight: "900" },

  statsSection: { width: "100%", padding: "0 20px", marginTop: "-35px" },
  statsGrid: { 
    background: "#fff", borderRadius: "10px", paddingLeft: "1px", padding: "20px 0px",
    display: "grid", gridTemplateColumns: "repeat(4, 1fr)", boxShadow: "0 15px 35px rgba(0,0,0,0.08)" 
  },
  statItem: { textAlign: "center", borderRight: "1px solid #f1f5f9" },
  statNumber: { display: "block", fontSize: "22px", fontWeight: "900" },
  statLabel: { fontSize: "9px", fontWeight: "800", opacity: 0.4, marginTop: '2px' },

  stickyJumpWrapper: { 
    position: 'sticky', top: 0, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(15px)', 
    zIndex: 100, padding: '15px 20px', borderBottom: '1px solid #f1f5f9' 
  },
  mapHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  sectionHeading: { fontSize: '13px', fontWeight: '900', color: '#1e293b' },
  activeIndicator: { fontSize: '11px', fontWeight: '700', color: '#3b82f6', background: '#eff6ff', padding: '4px 10px', borderRadius: '20px' },
  bubbleFlex: { display: "flex", gap: "15px", overflowX: "auto", padding: "10px 0" },
  jumpBubble: { 
    minWidth: "46px", height: "46px", borderRadius: "50%", border: "none", 
    fontSize: "15px", fontWeight: "900", cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
  },

  contentBody: { width: "100%", padding: "10px 0" },
  qCard: { padding: "35px 20px", borderBottom: "1px solid #f1f5f9" },
  qCardHeader: { display: "flex", justifyContent: "space-between", marginBottom: "20px", alignItems: 'center' },
  qCircleIndex: { fontWeight: "900", color: "#064e3b", fontSize: '14px', background: '#ecfdf5', padding: '5px 12px', borderRadius: '10px' },
  statusTag: { fontSize: "11px", fontWeight: "900" },
  questionTextTitle: { fontSize: "19px", fontWeight: "800", color: "#1e293b", marginBottom: "25px", lineHeight: '1.6' },
  optionsWrapperGrid: { display: "flex", flexDirection: "column", gap: "12px" },
  optionBoxSingle: { padding: "16px", borderRadius: "16px", border: "2px solid", display: "flex", alignItems: "center", gap: "15px" },
  alphaPrefix: { width: "32px", height: "32px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "900" },
  optionTextContent: { flex: 1, margin: 0, fontWeight: "700", fontSize: '15px' },
  answerGuide: { marginTop: '20px', padding: '12px 18px', background: '#f0fdf4', borderRadius: '12px', color: '#065f46', fontSize: '13px', borderLeft: '4px solid #10b981' },

  centerFullPage: { height: "100vh", width: '100vw', display: "flex", flexDirection: 'column', alignItems: "center", justifyContent: "center", backgroundColor: '#fff' }
};

export default QuizReview;