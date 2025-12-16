import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "https://student-management-system-4-hose.onrender.com";

const AdminAddNewMarks = () => {
  const subjectsByClass = {
    "5th": ["Math", "English", "Hindi", "EVS"],
    "6th": ["Math", "English", "Hindi", "Science"],
    "7th": ["Math", "English", "Hindi", "Science", "Civics", "Geography", "Economics", "History"],
    "8th": ["Math", "English", "Science", "Hindi", "Civics", "Geography", "Economics", "History"],
    "9th": ["Math", "English", "Hindi", "Science", "S.S.T"],
    "10th": ["Math", "English", "Hindi", "Science", "S.S.T"],
    "11th": ["Chemistry", "Math", "English", "Physics", "Biology"],
  };

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [subject, setSubject] = useState("");
  const [marksData, setMarksData] = useState([]);
  const [testDate, setTestDate] = useState(new Date().toISOString().split("T")[0]);
  const [globalTotal, setGlobalTotal] = useState("");
  const [message, setMessage] = useState("");

  // Fetch Classes
  useEffect(() => {
    axios.get(`${API_URL}/api/new-marks/classes`)
      .then(res => {
        if (res.data.success) setClasses(res.data.classes.map(c => c.class));
      })
      .catch(console.error);
  }, []);

  // Fetch Students + Attendance
  useEffect(() => {
    if (!selectedClass) return;

    const fetchData = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/new-marks/students/${selectedClass}`);
        if (!res.data.success) return;

        let list = res.data.students.map(s => ({
          studentId: s.id,
          name: s.name,
          theory: "",
          viva: "",
          attendance: 0,
          obtained: 0,
        }));

        const prev = new Date(testDate);
        prev.setMonth(prev.getMonth() - 1);
        const prevMonth = prev.toISOString().slice(0, 7);

        list = await Promise.all(list.map(async student => {
          try {
            const attRes = await axios.get(`${API_URL}/api/attendance/attendance-marks`, {
              params: { studentId: student.studentId, month: prevMonth }
            });
            if (attRes.data.success) student.attendance = attRes.data.attendanceMarks;
          } catch {}
          return student;
        }));

        // 🔴 attendance = 0 → all marks 0
        list = list.map(s => {
          if (Number(s.attendance) === 0) {
            return { ...s, theory: 0, viva: 0, obtained: 0 };
          }
          return {
            ...s,
            obtained: Number(s.theory || 0) + Number(s.viva || 0) + Number(s.attendance || 0)
          };
        });

        setMarksData(list);
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();
  }, [selectedClass, testDate]);

  // 🔴 handle change (blocked if attendance = 0)
  const handleChange = (i, field, value) => {
    const updated = [...marksData];

    if (Number(updated[i].attendance) === 0) {
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
    if (!subject || !globalTotal) {
      alert("Subject & Total Marks required");
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/api/new-marks/add`, {
        studentId: s.studentId,
        subject,
        theoryMarks: Number(s.attendance === 0 ? 0 : s.theory),
        vivaMarks: Number(s.attendance === 0 ? 0 : s.viva),
        attendanceMarks: Number(s.attendance),
        totalMarks: Number(globalTotal),
        date: testDate
      });

      setMessage(`${s.name}: ${res.data.message}`);
    } catch {
      setMessage(`${s.name}: Error saving marks`);
    }
  };

  return (
    <div className="page">
      <h2 className="title">📘 Pre-Final Examination Marks Sheet</h2>

      <div className="filters">
        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
          <option value="">Select Class</option>
          {classes.map(c => <option key={c}>{c}</option>)}
        </select>

        <select value={subject} onChange={e => setSubject(e.target.value)}>
          <option value="">Select Subject</option>
          {subjectsByClass[selectedClass]?.map(s => <option key={s}>{s}</option>)}
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
                const absent = Number(s.attendance) === 0;

                return (
                  <tr key={s.studentId}>
                    <td>{i + 1}</td>
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
                    <td>{s.obtained}</td>
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

      {/* 🔒 CSS SAME AS YOU SENT */}
      <style>{`
        .page { padding:20px; background:#f4f6f9; min-height:100vh; }
        .title { text-align:center; margin-bottom:20px; }

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
