import React, { useState, useEffect } from "react";
import axios from "axios";

const AdminFees = () => {
  const API_URL = process.env.REACT_APP_API_URL;
  const [students, setStudents] = useState([]);
  const [fees, setFees] = useState([]);
  const [form, setForm] = useState({
    id: "", // for edit
    student_id: "",
    student_name: "",
    class_name: "",
    amount: "",
    payment_date: "",
    payment_time: "",
    status: "On Time"
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const studentsRes = await axios.get(`${API_URL}/api/students`);
      if (studentsRes.data.success) setStudents(studentsRes.data.students);

      const feesRes = await axios.get(`${API_URL}/api/fees`);
      if (feesRes.data.success) setFees(feesRes.data.fees);
    } catch (err) {
      console.log("Error fetching data:", err);
    }
  };

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      if (form.id) {
        // Edit existing fee
        const res = await axios.put(`${API_URL}/api/fees/${form.id}`, form);
        if (res.data.success) alert(res.data.message);
      } else {
        // Add new fee
        const res = await axios.post(`${API_URL}/api/fees`, form);
        if (res.data.success) alert(res.data.message);
      }
      setForm({
        id: "",
        student_id: "",
        student_name: "",
        class_name: "",
        amount: "",
        payment_date: "",
        payment_time: "",
        status: "On Time"
      });
      fetchData();
    } catch (err) {
      console.log("Error submitting fee:", err);
    }
  };

  const handleEdit = fee => {
    setForm({
      id: fee.id,
      student_id: fee.student_id,
      student_name: fee.student_name,
      class_name: fee.class_name,
      amount: fee.amount,
      payment_date: fee.payment_date,
      payment_time: fee.payment_time,
      status: fee.status
    });
  };

  const handleDelete = async id => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      try {
        const res = await axios.delete(`${API_URL}/api/fees/${id}`);
        if (res.data.success) {
          alert(res.data.message);
          fetchData();
        }
      } catch (err) {
        console.log("Error deleting fee:", err);
      }
    }
  };

  const formatDate = dateStr =>
    new Date(dateStr).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  const formatTime = timeStr => {
    const [hour, minute] = timeStr.split(":");
    const date = new Date();
    date.setHours(hour, minute);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div style={{ padding: "40px", fontFamily: "Arial, sans-serif", background: "#f9f9f9", minHeight: "100vh" }}>
      <h2 style={{ marginBottom: "25px", color: "#1f3c88", textAlign: "center" }}>Admin - Add/Edit Fees</h2>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ marginBottom: "40px", display: "flex", flexWrap: "wrap", gap: "15px", justifyContent: "center" }}>
        <select
          name="student_id"
          value={form.student_id}
          onChange={e => {
            const s = students.find(st => st.id === +e.target.value);
            setForm({ ...form, student_id: e.target.value, student_name: s?.name, class_name: s?.class });
          }}
          style={{ padding: "10px", borderRadius: "8px", minWidth: "200px", border: "1px solid #ccc" }}
        >
          <option value="">Select Student</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.name} - {s.class}</option>)}
        </select>

        <input type="number" name="amount" placeholder="Amount" value={form.amount} onChange={handleChange} required style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc", minWidth: "120px" }} />

        <input type="date" name="payment_date" value={form.payment_date} onChange={handleChange} required style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }} />

        <input type="time" name="payment_time" value={form.payment_time} onChange={handleChange} required style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }} />

        <select name="status" value={form.status} onChange={handleChange} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}>
          <option value="On Time">On Time</option>
          <option value="Late">Late</option>
          <option value="Early">Early</option>
        </select>

        <button type="submit" style={{ padding: "10px 20px", borderRadius: "8px", background: "#1f3c88", color: "#fff", border: "none", cursor: "pointer" }}>
          {form.id ? "Update Fee" : "Add Fee"}
        </button>
      </form>

      {/* Fee Records Table */}
      <h3 style={{ marginBottom: "20px", color: "#1f3c88", textAlign: "center" }}>All Fee Records</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "10px", overflow: "hidden", boxShadow: "0 5px 20px rgba(0,0,0,0.1)" }}>
        <thead>
          <tr style={{ background: "#3959a1", color: "#fff", textAlign: "left" }}>
            <th style={{ padding: "12px 15px" }}>Date</th>
            <th style={{ padding: "12px 15px" }}>Time</th>
            <th style={{ padding: "12px 15px" }}>Student</th>
            <th style={{ padding: "12px 15px" }}>Class</th>
            <th style={{ padding: "12px 15px" }}>Amount</th>
            <th style={{ padding: "12px 15px" }}>Status</th>
            <th style={{ padding: "12px 15px" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {fees.map(f => (
            <tr key={f.id} style={{ background: f.status==="Late"?"#f8d7da":f.status==="Early"?"#d1ecf1":"#d4edda", fontWeight: "500" }}>
              <td style={{ padding: "10px 15px" }}>{formatDate(f.payment_date)}</td>
              <td style={{ padding: "10px 15px" }}>{formatTime(f.payment_time)}</td>
              <td style={{ padding: "10px 15px" }}>{f.student_name}</td>
              <td style={{ padding: "10px 15px" }}>{f.class_name}</td>
              <td style={{ padding: "10px 15px" }}>₹ {f.amount}</td>
              <td style={{ padding: "10px 15px", fontWeight:"600" }}>{f.status}</td>
              <td style={{ padding: "10px 15px" }}>
                <button onClick={() => handleEdit(f)} style={{ marginRight: "10px", padding:"5px 10px" }}>Edit</button>
                <button onClick={() => handleDelete(f.id)} style={{ padding:"5px 10px", background:"#f44336", color:"#fff", border:"none", borderRadius:"5px"}}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminFees;
