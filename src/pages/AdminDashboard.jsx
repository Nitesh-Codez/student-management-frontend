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
  FaComments,
  FaChartBar,
  FaArrowRight
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

// ================== ADMIN FEEDBACK COMPONENT ==================
const AdminFeedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get("/api/feedback/admin/all")
      .then((res) => {
        setFeedbacks(res.data.feedbacks || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const calculatePercentage = (answers) => {
    if (!answers || answers.length === 0) return { positive: 0, negative: 0 };
    const positiveCount = answers.filter((a) => a.answer >= 3).length;
    const positive = Math.round((positiveCount / answers.length) * 100);
    const negative = 100 - positive;
    return { positive, negative };
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Loading Insights...</div>;

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto"
      >
        <header className="mb-10 text-center">
          <h2 className="text-4xl font-extrabold text-gray-800 tracking-tight">
            Student <span className="text-indigo-600">Feedback</span> Insights
          </h2>
          <div className="h-1 w-20 bg-indigo-600 mx-auto mt-4 rounded-full"></div>
          <p className="text-gray-500 mt-4 font-medium">Analyze satisfaction levels and campus sentiment</p>
        </header>

        {feedbacks.length === 0 ? (
          <div className="bg-white p-16 rounded-[2rem] shadow-sm text-center border border-gray-100">
            <FaChartBar className="mx-auto text-gray-200 text-6xl mb-4" />
            <p className="text-gray-400 text-xl font-medium">No feedback entries found yet.</p>
          </div>
        ) : (
          <div className="grid gap-8 grid-cols-1 md:grid-cols-2">
            {feedbacks.map((f) => {
              const { positive, negative } = calculatePercentage(f.mcq_answers);
              return (
                <motion.div
                  whileHover={{ y: -5 }}
                  key={f.id}
                  className="bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col"
                >
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 text-white flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
                        <FaUserGraduate />
                      </div>
                      <span className="font-bold uppercase tracking-widest text-xs">Class {f.class}</span>
                    </div>
                    <span className="text-xs bg-white/20 px-3 py-1 rounded-full backdrop-blur-md font-semibold">
                      {f.month}/{f.year}
                    </span>
                  </div>

                  <div className="p-8 flex-grow">
                    <div className="flex justify-between items-start mb-6">
                      <h3 className="text-2xl font-bold text-gray-800">{f.name}</h3>
                      <div className="flex items-center bg-yellow-50 px-3 py-1 rounded-full border border-yellow-100">
                        <FaStar className="mr-1 text-yellow-500" />
                        <span className="font-bold text-yellow-700">{f.rating}/5</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-indigo-50/50 p-4 rounded-2xl border-l-4 border-indigo-400">
                        <p className="text-[10px] font-black text-indigo-600 uppercase mb-1 tracking-widest">Student Suggestion</p>
                        <p className="text-gray-700 text-sm leading-relaxed italic">
                          "{f.suggestion || "No suggestions provided"}"
                        </p>
                      </div>

                      <div className="bg-rose-50/50 p-4 rounded-2xl border-l-4 border-rose-400">
                        <p className="text-[10px] font-black text-rose-600 uppercase mb-1 tracking-widest">Reported Problem</p>
                        <p className="text-gray-700 text-sm leading-relaxed italic">
                          "{f.problem || "No problems reported"}"
                        </p>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-50">
                      <div className="flex justify-between text-[11px] font-black mb-3">
                        <span className="text-emerald-600 uppercase">Positive {positive}%</span>
                        <span className="text-rose-500 uppercase">Negative {negative}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3 flex overflow-hidden p-0.5">
                        <div style={{ width: `${positive}%` }} className="bg-emerald-500 h-full rounded-full transition-all duration-1000"></div>
                        <div style={{ width: `${negative}%` }} className="bg-rose-500 h-full rounded-full transition-all duration-1000"></div>
                      </div>
                    </div>

                    {negative > 30 && (
                      <div className="mt-6 flex items-center justify-center bg-rose-600 text-white py-3 rounded-xl shadow-lg shadow-rose-200 animate-pulse">
                        <FaExclamationTriangle className="mr-2" />
                        <span className="text-xs font-bold uppercase tracking-tighter">Needs Immediate Action</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};

// ================== ADMIN DASHBOARD ==================
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

  const showDashboard = location.pathname === "/admin";

  return (
    <div style={page}>
      <div style={main}>
        {showDashboard && (
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
              {links.map((link, idx) => (
                <Link to={link.path} key={link.title} style={cardStyle}>
                  <div style={{...iconBox, background: `${link.color}15`, color: link.color}}>
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
        )}
        <Outlet />
      </div>

      <style>
        {`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          .admin-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            border-color: #e2e8f0;
          }

          .admin-card:hover .arrow-icon {
            opacity: 1;
            transform: translateX(0);
          }
        `}
      </style>
    </div>
  );
};

// ================== MODERN STYLES ==================
const page = {
  minHeight: "100vh",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  background: "#fcfdfe",
};

const main = {
  padding: "40px 20px",
  maxWidth: "1300px",
  margin: "0 auto",
};

const container = {
  animation: "slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
};

const header = {
  marginBottom: "60px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  paddingBottom: "20px",
  borderBottom: "1px solid #f1f5f9"
};

const heading = {
  fontSize: "48px",
  color: "#0f172a",
  margin: "0",
  fontWeight: "800",
  letterSpacing: "-2px",
};

const welcomeText = {
  fontSize: "18px",
  color: "#64748b",
  marginTop: "8px",
  fontWeight: "500"
};

const statusBadge = {
    background: "#f1f5f9",
    padding: "8px 16px",
    borderRadius: "100px",
    fontSize: "13px",
    fontWeight: "700",
    color: "#475569",
    display: "flex",
    alignItems: "center",
    gap: "8px"
};

const dot = {
    width: "8px",
    height: "8px",
    background: "#10b981",
    borderRadius: "50%",
    boxShadow: "0 0 0 4px #10b98120"
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
  gap: "24px",
};

const cardStyle = {
  background: "#ffffff",
  padding: "24px",
  borderRadius: "28px",
  textDecoration: "none",
  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
  transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
  display: "flex",
  alignItems: "center",
  gap: "20px",
  border: "1px solid #f1f5f9",
  className: "admin-card" // Reference for hover animation
};

const iconBox = {
  fontSize: "24px",
  width: "60px",
  height: "60px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "18px",
  flexShrink: 0,
};

const cardContent = {
    flex: 1,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
};

const cardTitleStyle = {
  fontSize: "15px",
  fontWeight: "700",
  margin: "0",
  color: "#1e293b",
  lineHeight: "1.2"
};

const arrowStyle = {
    opacity: 0,
    transform: "translateX(-10px)",
    transition: "all 0.3s ease",
    color: "#6366f1"
};

export default AdminDashboard;
export { AdminFeedback };