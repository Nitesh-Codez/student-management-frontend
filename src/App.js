import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Pages
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import AdminAddMarks from "./pages/AdminAddMarks";
import AdminAddNewMarks from "./pages/AdminAddNewMarks"; // ✅ New
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

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/" element={<Login />} />

        {/* Admin Routes */}
        <Route path="/admin/*" element={<AdminDashboard />}>
          <Route index element={<div>Welcome to Admin Dashboard</div>} />
          <Route path="manage-students" element={<ManageStudents />} />
          <Route path="manage-fees" element={<AdminFees />} />
          <Route path="mark-attendance" element={<MarkAttendance />} />
          <Route path="attendance-view" element={<AttendanceView />} />
          <Route path="add-marks" element={<AdminAddMarks />} />

          {/* ✅ New Route for Exam Marks */}
          <Route path="add-exam-marks" element={<AdminAddNewMarks />} />

          <Route path="reports" element={<div>Reports Page</div>} />
          <Route path="upload-homework" element={<HomeworkAdmin />} />
          <Route path="study-material" element={<AdminStudyMaterial />} />
        </Route>

        {/* Student Routes */}
        <Route path="/student/*" element={<StudentDashboard />}>
          <Route index element={<div>Welcome Student</div>} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="fees" element={<StudentFees />} />
          <Route path="attendance" element={<StudentAttendance />} />

          {/* Test Marks Routes */}
          <Route path="marks" element={<StudentsMarks />} />
          <Route path="homework" element={<HomeworkStudent />} />
          <Route path="*" element={<div>404 - Page Not Found</div>} />
        </Route>

        {/* Catch-all Route */}
        <Route path="*" element={<div>404 - Page Not Found</div>} />
      </Routes>
    </Router>
  );
}

export default App;
