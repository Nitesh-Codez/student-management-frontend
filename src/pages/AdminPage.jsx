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

  useEffect(() => {
    axios.get(`${API_URL}/api/new-marks/classes`)
      .then((res) => {
        if (res.data.success) {
          setClasses(res.data.classes);
          const map = {};
          res.data.classes.forEach((c) => {
            map[c.class] = ["Math", "English", "Hindi", "Science"];
          });
          setSubjectsByClass(map);
        }
      }).catch(err => console.error(err));
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

  const handleSubmit = async () => {
    if (!file || !uploadClass || !taskTitle || !subject || !deadline) return alert("All fields are required!");
    setIsUploading(true);
    const user = JSON.parse(localStorage.getItem("user"));
    const formData = new FormData();
    formData.append("file", file);
    formData.append("uploader_id", user?.id);
    formData.append("task_title", taskTitle);
    formData.append("subject", subject);
    formData.append("class", uploadClass);
    formData.append("deadline", deadline);

    try {
      const res = await axios.post(`${API_URL}/api/assignments/admin/upload`, formData);
      alert(res.data.success ? "Assignment Uploaded!" : "Upload Failed");
      setFile(null); setTaskTitle("");
    } catch (err) { alert("Server error."); }
    finally { setIsUploading(false); }
  };

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

  // Helper to format date nicely
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
  };

  return (
    <div style={ui.pageWrapper}>
      <div style={ui.header}>
        <div style={ui.headerInner}>
          <h1 style={ui.title}>Assignments  <span style={{fontWeight:'300'}}>Center</span></h1>
          <div style={ui.badge}>Assignment Management</div>
        </div>
      </div>

      <div style={ui.mainGrid}>
        {/* FORM SECTION */}
        <div style={ui.card}>
          <div style={ui.cardHeader}>
            <h2 style={ui.cardTitle}>Add Task</h2>
          </div>
          <div style={ui.formGroup}>
            <label style={ui.label}>Assignment Title</label>
            <input style={ui.input} placeholder="Project Name" value={taskTitle} onChange={(e)=>setTaskTitle(e.target.value)} />
            
            <div style={{display:'flex', gap:10}}>
              <div style={{flex:1}}>
                <label style={ui.label}>Class</label>
                <select style={ui.input} value={uploadClass} onChange={(e)=>setUploadClass(e.target.value)}>
                  <option value="">Select</option>
                  {classes.map(c => <option key={c.class} value={c.class}>{c.class}</option>)}
                </select>
              </div>
              <div style={{flex:1}}>
                <label style={ui.label}>Subject</label>
                <select style={ui.input} value={subject} onChange={(e)=>setSubject(e.target.value)} disabled={!uploadClass}>
                  <option value="">Select</option>
                  {subjectsByClass[uploadClass]?.map((s,i) => <option key={i} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <label style={ui.label}>Deadline</label>
            <input type="datetime-local" style={ui.input} value={deadline} onChange={(e)=>setDeadline(e.target.value)} />

            <label style={ui.label}>Attach Resource</label>
            <input type="file" onChange={(e)=>setFile(e.target.files[0])} style={ui.fileInput} />

            <button onClick={handleSubmit} style={ui.btnPrimary} disabled={isUploading}>
              {isUploading ? "Processing..." : "Deploy Now"}
            </button>
          </div>
        </div>

        {/* LIST SECTION */}
        <div style={ui.card}>
          <div style={ui.flexBetween}>
            <h2 style={ui.cardTitle}>Live Submissions</h2>
            <select style={ui.miniSelect} value={viewClass} onChange={(e)=>setViewClass(e.target.value)}>
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.class} value={c.class}>{c.class}</option>)}
            </select>
          </div>

          <div style={ui.scrollArea}>
            {!viewClass ? (
              <div style={ui.emptyState}>Select a class to monitor performance</div>
            ) : (
              Object.entries(taskSubmissions).map(([task, subs]) => (
                <div key={task} style={ui.taskGroup}>
                  <div style={ui.taskHeader}>{task}</div>
                  {subs.length === 0 ? <p style={ui.noData}>No submissions yet.</p> : (
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
                                <td style={{...ui.td, fontWeight:'600'}}>{s.student_name}</td>
                                <td style={ui.td}>{formatDate(s.uploaded_at)}</td>
                                <td style={ui.td}>{formatDate(s.deadline)}</td>
                                <td style={ui.td}>
                                  <span style={isLate ? ui.tagLate : ui.tagOnTime}>
                                    {isLate ? "Late" : "On Time"}
                                  </span>
                                </td>
                                <td style={ui.td}>
                                  <div style={{display:'flex', gap:2}}>
                                    {[1,2,3,4,5].map(i => (
                                      <span key={i} onClick={()=>handleRating(s.id, i)} style={{cursor:'pointer', color: s.rating >= i ? '#F59E0B' : '#E5E7EB', fontSize:18}}>★</span>
                                    ))}
                                  </div>
                                </td>
                                <td style={ui.td}>
                                  <a href={s.file_path} target="_blank" rel="noreferrer" style={ui.viewLink}>View File</a>
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

const ui = {
  pageWrapper: { background: "#F3F4F6", minHeight: "100vh", fontFamily: "'Inter', sans-serif" },
  header: { background: "#ffffff", padding: "20px 40px", borderBottom: "1px solid #E5E7EB" },
  headerInner: { maxWidth: 1400, margin: "0 auto", display: 'flex', alignItems:'center', justifyContent:'space-between' },
  title: { color: "#111827", fontSize: "24px", margin: 0, fontWeight: '800' },
  badge: { background: "#EEF2FF", color: "#4F46E5", padding: "6px 14px", borderRadius: 30, fontSize: 12, fontWeight: '600' },
  mainGrid: { display: "grid", gridTemplateColumns: "350px 1fr", gap: 30, padding: 30, maxWidth: 1500, margin: "0 auto" },
  card: { background: "#FFFFFF", borderRadius: 16, padding: 25, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" },
  cardHeader: { borderBottom: '1px solid #F3F4F6', marginBottom: 20, paddingBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#374151", margin: 0 },
  formGroup: { display: "flex", flexDirection: "column", gap: 18 },
  label: { fontSize: 12, fontWeight: "600", color: "#6B7280", textTransform: 'uppercase' },
  input: { padding: "12px", borderRadius: 10, border: "1px solid #D1D5DB", outline: "none", fontSize: 14, background:'#F9FAFB' },
  fileInput: { padding: "12px", borderRadius: 10, border: "2px dashed #E5E7EB", background: "#F9FAFB", cursor:'pointer' },
  btnPrimary: { background: "#4F46E5", color: "#FFF", border: "none", padding: "14px", borderRadius: 10, fontWeight: "700", cursor: "pointer", fontSize: 14 },
  flexBetween: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 25 },
  miniSelect: { padding: "8px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, background:'#FFF' },
  scrollArea: { maxHeight: "75vh", overflowY: "auto" },
  emptyState: { padding: 100, textAlign: 'center', color: '#9CA3AF', fontSize: 15 },
  taskGroup: { marginBottom: 30, border: "1px solid #F3F4F6", borderRadius: 12, overflow: 'hidden', background:'#FFF' },
  taskHeader: { background: "#F9FAFB", padding: "15px 20px", fontWeight: "700", color: "#111827", borderBottom: '1px solid #F3F4F6' },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 600 },
  th: { textAlign: "left", padding: "12px 20px", fontSize: 11, color: "#6B7280", textTransform: "uppercase", background: "#F9FAFB", fontWeight:'700' },
  tr: { borderBottom: "1px solid #F3F4F6", transition: '0.2s hover', background:'#FFF' },
  td: { padding: "15px 20px", fontSize: 13, color: "#4B5563" },
  tagOnTime: { background: "#D1FAE5", color: "#065F46", padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: '700' },
  tagLate: { background: "#FEE2E2", color: "#991B1B", padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: '700' },
  viewLink: { color: "#4F46E5", textDecoration: "none", fontWeight: "700", fontSize: 12 },
  noData: { padding: 20, color: "#9CA3AF", fontSize: 13, textAlign: 'center' }
};