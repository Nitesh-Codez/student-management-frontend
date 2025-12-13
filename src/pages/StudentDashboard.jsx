import React, { useState, useEffect } from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import { FaClipboardCheck, FaMoneyBillWave, FaChartLine, FaBook, FaComments, FaUser } from "react-icons/fa";
import StudentAttendance from "./StudentAttendance";
import StudentFees from "./StudentFees";
import StudentsMarks from "./StudentsMarks";
import HomeworkStudent from "./HomeworkStudent";
import StudentProfile from "./StudentProfile";
import StudentStudyMaterial from "./StudentStudyMaterial";

// =========================
// STYLES
// =========================
const linkStyle = {
  color: "#fff",
  textDecoration: "none",
  padding: "10px 15px",
  borderRadius: "8px",
  fontWeight: "500",
  transition: "all 0.3s",
};

const boxStyle = (bgGradient) => ({
  padding: "50px 25px", // taller boxes
  background: bgGradient,
  color: "#fff",
  borderRadius: "14px",
  boxShadow: "0 12px 25px rgba(0,0,0,0.15)",
  textAlign: "center",
  cursor: "pointer",
  fontSize: "18px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  transition: "transform 0.4s ease, box-shadow 0.4s ease",
  position: "relative",
  overflow: "hidden",
  borderLeft: "5px solid rgba(255,255,255,0.4)"
});

const boxHover = {
  transform: "translateY(-8px)",
  boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
};

const iconStyle = {
  fontSize: "36px",
  marginBottom: "12px",
  transition: "transform 0.4s",
};

// =========================
// DASHBOARD BOXES
// =========================
const DashboardBoxes = ({ user, navigate }) => {
  const boxes = [
    { title: "Attendance", desc: "Check your current attendance", gradient: "linear-gradient(135deg, #1ABC9C, #16A085)", icon: <FaClipboardCheck />, path: "/student/attendance" },
    { title: "Fees Status", desc: "Pending or Paid", gradient: "linear-gradient(135deg, #E57373, #C0392B)", icon: <FaMoneyBillWave />, path: "/student/fees" },
    { title: "Test Marks", desc: "View your scores", gradient: "linear-gradient(135deg, #F39C12, #D35400)", icon: <FaChartLine />, path: "/student/marks" },
    { title: "Your Record", desc: "Overall performance", gradient: "linear-gradient(135deg, #9B59B6, #8E44AD)", icon: <FaUser /> },
    { title: "Homework", desc: "Pending assignments", gradient: "linear-gradient(135deg, #3498DB, #2980B9)", icon: <FaBook />, path: "/student/homework" },
    { title: "Feedback", desc: "Teacher's remarks", gradient: "linear-gradient(135deg, #16A085, #1ABC9C)", icon: <FaComments /> },
  ];

  return (
    <div>
      {/* Welcome text seamlessly above boxes */}
      <h1 style={{
        fontSize: "32px",
        fontWeight: "700",
        color: "#2C3E50",
        marginBottom: "25px",
        letterSpacing: "1px"
      }}>
        Welcome Back, {user.name}! 👋
      </h1>

      {/* Dashboard Boxes */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "25px",
      }}>
        {boxes.map((box, i) => (
          <div
            key={i}
            style={boxStyle(box.gradient)}
            onClick={() => box.path && navigate(box.path)}
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, boxHover)}
            onMouseLeave={(e) => Object.assign(e.currentTarget.style, { transform: "translateY(0)", boxShadow: "0 12px 25px rgba(0,0,0,0.15)" })}
          >
            <div style={iconStyle}>{box.icon}</div>
            <h3 style={{ marginBottom: "8px", fontWeight: "600", fontSize: "20px" }}>{box.title}</h3>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.85)" }}>{box.desc}</p>
          </div>
        ))}
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

  if (!user) return <p style={{ textAlign: "center", marginTop: "50px" }}>Loading...</p>;

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Poppins', Arial, sans-serif" }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? "260px" : "0",
        background: "#2C3E50",
        padding: sidebarOpen ? "25px 20px" : "0",
        color: "#fff",
        overflow: "hidden",
        transition: "all 0.3s ease",
        display: "flex",
        flexDirection: "column",
      }}>
        {sidebarOpen && (
          <>
            <h2 style={{ textAlign: "center", marginBottom: "25px", fontSize: "22px", fontWeight: "700", letterSpacing: "1px", color: "#1ABC9C" }}>
              Smart Student Classes
            </h2>

            <div style={{ marginBottom: "20px" }}>
              <Link to="/student" style={{ ...linkStyle, background: "#1ABC9C", display: "block", textAlign: "center", fontWeight: "600" }}>
                ⬅ Dashboard
              </Link>
            </div>

            <nav style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {["profile", "fees", "attendance", "marks"].map((link) => (
                <Link key={link} to={link} style={linkStyle}>{link.charAt(0).toUpperCase() + link.slice(1)}</Link>
              ))}
              <Link to="study-material" style={linkStyle}>
  Study Material
</Link>

{["Submit Exam Form", "Generate Admit Card", "Download Syllabus", "Time Table", "Holiday List", "Withdrawal Request", "My Suggestions"].map((link) => (
  <Link key={link} style={linkStyle}>{link}</Link>
))}

            </nav>
          </>
        )}
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "40px", background: "#ECF0F1", overflowY: "auto", position: "relative" }}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            padding: "10px 15px",
            fontSize: "18px",
            borderRadius: "6px",
            border: "none",
            background: "#1ABC9C",
            color: "#fff",
            cursor: "pointer",
            boxShadow: "0 4px 15px rgba(0,0,0,0.15)",
            transition: "0.2s",
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
          <Route
  path="study-material"
  element={<StudentStudyMaterial user={user} />}
/>

        </Routes>
      </main>
    </div>
  );
};

export default StudentDashboard;
