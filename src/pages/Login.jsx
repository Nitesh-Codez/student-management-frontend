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
      const { data } = await axios.post(`${API_URL}/api/auth/login`, {
        name,
        password,
      });

      if (data.success) {
        const user = data.user;

        // ✅ BASIC USER INFO
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("studentName", user.name);
        localStorage.setItem("userRole", user.role);

        // ✅ IMPORTANT: SAVE CLASS (EXACT DB VALUE)
        if (user.role === "student") {
          localStorage.setItem("studentClass", user.class); // eg: "10th"
          localStorage.setItem("studentId", user.id);
        }

        // ✅ REDIRECT
        navigate(user.role === "admin" ? "/admin" : "/student");
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(
        "Server Error: " +
          (err.response?.data?.message || err.message)
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={page}>
      <div style={backgroundShapes}></div>

      <div style={branding}>
        <h1 style={logo}>𝐒MARTZØηE</h1>
        <p style={tagline}>
          Empowering Students | Celebrating Classes | Inspiring Excellence
        </p>
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

const page = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "linear-gradient(135deg, #1b1b1b, #0d0d0d)",
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
  background:
    "radial-gradient(circle at 25% 25%, #ffcc0080 0%, transparent 60%), radial-gradient(circle at 75% 75%, #ffffff20 0%, transparent 50%)",
  zIndex: 0,
  transform: "rotate(25deg)",
  filter: "blur(80px)",
};

const branding = {
  position: "absolute",
  top: "50px",
  width: "100%",
  textAlign: "center",
  color: "#fff",
  zIndex: 1,
};

const logo = {
  fontSize: "10vw",
  fontWeight: "900",
  margin: "0 auto",
  letterSpacing: "0.18em",
  color: "#ffffff",
  textShadow: `
    0 0 5px rgba(255,255,255,0.7),
    0 0 10px rgba(122, 255, 60, 0.5),
    0 0 20px rgba(255,204,0,0.3)
  `,
};

const tagline = {
  fontSize: "4.5vw",
  marginTop: "15px",
  color: "#fff",
  fontWeight: "600",
  fontStyle: "italic",
};

const loginCard = {
  width: "90%",
  maxWidth: "400px",
  padding: "40px",
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(20px)",
  borderRadius: "25px",
  boxShadow: "0 15px 40px rgba(0,0,0,0.5)",
  zIndex: 2,
  marginTop: "250px",
  color: "#fff",
};

const loginTitle = {
  marginBottom: "25px",
  fontWeight: "700",
  textAlign: "center",
  fontSize: "28px",
};

const label = {
  display: "block",
  marginBottom: "6px",
  fontWeight: "500",
};

const input = {
  width: "100%",
  padding: "14px",
  borderRadius: "12px",
  border: "none",
  marginBottom: "18px",
  fontSize: "16px",
  background: "rgba(255,255,255,0.1)",
  color: "#fff",
  outline: "none",
};

const button = {
  width: "100%",
  padding: "14px",
  borderRadius: "12px",
  border: "none",
  background: "linear-gradient(90deg, #ffcc00, #ff9900)",
  color: "#1b1b1b",
  fontSize: "17px",
  fontWeight: "700",
  cursor: "pointer",
};

const errorStyle = {
  color: "#ff4d4f",
  marginBottom: "10px",
  textAlign: "center",
};

export default Login;
