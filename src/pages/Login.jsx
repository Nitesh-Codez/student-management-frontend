import React, { useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaShieldAlt } from "react-icons/fa";

const Login = () => {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  // --- Pattern Lock Modal States ---
  const [showPatternModal, setShowPatternModal] = useState(false);
  const [modalType, setModalType] = useState("set"); // "set" or "verify"
  const [pendingUser, setPendingUser] = useState(null);
  const [authToken, setAuthToken] = useState(""); // Temporary state to hold JWT during login flow
  const [pattern, setPattern] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [patternError, setPatternError] = useState("");
  const [patternSuccess, setPatternSuccess] = useState("");

  const gridRef = useRef(null);
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
        setPendingUser(user);
        
        // Save token temporarily for pattern verification/setup requests
        const token = data.token;
        setAuthToken(token);

        // Check if pattern is already configured for this user (both admin and student)
        try {
          const res = await axios.post(`${API_URL}/api/auth/verify-pattern`, {
            studentId: user.id,
            pattern: "check_if_enabled"
          }, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          if (res.data.message === "Pattern not set.") {
            setModalType("set");
            setShowPatternModal(true);
            setLoading(false);
          } else {
            // Pattern is already set, prompt user to draw pattern every time on login
            setModalType("verify");
            setPattern([]);
            setShowPatternModal(true);
            setLoading(false);
          }
        } catch (err) {
          setModalType("set");
          setPendingUser(user);
          setShowPatternModal(true);
          setLoading(false);
        }

      } else {
        setError(data.message);
        setLoading(false);
      }
    } catch (err) {
      setError("Server Error: " + (err.response?.data?.message || "Check connection"));
      setLoading(false);
    }
  };

  const storeUserData = (user, token) => {
    localStorage.clear(); 
    if (token) localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("studentName", user.name);
    localStorage.setItem("userRole", user.role);
    localStorage.setItem("session", user.session); 
    localStorage.setItem("joining_date", user.joining_date); 

    if (user.role === "student") {
      localStorage.setItem("studentClass", user.class);
      localStorage.setItem("studentId", user.id);
      
      const isHigherSecondary = ["11", "12", "11th", "12th"].includes(String(user.class));
      if (isHigherSecondary && user.stream) {
        localStorage.setItem("studentStream", user.stream);
      }
    }
  };

  // --- Exact Dot Center Coordinates for Grid ---
  const getDotCenter = (index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const spacing = 72;
    const startOffset = 31;
    return {
      x: startOffset + col * spacing,
      y: startOffset + row * spacing
    };
  };

  // --- Strict Dot-to-Dot Touch & Mouse Interaction ---
  const handleStart = (index, e) => {
    e.stopPropagation();
    setIsDrawing(true);
    setPattern([index]);
    setPatternError("");
    const center = getDotCenter(index);
    setCurrentPos(center);
  };

  const handleEnter = (index) => {
    if (isDrawing && !pattern.includes(index)) {
      setPattern((prev) => [...prev, index]);
      const center = getDotCenter(index);
      setCurrentPos(center);
    }
  };

  const handleTouchMove = (e) => {
    if (!isDrawing || !gridRef.current) return;
    const touch = e.touches[0];
    const rect = gridRef.current.getBoundingClientRect();
    
    setCurrentPos({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    });

    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (target && target.dataset && target.dataset.id !== undefined) {
      const dotIndex = parseInt(target.dataset.id, 10);
      if (!pattern.includes(dotIndex)) {
        setPattern((prev) => [...prev, dotIndex]);
      }
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    setCurrentPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleEnd = () => {
    setIsDrawing(false);
    if (pattern.length > 0) {
      setCurrentPos(getDotCenter(pattern[pattern.length - 1]));
    }
  };

  // --- Smooth Cubic Bezier Path Generator with Light Grey Tracking Line ---
  const generateSmoothPath = () => {
    if (pattern.length === 0) return "";
    
    let path = `M ${getDotCenter(pattern[0]).x} ${getDotCenter(pattern[0]).y}`;
    
    for (let i = 1; i < pattern.length; i++) {
      const prev = getDotCenter(pattern[i - 1]);
      const curr = getDotCenter(pattern[i]);
      const midX = (prev.x + curr.x) / 2;
      const midY = (prev.y + curr.y) / 2;
      path += ` Q ${midX} ${midY}, ${curr.x} ${curr.y}`;
    }

    return path;
  };

  // --- Smooth Live Tracking Line (Light Grey) from last selected dot to cursor/finger ---
  const generateLivePath = () => {
    if (!isDrawing || pattern.length === 0) return "";
    const last = getDotCenter(pattern[pattern.length - 1]);
    const midX = (last.x + currentPos.x) / 2;
    const midY = (last.y + currentPos.y) / 2;
    return `M ${last.x} ${last.y} Q ${midX} ${midY}, ${currentPos.x} ${currentPos.y}`;
  };

  const handleSavePattern = async () => {
    if (pattern.length < 3) {
      setPatternError("Connect at least 3 dots!");
      return;
    }

    try {
      await axios.post(`${API_URL}/api/auth/set-pattern`, {
        studentId: pendingUser.id,
        pattern: pattern.join("-")
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      setPatternSuccess("Security lock configured successfully!");
      setTimeout(() => {
        storeUserData(pendingUser, authToken);
        if (pendingUser.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/student");
        }
      }, 1000);
    } catch (err) {
      setPatternError("Failed to save pattern. Try again.");
    }
  };

  const handleVerifyPattern = async () => {
    if (pattern.length < 3) {
      setPatternError("Connect at least 3 dots!");
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/api/auth/verify-pattern`, {
        studentId: pendingUser.id,
        pattern: pattern.join("-")
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      if (res.data.success) {
        setPatternSuccess("Access Granted!");
        setTimeout(() => {
          storeUserData(pendingUser, authToken);
          if (pendingUser.role === "admin") {
            navigate("/admin");
          } else {
            navigate("/student");
          }
        }, 800);
      } else {
        setPatternError("Incorrect Pattern! Try again.");
        setPattern([]);
      }
    } catch (err) {
      setPatternError("Invalid Pattern. Try again.");
      setPattern([]);
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

      {/* --- SECURITY PATTERN POPUP MODAL --- */}
      {showPatternModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <FaShieldAlt style={{ color: "#6366f1", fontSize: "20px" }} />
              <h3 style={styles.modalTitle}>
                {modalType === "set" ? "Set Your Security Lock" : "Draw Pattern Lock"}
              </h3>
            </div>
            <p style={styles.modalSubText}>
              {modalType === "set"
                ? "For enhanced security, please set up a pattern lock."
                : "Enter your gesture lock to complete login."}
            </p>

            {patternError && <p style={styles.errorStyle}>{patternError}</p>}
            {patternSuccess && <p style={styles.successStyle}>{patternSuccess}</p>}

            <div 
              ref={gridRef}
              style={styles.patternGrid}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleEnd}
              onMouseMove={handleMouseMove}
              onMouseUp={handleEnd}
            >
              <svg style={styles.svgOverlay}>
                {pattern.length > 0 && (
                  <path
                    d={generateSmoothPath()}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ filter: "drop-shadow(0px 2px 4px rgba(99, 102, 241, 0.4))" }}
                  />
                )}
                {isDrawing && pattern.length > 0 && (
                  <path
                    d={generateLivePath()}
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </svg>

              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => {
                const isSelected = pattern.includes(index);
                return (
                  <div
                    key={index}
                    data-id={index}
                    style={{
                      ...styles.patternDot,
                      background: isSelected ? "#6366f1" : "#cbd5e1",
                      transform: isSelected ? "scale(1.3)" : "scale(1)",
                      boxShadow: isSelected ? "0 0 12px rgba(99, 102, 241, 0.8)" : "none",
                    }}
                    onMouseDown={(e) => handleStart(index, e)}
                    onMouseEnter={() => handleEnter(index)}
                    onTouchStart={(e) => handleStart(index, e)}
                  />
                );
              })}
            </div>

            <div style={styles.modalActions}>
              <button 
                style={styles.secondaryButton} 
                onClick={() => {
                  setPattern([]);
                  setIsDrawing(false);
                  setPatternError("");
                }}
              >
                Reset Pattern
              </button>
              <button 
                style={styles.button} 
                onClick={modalType === "set" ? handleSavePattern : handleVerifyPattern}
              >
                {modalType === "set" ? "Save & Continue" : "Verify & Login"}
              </button>
            </div>
          </div>
        </div>
      )}
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
  secondaryButton: {
    width: "100%",
    padding: "12px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#64748b",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "8px",
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
  successStyle: {
    color: "#10b981",
    background: "#d1fae5",
    padding: "8px",
    borderRadius: "8px",
    marginBottom: "15px",
    fontSize: "13px",
    fontWeight: "600",
    textAlign: "center",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(15, 23, 42, 0.6)",
    backdropFilter: "blur(5px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  modalCard: {
    width: "90%",
    maxWidth: "320px",
    background: "#fff",
    padding: "20px",
    borderRadius: "24px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    textAlign: "center",
    animation: "fadeIn 0.3s ease",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    marginBottom: "4px",
  },
  modalTitle: {
    fontSize: "17px",
    fontWeight: "800",
    color: "#1e293b",
    margin: 0,
  },
  modalSubText: {
    fontSize: "12px",
    color: "#64748b",
    marginBottom: "12px",
  },
  patternGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "18px",
    width: "190px",
    height: "190px",
    margin: "0 auto 15px auto",
    background: "#f1f5f9",
    padding: "16px",
    borderRadius: "16px",
    position: "relative",
    touchAction: "none",
    userSelect: "none",
    justifyItems: "center",
    alignItems: "center",
  },
  svgOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: 1,
  },
  patternDot: {
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    cursor: "pointer",
    zIndex: 2,
    transition: "transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease",
  },
  modalActions: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  }
};

export default Login;