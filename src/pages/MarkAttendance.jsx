import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../services/api";

const MarkAttendance = () => {
  const now = new Date();
  const [selectedDate, setSelectedDate] = useState(
    now.toISOString().split("T")[0]
  );
  
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  
  const [selectedBatchFilter, setSelectedBatchFilter] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("");
  
  // State for storing attendance, subject per student, and stream per student
  const [attendanceData, setAttendanceData] = useState({}); // { studentId: 'Present' / 'Absent' }
  const [studentSubjects, setStudentSubjects] = useState({}); // { studentId: subjectName }
  const [studentStreams, setStudentStreams] = useState({}); // { studentId: streamName }
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Fetch attendance list and teacher lectures/assignments for the selected date
  const fetchData = useCallback(async (showFullLoader = true) => {
    try {
      if (showFullLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError("");
      
      // 1. Fetch Attendance List
      const attendanceRes = await api.get(`/api/attendance/list?date=${selectedDate}`);
      const rawData = attendanceRes.data;
      
      let initialStudents = [];
      if (rawData && Array.isArray(rawData.students)) {
        initialStudents = rawData.students;
      } else if (Array.isArray(rawData)) {
        initialStudents = rawData;
      }

      setStudents(initialStudents);

      const initialAttendance = {};
      const initialSubjects = {};
      const initialStreams = {};

      initialStudents.forEach(st => {
        if (st.status) {
          initialAttendance[st.studentId] = st.status;
        } else {
          initialAttendance[st.studentId] = "Absent"; // Default to Absent
        }
        if (st.subjectCode || st.subject_name) {
          initialSubjects[st.studentId] = st.subjectCode || st.subject_name;
        }
        if (st.stream) {
          initialStreams[st.studentId] = st.stream;
        }
      });

      setAttendanceData(initialAttendance);
      setStudentSubjects(initialSubjects);
      setStudentStreams(initialStreams);

      // 2. Fetch Teacher Assignments / Lectures Schedule for 1st to 12th classes
      try {
        const classesParam = "1st,2nd,3rd,4th,5th,6th,7th,8th,9th,10th,11th,12th";
        const assignmentsRes = await api.get(`/api/teacher-assignments/student-lectures/${classesParam}/${selectedDate}`);
        if (assignmentsRes.data && Array.isArray(assignmentsRes.data.assignments)) {
          setAssignments(assignmentsRes.data.assignments);
        } else {
          setAssignments([]);
        }
      } catch (err) {
        console.warn("Could not fetch teacher lectures schedule:", err);
        setAssignments([]);
      }

    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Unable to load attendance and lecture records. Please try again.");
      setStudents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData(true);
  }, [selectedDate, fetchData]);

  // Helper to normalize batch names into strictly Batch 1 or Batch 2 (case-insensitive)
  const normalizeBatch = (batchStr, batchTimeStr) => {
    const text = `${batchStr || ""} ${batchTimeStr || ""}`.toLowerCase();
    if (text.includes("batch 2") || text.includes("batch2") || text.includes("4:30 pm")) {
      return "Batch 2";
    }
    return "Batch 1"; // Default fallback
  };

  // Unique classes extracted from students list
  const uniqueClasses = useMemo(() => {
    if (!Array.isArray(students)) return [];
    return [...new Set(students.map(s => s.class).filter(Boolean))];
  }, [students]);

  // Get available subjects for a specific class
  const getSubjectsForClass = (className) => {
    if (!className) return [];
    const matched = assignments.filter(
      a => a.class_name && a.class_name.toLowerCase() === className.toLowerCase()
    );
    const subs = matched.map(a => a.subject_name).filter(Boolean);
    if (subs.length > 0) return [...new Set(subs)];
    
    // Fallback default subjects if none found in assignments
    const clsLower = className.toLowerCase();
    if (clsLower.includes("12") || clsLower.includes("11")) {
      return ["Maths", "Chemistry", "Hindi", "English", "Physics", "Biology"];
    }
    return ["Maths", "Science", "English", "Hindi", "Social Science"];
  };

  // Get available streams for 11th/12th students
  const getStreamsForStudent = (student) => {
    const cls = (student.class || "").toLowerCase();
    const is12thOr11th = cls.includes("12") || cls.includes("xii") || cls.includes("11") || cls.includes("xi");
    if (!is12thOr11th) return [];

    const streamsSet = new Set();
    assignments
      .filter(a => a.class_name && a.class_name.toLowerCase() === cls)
      .forEach(a => {
        if (Array.isArray(a.streams)) {
          a.streams.forEach(s => streamsSet.add(s));
        }
      });

    if (streamsSet.size === 0 && student.stream) {
      streamsSet.add(student.stream);
    }

    if (streamsSet.size === 0) {
      streamsSet.add("Chemistry,Maths");
      streamsSet.add("Hindi,English");
    }

    return [...streamsSet];
  };

  // Filter students based on Batch and Class
  const filteredStudents = useMemo(() => {
    if (!Array.isArray(students)) return [];
    return students.filter(student => {
      const studentBatchCategory = normalizeBatch(student.batch, student.batchTime);
      const matchBatch = selectedBatchFilter ? studentBatchCategory === selectedBatchFilter : true;
      const matchClass = selectedClassFilter ? student.class === selectedClassFilter : true;
      return matchBatch && matchClass;
    });
  }, [students, selectedBatchFilter, selectedClassFilter]);

  // Handle individual status change (Present / Absent)
  const handleStatusChange = (studentId, status) => {
    setAttendanceData(prev => ({ ...prev, [studentId]: status }));
  };

  // Handle subject change per row
  const handleSubjectRowChange = (studentId, subject) => {
    setStudentSubjects(prev => ({ ...prev, [studentId]: subject }));
  };

  // Handle stream change per row
  const handleStreamRowChange = (studentId, stream) => {
    setStudentStreams(prev => ({ ...prev, [studentId]: stream }));
  };

  // Mark all present / absent quick actions
  const markAll = (status) => {
    const updated = { ...attendanceData };
    filteredStudents.forEach(student => {
      updated[student.studentId] = status;
    });
    setAttendanceData(updated);
  };

  // Submit final attendance to backend
  const handleSubmitAttendance = async () => {
    try {
      setSubmitting(true);
      setError("");
      setSuccessMessage("");

      const payload = {
        date: selectedDate,
        attendance: filteredStudents.map(student => ({
          studentId: student.studentId,
          status: attendanceData[student.studentId] || "Absent",
          class: student.class,
          subjectCode: studentSubjects[student.studentId] || student.subjectCode || null,
          stream: studentStreams[student.studentId] || student.stream || null,
          batch: normalizeBatch(student.batch, student.batchTime),
          batchTime: student.batchTime
        })),
      };

      await api.post("/api/attendance/mark", payload);
      setSuccessMessage("Attendance marked and saved successfully! 🎉");
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      console.error("Error submitting attendance:", err);
      setError("Failed to submit attendance. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = filteredStudents.length;
    const present = filteredStudents.filter(s => attendanceData[s.studentId] === "Present").length;
    const absent = filteredStudents.filter(s => attendanceData[s.studentId] === "Absent" || !attendanceData[s.studentId]).length;
    return { total, present, absent };
  }, [filteredStudents, attendanceData]);

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={loadingCardStyle}>
          <div style={spinnerStyle}></div>
          <div style={loadingTextStyle}>Loading attendance records...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        
        {/* Header Section */}
        <div style={headerStyle}>
          <div>
            <div style={badgeStyle}>SMART STUDENTS CLASSES</div>
            <h1 style={titleStyle}>Attendance Management</h1>
            <p style={subtitleStyle}>
              Manage Batches (Batch 1 & Batch 2), Subjects for today, Streams, and Attendance.
            </p>
          </div>
          <div style={headerIconStyle}>📚</div>
        </div>

        {/* Filter & Controls Bar */}
        <div style={cardStyle}>
          <div style={filterGridStyle}>
            
            {/* Date Picker */}
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={selectStyle}
              />
            </div>

            {/* Select Batch (Strictly Batch 1 & Batch 2) */}
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Select Batch</label>
              <select
                value={selectedBatchFilter}
                onChange={(e) => setSelectedBatchFilter(e.target.value)}
                style={selectStyle}
              >
                <option value="">-- All Batches --</option>
                <option value="Batch 1">Batch 1 (3:00 PM - 4:30 PM)</option>
                <option value="Batch 2">Batch 2 (4:30 PM - 6:00 PM)</option>
              </select>
            </div>

            {/* Select Class */}
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Filter by Class</label>
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                style={selectStyle}
              >
                <option value="">-- All Classes --</option>
                {uniqueClasses.map((cls, idx) => (
                  <option key={idx} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => fetchData(false)}
              disabled={refreshing}
              style={buttonStyle}
            >
              {refreshing ? "Refreshing..." : "Refresh Data"}
            </button>
          </div>
        </div>

        {/* Notifications */}
        {error && <div style={errorStyle}>{error}</div>}
        {successMessage && <div style={successStyle}>{successMessage}</div>}

        {/* Summary Metrics */}
        {filteredStudents.length > 0 && (
          <div style={metricsGridStyle}>
            <div style={{ ...metricCardStyle, borderLeft: "4px solid #6366f1" }}>
              <div style={metricLabelStyle}>Total Students</div>
              <div style={metricValueStyle}>{stats.total}</div>
            </div>
            <div style={{ ...metricCardStyle, borderLeft: "4px solid #10b981" }}>
              <div style={metricLabelStyle}>Present</div>
              <div style={{ ...metricValueStyle, color: "#10b981" }}>{stats.present}</div>
            </div>
            <div style={{ ...metricCardStyle, borderLeft: "4px solid #ef4444" }}>
              <div style={metricLabelStyle}>Absent</div>
              <div style={{ ...metricValueStyle, color: "#ef4444" }}>{stats.absent}</div>
            </div>
          </div>
        )}

        {/* Student List Data Table */}
        <div style={cardStyle}>
          <div style={tableHeaderStyle}>
            <h3 style={tableTitleStyle}>
              Students List {selectedBatchFilter ? `(${selectedBatchFilter})` : ""}
            </h3>
            {filteredStudents.length > 0 && (
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="button" onClick={() => markAll("Present")} style={quickBtnPresent}>Mark All Present</button>
                <button type="button" onClick={() => markAll("Absent")} style={quickBtnAbsent}>Mark All Absent</button>
              </div>
            )}
          </div>

          {filteredStudents.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={thRowStyle}>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Student Name</th>
                    <th style={thStyle}>Class & Batch</th>
                    <th style={thStyle}>Subjects for Today</th>
                    <th style={thStyle}>Stream</th>
                    <th style={{ ...thStyle, textAlign: "center" }}>Attendance (Present / Absent)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student, index) => {
                    const currentStatus = attendanceData[student.studentId] || "Absent";
                    const assignedBatch = normalizeBatch(student.batch, student.batchTime);
                    const classSubjects = getSubjectsForClass(student.class);
                    const studentStreamsList = getStreamsForStudent(student);
                    const isHigherClass = studentStreamsList.length > 0;

                    return (
                      <tr key={student.studentId || index} style={trStyle}>
                        <td style={tdStyle}>{index + 1}</td>
                        <td style={{ ...tdStyle, fontWeight: "600" }}>{student.studentName}</td>
                        <td style={{ ...tdStyle, color: "#6b7280", fontSize: "13px" }}>
                          <div>Class: <strong>{student.class}</strong></div>
                          <div style={{ fontSize: "11px", color: "#4f46e5", fontWeight: "600" }}>{assignedBatch}</div>
                        </td>
                        
                        {/* Subjects for Today Column Dropdown */}
                        <td style={tdStyle}>
                          <select
                            value={studentSubjects[student.studentId] || ""}
                            onChange={(e) => handleSubjectRowChange(student.studentId, e.target.value)}
                            style={rowSelectStyle}
                          >
                            <option value="">-- Select Subject --</option>
                            {classSubjects.map((sub, sIdx) => (
                              <option key={sIdx} value={sub}>{sub}</option>
                            ))}
                          </select>
                        </td>

                        {/* Stream Column (Only for 11th/12th or if streams exist) */}
                        <td style={tdStyle}>
                          {isHigherClass ? (
                            <select
                              value={studentStreams[student.studentId] || ""}
                              onChange={(e) => handleStreamRowChange(student.studentId, e.target.value)}
                              style={{ ...rowSelectStyle, borderColor: "#c4b5fd", backgroundColor: "#f5f3ff" }}
                            >
                              <option value="">-- Select Stream --</option>
                              {studentStreamsList.map((strm, stIdx) => (
                                <option key={stIdx} value={strm}>{strm}</option>
                              ))}
                            </select>
                          ) : (
                            <span style={{ fontSize: "12px", color: "#9ca3af" }}>N/A</span>
                          )}
                        </td>

                        {/* Attendance Radio Buttons Column */}
                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          <div style={{ display: "flex", justifyContent: "center", gap: "16px", alignItems: "center" }}>
                            
                            {/* Present Radio */}
                            <label style={radioLabelStyle}>
                              <input
                                type="radio"
                                name={`attendance-${student.studentId}`}
                                checked={currentStatus === "Present"}
                                onChange={() => handleStatusChange(student.studentId, "Present")}
                                style={{ accentColor: "#10b981", cursor: "pointer" }}
                              />
                              <span style={{ color: currentStatus === "Present" ? "#10b981" : "#4b5563", fontWeight: currentStatus === "Present" ? "700" : "500" }}>
                                Present
                              </span>
                            </label>

                            {/* Absent Radio */}
                            <label style={radioLabelStyle}>
                              <input
                                type="radio"
                                name={`attendance-${student.studentId}`}
                                checked={currentStatus === "Absent"}
                                onChange={() => handleStatusChange(student.studentId, "Absent")}
                                style={{ accentColor: "#ef4444", cursor: "pointer" }}
                              />
                              <span style={{ color: currentStatus === "Absent" ? "#ef4444" : "#4b5563", fontWeight: currentStatus === "Absent" ? "700" : "500" }}>
                                Absent
                              </span>
                            </label>

                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={emptyStyle}>
              No students found for the selected filters and batch.
            </div>
          )}

          {/* Submit Action Button */}
          {filteredStudents.length > 0 && (
            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={handleSubmitAttendance}
                disabled={submitting}
                style={submitButtonStyle}
              >
                {submitting ? "Saving Attendance..." : "Submit Attendance"}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

// Styles
const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "#f8fafc",
  padding: "24px 16px",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  color: "#1e293b",
  boxSizing: "border-box",
};

const containerStyle = { maxWidth: "1200px", margin: "0 auto" };

const headerStyle = {
  backgroundColor: "#ffffff",
  borderRadius: "16px",
  padding: "24px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "24px",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
  border: "1px solid #e2e8f0",
};

const badgeStyle = {
  fontSize: "11px",
  letterSpacing: "1px",
  fontWeight: "700",
  color: "#6366f1",
  marginBottom: "4px",
  textTransform: "uppercase",
};

const titleStyle = { margin: "0 0 6px 0", fontSize: "24px", fontWeight: "700", color: "#0f172a" };
const subtitleStyle = { margin: 0, fontSize: "14px", color: "#64748b" };
const headerIconStyle = { fontSize: "32px", backgroundColor: "#e0e7ff", padding: "12px", borderRadius: "12px" };

const cardStyle = { 
  backgroundColor: "#ffffff", 
  borderRadius: "16px", 
  padding: "24px", 
  marginBottom: "24px", 
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
  border: "1px solid #e2e8f0" 
};

const filterGridStyle = { display: "flex", gap: "16px", alignItems: "flex-end", flexWrap: "wrap" };
const inputGroupStyle = { display: "flex", flexDirection: "column", gap: "6px", flex: "1", minWidth: "200px" };
const labelStyle = { fontSize: "12px", fontWeight: "600", color: "#475569" };
const selectStyle = { height: "42px", padding: "0 12px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", color: "#1e293b", fontSize: "14px", outline: "none" };
const rowSelectStyle = { height: "36px", padding: "0 8px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", color: "#1e293b", fontSize: "13px", outline: "none", width: "100%" };
const buttonStyle = { height: "42px", padding: "0 20px", borderRadius: "8px", border: "none", backgroundColor: "#4f46e5", color: "#ffffff", fontSize: "14px", fontWeight: "600", cursor: "pointer", boxShadow: "0 2px 4px rgba(79, 70, 229, 0.2)" };

const metricsGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" };
const metricCardStyle = { backgroundColor: "#ffffff", borderRadius: "16px", padding: "20px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)", border: "1px solid #e2e8f0" };
const metricLabelStyle = { fontSize: "13px", color: "#64748b", fontWeight: "600", marginBottom: "6px" };
const metricValueStyle = { fontSize: "22px", fontWeight: "700", color: "#0f172a" };

const tableHeaderStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" };
const tableTitleStyle = { margin: 0, fontSize: "16px", fontWeight: "700", color: "#0f172a" };

const quickBtnPresent = { backgroundColor: "#d1fae5", color: "#065f46", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer" };
const quickBtnAbsent = { backgroundColor: "#fee2e2", color: "#991b1b", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer" };

const tableStyle = { width: "100%", borderCollapse: "collapse", fontSize: "14px", textAlign: "left" };
const thRowStyle = { borderBottom: "2px solid #f1f5f9", backgroundColor: "#f8fafc" };
const thStyle = { padding: "12px 14px", fontWeight: "700", color: "#475569" };
const trStyle = { borderBottom: "1px solid #f1f5f9" };
const tdStyle = { padding: "12px 14px", color: "#334155", verticalAlign: "middle" };

const radioLabelStyle = { display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer", userSelect: "none" };

const submitButtonStyle = { backgroundColor: "#10b981", color: "#ffffff", border: "none", padding: "12px 28px", borderRadius: "10px", fontSize: "15px", fontWeight: "700", cursor: "pointer", boxShadow: "0 4px 6px rgba(16, 185, 129, 0.2)" };

const errorStyle = { padding: "14px", backgroundColor: "#fee2e2", color: "#991b1b", borderRadius: "8px", fontSize: "14px", marginBottom: "24px", border: "1px solid #fca5a5", fontWeight: "500" };
const successStyle = { padding: "14px", backgroundColor: "#d1fae5", color: "#065f46", borderRadius: "8px", fontSize: "14px", marginBottom: "24px", border: "1px solid #6ee7b7", fontWeight: "500" };
const emptyStyle = { textAlign: "center", padding: "40px", color: "#64748b", fontSize: "14px" };

const loadingCardStyle = { backgroundColor: "#ffffff", borderRadius: "16px", padding: "40px", textAlign: "center", border: "1px solid #e2e8f0", maxWidth: "400px", margin: "100px auto", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" };
const spinnerStyle = { width: "32px", height: "32px", border: "3px solid #e2e8f0", borderTopColor: "#4f46e5", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" };
const loadingTextStyle = { fontSize: "14px", color: "#64748b", fontWeight: "600" };

export default MarkAttendance;