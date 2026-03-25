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

        // --- REFRESH DATA ON EVERY LOGIN ---
        localStorage.clear(); 
        
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("studentName", user.name);
        localStorage.setItem("userRole", user.role);
        localStorage.setItem("session", user.session); 
        localStorage.setItem("joining_date", user.joining_date); 

        if (user.role === "student") {
          localStorage.setItem("studentClass", user.class);
          localStorage.setItem("studentId", user.id);
          
          // --- STREAM ONLY FOR 11th & 12th ---
          const isHigherSecondary = ["11", "12", "11th", "12th"].includes(String(user.class));
          if (isHigherSecondary && user.stream) {
            localStorage.setItem("studentStream", user.stream);
          }
        }

        navigate(user.role === "admin" ? "/admin" : "/student");
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Server Error: " + (err.response?.data?.message || "Check connection"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <style>
        {`
          @keyframes float {
            0% { transform: translateY(0px) translateX(0px); }
            50% { transform: translateY(-20px) translateX(15px); }
            100% { transform: translateY(0px) translateX(0px); }
          }
          @keyframes floatSlow {
            0% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-30px) rotate(5deg); }
            100% { transform: translateY(0px) rotate(0deg); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
        `}
      </style>

      {/* --- ANIMATED BALLOON BUBBLES --- */}
      <div style={{ ...styles.bubble, ...styles.bubble1 }}></div>
      <div style={{ ...styles.bubble, ...styles.bubble2 }}></div>
      <div style={{ ...styles.bubble, ...styles.bubble3 }}></div>
      <div style={{ ...styles.bubble, ...styles.bubble4 }}></div>

      <div style={styles.branding}>
        <h1 style={styles.logo}>𝐒MART𝐙ØηE</h1>
        <p style={styles.tagline}>
          Empowering Students | Celebrating Classes | Inspiring Excellence
        </p>
      </div>

      <div style={styles.loginCard}>
        <h2 style={styles.loginTitle}>Login</h2>

        {error && <p style={styles.errorStyle}>{error}</p>}

        <form onSubmit={handleLogin}>
          <div style={styles.inputBox}>
            <label style={styles.label}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={styles.input}
              placeholder="Enter your Name"
              required
            />
          </div>

          <div style={styles.inputBox}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Verifying..." : "Login"}
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
    background: "#f8fafc", 
    position: "relative",
    fontFamily: "'Segoe UI', Roboto, sans-serif",
    overflow: "hidden",
  },
  bubble: {
    position: "absolute",
    borderRadius: "50%",
    zIndex: 0,
    filter: "blur(1px)",
    opacity: 0.6,
  },
  bubble1: {
    width: "100px",
    height: "100px",
    background: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
    top: "10%",
    left: "10%",
    animation: "floatSlow 8s infinite ease-in-out",
  },
  bubble2: {
    width: "80px",
    height: "80px",
    background: "linear-gradient(135deg, #ffcc33 0%, #ffb347 100%)",
    bottom: "15%",
    right: "15%",
    animation: "float 6s infinite ease-in-out",
  },
  bubble3: {
    width: "140px",
    height: "140px",
    background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    top: "20%",
    right: "10%",
    animation: "floatSlow 10s infinite ease-in-out",
  },
  bubble4: {
    width: "60px",
    height: "60px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    bottom: "20%",
    left: "20%",
    animation: "float 7s infinite ease-in-out",
  },
  branding: {
    textAlign: "center",
    color: "#333",
    zIndex: 1,
    marginBottom: "25px",
    animation: "fadeIn 0.8s ease",
  },
  logo: {
    fontSize: "clamp(48px, 10vw, 80px)",
    fontWeight: "900",
    margin: "0",
    letterSpacing: "0.05em",
    color: "#1e293b",
  },
  tagline: {
    fontSize: "clamp(12px, 2vw, 16px)",
    color: "#64748b",
    fontWeight: "600",
    marginTop: "5px",
  },
  loginCard: {
    width: "90%",
    maxWidth: "340px",
    padding: "25px 30px",
    background: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(10px)",
    borderRadius: "24px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
    zIndex: 2,
    border: "1px solid #fff",
    animation: "fadeIn 1s ease",
  },
  loginTitle: {
    marginBottom: "20px",
    fontWeight: "800",
    fontSize: "26px",
    color: "#1e293b",
    borderLeft: "5px solid #6366f1",
    paddingLeft: "12px",
  },
  inputBox: {
    marginBottom: "15px",
  },
  label: {
    display: "block",
    marginBottom: "6px",
    fontWeight: "700",
    fontSize: "12px",
    color: "#94a3b8",
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    padding: "10px 0",
    border: "none",
    borderBottom: "2px solid #e2e8f0",
    fontSize: "16px",
    background: "transparent",
    color: "#1e293b",
    outline: "none",
    transition: "border-color 0.3s",
    boxSizing: "border-box",
  },
  button: {
    width: "100%",
    padding: "14px",
    borderRadius: "14px",
    border: "none",
    background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 8px 15px rgba(99, 102, 241, 0.25)",
    marginTop: "10px",
    transition: "transform 0.2s",
  },
  errorStyle: {
    color: "#ef4444",
    background: "#fee2e2",
    padding: "8px",
    borderRadius: "8px",
    marginBottom: "15px",
    fontSize: "13px",
    fontWeight: "600",
    textAlign: "center",
  },
};

export default Login;