import React, { useState, useEffect } from "react";
import axios from "axios";

const StudentProfile = () => {
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const savedUser = JSON.parse(localStorage.getItem("user"));
  const id = savedUser?.id;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setError("No user ID found in localStorage. Please login first!");
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await axios.post(`${API_URL}/api/student-profile/get`, { id });

        if (res.data.success && res.data.profile) {
          setProfile(res.data.profile);
        } else {
          setError(res.data.message || "Profile not found");
        }
      } catch (err) {
        setError("Error fetching profile: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id, API_URL]);

  if (loading) return <p style={{ textAlign: "center" }}>Loading profile...</p>;
  if (error) return <p style={{ textAlign: "center", color: "red", fontWeight: "bold" }}>{error}</p>;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 20 }}>
      <h2 style={{ textAlign: "center", color: "#1f3c88", marginBottom: 20 }}>My Profile</h2>

      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <img
          src={profile.photo || "/images/profile.png"}
          alt="Profile"
          style={{ width: 130, height: 130, borderRadius: "50%", objectFit: "cover", border: "2px solid #1f3c88" }}
        />
      </div>

      <div>
        {Object.entries(profile).map(([key, value]) => (
          <div
            key={key}
            style={{
              marginBottom: 12,
              padding: 10,
              background: "#f1f5ff",
              borderRadius: 8,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <strong style={{ textTransform: "capitalize" }}>{key.replace(/_/g, " ")}:</strong>
            <span>{value || "-"}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentProfile;
