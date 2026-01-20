import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Pages
import Login from "./pages/Login";
// ✅ Yahan se { AdminFeedback } hata diya kyunki ye ab alag file hai
import AdminDashboard from "./pages/AdminDashboard"; 
import AdminFeedback from "./pages/AdminFeedback"; // ✅ Naya import add kiya
import AdminAddMarks from "./pages/AdminAddMarks";
import AdminAddNewMarks from "./pages/AdminAddNewMarks"; 
import StudentDashboard from "./pages/StudentDashboard";
import StudentAttendance from "./pages/StudentAttendance";
import MarkAttendance from "./pages/MarkAttendance";
import ManageStudents from "./pages/ManageStudents";
import AdminFees from "./pages/AdminFees";
import StudentFees from "./pages/StudentFees";
import AttendanceView from "./pages/AttendanceView";
import StudentsMarks from "./pages/StudentsMarks";
import HomeworkStudent from "./pages/HomeworkStudent";
import HomeworkAdmin from "./pages/HomeworkAdmin";
import StudentProfile from "./pages/StudentProfile";
import AdminStudyMaterial from "./pages/AdminStudyMaterial";
import StudentPage from "./pages/StudentPage";
import AdminPage from "./pages/AdminPage"; // Student submission
import AdminChat from "./pages/AdminChat"; // Admin chat
import StudentChat from "./pages/StudentChat";
import StudentFeedback from "./pages/StudentFeedback"; // Student chat
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Refund from "./pages/Refund";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/prefund_policy" element={<Refund />} />
        <Route path="/" element={<Login />} />

        {/* Admin Routes */}
        <Route path="/admin/*" element={<AdminDashboard />}>
          <Route index element={<div>Welcome to Admin Dashboard</div>} />
          <Route path="manage-students" element={<ManageStudents />} />
          <Route path="manage-fees" element={<AdminFees />} />
          <Route path="mark-attendance" element={<MarkAttendance />} />
          <Route path="attendance-view" element={<AttendanceView />} />
          <Route path="add-marks" element={<AdminAddMarks />} />
          <Route path="add-exam-marks" element={<AdminAddNewMarks />} />
          <Route path="reports" element={<div>Reports Page</div>} />
          <Route path="upload-homework" element={<HomeworkAdmin />} />
          <Route path="study-material" element={<AdminStudyMaterial />} />
          <Route path="student-submission" element={<AdminPage />} />
          {/* ✅ Ye element ab seedha AdminFeedback component use karega */}
          <Route path="admin-feedback" element={<AdminFeedback />} />

          {/* Admin Chat */}
          <Route path="admin-chat" element={<AdminChat />} />
        </Route>

        {/* Student Routes */}
        <Route path="/student/*" element={<StudentDashboard />}>
          <Route index element={<div>Welcome Student</div>} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="fees" element={<StudentFees />} />
          <Route path="attendance" element={<StudentAttendance />} />
          <Route path="marks" element={<StudentsMarks />} />
          <Route path="homework" element={<HomeworkStudent />} />
          <Route path="feedback" element={<StudentFeedback />} />
          <Route path="task-update" element={<StudentPage studentId={101} />} />

          {/* Student Chat */}
          <Route path="student-chat" element={<StudentChat />} />

          <Route path="*" element={<div>404 - Page Not Found</div>} />
        </Route>

        {/* Catch-all Route */}
        <Route path="*" element={<div>404 - Page Not Found</div>} />
      </Routes>
    </Router>
  );
}

export default App;