import React, { useEffect, useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL;

function StudentHoliday() {

  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const fetchHolidays = async () => {
      try {

        const res = await axios.get(`${API}/api/holidays`);

        if (res.data.success) {
          setHolidays(res.data.holidays);
        }

      } catch (error) {
        console.log("Holiday fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHolidays();

  }, []);

  return (
    <div style={{ padding: "20px" }}>

      <h2 style={{ marginBottom: "20px" }}>📅 Holiday List</h2>

      {loading ? (
        <p>Loading holidays...</p>
      ) : holidays.length === 0 ? (
        <p>No holidays available.</p>
      ) : (

        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          background: "#fff"
        }}>

          <thead>
            <tr style={{ background: "#3b82f6", color: "white" }}>
              <th style={th}>Title</th>
              <th style={th}>Date</th>
              <th style={th}>Description</th>
            </tr>
          </thead>

          <tbody>
            {holidays.map((h) => (
              <tr key={h.id}>

                <td style={td}>{h.title}</td>

                <td style={td}>
                  {new Date(h.holiday_date).toLocaleDateString()}
                </td>

                <td style={td}>{h.description || "-"}</td>

              </tr>
            ))}
          </tbody>

        </table>

      )}

    </div>
  );
}

const th = {
  padding: "10px",
  border: "1px solid #ddd"
};

const td = {
  padding: "10px",
  border: "1px solid #ddd",
  textAlign: "center"
};

export default StudentHoliday;