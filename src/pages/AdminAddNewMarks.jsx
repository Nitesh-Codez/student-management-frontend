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
  // Fetch Students + Existing Marks
  // ==================================================
  useEffect(() => {
    if (
      activeClasses.length === 0 ||
      !subject ||
      !examType ||
      !testDate
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
                  },
                }
              );

              if (attendanceRes.data.success) {
                student.attendance =
                  attendanceRes.data.attendanceMarks || 0;
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
                const match =
                  marksRes.data.data.find(
                    (mark) =>
                      mark.subject?.toUpperCase() ===
                        subject.toUpperCase() &&
                      mark.exam_type?.toUpperCase() ===
                        examType.toUpperCase() &&
                      mark.session === session &&
                      mark.test_date
                        ?.toString()
                        .split("T")[0] === testDate
                  );

                if (match) {
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
    testDate,
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

      // ============================================
      // Existing Record -> UPDATE
      // ============================================
      if (student.recordId) {
        response = await api.put(
          `/api/new-marks/update/${student.recordId}`,
          payload
        );
      }

      // ============================================
      // New Record -> ADD
      // ============================================
      else {
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

      {/* ==========================================
          Header
      ========================================== */}
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

      {/* ==========================================
          Filters Card
      ========================================== */}
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

      {/* ==========================================
          Stats
      ========================================== */}
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

      {/* ==========================================
          Loading
      ========================================== */}
      {loading && (
        <div className="loading-box">
          Loading students and marks...
        </div>
      )}

      {/* ==========================================
          Marks Table
      ========================================== */}
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

                          {/* THEORY EDITABLE */}
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

      {/* ==========================================
          Empty State
      ========================================== */}
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

      {/* ==========================================
          Message
      ========================================== */}
      {message && (
        <div className="message-box">
          {message}
        </div>
      )}

      {/* ==========================================
          Styles
      ========================================== */}
      <style>{`

        * {
          box-sizing: border-box;
        }

        .marks-page {
          min-height: 100vh;
          padding: 28px;
          background: #f5f7fb;
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
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

        /* FILTER */

        .filter-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 22px;
          box-shadow:
            0 4px 15px rgba(15, 23, 42, 0.04);
          margin-bottom: 20px;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 18px;
        }

        .mode-box {
          display: flex;
          gap: 24px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          padding: 12px 15px;
          border-radius: 10px;
          margin-bottom: 18px;
        }

        .radio-label {
          display: flex;
          align-items: center;
          gap: 7px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
        }

        .radio-label input {
          width: auto;
        }

        .filters-grid {
          display: grid;
          grid-template-columns:
            repeat(auto-fit, minmax(170px, 1fr));
          gap: 15px;
        }

        .field label {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: #4b5563;
          margin-bottom: 6px;
        }

        .field input,
        .field select {
          width: 100%;
          height: 42px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 0 11px;
          background: white;
          font-size: 14px;
          outline: none;
          transition: 0.2s;
        }

        .field input:focus,
        .field select:focus {
          border-color: #4f46e5;
          box-shadow:
            0 0 0 3px
            rgba(79, 70, 229, 0.1);
        }

        /* STATS */

        .stats-grid {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 20px;
        }

        .stat-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 13px;
          padding: 15px 18px;
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eef2ff;
          color: #4f46e5;
          font-weight: 800;
        }

        .stat-icon.success {
          background: #ecfdf5;
          color: #059669;
        }

        .stat-icon.warning {
          background: #fff7ed;
          color: #ea580c;
        }

        .stat-card small {
          display: block;
          color: #6b7280;
          font-size: 12px;
        }

        .stat-card strong {
          display: block;
          margin-top: 2px;
          font-size: 21px;
        }

        .success-text {
          color: #059669;
        }

        .warning-text {
          color: #ea580c;
        }

        /* TABLE */

        .table-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          overflow: hidden;
          box-shadow:
            0 4px 15px
            rgba(15, 23, 42, 0.04);
        }

        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 20px;
          border-bottom: 1px solid #e5e7eb;
        }

        .table-header h3 {
          margin: 0;
          font-size: 17px;
        }

        .table-header span {
          display: block;
          margin-top: 4px;
          color: #6b7280;
          font-size: 12px;
        }

        .edit-info {
          background: #eff6ff;
          color: #2563eb;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 700;
        }

        .table-wrap {
          overflow-x: auto;
        }

        .marks-table {
          width: 100%;
          min-width: 1100px;
          border-collapse: collapse;
        }

        .marks-table th {
          background: #111827;
          color: white;
          padding: 13px 10px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          white-space: nowrap;
        }

        .marks-table td {
          padding: 10px;
          text-align: center;
          border-bottom: 1px solid #edf0f3;
          font-size: 13px;
        }

        .marks-table tbody tr:hover {
          background: #f8fafc;
        }

        .marks-table .saved-row {
          background: #f0fdf4;
        }

        .index {
          color: #6b7280;
          font-weight: 600;
        }

        .class-badge {
          display: inline-block;
          padding: 4px 9px;
          border-radius: 6px;
          background: #fff7ed;
          color: #c2410c;
          font-weight: 700;
          font-size: 12px;
        }

        .student-name {
          text-align: left !important;
          font-weight: 650;
          color: #111827;
          min-width: 170px;
        }

        .marks-input {
          width: 65px;
          height: 34px;
          border-radius: 7px;
          text-align: center;
          font-weight: 650;
          outline: none;
        }

        .theory-input {
          border: 2px solid #3b82f6;
          background: #eff6ff;
          color: #1e3a8a;
        }

        .theory-input:focus {
          border-color: #1d4ed8;
          box-shadow:
            0 0 0 3px
            rgba(37, 99, 235, 0.12);
        }

        .readonly-input {
          border: 1px solid #e5e7eb;
          background: #f8fafc;
          color: #6b7280;
          cursor: not-allowed;
        }

        .attendance {
          display: inline-flex;
          min-width: 30px;
          justify-content: center;
          padding: 4px 7px;
          border-radius: 6px;
          background: #ecfdf5;
          color: #047857;
          font-weight: 700;
        }

        .attendance.absent {
          background: #fef2f2;
          color: #dc2626;
        }

        .obtained {
          font-weight: 800;
          color: #059669;
          font-size: 14px !important;
        }

        .total-cell {
          font-weight: 700;
          color: #374151;
        }

        .save-btn {
          min-width: 88px;
          height: 34px;
          border: none;
          border-radius: 7px;
          background: #4f46e5;
          color: white;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
        }

        .save-btn:hover {
          background: #4338ca;
        }

        .save-btn.saved {
          background: #059669;
        }

        .save-btn.saved:hover {
          background: #047857;
        }

        .save-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        /* LOADING */

        .loading-box {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 35px;
          text-align: center;
          color: #6b7280;
        }

        /* EMPTY */

        .empty-box {
          background: white;
          border: 1px dashed #d1d5db;
          border-radius: 16px;
          padding: 55px 20px;
          text-align: center;
        }

        .empty-box div {
          font-size: 38px;
        }

        .empty-box h3 {
          margin: 12px 0 5px;
        }

        .empty-box p {
          color: #6b7280;
          margin: 0;
          font-size: 14px;
        }

        /* MESSAGE */

        .message-box {
          position: fixed;
          right: 25px;
          bottom: 25px;
          max-width: 400px;
          background: #111827;
          color: white;
          padding: 13px 17px;
          border-radius: 10px;
          box-shadow:
            0 8px 25px
            rgba(0,0,0,0.18);
          font-size: 13px;
          font-weight: 600;
          z-index: 100;
        }

        /* RESPONSIVE */

        @media (max-width: 768px) {

          .marks-page {
            padding: 15px;
          }

          .page-header {
            align-items: flex-start;
            gap: 12px;
          }

          .page-header h1 {
            font-size: 22px;
          }

          .session-badge {
            font-size: 11px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .mode-box {
            flex-direction: column;
            gap: 10px;
          }

          .filter-card {
            padding: 15px;
          }

        }

      `}</style>
    </div>
  );
};

export default AdminAddNewMarks;