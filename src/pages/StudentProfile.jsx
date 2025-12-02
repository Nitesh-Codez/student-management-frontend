import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const StudentProfile = () => {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const studentId = localStorage.getItem("studentId"); // ID saved during login
    if (!studentId) {
      setError("Student not logged in");
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await axios.post(`${API_URL}/api/student-profile/get`, { id: studentId });
        setProfile(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || "Something went wrong");
      }
    };

    fetchProfile();
  }, []);

  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!profile) return <p>Loading...</p>;

  return (
    <div style={{ padding: "20px", maxWidth: "500px", margin: "auto" }}>
      <h2>Student Profile</h2>
      <div style={{ marginTop: "20px", border: "1px solid #ccc", padding: "15px" }}>
        <p><strong>ID:</strong> {profile.id}</p>
        <p><strong>Name:</strong> {profile.name}</p>
        <p><strong>Class:</strong> {profile.class}</p>
        <p><strong>Role:</strong> {profile.role}</p>
        <p><strong>Mobile:</strong> {profile.mobile}</p>
        <p><strong>Address:</strong> {profile.address}</p>
        <p><strong>Gender:</strong> {profile.gender}</p>
        <p><strong>Category:</strong> {profile.category}</p>
        <p><strong>DOB:</strong> {profile.dob}</p>
        <p><strong>Father:</strong> {profile.fatherName}</p>
        <p><strong>Mother:</strong> {profile.motherName}</p>
        <p><strong>Brother:</strong> {profile.brotherName}</p>
        <p><strong>Sister:</strong> {profile.sisterName}</p>
        <p><strong>Tuition:</strong> {profile.tuition}</p>
      </div>
    </div>
  );
};

export default StudentProfile;
