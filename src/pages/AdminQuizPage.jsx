import React, { useState } from "react";
import axios from "axios";

const AdminQuizPage = () => {
  const API_URL = "https://student-management-system-4-hose.onrender.com";

  // Class aur Subjects ka data
  const subjectsByClass = {
    "L.K.G": ["Hindi", "English", "Maths", "EVS", "Reading", "Test"],
    "U.K.G": ["Hindi", "English", "Maths", "EVS", "Reading", "Test"],
    "1st": ["Hindi", "English", "EVS", "Maths", "Test"],
    "2nd": ["Hindi", "English", "EVS", "Maths", "Test"],
    "3rd": ["Hindi", "English", "EVS", "Maths", "Test"],
    "4th": ["Hindi", "English", "EVS", "Maths", "Test"],
    "5th": ["Hindi", "English", "EVS", "Maths", "Test"],
    "6th": ["Hindi", "English", "Maths", "Science", "SST", "Test"],
    "7th": ["Hindi", "English", "Maths", "Science", "SST", "Test"],
    "8th": ["Hindi", "English", "Maths", "Science", "SST", "Sanskrit", "Test"],
    "9th": ["Hindi", "English", "Maths", "Physics", "Chemistry", "Sanskrit", "Biology", "SST", "Computer", "Test"],
    "10th": ["Hindi", "English", "Maths", "Physics", "Chemistry", "Sanskrit", "Biology", "SST", "Computer", "Test"],
    "11th": ["Hindi", "English", "Maths", "Physics", "Chemistry", "Biology", "Computer", "Test"],
    "12th": ["Hindi", "English", "Maths", "Physics", "Chemistry", "Biology", "Computer", "Test"]
  };

  const [quiz, setQuiz] = useState({
    class_name: "",
    subject: "",
    title: "",
    timer_minutes: 10,
    questions: []
  });

  const [loading, setLoading] = useState(false);

  // Jab Class change hogi toh Subject ko reset karenge
  const handleClassChange = (e) => {
    setQuiz({ ...quiz, class_name: e.target.value, subject: "" });
  };

  const addQuestion = () => {
    setQuiz({
      ...quiz,
      questions: [
        ...quiz.questions,
        { question: "", options: ["", "", "", ""], correctAnswer: "" }
      ]
    });
  };

  const removeQuestion = (index) => {
    const updated = quiz.questions.filter((_, i) => i !== index);
    setQuiz({ ...quiz, questions: updated });
  };

  const handleQuestionChange = (index, field, value) => {
    const updated = [...quiz.questions];
    updated[index][field] = value;
    setQuiz({ ...quiz, questions: updated });
  };

  const handleOptionChange = (qIndex, optIndex, value) => {
    const updated = [...quiz.questions];
    updated[qIndex].options[optIndex] = value;
    setQuiz({ ...quiz, questions: updated });
  };

  const handleSubmit = async () => {
    if (!quiz.class_name || !quiz.subject || !quiz.title || quiz.questions.length === 0) {
      alert("Please fill all details and add questions!");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/quiz/create`, quiz);
      alert("Quiz Created Successfully!");
      setQuiz({ class_name: "", subject: "", title: "", timer_minutes: 10, questions: [] });
    } catch (err) {
      alert("Error creating quiz");
    } finally {
      setLoading(false);
    }
  };

  const selectStyle = {
    padding: "10px",
    margin: "10px 5px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    width: "210px",
    backgroundColor: "white"
  };

  return (
    <div style={{ padding: "30px", maxWidth: "900px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <h2 style={{ borderBottom: "2px solid #007bff", paddingBottom: "10px" }}>Admin: Create Quiz</h2>

      <div style={{ backgroundColor: "#f8f9fa", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
        {/* Class Selection Dropdown */}
        <select style={selectStyle} value={quiz.class_name} onChange={handleClassChange}>
          <option value="">Select Class</option>
          {Object.keys(subjectsByClass).map((cls) => (
            <option key={cls} value={cls}>{cls}</option>
          ))}
        </select>

        {/* Subject Selection Dropdown (Based on Class) */}
        <select 
          style={selectStyle} 
          value={quiz.subject} 
          onChange={(e) => setQuiz({ ...quiz, subject: e.target.value })}
          disabled={!quiz.class_name}
        >
          <option value="">Select Subject</option>
          {quiz.class_name && subjectsByClass[quiz.class_name].map((sub) => (
            <option key={sub} value={sub}>{sub}</option>
          ))}
        </select>

        <input 
          style={{ ...selectStyle, width: "250px" }} 
          placeholder="Quiz Title (e.g. Unit Test 1)"
          value={quiz.title}
          onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
        />

        <input 
          style={{ ...selectStyle, width: "100px" }} 
          type="number" 
          placeholder="Minutes"
          value={quiz.timer_minutes}
          onChange={(e) => setQuiz({ ...quiz, timer_minutes: e.target.value })}
        />
      </div>

      <button onClick={addQuestion} style={{ padding: "10px 20px", backgroundColor: "#17a2b8", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", marginBottom: "20px" }}>
        + Add Question
      </button>

      {quiz.questions.map((q, index) => (
        <div key={index} style={{ marginBottom: "25px", padding: "20px", border: "1px solid #ddd", borderRadius: "8px", position: "relative", backgroundColor: "#fff" }}>
          <button onClick={() => removeQuestion(index)} style={{ position: "absolute", top: "10px", right: "10px", color: "red", border: "none", background: "none", cursor: "pointer", fontSize: "16px" }}>✖</button>
          
          <h4 style={{ marginTop: 0 }}>Question {index + 1}</h4>
          <input
            style={{ padding: "10px", width: "95%", marginBottom: "15px", borderRadius: "4px", border: "1px solid #ccc" }}
            placeholder="Enter Question"
            value={q.question}
            onChange={(e) => handleQuestionChange(index, "question", e.target.value)}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {q.options.map((opt, optIndex) => (
              <input
                key={optIndex}
                style={{ padding: "8px", borderRadius: "4px", border: "1px solid #eee" }}
                placeholder={`Option ${optIndex + 1}`}
                value={opt}
                onChange={(e) => handleOptionChange(index, optIndex, e.target.value)}
              />
            ))}
          </div>

          <div style={{ marginTop: "15px" }}>
            <label><strong>Correct Answer: </strong></label>
            <select 
               style={{ padding: "8px", borderRadius: "4px", border: "1px solid #28a745", marginLeft: "10px" }}
               value={q.correctAnswer}
               onChange={(e) => handleQuestionChange(index, "correctAnswer", e.target.value)}
            >
                <option value="">Select Correct Option</option>
                {q.options.map((opt, i) => opt && <option key={i} value={opt}>{opt}</option>)}
            </select>
          </div>
        </div>
      ))}

      {quiz.questions.length > 0 && (
        <button 
          onClick={handleSubmit} 
          disabled={loading}
          style={{ width: "100%", padding: "15px", backgroundColor: loading ? "#ccc" : "#28a745", color: "white", fontSize: "1.2rem", border: "none", borderRadius: "8px", cursor: "pointer" }}
        >
          {loading ? "Publishing..." : "Publish Quiz"}
        </button>
      )}
    </div>
  );
};

export default AdminQuizPage;