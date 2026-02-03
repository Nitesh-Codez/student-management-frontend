import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "https://student-management-system-4-hose.onrender.com";

const ApplyCorrection = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const student = state?.profile;

  const [selectedFields, setSelectedFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [previousRequests, setPreviousRequests] = useState([]);

  const availableFields = [
    { label: "Full Name", key: "name" },
    { label: "Father's Name", key: "father_name" },
    { label: "Mother's Name", key: "mother_name" },
    { label: "Date of Birth", key: "dob" },
    { label: "Gender", key: "gender" },
    { label: "Category", key: "category" },
    { label: "Mobile No.", key: "mobile" },
    { label: "Email ID", key: "email" },
    { label: "Aadhaar No.", key: "aadhaar" },
    { label: "Blood Group", key: "blood_group" },
    { label: "Address", key: "address" },
    { label: "City", key: "city" },
    { label: "District", key: "district" },
    { label: "State", key: "state" },
    { label: "Pincode", key: "pincode" },
  ];

  const getFormattedDate = (dateStr) => {
    const d = dateStr ? new Date(dateStr) : new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const fetchPreviousRequests = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/students/pending-edit-requests`);
      if (student && res.data.requests) {
        const studentRequests = res.data.requests.filter(r => r.student_id === student.id);
        setPreviousRequests(studentRequests);
      }
    } catch (err) {
      console.error("Error fetching previous requests:", err.message);
    }
  };

  useEffect(() => {
    if (student) fetchPreviousRequests();
  }, [student]);

  if (!student) {
    return <p style={{ textAlign: "center", color: "red", marginTop: "50px" }}>No student data found.</p>;
  }

  const isFieldLocked = (fieldKey) => {
    return previousRequests.find(r => r.field_name === fieldKey && r.status === "pending");
  };

  const handleCheckboxChange = (fieldKey) => {
    if (isFieldLocked(fieldKey)) return;
    if (selectedFields.includes(fieldKey)) {
      setSelectedFields(selectedFields.filter(f => f !== fieldKey));
      const newFormData = { ...formData };
      delete newFormData[fieldKey];
      setFormData(newFormData);
    } else {
      if (selectedFields.length >= 3) {
        alert("Maximum 3 corrections allowed.");
        return;
      }
      setSelectedFields([...selectedFields, fieldKey]);
      setFormData({ ...formData, [fieldKey]: "" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedFields.length === 0) return alert("Please select a field.");
    if (!reason.trim()) return alert("Reason is required.");

    try {
      setSubmitting(true);
      const requests = selectedFields.map(field =>
        axios.post(`${API_URL}/api/students/request-edit`, {
          student_id: student.id,
          field_name: field,
          requested_value: formData[field],
          reason: reason,
        })
      );
      await Promise.all(requests);
      setSuccess("Sent to HOC successfully! ✅");
      setTimeout(() => navigate(-1), 2500);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
      fetchPreviousRequests();
    }
  };

  return (
    <div style={container}>
      <div style={headerFlex}>
        <div style={studentInfoSide}>
          <img src={student.profile_photo || "https://via.placeholder.com/100"} alt="Student" style={studentPhoto} />
          <div style={{fontSize:"13px", color:"#555"}}>
            <p style={{margin:"2px 0"}}><b>ID:</b> {student.code}</p>
            <p style={{margin:"2px 0"}}><b>Name:</b> {student.name}</p>
          </div>
        </div>
        <div style={institutionSide}>
          <h2 style={brandName}>Smart Students Classes</h2>
          <p style={subHeader}>Application for Record Correction</p>
          <p style={dateLine}><b>Date:</b> {getFormattedDate()}</p>
        </div>
      </div>
      <div style={divider}></div>

      <div style={appContent}>
        <p style={addressTo}>To,<br/><b>The Head of Center (HOC)</b>,<br/>Smart Students Classes.</p>
        <p style={subjectLine}><b>Subject: Request for correction in my personal details.</b></p>
        <p style={salutation}>Respected Sir/Ma'am,</p>
        <p style={mainPara}>
          I, <b>{student.name}</b>, am writing to request a correction in my official records (Max 3):
        </p>

        <div style={checkboxContainer}>
          {availableFields.map((field) => {
            const locked = isFieldLocked(field.key);
            return (
              <label key={field.key} style={checkboxLabel}>
                <input
                  type="checkbox"
                  style={{marginRight:"8px"}}
                  checked={selectedFields.includes(field.key)}
                  onChange={() => handleCheckboxChange(field.key)}
                  disabled={locked}
                />
                {field.label} {locked && "(Locked)"}
              </label>
            );
          })}
        </div>

        {selectedFields.length > 0 && (
          <div style={tableWrapper}>
            <table style={table}>
              <thead>
                <tr style={tableHead}>
                  <th style={th}>Field</th>
                  <th style={th}>Current</th>
                  <th style={th}>New Value</th>
                </tr>
              </thead>
              <tbody>
                {selectedFields.map((fieldKey) => (
                  <tr key={fieldKey}>
                    <td style={td}><b>{fieldKey.toUpperCase()}</b></td>
                    <td style={td}>{student[fieldKey] || "N/A"}</td>
                    <td style={td}>
                      <input
                        type={fieldKey === 'dob' ? 'date' : 'text'}
                        style={tableInput}
                        value={formData[fieldKey]}
                        onChange={(e) => setFormData({...formData, [fieldKey]: e.target.value})}
                        required
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {previousRequests.length > 0 && (
          <div style={{marginTop:"30px"}}>
            <h4>Previous Requests:</h4>
            <table style={table}>
              <thead>
                <tr style={tableHead}>
                  <th style={th}>Field</th>
                  <th style={th}>Value</th>
                  <th style={th}>Status</th>
                  <th style={th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {previousRequests.map((r) => (
                  <tr key={r.id}>
                    <td style={td}>{r.field_name.toUpperCase()}</td>
                    <td style={td}>{r.requested_value}</td>
                    <td style={{...td, color: r.status === 'pending' ? 'orange' : 'green'}}>{r.status}</td>
                    <td style={td}>{getFormattedDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{marginTop:"20px"}}>
          <label style={{fontSize:"14px", fontWeight:"bold"}}>Reason:</label>
          <textarea
            style={reasonInput}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>

        <button onClick={handleSubmit} disabled={submitting} style={submitBtn}>
          {submitting ? "Processing..." : "Submit to HOC"}
        </button>

        {success && <div style={successBox}>{success}</div>}

        <div style={signature}>
          <p>Sincerely,</p>
          <p style={{marginTop:"20px"}}><b>{student.name}</b></p>
        </div>
      </div>
    </div>
  );
};

// Styles (DITTO SAME)
const container = { maxWidth:"800px", margin:"40px auto", padding:"40px", background:"#fff", borderRadius:"2px", boxShadow:"0 0 20px rgba(0,0,0,0.1)", fontFamily:"'Times New Roman', Times, serif", border:"1px solid #ddd" };
const headerFlex = { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"10px" };
const studentInfoSide = { textAlign:"left" };
const institutionSide = { textAlign:"right" };
const studentPhoto = { width:"90px", height:"90px", objectFit:"cover", borderRadius:"4px", border:"2px solid #eee", marginBottom:"5px" };
const brandName = { color:"#4f46e5", margin:"0", fontSize:"24px", fontWeight:"bold", textTransform:"uppercase" };
const subHeader = { margin:"2px 0", fontSize:"14px", color:"#666" };
const dateLine = { fontSize:"15px", marginTop:"10px" };
const divider = { height:"2px", background:"#4f46e5", marginBottom:"20px" };
const appContent = { lineHeight:"1.6", color:"#222" };
const addressTo = { marginBottom:"20px" };
const subjectLine = { textDecoration:"underline", marginBottom:"20px", fontSize:"16px" };
const salutation = { marginBottom:"10px" };
const mainPara = { marginBottom:"20px", textAlign:"justify" };
const checkboxContainer = { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"12px", background:"#f9f9f9", padding:"15px", borderRadius:"8px", marginBottom:"20px" };
const checkboxLabel = { fontSize:"13px", cursor:"pointer", display:"flex", alignItems:"center" };
const tableWrapper = { marginTop:"20px", border:"1px solid #ccc" };
const table = { width:"100%", borderCollapse:"collapse" };
const tableHead = { background:"#f2f2f2" };
const th = { padding:"12px", border:"1px solid #ccc", fontSize:"14px", textAlign:'left' };
const td = { padding:"10px", border:"1px solid #ccc", fontSize:"14px" };
const tableInput = { width:"95%", padding:"5px", border:"1px solid #4f46e5", borderRadius:"3px" };
const reasonInput = { width:"100%", height:"70px", padding:"10px", marginTop:"5px", borderRadius:"4px", border:"1px solid #ccc", boxSizing:"border-box" };
const submitBtn = { width:"100%", marginTop:"25px", padding:"15px", background:"#4f46e5", color:"white", border:"none", borderRadius:"4px", cursor:"pointer", fontWeight:"bold", fontSize:"16px" };
const successBox = { marginTop:"15px", padding:"10px", background:"#dcfce7", color:"#166534", borderRadius:"4px", textAlign:"center", fontWeight:"bold" };
const signature = { marginTop:"40px", textAlign:"left" };

export default ApplyCorrection;