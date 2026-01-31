import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isBiometricSetup, setIsBiometricSetup] = useState(false);
  
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  // Check if fingerprint is already setup for this device
  useEffect(() => {
    const isEnabled = localStorage.getItem("biometric_active");
    if (isEnabled) setIsBiometricSetup(true);
  }, []);

  // --- 1. SETUP FINGERPRINT (Peheli baar login ke baad) ---
  const setupFingerprint = async () => {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const options = {
        publicKey: {
          challenge,
          rp: { name: "SmartZone" },
          user: { id: new Uint8Array(16), name: name, displayName: name },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: { authenticatorAttachment: "platform" },
          timeout: 60000,
        },
      };

      const cred = await navigator.credentials.create(options);
      if (cred) {
        localStorage.setItem("biometric_active", "true");
        setIsBiometricSetup(true);
        alert("Fingerprint set ho gaya! ✅");
      }
    } catch (err) {
      console.error("Setup failed", err);
    }
  };

  // --- 2. LOGIN WITH FINGERPRINT ---
  const handleFingerprintLogin = async () => {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const assertion = await navigator.credentials.get({
        publicKey: { challenge, timeout: 60000 }
      });

      if (assertion) {
        const user = JSON.parse(localStorage.getItem("user"));
        if (user) navigate(user.role === "admin" ? "/admin" : "/student");
      }
    } catch (err) {
      setError("Fingerprint matched nahi hua!");
    }
  };

  // --- 3. NORMAL LOGIN ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await axios.post(`${API_URL}/api/auth/login`, { name, password });

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
      setError("Login failed. Password check karein.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={page}>
      <div style={backgroundShapes}></div>

      <div style={branding}>
        <h1 style={logo}>𝐒MARTZØηE</h1>
        <p style={tagline}>Empowering Students | Celebrating Excellence</p>
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
            placeholder="Type your name"
            required
          />

          <label style={label}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={input}
            placeholder="Type your password"
            required
          />

          <button type="submit" style={button} disabled={loading}>
            {loading ? "Please wait..." : "Login"}
          </button>
        </form>

        <hr style={{ margin: "20px 0", opacity: 0.1 }} />

        {/* FINGERPRINT ACTIONS */}
        <div style={{ textAlign: "center" }}>
          {!isBiometricSetup ? (
            <button onClick={setupFingerprint} style={bioBtn}>
              + Enable Fingerprint Login
            </button>
          ) : (
            <button onClick={handleFingerprintLogin} style={bioBtnActive}>
              ☝️ Login with Fingerprint
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ------------------ STYLES --------------------

const page = {
  minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center",
  background: "#0d0d0d", position: "relative", fontFamily: "sans-serif", overflow: "hidden"
};

const backgroundShapes = {
  position: "absolute", width: "100%", height: "100%",
  background: "radial-gradient(circle at 50% 50%, #ffcc0020 0%, transparent 70%)",
  zIndex: 0, filter: "blur(50px)"
};

const branding = { position: "absolute", top: "50px", width: "100%", textAlign: "center", color: "#fff", zIndex: 1 };
const logo = { fontSize: "40px", fontWeight: "900", letterSpacing: "5px" };
const tagline = { fontSize: "14px", opacity: 0.7 };

const loginCard = {
  width: "350px", padding: "40px", background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(20px)", borderRadius: "25px", zIndex: 2, color: "#fff",
  border: "1px solid rgba(255,255,255,0.1)"
};

const loginTitle = { marginBottom: "25px", textAlign: "center" };
const label = { display: "block", marginBottom: "5px", fontSize: "14px" };
const input = {
  width: "100%", padding: "12px", borderRadius: "10px", border: "none",
  marginBottom: "15px", background: "rgba(255,255,255,0.1)", color: "#fff", boxSizing: "border-box"
};

const button = {
  width: "100%", padding: "12px", borderRadius: "10px", border: "none",
  background: "#ffcc00", color: "#000", fontWeight: "bold", cursor: "pointer"
};

const bioBtn = {
  background: "none", border: "1px solid #ffcc00", color: "#ffcc00",
  padding: "10px", borderRadius: "8px", cursor: "pointer", fontSize: "12px"
};

const bioBtnActive = {
  background: "rgba(255,204,0,0.1)", border: "1px solid #ffcc00", color: "#ffcc00",
  padding: "12px", borderRadius: "10px", cursor: "pointer", width: "100%", fontWeight: "bold"
};

const errorStyle = { color: "#ff4d4f", fontSize: "12px", textAlign: "center", marginBottom: "10px" };

export default Login;