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
  
  // Batch Timings Configuration State
  const [batchTimings, setBatchTimings] = useState({
    "Batch 1": { start: "03:00 PM", end: "04:30 PM" },
    "Batch 2": { start: "04:30 PM", end: "06:00 PM" },
    "Batch 3": { start: "06:00 PM", end: "07:30 PM" }
  });
  const [showTimingModal, setShowTimingModal] = useState(false);
  const [editingBatchName, setEditingBatchName] = useState("Batch 1");
  const [tempStartTime, setTempStartTime] = useState("03:00 PM");
  const [tempEndTime, setTempEndTime] = useState("04:30 PM");

  // Lecture Configuration States
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [lectureType, setLectureType] = useState(""); 
  const [classRangeStart, setClassRangeStart] = useState("");
  const [classRangeEnd, setClassRangeEnd] = useState("");
  const [configuredSubject, setConfiguredSubject] = useState("");

  // Batch Shifting States
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [studentToShift, setStudentToShift] = useState(null);
  const [targetBatch, setTargetBatch] = useState("Batch 1");
  const [shifting, setShifting] = useState(false);

  const [attendanceData, setAttendanceData] = useState({}); 
  const [studentSubjects, setStudentSubjects] = useState({}); 
  const [studentStreams, setStudentStreams] = useState({}); 

  const [loading, setLoading] = useState(false); 
  const [refreshing, setRefreshing] = useState(false); 
  const [submitting, setSubmitting] = useState(false); 
  const [error, setError] = useState(""); 
  const [successMessage, setSuccessMessage] = useState(""); 
  const [isEditing, setIsEditing] = useState(false);

  const normalizeBatch = (batch) => {
    const value = String(batch || "").trim().toLowerCase().replace(/\s+/g, "");
    if (value.includes("batch3")) return "Batch 3";
    if (value.includes("batch2")) return "Batch 2";
    if (value.includes("batch1")) return "Batch 1";
    return "Not Assigned";
  };
 
  const fetchData = useCallback(async (showFullLoader = false) => { 
    try { 
      if (showFullLoader) setLoading(true); 
      else setRefreshing(true); 
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
            } else if (a.streams) {
              streamsSet.add(a.streams);
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

      const getAutoSubjectForStudent = (student, assigns, availableSubjects) => { 
        const cls = (student.class || "").toLowerCase(); 
        const isHigher = cls.includes("12") || cls.includes("xii") || cls.includes("11") || cls.includes("xi"); 
        
        const classAssigns = assigns.filter( 
          a => a.class_name && a.class_name.toLowerCase() === cls 
        ); 

        const studentStreamVal = String(student.stream || "").toLowerCase();
        if (isHigher && studentStreamVal) {
          const streamKeywords = studentStreamVal.split(/[,/]+/).map(s => s.trim());
          for (const sub of availableSubjects) {
            const subLower = sub.toLowerCase();
            if (streamKeywords.some(kw => subLower.includes(kw) || kw.includes(subLower))) {
              return sub;
            }
          }
        }

        if (classAssigns.length > 0 && classAssigns[0].subject_name) { 
          return classAssigns[0].subject_name; 
        } 

        if (availableSubjects.length > 0) {
          return availableSubjects[0];
        }

        return isHigher ? "Maths" : "Science"; 
      }; 

      const initialAttendance = {}; 
      const initialSubjects = {}; 
      const initialStreams = {}; 

      let hasExistingAttendance = false;

      initialStudents.forEach((st) => {
        const id = st.studentId;

        if (st.attendanceId || st.status) {
          hasExistingAttendance = true;
          initialAttendance[id] = st.status || "Present";
        } else {
          initialAttendance[id] = "Present";
        }

        const className = st.class;
        let subs = [];
        if (className) {
          const matched = fetchedAssignments.filter(
            a => a.class_name && a.class_name.toLowerCase() === className.toLowerCase()
          );
          subs = matched.map(a => a.subject_name).filter(Boolean);
          if (subs.length === 0) {
            const clsLower = className.toLowerCase();
            if (clsLower.includes("12") || clsLower.includes("11")) {
              subs = ["Maths", "Chemistry", "Hindi", "English", "Physics", "Biology"];
            } else {
              subs = ["Maths", "Science", "English", "Hindi", "Social Science"];
            }
          }
        }
        const uniqueSubs = [...new Set(subs)];

        const availableStreams = getStreamsForStudentHelper(st, fetchedAssignments);
        if (st.stream) {
          initialStreams[id] = st.stream;
        } else if (availableStreams.length > 0) {
          initialStreams[id] = availableStreams[0];
        }

        if (st.subjectCode) {
          initialSubjects[id] = st.subjectCode;
        } else {
          initialSubjects[id] = getAutoSubjectForStudent(st, fetchedAssignments, uniqueSubs);
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
    fetchData(false); 
  }, [selectedDate, fetchData]); 

  const uniqueClasses = useMemo(() => { 
    if (!Array.isArray(students)) return []; 
    return [...new Set(students.map(s => s.class).filter(Boolean))]; 
  }, [students]); 

  const availableConfigurationSubjects = useMemo(() => {
    if (lectureType === "Exam") {
      return [
        "Hindi PRE FINAL EXAM", "English PREFINAL EXAM", "Hindi FINAL EXAM", "English FINAL EXAM",
        "Maths PRE FINAL EXAM", "Maths FINAL EXAM", "Science PRE FINAL EXAM", "Science FINAL EXAM",
        "Physics PRE FINAL EXAM", "Physics FINAL EXAM", "Chemistry PRE FINAL EXAM", "Chemistry FINAL EXAM",
        "Biology PRE FINAL EXAM", "Biology FINAL EXAM"
      ];
    } else {
      return [
        "Maths", "Science", "Physics", "Chemistry", "Biology", 
        "English", "Hindi", "Social Science", "Computer Science", 
        "Accountancy", "Business Studies", "Economics"
      ];
    }
  }, [lectureType]);

  const isClassInRange = (studentClass) => {
    if (!classRangeStart || !classRangeEnd || !studentClass) return false;
    
    const parseClassNum = (c) => {
      const match = String(c).match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    };

    const sNum = parseClassNum(studentClass);
    const startNum = parseClassNum(classRangeStart);
    const endNum = parseClassNum(classRangeEnd);

    if (sNum && startNum && endNum) {
      return sNum >= startNum && sNum <= endNum;
    }
    return false;
  };

  const handleApplyLectureConfig = () => {
    if (!lectureType) {
      alert("Please select a Lecture Type.");
      return;
    }

    const updatedSubjects = { ...studentSubjects };
    const updatedAttendance = { ...attendanceData };

    filteredStudents.forEach(student => {
      if (isClassInRange(student.class)) {
        if (configuredSubject) {
          updatedSubjects[student.studentId] = configuredSubject;
        }
        if (lectureType === "Holiday") {
          updatedAttendance[student.studentId] = "Holiday";
        }
      }
    });

    setStudentSubjects(updatedSubjects);
    setAttendanceData(updatedAttendance);
    setShowConfigModal(false);
    setSuccessMessage(`Lecture Configuration (${lectureType}) applied successfully to selected class range!`);
  };

  const handleOpenTimingModal = (batchName) => {
    setEditingBatchName(batchName);
    setTempStartTime(batchTimings[batchName]?.start || "03:00 PM");
    setTempEndTime(batchTimings[batchName]?.end || "04:30 PM");
    setShowTimingModal(true);
  };

  const handleSaveBatchTiming = () => {
    setBatchTimings(prev => ({
      ...prev,
      [editingBatchName]: { start: tempStartTime, end: tempEndTime }
    }));
    setShowTimingModal(false);
    setSuccessMessage(`Timing updated for ${editingBatchName} (${tempStartTime} - ${tempEndTime})!`);
  };

  const handleOpenShiftModal = (student) => {
    setStudentToShift(student);
    setTargetBatch(normalizeBatch(student.batch) !== "Not Assigned" ? normalizeBatch(student.batch) : "Batch 1");
    setShowShiftModal(true);
  };

  const handleConfirmShiftBatch = async () => {
    if (!studentToShift) return;

    try {
      setShifting(true);
      setError("");
      setSuccessMessage("");

      const response = await api.put(`/api/attendance/student/${studentToShift.studentId}/batch`, {
        batch: targetBatch
      });

      if (response.data && response.data.success) {
        setSuccessMessage(response.data.message || `${studentToShift.studentName} shifted successfully to ${targetBatch}!`);
        setShowShiftModal(false);
        setStudentToShift(null);
        await fetchData(false);
      }
    } catch (err) {
      console.error("Error shifting student batch:", err);
      setError(err.response?.data?.message || "Failed to shift student batch.");
    } finally {
      setShifting(false);
    }
  };

  const getStreamsForStudent = useCallback((student) => { 
    const cls = (student.class || "").toLowerCase(); 
    const is12thOr11th = cls.includes("12") || cls.includes("xii") || cls.includes("11") || cls.includes("xi"); 
    if (!is12thOr11th) return []; 

    const streamsSet = new Set(); 
    assignments 
      .filter(a => a.class_name && a.class_name.toLowerCase() === cls) 
      .forEach(a => { 
        if (Array.isArray(a.streams)) {
          a.streams.forEach(s => streamsSet.add(s));
        } else if (a.streams) {
          streamsSet.add(a.streams);
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
  }, [assignments]); 

  const getSubjectsForClassAndStudent = (student) => { 
    if (lectureType && lectureType !== "Holiday" && isClassInRange(student.class)) {
      return availableConfigurationSubjects;
    }

    const className = student.class;
    if (!className) return availableConfigurationSubjects; 

    const matched = assignments.filter( 
      a => a.class_name && a.class_name.toLowerCase() === className.toLowerCase() 
    ); 
    
    let subs = matched.map(a => a.subject_name).filter(Boolean); 
    if (subs.length === 0) {
      const clsLower = className.toLowerCase();
      if (clsLower.includes("12") || clsLower.includes("11")) {
        subs = ["Maths", "Chemistry", "Hindi", "English", "Physics", "Biology"];
      } else {
        subs = ["Maths", "Science", "English", "Hindi", "Social Science"];
      }
    }

    return [...new Set(subs)];
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
        const subject = studentSubjects[student.studentId] || student.subjectCode || null; 
        const assignedBatch = normalizeBatch(student.batch);
        const bTimeObj = batchTimings[assignedBatch] || { start: "03:00 PM", end: "04:30 PM" };

        return { 
          studentId: student.studentId, 
          status: attendanceData[student.studentId] || "Present", 
          subjectCode: subject, 
          stream: studentStreams[student.studentId] || student.stream || null,
          startTime: bTimeObj.start,
          endTime: bTimeObj.end
        }; 
      }); 
    
      const response = await api.post( 
        "/api/attendance/mark", 
        { 
          date: selectedDate, 
          attendance: attendancePayload
        } 
      ); 
    
      const { inserted = 0, updated = 0 } = response.data; 
      setIsEditing(true); 
      setSuccessMessage( 
        `Attendance saved successfully. Inserted: ${inserted}, Updated: ${updated}` 
      ); 
      await fetchData(false); 
    
    } catch (err) { 
      console.error("Attendance submit error:", err); 
      setError(err.response?.data?.message || "Failed to save attendance."); 
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

  return ( 
    <div style={pageStyle}> 
      <div style={containerStyle}> 
        
        <div style={headerStyle}> 
          <div> 
            <div style={badgeStyle}>SMART STUDENTS CLASSES • ADMIN PORTAL</div> 
            <h1 style={titleStyle}>Attendance Management</h1> 
            <p style={subtitleStyle}>Mark and manage daily student attendance efficiently.</p> 
          </div> 
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            {isEditing && <span style={editBadgeStyle}>✏️ Edit Mode Active</span>}
            <button type="button" onClick={() => setShowConfigModal(true)} style={configTriggerButtonStyle}>
              ⚙️ Lecture Configuration
            </button>
          </div> 
        </div> 

        {/* Batch Timing Configuration Modal */}
        {showTimingModal && (
          <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
              <h3 style={{ margin: "0 0 12px 0", color: "#0f172a", fontSize: "20px", fontWeight: "800" }}>
                ⏰ Edit Timings for {editingBatchName}
              </h3>
              
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Start Time</label>
                <input 
                  type="text" 
                  value={tempStartTime} 
                  onChange={(e) => setTempStartTime(e.target.value)} 
                  placeholder="e.g. 03:00 PM"
                  style={selectStyle} 
                />
              </div>

              <div style={{ ...inputGroupStyle, marginTop: "12px" }}>
                <label style={labelStyle}>End Time</label>
                <input 
                  type="text" 
                  value={tempEndTime} 
                  onChange={(e) => setTempEndTime(e.target.value)} 
                  placeholder="e.g. 04:30 PM"
                  style={selectStyle} 
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
                <button type="button" onClick={() => setShowTimingModal(false)} style={cancelButtonStyle}>Cancel</button>
                <button type="button" onClick={handleSaveBatchTiming} style={submitButtonStyle}>Save Timing</button>
              </div>
            </div>
          </div>
        )}

        {/* Lecture Configuration Modal */}
        {showConfigModal && (
          <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
              <h3 style={{ margin: "0 0 16px 0", color: "#0f172a", fontSize: "20px", fontWeight: "800" }}>
                ⚙️ Lecture Configuration Setup
              </h3>
              
              <div style={inputGroupStyle}>
                <label style={labelStyle}>1. Select Lecture Type</label>
                <select 
                  value={lectureType} 
                  onChange={(e) => {
                    setLectureType(e.target.value);
                    setConfiguredSubject("");
                  }} 
                  style={selectStyle}
                >
                  <option value="">-- Select Lecture Type --</option>
                  <option value="Exam">Examination</option>
                  <option value="Extra Class">Extra Class</option>
                  <option value="Substitution">Substitution</option>
                  <option value="Holiday">Holiday</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "12px" }}>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Class Range Start</label>
                  <select value={classRangeStart} onChange={(e) => setClassRangeStart(e.target.value)} style={selectStyle}>
                    <option value="">-- From Class --</option>
                    {uniqueClasses.map((cls, idx) => (<option key={idx} value={cls}>{cls}</option>))}
                  </select>
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Class Range End</label>
                  <select value={classRangeEnd} onChange={(e) => setClassRangeEnd(e.target.value)} style={selectStyle}>
                    <option value="">-- To Class --</option>
                    {uniqueClasses.map((cls, idx) => (<option key={idx} value={cls}>{cls}</option>))}
                  </select>
                </div>
              </div>

              {lectureType !== "Holiday" && (
                <div style={{ ...inputGroupStyle, marginTop: "12px" }}>
                  <label style={labelStyle}>Select Subject / Paper (Only for selected class range)</label>
                  <select value={configuredSubject} onChange={(e) => setConfiguredSubject(e.target.value)} style={selectStyle}>
                    <option value="">-- Select Subject --</option>
                    {availableConfigurationSubjects.map((sub, idx) => (<option key={idx} value={sub}>{sub}</option>))}
                  </select>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
                <button type="button" onClick={() => setShowConfigModal(false)} style={cancelButtonStyle}>Cancel</button>
                <button type="button" onClick={handleApplyLectureConfig} style={submitButtonStyle}>Apply Configuration</button>
              </div>
            </div>
          </div>
        )}

        {/* Batch Shift Modal */}
        {showShiftModal && studentToShift && (
          <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
              <h3 style={{ margin: "0 0 8px 0", color: "#0f172a", fontSize: "20px", fontWeight: "800" }}>
                🔄 Shift Student Batch
              </h3>
              <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
                Moving <strong>{studentToShift.studentName}</strong> (Class {studentToShift.class}) to a new batch.
              </p>

              <div style={inputGroupStyle}>
                <label style={labelStyle}>Target Batch</label>
                <select value={targetBatch} onChange={(e) => setTargetBatch(e.target.value)} style={selectStyle}>
                  <option value="Batch 1">Batch 1 ({batchTimings["Batch 1"].start} - {batchTimings["Batch 1"].end})</option>
                  <option value="Batch 2">Batch 2 ({batchTimings["Batch 2"].start} - {batchTimings["Batch 2"].end})</option>
                  <option value="Batch 3">Batch 3 ({batchTimings["Batch 3"].start} - {batchTimings["Batch 3"].end})</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
                <button type="button" onClick={() => setShowShiftModal(false)} style={cancelButtonStyle}>Cancel</button>
                <button type="button" onClick={handleConfirmShiftBatch} disabled={shifting} style={submitButtonStyle}>
                  {shifting ? "Shifting..." : "Confirm Shift"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={cardStyle}> 
          <div style={filterGridStyle}> 
            <div style={inputGroupStyle}> 
              <label style={labelStyle}>Select Date</label> 
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={selectStyle} /> 
            </div> 

            <div style={inputGroupStyle}> 
              <label style={labelStyle}>Select Batch</label> 
              <select value={selectedBatchFilter} onChange={(e) => setSelectedBatchFilter(e.target.value)} style={selectStyle}> 
                <option value="">-- All Batches --</option> 
                <option value="Batch 1">Batch 1 ({batchTimings["Batch 1"].start} - {batchTimings["Batch 1"].end})</option> 
                <option value="Batch 2">Batch 2 ({batchTimings["Batch 2"].start} - {batchTimings["Batch 2"].end})</option> 
                <option value="Batch 3">Batch 3 ({batchTimings["Batch 3"].start} - {batchTimings["Batch 3"].end})</option> 
              </select> 
            </div> 

            <div style={inputGroupStyle}> 
              <label style={labelStyle}>Filter by Class</label> 
              <select value={selectedClassFilter} onChange={(e) => setSelectedClassFilter(e.target.value)} style={selectStyle}> 
                <option value="">-- All Classes --</option> 
                {uniqueClasses.map((cls, idx) => (<option key={idx} value={cls}>{cls}</option>))} 
              </select> 
            </div> 

            <button type="button" onClick={() => fetchData(false)} disabled={refreshing} style={refreshButtonStyle}> 
              {refreshing ? "Refreshing..." : "🔄 Refresh Data"} 
            </button> 
          </div> 

          {/* Quick Timing Quick-Bar */}
          <div style={timingQuickBarStyle}>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>🕒 Current Batch Timings:</span>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
              {Object.entries(batchTimings).map(([bName, tObj]) => (
                <div key={bName} style={timingBadgeStyle}>
                  <span><strong>{bName}:</strong> {tObj.start} - {tObj.end}</span>
                  <button 
                    type="button" 
                    onClick={() => handleOpenTimingModal(bName)}
                    style={editTimeBtnStyle}
                    title="Change timing"
                  >
                    ✏️
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div> 

        {error && <div style={errorStyle}>{error}</div>} 
        {successMessage && <div style={successStyle}>{successMessage}</div>}

        {filteredStudents.length > 0 && ( 
          <div style={metricsGridStyle}> 
            <div style={{ ...metricCardStyle, borderLeft: "4px solid #4f46e5" }}> 
              <div style={metricLabelStyle}>Active Students</div> 
              <div style={metricValueStyle}>{stats.total}</div> 
            </div> 
            <div style={{ ...metricCardStyle, borderLeft: "4px solid #059669" }}> 
              <div style={metricLabelStyle}>Present</div> 
              <div style={{ ...metricValueStyle, color: "#059669" }}>{stats.present}</div> 
            </div> 
            <div style={{ ...metricCardStyle, borderLeft: "4px solid #dc2626" }}> 
              <div style={metricLabelStyle}>Absent</div> 
              <div style={{ ...metricValueStyle, color: "#dc2626" }}>{stats.absent}</div> 
            </div> 
            <div style={{ ...metricCardStyle, borderLeft: "4px solid #d97706" }}> 
              <div style={metricLabelStyle}>Holiday</div> 
              <div style={{ ...metricValueStyle, color: "#d97706" }}>{stats.holiday}</div> 
            </div> 
          </div> 
        )} 

        <div style={cardStyle}> 
          <div style={tableHeaderStyle}> 
            <h3 style={tableTitleStyle}> 
              Students List {selectedBatchFilter ? `• ${selectedBatchFilter} (${batchTimings[selectedBatchFilter]?.start} - ${batchTimings[selectedBatchFilter]?.end})` : ""} 
              {lectureType && <span style={configBadgeHeaderStyle}>Mode: {lectureType}</span>}
            </h3> 
            {filteredStudents.length > 0 && ( 
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}> 
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
                    <th style={thStyle}>Class & Batch Time</th> 
                    <th style={thStyle}>Subject / Paper</th> 
                    <th style={thStyle}>Stream</th> 
                    <th style={{ ...thStyle, textAlign: "center" }}>Attendance Status</th> 
                  </tr> 
                </thead> 
                <tbody> 
                  {filteredStudents.map((student, index) => { 
                    const currentStatus = attendanceData[student.studentId] || "Present"; 
                    const assignedBatch = normalizeBatch(student.batch); 
                    const bTimeObj = batchTimings[assignedBatch] || { start: "3:00 PM", end: "4:30 PM" };
                    const classSubjects = getSubjectsForClassAndStudent(student); 
                    const studentStreamsList = getStreamsForStudent(student); 
                    const isHigherClass = studentStreamsList.length > 0; 

                    let rowBgStyle = { backgroundColor: "#f0fdf4" }; 
                    if (currentStatus === "Absent") rowBgStyle = { backgroundColor: "#fef2f2" }; 
                    else if (currentStatus === "Holiday") rowBgStyle = { backgroundColor: "#fffbeb" }; 

                    return ( 
                      <tr key={`${student.studentId || "st"}-${index}`} style={{ borderBottom: "1px solid #e2e8f0", ...rowBgStyle }}> 
                        <td style={tdStyle}>{index + 1}</td> 
                        <td style={{ ...tdStyle, fontWeight: "700", color: "#0f172a" }}>{student.studentName}</td> 
                        <td style={{ ...tdStyle, color: "#475569", fontSize: "13px" }}> 
                          <div>Class: <strong>{student.class}</strong></div> 
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "11px", backgroundColor: "#e0e7ff", color: "#3730a3", padding: "2px 6px", borderRadius: "4px", fontWeight: "700" }}>
                              {assignedBatch} ({bTimeObj.start} - {bTimeObj.end})
                            </span>
                            <button 
                              type="button" 
                              onClick={() => handleOpenShiftModal(student)}
                              style={shiftBatchBtnStyle}
                              title="Shift Student to another batch"
                            >
                              🔄 Shift
                            </button>
                          </div>
                        </td> 
                        
                        <td style={tdStyle}> 
                          <select 
                            value={studentSubjects[student.studentId] || ""} 
                            onChange={(e) => handleSubjectRowChange(student.studentId, e.target.value)} 
                            style={rowSelectStyle} 
                          > 
                            <option value="">-- Select Subject --</option> 
                            {classSubjects.map((sub, sIdx) => (<option key={sIdx} value={sub}>{sub}</option>))} 
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
                              {studentStreamsList.map((strm, stIdx) => (<option key={stIdx} value={strm}>{strm}</option>))} 
                            </select> 
                          ) : ( 
                            <span style={{ fontSize: "12px", color: "#64748b" }}>N/A</span> 
                          )} 
                        </td> 

                        <td style={{ ...tdStyle, textAlign: "center" }}> 
                          <div style={{ display: "flex", justifyContent: "center", gap: "20px", alignItems: "center", flexWrap: "wrap" }}> 
                            <label style={radioLabelStyle}> 
                              <input 
                                type="radio" 
                                name={`attendance-${student.studentId}-${index}`} 
                                checked={currentStatus === "Present"} 
                                onChange={() => handleStatusChange(student.studentId, "Present")} 
                                style={{ accentColor: "#059669", width: "16px", height: "16px", cursor: "pointer" }} 
                              /> 
                              <span style={{ color: "#065f46", fontWeight: currentStatus === "Present" ? "800" : "600" }}>Present</span> 
                            </label> 

                            <label style={radioLabelStyle}> 
                              <input 
                                type="radio" 
                                name={`attendance-${student.studentId}-${index}`} 
                                checked={currentStatus === "Absent"} 
                                onChange={() => handleStatusChange(student.studentId, "Absent")} 
                                style={{ accentColor: "#dc2626", width: "16px", height: "16px", cursor: "pointer" }} 
                              /> 
                              <span style={{ color: "#991b1b", fontWeight: currentStatus === "Absent" ? "800" : "600" }}>Absent</span> 
                            </label> 

                            <label style={radioLabelStyle}> 
                              <input 
                                type="radio" 
                                name={`attendance-${student.studentId}-${index}`} 
                                checked={currentStatus === "Holiday"} 
                                onChange={() => handleStatusChange(student.studentId, "Holiday")} 
                                style={{ accentColor: "#d97706", width: "16px", height: "16px", cursor: "pointer" }} 
                              /> 
                              <span style={{ color: "#b45309", fontWeight: currentStatus === "Holiday" ? "800" : "600" }}>Holiday</span> 
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
            <div style={emptyStyle}>No active students found matching your selected filters.</div> 
          )} 

          {filteredStudents.length > 0 && ( 
            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", gap: "12px" }}> 
              <button type="button" onClick={handleSubmitAttendance} disabled={submitting} style={submitButtonStyle}> 
                {submitting ? "Saving Attendance..." : isEditing ? "✏️ Update Attendance" : "Submit Attendance"} 
              </button> 
            </div> 
          )} 
        </div> 

      </div> 
    </div> 
  ); 
}; 

const pageStyle = { minHeight: "100vh", backgroundColor: "#f8fafc", padding: "28px 20px", fontFamily: "Inter, system-ui, sans-serif" };
const containerStyle = { maxWidth: "1200px", margin: "0 auto" };
const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "16px" };
const badgeStyle = { backgroundColor: "#e0e7ff", color: "#4338ca", padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "700", display: "inline-block", marginBottom: "8px", letterSpacing: "0.5px" };
const editBadgeStyle = { backgroundColor: "#fef3c7", color: "#b45309", padding: "6px 12px", borderRadius: "8px", fontSize: "13px", fontWeight: "700", border: "1px solid #fde68a" };
const configTriggerButtonStyle = { padding: "8px 16px", backgroundColor: "#7c3aed", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "13px", cursor: "pointer" };
const shiftBatchBtnStyle = { padding: "2px 6px", backgroundColor: "#e0e7ff", color: "#3730a3", border: "1px solid #c7d2fe", borderRadius: "4px", fontSize: "10px", fontWeight: "700", cursor: "pointer" };
const configBadgeHeaderStyle = { backgroundColor: "#ede9fe", color: "#6d28d9", padding: "3px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "700", marginLeft: "12px" };
const titleStyle = { fontSize: "26px", fontWeight: "800", color: "#0f172a", margin: "0 0 4px 0" };
const subtitleStyle = { fontSize: "14px", color: "#64748b", margin: "0" };
const cardStyle = { backgroundColor: "#ffffff", borderRadius: "14px", padding: "22px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: "24px", border: "1px solid #e2e8f0" };
const filterGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "16px", alignItems: "end" };
const timingQuickBarStyle = { marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" };
const timingBadgeStyle = { backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", color: "#334155", display: "flex", alignItems: "center", gap: "6px" };
const editTimeBtnStyle = { background: "none", border: "none", cursor: "pointer", fontSize: "11px", padding: "0" };
const inputGroupStyle = { display: "flex", flexDirection: "column", gap: "6px" };
const labelStyle = { fontSize: "13px", fontWeight: "600", color: "#334155" };
const selectStyle = { padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", backgroundColor: "#fff", outline: "none", color: "#0f172a", width: "100%" };
const refreshButtonStyle = { padding: "10px 18px", backgroundColor: "#0f172a", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "14px" };
const errorStyle = { padding: "12px 16px", backgroundColor: "#fee2e2", color: "#991b1b", borderRadius: "8px", marginBottom: "20px", fontSize: "14px", fontWeight: "600", border: "1px solid #fecaca" };
const successStyle = { padding: "12px 16px", backgroundColor: "#d1fae5", color: "#065f46", borderRadius: "8px", marginBottom: "20px", fontSize: "14px", fontWeight: "600", border: "1px solid #a7f3d0" };
const metricsGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" };
const metricCardStyle = { backgroundColor: "#fff", padding: "18px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0" };
const metricLabelStyle = { fontSize: "13px", fontWeight: "600", color: "#64748b", marginBottom: "4px" };
const metricValueStyle = { fontSize: "22px", fontWeight: "800", color: "#0f172a" };
const tableHeaderStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" };
const tableTitleStyle = { fontSize: "18px", fontWeight: "800", color: "#0f172a", margin: "0" };
const quickBtnPresent = { padding: "6px 12px", backgroundColor: "#059669", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer" };
const quickBtnAbsent = { padding: "6px 12px", backgroundColor: "#dc2626", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer" };
const quickBtnHoliday = { padding: "6px 12px", backgroundColor: "#d97706", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer" };
const tableStyle = { width: "100%", borderCollapse: "collapse", textAlign: "left" };
const thRowStyle = { backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" };
const thStyle = { padding: "12px 14px", fontSize: "13px", fontWeight: "700", color: "#334155" };
const tdStyle = { padding: "12px 14px", fontSize: "14px", color: "#334155", verticalAlign: "middle" };
const rowSelectStyle = { padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", backgroundColor: "#fff", outline: "none", color: "#0f172a", width: "100%" };
const radioLabelStyle = { display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13px" };
const emptyStyle = { padding: "30px", textAlign: "center", color: "#64748b", fontSize: "14px" };
const modalOverlayStyle = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "16px" };
const modalContentStyle = { backgroundColor: "#fff", borderRadius: "14px", padding: "24px", width: "100%", maxWidth: "420px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)", border: "1px solid #e2e8f0" };
const cancelButtonStyle = { padding: "9px 16px", backgroundColor: "#e2e8f0", color: "#334155", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "13px", cursor: "pointer" };
const submitButtonStyle = { padding: "9px 18px", backgroundColor: "#4f46e5", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "13px", cursor: "pointer" };

export default MarkAttendance;