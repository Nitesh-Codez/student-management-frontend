import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const InternalMarksSheet = () => {

  // ==================================================
  // SUBJECTS
  // ==================================================

  const subjectsByClass = {
    "L.K.G.": ["English", "Hindi", "Maths", "EVS"],
    "U.K.G.": ["English", "Hindi", "Maths", "EVS"],

    "1st": ["English", "Hindi", "Maths", "EVS"],
    "2nd": ["English", "Hindi", "Maths", "EVS"],
    "3rd": ["English", "Hindi", "Maths", "EVS"],
    "4th": ["English", "Hindi", "Maths", "EVS"],

    "5th": [
      "Maths",
      "English",
      "Hindi",
      "EVS",
      "English Communication",
    ],

    "6th": [
      "Maths",
      "English",
      "Hindi",
      "Science",
      "English Communication",
    ],

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
    "L.K.G.",
    "U.K.G.",
    "1st",
    "2nd",
    "3rd",
    "4th",
    "5th",
    "6th",
    "7th",
    "8th",
    "9th",
    "10th",
    "11th",
    "12th",
  ];

  // ==================================================
  // STATES
  // ==================================================

  const [classes, setClasses] = useState([]);

  const [selectionMode, setSelectionMode] =
    useState("single");

  const [selectedClass, setSelectedClass] =
    useState("");

  const [fromClass, setFromClass] =
    useState("");

  const [toClass, setToClass] =
    useState("");

  const [examType, setExamType] =
    useState("PRE-FINAL");

  const [subject, setSubject] =
    useState("");

  const [availableSubjects, setAvailableSubjects] =
    useState([]);

  const [marksData, setMarksData] =
    useState([]);

  const [testDate, setTestDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [globalTotal, setGlobalTotal] =
    useState("");

  const [session, setSession] = useState(
    localStorage.getItem("session") || "2026-27"
  );

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [savingId, setSavingId] =
    useState(null);

  // ==================================================
  // DOCUMENT UPLOAD STATES
  // ==================================================

  const [documentType, setDocumentType] =
    useState("SYLLABUS");

  const [documentTitle, setDocumentTitle] =
    useState("");

  const [documentFile, setDocumentFile] =
    useState(null);

  const [uploadingDocument, setUploadingDocument] =
    useState(false);

  // ==================================================
  // FETCH CLASSES
  // ==================================================

  useEffect(() => {

    const fetchClasses = async () => {

      try {

        const res = await api.get(
          "/api/new-marks/classes"
        );

        if (res.data.success) {

          const rawClasses =
            res.data.classes
              .map((c) => {

                let className =
                  c.class || c;

                if (
                  className === 11 ||
                  className === "11"
                ) {
                  className = "11th";
                }

                if (
                  className === 12 ||
                  className === "12"
                ) {
                  className = "12th";
                }

                return String(className).trim();

              })
              .filter(
                (c) =>
                  c &&
                  c !== "N/A" &&
                  c !== "undefined" &&
                  c !== "null"
              );

          const uniqueSortedClasses =
            Array.from(
              new Set(rawClasses)
            ).sort(
              (a, b) =>
                classOrder.indexOf(a) -
                classOrder.indexOf(b)
            );

          setClasses(uniqueSortedClasses);
        }

      } catch (error) {

        console.error(
          "Error fetching classes:",
          error
        );

      }

    };

    fetchClasses();

  }, []);

  // ==================================================
  // SESSION
  // ==================================================

  useEffect(() => {

    const savedSession =
      localStorage.getItem("session");

    if (savedSession) {
      setSession(savedSession);
    }

  }, []);

  // ==================================================
  // ACTIVE CLASSES
  // ==================================================

  const activeClasses = useMemo(() => {

    if (selectionMode === "single") {

      return selectedClass
        ? [selectedClass]
        : [];

    }

    if (!fromClass || !toClass) {
      return [];
    }

    const fromIdx =
      classes.indexOf(fromClass);

    const toIdx =
      classes.indexOf(toClass);

    if (
      fromIdx === -1 ||
      toIdx === -1 ||
      fromIdx > toIdx
    ) {
      return [];
    }

    return classes.slice(
      fromIdx,
      toIdx + 1
    );

  }, [
    selectionMode,
    selectedClass,
    fromClass,
    toClass,
    classes,
  ]);

  // ==================================================
  // SUBJECTS
  // ==================================================

  useEffect(() => {

    if (activeClasses.length === 0) {

      setAvailableSubjects([]);
      setSubject("");

      return;
    }

    if (activeClasses.length === 1) {

      setAvailableSubjects(
        subjectsByClass[
          activeClasses[0]
        ] || []
      );

    } else {

      const allSubjects =
        new Set();

      activeClasses.forEach(
        (cls) => {

          (
            subjectsByClass[cls] || []
          ).forEach(
            (sub) =>
              allSubjects.add(sub)
          );

        }
      );

      setAvailableSubjects(
        [...allSubjects]
      );

    }

    setSubject("");

  }, [activeClasses.join(",")]);

  // ==================================================
  // FETCH STUDENTS + EXISTING MARKS
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
        // BANNED STUDENTS
        // ------------------------------------------

        let bannedIds =
          new Set();

        let bannedNames =
          new Set();

        try {

          const bannedRes =
            await api.get(
              "/api/auth/banned-students"
            );

          if (
            bannedRes.data.success
          ) {

            const bannedList =
              bannedRes.data.students ||
              [];

            bannedIds =
              new Set(
                bannedList.map(
                  (b) =>
                    String(
                      b.id ||
                      b.studentId
                    )
                )
              );

            bannedNames =
              new Set(
                bannedList.map(
                  (b) =>
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
        // FETCH STUDENTS
        // ------------------------------------------

        let allStudents = [];

        await Promise.all(

          activeClasses.map(
            async (cls) => {

              try {

                const apiClass =
                  cls === "11th"
                    ? "11"
                    : cls;

                const res =
                  await api.get(
                    `/api/new-marks/students/${apiClass}`
                  );

                if (
                  res.data.success
                ) {

                  const mapped =
                    res.data.students.map(
                      (student) => ({
                        ...student,
                        className: cls,
                      })
                    );

                  allStudents.push(
                    ...mapped
                  );

                }

              } catch (error) {

                console.error(
                  `Error fetching students for ${cls}:`,
                  error
                );

              }

            }
          )

        );

        // ------------------------------------------
        // REMOVE BANNED
        // ------------------------------------------

        allStudents =
          allStudents.filter(
            (student) => {

              const id =
                String(student.id);

              const name =
                (student.name || "")
                  .trim()
                  .toLowerCase();

              return (
                !bannedIds.has(id) &&
                !bannedNames.has(name)
              );

            }
          );

        // ------------------------------------------
        // SORT
        // ------------------------------------------

        allStudents.sort(
          (a, b) => {

            const classDiff =
              classOrder.indexOf(
                a.className
              ) -
              classOrder.indexOf(
                b.className
              );

            if (classDiff !== 0)
              return classDiff;

            return (
              a.name || ""
            ).localeCompare(
              b.name || ""
            );

          }
        );

        // ------------------------------------------
        // INITIAL LIST
        // ------------------------------------------

        let list =
          allStudents.map(
            (student) => ({

              recordId: null,

              studentId:
                student.id,

              name:
                student.name,

              className:
                student.className,

              task: "",

              viva: "",

              behaviour: "",

              attendance: 0,

              obtained: 0,

              isSaved: false,

              isExisting: false,

            })
          );

        // ------------------------------------------
        // ATTENDANCE + EXISTING MARKS
        // ------------------------------------------

        list =
          await Promise.all(

            list.map(
              async (student) => {

                try {

                  // Attendance

                  const attendanceRes =
                    await api.get(
                      "/api/new-marks/attendance/current-marks",
                      {
                        params: {
                          studentId:
                            student.studentId,
                        },
                      }
                    );

                  if (
                    attendanceRes.data
                      .success
                  ) {

                    student.attendance =
                      attendanceRes
                        .data
                        .attendanceMarks ||
                      0;

                  }

                  // Existing Marks

                  const marksRes =
                    await api.post(
                      "/api/new-marks/check",
                      {
                        studentId:
                          student.studentId,

                        studentName:
                          student.name,
                      }
                    );

                  if (
                    marksRes.data
                      .success &&
                    marksRes.data.data
                      ?.length
                  ) {

                    const match =
                      marksRes.data.data.find(
                        (mark) =>
                          mark.subject
                            ?.toUpperCase() ===
                            subject.toUpperCase() &&

                          mark.exam_type
                            ?.toUpperCase() ===
                            examType.toUpperCase() &&

                          mark.session ===
                            session &&

                          (
                            mark.test_date ==
                              null ||
                            mark.test_date
                              ?.toString()
                              .split("T")[0] ===
                              testDate
                          )
                      );

                    if (match) {

                      student.recordId =
                        match.id;

                      student.task =
                        match.task ?? "";

                      student.viva =
                        match.viva_marks ??
                        "";

                      student.behaviour =
                        match.behaviour ??
                        "";

                      student.isSaved =
                        true;

                      student.isExisting =
                        true;

                      if (
                        match.total_marks !=
                        null
                      ) {

                        setGlobalTotal(
                          (previous) =>
                            previous ||
                            match.total_marks
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

              }
            )

          );

        // ------------------------------------------
        // CALCULATE OBTAINED
        // ------------------------------------------

        list =
          list.map(
            (student) => {

              const attendance =
                Number(
                  student.attendance
                ) || 0;

              if (attendance < 1) {

                return {
                  ...student,

                  task: 0,

                  viva: 0,

                  behaviour: 0,

                  obtained: 0,
                };

              }

              const obtained =
                Number(
                  student.task || 0
                ) +

                Number(
                  student.viva || 0
                ) +

                Number(
                  student.behaviour || 0
                ) +

                attendance;

              return {
                ...student,
                obtained,
              };

            }
          );

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
  // HANDLE MARK CHANGE
  // ==================================================

  const handleChange = (
    i,
    field,
    value
  ) => {

    const updated =
      [...marksData];

    if (
      Number(
        updated[i].attendance
      ) < 1
    ) {

      updated[i].task = 0;

      updated[i].viva = 0;

      updated[i].behaviour = 0;

      updated[i].obtained = 0;

      setMarksData(updated);

      return;
    }

    updated[i][field] =
      value;

    updated[i].isSaved =
      false;

    const obtained =
      Number(
        updated[i].task || 0
      ) +

      Number(
        updated[i].viva || 0
      ) +

      Number(
        updated[i].behaviour || 0
      ) +

      Number(
        updated[i].attendance || 0
      );

    updated[i].obtained =
      obtained;

    setMarksData(updated);

  };

  // ==================================================
  // SAVE / UPDATE MARKS
  // ==================================================

  const saveMarks = async (
    student,
    index
  ) => {

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
      Number(
        student.attendance
      ) || 0;

    const payload = {

      studentId:
        student.studentId,

      subject,

      theoryMarks: 0,

      vivaMarks:
        attendance < 1
          ? 0
          : Number(
              student.viva || 0
            ),

      behaviour:
        attendance < 1
          ? 0
          : Number(
              student.behaviour || 0
            ),

      attendanceMarks:
        attendance,

      task:
        attendance < 1
          ? 0
          : Number(
              student.task || 0
            ),

      totalMarks:
        Number(globalTotal),

      examType,

      session,

      date: testDate,
    };

    try {

      setSavingId(
        student.studentId
      );

      setMessage("");

      let response;

      if (student.recordId) {

        response =
          await api.put(
            `/api/new-marks/update/${student.recordId}`,
            payload
          );

      } else {

        response =
          await api.post(
            "/api/new-marks/add",
            payload
          );

      }

      if (
        response.data.success
      ) {

        const updatedData =
          [...marksData];

        updatedData[index] = {

          ...updatedData[index],

          isSaved: true,

          isExisting: true,

          recordId:
            response.data.data
              ?.id ||
            updatedData[index]
              .recordId,

        };

        setMarksData(
          updatedData
        );

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
        error.response?.data
          ?.message ||
        "Server error while saving marks.";

      setMessage(
        `${student.name}: ${errorMessage}`
      );

    } finally {

      setSavingId(null);

    }

  };

  // ==================================================
  // UPLOAD EXAM DOCUMENT
  // ==================================================

  const uploadExamDocument =
    async () => {

      if (
        !examType ||
        !selectedClass ||
        !documentFile
      ) {

        alert(
          "Exam Type, Class and File are required."
        );

        return;
      }

      try {

        setUploadingDocument(
          true
        );

        const formData =
          new FormData();

        formData.append(
          "exam_type",
          examType
        );

        formData.append(
          "class_name",
          selectedClass
        );

        formData.append(
          "document_type",
          documentType
        );

        formData.append(
          "title",
          documentTitle ||
            (
              documentType ===
              "SYLLABUS"
                ? `${examType} Exam Syllabus`
                : `${examType} Exam Time Table`
            )
        );

        formData.append(
          "file",
          documentFile
        );

        formData.append(
          "session",
          session
        );

        const res =
          await api.post(
            "/api/exams-details/admin/upload",
            formData,
            {
              headers: {
                "Content-Type":
                  "multipart/form-data",
              },
            }
          );

        if (
          res.data.success
        ) {

          setMessage(
            documentType ===
            "SYLLABUS"
              ? "Exam Syllabus uploaded successfully ✅"
              : "Exam Time Table uploaded successfully ✅"
          );

          setDocumentFile(null);

          setDocumentTitle("");

          const fileInput =
            document.getElementById(
              "examDocumentFile"
            );

          if (fileInput) {
            fileInput.value =
              "";
          }

        } else {

          setMessage(
            res.data.message ||
              "Document upload failed."
          );

        }

      } catch (error) {

        console.error(
          "Document upload error:",
          error
        );

        setMessage(
          error.response?.data
            ?.message ||
            "Document upload failed."
        );

      } finally {

        setUploadingDocument(
          false
        );

      }

    };

  // ==================================================
  // UI
  // ==================================================

  return (

    <div className="page">

      <p
        style={{
          fontSize: "65px",
          textAlign: "center",
          margin: "0 0 10px",
          fontWeight: "700",
          color: "#1e293b",
        }}
      >
        Smart Students's Classes
      </p>

      <h2 className="title">
        📋 Internal Assessment Marks Sheet
      </h2>

      {/* ==================================================
          MODE SELECTOR
      ================================================== */}

      <div className="mode-selector">

        <label>

          <input
            type="radio"
            name="selectionMode"
            value="single"
            checked={
              selectionMode ===
              "single"
            }
            onChange={() => {

              setSelectionMode(
                "single"
              );

              setSelectedClass("");

            }}
          />

          {" "}Single Class

        </label>

        <label
          style={{
            marginLeft: "20px",
          }}
        >

          <input
            type="radio"
            name="selectionMode"
            value="range"
            checked={
              selectionMode ===
              "range"
            }
            onChange={() => {

              setSelectionMode(
                "range"
              );

              if (
                classes.length > 0
              ) {

                setFromClass(
                  classes[0]
                );

                setToClass(
                  classes[
                    classes.length - 1
                  ]
                );

              }

            }}
          />

          {" "}Class Range / All

        </label>

      </div>

      {/* ==================================================
          MARKS FILTERS
      ================================================== */}

      <div className="filters">

        <select
          value={examType}
          onChange={(e) =>
            setExamType(
              e.target.value
            )
          }
        >

          <option value="">
            Select Exam Type
          </option>

          <option value="PRE-FINAL">
            PRE-FINAL
          </option>

          <option value="FINAL">
            FINAL
          </option>

          <option value="REAPPEAR 1">
            REAPPEAR 1
          </option>

          <option value="REAPPEAR 2">
            REAPPEAR 2
          </option>

        </select>

        {selectionMode ===
        "single" ? (

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

            {classes.map(
              (c) => (

                <option
                  key={c}
                  value={c}
                >
                  {c}
                </option>

              )
            )}

          </select>

        ) : (

          <>

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

              {classes.map(
                (c) => (

                  <option
                    key={c}
                    value={c}
                  >
                    {c}
                  </option>

                )
              )}

            </select>

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

              {classes.map(
                (c) => (

                  <option
                    key={c}
                    value={c}
                  >
                    {c}
                  </option>

                )
              )}

            </select>

          </>

        )}

        <select
          value={subject}
          onChange={(e) =>
            setSubject(
              e.target.value
            )
          }
        >

          <option value="">
            Select Subject
          </option>

          {availableSubjects.map(
            (s) => (

              <option
                key={s}
                value={s}
              >
                {s}
              </option>

            )
          )}

        </select>

        <input
          type="number"
          placeholder="Total Marks"
          value={globalTotal}
          onChange={(e) =>
            setGlobalTotal(
              e.target.value
            )
          }
        />

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

      {/* ==================================================
          EXAM DOCUMENT UPLOAD
      ================================================== */}

      <div className="documentBox">

        <h3 className="documentHeading">
          📚 Exam Documents
        </h3>

        <div className="documentGrid">

          {/* DOCUMENT TYPE */}

          <select
            value={documentType}
            onChange={(e) =>
              setDocumentType(
                e.target.value
              )
            }
          >

            <option value="SYLLABUS">
              Upload Exam Syllabus
            </option>

            <option value="TIMETABLE">
              Upload Exam Time Table
            </option>

          </select>

          {/* EXAM TYPE */}

          <select
            value={examType}
            onChange={(e) =>
              setExamType(
                e.target.value
              )
            }
          >

            <option value="">
              Select Exam Type
            </option>

            <option value="PRE-FINAL">
              PRE-FINAL
            </option>

            <option value="FINAL">
              FINAL
            </option>

            <option value="REAPPEAR 1">
              REAPPEAR 1
            </option>

            <option value="REAPPEAR 2">
              REAPPEAR 2
            </option>

          </select>

          {/* CLASS */}

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

            {classes.map(
              (c) => (

                <option
                  key={c}
                  value={c}
                >
                  {c}
                </option>

              )
            )}

          </select>

          {/* TITLE */}

          <input
            type="text"
            placeholder={
              documentType ===
              "SYLLABUS"
                ? "Syllabus Title"
                : "Time Table Title"
            }
            value={documentTitle}
            onChange={(e) =>
              setDocumentTitle(
                e.target.value
              )
            }
          />

          {/* FILE */}

          <input
            id="examDocumentFile"
            type="file"
            accept=".pdf,image/*"
            onChange={(e) =>
              setDocumentFile(
                e.target.files[0]
              )
            }
          />

        </div>

        <button
          className="uploadBtn"
          onClick={
            uploadExamDocument
          }
          disabled={
            uploadingDocument
          }
        >

          {uploadingDocument
            ? "Uploading..."
            : documentType ===
              "SYLLABUS"
            ? "📚 Upload Exam Syllabus"
            : "📅 Upload Exam Time Table"}

        </button>

      </div>

      {/* ==================================================
          LOADING
      ================================================== */}

      {loading && (

        <div
          className="msg loadingBox"
        >
          Loading students and
          marks...
        </div>

      )}

      {/* ==================================================
          MARKS TABLE
      ================================================== */}

      {!loading &&
        marksData.length > 0 && (

          <div className="tableWrap">

            <table className="marksTable">

              <thead>

                <tr>

                  <th>#</th>

                  <th>Class</th>

                  <th>Name</th>

                  <th>Subject</th>

                  <th>Task</th>

                  <th>Viva</th>

                  <th>Behaviour</th>

                  <th>Attendance</th>

                  <th>Obtained</th>

                  <th>Total</th>

                  <th>Action</th>

                </tr>

              </thead>

              <tbody>

                {marksData.map(
                  (s, i) => {

                    const absent =
                      Number(
                        s.attendance
                      ) < 1;

                    const saving =
                      savingId ===
                      s.studentId;

                    return (

                      <tr
                        key={`${s.studentId}-${s.className}`}
                        style={{
                          backgroundColor:
                            s.isSaved
                              ? "#d4edda"
                              : "transparent",
                        }}
                      >

                        <td>
                          {i + 1}
                        </td>

                        <td
                          style={{
                            fontWeight:
                              "bold",
                            color:
                              "#e67e22",
                          }}
                        >
                          {s.className}
                        </td>

                        <td>
                          {s.name}
                        </td>

                        <td>
                          {subject ||
                            "-"}
                        </td>

                        <td>

                          <input
                            type="number"
                            value={
                              s.task
                            }
                            disabled={
                              absent
                            }
                            onChange={(e) =>
                              handleChange(
                                i,
                                "task",
                                e.target
                                  .value
                              )
                            }
                          />

                        </td>

                        <td>

                          <input
                            type="number"
                            value={
                              s.viva
                            }
                            disabled={
                              absent
                            }
                            onChange={(e) =>
                              handleChange(
                                i,
                                "viva",
                                e.target
                                  .value
                              )
                            }
                          />

                        </td>

                        <td>

                          <input
                            type="number"
                            value={
                              s.behaviour
                            }
                            disabled={
                              absent
                            }
                            onChange={(e) =>
                              handleChange(
                                i,
                                "behaviour",
                                e.target
                                  .value
                              )
                            }
                          />

                        </td>

                        <td>
                          {s.attendance}
                        </td>

                        <td className="obtained">
                          {s.obtained}
                        </td>

                        <td>
                          {globalTotal ||
                            "-"}
                        </td>

                        <td>

                          <button
                            onClick={() =>
                              saveMarks(
                                s,
                                i
                              )
                            }
                            disabled={
                              saving ||
                              absent
                            }
                            style={{
                              backgroundColor:
                                s.isSaved
                                  ? "#28a745"
                                  : "#2c7be5",
                            }}
                          >

                            {saving
                              ? "Saving..."
                              : s.isSaved
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

        )}

      {/* ==================================================
          MESSAGE
      ================================================== */}

      {message && (

        <p className="msg">
          {message}
        </p>

      )}

      {/* ==================================================
          CSS
      ================================================== */}

      <style>{`

        .page {
          padding: 20px;
          background: #f4f6f9;
          min-height: 100vh;
        }

        .title {
          text-align: center;
          margin-bottom: 20px;
          color: #2c3e50;
        }

        .mode-selector {
          background: #deedff;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          border: 1px solid #e1e1e1;
        }

        .mode-selector input {
          width: auto;
          margin-right: 6px;
          cursor: pointer;
        }

        .mode-selector label {
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
        }

        .filters {
          display: grid;
          grid-template-columns:
            repeat(
              auto-fit,
              minmax(150px, 1fr)
            );
          gap: 12px;
          margin-bottom: 20px;
        }

        select,
        input {
          padding: 10px;
          border-radius: 6px;
          border: 1px solid #ccc;
          width: 100%;
          background: #ffffff;
          box-sizing: border-box;
        }

        /* DOCUMENT UPLOAD */

        .documentBox {
          background: #ffffff;
          padding: 20px;
          border-radius: 10px;
          margin-bottom: 20px;
          border: 1px solid #e1e1e1;
          box-shadow:
            0 2px 8px
            rgba(0,0,0,0.04);
        }

        .documentHeading {
          margin: 0 0 15px 0;
          color: #2c3e50;
          font-size: 18px;
        }

        .documentGrid {
          display: grid;
          grid-template-columns:
            repeat(
              auto-fit,
              minmax(180px, 1fr)
            );
          gap: 12px;
          margin-bottom: 15px;
        }

        .uploadBtn {
          padding: 10px 20px;
          background: #6366f1;
          color: #ffffff;
          border: none;
          border-radius: 7px;
          cursor: pointer;
          font-weight: 600;
        }

        .uploadBtn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .tableWrap {
          overflow-x: auto;
          background: #fff;
          padding: 15px;
          border-radius: 10px;
        }

        .marksTable {
          width: 100%;
          border-collapse:
            collapse;
          min-width: 1000px;
        }

        th,
        td {
          border:
            1px solid #e1e1e1;
          padding: 10px;
          text-align: center;
        }

        th {
          background: #eef2f7;
        }

        .obtained {
          font-weight: bold;
          color: #2c7be5;
        }

        button {
          padding: 6px 14px;
          background: #2c7be5;
          color: #fff;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }

        button:disabled {
          background: #e1eef8;
          cursor: not-allowed;
        }

        .msg {
          margin-top: 15px;
          text-align: center;
          font-weight: bold;
          color: #2c3e50;
        }

        .loadingBox {
          background: #fff;
          padding: 20px;
          border-radius: 8px;
        }

        @media(max-width:768px) {

          .marksTable {
            min-width: 900px;
          }

          .page {
            padding: 10px;
          }

          .mode-selector {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }

        }

      `}</style>

    </div>

  );

};

export default InternalMarksSheet;