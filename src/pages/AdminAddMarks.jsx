import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaGraduationCap, FaSearch, FaSave, FaEdit, FaPlusCircle, FaFilter, FaUser } from "react-icons/fa";

const API_URL = "https://student-management-system-4-hose.onrender.com";

const AdminAddMarks = () => {
  const subjectsByClass = {
    "1st": ["Math","English","Hindi","EVS","Math Viva","English Viva","Hindi Viva","EVS Viva"],
    "2nd": ["Math","English","Hindi","EVS","Math Viva","English Viva","Hindi Viva","EVS Viva"],
    "3rd": ["Math","English","Hindi","EVS","Math Viva","English Viva","Hindi Viva","EVS Viva"],
    "4th": ["Math","English","Hindi","EVS","Math Viva","English Viva","Hindi Viva","EVS Viva"],
    "5th": ["Math","English","Hindi","EVS","Math Viva","English Viva","Hindi Viva","EVS Viva"],
    "6th": ["Math","English","Hindi","Science","Math Viva","English Viva","Hindi Viva","Science Viva"],
    "7th": ["Math","English","Hindi","Science","Civics","Geography","Economics","History", "Math Viva","English Viva","Hindi Viva","Science Viva","Civics Viva","Geography Viva","Economics Viva","History Viva"],
    "8th": ["Math","English","Science","Hindi","Civics","Geography","Economics","History", "Math Viva","English Viva","Science Viva","Hindi Viva","Civics Viva","Geography Viva","Economics Viva","History Viva"],
    "9th": ["Math","English","Hindi","Science","S.S.T","Math Viva","English Viva","Hindi Viva","Science Viva","S.S.T Viva"],
    "10th":["Math","English","Hindi","Science","S.S.T","Math Viva","English Viva","Hindi Viva","Science Viva","S.S.T Viva"],
    "11th":["Chemistry","Math","English","Physics","Biology","Chemistry Viva","Math Viva","English Viva","Physics Viva","Biology Viva"],
  };

  const [allStudents, setAllStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [subject, setSubject] = useState("");
  const [marks, setMarks] = useState("");
  const [maxMarks, setMaxMarks] = useState("");
  const [testDate, setTestDate] = useState(new Date().toISOString().split("T")[0]);
  const [message, setMessage] = useState({ text: "", type: "" });

  const [allMarks, setAllMarks] = useState([]);
  const [searchClass, setSearchClass] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [searchName, setSearchName] = useState(""); // 🆕 New Filter State
  const [secretKey, setSecretKey] = useState("");


  const [editId, setEditId] = useState(null);
  const [editMarks, setEditMarks] = useState("");
  const [editTotal, setEditTotal] = useState("");

  useEffect(() => {
    axios.get(`${API_URL}/api/students`).then(res => {
      if (res.data.success) {
        setAllStudents(res.data.students);
        setClasses([...new Set(res.data.students.map(s => s.class))]);
      }
    });
  }, []);

  useEffect(() => {
    setStudents(selectedClass ? allStudents.filter(s => s.class === selectedClass) : []);
  }, [selectedClass, allStudents]);

  const fetchAllMarks = async () => {
    const res = await axios.get(`${API_URL}/api/marks/admin/marks`);
    if (res.data.success) setAllMarks(res.data.data);
  };

  useEffect(() => { fetchAllMarks(); }, []);

  // 🔥 ADVANCED FILTER LOGIC
  const searchedMarks = allMarks.filter(m => {
    const matchesClass = searchClass ? m.class === searchClass : true;
    const matchesDate = searchDate ? new Date(m.test_date).toISOString().split("T")[0] === searchDate : true;
    const matchesName = searchName ? m.name.toLowerCase().includes(searchName.toLowerCase()) : true;
    return matchesClass && matchesDate && matchesName;
  });

  const handleAddMarks = async () => {
    if (!selectedStudent || !subject || !marks || !maxMarks) {
      return setMessage({ text: "Please fill all fields!", type: "error" });
    }
    const res = await axios.post(`${API_URL}/api/marks/add`, {
      studentId: selectedStudent, subject, marks: +marks, maxMarks: +maxMarks, date: testDate
    });
    if (res.data.success) {
      setMessage({ text: "Marks Added Successfully!", type: "success" });
      setMarks(""); setMaxMarks("");
      fetchAllMarks();
      setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    }
  };

 const handleUpdate = async (record) => {
  try {
    await axios.put(
      `${API_URL}/api/marks/admin/marks/${record.id}`,
      {
        subject: record.subject,
        marks: +editMarks,
        maxMarks: +editTotal,
        date: record.test_date
      },
      {
        headers: {
          "x-head-secret": secretKey
        }
      }
    );

    setEditId(null);
    setSecretKey("");
    fetchAllMarks();
    setMessage({ text: "Record Updated Successfully!", type: "success" });
    setTimeout(() => setMessage({ text: "", type: "" }), 3000);

  } catch (err) {
    setMessage({ text: "Only HEAD can edit marks!", type: "error" });
    setTimeout(() => setMessage({ text: "", type: "" }), 3000);
  }
};


  return (
    <div style={styles.page}>
      <div style={styles.container}>
        
        {/* HEADER */}
        <div style={styles.header}>
          <FaGraduationCap size={40} color="#4f46e5" />
          <h2 style={styles.heading}>Admin Marks Dashboard</h2>
          <p style={styles.subText}>Current Session: {new Date().getFullYear()}</p>
        </div>

        {message.text && (
          <div style={message.type === "error" ? styles.errorMsg : styles.successMsg}>
            {message.text}
          </div>
        )}

        {/* 1. ADD MARKS SECTION */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}><FaPlusCircle /> Add Marks</h3>
          <div style={styles.grid}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Class</label>
              <select style={styles.input} value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                <option value="">Select Class</option>
                {classes.map((c, i) => <option key={i}>{c}</option>)}
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Student</label>
              <select style={styles.input} value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
                <option value="">Select Student</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Subject</label>
              <select style={styles.input} value={subject} onChange={e => setSubject(e.target.value)}>
                <option value="">Select Subject</option>
                {subjectsByClass[selectedClass]?.map((s, i) => <option key={i}>{s}</option>)}
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Marks</label>
              <input style={styles.input} type="number" value={marks} onChange={e => setMarks(e.target.value)} />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Total</label>
              <input style={styles.input} type="number" value={maxMarks} onChange={e => setMaxMarks(e.target.value)} />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Date</label>
              <input style={styles.input} type="date" value={testDate} onChange={e => setTestDate(e.target.value)} />
            </div>
          </div>
          <button style={styles.mainButton} onClick={handleAddMarks}>Save Entry</button>
        </div>

        {/* 2. FILTER SECTION */}
        <div style={styles.searchBox}>
          <h4 style={styles.cardTitle}><FaFilter /> Search & Filter Records</h4>
          <div style={styles.grid3}>
            <div style={styles.inputGroup}>
               <input 
                style={styles.input} 
                placeholder="Search Student Name..." 
                value={searchName} 
                onChange={e => setSearchName(e.target.value)} 
               />
            </div>
            <select style={styles.input} value={searchClass} onChange={e => setSearchClass(e.target.value)}>
              <option value="">All Classes</option>
              {classes.map((c, i) => <option key={i}>{c}</option>)}
            </select>
            <input style={styles.input} type="date" value={searchDate} onChange={e => setSearchDate(e.target.value)} />
          </div>
        </div>

        {/* 3. TABLE SECTION */}
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>Student Name</th>
                <th style={styles.th}>Class</th>
                <th style={styles.th}>Subject</th>
                <th style={styles.th}>Marks</th>
                <th style={styles.th}>Total</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {searchedMarks.map(m => (
                <tr key={m.id} style={styles.tr}>
                  <td style={styles.td}><b>{m.name}</b></td>
                  <td style={styles.td}>{m.class}</td>
                  <td style={styles.td}><span style={styles.subjectPill}>{m.subject}</span></td>
                  <td style={styles.td}>
                    {editId === m.id ? <input style={styles.editIn} value={editMarks} onChange={e => setEditMarks(e.target.value)} /> : m.obtained_marks}
                  </td>
                  <td style={styles.td}>
                    {editId === m.id ? <input style={styles.editIn} value={editTotal} onChange={e => setEditTotal(e.target.value)} /> : m.total_marks}
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusTag, 
                      backgroundColor: m.status === 'Pass' ? '#dcfce7' : '#fee2e2',
                      color: m.status === 'Pass' ? '#15803d' : '#b91c1c'
                    }}>
                      {m.status}
                    </span>
                  </td>
                  <td style={styles.td}>{new Date(m.test_date).toLocaleDateString()}</td>
                  <td style={styles.td}>
                    {editId === m.id ? (
  <button style={styles.saveBtn} onClick={() => handleUpdate(m)}><FaSave /> Save</button>
) : (
                      <button
  style={styles.editBtn}
  onClick={() => {
    const key = prompt("Enter Head Secret Key");
    if (!key) {
      alert("Secret key required!");
      return;
    }
    setSecretKey(key);
    setEditId(m.id);
    setEditMarks(m.obtained_marks);
    setEditTotal(m.total_marks);
  }}
>
  <FaEdit /> Edit
</button>

                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: { background: "#f1f5f9", minHeight: "100vh", padding: "30px 10px" },
  container: { maxWidth: "1200px", margin: "0 auto" },
  header: { textAlign: "center", marginBottom: "30px" },
  heading: { margin: "5px 0", color: "#1e293b", fontSize: "28px" },
  subText: { color: "#64748b", margin: 0 },
  card: { background: "#fff", padding: "25px", borderRadius: "15px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", marginBottom: "25px" },
  cardTitle: { marginTop: 0, marginBottom: "20px", fontSize: "18px", display: "flex", alignItems: "center", gap: "8px", color: "#4f46e5" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "15px" },
  grid3: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "15px" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "5px" },
  label: { fontSize: "13px", fontWeight: "600", color: "#475569" },
  input: { padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none" },
  mainButton: { width: "100%", marginTop: "20px", padding: "12px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer" },
  searchBox: { background: "#e2e8f0", padding: "20px", borderRadius: "15px", marginBottom: "25px" },
  tableWrapper: { background: "#fff", borderRadius: "15px", overflowX: "auto", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" },
  table: { width: "100%", borderCollapse: "collapse" },
  thRow: { background: "#f8fafc", borderBottom: "2px solid #e2e8f0" },
  th: { padding: "15px", textAlign: "left", fontSize: "14px", color: "#64748b" },
  tr: { borderBottom: "1px solid #f1f5f9" },
  td: { padding: "15px", fontSize: "14px", color: "#334155" },
  subjectPill: { background: "#eef2ff", color: "#4f46e5", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" },
  statusTag: { padding: "4px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: "700" },
  editIn: { width: "50px", padding: "4px", border: "1px solid #4f46e5", borderRadius: "4px" },
  editBtn: { border: "none", background: "#f1f5f9", padding: "6px 12px", borderRadius: "6px", cursor: "pointer" },
  saveBtn: { border: "none", background: "#dcfce7", color: "#15803d", padding: "6px 12px", borderRadius: "6px", cursor: "pointer" },
  successMsg: { padding: "12px", background: "#dcfce7", color: "#15803d", borderRadius: "8px", marginBottom: "15px", textAlign: "center" },
  errorMsg: { padding: "12px", background: "#fee2e2", color: "#b91c1c", borderRadius: "8px", marginBottom: "15px", textAlign: "center" }
};

export default AdminAddMarks;