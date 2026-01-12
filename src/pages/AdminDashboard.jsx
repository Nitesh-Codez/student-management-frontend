import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  FaUserGraduate,
  FaMoneyBillWave,
  FaClipboardCheck,
  FaUpload,
  FaBookOpen,
  FaFileUpload,
} from "react-icons/fa";
import axios from "axios";

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
    const positiveCount = answers.filter((a) => a.answer >= 3).length; // 3,4 = positive
    const negativeCount = answers.length - positiveCount;
    const positive = Math.round((positiveCount / answers.length) * 100);
    const negative = Math.round((negativeCount / answers.length) * 100);
    return { positive, negative };
  };

  return (
    <div className="p-6 w-full min-h-screen">
      <h2 className="text-3xl font-bold mb-6 text-center text-green-700">
        All Student Feedback
      </h2>
      {feedbacks.length === 0 && (
        <p className="text-center text-gray-500 text-xl">No feedback yet.</p>
      )}
      <div className="grid gap-6">
        {feedbacks.map((f) => {
          const { positive, negative } = calculatePercentage(f.mcq_answers);
          return (
            <div
              key={f.id}
              className="border-4 border-black p-6 rounded-2xl shadow-lg bg-white"
            >
              <h3 className="text-xl font-bold mb-2">
                {f.name} ({f.class}) - {f.month}/{f.year}
              </h3>

              <p className="font-bold mb-1">Suggestion:</p>
              <p className="mb-3">{f.suggestion || "N/A"}</p>

              <p className="font-bold mb-1">Problem:</p>
              <p className="mb-3">{f.problem || "N/A"}</p>

              <p className="font-bold mb-1">Rating: {f.rating} / 5</p>

              <p className="font-bold mt-3">MCQ Answers:</p>
              <div className="ml-4">
                {f.mcq_answers.map((a) => (
                  <p key={a.question_number}>
                    Q{a.question_number}: Option {a.answer}
                  </p>
                ))}
              </div>

              <p className="font-bold mt-3">
                Positive Feedback: {positive}% | Negative Feedback: {negative}%
              </p>
              {negative > 0 && (
                <p className="text-red-600 font-bold mt-1">
                  ⚠ Check negative responses carefully
                </p>
              )}
            </div>
          );
        })}
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
    { title: "Student Feedback", path: "admin-feedback", icon: <FaClipboardCheck /> }, // ✅ Feedback card
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

// ================== STYLES ==================
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
export { AdminFeedback };
