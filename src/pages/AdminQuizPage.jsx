import React, { useState, useEffect } from "react";
import axios from "axios";

const AdminQuizPage = () => {
  const API_URL = "https://student-management-system-4-hose.onrender.com";
  
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

  const [activeTab, setActiveTab] = useState("create");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedResultClass, setSelectedResultClass] = useState("");
  
  // Checking/Review State
  const [reviewData, setReviewData] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  const [quiz, setQuiz] = useState({
    class_name: "", subject: "", title: "", timer_minutes: 10, questions: []
  });

  // --- FETCH RESULTS ---
  const fetchResults = async (className) => {
    if (!className) return;
    setLoading(true);
    setReviewData(null); // Clear old review when changing class
    try {
      const res = await axios.get(`${API_URL}/api/quiz/admin/results/${className}`);
      setResults(res.data);
    } catch (err) { alert("Error fetching results"); }
    finally { setLoading(false); }
  };

  // --- CHECK INDIVIDUAL ANSWERS (REVIEW) ---
  const handleCheckAttempt = async (quizId, studentId) => {
    setReviewLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/quiz/review/${quizId}/${studentId}`);
      setReviewData(res.data.data);
      // Scroll to review section
      setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
    } catch (err) { alert("Error loading review"); }
    finally { setReviewLoading(false); }
  };

  // --- CREATE QUIZ LOGIC ---
  const handleClassChange = (e) => setQuiz({ ...quiz, class_name: e.target.value, subject: "" });
  const addQuestion = () => setQuiz({...quiz, questions: [...quiz.questions, { question: "", options: ["", "", "", ""], correctAnswer: "" }]});
  const removeQuestion = (index) => setQuiz({ ...quiz, questions: quiz.questions.filter((_, i) => i !== index) });
  
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

  const handleSubmitQuiz = async () => {
    if (!quiz.class_name || !quiz.subject || !quiz.title || quiz.questions.length === 0) {
      alert("Fill all details!"); return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/quiz/create`, quiz);
      alert("Quiz Created!");
      setQuiz({ class_name: "", subject: "", title: "", timer_minutes: 10, questions: [] });
    } catch (err) { alert("Error"); } finally { setLoading(false); }
  };

  const selectStyle = { padding: "10px", margin: "10px 5px", borderRadius: "4px", border: "1px solid #ccc", width: "210px" };

  return (
    <div style={{ padding: "30px", maxWidth: "1100px", margin: "0 auto", fontFamily: "sans-serif" }}>
      
      {/* TABS */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "30px", borderBottom: "2px solid #eee" }}>
        <button onClick={() => setActiveTab("create")} style={{ ...tabBtn, background: activeTab === "create" ? "#007bff" : "none", color: activeTab === "create" ? "white" : "black" }}>Create Quiz</button>
        <button onClick={() => setActiveTab("results")} style={{ ...tabBtn, background: activeTab === "results" ? "#007bff" : "none", color: activeTab === "results" ? "white" : "black" }}>View Results & Checking</button>
      </div>

      {activeTab === "create" ? (
        /* CREATE UI */
        <div>
          <h2 style={{ color: "#007bff" }}>New Assessment</h2>
          <div style={{ backgroundColor: "#f8f9fa", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
            <select style={selectStyle} value={quiz.class_name} onChange={handleClassChange}>
              <option value="">Select Class</option>
              {Object.keys(subjectsByClass).map(cls => <option key={cls} value={cls}>{cls}</option>)}
            </select>
            <select style={selectStyle} value={quiz.subject} onChange={(e) => setQuiz({ ...quiz, subject: e.target.value })} disabled={!quiz.class_name}>
              <option value="">Select Subject</option>
              {quiz.class_name && subjectsByClass[quiz.class_name].map(sub => <option key={sub} value={sub}>{sub}</option>)}
            </select>
            <input style={{ ...selectStyle, width: "250px" }} placeholder="Title" value={quiz.title} onChange={(e) => setQuiz({ ...quiz, title: e.target.value })} />
            <input style={{ ...selectStyle, width: "80px" }} type="number" value={quiz.timer_minutes} onChange={(e) => setQuiz({ ...quiz, timer_minutes: e.target.value })} />
          </div>
          <button onClick={addQuestion} style={{ padding: "10px", backgroundColor: "#17a2b8", color: "white", border: "none", borderRadius: "5px", marginBottom: "20px", cursor: "pointer" }}>+ Add Question</button>
          
          {quiz.questions.map((q, index) => (
            <div key={index} style={cardStyle}>
                <button onClick={() => removeQuestion(index)} style={deleteBtn}>✖</button>
              <input style={{ width: "90%", padding: "10px", marginBottom: "10px" }} placeholder="Question" value={q.question} onChange={(e) => handleQuestionChange(index, "question", e.target.value)} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {q.options.map((opt, i) => (
                  <input key={i} style={{ padding: "8px" }} placeholder={`Option ${i+1}`} value={opt} onChange={(e) => handleOptionChange(index, i, e.target.value)} />
                ))}
              </div>
              <select style={{ marginTop: "10px", padding: "8px" }} value={q.correctAnswer} onChange={(e) => handleQuestionChange(index, "correctAnswer", e.target.value)}>
                <option value="">Correct Answer</option>
                {q.options.map((opt, i) => opt && <option key={i} value={opt}>{opt}</option>)}
              </select>
            </div>
          ))}
          {quiz.questions.length > 0 && <button onClick={handleSubmitQuiz} style={publishBtn}>{loading ? "Publishing..." : "Publish Quiz"}</button>}
        </div>
      ) : (
        /* RESULTS & CHECKING UI */
        <div>
          <h2 style={{ color: "#007bff" }}>Student Results</h2>
          <select style={selectStyle} value={selectedResultClass} onChange={(e) => { setSelectedResultClass(e.target.value); fetchResults(e.target.value); }}>
            <option value="">Select Class</option>
            {Object.keys(subjectsByClass).map(cls => <option key={cls} value={cls}>{cls}</option>)}
          </select>

          {loading ? <p>Loading...</p> : (
            <div style={{overflowX: 'auto'}}>
              <table style={tableStyle}>
                <thead style={{ background: "#007bff", color: "white" }}>
                  <tr>
                    <th style={tableCell}>Student</th>
                    <th style={tableCell}>Quiz</th>
                    <th style={tableCell}>Score</th>
                    <th style={tableCell}>Grade</th>
                    <th style={tableCell}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {results.length > 0 ? results.map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={tableCell}>{r.student_name}</td>
                      <td style={tableCell}>{r.quiz_title}</td>
                      <td style={tableCell}>{r.score}/{r.total_marks}</td>
                      <td style={{...tableCell, color: r.grade === 'F' ? 'red' : 'green', fontWeight: 'bold'}}>{r.grade}</td>
                      <td style={tableCell}>
                        <button 
                          onClick={() => handleCheckAttempt(r.quiz_id || r.id, r.student_id)}
                          style={checkBtn}
                        >
                          {reviewLoading ? "..." : "Check"}
                        </button>
                      </td>
                    </tr>
                  )) : <tr><td colSpan="5" style={{ textAlign: "center", padding: "20px" }}>No data found.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* INDIVIDUAL REVIEW SECTION */}
          {reviewData && (
            <div style={reviewContainer}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h3>Checking: {reviewData.student_result?.student_name || "Student's Copy"}</h3>
                <button onClick={() => setReviewData(null)} style={{border: 'none', background: '#ff4444', color: 'white', borderRadius: '5px', padding: '5px 10px', cursor: 'pointer'}}>Close Review</button>
              </div>
              <p><b>Quiz:</b> {reviewData.quiz_info.title} | <b>Score:</b> {reviewData.student_result.score}/{reviewData.quiz_info.total_marks}</p>
              <hr/>
              {reviewData.questions.map((q, idx) => {
                const studentAns = reviewData.student_result.answers ? JSON.parse(reviewData.student_result.answers)[idx] : "Not Answered";
                const isCorrect = studentAns === q.correctAnswer;
                return (
                  <div key={idx} style={{...qBox, borderColor: isCorrect ? '#d4edda' : '#f8d7da'}}>
                    <p><b>Q{idx+1}: {q.question}</b></p>
                    <p style={{color: isCorrect ? 'green' : 'red'}}>Student Answer: {studentAns}</p>
                    {!isCorrect && <p style={{color: 'green'}}>Correct Answer: {q.correctAnswer}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Styles
const tabBtn = { padding: "10px 20px", cursor: "pointer", border: "none", fontWeight: "bold", borderRadius: "5px 5px 0 0" };
const cardStyle = { marginBottom: "20px", padding: "15px", border: "1px solid #ddd", borderRadius: "8px", background: "#fff", position: 'relative' };
const deleteBtn = { position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: 'red', cursor: 'pointer' };
const publishBtn = { width: "100%", padding: "15px", background: "#28a745", color: "white", fontWeight: "bold", border: "none", borderRadius: "8px", cursor: "pointer" };
const tableStyle = { width: "100%", borderCollapse: "collapse", marginTop: "10px", background: "white" };
const tableCell = { padding: "12px", textAlign: "left", borderBottom: "1px solid #eee" };
const checkBtn = { background: "#000", color: "#fff", border: "none", padding: "5px 15px", borderRadius: "5px", cursor: "pointer", fontWeight: 'bold' };
const reviewContainer = { marginTop: "40px", padding: "20px", background: "#fdfdfd", border: "2px solid #007bff", borderRadius: "10px" };
const qBox = { padding: "10px", borderLeft: "5px solid", marginBottom: "10px", background: "#fff" };

export default AdminQuizPage;