import React, { useEffect, useState } from "react";
import axios from "axios";
import "../App.css";

export default function Bannedform() {
  const API_URL =
    process.env.REACT_APP_API_URL ||
    "https://student-management-system-4-hose.onrender.com";

  const classes = [
    "L.K.G", "U.K.G", "1st", "2nd", "3rd", "4th",
    "5th", "6th", "7th", "8th", "9th", "10th",
    "11th", "12th"
  ];

  const [allStudents, setAllStudents] = useState([]);
  const [students, setStudents] = useState([]);
  const [bannedStudents, setBannedStudents] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success"); // 'success' or 'error'

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    class: "",
    reason: ""
  });

  useEffect(() => {
    fetchStudents();
    fetchBannedStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/students`);
      if (res.data.success) {
        setAllStudents(res.data.students);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const fetchBannedStudents = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/auth/banned-students`);
      if (res.data.success) {
        setBannedStudents(res.data.students);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const showNotification = (msg, type = "success") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage("");
    }, 4000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "class") {
      const filtered = allStudents.filter(s => s.class === value);
      setStudents(filtered);
      setFormData({
        class: value,
        id: "",
        name: "",
        reason: ""
      });
    } else if (name === "id") {
      const student = students.find(s => String(s.id) === value);
      setFormData(prev => ({
        ...prev,
        id: value,
        name: student ? student.name : ""
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleBan = async (e) => {
    e.preventDefault();
    if (!formData.class || !formData.id || !formData.reason) {
      showNotification("Please fill in all required fields", "error");
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/api/auth/ban`, {
        name: formData.name,
        className: formData.class,
        reason: formData.reason
      });

      if (res.data.success) {
        showNotification("Student suspended successfully", "success");
        setFormData({
          id: "",
          name: "",
          class: "",
          reason: ""
        });
        setStudents([]);
        fetchBannedStudents();
      }
    } catch (err) {
      console.log(err);
      showNotification("Failed to suspend student", "error");
    }
  };

  const handleUnban = async (student) => {
    try {
      const res = await axios.post(`${API_URL}/api/auth/unban`, {
        name: student.name,
        className: student.class
      });

      if (res.data.success) {
        showNotification("Student reinstated successfully", "success");
        fetchBannedStudents();
      }
    } catch (err) {
      console.log(err);
      showNotification("Failed to unban student", "error");
    }
  };

  return (
    <div className="banned-dashboard">
      <div className="banned-header-card">
        <h1>🚫 Student Suspension Portal</h1>
        <p>Manage and review restricted student access securely.</p>
      </div>

      {message && (
        <div className={`banned-alert ${messageType}`}>
          <span>{messageType === "success" ? "✨" : "⚠️"}</span> {message}
        </div>
      )}

      <div className="banned-content-grid">
        {/* Form Section */}
        <div className="banned-card form-card">
          <h2>Suspend Student</h2>
          <form onSubmit={handleBan} className="banned-form">
            <div className="input-group">
              <label>Select Class</label>
              <select name="class" value={formData.class} onChange={handleChange} required>
                <option value="">-- Choose Class --</option>
                {classes.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>Select Student</label>
              <select name="id" value={formData.id} onChange={handleChange} required disabled={!formData.class}>
                <option value="">-- Choose Student --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="input-group">
                <label>Student ID</label>
                <input value={formData.id} readOnly placeholder="Auto ID" />
              </div>
              <div className="input-group">
                <label>Student Name</label>
                <input value={formData.name} readOnly placeholder="Auto Name" />
              </div>
            </div>

            <div className="input-group">
              <label>Suspension Reason</label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                placeholder="Enter detailed reason for suspension..."
                rows="3"
                required
              />
            </div>

            <button type="submit" className="btn-suspend">
              Suspend Student Access
            </button>
            <p style={{fontSize:'25px'}}> You can copy the reason : Your Account suspended by Tuition teacher. Contact him.</p>
          </form>
        </div>

        {/* Banned List Section */}
        <div className="banned-card list-card">
          <div className="list-header">
            <h2>🚨 Currently Suspended</h2>
            <span className="badge-count">{bannedStudents.length}</span>
          </div>

          <div className="banned-list-scroll">
            {bannedStudents.length === 0 ? (
              <div className="no-banned">
                <p>No students currently suspended. All clear! 🎉</p>
              </div>
            ) : (
              bannedStudents.map(student => (
                <div key={student.id || student.name} className="banned-student-item">
                  <div className="student-info">
                    <h3>{student.name}</h3>
                    <div className="student-meta">
                      <span className="class-badge">Class: {student.class}</span>
                    </div>
                    <p className="ban-reason">
                      <strong>Reason:</strong> {student.ban_reason || student.reason}
                    </p>
                  </div>
                  <button onClick={() => handleUnban(student)} className="btn-unban">
                    Restore Access
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}