import React, { useState, useEffect } from 'react';
import api from "../services/api";

function AdminStudentStars() {
  const [selectedSession, setSelectedSession] = useState('2026-27');
  const [selectedClass, setSelectedClass] = useState('8th');
  const [allStudents, setAllStudents] = useState([]);
  const [bannedIds, setBannedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [starInputs, setStarInputs] = useState({});
  const [remarksInputs, setRemarksInputs] = useState({});
  const [savingId, setSavingId] = useState(null);
  
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const showCustomAlert = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 2500);
  };

  const classesList = [
    'LKG', 'UKG', '1st', '2nd', '3rd', '4th', 
    '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'
  ];

  const fetchStudentsAndBannedList = async () => {
    setLoading(true);
    try {
      let bannedSet = new Set();
      try {
        const bannedRes = await api.get('/api/auth/banned-students');
        let bannedData = [];
        if (bannedRes.data) {
          if (Array.isArray(bannedRes.data)) bannedData = bannedRes.data;
          else if (Array.isArray(bannedRes.data.students)) bannedData = bannedRes.data.students;
          else if (Array.isArray(bannedRes.data.data)) bannedData = bannedRes.data.data;
          else if (Array.isArray(bannedRes.data.bannedStudents)) bannedData = bannedRes.data.bannedStudents;
        }
        bannedData.forEach(b => {
          if (b && (b.id || b._id)) bannedSet.add(b.id || b._id);
        });
      } catch (err) {
        console.error('Error fetching banned students:', err);
      }
      setBannedIds(bannedSet);

      const response = await api.get('/api/student-stars/admin/all-students', {
        params: { session: selectedSession }
      });
      
      let fetchedData = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          fetchedData = response.data;
        } else if (response.data.students && Array.isArray(response.data.students)) {
          fetchedData = response.data.students;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          fetchedData = response.data.data;
        }
      }

      setAllStudents(fetchedData);
      
      const initialStars = {};
      const initialRemarks = {};
      fetchedData.forEach(st => {
        const studentId = st.id || st._id;
        initialStars[studentId] = '';
        initialRemarks[studentId] = st.remarks || '';
      });
      setStarInputs(initialStars);
      setRemarksInputs(initialRemarks);

    } catch (error) {
      console.error('Error fetching students roster:', error);
      showCustomAlert('Failed to fetch students roster', 'error');
      setAllStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentsAndBannedList();
  }, [selectedSession]);

  const isStudentActive = (st) => {
    if (!st) return false;
    const studentId = st.id || st._id;
    if (studentId && bannedIds.has(studentId)) return false;

    if (st.is_banned === true || st.banned === true || st.isBanned === true || st.deleted === true || st.is_deleted === true) {
      return false;
    }

    const statusVal = String(
      st.status || st.account_status || st.state || st.student_status || st.user_status || ''
    ).toLowerCase().trim();

    const bannedKeywords = ['banned', 'inactive', 'suspended', 'blocked', 'deleted', 'terminated', 'left', 'disable', 'disabled', 'block'];
    if (bannedKeywords.includes(statusVal)) {
      return false;
    }

    return true;
  };

  const activeStudentsList = allStudents.filter(isStudentActive);

  const students = activeStudentsList.filter(st => {
    if (!st.class_name && !st.className && !st.class) return false;
    const studentClass = String(st.class_name || st.className || st.class).toLowerCase().trim();
    const targetClass = String(selectedClass).toLowerCase().trim();
    return studentClass === targetClass;
  });

  const handleAddQuickStars = (id, amount) => {
    setStarInputs(prev => {
      const currentVal = parseInt(prev[id]) || 0;
      return { ...prev, [id]: currentVal + amount };
    });
  };

  const handleManualStarChange = (id, value) => {
    setStarInputs(prev => ({ ...prev, [id]: value }));
  };

  const handleRemarkChange = (id, value) => {
    setRemarksInputs(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = async (student) => {
    const studentId = student.id || student._id;
    const addedValue = parseInt(starInputs[studentId]);
    
    if (isNaN(addedValue)) {
      showCustomAlert('Please enter a valid star number (positive or negative)', 'error');
      return;
    }

    const currentStars = student.stars || 0;
    const newStars = currentStars + addedValue;

    if (newStars < 0) {
      showCustomAlert('Total stars cannot be less than 0', 'error');
      return;
    }

    const remarks = remarksInputs[studentId] || '';

    setSavingId(studentId);
    try {
      const response = await api.post('/api/student-stars/save', {
        student_id: studentId,
        class_name: student.class_name || student.className || student.class || selectedClass,
        session: selectedSession,
        stars: newStars,
        remarks: remarks
      });

      if (response.data || response.status === 200) {
        showCustomAlert('Stars Updated Successfully', 'success');

        setAllStudents(prev =>
          prev.map(s => ((s.id || s._id) === studentId ? { ...s, stars: newStars, remarks: remarks } : s))
        );
        setStarInputs(prev => ({ ...prev, [studentId]: '' }));
      }
    } catch (error) {
      console.error('Error saving stars:', error);
      showCustomAlert('Failed to update student stars', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const totalStudents = students.length;
  const highestStars = students.length > 0 ? Math.max(...students.map(s => s.stars || 0)) : 0;
  const averageStars = totalStudents > 0 ? (students.reduce((acc, curr) => acc + (curr.stars || 0), 0) / totalStudents).toFixed(1) : 0;

  const globalLeaderboard = [...activeStudentsList].sort((a, b) => (b.stars || 0) - (a.stars || 0));

  const getMedalIcon = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      color: '#1e293b',
      padding: '30px 20px',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      position: 'relative'
    }}>
      
      {notification.show && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: notification.type === 'success' ? '#10b981' : '#ef4444',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          fontWeight: '600',
          transition: 'all 0.3s ease'
        }}>
          {notification.message}
        </div>
      )}

      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '20px 24px',
        margin: '-30px -20px 30px -20px',
        borderRadius: '0 0 20px 20px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
      }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>⭐ Student Star Management</h1>
        <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '5px 0 0 0' }}>Assign communication stars and monitor performance excellence</p>
      </header>

      <section style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '20px',
        alignItems: 'flex-end',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
        marginBottom: '30px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '200px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Session</label>
          <select 
            value={selectedSession} 
            onChange={(e) => setSelectedSession(e.target.value)}
            style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '12px 16px', borderRadius: '10px', fontSize: '1rem', outline: 'none' }}
          >
            <option value="2026-27">2026-27</option>
            <option value="2025-26">2025-26</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '200px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Select Class</label>
          <select 
            value={selectedClass} 
            onChange={(e) => setSelectedClass(e.target.value)}
            style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '12px 16px', borderRadius: '10px', fontSize: '1rem', outline: 'none' }}
          >
            {classesList.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </div>

        <button 
          onClick={fetchStudentsAndBannedList}
          style={{
            background: '#f97316',
            color: 'white',
            border: 'none',
            padding: '12px 28px',
            fontWeight: '600',
            borderRadius: '10px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
            height: '48px',
            alignSelf: 'flex-end'
          }}
        >
          Refresh List
        </button>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Active Students ({selectedClass})</span>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '8px 0 0 0', color: '#0f172a' }}>{totalStudents}</h2>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Highest Stars ({selectedClass})</span>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '8px 0 0 0', color: '#eab308' }}>{highestStars} ⭐</h2>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Average Stars ({selectedClass})</span>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '8px 0 0 0', color: '#0284c7' }}>{averageStars} ⭐</h2>
        </div>
      </section>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)', marginBottom: '30px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '20px', color: '#0f172a' }}>Active Students Roster (Class {selectedClass})</h3>
        
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px 0', gap: '15px' }}>
            <div style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
            <p style={{ color: '#64748b' }}>Loading students data...</p>
          </div>
        ) : students.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
            <p>No active students found for class {selectedClass} in session {selectedSession}.</p>
          </div>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{ background: '#f8fafc', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', padding: '14px 12px', borderBottom: '1px solid #e2e8f0' }}>Profile</th>
                  <th style={{ background: '#f8fafc', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', padding: '14px 12px', borderBottom: '1px solid #e2e8f0' }}>Name & Class</th>
                  <th style={{ background: '#f8fafc', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', padding: '14px 12px', borderBottom: '1px solid #e2e8f0' }}>Current Stars</th>
                  <th style={{ background: '#f8fafc', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', padding: '14px 12px', borderBottom: '1px solid #e2e8f0' }}>Modify Stars (+ / -)</th>
                  <th style={{ background: '#f8fafc', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', padding: '14px 12px', borderBottom: '1px solid #e2e8f0' }}>Remarks</th>
                  <th style={{ background: '#f8fafc', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', padding: '14px 12px', borderBottom: '1px solid #e2e8f0' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const studentId = student.id || student._id;
                  return (
                    <tr key={studentId}>
                      <td style={{ padding: '14px 12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' }}>
                        <img 
                          src={student.profile_photo || student.photo || student.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'} 
                          alt={student.name}
                          style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }}
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';
                          }}
                        />
                      </td>
                      <td style={{ padding: '14px 12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{student.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Class: {student.class_name || student.className || student.class || selectedClass}</div>
                      </td>
                      <td style={{ padding: '14px 12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' }}>
                        <span style={{ background: '#fef9c3', color: '#ca8a04', border: '1px solid #fde047', padding: '6px 12px', borderRadius: '20px', fontWeight: '700', fontSize: '0.9rem', display: 'inline-block' }}>
                          {student.stars || 0} ⭐
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {[-5, -1, 1, 5, 10].map((num) => (
                              <button 
                                key={num}
                                type="button" 
                                onClick={() => handleAddQuickStars(studentId, num)}
                                style={{ 
                                  background: num < 0 ? '#fef2f2' : '#eff6ff', 
                                  border: `1px solid ${num < 0 ? '#fecaca' : '#bfdbfe'}`, 
                                  color: num < 0 ? '#dc2626' : '#1d4ed8', 
                                  padding: '4px 8px', 
                                  borderRadius: '6px', 
                                  fontSize: '0.75rem', 
                                  fontWeight: '600', 
                                  cursor: 'pointer' 
                                }}
                              >
                                {num > 0 ? `+${num}` : num}
                              </button>
                            ))}
                          </div>
                          <input 
                            type="number"
                            placeholder="+/- value"
                            value={starInputs[studentId] !== undefined ? starInputs[studentId] : ''}
                            onChange={(e) => handleManualStarChange(studentId, e.target.value)}
                            style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 10px', borderRadius: '8px', width: '110px', fontSize: '0.9rem', outline: 'none' }}
                          />
                        </div>
                      </td>
                      <td style={{ padding: '14px 12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' }}>
                        <textarea
                          rows="2"
                          placeholder="e.g. Excellent Speaker..."
                          value={remarksInputs[studentId] !== undefined ? remarksInputs[studentId] : ''}
                          onChange={(e) => handleRemarkChange(studentId, e.target.value)}
                          style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 10px', borderRadius: '8px', width: '100%', minWidth: '180px', fontSize: '0.85rem', outline: 'none', resize: 'vertical' }}
                        />
                      </td>
                      <td style={{ padding: '14px 12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' }}>
                        <button 
                          onClick={() => handleSave(student)}
                          disabled={savingId === studentId}
                          style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 18px', fontWeight: '600', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)', opacity: savingId === studentId ? 0.6 : 1 }}
                        >
                          {savingId === studentId ? 'Saving...' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '6px', color: '#0f172a' }}>🏆 Global Star Leaderboard (All Classes)</h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>Rankings ordered from highest to lowest stars across the entire school (Banned students excluded)</p>
        
        {globalLeaderboard.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No leaderboard data available.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '450px', overflowY: 'auto', paddingRight: '4px' }}>
            {globalLeaderboard.map((item, index) => {
              const itemId = item.id || item._id;
              return (
                <div key={itemId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: '800', width: '30px', textAlign: 'center', color: index < 3 ? '#d97706' : '#64748b' }}>
                      {getMedalIcon(index)}
                    </span>
                    <img 
                      src={item.profile_photo || item.photo || item.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'} 
                      alt={item.name}
                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #cbd5e1' }}
                    />
                    <div>
                      <span style={{ fontWeight: '600', color: '#0f172a', display: 'block' }}>{item.name}</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#e2e8f0', padding: '2px 8px', borderRadius: '6px', display: 'inline-block', marginTop: '2px' }}>
                        Class: {item.class_name || item.className || item.class || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontWeight: 700, color: '#ca8a04', background: '#fef9c3', padding: '6px 14px', borderRadius: '20px', border: '1px solid #fde047' }}>⭐ {item.stars || 0}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Ye line pages folder ke liye compulsory hai taaki route error na aaye!
export default AdminStudentStars;