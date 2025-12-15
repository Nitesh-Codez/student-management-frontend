import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const StudentNewMarks = () => {
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
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setCaptcha(code);
  };

  useEffect(() => {
    generateCaptcha();
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
        } else {
          setMessage("No test held yet");
        }
      })
      .catch(() => setMessage("Something went wrong"));
  };

  return (
    <div style={{ fontFamily: "Arial", background: "#F5F6FA", minHeight: "100vh", padding: "20px" }}>
      {/* Header */}
      <h1 style={{ textAlign: "center", marginBottom: "5px" }}>Smart Student Classes</h1>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>PRE-FINAL EXAM RESULT 2025-26</h2>
      <h3 style={{ textAlign: "center", marginBottom: "20px" }}>Welcome, {userRef.current?.name}</h3>

      {/* Captcha */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <div style={{ fontSize: "18px", marginBottom: "10px" }}>Captcha: {captcha}</div>
        <button onClick={generateCaptcha} style={{ marginRight: "10px", padding: "8px 12px" }}>Refresh</button>
        <input
          type="text"
          value={captchaInput}
          onChange={(e) => setCaptchaInput(e.target.value)}
          placeholder="Enter Captcha"
          style={{ padding: "8px", width: "150px", marginRight: "10px" }}
        />
        <button onClick={handleCheckMarks} style={{ padding: "8px 12px" }}>Check Marks</button>
      </div>

      {message && <p style={{ color: "red", textAlign: "center" }}>{message}</p>}

      {/* Marks Table */}
      {marks.length > 0 && (
        <div style={{ overflowX: "auto", marginTop: "20px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center" }}>
            <thead style={{ background: "#f1f1f1" }}>
              <tr>
                <th style={{ padding: "10px", border: "1px solid #ccc" }}>Date</th>
                <th style={{ padding: "10px", border: "1px solid #ccc" }}>Subject</th>
                <th style={{ padding: "10px", border: "1px solid #ccc" }}>Theory</th>
                <th style={{ padding: "10px", border: "1px solid #ccc" }}>Viva</th>
                <th style={{ padding: "10px", border: "1px solid #ccc" }}>Attendance</th>
                <th style={{ padding: "10px", border: "1px solid #ccc" }}>Total</th>
                <th style={{ padding: "10px", border: "1px solid #ccc" }}>Obtained</th>
                <th style={{ padding: "10px", border: "1px solid #ccc" }}>%</th>
                <th style={{ padding: "10px", border: "1px solid #ccc" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {marks.map((m) => {
                const obtained = (m.theory_marks || 0) + (m.viva_marks || 0) + (m.attendance_marks || 0);
                const percent = ((obtained / (m.total_marks || 0)) * 100).toFixed(1);
                const status = percent >= 33 ? "Pass" : "Fail";
                return (
                  <tr key={m.id}>
                    <td style={{ padding: "8px", border: "1px solid #ccc" }}>{new Date(m.test_date).toLocaleDateString()}</td>
                    <td style={{ padding: "8px", border: "1px solid #ccc" }}>{m.subject}</td>
                    <td style={{ padding: "8px", border: "1px solid #ccc" }}>{m.theory_marks}</td>
                    <td style={{ padding: "8px", border: "1px solid #ccc" }}>{m.viva_marks}</td>
                    <td style={{ padding: "8px", border: "1px solid #ccc" }}>{m.attendance_marks}</td>
                    <td style={{ padding: "8px", border: "1px solid #ccc" }}>{m.total_marks}</td>
                    <td style={{ padding: "8px", border: "1px solid #ccc" }}>{obtained}</td>
                    <td style={{ padding: "8px", border: "1px solid #ccc" }}>{percent}%</td>
                    <td style={{ padding: "8px", border: "1px solid #ccc" }}>{status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StudentNewMarks;
