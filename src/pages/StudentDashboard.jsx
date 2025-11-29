import React, { useState, useEffect } from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import StudentAttendance from "./StudentAttendance";
import StudentFees from "./StudentFees";
import SubjectsList from "./SubjectsList";
import StudentsMarks from "./StudentsMarks";

const linkStyle = {
  color: "#fff",
  textDecoration: "none",
  padding: "10px 15px",
  borderRadius: "5px",
  transition: "0.3s",
  fontWeight: "500",
  backgroundColor: "#34495E",
};

const boxStyle = (bgColor) => ({
  padding: "30px",
  background: bgColor,
  color: "#fff",
  borderRadius: "10px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
  textAlign: "center",
  cursor: "pointer",
});


// =========================
// DASHBOARD BOXES
// =========================
const DashboardBoxes = ({ user, navigate, feesPaid }) => {
  return (
    <div>
      {/* FEES NOTICE - Sirf dashboard me */}
      {!feesPaid && (
        <div
          style={{
            padding: "15px",
            background: "#ffcccc",
            color: "#b30000",
            borderRadius: "8px",
            marginBottom: "20px",
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          ⚠ Your fees for the **previous month** is pending.  
          Please submit as soon as possible.
        </div>
      )}

      <h2 style={{ marginBottom: "20px" }}>
        Hi, {user.name}! Welcome to your Dashboard 👋
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "20px",
        }}
      >
        <div
          style={boxStyle("#1ABC9C")}
          onClick={() => navigate("/student/attendance")}
        >
          <h3>Your Attendance</h3>
          <p>Check your current attendance status</p>
        </div>

        <div
          style={boxStyle("#E57373")}
          onClick={() => navigate("/student/fees")}
        >
          <h3>Fees Status</h3>
          <p>See your pending or paid fees</p>
        </div>

        <div
          style={boxStyle("#F39C12")}
          onClick={() => navigate("/student/marks")}
        >
          <h3>Check Your Test Marks</h3>
          <p>View your latest test scores</p>
        </div>

        <div style={boxStyle("#9B59B6")}>
          <h3>See Your Record</h3>
          <p>View your overall academic records</p>
        </div>
      </div>
    </div>
  );
};



// =========================
// MAIN DASHBOARD PAGE
// =========================
const StudentDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [feesPaid, setFeesPaid] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    setUser(storedUser);

    // feesPaidThisMonth = payment of previous month
    const isPaid = localStorage.getItem("feesPaidThisMonth");
    setFeesPaid(isPaid === "true");
  }, []);

  if (!user)
    return (
      <p style={{ textAlign: "center", marginTop: "50px" }}>Loading...</p>
    );

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "Arial, sans-serif" }}>
      
      {/* SIDEBAR */}
      <aside
        style={{
          width: sidebarOpen ? "220px" : "0",
          background: "#2C3E50",
          padding: sidebarOpen ? "30px 20px" : "0",
          color: "#fff",
          overflow: "hidden",
          transition: "all 0.3s ease",
        }}
      >
        {sidebarOpen && (
          <>
            <h2 style={{ marginBottom: "30px", textAlign: "center", fontSize: "24px" }}>
              <Link to="/student" style={{ color: "#1ABC9C", textDecoration: "none" }}>
                Home
              </Link>
            </h2>

            <nav style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <Link to="profile" style={linkStyle}>Profile</Link>
              <Link to="fees" style={linkStyle}>Fees</Link>
              <Link to="attendance" style={linkStyle}>Attendance</Link>
              <Link to="marks" style={linkStyle}>Test Marks</Link>
            </nav>
          </>
        )}
      </aside>


      {/* MAIN CONTENT */}
      <main
        style={{
          flex: 1,
          padding: "40px",
          background: "#ECF0F1",
          overflowY: "auto",
          position: "relative",
        }}
      >
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            padding: "10px 15px",
            fontSize: "18px",
            borderRadius: "5px",
            border: "none",
            background: "#1ABC9C",
            color: "#fff",
          }}
        >
          ☰
        </button>

        <Routes>
          <Route
            index
            element={
              <DashboardBoxes user={user} navigate={navigate} feesPaid={feesPaid} />
            }
          />

          <Route path="profile" element={<div><h2>Profile Page</h2></div>} />

          <Route path="fees" element={<StudentFees user={user} />} />

          <Route path="attendance" element={<StudentAttendance user={user} />} />

          <Route path="marks" element={<SubjectsList user={user} />} />

          <Route path="marks/:subject" element={<StudentsMarks user={user} />} />
        </Routes>

      </main>
    </div>
  );
};

export default StudentDashboard;
