import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

/* PUBLIC */
import Login from "./pages/Login";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Refund from "./pages/Refund";

/* ADMIN */
import AdminDashboard from "./pages/AdminDashboard";
import ManageStudents from "./pages/ManageStudents";
import AdminFees from "./pages/AdminFees";
import MarkAttendance from "./pages/MarkAttendance";
import AttendanceView from "./pages/AttendanceView";
import AdminAddMarks from "./pages/AdminAddMarks";
import AdminAddNewMarks from "./pages/AdminAddNewMarks";
import HomeworkAdmin from "./pages/HomeworkAdmin";
import AdminStudyMaterial from "./pages/AdminStudyMaterial";
import AdminPage from "./pages/AdminPage";
import AdminFeedback from "./pages/AdminFeedback";
import AdminChat from "./pages/AdminChat";
import AddTeacher from "./pages/AddTeacher";
import TeacherList from "./pages/TeacherList";
import AssignClasses from "./pages/AssignClasses";
import AdminQuizPage from "./pages/AdminQuizPage";
import AdminStudentStars from "./pages/AdminStudentStars";
import AdminExamFormDetails from "./pages/AdminExamformdetails";
import InternalMarksSheet from "./pages/StudentInternalmarks";
import AdminMeeting from "./pages/Meetings/AdminMeeting";
import AdminReport from "./pages/AdminReport";
import AdminViva from "./pages/AdminViva";

/* STUDENT */
import StudentDashboard from "./pages/StudentDashboard";
import StudentProfile from "./pages/StudentProfile";
import StudentFees from "./pages/StudentFees";
import StudentAttendance from "./pages/StudentAttendance";
import StudentsMarks from "./pages/StudentsMarks";
import StudentFeedback from "./pages/StudentFeedback";
import StudentStudyMaterial from "./pages/StudentStudyMaterial";
import StudentPage from "./pages/StudentPage";
import StudentPerformanceTree from "./pages/StudentPerformanceTree";
import ApplyCorrection from "./pages/ApplyCorrection";
import StudentQuizDashboard from "./pages/StudentQuizDashboard";
import AttemptQuizPage from "./pages/AttemptQuizPage";
import QuizReview from "./pages/QuizReview";
import RegisterationStudent from "./pages/RegisterationStudent";
import StudentResult from "./pages/Results_details/StudentResult";
import ViewResults from "./pages/Results_details/ViewResults";
import StudentDropApply from "./pages/StudentDropApply";
import StudentsMeetings from "./pages/Meetings/StudentsMeetings";
import StudentInternal from "./pages/Examination/StudentsInternal";
import AiInterview from "./pages/AiInterview";
import StudentViva from "./pages/StudentViva";
import VivaVerificationPage from "./pages/VivaVerificationPage";

/* EXAM */
import ExamForm from "./pages/Examination/ExamForm";
import GenerateAdmitCard from "./pages/Examination/GenerateAdmitCard";
import ExaminationResult from "./pages/Examination/ExaminationResult";

const ProtectedRoute = ({ children, allowedRole }) => {
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("role");
  const loginTime = localStorage.getItem("loginTime");

  const TEN_MINUTES = 10 * 60 * 1000;

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (loginTime) {
    const currentTime = new Date().getTime();
    const timeElapsed = currentTime - parseInt(loginTime, 10);

    if (timeElapsed > TEN_MINUTES) {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("loginTime");
      return <Navigate to="/" replace />;
    }
  } else {
    return <Navigate to="/" replace />;
  }

  if (allowedRole && userRole !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const VerifiedInterviewRoute = ({ children }) => {
  const isVerified = sessionStorage.getItem("viva_verified") === "true";
  if (!isVerified) {
    return <Navigate to="/student/verifying-identity" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* PUBLIC */}
        <Route path="/" element={<Login />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/refund_policy" element={<Refund />} />

        {/* ADMIN */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="manage-students" />} />
          <Route path="manage-students" element={<ManageStudents />} />
          <Route path="manage-fees" element={<AdminFees />} />
          <Route path="mark-attendance" element={<MarkAttendance />} />
          <Route path="attendance-view" element={<AttendanceView />} />
          <Route path="add-marks" element={<AdminAddMarks />} />
          <Route path="add-exam-marks" element={<AdminAddNewMarks />} />
          <Route path="upload-homework" element={<HomeworkAdmin />} />
          <Route path="study-material" element={<AdminStudyMaterial />} />
          <Route path="student-submission" element={<AdminPage />} />
          <Route path="admin-feedback" element={<AdminFeedback />} />
          <Route path="admin-chat" element={<AdminChat />} />
          <Route path="add-teacher" element={<AddTeacher />} />
          <Route path="teachers" element={<TeacherList />} />
          <Route path="assign-classes" element={<AssignClasses />} />
          <Route path="quiz" element={<AdminQuizPage />} />
          <Route path="student-stars" element={<AdminStudentStars />} />
          <Route path="check-examform" element={<AdminExamFormDetails />} />
          <Route path="admin-internal-marks" element={<InternalMarksSheet />} />
          <Route path="admin-meeting" element={<AdminMeeting />} />
          <Route path="student-summary" element={<AdminReport />} />
          <Route path="admin-viva-schduele" element={<AdminViva />} />
        </Route>

        {/* STUDENT */}
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRole="student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="profile" />} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="fees" element={<StudentFees />} />
          <Route path="attendance" element={<StudentAttendance />} />
          <Route path="marks" element={<StudentsMarks />} />
          <Route path="feedback" element={<StudentFeedback />} />
          <Route path="task-update" element={<StudentPage studentId={101} />} />
          <Route path="study-material" element={<StudentStudyMaterial />} />
          <Route path="Check-performance" element={<StudentPerformanceTree />} />
          <Route path="exam-form" element={<ExamForm />} />
          <Route path="generate-admit" element={<GenerateAdmitCard />} />
          <Route path="exam-result" element={<ExaminationResult />} />
          <Route path="apply-correction" element={<ApplyCorrection />} />
          <Route path="submit-results" element={<StudentResult />} />
          <Route path="view-results" element={<ViewResults />} />
          <Route path="drop-apply" element={<StudentDropApply />} />
          <Route path="quiz-dashboard" element={<StudentQuizDashboard />} />
          <Route path="register-student" element={<RegisterationStudent />} />
          <Route path="attempt/:id" element={<AttemptQuizPage />} />
          <Route path="review/:quizId/:studentId" element={<QuizReview />} />
          <Route path="students-meeting" element={<StudentsMeetings />} />
          <Route path="students-internal" element={<StudentInternal />} />
          <Route path="student-viva" element={<StudentViva />} />
          <Route path="verifying-identity" element={<VivaVerificationPage />} />
         <Route
  path="interview-english-practice"
  element={
    <VerifiedInterviewRoute>
      <AiInterview />
    </VerifiedInterviewRoute>
  }
/>
        </Route>

        {/* 404 */}
        <Route path="*" element={<div>404 - Page Not Found</div>} />
      </Routes>
    </Router>
  );
}

export default App;