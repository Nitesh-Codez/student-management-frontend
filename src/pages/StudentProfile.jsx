import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "https://student-management-system-4-hose.onrender.com";

const StudentProfile = () => {
  const [profile, setProfile] = useState({});
  const [locked, setLocked] = useState({}); // 🔐 saved fields
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
      setError("User not logged in");
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await axios.get(
          `${API_URL}/api/students/profile?id=${user.id}`
        );
        if (res.data.success) {
          setProfile(res.data.student);

          // 🔒 lock fields which already have value
          const initialLocks = {};
          Object.keys(res.data.student).forEach((key) => {
            if (
              res.data.student[key] !== null &&
              res.data.student[key] !== ""
            ) {
              initialLocks[key] = true;
            }
          });
          setLocked(initialLocks);
        } else {
          setError(res.data.message);
        }
      } catch {
        setError("Error fetching profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSuccess("");
      setError("");

      await axios.put(
        `${API_URL}/api/students/update/${profile.id}`,
        profile
      );

      // 🔒 lock only filled fields AFTER save
      const newLocks = { ...locked };
      Object.keys(profile).forEach((key) => {
        if (profile[key] !== null && profile[key] !== "") {
          newLocks[key] = true;
        }
      });
      setLocked(newLocks);

      setSuccess("Profile updated successfully ✅");
    } catch {
      setError("Error saving profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div style={container}>
      <h2>Student Profile</h2>

      <img
        src={profile.profile_photo || "/default-profile.png"}
        alt="Profile"
        style={photo}
      />

      {/* FIXED FIELDS */}
      <Input label="Name" value={profile.name} disabled />
      <Input label="Class" value={profile.class} disabled />
      <Input label="Role" value={profile.role} disabled />
      <Input label="Mobile" value={profile.mobile} disabled />

      {/* EDITABLE UNTIL SAVE */}
      <Input
        label="Student Code"
        name="code"
        value={profile.code || ""}
        disabled={locked.code}
        onChange={handleChange}
      />

      <Input
        label="Address"
        name="address"
        value={profile.address || ""}
        disabled={locked.address}
        onChange={handleChange}
      />

      <Input
        label="Father Name"
        name="father_name"
        value={profile.father_name || ""}
        disabled={locked.father_name}
        onChange={handleChange}
      />

      <Input
        label="Mother Name"
        name="mother_name"
        value={profile.mother_name || ""}
        disabled={locked.mother_name}
        onChange={handleChange}
      />

      <Input
        label="Gender"
        name="gender"
        value={profile.gender || ""}
        disabled={locked.gender}
        onChange={handleChange}
      />

      <Input
  label="DOB"
  name="dob"
  type="date"
  value={profile.dob ? profile.dob.split("T")[0] : ""}
  disabled={locked.dob}
  onChange={handleChange}
/>


      <Input
        label="Email"
        name="email"
        value={profile.email || ""}
        disabled={locked.email}
        onChange={handleChange}
      />

      <Input
        label="City"
        name="city"
        value={profile.city || ""}
        disabled={locked.city}
        onChange={handleChange}
      />

      <Input
        label="State"
        name="state"
        value={profile.state || ""}
        disabled={locked.state}
        onChange={handleChange}
      />

      <Input
        label="Pincode"
        name="pincode"
        value={profile.pincode || ""}
        disabled={locked.pincode}
        onChange={handleChange}
      />

      <button onClick={handleSave} disabled={saving} style={btn}>
        {saving ? "Saving..." : "Save Profile"}
      </button>

      {success && <p style={{ color: "green" }}>{success}</p>}
    </div>
  );
};

const Input = ({ label, ...props }) => (
  <div style={{ marginBottom: "10px", textAlign: "left" }}>
    <label>{label}</label>
    <input
      {...props}
      style={{
        width: "100%",
        padding: "8px",
        borderRadius: "6px",
        border: "1px solid #ccc",
        background: props.disabled ? "#f1f5f9" : "#fff",
      }}
    />
  </div>
);

const container = {
  maxWidth: "520px",
  margin: "30px auto",
  padding: "20px",
  background: "#fff",
  borderRadius: "12px",
};

const photo = {
  width: "120px",
  height: "120px",
  borderRadius: "50%",
  margin: "10px auto 20px",
  display: "block",
};

const btn = {
  width: "100%",
  padding: "10px",
  background: "#4f46e5",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
};

export default StudentProfile;
