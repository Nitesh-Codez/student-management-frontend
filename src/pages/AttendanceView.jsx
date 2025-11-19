import React, { useEffect, useState } from "react";

const AttendanceView = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    const URL =
      user.role === "admin"
        ? "http://student-management-system-32lc.onrender.com/attendance/all"
        : "http://student-management-system-32lc.onrender.com/api/attendance/me";

    fetch(URL)
      .then((res) => res.json())
      .then((data) => {
        const records = data.records || [];
        if (records.length === 0) {
          setStudents([]);
          setLoading(false);
          return;
        }

        const mappedStudents = records.map((rec) => {
          const present = parseInt(rec.present);
          const total = parseInt(rec.total);
          const absent = total - present;

          // ✅ Percentage formula with absent penalty
          const percentage = total > 0
            ? ((present / total) * 100 - absent * 0.3).toFixed(2)
            : "0.00";

          return {
            name: rec.studentName,
            present,
            total,
            absent,
            percentage,
          };
        });

        setStudents(mappedStudents);
        setLoading(false);
      })
      .catch((err) => {
        console.log("Error fetching attendance:", err);
        setStudents([]);
        setLoading(false);
      });
  }, []);

  // Coloring logic
  const getPercentageColor = (percent) => {
    if (percent > 85) return "#5aa519ff"; // green
    if (percent >= 75) return "#d7f969ff"; // yellow
    return "#ff0015ff"; // red
  };

  if (loading) return <p>Loading attendance...</p>;

  return (
    <div style={{ padding: "30px", fontFamily: "Arial" }}>
      <h2 style={{ color: "#1f3c88", marginBottom: "20px" }}>Attendance Records</h2>

      {students.length === 0 ? (
        <p>No Attendance Found</p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
          }}
        >
          <thead>
            <tr
              style={{
                background: "#343a40",
                color: "#fff",
                textTransform: "uppercase",
              }}
            >
              <th style={thTd}>Student</th>
              <th style={thTd}>Present</th>
              <th style={thTd}>Total</th>
              <th style={thTd}>Absent</th>
              <th style={thTd}>%</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#f9f9f9" : "#fff" }}>
                <td style={thTd}>{s.name}</td>
                <td style={thTd}>{s.present}</td>
                <td style={thTd}>{s.total}</td>
                <td style={thTd}>{s.absent}</td>
                <td
                  style={{
                    ...thTd,
                    backgroundColor: getPercentageColor(s.percentage),
                    fontWeight: "600",
                  }}
                >
                  {s.percentage}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const thTd = {
  padding: "12px",
  textAlign: "center",
  border: "1px solid #ccc",
};

export default AttendanceView;
