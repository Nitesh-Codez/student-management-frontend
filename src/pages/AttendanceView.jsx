import React, { useEffect, useState, useCallback, useMemo } from "react";
import api from "../services/api";
import { 
  FaSearch, FaGraduationCap, FaChartPie, 
  FaCalendarCheck, FaTrophy, FaSyncAlt, 
  FaTimes, FaCheck, FaFilter, FaEye, FaBook, FaFilePdf, FaLayerGroup
} from "react-icons/fa";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Master Ordered Class List for Custom Range Evaluation
const CLASS_ORDER = [
  "Nursery", "LKG", "UKG", 
  "1st", "1", "2nd", "2", "3rd", "3", "4th", "4", "5th", "5", 
  "6th", "6", "7th", "7", "8th", "8", "9th", "9", "10th", "10", 
  "11th", "11", "12th", "12"
];

const getClassWeight = (className) => {
  if (!className) return 999;
  const str = String(className).trim().toLowerCase();
  
  if (str.includes("nursery")) return 0;
  if (str.includes("lkg")) return 1;
  if (str.includes("ukg")) return 2;
  
  const num = parseInt(str.replace(/\D/g, ""), 10);
  if (!isNaN(num)) return num + 2; // Shifted by 2 for pre-primary
  return 999;
};

const AdminAttendance = () => {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Class Filters
  const [selectedClass, setSelectedClass] = useState("All");
  const [fromClass, setFromClass] = useState("All");
  const [toClass, setToClass] = useState("All");

  const [activeFilter, setActiveFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  
  // Selected student for individual side panel analysis
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSubjectData, setStudentSubjectData] = useState([]);
  const [subjectLoading, setSubjectLoading] = useState(false);
  const [studentSpecificRequests, setStudentSpecificRequests] = useState([]);

  // Active Tab: 'analytics' or 'requests'
  const [activeTab, setActiveTab] = useState("analytics");
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Month Selector for current view filtering (Default: 2026-09)
  const [currentMonth, setCurrentMonth] = useState("2026-09");

  const getFormattedMonthName = (monthStr) => {
    if (!monthStr) return "";
    const [year, month] = monthStr.split("-");
    const date = new Date(year, parseInt(month, 10) - 1, 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  // Extract all available dynamic classes sorted chronologically
  const sortedClassesList = useMemo(() => {
    const classSet = new Set(students.map((s) => s.class).filter(Boolean));
    return Array.from(classSet).sort((a, b) => getClassWeight(a) - getClassWeight(b));
  }, [students]);

  // Helper: Check if a student's class lies inside the user-selected Range
  const isClassInRange = (studentClass) => {
    if (fromClass === "All" && toClass === "All") return true;
    
    const weight = getClassWeight(studentClass);
    const fromWeight = fromClass !== "All" ? getClassWeight(fromClass) : 0;
    const toWeight = toClass !== "All" ? getClassWeight(toClass) : 999;

    return weight >= fromWeight && weight <= toWeight;
  };

  // 1. FETCH ALL DATA
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [resStudents, resAttendance, resRequests] = await Promise.all([
        api.get(`/api/students/students-basic-info`),
        api.get(`/api/attendance/today-percent`),
        api.get(`/api/attendance/admin/student-requests`).catch(() => ({ data: { success: true, requests: [] } }))
      ]);

      const basicInfo = (Array.isArray(resStudents.data)
        ? resStudents.data
        : (resStudents.data.students || [])
      ).filter(student => student.is_banned === false);
      const attendanceInfo = resAttendance.data.students || [];
      const requestsData = resRequests.data.requests || resRequests.data.student || (Array.isArray(resRequests.data) ? resRequests.data : []);

      const mergedData = basicInfo.map(student => {
        const attendanceRecord = attendanceInfo.find(a => 
          (a.studentId === student.id) || (a.id === student.id)
        );

        return {
          ...student,
          percentage: attendanceRecord ? attendanceRecord.percentage : (student.percentage || student.marks || 0),
          present: attendanceRecord ? attendanceRecord.present : (student.present || 0),
          total: attendanceRecord ? attendanceRecord.total : (student.total || 0)
        };
      });

      setStudents(mergedData);
      setFilteredStudents(mergedData);
      setRequests(requestsData);
    } catch (err) {
      console.error("Admin Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchAllData(); 
  }, [fetchAllData]);

  // 2. HANDLE REQUEST STATUS UPDATE
  const handleUpdateStatus = async (requestId, newStatus) => {
    setActionLoadingId(requestId);
    try {
      const res = await api.put(`/api/attendance/admin/request/${requestId}`, { status: newStatus });
      if (res.data.success) {
        setRequests(prev => prev.map(req => 
          (req._id === requestId || req.id === requestId) ? { ...req, requestStatus: newStatus } : req
        ));
      }
    } catch (err) {
      console.error("Error updating request status:", err);
      alert("Failed to update status. Please try again.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // 3. FILTER LOGIC FOR UI TABLE DISPLAY
  useEffect(() => {
    let result = students;

    // Filter by Specific Single Class
    if (selectedClass !== "All") {
      result = result.filter((s) => String(s.class) === String(selectedClass));
    } 
    // Filter by Selected Custom Class Range (From - To)
    else if (fromClass !== "All" || toClass !== "All") {
      result = result.filter((s) => isClassInRange(s.class));
    }

    if (activeFilter === "Top") result = result.filter(s => Number(s.percentage) >= 85);
    else if (activeFilter === "Low") result = result.filter(s => Number(s.percentage) < 60);

    if (searchTerm) {
      result = result.filter((s) =>
        s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id?.toString().includes(searchTerm)
      );
    }
    setFilteredStudents(result);
  }, [searchTerm, selectedClass, fromClass, toClass, activeFilter, students]);

  // --- DRAW MAIN PDF DOCUMENT HEADER ---
  const drawMainDocumentHeader = (doc, title, subtitle) => {
    doc.setFillColor(26, 35, 126); // #1a237e Navy Blue
    doc.rect(0, 0, 210, 36, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text("SMART STUDENTS CLASSES", 105, 12, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(title, 105, 19, { align: "center" });
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(subtitle, 105, 26, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Generated On: ${new Date().toLocaleDateString("en-IN")}`, 105, 32, { align: "center" });
  };

  // 4. GENERATE SUBJECT-WISE LOW ATTENDANCE PDF REPORT (<75%) BASED ON SELECTED RANGE / CLASS
  const downloadLowAttendancePDF = async () => {
    try {
      const res = await api.get(`/api/attendance/admin/subject-wise?month=${currentMonth}`);
      if (!res.data || !res.data.success || !res.data.students) {
        alert("Failed to fetch subject-wise attendance for PDF report.");
        return;
      }

      const subjectStudents = res.data.students;

      let filteredForPDF = subjectStudents;
      if (selectedClass !== "All") {
        filteredForPDF = subjectStudents.filter(s => String(s.class) === String(selectedClass));
      } else if (fromClass !== "All" || toClass !== "All") {
        filteredForPDF = subjectStudents.filter(s => isClassInRange(s.class));
      }

      const defaultersList = [];

      filteredForPDF.forEach(student => {
        if (!student.subjects || student.subjects.length === 0) return;

        const validSubjects = student.subjects.filter(subj => Number(subj.total) > 0);
        if (validSubjects.length === 0) return;

        const lowSubjects = validSubjects.filter(subj => Number(subj.percentage) < 75);

        if (lowSubjects.length > 0) {
          defaultersList.push({
            name: (student.name || "N/A").toUpperCase(),
            uid: student.studentId || student.id || "N/A",
            class: student.class || "N/A",
            subjects: lowSubjects
          });
        }
      });

      if (defaultersList.length === 0) {
        alert("No students found with subject attendance below 75% for the selected filters.");
        return;
      }

      const doc = new jsPDF('p', 'mm', 'a4');
      const formattedMonth = getFormattedMonthName(currentMonth) || currentMonth;
      
      let filterLabel = "All Classes";
      if (selectedClass !== "All") {
        filterLabel = `Class ${selectedClass}`;
      } else if (fromClass !== "All" || toClass !== "All") {
        filterLabel = `Range (${fromClass === "All" ? "Start" : fromClass} to ${toClass === "All" ? "End" : toClass})`;
      }

      drawMainDocumentHeader(
        doc, 
        "Official Subject-Wise Low Attendance List (< 75% Attendance)",
        `Filter: ${filterLabel} | Month: ${formattedMonth}`
      );

      let currentY = 42;

      defaultersList.forEach((st, index) => {
        if (currentY > 240) {
          doc.addPage();
          drawMainDocumentHeader(
            doc, 
            "Official Subject-Wise Defaulters Ledger (< 75% Attendance)",
            `Filter: ${filterLabel} | Month: ${formattedMonth}`
          );
          currentY = 42;
        }

        doc.setFillColor(238, 242, 255);
        doc.setDrawColor(26, 35, 126);
        doc.rect(14, currentY, 182, 8, 'FD');

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(26, 35, 126);
        doc.text(`${index + 1}. Student: ${st.name}   |   UID: ${st.uid}   |   Class: ${st.class}`, 18, currentY + 5.5);

        currentY += 10;

        const tableColumn = ["Subject Name", "Present Classes", "Total Classes", "Attendance %"];
        const tableRows = st.subjects.map(subj => [
          subj.subjectCode || subj.subject || "Subject",
          subj.present || 0,
          subj.total || 0,
          `${subj.percentage}%`
        ]);

        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: currentY,
          theme: 'grid',
          headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold', halign: 'center' },
          bodyStyles: { fontSize: 11, textColor: [30, 41, 59], minCellHeight: 8 },
          columnStyles: {
            0: { halign: 'left', cellWidth: 70 },
            1: { halign: 'center', cellWidth: 35 },
            2: { halign: 'center', cellWidth: 35 },
            3: { halign: 'center', cellWidth: 42, fontStyle: 'bold' }
          },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { left: 14, right: 14 }
        });

        currentY = doc.lastAutoTable.finalY + 8;
      });

      if (currentY > 240) {
        doc.addPage();
        currentY = 30;
      }

      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text("Digitally Signed & Approved By:", 14, currentY + 5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(26, 35, 126);
      doc.text("SMART STUDENTS CLASSES - ACADEMIC ADMINISTRATION", 14, currentY + 11);
      
      doc.setDrawColor(26, 35, 126);
      doc.setLineWidth(0.5);
      doc.line(14, currentY + 20, 75, currentY + 20);
      doc.text("Nitesh Kushwah", 14, currentY + 26);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Authorized Signatory (Digital Stamp Verified)", 14, currentY + 31);

      const cleanFileName = filterLabel.replace(/[^a-zA-Z0-9]/g, "_");
      doc.save(`Low_Attendance_Report_${cleanFileName}_${currentMonth}.pdf`);
    } catch (err) {
      console.error("PDF Generation Error:", err);
      alert("Failed to generate PDF report. Error: " + err.message);
    }
  };

  const handleOpenStudentDetails = async (student) => {
    setSelectedStudent(student);
    const matchedReqs = requests.filter(r => String(r.studentId) === String(student.id) || String(r.studentId) === String(student._id));
    setStudentSpecificRequests(matchedReqs);

    setSubjectLoading(true);
    try {
      const res = await api.get(`/api/attendance/admin/subject-wise?month=${currentMonth}`);
      if (res.data && res.data.success) {
        const foundStudent = res.data.students.find(
          s => String(s.studentId) === String(student.id || student._id)
        );
        setStudentSubjectData(foundStudent ? foundStudent.subjects : []);
      }
    } catch (err) {
      console.error("Error fetching subject-wise attendance:", err);
      setStudentSubjectData([]);
    } finally {
      setSubjectLoading(false);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return "N/A";
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div style={appContainer}>
      <style>{`
        * { box-sizing: border-box; font-family: "Georgia", "Times New Roman", serif; }
        input, select, button { font-family: inherit; }
      `}</style>

      {/* --- STATS SUMMARY CARDS --- */}
      <div style={statsGrid}>
        <div style={{...statCard, borderBottom: activeFilter === "All" ? '2px solid #0f172a' : '1px solid #e2e8f0'}} onClick={() => { setActiveFilter("All"); setActiveTab("analytics"); }}>
          <div style={{...iconCircle, background: '#f8fafc', color: '#0f172a'}}><FaGraduationCap /></div>
          <div><div style={statLabel}>Total Students</div><div style={statNumber}>{students.length}</div></div>
        </div>
        <div style={statCard}>
          <div style={{...iconCircle, background: '#f8fafc', color: '#0f172a'}}><FaChartPie /></div>
          <div><div style={statLabel}>Active Batches</div><div style={statNumber}>{sortedClassesList.length}</div></div>
        </div>
        <div style={{...statCard, borderBottom: activeFilter === "Top" ? '2px solid #166534' : '1px solid #e2e8f0'}} onClick={() => { setActiveFilter("Top"); setActiveTab("analytics"); }}>
          <div style={{...iconCircle, background: '#f0fdf4', color: '#166534'}}><FaTrophy /></div>
          <div><div style={statLabel}>Top 85%+ Attendance</div><div style={statNumber}>{students.filter(s => Number(s.percentage) >= 85).length}</div></div>
        </div>
        <div style={{...statCard, borderBottom: activeFilter === "Low" ? '2px solid #991b1b' : '1px solid #e2e8f0'}} onClick={() => { setActiveFilter("Low"); setActiveTab("analytics"); }}>
          <div style={{...iconCircle, background: '#fef2f2', color: '#991b1b'}}><FaCalendarCheck /></div>
          <div><div style={statLabel}>Low Attendance (&lt;60%)</div><div style={statNumber}>{students.filter(s => Number(s.percentage) < 60).length}</div></div>
        </div>
      </div>

      {/* --- COMMAND BAR & TAB NAVIGATION --- */}
      <div style={commandBar}>
        <div style={leftBar}>
          <h2 style={titleText}>Attendance & Request Control</h2>
          <div style={tabSwitchContainer}>
            <button 
              style={{...tabBtn, background: activeTab === 'analytics' ? '#0f172a' : 'transparent', color: activeTab === 'analytics' ? '#fff' : '#475569'}}
              onClick={() => setActiveTab('analytics')}
            >
              Student Analytics
            </button>
            <button 
              style={{...tabBtn, background: activeTab === 'requests' ? '#0f172a' : 'transparent', color: activeTab === 'requests' ? '#fff' : '#475569'}}
              onClick={() => setActiveTab('requests')}
            >
              Drop Requests ({requests.filter(r => !r.requestStatus || r.requestStatus?.toLowerCase() === 'pending').length})
            </button>
          </div>
        </div>

        <div style={rightBar}>
          <div style={filterBox}>
            <span style={{fontSize: '12px', color: '#64748b', fontStyle: 'italic'}}>Month:</span>
            <input 
              type="month" 
              value={currentMonth} 
              onChange={(e) => setCurrentMonth(e.target.value)} 
              style={monthInputStyle}
            />
          </div>
          <button onClick={fetchAllData} style={refreshBtn} title="Refresh"><FaSyncAlt /></button>
        </div>
      </div>

      {/* --- CUSTOM CLASS RANGE SELECTORS & SPECIFIC CLASS FILTERS --- */}
      {activeTab === 'analytics' && (
        <div style={filterContainer}>
          <div style={{display: 'flex', flexDirection: 'column', gap: '12px', width: '100%'}}>
            
            {/* 1. CUSTOM FROM & TO CLASS RANGE DROPDOWNS */}
            <div style={{display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap'}}>
              <span style={{fontSize: '13px', color: '#334155', fontWeight: 'bold', minWidth: '130px', display: 'flex', alignItems: 'center'}}>
                <FaLayerGroup style={{marginRight: '6px'}} /> Select Custom Range:
              </span>
              
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
                <span style={{fontSize: '12px', color: '#64748b'}}>From:</span>
                <select
                  value={fromClass}
                  onChange={(e) => {
                    setFromClass(e.target.value);
                    setSelectedClass("All"); // Reset specific single class selection
                  }}
                  style={dropdownSelectStyle}
                >
                  <option value="All">Start (First Class)</option>
                  {sortedClassesList.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>

                <span style={{fontSize: '12px', color: '#64748b'}}>To:</span>
                <select
                  value={toClass}
                  onChange={(e) => {
                    setToClass(e.target.value);
                    setSelectedClass("All"); // Reset specific single class selection
                  }}
                  style={dropdownSelectStyle}
                >
                  <option value="All">End (Last Class)</option>
                  {sortedClassesList.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>

                {(fromClass !== "All" || toClass !== "All") && (
                  <button 
                    onClick={() => { setFromClass("All"); setToClass("All"); }}
                    style={clearRangeBtn}
                  >
                    Clear Range
                  </button>
                )}
              </div>
            </div>

            {/* 2. SPECIFIC CLASS BUTTONS ROW */}
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingTop: '10px', borderTop: '1px dashed #e2e8f0'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap'}}>
                <span style={{fontSize: '13px', color: '#334155', fontWeight: 'bold', minWidth: '130px'}}>
                  <FaFilter style={{marginRight: '6px'}} /> Or Single Class:
                </span>
                <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap'}}>
                  <button
                    onClick={() => {
                      setSelectedClass("All");
                      setFromClass("All");
                      setToClass("All");
                    }}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      border: selectedClass === "All" && fromClass === "All" && toClass === "All" ? '1px solid #0f172a' : '1px solid #cbd5e1',
                      background: selectedClass === "All" && fromClass === "All" && toClass === "All" ? '#0f172a' : '#fff',
                      color: selectedClass === "All" && fromClass === "All" && toClass === "All" ? '#fff' : '#334155',
                      fontWeight: 'bold'
                    }}
                  >
                    All Classes
                  </button>
                  {sortedClassesList.map(c => (
                    <button
                      key={c}
                      onClick={() => {
                        setSelectedClass(c);
                        setFromClass("All");
                        setToClass("All");
                      }}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        border: selectedClass === c ? '1px solid #0f172a' : '1px solid #cbd5e1',
                        background: selectedClass === c ? '#0f172a' : '#fff',
                        color: selectedClass === c ? '#fff' : '#334155',
                        fontWeight: selectedClass === c ? 'bold' : 'normal'
                      }}
                    >
                      {c.toLowerCase().includes("class") ? c : `Class ${c}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* EXPORT & SEARCH CONTROLS */}
              <div style={{display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap'}}>
                <button onClick={downloadLowAttendancePDF} style={pdfBtn}>
                  <FaFilePdf size={13} /> Export Defaulters PDF
                </button>
                <div style={searchWrapper}>
                  <FaSearch style={sIcon} />
                  <input placeholder="Search student..." style={sInput} value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} />
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- TAB 1: STUDENT ANALYTICS TABLE --- */}
      {activeTab === 'analytics' && (
        <div style={tableWrapper}>
          <table style={fullTable}>
            <thead>
              <tr style={thRow}>
                <th style={th}>STUDENT PROFILE</th>
                <th style={thC}>BATCH</th>
                <th style={thC}>PRESENT / TOTAL</th>
                <th style={thC}>ATTENDANCE %</th>
                <th style={thC}>PROGRESS</th>
                <th style={thC}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(s => (
                <tr key={s.id || s._id} style={trStyle}>
                  <td style={td}>
                    <div style={idGroup}>
                      <div style={photoBox}>
                        <img 
                          src={s.profile_photo || s.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name || 'Student')}&background=cbd5e1&color=0f172a`} 
                          alt="p" style={avatarImg}
                          onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=Student&background=cbd5e1&color=0f172a`; }}
                        />
                      </div>
                      <div>
                        <div style={nameTxt}>{s.name || "Unnamed Student"}</div>
                        <div style={subTxt}>UID: {s.id || s._id}</div>
                      </div>
                    </div>
                  </td>
                  <td style={tdC}><span style={batchBadge}>{s.class ? (s.class.toLowerCase().includes("class") ? s.class : `Class ${s.class}`) : "N/A"}</span></td>
                  <td style={tdC}><span style={{color: '#334155'}}>{s.present || 0} / {s.total || 0}</span></td>
                  <td style={tdC}><div style={statValue}>{s.percentage}%</div></td>
                  <td style={tdC}>
                    <div style={barContainer}>
                      <div style={{...barFill, width: `${Math.min(Math.max(s.percentage, 0), 100)}%`, background: s.percentage >= 85 ? '#166534' : s.percentage < 60 ? '#991b1b' : '#0f172a' }}></div>
                    </div>
                  </td>
                  <td style={tdC}>
                    <button style={viewBtn} onClick={() => handleOpenStudentDetails(s)}>
                      <FaEye size={12} style={{marginRight: '4px'}} /> View Subject Attendance
                    </button>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" style={{textAlign: 'center', padding: '40px', color: '#64748b', fontStyle: 'italic'}}>No students found matching the selected range or class.</td>
                </tr>
              )}
            </tbody>
          </table>
          {loading && <div style={loader}>Loading Student Analytics...</div>}
        </div>
      )}

      {/* --- TAB 2: DROP / LEAVE REQUESTS TABLE --- */}
      {activeTab === 'requests' && (
        <div style={tableWrapper}>
          <table style={fullTable}>
            <thead>
              <tr style={thRow}>
                <th style={th}>STUDENT NAME & ID</th>
                <th style={thC}>DROP TYPE</th>
                <th style={thC}>DATE RANGE</th>
                <th style={th}>REASON</th>
                <th style={thC}>STATUS</th>
                <th style={thC}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req, idx) => {
                const reqStatus = req.requestStatus || "Pending";
                const isAccepted = reqStatus.toLowerCase() === "accepted";
                const isRejected = reqStatus.toLowerCase() === "rejected";

                return (
                  <tr key={req._id || req.id || idx} style={trStyle}>
                    <td style={td}>
                      <div style={{color: '#0f172a'}}>{req.studentName || `Student ID: ${req.studentId}`}</div>
                      <div style={{fontSize: '11px', color: '#64748b'}}>ID: {req.studentId}</div>
                    </td>
                    <td style={tdC}>
                      <span style={{background: '#f8fafc', padding: '3px 8px', borderRadius: '3px', fontSize: '11px', color: '#334155', border: '1px solid #cbd5e1'}}>
                        {req.dropType || "Leave"}
                      </span>
                    </td>
                    <td style={{...tdC, fontSize: '12px', color: '#334155'}}>
                      {formatDate(req.dropStartDate)} &rarr; {formatDate(req.dropEndDate)}
                    </td>
                    <td style={{...td, maxWidth: '240px', fontSize: '13px', color: '#475569', fontStyle: 'italic'}}>{req.reason || "No reason specified"}</td>
                    <td style={tdC}>
                      <span style={{
                        padding: '3px 8px', 
                        borderRadius: '3px', 
                        fontSize: '11px', 
                        background: isAccepted ? '#f0fdf4' : (isRejected ? '#fef2f2' : '#fef9c3'),
                        color: isAccepted ? '#166534' : (isRejected ? '#991b1b' : '#854d0e'),
                        border: `1px solid ${isAccepted ? '#bbf7d0' : (isRejected ? '#fecaca' : '#fef08a')}`
                      }}>
                        {reqStatus.toUpperCase()}
                      </span>
                    </td>
                    <td style={tdC}>
                      <div style={{display: 'flex', gap: '6px', justifyContent: 'center'}}>
                        <button 
                          disabled={actionLoadingId === (req._id || req.id)}
                          onClick={() => handleUpdateStatus(req._id || req.id, "Accepted")}
                          style={{...actionBtn, background: '#166534', color: '#fff'}}
                        >
                          <FaCheck size={10} /> Accept
                        </button>
                        <button 
                          disabled={actionLoadingId === (req._id || req.id)}
                          onClick={() => handleUpdateStatus(req._id || req.id, "Rejected")}
                          style={{...actionBtn, background: '#991b1b', color: '#fff'}}
                        >
                          <FaTimes size={10} /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {requests.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" style={{textAlign: 'center', padding: '40px', color: '#64748b', fontStyle: 'italic'}}>No drop or leave requests available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* --- SIDE PANEL: SUBJECT-WISE ATTENDANCE DRILL-DOWN --- */}
      {selectedStudent && (
        <>
          <div style={overlay} onClick={() => setSelectedStudent(null)} />
          <div style={sidePanel}>
            <div style={panelHeader}>
              <h3 style={{fontSize: '16px', color: '#0f172a', fontWeight: 'normal'}}>Subject Attendance Breakdown</h3>
              <button onClick={() => setSelectedStudent(null)} style={closeIconBtn}><FaTimes /></button>
            </div>

            <div style={panelBody}>
              <div style={panelProfileCard}>
                <img 
                  src={selectedStudent.profile_photo || selectedStudent.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedStudent.name || 'Student')}&background=cbd5e1&color=0f172a`} 
                  alt="Student" style={panelAvatar}
                />
                <div>
                  <div style={{fontSize: '16px', fontWeight: 'bold', color: '#0f172a'}}>{selectedStudent.name}</div>
                  <div style={{fontSize: '12px', color: '#64748b'}}>Class: {selectedStudent.class} | ID: {selectedStudent.id || selectedStudent._id}</div>
                  <div style={{fontSize: '12px', color: '#166534', marginTop: '4px'}}>Overall Attendance: <strong>{selectedStudent.percentage}%</strong></div>
                </div>
              </div>

              <h4 style={{fontSize: '13px', color: '#475569', margin: '20px 0 10px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
                <FaBook style={{marginRight: '6px'}} /> Subjects for Month: {currentMonth}
              </h4>

              {subjectLoading ? (
                <div style={{textAlign: 'center', padding: '25px', color: '#64748b', fontSize: '13px', fontStyle: 'italic'}}>Loading subject attendance...</div>
              ) : studentSubjectData.length > 0 ? (
                <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                  {studentSubjectData.map((subj, i) => (
                    <div key={i} style={subjectCard}>
                      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '4px'}}>
                        <span style={{fontWeight: 'bold', fontSize: '13px', color: '#0f172a'}}>{subj.subjectCode}</span>
                        <span style={{fontSize: '13px', fontWeight: 'bold', color: subj.percentage >= 75 ? '#166534' : '#991b1b'}}>
                          {subj.percentage}%
                        </span>
                      </div>
                      <div style={{fontSize: '12px', color: '#64748b', display: 'flex', justifyContent: 'space-between'}}>
                        <span>Present: {subj.present} | Absent: {subj.absent}</span>
                        <span>Total: {subj.total}</span>
                      </div>
                      <div style={{...barContainer, marginTop: '6px'}}>
                        <div style={{...barFill, width: `${subj.percentage}%`, background: subj.percentage >= 75 ? '#166534' : '#991b1b'}}></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{textAlign: 'center', padding: '30px', color: '#64748b', fontStyle: 'italic', fontSize: '13px'}}>
                  No subject records found for {currentMonth}.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// --- STYLES ---
const appContainer = { padding: '24px', background: '#f8fafc', minHeight: '100vh' };
const statsGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' };
const statCard = { background: '#fff', padding: '16px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' };
const iconCircle = { width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' };
const statLabel = { fontSize: '12px', color: '#64748b' };
const statNumber = { fontSize: '18px', fontWeight: 'bold', color: '#0f172a', marginTop: '2px' };

const commandBar = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '16px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' };
const leftBar = { display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' };
const titleText = { fontSize: '18px', color: '#0f172a', fontWeight: 'normal', margin: 0 };
const tabSwitchContainer = { display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '4px' };
const tabBtn = { padding: '6px 14px', border: 'none', borderRadius: '3px', fontSize: '12px', cursor: 'pointer', transition: '0.2s' };

const rightBar = { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' };
const filterBox = { display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '5px 10px', borderRadius: '4px' };
const monthInputStyle = { border: 'none', background: 'transparent', fontSize: '12px', color: '#0f172a', outline: 'none', cursor: 'pointer' };
const refreshBtn = { background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 10px', borderRadius: '4px', cursor: 'pointer', color: '#475569' };

const filterContainer = { background: '#fff', padding: '16px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '20px' };
const dropdownSelectStyle = { padding: '6px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff', color: '#0f172a', outline: 'none', cursor: 'pointer' };
const clearRangeBtn = { padding: '5px 10px', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' };

const searchWrapper = { position: 'relative', display: 'flex', alignItems: 'center' };
const sIcon = { position: 'absolute', left: '10px', color: '#94a3b8', fontSize: '12px' };
const sInput = { padding: '6px 10px 6px 30px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', width: '200px' };

const pdfBtn = { background: '#1a237e', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' };

const tableWrapper = { background: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', overflowX: 'auto' };
const fullTable = { width: '100%', borderCollapse: 'collapse', textAlign: 'left' };
const thRow = { background: '#f8fafc', borderBottom: '1px solid #e2e8f0' };
const th = { padding: '12px 16px', fontSize: '11px', color: '#475569', letterSpacing: '0.5px' };
const thC = { ...th, textAlign: 'center' };
const trStyle = { borderBottom: '1px solid #f1f5f9' };
const td = { padding: '12px 16px', fontSize: '13px' };
const tdC = { ...td, textAlign: 'center' };
const idGroup = { display: 'flex', alignItems: 'center', gap: '10px' };
const photoBox = { width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', background: '#e2e8f0' };
const avatarImg = { width: '100%', height: '100%', objectFit: 'cover' };
const nameTxt = { fontWeight: 'bold', color: '#0f172a' };
const subTxt = { fontSize: '11px', color: '#64748b' };
const batchBadge = { background: '#f1f5f9', padding: '3px 8px', borderRadius: '3px', fontSize: '11px', color: '#334155', border: '1px solid #cbd5e1' };
const statValue = { fontWeight: 'bold', color: '#0f172a' };
const barContainer = { width: '80px', height: '6px', background: '#f1f5f9', borderRadius: '3px', margin: '0 auto', overflow: 'hidden' };
const barFill = { height: '100%', borderRadius: '3px' };
const viewBtn = { background: '#0f172a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' };
const actionBtn = { border: 'none', padding: '4px 8px', borderRadius: '3px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' };
const loader = { padding: '20px', textAlign: 'center', color: '#64748b', fontStyle: 'italic', fontSize: '13px' };

const overlay = { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', zIndex: 1000 };
const sidePanel = { position: 'fixed', top: 0, right: 0, width: '420px', maxWidth: '100%', height: '100vh', background: '#fff', zIndex: 1001, boxShadow: '-4px 0 15px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' };
const panelHeader = { padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const closeIconBtn = { background: 'transparent', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#64748b' };
const panelBody = { padding: '20px', overflowY: 'auto', flex: 1 };
const panelProfileCard = { display: 'flex', alignItems: 'center', gap: '14px', background: '#f8fafc', padding: '14px', borderRadius: '6px', border: '1px solid #e2e8f0' };
const panelAvatar = { width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', background: '#cbd5e1' };
const subjectCard = { background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' };

export default AdminAttendance;