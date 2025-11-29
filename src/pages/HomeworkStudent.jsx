import React, { useState } from "react";

// For demo, use same dummy homeworkList as Admin (In real app, fetch from backend)
const dummyHomework = [
  {
    title: "Math Assignment",
    date: "2025-12-01",
    students: [
      { name: "Student A", done: true },
      { name: "Student B", done: false },
    ],
  },
  {
    title: "Science Project",
    date: "2025-12-03",
    students: [
      { name: "Student A", done: false },
      { name: "Student B", done: false },
    ],
  },
];

const HomeworkStudent = () => {
  const [homeworkList] = useState(dummyHomework);

  return (
    <div style={{ padding: "30px" }}>
      <h2>Homework Status</h2>
      {homeworkList.map((hw, index) => (
        <div key={index} style={{ background: "#f5f5f5", padding: "15px", marginBottom: "15px", borderRadius: "10px" }}>
          <h3>{hw.title} - {hw.date}</h3>
          <ul>
            {hw.students.map((s, i) => (
              <li key={i}>
                {s.name} - <b style={{ color: s.done ? "green" : "red" }}>{s.done ? "Done" : "Not Done"}</b>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default HomeworkStudent;
