import React, { useState, useEffect } from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import { FaClipboardCheck, FaMoneyBillWave, FaChartLine, FaBook, FaComments } from "react-icons/fa";
import StudentAttendance from "./StudentAttendance";
import StudentFees from "./StudentFees";
import StudentsMarks from "./StudentsMarks";
import HomeworkStudent from "./HomeworkStudent";
import StudentProfile from "./StudentProfile";
import StudentStudyMaterial from "./StudentStudyMaterial";
import StudentNewMarks from "./StudentNewMarks";

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

// =========================
// HEADER COMPONENT (TWO STRIPS)
// =========================
const Header = ({ user }) => (
  <div style={{ width: "100%", position: "fixed", top: 0, left: 0, zIndex: 1000 }}>
    <div style={{
      width: "100%",
      background: "#3d247aff",
      color: "#fff",
      padding: "12px 40px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
    }}>
      <div style={{ fontSize: "26px", fontWeight: "700", fontFamily: "'Poppins', sans-serif" }}>SmartZone</div>
      <div style={{ fontSize: "22px", fontWeight: "100" }}> Welcome to Smart Student's Classes</div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{
          width: "42px",
          height: "42px",
          borderRadius: "50%",
          overflow: "hidden",
          border: "2px solid #fff"
        }}>
          <img src={user.photo || "/default-profile.png"} alt="profile" style={{ width: "100%", height: "100%" }} />
        </div>
        <span style={{ fontWeight: "500" }}>{user.name}</span>
      </div>
    </div>

    <div style={{
      width: "100%",
      background: "#645699ff",
      color: "#fff",
      padding: "10px 40px",
      display: "flex",
      justifyContent: "flex-start",
      alignItems: "center",
      gap: "20px",
      boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
    }}>
      <div style={{ fontWeight: "600", fontSize: "16px" }}>Welcome back,</div>
      <div style={{ fontWeight: "700", fontSize: "18px" }}>{user.name}</div>
      <div>
        <img src={user.photo || "/default-profile.png"} alt="profile" style={{ width: "36px", height: "36px", borderRadius: "50%", border: "2px solid #fff" }} />
      </div>
    </div>
  </div>
);

// =========================
// DASHBOARD BOXES
// =========================
const DashboardBoxes = ({ navigate }) => {
  const boxes = [
    { title: "Attendance", desc: "Check your current attendance in detail", gradient: "linear-gradient(135deg, #1ABC9C, #16A085)", icon: <FaClipboardCheck />, path: "/student/attendance" },
    { title: "Fees Status", desc: "View pending or paid fees easily", gradient: "linear-gradient(135deg, #E57373, #C0392B)", icon: <FaMoneyBillWave />, path: "/student/fees" },
    { title: "Test Marks", desc: "View your test scores and progress", gradient: "linear-gradient(135deg, #F39C12, #D35400)", icon: <FaChartLine />, path: "/student/marks" },
    { title: "Homework", desc: "See your pending assignments and submissions", gradient: "linear-gradient(135deg, #3498DB, #2980B9)", icon: <FaBook />, path: "/student/homework" },
    { title: "Feedback", desc: "Check teacher remarks and comments", gradient: "linear-gradient(135deg, #16A085, #1ABC9C)", icon: <FaComments /> },
  ];

  return (
    <div style={{ marginTop: "160px" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "25px",
      }}>
        {boxes.map((box, i) => (
          <div
            key={i}
            style={{
              padding: "50px 25px",
              background: box.gradient,
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
            }}
            onClick={() => box.path && navigate(box.path)}
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, { transform: "translateY(-8px)", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" })}
            onMouseLeave={(e) => Object.assign(e.currentTarget.style, { transform: "translateY(0)", boxShadow: "0 12px 25px rgba(0,0,0,0.15)" })}
          >
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>{box.icon}</div>
            <h3 style={{ marginBottom: "12px", fontWeight: "600", fontSize: "20px" }}>{box.title}</h3>
            <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.85)", lineHeight: "1.6" }}>{box.desc}</p>
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
    const storedUser = JSON.parse(localStorage.getItem("user")) || {
      name: "Nitesh Kushwah",
      photo: "/default-profile.png"
    };
    setUser(storedUser);
  }, []);

  if (!user) return <p style={{ textAlign: "center", marginTop: "50px" }}>Loading...</p>;

  return (
    <div style={{ display: "flex", fontFamily: "'Poppins', Arial, sans-serif" }}>
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
              <Link to="profile" style={linkStyle}>Profile</Link>
              <Link to="fees" style={linkStyle}>Fees</Link>
              <Link to="attendance" style={linkStyle}>Attendance</Link>
              <Link to="marks" style={linkStyle}>Test Marks</Link>
              <Link to="exam-results" style={linkStyle}>Examination Results</Link>
              <Link to="homework" style={linkStyle}>Homework</Link>
              <Link to="study-material" style={linkStyle}>Study Material</Link>
            </nav>
          </>
        )}
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "160px 40px 40px 40px", background: "#ECF0F1", minHeight: "100vh", position: "relative" }}>
        <Header user={user} />

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            position: "fixed",
            top: "120px",
            left: "20px",
            padding: "8px 12px",
            fontSize: "16px",
            borderRadius: "6px",
            border: "none",
            background: "#1ABC9C",
            color: "#fff",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            transition: "0.2s",
            zIndex: 1100
          }}
        >
          ☰
        </button>

        <Routes>
          <Route index element={<DashboardBoxes navigate={navigate} />} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="fees" element={<StudentFees user={user} />} />
          <Route path="attendance" element={<StudentAttendance user={user} />} />
          <Route path="marks" element={<StudentsMarks user={user} />} />
          <Route path="exam-results" element={<StudentNewMarks />} />
          <Route path="homework" element={<HomeworkStudent />} />
          <Route path="study-material" element={<StudentStudyMaterial user={user} />} />
        </Routes>
      </main>
    </div>
  );
};

export default StudentDashboard;
