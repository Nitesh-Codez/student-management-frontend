import React, { useState } from "react";
import axios from "axios";
import { FaUserPlus, FaCamera } from "react-icons/fa";

const AddTeacher = () => {
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    teacher_code: "",
    name: "",
    gender: "",
    dob: "",
    phone: "",
    email: "",
    address: "",
    qualification: "",
    experience_years: "",
    salary: "",
    joining_date: ""
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      
      // Saare fields append karein
      Object.keys(form).forEach(key => {
        // Empty strings ko null ki tarah treat karne ke liye handle karein
        if (form[key] !== "") {
          formData.append(key, form[key]);
        }
      });

      if (photo) {
        formData.append("photo", photo);
      }

      const response = await axios.post(
        "https://student-management-system-4-hose.onrender.com/api/teachers/add",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (response.data.success) {
        alert("Teacher Profile Created! ✅");
        // Form reset
        setForm({
          teacher_code: "", name: "", gender: "", dob: "", phone: "",
          email: "", address: "", qualification: "", experience_years: "",
          salary: "", joining_date: ""
        });
        setPhoto(null);
      }
    } catch (err) {
      console.error(err.response?.data || err);
      alert("Failed to add teacher: " + (err.response?.data?.message || "Server Error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={container}>
      <div style={header}>
        <FaUserPlus size={24} color="#f97316" />
        <h2 style={{ margin: 0, color: '#1e293b' }}>Add New Teacher</h2>
      </div>

      <form onSubmit={handleSubmit} style={formGrid}>
        <div style={inputGroup}>
          <label style={label}>Teacher Code *</label>
          <input name="teacher_code" value={form.teacher_code} onChange={handleChange} style={input} required placeholder="TCH-001" />
        </div>

        <div style={inputGroup}>
          <label style={label}>Full Name *</label>
          <input name="name" value={form.name} onChange={handleChange} style={input} required placeholder="John Doe" />
        </div>

        <div style={inputGroup}>
          <label style={label}>Gender</label>
          <select name="gender" value={form.gender} onChange={handleChange} style={input}>
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div style={inputGroup}>
          <label style={label}>Date of Birth</label>
          <input type="date" name="dob" value={form.dob} onChange={handleChange} style={input} />
        </div>

        <div style={inputGroup}>
          <label style={label}>Phone Number</label>
          <input name="phone" value={form.phone} onChange={handleChange} style={input} placeholder="+91..." />
        </div>

        <div style={inputGroup}>
          <label style={label}>Email Address</label>
          <input type="email" name="email" value={form.email} onChange={handleChange} style={input} placeholder="teacher@school.com" />
        </div>

        <div style={inputGroup}>
          <label style={label}>Qualification</label>
          <input name="qualification" value={form.qualification} onChange={handleChange} style={input} placeholder="M.Sc, B.Ed" />
        </div>

        <div style={inputGroup}>
          <label style={label}>Salary (Monthly)</label>
          <input type="number" name="salary" value={form.salary} onChange={handleChange} style={input} placeholder="50000" />
        </div>

        <div style={{...inputGroup, gridColumn: 'span 2'}}>
          <label style={label}>Address</label>
          <textarea name="address" value={form.address} onChange={handleChange} style={{...input, height: '60px'}} placeholder="Full Address..." />
        </div>

        <div style={inputGroup}>
          <label style={label}>Profile Photo</label>
          <div style={fileInputContainer}>
            <FaCamera style={{marginRight: '10px'}} />
            <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files[0])} />
          </div>
        </div>

        <div style={{...inputGroup, display: 'flex', alignItems: 'flex-end'}}>
          <button type="submit" disabled={loading} style={submitBtn}>
            {loading ? "Saving..." : "Create Teacher Profile"}
          </button>
        </div>
      </form>
    </div>
  );
};

// Styles
const container = { padding: '20px', background: '#fff', borderRadius: '15px' };
const header = { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '30px', borderBottom: '2px solid #f8fafc', paddingBottom: '15px' };
const formGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' };
const inputGroup = { display: 'flex', flexDirection: 'column', gap: '5px' };
const label = { fontSize: '13px', fontWeight: '600', color: '#64748b' };
const input = { padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px' };
const fileInputContainer = { padding: '8px', border: '1px dashed #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', background: '#f8fafc' };
const submitBtn = { width: '100%', padding: '12px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', transition: '0.3s' };

export default AddTeacher;