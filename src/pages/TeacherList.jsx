import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaEdit, FaTrash, FaTimes } from "react-icons/fa";

const TeacherList = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- EDIT STATES ---
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null); // Current editing teacher
  const [newPhoto, setNewPhoto] = useState(null); // For image update

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
      fetchTeachers();
    } catch (err) {
      alert("Failed to delete teacher");
    }
  };

  // ================= Edit Functions =================
  const handleEditOpen = (teacher) => {
    setSelectedTeacher({ ...teacher }); // Teacher ka sara data form mein bharne ke liye
    setShowEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    
    // API ke hisaab se fields append karna
    formData.append("name", selectedTeacher.name);
    formData.append("phone", selectedTeacher.phone);
    formData.append("email", selectedTeacher.email);
    formData.append("qualification", selectedTeacher.qualification);
    formData.append("experience_years", selectedTeacher.experience_years);
    formData.append("salary", selectedTeacher.salary);
    formData.append("status", selectedTeacher.status || "active");
    
    // Agar nayi photo select ki hai to 'photo' key se append hogi (Multer ke liye)
    if (newPhoto) {
      formData.append("photo", newPhoto);
    }

    try {
      await axios.put(
        `https://student-management-system-4-hose.onrender.com/api/teachers/admin/teachers/${selectedTeacher.id}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      alert("Teacher updated successfully ✅");
      setShowEditModal(false);
      fetchTeachers(); // List refresh
    } catch (err) {
      console.error(err);
      alert("Update failed: " + (err.response?.data?.message || "Error"));
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
            <tr style={thRow}>
              <th>ID</th>
              <th>Photo</th>
              <th>Code</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Qualification</th>
              <th>Experience</th>
              <th>Salary</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((t) => (
              <tr key={t.id} style={tdRow}>
                <td>{t.id}</td>
                <td>
                  <img src={t.profile_photo} alt="" style={imgPreview} />
                </td>
                <td>{t.teacher_code}</td>
                <td>{t.name}</td>
                <td>{t.email}</td>
                <td>{t.phone}</td>
                <td>{t.qualification}</td>
                <td>{t.experience_years}</td>
                <td>{t.salary}</td>
                <td>
                  <button style={editBtn} onClick={() => handleEditOpen(t)}>
                    <FaEdit />
                  </button>
                  <button style={deleteBtn} onClick={() => handleDelete(t.id)}>
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ================= EDIT MODAL POPUP ================= */}
      {showEditModal && selectedTeacher && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <div style={modalHeader}>
              <h3>Update Teacher Details</h3>
              <FaTimes onClick={() => setShowEditModal(false)} style={{cursor: 'pointer'}} />
            </div>
            
            <form onSubmit={handleUpdate} style={formStyle}>
              <input 
                placeholder="Name" 
                value={selectedTeacher.name} 
                onChange={(e) => setSelectedTeacher({...selectedTeacher, name: e.target.value})}
                style={inputStyle}
              />
              <input 
                placeholder="Phone" 
                value={selectedTeacher.phone} 
                onChange={(e) => setSelectedTeacher({...selectedTeacher, phone: e.target.value})}
                style={inputStyle}
              />
              <input 
                placeholder="Qualification" 
                value={selectedTeacher.qualification} 
                onChange={(e) => setSelectedTeacher({...selectedTeacher, qualification: e.target.value})}
                style={inputStyle}
              />
              <input 
                type="number" 
                placeholder="Experience Years" 
                value={selectedTeacher.experience_years} 
                onChange={(e) => setSelectedTeacher({...selectedTeacher, experience_years: e.target.value})}
                style={inputStyle}
              />
              <input 
                type="number" 
                placeholder="Salary" 
                value={selectedTeacher.salary} 
                onChange={(e) => setSelectedTeacher({...selectedTeacher, salary: e.target.value})}
                style={inputStyle}
              />
              
              <div style={{marginTop: '10px'}}>
                <label style={{fontSize: '12px', color: '#666'}}>Change Photo:</label><br/>
                <input type="file" onChange={(e) => setNewPhoto(e.target.files[0])} />
              </div>

              <button type="submit" style={updateSubmitBtn}>Save Changes</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ================= Styles =================
const container = { padding: "20px", background: "#fff", borderRadius: "15px" };
const header = { fontSize: "22px", marginBottom: "20px", color: "#1e293b" };
const table = { width: "100%", borderCollapse: "collapse" };
const thRow = { background: "#f8fafc", textAlign: "left" };
const tdRow = { borderBottom: "1px solid #eee" };
const imgPreview = { width: "45px", height: "45px", borderRadius: "50%", objectFit: "cover" };

const editBtn = { marginRight: "5px", padding: "5px 8px", background: "#f97316", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" };
const deleteBtn = { padding: "5px 8px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" };

// Modal Styles
const modalOverlay = {
  position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
  background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
};
const modalContent = { background: '#fff', padding: '25px', borderRadius: '12px', width: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' };
const modalHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' };
const formStyle = { display: 'flex', flexDirection: 'column', gap: '12px' };
const inputStyle = { padding: '10px', borderRadius: '6px', border: '1px solid #ddd', outline: 'none' };
const updateSubmitBtn = { padding: '12px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' };

export default TeacherList;