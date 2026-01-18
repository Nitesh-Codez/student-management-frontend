import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  FaUserGraduate,
  FaMoneyBillWave,
  FaClipboardCheck,
  FaUpload,
  FaBookOpen,
  FaFileUpload,
  FaStar,
  FaExclamationTriangle,
  FaComments, // Chat icon
} from "react-icons/fa";
import axios from "axios";
import AdminChat from "./AdminChat"; // Chat component

// ================== ADMIN FEEDBACK COMPONENT ==================
const AdminFeedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);

  useEffect(() => {
    axios
      .get("/api/feedback/admin/all")
      .then((res) => setFeedbacks(res.data.feedbacks || []))
      .catch((err) => console.error(err));
  }, []);

  const calculatePercentage = (answers) => {
    if (!answers || answers.length === 0) return { positive: 0, negative: 0 };
    const positiveCount = answers.filter((a) => a.answer >= 3).length;
    const positive = Math.round((positiveCount / answers.length) * 100);
    const negative = 100 - positive;
    return { positive, negative };
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 text-center">
          <h2 className="text-4xl font-extrabold text-gray-800 tracking-tight">
            Student <span className="text-indigo-600">Feedback</span> Insights
          </h2>
          <p className="text-gray-500 mt-2">Monitor student satisfaction and suggestions</p>
        </header>

        {feedbacks.length === 0 ? (
          <div className="bg-white p-10 rounded-3xl shadow-sm text-center border border-gray-100">
            <p className="text-gray-400 text-xl font-medium">No feedback entries found yet.</p>
          </div>
        ) : (
          <div className="grid gap-8 grid-cols-1 md:grid-cols-2">
            {feedbacks.map((f) => {
              const { positive, negative } = calculatePercentage(f.mcq_answers);
              return (
                <div
                  key={f.id}
                  className="bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 border border-gray-100 flex flex-col"
                >
                  {/* Header Bar */}
                  <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
                    <span className="font-bold uppercase tracking-wider text-xs">
                      Class {f.class}
                    </span>
                    <span className="text-xs bg-indigo-500 px-2 py-1 rounded-full">
                      {f.month}/{f.year}
                    </span>
                  </div>

                  <div className="p-6 flex-grow">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-gray-800">{f.name}</h3>
                      <div className="flex items-center text-yellow-500">
                        <FaStar className="mr-1" />
                        <span className="font-bold text-gray-700">{f.rating}/5</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-blue-50 p-3 rounded-xl border-l-4 border-blue-400">
                        <p className="text-xs font-bold text-blue-600 uppercase mb-1 italic">Suggestion</p>
                        <p className="text-gray-700 text-sm leading-relaxed">
                          "{f.suggestion || "No suggestions provided"}"
                        </p>
                      </div>

                      <div className="bg-red-50 p-3 rounded-xl border-l-4 border-red-400">
                        <p className="text-xs font-bold text-red-600 uppercase mb-1 italic">Problem</p>
                        <p className="text-gray-700 text-sm leading-relaxed">
                          "{f.problem || "No problems reported"}"
                        </p>
                      </div>
                    </div>

                    {/* Stats Section */}
                    <div className="mt-6">
                      <div className="flex justify-between text-xs font-bold mb-2">
                        <span className="text-green-600 uppercase italic">Positive {positive}%</span>
                        <span className="text-red-500 uppercase italic">Negative {negative}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 flex overflow-hidden">
                        <div style={{ width: `${positive}%` }} className="bg-green-500 h-full shadow-inner"></div>
                        <div style={{ width: `${negative}%` }} className="bg-red-500 h-full shadow-inner"></div>
                      </div>
                    </div>

                    {negative > 30 && (
                      <div className="mt-4 flex items-center bg-red-600 text-white p-2 rounded-lg animate-pulse">
                        <FaExclamationTriangle className="mr-2" />
                        <span className="text-xs font-bold uppercase italic tracking-tighter">
                          Needs Immediate Attention
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ================== ADMIN DASHBOARD ==================
const AdminDashboard = () => {
  const location = useLocation();

  const links = [
    { title: "Manage Students", path: "manage-students", icon: <FaUserGraduate /> },
    { title: "Manage Fees", path: "manage-fees", icon: <FaMoneyBillWave /> },
    { title: "Mark Attendance", path: "mark-attendance", icon: <FaClipboardCheck /> },
    { title: "View Attendance", path: "attendance-view", icon: <FaClipboardCheck /> },
    { title: "Upload Homework", path: "upload-homework", icon: <FaUpload /> },
    { title: "Study Material", path: "study-material", icon: <FaUpload /> },
    { title: "Add Marks", path: "add-marks", icon: <FaUpload /> },
    { title: "Add Exam Marks", path: "add-exam-marks", icon: <FaBookOpen /> },
    { title: "Reports", path: "reports", icon: <FaUpload /> },
    { title: "Student Submission", path: "student-submission", icon: <FaFileUpload /> },
    { title: "Student Feedback", path: "admin-feedback", icon: <FaStar /> },
    { title: "Student Chat", path: "admin-chat", icon: <FaComments /> }, // <-- added chat
  ];

  const showDashboard = location.pathname === "/admin";

  return (
    <div style={page}>
      <div style={main}>
        {showDashboard && (
          <div style={container}>
            <div style={header}>
              <h1 style={heading}>Hello Nitesh</h1>
              <p style={welcomeText}>Admin Management Workspace Overview 👋</p>
            </div>

            <div style={grid}>
              {links.map((link) => (
                <Link to={link.path} key={link.title} style={cardStyle}>
                  <div style={iconBox}>{link.icon}</div>
                  <h3 style={cardTitleStyle}>{link.title}</h3>
                </Link>
              ))}
            </div>
          </div>
        )}
        <Outlet /> {/* Nested route content */}
      </div>

      <style>
        {`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          a:hover div {
            transform: scale(1.1) rotate(5deg);
            color: #ffcc00 !important;
          }
          
          a:active {
            transform: scale(0.95);
          }
        `}
      </style>
    </div>
  );
};

// ================== MODERN STYLES ==================
const page = {
  minHeight: "100vh",
  fontFamily: "'Inter', sans-serif",
  background: "linear-gradient(to bottom right, #f8f9fc, #eef2f7)",
};

const main = {
  padding: "20px",
  maxWidth: "1400px",
  margin: "0 auto",
};

const container = {
  animation: "slideUp 0.5s ease-out forwards",
};

const header = {
  marginBottom: "50px",
  textAlign: "left",
  paddingLeft: "10px",
  borderLeft: "6px solid #1a237e",
};

const heading = {
  fontSize: "42px",
  color: "#1a237e",
  margin: "0",
  fontWeight: "800",
  letterSpacing: "-1px",
};

const welcomeText = {
  fontSize: "18px",
  color: "#64748b",
  marginTop: "5px",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: "20px",
};

const cardStyle = {
  background: "#ffffff",
  padding: "30px 20px",
  borderRadius: "24px",
  textAlign: "center",
  color: "#1e293b",
  textDecoration: "none",
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  border: "1px solid #f1f5f9",
};

const iconBox = {
  fontSize: "40px",
  color: "#1a237e",
  marginBottom: "15px",
  transition: "all 0.3s ease",
  background: "#f0f2ff",
  width: "80px",
  height: "80px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "20px",
};

const cardTitleStyle = {
  fontSize: "16px",
  fontWeight: "700",
  margin: "0",
  color: "#334155",
};

export default AdminDashboard;
export { AdminFeedback };