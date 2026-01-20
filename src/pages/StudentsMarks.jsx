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
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const StudentMarks = () => {
  const [marks, setMarks] = useState([]);
  const [message, setMessage] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [activeSubjects, setActiveSubjects] = useState([]);

  // New States for Popup
  const [showPopup, setShowPopup] = useState(false);
  const [newSubjectNames, setNewSubjectNames] = useState("");

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

  // Background check for new marks without updating UI marks
  const checkForNewMarks = (currentLocalMarks) => {
    if (!userRef.current?.id) return;

    axios
      .post(`${API_URL}/api/marks/check`, {
        studentId: userRef.current.id,
        studentName: userRef.current.name,
      })
      .then((res) => {
        if (res.data.success && res.data.data.length > 0) {
          const fetchedData = res.data.data;
          const currentIds = currentLocalMarks.map((m) => m.id);
          
          // Check if any ID from DB is not in our local state
          const newEntries = fetchedData.filter((m) => !currentIds.includes(m.id));

          if (newEntries.length > 0 && currentLocalMarks.length > 0) {
            const names = [...new Set(newEntries.map((m) => m.subject_name))].join(", ");
            setNewSubjectNames(names);
            setShowPopup(true); // Show English Popup
          }
        }
      })
      .catch(() => console.log("Silent check failed"));
  };

  useEffect(() => {
    generateCaptcha();
    const savedMarksData = JSON.parse(localStorage.getItem("userMarks")) || {};
    const localMarks = savedMarksData[userRef.current?.id] || [];
    
    if (userRef.current && localMarks.length > 0) {
      setMarks(localMarks);
    }

    // Trigger background check on page open
    checkForNewMarks(localMarks);
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
          setMessage("Marks updated successfully!");
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
    "#D4AF37", "#FF7F50", "#87CEEB", "#90EE90",
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
    backgroundColor: `${colors[idx % colors.length]}33`,
    fill: true,
    tension: 0.4,
    spanGaps: true,
    pointRadius: 5,
    pointHoverRadius: 8,
  }));

  const chartData = { labels, datasets };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 2000,
      easing: "easeInOutQuart",
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
        x: { ticks: { autoSkip: false, maxRotation: 45 } }
    },
  };

  const totalObt = marks.reduce((a, b) => a + Number(b.obtained_marks), 0);
  const totalMarks = marks.reduce((a, b) => a + Number(b.total_marks), 0);
  const overallPercentage = totalMarks
    ? ((totalObt / totalMarks) * 100).toFixed(1)
    : 0;

  const getRemark = (p) => {
    if (p >= 85) return "Excellent! Keep it up.";
    if (p >= 60) return "Good job! Stay consistent.";
    if (p >= 40) return "Needs more effort.";
    return "Focus more on your studies.";
  };

  const dashArray = 2 * Math.PI * 45;
  const dashOffset = dashArray - (dashArray * overallPercentage) / 100;

  const grouped = marks.reduce((acc, m) => {
    if (!acc[m.subject_name]) acc[m.subject_name] = [];
    acc[m.subject_name].push(m);
    return acc;
  }, {});

  return (
    <div
      style={{
        margin: 0, padding: 0, fontFamily: "'Segoe UI', Roboto, sans-serif",
        background: "#F5F6FA", minHeight: "100vh", width: "100vw",
        boxSizing: "border-box", overflowX: "hidden"
      }}
    >
      {/* --- ENGLISH CENTER POPUP --- */}
      {showPopup && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center",
          alignItems: "center", zIndex: 9999, padding: "20px"
        }}>
          <div style={{
            background: "#fff", padding: "30px", borderRadius: "15px",
            textAlign: "center", boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            maxWidth: "400px", width: "100%"
          }}>
            <h2 style={{ color: "#2b5876", marginBottom: "10px" }}>New Update!</h2>
            <p style={{ color: "#555", fontSize: "16px", lineHeight: "1.5" }}>
              New test marks have been uploaded. Please check your results for: <br/>
              <strong style={{ color: "#D4AF37" }}>{newSubjectNames}</strong>
            </p>
            <button 
              onClick={() => setShowPopup(false)}
              style={{
                marginTop: "20px", padding: "12px 25px", background: "#2ECC71",
                color: "#fff", border: "none", borderRadius: "8px",
                fontWeight: "bold", cursor: "pointer", width: "100%"
              }}
            >
              Close & View
            </button>
          </div>
        </div>
      )}

      <h2 style={{ padding: "10px 12px", margin: "15px 0 5px 0" }}>Your Test Marks</h2>
      <h3 style={{ padding: "0 12px", marginBottom: 20, fontWeight: "normal" }}>
        Welcome, <strong>{userRef.current?.name}</strong>!
      </h3>

      {/* --- HIGHLIGHT BOX --- */}
      <div 
        style={{
          margin: "0 12px 20px 12px", background: "#2b5876",
          backgroundImage: "linear-gradient(45deg, #2b5876 0%, #4e4376 100%)",
          borderRadius: "20px", padding: "30px 20px", display: "flex",
          flexDirection: "column", alignItems: "center", color: "#fff",
          boxShadow: "0 10px 20px rgba(0,0,0,0.2)"
        }}
      >
        <div style={{ position: "relative", width: "120px", height: "120px" }}>
          <svg width="120" height="120" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
            <circle cx="50" cy="50" r="45" fill="transparent" stroke="#FFD700" strokeWidth="8" 
              strokeDasharray={dashArray} strokeDashoffset={dashOffset} strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1.5s ease-in-out" }}
            />
          </svg>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "22px", fontWeight: "bold" }}>
            {overallPercentage}%
          </div>
        </div>
        <p style={{ marginTop: "15px", fontSize: "18px", fontWeight: "bold" }}>{getRemark(overallPercentage)}</p>
        <p style={{ marginTop: "5px", fontSize: "14px", opacity: 0.8 }}>Overall Performance</p>
      </div>

      {/* Captcha Section */}
      <div style={{ marginTop: 15, display: "flex", flexDirection: "column", gap: 10, width: "100%", padding: "0 12px", boxSizing: "border-box" }}>
        <div style={{ padding: 15, background: "#fff", borderRadius: 8, width: "100%", boxSizing: "border-box", textAlign: "center", fontWeight: "bold", letterSpacing: 4, fontSize: 20, border: "1px dashed #ccc" }}>
          {captcha}
        </div> 

        <div style={{ display: "flex", gap: 10 }}>
            <button onClick={generateCaptcha} style={{ background: "#3498DB", padding: 12, color: "#fff", border: "none", borderRadius: 10, flex: 1, cursor: "pointer" }}>Refresh</button>
            <input type="text" value={captchaInput} onChange={(e) => setCaptchaInput(e.target.value)} placeholder="Enter Captcha" style={{ padding: 12, borderRadius: 10, flex: 2, border: "1px solid #ccc", fontSize: 16, boxSizing: "border-box" }} />
        </div>

        <button onClick={handleCheckMarks} style={{ padding: 15, background: "#2ECC71", color: "#fff", borderRadius: 10, border: "none", width: "100%", fontSize: 16, fontWeight: "bold", cursor: "pointer" }}>
          Check Marks
        </button>
      </div>

      {message && <p style={{ color: message.includes("success") ? "green" : "red", textAlign: "center", marginTop: 10 }}>{message}</p>}

      {/* Summary Cards */}
      {marks.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15, marginTop: 25, padding: "0 12px", boxSizing: "border-box" }}>
          <div style={{ background: "#fff", padding: 20, borderRadius: 12, boxShadow: "0px 4px 12px rgba(0,0,0,0.05)", textAlign: "center" }}>
            <h4 style={{ margin: "0 0 10px 0", color: "#666" }}>Avg %</h4>
            <div style={{ fontSize: 28, fontWeight: "bold", color: "#2b5876" }}>{overallPercentage}%</div>
          </div>
          <div style={{ background: "#fff", padding: 20, borderRadius: 12, boxShadow: "0px 4px 12px rgba(0,0,0,0.05)", textAlign: "center" }}>
            <h4 style={{ margin: "0 0 10px 0", color: "#666" }}>Total Tests</h4>
            <div style={{ fontSize: 28, fontWeight: "bold", color: "#3498DB" }}>{marks.length}</div>
          </div>
        </div>
      )}

      {/* Graph */}
      {marks.length > 0 && (
        <div style={{ marginTop: 30, background: "#fff", padding: 15, borderRadius: 12, boxShadow: "0px 4px 12px rgba(0,0,0,0.05)", margin: "30px 12px", overflowX: "auto" }}>
          <div style={{ minWidth: "600px", height: "350px" }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      )}

      {/* Tables */}
      {Object.keys(grouped).map((subject, idx) => (
        <div key={subject} style={{ background: "#fff", padding: 15, borderRadius: 12, margin: "20px 12px", boxShadow: "0px 4px 12px rgba(0,0,0,0.05)", overflowX: "auto" }}>
          <h3 style={{ borderLeft: `5px solid ${colors[idx % colors.length]}`, paddingLeft: 10, color: "#333", marginBottom: 15 }}>{subject}</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8f9fa", textAlign: "left" }}>
                <th style={{ padding: 10, fontSize: "14px" }}>Date</th>
                <th style={{ padding: 10, fontSize: "14px" }}>Total</th>
                <th style={{ padding: 10, fontSize: "14px" }}>Obt</th>
                <th style={{ padding: 10, fontSize: "14px" }}>%</th>
                <th style={{ padding: 10, fontSize: "14px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {grouped[subject].map((m) => {
                const p = ((m.obtained_marks / m.total_marks) * 100).toFixed(1);
                const isPass = parseFloat(p) >= 33;
                return (
                  <tr key={m.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 10 }}>{new Date(m.test_date).toLocaleDateString()}</td>
                    <td style={{ padding: 10 }}>{m.total_marks}</td>
                    <td style={{ padding: 10 }}>{m.obtained_marks}</td>
                    <td style={{ padding: 10, fontWeight: "bold", color: "#2b5876" }}>{p}%</td>
                    <td style={{ padding: 10 }}>
                        <span style={{ padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "bold", color: "#fff", background: isPass ? "#2ECC71" : "#E74C3C" }}>
                            {isPass ? "PASS" : "FAIL"}
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
  );
};

export default StudentMarks;