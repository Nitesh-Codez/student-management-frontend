import React, { useState, useEffect } from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import StudentAttendance from "./StudentAttendance";
import StudentFees from "./StudentFees";
import StudentsMarks from "./StudentsMarks";
import HomeworkStudent from "./HomeworkStudent";
import StudentProfile from "./StudentProfile";

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
  padding: "40px",
  background: bgColor,
  color: "#fff",
  borderRadius: "14px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
  textAlign: "center",
  cursor: "pointer",
  fontSize: "18px",
});

// =========================
// DASHBOARD BOXES
// =========================
const DashboardBoxes = ({ user, navigate }) => {
  return (
    <div>
      <h2 style={{ marginBottom: "20px", fontSize: "28px", fontWeight: "700" }}>
        Hi, {user.name}! Welcome to your Dashboard 👋
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "25px",
        }}
      >
        <div style={boxStyle("#1ABC9C")} onClick={() => navigate("/student/attendance")}>
          <h3>Your Attendance</h3>
          <p>Check your current attendance</p>
        </div>

        <div style={boxStyle("#E57373")} onClick={() => navigate("/student/fees")}>
          <h3>Fees Status</h3>
          <p>Pending or Paid</p>
        </div>

        <div style={boxStyle("#F39C12")} onClick={() => navigate("/student/marks")}>
          <h3>Test Marks</h3>
          <p>Your latest scores</p>
        </div>

        <div style={boxStyle("#9B59B6")}>
          <h3>See Your Record</h3>
          <p>Overall performance</p>
        </div>

        <div style={boxStyle("#3498DB")} onClick={() => navigate("/student/homework")}>
          <h3>Homework Status</h3>
          <p>Check pending homework</p>
        </div>

        <div style={boxStyle("#16A085")}>
          <h3>This Month Feedback</h3>
          <p>Your teacher’s remarks</p>
        </div>
      </div>
    </div>
  );
};

// =========================
// MAIN DASHBOARD
// =========================
const StudentDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    setUser(storedUser);
  }, []);

  if (!user)
    return <p style={{ textAlign: "center", marginTop: "50px" }}>Loading...</p>;

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "Arial, sans-serif" }}>
      {/* =========================
          SIDEBAR 
      ========================= */}
      <aside
        style={{
          width: sidebarOpen ? "260px" : "0",
          background: "#2C3E50",
          padding: sidebarOpen ? "25px 20px" : "0",
          color: "#fff",
          overflow: "hidden",
          transition: "all 0.3s ease",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {sidebarOpen && (
          <>
            <h2
              style={{
                textAlign: "center",
                marginBottom: "25px",
                fontSize: "22px",
                fontWeight: "700",
                letterSpacing: "1px",
                color: "#1ABC9C",
              }}
            >
              Smart Student Classes
            </h2>

            <div style={{ marginBottom: "20px" }}>
              <Link
                to="/student"
                style={{
                  ...linkStyle,
                  background: "#1ABC9C",
                  display: "block",
                  textAlign: "center",
                  fontWeight: "600",
                }}
              >
                ⬅ Go to Dashboard
              </Link>
            </div>

            <nav
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "15px",
                overflow: "visible",
              }}
            >
              <Link to="profile" style={linkStyle}>Profile</Link>
              <Link to="fees" style={linkStyle}>Fees</Link>
              <Link to="attendance" style={linkStyle}>Attendance</Link>
              <Link to="marks" style={linkStyle}>Test Marks</Link>

              <Link style={linkStyle}>Submit Exam Form</Link>
              <Link style={linkStyle}>Generate Admit Card</Link>
              <Link style={linkStyle}>Download Syllabus</Link>
              <Link style={linkStyle}>Time Table</Link>
              <Link style={linkStyle}>Study Material</Link>
              <Link style={linkStyle}>Holiday List</Link>

              <Link style={linkStyle}>Withdrawal Request</Link>
              <Link style={linkStyle}>My Suggestions</Link>
            </nav>
          </>
        )}
      </aside>

      {/* =========================
          MAIN CONTENT
      ========================= */}
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
          <Route index element={<DashboardBoxes user={user} navigate={navigate} />} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="fees" element={<StudentFees user={user} />} />
          <Route path="attendance" element={<StudentAttendance user={user} />} />
          <Route path="marks" element={<StudentsMarks user={user} />} />
          <Route path="homework" element={<HomeworkStudent />} />
        </Routes>
      </main>
    </div>
  );
};

export default StudentDashboard;