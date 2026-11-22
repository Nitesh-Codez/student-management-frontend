import React, { useEffect, useState, useCallback } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import api from "../services/api";

const DEFAULT_SUBJECTS = ["Math", "English", "Hindi", "SST", "Science", "Chemistry"];

export default function AdminPage() {
  const [file, setFile] = useState(null);
  const [uploadClass, setUploadClass] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [deadline, setDeadline] = useState("");

  const [viewClass, setViewClass] = useState("");
  const [classTasks, setClassTasks] = useState([]);
  const [taskSubmissions, setTaskSubmissions] = useState({});
  const [classes, setClasses] = useState([]);
  const [subjectsByClass, setSubjectsByClass] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingClassData, setIsLoadingClassData] = useState(false);

  // PDF Date Filter state
  const [filterDate, setFilterDate] = useState("");

  // Assignment Edit state
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editClass, setEditClass] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editFile, setEditFile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Profile photo states
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);

  useEffect(() => {
    api
      .get("/api/new-marks/classes")
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.classes)) {
          setClasses(res.data.classes);
          const map = {};
          res.data.classes.forEach((c) => {
            map[c.class] = DEFAULT_SUBJECTS;
          });
          setSubjectsByClass(map);
        }
      })
      .catch((err) => console.error("Error fetching classes:", err));

    api
      .get("/api/students")
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.students)) {
          setStudents(res.data.students);
        }
      })
      .catch((err) => console.error("Error fetching students:", err));
  }, []);

  const loadClassAssignmentsAndSubmissions = useCallback(async (targetClass) => {
    if (!targetClass) {
      setClassTasks([]);
      setTaskSubmissions({});
      setFilterDate("");
      return;
    }

    setIsLoadingClassData(true);
    try {
      const taskRes = await api.get(`/api/assignments/admin/tasks/${encodeURIComponent(targetClass)}`);
      const tasksList =
        taskRes.data?.success && Array.isArray(taskRes.data.tasks) ? taskRes.data.tasks : [];
      setClassTasks(tasksList);

      const subsMap = {};
      await Promise.all(
        tasksList.map(async (task) => {
          const title = task.task_title || task.title || "Untitled Task";
          try {
            const subRes = await api.get(
              `/api/assignments/admin/submissions/${encodeURIComponent(title)}?class=${encodeURIComponent(targetClass)}`
            );
            subsMap[title] =
              subRes.data?.success && Array.isArray(subRes.data.submissions)
                ? subRes.data.submissions
                : [];
          } catch {
            subsMap[title] = [];
          }
        })
      );
      setTaskSubmissions(subsMap);
    } catch (err) {
      console.error("Error loading class assignments:", err);
      setClassTasks([]);
      setTaskSubmissions({});
    } finally {
      setIsLoadingClassData(false);
    }
  }, []);

  useEffect(() => {
    loadClassAssignmentsAndSubmissions(viewClass);
  }, [viewClass, loadClassAssignmentsAndSubmissions]);

  const resolveAssignmentId = (taskObj) => {
    return taskObj?.id ?? taskObj?.assignment_id ?? taskObj?.task_id ?? null;
  };

  // ================= UPLOAD NEW ASSIGNMENT =================
  const handleSubmit = async () => {
    if (!file || !uploadClass || !taskTitle.trim() || !subject || !deadline) {
      return alert("All fields and reference file are required!");
    }

    setIsUploading(true);
    let storedUser = {};
    try {
      storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      storedUser = {};
    }

    const formData = new FormData();
    formData.append("file", file);
    if (storedUser?.id) formData.append("uploader_id", storedUser.id);
    formData.append("uploader_role", "admin");
    formData.append("task_title", taskTitle.trim());
    formData.append("subject", subject);
    formData.append("class", uploadClass);
    formData.append("deadline", new Date(deadline).toISOString());

    try {
      const res = await api.post("/api/assignments/admin/upload", formData);
      if (res.data?.success) {
        alert("Assignment Published Successfully!");
        const targetAfterUpload = viewClass || uploadClass;
        setFile(null);
        setTaskTitle("");
        setSubject("");
        setUploadClass("");
        setDeadline("");
        if (viewClass) {
          await loadClassAssignmentsAndSubmissions(viewClass);
        } else if (targetAfterUpload) {
          setViewClass(targetAfterUpload);
        }
      } else {
        alert(res.data?.message || "Upload Failed");
      }
    } catch (err) {
      console.error("Upload error:", err.response?.data || err);
      alert(err.response?.data?.message || "Server error while publishing assignment.");
    } finally {
      setIsUploading(false);
    }
  };

  // ================= EDIT ASSIGNMENT (PUT /api/assignments/admin/assignment/:id) =================
  const startEditingAssignment = (taskObj, taskTitleKey) => {
    const subs = taskSubmissions[taskTitleKey] || [];
    const assignmentId = resolveAssignmentId(taskObj);
    const rawDeadline = taskObj?.deadline || subs[0]?.deadline || "";
    const formattedLocal = rawDeadline ? new Date(rawDeadline).toISOString().slice(0, 16) : "";

    setEditingAssignment({
      id: assignmentId,
      originalTitle: taskTitleKey,
    });
    setEditTitle(taskObj?.task_title || taskTitleKey);
    setEditSubject(taskObj?.subject || subs[0]?.subject || "");
    setEditClass(taskObj?.class || viewClass);
    setEditDeadline(formattedLocal);
    setEditFile(null);
  };

  const handleEditSubmit = async () => {
    if (!editingAssignment) return;
    if (!editingAssignment.id) {
      return alert("Assignment ID missing. Check /api/assignments/admin/tasks response for id/assignment_id.");
    }
    if (!editTitle.trim() || !editSubject || !editClass || !editDeadline) {
      return alert("Title, subject, class, and deadline are required!");
    }

    setIsEditing(true);
    const formData = new FormData();
    formData.append("task_title", editTitle.trim());
    formData.append("subject", editSubject);
    formData.append("class", editClass);
    formData.append("deadline", new Date(editDeadline).toISOString());

    if (editFile) {
      formData.append("file", editFile);
    }

    try {
      const res = await api.put(
        `/api/assignments/admin/assignment/${editingAssignment.id}`,
        formData
      );
      if (res.data?.success !== false) {
        alert("Assignment updated successfully!");
        setEditingAssignment(null);
        setEditFile(null);
        await loadClassAssignmentsAndSubmissions(viewClass);
      } else {
        alert(res.data?.message || "Update failed");
      }
    } catch (err) {
      console.error("Edit assignment error:", err.response?.data || err);
      alert(err.response?.data?.message || "Server error during assignment update");
    } finally {
      setIsEditing(false);
    }
  };

  // ================= DELETE ASSIGNMENT (DELETE /api/assignments/:id) =================
  const handleDeleteAssignment = async (taskObj, taskTitleKey) => {
    const assignmentId = resolveAssignmentId(taskObj);

    if (!assignmentId) {
      return alert("Assignment ID not found for deletion.");
    }

    const confirmed = window.confirm(`Are you sure you want to delete "${taskTitleKey}"?`);
    if (!confirmed) return;

    setDeletingId(assignmentId);
    try {
      const res = await api.delete(`/api/assignments/${assignmentId}`);
      if (res.data?.success !== false) {
        alert("Assignment deleted successfully!");
        if (editingAssignment?.id === assignmentId) {
          setEditingAssignment(null);
        }
        await loadClassAssignmentsAndSubmissions(viewClass);
      } else {
        alert(res.data?.message || "Delete failed");
      }
    } catch (err) {
      console.error("Delete assignment error:", err.response?.data || err);
      alert(err.response?.data?.message || "Failed to delete assignment.");
    } finally {
      setDeletingId(null);
    }
  };

  // ================= DELETE SINGLE SUBMISSION =================
  const handleDeleteSubmission = async (submissionId) => {
    if (!window.confirm("Are you sure you want to remove this submission record?")) return;
    try {
      const res = await api.delete(`/api/assignments/${submissionId}`);
      if (res.data?.success !== false) {
        alert("Submission record removed successfully");
        await loadClassAssignmentsAndSubmissions(viewClass);
      } else {
        alert(res.data?.message || "Operation failed");
      }
    } catch (err) {
      console.error("Delete submission error:", err);
      alert("Operation failed");
    }
  };

  // ================= HANDLE RATING =================
  const handleRating = async (submissionId, value) => {
    try {
      const res = await api.put(`/api/assignments/rating/${submissionId}`, { rating: value });
      if (res.data?.success) {
        setTaskSubmissions((prev) => {
          const next = { ...prev };
          for (const taskKey of Object.keys(next)) {
            next[taskKey] = next[taskKey].map((s) =>
              s.id === submissionId ? { ...s, rating: value, grading_status: "GRADED" } : s
            );
          }
          return next;
        });
      }
    } catch (err) {
      console.error("Rating error:", err);
    }
  };

  // ================= HANDLE PROFILE PHOTO =================
  const handlePhotoUpload = async () => {
    if (!selectedStudent || !photoFile) return alert("Select a student and photo file!");
    setIsPhotoUploading(true);
    const formData = new FormData();
    formData.append("photo", photoFile);

    try {
      const res = await api.post(`/api/students/${selectedStudent}/profile-photo`, formData);
      if (res.data?.success) {
        alert("Profile photograph updated!");
        const studentIdNum = parseInt(selectedStudent, 10);
        setStudents((prev) =>
          prev.map((s) =>
            s.id === studentIdNum ? { ...s, profile_photo: res.data.profile_photo } : s
          )
        );
        setPhotoFile(null);
      } else {
        alert("Upload failed");
      }
    } catch {
      alert("Server error");
    } finally {
      setIsPhotoUploading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "N/A";
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const sanitizeText = (text) => {
    if (!text) return "";
    return String(text)
      .replace(/[^\x00-\x7F]/g, "")
      .replace(/[^\w\s.,()-]/gi, "")
      .trim();
  };

  const mergedTasks = (() => {
    const map = new Map();
    classTasks.forEach((t) => {
      const title = t.task_title || t.title || "Untitled Task";
      map.set(title, {
        taskObj: t,
        title,
        subs: taskSubmissions[title] || [],
      });
    });
    Object.entries(taskSubmissions).forEach(([title, subs]) => {
      if (!map.has(title)) {
        map.set(title, {
          taskObj: subs[0] || { task_title: title },
          title,
          subs,
        });
      }
    });
    return Array.from(map.values());
  })();

  // ================= EXPORT PDF REPORT =================
  const exportAllPDF = () => {
    const doc = new jsPDF();
    const primaryColor = [42, 33, 136];

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    doc.text(`Academic Submission Report - Class ${viewClass}`, 14, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Filter Criteria: ${
        filterDate
          ? `From ${new Date(filterDate).toLocaleString("en-IN")} onwards`
          : "All Assigned Tasks"
      }`,
      14,
      27
    );
    doc.text(`Generated On: ${new Date().toLocaleString("en-IN")}`, 14, 33);

    let startY = 42;

    const filteredEntries = mergedTasks.filter(({ subs }) => {
      if (!filterDate) return true;
      const filterTime = new Date(filterDate).getTime();
      const hasMatchingSub = subs.some((s) => new Date(s.uploaded_at).getTime() >= filterTime);
      const hasMatchingDeadline = subs.some(
        (s) => s.deadline && new Date(s.deadline).getTime() >= filterTime
      );
      return hasMatchingSub || hasMatchingDeadline || subs.length === 0;
    });

    if (filteredEntries.length === 0) {
      alert("No assignments match the selected date filter.");
      return;
    }

    filteredEntries.forEach(({ title: task, subs }, index) => {
      const validSubs = subs.filter((s) => {
        if (!filterDate) return true;
        const filterTime = new Date(filterDate).getTime();
        return (
          new Date(s.uploaded_at).getTime() >= filterTime ||
          (s.deadline && new Date(s.deadline).getTime() >= filterTime)
        );
      });

      const cleanTaskTitle = sanitizeText(task) || task;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text(`Assignment: ${cleanTaskTitle}`, 14, startY);

      const tableColumn = [
        "Student Name",
        "Submission Timestamp",
        "Deadline",
        "Status",
        "Evaluation Rating",
      ];
      const tableRows = [];

      if (validSubs.length === 0) {
        tableRows.push(["No Submissions in this timeframe", "-", "-", "Pending", "-"]);
      } else {
        validSubs.forEach((s) => {
          const isLate = s.deadline && new Date(s.uploaded_at) > new Date(s.deadline);
          const status = isLate ? "Late Submission" : "On Time";
          const rating = s.rating ? `${s.rating} / 5 Stars` : "Pending Evaluation";

          tableRows.push([
            sanitizeText(s.student_name) || s.student_name,
            formatDate(s.uploaded_at),
            formatDate(s.deadline),
            status,
            rating,
          ]);
        });
      }

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: startY + 4,
        theme: "grid",
        headStyles: {
          fillColor: primaryColor,
          fontStyle: "bold",
          textColor: [255, 255, 255],
        },
        alternateRowStyles: { fillColor: [243, 244, 246] },
        styles: { fontSize: 9, cellPadding: 5, textColor: [30, 41, 59] },
      });

      startY = doc.lastAutoTable.finalY + 12;

      if (startY > 270 && index < filteredEntries.length - 1) {
        doc.addPage();
        startY = 20;
      }
    });

    doc.save(`Class_${viewClass}_Assignments_Report.pdf`);
  };

  return (
    <div style={ui.pageWrapper}>
      <style>{`
        @media (max-width: 960px) {
          .admin-main-grid {
            grid-template-columns: 1fr !important;
            padding: 14px !important;
            gap: 16px !important;
          }
          .admin-header {
            padding: 16px !important;
          }
          .admin-header-inner {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 10px !important;
          }
          .admin-flex-between {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
          }
          .admin-report-toolbar {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .admin-task-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 8px !important;
          }
          .admin-edit-row {
            flex-direction: column !important;
          }
        }
      `}</style>

      {/* Top Academic Header */}
      <div style={ui.header} className="admin-header">
        <div style={ui.headerInner} className="admin-header-inner">
          <div>
            <h1 style={ui.title}>
              Academic <span style={{ fontWeight: "300", color: "#4338CA" }}>Portal</span>
            </h1>
            <p style={ui.subtitle}>
              Faculty Assignment Management &amp; Student Evaluation Workspace
            </p>
          </div>
          <div style={ui.badge}>Faculty Access</div>
        </div>
      </div>

      <div style={ui.mainGrid} className="admin-main-grid">
        {/* Left Column: Management Panels */}
        <div style={ui.leftColumn}>
          {/* Publish Assignment Card */}
          <div style={ui.card}>
            <div style={ui.cardHeader}>
              <h2 style={ui.cardTitle}>Publish Assignment</h2>
            </div>
            <div style={ui.formGroup}>
              <div>
                <label style={ui.label}>Assignment Title</label>
                <input
                  style={ui.input}
                  placeholder="e.g. Weekly Problem Set 3"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={ui.label}>Class</label>
                  <select
                    style={ui.input}
                    value={uploadClass}
                    onChange={(e) => {
                      setUploadClass(e.target.value);
                      setSubject("");
                    }}
                  >
                    <option value="">Select Class</option>
                    {classes.map((c) => (
                      <option key={c.class} value={c.class}>
                        {c.class}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={ui.label}>Subject</label>
                  <select
                    style={ui.input}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={!uploadClass}
                  >
                    <option value="">Select Subject</option>
                    {(subjectsByClass[uploadClass] || DEFAULT_SUBJECTS).map((s, i) => (
                      <option key={i} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={ui.label}>Submission Deadline</label>
                <input
                  type="datetime-local"
                  style={ui.input}
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>

              <div>
                <label style={ui.label}>Reference Material / Document</label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  style={ui.fileInput}
                />
              </div>

              <button type="button" onClick={handleSubmit} style={ui.btnPrimary} disabled={isUploading}>
                {isUploading ? "Publishing..." : "Publish Assignment"}
              </button>
            </div>
          </div>

          {/* Student Profile Photograph Card */}
          <div style={ui.card}>
            <div style={ui.cardHeader}>
              <h2 style={ui.cardTitle}>Student Profile Photograph</h2>
            </div>
            <div style={ui.formGroup}>
              <div>
                <label style={ui.label}>Select Student</label>
                <select
                  style={ui.input}
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                >
                  <option value="">Select Student</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.class})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={ui.label}>Photograph File</label>
                <input
                  type="file"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  style={ui.fileInput}
                />
              </div>

              <button
                type="button"
                onClick={handlePhotoUpload}
                style={ui.btnSecondary}
                disabled={isPhotoUploading}
              >
                {isPhotoUploading ? "Updating..." : "Update Photograph"}
              </button>

              {selectedStudent && (
                <div style={{ marginTop: 12, textAlign: "center" }}>
                  {students.find((s) => s.id === parseInt(selectedStudent, 10))?.profile_photo ? (
                    <img
                      src={
                        students.find((s) => s.id === parseInt(selectedStudent, 10)).profile_photo
                      }
                      alt="Student Profile"
                      style={{
                        width: 76,
                        height: 76,
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "2px solid #4338CA",
                        margin: "0 auto",
                      }}
                    />
                  ) : (
                    <p style={{ color: "#94A3B8", fontSize: 13, fontStyle: "italic" }}>
                      No photograph on file
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Class Submissions, Edit/Delete & Reports */}
        <div style={ui.rightColumn}>
          <div style={ui.card}>
            <div style={ui.flexBetween} className="admin-flex-between">
              <div>
                <h2 style={ui.cardTitle}>Class Assignment &amp; Evaluation Manager</h2>
                <p style={{ fontSize: 12, color: "#64748B", margin: "2px 0 0 0" }}>
                  Edit or delete assignments, grade submissions, and export PDF reports.
                </p>
              </div>
              <select
                style={ui.miniSelect}
                value={viewClass}
                onChange={(e) => setViewClass(e.target.value)}
              >
                <option value="">-- Select Class Section --</option>
                {classes.map((c) => (
                  <option key={c.class} value={c.class}>
                    {c.class}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtered PDF Report Toolbar */}
            {viewClass && (
              <div style={ui.reportToolbar} className="admin-report-toolbar">
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#475569",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Filter Date:
                  </label>
                  <input
                    type="datetime-local"
                    style={{ ...ui.input, padding: "6px 10px", fontSize: 13 }}
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                  />
                  {filterDate && (
                    <button
                      type="button"
                      onClick={() => setFilterDate("")}
                      style={ui.btnClearFilter}
                      title="Reset Filter"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <button type="button" onClick={exportAllPDF} style={ui.btnExportReport}>
                  Download Filtered PDF
                </button>
              </div>
            )}

            {/* Edit Assignment Panel */}
            {editingAssignment && (
              <div style={ui.editBox}>
                <h4
                  style={{
                    margin: "0 0 12px 0",
                    color: "#312E81",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  Edit Assignment: {editingAssignment.originalTitle}
                </h4>
                <div style={{ display: "flex", gap: 12, marginBottom: 10 }} className="admin-edit-row">
                  <div style={{ flex: 1 }}>
                    <label style={ui.label}>Assignment Title</label>
                    <input
                      type="text"
                      style={ui.input}
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={ui.label}>Class</label>
                    <select
                      style={ui.input}
                      value={editClass}
                      onChange={(e) => setEditClass(e.target.value)}
                    >
                      <option value="">Select Class</option>
                      {classes.map((c) => (
                        <option key={c.class} value={c.class}>
                          {c.class}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={ui.label}>Subject</label>
                    <select
                      style={ui.input}
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                    >
                      <option value="">Select Subject</option>
                      {(subjectsByClass[editClass] || subjectsByClass[viewClass] || DEFAULT_SUBJECTS).map(
                        (s, i) => (
                          <option key={i} value={s}>
                            {s}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, marginBottom: 12 }} className="admin-edit-row">
                  <div style={{ flex: 1 }}>
                    <label style={ui.label}>Deadline</label>
                    <input
                      type="datetime-local"
                      style={ui.input}
                      value={editDeadline}
                      onChange={(e) => setEditDeadline(e.target.value)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={ui.label}>New PDF / File (Optional)</label>
                    <input
                      type="file"
                      onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                      style={ui.fileInput}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={handleEditSubmit}
                    style={ui.btnPrimary}
                    disabled={isEditing}
                  >
                    {isEditing ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAssignment(null);
                      setEditFile(null);
                    }}
                    style={ui.btnDangerOutline}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div style={ui.scrollArea}>
              {!viewClass ? (
                <div style={ui.emptyState}>
                  <div style={{ fontWeight: 700, color: "#334155", fontSize: 15 }}>
                    No Class Section Selected
                  </div>
                  <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
                    Please choose a class from the dropdown above to view, edit, or delete
                    assignments.
                  </div>
                </div>
              ) : isLoadingClassData ? (
                <div style={ui.emptyState}>Loading assignments and submissions...</div>
              ) : mergedTasks.length === 0 ? (
                <div style={ui.emptyState}>No assignments published yet for {viewClass}.</div>
              ) : (
                mergedTasks.map(({ taskObj, title: task, subs }) => {
                  const assignmentId = resolveAssignmentId(taskObj);

                  return (
                    <div key={task} style={ui.taskGroup}>
                      <div style={ui.taskHeaderRow} className="admin-task-header">
                        <div>
                          <span style={ui.taskTitleText}>{task}</span>
                          {taskObj?.subject && (
                            <span style={ui.subMetaBadge}>{taskObj.subject}</span>
                          )}
                          {taskObj?.deadline && (
                            <span style={ui.deadlineText}>
                              Due: {formatDate(taskObj.deadline)}
                            </span>
                          )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          {taskObj?.file_path && (
                            <a
                              href={taskObj.file_path}
                              target="_blank"
                              rel="noreferrer"
                              style={ui.viewLink}
                            >
                              Assignment File
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => startEditingAssignment(taskObj, task)}
                            style={ui.btnActionSub}
                          >
                            Edit Assignment
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAssignment(taskObj, task)}
                            disabled={deletingId === assignmentId}
                            style={ui.btnDeleteAssignment}
                          >
                            {deletingId === assignmentId ? "Deleting..." : "Delete Assignment"}
                          </button>
                        </div>
                      </div>

                      {subs.length === 0 ? (
                        <p style={ui.noData}>
                          No student submissions received for this assignment yet.
                        </p>
                      ) : (
                        <div style={{ overflowX: "auto" }}>
                          <table style={ui.table}>
                            <thead>
                              <tr>
                                <th style={ui.th}>Student Name</th>
                                <th style={ui.th}>Submitted At</th>
                                <th style={ui.th}>Deadline</th>
                                <th style={ui.th}>Status</th>
                                <th style={ui.th}>Rating</th>
                                <th style={ui.th}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {subs.map((s) => {
                                const isLate =
                                  s.deadline && new Date(s.uploaded_at) > new Date(s.deadline);
                                return (
                                  <tr key={s.id} style={ui.tr}>
                                    <td style={{ ...ui.td, fontWeight: "600", color: "#1E293B" }}>
                                      {s.student_name}
                                    </td>
                                    <td style={ui.td}>{formatDate(s.uploaded_at)}</td>
                                    <td style={ui.td}>{formatDate(s.deadline)}</td>
                                    <td style={ui.td}>
                                      <span style={isLate ? ui.tagLate : ui.tagOnTime}>
                                        {isLate ? "Late" : "On Time"}
                                      </span>
                                    </td>
                                    <td style={ui.td}>
                                      <div style={{ display: "flex", gap: 2 }}>
                                        {[1, 2, 3, 4, 5].map((i) => (
                                          <span
                                            key={i}
                                            onClick={() => handleRating(s.id, i)}
                                            style={{
                                              cursor: "pointer",
                                              color: s.rating >= i ? "#F59E0B" : "#CBD5E1",
                                              fontSize: 18,
                                              transition: "color 0.2s",
                                            }}
                                            title={`Rate ${i} Stars`}
                                          >
                                            ★
                                          </span>
                                        ))}
                                      </div>
                                    </td>
                                    <td style={ui.td}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <a
                                          href={s.file_path}
                                          target="_blank"
                                          rel="noreferrer"
                                          style={ui.viewLink}
                                        >
                                          View File
                                        </a>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteSubmission(s.id)}
                                          style={ui.btnDelete}
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== PROFESSIONAL LIGHT UI STYLES ====================
const ui = {
  pageWrapper: {
    background: "#F8FAFC",
    minHeight: "100vh",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    color: "#334155",
  },
  header: {
    background: "#FFFFFF",
    padding: "22px 40px",
    borderBottom: "1px solid #E2E8F0",
    boxShadow: "0 1px 3px 0 rgba(0,0,0,0.04)",
  },
  headerInner: {
    maxWidth: 1400,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: "#0F172A",
    fontSize: "24px",
    margin: 0,
    fontWeight: "800",
    letterSpacing: "-0.5px",
  },
  subtitle: { color: "#64748B", fontSize: "13px", margin: "3px 0 0 0" },
  badge: {
    background: "#EEF2FF",
    color: "#2e2592",
    padding: "6px 14px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "600",
    border: "1px solid #C7D2FE",
  },

  mainGrid: {
    display: "grid",
    gridTemplateColumns: "390px 1fr",
    gap: 24,
    padding: 28,
    maxWidth: 1440,
    margin: "0 auto",
  },
  leftColumn: { display: "flex", flexDirection: "column", gap: 24 },
  rightColumn: { display: "flex", flexDirection: "column", gap: 24 },

  card: {
    background: "#FFFFFF",
    borderRadius: 14,
    padding: 22,
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
    border: "1px solid #E2E8F0",
  },
  cardHeader: { borderBottom: "1px solid #F1F5F9", marginBottom: 18, paddingBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#1E293B", margin: 0 },

  formGroup: { display: "flex", flexDirection: "column", gap: 14 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
    marginBottom: 5,
    display: "block",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #CBD5E1",
    outline: "none",
    fontSize: 14,
    background: "#F8FAFC",
    color: "#1E293B",
  },
  fileInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "8px",
    borderRadius: 8,
    border: "1px dashed #CBD5E1",
    background: "#F8FAFC",
    fontSize: 13,
    cursor: "pointer",
  },

  btnPrimary: {
    background: "#3226b6",
    color: "#FFF",
    border: "none",
    padding: "10px 16px",
    borderRadius: 8,
    fontWeight: "600",
    cursor: "pointer",
    fontSize: 13.5,
  },
  btnSecondary: {
    background: "#241ea4",
    color: "#FFF",
    border: "none",
    padding: "10px 16px",
    borderRadius: 8,
    fontWeight: "600",
    cursor: "pointer",
    fontSize: 13.5,
  },
  btnExportReport: {
    background: "#059669",
    color: "#FFF",
    border: "none",
    padding: "8px 14px",
    borderRadius: 8,
    fontWeight: "600",
    cursor: "pointer",
    fontSize: 13,
    whiteSpace: "nowrap",
  },
  btnClearFilter: {
    background: "#F1F5F9",
    border: "1px solid #CBD5E1",
    color: "#475569",
    fontSize: 11,
    padding: "5px 9px",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 600,
  },
  btnActionSub: {
    padding: "5px 11px",
    fontSize: 12,
    borderRadius: 6,
    border: "1px solid #C7D2FE",
    background: "#EEF2FF",
    color: "#312E81",
    fontWeight: "600",
    cursor: "pointer",
  },
  btnDeleteAssignment: {
    padding: "5px 11px",
    fontSize: 12,
    borderRadius: 6,
    border: "1px solid #FECACA",
    background: "#FEF2F2",
    color: "#DC2626",
    fontWeight: "600",
    cursor: "pointer",
  },
  btnDelete: {
    padding: "4px 8px",
    fontSize: 12,
    background: "#FEF2F2",
    color: "#DC2626",
    border: "none",
    borderRadius: 6,
    fontWeight: "600",
    cursor: "pointer",
  },
  btnDangerOutline: {
    background: "#FFFFFF",
    color: "#DC2626",
    border: "1px solid #FCA5A5",
    padding: "10px 14px",
    borderRadius: 8,
    fontWeight: "600",
    cursor: "pointer",
    fontSize: 13.5,
  },

  flexBetween: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  reportToolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#F8FAFC",
    padding: "10px 14px",
    borderRadius: 10,
    marginBottom: 18,
    border: "1px solid #E2E8F0",
    gap: 12,
  },
  editBox: {
    marginBottom: 18,
    padding: 16,
    border: "1px solid #C7D2FE",
    borderRadius: 10,
    background: "#EEF2FF",
  },
  scrollArea: { maxHeight: 620, overflowY: "auto", paddingRight: 4 },
  emptyState: {
    padding: 40,
    textAlign: "center",
    color: "#94A3B8",
    background: "#F8FAFC",
    borderRadius: 10,
    border: "2px dashed #E2E8F0",
  },

  taskGroup: {
    marginBottom: 20,
    border: "1px solid #E2E8F0",
    borderRadius: 10,
    padding: 14,
    background: "#FFFFFF",
  },
  taskHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 8,
    borderBottom: "1px solid #F1F5F9",
    gap: 10,
  },
  taskTitleText: { fontWeight: "700", fontSize: 14.5, color: "#0F172A", marginRight: 8 },
  subMetaBadge: {
    background: "#F1F5F9",
    color: "#475569",
    fontSize: 11,
    fontWeight: "600",
    padding: "2px 8px",
    borderRadius: 999,
    marginRight: 8,
  },
  deadlineText: { fontSize: 12, color: "#64748B", fontWeight: "500" },

  table: { width: "100%", borderCollapse: "collapse", fontSize: 13, background: "#FFF" },
  th: {
    textAlign: "left",
    padding: "9px 10px",
    background: "#F8FAFC",
    borderBottom: "1px solid #E2E8F0",
    color: "#475569",
    fontWeight: "600",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "9px 10px",
    borderBottom: "1px solid #F1F5F9",
    color: "#334155",
    verticalAlign: "middle",
  },
  tr: { transition: "background 0.2s" },

  tagLate: {
    background: "#FEF2F2",
    color: "#DC2626",
    padding: "3px 7px",
    borderRadius: 5,
    fontSize: 11,
    fontWeight: "600",
    border: "1px solid #FECACA",
    whiteSpace: "nowrap",
  },
  tagOnTime: {
    background: "#F0FDF4",
    color: "#16A34A",
    padding: "3px 7px",
    borderRadius: 5,
    fontSize: 11,
    fontWeight: "600",
    border: "1px solid #BBF7D0",
    whiteSpace: "nowrap",
  },

  miniSelect: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #CBD5E1",
    fontSize: 13,
    background: "#FFFFFF",
    fontWeight: "600",
    color: "#1E293B",
    outline: "none",
  },
  viewLink: {
    color: "#292090",
    textDecoration: "none",
    fontSize: 12.5,
    fontWeight: "600",
    whiteSpace: "nowrap",
  },
  noData: { color: "#94A3B8", fontStyle: "italic", fontSize: 13, margin: "8px 0" },
};