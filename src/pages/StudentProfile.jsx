import React, { useState, useEffect } from "react";
import axios from "axios";

const StudentProfile = () => {
  const savedProfile = JSON.parse(localStorage.getItem("user")) || {};
  const API_URL = process.env.REACT_APP_API_URL;

  const [profile, setProfile] = useState({
    name: "",
    class: "",
    email: "",
    photo: "",
    gender: "",
    category: "",
    dob: "",
    fatherName: "",
    motherName: "",
    brotherName: "",
    sisterName: "",
    tuition: "",
    mobile: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    studentCode: savedProfile.studentCode || "",
    aatu: "",
    extraNotes: "",
  });

  const [loading, setLoading] = useState(false);

  // Fetch student profile on mount
  useEffect(() => {
    if (!profile.studentCode) return;

    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/student-profile/${profile.studentCode}`);
        if (res.data.success) setProfile(res.data.profile);
      } catch (err) {
        console.error("Error fetching profile:", err.message);
      }
    };

    fetchProfile();
  }, [API_URL, profile.studentCode]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
  };

  // Handle photo upload with compression
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 500;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7); // 70% quality
        setProfile({ ...profile, photo: compressedDataUrl });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Handle save profile
  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/student-profile`, profile);
      alert(res.data.success ? res.data.message : "Error: " + res.data.message);
    } catch (err) {
      alert("Server error: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <h2 style={styles.heading}>My Profile</h2>

      <div style={styles.photoContainer}>
        <img
          src={profile.photo || "/images/profile.png"} // fallback image
          alt="Profile"
          style={styles.photo}
        />
        <input type="file" onChange={handlePhotoUpload} style={styles.fileInput} />
      </div>

      <div style={styles.form}>
        {Object.entries(profile).map(([key, value]) => {
          if (key === "photo") return null; // already handled
          return (
            <div key={key}>
              <label style={styles.label}>{key.charAt(0).toUpperCase() + key.slice(1)}:</label>
              <input
                type="text"
                name={key}
                value={value}
                onChange={handleChange}
                style={styles.input}
                // studentCode readonly
              />
            </div>
          );
        })}

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
  photoContainer: { display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "20px" },
  photo: { width: "150px", height: "150px", borderRadius: "50%", objectFit: "cover", marginBottom: "10px", border: "2px solid #1f3c88" },
  fileInput: { cursor: "pointer" },
  form: { display: "flex", flexDirection: "column", gap: "15px" },
  label: { fontWeight: "600" },
  input: { padding: "10px", borderRadius: "8px", border: "1px solid #ccc", fontSize: "16px", width: "100%" },
  saveBtn: { padding: "12px", backgroundColor: "#1f3c88", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "16px", marginTop: "10px" },
};

export default StudentProfile;
