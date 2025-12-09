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

  const API_URL = process.env.REACT_APP_API_URL;
  const user = JSON.parse(localStorage.getItem("user"));

  // Generate captcha
  const generateCaptcha = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setCaptcha(code);
  };

 useEffect(() => {
  generateCaptcha();
  const savedMarks = JSON.parse(localStorage.getItem("userMarks")) || {};
  if (user && savedMarks[user.id]) {
    setMarks(savedMarks[user.id]);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);


  const handleCheckMarks = () => {
    if (captchaInput !== captcha) {
      setMessage("Captcha incorrect!");
      generateCaptcha();
      return;
    }
    if (!user?.id) {
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
        }
      })
      .catch(() => setMessage("Something went wrong"));
  };

  const sorted = [...marks].sort(
    (a, b) => new Date(a.test_date) - new Date(b.test_date)
  );

  const uniqueDates = [...new Set(sorted.map((m) => new Date(m.test_date).toLocaleDateString()))];
  const subjects = [...new Set(sorted.map((m) => m.subject_name))];

  const colors = ["#FFD700", "#FF7F50", "#87CEEB", "#90EE90", "#FFA07A", "#DDA0DD"];

  const datasets = subjects.map((subject, idx) => {
    let last = 0;
    const data = uniqueDates.map((date) => {
      const mark = sorted.find(
        (m) =>
          m.subject_name === subject &&
          new Date(m.test_date).toLocaleDateString() === date
      );
      if (mark) last = ((mark.obtained_marks / mark.total_marks) * 100).toFixed(1);
      return last;
    });

    return {
      label: subject,
      data,
      borderColor: colors[idx % colors.length],
      backgroundColor: colors[idx % colors.length] + "33",
      tension: 0.4,
      fill: false,
      pointRadius: 7,
    };
  });

  const chartData = { labels: uniqueDates, datasets };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false, // MOBILE FIX
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Overall Performance Graph" },
    },
    scales: { y: { beginAtZero: true, max: 100 } },
  };

  const totalObt = marks.reduce((a, b) => a + b.obtained_marks, 0);
  const totalMarks = marks.reduce((a, b) => a + b.total_marks, 0);
  const overallPercentage = totalMarks ? ((totalObt / totalMarks) * 100).toFixed(1) : 0;

  const grouped = marks.reduce((acc, m) => {
    if (!acc[m.subject_name]) acc[m.subject_name] = [];
    acc[m.subject_name].push(m);
    return acc;
  }, {});

  return (
    <div
      style={{
        padding: "30px",
        fontFamily: "Arial",
        background: "#F5F6FA",
        minHeight: "100vh",
      }}
    >
      <h2>Your Test Marks</h2>
      <p>
        Welcome, <strong>{user?.name}</strong>! Your marks are shown below.
      </p>

      {/* Captcha */}
      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 10 }}>
        <strong>Captcha: {captcha}</strong>

        <button
          onClick={generateCaptcha}
          style={{
            padding: "5px 10px",
            background: "#3498DB",
            color: "#fff",
            borderRadius: 5,
            border: "none",
          }}
        >
          Refresh
        </button>

        <input
          type="text"
          value={captchaInput}
          onChange={(e) => setCaptchaInput(e.target.value)}
          placeholder="Enter Captcha"
          style={{
            padding: 5,
            borderRadius: 5,
            border: "1px solid #ccc",
          }}
        />

        <button
          onClick={handleCheckMarks}
          style={{
            padding: "5px 15px",
            background: "#2ECC71",
            color: "#fff",
            borderRadius: 5,
            border: "none",
          }}
        >
          Check Marks
        </button>
      </div>

      {message && <p style={{ color: "red" }}>{message}</p>}

      {/* Overall stats */}
      {marks.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 20,
            flexWrap: "wrap",
            marginTop: 20,
          }}
        >
          {/* Percentage */}
          <div
            style={{
              flex: "1 1 200px",
              background: "#fff",
              borderRadius: 10,
              padding: 20,
              boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
              textAlign: "center",
            }}
          >
            <h3>Overall Percentage</h3>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#E74C3C" }}>
              {overallPercentage}%
            </div>
          </div>

          {/* Total tests */}
          <div
            style={{
              flex: "1 1 200px",
              background: "#fff",
              borderRadius: 10,
              padding: 20,
              boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
              textAlign: "center",
            }}
          >
            <h3>Total Tests</h3>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#3498DB" }}>
              {marks.length}
            </div>
          </div>
        </div>
      )}

      {/* BIG RESPONSIVE GRAPH */}
      {marks.length > 0 && (
        <div
          style={{
            marginTop: 30,
            background: "#fff",
            padding: 20,
            borderRadius: 10,
            boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
            overflowX: "auto",

            /* GRAPH BIG ON MOBILE */
            minWidth: "700px",
            height: "350px",
          }}
        >
          <Line data={chartData} options={chartOptions} />
        </div>
      )}

      {/* Subject Wise Table */}
      {Object.keys(grouped).map((subject, idx) => (
        <div
          key={subject}
          style={{
            background: "#fff",
            padding: 20,
            borderRadius: 10,
            marginTop: 30,
            boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
            overflowX: "auto", // FIX TABLE OVERFLOW
          }}
        >
          <h3
            style={{
              borderBottom: `3px solid ${colors[idx % colors.length]}`,
              paddingBottom: 10,
              color: colors[idx % colors.length],
            }}
          >
            {subject}
          </h3>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: 10,
              minWidth: "600px", // TABLE ALWAYS FITS MOBILE
            }}
          >
            <thead>
              <tr style={{ background: "#f1f1f1" }}>
                <th style={{ padding: 10 }}>Date</th>
                <th style={{ padding: 10 }}>Total Marks</th>
                <th style={{ padding: 10 }}>Obtained</th>
                <th style={{ padding: 10 }}>Percentage</th>
                <th style={{ padding: 10 }}>Status</th>
              </tr>
            </thead>

            <tbody>
              {grouped[subject].map((m) => {
                const p = ((m.obtained_marks / m.total_marks) * 100).toFixed(1);

                return (
                  <tr
                    key={m.id}
                    style={{
                      background: colors[idx % colors.length] + "22",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <td style={{ padding: 10 }}>
                      {new Date(m.test_date).toLocaleDateString()}
                    </td>
                    <td style={{ padding: 10 }}>{m.total_marks}</td>
                    <td style={{ padding: 10 }}>{m.obtained_marks}</td>
                    <td style={{ padding: 10 }}>{p}%</td>
                    <td style={{ padding: 10 }}>{m.status}</td>
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
