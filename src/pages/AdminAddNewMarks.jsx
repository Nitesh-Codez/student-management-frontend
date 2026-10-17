import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const AdminAddNewMarks = () => {
  const subjectsByClass = {
    "5th": ["Maths", "English", "Hindi", "EVS", "English Communication"],
    "6th": ["Maths", "English", "Hindi", "Science", "English Communication"],
    "7th": [
      "Maths",
      "English",
      "Hindi",
      "Science",
      "Civics",
      "Geography",
      "Economics",
      "History",
      "English Communication",
    ],
    "8th": [
      "Maths",
      "English",
      "Science",
      "Hindi",
      "Civics",
      "Geography",
      "Economics",
      "History",
      "English Communication",
    ],
    "9th": [
      "Maths",
      "English",
      "Hindi",
      "Science",
      "S.S.T",
      "English Communication",
    ],
    "10th": [
      "Maths",
      "English",
      "Hindi",
      "Science",
      "S.S.T",
      "English Communication",
    ],
    "11th": [
      "Chemistry",
      "Maths",
      "English",
      "Physics",
      "Biology",
      "English Communication",
    ],
    "12th": [
      "Chemistry",
      "Maths",
      "English",
      "Physics",
      "Biology",
      "Hindi",
      "English Communication",
    ],
  };

  const classOrder = [
    "5th",
    "6th",
    "7th",
    "8th",
    "9th",
    "10th",
    "11th",
    "12th",
  ];

  const [classes, setClasses] = useState([]);
  const [selectionMode, setSelectionMode] = useState("single");

  const [selectedClass, setSelectedClass] = useState("");
  const [fromClass, setFromClass] = useState("");
  const [toClass, setToClass] = useState("");

  const [examType, setExamType] = useState("PRE-FINAL");
  const [subject, setSubject] = useState("");
  const [availableSubjects, setAvailableSubjects] = useState([]);

  const [marksData, setMarksData] = useState([]);

  const [testDate, setTestDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [globalTotal, setGlobalTotal] = useState("");

  const [session, setSession] = useState(
    localStorage.getItem("session") || "2026-27"
  );

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);

  // ==================================================
  // Fetch Classes
  // ==================================================
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get("/api/new-marks/classes");

        if (res.data.success) {
          const rawClasses = res.data.classes.map((c) => {
            let className = c.class;

            if (className === "11") {
              className = "11th";
            }

            return className;
          });

          const sortedClasses = rawClasses.sort(
            (a, b) =>
              classOrder.indexOf(a) - classOrder.indexOf(b)
          );

          setClasses(sortedClasses);
        }
      } catch (error) {
        console.error("Error fetching classes:", error);
      }
    };

    fetchClasses();
  }, []);

  // ==================================================
  // Session
  // ==================================================
  useEffect(() => {
    const savedSession = localStorage.getItem("session");

    if (savedSession) {
      setSession(savedSession);
    }
  }, []);

  // ==================================================
  // Active Classes
  // ==================================================
  const activeClasses = useMemo(() => {
    if (selectionMode === "single") {
      return selectedClass ? [selectedClass] : [];
    }

    if (!fromClass || !toClass) {
      return [];
    }

    const fromIdx = classes.indexOf(fromClass);
    const toIdx = classes.indexOf(toClass);

    if (
      fromIdx === -1 ||
      toIdx === -1 ||
      fromIdx > toIdx
    ) {
      return [];
    }

    return classes.slice(fromIdx, toIdx + 1);
  }, [
    selectionMode,
    selectedClass,
    fromClass,
    toClass,
    classes,
  ]);

  // ==================================================
  // Subjects
  // ==================================================
  useEffect(() => {
    if (activeClasses.length === 0) {
      setAvailableSubjects([]);
      setSubject("");
      return;
    }

    if (activeClasses.length === 1) {
      setAvailableSubjects(
        subjectsByClass[activeClasses[0]] || []
      );
    } else {
      const allSubjects = new Set();

      activeClasses.forEach((cls) => {
        (subjectsByClass[cls] || []).forEach((sub) =>
          allSubjects.add(sub)
        );
      });

      setAvailableSubjects([...allSubjects]);
    }

    setSubject("");
  }, [activeClasses.join(",")]);

  // ==================================================
  // Fetch Students + Existing Marks (Date-independent)
  // ==================================================
  useEffect(() => {
    if (
      activeClasses.length === 0 ||
      !subject ||
      !examType ||
      !session
    ) {
      setMarksData([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);

      try {
        // ------------------------------------------
        // Banned Students
        // ------------------------------------------
        let bannedIds = new Set();
        let bannedNames = new Set();

        try {
          const bannedRes = await api.get(
            "/api/auth/banned-students"
          );

          if (bannedRes.data.success) {
            const bannedList =
              bannedRes.data.students || [];

            bannedIds = new Set(
              bannedList.map((b) =>
                String(b.id || b.studentId)
              )
            );

            bannedNames = new Set(
              bannedList.map((b) =>
                (b.name || "")
                  .trim()
                  .toLowerCase()
              )
            );
          }
        } catch (error) {
          console.error(
            "Error fetching banned students:",
            error
          );
        }

        // ------------------------------------------
        // Fetch Students
        // ------------------------------------------
        let allStudents = [];

        await Promise.all(
          activeClasses.map(async (cls) => {
            try {
              const apiClass =
                cls === "11th" ? "11" : cls;

              const res = await api.get(
                `/api/new-marks/students/${apiClass}`
              );

              if (res.data.success) {
                const mapped =
                  res.data.students.map((student) => ({
                    ...student,
                    className: cls,
                  }));

                allStudents.push(...mapped);
              }
            } catch (error) {
              console.error(
                `Error fetching students for ${cls}:`,
                error
              );
            }
          })
        );

        // ------------------------------------------
        // Remove Banned
        // ------------------------------------------
        allStudents = allStudents.filter((student) => {
          const id = String(student.id);

          const name = (student.name || "")
            .trim()
            .toLowerCase();

          return (
            !bannedIds.has(id) &&
            !bannedNames.has(name)
          );
        });

        // ------------------------------------------
        // Sort
        // ------------------------------------------
        allStudents.sort(
          (a, b) =>
            classOrder.indexOf(a.className) -
            classOrder.indexOf(b.className)
        );

        // ------------------------------------------
        // Initial List
        // ------------------------------------------
        let list = allStudents.map((student) => ({
          recordId: null,

          studentId: student.id,
          name: student.name,
          className: student.className,

          theory: "",
          viva: "",
          behaviour: "",
          task: "",

          attendance: 0,
          obtained: 0,

          isSaved: false,
          isExisting: false,
        }));

        // ------------------------------------------
        // Attendance + Existing Marks
        // ------------------------------------------
        list = await Promise.all(
          list.map(async (student) => {
            try {
              // Attendance
              const attendanceRes = await api.get(
                "/api/new-marks/attendance/current-marks",
                {
                  params: {
                    studentId: student.studentId,
                    session: session,
                    examType: examType,
                  },
                }
              );

              if (attendanceRes.data.success) {
                student.attendance =
                  Number(attendanceRes.data.attendanceMarks) || 0;

                student.attendanceLocked =
                  attendanceRes.data.attendanceLocked === true;
              }

              // Existing Marks
              const marksRes = await api.post(
                "/api/new-marks/check",
                {
                  studentId: student.studentId,
                  studentName: student.name,
                }
              );

              if (
                marksRes.data.success &&
                marksRes.data.data?.length
              ) {
                // Exam Type, Subject, aur Session par matching (No Date checking)
                const match = marksRes.data.data.find(
                  (mark) =>
                    mark.subject?.toUpperCase() ===
                      subject.toUpperCase() &&
                    mark.exam_type?.toUpperCase() ===
                      examType.toUpperCase() &&
                    mark.session === session
                );

                if (match) {
                  if (match.attendance_locked === true) {
                    student.attendance =
                      Number(match.attendance_marks) || 0;

                    student.attendanceLocked = true;
                  }
                  student.recordId = match.id;

                  student.theory =
                    match.theory_marks ?? "";

                  student.viva =
                    match.viva_marks ?? "";

                  student.behaviour =
                    match.behaviour ?? "";

                  student.task =
                    match.task ?? "";

                  student.isSaved = true;
                  student.isExisting = true;

                  if (match.test_date) {
                    setTestDate(match.test_date.split("T")[0]);
                  }

                  if (
                    match.total_marks != null
                  ) {
                    setGlobalTotal(
                      (previous) =>
                        previous || match.total_marks
                    );
                  }
                }
              }
            } catch (error) {
              console.error(
                "Error loading student marks:",
                error
              );
            }

            return student;
          })
        );

        // ------------------------------------------
        // Calculate Obtained
        // ------------------------------------------
        list = list.map((student) => {
          const attendance =
            Number(student.attendance) || 0;

          if (attendance < 1) {
            return {
              ...student,
              theory: 0,
              viva: 0,
              behaviour: 0,
              task: 0,
              obtained: 0,
            };
          }

          const obtained =
            Number(student.theory || 0) +
            Number(student.viva || 0) +
            Number(student.behaviour || 0) +
            Number(student.task || 0) +
            attendance;

          return {
            ...student,
            obtained,
          };
        });

        setMarksData(list);
      } catch (error) {
        console.error(
          "Error fetching marks data:",
          error
        );

        setMessage(
          "Unable to load marks data."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    selectedClass,
    fromClass,
    toClass,
    selectionMode,
    subject,
    examType,
    session,
    classes.length,
  ]);

  // ==================================================
  // Change Theory
  // ==================================================
  const handleTheoryChange = (index, value) => {
    const updated = [...marksData];

    const student = updated[index];

    if (Number(student.attendance) < 1) {
      return;
    }

    updated[index].theory = value;
    updated[index].isSaved = false;

    const theory = Number(value || 0);
    const viva = Number(student.viva || 0);
    const behaviour = Number(
      student.behaviour || 0
    );
    const task = Number(student.task || 0);
    const attendance = Number(
      student.attendance || 0
    );

    updated[index].obtained =
      theory +
      viva +
      behaviour +
      task +
      attendance;

    setMarksData(updated);
  };

  // ==================================================
  // Save / Update Marks
  // ==================================================
  const saveMarks = async (student, index) => {
    if (
      !subject ||
      !globalTotal ||
      !examType ||
      !testDate
    ) {
      alert(
        "Exam Type, Subject, Total Marks and Date are required."
      );
      return;
    }

    const attendance =
      Number(student.attendance) || 0;

    const payload = {
      studentId: student.studentId,

      subject,

      theoryMarks:
        attendance < 1
          ? 0
          : Number(student.theory || 0),

      vivaMarks:
        attendance < 1
          ? 0
          : Number(student.viva || 0),

      behaviour:
        attendance < 1
          ? 0
          : Number(student.behaviour || 0),

      attendanceMarks: attendance,

      task:
        attendance < 1
          ? 0
          : Number(student.task || 0),

      totalMarks: Number(globalTotal),

      examType,
      session,

      date: testDate,
    };

    try {
      setSavingId(student.studentId);
      setMessage("");

      let response;

      if (student.recordId) {
        response = await api.put(
          `/api/new-marks/update/${student.recordId}`,
          payload
        );
      } else {
        response = await api.post(
          "/api/new-marks/add",
          payload
        );
      }

      if (response.data.success) {
        const updatedData = [...marksData];

        updatedData[index] = {
          ...updatedData[index],

          isSaved: true,

          isExisting: true,

          recordId:
            response.data.data?.id ||
            updatedData[index].recordId,
        };

        setMarksData(updatedData);

        setMessage(
          `${student.name} (${student.className}) — ${
            student.recordId
              ? "Marks updated successfully."
              : "Marks added successfully."
          }`
        );
      } else {
        setMessage(
          `${student.name}: ${
            response.data.message ||
            "Unable to save marks."
          }`
        );
      }
    } catch (error) {
      console.error(
        "Save/update marks error:",
        error
      );

      const errorMessage =
        error.response?.data?.message ||
        "Server error while saving marks.";

      setMessage(
        `${student.name}: ${errorMessage}`
      );
    } finally {
      setSavingId(null);
    }
  };

  // ==================================================
  // Stats
  // ==================================================
  const savedCount = marksData.filter(
    (student) => student.isSaved
  ).length;

  const pendingCount =
    marksData.length - savedCount;

  return (
    <div className="marks-page">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Examination Marks</h1>
          <p>
            Add new marks or update existing
            theory marks.
          </p>
        </div>

        <div className="session-badge">
          Session {session}
        </div>
      </div>

      {/* Filters Card */}
      <div className="filter-card">

        <div className="section-title">
          <span>📋</span>
          Examination Configuration
        </div>

        {/* Selection Mode */}
        <div className="mode-box">

          <label className="radio-label">
            <input
              type="radio"
              name="selectionMode"
              checked={
                selectionMode === "single"
              }
              onChange={() => {
                setSelectionMode("single");
                setSelectedClass("");
                setFromClass("");
                setToClass("");
              }}
            />

            <span>Single Class</span>
          </label>

          <label className="radio-label">
            <input
              type="radio"
              name="selectionMode"
              checked={
                selectionMode === "range"
              }
              onChange={() => {
                setSelectionMode("range");
                setSelectedClass("");
                setFromClass("");
                setToClass("");
              }}
            />

            <span>Class Range / All</span>
          </label>

        </div>

        <div className="filters-grid">

          {/* Exam */}
          <div className="field">
            <label>Exam Type</label>

            <select
              value={examType}
              onChange={(e) =>
                setExamType(e.target.value)
              }
            >
              <option value="PRE-FINAL">
                PRE-FINAL
              </option>

              <option value="FINAL">
                FINAL
              </option>

              <option value="REAPPEAR PRE-FINAL">
                REAPPEAR PRE-FINAL
              </option>

              <option value="REAPPEAR FINAL">
                REAPPEAR FINAL
              </option>
            </select>
          </div>

          {/* Class */}
          {selectionMode === "single" ? (
            <div className="field">
              <label>Class</label>

              <select
                value={selectedClass}
                onChange={(e) =>
                  setSelectedClass(
                    e.target.value
                  )
                }
              >
                <option value="">
                  Select Class
                </option>

                {classes.map((cls) => (
                  <option
                    key={cls}
                    value={cls}
                  >
                    {cls}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div className="field">
                <label>From Class</label>

                <select
                  value={fromClass}
                  onChange={(e) =>
                    setFromClass(
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    From Class
                  </option>

                  {classes.map((cls) => (
                    <option
                      key={cls}
                      value={cls}
                    >
                      {cls}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>To Class</label>

                <select
                  value={toClass}
                  onChange={(e) =>
                    setToClass(
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    To Class
                  </option>

                  {classes.map((cls) => (
                    <option
                      key={cls}
                      value={cls}
                    >
                      {cls}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Subject */}
          <div className="field">
            <label>Subject</label>

            <select
              value={subject}
              onChange={(e) =>
                setSubject(e.target.value)
              }
            >
              <option value="">
                Select Subject
              </option>

              {availableSubjects.map(
                (sub) => (
                  <option
                    key={sub}
                    value={sub}
                  >
                    {sub}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Total */}
          <div className="field">
            <label>Total Marks</label>

            <input
              type="number"
              min="1"
              placeholder="e.g. 50"
              value={globalTotal}
              onChange={(e) =>
                setGlobalTotal(
                  e.target.value
                )
              }
            />
          </div>

          {/* Date */}
          <div className="field">
            <label>Test Date</label>

            <input
              type="date"
              value={testDate}
              onChange={(e) =>
                setTestDate(
                  e.target.value
                )
              }
            />
          </div>

        </div>
      </div>

      {/* Stats */}
      {marksData.length > 0 && (
        <div className="stats-grid">

          <div className="stat-card">
            <div className="stat-icon">👨‍🎓</div>
            <div>
              <small>Total Students</small>
              <strong>
                {marksData.length}
              </strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon success">
              ✓
            </div>
            <div>
              <small>Saved</small>
              <strong className="success-text">
                {savedCount}
              </strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon warning">
              !
            </div>
            <div>
              <small>Pending</small>
              <strong className="warning-text">
                {pendingCount}
              </strong>
            </div>
          </div>

        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="loading-box">
          Loading students and marks...
        </div>
      )}

      {/* Marks Table */}
      {!loading &&
        marksData.length > 0 && (
          <div className="table-card">

            <div className="table-header">

              <div>
                <h3>
                  {subject || "Marks Sheet"}
                </h3>

                <span>
                  Theory marks are editable.
                  Other components are read-only.
                </span>
              </div>

              <div className="edit-info">
                ✏️ Edit Theory
              </div>

            </div>

            <div className="table-wrap">

              <table className="marks-table">

                <thead>
                  <tr>
                    <th>#</th>
                    <th>Class</th>
                    <th>Student</th>
                    <th>Theory</th>
                    <th>Viva</th>
                    <th>Behaviour</th>
                    <th>Task</th>
                    <th>Attendance</th>
                    <th>Obtained</th>
                    <th>Total</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>

                  {marksData.map(
                    (student, index) => {

                      const absent =
                        Number(
                          student.attendance
                        ) < 1;

                      const saving =
                        savingId ===
                        student.studentId;

                      return (
                        <tr
                          key={`${student.studentId}-${student.className}`}
                          className={
                            student.isSaved
                              ? "saved-row"
                              : ""
                          }
                        >

                          <td className="index">
                            {index + 1}
                          </td>

                          <td>
                            <span className="class-badge">
                              {student.className}
                            </span>
                          </td>

                          <td className="student-name">
                            {student.name}
                          </td>

                          {/* THEORY */}
                          <td>
                            <input
                              type="number"
                              min="0"
                              value={
                                student.theory
                              }
                              disabled={absent}
                              onChange={(e) =>
                                handleTheoryChange(
                                  index,
                                  e.target.value
                                )
                              }
                              className="marks-input theory-input"
                            />
                          </td>

                          {/* VIVA */}
                          <td>
                            <input
                              type="number"
                              value={
                                student.viva
                              }
                              readOnly
                              className="marks-input readonly-input"
                            />
                          </td>

                          {/* BEHAVIOUR */}
                          <td>
                            <input
                              type="number"
                              value={
                                student.behaviour
                              }
                              readOnly
                              className="marks-input readonly-input"
                            />
                          </td>

                          {/* TASK */}
                          <td>
                            <input
                              type="number"
                              value={
                                student.task
                              }
                              readOnly
                              className="marks-input readonly-input"
                            />
                          </td>

                          {/* ATTENDANCE */}
                          <td>
                            <span
                              className={
                                absent
                                  ? "attendance absent"
                                  : "attendance"
                              }
                            >
                              {student.attendance}
                            </span>
                          </td>

                          {/* OBTAINED */}
                          <td className="obtained">
                            {student.obtained}
                          </td>

                          {/* TOTAL */}
                          <td className="total-cell">
                            {globalTotal ||
                              "-"}
                          </td>

                          {/* ACTION */}
                          <td>

                            <button
                              onClick={() =>
                                saveMarks(
                                  student,
                                  index
                                )
                              }
                              disabled={
                                saving ||
                                absent
                              }
                              className={
                                student.isSaved &&
                                !saving
                                  ? "save-btn saved"
                                  : "save-btn"
                              }
                            >
                              {saving
                                ? "Saving..."
                                : student.isSaved
                                ? "Update ✓"
                                : "Save"}
                            </button>

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>
            </div>
          </div>
        )}

      {/* Empty State */}
      {!loading &&
        activeClasses.length > 0 &&
        !subject && (
          <div className="empty-box">
            <div>📚</div>
            <h3>Select a Subject</h3>
            <p>
              Select the subject to load the
              student marks sheet.
            </p>
          </div>
        )}

      {/* Message */}
      {message && (
        <div className="message-box">
          {message}
        </div>
      )}

      {/* COMPLETE CSS STYLES */}
      <style>{`
        * {
          box-sizing: border-box;
        }

        .marks-page {
          min-height: 100vh;
          padding: 28px;
          background: #f5f7fb;
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: #1f2937;
        }

        /* HEADER */
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .page-header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 750;
          color: #111827;
        }

        .page-header p {
          margin: 6px 0 0;
          color: #6b7280;
          font-size: 14px;
        }

        .session-badge {
          padding: 10px 16px;
          border-radius: 10px;
          background: #eef2ff;
          color: #4338ca;
          font-weight: 700;
          font-size: 13px;
        }

        /* FILTER CARD */
        .filter-card {
          background: #ffffff;
          padding: 24px;
          border-radius: 16px;
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
          margin-bottom: 24px;
          border: 1px solid #e5e7eb;
        }

        .section-title {
          font-size: 16px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .mode-box {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
          background: #f9fafb;
          padding: 12px 16px;
          border-radius: 10px;
          border: 1px solid #f3f4f6;
        }

        .radio-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          cursor: pointer;
        }

        .radio-label input {
          cursor: pointer;
          accent-color: #4f46e5;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field label {
          font-size: 12px;
          font-weight: 700;
          color: #4b5563;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .field select,
        .field input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          color: #111827;
          background: #ffffff;
          outline: none;
          transition: border-color 0.2s ease;
        }

        .field select:focus,
        .field input:focus {
          border-color: #6366f1;
        }

        /* STATS CARD */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: #ffffff;
          padding: 16px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 14px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 2px 10px -2px rgba(0, 0, 0, 0.03);
        }

        .stat-icon {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }

        .stat-icon.success {
          background: #ecfdf5;
          color: #059669;
        }

        .stat-icon.warning {
          background: #fffbebfb;
          color: #d97706;
        }

        .stat-card small {
          display: block;
          font-size: 12px;
          color: #6b7280;
          font-weight: 600;
        }

        .stat-card strong {
          font-size: 20px;
          color: #111827;
        }

        .success-text {
          color: #059669 !important;
        }

        .warning-text {
          color: #d97706 !important;
        }

        /* TABLE CARD */
        .table-card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
          overflow: hidden;
        }

        .table-header {
          padding: 20px 24px;
          border-bottom: 1px solid #f3f4f6;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .table-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
        }

        .table-header span {
          font-size: 13px;
          color: #6b7280;
        }

        .edit-info {
          font-size: 12px;
          font-weight: 700;
          background: #fef3c7;
          color: #b45309;
          padding: 6px 12px;
          border-radius: 20px;
        }

        .table-wrap {
          overflow-x: auto;
        }

        .marks-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .marks-table th {
          background: #f9fafb;
          padding: 14px 16px;
          font-size: 12px;
          font-weight: 700;
          color: #4b5563;
          text-transform: uppercase;
          border-bottom: 1px solid #e5e7eb;
        }

        .marks-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #f3f4f6;
          font-size: 14px;
        }

        .saved-row {
          background-color: #f0fdf4;
        }

        .index {
          color: #9ca3af;
          font-weight: 600;
        }

        .class-badge {
          background: #eef2ff;
          color: #4338ca;
          padding: 4px 8px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 12px;
        }

        .student-name {
          font-weight: 600;
          color: #111827;
        }

        .marks-input {
          width: 70px;
          padding: 6px 8px;
          border-radius: 6px;
          border: 1px solid #d1d5db;
          font-size: 14px;
          text-align: center;
        }

        .theory-input {
          border-color: #818cf8;
          font-weight: 700;
        }

        .readonly-input {
          background: #f3f4f6;
          border-color: #e5e7eb;
          color: #6b7280;
        }

        .attendance {
          font-weight: 700;
          color: #059669;
        }

        .attendance.absent {
          color: #dc2626;
        }

        .obtained {
          font-weight: 800;
          color: #111827;
        }

        .total-cell {
          color: #6b7280;
          font-weight: 600;
        }

        .save-btn {
          padding: 8px 16px;
          background: #4f46e5;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .save-btn:hover {
          background: #4338ca;
        }

        .save-btn.saved {
          background: #10b981;
        }

        .save-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        /* EMPTY & LOADING & MESSAGE */
        .loading-box,
        .empty-box {
          background: #ffffff;
          border-radius: 16px;
          padding: 48px;
          text-align: center;
          border: 1px solid #e5e7eb;
          color: #6b7280;
        }

        .empty-box div {
          font-size: 40px;
          margin-bottom: 12px;
        }

        .empty-box h3 {
          margin: 0;
          color: #111827;
        }

        .message-box {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: #111827;
          color: #ffffff;
          padding: 12px 20px;
          border-radius: 10px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
          font-size: 14px;
          z-index: 100;
        }
      `}</style>

    </div>
  );
};

export default AdminAddNewMarks;