import React, { useState, useEffect } from "react";
import axios from "axios";

// Fixed API URL
const API_URL = "https://student-management-system-4-hose.onrender.com";

const AssignClasses = () => {
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([
    { class_id: "", subject_id: "", day_of_week: "", start_time: "", end_time: "" }
  ]);
  const [selectedTeacher, setSelectedTeacher] = useState("");

  // Fetch teachers, classes, subjects
  useEffect(() => {
    const fetchData = async () => {
      try {
        // ✅ Fetch full teacher data for dropdown
        const [teachersRes, classesRes, subjectsRes] = await Promise.all([
          axios.get(`${API_URL}/teachers/all`), // full teacher data
          axios.get(`${API_URL}/admin/classes`),
          axios.get(`${API_URL}/admin/subjects`)
        ]);

        setTeachers(teachersRes.data);
        setClasses(classesRes.data);
        setSubjects(subjectsRes.data);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };

    fetchData();
  }, []);

  // Add new assignment row
  const addRow = () => {
    setAssignments([
      ...assignments,
      { class_id: "", subject_id: "", day_of_week: "", start_time: "", end_time: "" }
    ]);
  };

  // Remove assignment row
  const removeRow = (index) => {
    const newArr = [...assignments];
    newArr.splice(index, 1);
    setAssignments(newArr);
  };

  // Handle input change for assignments
  const handleChange = (index, field, value) => {
    const newArr = [...assignments];
    newArr[index][field] = value;
    setAssignments(newArr);
  };

  // Submit all assignments
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTeacher) return alert("Select a teacher");

    try {
      for (let a of assignments) {
        await axios.post(`${API_URL}/admin/teacher-assignments/assign`, {
          teacher_id: selectedTeacher,
          class_id: a.class_id,
          subject_id: a.subject_id,
          day_of_week: a.day_of_week,
          start_time: a.start_time,
          end_time: a.end_time
        });
      }
      alert("Classes assigned successfully ✅");
      setAssignments([{ class_id: "", subject_id: "", day_of_week: "", start_time: "", end_time: "" }]);
    } catch (err) {
      console.error(err);
      alert("Error assigning classes");
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Assign Classes to Teacher</h2>

      {/* Teacher Dropdown */}
      <div className="mb-4">
        <label className="block mb-1">Select Teacher:</label>
        <select
          value={selectedTeacher}
          onChange={(e) => setSelectedTeacher(e.target.value)}
          className="border p-2 w-full"
        >
          <option value="">--Select Teacher--</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} {t.teacher_code ? `(${t.teacher_code})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Assignment Table/Form */}
      <form onSubmit={handleSubmit}>
        {assignments.map((a, index) => (
          <div key={index} className="grid grid-cols-6 gap-2 mb-2">
            <select
              value={a.class_id}
              onChange={(e) => handleChange(index, "class_id", e.target.value)}
              className="border p-2"
            >
              <option value="">Class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={a.subject_id}
              onChange={(e) => handleChange(index, "subject_id", e.target.value)}
              className="border p-2"
            >
              <option value="">Subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <select
              value={a.day_of_week}
              onChange={(e) => handleChange(index, "day_of_week", e.target.value)}
              className="border p-2"
            >
              <option value="">Day</option>
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>

            <input
              type="time"
              value={a.start_time}
              onChange={(e) => handleChange(index, "start_time", e.target.value)}
              className="border p-2"
            />

            <input
              type="time"
              value={a.end_time}
              onChange={(e) => handleChange(index, "end_time", e.target.value)}
              className="border p-2"
            />

            <button type="button" onClick={() => removeRow(index)} className="bg-red-500 text-white p-2">X</button>
          </div>
        ))}

        {/* Buttons */}
        <div className="mb-4">
          <button type="button" onClick={addRow} className="bg-blue-500 text-white p-2 mr-2">Add Row</button>
          <button type="submit" className="bg-green-500 text-white p-2">Assign All</button>
        </div>
      </form>
    </div>
  );
};

export default AssignClasses;
