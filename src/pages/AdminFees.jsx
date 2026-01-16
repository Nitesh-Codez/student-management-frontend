import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";

const AdminFees = () => {
  const API_URL = process.env.REACT_APP_API_URL;

  const [students, setStudents] = useState([]);
  const [fees, setFees] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState({
    id: "",
    student_id: "",
    student_name: "",
    class_name: "",
    amount: "",
    payment_date: new Date().toISOString().split("T")[0],
    payment_time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    status: "On Time",
    payment_mode: "CASH" // 👈 NEW
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
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchData(); }, [API_URL]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const filteredFees = useMemo(() => {
    return fees.filter((f) => {
      if (!f.payment_date) return false;
      const m = f.payment_date.split("-")[1];
      return m === selectedMonth && f.student_name.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [fees, selectedMonth, searchTerm]);

  const totalMonthlyAmount = filteredFees.reduce((sum, f) => sum + Number(f.amount), 0);

  const loadMonth = (m) => {
    setSelectedMonth(String(m).padStart(2, "0"));
    setHideMonths(true);
  };

  const handleStudentSelect = (e) => {
    const s = students.find((st) => st.id === Number(e.target.value));
    setForm({ ...form, student_id: s.id, student_name: s.name, class_name: s.class });
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // 💰 CASH
      if (form.payment_mode === "CASH") {
        await axios.post(`${API_URL}/api/fees`, form);
        alert("Cash Fee Saved");
        fetchData();
        return;
      }

      // 📱 PHONEPE
      const res = await axios.post(`${API_URL}/api/fees/phonepe/pay`, {
        student_id: form.student_id,
        student_name: form.student_name,
        class_name: form.class_name,
        amount: form.amount
      });

      window.location.href = res.data.redirectUrl;

    } catch (err) {
      alert("Payment Failed");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this record?")) {
      await axios.delete(`${API_URL}/api/fees/${id}`);
      fetchData();
    }
  };

  return (
    <div style={{ background: "#f4f6f9", minHeight: "100vh", padding: 15 }}>
      <div style={{ display: "flex", justifyContent: "space-between", background: "#1a237e", color: "#fff", padding: 15, borderRadius: 10 }}>
        <h2>🏫 Admin Fee Portal</h2>
        {hideMonths && <button onClick={() => { setHideMonths(false); setSelectedMonth(""); }} style={whiteBtn}>Change Month</button>}
      </div>

      {!hideMonths && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 15, marginTop: 20 }}>
          {["January","February","March","April","May","June","July","August","September","October","November","December"]
            .map((m,i)=>(
              <button key={i} onClick={()=>loadMonth(i+1)} style={monthCard}>{m}</button>
          ))}
        </div>
      )}

      {hideMonths && (
        <div style={{ display: "flex", gap: 20, marginTop: 20 }}>
          {/* FORM */}
          <div style={{ ...cardStyle, width: 350 }}>
            <h3>➕ Add Fee</h3>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <select required onChange={handleStudentSelect} style={inputStyle}>
                <option value="">Select Student</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.class})</option>)}
              </select>

              <input type="number" placeholder="Amount" required style={inputStyle}
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
              />

              {/* PAYMENT MODE */}
              <select value={form.payment_mode}
                onChange={e => setForm({ ...form, payment_mode: e.target.value })}
                style={inputStyle}
              >
                <option value="CASH">Cash</option>
                <option value="PHONEPE">PhonePe</option>
              </select>

              <button type="submit" style={primaryBtn}>
                {form.payment_mode === "CASH" ? "Save Cash Fee" : "Pay via PhonePe"}
              </button>
            </form>
          </div>

          {/* TABLE */}
          <div style={{ flex: 1 }}>
            <div style={{ ...cardStyle, marginBottom: 15 }}>
              <strong>₹ {totalMonthlyAmount}</strong> Collection
            </div>

            <div style={cardStyle}>
              <table style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Student</th>
                    <th>Amount</th>
                    <th>Mode</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFees.map(f => (
                    <tr key={f.id}>
                      <td>{formatDate(f.payment_date)}</td>
                      <td>{f.student_name}</td>
                      <td>₹{f.amount}</td>
                      <td>{f.payment_mode}</td>
                      <td>
                        <button onClick={() => handleDelete(f.id)} style={{ color: "red" }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredFees.length === 0 && <p>No records</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ===== styles ===== */
const cardStyle = { background: "#fff", padding: 20, borderRadius: 12 };
const inputStyle = { padding: 10, borderRadius: 8, border: "1px solid #ccc" };
const primaryBtn = { background: "#1a237e", color: "#fff", padding: 12, border: "none", borderRadius: 8 };
const monthCard = { padding: 20, borderRadius: 10, border: "none", background: "#fff", cursor: "pointer" };
const whiteBtn = { padding: "8px 15px", borderRadius: 6, border: "none", fontWeight: "bold" };

export default AdminFees;
