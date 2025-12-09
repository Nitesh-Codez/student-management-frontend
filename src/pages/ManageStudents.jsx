import React, { useEffect, useState } from "react";
import axios from "axios";

// Backend API URL
const API_URL = process.env.REACT_APP_API_URL + "/api/students";

const ManageStudents = () => {
  const [students, setStudents] = useState([]);
  const [name, setName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [mobile, setMobile] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Fetch all students
  const fetchStudents = async () => {
    try {
      const res = await axios.get(API_URL);
      if (res.data.success) setStudents(res.data.students);
      else setErrorMsg(res.data.message);
    } catch {
      setErrorMsg("Server error while fetching students");
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Add student
  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!name || !studentClass || !password)
      return alert("Name, class and password are required!");

    try {
      const res = await axios.post(API_URL, {
        name,
        class: studentClass,
        password,
        address,
        mobile,
      });

      if (res.data.success) {
        setSuccessMsg(res.data.message);
        setErrorMsg("");
        setShowForm(false);
        setName("");
        setStudentClass("");
        setPassword("");
        setAddress("");
        setMobile("");
        fetchStudents();
      } else {
        setErrorMsg(res.data.message);
      }
    } catch {
      setErrorMsg("Server error while adding student");
    }
  };

  // Delete student
  const handleDelete = async (id) => {
    if (!window.confirm("Delete student permanently?")) return;
    try {
      const res = await axios.delete(`${API_URL}/${id}`);
      if (res.data.success) {
        setStudents(students.filter((s) => s.id !== id));
      } else {
        setErrorMsg(res.data.message);
      }
    } catch {
      setErrorMsg("Server error while deleting student");
    }
  };

  return (
    <div style={page}>
      <h1 style={heading}>Manage Students</h1>
      <button style={addBtn} onClick={() => setShowForm(true)}>
        + Add Student
      </button>

      {successMsg && <p style={{ color: "green", textAlign: "center" }}>{successMsg}</p>}
      {errorMsg && <p style={{ color: "red", textAlign: "center" }}>{errorMsg}</p>}

      {showForm && (
        <div style={modal}>
          <div style={modalContent}>
            <h2 style={{ marginBottom: "15px", color: "#1f3c88" }}>Add Student</h2>
            <form autoComplete="new-password" onSubmit={handleAddStudent}>
              <input
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={input}
              />
              <input
                placeholder="Class"
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                style={input}
              />
              <input
                placeholder="Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={input}
              />
              <input
                placeholder="Mobile Number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                style={input}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={input}
              />
              <button type="submit" style={saveBtn}>
                Save
              </button>
              <button
                type="button"
                style={closeBtn}
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      <div style={tableContainer}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>ID</th>
              <th style={th}>Name</th>
              <th style={th}>Class</th>
              <th style={th}>Mobile</th>
              <th style={th}>Address</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} style={trHover}>
                <td style={td}>{s.id}</td>
                <td style={td}>{s.name}</td>
                <td style={td}>{s.class}</td>
                <td style={td}>{s.mobile || "-"}</td>
                <td style={td}>{s.address || "-"}</td>
                <td style={td}>
                  <button style={deleteBtn} onClick={() => handleDelete(s.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Animations */}
      <style>
        {`
          @keyframes modalFade {
            0% { opacity: 0; transform: scale(0.8);}
            100% { opacity: 1; transform: scale(1);}
          }

          input:focus {
            border-color: #1f3c88;
            box-shadow: 0 0 8px rgba(31,60,136,0.5);
            outline: none;
            transition: 0.3s;
          }

          button:hover {
            transform: scale(1.05);
          }

          tr:hover {
            background: #f1f5ff;
            transition: 0.3s;
          }
        `}
      </style>
    </div>
  );
};

// ============ CSS ============
const page = { padding: "40px", fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", background: "#f0f4f8" };
const heading = { textAlign: "center", marginBottom: "20px", color: "#1f3c88" };
const input = { width: "100%", padding: "10px", margin: "8px 0", borderRadius: "6px", border: "1px solid #ccc", transition: "0.3s" };
const addBtn = { padding: "10px 20px", background: "#1f3c88", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", marginBottom: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" };
const saveBtn = { padding: "10px", background: "green", color: "white", border: "none", borderRadius: "8px", width: "100%", marginTop: "10px", cursor: "pointer", boxShadow: "0 3px 10px rgba(0,0,0,0.15)" };
const closeBtn = { padding: "10px", background: "gray", color: "white", border: "none", borderRadius: "8px", width: "100%", marginTop: "10px", cursor: "pointer" };
const deleteBtn = { padding: "6px 12px", background: "red", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", transition: "0.3s", boxShadow: "0 2px 6px rgba(0,0,0,0.2)" };
const tableContainer = { overflowX: "hidden", marginTop: "20px" };
const table = { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "10px", overflow: "hidden", boxShadow: "0 4px 15px rgba(0,0,0,0.1)" };
const th = { padding: "12px", background: "linear-gradient(90deg, #1f3c88, #3959a1)", color: "#fff", textAlign: "left" };
const td = { padding: "12px", borderBottom: "1px solid #ddd" };
const modal = { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", animation: "modalFade 0.3s ease" };
const modalContent = { background: "#fff", padding: "25px", borderRadius: "12px", width: "380px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)" };
const trHover = {};

export default ManageStudents;
