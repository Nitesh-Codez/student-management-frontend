import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import api from "../services/api";

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

  // PDF Date Filter state
  const [filterDate, setFilterDate] = useState("");

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
    api.get(`/api/new-marks/classes`)
      .then(res => {
        if (res.data.success) {
          setClasses(res.data.classes);
          const map = {};
          res.data.classes.forEach(c => { map[c.class] = ["Math","English","Hindi","SST","Science","Chemistry"]; });
          setSubjectsByClass(map);
        }
      }).catch(err => console.error(err));

    // Fetch students
    api.get(`/api/students`)
      .then(res => { if (res.data.success) setStudents(res.data.students); })
      .catch(err => console.error(err));
  }, []);

  // Fetch all tasks and their submissions whenever viewClass changes
  useEffect(() => {
    if (!viewClass) { 
      setTaskSubmissions({}); 
      setFilterDate("");
      return; 
    }
    
    // Clear previous data immediately
    setTaskSubmissions({});
    
    const fetchAll = async () => {
      try {
        const taskRes = await api.get(`/api/assignments/admin/tasks/${viewClass}`);
        if (!taskRes.data.success) return;
        
        const result = {};
        for (let task of taskRes.data.tasks) {
          try {
            const subRes = await api.get(`/api/assignments/admin/submissions/${encodeURIComponent(task.task_title)}?class=${viewClass}`);
            result[task.task_title] = subRes.data.success ? subRes.data.submissions : [];
          } catch (subErr) {
            result[task.task_title] = [];
          }
        }
        setTaskSubmissions(result);
      } catch (err) { 
        console.error(err); 
      }
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
      const res = await api.post(`/api/assignments/admin/upload`, formData);
      alert(res.data.success ? "Assignment Published Successfully!" : "Upload Failed");

      setFile(null);
      setTaskTitle("");
      setSubject("");
      setUploadClass("");
      setDeadline("");

      const current = viewClass;
      if (current) {
        setViewClass("");
        setTimeout(() => setViewClass(current), 50);
      }
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
      const res = await api.put(`/api/assignments/admin/assignment/${editingAssignment.id}`, formData);
      if (res.data.success) {
        alert("Assignment updated successfully!");
        setEditingAssignment(null);
        setEditFile(null);
        const current = viewClass;
        setViewClass("");
        setTimeout(() => setViewClass(current), 50);
      } else alert("Update failed");
    } catch (err) {
      console.error(err);
      alert("Server error during update");
    } finally { setIsEditing(false); }
  };

  // ================= HANDLE DELETE =================
  const handleDelete = async (assignmentId) => {
    if (!window.confirm("Are you sure you want to remove this submission record?")) return;
    try {
      const res = await api.delete(`/api/assignments/${assignmentId}`);
      if (res.data.success) {
        alert("Record removed successfully");
        const current = viewClass;
        setViewClass("");
        setTimeout(() => setViewClass(current), 50);
      }
    } catch (err) { console.error(err); alert("Operation failed"); }
  };

  // ================= HANDLE RATING =================
  const handleRating = async (submissionId, value) => {
    try {
      const res = await api.put(`/api/assignments/rating/${submissionId}`, { rating: value });
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
    if (!selectedStudent || !photoFile) return alert("Select a student and photo file!");
    setIsPhotoUploading(true);
    const formData = new FormData();
    formData.append("photo", photoFile);

    try {
      const res = await api.post(`/api/students/${selectedStudent}/profile-photo`, formData);
      if (res.data.success) {
        alert("Profile photograph updated!");
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

  // ================= EXPORT FILTERED PDF REPORT =================
  const exportAllPDF = () => {
    const doc = new jsPDF();
    const primaryColor = [67, 56, 202]; // #4338CA (Dark Violet)

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    doc.text(`Academic Submission Report — Class ${viewClass}`, 14, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Filter Criteria: ${filterDate ? `Tasks deadline / submissions from ${new Date(filterDate).toLocaleString('en-IN')} onwards` : 'All Assigned Tasks'}`, 14, 27);
    doc.text(`Generated On: ${new Date().toLocaleString('en-IN')}`, 14, 33);

    let startY = 42;

    // Filter tasks based on filterDate (Checking if task deadline or any submission is >= filterDate)
    const filteredEntries = Object.entries(taskSubmissions).filter(([task, subs]) => {
      if (!filterDate) return true;
      const filterTime = new Date(filterDate).getTime();
      
      // Check if any submission matches or if there are no subs, check deadline logic if available
      const hasMatchingSub = subs.some(s => new Date(s.uploaded_at).getTime() >= filterTime);
      const hasMatchingDeadline = subs.some(s => s.deadline && new Date(s.deadline).getTime() >= filterTime);

      return hasMatchingSub || hasMatchingDeadline || subs.length === 0;
    });

    if (filteredEntries.length === 0) {
      alert("No assignments match the selected date filter.");
      return;
    }

    filteredEntries.forEach(([task, subs], index) => {
      // If date filter is active, filter individual submissions inside the task as well
      const validSubs = subs.filter(s => {
        if (!filterDate) return true;
        const filterTime = new Date(filterDate).getTime();
        return new Date(s.uploaded_at).getTime() >= filterTime || (s.deadline && new Date(s.deadline).getTime() >= filterTime);
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text(`Assignment: ${task}`, 14, startY);

      const tableColumn = ["Student Name", "Submission Timestamp", "Deadline", "Status", "Evaluation Rating"];
      const tableRows = [];

      if (validSubs.length === 0) {
        tableRows.push(["No Submissions in this timeframe", "-", "-", "Pending", "-"]);
      } else {
        validSubs.forEach(s => {
          const isLate = s.deadline && new Date(s.uploaded_at) > new Date(s.deadline);
          const status = isLate ? "Late Submission" : "On Time";
          const rating = s.rating ? `${s.rating} / 5 Stars` : "Pending Evaluation";
          
          tableRows.push([
            s.student_name,
            formatDate(s.uploaded_at),
            formatDate(s.deadline),
            status,
            rating
          ]);
        });
      }

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: startY + 4,
        theme: 'grid',
        headStyles: { 
          fillColor: primaryColor, 
          fontStyle: 'bold',
          textColor: [255, 255, 255] 
        },
        alternateRowStyles: { fillColor: [243, 244, 246] }, // Clean neutral dark-tinted grey instead of light blue
        styles: { fontSize: 9, cellPadding: 5, textColor: [30, 41, 59] },
      });

      startY = doc.lastAutoTable.finalY + 12;

      if (startY > 270 && index < filteredEntries.length - 1) {
        doc.addPage();
        startY = 20;
      }
    });

    doc.save(`Class_${viewClass}_Assignments_Report.pdf`);
  };

  return (
    <div style={ui.pageWrapper}>
      {/* Top Academic Header */}
      <div style={ui.header}>
        <div style={ui.headerInner}>
          <div>
            <h1 style={ui.title}>Academic <span style={{fontWeight:'300', color:'#4338CA'}}>Portal</span></h1>
            <p style={ui.subtitle}>Faculty Assignment Management & Student Evaluation Workspace</p>
          </div>
          <div style={ui.badge}>Faculty Access</div>
        </div>
      </div>

      <div style={ui.mainGrid}>
        {/* Left Column: Management Panels */}
        <div style={ui.leftColumn}>
          {/* Publish Assignment Card */}
          <div style={ui.card}>
            <div style={ui.cardHeader}>
              <h2 style={ui.cardTitle}>Publish Assignment</h2>
            </div>
            <div style={ui.formGroup}>
              <div>
                <label style={ui.label}>Assignment Title</label>
                <input style={ui.input} placeholder="e.g. Weekly Problem Set 3" value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} />
              </div>

              <div style={{display:'flex', gap:12}}>
                <div style={{flex:1}}>
                  <label style={ui.label}>Class</label>
                  <select style={ui.input} value={uploadClass} onChange={e=>setUploadClass(e.target.value)}>
                    <option value="">Select Class</option>
                    {classes.map(c => <option key={c.class} value={c.class}>{c.class}</option>)}
                  </select>
                </div>
                <div style={{flex:1}}>
                  <label style={ui.label}>Subject</label>
                  <select style={ui.input} value={subject} onChange={e=>setSubject(e.target.value)} disabled={!uploadClass}>
                    <option value="">Select Subject</option>
                    {subjectsByClass[uploadClass]?.map((s,i) => <option key={i} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={ui.label}>Submission Deadline</label>
                <input type="datetime-local" style={ui.input} value={deadline} onChange={e=>setDeadline(e.target.value)} />
              </div>

              <div>
                <label style={ui.label}>Reference Material / Document</label>
                <input type="file" onChange={e=>setFile(e.target.files[0])} style={ui.fileInput} />
              </div>

              <button onClick={handleSubmit} style={ui.btnPrimary} disabled={isUploading}>
                {isUploading ? "Publishing..." : "Publish Assignment"}
              </button>
            </div>
          </div>

          {/* Student Profile Photograph Card */}
          <div style={ui.card}>
            <div style={ui.cardHeader}>
              <h2 style={ui.cardTitle}>Student Profile Photograph</h2>
            </div>
            <div style={ui.formGroup}>
              <div>
                <label style={ui.label}>Select Student</label>
                <select style={ui.input} value={selectedStudent} onChange={e=>setSelectedStudent(e.target.value)}>
                  <option value="">Select Student</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.class})</option>)}
                </select>
              </div>

              <div>
                <label style={ui.label}>Photograph File</label>
                <input type="file" onChange={e=>setPhotoFile(e.target.files[0])} style={ui.fileInput} />
              </div>

              <button onClick={handlePhotoUpload} style={ui.btnSecondary} disabled={isPhotoUploading}>
                {isPhotoUploading ? "Updating..." : "Update Photograph"}
              </button>

              {selectedStudent && (
                <div style={{marginTop: 12, textAlign: 'center'}}>
                  {students.find(s => s.id === parseInt(selectedStudent))?.profile_photo ? (
                    <img src={students.find(s => s.id === parseInt(selectedStudent)).profile_photo} alt="Student Profile" 
                      style={{width: 76, height: 76, borderRadius: '50%', objectFit: 'cover', border: '2px solid #4338CA', margin: '0 auto'}} />
                  ) : <p style={{color:'#94A3B8', fontSize: 13, fontStyle:'italic'}}>No photograph on file</p>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Class Submissions & Reports */}
        <div style={ui.rightColumn}>
          <div style={ui.card}>
            <div style={ui.flexBetween}>
              <div>
                <h2 style={ui.cardTitle}>Class Evaluation Dashboard</h2>
                <p style={{fontSize: 12, color: '#64748B', margin: '2px 0 0 0'}}>Monitor tasks, submissions, and generate filtered reports.</p>
              </div>
              <select style={ui.miniSelect} value={viewClass} onChange={e=>setViewClass(e.target.value)}>
                <option value="">-- Select Class Section --</option>
                {classes.map(c => <option key={c.class} value={c.class}>{c.class}</option>)}
              </select>
            </div>

            {/* Filtered PDF Report Toolbar */}
            {viewClass && (
              <div style={ui.reportToolbar}>
                <div style={{display: 'flex', alignItems: 'center', gap: 10, flex: 1}}>
                  <label style={{fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap'}}>Filter Date:</label>
                  <input 
                    type="datetime-local" 
                    style={{...ui.input, padding: '6px 10px', fontSize: 13}} 
                    value={filterDate} 
                    onChange={e => setFilterDate(e.target.value)} 
                  />
                  {filterDate && (
                    <button onClick={() => setFilterDate("")} style={ui.btnClearFilter} title="Reset Filter">Reset</button>
                  )}
                </div>
                <button onClick={exportAllPDF} style={ui.btnExportReport}>
                  📥 Download Filtered PDF
                </button>
              </div>
            )}

            {/* Edit Form Modal Box */}
            {editingAssignment && (
              <div style={ui.editBox}>
                <h4 style={{margin: '0 0 10px 0', color: '#312E81', fontSize: 14, fontWeight: 700}}>Edit Assignment Deadline: {editingAssignment.task_title}</h4>
                <div style={{display: 'flex', gap: 12, marginBottom: 10}}>
                  <div style={{flex: 1}}>
                    <label style={ui.label}>New Deadline</label>
                    <input type="datetime-local" style={ui.input} value={editDeadline} onChange={e=>setEditDeadline(e.target.value)} />
                  </div>
                  <div style={{flex: 1}}>
                    <label style={ui.label}>Replace Document</label>
                    <input type="file" onChange={e=>setEditFile(e.target.files[0])} style={ui.fileInput} />
                  </div>
                </div>
                <div style={{display:'flex', gap:10}}>
                  <button onClick={handleEditSubmit} style={ui.btnPrimary} disabled={isEditing}>
                    {isEditing ? "Saving..." : "Save Changes"}
                  </button>
                  <button onClick={()=>setEditingAssignment(null)} style={ui.btnDangerOutline}>Cancel</button>
                </div>
              </div>
            )}

            <div style={ui.scrollArea}>
              {!viewClass ? (
                <div style={ui.emptyState}>
                  <div style={{fontSize: 28, marginBottom: 8}}>📂</div>
                  <div style={{fontWeight: 600, color: '#334155'}}>No Class Section Selected</div>
                  <div style={{fontSize: 13, color: '#94A3B8', marginTop: 4}}>Please choose a class from the selection menu above to view assignments.</div>
                </div>
              ) : Object.keys(taskSubmissions).length === 0 ? (
                <div style={ui.emptyState}>No tasks published yet for {viewClass}.</div>
              ) : (
                Object.entries(taskSubmissions).map(([task, subs]) => (
                  <div key={task} style={ui.taskGroup}>
                    <div style={ui.taskHeaderRow}>
                      <span style={ui.taskTitleText}>📄 {task}</span>
                      <button 
                        onClick={() => {
                          startEditing({ task_title: task, deadline: subs[0]?.deadline || "" });
                        }} 
                        style={ui.btnActionSub}
                      >
                        Modify Assignment
                      </button>
                    </div>

                    {subs.length === 0 ? (
                      <p style={ui.noData}>No student submissions received for this assignment yet.</p>
                    ) : (
                      <div style={{overflowX:'auto'}}>
                        <table style={ui.table}>
                          <thead>
                            <tr>
                              <th style={ui.th}>Student Name</th>
                              <th style={ui.th}>Submitted At</th>
                              <th style={ui.th}>Deadline</th>
                              <th style={ui.th}>Status</th>
                              <th style={ui.th}>Rating</th>
                              <th style={ui.th}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subs.map(s => {
                              const isLate = s.deadline && new Date(s.uploaded_at) > new Date(s.deadline);
                              return (
                                <tr key={s.id} style={ui.tr}>
                                  <td style={{...ui.td, fontWeight:'600', color: '#1E293B'}}>{s.student_name}</td>
                                  <td style={ui.td}>{formatDate(s.uploaded_at)}</td>
                                  <td style={ui.td}>{formatDate(s.deadline)}</td>
                                  <td style={ui.td}>
                                    <span style={isLate ? ui.tagLate : ui.tagOnTime}>
                                      {isLate ? "⚠️ Late" : "✓ On Time"}
                                    </span>
                                  </td>
                                  <td style={ui.td}>
                                    <div style={{display:'flex', gap:2}}>
                                      {[1,2,3,4,5].map(i=>(
                                        <span 
                                          key={i} 
                                          onClick={()=>handleRating(s.id,i)} 
                                          style={{cursor:'pointer', color: s.rating >= i ? '#F59E0B' : '#CBD5E1', fontSize: 18, transition: 'color 0.2s'}}
                                          title={`Rate ${i} Stars`}
                                        >
                                          ★
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                  <td style={ui.td}>
                                    <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                                      <a href={s.file_path} target="_blank" rel="noreferrer" style={ui.viewLink}>View File</a>
                                      <button onClick={()=>handleDelete(s.id)} style={ui.btnDelete}>Remove</button>
                                    </div>
                                  </td>
                                </tr>
                              );
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
    </div>
  );
}

// ==================== PROFESSIONAL UI STYLES (DARK VIOLET PALETTE) ====================
const ui = {
  pageWrapper: { background: "#F8FAFC", minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: "#334155" },
  header: { background: "#FFFFFF", padding: "22px 40px", borderBottom: "1px solid #E2E8F0", boxShadow: "0 1px 3px 0 rgba(0,0,0,0.04)" },
  headerInner: { maxWidth: 1400, margin: "0 auto", display: 'flex', alignItems:'center', justifyContent:'space-between' },
  title: { color: "#0F172A", fontSize: "24px", margin: 0, fontWeight: '800', letterSpacing: '-0.5px' },
  subtitle: { color: "#64748B", fontSize: "13px", margin: "3px 0 0 0" },
  badge: { background: "#EEF2FF", color: "#4338CA", padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: '600', border: '1px solid #C7D2FE' },
  
  mainGrid: { display: "grid", gridTemplateColumns: "400px 1fr", gap: 24, padding: 28, maxWidth: 1440, margin: "0 auto" },
  leftColumn: { display: "flex", flexDirection: "column", gap: 24 },
  rightColumn: { display: "flex", flexDirection: "column", gap: 24 },

  card: { background: "#FFFFFF", borderRadius: 14, padding: 22, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02)", border: "1px solid #E2E8F0" },
  cardHeader: { borderBottom: '1px solid #F1F5F9', marginBottom: 18, paddingBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#1E293B", margin: 0 },
  
  formGroup: { display: "flex", flexDirection: "column", gap: 14 },
  label: { fontSize: 11, fontWeight: "700", color: "#64748B", textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 5, display: 'block' },
  input: { width: '100%', boxSizing: 'border-box', padding: "10px 12px", borderRadius: 8, border: "1px solid #CBD5E1", outline: "none", fontSize: 14, background:'#F8FAFC', color: '#1E293B', transition: 'border-color 0.2s' },
  fileInput: { width: '100%', boxSizing: 'border-box', padding: "8px", borderRadius: 8, border: "1px dashed #CBD5E1", background: "#F8FAFC", fontSize: 13, cursor:'pointer' },
  
  btnPrimary: { background: "#261d8a", color: "#FFF", border: "none", padding: "11px", borderRadius: 8, fontWeight: "600", cursor: "pointer", fontSize: 14, boxShadow: "0 1px 2px 0 rgba(67, 56, 202, 0.25)" },
  btnSecondary: { background: "#2d27a0", color: "#FFF", border: "none", padding: "11px", borderRadius: 8, fontWeight: "600", cursor: "pointer", fontSize: 14 },
  btnExportReport: { background: "#059669", color: "#FFF", border: "none", padding: "8px 14px", borderRadius: 8, fontWeight: "600", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6, boxShadow: "0 1px 2px 0 rgba(5, 150, 105, 0.2)", whiteSpace: 'nowrap' },
  btnClearFilter: { background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#475569', fontSize: 11, padding: '4px 8px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 },
  btnActionSub: { padding: '5px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#334155', fontWeight: '600', cursor: 'pointer' },
  btnDelete: { padding: '4px 8px', fontSize: 12, background: '#FEF2F2', color: '#DC2626', border: 'none', borderRadius: 6, fontWeight: '600', cursor: 'pointer' },
  btnDangerOutline: { background: "transparent", color: "#EF4444", border: "1px solid #FCA5A5", padding: "10px 14px", borderRadius: 8, fontWeight: "600", cursor: "pointer", fontSize: 14 },

  flexBetween: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  reportToolbar: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F8FAFC", padding: "10px 14px", borderRadius: 10, marginBottom: 18, border: "1px solid #E2E8F0", gap: 12 },
  editBox: { marginBottom: 18, padding: 16, border: '1px solid #C7D2FE', borderRadius: 10, background: '#EEF2FF' },
  scrollArea: { maxHeight: 580, overflowY: 'auto', paddingRight: 4 },
  emptyState: { padding: 44, textAlign: 'center', color: '#94A3B8', background: '#F8FAFC', borderRadius: 10, border: '2px dashed #E2E8F0' },
  
  taskGroup: { marginBottom: 20, border: '1px solid #E2E8F0', borderRadius: 10, padding: 14, background: '#FFFFFF' },
  taskHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #F1F5F9' },
  taskTitleText: { fontWeight: '700', fontSize: 14, color: '#1E293B' },
  
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, background: '#FFF' },
  th: { textAlign: 'left', padding: "9px 10px", background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: '600' },
  td: { padding: "9px 10px", borderBottom: '1px solid #F1F5F9', color: '#334155', verticalAlign: 'middle' },
  tr: { transition: 'background 0.2s' },
  
  tagLate: { background: '#FEF2F2', color:'#DC2626', padding: '3px 7px', borderRadius: 5, fontSize: 11, fontWeight: '600', border: '1px solid #FECACA' },
  tagOnTime: { background: '#F0FDF4', color:'#16A34A', padding: '3px 7px', borderRadius: 5, fontSize: 11, fontWeight: '600', border: '1px solid #BBF7D0' },
  
  miniSelect: { padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFFFFF', fontWeight: '600', color: '#1E293B', outline: 'none' },
  viewLink: { color:'#4338CA', textDecoration:'none', fontSize: 13, fontWeight: '600' },
  noData: { color:'#94A3B8', fontStyle:'italic', fontSize: 13, margin: '8px 0' }
};