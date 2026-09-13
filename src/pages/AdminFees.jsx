import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const AdminFees = () => {
  const { session: routeSession, month: routeMonth } = useParams();
  const navigate = useNavigate();

  // --- MONTH & SESSION SELECTION STATES ---
  const [selectedSession, setSelectedSession] = useState(routeSession || "2026-27");
  const [selectedMonth, setSelectedMonth] = useState(routeMonth || "");
  const [isMonthSelected, setIsMonthSelected] = useState(!!routeMonth);

  // --- APP STATES ---
  const [students, setStudents] = useState([]);
  const [fees, setFees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- SECURITY STATES ---
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showPdfPasswordModal, setShowPdfPasswordModal] = useState(false);
  const [pdfPasswordInput, setPdfPasswordInput] = useState("");

  const getCurrentTime12Hour = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatTime12Hour = (timeStr) => {
    if (!timeStr) return "-";
    if (timeStr.includes("AM") || timeStr.includes("PM")) return timeStr;

    const parts = timeStr.split(":");
    let h = parseInt(parts[0], 10);
    const m = parts[1] || "00";
    if (isNaN(h)) return timeStr;
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    const formattedHour = h < 10 ? `0${h}` : h;
    return `${formattedHour}:${m} ${ampm}`;
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
    payment_mode: "Online",
  });

  // --- FETCH DATA USING UPDATED API ENDPOINTS ---
  const fetchData = async () => {
    if (!selectedMonth) return;
    setLoading(true);
    setError(null);
    try {
      const [stRes, feeRes] = await Promise.all([
        api.get(`/api/students/students-basic-info`),
        api.get("/api/fees/all-fee", { params: { session: selectedSession, month: selectedMonth } }),
      ]);

      const rawStudents = stRes.data.students || stRes.data || [];
      const studentArray = Array.isArray(rawStudents) ? rawStudents : Object.values(rawStudents);
      
      const formattedStudents = studentArray.map((s, index) => ({
        ...s,
        id: s.id || s._id || index + 1,
        class: s.class || s.class_name || s.grade || s.standard || "N/A"
      }));

      setStudents(formattedStudents);
      setFees(feeRes.data.fees || feeRes.data || []);
    } catch (err) {
      console.error("Data Sync Error:", err);
      setError("Server connection failed. Please check network.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isMonthSelected) {
      fetchData();
    }
  }, [selectedSession, selectedMonth, isMonthSelected]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

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

  const handleDecryptUnlock = (e) => {
    e.preventDefault();
    if (passwordInput === "nite15") {
      setIsDecrypted(true);
      setShowUnlockModal(false);
      setPasswordInput("");
    } else {
      alert("Incorrect Security Password!");
      setPasswordInput("");
    }
  };

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

  const executePdfGeneration = () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
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

      doc.setTextColor(50, 50, 50);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`Academic Session: ${selectedSession}`, 14, 48);
      doc.text(`Target Month: ${selectedMonth}`, 80, 48);
      doc.text(`Generated On: ${new Date().toLocaleDateString("en-IN")}`, 145, 48);

      const tableColumn = ["S.No", "Date", "Time", "Student Name", "Class", "Mode", "Amount (INR)", "Status"];
      const tableRows = filteredFees.map((fee, index) => [
        index + 1,
        formatDate(fee.payment_date),
        formatTime12Hour(fee.payment_time) || "10:00 AM",
        (fee.student_name || "").toUpperCase(),
        fee.class_name || "",
        fee.payment_mode || "Online",
        Number(fee.amount).toLocaleString('en-IN'),
        fee.status === "On Time" ? "On Time" : fee.status === "Late" ? "Late" : "Early"
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 55,
        theme: 'grid',
        headStyles: { fillColor: [26, 35, 126], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontSize: 9, textColor: [40, 40, 40] },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'center', cellWidth: 24 },
          2: { halign: 'center', cellWidth: 20 },
          4: { halign: 'center', cellWidth: 18 },
          5: { halign: 'center', cellWidth: 20 },
          6: { halign: 'right', cellWidth: 26, fontStyle: 'bold' },
          7: { halign: 'center', cellWidth: 22 }
        },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        margin: { left: 14, right: 14 }
      });

      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(26, 35, 126);
      doc.text(`Total Verified Collection Amount: INR ${totalAmount.toLocaleString('en-IN')}`, 14, finalY);

      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text("Digitally Signed, Approved & Authorized By:", 14, finalY + 18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(26, 35, 126);
      doc.text("SMART STUDENT CLASSES - ADMINISTRATION", 14, finalY + 24);
      
      doc.setDrawColor(26, 35, 126);
      doc.setLineWidth(0.5);
      doc.line(14, finalY + 35, 75, finalY + 35);
      doc.text("Nitesh Kushwah", 14, finalY + 41);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Authorized Signatory (Digital Stamp Verified)", 14, finalY + 46);

      doc.save(`Secure_Fee_Statement_${selectedMonth}_${selectedSession}.pdf`);
    } catch (err) {
      alert("Failed to export secure PDF. Error: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Confirm: Permanently delete this transaction?")) {
      try {
        await api.delete(`/api/fees/delete/${id}`);
        setFees(prev => prev.filter(f => (f.id !== id && f._id !== id)));
      } catch (err) {
        console.error("Delete error:", err);
        alert("Action failed: Record could not be deleted.");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        session: selectedSession,
        month: selectedMonth,
        fee_month: selectedMonth
      };

      if (form.id) {
        await api.put(`/api/fees/update/${form.id}`, payload);
      } else {
        await api.post("/api/fees/add", payload);
      }

      setForm({
        id: "", student_id: "", student_name: "", class_name: "", amount: "",
        payment_date: new Date().toISOString().split("T")[0],
        payment_time: getCurrentTime12Hour(),
        status: "On Time",
        payment_mode: "Online"
      });
      setSelectedClass("");
      fetchData();
    } catch (err) {
      alert("Database error while saving record.");
    }
  };

  if (!isMonthSelected) {
    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: '500px', margin: '80px auto', background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
          <h2 style={{ color: '#1a237e', marginTop: 0, textAlign: 'center' }}>🏫 SmartZone Fee Ledger</h2>
          <p style={{ textAlign: 'center', color: '#666', fontSize: '14px', marginBottom: '30px' }}>Please select the Session and Month to load records & manage fees.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={labelStyle}>Academic Session</label>
              <input 
                type="text" 
                value={selectedSession} 
                onChange={(e) => setSelectedSession(e.target.value)} 
                style={inputStyle} 
                placeholder="e.g. 2026-27"
              />
            </div>
            
            <div>
              <label style={labelStyle}>Select Target Month</label>
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)} 
                style={inputStyle}
              >
                <option value="">-- Choose Month --</option>
                <option value="1">January (1)</option>
                <option value="2">February (2)</option>
                <option value="3">March (3)</option>
                <option value="4">April (4)</option>
                <option value="5">May (5)</option>
                <option value="6">June (6)</option>
                <option value="7">July (7)</option>
                <option value="8">August (8)</option>
                <option value="9">September (9)</option>
                <option value="10">October (10)</option>
                <option value="11">November (11)</option>
                <option value="12">December (12)</option>
              </select>
            </div>

            <button 
              onClick={() => { if(selectedMonth) setIsMonthSelected(true); else alert("Please select a month!"); }}
              style={{ ...primaryBtn, marginTop: '10px' }}
            >
              Continue to Fee Ledger →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={headerNav}>
        <div style={brandContainer}>
          <h2 style={brandTitle}>🏫 SmartZone | Secure Fee Ledger</h2>
          <div style={badgeWrapper}>
            <span style={topBadge}>Session: {selectedSession}</span>
            <span style={topBadge}>Month: {selectedMonth}</span>
            <span style={{...topBadge, background: '#2e7d32'}}>✒️ Signed PDF Export</span>
          </div>
        </div>
        <div style={actionButtonGroup}>
           <button onClick={() => setShowPdfPasswordModal(true)} style={printBtn}>🖨️ Export PDF</button>
           <button onClick={() => setIsMonthSelected(false)} style={backBtn}>Change Month</button>
        </div>
      </div>

      {error && (
        <div style={errorBanner}>
          <span>⚠️ {error}</span>
          <button onClick={fetchData} style={retryLink}>Sync Now</button>
        </div>
      )}

      {showUnlockModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3 style={{ margin: '0 0 10px 0', color: '#1a237e' }}>🔐 Enter Security Password</h3>
            <form onSubmit={handleDecryptUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="password" placeholder="Enter password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} style={inputStyle} autoFocus required />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" style={primaryBtn}>Unlock Display</button>
                <button type="button" onClick={() => setShowUnlockModal(false)} style={cancelBtn}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPdfPasswordModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3 style={{ margin: '0 0 10px 0', color: '#1a237e' }}>✒️ Authorize & Sign PDF</h3>
            <form onSubmit={handlePdfPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="password" placeholder="Enter signature password" value={pdfPasswordInput} onChange={(e) => setPdfPasswordInput(e.target.value)} style={inputStyle} autoFocus required />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" style={primaryBtn}>Confirm & Download</button>
                <button type="button" onClick={() => setShowPdfPasswordModal(false)} style={cancelBtn}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={mainLayout}>
        <div style={sideContainer}>
          <div style={cardStyle}>
            <div style={formHeader}>
              <h3 style={{ margin: 0, color: '#1a237e' }}>{form.id ? "✏️ Edit Record" : "➕ Add Fee"}</h3>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Session: {selectedSession} | Month: {selectedMonth}</p>
            </div>
           
            <form onSubmit={handleSubmit} style={flexCol}>
              <div>
                <label style={labelStyle}>Class Category</label>
                <select value={selectedClass} onChange={(e) => { setSelectedClass(e.target.value); setForm({ ...form, student_id: "", student_name: "", class_name: "" }); }} style={inputStyle}>
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
                    <option value="On Time">On Time</option>
                    <option value="Late">Late</option>
                    <option value="Early">Early</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Payment Mode</label>
                <select value={form.payment_mode} onChange={(e) => setForm({ ...form, payment_mode: e.target.value })} style={inputStyle}>
                  <option value="Online">Online</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Payment Date</label>
                  <input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Payment Time</label>
                  <input type="text" value={form.payment_time} onChange={(e) => setForm({ ...form, payment_time: e.target.value })} style={inputStyle} required />
                </div>
              </div>

              <button type="submit" style={primaryBtn} disabled={loading}>
                {loading ? "Saving..." : form.id ? "Update Transaction" : "Save Record"}
              </button>
            </form>
          </div>
        </div>

        <div style={listContainer}>
          <div style={topSearchRow}>
            <div style={totalRevenueCard}>
              <div style={revIcon}>₹</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div>
                  <small style={{ opacity: 0.8, fontWeight: '600' }}>TOTAL COLLECTION (MONTH {selectedMonth})</small>
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
                placeholder="Search by student name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={searchInput}
              />
            </div>
          </div>

          <div style={tableWrapper}>
            <div style={{ padding: '16px 20px', backgroundColor: '#1a237e', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '600', fontSize: '14px' }}>
                Showing Records for Month: <span style={{ color: '#93c5fd' }}>{selectedMonth}</span> ({filteredFees.length} Entries)
              </span>
            </div>
            <table style={fullTable}>
              <thead>
                <tr style={tableHeaderRow}>
                  <th style={{...thStyle, width: '15%'}}>Date & Time</th>
                  <th style={{...thStyle, width: '25%'}}>Student Name</th>
                  <th style={{...thStyle, width: '12%'}}>Class</th>
                  <th style={{...thStyle, width: '12%'}}>Mode</th>
                  <th style={{...thStyle, width: '13%'}}>Amount</th>
                  <th style={{...thStyle, width: '13%'}}>Status</th>
                  <th style={{...thStyle, width: '10%'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFees.map((f, index) => (
                  <tr key={f.id || f._id} style={{...trStyle, backgroundColor: index % 2 === 0 ? '#ffffff' : '#fcfcfc'}}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: '700', color: '#1a237e', fontSize: '13px' }}>{formatDate(f.payment_date)}</div>
                      <div style={{ fontSize: '11px', color: '#666' }}>🕒 {formatTime12Hour(f.payment_time)}</div>
                    </td>
                    <td style={tdStyle}><div style={studentNameCell}>{f.student_name}</div></td>
                    <td style={{...tdStyle, fontSize: '14px', fontWeight: '700'}}>{f.class_name}</td>
                    <td style={tdStyle}>
                      <span style={{ background: f.payment_mode === 'Cash' ? '#fef3c7' : '#e0e7ff', color: f.payment_mode === 'Cash' ? '#92400e' : '#3730a3', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                        {f.payment_mode || "Online"}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: '800', color: isDecrypted ? '#2e7d32' : '#c62828', fontSize: '13px' }}>
                        {isDecrypted ? `₹${Number(f.amount || 0).toLocaleString('en-IN')}` : "🔒 ENCRYPTED"}
                      </div>
                    </td>
                    <td style={{...tdStyle, fontWeight: '700', color: f.status === 'On Time' ? '#2e7d32' : '#d32f2f'}}>
                      {f.status === 'On Time' ? 'On Time' : f.status === 'Late' ? 'Late' : 'Early'}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={() => { 
                          setForm({
                            ...f,
                            student_id: f.student_id || students.find(st => st.name === f.student_name)?.id || ""
                          }); 
                          setSelectedClass(f.class_name); 
                        }} style={editAction}>Edit</button>
                        <button onClick={() => handleDelete(f.id || f._id)} style={actionDeleteBtn}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredFees.length === 0 && !loading && (
              <div style={emptyState}><p>No fee records found for Month {selectedMonth}.</p></div>
            )}
            {loading && <div style={{padding: '40px', textAlign: 'center', color: '#1a237e'}}>Synchronizing Database...</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- STYLES ---
const containerStyle = { background: "#f3f4f6", minHeight: "100vh", padding: "30px", fontFamily: "'Inter', sans-serif" };
const headerNav = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', backgroundColor: '#1a237e', padding: '20px 40px', borderRadius: '16px', color: 'white', boxShadow: '0 10px 30px rgba(26,35,126,0.25)' };
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
const cardStyle = { backgroundColor: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' };
const flexCol = { display: 'flex', flexDirection: 'column', gap: '15px' };
const inputStyle = { padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', width: '100%', boxSizing: 'border-box' };
const labelStyle = { fontSize: '12px', fontWeight: 'bold', color: '#444', marginBottom: '5px', display: 'block' };
const primaryBtn = { backgroundColor: '#1a237e', color: 'white', padding: '15px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '700', width: '100%' };
const formHeader = { marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' };
const cancelBtn = { backgroundColor: '#f3f4f6', color: '#4b5563', padding: '10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '13px', width: '100%' };
const editAction = { background: 'none', border: 'none', color: '#1a237e', cursor: 'pointer', fontWeight: 'bold' };
const actionDeleteBtn = { background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' };
const errorBanner = { background: '#fee2e2', color: '#991b1b', padding: '15px', borderRadius: '10px', marginBottom: '20px' };
const retryLink = { marginLeft: '10px', background: '#991b1b', color: 'white', border: 'none', padding: '3px 10px', borderRadius: '4px', cursor: 'pointer' };
const emptyState = { padding: '50px', textAlign: 'center', color: '#999' };
const trStyle = { cursor: 'default' };

export default AdminFees;