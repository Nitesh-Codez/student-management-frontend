import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdminStudentStars() {
  const [selectedSession, setSelectedSession] = useState('2026-27');
  const [selectedClass, setSelectedClass] = useState('8th');
  const [allStudents, setAllStudents] = useState([]);
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

  // Fetch all students from the single main endpoint
  const fetchStudents = async () => {
    setLoading(true);
    try {
      console.log('Fetching all students from API...');
      const response = await axios.get(
        'https://student-management-system-4-hose.onrender.com/api/students',
        {
          params: { session: selectedSession }
        }
      );
      
      console.log('API Full Response Data:', response.data);

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
        initialStars[st.id] = '';
        initialRemarks[st.id] = st.remarks || '';
      });
      setStarInputs(initialStars);
      setRemarksInputs(initialRemarks);

    } catch (error) {
      console.error('Error fetching students:', error);
      showCustomAlert('Failed to fetch students roster', 'error');
      setAllStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedSession]);

  // Filter students accurately based on the selected class
  const students = allStudents.filter(st => {
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

  // Save stars using the student-stars save API
  const handleSave = async (student) => {
    const addedValue = parseInt(starInputs[student.id]);
    if (isNaN(addedValue) || addedValue <= 0) {
      showCustomAlert('Please enter valid stars to add', 'error');
      return;
    }

    const newStars = (student.stars || 0) + addedValue;
    const remarks = remarksInputs[student.id] || '';

    setSavingId(student.id);
    try {
      const response = await axios.post(
        'https://student-management-system-4-hose.onrender.com/api/student-stars/save',
        {
          student_id: student.id,
          class_name: student.class_name || student.className || student.class || selectedClass,
          session: selectedSession,
          stars: newStars,
          remarks: remarks
        }
      );

      if (response.data || response.status === 200) {
        showCustomAlert('Stars Updated Successfully', 'success');

        // Update local state for both filtered and all students list
        setAllStudents(prev =>
          prev.map(s => (s.id === student.id ? { ...s, stars: newStars, remarks: remarks } : s))
        );
        setStarInputs(prev => ({ ...prev, [student.id]: '' }));
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

  const sortedLeaderboard = [...students].sort((a, b) => (b.stars || 0) - (a.stars || 0)).slice(0, 5);

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
      
      {/* Notification Toast */}
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

      {/* Top Header */}
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

      {/* Filter Controls Bar */}
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
          onClick={fetchStudents}
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

      {/* Summary Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Total Students</span>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '8px 0 0 0', color: '#0f172a' }}>{totalStudents}</h2>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Highest Stars</span>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '8px 0 0 0', color: '#eab308' }}>{highestStars} ⭐</h2>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Average Stars</span>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '8px 0 0 0', color: '#0284c7' }}>{averageStars} ⭐</h2>
        </div>
      </section>

      {/* Students Table Section */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)', marginBottom: '30px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '20px', color: '#0f172a' }}>Students Roster (Class {selectedClass})</h3>
        
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px 0', gap: '15px' }}>
            <div style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
            <p style={{ color: '#64748b' }}>Loading students data...</p>
          </div>
        ) : students.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
            <p>No students found for class {selectedClass} in session {selectedSession}.</p>
          </div>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{ background: '#f8fafc', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', padding: '14px 12px', borderBottom: '1px solid #e2e8f0' }}>Profile</th>
                  <th style={{ background: '#f8fafc', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', padding: '14px 12px', borderBottom: '1px solid #e2e8f0' }}>Name & Class</th>
                  <th style={{ background: '#f8fafc', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', padding: '14px 12px', borderBottom: '1px solid #e2e8f0' }}>Current Stars</th>
                  <th style={{ background: '#f8fafc', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', padding: '14px 12px', borderBottom: '1px solid #e2e8f0' }}>Add Stars</th>
                  <th style={{ background: '#f8fafc', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', padding: '14px 12px', borderBottom: '1px solid #e2e8f0' }}>Remarks</th>
                  <th style={{ background: '#f8fafc', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', padding: '14px 12px', borderBottom: '1px solid #e2e8f0' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
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
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {[1, 2, 5, 10].map((num) => (
                            <button 
                              key={num}
                              type="button" 
                              onClick={() => handleAddQuickStars(student.id, num)}
                              style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}
                            >
                              +{num}
                            </button>
                          ))}
                        </div>
                        <input 
                          type="number"
                          placeholder="Add"
                          value={starInputs[student.id] !== undefined ? starInputs[student.id] : ''}
                          onChange={(e) => handleManualStarChange(student.id, e.target.value)}
                          style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 10px', borderRadius: '8px', width: '100px', fontSize: '0.9rem', outline: 'none' }}
                        />
                      </div>
                    </td>
                    <td style={{ padding: '14px 12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' }}>
                      <textarea
                        rows="2"
                        placeholder="e.g. Excellent Speaker..."
                        value={remarksInputs[student.id] !== undefined ? remarksInputs[student.id] : ''}
                        onChange={(e) => handleRemarkChange(student.id, e.target.value)}
                        style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 10px', borderRadius: '8px', width: '100%', minWidth: '180px', fontSize: '0.85rem', outline: 'none', resize: 'vertical' }}
                      />
                    </td>
                    <td style={{ padding: '14px 12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' }}>
                      <button 
                        onClick={() => handleSave(student)}
                        disabled={savingId === student.id}
                        style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 18px', fontWeight: '600', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)', opacity: savingId === student.id ? 0.6 : 1 }}
                      >
                        {savingId === student.id ? 'Saving...' : 'Save'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Leaderboard Preview Section */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '16px', color: '#0f172a' }}>🏆 Top 5 Students</h3>
        {sortedLeaderboard.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No leaderboard data available.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sortedLeaderboard.map((item, index) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: '800', width: '24px', textAlign: 'center' }}>{getMedalIcon(index)}</span>
                  <img 
                    src={item.profile_photo || item.photo || item.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'} 
                    alt={item.name}
                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #cbd5e1' }}
                  />
                  <div>
                    <span style={{ fontWeight: '600', color: '#0f172a', display: 'block' }}>{item.name}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Class: {item.class_name || item.className || item.class || selectedClass}</span>
                  </div>
                </div>
                <span style={{ fontWeight: 700, color: '#ca8a04', background: '#fef9c3', padding: '6px 12px', borderRadius: '20px', border: '1px solid #fde047' }}>⭐ {item.stars || 0}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}