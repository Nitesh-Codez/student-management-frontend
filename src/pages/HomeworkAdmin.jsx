import React, { useState } from "react";

const HomeworkAdmin = () => {
  const [homeworkList, setHomeworkList] = useState([]);
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");

  // Default students template
  const defaultStudents = [
    { name: "Student A", done: false },
    { name: "Student B", done: false },
    { name: "Student C", done: false },
  ];

  const addHomework = () => {
    if (!title || !date) return alert("Enter Title & Date");
    // Clone students array for each homework
    setHomeworkList([...homeworkList, { title, date, students: JSON.parse(JSON.stringify(defaultStudents)) }]);
    setTitle("");
    setDate("");
  };

  const toggleStudentStatus = (hwIndex, studentIndex) => {
    const newList = [...homeworkList];
    newList[hwIndex].students[studentIndex].done = !newList[hwIndex].students[studentIndex].done;
    setHomeworkList(newList);
  };

  return (
    <div style={{ padding: "30px" }}>
      <h2>Admin Homework Upload</h2>

      {/* Add Homework Form */}
      <div style={{ margin: "20px 0" }}>
        <input
          type="text"
          placeholder="Homework Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ marginRight: "10px", padding: "5px" }}
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ marginRight: "10px", padding: "5px" }}
        />
        <button
          onClick={addHomework}
          style={{ padding: "5px 10px", background: "#1ABC9C", color: "#fff", border: "none", borderRadius: "5px" }}
        >
          Add Homework
        </button>
      </div>

      {/* Homework List */}
      {homeworkList.map((hw, hwIndex) => (
        <div
          key={hwIndex}
          style={{ background: "#f5f5f5", padding: "15px", marginBottom: "15px", borderRadius: "10px" }}
        >
          <h3>{hw.title} - {hw.date}</h3>
          <ul>
            {hw.students.map((s, i) => (
              <li
                key={i}
                style={{ marginBottom: "5px", cursor: "pointer" }}
                onClick={() => toggleStudentStatus(hwIndex, i)}
              >
                {s.name} - <b style={{ color: s.done ? "green" : "red" }}>{s.done ? "Done" : "Not Done"}</b>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default HomeworkAdmin;