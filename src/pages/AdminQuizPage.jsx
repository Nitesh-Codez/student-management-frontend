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

  const sessions = ["2024-25", "2025-26", "2026-27"];
  const streams = ["Science", "Commerce", "Arts","PCM","Chemistry,Maths","Physics,Maths","English"];

  const [activeTab, setActiveTab] = useState("create");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({});
  const [quizzes, setQuizzes] = useState([]);
  
  // States for Filtering
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSession, setSelectedSession] = useState("2025-26");
  const [selectedStream, setSelectedStream] = useState("");

  const [editingQuizId, setEditingQuizId] = useState(null);
  const [tempQuizData, setTempQuizData] = useState([]);

  const [quiz, setQuiz] = useState({
    class_name: "", subject: "", session: "2025-26", stream: "", title: "", timer_minutes: 10, questions: []
  });

  const safeParse = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    try { return typeof data === "string" ? JSON.parse(data) : data; } 
    catch (e) { return []; }
  };

  // 1. Fetch Quizzes with Filters
  const fetchQuizzesForAdmin = async (className, session, stream) => {
    if (!className || !session) return;
    setLoading(true);
    try {
      // API call with query params
      const res = await axios.get(`${API_URL}/api/quiz/class/${className}`, {
        params: { session, stream }
      });
      
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
    if (!window.confirm("Are you sure? All results will be deleted!")) return;
    try {
      setLoading(true);
      await axios.delete(`${API_URL}/api/quiz/delete/${quizId}`);
      alert("Quiz Deleted!");
      fetchQuizzesForAdmin(selectedClass, selectedSession, selectedStream);
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
      for(let i=0; i<tempQuizData.length; i++) {
        await axios.put(`${API_URL}/api/quiz/update/${quizId}/${i}`, tempQuizData[i]);
      }
      alert("Updated Successfully!");
      setEditingQuizId(null);
      fetchQuizzesForAdmin(selectedClass, selectedSession, selectedStream);
    } catch (err) { alert("Update failed"); }
    finally { setLoading(false); }
  };

  // 2. Fetch Results with Filters
  const fetchResults = async (className, session, stream) => {
    if (!className || !session) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/quiz/admin/results/${className}`, {
        params: { session, stream }
      });
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
    if (!quiz.class_name || !quiz.subject || !quiz.title || !quiz.session || quiz.questions.length === 0) {
      alert("Please fill all details!"); return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/quiz/create`, quiz);
      alert("Quiz Created!");
      setQuiz({ class_name: "", subject: "", session: "2025-26", stream: "", title: "", timer_minutes: 10, questions: [] });
    } catch (err) { alert("Error creating quiz"); } 
    finally { setLoading(false); }
  };

  const selectStyle = { padding: "10px", margin: "10px 5px", borderRadius: "4px", border: "1px solid #ccc", width: "210px" };

  return (
    <div style={{ padding: "30px", maxWidth: "1200px", margin: "0 auto", fontFamily: "sans-serif", backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
      
      <h1 style={{textAlign: 'center', color: '#1e293b', marginBottom: '30px'}}>Quiz Administration Portal</h1>

      <div style={{ display: "flex", gap: "10px", marginBottom: "30px", borderBottom: "2px solid #ddd" }}>
        <button onClick={() => setActiveTab("create")} style={{ ...tabBtn, background: activeTab === "create" ? "#3b82f6" : "none", color: activeTab === "create" ? "white" : "#64748b" }}>Create Quiz</button>
        <button onClick={() => setActiveTab("edit")} style={{ ...tabBtn, background: activeTab === "edit" ? "#8b5cf6" : "none", color: activeTab === "edit" ? "white" : "#64748b" }}>Manage Quizzes</button>
        <button onClick={() => setActiveTab("results")} style={{ ...tabBtn, background: activeTab === "results" ? "#10b981" : "none", color: activeTab === "results" ? "white" : "#64748b" }}>Results View</button>
      </div>

      {/* CREATE TAB */}
      {activeTab === "create" && (
        <div style={containerStyle}>
          <h3>Add New Quiz</h3>
          <div style={{ background: "#fff", padding: "20px", borderRadius: "8px", border: '1px solid #eee', display: 'flex', flexWrap: 'wrap' }}>
            <select style={selectStyle} value={quiz.session} onChange={(e) => setQuiz({...quiz, session: e.target.value})}>
              <option value="">Select Session</option>
              {sessions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select style={selectStyle} value={quiz.class_name} onChange={(e) => setQuiz({...quiz, class_name: e.target.value, stream: ""})}>
              <option value="">Select Class</option>
              {Object.keys(subjectsByClass).map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {(quiz.class_name === "11th" || quiz.class_name === "12th") && (
              <select style={selectStyle} value={quiz.stream} onChange={(e) => setQuiz({...quiz, stream: e.target.value})}>
                <option value="">Select Stream</option>
                {streams.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            )}

            <select style={selectStyle} value={quiz.subject} onChange={(e) => setQuiz({...quiz, subject: e.target.value})} disabled={!quiz.class_name}>
              <option value="">Select Subject</option>
              {quiz.class_name && subjectsByClass[quiz.class_name].map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <input style={selectStyle} placeholder="Quiz Title" value={quiz.title} onChange={(e) => setQuiz({...quiz, title: e.target.value})} />
            <div style={{display:'flex', alignItems:'center', marginLeft:'10px'}}>
               <small>Timer (Mins):</small>
               <input style={{...selectStyle, width: '70px'}} type="number" value={quiz.timer_minutes} onChange={(e) => setQuiz({...quiz, timer_minutes: e.target.value})} />
            </div>
          </div>

          <button onClick={() => setQuiz({...quiz, questions: [...quiz.questions, {question: "", options: ["","","",""], correctAnswer: ""}]})} style={addBtn}>
            <FaPlus /> Add Question
          </button>
          
          {quiz.questions.map((q, i) => (
            <div key={i} style={cardStyle}>
              <input style={inputFull} placeholder={`Question ${i+1}`} value={q.question} onChange={(e) => {
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

      {/* MANAGE TAB */}
      {activeTab === "edit" && (
        <div style={containerStyle}>
          <h3>Filter Quizzes</h3>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px'}}>
            <select style={selectStyle} value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)}>
               {sessions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select style={selectStyle} value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
              <option value="">Select Class</option>
              {Object.keys(subjectsByClass).map(cls => <option key={cls} value={cls}>{cls}</option>)}
            </select>
            {(selectedClass === "11th" || selectedClass === "12th") && (
              <select style={selectStyle} value={selectedStream} onChange={(e) => setSelectedStream(e.target.value)}>
                <option value="">Select Stream</option>
                {streams.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            )}
            <button style={addBtn} onClick={() => fetchQuizzesForAdmin(selectedClass, selectedSession, selectedStream)}>Search</button>
          </div>

          {quizzes.map((q) => (
            <div key={q.id} style={cardStyle}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                    <h4 style={{margin: 0}}>{q.title}</h4>
                    <small style={{color: '#666'}}>{q.subject} | {q.session} {q.stream ? `| ${q.stream}` : ''} | {safeParse(q.questions).length} Qs</small>
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
              {/* Inline Questions Edit Logic (Already exists in your code) */}
            </div>
          ))}
        </div>
      )}

      {/* RESULTS TAB */}
      {activeTab === "results" && (
        <div style={containerStyle}>
           <h3>Filter Results</h3>
           <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px'}}>
              <select style={selectStyle} value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)}>
                {sessions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select style={selectStyle} value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                <option value="">Select Class</option>
                {Object.keys(subjectsByClass).map(cls => <option key={cls} value={cls}>{cls}</option>)}
              </select>
              {(selectedClass === "11th" || selectedClass === "12th") && (
                <select style={selectStyle} value={selectedStream} onChange={(e) => setSelectedStream(e.target.value)}>
                  <option value="">Select Stream</option>
                  {streams.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              )}
              <button style={{...addBtn, background: '#10b981'}} onClick={() => fetchResults(selectedClass, selectedSession, selectedStream)}>Get Reports</button>
           </div>

           {Object.keys(results).map((quizTitle) => (
             <div key={quizTitle} style={resultGroup}>
               <div style={resultHeader}>Quiz: {quizTitle}</div>
               <table style={{width: '100%', borderCollapse: 'collapse'}}>
                 <thead>
                   <tr style={{background: '#f8f9fa'}}>
                     <th style={tableCell}>Student Name</th>
                     <th style={tableCell}>Score</th>
                     <th style={tableCell}>Grade</th>
                     <th style={tableCell}>Date</th>
                   </tr>
                 </thead>
                 <tbody>
                   {results[quizTitle].map((r, i) => (
                     <tr key={i} style={{borderTop: '1px solid #eee'}}>
                       <td style={tableCell}>{r.student_name}</td>
                       <td style={tableCell}>{r.score}/{r.total_marks}</td>
                       <td style={{...tableCell, color: r.percentage < 40 ? 'red' : 'green', fontWeight: 'bold'}}>{r.grade} ({r.percentage}%)</td>
                       <td style={tableCell}>{new Date(r.created_at).toLocaleDateString()}</td>
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

// Styles (Same as before)
const tabBtn = { padding: "12px 25px", cursor: "pointer", border: "none", fontWeight: "bold", borderRadius: "8px 8px 0 0", transition: '0.3s' };
const containerStyle = { background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' };
const cardStyle = { marginBottom: "15px", padding: "20px", border: "1px solid #eee", borderRadius: "12px", background: "#fff" };
const inputFull = { width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' };
const publishBtn = { width: "100%", padding: "15px", background: "#10b981", color: "white", fontWeight: "bold", border: "none", borderRadius: "8px", marginTop: '20px', cursor: "pointer" };
const addBtn = { padding: "10px 20px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", display: 'flex', alignItems: 'center', gap: '8px' };
const checkBtn = { background: "#1e293b", color: "#fff", border: "none", padding: "8px 15px", borderRadius: "6px", cursor: "pointer", display: 'flex', alignItems: 'center', gap: '6px' };
const deleteBtnStyle = { background: "#ef4444", color: "#fff", border: "none", padding: "8px 15px", borderRadius: "6px", cursor: "pointer", display: 'flex', alignItems: 'center', gap: '6px' };
const tableCell = { padding: "15px", textAlign: "left", fontSize: '14px' };
const resultGroup = { marginTop: '20px', background: '#fff', border: '1px solid #ddd', borderRadius: '12px', overflow: 'hidden' };
const resultHeader = { background: '#f1f5f9', padding: '15px', fontWeight: 'bold', borderBottom: '2px solid #10b981' };

export default AdminQuizPage;