import React, { useState, useEffect } from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import {
  FaClipboardCheck,
  FaMoneyBillWave,
  FaChartLine,
  FaBook,
  FaComments,
  FaUserGraduate,
} from "react-icons/fa";
import { motion } from "framer-motion";

import StudentAttendance from "./StudentAttendance";
import StudentFees from "./StudentFees";
import StudentsMarks from "./StudentsMarks";
import HomeworkStudent from "./HomeworkStudent";
import StudentProfile from "./StudentProfile";
import StudentStudyMaterial from "./StudentStudyMaterial";
import StudentNewMarks from "./StudentNewMarks";

/* =========================
   COMMON STYLES
========================= */
const linkStyle = {
  color: "#fff",
  textDecoration: "none",
  padding: "12px 16px",
  borderRadius: 12,
  fontWeight: 500,
  background: "rgba(255,255,255,0.1)",
  transition: "0.3s",
};

/* =========================
   HEADER
========================= */
const Header = ({ user }) => (
  <div style={{ position: "fixed", top: 0, left: 0, width: "100%", zIndex: 1000 }}>
    <div
      style={{
        background: "linear-gradient(135deg,#3b1fa6,#6a5acd)",
        color: "#fff",
        padding: "16px 40px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
      }}
    >
      <div>
        <h2 style={{ margin: 0, letterSpacing: 1 }}>𝐒martZØηe</h2>
        <small style={{ opacity: 0.9 }}>Welcome to Smart Students classes</small>
      </div>

      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <img
          src={user.photo}
          alt=""
          style={{ width: 40, height: 40, borderRadius: "50%", border: "2px solid #fff" }}
        />
        <b>{user.name}</b>
      </div>
    </div>

    <div
      style={{
        background: "#ffffff",
        padding: "10px 40px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      }}
    >
      Welcome back, <b>{user.name}</b> 👋 Stay focused & keep learning!
    </div>
  </div>
);

/* =========================
   DASHBOARD CARDS
========================= */
const DashboardBoxes = ({ navigate }) => {
  const boxes = [
    { title: "Attendance", icon: <FaClipboardCheck />, path: "/student/attendance", bg: "linear-gradient(135deg,#1abc9c,#16a085)" },
    { title: "Fees", icon: <FaMoneyBillWave />, path: "/student/fees", bg: "linear-gradient(135deg,#e74c3c,#c0392b)" },
    { title: "Marks", icon: <FaChartLine />, path: "/student/marks", bg: "linear-gradient(135deg,#f39c12,#d35400)" },
    { title: "Homework", icon: <FaBook />, path: "/student/homework", bg: "linear-gradient(135deg,#3498db,#2980b9)" },
    { title: "Feedback", icon: <FaComments />, bg: "linear-gradient(135deg,#9b59b6,#8e44ad)" },
  ];

  return (
    <div
      style={{
        marginTop: 30,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
        gap: 26,
      }}
    >
      {boxes.map((b, i) => (
        <motion.div
          key={i}
          whileHover={{ scale: 1.06, y: -6 }}
          transition={{ type: "spring", stiffness: 300 }}
          onClick={() => b.path && navigate(b.path)}
          style={{
            background: b.bg,
            color: "#fff",
            padding: 30,
            borderRadius: 20,
            cursor: "pointer",
            boxShadow: "0 16px 35px rgba(0,0,0,0.25)",
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 12 }}>{b.icon}</div>
          <h3 style={{ margin: 0 }}>{b.title}</h3>
          <p style={{ marginTop: 8, opacity: 0.85, fontSize: 14 }}>
            View detailed {b.title.toLowerCase()} information
          </p>
        </motion.div>
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
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 900 }}
        />
      )}

      {/* SIDEBAR */}
      <aside
  style={{
    position: "fixed",
    top: sidebarOpen ? 120 : 0,   // 👈 open hone par niche
    left: sidebarOpen ? 0 : "-300px", // 👈 fully hidden
    width: 270,
    height: sidebarOpen ? "calc(100vh - 90px)" : "100vh",
    background: "linear-gradient(180deg,#2c3e50,#1a252f)",
    transition: "all 0.35s ease",
    zIndex: 1000,
    padding: sidebarOpen ? 20 : 0,
    overflow: "hidden",
    boxShadow: sidebarOpen ? "4px 0 20px rgba(0,0,0,0.4)" : "none",
  }}
>
        <h2 style={{ color: "#1abc9c", textAlign: "center", marginBottom: 30 }}>
          <FaUserGraduate /> Student Panel
        </h2>

        <nav style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {["Dashboard","Profile","Fees","Attendance","Marks","Exam Results","Homework","Study Material"].map((item, idx) => {
            const paths = ["/student","profile","fees","attendance","marks","exam-results","homework","study-material"];
            return (
              <Link
                key={idx}
                to={paths[idx]}
                onClick={() => setSidebarOpen(false)}
                style={linkStyle}
                onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
                onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
              >
                {item}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main
        style={{
          minHeight: "100vh",
          background: "#eef1f7",
          padding: "150px 40px 40px",
          marginLeft: sidebarOpen ? 270 : 0,
          transition: "0.3s",
        }}
      >
        <Header user={user} />

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            position: "fixed",
            top: 170,
            left: sidebarOpen ? 290 : 20,
            zIndex: 1100,
            padding: "12px 16px",
            fontSize: 18,
            borderRadius: 12,
            border: "none",
            background: "linear-gradient(135deg,#6a5acd,#4b2fa3)",
            color: "#fff",
            boxShadow: "0 8px 25px rgba(0,0,0,0.35)",
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