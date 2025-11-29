import React, { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { FaBars, FaUserGraduate, FaMoneyBillWave, FaClipboardCheck, FaUpload } from "react-icons/fa";

const AdminDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

 const links = [
  { title: "Manage Students", path: "manage-students", icon: <FaUserGraduate /> },
  { title: "Manage Fees", path: "manage-fees", icon: <FaMoneyBillWave /> },
  { title: "Mark Attendance", path: "mark-attendance", icon: <FaClipboardCheck /> },
  { title: "View Attendance", path: "attendance-view", icon: <FaClipboardCheck /> },
  { title: "Upload Homework", path: "upload-homework", icon: <FaUpload /> }, // ✅ fixed
  { title: "Add Marks", path: "add-marks", icon: <FaUpload /> },
  { title: "Reports", path: "reports", icon: <FaUpload /> },
];


  // Dashboard cards only show on /admin
  const showDashboard = location.pathname === "/admin";

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
              <Link to={link.path} style={sidebarLink}>
                {link.icon} <span style={{ marginLeft: "10px" }}>{link.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Main Content */}
      <div style={main}>
        {/* Show header & cards only on dashboard */}
        {showDashboard && (
          <>
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

            {/* Action Boxes */}
            <div style={grid}>
              {links.map((link) => (
                <Link to={link.path} key={link.title} style={card}>
                  <div style={iconWrapper}>{link.icon}</div>
                  <h3 style={cardTitle}>{link.title}</h3>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Render clicked page content */}
        <Outlet />
      </div>
    </div>
  );
};

// Styles (same as before)
const page = { display: "flex", minHeight: "100vh", fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", background: "#f5f6fa", transition: "0.3s" };
const sidebar = { background: "linear-gradient(180deg, #1f3c88, #3959a1)", color: "#fff", display: "flex", flexDirection: "column", overflow: "hidden", transition: "0.3s", boxShadow: "2px 0 10px rgba(0,0,0,0.1)", zIndex: 2 };
const sidebarHeader = { fontSize: "24px", fontWeight: "700", marginBottom: "30px", textAlign: "center", textTransform: "uppercase", letterSpacing: "1px" };
const sidebarLinks = { listStyle: "none", padding: 0 };
const sidebarLink = { display: "flex", alignItems: "center", padding: "12px 15px", borderRadius: "10px", color: "#fff", marginBottom: "10px", textDecoration: "none", fontWeight: "500", transition: "0.2s" };
const main = { flex: 1, padding: "40px", position: "relative", transition: "margin-left 0.3s" };
const header = { marginBottom: "40px", textAlign: "center", position: "relative" };
const heading = { fontSize: "36px", color: "#1f3c88", marginBottom: "10px", fontWeight: "700" };
const welcomeText = { fontSize: "18px", color: "#555" };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginTop: "30px" };
const card = { background: "#fff", padding: "20px", borderRadius: "15px", textAlign: "center", color: "#1f3c88", textDecoration: "none", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", transition: "0.3s" };
const cardTitle = { marginTop: "10px", fontSize: "18px", fontWeight: "600" };
const iconWrapper = { fontSize: "32px", marginBottom: "5px" };

export default AdminDashboard;
