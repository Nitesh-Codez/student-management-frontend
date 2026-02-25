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
  const [activeQuestion, setActiveQuestion] = useState(0); 
  
  const questionRefs = useRef([]);
  const bubbleRefs = useRef([]);

  const API_BASE_URL = "https://student-management-system-4-hose.onrender.com";

  useEffect(() => {
    window.scrollTo(0, 0);
    // Resetting body and html for true edge-to-edge
    document.documentElement.style.margin = "0";
    document.documentElement.style.padding = "0";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.overflowX = "hidden";

    const fetchReviewData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/api/quiz/review/${quizId}/${studentId}`);
        if (response.data && response.data.success) {
          setReviewData(response.data.data);
        }
      } catch (err) {
        console.error("Error fetching data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReviewData();
  }, [quizId, studentId]);

  // SCROLL OBSERVER - Track active bubble and move it
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index'));
            setActiveQuestion(index);
            
            // Auto-center the bubble in the horizontal roadmap
            if (bubbleRefs.current[index]) {
              bubbleRefs.current[index].scrollIntoView({
                behavior: 'smooth',
                inline: 'center',
                block: 'nearest'
              });
            }
          }
        });
      },
      { threshold: 0.4, rootMargin: "-20% 0px -50% 0px" } 
    );
    questionRefs.current.forEach((ref) => { if (ref) observer.observe(ref); });
    return () => observer.disconnect();
  }, [loading, reviewData]);

  const scrollToQuestion = (index) => {
    if (questionRefs.current[index]) {
      const yOffset = -130; 
      const element = questionRefs.current[index];
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  if (loading) return (
    <div style={styles.centerFullPage}>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
        <FaChartLine size={40} color="#065f46" />
      </motion.div>
    </div>
  );

  const { quiz_info = {}, questions = [], student_answers = [], student_result = {} } = reviewData || {};
  const totalQuestions = questions.length;
  const scorePercent = Math.round(((student_result.score || 0) / (totalQuestions || 1)) * 100);

  const starAnim = (delay) => ({
    animate: { scale: [0, 1, 0.8, 1], opacity: [0, 1, 0.5, 1], y: [0, -15, 0] },
    transition: { duration: 3, repeat: Infinity, delay: delay, ease: "easeInOut" }
  });

  return (
    <div style={styles.fullWidthWrapper}>
      
      {/* HEADER - Corner to Corner */}
      <header style={styles.mainHeader}>
        <div style={styles.navBar}>
          <button onClick={() => navigate(-1)} style={styles.navActionBtn}><FaChevronLeft /></button>
          <div style={styles.headerInfo}>
            <h1 style={styles.quizMainTitle}>{quiz_info.title}</h1>
            <p style={styles.quizSubTitle}>Assessment Performance</p>
          </div>
          <button onClick={() => navigate(-1)} style={styles.navActionBtn}><FaTimes /></button>
        </div>

        <div style={styles.heroScoreContainer}>
          {[0, 0.5, 1, 1.5, 2].map((d, i) => (
            <motion.div key={i} {...starAnim(d)} style={{...styles.starPos, ...(i===0?{top:'-10px', left:'15%'}:i===1?{top:'20px', right:'10%'}:i===2?{bottom:'10px', left:'5%'}:i===3?{top:'-20px', right:'25%'}:{bottom:'30px', right:'5%'})}}>
              <FaStar size={i % 2 === 0 ? 14 : 18} color="#FFD700" />
            </motion.div>
          ))}
          <div style={styles.trophyOuter}><FaAward size={35} color="#FFD700" /></div>
          <h2 style={styles.scoreDisplay}>{scorePercent}%</h2>
          <div style={{...styles.passBadge, backgroundColor: scorePercent >= 40 ? '#10b981' : '#ef4444'}}>
            {scorePercent >= 40 ? "QUALIFIED" : "NOT QUALIFIED"}
          </div>
        </div>
      </header>

      {/* STATS STRIP - Perfectly Aligned */}
      <section style={styles.statsSection}>
        <div style={styles.statsGrid}>
          <div style={styles.statItem}><span style={styles.statNumber}>{totalQuestions}</span><span style={styles.statLabel}>TOTAL</span></div>
          <div style={{...styles.statItem, color: '#10b981'}}><span style={styles.statNumber}>{student_result.score || 0}</span><span style={styles.statLabel}>CORRECT</span></div>
          <div style={{...styles.statItem, color: '#ef4444'}}><span style={styles.statNumber}>{totalQuestions - (student_result.score || 0)}</span><span style={styles.statLabel}>WRONG</span></div>
          <div style={{...styles.statItem, borderRight: 'none', color: '#64748b'}}><span style={styles.statNumber}>{questions.filter((_, i) => !student_answers[i]).length}</span><span style={styles.statLabel}>SKIPPED</span></div>
        </div>
      </section>

      {/* STICKY ROADMAP - Corner to Corner Scroll */}
      <div style={styles.stickyJumpWrapper}>
        <div style={styles.mapHeader}>
          <span style={styles.sectionHeading}><FaBolt color="#f59e0b" /> Question Roadmap</span>
          <span style={styles.activeIndicator}>Q. {activeQuestion + 1} / {totalQuestions}</span>
        </div>
        <div style={styles.bubbleFlex} className="no-scrollbar">
          {questions.map((q, i) => {
            const isActive = activeQuestion === i;
            const isCorrect = student_answers[i] === (q.correct_option || q.correctAnswer);
            const isSkipped = !student_answers[i];

            return (
              <button
                key={i}
                ref={el => (bubbleRefs.current[i] = el)}
                onClick={() => scrollToQuestion(i)}
                style={{ 
                  ...styles.jumpBubble, 
                  background: isActive ? "#065f46" : (isSkipped ? "#f1f5f9" : (isCorrect ? "#ecfdf5" : "#fef2f2")),
                  color: isActive ? "#fff" : (isSkipped ? "#64748b" : (isCorrect ? "#10b981" : "#ef4444")),
                  borderColor: isActive ? "#065f46" : "currentColor",
                  boxShadow: isActive ? "0 4px 12px rgba(6, 95, 70, 0.3)" : "none"
                }}
              >{i + 1}</button>
            );
          })}
        </div>
      </div>

      {/* QUESTIONS CONTENT - Edge to Edge Layout */}
      <main style={styles.contentBody}>
        {questions.map((q, index) => {
          const studentChoice = student_answers[index];
          const correctAns = q.correct_option || q.correctAnswer;
          const isCorrect = studentChoice === correctAns;

          return (
            <div 
              key={index} 
              data-index={index}
              ref={el => (questionRefs.current[index] = el)} 
              style={{
                ...styles.qCard,
                backgroundColor: activeQuestion === index ? '#fff' : '#fafafa',
                borderLeft: activeQuestion === index ? '8px solid #065f46' : '8px solid transparent'
              }}
            >
              <div style={styles.qCardHeader}>
                <span style={styles.qCircleIndex}>Question {index + 1}</span>
                <span style={{...styles.statusTag, color: !studentChoice ? '#64748b' : (isCorrect ? '#10b981' : '#ef4444')}}>
                  {!studentChoice ? 'SKIPPED' : (isCorrect ? 'CORRECT' : 'INCORRECT')}
                </span>
              </div>

              <h3 style={styles.questionTextTitle}>{q.question_text || q.question}</h3>

              <div style={styles.optionsWrapperGrid}>
                {q.options?.map((opt, i) => {
                  const isCorrectOpt = opt === correctAns;
                  const isUserOpt = opt === studentChoice;
                  return (
                    <div key={i} style={{ 
                      ...styles.optionBoxSingle, 
                      backgroundColor: isCorrectOpt ? "#ecfdf5" : (isUserOpt ? "#fef2f2" : "#fff"), 
                      borderColor: isCorrectOpt ? "#10b981" : (isUserOpt ? "#ef4444" : "#e2e8f0") 
                    }}>
                      <div style={{...styles.alphaPrefix, backgroundColor: isCorrectOpt ? '#10b981' : (isUserOpt ? '#ef4444' : '#f1f5f9'), color: (isCorrectOpt || isUserOpt) ? '#fff' : '#64748b'}}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      <p style={styles.optionTextContent}>{opt}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div style={{ height: "100px" }} />
      </main>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
};

const styles = {
  fullWidthWrapper: { width: "100%", minHeight: "100vh", backgroundColor: "#fff" },
  mainHeader: { 
    background: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)", 
    padding: "50px 20px 80px 20px", textAlign: "center", color: "#fff",
    borderBottomLeftRadius: '40px', borderBottomRightRadius: '40px'
  },
  navBar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: '15px' },
  navActionBtn: { background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: "42px", height: "42px", borderRadius: "12px", display: 'flex', alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1 },
  quizMainTitle: { fontSize: "18px", fontWeight: "900", margin: 0 },
  quizSubTitle: { fontSize: "10px", opacity: 0.7, textTransform: 'uppercase' },
  
  heroScoreContainer: { position: 'relative', display: 'inline-block' },
  starPos: { position: 'absolute', zIndex: 1 },
  trophyOuter: { margin: "0 auto 10px", width: "70px", height: "70px", background: "rgba(255,255,255,0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" },
  scoreDisplay: { fontSize: "50px", fontWeight: "900", margin: 0 },
  passBadge: { display: "inline-block", padding: "6px 18px", borderRadius: "30px", fontSize: "11px", fontWeight: "900" },

  statsSection: { width: "100%", padding: "0 20px", marginTop: "-40px" },
  statsGrid: { 
    background: "#fff", borderRadius: "15px", padding: "20px 0px",
    display: "grid", gridTemplateColumns: "repeat(4, 1fr)", boxShadow: "0 10px 30px rgba(0,0,0,0.12)" 
  },
  statItem: { textAlign: "center", borderRight: "1px solid #f1f5f9" },
  statNumber: { display: "block", fontSize: "20px", fontWeight: "900" },
  statLabel: { fontSize: "9px", fontWeight: "800", opacity: 0.4 },

  stickyJumpWrapper: { 
    position: 'sticky', top: 0, background: '#fff', 
    zIndex: 100, padding: '15px 0', borderBottom: '1px solid #f1f5f9' 
  },
  mapHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', marginBottom: '10px' },
  sectionHeading: { fontSize: '13px', fontWeight: '900', color: '#1e293b' },
  activeIndicator: { fontSize: '10px', fontWeight: '800', color: '#065f46', background: '#ecfdf5', padding: '4px 10px', borderRadius: '15px' },
  bubbleFlex: { display: "flex", gap: "12px", overflowX: "auto", padding: "5px 20px 15px 20px" },
  jumpBubble: { minWidth: "45px", height: "45px", borderRadius: "12px", border: "1.5px solid", fontSize: "15px", fontWeight: "900", display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: '0.3s' },

  contentBody: { width: "100%" },
  qCard: { padding: "35px 20px", borderBottom: "1px solid #f1f5f9", transition: '0.3s' },
  qCardHeader: { display: "flex", justifyContent: "space-between", marginBottom: "15px", alignItems: 'center' },
  qCircleIndex: { fontWeight: "900", color: "#065f46", fontSize: '13px', background: '#ecfdf5', padding: '5px 12px', borderRadius: '8px' },
  statusTag: { fontSize: "11px", fontWeight: "900" },
  questionTextTitle: { fontSize: "19px", fontWeight: "800", color: "#1e293b", marginBottom: "25px", lineHeight: '1.5' },
  optionsWrapperGrid: { display: "flex", flexDirection: "column", gap: "12px" },
  optionBoxSingle: { padding: "16px", borderRadius: "16px", border: "2px solid", display: "flex", alignItems: "center", gap: "15px" },
  alphaPrefix: { width: "32px", height: "32px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "900" },
  optionTextContent: { flex: 1, margin: 0, fontWeight: "700", fontSize: '15px', color: '#334155' },

  centerFullPage: { height: "100vh", width: '100%', display: "flex", alignItems: "center", justifyContent: "center" }
};

export default QuizReview;