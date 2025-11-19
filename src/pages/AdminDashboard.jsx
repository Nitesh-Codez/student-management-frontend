import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FaBars } from "react-icons/fa";

// Correct import path
import AdminAddMarks from "./AdminAddMarks";

const AdminDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeLink, setActiveLink] = useState("Manage Students");

  const links = [
    { title: "Manage Students", path: "/admin/manage-students" },
    { title: "Manage Fees", path: "/admin/manage-fees" },
    { title: "Mark Attendance", path: "/admin/mark-attendance" },
    { title: "View Attendance", path: "/admin/attendance-view" },
    { title: "Test Marks", path: "/admin/testmarks" },
    { title: "Add Marks", path: "/admin/add-marks" },
    { title: "Reports", path: "/admin/reports" },
  ];

  return (
    <div style={page}>
      {/* Sidebar */}
      <div
        style={{
          ...sidebar,
          width: sidebarOpen ? "220px" : "0",
          padding: sidebarOpen ? "30px 20px" : "0",
        }}
      >
        <h2 style={sidebarHeader}>Smart Students</h2>
        <ul style={sidebarLinks}>
          {links.map((link) => (
            <li key={link.title}>
              <Link
                to={link.path}
                style={{
                  ...sidebarLink,
                  backgroundColor: activeLink === link.title ? "#3959a1" : "transparent",
                  opacity: sidebarOpen ? 1 : 0,
                  pointerEvents: sidebarOpen ? "auto" : "none",
                }}
                onClick={() => setActiveLink(link.title)}
              >
                {link.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Main Content */}
      <div style={main}>
        {/* Hamburger + Header */}
        <div style={header}>
          <FaBars
            size={25}
            color="#1f3c88"
            style={{ cursor: "pointer", position: "absolute", left: 20, top: 20 }}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          />
          <h1 style={heading}>Admin Dashboard</h1>
          <p style={welcomeText}>Welcome, Admin 👋 to Smart Students Classes!</p>
        </div>

        {/* Cards Section */}
        <div style={cardsContainer}>
          {links.map((link) => (
            <Link key={link.title} to={link.path} style={{ textDecoration: "none" }}>
              <div
                className="card"
                style={{
                  ...card,
                  background:
                    activeLink === link.title
                      ? "linear-gradient(135deg, #3959a1, #1f3c88)"
                      : "linear-gradient(135deg, #1f3c88, #3959a1)",
                }}
                onClick={() => setActiveLink(link.title)}
              >
                {link.title}
              </div>
            </Link>
          ))}
        </div>

        {/* Render Add Marks if active */}
        {activeLink === "Add Marks" && <AdminAddMarks />}

        {/* Card hover animation */}
        <style>{`
          .card:hover {
            transform: translateY(-6px) scale(1.05);
            box-shadow: 0 15px 30px rgba(0,0,0,0.3);
          }
        `}</style>
      </div>
    </div>
  );
};

// Page layout
const page = {
  display: "flex",
  minHeight: "100vh",
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  background: "#f0f2f5",
};

// Sidebar
const sidebar = {
  background: "linear-gradient(180deg, #1f3c88, #3959a1)",
  color: "#fff",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  transition: "0.3s",
};

const sidebarHeader = {
  fontSize: "24px",
  fontWeight: "700",
  marginBottom: "30px",
  textAlign: "center",
};

const sidebarLinks = {
  listStyle: "none",
  padding: 0,
};

const sidebarLink = {
  display: "block",
  padding: "12px 15px",
  borderRadius: "10px",
  color: "#fff",
  marginBottom: "10px",
  transition: "all 0.3s ease",
};

// Main content
const main = {
  flex: 1,
  padding: "40px",
  position: "relative",
};

// Header
const header = {
  marginBottom: "40px",
  textAlign: "center",
  position: "relative",
};

const heading = {
  fontSize: "38px",
  color: "#1f3c88",
  marginBottom: "10px",
  fontWeight: "700",
};

const welcomeText = {
  fontSize: "18px",
  color: "#555",
};

// Cards container
const cardsContainer = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "25px",
};

// Card style
const card = {
  color: "#fff",
  padding: "25px 20px",
  borderRadius: "15px",
  fontSize: "18px",
  fontWeight: "600",
  textAlign: "center",
  cursor: "pointer",
  transition: "all 0.3s ease",
  boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
};

export default AdminDashboard;
