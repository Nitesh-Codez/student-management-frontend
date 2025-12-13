import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  FaUserGraduate,
  FaMoneyBillWave,
  FaClipboardCheck,
  FaUpload,
} from "react-icons/fa";

const AdminDashboard = () => {
  const location = useLocation();

  const links = [
    { title: "Manage Students", path: "manage-students", icon: <FaUserGraduate /> },
    { title: "Manage Fees", path: "manage-fees", icon: <FaMoneyBillWave /> },
    { title: "Mark Attendance", path: "mark-attendance", icon: <FaClipboardCheck /> },
    { title: "View Attendance", path: "attendance-view", icon: <FaClipboardCheck /> },
    { title: "Upload Homework", path: "upload-homework", icon: <FaUpload /> },

    // ✅ NEW FEATURE
    { title: "Study Material", path: "study-material", icon: <FaUpload /> },

    { title: "Add Marks", path: "add-marks", icon: <FaUpload /> },
    { title: "Reports", path: "reports", icon: <FaUpload /> },
  ];

  const showDashboard = location.pathname === "/admin";

  return (
    <div style={page}>
      <div style={main}>
        {showDashboard && (
          <>
            <div style={header}>
              <h1 style={heading}>Hello Nitesh</h1>
              <p style={welcomeText}>Welcome, Admin workspace 👋</p>
            </div>

            <div style={grid}>
              {links.map((link) => (
                <Link
                  to={link.path}
                  key={link.title}
                  style={{
                    ...card,
                    background:
                      "linear-gradient(135deg, #1f3c88, #3959a1, #18a539, #ffcc00)",
                    backgroundSize: "400% 400%",
                    animation: "gradientBG 8s ease infinite",
                  }}
                >
                  <div
                    style={{
                      ...iconWrapper,
                      animation: "iconBounce 1.5s infinite",
                    }}
                  >
                    {link.icon}
                  </div>
                  <h3 style={cardTitle}>{link.title}</h3>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Child pages render here */}
        <Outlet />
      </div>

      <style>
        {`
          @keyframes gradientBG {
            0% {background-position: 0% 50%;}
            50% {background-position: 100% 50%;}
            100% {background-position: 0% 50%;}
          }

          @keyframes iconBounce {
            0%, 100% { transform: translateY(0);}
            50% { transform: translateY(-8px);}
          }

          a:hover {
            transform: translateY(-8px) scale(1.05);
            box-shadow: 0 15px 30px rgba(0,0,0,0.25);
          }
        `}
      </style>
    </div>
  );
};

// Styles
const page = {
  display: "flex",
  minHeight: "100vh",
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  background: "#f5f6fa",
};

const main = {
  flex: 1,
  padding: "40px",
};

const header = {
  marginBottom: "40px",
  textAlign: "center",
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

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "25px",
};

const card = {
  padding: "25px 20px",
  borderRadius: "15px",
  textAlign: "center",
  color: "#fff",
  textDecoration: "none",
  boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
  transition: "0.3s",
};

const cardTitle = {
  marginTop: "12px",
  fontSize: "18px",
  fontWeight: "700",
};

const iconWrapper = {
  fontSize: "36px",
  marginBottom: "10px",
};

export default AdminDashboard;
