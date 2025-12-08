import React, { useEffect, useState } from "react";
import axios from "axios";

const AdmitCard = () => {
  const [attendancePercent, setAttendancePercent] = useState(null);

  useEffect(() => {
    const fetchAttendance = async () => {
      const user = JSON.parse(localStorage.getItem("user"));
      try {
        const res = await axios.get(
          `http://localhost:5000/api/attendance/student/${user.id}`
        );
        setAttendancePercent(res.data.percent);
      } catch (err) {
        console.error(err);
        setAttendancePercent(0);
      }
    };

    fetchAttendance();
  }, []);

  if (attendancePercent === null) return <p>Loading...</p>;

  return (
    <div
      style={{
        padding: "40px",
        maxWidth: "500px",
        margin: "50px auto",
        textAlign: "center",
        borderRadius: "14px",
        background: "#3498DB",
        color: "#fff",
        boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
      }}
    >
      {attendancePercent >= 75 ? (
        <>
          <h2>🎉 Admit Card Generated!</h2>
          <p>Please collect your admit card from your teacher.</p>
          <button
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              fontSize: "16px",
              borderRadius: "8px",
              border: "none",
              background: "#1ABC9C",
              color: "#fff",
              cursor: "pointer",
            }}
            onClick={() => alert("Downloading Admit Card...")}
          >
            Download Admit Card
          </button>
        </>
      ) : (
        <>
          <h2>⚠ Sorry!</h2>
          <p>
            Your attendance is {attendancePercent}%. You need at least 75% to
            generate your admit card.
          </p>
        </>
      )}
    </div>
  );
};

export default AdmitCard;
