import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaIdCard, FaUserAlt, FaPhone, FaHome, FaUserTie } from "react-icons/fa";

const API_URL = "https://student-management-system-4-hose.onrender.com";

const StudentProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // 1️⃣ Get user from localStorage
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
      setError("User not logged in");
      setLoading(false);
      return;
    }

    // 2️⃣ Fetch profile from backend
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/students/profile?id=${user.id}`);
        if (res.data.success) {
          setProfile(res.data.student);
        } else {
          setError(res.data.message || "Student not found");
        }
      } catch (err) {
        console.error(err);
        setError("Server error while fetching profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) return <p>Loading profile...</p>;
  if (error) return <p style={{ color: "red", textAlign: "center" }}>{error}</p>;

  return (
    <div style={profileContainer}>
      <img
        src={profile.profile_photo || "/default-profile.png"}
        alt="Profile"
        style={profilePhoto}
      />
      <h2>{profile.name}</h2>

      <div style={infoRow}><FaIdCard /> <span>ID: {profile.id}</span></div>
      <div style={infoRow}><FaUserAlt /> <span>Class: {profile.class}</span></div>
      <div style={infoRow}><FaUserTie /> <span>Role: {profile.role}</span></div>
      <div style={infoRow}><FaPhone /> <span>Mobile: {profile.mobile || "N/A"}</span></div>
      <div style={infoRow}><FaHome /> <span>Address: {profile.address || "N/A"}</span></div>
    </div>
  );
};

// --- STYLES ---
const profileContainer = {
  maxWidth: "500px",
  margin: "30px auto",
  padding: "25px",
  background: "#fff",
  borderRadius: "15px",
  boxShadow: "0 5px 25px rgba(0,0,0,0.1)",
  textAlign: "center",
  fontFamily: "'Inter', sans-serif"
};

const profilePhoto = {
  width: "130px",
  height: "130px",
  borderRadius: "50%",
  objectFit: "cover",
  marginBottom: "15px",
  border: "3px solid #6366f1"
};

const infoRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
  margin: "10px 0",
  fontSize: "16px",
  color: "#1e293b"
};

export default StudentProfile;
