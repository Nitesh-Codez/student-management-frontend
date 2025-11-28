import React, { useEffect, useState } from "react";

const StudentAttendance = () => {
  const user = JSON.parse(localStorage.getItem("user")); // logged-in student
  const API_URL = process.env.REACT_APP_API_URL;

  const [attendance, setAttendance] = useState([]);
  const [percentage, setPercentage] = useState(0);

  // Fetch student attendance
  useEffect(() => {
    if (!user) return;

    fetch(`${API_URL}/api/attendance/${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.attendance.length > 0) {
          setAttendance(data.attendance);

          const total = data.attendance.length;
          const present = data.attendance.filter((a) => a.status === "Present")
            .length;

          setPercentage(((present / total) * 100).toFixed(2));
        }
      })
      .catch((err) => console.log("Error fetching:", err));
  }, [user, API_URL]);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "900px",
        margin: "0 auto",
        padding: "20px",
      }}
    >
      <h2
        style={{
          textAlign: "center",
          marginBottom: "20px",
          color: "#1f3c88",
        }}
      >
        Student Attendance
      </h2>

      {/* USER DETAILS */}
      <div
        style={{
          background: "#f1f5ff",
          padding: "15px",
          borderRadius: "8px",
          marginBottom: "20px",
        }}
      >
        <p>
          <strong>Name:</strong> {user?.name}
        </p>
        <p>
          <strong>Class:</strong> {user?.class_name}
        </p>
        <p>
          <strong>Attendance %:</strong>{" "}
          <span style={{ color: "#1f3c88", fontWeight: "bold" }}>
            {percentage}%
          </span>
        </p>
      </div>

      {/* TABLE */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: "600px",
          }}
        >
          <thead>
            <tr style={{ background: "#1f3c88", color: "#fff" }}>
              <th style={th}>Date</th>
              <th style={th}>Status</th>
            </tr>
          </thead>

          <tbody>
            {attendance.length === 0 ? (
              <tr>
                <td colSpan="2" style={{ textAlign: "center", padding: "20px" }}>
                  No attendance records found.
                </td>
              </tr>
            ) : (
              attendance.map((a, index) => (
                <tr
                  key={index}
                  style={{
                    background: index % 2 === 0 ? "#f9f9f9" : "#ffffff",
                  }}
                >
                  <td style={td}>{a.date}</td>
                  <td
                    style={{
                      ...td,
                      fontWeight: "bold",
                      color: a.status === "Present" ? "green" : "red",
                    }}
                  >
                    {a.status}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const th = {
  padding: "12px",
  border: "1px solid #ddd",
  textAlign: "left",
};

const td = {
  padding: "10px",
  border: "1px solid #ddd",
};

export default StudentAttendance;
