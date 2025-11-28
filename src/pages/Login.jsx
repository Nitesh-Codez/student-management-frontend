import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, { name, password });

      if (res.data.success) {
        localStorage.setItem("user", JSON.stringify(res.data.user));
        const role = res.data.user.role;
        navigate(role === "admin" ? "/admin" : "/student");
      } else {
        setError(res.data.message);
      }
    } catch (err) {
      setError("Server Error: " + err.message);
    }

    setLoading(false);
  };

  return (
    <div style={page}>
      {/* Background Shapes */}
      <div style={backgroundShapes}></div>

      {/* Branding */}
      <div style={branding}>
        <h1 style={logo}>
          <span style={logoBorder}>S</span>
          <span style={logoBorder}>M</span>
          <span style={logoBorder}>A</span>
          <span style={logoBorder}>R</span>
          <span style={logoBorder}>T</span>
          <span style={logoBorder}>Z</span>
          <span style={logoBorder}>O</span>
          <span style={logoBorder}>N</span>
          <span style={logoBorder}>E</span>
        </h1>
        <p style={tagline}>Empowering Students | Celebrating Classes | Inspiring Excellence</p>
      </div>

      {/* Login Card */}
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

/* ---------------- STYLES ---------------- */
const page = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "#1b1b1b",
  position: "relative",
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  overflow: "hidden",
};

const backgroundShapes = {
  position: "absolute",
  width: "150%",
  height: "150%",
  top: "-25%",
  left: "-25%",
  background: "radial-gradient(circle at 30% 30%, #ffcc00 0%, transparent 60%), radial-gradient(circle at 70% 70%, #ffffff20 0%, transparent 50%)",
  zIndex: 0,
  transform: "rotate(30deg)",
};

const branding = {
  position: "absolute",
  top: "30px",       // branding ko top me rakha
  width: "100%",
  textAlign: "center",
  color: "#ffcc00",
  zIndex: 1,
};

const logo = {
  fontSize: "5vw", // screen ke hisaab se resize
  fontWeight: "900",
  margin: 0,
  letterSpacing: "0.3em",
  display: "inline-block",
  maxFontSize: "64px", // maximum desktop size
};

const logoBorder = {
  display: "inline-block",
  padding: "0 5px",
  border: "2px solid #ffcc00",
  borderRadius: "5px",
  boxShadow: "2px 2px 10px rgba(0,0,0,0.5)",
  margin: "0 2px",
  color: "#ffcc00",
};

const tagline = {
  fontSize: "3vw", // responsive
  maxFontSize: "20px",
  marginTop: "10px",
  color: "#ffffffcc",
  fontWeight: "500",
};

const loginCard = {
  width: "90%",      // mobile friendly
  maxWidth: "380px", // desktop max
  padding: "40px",
  background: "#ffffffee",
  borderRadius: "15px",
  boxShadow: "0 15px 40px rgba(0,0,0,0.3)",
  zIndex: 2,
  position: "relative",
  marginTop: "180px",
};

const loginTitle = {
  marginBottom: "20px",
  fontWeight: "600",
  textAlign: "center",
  fontSize: "24px",
  color: "#333",
};

const label = {
  display: "block",
  marginBottom: "6px",
  fontWeight: "500",
  color: "#333",
};

const input = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  marginBottom: "15px",
  fontSize: "16px",
};

const button = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "none",
  background: "#ffcc00",
  color: "#1b1b1b",
  fontSize: "17px",
  fontWeight: "600",
  cursor: "pointer",
  transition: "0.3s",
};

const errorStyle = {
  color: "red",
  marginBottom: "10px",
  textAlign: "center",
};

export default Login;
