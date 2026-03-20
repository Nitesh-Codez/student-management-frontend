import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL || "https://student-management-system-4-hose.onrender.com";

  // Check if already logged in
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const user = JSON.parse(savedUser);
      navigate(user.role === "admin" ? "/admin" : "/student");
    }
  }, [navigate]);

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
        
        // --- 100% Data Retention for Dashboard ---
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("studentName", user.name);
        localStorage.setItem("userRole", user.role);

        if (user.role === "student") {
          localStorage.setItem("studentClass", user.class);
          localStorage.setItem("studentId", user.id || user._id);
          // Store these for easy access in Quiz logic
          localStorage.setItem("session", user.session || "2026-27");
          localStorage.setItem("stream", user.stream || "General");
        }

        // --- Success Redirect with Fade Effect ---
        setTimeout(() => {
          navigate(user.role === "admin" ? "/admin" : "/student");
        }, 500);
      } else {
        setError(data.message || "Access Denied: Invalid Credentials");
      }
    } catch (err) {
      setError("Network Error: check your internet or server status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* --- ADVANCED CSS ANIMATIONS --- */}
      <style>
        {`
          @keyframes float {
            0% { transform: translate(0, 0) rotate(0deg); }
            33% { transform: translate(30px, -50px) rotate(5deg); }
            66% { transform: translate(-20px, 20px) rotate(-5deg); }
            100% { transform: translate(0, 0) rotate(0deg); }
          }
          @keyframes pulse {
            0% { transform: scale(1); opacity: 0.6; }
            50% { scale(1.05); opacity: 0.8; }
            100% { transform: scale(1); opacity: 0.6; }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          input:focus {
            border-bottom: 2px solid #6c5ce7 !important;
            transition: 0.4s ease;
          }
          .glass-card {
            animation: slideUp 0.8s ease-out;
          }
        `}
      </style>

      {/* --- BACKGROUND ELEMENTS --- */}
      <div style={{ ...styles.bubble, ...styles.bubble1 }}></div>
      <div style={{ ...styles.bubble, ...styles.bubble2 }}></div>
      <div style={{ ...styles.bubble, ...styles.bubble3 }}></div>
      <div style={{ ...styles.bubble, ...styles.bubble4 }}></div>

      <div style={styles.contentWrapper}>
        <div style={styles.branding}>
          <div style={styles.badge}>v2.0 Beta</div>
          <h1 style={styles.logo}>𝐒MARTZØηE</h1>
          <p style={styles.tagline}>
            Next-Gen Academic Portal for <b>Smart Student Classes</b>
          </p>
        </div>

        <div style={styles.loginCard} className="glass-card">
          <div style={styles.cardHeader}>
            <h2 style={styles.loginTitle}>Login</h2>
            <div style={styles.titleLine}></div>
          </div>

          {error && (
            <div style={styles.errorContainer}>
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={styles.input}
                placeholder="Ex: Nitesh Kushwah"
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Secret Password</label>
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
              {loading ? (
                <span style={styles.loaderText}>Authenticating...</span>
              ) : (
                "Sign In to Dashboard"
              )}
            </button>
          </form>
          
          <div style={styles.footerLinks}>
            Forgot Password? <span style={{color: '#6c5ce7', cursor: 'pointer'}}>Contact Admin</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ------------------ PRENIUM STYLING --------------------

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f0f2f5",
    position: "relative",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    overflow: "hidden",
  },
  contentWrapper: {
    zIndex: 10,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
  },
  bubble: {
    position: "absolute",
    borderRadius: "50%",
    filter: "blur(40px)",
    zIndex: 1,
  },
  bubble1: {
    width: "300px", height: "300px",
    background: "rgba(108, 92, 231, 0.2)",
    top: "-50px", left: "-50px",
    animation: "float 12s infinite linear",
  },
  bubble2: {
    width: "250px", height: "250px",
    background: "rgba(255, 107, 107, 0.15)",
    bottom: "10%", right: "5%",
    animation: "float 10s infinite reverse linear",
  },
  bubble3: {
    width: "200px", height: "200px",
    background: "rgba(0, 210, 211, 0.15)",
    top: "20%", right: "20%",
    animation: "pulse 6s infinite ease-in-out",
  },
  bubble4: {
    width: "150px", height: "150px",
    background: "rgba(254, 202, 87, 0.2)",
    bottom: "20%", left: "20%",
    animation: "float 8s infinite linear",
  },
  branding: {
    textAlign: "center",
    marginBottom: "40px",
  },
  badge: {
    display: "inline-block",
    background: "#6c5ce7",
    color: "#fff",
    fontSize: "10px",
    padding: "4px 12px",
    borderRadius: "20px",
    fontWeight: "bold",
    marginBottom: "10px",
    boxShadow: "0 4px 10px rgba(108, 92, 231, 0.3)",
  },
  logo: {
    fontSize: "clamp(48px, 12vw, 84px)",
    fontWeight: "900",
    margin: "0",
    color: "#1a1a1a",
    letterSpacing: "-2px",
  },
  tagline: {
    fontSize: "16px",
    color: "#57606f",
    marginTop: "5px",
    letterSpacing: "0.5px",
  },
  loginCard: {
    width: "90%",
    maxWidth: "400px",
    background: "rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(12px)",
    borderRadius: "32px",
    padding: "50px 40px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
    border: "1px solid rgba(255,255,255,0.6)",
  },
  cardHeader: {
    marginBottom: "35px",
  },
  loginTitle: {
    fontSize: "32px",
    fontWeight: "800",
    color: "#2d3436",
    margin: "0",
  },
  titleLine: {
    width: "40px",
    height: "5px",
    background: "#6c5ce7",
    borderRadius: "10px",
    marginTop: "8px",
  },
  inputGroup: {
    marginBottom: "25px",
  },
  label: {
    display: "block",
    fontSize: "12px",
    fontWeight: "700",
    color: "#a4b0be",
    textTransform: "uppercase",
    marginBottom: "8px",
    paddingLeft: "2px",
  },
  input: {
    width: "100%",
    padding: "14px 0px",
    fontSize: "16px",
    border: "none",
    borderBottom: "2px solid #f1f2f6",
    background: "transparent",
    color: "#2d3436",
    outline: "none",
    fontWeight: "500",
  },
  button: {
    width: "100%",
    padding: "18px",
    borderRadius: "18px",
    border: "none",
    background: "linear-gradient(135deg, #2d3436 0%, #000000 100%)",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 15px 30px rgba(0,0,0,0.2)",
    transition: "all 0.3s ease",
    marginTop: "10px",
  },
  errorContainer: {
    background: "#fff2f0",
    border: "1px solid #ffa39e",
    color: "#cf1322",
    padding: "12px 16px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: "600",
    marginBottom: "25px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  footerLinks: {
    marginTop: "25px",
    fontSize: "13px",
    color: "#a4b0be",
    textAlign: "center",
    fontWeight: "600",
  },
  loaderText: {
    letterSpacing: "1px",
  }
};

export default Login;