import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "https://student-management-system-4-hose.onrender.com";

const AdminAddNewMarks = () => {
  const subjectsByClass = {
    "5th": ["Math", "English", "Hindi", "EVS", "English Communication"],
    "6th": ["Math", "English", "Hindi", "Science", "English Communication"],
    "7th": ["Math", "English", "Hindi", "Science", "Civics", "Geography", "Economics", "History", "English Communication"],
    "8th": ["Math", "English", "Science", "Hindi", "Civics", "Geography", "Economics", "History", "English Communication"],
    "9th": ["Math", "English", "Hindi", "Science", "S.S.T", "English Communication"],
    "10th": ["Math", "English", "Hindi", "Science", "S.S.T", "English Communication"],
    "11th": ["Chemistry", "Math", "English", "Physics", "Biology", "English Communication"],
    "12th": ["Chemistry", "Math", "English", "Physics", "Biology", "Hindi", "English Communication"],
  };

  const classOrder = ["5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];

  const [classes, setClasses] = useState([]);
  const [selectionMode, setSelectionMode] = useState("single"); // 'single' or 'range'
  const [selectedClass, setSelectedClass] = useState("");
  const [fromClass, setFromClass] = useState("");
  const [toClass, setToClass] = useState("");
  
  const [examType, setExamType] = useState("PRE-FINAL"); // Default set to PRE-FINAL
  const [subject, setSubject] = useState("");
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [marksData, setMarksData] = useState([]);
  const [testDate, setTestDate] = useState(new Date().toISOString().split("T")[0]);
  const [globalTotal, setGlobalTotal] = useState("");
  const [message, setMessage] = useState("");

  const [session, setSession] = useState(
    localStorage.getItem("session") || "2026-27"
  );

  useEffect(() => {
    const savedSession = localStorage.getItem("session");
    if (savedSession) {
      setSession(savedSession);
    }
  }, []);

  // Fetch Classes
  useEffect(() => {
    axios.get(`${API_URL}/api/new-marks/classes`)
      .then(res => {
        if (res.data.success) {
          const rawClasses = res.data.classes.map(c => {
            let className = c.class;
            if (className === "11") className = "11th";
            return className;
          });
          const sortedClasses = rawClasses.sort((a, b) => classOrder.indexOf(a) - classOrder.indexOf(b));
          setClasses(sortedClasses);
        }
      })
      .catch(console.error);
  }, []);

  // Determine active classes based on selection mode
  const getActiveClasses = () => {
    if (selectionMode === "single") {
      return selectedClass ? [selectedClass] : [];
    } else {
      if (!fromClass || !toClass) return [];
      const fromIdx = classes.indexOf(fromClass);
      const toIdx = classes.indexOf(toClass);
      if (fromIdx === -1 || toIdx === -1 || fromIdx > toIdx) return [];
      return classes.slice(fromIdx, toIdx + 1);
    }
  };

  // Update Available Subjects based on active classes
  useEffect(() => {
    const activeClasses = getActiveClasses();
    if (activeClasses.length === 0) {
      setAvailableSubjects([]);
      return;
    }

    if (activeClasses.length === 1) {
      setAvailableSubjects(subjectsByClass[activeClasses[0]] || []);
    } else {
      const allSubs = new Set();
      activeClasses.forEach(cls => {
        if (subjectsByClass[cls]) {
          subjectsByClass[cls].forEach(sub => allSubs.add(sub));
        }
      });
      setAvailableSubjects(Array.from(allSubs));
    }
    setSubject(""); 
  }, [selectedClass, fromClass, toClass, selectionMode, classes]);

  // Fetch Students + Attendance for all active classes
  useEffect(() => {
    const activeClasses = getActiveClasses();
    if (activeClasses.length === 0) {
      setMarksData([]);
      return;
    }

    const fetchData = async () => {
      try {
        let allStudents = [];

        await Promise.all(
          activeClasses.map(async (cls) => {
            try {
              let apiClass = cls === "11th" ? "11" : cls;
              const res = await axios.get(`${API_URL}/api/new-marks/students/${apiClass}`);
              if (res.data.success) {
                const mapped = res.data.students.map(s => ({ ...s, className: cls }));
                allStudents = [...allStudents, ...mapped];
              }
            } catch (err) {
              console.error(`Error fetching students for class ${cls}`, err);
            }
          })
        );

        allStudents.sort((a, b) => classOrder.indexOf(a.className) - classOrder.indexOf(b.className));

        let list = allStudents.map(s => ({
          studentId: s.id,
          name: s.name,
          className: s.className,
          theory: "",
          viva: "",
          attendance: 0,
          obtained: 0,
        }));

        list = await Promise.all(
          list.map(async student => {
            try {
              // 🔄 Updated API Endpoint for Attendance Marks
              const attRes = await axios.get(
                `${API_URL}/api/new-marks/attendance/current-marks`,
                {
                  params: {
                    studentId: student.studentId
                  }
                }
              );

              if (attRes.data.success) {
                student.attendance = attRes.data.attendanceMarks;
              }
            } catch (err) {
              console.log("Attendance error", err);
            }
            return student;
          })
        );

        // 🔒 attendance < 1 -> all marks 0
        list = list.map(s => {
          if (Number(s.attendance) < 1) {
            return { ...s, theory: 0, viva: 0, obtained: 0 };
          }
          return {
            ...s,
            obtained:
              Number(s.theory || 0) +
              Number(s.viva || 0) +
              Number(s.attendance || 0),
          };
        });

        setMarksData(list);
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();
  }, [selectedClass, fromClass, toClass, selectionMode, testDate, classes]);

  // handle change (blocked if attendance < 1)
  const handleChange = (i, field, value) => {
    const updated = [...marksData];

    if (Number(updated[i].attendance) < 1) {
      updated[i].theory = 0;
      updated[i].viva = 0;
      updated[i].obtained = 0;
      setMarksData(updated);
      return;
    }

    updated[i][field] = value;

    const t = Number(updated[i].theory || 0);
    const v = Number(updated[i].viva || 0);
    const a = Number(updated[i].attendance || 0);

    updated[i].obtained = t + v + a;
    setMarksData(updated);
  };

  // Save Marks
  const saveMarks = async (s) => {
    if (!subject || !globalTotal || !examType) {
      alert("Exam Type, Subject & Total Marks required");
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/api/new-marks/add`, {
        studentId: s.studentId,
        examType, 
        session,
        subject,
        theoryMarks: Number(s.attendance < 1 ? 0 : s.theory),
        vivaMarks: Number(s.attendance < 1 ? 0 : s.viva),
        attendanceMarks: Number(s.attendance),
        totalMarks: Number(globalTotal),
        date: testDate
      });

      setMessage(`${s.name} (${s.className}): ${res.data.message}`);
    } catch {
      setMessage(`${s.name} (${s.className}): Error saving marks`);
    }
  };

  return (
    <div className="page">
      <h2 className="title">📘 Examination Marks Sheet</h2>

      {/* Mode Selection Toggles */}
      <div className="mode-selector">
        <label>
          <input 
            type="radio" 
            name="selectionMode" 
            value="single" 
            checked={selectionMode === "single"} 
            onChange={() => { setSelectionMode("single"); setSelectedClass(""); }} 
          /> Single Class
        </label>
        <label style={{ marginLeft: "20px" }}>
          <input 
            type="radio" 
            name="selectionMode" 
            value="range" 
            checked={selectionMode === "range"} 
            onChange={() => { setSelectionMode("range"); setFromClass(""); setToClass(""); }} 
          /> Class Range / All
        </label>
      </div>

      <div className="filters">
        {/* Exam Type Dropdown */}
        <select value={examType} onChange={e => setExamType(e.target.value)}>
          <option value="PRE-FINAL">PRE-FINAL</option>
          <option value="FINAL">FINAL</option>
          <option value="REAPPEAR PRE-FINAL">REAPPEAR PRE-FINAL</option>
          <option value="REAPPEAR FINAL">REAPPEAR FINAL</option>
        </select>

        {selectionMode === "single" ? (
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
            <option value="">Select Class</option>
            {classes.map(c => <option key={c}>{c}</option>)}
          </select>
        ) : (
          <>
            <select value={fromClass} onChange={e => setFromClass(e.target.value)}>
              <option value="">From Class</option>
              {classes.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={toClass} onChange={e => setToClass(e.target.value)}>
              <option value="">To Class</option>
              {classes.map(c => <option key={c}>{c}</option>)}
            </select>
          </>
        )}

        <select value={subject} onChange={e => setSubject(e.target.value)}>
          <option value="">Select Subject</option>
          {availableSubjects.map(s => <option key={s}>{s}</option>)}
        </select>

        <input type="number" placeholder="Total Marks" value={globalTotal} onChange={e => setGlobalTotal(e.target.value)} />
        <input type="date" value={testDate} onChange={e => setTestDate(e.target.value)} />
      </div>

      {marksData.length > 0 && (
        <div className="tableWrap">
          <table className="marksTable">
            <thead>
              <tr>
                <th>#</th>
                <th>Class</th>
                <th>Name</th>
                <th>Subject</th>
                <th>Theory</th>
                <th>Viva</th>
                <th>Attendance</th>
                <th>Obtained</th>
                <th>Total</th>
                <th>Save</th>
              </tr>
            </thead>
            <tbody>
              {marksData.map((s, i) => {
                const absent = Number(s.attendance) < 1;

                return (
                  <tr key={`${s.studentId}-${s.className}`}>
                    <td>{i + 1}</td>
                    <td style={{ fontWeight: "bold", color: "#e67e22" }}>{s.className}</td>
                    <td>{s.name}</td>
                    <td>{subject || "-"}</td>
                    <td>
                      <input
                        type="number"
                        value={s.theory}
                        disabled={absent}
                        onChange={e => handleChange(i, "theory", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={s.viva}
                        disabled={absent}
                        onChange={e => handleChange(i, "viva", e.target.value)}
                      />
                    </td>
                    <td>{s.attendance}</td>
                    <td className="obtained">{s.obtained}</td>
                    <td>{globalTotal || "-"}</td>
                    <td>
                      <button onClick={() => saveMarks(s)}>Save</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {message && <p className="msg">{message}</p>}

      <style>{`
        .page { padding:20px; background:#f4f6f9; min-height:100vh; }
        .title { text-align:center; margin-bottom:20px; }
        
        .mode-selector {
          background: #fff;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          border: 1px solid #e1e1e1;
        }
        .mode-selector input { width: auto; margin-right: 6px; cursor: pointer; }
        .mode-selector label { font-weight: 500; cursor: pointer; display: flex; align-items: center; }

        .filters {
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
          gap:12px;
          margin-bottom:20px;
        }

        select,input {
          padding:10px;
          border-radius:6px;
          border:1px solid #ccc;
          width:100%;
        }

        .tableWrap {
          overflow-x:auto;
          background:#fff;
          padding:15px;
          border-radius:10px;
        }

        .marksTable {
          width:100%;
          border-collapse:collapse;
          min-width:1000px;
        }

        th,td { border:1px solid #e1e1e1; padding:10px; text-align:center; }
        th { background:#eef2f7; }
        .obtained { font-weight:bold; color:#2c7be5; }
        button { padding:6px 14px; background:#2c7be5; color:#fff; border:none; border-radius:6px; cursor:pointer; }

        .msg { margin-top:15px; text-align:center; font-weight:bold; }

        @media(max-width:768px){ .marksTable { min-width:900px; } }
      `}</style>
    </div>
  );
};

export default AdminAddNewMarks;