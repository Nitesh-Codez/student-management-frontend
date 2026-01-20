import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const StudentMarks = () => {
  const [marks, setMarks] = useState([]);
  const [message, setMessage] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [displayPct, setDisplayPct] = useState(0);
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL;
  const user = JSON.parse(localStorage.getItem("user"));
  const userRef = useRef(user);

  const generateCaptcha = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setCaptcha(code);
  };

  useEffect(() => {
    generateCaptcha();
    const savedMarks = JSON.parse(localStorage.getItem("userMarks")) || {};
    if (userRef.current && savedMarks[userRef.current.id]) {
      setMarks(savedMarks[userRef.current.id]);
    }
  }, []);

  // Calculate Marks Logic
  const totalObt = marks.reduce((a, b) => a + b.obtained_marks, 0);
  const totalMax = marks.reduce((a, b) => a + b.total_marks, 0);
  const currentOverallPct = totalMax ? ((totalObt / totalMax) * 100).toFixed(0) : 0;

  useEffect(() => {
    let start = 0;
    const target = parseInt(currentOverallPct);
    if (target > 0) {
      const interval = setInterval(() => {
        start += 1;
        if (start >= target) {
          setDisplayPct(target);
          clearInterval(interval);
        } else {
          setDisplayPct(start);
        }
      }, 20);
      return () => clearInterval(interval);
    }
  }, [currentOverallPct]);

  const handleCheckMarks = () => {
    if (captchaInput.toUpperCase() !== captcha.toUpperCase()) {
      setMessage("❌ Captcha incorrect!");
      generateCaptcha();
      return;
    }
    setLoading(true);
    axios.post(`${API_URL}/api/marks/check`, {
        studentId: userRef.current.id,
        studentName: userRef.current.name,
      })
      .then((res) => {
        if (res.data.success && res.data.data.length > 0) {
          setMarks(res.data.data);
          setMessage("");
          const savedMarks = JSON.parse(localStorage.getItem("userMarks")) || {};
          savedMarks[userRef.current.id] = res.data.data;
          localStorage.setItem("userMarks", JSON.stringify(savedMarks));
        } else {
          setMessage("📭 No test records found.");
        }
      })
      .catch(() => setMessage("⚠️ Server Error"))
      .finally(() => setLoading(false));
  };

  const sorted = [...marks].sort((a, b) => new Date(a.test_date) - new Date(b.test_date));
  const subjects = [...new Set(sorted.map((m) => m.subject_name))];
  const themeColors = ["#8B5CF6", "#10B981", "#F59E0B", "#3B82F6", "#EC4899", "#06B6D4"];

  const labels = [...new Set(sorted.map((m) => new Date(m.test_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' })))];
  const datasets = subjects.map((subject, idx) => ({
    label: subject,
    data: labels.map((date) => {
      const mark = sorted.find(m => m.subject_name === subject && new Date(m.test_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) === date);
      return mark ? +((mark.obtained_marks / mark.total_marks) * 100).toFixed(1) : null;
    }),
    borderColor: themeColors[idx % themeColors.length],
    backgroundColor: themeColors[idx % themeColors.length] + "20",
    tension: 0.4,
    fill: true,
  }));

  const grouped = marks.reduce((acc, m) => {
    if (!acc[m.subject_name]) acc[m.subject_name] = [];
    acc[m.subject_name].push(m);
    return acc;
  }, {});

  const radius = 70;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (displayPct / 100) * circ;

  return (
    <div style={{ minHeight: "100vh", background: "#0F172A", color: "#fff", fontFamily: "'Inter', sans-serif", width: "100%", overflowX: "hidden" }}>
      
      {/* 1. HERO SECTION (EDGE TO EDGE) */}
      <div style={{ background: "linear-gradient(135deg, #4C1D95 0%, #1E1B4B 100%)", padding: "40px 20px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", textAlign: "center" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: "800", margin: "0 0 10px 0", letterSpacing: "-1px" }}>Welcome, {userRef.current?.name}</h1>
          <p style={{ opacity: 0.7 }}>Track your academic progress and test performance</p>
        </div>
      </div>

      <div style={{ maxWidth: "1200px", margin: "-40px auto 40px", padding: "0 20px" }}>
        
        {/* 2. STATS CARDS ROW */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
          
          {/* OVERALL PERFORMANCE (VIOLET SHINE) */}
          <div style={{ background: "linear-gradient(135deg, #7C3AED 0%, #4C1D95 100%)", borderRadius: "24px", padding: "30px", display: "flex", flexDirection: "column", alignItems: "center", boxShadow: "0 20px 40px rgba(0,0,0,0.3)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "url('https://www.transparenttextures.com/patterns/carbon-fibre.png')", opacity: 0.1 }}></div>
            <div style={{ position: "relative", width: "160px", height: "160px" }}>
              <svg width="160" height="160" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="80" cy="80" r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth="14" fill="none" />
                <circle 
                  cx="80" cy="80" r={radius} stroke="#fff" strokeWidth="14" fill="none" 
                  strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" 
                  style={{ transition: "stroke-dashoffset 1.5s ease-in-out", filter: "drop-shadow(0 0 8px rgba(255,255,255,0.6))" }} 
                />
              </svg>
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
                <h2 style={{ fontSize: "36px", margin: 0, fontWeight: "900" }}>{displayPct}%</h2>
              </div>
            </div>
            <h3 style={{ marginTop: "15px", fontSize: "16px", textTransform: "uppercase", letterSpacing: "2px", opacity: 0.9 }}>Overall Performance</h3>
          </div>

          {/* TOTAL TEST COUNT CARD */}
          <div style={{ background: "#1E293B", borderRadius: "24px", padding: "30px", border: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
            <span style={{ fontSize: "64px", fontWeight: "900", color: "#8B5CF6", lineHeight: "1" }}>{marks.length}</span>
            <p style={{ fontSize: "18px", fontWeight: "600", marginTop: "10px", color: "#94A3B8" }}>Total Tests Held</p>
            <div style={{ marginTop: "20px", width: "100%", height: "8px", background: "#0F172A", borderRadius: "10px", overflow: "hidden" }}>
              <div style={{ width: "100%", height: "100%", background: "linear-gradient(90deg, #8B5CF6, #D8B4FE)" }}></div>
            </div>
          </div>

          {/* CAPTCHA CARD */}
          <div style={{ background: "#fff", borderRadius: "24px", padding: "25px", color: "#000", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
            <div style={{ background: "#F1F5F9", padding: "15px", borderRadius: "12px", textAlign: "center", fontSize: "28px", fontWeight: "900", letterSpacing: "8px", color: "#4C1D95", border: "2px dashed #CBD5E1", marginBottom: "15px" }}>
              {captcha}
            </div>
            <input 
              type="text" value={captchaInput} onChange={(e) => setCaptchaInput(e.target.value)} 
              placeholder="Enter Code" 
              style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #E2E8F0", marginBottom: "10px", boxSizing: "border-box", textAlign: "center", fontWeight: "bold" }} 
            />
            <button 
              onClick={handleCheckMarks} disabled={loading}
              style={{ width: "100%", padding: "14px", borderRadius: "10px", background: "#7C3AED", color: "#fff", border: "none", fontWeight: "800", cursor: "pointer", transition: "0.3s" }}
            >
              {loading ? "Checking..." : "CHECK MARKS"}
            </button>
            {message && <p style={{ color: "red", textAlign: "center", marginTop: "10px", fontSize: "14px" }}>{message}</p>}
          </div>
        </div>

        {marks.length > 0 && (
          <>
            {/* 3. CHART SECTION (EDGE TO EDGE STYLE) */}
            <div style={{ background: "#1E293B", padding: "25px", borderRadius: "24px", margin: "30px 0", border: "1px solid rgba(255,255,255,0.1)" }}>
              <h3 style={{ marginBottom: "20px", color: "#94A3B8" }}>Performance Progress</h3>
              <div style={{ height: "350px" }}>
                <Line data={{ labels, datasets }} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#94A3B8" } }, x: { grid: { display: false }, ticks: { color: "#94A3B8" } } }, plugins: { legend: { labels: { color: "#fff" } } } }} />
              </div>
            </div>

            {/* 4. SUBJECT WISE TABLES */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "25px" }}>
              {Object.keys(grouped).map((subject, idx) => (
                <div key={subject} style={{ background: "#1E293B", borderRadius: "24px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div style={{ background: `linear-gradient(90deg, ${themeColors[idx % themeColors.length]}, #1E1B4B)`, padding: "15px 25px", fontWeight: "bold" }}>
                    {subject}
                  </div>
                  <div style={{ padding: "20px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ textAlign: "left", fontSize: "12px", textTransform: "uppercase", color: "#94A3B8" }}>
                          <th style={{ padding: "10px 5px" }}>Test Date</th>
                          <th style={{ padding: "10px 5px" }}>Marks</th>
                          <th style={{ padding: "10px 5px", textAlign: "right" }}>Pct.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grouped[subject].map((m) => (
                          <tr key={m.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <td style={{ padding: "12px 5px", fontSize: "14px" }}>{new Date(m.test_date).toLocaleDateString()}</td>
                            <td style={{ padding: "12px 5px", fontSize: "14px", fontWeight: "600" }}>{m.obtained_marks} / {m.total_marks}</td>
                            <td style={{ padding: "12px 5px", textAlign: "right" }}>
                              <span style={{ color: themeColors[idx % themeColors.length], fontWeight: "800" }}>
                                {((m.obtained_marks/m.total_marks)*100).toFixed(0)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StudentMarks;