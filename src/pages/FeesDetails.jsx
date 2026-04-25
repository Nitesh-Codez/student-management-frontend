import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import jsPDF from "jspdf";
import "jspdf-autotable";

/**
 * FeesDetails Component - Professional ERP Fee Management
 * Optimized for Wide Display, Clean Text-Based UI, and High Readability.
 */

const FeesDetails = () => {
  // --- HOOKS & ROUTING ---
  const { session, month } = useParams();
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL;

  // --- STATES ---
  const [students, setStudents] = useState([]);
  const [fees, setFees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- FORM STATE ---
  const [form, setForm] = useState({
    id: "",
    student_id: "",
    student_name: "",
    class_name: "",
    amount: "",
    payment_date: new Date().toISOString().split("T")[0],
    status: "On Time",
  });

  // --- DATA FETCHING ---
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [stRes, feeRes] = await Promise.all([
        axios.get(`${API_URL}/api/students`),
        axios.get(`${API_URL}/api/fees`, { params: { session, month } }),
      ]);
      setStudents(stRes.data.students || []);
      setFees(feeRes.data.fees || []);
    } catch (err) {
      console.error("ERP Data Sync Error:", err);
      setError("Server connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [session, month]);

  // --- HELPER FUNCTIONS ---
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", { 
      day: "2-digit", 
      month: "short", 
      year: "numeric" 
    });
  };

  // --- MEMOIZED FILTERS ---
  const classes = useMemo(() => 
    [...new Set(students.map((s) => s.class))].sort(), 
    [students]
  );

  const filteredStudents = useMemo(() => 
    students.filter((s) => s.class === selectedClass), 
    [selectedClass, students]
  );
  
  const filteredFees = useMemo(() => 
    fees.filter((f) => 
      f.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.class_name.toLowerCase().includes(searchTerm.toLowerCase())
    ), 
  [fees, searchTerm]);

  const totalAmount = filteredFees.reduce((sum, f) => sum + Number(f.amount), 0);

  // --- PDF REPORT GENERATOR ---
  const handlePrint = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFontSize(18);
    doc.setTextColor(26, 35, 126);
    doc.text("SMART STUDENT CLASSES - FEE REPORT", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Academic Session: ${session} | Month: ${month}`, 14, 28);
    doc.text(`Report Generated: ${new Date().toLocaleString()}`, 14, 33);

    const tableColumn = ["Date", "Student Name", "Class", "Amount", "Status"];
    const tableRows = filteredFees.map(fee => [
      formatDate(fee.payment_date),
      fee.student_name.toUpperCase(),
      fee.class_name,
      `INR ${fee.amount}`,
      fee.status
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [26, 35, 126], fontSize: 10, halign: 'center' },
      styles: { fontSize: 9 },
      columnStyles: { 3: { halign: 'right' } }
    });

    doc.save(`Fee_Statement_${month}_${session}.pdf`);
  };

  // --- EVENT HANDLERS ---
  const handleDelete = async (id) => {
    if (window.confirm("Confirm: Permanently delete this transaction?")) {
      try {
        await axios.delete(`${API_URL}/api/fees/${id}`);
        setFees(prev => prev.filter(f => f.id !== id));
      } catch (err) {
        alert("Action failed: Record could not be deleted.");
      }
    }
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const payload = { 
      ...form, 
      session, 
      month,
      payment_time: new Date().toTimeString().split(" ")[0] // ✅ FIX
    };

    if (form.id) {
      await axios.put(`${API_URL}/api/fees/${form.id}`, payload);
    } else {
      await axios.post(`${API_URL}/api/fees`, payload);
    }

    setForm({
      id: "", student_id: "", student_name: "", class_name: "", amount: "",
      payment_date: new Date().toISOString().split("T")[0], status: "On Time"
    });
    setSelectedClass("");
    fetchData();
  } catch (err) {
    alert("Database error while saving record.");
  }
};


  return (
    <div style={containerStyle}>
      
      {/* 1. TOP ERP NAVIGATION */}
      <div style={headerNav}>
        <div style={brandContainer}>
          <h2 style={brandTitle}>🏫 SmartZone ERP | Ledger Management</h2>
          <div style={badgeWrapper}>
            <span style={topBadge}>Session: {session}</span>
            <span style={topBadge}>Target Month: {month}</span>
          </div>
        </div>
        <div style={actionButtonGroup}>
           <button onClick={handlePrint} style={printBtn}>🖨️ Export PDF</button>
           <button onClick={() => navigate("/admin/manage-fees")} style={backBtn}>← Home</button>
        </div>
      </div>

      {error && (
        <div style={errorBanner}>
          <span>⚠️ {error}</span>
          <button onClick={fetchData} style={retryLink}>Sync Now</button>
        </div>
      )}

      <div style={mainLayout}>
        
        {/* SIDEBAR: STICKY TRANSACTION FORM */}
        <div style={sideContainer}>
          <div style={cardStyle}>
            <div style={formHeader}>
              <h3 style={{ margin: 0, color: '#1a237e' }}>{form.id ? "✏️ Edit Record" : "➕ Add Fee"}</h3>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Enter payment details below</p>
            </div>
            
            <form onSubmit={handleSubmit} style={flexCol}>
              <div>
                <label style={labelStyle}>Class Category</label>
                <select value={selectedClass} onChange={(e) => { setSelectedClass(e.target.value); setForm({ ...form, student_id: "" }); }} style={inputStyle}>
                  <option value="">-- Select Class --</option>
                  {classes.map((c, i) => <option key={i} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Student Profile</label>
                <select 
                  value={form.student_id} 
                  onChange={(e) => {
                    const s = students.find(st => st.id === Number(e.target.value));
                    setForm({ ...form, student_id: s?.id || "", student_name: s?.name || "", class_name: s?.class || "" });
                  }} 
                  required 
                  style={{ ...inputStyle, backgroundColor: !selectedClass ? '#f8f9fa' : 'white' }} 
                  disabled={!selectedClass}
                >
                  <option value="">{selectedClass ? "-- Select Student --" : "Select Class First"}</option>
                  {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Amount (₹)</label>
                  <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={inputStyle}>
                    <option>On Time</option>
                    <option>Late</option>
                    <option>Early</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Transaction Date</label>
                <input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} style={inputStyle} />
              </div>

              <button type="submit" style={primaryBtn} disabled={loading}>
                {loading ? "Saving..." : form.id ? "Update Transaction" : "Save Record"}
              </button>
              
              {form.id && (
                <button type="button" onClick={() => { setForm({ id: "", student_id: "", student_name: "", class_name: "", amount: "", payment_date: new Date().toISOString().split("T")[0], status: "On Time" }); setSelectedClass(""); }} style={cancelBtn}>
                  Cancel Edit
                </button>
              )}
            </form>
          </div>
        </div>

        {/* MAIN AREA: LEDGER VIEW */}
        <div style={listContainer}>
          
          <div style={topSearchRow}>
            <div style={totalRevenueCard}>
              <div style={revIcon}>₹</div>
              <div>
                <small style={{ opacity: 0.8, fontWeight: '600' }}>TOTAL COLLECTION</small>
                <h2 style={{ margin: 0, fontSize: '28px' }}>₹{totalAmount.toLocaleString('en-IN')}</h2>
              </div>
            </div>
            
            <div style={searchCard}>
              <span style={{ fontSize: '18px', color: '#999' }}>🔍</span>
              <input 
                type="text" 
                placeholder="Search by student name or class..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                style={searchInput} 
              />
            </div>
          </div>

          <div style={tableWrapper}>
            <table style={fullTable}>
              <thead>
                <tr style={tableHeaderRow}>
                  <th style={{...thStyle, width: '15%'}}>Payment Date</th>
                  <th style={{...thStyle, width: '30%'}}>Student Name</th>
                  <th style={{...thStyle, width: '15%'}}>Class</th>
                  <th style={{...thStyle, width: '15%'}}>Amount</th>
                  <th style={{...thStyle, width: '15%'}}>Status</th>
                  <th style={{...thStyle, width: '10%'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFees.map((f, index) => (
                  <tr key={f.id} style={{...trStyle, backgroundColor: index % 2 === 0 ? '#ffffff' : '#fcfcfc'}} className="erp-row">
                    {/* BOLD DATE */}
                    <td style={{...tdStyle, fontWeight: '700', color: '#1a237e'}}>{formatDate(f.payment_date)}</td>
                    
                    <td style={tdStyle}>
                      <div style={studentNameCell}>{f.student_name}</div>
                    </td>

                    {/* LARGE TEXT CLASS (NO BOX) */}
                    <td style={{...tdStyle, fontSize: '18px', fontWeight: '800', color: '#333'}}>
                      {f.class_name}
                    </td>

                    <td style={tdStyle}>
                      <strong style={amountText}>₹{Number(f.amount).toLocaleString('en-IN')}</strong>
                    </td>

                    {/* CLEAN STATUS TEXT (NO BOX) */}
                    <td style={{
                      ...tdStyle, 
                      fontWeight: '700', 
                      color: f.status === 'On Time' ? '#2e7d32' : f.status === 'Late' ? '#d32f2f' : '#0288d1'
                    }}>
                      {f.status}
                    </td>

                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={() => { setForm(f); setSelectedClass(f.class_name); }} style={editAction}>Edit</button>
                        <button onClick={() => handleDelete(f.id)} style={deleteAction}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredFees.length === 0 && !loading && (
              <div style={emptyState}>
                <div style={{fontSize: '40px', marginBottom: '10px'}}>📁</div>
                <p>No fee records found for the selected filters.</p>
              </div>
            )}
            
            {loading && <div style={{padding: '40px', textAlign: 'center', color: '#1a237e'}}>Synchronizing Database...</div>}
          </div>
        </div>
      </div>
      <style>{`
        .erp-row:hover { background-color: #f1f3f9 !important; transition: 0.2s; }
        .erp-row td { transition: color 0.2s; }
      `}</style>
    </div>
  );
};


// --- STYLES ---
const containerStyle = { background: "#f3f4f6", minHeight: "100vh", padding: "30px", fontFamily: "'Inter', sans-serif" };

const headerNav = { 
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
  marginBottom: '30px', backgroundColor: '#1a237e', padding: '20px 40px', 
  borderRadius: '16px', color: 'white', boxShadow: '0 10px 30px rgba(26,35,126,0.25)' 
};

const brandContainer = { display: 'flex', flexDirection: 'column' };
const brandTitle = { margin: 0, fontSize: '22px', fontWeight: '800' };
const badgeWrapper = { display: 'flex', gap: '10px', marginTop: '5px' };
const topBadge = { background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' };

const actionButtonGroup = { display: "flex", gap: "10px" };
const printBtn = { backgroundColor: '#2e7d32', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' };
const backBtn = { backgroundColor: 'white', color: '#1a237e', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' };

const mainLayout = { display: 'flex', gap: '30px', alignItems: 'flex-start' };
const sideContainer = { width: '350px', position: 'sticky', top: '30px' };
const listContainer = { flex: 1 };

const topSearchRow = { display: 'flex', gap: '20px', marginBottom: '25px' };
const totalRevenueCard = { flex: 1, background: '#1a237e', color: 'white', padding: '20px', borderRadius: '15px', display: 'flex', alignItems: 'center', gap: '15px' };
const revIcon = { fontSize: '30px', background: 'rgba(255,255,255,0.1)', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const searchCard = { flex: 2, background: 'white', padding: '0 20px', borderRadius: '15px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' };
const searchInput = { border: 'none', width: '100%', fontSize: '16px', padding: '15px 0', outline: 'none' };

// UPDATED HEADER BOX LOOK
const tableWrapper = { backgroundColor: 'white', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' };
const fullTable = { width: '100%', borderCollapse: 'collapse' };
const tableHeaderRow = { backgroundColor: '#1a237e' }; // Indigo Header Box
const thStyle = { padding: '18px 20px', fontSize: '12px', color: 'white', textTransform: 'uppercase', fontWeight: '700', textAlign: 'left' };
const tdStyle = { padding: '18px 20px', borderBottom: '1px solid #f0f0f0' };

const studentNameCell = { fontWeight: '600', color: '#111827', fontSize: '15px' };
const amountText = { color: '#047857', fontSize: '16px' };

const cardStyle = { backgroundColor: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' };
const flexCol = { display: 'flex', flexDirection: 'column', gap: '15px' };
const inputStyle = { padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', width: '100%', boxSizing: 'border-box' };
const labelStyle = { fontSize: '12px', fontWeight: 'bold', color: '#444', marginBottom: '5px', display: 'block' };
const primaryBtn = { backgroundColor: '#1a237e', color: 'white', padding: '15px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '700' };
const formHeader = { marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' };
const cancelBtn = { backgroundColor: '#f3f4f6', color: '#4b5563', padding: '10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '13px' };
const editAction = { background: 'none', border: 'none', color: '#1a237e', cursor: 'pointer', fontWeight: 'bold' };
const deleteAction = { background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' };
const errorBanner = { background: '#fee2e2', color: '#991b1b', padding: '15px', borderRadius: '10px', marginBottom: '20px' };
const retryLink = { marginLeft: '10px', background: '#991b1b', color: 'white', border: 'none', padding: '3px 10px', borderRadius: '4px', cursor: 'pointer' };
const emptyState = { padding: '50px', textAlign: 'center', color: '#999' };
const trStyle = { cursor: 'default' };

export default FeesDetails;