import React, { useEffect, useState } from "react";
import axios from "axios";

const StudentProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;

    const id = user.id;

    const fetchData = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/student-profile/${id}`);
        setProfile(data.student);
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [API_URL]); // <-- ESLint warning fix

  if (loading) return <h2 style={{ textAlign: "center" }}>Loading Profile...</h2>;
  if (!profile) return <h2 style={{ textAlign: "center" }}>No profile found</h2>;

  return (
    <div style={container}>
      <div style={card}>
        <h2 style={title}>Student Profile</h2>

        <div style={item}>
          <strong>Name:</strong> {profile.name}
        </div>

        <div style={item}>
          <strong>Father Name:</strong> {profile.fatherName}
        </div>

        <div style={item}>
          <strong>Class:</strong> {profile.class}
        </div>

        <div style={item}>
          <strong>Phone:</strong> {profile.phone}
        </div>

        <div style={item}>
          <strong>Address:</strong> {profile.address}
        </div>

        <div style={item}>
          <strong>Fees Paid This Month:</strong>{" "}
          {profile.feesPaid === 1 ? "Yes" : "No"}
        </div>

        <div style={item}>
          <strong>Roll No:</strong> {profile.rollNo}
        </div>

        <div style={item}>
          <strong>Join Date:</strong> {profile.joinDate?.split("T")[0]}
        </div>
      </div>
    </div>
  );
};

// ---------------- Styles ----------------

const container = {
  display: "flex",
  justifyContent: "center",
  marginTop: "40px",
  padding: "20px",
};

const card = {
  width: "100%",
  maxWidth: "500px",
  background: "#ffffff",
  padding: "25px",
  borderRadius: "12px",
  boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
};

const title = {
  textAlign: "center",
  marginBottom: "20px",
  fontSize: "26px",
  fontWeight: "700",
  color: "#222",
};

const item = {
  marginBottom: "12px",
  fontSize: "18px",
  borderBottom: "1px solid #ddd",
  paddingBottom: "8px",
};

export default StudentProfile;
