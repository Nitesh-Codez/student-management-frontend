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

    axios
      .post(`${API_URL}/api/marks/check`, {
        studentId: userRef.current.id,
        studentName: userRef.current.name,
      })
      .then((res) => {
        if (res.data.success && res.data.data.length > 0) {
          setMarks(res.data.data);
          setMessage("");
          const savedMarks =
            JSON.parse(localStorage.getItem("userMarks")) || {};
          savedMarks[userRef.current.id] = res.data.data;
          localStorage.setItem("userMarks", JSON.stringify(savedMarks));
        } else {
          setMessage("No test held yet");
        }
      })
      .catch(() => setMessage("Something went wrong"));
  };

  const sorted = [...marks].sort(
    (a, b) => new Date(a.test_date) - new Date(b.test_date)
  );

  const subjects = [...new Set(sorted.map((m) => m.subject_name))];
  const colors = [
    "#FFD700", "#FF7F50", "#87CEEB", "#90EE90",
    "#ad6e55ff", "#DDA0DD", "#007dd1ff", "#e41700ff",
  ];

  const visibleSubjects =
    activeSubjects.length > 0 ? activeSubjects : subjects;

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
    animation: {
      duration: 2000,
      easing: "easeInOutQuart",
    },
    animations: {
        x: {
          type: 'number',
          easing: 'linear',
          duration: 1000,
          from: NaN,
          delay(ctx) {
            if (ctx.type !== 'data' || ctx.xStarted) {
              return 0;
            }
            ctx.xStarted = true;
            return ctx.index * 150;
          }
        },
        y: {
          type: 'number',
          easing: 'linear',
          duration: 1000,
          from: (ctx) => ctx.chart.scales.y.getPixelForValue(0),
          delay(ctx) {
            if (ctx.type !== 'data' || ctx.yStarted) {
              return 0;
            }
            ctx.yStarted = true;
            return ctx.index * 150;
          }
        }
      },
    plugins: {
      legend: {
        position: "top",
        onClick: (_, item) => {
          const subject = item.text;
          setActiveSubjects((prev) =>
            prev.includes(subject)
              ? prev.filter((s) => s !== subject)
              : [...prev, subject]
          );
        },
      },
      title: { display: true, text: "Overall Performance Graph" },
    },
    scales: { 
        y: { beginAtZero: true, max: 100 },
        x: { ticks: { autoSkip: true, maxRotation: 45 } }
    },
  };

  // --- FIXED CALCULATION ---
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
    <div
      style={{
        margin: 0,
        padding: "0 0 40px 0",
        fontFamily: "Arial",
        background: "#F5F6FA",
        minHeight: "100vh",
        width: "100vw",
        maxWidth: "100vw",
        boxSizing: "border-box",
        overflowX: "hidden"
      }}
    >
      {/* NEW HEADER SECTION WITH CIRCULAR GRAPH */}
      <div style={{
          background: "linear-gradient(135deg, #2C3E50, #3498DB)",
          padding: "30px 20px",
          color: "white",
          textAlign: "center",
          borderRadius: "0 0 30px 30px",
          marginBottom: 20
      }}>
        <h2 style={{ margin: 0 }}>Student Performance</h2>
        <p style={{ opacity: 0.9 }}>Performance Overview for <b>{userRef.current?.name}</b></p>
        
        {marks.length > 0 && (
          <div style={{
              width: 150,
              height: 150,
              borderRadius: "50%",
              background: `conic-gradient(#2ECC71 ${overallPercentage * 3.6}deg, rgba(255,255,255,0.1) 0deg)`,
              margin: "20px auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(0,0,0,0.2)",
              transition: "all 1s ease-in-out"
          }}>
            <div style={{
                width: 120,
                height: 120,
                background: "#2C3E50",
                borderRadius: "50%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center"
            }}>
                <span style={{ fontSize: 28, fontWeight: "bold" }}>{overallPercentage}%</span>
                <span style={{ fontSize: 12, opacity: 0.7 }}>SCORE</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: "0 15px" }}>
        {/* Captcha Section */}
        <div
          style={{
            marginTop: 15,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <strong
              style={{
                padding: 12,
                background: "#fff",
                borderRadius: 8,
                flex: 1,
                textAlign: "center",
                border: "1px dashed #3498DB",
                fontSize: 18,
                letterSpacing: 3
              }}
            >
              {captcha}
            </strong> 
            <button
              onClick={generateCaptcha}
              style={{
                background: "#3498DB",
                padding: 12,
                color: "#fff",
                border: "none",
                borderRadius: 10,
                cursor: "pointer"
              }}
            >
              ⟳
            </button>
          </div>

          <input
            type="text"
            value={captchaInput}
            onChange={(e) => setCaptchaInput(e.target.value)}
            placeholder="Enter Captcha Code"
            style={{
              padding: 12,
              borderRadius: 10,
              width: "100%",
              border: "1px solid #ccc",
              fontSize: 16,
              boxSizing: "border-box",
            }}
          />

          <button
            onClick={handleCheckMarks}
            style={{
              padding: 12,
              background: "#2ECC71",
              color: "#fff",
              borderRadius: 10,
              border: "none",
              width: "100%",
              fontSize: 16,
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "0 4px 6px rgba(46, 204, 113, 0.2)"
            }}
          >
            Check My Marks
          </button>
        </div>

        {message && (
          <p style={{ color: "red", marginTop: 10, textAlign: "center", fontWeight: "bold" }}>
            {message}
          </p>
        )}

        {/* Summary Cards */}
        {marks.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 15,
              marginTop: 25,
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                background: "#fff",
                padding: 20,
                borderRadius: 12,
                boxShadow: "0px 4px 12px rgba(0,0,0,0.05)",
                textAlign: "center",
              }}
            >
              <h3 style={{ margin: "0 0 10px 0", fontSize: 14, color: "#7F8C8D" }}>Overall %</h3>
              <div style={{ fontSize: 28, fontWeight: "bold", color: "#2ECC71" }}>
                {overallPercentage}%
              </div>
            </div>

            <div
              style={{
                background: "#fff",
                padding: 20,
                borderRadius: 12,
                boxShadow: "0px 4px 12px rgba(0,0,0,0.05)",
                textAlign: "center",
              }}
            >
              <h3 style={{ margin: "0 0 10px 0", fontSize: 14, color: "#7F8C8D" }}>Tests Taken</h3>
              <div style={{ fontSize: 28, fontWeight: "bold", color: "#3498DB" }}>{marks.length}</div>
            </div>
          </div>
        )}

        {/* Performance Graph */}
        {marks.length > 0 && (
          <div
            style={{
              marginTop: 25,
              background: "#fff",
              padding: 15,
              borderRadius: 12,
              boxShadow: "0px 4px 12px rgba(0,0,0,0.05)",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <div style={{ width: "100%", height: "300px" }}>
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Marks Table */}
        {Object.keys(grouped).map((subject, idx) => (
          <div
            key={subject}
            style={{
              background: "#fff",
              padding: 15,
              borderRadius: 12,
              marginTop: 25,
              boxShadow: "0px 4px 12px rgba(0,0,0,0.05)",
              width: "100%",
              boxSizing: "border-box",
              overflowX: "auto",
            }}
          >
            <h3
              style={{
                borderLeft: `5px solid ${colors[idx % colors.length]}`,
                paddingLeft: 10,
                color: "#2C3E50",
                fontSize: 18,
                margin: "0 0 15px 0"
              }}
            >
              {subject}
            </h3>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr style={{ background: "#F8F9FA", textAlign: "left" }}>
                  <th style={{ padding: 10, fontSize: 12 }}>Date</th>
                  <th style={{ padding: 10, fontSize: 12 }}>Marks</th>
                  <th style={{ padding: 10, fontSize: 12 }}>%</th>
                  <th style={{ padding: 10, fontSize: 12 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {grouped[subject].map((m) => {
                  const p = ((m.obtained_marks / m.total_marks) * 100).toFixed(1);
                  return (
                    <tr
                      key={m.id}
                      style={{ borderBottom: "1px solid #F1F1F1" }}
                    >
                      <td style={{ padding: "12px 10px", fontSize: 13 }}>
                        {new Date(m.test_date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "12px 10px", fontSize: 13 }}>
                        <b>{m.obtained_marks}</b>/{m.total_marks}
                      </td>
                      <td style={{ padding: "12px 10px", fontSize: 13, color: "#2ECC71", fontWeight: "bold" }}>
                        {p}%
                      </td>
                      <td style={{ padding: "12px 10px", fontSize: 11 }}>
                        <span style={{
                            padding: "4px 8px",
                            borderRadius: 4,
                            background: m.status === "Pass" ? "#E8F8F5" : "#FDEDEC",
                            color: m.status === "Pass" ? "#27AE60" : "#E74C3C"
                        }}>
                            {m.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentMarks;