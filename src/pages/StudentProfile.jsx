import React, { useState, useEffect } from "react";
import axios from "axios";

const StudentProfile = () => {
  const savedProfile = JSON.parse(localStorage.getItem("user")) || {}; // login user se studentCode ya id milegi
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

  // Fetch profile on mount
  useEffect(() => {
    if (profile.studentCode) {
      axios.get(`${API_URL}/api/student-profile/${profile.studentCode}`)
        .then(res => {
          if (res.data.success) setProfile(res.data.profile);
        })
        .catch(err => console.log(err));
    }
  }, [API_URL, profile.studentCode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProfile({ ...profile, photo: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/student-profile`, profile);
      if (res.data.success) alert(res.data.message);
      else alert("Error: " + res.data.message);
    } catch (err) {
      alert("Server error: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <h2 style={styles.heading}>Student Profile</h2>

      <div style={styles.photoContainer}>
        <img src={profile.photo || "https://via.placeholder.com/150"} alt="Profile" style={styles.photo} />
        <input type="file" onChange={handlePhotoUpload} style={styles.fileInput} />
      </div>

      <div style={styles.form}>
        {/* Name */}
        <label style={styles.label}>Name:</label>
        <input type="text" name="name" value={profile.name} onChange={handleChange} style={styles.input} placeholder="Enter your name" />

        {/* Class */}
        <label style={styles.label}>Class:</label>
        <input type="text" name="class" value={profile.class} onChange={handleChange} style={styles.input} placeholder="Enter your class" />

        {/* Email */}
        <label style={styles.label}>Email:</label>
        <input type="email" name="email" value={profile.email} onChange={handleChange} style={styles.input} placeholder="Enter your email" />

        {/* Gender */}
        <label style={styles.label}>Gender:</label>
        <select name="gender" value={profile.gender} onChange={handleChange} style={styles.input}>
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>

        {/* Category */}
        <label style={styles.label}>Category:</label>
        <select name="category" value={profile.category} onChange={handleChange} style={styles.input}>
          <option value="">Select Category</option>
          <option value="General">General</option>
          <option value="SC">SC</option>
          <option value="ST">ST</option>
          <option value="OBC">OBC</option>
        </select>

        {/* Family and other details */}
        <label style={styles.label}>Father's Name:</label>
        <input type="text" name="fatherName" value={profile.fatherName} onChange={handleChange} style={styles.input} />

        <label style={styles.label}>Mother's Name:</label>
        <input type="text" name="motherName" value={profile.motherName} onChange={handleChange} style={styles.input} />

        <label style={styles.label}>Brother's Name:</label>
        <input type="text" name="brotherName" value={profile.brotherName} onChange={handleChange} style={styles.input} />

        <label style={styles.label}>Sister's Name:</label>
        <input type="text" name="sisterName" value={profile.sisterName} onChange={handleChange} style={styles.input} />

        <label style={styles.label}>Mobile Number:</label>
        <input type="tel" name="mobile" value={profile.mobile} onChange={handleChange} style={styles.input} />

        <label style={styles.label}>Address:</label>
        <input type="text" name="address" value={profile.address} onChange={handleChange} style={styles.input} />

        <label style={styles.label}>City:</label>
        <input type="text" name="city" value={profile.city} onChange={handleChange} style={styles.input} />

        <label style={styles.label}>State:</label>
        <input type="text" name="state" value={profile.state} onChange={handleChange} style={styles.input} />

        <label style={styles.label}>Pincode:</label>
        <input type="text" name="pincode" value={profile.pincode} onChange={handleChange} style={styles.input} />

        <label style={styles.label}>Student Code:</label>
        <input type="text" name="studentCode" value={profile.studentCode} onChange={handleChange} style={styles.input} disabled />

        <button onClick={handleSave} style={styles.saveBtn} disabled={loading}>
          {loading ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
};

const styles = { page: { padding: "20px", maxWidth: "600px", margin: "0 auto", fontFamily: "Arial, sans-serif" },
  heading: { textAlign: "center", color: "#1f3c88", marginBottom: "20px" },
  photoContainer: { display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "20px" },
  photo: { width: "150px", height: "150px", borderRadius: "50%", objectFit: "cover", marginBottom: "10px", border: "2px solid #1f3c88" },
  fileInput: { cursor: "pointer" },
  form: { display: "flex", flexDirection: "column", gap: "15px" },
  label: { fontWeight: "600" },
  input: { padding: "10px", borderRadius: "8px", border: "1px solid #ccc", fontSize: "16px" },
  saveBtn: { padding: "12px", backgroundColor: "#1f3c88", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "16px", marginTop: "10px" },};

export default StudentProfile;
