import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";

export default function AdminFeedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get("https://student-management-system-4-hose.onrender.com/api/feedback/admin/all");
        // Backend se data aane ke baad console check karein: console.log(res.data.feedbacks);
        setFeedbacks(res.data.feedbacks || []);
      } catch (err) { console.error("Error fetching feedback:", err); }
      setLoading(false);
    };
    fetch();
  }, []);

  // Calculation Logic: 1-2 = Positive, 3-4 = Negative
  const calcSentiment = (mcq) => {
    if (!mcq || mcq.length === 0) return { pos: 0, neg: 0 };
    
    // Yahan 'answer' key check kar rahe hain jo controller se aa rahi hai
    const posCount = mcq.filter(item => item.answer <= 2).length;
    const negCount = mcq.length - posCount;
    
    const posPercent = Math.round((posCount / mcq.length) * 100);
    const negPercent = 100 - posPercent;
    
    return { pos: posPercent, neg: negPercent };
  };

  const grouped = feedbacks.reduce((acc, f) => {
    const months = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const key = `${months[f.month]} ${f.year}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {});

  if (loading) return <div style={center}>Loading Analytics Data...</div>;

  return (
    <div style={container}>
      <h1 style={title}>System Feedback Analytics</h1>
      
      {Object.keys(grouped).length === 0 ? (
        <div style={center}>No feedback records found.</div>
      ) : (
        Object.keys(grouped).map(monthKey => (
          <div key={monthKey} style={monthSection}>
            <h2 style={monthTitle}>{monthKey}</h2>
            <div style={grid}>
              {grouped[monthKey].map(f => {
                const { pos, neg } = calcSentiment(f.mcq_answers);
                return (
                  <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} key={f.id} style={card}>
                    <div style={cardTop}>
                      <span style={name}>{f.name}</span>
                      <span style={badge}>Class {f.class}</span>
                    </div>
                    
                    <div style={ratingBox}>
                      {"⭐".repeat(f.rating)}
                      <span style={{fontSize: '12px', color: '#64748b', marginLeft: '8px'}}>({f.rating}/5)</span>
                    </div>

                    <div style={commentBox}>
                      <p style={textStyle}><b>Issue:</b> {f.problem || "None"}</p>
                      <p style={textStyle}><b>Suggest:</b> {f.suggestion || "None"}</p>
                    </div>

                    {/* Stats Section */}
                    <div style={statsContainer}>
                      <div style={statHeader}>
                        <span style={{color: '#10b981'}}>Positive: {pos}%</span>
                        <span style={{color: '#f87171'}}>Negative: {neg}%</span>
                      </div>
                      
                      {/* Double Progress Bar */}
                      <div style={multiBarBg}>
                        <div style={{...posBar, width: `${pos}%`}} />
                        <div style={{...negBar, width: `${neg}%`}} />
                      </div>
                      
                      <p style={footerNote}>Based on 10 Question Analysis</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ================= STYLES =================
const container = { padding: "40px 20px", background: "#0f172a", minHeight: "100vh", color: "#f8fafc" };
const title = { fontSize: "28px", fontWeight: "900", color: "#60a5fa", marginBottom: "30px", textAlign: 'center' };
const monthSection = { marginBottom: "50px" };
const monthTitle = { borderLeft: "4px solid #6366f1", paddingLeft: "15px", color: "#fff", fontSize: "20px", marginBottom: "20px" };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" };

const card = { background: "#1e293b", borderRadius: "18px", padding: "20px", border: "1px solid #334155", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" };
const cardTop = { display: "flex", justifyContent: "space-between", alignItems: 'center', marginBottom: "12px" };
const name = { fontWeight: "700", color: "#f8fafc", fontSize: '16px' };
const badge = { background: "rgba(99, 102, 241, 0.2)", color: "#818cf8", padding: "4px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: 'bold' };
const ratingBox = { marginBottom: "15px" };

const commentBox = { background: "#0f172a", padding: "12px", borderRadius: "10px", marginBottom: "20px" };
const textStyle = { fontSize: "13px", color: "#94a3b8", margin: "4px 0", lineHeight: '1.4' };

const statsContainer = { marginTop: "10px" };
const statHeader = { display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "800", marginBottom: "8px" };

// Progress Bar Style
const multiBarBg = { height: "10px", background: "#334155", borderRadius: "20px", display: "flex", overflow: "hidden" };
const posBar = { height: "100%", background: "#10b981", transition: "width 0.5s ease-in-out" };
const negBar = { height: "100%", background: "#f87171", transition: "width 0.5s ease-in-out" };

const footerNote = { fontSize: "10px", color: "#475569", marginTop: "8px", textAlign: 'center', fontStyle: 'italic' };
const center = { textAlign: "center", padding: "100px", color: "#94a3b8", fontSize: '18px' };