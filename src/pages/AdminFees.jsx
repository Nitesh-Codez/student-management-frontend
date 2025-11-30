import React, { useState, useEffect } from "react";
import axios from "axios";

const AdminFees = () => {
  const API_URL = process.env.REACT_APP_API_URL;

  const [students, setStudents] = useState([]);
  const [fees, setFees] = useState([]);

  const [monthFilter, setMonthFilter] = useState("");
  const [filteredFees, setFilteredFees] = useState([]);

  const [form, setForm] = useState({
    id: "",
    student_id: "",
    student_name: "",
    class_name: "",
    amount: "",
    payment_date: "",
    payment_time: "",
    status: "On Time",
  });

  const [showForm, setShowForm] = useState(false);
  const [showRecords, setShowRecords] = useState(false);
  const [showSeeRecordBtn, setShowSeeRecordBtn] = useState(false);
  const [hideMonths, setHideMonths] = useState(false); // 🔥 NEW — HIDE MONTH BUTTONS

  // LOAD STUDENTS + FEES
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

  // LOAD MONTH DATA
  const loadMonth = (monthNumber) => {
    const currentYear = new Date().getFullYear();
    const month = String(monthNumber).padStart(2, "0");

    const filtered = fees.filter((f) =>
      f.payment_date.startsWith(`${currentYear}-${month}`)
    );

    setMonthFilter(`${currentYear}-${month}`);
    setFilteredFees(filtered);

    setShowForm(true);
    setShowSeeRecordBtn(true);
    setShowRecords(false);

    setHideMonths(true); // 🔥 HIDE MONTH BUTTONS AFTER CLICK
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleStudentSelect = (e) => {
    const value = Number(e.target.value);
    const s = students.find((st) => st.id === value);

    setForm({
      ...form,
      student_id: value,
      student_name: s?.name,
      class_name: s?.class,
    });
  };

  const isDuplicateEntry = () => {
    if (!form.student_id || !form.payment_date) return false;

    const [year, month] = form.payment_date.split("-");

    return fees.some(
      (f) =>
        f.student_id === Number(form.student_id) &&
        f.payment_date.startsWith(`${year}-${month}`) &&
        f.id !== form.id
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isDuplicateEntry()) {
      alert("This student already has a fee record for this month!");
      return;
    }

    try {
      let res;

      if (form.id) {
        res = await axios.put(`${API_URL}/api/fees/${form.id}`, form);
      } else {
        res = await axios.post(`${API_URL}/api/fees`, form);
      }

      if (res.data.success) alert(res.data.message);

      setForm({
        id: "",
        student_id: "",
        student_name: "",
        class_name: "",
        amount: "",
        payment_date: "",
        payment_time: "",
        status: "On Time",
      });

      const feesRes = await axios.get(`${API_URL}/api/fees`);
      if (feesRes.data.success) {
        setFees(feesRes.data.fees);

        const [year, month] = monthFilter.split("-");
        setFilteredFees(
          feesRes.data.fees.filter((f) =>
            f.payment_date.startsWith(`${year}-${month}`)
          )
        );
      }
    } catch (err) {
      console.log("Error submitting fee:", err);
    }
  };

  const handleEdit = (fee) => {
    setForm({ ...fee });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete?")) return;

    try {
      const res = await axios.delete(`${API_URL}/api/fees/${id}`);

      if (res.data.success) {
        alert(res.data.message);

        const feesRes = await axios.get(`${API_URL}/api/fees`);
        if (feesRes.data.success) {
          setFees(feesRes.data.fees);

          const [year, month] = monthFilter.split("-");
          setFilteredFees(
            feesRes.data.fees.filter((f) =>
              f.payment_date.startsWith(`${year}-${month}`)
            )
          );
        }
      }
    } catch (err) {
      console.log("Error deleting fee:", err);
    }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  const formatTime = (t) => {
    const [h, m] = t.split(":");
    const temp = new Date();
    temp.setHours(h, m);
    return temp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div style={{ padding: "10px" }}>
      <h2 style={{ textAlign: "center", color: "#1f3c88" }}>Admin - Fees</h2>

     {/* MONTH SELECTION SECTION */}
{!hideMonths && (
  <div
    style={{
      display: "flex",
      flexDirection: "column", // vertical alignment
      justifyContent: "center", // vertically center
      alignItems: "center", // horizontally center
      gap: "24px", // space between heading and buttons
      height: "100vh", // full page height
      width: "100%", // full width
      padding: "20px",
      boxSizing: "border-box",
      background: "#f5f5f5", // optional background
    }}
  >
    {/* Heading */}
    <h2 style={{ 
      fontSize: "24px", 
      marginBottom: "20px", 
      color: "#1f3c88",
      textAlign: "center"
    }}>
      Select the Month for Fee
    </h2>

    {/* Month Buttons */}
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        width: "100%",
        maxWidth: "250px",
      }}
    >
      {[
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ].map((m, index) => (
        <button
          key={index}
          onClick={() => loadMonth(index + 1)}
          style={{
            padding: "16px 28px", // longer & bigger buttons
            background: "#1f3c88",
            color: "#fff",
            borderRadius: "8px",
            border: "none",
            fontSize: "18px",
            width: "100%", // full width of parent div
          }}
        >
          {m}
        </button>
      ))}
    </div>
  </div>
)}

      {/* SEE RECORDS BUTTON */}


      {/* FORM */}
{showForm && (
  <form
    onSubmit={handleSubmit}
    style={{
      maxWidth: "500px",
      margin: "15px auto",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    }}
  >
    <select
      name="student_id"
      value={form.student_id}
      onChange={handleStudentSelect}
      required
      style={{ padding: "12px" }}
    >
      <option value="">Select Student</option>
      {students.map((s) => (
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
      style={{ padding: "12px" }}
    />

    <input
      type="date"
      name="payment_date"
      value={form.payment_date}
      onChange={handleChange}
      required
      style={{ padding: "12px" }}
    />

    <input
      type="time"
      name="payment_time"
      value={form.payment_time}
      onChange={handleChange}
      required
      style={{ padding: "12px" }}
    />

    <select
      name="status"
      value={form.status}
      onChange={handleChange}
      style={{ padding: "12px" }}
    >
      <option value="On Time">On Time</option>
      <option value="Late">Late</option>
      <option value="Early">Early</option>
    </select>

    <button
      type="submit"
      style={{
        padding: "12px",
        background: "#1f3c88",
        color: "#fff",
        borderRadius: "6px",
      }}
    >
      {form.id ? "Update Fee" : "Add Fee"}
    </button>
  </form>
)}
{/* SEE RECORD LINK – PROFESSIONAL TOGGLE */}
{showSeeRecordBtn && (
  <div style={{ marginTop: "35px", textAlign: "center" }}>
    <p
      onClick={() => setShowRecords(!showRecords)}   // 🔥 Toggle
      style={{
        fontSize: "18px",
        color: showRecords ? "#e74c3c" : "#1f3c88",
        textDecoration: "underline",
        cursor: "pointer",
        fontWeight: "600",
        transition: "0.3s",
      }}
      onMouseEnter={(e) => (e.target.style.color = "#0d2a6b")}
      onMouseLeave={(e) =>
        (e.target.style.color = showRecords ? "#e74c3c" : "#1f3c88")
      }
    >
      {showRecords ? "Hide Fee Records ↑" : "View Fee Records →"}
    </p>
  </div>
)}
      {/* RECORD TABLE */}
      {showRecords && (
        <div style={{ overflowX: "auto", marginTop: "20px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#3959a1", color: "#fff" }}>
              <tr>
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
              {filteredFees.map((f) => (
                <tr key={f.id}>
                  <td style={{ padding: "8px" }}>{formatDate(f.payment_date)}</td>
                  <td style={{ padding: "8px" }}>{formatTime(f.payment_time)}</td>
                  <td style={{ padding: "8px" }}>{f.student_name}</td>
                  <td style={{ padding: "8px" }}>{f.class_name}</td>
                  <td style={{ padding: "8px" }}>₹ {f.amount}</td>
                  <td style={{ padding: "8px" }}>{f.status}</td>

                  <td style={{ padding: "8px" }}>
                    <button onClick={() => handleEdit(f)}>Edit</button>

                    <button
                      onClick={() => handleDelete(f.id)}
                      style={{
                        marginLeft: "8px",
                        background: "red",
                        color: "#fff",
                        border: "none",
                        padding: "5px 8px",
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {filteredFees.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>
                    No Records Found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminFees;
