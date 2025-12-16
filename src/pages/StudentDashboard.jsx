import React, { useState, useEffect } from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import {
  FaClipboardCheck,
  FaMoneyBillWave,
  FaChartLine,
  FaBook,
  FaComments,
} from "react-icons/fa";

import StudentAttendance from "./StudentAttendance";
import StudentFees from "./StudentFees";
import StudentsMarks from "./StudentsMarks";
import HomeworkStudent from "./HomeworkStudent";
import StudentProfile from "./StudentProfile";
import StudentStudyMaterial from "./StudentStudyMaterial";
import StudentNewMarks from "./StudentNewMarks";

/* =========================
   LINK STYLE
========================= */
const linkStyle = {
  color: "#fff",
  textDecoration: "none",
  padding: "10px 15px",
  borderRadius: "8px",
  fontWeight: "500",
  background: "rgba(255,255,255,0.08)",
};

/* =========================
   HEADER
========================= */
const Header = ({ user }) => (
  <div style={{ position: "fixed", top: 0, left: 0, width: "100%", zIndex: 1000 }}>
    <div
  style={{
    background: "#3d247aff",
    color: "#fff",
    padding: "12px 40px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    position: "relative", // 👈 ADD THIS
  }}
>

      <b style={{ fontSize: 22 }}>SmartZone</b>
      <span>Welcome to Smart Student's Classes</span>
      <div style={{ display: "flex", gap: 10, alignItems: "Left" }}>
        <img
          src={user.photo}
          alt=""
          style={{ width: 36, height: 36, borderRadius: "50%" }}
        />
        {user.name}
      </div>
    </div>

    <div style={{ background: "#645699ff", color: "#fff", padding: "8px 40px" }}>
      Welcome back, <b>{user.name}</b>
    </div>
  </div>
);

/* =========================
   DASHBOARD BOXES (UNCHANGED COLORS)
========================= */
const DashboardBoxes = ({ navigate }) => {
  const boxes = [
    {
      title: "Attendance",
      icon: <FaClipboardCheck />,
      path: "/student/attendance",
      bg: "linear-gradient(135deg,#1ABC9C,#16A085)",
    },
    {
      title: "Fees",
      icon: <FaMoneyBillWave />,
      path: "/student/fees",
      bg: "linear-gradient(135deg,#E57373,#C0392B)",
    },
    {
      title: "Marks",
      icon: <FaChartLine />,
      path: "/student/marks",
      bg: "linear-gradient(135deg,#F39C12,#D35400)",
    },
    {
      title: "Homework",
      icon: <FaBook />,
      path: "/student/homework",
      bg: "linear-gradient(135deg,#3498DB,#2980B9)",
    },
    {
      title: "Feedback",
      icon: <FaComments />,
      bg: "linear-gradient(135deg,#16A085,#1ABC9C)",
    },
  ];

  return (
    <div
      style={{
        marginTop: 150,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
        gap: 20,
      }}
    >
      {boxes.map((b, i) => (
        <div
          key={i}
          onClick={() => b.path && navigate(b.path)}
          style={{
            background: b.bg,
            color: "#fff",
            padding: 30,
            borderRadius: 14,
            cursor: "pointer",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
          }}
        >
          <div style={{ fontSize: 32 }}>{b.icon}</div>
          <h3>{b.title}</h3>
        </div>
      ))}
    </div>
  );
};

/* =========================
   MAIN DASHBOARD
========================= */
const StudentDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setUser(
      JSON.parse(localStorage.getItem("user")) || {
        name: "Nitesh Kushwah",
        photo: "/default-profile.png",
      }
    );
  }, []);

  if (!user) return null;

  return (
    <>
      {/* OVERLAY */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 1100,
          }}
        />
      )}

      {/* SIDEBAR */}
      <aside
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: sidebarOpen ? "50%" : 0,
          height: "100vh",
          background: "#2C3E50",
          overflow: "hidden",
          transition: "0.3s",
          zIndex: 1200,
          padding: sidebarOpen ? "25px" : 0,
        }}
      >
        {sidebarOpen && (
          <>
            <h2 style={{ color: "#1ABC9C", textAlign: "center" }}>
              Smart Student
            </h2>

            <nav style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Link to="/student" onClick={() => setSidebarOpen(false)} style={linkStyle}>
                Go to Dashboard
              </Link>
              <Link to="profile" onClick={() => setSidebarOpen(false)} style={linkStyle}>Profile</Link>
              <Link to="fees" onClick={() => setSidebarOpen(false)} style={linkStyle}>Fees</Link>
              <Link to="attendance" onClick={() => setSidebarOpen(false)} style={linkStyle}>Attendance</Link>
              <Link to="marks" onClick={() => setSidebarOpen(false)} style={linkStyle}>Marks</Link>
              <Link to="exam-results" onClick={() => setSidebarOpen(false)} style={linkStyle}>Exam Results</Link>
              <Link to="homework" onClick={() => setSidebarOpen(false)} style={linkStyle}>Homework</Link>
              <Link to="study-material" onClick={() => setSidebarOpen(false)} style={linkStyle}>Study Material</Link>
            </nav>
          </>
        )}
      </aside>

      {/* MAIN */}
      <main
        style={{
          minHeight: "100vh",
          background: "#ECF0F1",
          padding: "160px 40px 40px",
        }}
      >
        <Header user={user} />

        {/* MENU BUTTON (safe position) */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            position: "fixed",
            top: 170,
            left: 20,
            zIndex: 1300,
            padding: "10px 14px",
            fontSize: 18,
            borderRadius: 8,
            border: "none",
            background: "#22a78cff",
            color: "#fff",
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
          <Route path="study-material" element={<StudentStudyMaterial />} />
        </Routes>
      </main>
    </>
  );
};

export default StudentDashboard;
