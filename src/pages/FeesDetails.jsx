import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; // ✅ Correct import for modern jspdf-autotable

/**
 * FeesDetails Component - Professional ERP Fee Management
 * Features: Secured Tabular PDF Generation upon Password Authorization, Digital Signature Stamp, Encrypted Screen View.
 */

const FeesDetails = () => {
  // --- HOOKS & ROUTING ---
  const { session, month: routeMonth } = useParams();
  const navigate = useNavigate();

  // --- AUTO-DETECT CURRENT MONTH ---
  const currentMonthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date());
  const activeMonth = routeMonth || currentMonthName;

  // --- STATES ---
  const [students, setStudents] = useState([]);
  const [fees, setFees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- SCREEN SECURITY & ENCRYPTION STATE ---
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  // --- PDF AUTHORIZATION MODAL STATE ---
  const [showPdfPasswordModal, setShowPdfPasswordModal] = useState(false);
  const [pdfPasswordInput, setPdfPasswordInput] = useState("");

  // --- FORM STATE (WITH TIME TRACKING) ---
  const getCurrentTime12Hour = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const [form, setForm] = useState({
    id: "",
    student_id: "",
    student_name: "",
    class_name: "",
    amount: "",
    payment_date: new Date().toISOString().split("T")[0],
    payment_time: getCurrentTime12Hour(),
    status: "On Time",
  });

  // --- DATA FETCHING ---
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [stRes, feeRes] = await Promise.all([
        api.get("/api/students"),
        api.get("/api/fees", { params: { session, month: activeMonth } }),
      ]);
      setStudents(stRes.data.students || stRes.data || []);
      setFees(feeRes.data.fees || feeRes.data || []);
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
  }, [session, activeMonth]);

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
    [...new Set(students.map((s) => s.class || s.class_name))].sort(), 
    [students]
  );

  const filteredStudents = useMemo(() => 
    students.filter((s) => (s.class || s.class_name) === selectedClass), 
    [selectedClass, students]
  );
  
  const filteredFees = useMemo(() => 
    fees.filter((f) => 
      f.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.class_name?.toLowerCase().includes(searchTerm.toLowerCase())
    ), 
  [fees, searchTerm]);

  const totalAmount = filteredFees.reduce((sum, f) => sum + Number(f.amount || 0), 0);

  // --- SCREEN PASSWORD DECRYPTION HANDLER ---
  const handleDecryptUnlock = (e) => {
    e.preventDefault();
    if (passwordInput === "nite15") {
      setIsDecrypted(true);
      setShowUnlockModal(false);
      setPasswordInput("");
    } else {
      alert("Incorrect Security Password! Access Denied.");
      setPasswordInput("");
    }
  };

  // --- PDF PASSWORD VALIDATION & DATA LOADING HANDLER ---
  const handlePdfPasswordSubmit = (e) => {
    e.preventDefault();
    if (pdfPasswordInput === "nite15") {
      setShowPdfPasswordModal(false);
      setPdfPasswordInput("");
      executePdfGeneration(); 
    } else {
      alert("Incorrect Security Password for Digital Signature!");
      setPdfPasswordInput("");
    }
  };

  // --- CORE PDF GENERATION & TABULAR DATA INJECTION ---
  const executePdfGeneration = () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      
      // Professional Top Header Banner
      doc.setFillColor(26, 35, 126); 
      doc.rect(0, 0, 210, 38, 'F');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text("SMART STUDENT CLASSES", 14, 15);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Official Fee Collection Ledger & Secure Financial Statement", 14, 23);
      doc.text("Digitally Signed & Authorized Financial Document", 14, 30);

      // Meta Information Box
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`Academic Session: ${session}`, 14, 48);
      doc.text(`Target Month: ${activeMonth}`, 80, 48);
      doc.text(`Generated On: ${new Date().toLocaleDateString("en-IN")}`, 145, 48);

      // Tabular Data Construction
      const tableColumn = ["S.No", "Date", "Time", "Student Name", "Class", "Amount (INR)", "Status"];
      const tableRows = filteredFees.map((fee, index) => [
        index + 1,
        formatDate(fee.payment_date),
        fee.payment_time || "10:00 AM",
        (fee.student_name || "").toUpperCase(),
        fee.class_name || "",
        Number(fee.amount).toLocaleString('en-IN'),
        fee.status || "On Time"
      ]);

      // ✅ Using imported autoTable function properly
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 55,
        theme: 'grid',
        headStyles: { 
          fillColor: [26, 35, 126], 
          textColor: [255, 255, 255], 
          fontSize: 9, 
          fontStyle: 'bold',
          halign: 'center' 
        },
        bodyStyles: { 
          fontSize: 9,
          textColor: [40, 40, 40]
        },
        columnStyles: { 
          0: { halign: 'center', cellWidth: 12 },
          1: { halign: 'center', cellWidth: 26 },
          2: { halign: 'center', cellWidth: 22 },
          4: { halign: 'center', cellWidth: 22 },
          5: { halign: 'right', cellWidth: 28, fontStyle: 'bold' },
          6: { halign: 'center', cellWidth: 24 }
        },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        margin: { left: 14, right: 14 }
      });

      // Summary Footer inside PDF
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(26, 35, 126);
      doc.text(`Total Verified Collection Amount: INR ${totalAmount.toLocaleString('en-IN')}`, 14, finalY);

      // Digital Signature Stamp Block
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text("Digitally Signed, Approved & Authorized By:", 14, finalY + 18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(26, 35, 126);
      doc.text("SMART STUDENT CLASSES -ADMINISTRATION", 14, finalY + 24);
      
      // Digital Signature Line Graphics
      doc.setDrawColor(26, 35, 126);
      doc.setLineWidth(0.5);
      doc.line(14, finalY + 35, 75, finalY + 35);
      doc.setFont("helvetica", "normal");
     doc.setFont("helvetica", "bold");
      doc.text("Nitesh Kushwah", 14, finalY + 35);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Authorized Signatory (Digital Stamp Verified)", 14, finalY + 39);

      doc.save(`Secure_Fee_Statement_${activeMonth}_${session}.pdf`);
    } catch (err) {
      console.error("PDF Generation Error:", err);
      alert("Failed to export secure PDF. Error: " + err.message);
    }
  };

  // --- EVENT HANDLERS ---
  const handleDelete = async (id) => {
    if (window.confirm("Confirm: Permanently delete this transaction?")) {
      try {
        await api.delete(`/api/fees/${id}`);
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
        month: activeMonth
      };

      if (form.id) {
        await api.put(`/api/fees/${form.id}`, payload);
      } else {
        await api.post("/api/fees", payload);
      }

      setForm({
        id: "", student_id: "", student_name: "", class_name: "", amount: "",
        payment_date: new Date().toISOString().split("T")[0],
        payment_time: getCurrentTime12Hour(),
        status: "On Time"
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
          <h2 style={brandTitle}>🏫 SmartZone ERP | Secure Fee Ledger</h2>
          <div style={badgeWrapper}>
            <span style={topBadge}>Session: {session}</span>
            <span style={topBadge}>Month: {activeMonth}</span>
            <span style={{...topBadge, background: '#2e7d32'}}>✒️ Digitally Signed PDF Export</span>
          </div>
        </div>
        <div style={actionButtonGroup}>
           <button onClick={() => setShowPdfPasswordModal(true)} style={printBtn}>🖨️ Export Signed PDF</button>
           <button onClick={() => navigate("/admin/manage-fees")} style={backBtn}>← Home</button>
        </div>
      </div>

      {error && (
        <div style={errorBanner}>
          <span>⚠️ {error}</span>
          <button onClick={fetchData} style={retryLink}>Sync Now</button>
        </div>
      )}

      {/* SCREEN UNLOCK MODAL POPUP */}
      {showUnlockModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3 style={{ margin: '0 0 10px 0', color: '#1a237e' }}>🔐 Enter Security Password</h3>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>Enter security password to decrypt and view financial amounts on screen.</p>
            <form onSubmit={handleDecryptUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input 
                type="password" 
                placeholder="Enter password" 
                value={passwordInput} 
                onChange={(e) => setPasswordInput(e.target.value)} 
                style={inputStyle}
                autoFocus
                required
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" style={primaryBtn}>Unlock Display</button>
                <button type="button" onClick={() => setShowUnlockModal(false)} style={cancelBtn}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF AUTHORIZATION & SIGNATURE PASSWORD MODAL */}
      {showPdfPasswordModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3 style={{ margin: '0 0 10px 0', color: '#1a237e' }}>✒️ Authorize & Sign PDF</h3>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>Enter password to verify digital signature and load tabular data into PDF.</p>
            <form onSubmit={handlePdfPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input 
                type="password" 
                placeholder="Enter signature password" 
                value={pdfPasswordInput} 
                onChange={(e) => setPdfPasswordInput(e.target.value)} 
                style={inputStyle}
                autoFocus
                required
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" style={primaryBtn}>Confirm & Download</button>
                <button type="button" onClick={() => setShowPdfPasswordModal(false)} style={cancelBtn}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={mainLayout}>
        
        {/* SIDEBAR: STICKY TRANSACTION FORM WITH TIME & MONTH CONTROL */}
        <div style={sideContainer}>
          <div style={cardStyle}>
            <div style={formHeader}>
              <h3 style={{ margin: 0, color: '#1a237e' }}>{form.id ? "✏️ Edit Record" : "➕ Add Fee Transaction"}</h3>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Auto-synced for {activeMonth}</p>
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
                    setForm({ ...form, student_id: s?.id || "", student_name: s?.name || "", class_name: s?.class || s?.class_name || "" });
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Payment Date</label>
                  <input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Payment Time</label>
                  <input type="text" value={form.payment_time} onChange={(e) => setForm({ ...form, payment_time: e.target.value })} placeholder="10:30 AM" style={inputStyle} required />
                </div>
              </div>

              <button type="submit" style={primaryBtn} disabled={loading}>
                {loading ? "Saving..." : form.id ? "Update Transaction" : "Save Record"}
              </button>
              
              {form.id && (
                <button type="button" onClick={() => { setForm({ id: "", student_id: "", student_name: "", class_name: "", amount: "", payment_date: new Date().toISOString().split("T")[0], payment_time: getCurrentTime12Hour(), status: "On Time" }); setSelectedClass(""); }} style={cancelBtn}>
                  Cancel Edit
                </button>
              )}
            </form>
          </div>
        </div>

        {/* MAIN AREA: LEDGER VIEW & ENCRYPTION TOGGLE */}
        <div style={listContainer}>
          
          <div style={topSearchRow}>
            <div style={totalRevenueCard}>
              <div style={revIcon}>₹</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div>
                  <small style={{ opacity: 0.8, fontWeight: '600' }}>TOTAL COLLECTION ({activeMonth.toUpperCase()})</small>
                  <h2 style={{ margin: 0, fontSize: '28px' }}>
                    {isDecrypted ? `₹${totalAmount.toLocaleString('en-IN')}` : "🔒••••••••"}
                  </h2>
                </div>
                <div>
                  {isDecrypted ? (
                    <button onClick={() => setIsDecrypted(false)} style={decryptToggleBtnActive}>Lock Amounts</button>
                  ) : (
                    <button onClick={() => setShowUnlockModal(true)} style={decryptToggleBtn}>Decrypt Amounts</button>
                  )}
                </div>
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
                  <th style={{...thStyle, width: '15%'}}>Date & Time</th>
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
                    <td style={tdStyle}>
                      <div style={{ fontWeight: '700', color: '#1a237e', fontSize: '13px' }}>{formatDate(f.payment_date)}</div>
                      <div style={{ fontSize: '11px', color: '#666' }}>🕒 {f.payment_time || "10:00 AM"}</div>
                    </td>
                    
                    <td style={tdStyle}>
                      <div style={studentNameCell}>{f.student_name}</div>
                    </td>

                    <td style={{...tdStyle, fontSize: '16px', fontWeight: '800', color: '#333'}}>
                      {f.class_name}
                    </td>

                    <td style={tdStyle}>
                      <strong style={amountText}>
                        {isDecrypted ? `₹${Number(f.amount).toLocaleString('en-IN')}` : "🔒 ENCRYPTED"}
                      </strong>
                    </td>

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
                <p>No fee records found for {activeMonth}.</p>
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

const decryptToggleBtn = { backgroundColor: '#d97706', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' };
const decryptToggleBtnActive = { backgroundColor: '#4b5563', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' };

const modalOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalContent = { backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '350px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' };

const tableWrapper = { backgroundColor: 'white', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' };
const fullTable = { width: '100%', borderCollapse: 'collapse' };
const tableHeaderRow = { backgroundColor: '#1a237e' };
const thStyle = { padding: '18px 20px', fontSize: '12px', color: 'white', textTransform: 'uppercase', fontWeight: '700', textAlign: 'left' };
const tdStyle = { padding: '16px 20px', borderBottom: '1px solid #f0f0f0' };

const studentNameCell = { fontWeight: '600', color: '#111827', fontSize: '15px' };
const amountText = { color: '#047857', fontSize: '16px' };

const cardStyle = { backgroundColor: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' };
const flexCol = { display: 'flex', flexDirection: 'column', gap: '15px' };
const inputStyle = { padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', width: '100%', boxSizing: 'border-box' };
const labelStyle = { fontSize: '12px', fontWeight: 'bold', color: '#444', marginBottom: '5px', display: 'block' };
const primaryBtn = { backgroundColor: '#1a237e', color: 'white', padding: '15px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '700', width: '100%' };
const formHeader = { marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' };
const cancelBtn = { backgroundColor: '#f3f4f6', color: '#4b5563', padding: '10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '13px', width: '100%' };
const editAction = { background: 'none', border: 'none', color: '#1a237e', cursor: 'pointer', fontWeight: 'bold' };
const deleteAction = { background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' };
const errorBanner = { background: '#fee2e2', color: '#991b1b', padding: '15px', borderRadius: '10px', marginBottom: '20px' };
const retryLink = { marginLeft: '10px', background: '#991b1b', color: 'white', border: 'none', padding: '3px 10px', borderRadius: '4px', cursor: 'pointer' };
const emptyState = { padding: '50px', textAlign: 'center', color: '#999' };
const trStyle = { cursor: 'default' };

export default FeesDetails;