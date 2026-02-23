import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaEdit, FaTrash, FaPlus, FaSave, FaTimes } from "react-icons/fa";

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
  const [results, setResults] = useState({});
  const [quizzes, setQuizzes] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [editingQuizId, setEditingQuizId] = useState(null);
  const [tempQuizData, setTempQuizData] = useState([]); // For inline editing

  const [quiz, setQuiz] = useState({
    class_name: "", subject: "", title: "", timer_minutes: 10, questions: []
  });

  const safeParse = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    try { return typeof data === "string" ? JSON.parse(data) : data; } 
    catch (e) { return []; }
  };

  const fetchQuizzesForAdmin = async (className) => {
    if (!className) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/quiz/class/${className}`);
      const fullQuizzes = await Promise.all(
        res.data.map(async (q) => {
          const detail = await axios.get(`${API_URL}/api/quiz/${q.id}`);
          return detail.data;
        })
      );
      setQuizzes(fullQuizzes);
    } catch (err) { alert("Error fetching quizzes"); } 
    finally { setLoading(false); }
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm("Are you sure you want to delete this quiz? All results will be deleted too!")) return;
    try {
      setLoading(true);
      await axios.delete(`${API_URL}/api/quiz/delete/${quizId}`);
      alert("Quiz Deleted!");
      fetchQuizzesForAdmin(selectedClass);
    } catch (err) { alert("Delete failed!"); }
    finally { setLoading(false); }
  };

  const startEditing = (q) => {
    setEditingQuizId(q.id);
    setTempQuizData(safeParse(q.questions));
  };

  const handleInlineChange = (qIdx, field, value, optIdx = null) => {
    let newData = [...tempQuizData];
    if (optIdx !== null) {
      newData[qIdx].options[optIdx] = value;
    } else {
      newData[qIdx][field] = value;
    }
    setTempQuizData(newData);
  };

  const saveUpdatedQuiz = async (quizId) => {
    try {
      setLoading(true);
      // Backend expects updates per question usually, but for a full update we'll loop or update full array
      // Using your existing update route for each question in the loop:
      for(let i=0; i<tempQuizData.length; i++) {
        await axios.put(`${API_URL}/api/quiz/update/${quizId}/${i}`, tempQuizData[i]);
      }
      alert("All Questions Updated Successfully!");
      setEditingQuizId(null);
      fetchQuizzesForAdmin(selectedClass);
    } catch (err) { alert("Update failed"); }
    finally { setLoading(false); }
  };

  const fetchResults = async (className) => {
    if (!className) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/quiz/admin/results/${className}`);
      const grouped = res.data.reduce((acc, curr) => {
        if (!acc[curr.quiz_title]) acc[curr.quiz_title] = [];
        acc[curr.quiz_title].push(curr);
        return acc;
      }, {});
      setResults(grouped);
    } catch (err) { alert("Error fetching results"); }
    finally { setLoading(false); }
  };

  const handleSubmitQuiz = async () => {
    if (!quiz.class_name || !quiz.subject || !quiz.title || quiz.questions.length === 0) {
      alert("Please fill all details!"); return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/quiz/create`, quiz);
      alert("Quiz Created Successfully!");
      setQuiz({ class_name: "", subject: "", title: "", timer_minutes: 10, questions: [] });
    } catch (err) { alert("Error creating quiz"); } 
    finally { setLoading(false); }
  };

  const selectStyle = { padding: "10px", margin: "10px 5px", borderRadius: "4px", border: "1px solid #ccc", width: "210px" };

  return (
    <div style={{ padding: "30px", maxWidth: "1100px", margin: "0 auto", fontFamily: "sans-serif", backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
      
      <h1 style={{textAlign: 'center', color: '#1e293b', marginBottom: '30px'}}>Quiz Administration Portal</h1>

      {/* TABS */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "30px", borderBottom: "2px solid #ddd" }}>
        <button onClick={() => setActiveTab("create")} style={{ ...tabBtn, background: activeTab === "create" ? "#3b82f6" : "none", color: activeTab === "create" ? "white" : "#64748b" }}>Create Quiz</button>
        <button onClick={() => setActiveTab("edit")} style={{ ...tabBtn, background: activeTab === "edit" ? "#8b5cf6" : "none", color: activeTab === "edit" ? "white" : "#64748b" }}>Manage & Edit</button>
        <button onClick={() => setActiveTab("results")} style={{ ...tabBtn, background: activeTab === "results" ? "#10b981" : "none", color: activeTab === "results" ? "white" : "#64748b" }}>Results View</button>
      </div>

      {/* CREATE TAB */}
      {activeTab === "create" && (
        <div style={containerStyle}>
          <h3>Add New Quiz</h3>
          <div style={{ background: "#fff", padding: "20px", borderRadius: "8px", border: '1px solid #eee' }}>
            <select style={selectStyle} value={quiz.class_name} onChange={(e) => setQuiz({...quiz, class_name: e.target.value})}>
              <option value="">Select Class</option>
              {Object.keys(subjectsByClass).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select style={selectStyle} value={quiz.subject} onChange={(e) => setQuiz({...quiz, subject: e.target.value})} disabled={!quiz.class_name}>
              <option value="">Select Subject</option>
              {quiz.class_name && subjectsByClass[quiz.class_name].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input style={selectStyle} placeholder="Quiz Title" value={quiz.title} onChange={(e) => setQuiz({...quiz, title: e.target.value})} />
            <input style={{...selectStyle, width: '100px'}} type="number" value={quiz.timer_minutes} onChange={(e) => setQuiz({...quiz, timer_minutes: e.target.value})} />
          </div>

          <button onClick={() => setQuiz({...quiz, questions: [...quiz.questions, {question: "", options: ["","","",""], correctAnswer: ""}]})} style={addBtn}>
            <FaPlus /> Add Question
          </button>
          
          {quiz.questions.map((q, i) => (
            <div key={i} style={cardStyle}>
              <input style={inputFull} placeholder="Question Text" value={q.question} onChange={(e) => {
                let nq = [...quiz.questions]; nq[i].question = e.target.value; setQuiz({...quiz, questions: nq});
              }} />
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                {q.options.map((opt, oi) => (
                  <input key={oi} value={opt} placeholder={`Option ${oi+1}`} onChange={(e) => {
                    let nq = [...quiz.questions]; nq[i].options[oi] = e.target.value; setQuiz({...quiz, questions: nq});
                  }} style={inputFull} />
                ))}
              </div>
              <select style={{marginTop: '10px', padding: '10px', width: '100%'}} value={q.correctAnswer} onChange={(e) => {
                let nq = [...quiz.questions]; nq[i].correctAnswer = e.target.value; setQuiz({...quiz, questions: nq});
              }}>
                <option value="">Select Correct Answer</option>
                {q.options.map((opt, oi) => opt && <option key={oi} value={opt}>{opt}</option>)}
              </select>
            </div>
          ))}
          <button onClick={handleSubmitQuiz} style={publishBtn}>{loading ? "Publishing..." : "Publish Quiz"}</button>
        </div>
      )}

      {/* EDIT TAB */}
      {activeTab === "edit" && (
        <div style={containerStyle}>
          <h3>Search Quizzes</h3>
          <select style={selectStyle} onChange={(e) => { setSelectedClass(e.target.value); fetchQuizzesForAdmin(e.target.value); }}>
            <option value="">Select Class</option>
            {Object.keys(subjectsByClass).map(cls => <option key={cls} value={cls}>{cls}</option>)}
          </select>

          {quizzes.map((q) => (
            <div key={q.id} style={cardStyle}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                    <h4 style={{margin: 0}}>{q.title}</h4>
                    <small style={{color: '#666'}}>{q.subject} | {safeParse(q.questions).length} Qs</small>
                </div>
                <div style={{display: 'flex', gap: '10px'}}>
                  {editingQuizId === q.id ? (
                      <button onClick={() => saveUpdatedQuiz(q.id)} style={{...checkBtn, background: '#10b981'}}><FaSave /> Save Changes</button>
                  ) : (
                      <button onClick={() => startEditing(q)} style={checkBtn}><FaEdit /> Edit Questions</button>
                  )}
                  <button onClick={() => handleDeleteQuiz(q.id)} style={deleteBtnStyle}><FaTrash /> Delete</button>
                </div>
              </div>

              {editingQuizId === q.id && (
                <div style={{marginTop: '20px', borderTop: '2px dashed #ddd', paddingTop: '20px'}}>
                  <p style={{fontSize: '12px', color: 'orange', fontWeight: 'bold'}}>* Editing Mode: Changes are typed directly here.</p>
                  {tempQuizData.map((question, idx) => (
                    <div key={idx} style={editQBox}>
                      <input 
                        style={{...inputFull, fontWeight: 'bold', border: '1px solid #3b82f6'}} 
                        value={question.question} 
                        onChange={(e) => handleInlineChange(idx, 'question', e.target.value)}
                      />
                      
                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px'}}>
                        {question.options.map((opt, oi) => (
                          <input 
                            key={oi} 
                            style={{...inputFull, border: '1px solid #ddd'}}
                            value={opt} 
                            onChange={(e) => handleInlineChange(idx, 'options', e.target.value, oi)}
                          />
                        ))}
                      </div>
                      <div style={{marginTop: '10px'}}>
                        <small>Correct Option:</small>
                        <select 
                            style={{marginLeft: '10px', padding: '5px'}} 
                            value={question.correctAnswer || question.correct_option}
                            onChange={(e) => handleInlineChange(idx, 'correctAnswer', e.target.value)}
                        >
                            {question.options.map((o, i) => <option key={i} value={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* RESULTS TAB */}
      {activeTab === "results" && (
        <div style={containerStyle}>
           <h3>Class-wise Reports</h3>
           <select style={selectStyle} onChange={(e) => fetchResults(e.target.value)}>
             <option value="">Select Class</option>
             {Object.keys(subjectsByClass).map(cls => <option key={cls} value={cls}>{cls}</option>)}
           </select>

           {Object.keys(results).map((quizTitle) => (
             <div key={quizTitle} style={resultGroup}>
               <div style={resultHeader}>Quiz: {quizTitle}</div>
               <table style={{width: '100%', borderCollapse: 'collapse'}}>
                 <thead>
                   <tr style={{background: '#f8f9fa'}}>
                     <th style={tableCell}>Student Name</th>
                     <th style={tableCell}>Score</th>
                     <th style={tableCell}>Grade</th>
                     <th style={tableCell}>Action</th>
                   </tr>
                 </thead>
                 <tbody>
                   {results[quizTitle].map((r, i) => (
                     <tr key={i} style={{borderTop: '1px solid #eee'}}>
                       <td style={tableCell}>{r.student_name}</td>
                       <td style={tableCell}>{r.score}/{r.total_marks}</td>
                       <td style={{...tableCell, color: r.grade === 'F' ? 'red' : 'green', fontWeight: 'bold'}}>{r.grade}</td>
                       <td style={tableCell}>
                         <button style={checkBtn}>Review</button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           ))}
        </div>
      )}
    </div>
  );
};

// CSS in JS Styles
const tabBtn = { padding: "12px 25px", cursor: "pointer", border: "none", fontWeight: "bold", borderRadius: "8px 8px 0 0", transition: '0.3s' };
const containerStyle = { background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' };
const cardStyle = { marginBottom: "15px", padding: "20px", border: "1px solid #eee", borderRadius: "12px", background: "#fff", boxShadow: '0 2px 4px rgba(0,0,0,0.02)' };
const editQBox = { marginBottom: "15px", padding: "15px", background: "#f9fafb", borderRadius: "10px", border: '1px solid #e5e7eb' };
const inputFull = { width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' };
const publishBtn = { width: "100%", padding: "15px", background: "#10b981", color: "white", fontWeight: "bold", border: "none", borderRadius: "8px", marginTop: '20px', cursor: "pointer" };
const addBtn = { padding: "10px 20px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' };
const checkBtn = { background: "#1e293b", color: "#fff", border: "none", padding: "8px 15px", borderRadius: "6px", cursor: "pointer", display: 'flex', alignItems: 'center', gap: '6px' };
const deleteBtnStyle = { background: "#ef4444", color: "#fff", border: "none", padding: "8px 15px", borderRadius: "6px", cursor: "pointer", display: 'flex', alignItems: 'center', gap: '6px' };
const tableCell = { padding: "15px", textAlign: "left", fontSize: '14px' };
const resultGroup = { marginTop: '20px', background: '#fff', border: '1px solid #ddd', borderRadius: '12px', overflow: 'hidden' };
const resultHeader = { background: '#f1f5f9', padding: '15px', fontWeight: 'bold', color: '#334155', borderBottom: '2px solid #10b981' };

export default AdminQuizPage;