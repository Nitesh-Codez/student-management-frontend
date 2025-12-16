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
};

/* =========================
   HEADER
========================= */
const Header = ({ user, isMobile }) => (
  <div style={{ width: "100%", position: "fixed", top: 0, left: 0, zIndex: 1000 }}>
    {/* Top Strip */}
    <div
      style={{
        background: "#3d247aff",
        color: "#fff",
        padding: isMobile ? "12px 15px" : "12px 40px",
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        gap: isMobile ? "8px" : "0",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        textAlign: isMobile ? "center" : "left",
      }}
    >
      <div style={{ fontSize: "24px", fontWeight: "700" }}>SmartZone</div>
      <div style={{ fontSize: "16px" }}>Welcome to Smart Student's Classes</div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <img
          src={user.photo || "/default-profile.png"}
          alt="profile"
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "50%",
            border: "2px solid #fff",
          }}
        />
        <span>{user.name}</span>
      </div>
    </div>

    {/* Second Strip */}
    <div
      style={{
        background: "#645699ff",
        color: "#fff",
        padding: isMobile ? "8px 15px" : "10px 40px",
        display: "flex",
        justifyContent: isMobile ? "center" : "flex-start",
        alignItems: "center",
        gap: "12px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
      }}
    >
      <b>Welcome back,</b> {user.name}
    </div>
  </div>
);

/* =========================
   DASHBOARD BOXES
========================= */
const DashboardBoxes = ({ navigate, isMobile }) => {
  const boxes = [
    {
      title: "Attendance",
      desc: "Check your current attendance",
      icon: <FaClipboardCheck />,
      path: "/student/attendance",
      bg: "linear-gradient(135deg,#1ABC9C,#16A085)",
    },
    {
      title: "Fees Status",
      desc: "View paid or pending fees",
      icon: <FaMoneyBillWave />,
      path: "/student/fees",
      bg: "linear-gradient(135deg,#E57373,#C0392B)",
    },
    {
      title: "Test Marks",
      desc: "View test scores",
      icon: <FaChartLine />,
      path: "/student/marks",
      bg: "linear-gradient(135deg,#F39C12,#D35400)",
    },
    {
      title: "Homework",
      desc: "Assignments & submissions",
      icon: <FaBook />,
      path: "/student/homework",
      bg: "linear-gradient(135deg,#3498DB,#2980B9)",
    },
    {
      title: "Feedback",
      desc: "Teacher remarks",
      icon: <FaComments />,
      bg: "linear-gradient(135deg,#16A085,#1ABC9C)",
    },
  ];

  return (
    <div style={{ marginTop: "150px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit,minmax(280px,1fr))",
          gap: "20px",
        }}
      >
        {boxes.map((b, i) => (
          <div
            key={i}
            onClick={() => b.path && navigate(b.path)}
            style={{
              background: b.bg,
              color: "#fff",
              padding: "35px 20px",
              borderRadius: "14px",
              textAlign: "center",
              cursor: "pointer",
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ fontSize: "34px", marginBottom: "10px" }}>{b.icon}</div>
            <h3>{b.title}</h3>
            <p style={{ opacity: 0.9 }}>{b.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

/* =========================
   MAIN DASHBOARD
========================= */
const StudentDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const navigate = useNavigate();

  useEffect(() => {
    const resize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("user")) || {
      name: "Nitesh Kushwah",
      photo: "/default-profile.png",
    };
    setUser(u);
  }, []);

  if (!user) return null;

  return (
    <div style={{ display: "flex" }}>
      {/* SIDEBAR */}
      <aside
        style={{
          position: isMobile ? "fixed" : "relative",
          width: sidebarOpen ? (isMobile ? "100%" : "260px") : "0",
          height: "100vh",
          background: "#2C3E50",
          color: "#fff",
          padding: sidebarOpen ? "25px 20px" : "0",
          overflow: "hidden",
          transition: "0.3s",
          zIndex: 1200,
        }}
      >
        {sidebarOpen && (
          <>
            <h2 style={{ textAlign: "center", color: "#1ABC9C" }}>
              Smart Student Classes
            </h2>

            <nav style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "20px" }}>
              {[
                ["profile", "Profile"],
                ["fees", "Fees"],
                ["attendance", "Attendance"],
                ["marks", "Test Marks"],
                ["exam-results", "Exam Results"],
                ["homework", "Homework"],
                ["study-material", "Study Material"],
              ].map(([path, label]) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setSidebarOpen(false)}
                  style={linkStyle}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </>
        )}
      </aside>

      {/* MAIN */}
      <main
        style={{
          flex: 1,
          padding: isMobile ? "140px 15px" : "160px 40px",
          background: "#ECF0F1",
          minHeight: "100vh",
        }}
      >
        <Header user={user} isMobile={isMobile} />

        {/* MENU BUTTON */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            position: "fixed",
            top: "185px",
            right: "300px",
            padding: "8px 12px",
            fontSize: "18px",
            borderRadius: "8px",
            border: "none",
            background: "#22a78cff",
            color: "#fff",
            zIndex: 1300,
          }}
        >
          ☰
        </button>

        <Routes>
          <Route index element={<DashboardBoxes navigate={navigate} isMobile={isMobile} />} />
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
