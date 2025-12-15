import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const StudentNewMarks = () => {
  const [marks, setMarks] = useState([]);
  const [message, setMessage] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");

  const API_URL =
    process.env.REACT_APP_API_URL ||
    "https://student-management-system-4-hose.onrender.com";

  const user = JSON.parse(localStorage.getItem("user"));
  const userRef = useRef(user);

  const generateCaptcha = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 5; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    setCaptcha(code);
    setCaptchaInput("");
  };

  useEffect(() => generateCaptcha(), []);

  const handleCheckMarks = () => {
    if (captchaInput !== captcha) {
      setMessage("Captcha incorrect!");
      generateCaptcha();
      return;
    }

    if (!userRef.current?.id || !userRef.current?.name) {
      setMessage("User not found. Please login again.");
      return;
    }

    axios
      .post(`${API_URL}/api/new-marks/check`, {
        studentId: userRef.current.id,
        studentName: userRef.current.name,
      })
      .then((res) => {
        if (res.data.success) {
          setMarks(res.data.data);
          setMessage("");
        } else {
          setMarks([]);
          setMessage(res.data.message || "No test held yet");
        }
      })
      .catch(() => setMessage("Something went wrong"));
  };

  // Overall Summary
  const getOverall = () => {
    if (!marks.length)
      return {
        obtained: 0,
        total: 0,
        percent: 0,
        passCount: 0,
        failCount: 0,
        distCount: 0,
        suppCount: 0,
      };

    let obtained = 0,
      total = 0,
      passCount = 0,
      failCount = 0,
      distCount = 0,
      suppCount = 0;

    marks.forEach((m) => {
      const t = Number(m.total_marks || 0);
      const o = Number(m.obtained_marks || 0);
      const p = t ? (o / t) * 100 : 0;
      obtained += o;
      total += t;

      if (p >= 85) distCount++;
      else if (p < 33) suppCount++;
      else passCount++;
    });

    failCount = marks.length - distCount - suppCount - passCount;

    const percent = total ? ((obtained / total) * 100).toFixed(2) : 0;
    return { obtained, total, percent, passCount, failCount, distCount, suppCount };
  };

  const overall = getOverall();

  const getRemarks = (percent) => {
    if (percent >= 85) return "Excellent - Distinction";
    if (percent >= 70) return "Good - First Class";
    if (percent >= 33) return "Pass";
    return "Fail - Needs Improvement";
  };

  const getSubjectStatus = (percent) => {
    if (percent >= 85) return "Distinction";
    if (percent < 33) return "Supplementary";
    return "Pass";
  };

  return (
    <div style={{ background: "#F5F6FA", minHeight: "100vh", padding: "15px", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ textAlign: "center", marginBottom: "5px", fontSize: "1.8rem" }}>Smart Student Classes</h1>
      <h2 style={{ textAlign: "center", marginBottom: "5px", fontSize: "1.2rem" }}>PRE-FINAL EXAM RESULT 2025-26</h2>
      <h3 style={{ textAlign: "center", marginBottom: "20px", fontSize: "1rem" }}>Welcome, {userRef.current?.name}</h3>

      {/* CAPTCHA */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <div style={{ marginBottom: "10px", fontSize: "1.1rem" }}>Captcha: <b>{captcha}</b></div>
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "10px" }}>
          <button onClick={generateCaptcha} style={buttonStyle}>Refresh</button>
          <input
            value={captchaInput}
            onChange={(e) => setCaptchaInput(e.target.value)}
            placeholder="Enter Captcha"
            style={inputStyle}
          />
          <button onClick={handleCheckMarks} style={buttonStyle}>Check Marks</button>
        </div>
      </div>

      {message && <p style={{ color: "red", textAlign: "center", marginBottom: "15px" }}>{message}</p>}

      {/* MARKS TABLE */}
      {marks.length > 0 && (
        <div style={{ overflowX: "auto", marginBottom: "20px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "10px", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}>
            <thead style={{ background: "#1f3c88", color: "#fff" }}>
              <tr>
                <th style={th}>Date</th>
                <th style={th}>Subject</th>
                <th style={th}>Theory</th>
                <th style={th}>Viva</th>
                <th style={{ ...th, width: "80px" }}>Attendance</th>
                <th style={th}>Total</th>
                <th style={th}>Obtained</th>
                <th style={th}>%</th>
                <th style={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {marks.map((m, i) => {
                const obtained = Number(m.obtained_marks || 0);
                const total = Number(m.total_marks || 0);
                const percent = total ? ((obtained / total) * 100).toFixed(1) : "0.0";
                const status = getSubjectStatus(percent);

                return (
                  <tr key={i} style={{
                    textAlign: "center",
                    borderBottom: "1px solid #ddd",
                    backgroundColor:
                      status === "Distinction" ? "#d4edda" :
                      status === "Supplementary" ? "#fff3cd" : "#ffffff",
                  }}>
                    <td style={td}>{new Date(m.test_date).toLocaleDateString()}</td>
                    <td style={td}>{m.subject}</td>
                    <td style={td}>{m.theory_marks}</td>
                    <td style={td}>{m.viva_marks}</td>
                    <td style={{ ...td, width: "80px" }}>{m.attendance_marks}</td>
                    <td style={td}>{total}</td>
                    <td style={td}>{obtained}</td>
                    <td style={td}>{percent}%</td>
                    <td style={{ ...td, fontWeight: "bold" }}>{status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Overall Summary (Vertical Points) */}
      {marks.length > 0 && (
        <div style={{ marginTop: "10px", fontSize: "1rem", lineHeight: "1.6" }}>
          <p><b>Total Marks:</b> {overall.total}</p>
          <p><b>Obtained Marks:</b> {overall.obtained}</p>
          <p><b>Percentage:</b> {overall.percent}%</p>
          <p><b>Pass Subjects:</b> {overall.passCount}</p>
          <p><b>Fail Subjects:</b> {overall.failCount}</p>
          <p><b>Distinction:</b> {overall.distCount}</p>
          <p><b>Supplementary:</b> {overall.suppCount}</p>
          <p><b>Remarks:</b> {getRemarks(overall.percent)}</p>
        </div>
      )}
    </div>
  );
};

const th = { padding: "10px", border: "1px solid #ddd", fontSize: "0.9rem" };
const td = { padding: "8px", border: "1px solid #ddd", fontSize: "0.85rem" };
const inputStyle = { padding: "6px", minWidth: "120px", borderRadius: "4px", border: "1px solid #ccc" };
const buttonStyle = { padding: "6px 12px", borderRadius: "4px", border: "none", background: "#1f3c88", color: "#fff", cursor: "pointer" };

export default StudentNewMarks;
