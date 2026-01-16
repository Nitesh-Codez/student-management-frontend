import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";

const AdminFees = () => {
  const API_URL = process.env.REACT_APP_API_URL;

  const [students, setStudents] = useState([]);
  const [fees, setFees] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // --- Naya State Class Filter ke liye ---
  const [selectedClass, setSelectedClass] = useState(""); 

  const [form, setForm] = useState({
    id: "",
    student_id: "",
    student_name: "",
    class_name: "",
    amount: "",
    payment_date: new Date().toISOString().split('T')[0],
    payment_time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    status: "On Time",
  });

  const [hideMonths, setHideMonths] = useState(false);

  const fetchData = async () => {
    try {
      const [stRes, feeRes] = await Promise.all([
        axios.get(`${API_URL}/api/students`),
        axios.get(`${API_URL}/api/fees`)
      ]);
      if (stRes.data.success) setStudents(stRes.data.students);
      if (feeRes.data.success) setFees(feeRes.data.fees);
    } catch (err) { console.error("Error:", err); }
  };

  useEffect(() => { fetchData(); }, [API_URL]);

  // Unique Classes nikalne ke liye
  const classes = useMemo(() => {
    return [...new Set(students.map(s => s.class))].sort();
  }, [students]);

  // Selected class ke basis par students filter karne ke liye
  const filteredStudents = useMemo(() => {
    if (!selectedClass) return [];
    return students.filter(s => s.class === selectedClass);
  }, [selectedClass, students]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const filteredFees = useMemo(() => {
    return fees.filter((f) => {
      const m = f.payment_date.split("-")[1];
      const matchesMonth = m === selectedMonth;
      const matchesSearch = f.student_name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesMonth && matchesSearch;
    });
  }, [fees, selectedMonth, searchTerm]);

  const totalMonthlyAmount = filteredFees.reduce((sum, f) => sum + Number(f.amount), 0);

  const loadMonth = (m) => {
    setSelectedMonth(String(m).padStart(2, "0"));
    setHideMonths(true);
  };

  const handleStudentSelect = (e) => {
    const s = students.find((st) => st.id === Number(e.target.value));
    setForm({ ...form, student_id: s?.id || "", student_name: s?.name || "", class_name: s?.class || "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (form.id) {
        await axios.put(`${API_URL}/api/fees/${form.id}`, form);
      } else {
        await axios.post(`${API_URL}/api/fees`, form);
      }
      // Reset form and class filter after save
      setForm({ ...form, id: "", amount: "", student_id: "", student_name: "", class_name: "" });
      setSelectedClass(""); 
      fetchData();
      alert("Saved Successfully!");
    } catch (err) { alert("Error saving"); }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      try {
        await axios.delete(`${API_URL}/api/fees/${id}`);
        fetchData();
      } catch (err) { alert("Delete failed"); }
    }
  };

  return (
    <div style={{ backgroundColor: "#f4f6f9", minHeight: "100vh", padding: "15px", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ width: "100%", margin: "0 auto" }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#1a237e', padding: '15px 25px', borderRadius: '10px', color: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin: 0, fontSize: '24px' }}>🏫 Admin Fee Portal</h2>
          {hideMonths && (
            <button onClick={() => {setHideMonths(false); setSelectedMonth("");}} style={whiteBtn}>Change Month</button>
          )}
        </div>

        {!hideMonths && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' }}>
            {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => (
              <button key={i} onClick={() => loadMonth(i + 1)} style={monthCard}> {m} </button>
            ))}
          </div>
        )}

        {hideMonths && (
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            
            <div style={{ ...cardStyle, width: '350px', position: 'sticky', top: '20px' }}>
              <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>{form.id ? "✏️ Edit Fee" : "➕ Add Fee"}</h3>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                
                {/* --- CLASS FILTER DROPDOWN --- */}
                <label style={labelStyle}>Select Class</label>
                <select 
                  value={selectedClass} 
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    setForm({...form, student_id: ""}); // Reset student if class changes
                  }} 
                  style={inputStyle}
                >
                  <option value="">-- Choose Class --</option>
                  {classes.map((c, index) => <option key={index} value={c}>{c}</option>)}
                </select>

                <label style={labelStyle}>Student Name</label>
                <select 
                  value={form.student_id} 
                  onChange={handleStudentSelect} 
                  required 
                  style={{...inputStyle, backgroundColor: !selectedClass ? '#f9f9f9' : 'white'}}
                  disabled={!selectedClass}
                >
                  <option value="">{selectedClass ? "-- Select Student --" : "Choose class first"}</option>
                  {filteredStudents.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                <label style={labelStyle}>Amount (₹)</label>
                <input type="number" value={form.amount} onChange={(e)=>setForm({...form, amount: e.target.value})} placeholder="Enter Amount" required style={inputStyle} />

                <label style={labelStyle}>Payment Date</label>
                <input type="date" value={form.payment_date} onChange={(e)=>setForm({...form, payment_date: e.target.value})} style={inputStyle} />

                <label style={labelStyle}>Status</label>
                <select value={form.status} onChange={(e)=>setForm({...form, status: e.target.value})} style={inputStyle}>
                  <option>On Time</option>
                  <option>Late</option>
                  <option>Early</option>
                </select>

                <button type="submit" style={primaryBtn}>{form.id ? "Update Record" : "Save Record"}</button>
                {form.id && (
                    <button type="button" onClick={() => { setForm({...form, id: ""}); setSelectedClass(""); }} style={{...primaryBtn, backgroundColor: '#666'}}>
                        Cancel Edit
                    </button>
                )}
              </form>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                <div style={{ ...cardStyle, flex: 1, background: 'linear-gradient(135deg, #1a237e 0%, #3949ab 100%)', color: 'white' }}>
                  <small>Collection of Month</small>
                  <h2 style={{ margin: '5px 0 0 0' }}>₹{totalMonthlyAmount.toLocaleString('en-IN')}</h2>
                </div>
                <div style={{ ...cardStyle, flex: 2, display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: '10px' }}>🔍</span>
                  <input 
                    type="text" 
                    placeholder="Search by student name..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    style={{ ...inputStyle, border: 'none', fontSize: '16px' }} 
                  />
                </div>
              </div>

              <div style={{ ...cardStyle, padding: '0px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #eee' }}>
                    <tr style={{ textAlign: 'left' }}>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Student Details</th>
                      <th style={thStyle}>Amount</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFees.map((f) => (
                      <tr key={f.id} style={trStyle}>
                        <td style={tdStyle}>{formatDate(f.payment_date)}</td>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: '600', color: '#333' }}>{f.student_name}</div>
                          <div style={{ fontSize: '12px', color: '#777' }}>Class: {f.class_name}</div>
                        </td>
                        <td style={tdStyle}><strong>₹{f.amount}</strong></td>
                        <td style={tdStyle}>
                          <span style={{ ...badge, backgroundColor: f.status === 'On Time' ? '#e8f5e9' : '#fff3e0', color: f.status === 'On Time' ? '#2e7d32' : '#ef6c00' }}>
                            {f.status}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <button onClick={() => { setForm(f); setSelectedClass(f.class_name); }} style={actionBtn}>Edit</button>
                          <button onClick={() => handleDelete(f.id)} style={{ ...actionBtn, color: '#d32f2f' }}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredFees.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>No fee records found for this filter.</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Styles (Same as your original) ---
const cardStyle = { backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' };
const inputStyle = { padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', width: '100%', boxSizing: 'border-box', outline: 'none' };
const labelStyle = { fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '5px', display: 'block' };
const monthCard = { padding: '25px', borderRadius: '12px', border: 'none', backgroundColor: 'white', color: '#1a237e', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', fontSize: '16px', transition: 'all 0.3s ease' };
const primaryBtn = { backgroundColor: '#1a237e', color: 'white', padding: '14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' };
const whiteBtn = { backgroundColor: 'white', color: '#1a237e', padding: '8px 16px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer' };
const actionBtn = { background: 'none', border: 'none', color: '#1a237e', cursor: 'pointer', fontWeight: '600', marginRight: '10px', fontSize: '13px' };
const thStyle = { padding: '15px', fontSize: '13px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' };
const tdStyle = { padding: '15px', borderBottom: '1px solid #f1f1f1' };
const trStyle = { transition: 'background 0.2s' };
const badge = { padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' };

export default AdminFees;