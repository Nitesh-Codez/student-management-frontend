import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "https://student-management-system-4-hose.onrender.com";

export default function AdminPage() {
  const [file, setFile] = useState(null);
  const [uploadClass, setUploadClass] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [deadline, setDeadline] = useState("");
  const [viewClass, setViewClass] = useState("");
  const [taskSubmissions, setTaskSubmissions] = useState({});
  const [classes, setClasses] = useState([]);
  const [subjectsByClass, setSubjectsByClass] = useState({});
  const [isUploading, setIsUploading] = useState(false);

  // Edit state
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editDeadline, setEditDeadline] = useState("");
  const [editFile, setEditFile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Profile photo states
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);

  useEffect(() => {
    // Fetch classes
    axios.get(`${API_URL}/api/new-marks/classes`)
      .then(res => {
        if (res.data.success) {
          setClasses(res.data.classes);
          const map = {};
          res.data.classes.forEach(c => { map[c.class] = ["Math","English","Hindi","SST","Science"]; });
          setSubjectsByClass(map);
        }
      }).catch(err => console.error(err));

    // Fetch students
    axios.get(`${API_URL}/api/students`)
      .then(res => { if (res.data.success) setStudents(res.data.students); })
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (!viewClass) { setTaskSubmissions({}); return; }
    const fetchAll = async () => {
      try {
        const taskRes = await axios.get(`${API_URL}/api/assignments/admin/tasks/${viewClass}`);
        if (!taskRes.data.success) return;
        const result = {};
        for (let task of taskRes.data.tasks) {
          const subRes = await axios.get(`${API_URL}/api/assignments/admin/submissions/${encodeURIComponent(task.task_title)}?class=${viewClass}`);
          result[task.task_title] = subRes.data.success ? subRes.data.submissions : [];
        }
        setTaskSubmissions(result);
      } catch (err) { console.error(err); }
    };
    fetchAll();
  }, [viewClass]);

  // ================= UPLOAD NEW ASSIGNMENT =================
  const handleSubmit = async () => {
    if (!file || !uploadClass || !taskTitle || !subject || !deadline) {
      return alert("All fields are required!");
    }

    setIsUploading(true);
    const user = JSON.parse(localStorage.getItem("user"));
    const formData = new FormData();
    formData.append("file", file);
    formData.append("uploader_id", user?.id);
    formData.append("uploader_role", "admin");
    formData.append("task_title", taskTitle);
    formData.append("subject", subject);
    formData.append("class", uploadClass);
    formData.append("deadline", new Date(deadline).toISOString());

    try {
      const res = await axios.post(`${API_URL}/api/assignments/admin/upload`, formData);
      alert(res.data.success ? "Assignment Uploaded!" : "Upload Failed");

      // reset fields
      setFile(null);
      setTaskTitle("");
      setSubject("");
      setUploadClass("");
      setDeadline("");

      // refresh submissions
      setViewClass(prev => prev); 
    } catch (err) {
      console.error(err.response?.data || err);
      alert("Server error. Check console for details.");
    } finally { setIsUploading(false); }
  };

  // ================= HANDLE EDIT =================
  const startEditing = (assignment) => {
    setEditingAssignment(assignment);
    setEditDeadline(assignment.deadline ? new Date(assignment.deadline).toISOString().slice(0,16) : "");
  };

  const handleEditSubmit = async () => {
    if (!editingAssignment) return;
    setIsEditing(true);
    const formData = new FormData();
    if (editFile) formData.append("file", editFile);
    formData.append("deadline", new Date(editDeadline).toISOString());

    try {
      const res = await axios.put(`${API_URL}/api/assignments/admin/assignment/${editingAssignment.id}`, formData);
      if (res.data.success) {
        alert("Assignment updated successfully!");
        setEditingAssignment(null);
        setEditFile(null);
        setViewClass(prev => prev); // refresh submissions
      } else alert("Update failed");
    } catch (err) {
      console.error(err);
      alert("Server error during update");
    } finally { setIsEditing(false); }
  };

  // ================= HANDLE DELETE =================
  const handleDelete = async (assignmentId) => {
    if (!window.confirm("Are you sure you want to delete this submission?")) return;
    try {
      const res = await axios.delete(`${API_URL}/api/assignments/${assignmentId}`);
      if (res.data.success) {
        alert("Submission deleted ✅");
        setViewClass(prev => prev); // refresh submissions
      }
    } catch (err) { console.error(err); alert("Delete failed"); }
  };

  // ================= HANDLE RATING =================
  const handleRating = async (submissionId, value) => {
    try {
      const res = await axios.put(`${API_URL}/api/assignments/rating/${submissionId}`, { rating: value });
      if (res.data.success) {
        setTaskSubmissions(prev => {
          const newSubs = { ...prev };
          for (let task in newSubs) {
            newSubs[task] = newSubs[task].map(s => s.id === submissionId ? { ...s, rating: value, grading_status: "GRADED" } : s);
          }
          return newSubs;
        });
      }
    } catch (err) { console.error(err); }
  };

  // ================= HANDLE PROFILE PHOTO =================
  const handlePhotoUpload = async () => {
    if (!selectedStudent || !photoFile) return alert("Select a student and photo!");
    setIsPhotoUploading(true);
    const formData = new FormData();
    formData.append("photo", photoFile);

    try {
      const res = await axios.post(`${API_URL}/api/students/${selectedStudent}/profile-photo`, formData);
      if (res.data.success) {
        alert("Photo uploaded!");
        const studentIdNum = parseInt(selectedStudent);
        setStudents(prev => prev.map(s => s.id === studentIdNum ? { ...s, profile_photo: res.data.profile_photo } : s));
        setPhotoFile(null);
      } else alert("Upload failed");
    } catch (err) {
      alert("Server error");
    } finally { setIsPhotoUploading(false); }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
  };

  return (
    <div style={ui.pageWrapper}>
      <div style={ui.header}>
        <div style={ui.headerInner}>
          <h1 style={ui.title}>Assignments <span style={{fontWeight:'300'}}>Center</span></h1>
          <div style={{...ui.badge, position: 'relative', left: '-10px'}}>Assignment Management</div>

        </div>
      </div>

      <div style={ui.mainGrid}>
        {/* Add Task */}
        <div style={ui.card}>
          <div style={ui.cardHeader}><h2 style={ui.cardTitle}>Add Task</h2></div>
          <div style={ui.formGroup}>
            <label style={ui.label}>Assignment Title</label>
            <input style={ui.input} placeholder="Project Name" value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} />

            <div style={{display:'flex', gap:10}}>
              <div style={{flex:1}}>
                <label style={ui.label}>Class</label>
                <select style={ui.input} value={uploadClass} onChange={e=>setUploadClass(e.target.value)}>
                  <option value="">Select</option>
                  {classes.map(c => <option key={c.class} value={c.class}>{c.class}</option>)}
                </select>
              </div>
              <div style={{flex:1}}>
                <label style={ui.label}>Subject</label>
                <select style={ui.input} value={subject} onChange={e=>setSubject(e.target.value)} disabled={!uploadClass}>
                  <option value="">Select</option>
                  {subjectsByClass[uploadClass]?.map((s,i) => <option key={i} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <label style={ui.label}>Deadline</label>
            <input type="datetime-local" style={ui.input} value={deadline} onChange={e=>setDeadline(e.target.value)} />

            <label style={ui.label}>Attach Resource</label>
            <input type="file" onChange={e=>setFile(e.target.files[0])} style={ui.fileInput} />

            <button onClick={handleSubmit} style={ui.btnPrimary} disabled={isUploading}>
              {isUploading ? "Processing..." : "Deploy Now"}
            </button>
          </div>
        </div>

        {/* Profile Photo */}
        <div style={ui.card}>
          <div style={ui.cardHeader}><h2 style={ui.cardTitle}>Upload Student Profile Photo</h2></div>
          <div style={ui.formGroup}>
            <label style={ui.label}>Select Student</label>
            <select style={ui.input} value={selectedStudent} onChange={e=>setSelectedStudent(e.target.value)}>
              <option value="">Select</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.class})</option>)}
            </select>

            <label style={ui.label}>Choose Photo</label>
            <input type="file" onChange={e=>setPhotoFile(e.target.files[0])} style={ui.fileInput} />

            <button onClick={handlePhotoUpload} style={ui.btnPrimary} disabled={isPhotoUploading}>
              {isPhotoUploading ? "Uploading..." : "Upload Photo"}
            </button>

            {selectedStudent && (
              <div style={{marginTop:15}}>
                {students.find(s => s.id === parseInt(selectedStudent))?.profile_photo ? (
                  <img src={students.find(s => s.id === parseInt(selectedStudent)).profile_photo} alt="Profile" 
                    style={{width:100,height:100,borderRadius:'50%',objectFit:'cover',border:'2px solid #4F46E5'}} />
                ) : <p style={{color:'#6B7280'}}>No photo uploaded yet</p>}
              </div>
            )}
          </div>
        </div>

        {/* Live Submissions */}
        <div style={ui.card}>
          <div style={ui.flexBetween}>
            <h2 style={ui.cardTitle}>Live Submissions</h2>
            <select style={ui.miniSelect} value={viewClass} onChange={e=>setViewClass(e.target.value)}>
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.class} value={c.class}>{c.class}</option>)}
            </select>
          </div>

          {/* Edit Assignment Modal */}
          {editingAssignment && (
            <div style={{marginBottom:20, padding:15, border:'1px solid #D1D5DB', borderRadius:10}}>
              <h4>Edit Assignment: {editingAssignment.task_title}</h4>
              <label style={ui.label}>Deadline</label>
              <input type="datetime-local" style={ui.input} value={editDeadline} onChange={e=>setEditDeadline(e.target.value)} />
              <label style={ui.label}>Replace File (optional)</label>
              <input type="file" onChange={e=>setEditFile(e.target.files[0])} style={ui.fileInput} />
              <div style={{display:'flex', gap:10, marginTop:10}}>
                <button onClick={handleEditSubmit} style={ui.btnPrimary} disabled={isEditing}>
                  {isEditing ? "Updating..." : "Update"}
                </button>
                <button onClick={()=>setEditingAssignment(null)} style={{...ui.btnPrimary, background:'#EF4444'}}>Cancel</button>
              </div>
            </div>
          )}

          <div style={ui.scrollArea}>
            {!viewClass ? (
              <div style={ui.emptyState}>Select a class to monitor performance</div>
            ) : (
              Object.entries(taskSubmissions).map(([task, subs]) => (
                <div key={task} style={ui.taskGroup}>
                  <div style={ui.taskHeader}>
                    {task}
                    <button 
  onClick={() => {
    if (subs[0]) startEditing(subs[0]);
    else alert("No submission available to edit!");
  }} 
  style={{marginLeft:10,padding:'2px 6px',fontSize:12}}
>
  Edit
</button>


                  </div>
                  {subs.length===0 ? <p style={ui.noData}>No submissions yet.</p> : (
                    <div style={{overflowX:'auto'}}>
                      <table style={ui.table}>
                        <thead>
                          <tr>
                            <th style={ui.th}>Student</th>
                            <th style={ui.th}>Submitted At</th>
                            <th style={ui.th}>Deadline</th>
                            <th style={ui.th}>Status</th>
                            <th style={ui.th}>Rating</th>
                            <th style={ui.th}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subs.map(s => {
                            const isLate = s.deadline && new Date(s.uploaded_at) > new Date(s.deadline);
                            return (
                              <tr key={s.id} style={ui.tr}>
                                <td style={{...ui.td,fontWeight:'600'}}>{s.student_name}</td>
                                <td style={ui.td}>{formatDate(s.uploaded_at)}</td>
                                <td style={ui.td}>{formatDate(s.deadline)}</td>
                                <td style={ui.td}><span style={isLate?ui.tagLate:ui.tagOnTime}>{isLate?"Late":"On Time"}</span></td>
                                <td style={ui.td}>
                                  <div style={{display:'flex',gap:2}}>
                                    {[1,2,3,4,5].map(i=>(
                                      <span key={i} onClick={()=>handleRating(s.id,i)} style={{cursor:'pointer',color: s.rating>=i?'#F59E0B':'#E5E7EB',fontSize:18}}>★</span>
                                    ))}
                                  </div>
                                </td>
                                <td style={ui.td}>
                                  <a href={s.file_path} target="_blank" rel="noreferrer" style={ui.viewLink}>View File</a>
                                  <button onClick={()=>handleDelete(s.id)} style={{marginLeft:10,padding:'2px 6px',fontSize:12,background:'#EF4444',color:'#FFF',border:'none',borderRadius:5}}>Delete</button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== UI STYLES ====================
// ==================== UI STYLES ====================
const ui = {
  pageWrapper: { background: "#F3F4F6", minHeight: "100vh", fontFamily: "'Inter', sans-serif" },
  header: { background: "#ffffff", padding: "20px 40px", borderBottom: "1px solid #E5E7EB" },
  headerInner: { maxWidth: 1400, margin: "0 auto", display: 'flex', alignItems:'center', justifyContent:'space-between' },
  title: { color: "#111827", fontSize: "24px", margin: 0, fontWeight: '800' },
  badge: { background: "#EEF2FF", color: "#4F46E5", padding: "6px 14px", borderRadius: 30, fontSize: 12, fontWeight: '600' },
  mainGrid: { display: "grid", gridTemplateColumns: "850px 1fr", gap: 30, padding: 30, maxWidth: 1900, margin: "0 auto" },
  card: { background: "#FFFFFF", borderRadius: 16, padding: 25, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" },
  cardHeader: { borderBottom: '1px solid #F3F4F6', marginBottom: 20, paddingBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#374151", margin: 0 },
  formGroup: { display: "flex", flexDirection: "column", gap: 18 },
  label: { fontSize: 12, fontWeight: "600", color: "#6B7280", textTransform: 'uppercase' },
  input: { padding: "12px", borderRadius: 10, border: "1px solid #D1D5DB", outline: "none", fontSize: 14, background:'#F9FAFB' },
  fileInput: { padding: "12px", borderRadius: 10, border: "2px dashed #E5E7EB", background: "#F9FAFB", cursor:'pointer' },
  btnPrimary: { background: "rgb(79, 70, 229)", color: "#FFF", border: "none", padding: "14px", borderRadius: 10, fontWeight: "700", cursor: "pointer", fontSize: 14 },
  flexBetween: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  scrollArea: { maxHeight: 400, overflowY: 'auto', marginTop: 10 },
  emptyState: { padding: 20, textAlign: 'center', color: '#9CA3AF' },
  taskGroup: { marginBottom: 20, border: '1px solid #E5E7EB', borderRadius: 10, padding: 10 },
  taskHeader: { fontWeight: '700', fontSize: 14, marginBottom: 8 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: 8, background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' },
  td: { padding: 8, borderBottom: '1px solid #E5E7EB' },
  tr: {},
  tagLate: { background: '#FEE2E2', color:'#B91C1C', padding: '2px 6px', borderRadius: 5, fontSize: 12 },
  tagOnTime: { background: '#DCFCE7', color:'#15803D', padding: '2px 6px', borderRadius: 5, fontSize: 12 },
  miniSelect: { padding: '6px 10px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 },
  viewLink: { color:'#4F46E5', textDecoration:'underline', fontSize: 13 },
  noData: { color:'#6B7280', fontStyle:'italic', fontSize:13 }
};
