import React, { useState, useEffect, useCallback, useMemo } from "react"; 
import api from "../services/api"; 
 
const MarkAttendance = () => { 
  const now = new Date(); 
  const [selectedDate, setSelectedDate] = useState( 
    now.toISOString().split("T")[0] 
  ); 
   
  const [students, setStudents] = useState([]); 
  const [assignments, setAssignments] = useState([]); 
  const [bannedStudentIds, setBannedStudentIds] = useState(new Set()); 
   
  const [selectedBatchFilter, setSelectedBatchFilter] = useState(""); 
  const [selectedClassFilter, setSelectedClassFilter] = useState(""); 
   
  const [attendanceData, setAttendanceData] = useState({}); 
  const [studentSubjects, setStudentSubjects] = useState({}); 
  const [studentStreams, setStudentStreams] = useState({}); 
   
  const [loading, setLoading] = useState(true); 
  const [refreshing, setRefreshing] = useState(false); 
  const [submitting, setSubmitting] = useState(false); 
  const [error, setError] = useState(""); 
  const [successMessage, setSuccessMessage] = useState(""); 
  
  const [isEditing, setIsEditing] = useState(false);
  const [lastSubmitSummary, setLastSubmitSummary] = useState(null);

  const normalizeBatch = (batch) => {
    const value = String(batch || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");

    if (value.includes("batch3")) return "Batch 3";
    if (value.includes("batch2")) return "Batch 2";
    if (value.includes("batch1")) return "Batch 1";

    return "Not Assigned";
  };
 
  const fetchData = useCallback(async (showFullLoader = true) => { 
    try { 
      if (showFullLoader) { 
        setLoading(true); 
      } else { 
        setRefreshing(true); 
      } 
      setError(""); 
       
      let bannedSet = new Set(); 
      try { 
        const bannedRes = await api.get("/api/auth/banned-students"); 
        const bannedData = bannedRes.data; 
        const bannedList = Array.isArray(bannedData)  
          ? bannedData  
          : (bannedData.students || bannedData.banned || []); 
         
        bannedList.forEach(b => { 
          const id = typeof b === "object" ? (b.studentId || b._id || b.id) : b; 
          if (id) bannedSet.add(String(id)); 
        }); 
      } catch (err) { 
        console.warn("Could not fetch banned students list:", err); 
      } 
      setBannedStudentIds(bannedSet); 
 
      const attendanceRes = await api.get(`/api/attendance/list?date=${selectedDate}`); 
      const rawData = attendanceRes.data; 
       
      let rawStudents = []; 
      if (rawData && Array.isArray(rawData.students)) { 
        rawStudents = rawData.students; 
      } else if (Array.isArray(rawData)) { 
        rawStudents = rawData; 
      } 
 
      const initialStudents = rawStudents.filter(st => { 
        const sId = String(st.studentId || st._id || ""); 
        return !bannedSet.has(sId); 
      }); 
 
      setStudents(initialStudents); 
 
      let fetchedAssignments = []; 
      try { 
        const classesParam = "1st,2nd,3rd,4th,5th,6th,7th,8th,9th,10th,11th,12th"; 
        const assignmentsRes = await api.get(`/api/teacher-assignments/student-lectures/${classesParam}/${selectedDate}`); 
        if (assignmentsRes.data && Array.isArray(assignmentsRes.data.assignments)) { 
          fetchedAssignments = assignmentsRes.data.assignments; 
          setAssignments(fetchedAssignments); 
        } else { 
          setAssignments([]); 
        } 
      } catch (err) { 
        console.warn("Could not fetch teacher lectures schedule:", err); 
        setAssignments([]); 
      } 
 
      const getAutoSubjectForStudent = (student, assigns) => { 
        const cls = (student.class || "").toLowerCase(); 
        const isHigher = cls.includes("12") || cls.includes("xii") || cls.includes("11") || cls.includes("xi"); 
         
        const classAssigns = assigns.filter( 
          a => a.class_name && a.class_name.toLowerCase() === cls 
        ); 
 
        if (isHigher && student.stream) { 
          const streamMatch = classAssigns.find( 
            a => a.streams && Array.isArray(a.streams) && a.streams.some(s => s.toLowerCase().includes(student.stream.toLowerCase())) 
          ); 
          if (streamMatch && streamMatch.subject_name) { 
            return streamMatch.subject_name; 
          } 
        } 
 
        if (classAssigns.length > 0 && classAssigns[0].subject_name) { 
          return classAssigns[0].subject_name; 
        } 
 
        if (isHigher) { 
          return "Maths"; 
        } 
        return "Science"; 
      }; 
 
      const getStreamsForStudentHelper = (student, assigns) => { 
        const cls = (student.class || "").toLowerCase(); 
        const is12thOr11th = cls.includes("12") || cls.includes("xii") || cls.includes("11") || cls.includes("xi"); 
        if (!is12thOr11th) return []; 
 
        const streamsSet = new Set(); 
        assigns 
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
          streamsSet.add("Maths"); 
          streamsSet.add("Biology"); 
          streamsSet.add("Commerce"); 
        } 
 
        return [...streamsSet]; 
      }; 
 
      const initialAttendance = {}; 
      const initialSubjects = {}; 
      const initialStreams = {}; 
 
      let hasExistingAttendance = false;

      initialStudents.forEach((st) => {
        const id = st.studentId;

        if (st.attendanceId) {
          hasExistingAttendance = true;
          initialAttendance[id] = st.status;
        } else {
          initialAttendance[id] = "Present";
        }

        if (st.subjectCode) {
          initialSubjects[id] = st.subjectCode;
        } else {
          initialSubjects[id] = getAutoSubjectForStudent(st, fetchedAssignments);
        }

        if (st.stream) {
          initialStreams[id] = st.stream;
        } else {
          const availableStreams = getStreamsForStudentHelper(st, fetchedAssignments);
          if (availableStreams.length > 0) {
            initialStreams[id] = availableStreams[0];
          }
        }
      });
 
      setAttendanceData(initialAttendance); 
      setStudentSubjects(initialSubjects); 
      setStudentStreams(initialStreams); 
      setIsEditing(hasExistingAttendance);
 
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
    setSuccessMessage("");
    fetchData(true); 
  }, [selectedDate, fetchData]); 
 
  const uniqueClasses = useMemo(() => { 
    if (!Array.isArray(students)) return []; 
    return [...new Set(students.map(s => s.class).filter(Boolean))]; 
  }, [students]); 
 
  const getSubjectsForClass = (className) => { 
    if (!className) return []; 
    const matched = assignments.filter( 
      a => a.class_name && a.class_name.toLowerCase() === className.toLowerCase() 
    ); 
    const subs = matched.map(a => a.subject_name).filter(Boolean); 
    if (subs.length > 0) return [...new Set(subs)]; 
     
    const clsLower = className.toLowerCase(); 
    if (clsLower.includes("12") || clsLower.includes("11")) { 
      return ["Maths", "Chemistry", "Hindi", "English", "Physics", "Biology"]; 
    } 
    return ["Maths", "Science", "English", "Hindi", "Social Science"]; 
  }; 
 
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
      streamsSet.add("Maths"); 
      streamsSet.add("Biology"); 
      streamsSet.add("Commerce"); 
    } 
 
    return [...streamsSet]; 
  }; 
 
  const filteredStudents = useMemo(() => { 
    if (!Array.isArray(students)) return []; 
    return students.filter(student => { 
      const studentBatchCategory = normalizeBatch(student.batch); 
      const matchBatch = selectedBatchFilter ? studentBatchCategory === selectedBatchFilter : true; 
      const matchClass = selectedClassFilter ? student.class === selectedClassFilter : true; 
      return matchBatch && matchClass; 
    }); 
  }, [students, selectedBatchFilter, selectedClassFilter]); 
 
  const handleStatusChange = (studentId, status) => { 
    setAttendanceData(prev => ({ ...prev, [studentId]: status })); 
  }; 
 
  const handleSubjectRowChange = (studentId, subject) => { 
    setStudentSubjects(prev => ({ ...prev, [studentId]: subject })); 
  }; 
 
  const handleStreamRowChange = (studentId, stream) => { 
    setStudentStreams(prev => ({ ...prev, [studentId]: stream })); 
  }; 
 
  const markAll = (status) => { 
    const updated = { ...attendanceData }; 
    filteredStudents.forEach(student => { 
      updated[student.studentId] = status; 
    }); 
    setAttendanceData(updated); 
  }; 
 
  const handleSubmitAttendance = async () => { 
    try { 
      setSubmitting(true); 
      setError(""); 
      setSuccessMessage(""); 
   
      const attendancePayload = filteredStudents.map((student) => { 
        const classLectures = assignments.filter( 
          (a) => 
            String(a.class_name || "").trim().toLowerCase() === 
            String(student.class || "").trim().toLowerCase() 
        ); 
   
        const subject = 
          studentSubjects[student.studentId] || 
          student.subjectCode || 
          null; 
   
        const lecture = classLectures.find( 
          (a) => 
            String(a.subject_name || "").trim().toLowerCase() === 
            String(subject || "").trim().toLowerCase() 
        ); 
   
        return { 
          studentId: student.studentId, 
          status: attendanceData[student.studentId] || "Present", 
          subjectCode: subject, 
          stream: 
            studentStreams[student.studentId] || 
            student.stream || 
            null, 
          startTime: lecture?.start_time || null, 
          endTime: lecture?.end_time || null 
        }; 
      }); 
   
      const response = await api.post( 
        "/api/attendance/mark", 
        { 
          date: selectedDate, 
          attendance: attendancePayload 
        } 
      ); 
   
      const { 
        inserted = 0, 
        updated = 0 
      } = response.data; 
   
      setLastSubmitSummary({ 
        inserted, 
        updated, 
        total: filteredStudents.length 
      }); 
   
      setIsEditing(true); 
   
      setSuccessMessage( 
        `Attendance saved successfully. Inserted: ${inserted}, Updated: ${updated}` 
      ); 
   
      await fetchData(false); 
   
    } catch (err) { 
      console.error("Attendance submit error:", err); 
   
      setError( 
        err.response?.data?.message || 
        "Failed to save attendance." 
      ); 
    } finally { 
      setSubmitting(false); 
    } 
  }; 
 
  const stats = useMemo(() => { 
    const total = filteredStudents.length; 
    const present = filteredStudents.filter(s => attendanceData[s.studentId] === "Present").length; 
    const absent = filteredStudents.filter(s => attendanceData[s.studentId] === "Absent").length; 
    const holiday = filteredStudents.filter(s => attendanceData[s.studentId] === "Holiday").length; 
    return { total, present, absent, holiday }; 
  }, [filteredStudents, attendanceData]); 
 
  if (loading) { 
    return ( 
      <div style={pageStyle}> 
        <div style={loadingCardStyle}> 
          <div style={spinnerStyle}></div> 
          <div style={loadingTextStyle}>Loading active students...</div> 
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
              Banned students automatically hidden. Quick stream-based auto-selection enabled. 
            </p> 
          </div> 
          <div style={headerIconStyle}>📚</div> 
        </div> 
 
        {/* Filter & Controls Bar */} 
        <div style={cardStyle}> 
          <div style={filterGridStyle}> 
             
            <div style={inputGroupStyle}> 
              <label style={labelStyle}>Select Date</label> 
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)} 
                style={selectStyle} 
              /> 
            </div> 

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
                <option value="Batch 3">Batch 3 (6:00 PM - 7:30 PM)</option> 
              </select> 
            </div> 
 
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
 
        {error && <div style={errorStyle}>{error}</div>} 
        {successMessage && (
          <div style={successStyle}>
            {successMessage}
          </div>
        )}

        {filteredStudents.length > 0 && ( 
          <div style={metricsGridStyle}> 
            <div style={{ ...metricCardStyle, borderLeft: "4px solid #6366f1" }}> 
              <div style={metricLabelStyle}>Active Students</div> 
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
            <div style={{ ...metricCardStyle, borderLeft: "4px solid #f59e0b" }}> 
              <div style={metricLabelStyle}>Holiday</div> 
              <div style={{ ...metricValueStyle, color: "#d97706" }}>{stats.holiday}</div> 
            </div> 
          </div> 
        )} 
 
        <div style={cardStyle}> 
          <div style={tableHeaderStyle}> 
            <h3 style={tableTitleStyle}> 
              Students List {selectedBatchFilter ? `(${selectedBatchFilter})` : ""} 
            </h3> 
            {filteredStudents.length > 0 && ( 
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}> 
                <button type="button" onClick={() => markAll("Present")} style={quickBtnPresent}>Mark All Present</button> 
                <button type="button" onClick={() => markAll("Absent")} style={quickBtnAbsent}>Mark All Absent</button> 
                <button type="button" onClick={() => markAll("Holiday")} style={quickBtnHoliday}>Mark All Holiday</button> 
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
                    <th style={thStyle}>Subject</th> 
                    <th style={thStyle}>Stream</th> 
                    <th style={{ ...thStyle, textAlign: "center" }}>Attendance Status</th> 
                  </tr> 
                </thead> 
                <tbody> 
                  {filteredStudents.map((student, index) => { 
                    const currentStatus = attendanceData[student.studentId] || "Present"; 
                    const assignedBatch = normalizeBatch(student.batch); 
                    const classSubjects = getSubjectsForClass(student.class); 
                    const studentStreamsList = getStreamsForStudent(student); 
                    const isHigherClass = studentStreamsList.length > 0; 
 
                    let rowBgStyle = { backgroundColor: "#d1fae5" }; 
                    if (currentStatus === "Absent") {
                      rowBgStyle = { backgroundColor: "#fee2e2" };
                    } else if (currentStatus === "Holiday") {
                      rowBgStyle = { backgroundColor: "#fef3c7" };
                    }
 
                    return ( 
                      <tr key={`${student.studentId || "st"}-${index}`} style={{ borderBottom: "1px solid #cbd5e1", transition: "background-color 0.2s ease", ...rowBgStyle }}> 
                        <td style={tdStyle}>{index + 1}</td> 
                        <td style={{ ...tdStyle, fontWeight: "700", color: "#0f172a" }}>{student.studentName}</td> 
                        <td style={{ ...tdStyle, color: "#475569", fontSize: "13px" }}> 
                          <div>Class: <strong>{student.class}</strong></div> 
                          <div style={{ fontSize: "11px", color: "#4f46e5", fontWeight: "700" }}>{assignedBatch}</div> 
                        </td> 
                         
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
 
                        <td style={tdStyle}> 
                          {isHigherClass ? ( 
                            <select 
                              value={studentStreams[student.studentId] || ""} 
                              onChange={(e) => handleStreamRowChange(student.studentId, e.target.value)} 
                              style={{ ...rowSelectStyle, borderColor: "#7c3aed", backgroundColor: "#f5f3ff", fontWeight: "600" }} 
                            > 
                              <option value="">-- Select Stream --</option> 
                              {studentStreamsList.map((strm, stIdx) => ( 
                                <option key={stIdx} value={strm}>{strm}</option> 
                              ))} 
                            </select> 
                          ) : ( 
                            <span style={{ fontSize: "12px", color: "#64748b" }}>N/A</span> 
                          )} 
                        </td> 
 
                        <td style={{ ...tdStyle, textAlign: "center" }}> 
                          <div style={{ display: "flex", justifyContent: "center", gap: "18px", alignItems: "center", flexWrap: "wrap" }}> 
                             
                            <label style={radioLabelStyle}> 
                              <input 
                                type="radio" 
                                name={`attendance-${student.studentId}-${index}`} 
                                checked={currentStatus === "Present"} 
                                onChange={() => handleStatusChange(student.studentId, "Present")} 
                                style={{ accentColor: "#059669", width: "18px", height: "18px", cursor: "pointer" }} 
                              /> 
                              <span style={{ color: "#065f46", fontWeight: currentStatus === "Present" ? "800" : "600" }}> 
                                Present 
                              </span> 
                            </label> 
 
                            <label style={radioLabelStyle}> 
                              <input 
                                type="radio" 
                                name={`attendance-${student.studentId}-${index}`} 
                                checked={currentStatus === "Absent"} 
                                onChange={() => handleStatusChange(student.studentId, "Absent")} 
                                style={{ accentColor: "#dc2626", width: "18px", height: "18px", cursor: "pointer" }} 
                              /> 
                              <span style={{ color: "#991b1b", fontWeight: currentStatus === "Absent" ? "800" : "600" }}> 
                                Absent 
                              </span> 
                            </label> 

                            <label style={radioLabelStyle}> 
                              <input 
                                type="radio" 
                                name={`attendance-${student.studentId}-${index}`} 
                                checked={currentStatus === "Holiday"} 
                                onChange={() => handleStatusChange(student.studentId, "Holiday")} 
                                style={{ accentColor: "#d97706", width: "18px", height: "18px", cursor: "pointer" }} 
                              /> 
                              <span style={{ color: "#b45309", fontWeight: currentStatus === "Holiday" ? "800" : "600" }}> 
                                Holiday 
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
              No active students found for the selected filters and batch. 
            </div> 
          )} 
 
          {filteredStudents.length > 0 && ( 
            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}> 
              <button 
                type="button" 
                onClick={handleSubmitAttendance} 
                disabled={submitting} 
                style={submitButtonStyle} 
              > 
                {submitting 
                  ? "Saving Attendance..." 
                  : isEditing 
                    ? "✏️ Edit Attendance" 
                    : "Submit Attendance"} 
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
 
const metricsGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }; 
const metricCardStyle = { backgroundColor: "#ffffff", borderRadius: "16px", padding: "20px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)", border: "1px solid #e2e8f0" }; 
const metricLabelStyle = { fontSize: "13px", color: "#64748b", fontWeight: "600", marginBottom: "6px" }; 
const metricValueStyle = { fontSize: "22px", fontWeight: "700", color: "#0f172a" }; 
 
const tableHeaderStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }; 
const tableTitleStyle = { margin: 0, fontSize: "16px", fontWeight: "700", color: "#0f172a" }; 
 
const quickBtnPresent = { backgroundColor: "#059669", color: "#ffffff", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }; 
const quickBtnAbsent = { backgroundColor: "#dc2626", color: "#ffffff", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }; 
const quickBtnHoliday = { backgroundColor: "#d97706", color: "#ffffff", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }; 
 
const tableStyle = { width: "100%", borderCollapse: "collapse", fontSize: "14px", textAlign: "left" }; 
const thRowStyle = { borderBottom: "2px solid #cbd5e1", backgroundColor: "#f1f5f9" }; 
const thStyle = { padding: "12px 14px", fontWeight: "700", color: "#334155" }; 
const tdStyle = { padding: "12px 14px", color: "#334155", verticalAlign: "middle" }; 
const radioLabelStyle = { display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer", userSelect: "none" }; 
 
const submitButtonStyle = { backgroundColor: "#059669", color: "#ffffff", border: "none", padding: "12px 28px", borderRadius: "10px", fontSize: "15px", fontWeight: "700", cursor: "pointer", boxShadow: "0 4px 6px rgba(5, 150, 105, 0.3)" }; 

const errorStyle = { padding: "14px", backgroundColor: "#fee2e2", color: "#991b1b", borderRadius: "8px", fontSize: "14px", marginBottom: "24px", border: "1px solid #fca5a5", fontWeight: "500" }; 
const successStyle = { padding: "14px", backgroundColor: "#d1fae5", color: "#065f46", borderRadius: "8px", fontSize: "14px", marginBottom: "24px", border: "1px solid #6ee7b7", fontWeight: "500" }; 
const emptyStyle = { textAlign: "center", padding: "40px", color: "#64748b", fontSize: "14px" }; 
 
const loadingCardStyle = { backgroundColor: "#ffffff", borderRadius: "16px", padding: "40px", textAlign: "center", border: "1px solid #e2e8f0", maxWidth: "400px", margin: "100px auto", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" }; 
const spinnerStyle = { width: "32px", height: "32px", border: "3px solid #e2e8f0", borderTopColor: "#4f46e5", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }; 
const loadingTextStyle = { fontSize: "14px", color: "#64748b", fontWeight: "600" }; 
 
export default MarkAttendance;