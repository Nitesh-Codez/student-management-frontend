import React, { useState, useEffect } from "react";
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const StudentMarks = () => {
  const [marks, setMarks] = useState([]);
  const [message, setMessage] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");

  const API_URL = process.env.REACT_APP_API_URL;
  const user = JSON.parse(localStorage.getItem("user"));

  const generateCaptcha = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 5; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    setCaptcha(code);
  };

  // Only generate captcha once when component mounts
  useEffect(() => {
    generateCaptcha();
    const savedMarks = JSON.parse(localStorage.getItem("userMarks")) || {};
    if (user && savedMarks[user.id]) {
      setMarks(savedMarks[user.id]);
    }
  }, []); // run only once, no [user]

  const handleCheckMarks = () => {
    if (captchaInput !== captcha) {
      setMessage("Captcha incorrect!");
      generateCaptcha(); // generate new captcha only on wrong input
      return;
    }

    if (!user || !user.id) {
      setMessage("User not found. Please login again.");
      return;
    }

    axios
      .post(`${API_URL}/api/marks/check`, {
        studentId: user.id,
        studentName: user.name,
      })
      .then((res) => {
        if (res.data.success && res.data.data.length > 0) {
          setMarks(res.data.data);
          setMessage("");
          const savedMarks = JSON.parse(localStorage.getItem("userMarks")) || {};
          savedMarks[user.id] = res.data.data;
          localStorage.setItem("userMarks", JSON.stringify(savedMarks));
        } else {
          setMessage("No test held yet");
          const savedMarks = JSON.parse(localStorage.getItem("userMarks")) || {};
          if (savedMarks[user.id]) setMarks(savedMarks[user.id]);
          else setMarks([]);
        }
      })
      .catch(() => setMessage("Something went wrong"));
  };

  // Chart & table logic
  const sortedMarks = [...marks].sort((a, b) => new Date(a.test_date) - new Date(b.test_date));
  const uniqueDates = [...new Set(sortedMarks.map((m) => new Date(m.test_date).toLocaleDateString()))];
  const subjects = [...new Set(sortedMarks.map((m) => m.subject_name))];
  const colors = ["#FFD700", "#FF7F50", "#87CEEB", "#90EE90", "#FFA07A", "#DDA0DD"];

  const datasets = subjects.map((subject, idx) => {
    let lastValue = 0;
    const data = uniqueDates.map((date) => {
      const mark = sortedMarks.find(
        (m) => m.subject_name === subject && new Date(m.test_date).toLocaleDateString() === date
      );
      if (mark) lastValue = ((mark.obtained_marks / mark.total_marks) * 100).toFixed(1);
      return lastValue;
    });
    return {
      label: subject,
      data,
      borderColor: colors[idx % colors.length],
      backgroundColor: colors[idx % colors.length] + "33",
      tension: 0.4,
      fill: false,
      pointRadius: 6,
      pointBackgroundColor: colors[idx % colors.length],
    };
  });

  const chartData = { labels: uniqueDates, datasets };
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: true, position: "top" },
      title: { display: true, text: "Overall Performance Graph" },
      tooltip: {
        callbacks: {
          label: (context) => {
            const subject = context.dataset.label;
            const value = context.raw;
            return `${subject}: ${value !== null ? value + "%" : "N/A"}`;
          },
        },
      },
    },
    scales: { y: { beginAtZero: true, max: 100 } },
  };

  const totalObtained = marks.reduce((sum, m) => sum + m.obtained_marks, 0);
  const totalMarks = marks.reduce((sum, m) => sum + m.total_marks, 0);
  const overallPercentage = totalMarks ? ((totalObtained / totalMarks) * 100).toFixed(1) : 0;

  const groupedMarks = marks.reduce((acc, mark) => {
    if (!acc[mark.subject_name]) acc[mark.subject_name] = [];
    acc[mark.subject_name].push(mark);
    return acc;
  }, {});

  return (
    <div style={{ padding: "30px", fontFamily: "Arial, sans-serif", background: "#F5F6FA", minHeight: "100vh" }}>
      <h2>Your Test Marks</h2>
      <p>Welcome, <strong>{user?.name}</strong>! Your marks are shown below.</p>

      {/* Captcha */}
      <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <strong>Captcha: {captcha}</strong>
        <button
          onClick={generateCaptcha}
          style={{ padding: "5px 10px", background: "#3498DB", color: "#fff", border: "none", borderRadius: "5px" }}
        >
          Refresh
        </button>
        <input
          type="text"
          value={captchaInput}
          onChange={(e) => setCaptchaInput(e.target.value)}
          placeholder="Enter Captcha"
          style={{ padding: "5px", borderRadius: "5px", border: "1px solid #ccc" }}
        />
        <button
          onClick={handleCheckMarks}
          style={{ padding: "5px 15px", background: "#2ECC71", color: "#fff", border: "none", borderRadius: "5px" }}
        >
          Check Marks
        </button>
      </div>

      {message && <p style={{ color: "red", marginTop: "10px" }}>{message}</p>}

      {/* Overall Percentage */}
      {marks.length > 0 && (
        <div style={{ display: "flex", gap: "20px", marginTop: "20px", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 200px", background: "#fff", padding: "20px", borderRadius: "10px", boxShadow: "0 4px 10px rgba(0,0,0,0.1)", textAlign: "center" }}>
            <h3>Overall Percentage</h3>
            <div style={{ fontSize: "32px", fontWeight: "700", color: "#E74C3C" }}>{overallPercentage}%</div>
          </div>
          <div style={{ flex: "1 1 200px", background: "#fff", padding: "20px", borderRadius: "10px", boxShadow: "0 4px 10px rgba(0,0,0,0.1)", textAlign: "center" }}>
            <h3>Total Tests</h3>
            <div style={{ fontSize: "32px", fontWeight: "700", color: "#3498DB" }}>{marks.length}</div>
          </div>
        </div>
      )}

      {/* Chart */}
      {marks.length > 0 && (
        <div style={{ marginTop: "30px", background: "#fff", padding: "20px", borderRadius: "10px", boxShadow: "0 4px 10px rgba(0,0,0,0.1)", overflowX: "auto" }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      )}

      {/* Subject Tables */}
      {Object.keys(groupedMarks).map((subject, idx) => (
        <div key={subject} style={{ background: "#fff", borderRadius: "10px", padding: "20px", boxShadow: "0 4px 10px rgba(0,0,0,0.1)", marginTop: "30px" }}>
          <h3 style={{ borderBottom: `3px solid ${colors[idx % colors.length]}`, paddingBottom: "10px", color: colors[idx % colors.length] }}>{subject}</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
            <thead>
              <tr style={{ background: "#f1f1f1" }}>
                <th style={{ padding: "10px", textAlign: "left" }}>Date</th>
                <th style={{ padding: "10px", textAlign: "left" }}>Total Marks</th>
                <th style={{ padding: "10px", textAlign: "left" }}>Obtained</th>
                <th style={{ padding: "10px", textAlign: "left" }}>Percentage</th>
                <th style={{ padding: "10px", textAlign: "left" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {groupedMarks[subject].map((m) => {
                const testPercentage = ((m.obtained_marks / m.total_marks) * 100).toFixed(1);
                return (
                  <tr key={m.id} style={{ background: colors[idx % colors.length] + "22", borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "10px" }}>{new Date(m.test_date).toLocaleDateString()}</td>
                    <td style={{ padding: "10px" }}>{m.total_marks}</td>
                    <td style={{ padding: "10px" }}>{m.obtained_marks}</td>
                    <td style={{ padding: "10px" }}>{testPercentage}%</td>
                    <td style={{ padding: "10px" }}>{m.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

export default StudentMarks;
