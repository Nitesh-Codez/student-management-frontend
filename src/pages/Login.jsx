import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await axios.post(`${API_URL}/api/auth/login`, { name, password });

      if (data.success) {
        const user = data.user;

        // 🟢 Correct way: save full user details in ONE key
        localStorage.setItem("user", JSON.stringify(user));

        // 🟢 Extra: save name separately (optional)
        localStorage.setItem("studentName", user.name);

        // Redirect based on role
        navigate(user.role === "admin" ? "/admin" : "/student");
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Server Error: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={page}>
      <div style={backgroundShapes}></div>

      <div style={branding}>
        <h1 style={logo}>
          {"SMARTZONE".split("").map((ch, i) => (
            <span key={i} style={logoBorder}>{ch}</span>
          ))}
        </h1>
        <p style={tagline}>Empowering Students | Celebrating Classes | Inspiring Excellence</p>
      </div>

      <div style={loginCard}>
        <h2 style={loginTitle}>Login</h2>
        {error && <p style={errorStyle}>{error}</p>}
        <form onSubmit={handleLogin}>
          <label style={label}>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={input}
            required
          />
          <label style={label}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={input}
            required
          />
          <button type="submit" style={button} disabled={loading}>
            {loading ? "Please wait..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

// ------------------ STYLES --------------------

const page = { minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#1b1b1b", position: "relative", fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", overflow: "hidden" };
const backgroundShapes = { position: "absolute", width: "150%", height: "150%", top: "-25%", left: "-25%", background: "radial-gradient(circle at 30% 30%, #ffcc00 0%, transparent 60%), radial-gradient(circle at 70% 70%, #ffffff20 0%, transparent 50%)", zIndex: 0, transform: "rotate(30deg)" };
const branding = { position: "absolute", top: "30px", width: "100%", textAlign: "center", color: "#ffcc00", zIndex: 1 };
const logo = { fontSize: "5vw", fontWeight: "900", margin: 0, letterSpacing: "0.3em", display: "inline-block", maxFontSize: "64px" };
const logoBorder = { display: "inline-block", padding: "0 5px", border: "2px solid #ffcc00", borderRadius: "5px", boxShadow: "2px 2px 10px rgba(0, 255, 21, 0.95)", margin: "0 2px", color: "#000000ff" };
const tagline = { fontSize: "3vw", maxFontSize: "20px", marginTop: "10px", color: "#ffffffcc", fontWeight: "500" };
const loginCard = { width: "90%", maxWidth: "380px", padding: "40px", background: "#ffffffee", borderRadius: "15px", boxShadow: "0 15px 40px rgba(0,0,0,0.3)", zIndex: 2, position: "relative", marginTop: "180px" };
const loginTitle = { marginBottom: "20px", fontWeight: "600", textAlign: "center", fontSize: "24px", color: "#333" };
const label = { display: "block", marginBottom: "6px", fontWeight: "500", color: "#333" };
const input = { width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #ccc", marginBottom: "15px", fontSize: "16px" };
const button = { width: "100%", padding: "12px", borderRadius: "8px", border: "none", background: "#ffcc00", color: "#1b1b1b", fontSize: "17px", fontWeight: "600", cursor: "pointer", transition: "0.3s" };
const errorStyle = { color: "red", marginBottom: "10px", textAlign: "center" };

export default Login;
