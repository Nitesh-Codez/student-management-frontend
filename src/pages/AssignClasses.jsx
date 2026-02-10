import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";

const API_URL = "https://student-management-system-4-hose.onrender.com";

const AssignClasses = () => {
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [teacherLectures, setTeacherLectures] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false); // Naya state saving ke liye

const today = new Date().toLocaleDateString('en-CA');

  const [filterDate, setFilterDate] = useState(today);
  
  const [masterDate, setMasterDate] = useState(today);
  const [masterStart, setMasterStart] = useState("");
  const [masterEnd, setMasterEnd] = useState("");
  const [bulkStart, setBulkStart] = useState("");
  const [bulkEnd, setBulkEnd] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  const subjectsByClass = {
    "1st": ["Hindi", "English", "EVS", "Maths", "Test"],
    "2nd": ["Hindi", "English", "EVS", "Maths", "Test"],
    "3rd": ["Hindi", "English", "EVS", "Maths", "Test"],
    "4th": ["Hindi", "English", "EVS", "Maths", "Test"],
    "5th": ["Hindi", "English", "EVS", "Maths", "Test"],
    "L.K.G": ["Hindi", "English", "Maths", "EVS", "Reading", "Test"],
    "U.K.G": ["Hindi", "English", "Maths", "EVS", "Reading", "Test"],
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

  const fetchTeacherSpecific = async () => {
    if (!selectedTeacher) { setTeacherLectures([]); return; }
    try {
      const res = await axios.get(`${API_URL}/api/teacher-assignments/teacher/${selectedTeacher}`);
      setTeacherLectures(res.data.assignments || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchTeacherSpecific(); }, [selectedTeacher]);

  const classesList = useMemo(() => {
    if (!Array.isArray(students)) return [];
    const list = [...new Set(students.map(s => s.class))].filter(Boolean);
    return list.sort((a, b) => parseInt(a) - parseInt(b));
  }, [students]);

 const filteredLectures = useMemo(() => {
  return teacherLectures.filter(lec => {
    const start = lec.class_date?.split('T')[0];
    const end = lec.repeat_until?.split('T')[0];

    if (!start) return false;

    if (filterDate < start) return false;
    if (end && filterDate > end) return false;

    const day = new Date(filterDate).toLocaleDateString('en-US',{weekday:'long'});

    return lec.day_of_week === day;
  });
}, [teacherLectures, filterDate]);


  const handleBulkGenerate = () => {
    if (!bulkStart || !bulkEnd || !masterDate) return alert("Pehle Master Date aur Range bhariye!");
    const startIndex = classesList.indexOf(bulkStart);
    const endIndex = classesList.indexOf(bulkEnd);
    if (startIndex > endIndex) return alert("Start class End se choti honi chahiye!");

    const selectedRange = classesList.slice(startIndex, endIndex + 1);
    const newRows = selectedRange.map(cls => ({
      class_id: cls, subject_id: "", class_date: masterDate, start_time: masterStart, end_time: masterEnd
    }));
    setAssignments(newRows);
  };

  const addRow = () => setAssignments([...assignments, { 
    class_id: "", subject_id: "", class_date: masterDate, start_time: masterStart, end_time: masterEnd 
  }]);

  const removeRow = (i) => setAssignments(assignments.filter((_, idx) => idx !== i));

  const handleChange = (index, field, value) => {
    const arr = [...assignments];
    arr[index][field] = value;
    if (field === "class_id") arr[index].subject_id = "";
    setAssignments(arr);
  };

  // ================= FIXED SUBMIT LOGIC =================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTeacher || assignments.length === 0) return alert("Teacher select karein!");

    setIsSaving(true); 
    try {
      let savedCount = 0;
      let errorMessages = [];

      for (let a of assignments) {
        if (!a.class_id || !a.subject_id) continue;

        try {
          await axios.post(`${API_URL}/api/teacher-assignments/assign`, { 
            teacher_id: selectedTeacher, 
            ...a 
          });
          savedCount++;
        } catch (err) {
          // Backend se aane wala message yahan pakdenge
          if (err.response && err.response.status === 400) {
            errorMessages.push(`⚠️ ${err.response.data.message}`);
          } else {
            errorMessages.push(`❌ Class ${a.class_id}: Connection error.`);
          }
        }
      }

      // Feedback to User
      if (errorMessages.length > 0) {
        alert("Kuch Classes save nahi huin:\n\n" + errorMessages.join("\n"));
      }
      
      if (savedCount > 0) {
        alert(`${savedCount} Classes successfully assign ho gayi hain! ✅`);
        setAssignments([]);
        fetchTeacherSpecific();
      }

    } catch (err) { 
      alert("Error: " + err.message); 
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (lec) => {
    setEditingId(lec.id);
    setEditFormData({
      teacher_id: selectedTeacher,
      class_id: lec.class_name,
      subject_name: lec.subject_name,
      class_date: lec.class_date ? lec.class_date.split('T')[0] : "",
      start_time: lec.start_time,
      end_time: lec.end_time
    });
  };

  const handleUpdateSubmit = async (id) => {
    try {
      await axios.put(`${API_URL}/api/teacher-assignments/update/${id}`, { ...editFormData, subject_id: editFormData.subject_name });
      alert("Updated! ✅");
      setEditingId(null);
      fetchTeacherSpecific();
    } catch (err) { alert("Update failed"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete karein?")) return;
    try {
      await axios.delete(`${API_URL}/api/teacher-assignments/delete/${id}`);
      fetchTeacherSpecific();
    } catch (err) { alert("Delete failed"); }
  };

  if (loading) return <div style={{ padding: 50, textAlign: 'center' }}>Syncing Data...</div>;

  return (
    <div style={{ padding: "20px", backgroundColor: "#f4f7f6", minHeight: "100vh", fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", background: "white", padding: "25px", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
        
        <h2 style={{ color: "#1a237e", marginTop: 0 }}>🚀 Assign Faculties</h2>

        <div style={{ background: "#e3f2fd", padding: "20px", borderRadius: "8px", marginBottom: "25px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "15px", alignItems: "flex-end" }}>
          <div>
            <label style={labelStyle}>1. Select Teacher</label>
            <select value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)} style={inputStyle}>
              <option value="">-- Choose Teacher --</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>2. Set Date (Master)</label>
            <input type="date" value={masterDate} onChange={(e) => setMasterDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>3. Timing</label>
            <div style={{ display: 'flex', gap: '5px' }}>
              <input type="time" value={masterStart} onChange={(e) => setMasterStart(e.target.value)} style={inputStyle} />
              <input type="time" value={masterEnd} onChange={(e) => setMasterEnd(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>4. Class Range</label>
            <div style={{ display: 'flex', gap: '5px' }}>
               <select value={bulkStart} onChange={(e) => setBulkStart(e.target.value)} style={inputStyle}><option value="">From</option>{classesList.map(c => <option key={c} value={c}>{c}</option>)}</select>
               <select value={bulkEnd} onChange={(e) => setBulkEnd(e.target.value)} style={inputStyle}><option value="">To</option>{classesList.map(c => <option key={c} value={c}>{c}</option>)}</select>
            </div>
          </div>
          <button onClick={handleBulkGenerate} style={btnBulk}>Generate Rows</button>
        </div>

        <form onSubmit={handleSubmit}>
          {assignments.length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: "1fr 1.5fr 1.2fr 1fr 1fr 40px", gap: '10px', padding: '10px', fontWeight: 'bold', borderBottom: '2px solid #eee' }}>
                <div>Class</div><div>Subject</div><div>Date</div><div>Start</div><div>End</div><div></div>
              </div>
              {assignments.map((a, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1.2fr 1fr 1fr 40px", gap: "10px", marginTop: "10px" }}>
                  <select value={a.class_id} onChange={(e) => handleChange(i, "class_id", e.target.value)} style={smallInput}>{classesList.map(c => <option key={c} value={c}>{c}</option>)}</select>
                  <select value={a.subject_id} onChange={(e) => handleChange(i, "subject_id", e.target.value)} style={smallInput}>
                    <option value="">-- Subject --</option>
                    {(subjectsByClass[a.class_id] || []).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input type="date" value={a.class_date} onChange={(e) => handleChange(i, "class_date", e.target.value)} style={smallInput} />
                  <input type="time" value={a.start_time} onChange={(e) => handleChange(i, "start_time", e.target.value)} style={smallInput} />
                  <input type="time" value={a.end_time} onChange={(e) => handleChange(i, "end_time", e.target.value)} style={smallInput} />
                  <button type="button" onClick={() => removeRow(i)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
              <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                 <button type="button" onClick={addRow} style={btnSecondary}>+ Add Row</button>
                 {/* IDHAR LOADING CHECK LAGAYA HAI */}
                 <button type="submit" style={btnPrimary} disabled={isSaving}>
                    {isSaving ? "Saving Please Wait..." : "Save All Assignments"}
                 </button>
              </div>
            </div>
          )}
        </form>

        <hr style={{ margin: "40px 0", border: '0.5px solid #eee' }} />

        {selectedTeacher && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0 }}>Schedule: {teachers.find(t => t.id == selectedTeacher)?.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8f9fa', padding: '8px 15px', borderRadius: '8px', border: '1px solid #ddd' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold' }}>🗓️ Filter by Date:</label>
                  <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={{ border: '1px solid #ccc', padding: '4px', borderRadius: '4px' }} />
                </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8f9fa", textAlign: "left" }}>
                    <th style={thStyle}>Class</th><th style={thStyle}>Subject</th><th style={thStyle}>Date</th><th style={thStyle}>Timing</th><th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLectures.length > 0 ? (
                    filteredLectures.map((lec) => (
                      <tr key={lec.id} style={{ borderBottom: "1px solid #eee" }}>
                        {editingId === lec.id ? (
                          <>
                            <td style={tdStyle}><select value={editFormData.class_id} onChange={(e) => setEditFormData({ ...editFormData, class_id: e.target.value })} style={smallInput}>{classesList.map(c => <option key={c} value={c}>{c}</option>)}</select></td>
                            <td style={tdStyle}><select value={editFormData.subject_name} onChange={(e) => setEditFormData({ ...editFormData, subject_name: e.target.value })} style={smallInput}>{(subjectsByClass[editFormData.class_id] || []).map(s => <option key={s} value={s}>{s}</option>)}</select></td>
                            <td style={tdStyle}><input type="date" value={editFormData.class_date} onChange={(e) => setEditFormData({ ...editFormData, class_date: e.target.value })} style={smallInput} /></td>
                            <td style={tdStyle}>
                              <input type="time" value={editFormData.start_time} onChange={(e) => setEditFormData({ ...editFormData, start_time: e.target.value })} style={{ width: '65px' }} />
                              <input type="time" value={editFormData.end_time} onChange={(e) => setEditFormData({ ...editFormData, end_time: e.target.value })} style={{ width: '65px' }} />
                            </td>
                            <td style={tdStyle}>
                              <button onClick={() => handleUpdateSubmit(lec.id)} style={{ color: 'green', marginRight: '10px', background: 'none', border: 'none', cursor: 'pointer' }}>Save</button>
                              <button onClick={() => setEditingId(null)} style={{ color: 'gray', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={tdStyle}>{lec.class_name}</td>
                            <td style={tdStyle}>{lec.subject_name}</td>
                            <td style={tdStyle}>{new Date(lec.class_date).toLocaleDateString('en-GB')}</td>
                            <td style={tdStyle}>{lec.start_time} - {lec.end_time}</td>
                            <td style={tdStyle}>
                              <button onClick={() => handleEdit(lec)} style={{ color: '#1a237e', marginRight: '10px', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
                              <button onClick={() => handleDelete(lec.id)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>Is date ke liye koi lecture nahi mila.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px', color: '#555' };
const inputStyle = { padding: "10px", borderRadius: "6px", border: "1px solid #bbb", width: "100%", boxSizing: 'border-box' };
const smallInput = { padding: "6px", borderRadius: "4px", border: "1px solid #ccc", width: "100%", fontSize: '13px' };
const btnBulk = { padding: '10px', background: '#1a237e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };
const btnPrimary = { padding: '12px 25px', background: '#2e7d32', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };
const btnSecondary = { padding: '12px 20px', background: '#f5f5f5', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer' };
const thStyle = { padding: "12px", color: "#666", fontSize: '14px' };
const tdStyle = { padding: "12px", fontSize: '14px' };

export default AssignClasses;