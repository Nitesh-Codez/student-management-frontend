import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "https://student-management-system-32lc.onrender.com/api/students";

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

  const handleAddStudent = async (e) => {
    e.preventDefault();

    if (!name || !studentClass || !password || !address || !mobile)
      return alert("All fields required!");

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

  const handleDelete = async (id) => {
    if (!window.confirm("Delete student permanently?")) return;

    try {
      const res = await axios.delete(`${API_URL}/${id}`);
      if (res.data.success) {
        setStudents(students.filter((s) => s.id !== id));
      }
    } catch {
      setErrorMsg("Error deleting student");
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
            <h2>Add Student</h2>

            <form autoComplete="new-password" onSubmit={handleAddStudent}>
              <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} style={input} />
              <input placeholder="Class" value={studentClass} onChange={(e) => setStudentClass(e.target.value)} style={input} />
              <input placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} style={input} />
              <input placeholder="Mobile Number" value={mobile} onChange={(e) => setMobile(e.target.value)} style={input} />
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={input} />

              <button type="submit" style={saveBtn}>Save</button>
              <button type="button" style={closeBtn} onClick={() => setShowForm(false)}>Cancel</button>
            </form>
          </div>
        </div>
      )}

      <table style={table}>
        <thead>
          <tr>
            <th style={th}>ID</th>
            <th style={th}>Students Name</th>
            <th style={th}>Class</th>
            <th style={th}>Mobile</th>
            <th style={th}>Address</th>
            <th style={th}>Actions</th>
          </tr>
        </thead>

        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td style={td}>{s.id}</td>
              <td style={td}>{s.name}</td>
              <td style={td}>{s.class}</td>
              <td style={td}>{s.mobile}</td>
              <td style={td}>{s.address}</td>
              <td style={td}>
                <button style={deleteBtn} onClick={() => handleDelete(s.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ============= CSS ============= */

const page = { padding: "40px", fontFamily: "Segoe UI" };
const heading = { textAlign: "center", marginBottom: "20px" };
const input = { width: "100%", padding: "10px", margin: "8px 0" };

const addBtn = {
  padding: "10px 20px",
  background: "#1f3c88",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  marginBottom: "20px",
};

const saveBtn = {
  padding: "10px",
  background: "green",
  color: "white",
  border: "none",
  borderRadius: "6px",
  width: "100%",
  marginTop: "10px",
};

const closeBtn = {
  padding: "10px",
  background: "gray",
  color: "white",
  border: "none",
  borderRadius: "6px",
  width: "100%",
  marginTop: "10px",
};

const deleteBtn = {
  padding: "6px 12px",
  background: "red",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "30px",
  background: "#fff",
  border: "1px solid #ccc",
};

const th = {
  border: "1px solid #ccc",
  padding: "10px",
  background: "#1f3c88",
  color: "white",
  textAlign: "left",
};

const td = {
  border: "1px solid #ccc",
  padding: "10px",
};

const modal = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const modalContent = {
  background: "#fff",
  padding: "20px",
  borderRadius: "10px",
  width: "350px",
};

export default ManageStudents;
