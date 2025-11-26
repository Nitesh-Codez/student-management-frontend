import React, { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { FaBars } from "react-icons/fa";

const AdminDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const links = [
    { title: "Manage Students", path: "manage-students" },
    { title: "Manage Fees", path: "manage-fees" },
    { title: "Mark Attendance", path: "mark-attendance" },
    { title: "View Attendance", path: "attendance-view" },
    { title: "Test Marks", path: "testmarks" },
    { title: "Add Marks", path: "add-marks" },
    { title: "Reports", path: "reports" },
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
                style={sidebarLink}
              >
                {link.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Main Content */}
      <div style={main}>
        <div style={header}>
          <FaBars
            size={25}
            color="#1f3c88"
            style={{ cursor: "pointer", position: "absolute", left: 20, top: 20 }}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          />
          <h1 style={heading}>Admin Dashboard</h1>
          <p style={welcomeText}>Welcome, Admin 👋</p>
        </div>

        {/* Outlet for nested admin routes */}
        <div style={{ marginTop: "30px" }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

// Styles
const page = { display: "flex", minHeight: "100vh", fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", background: "#f0f2f5" };
const sidebar = { background: "linear-gradient(180deg, #1f3c88, #3959a1)", color: "#fff", display: "flex", flexDirection: "column", overflow: "hidden", transition: "0.3s" };
const sidebarHeader = { fontSize: "24px", fontWeight: "700", marginBottom: "30px", textAlign: "center" };
const sidebarLinks = { listStyle: "none", padding: 0 };
const sidebarLink = { display: "block", padding: "12px 15px", borderRadius: "10px", color: "#fff", marginBottom: "10px", textDecoration: "none" };
const main = { flex: 1, padding: "40px", position: "relative" };
const header = { marginBottom: "40px", textAlign: "center", position: "relative" };
const heading = { fontSize: "38px", color: "#1f3c88", marginBottom: "10px", fontWeight: "700" };
const welcomeText = { fontSize: "18px", color: "#555" };

export default AdminDashboard;
