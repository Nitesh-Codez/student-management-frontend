import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";

const AttendanceView = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_API_URL;

  const fetchAttendance = useCallback(() => {
    setLoading(true);
    const user = JSON.parse(localStorage.getItem("user"));

    let URL = "";
    if (user.role === "admin") {
      // Admin ke liye aaj ki attendance %
      URL = `${API_URL}/api/attendance/today-percent`;
    } else {
      // Student ke liye apna full attendance
      URL = `${API_URL}/api/attendance/${user.id}`;
    }

    axios
      .get(URL)
      .then((res) => {
        let records = [];
        if (user.role === "admin") {
          records = res.data.students || [];
        } else {
          records = res.data.attendance || [];
        }

        if (records.length === 0) {
          setStudents([]);
          setLoading(false);
          return;
        }

        const mappedStudents = records.map((rec) => {
          let name, present, total, absent, percentage;

          if (user.role === "admin") {
            name = rec.name;
            present = rec.present;
            total = rec.total;
            absent = total - present;
            percentage = rec.percentage;
          } else {
            name = user.name;
            present = records.filter((r) => r.status === "Present").length;
            total = records.length;
            absent = total - present;
            percentage = total > 0 ? ((present / total) * 100).toFixed(2) : "0.00";
          }

          return { name, present, total, absent, percentage };
        });

        setStudents(mappedStudents);
        setLoading(false);
      })
      .catch((err) => {
        console.log("Error fetching attendance:", err);
        setStudents([]);
        setLoading(false);
      });
  }, [API_URL]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const getPercentageColor = (percent) => {
    if (percent > 85) return "#70d618ff";
    if (percent >= 75) return "#d7f969ff";
    return "#ff0015ff";
  };

  return (
    <div style={{ padding: "30px", fontFamily: "Arial", maxWidth: "900px", margin: "0 auto" }}>
      <h2 style={{ color: "#1f3c88", marginBottom: "20px" }}>Attendance Records</h2>

      <button
        onClick={fetchAttendance}
        style={{ marginBottom: "20px", padding: "5px 10px" }}
      >
        Refresh
      </button>

      {loading ? (
        <p style={{ textAlign: "center", marginTop: "50px" }}>Loading attendance...</p>
      ) : students.length === 0 ? (
        <p style={{ textAlign: "center", marginTop: "30px" }}>No Attendance Found</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
            }}
          >
            <thead>
              <tr style={{ background: "#343a40", color: "#fff", textTransform: "uppercase" }}>
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
                  <td style={{ ...thTd, backgroundColor: getPercentageColor(s.percentage), fontWeight: "600" }}>
                    {s.percentage}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const thTd = { padding: "12px", textAlign: "center", border: "1px solid #ccc" };

export default AttendanceView;
