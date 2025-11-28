import React, { useState, useEffect } from "react";
import axios from "axios";

const AdminFees = () => {
  const API_URL = process.env.REACT_APP_API_URL;
  const [students, setStudents] = useState([]);
  const [fees, setFees] = useState([]);
  const [form, setForm] = useState({
    id: "",
    student_id: "",
    student_name: "",
    class_name: "",
    amount: "",
    payment_date: "",
    payment_time: "",
    status: "On Time"
  });

  // Fetch data inside useEffect to remove ESLint warning
  useEffect(() => {
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

    fetchData();
  }, [API_URL]);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      if (form.id) {
        const res = await axios.put(`${API_URL}/api/fees/${form.id}`, form);
        if (res.data.success) alert(res.data.message);
      } else {
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

      // Refetch data after submit
      const feesRes = await axios.get(`${API_URL}/api/fees`);
      if (feesRes.data.success) setFees(feesRes.data.fees);
    } catch (err) {
      console.log("Error submitting fee:", err);
    }
  };

  const handleEdit = fee => setForm({ ...fee });

  const handleDelete = async id => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      try {
        const res = await axios.delete(`${API_URL}/api/fees/${id}`);
        if (res.data.success) {
          alert(res.data.message);
          const feesRes = await axios.get(`${API_URL}/api/fees`);
          if (feesRes.data.success) setFees(feesRes.data.fees);
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
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", background: "#f9f9f9", minHeight: "100vh" }}>
      <h2 style={{ marginBottom: "20px", color: "#1f3c88", textAlign: "center" }}>Admin - Add/Edit Fees</h2>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        style={{
          marginBottom: "30px",
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          justifyContent: "center"
        }}
      >
        <select
          name="student_id"
          value={form.student_id}
          onChange={e => {
            const s = students.find(st => st.id === +e.target.value);
            setForm({ ...form, student_id: e.target.value, student_name: s?.name, class_name: s?.class });
          }}
          style={{ padding: "10px", borderRadius: "6px", minWidth: "150px", flex: "1" }}
        >
          <option value="">Select Student</option>
          {students.map(s => (
            <option key={s.id} value={s.id}>
              {s.name} - {s.class}
            </option>
          ))}
        </select>

        <input
          type="number"
          name="amount"
          placeholder="Amount"
          value={form.amount}
          onChange={handleChange}
          required
          style={{ padding: "10px", borderRadius: "6px", flex: "1", minWidth: "100px" }}
        />

        <input
          type="date"
          name="payment_date"
          value={form.payment_date}
          onChange={handleChange}
          required
          style={{ padding: "10px", borderRadius: "6px", flex: "1" }}
        />

        <input
          type="time"
          name="payment_time"
          value={form.payment_time}
          onChange={handleChange}
          required
          style={{ padding: "10px", borderRadius: "6px", flex: "1" }}
        />

        <select name="status" value={form.status} onChange={handleChange} style={{ padding: "10px", borderRadius: "6px", flex: "1" }}>
          <option value="On Time">On Time</option>
          <option value="Late">Late</option>
          <option value="Early">Early</option>
        </select>

        <button
          type="submit"
          style={{
            padding: "10px 15px",
            borderRadius: "6px",
            background: "#1f3c88",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            flex: "1",
            minWidth: "100px"
          }}
        >
          {form.id ? "Update Fee" : "Add Fee"}
        </button>
      </form>

      {/* Fee Records Table */}
      <h3 style={{ marginBottom: "15px", color: "#1f3c88", textAlign: "center" }}>All Fee Records</h3>
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: "600px",
            background: "#fff",
            borderRadius: "8px",
            boxShadow: "0 5px 20px rgba(0,0,0,0.1)"
          }}
        >
          <thead>
            <tr style={{ background: "#3959a1", color: "#fff", textAlign: "left" }}>
              <th style={{ padding: "10px" }}>Date</th>
              <th style={{ padding: "10px" }}>Time</th>
              <th style={{ padding: "10px" }}>Student</th>
              <th style={{ padding: "10px" }}>Class</th>
              <th style={{ padding: "10px" }}>Amount</th>
              <th style={{ padding: "10px" }}>Status</th>
              <th style={{ padding: "10px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {fees.map(f => (
              <tr
                key={f.id}
                style={{
                  background: f.status === "Late" ? "#f8d7da" : f.status === "Early" ? "#d1ecf1" : "#d4edda",
                  fontWeight: "500"
                }}
              >
                <td style={{ padding: "8px" }}>{formatDate(f.payment_date)}</td>
                <td style={{ padding: "8px" }}>{formatTime(f.payment_time)}</td>
                <td style={{ padding: "8px" }}>{f.student_name}</td>
                <td style={{ padding: "8px" }}>{f.class_name}</td>
                <td style={{ padding: "8px" }}>₹ {f.amount}</td>
                <td style={{ padding: "8px", fontWeight: "600" }}>{f.status}</td>
                <td style={{ padding: "8px" }}>
                  <button onClick={() => handleEdit(f)} style={{ marginRight: "5px", padding: "5px 8px" }}>
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(f.id)}
                    style={{ padding: "5px 8px", background: "#f44336", color: "#fff", border: "none", borderRadius: "4px" }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminFees;
