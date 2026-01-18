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
  const [loading, setLoading] = useState(false);

  // API URL from env or fallback
  const API_URL = process.env.REACT_APP_API_URL || "https://student-management-system-4-hose.onrender.com";
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

  const handleCheckMarks = () => {
    if (captchaInput !== captcha) {
      setMessage("Captcha incorrect!");
      generateCaptcha();
      return;
    }

    if (!userRef.current?.id) {
      setMessage("User not found. Please login again.");
      return;
    }

    setLoading(true);
    // FIXED: Correct endpoint to match your backend logic
    axios
      .get(`${API_URL}/api/marks/student/${userRef.current.id}`)
      .then((res) => {
        if (res.data.success && res.data.marks.length > 0) {
          setMarks(res.data.marks);
          setMessage("");
          const savedMarks = JSON.parse(localStorage.getItem("userMarks")) || {};
          savedMarks[userRef.current.id] = res.data.marks;
          localStorage.setItem("userMarks", JSON.stringify(savedMarks));
        } else {
          setMessage("No test held yet");
        }
      })
      .catch(() => setMessage("Something went wrong"))
      .finally(() => setLoading(false));
  };

  const sorted = [...marks].sort(
    (a, b) => new Date(a.test_date) - new Date(b.test_date)
  );

  const subjects = [...new Set(sorted.map((m) => m.subject_name))];
  const colors = [
    "#FFD700", "#FF7F50", "#87CEEB", "#90EE90",
    "#ad6e55ff", "#DDA0DD", "#007dd1ff", "#e41700ff",
  ];

  const visibleSubjects = activeSubjects.length > 0 ? activeSubjects : subjects;

  const labels = [
    ...new Set(
      sorted
        .filter((m) => visibleSubjects.includes(m.subject_name))
        .map((m) => new Date(m.test_date).toLocaleDateString())
    ),
  ];

  const datasets = visibleSubjects.map((subject, idx) => ({
    label: subject,
    data: labels.map((date) => {
      const mark = sorted.find(
        (m) =>
          m.subject_name === subject &&
          new Date(m.test_date).toLocaleDateString() === date
      );
      return mark
        ? +((mark.obtained_marks / mark.total_marks) * 100).toFixed(1)
        : null;
    }),
    borderColor: colors[idx % colors.length],
    tension: 0.4,
    spanGaps: true,
    pointRadius: 5,
    pointHoverRadius: 8,
    fill: false,
  }));

  const chartData = { labels, datasets };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Overall Performance Graph" },
    },
    scales: { 
      y: { beginAtZero: true, max: 100 },
      x: { ticks: { autoSkip: true, maxRotation: 45 } }
    },
  };

  const totalObt = marks.reduce((acc, curr) => acc + Number(curr.obtained_marks), 0);
  const totalMax = marks.reduce((acc, curr) => acc + Number(curr.total_marks), 0);
  const overallPercentage = totalMax > 0 
    ? ((totalObt / totalMax) * 100).toFixed(1) 
    : 0;

  const grouped = marks.reduce((acc, m) => {
    if (!acc[m.subject_name]) acc[m.subject_name] = [];
    acc[m.subject_name].push(m);
    return acc;
  }, {});

  return (
    <div style={{ margin: 0, paddingBottom: 40, fontFamily: "'Segoe UI', Roboto, Arial", background: "#F4F7FE", minHeight: "100vh", width: "100vw", overflowX: "hidden" }}>
      
      {/* HEADER SECTION - SAME COLORS AS REQUESTED */}
      <div style={{
          background: "linear-gradient(135deg, #2C3E50, #3498DB)",
          padding: "40px 20px",
          color: "white",
          textAlign: "center",
          borderRadius: "0 0 35px 35px",
          boxShadow: "0 10px 20px rgba(0,0,0,0.15)"
      }}>
        <h2 style={{ margin: 0, letterSpacing: "1px" }}>Student Performance</h2>
        <p style={{ opacity: 0.9 }}>Overview for <b>{userRef.current?.name || "Student"}</b></p>
        
        {marks.length > 0 && (
          <div style={{
              width: 150, height: 150,
              borderRadius: "50%",
              // PREVIOUS PROGRESS BAR COLOR
              background: `conic-gradient(#2ECC71 ${overallPercentage * 3.6}deg, rgba(255,255,255,0.1) 0deg)`,
              margin: "25px auto",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 25px rgba(0,0,0,0.2)",
              border: "4px solid rgba(255,255,255,0.1)"
          }}>
            <div style={{
                width: 125, height: 125,
                background: "#2C3E50",
                borderRadius: "50%",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
            }}>
                <span style={{ fontSize: 30, fontWeight: "bold" }}>{overallPercentage}%</span>
                <span style={{ fontSize: 12, opacity: 0.7, fontWeight: "bold" }}>TOTAL</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: "0 15px", maxWidth: "600px", margin: "0 auto" }}>
        
        {/* Verification Section */}
        <div style={{ background: "#fff", padding: "20px", borderRadius: "20px", marginTop: "-30px", boxShadow: "0 5px 15px rgba(0,0,0,0.08)" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 15 }}>
            <div style={{
                padding: 12, background: "#F8F9FA", borderRadius: 12, flex: 1,
                textAlign: "center", border: "2px dashed #3498DB", fontSize: 22,
                fontWeight: "bold", letterSpacing: 4, color: "#2C3E50"
            }}>
              {captcha}
            </div>
            <button onClick={generateCaptcha} style={{ background: "#3498DB", width: 50, height: 50, color: "#fff", border: "none", borderRadius: 12, cursor: "pointer", fontSize: 20 }}>⟳</button>
          </div>

          <input
            type="text"
            value={captchaInput}
            onChange={(e) => setCaptchaInput(e.target.value)}
            placeholder="Enter Captcha Code"
            style={{ padding: 15, borderRadius: 12, width: "100%", border: "1px solid #E0E0E0", fontSize: 16, boxSizing: "border-box", marginBottom: 15 }}
          />

          <button
            onClick={handleCheckMarks}
            disabled={loading}
            style={{
              padding: 15, background: loading ? "#BDC3C7" : "#2ECC71",
              color: "#fff", borderRadius: 12, border: "none", width: "100%",
              fontSize: 18, fontWeight: "bold", cursor: "pointer",
              boxShadow: "0 4px 10px rgba(46, 204, 113, 0.3)"
            }}
          >
            {loading ? "Checking..." : "View My Report"}
          </button>
          
          {message && <p style={{ color: "#E74C3C", marginTop: 12, textAlign: "center", fontWeight: "bold" }}>{message}</p>}
        </div>

        {/* STATS CARDS */}
        {marks.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15, marginTop: 20 }}>
            <div style={{ background: "#fff", padding: 20, borderRadius: 18, textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
              <h3 style={{ margin: "0 0 5px 0", fontSize: 12, color: "#95A5A6", textTransform: "uppercase" }}>Overall %</h3>
              <div style={{ fontSize: 28, fontWeight: "bold", color: "#2ECC71" }}>{overallPercentage}%</div>
            </div>
            <div style={{ background: "#fff", padding: 20, borderRadius: 18, textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
              <h3 style={{ margin: "0 0 5px 0", fontSize: 12, color: "#95A5A6", textTransform: "uppercase" }}>Total Tests</h3>
              <div style={{ fontSize: 28, fontWeight: "bold", color: "#3498DB" }}>{marks.length}</div>
            </div>
          </div>
        )}

        {/* PERFORMANCE GRAPH */}
        {marks.length > 0 && (
          <div style={{ marginTop: 20, background: "#fff", padding: 15, borderRadius: 18, boxShadow: "0 4px 12px rgba(0,0,0,0.05)", height: 350 }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        )}

        {/* SUBJECT TABLES */}
        {Object.keys(grouped).map((subject, idx) => (
          <div key={subject} style={{ background: "#fff", padding: "15px 15px 5px 15px", borderRadius: 18, marginTop: 20, boxShadow: "0 4px 12px rgba(0,0,0,0.05)", overflow: "hidden" }}>
            <h3 style={{ borderLeft: `5px solid ${colors[idx % colors.length]}`, paddingLeft: 12, color: "#2C3E50", fontSize: 18, marginBottom: 15 }}>{subject}</h3>
            
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8F9FA", textAlign: "left" }}>
                    <th style={{ padding: "10px", fontSize: 12, color: "#7F8C8D" }}>DATE</th>
                    <th style={{ padding: "10px", fontSize: 12, color: "#7F8C8D" }}>MARKS</th>
                    <th style={{ padding: "10px", fontSize: 12, color: "#7F8C8D" }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped[subject].map((m) => {
                    const p = ((m.obtained_marks / m.total_marks) * 100).toFixed(1);
                    return (
                      <tr key={m.id} style={{ borderBottom: "1px solid #F1F1F1" }}>
                        <td style={{ padding: "12px 10px", fontSize: 13 }}>{new Date(m.test_date).toLocaleDateString()}</td>
                        <td style={{ padding: "12px 10px", fontSize: 13 }}>
                          <span style={{ fontWeight: "bold" }}>{m.obtained_marks}</span>/{m.total_marks} 
                          <span style={{ color: "#2ECC71", marginLeft: 5 }}>({p}%)</span>
                        </td>
                        <td style={{ padding: "12px 10px" }}>
                          <span style={{ padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: "bold", background: m.status === "Pass" ? "#E8F8F5" : "#FDEDEC", color: m.status === "Pass" ? "#27AE60" : "#E74C3C" }}>
                            {m.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentMarks;