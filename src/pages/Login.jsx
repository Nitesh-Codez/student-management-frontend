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
      const res = await axios.post(`${API_URL}/api/auth/login`, {
        name,
        password,
      });

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
      {/* Left Branding Section */}
      <div style={leftBox}>
        <h1 style={instituteName}>Smart Students Classes</h1>
        <p style={tagline}>Be the best version of yourself</p>
      </div>

      {/* Right Login Card */}
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
/* ---------------- RESPONSIVE STYLES ---------------- */

const page = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "20px",
  background: "linear-gradient(135deg, #dfe9f3 0%, #ffffff 100%)",
  flexWrap: "wrap", // mobile = stack
};

const leftBox = {
  width: "40%",
  paddingRight: "50px",
  textAlign: "right",
  minWidth: "280px",   // ensures mobile support
  marginBottom: "20px",
};

const instituteName = {
  fontSize: "32px",
  fontWeight: "700",
  marginBottom: "10px",
  color: "#003366",
};

const tagline = {
  fontSize: "18px",
  color: "#444",
  fontStyle: "italic",
  fontWeight: "500",
};

const loginCard = {
  width: "350px",
  padding: "35px",
  background: "white",
  borderRadius: "12px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
};

const loginTitle = {
  marginBottom: "20px",
  fontWeight: "600",
  textAlign: "center",
  fontSize: "22px",
  color: "#003366",
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
  background: "#003366",
  color: "white",
  fontSize: "17px",
  cursor: "pointer",
  transition: "0.3s",
};

const errorStyle = {
  color: "red",
  marginBottom: "10px",
  textAlign: "center",
};

export default Login;
