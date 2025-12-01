import React, { useState, useEffect } from "react";
import axios from "axios";

const StudentProfile = () => {
  const savedPassword = JSON.parse(localStorage.getItem("user"))?.password || "";
  const API_URL = process.env.REACT_APP_API_URL;

  const [password, setPassword] = useState(savedPassword);
  const [profile, setProfile] = useState({
    name: "",
    class: "",
    role: "student",
    mobile: "",
    address: "",
    photo: "",
    gender: "",
    category: "",
    dob: "",
    fatherName: "",
    motherName: "",
    brotherName: "",
    sisterName: "",
    tuition: "",
  });
  const [loading, setLoading] = useState(false);

  // Fetch profile using password
  useEffect(() => {
    if (!password) return;

    axios
      .post(`${API_URL}/api/student-profile/get`, { password })
      .then((res) => {
        if (res.data.success) {
          setProfile(res.data.profile);
        }
      })
      .catch((err) => console.error("Error fetching profile:", err.message));
  }, [API_URL, password]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => setProfile({ ...profile, photo: event.target.result });
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!password) {
      alert("Password is required to save profile.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/student-profile/save`, { ...profile, password });
      if (res.data.success) {
        alert(`✅ ${res.data.message}`);
        setProfile(res.data.profile || profile);
        localStorage.setItem("user", JSON.stringify({ password }));
      } else {
        alert(`❌ ${res.data.message}`);
      }
    } catch (err) {
      alert(`❌ Server error: ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <h2 style={styles.heading}>My Profile</h2>

      <div style={styles.passwordContainer}>
        <label>Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          placeholder="Enter your password"
        />
      </div>

      <div style={styles.photoContainer}>
        <img
          src={profile.photo || "/images/profile.png"}
          alt="Profile"
          style={styles.photo}
        />
        <input type="file" onChange={handlePhotoUpload} style={styles.fileInput} />
      </div>

      <div style={styles.form}>
        {Object.entries(profile).map(([key, value]) => (
          <div key={key}>
            <label style={styles.label}>{key.charAt(0).toUpperCase() + key.slice(1)}:</label>
            <input
              type="text"
              name={key}
              value={value || ""}
              onChange={handleChange}
              style={styles.input}
            />
          </div>
        ))}

        <button onClick={handleSave} style={styles.saveBtn} disabled={loading}>
          {loading ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
};

const styles = {
  page: { padding: "20px", maxWidth: "600px", margin: "0 auto", fontFamily: "Arial, sans-serif" },
  heading: { textAlign: "center", color: "#1f3c88", marginBottom: "20px" },
  passwordContainer: { marginBottom: "20px" },
  photoContainer: { display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "20px" },
  photo: { width: "150px", height: "150px", borderRadius: "50%", objectFit: "cover", marginBottom: "10px", border: "2px solid #1f3c88" },
  fileInput: { cursor: "pointer" },
  form: { display: "flex", flexDirection: "column", gap: "15px" },
  label: { fontWeight: "600" },
  input: { padding: "10px", borderRadius: "8px", border: "1px solid #ccc", fontSize: "16px", width: "100%" },
  saveBtn: { padding: "12px", backgroundColor: "#1f3c88", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "16px", marginTop: "10px" },
};

export default StudentProfile;
