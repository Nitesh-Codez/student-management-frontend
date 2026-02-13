import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL || "https://student-management-system-4-hose.onrender.com";

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
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("studentName", user.name);
        localStorage.setItem("userRole", user.role);

        if (user.role === "student") {
          localStorage.setItem("studentClass", user.class);
          localStorage.setItem("studentId", user.id);
        }
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
    <div style={styles.page}>
      {/* --- INJECTING ANIMATION --- */}
      <style>
        {`
          @keyframes float {
            0% { transform: translateY(0px) translateX(0px); }
            50% { transform: translateY(-20px) translateX(10px); }
            100% { transform: translateY(0px) translateX(0px); }
          }
          @keyframes floatSlow {
            0% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-30px) rotate(10deg); }
            100% { transform: translateY(0px) rotate(0deg); }
          }
        `}
      </style>

      {/* --- ANIMATED BUBBLES (Image Reference) --- */}
      <div style={{ ...styles.bubble, ...styles.bubble1 }}></div>
      <div style={{ ...styles.bubble, ...styles.bubble2 }}></div>
      <div style={{ ...styles.bubble, ...styles.bubble3 }}></div>

      <div style={styles.branding}>
        <h1 style={styles.logo}>𝐒MARTZØηE</h1>
        <p style={styles.tagline}>
          Empowering Students | Celebrating Classes | Inspiring Excellence
        </p>
      </div>

      <div style={styles.loginCard}>
        <h2 style={styles.loginTitle}>Login</h2>

        {error && <p style={styles.errorStyle}>{error}</p>}

        <form onSubmit={handleLogin}>
          <label style={styles.label}>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
            placeholder="Enter your Name"
            required
          />

          <label style={styles.label}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            placeholder="Enter password"
            required
          />

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Please wait..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

// ------------------ STYLES --------------------

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    background: "#f3f4f6", // Light grey background jaisa image mein hai
    position: "relative",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    overflow: "hidden",
  },
  bubble: {
    position: "absolute",
    borderRadius: "50%",
    zIndex: 0,
    filter: "blur(2px)",
  },
  bubble1: {
    width: "90px",
    height: "90px",
    background: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)", // Pinkish bubble
    top: "5%",
    left: "5%",
    animation: "floatSlow 8s infinite ease-in-out",
    opacity: 0.9,
  },
  bubble2: {
    width: "50px",
    height: "50px",
    background: "linear-gradient(135deg, #ffcc33 0%, #ffb347 100%)", // Orange/Yellow bubble
    top: "65%",
    left: "70%",
    animation: "float 6s infinite ease-in-out",
    opacity: 0.9,
  },
  bubble2: {
    width: "90px",
    height: "90px",
    background: "linear-gradient(135deg, #ffcc33 0%, #ffb347 100%)", // Orange/Yellow bubble
    top: "15%",
    left: "60%",
    animation: "float 6s infinite ease-in-out",
    opacity: 0.7,
  },
  bubble3: {
    width: "150px",
    height: "150px",
    background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", // Blue bubble
    top: "20%",
    left: "40%",
    animation: "floatSlow 10s infinite ease-in-out",
    opacity: 0.6,
  },
  branding: {
    textAlign: "center",
    color: "#333",
    zIndex: 1,
    marginBottom: "30px",
  },
  logo: {
    fontSize: "12vw",
    fontWeight: "900",
    margin: "0",
    letterSpacing: "0.1em",
    color: "#2d3436",
  },
  tagline: {
    fontSize: "18px",
    color: "#424a4e",
    fontWeight: "600",
  },
  loginCard: {
    width: "85%",
    maxWidth: "300px",
    padding: "40px",
    background: "rgba(255, 255, 255, 0.9)",
    backdropFilter: "blur(10px)",
    borderRadius: "20px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
    zIndex: 2,
    color: "#333",
    border: "1px solid rgba(255,255,255,0.3)",
  },
  loginTitle: {
    marginBottom: "25px",
    fontWeight: "800",
    textAlign: "left",
    fontSize: "28px",
    color: "#2d3436",
    borderBottom: "3px solid #ffcc00",
    display: "inline-block",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: "700",
    fontSize: "12px",
    color: "#b2bec3",
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    padding: "12px 0",
    borderRadius: "0",
    border: "none",
    borderBottom: "2px solid #dfe6e9",
    marginBottom: "25px",
    fontSize: "16px",
    background: "transparent",
    color: "#2d3436",
    outline: "none",
    transition: "border-color 0.3s",
  },
  button: {
    width: "100%",
    padding: "15px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(90deg, #6c5ce7, #a29bfe)", // Modern Purple Gradient
    color: "#fff",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(108, 92, 231, 0.3)",
  },
  errorStyle: {
    color: "#ff7675",
    marginBottom: "15px",
    fontSize: "14px",
    fontWeight: "600",
  },
};

export default Login;