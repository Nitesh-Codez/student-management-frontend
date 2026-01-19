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
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const StudentMarks = () => {
  const [marks, setMarks] = useState([]);
  const [message, setMessage] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [activeSubjects, setActiveSubjects] = useState([]);
  const [displayPct, setDisplayPct] = useState(0);

  const API_URL = process.env.REACT_APP_API_URL;
  const user = JSON.parse(localStorage.getItem("user"));
  const userRef = useRef(user);

  const generateCaptcha = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 5; i++)
      code += chars[Math.floor(Math.random() * chars.length)];
    setCaptcha(code);
  };

  useEffect(() => {
    generateCaptcha();
    const savedMarks = JSON.parse(localStorage.getItem("userMarks")) || {};
    if (userRef.current && savedMarks[userRef.current.id]) {
      setMarks(savedMarks[userRef.current.id]);
    }
  }, []);

  // Calculate Overall Performance whenever marks change
  const totalObt = marks.reduce((a, b) => a + b.obtained_marks, 0);
  const totalMax = marks.reduce((a, b) => a + b.total_marks, 0);
  const currentOverallPct = totalMax ? ((totalObt / totalMax) * 100).toFixed(1) : 0;

  // Circle Fill Animation Logic
  useEffect(() => {
    let start = 0;
    const target = parseFloat(currentOverallPct);
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
    if (captchaInput !== captcha) {
      setMessage("Captcha incorrect!");
      generateCaptcha();
      return;
    }

    axios
      .post(`${API_URL}/api/marks/check`, {
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
          setMessage("No test held yet");
        }
      })
      .catch(() => setMessage("Something went wrong"));
  };

  const sorted = [...marks].sort((a, b) => new Date(a.test_date) - new Date(b.test_date));
  const subjects = [...new Set(sorted.map((m) => m.subject_name))];
  const colors = ["#FFD700", "#FF7F50", "#87CEEB", "#90EE90", "#ad6e55ff", "#DDA0DD", "#007dd1ff", "#e41700ff"];

  const visibleSubjects = activeSubjects.length > 0 ? activeSubjects : subjects;
  const labels = [...new Set(sorted.filter((m) => visibleSubjects.includes(m.subject_name)).map((m) => new Date(m.test_date).toLocaleDateString()))];

  const datasets = visibleSubjects.map((subject, idx) => ({
    label: subject,
    data: labels.map((date) => {
      const mark = sorted.find(m => m.subject_name === subject && new Date(m.test_date).toLocaleDateString() === date);
      return mark ? +((mark.obtained_marks / mark.total_marks) * 100).toFixed(1) : null;
    }),
    borderColor: colors[idx % colors.length],
    tension: 0.4,
    spanGaps: true,
    pointRadius: 5,
    fill: false,
  }));

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animations: {
      y: { easing: 'easeInOutQuart', duration: 1000, from: (ctx) => ctx.chart.scales.y.getPixelForValue(0) },
      x: { easing: 'linear', duration: 1000, delay(ctx) { return ctx.index * 100; } }
    },
    scales: { y: { beginAtZero: true, max: 100 } },
  };

  const grouped = marks.reduce((acc, m) => {
    if (!acc[m.subject_name]) acc[m.subject_name] = [];
    acc[m.subject_name].push(m);
    return acc;
  }, {});

  // Circle styling math
  const radius = 60;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (displayPct / 100) * circ;

  return (
    <div style={{ padding: "20px", fontFamily: "Arial", background: "#F5F6FA", minHeight: "100vh", width: "100vw", boxSizing: "border-box", overflowX: "hidden" }}>
      
      {/* 1. TOP PROGRESS CIRCLE */}
      {marks.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "20px 0", background: "#fff", padding: "20px", borderRadius: "20px", boxShadow: "0 5px 15px rgba(0,0,0,0.08)" }}>
          <div style={{ position: "relative", width: "150px", height: "150px" }}>
            <svg width="150" height="150">
              <circle cx="75" cy="75" r={radius} stroke="#e6e6e6" strokeWidth="12" fill="none" />
              <circle 
                cx="75" cy="75" r={radius} stroke="#2ECC71" strokeWidth="12" fill="none" 
                strokeDasharray={circ} 
                strokeDashoffset={offset} 
                strokeLinecap="round" 
                style={{ transition: "stroke-dashoffset 0.5s ease", transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
              />
            </svg>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
              <h2 style={{ margin: 0, color: "#2ECC71" }}>{displayPct}%</h2>
              <small style={{ color: "#777", fontWeight: "bold" }}>OVERALL</small>
            </div>
          </div>
        </div>
      )}

      <h2 style={{ textAlign: "center" }}>Welcome, {userRef.current?.name}</h2>

      {/* 2. CAPTCHA SECTION */}
      <div style={{ maxWidth: "400px", margin: "20px auto", background: "#fff", padding: "20px", borderRadius: "15px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ textAlign: "center", background: "#eee", padding: "10px", borderRadius: "8px", fontSize: "20px", fontWeight: "bold", letterSpacing: "5px" }}>{captcha}</div>
        <button onClick={generateCaptcha} style={{ background: "#3498DB", color: "#fff", border: "none", padding: "10px", borderRadius: "8px", cursor: "pointer" }}>Refresh</button>
        <input type="text" value={captchaInput} onChange={(e) => setCaptchaInput(e.target.value)} placeholder="Enter Captcha" style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ccc" }} />
        <button onClick={handleCheckMarks} style={{ background: "#2ECC71", color: "#fff", border: "none", padding: "12px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>Check Marks</button>
        {message && <p style={{ color: "red", textAlign: "center" }}>{message}</p>}
      </div>

      {marks.length > 0 && (
        <>
          {/* 3. CHART SECTION */}
          <div style={{ background: "#fff", padding: "20px", borderRadius: "15px", marginBottom: "30px", height: "350px" }}>
            <Line data={{ labels, datasets }} options={chartOptions} />
          </div>

          {/* 4. SUBJECT WISE TABLES */}
          {Object.keys(grouped).map((subject, idx) => (
            <div key={subject} style={{ background: "#fff", padding: "20px", borderRadius: "15px", marginBottom: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
              <h3 style={{ borderLeft: `5px solid ${colors[idx % colors.length]}`, paddingLeft: "10px" }}>{subject}</h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", background: "#f8f8f8" }}>
                    <th style={{ padding: "10px" }}>Date</th>
                    <th style={{ padding: "10px" }}>Marks</th>
                    <th style={{ padding: "10px" }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped[subject].map((m) => (
                    <tr key={m.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "10px" }}>{new Date(m.test_date).toLocaleDateString()}</td>
                      <td style={{ padding: "10px" }}>{m.obtained_marks} / {m.total_marks}</td>
                      <td style={{ padding: "10px", fontWeight: "bold" }}>{((m.obtained_marks/m.total_marks)*100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default StudentMarks;