import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";

const API_URL = "https://student-management-system-4-hose.onrender.com";

const AssignClasses = () => {
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [teacherLectures, setTeacherLectures] = useState([]);
  const [assignments, setAssignments] = useState([
    { class_id: "", subject_id: "", class_date: "", start_time: "", end_time: "" }
  ]);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [loading, setLoading] = useState(true);

  const subjectsByClass = {
    "1st": ["Hindi", "English", "EVS", "Maths", "Test"],
    "2nd": ["Hindi", "English", "EVS", "Maths", "Test"],
    "3rd": ["Hindi", "English", "EVS", "Maths", "Test"],
    "4th": ["Hindi", "English", "EVS", "Maths", "Test"],
    "5th": ["Hindi", "English", "EVS", "Maths", "Test"],
    "6th": ["Hindi", "English", "Maths", "Science", "SST", "Test"],
    "7th": ["Hindi", "English", "Maths", "Science", "SST", "Test"],
    "8th": ["Hindi", "English", "Maths", "Science", "SST", "Test"],
    "9th": ["Hindi", "English", "Maths", "Physics", "Chemistry", "Biology", "SST", "Computer", "Test"],
    "10th": ["Hindi", "English", "Maths", "Physics", "Chemistry", "Biology", "SST", "Computer", "Test"],
    "11th": ["Hindi", "English", "Maths", "Physics", "Chemistry", "Biology", "Computer", "Test"],
    "12th": ["Hindi", "English", "Maths", "Physics", "Chemistry", "Biology", "Computer", "Test"]
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [tRes, sRes] = await Promise.all([
          axios.get(`${API_URL}/api/teachers/all`),
          axios.get(`${API_URL}/api/students`)
        ]);
        setTeachers(tRes.data || []);
        setStudents(sRes.data.success ? sRes.data.students : sRes.data || []);
      } catch (err) {
        console.error("Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchTeacherSpecific = async () => {
      if (!selectedTeacher) {
        setTeacherLectures([]);
        return;
      }
      try {
        const res = await axios.get(`${API_URL}/api/teacher-assignments/teacher/${selectedTeacher}`);
        setTeacherLectures(res.data.assignments || []);
      } catch (err) {
        console.error("Error fetching teacher lectures:", err);
      }
    };
    fetchTeacherSpecific();
  }, [selectedTeacher]);

  const classesList = useMemo(() => {
    if (!Array.isArray(students)) return [];
    return [...new Set(students.map(s => s.class))].filter(Boolean).sort();
  }, [students]);

  const addRow = () => setAssignments([...assignments, { class_id: "", subject_id: "", class_date: "", start_time: "", end_time: "" }]);
  
  const removeRow = (i) => setAssignments(assignments.filter((_, idx) => idx !== i));

  const handleChange = (index, field, value) => {
    const arr = [...assignments];
    arr[index][field] = value;
    if (field === "class_id") arr[index].subject_id = "";
    setAssignments(arr);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTeacher) return alert("Please select a teacher!");

    try {
      for (let a of assignments) {
        await axios.post(`${API_URL}/api/teacher-assignments/assign`, {
          teacher_id: selectedTeacher,
          class_id: a.class_id,
          subject_id: a.subject_id,
          class_date: a.class_date, // Matching controller variable
          start_time: a.start_time,
          end_time: a.end_time
        });
      }
      alert("Saved Successfully ✅");
      setAssignments([{ class_id: "", subject_id: "", class_date: "", start_time: "", end_time: "" }]);
      
      const res = await axios.get(`${API_URL}/api/teacher-assignments/teacher/${selectedTeacher}`);
      setTeacherLectures(res.data.assignments || []);
    } catch (err) {
      alert("Error Saving: " + err.message);
    }
  };

  // Date format helper (Backend se aayi date ko sundar dikhane ke liye)
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) return <div style={{padding: 50, textAlign: 'center'}}>Syncing with Database...</div>;

  return (
    <div style={{ padding: "30px", backgroundColor: "#f0f2f5", minHeight: "100vh" }}>
      <div style={{ background: "white", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
        <h3>Assign Class to Teacher (Date Wise)</h3>
        
        <select value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)} style={inputStyle}>
          <option value="">-- Select Teacher --</option>
          {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        <form onSubmit={handleSubmit} style={{ marginTop: "20px" }}>
          {assignments.map((a, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr 1.5fr 1fr 1fr 50px", gap: "10px", marginBottom: "10px" }}>
              <select value={a.class_id} onChange={(e) => handleChange(i, "class_id", e.target.value)} style={inputStyle}>
                <option value="">Class</option>
                {classesList.map((c, idx) => <option key={idx} value={c}>{c}</option>)}
              </select>

              <select value={a.subject_id} onChange={(e) => handleChange(i, "subject_id", e.target.value)} style={inputStyle} disabled={!a.class_id}>
                <option value="">Subject</option>
                {(subjectsByClass[a.class_id] || []).map((s, idx) => <option key={idx} value={s}>{s}</option>)}
              </select>

              {/* DATE OPTION ADDED HERE */}
              <input 
                type="date" 
                value={a.class_date} 
                onChange={(e) => handleChange(i, "class_date", e.target.value)} 
                style={inputStyle} 
              />

              <input type="time" value={a.start_time} onChange={(e) => handleChange(i, "start_time", e.target.value)} style={inputStyle} />
              <input type="time" value={a.end_time} onChange={(e) => handleChange(i, "end_time", e.target.value)} style={inputStyle} />

              <button type="button" onClick={() => removeRow(i)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
            </div>
          ))}
          <button type="button" onClick={addRow} style={{ padding: "8px 15px", marginRight: "10px", borderRadius: '5px', cursor: 'pointer' }}>+ Add Slot</button>
          <button type="submit" style={{ padding: "8px 25px", background: "#1a237e", color: "white", border: "none", borderRadius: "5px", cursor: 'pointer' }}>Save Time Table</button>
        </form>

        <hr style={{ margin: "40px 0" }} />

        {/* ================= VIEW SECTION ================= */}
        {selectedTeacher && (
          <div>
            <h4>Assigned Lectures for {teachers.find(t => t.id == selectedTeacher)?.name}</h4>
            {teacherLectures.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
                  <thead>
                    <tr style={{ background: "#f8f9fa", textAlign: "left" }}>
                      <th style={tdStyle}>Date</th>
                      <th style={tdStyle}>Class</th>
                      <th style={tdStyle}>Subject</th>
                      <th style={tdStyle}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherLectures.map((lec) => (
                      <tr key={lec.id} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={tdStyle}><b>{formatDate(lec.class_date)}</b></td>
                        <td style={tdStyle}>{lec.class_name}</td>
                        <td style={tdStyle}>{lec.subject_name}</td>
                        <td style={tdStyle}>{lec.start_time} - {lec.end_time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p>No lectures assigned for this teacher yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
};

const inputStyle = { padding: "10px", borderRadius: "5px", border: "1px solid #ccc", width: "100%", fontSize: '13px' };
const tdStyle = { padding: "12px", borderBottom: "1px solid #eee", fontSize: '14px' };

export default AssignClasses;