// src/pages/StudentMarks.jsx

import React, { useState, useEffect } from "react";
import axios from "axios";

const StudentMarks = () => {
  const [studentId, setStudentId] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [marks, setMarks] = useState([]);
  const [message, setMessage] = useState("");

  const API_URL = process.env.REACT_APP_API_URL; 
  // Example: https://student-management-system-4-hose.onrender.com

  // Generate captcha
  const generateCaptcha = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 5; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
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

    if (!studentId) {
      setMessage("Enter your student ID");
      return;
    }

    axios
      .post(`${API_URL}/api/marks/check`, { studentId })
      .then((res) => {
        if (res.data.success) {
          setMarks(res.data.data);
          setMessage("");
        } else {
          setMarks([]);
          setMessage(res.data.message);
        }
      })
      .catch(() => {
        setMessage("Something went wrong");
      });
  };

  return (
    <div className="container">
      <h2>Check Your Marks</h2>

      {/* Student ID Input */}
      <input
        type="number"
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
        placeholder="Enter Student ID"
      />

      {/* Captcha */}
      <div style={{ marginTop: "10px" }}>
        <strong>Captcha: {captcha}</strong>
        <button onClick={generateCaptcha} style={{ marginLeft: "10px" }}>
          Refresh
        </button>
      </div>

      <input
        type="text"
        value={captchaInput}
        onChange={(e) => setCaptchaInput(e.target.value)}
        placeholder="Enter Captcha"
      />

      <button onClick={handleCheckMarks}>Check Marks</button>

      {message && <p className="error">{message}</p>}

      {/* Marks Table */}
      {marks.length > 0 && (
        <table border="1" style={{ marginTop: "20px", width: "100%" }}>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Total</th>
              <th>Obtained</th>
              <th>Status</th>
              <th>Test Date</th>
            </tr>
          </thead>
          <tbody>
            {marks.map((m) => (
              <tr key={m.id}>
                <td>{m.subject_name}</td>
                <td>{m.total_marks}</td>
                <td>{m.obtained_marks}</td>
                <td>{m.status}</td>
                <td>{new Date(m.test_date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default StudentMarks;
