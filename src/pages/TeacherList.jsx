import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaEdit, FaTrash } from "react-icons/fa";

const TeacherList = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  // ================= Fetch teachers =================
  const fetchTeachers = async () => {
    try {
      const res = await axios.get(
        "https://student-management-system-4-hose.onrender.com/api/teachers/admin/teachers"
      );
      setTeachers(res.data);
    } catch (err) {
      console.error(err.response?.data || err);
      alert("Failed to fetch teachers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  // ================= Delete teacher =================
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this teacher?")) return;
    try {
      await axios.delete(
        `https://student-management-system-4-hose.onrender.com/api/teachers/admin/teachers/${id}`
      );
      alert("Teacher deleted ✅");
      fetchTeachers(); // refresh list
    } catch (err) {
      console.error(err.response?.data || err);
      alert("Failed to delete teacher");
    }
  };

  return (
    <div style={container}>
      <h2 style={header}>Teacher List</h2>
      {loading ? (
        <p>Loading teachers...</p>
      ) : (
        <table style={table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Photo</th>
              <th>Code</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Qualification</th>
              <th>Experience</th>
              <th>Salary</th>
              <th>Joining Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teachers.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: "center" }}>
                  No teachers found
                </td>
              </tr>
            ) : (
              teachers.map((t) => (
                <tr key={t.id}>
                  <td>{t.id}</td>
                  <td>
                    {t.profile_photo ? (
                      <img
                        src={t.profile_photo}
                        alt={t.name}
                        style={{ width: "50px", borderRadius: "50%" }}
                      />
                    ) : (
                      "No Photo"
                    )}
                  </td>
                  <td>{t.teacher_code}</td>
                  <td>{t.name}</td>
                  <td>{t.email}</td>
                  <td>{t.phone}</td>
                  <td>{t.qualification}</td>
                  <td>{t.experience_years}</td>
                  <td>{t.salary}</td>
                  <td>{t.joining_date ? new Date(t.joining_date).toLocaleDateString() : "-"}</td>
                  <td>
                    <button style={editBtn}>
                      <FaEdit />
                    </button>
                    <button style={deleteBtn} onClick={() => handleDelete(t.id)}>
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

// ================= Styles =================
const container = { padding: "20px", background: "#fff", borderRadius: "15px" };
const header = { fontSize: "22px", marginBottom: "20px", color: "#1e293b" };
const table = { width: "100%", borderCollapse: "collapse" };
const editBtn = {
  marginRight: "5px",
  padding: "5px 8px",
  background: "#f97316",
  color: "#fff",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
};
const deleteBtn = {
  padding: "5px 8px",
  background: "#ef4444",
  color: "#fff",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
};

export default TeacherList;
