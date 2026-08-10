import React, { useEffect, useState } from "react";
import api from "../services/api";
import "../App.css";

export default function Bannedform() {
  

  const classes = [
    "L.K.G", "U.K.G", "1st", "2nd", "3rd", "4th",
    "5th", "6th", "7th", "8th", "9th", "10th",
    "11th", "12th"
  ];

  const [allStudents, setAllStudents] = useState([]);
  const [students, setStudents] = useState([]);
  const [bannedStudents, setBannedStudents] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    class: "",
    reason: ""
  });

  // Helper function to get authorization headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      },
    };
  };

  useEffect(() => {
    fetchStudents();
    fetchBannedStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await api.get(`/api/students`, getAuthHeaders());
      console.log("Students API Response:", res.data);
      
      const studentData = Array.isArray(res.data) 
        ? res.data 
        : (res.data.students || res.data.data || []);
        
      setAllStudents(studentData);
    } catch (err) {
      console.log("Error fetching students:", err);
      showNotification("Failed to load students list", "error");
    }
  };

  const fetchBannedStudents = async () => {
    try {
      const res = await api.get(`/api/auth/banned-students`, getAuthHeaders());
      console.log("Banned Students API Response:", res.data);

      const bannedData = Array.isArray(res.data) 
        ? res.data 
        : (res.data.students || res.data.data || []);

      setBannedStudents(bannedData);
    } catch (err) {
      console.log("Error fetching banned students:", err);
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
      const filtered = allStudents.filter(s => {
        const studentClass = String(s.class || s.className || "").trim().toLowerCase();
        const selectedClass = String(value).trim().toLowerCase();
        return studentClass === selectedClass;
      });

      setStudents(filtered);
      setFormData({
        class: value,
        id: "",
        name: "",
        reason: ""
      });
    } else if (name === "id") {
      const student = students.find(s => String(s.id || s._id) === String(value));
      setFormData(prev => ({
        ...prev,
        id: value,
        name: student ? (student.name || student.studentName) : ""
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
      const res = await api.post(
        `/api/auth/ban`, 
        {
          studentId: formData.id,
          name: formData.name,
          className: formData.class,
          reason: formData.reason
        },
        getAuthHeaders()
      );

      if (res.data.success || res.status === 200) {
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
      console.log("Ban error:", err);
      showNotification(err.response?.data?.message || "Failed to suspend student", "error");
    }
  };

  const handleUnban = async (student) => {
    try {
      const res = await api.post(
        `/api/auth/unban`, 
        {
          studentId: student.id || student._id,
          name: student.name,
          className: student.class || student.className
        },
        getAuthHeaders()
      );

      if (res.data.success || res.status === 200) {
        showNotification("Student reinstated successfully", "success");
        fetchBannedStudents();
      }
    } catch (err) {
      console.log("Unban error:", err);
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
                {students.map(s => {
                  const sId = s.id || s._id;
                  const sName = s.name || s.studentName;
                  return (
                    <option key={sId} value={sId}>{sName}</option>
                  );
                })}
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
            <p style={{fontSize:'20px', marginTop:'12px'}}> You can copy the reason : Your Account suspended by Tuition teacher. Contact him.</p>
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
              bannedStudents.map((student, idx) => (
                <div key={student.id || student._id || idx} className="banned-student-item">
                  <div className="student-info">
                    <h3>{student.name}</h3>
                    <div className="student-meta">
                      <span className="class-badge">Class: {student.class || student.className}</span>
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