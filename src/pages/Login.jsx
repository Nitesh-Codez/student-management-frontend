import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  // Check if device supports Biometrics on mount
  useEffect(() => {
    if (window.PublicKeyCredential) {
      setIsBiometricAvailable(true);
    }
  }, []);

  // --- 1. SETUP BIOMETRIC (Login ke baad call hoga) ---
  const handleSetupBiometric = async (user) => {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const createCredentialOptions = {
        publicKey: {
          challenge,
          rp: { name: "SMARTZONE Academy" },
          user: {
            id: Uint8Array.from(user.id, (c) => c.charCodeAt(0)),
            name: user.name,
            displayName: user.name,
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }], // ES256
          authenticatorSelection: { authenticatorAttachment: "platform" }, // Fingerprint/FaceID
          timeout: 60000,
        },
      };

      const credential = await navigator.credentials.create(createCredentialOptions);
      
      if (credential) {
        // Save flag in localStorage that this user has biometric enabled
        localStorage.setItem(`biometric_enabled_${user.name}`, "true");
        alert("Biometric Lock Set Successfully! 🔐");
      }
    } catch (err) {
      console.error("Biometric Setup Failed", err);
    }
  };

  // --- 2. LOGIN WITH BIOMETRIC (Button click par) ---
  const handleBiometricLogin = async () => {
    const savedUser = localStorage.getItem("studentName");
    if (!savedUser) {
      setError("Please login with password once to enable Biometrics.");
      return;
    }

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const getCredentialOptions = {
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: "required",
        },
      };

      const assertion = await navigator.credentials.get(getCredentialOptions);
      if (assertion) {
        // Automatically fetch user data from local (In real apps, verify with server)
        const user = JSON.parse(localStorage.getItem("user"));
        navigate(user.role === "admin" ? "/admin" : "/student");
      }
    } catch (err) {
      setError("Fingerprint verification failed.");
    }
  };

  // --- 3. STANDARD LOGIN ---
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

        // BIOMETRIC PROMPT
        const hasBiometric = localStorage.getItem(`biometric_enabled_${user.name}`);
        if (!hasBiometric && window.PublicKeyCredential) {
          const ask = window.confirm("Do you want to enable Fingerprint Login for next time?");
          if (ask) {
            await handleSetupBiometric(user);
          }
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
    <div style={page}>
      <div style={backgroundShapes}></div>

      <div style={branding}>
        <h1 style={logo}>𝐒MARTZØηE</h1>
        <p style={tagline}>Empowering Students | Inspiring Excellence</p>
      </div>

      <div style={loginCard}>
        <h2 style={loginTitle}>Secure Access</h2>

        {error && <p style={errorStyle}>{error}</p>}

        <form onSubmit={handleLogin}>
          <label style={label}>Student Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={input}
            required
            placeholder="Enter full name"
          />

          <label style={label}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={input}
            required
            placeholder="••••••••"
          />

          <button type="submit" style={button} disabled={loading}>
            {loading ? "Verifying..." : "Login"}
          </button>
        </form>

        {/* BIOMETRIC BUTTON SECTION */}
        {isBiometricAvailable && localStorage.getItem(`biometric_enabled_${name || localStorage.getItem("studentName")}`) && (
          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <p style={{ fontSize: "12px", color: "#aaa", marginBottom: "10px" }}>OR LOGIN WITH</p>
            <button 
              onClick={handleBiometricLogin}
              style={biometricButtonStyle}
            >
              <span style={{ fontSize: "24px" }}>☝️</span> Use Fingerprint
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ------------------ EXTENDED STYLES --------------------

const page = {
  minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center",
  background: "linear-gradient(135deg, #0f0f0f, #1a1a1a)", position: "relative",
  fontFamily: "'Segoe UI', sans-serif", overflow: "hidden",
};

const backgroundShapes = {
  position: "absolute", width: "150%", height: "150%", top: "-25%", left: "-25%",
  background: "radial-gradient(circle at 25% 25%, #ffcc0040 0%, transparent 60%)",
  zIndex: 0, transform: "rotate(25deg)", filter: "blur(80px)",
};

const branding = { position: "absolute", top: "40px", width: "100%", textAlign: "center", color: "#fff", zIndex: 1 };
const logo = { fontSize: "8vw", fontWeight: "900", letterSpacing: "0.15em", textShadow: "0 0 20px rgba(255,204,0,0.4)" };
const tagline = { fontSize: "3vw", marginTop: "10px", opacity: 0.8 };

const loginCard = {
  width: "90%", maxWidth: "420px", padding: "40px", background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(30px)", borderRadius: "30px", border: "1px solid rgba(255,255,255,0.1)",
  boxShadow: "0 25px 50px rgba(0,0,0,0.6)", zIndex: 2, marginTop: "180px", color: "#fff"
};

const loginTitle = { marginBottom: "30px", fontWeight: "800", textAlign: "center", fontSize: "32px", letterSpacing: "-1px" };
const label = { display: "block", marginBottom: "8px", fontSize: "14px", color: "#ccc" };
const input = {
  width: "100%", padding: "16px", borderRadius: "15px", border: "1px solid rgba(255,255,255,0.1)",
  marginBottom: "20px", fontSize: "16px", background: "rgba(0,0,0,0.2)", color: "#fff", outline: "none", boxSizing: "border-box"
};

const button = {
  width: "100%", padding: "16px", borderRadius: "15px", border: "none",
  background: "linear-gradient(90deg, #ffcc00, #f39c12)", color: "#000",
  fontSize: "18px", fontWeight: "800", cursor: "pointer", transition: "transform 0.2s"
};

const biometricButtonStyle = {
  width: "100%", padding: "12px", borderRadius: "15px", border: "1px solid #ffcc00",
  background: "transparent", color: "#ffcc00", fontSize: "15px", fontWeight: "600",
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px"
};

const errorStyle = { color: "#ff4d4f", marginBottom: "15px", textAlign: "center", background: "rgba(255,77,79,0.1)", padding: "10px", borderRadius: "10px" };

export default Login;