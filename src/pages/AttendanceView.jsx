import React, { useEffect, useState } from "react";
import axios from "axios";

const AttendanceView = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_API_URL;

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user")); // user object me role aur id hona chahiye

    // Correct backend URLs
    const URL =
      user.role === "admin"
        ? `${API_URL}/api/attendance/list`   // Admin ke liye full list
        : `${API_URL}/api/attendance/${user.id}`; // Student ke liye apna ID

    axios
      .get(URL)
      .then((res) => {
        let records = [];

        if (user.role === "admin") {
          // Admin ke liye response.students array hai
          records = res.data.students || [];
        } else {
          // Student ke liye response.attendance array hai
          records = res.data.attendance || [];
        }

        if (records.length === 0) {
          setStudents([]);
          setLoading(false);
          return;
        }

        // Map data for table display
        const mappedStudents = [];

        if (user.role === "admin") {
          // Group by student name
          const studentMap = {};
          records.forEach((rec) => {
            const name = rec.studentName;
            if (!studentMap[name]) studentMap[name] = { present: 0, total: 0 };
            studentMap[name].total += 1;
            if (rec.status === "Present") studentMap[name].present += 1;
          });

          for (let name in studentMap) {
            const data = studentMap[name];
            const absent = data.total - data.present;
            const percentage = data.total > 0
              ? ((data.present / data.total) * 100 - absent * 0.3).toFixed(2)
              : "0.00";

            mappedStudents.push({
              name,
              present: data.present,
              total: data.total,
              absent,
              percentage,
            });
          }
        } else {
          // student ke liye multiple date ka data
          const present = records.filter((r) => r.status === "Present").length;
          const total = records.length;
          const absent = total - present;
          const percentage = total > 0
            ? ((present / total) * 100 - absent * 0.3).toFixed(2)
            : "0.00";

          mappedStudents.push({
            name: user.name,
            present,
            total,
            absent,
            percentage,
          });
        }

        setStudents(mappedStudents);
        setLoading(false);
      })
      .catch((err) => {
        console.log("Error fetching attendance:", err);
        setStudents([]);
        setLoading(false);
      });
  }, [API_URL]);

  // Coloring logic
  const getPercentageColor = (percent) => {
    if (percent > 85) return "#7bda28ff"; // green
    if (percent >= 75) return "#d7f969ff"; // yellow
    return "#ff0015ff"; // red
  };

  if (loading)
    return <p style={{ textAlign: "center", marginTop: "50px" }}>Loading attendance...</p>;

  return (
    <div style={{ padding: "30px", fontFamily: "Arial", maxWidth: "900px", margin: "0 auto" }}>
      <h2 style={{ color: "#1f3c88", marginBottom: "20px" }}>Attendance Records</h2>

      {students.length === 0 ? (
        <p style={{ textAlign: "center", marginTop: "30px" }}>No Attendance Found</p>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="desktop-table" style={{ overflowX: "auto" }}>
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
          </div>

          {/* Mobile Cards */}
          <div className="mobile-view" style={{ marginTop: "20px", display: "none" }}>
            {students.map((s, i) => (
              <div
                key={i}
                style={{
                  background: "#fff",
                  padding: "12px",
                  borderRadius: "10px",
                  marginBottom: "12px",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
                }}
              >
                <p><strong>Student:</strong> {s.name}</p>
                <p><strong>Present:</strong> {s.present}</p>
                <p><strong>Total:</strong> {s.total}</p>
                <p><strong>Absent:</strong> {s.absent}</p>
                <p
                  style={{
                    backgroundColor: getPercentageColor(s.percentage),
                    fontWeight: "600",
                    padding: "4px 0",
                    textAlign: "center",
                    borderRadius: "4px",
                  }}
                >
                  {s.percentage}%
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Media Queries */}
      <style>
        {`
          @media (max-width: 768px) {
            .desktop-table { display: none; }
            .mobile-view { display: block !important; }
          }
          @media (min-width: 769px) {
            .desktop-table { display: block; }
            .mobile-view { display: none; }
          }
        `}
      </style>
    </div>
  );
};

const thTd = {
  padding: "12px",
  textAlign: "center",
  border: "1px solid #ccc",
};

export default AttendanceView;
