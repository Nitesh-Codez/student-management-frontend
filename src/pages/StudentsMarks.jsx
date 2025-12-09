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

  const uniqueDates = [
    ...new Set(
      sorted.map((m) =>
        new Date(m.test_date).toLocaleDateString()
      )
    ),
  ];

  const subjects = [...new Set(sorted.map((m) => m.subject_name))];

  const colors = [
    "#FFD700",
    "#FF7F50",
    "#87CEEB",
    "#90EE90",
    "#FFA07A",
    "#DDA0DD",
  ];

  const getGradient = (ctx, color) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, color + "AA");
    gradient.addColorStop(1, color + "00");
    return gradient;
  };

  const datasets = subjects.map((subject, idx) => {
    let last = 0;

    const data = uniqueDates.map((date) => {
      const mark = sorted.find(
        (m) =>
          m.subject_name === subject &&
          new Date(m.test_date).toLocaleDateString() === date
      );
      if (mark)
        last = (
          (mark.obtained_marks / mark.total_marks) *
          100
        ).toFixed(1);

      return last;
    });

    return {
      label: subject,
      data,
      borderColor: colors[idx % colors.length],
      backgroundColor: (ctx) =>
        getGradient(ctx.chart.ctx, colors[idx % colors.length]),
      fill: true,
      tension: 0.4,
      pointRadius: 5,
      pointHoverRadius: 9,
      pointBackgroundColor: colors[idx % colors.length],
    };
  });

  const chartData = { labels: uniqueDates, datasets };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Overall Performance Graph" },
    },
    scales: { y: { beginAtZero: true, max: 100 } },
  };

  const totalObt = marks.reduce((a, b) => a + b.obtained_marks, 0);
  const totalMarks = marks.reduce((a, b) => a + b.total_marks, 0);
  const overallPercentage = totalMarks
    ? ((totalObt / totalMarks) * 100).toFixed(1)
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
        padding: 0,
        fontFamily: "Arial",
        background: "#F5F6FA",
        minHeight: "100vh",
        width: "100vw",
        maxWidth: "100vw",
        overflowX: "hidden",
        boxSizing: "border-box",
      }}
    >
      <h2 style={{ padding: "10px 12px", margin: 0 }}>Your Test Marks</h2>
      <p style={{ padding: "0 12px" }}>
        Welcome, <strong>{userRef.current?.name}</strong>!
      </p>

      {/* Captcha Section */}
      <div
        style={{
          marginTop: 15,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          width: "100%",
          padding: "0 12px",
          boxSizing: "border-box",
        }}
      >
        <strong
          style={{
            padding: 10,
            background: "#fff",
            borderRadius: 8,
            width: "100%",
            boxSizing: "border-box",
            textAlign: "center",
            wordBreak: "break-word",
          }}
        >
          Captcha: {captcha}
        </strong>

        <button
          onClick={generateCaptcha}
          style={{
            background: "#3498DB",
            padding: 12,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            width: "100%",
            fontSize: 16,
            boxSizing: "border-box",
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
            boxSizing: "border-box",
          }}
        >
          Check Marks
        </button>
      </div>

      {message && (
        <p style={{ color: "red", marginTop: 10, padding: "0 12px" }}>
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
            padding: "0 12px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: 20,
              borderRadius: 12,
              boxShadow: "0px 4px 12px rgba(0,0,0,0.1)",
              textAlign: "center",
              boxSizing: "border-box",
            }}
          >
            <h2>Overall %</h2>
            <div style={{ fontSize: 32, fontWeight: "bold", color: "#ed2e19ff" }}>
              {overallPercentage}%
            </div>
          </div>

          <div
            style={{
              background: "#fff",
              padding: 20,
              borderRadius: 12,
              boxShadow: "0px 4px 12px rgba(0,0,0,0.1)",
              textAlign: "center",
              boxSizing: "border-box",
            }}
          >
            <h3>Total Tests</h3>
            <div style={{ fontSize: 32, color: "#3498DB" }}>{marks.length}</div>
          </div>
        </div>
      )}

      {/* Performance Graph */}
      {marks.length > 0 && (
        <div
          style={{
            marginTop: 30,
            background: "#fff",
            padding: 20,
            borderRadius: 12,
            boxShadow: "0px 4px 12px rgba(0,0,0,0.1)",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <div style={{ width: "100%", height: "350px" }}>
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
            padding: 20,
            borderRadius: 12,
            marginTop: 30,
            boxShadow: "0px 4px 12px rgba(0,0,0,0.1)",
            width: "100%",
            boxSizing: "border-box",
            overflowX: "auto",
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
            }}
          >
            <thead>
              <tr style={{ background: "#f1f1f1" }}>
                <th style={{ padding: 10 }}>Date</th>
                <th style={{ padding: 10 }}>Total</th>
                <th style={{ padding: 10 }}>Obt</th>
                <th style={{ padding: 10 }}>%</th>
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
