import React, { useState } from "react";

const StudentDropApply = () => {

  const [formData, setFormData] = useState({
    start_date: "",
    end_date: "",
    reason: ""
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log("Drop Applied Data:", formData);

    // yaha API call hogi
    // fetch("/api/apply-drop",{method:"POST",body:JSON.stringify(formData)})
  };

  return (
    <div style={{ padding: "30px" }}>
      <h2>Apply for Drop</h2>

      <div
        style={{
          background: "#f5f5f5",
          padding: "20px",
          borderRadius: "10px",
          width: "400px"
        }}
      >

        <form onSubmit={handleSubmit}>

          <div style={{ marginBottom: "15px" }}>
            <label>Start Date</label>
            <br />
            <input
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              required
              style={{ width: "100%", padding: "8px" }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label>End Date</label>
            <br />
            <input
              type="date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
              required
              style={{ width: "100%", padding: "8px" }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label>Reason</label>
            <br />
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows="3"
              style={{ width: "100%", padding: "8px" }}
            />
          </div>

          <button
            type="submit"
            style={{
              background: "#007bff",
              color: "white",
              padding: "10px 20px",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer"
            }}
          >
            Apply Drop
          </button>

        </form>
      </div>
    </div>
  );
};

export default StudentDropApply;