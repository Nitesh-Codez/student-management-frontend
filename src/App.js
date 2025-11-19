// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Pages
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import AdminAddMarks from "./pages/AdminAddMarks";
import StudentDashboard from "./pages/StudentDashboard";
import StudentAttendance from "./pages/StudentAttendance";
import MarkAttendance from "./pages/MarkAttendance";
import ManageStudents from "./pages/ManageStudents";
import AdminFees from "./pages/AdminFees";
import StudentFees from "./pages/StudentFees";
import AttendanceView from "./pages/AttendanceView";
import SubjectsList from "./pages/SubjectsList";
import StudentsMarks from "./pages/StudentsMarks";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/manage-students" element={<ManageStudents />} />
        <Route path="/admin/manage-fees" element={<AdminFees />} />
        <Route path="/admin/mark-attendance" element={<MarkAttendance />} />
        <Route path="/admin/attendance-view" element={<AttendanceView />} />
        <Route path="/admin/add-marks" element={<AdminAddMarks />} />
        <Route path="/admin/reports" element={<div>Reports Page</div>} />

        {/* Student Routes */}
        <Route path="/student" element={<StudentDashboard />}>
          <Route index element={<SubjectsList />} />
          <Route path="profile" element={<div>Profile Page</div>} />
          <Route path="fees" element={<StudentFees />} />
          <Route path="attendance" element={<StudentAttendance />} />
          <Route path="marks" element={<SubjectsList />} />
          <Route path="marks/:subject" element={<StudentsMarks />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
