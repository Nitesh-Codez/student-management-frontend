import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  FaUserGraduate,
  FaMoneyBillWave,
  FaClipboardCheck,
  FaUpload,
  FaBookOpen,
  FaFileUpload,
  FaStar,
  FaComments,
  FaChartBar,
  FaArrowRight
} from "react-icons/fa";

const AdminDashboard = () => {
  const location = useLocation();

  const links = [
    { title: "Manage Students", path: "manage-students", icon: <FaUserGraduate />, color: "#4f46e5" },
    { title: "Manage Fees", path: "manage-fees", icon: <FaMoneyBillWave />, color: "#0891b2" },
    { title: "Mark Attendance", path: "mark-attendance", icon: <FaClipboardCheck />, color: "#059669" },
    { title: "View Attendance", path: "attendance-view", icon: <FaChartBar />, color: "#7c3aed" },
    { title: "Upload Homework", path: "upload-homework", icon: <FaUpload />, color: "#ea580c" },
    { title: "Study Material", path: "study-material", icon: <FaBookOpen />, color: "#2563eb" },
    { title: "Add Marks", path: "add-marks", icon: <FaStar />, color: "#db2777" },
    { title: "Add Exam Marks", path: "add-exam-marks", icon: <FaFileUpload />, color: "#4338ca" },
    { title: "Reports", path: "reports", icon: <FaChartBar />, color: "#1e293b" },
    { title: "Student Submission", path: "student-submission", icon: <FaFileUpload />, color: "#0d9488" },
    { title: "Student Feedback", path: "admin-feedback", icon: <FaStar />, color: "#eab308" },
    { title: "Student Chat", path: "admin-chat", icon: <FaComments />, color: "#6366f1" },
  ];

  const showDashboard = location.pathname === "/admin" || location.pathname === "/admin/";

  return (
    <div style={page}>
      <div style={main}>
        {showDashboard ? (
          <div style={container}>
            <header style={header}>
              <div>
                <h1 style={heading}>Hello, Nitesh</h1>
                <p style={welcomeText}>Welcome back to your Command Center 👋</p>
              </div>
              <div style={statusBadge}>
                 <span style={dot}></span> System Online
              </div>
            </header>

            <div style={grid}>
              {links.map((link) => (
                <Link to={link.path} key={link.title} className="admin-card" style={cardStyle}>
                  <div style={{ ...iconBox, background: `${link.color}15`, color: link.color }}>
                    {link.icon}
                  </div>
                  <div style={cardContent}>
                    <h3 style={cardTitleStyle}>{link.title}</h3>
                    <div className="arrow-icon" style={arrowStyle}>
                      <FaArrowRight size={12} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <Outlet /> 
        )}
      </div>

      <style>
        {`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          .admin-card {
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
          }

          .admin-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
            border-color: #e2e8f0 !important;
          }

          .admin-card:hover .arrow-icon {
            opacity: 1 !important;
            transform: translateX(0) !important;
          }
        `}
      </style>
    </div>
  );
};

// Styles
const page = { minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', sans-serif", background: "#fcfdfe" };
const main = { padding: "40px 20px", maxWidth: "1300px", margin: "0 auto" };
const container = { animation: "slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards" };
const header = { marginBottom: "60px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: "20px", borderBottom: "1px solid #f1f5f9" };
const heading = { fontSize: "48px", color: "#0f172a", margin: 0, fontWeight: "800", letterSpacing: "-2px" };
const welcomeText = { fontSize: "18px", color: "#64748b", marginTop: "8px", fontWeight: "500" };
const statusBadge = { background: "#f1f5f9", padding: "8px 16px", borderRadius: "100px", fontSize: "13px", fontWeight: "700", color: "#475569", display: "flex", alignItems: "center", gap: "8px" };
const dot = { width: "8px", height: "8px", background: "#10b981", borderRadius: "50%", boxShadow: "0 0 0 4px #10b98120" };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "24px" };
const cardStyle = { background: "#ffffff", padding: "24px", borderRadius: "28px", textDecoration: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", display: "flex", alignItems: "center", gap: "20px", border: "1px solid #f1f5f9" };
const iconBox = { fontSize: "24px", width: "60px", height: "60px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "18px", flexShrink: 0 };
const cardContent = { flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" };
const cardTitleStyle = { fontSize: "15px", fontWeight: "700", margin: 0, color: "#1e293b", lineHeight: "1.2" };
const arrowStyle = { opacity: 0, transform: "translateX(-10px)", transition: "all 0.3s ease", color: "#6366f1" };

export default AdminDashboard;