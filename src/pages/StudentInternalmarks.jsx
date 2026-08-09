import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaSave, FaFilter, FaFileAlt, FaExclamationTriangle } from 'react-icons/fa';

const InternalMarksSheet = () => {
    const [students, setStudents] = useState([]);
    const [selectedClass, setSelectedClass] = useState('ALL');
    const [classes, setClasses] = useState([]);
    const [marks, setMarks] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const API_URL = "https://student-management-system-4-hose.onrender.com";

    useEffect(() => {
        fetchSubmittedStudents();
    }, []);

    const fetchSubmittedStudents = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await axios.get(`${API_URL}/api/exam/admin/total-submissions`);
            
            // Safe data parsing matching your API response structure
            const data = response.data.students || response.data.data || response.data.submissions || (Array.isArray(response.data) ? response.data : []);
            
            if (data && data.length > 0) {
                setStudents(data);
                
                const uniqueClasses = [...new Set(data.map(item => item.student_class || item.class_name))].filter(Boolean);
                setClasses(uniqueClasses);

                const initialMarks = {};
                data.forEach(student => {
                    const sId = student.student_id || student.id;
                    initialMarks[sId] = {
                        task_marks: student.task_marks ?? '',
                        behavior_marks: student.behavior_marks ?? '',
                        performance_marks: student.performance_marks ?? ''
                    };
                });
                setMarks(initialMarks);
            } else {
                setStudents([]);
            }
        } catch (err) {
            console.error('Error loading data', err);
            setError(err.response?.data?.message || 'Network error! Could not load student data.');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (studentId, field, value, maxLimit) => {
        if (value === '') {
            setMarks(prev => ({
                ...prev,
                [studentId]: {
                    ...prev[studentId],
                    [field]: ''
                }
            }));
            return;
        }

        let numVal = parseFloat(value);
        if (isNaN(numVal)) numVal = '';
        if (numVal > maxLimit) numVal = maxLimit;
        if (numVal < 0) numVal = 0;

        setMarks(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [field]: numVal
            }
        }));
    };

    const filteredStudents = selectedClass === 'ALL' 
        ? students 
        : students.filter(s => (s.student_class || s.class_name) === selectedClass);

    const handleSubmitAll = async () => {
        const payloadData = filteredStudents.map(s => {
            const sId = s.student_id || s.id;
            return {
                student_id: sId,
                exam_type: s.exam_type,
                session_year: s.session_year || '2026-2027',
                task_marks: marks[sId]?.task_marks === '' ? 0 : Number(marks[sId]?.task_marks || 0),
                behavior_marks: marks[sId]?.behavior_marks === '' ? 0 : Number(marks[sId]?.behavior_marks || 0),
                performance_marks: marks[sId]?.performance_marks === '' ? 0 : Number(marks[sId]?.performance_marks || 0)
            };
        });

        try {
            const res = await axios.post(`${API_URL}/api/exam/save-internal-marks`, { marksData: payloadData });
            if (res.data.success || res.status === 200) {
                alert('Internal assessment marks saved successfully!');
            }
        } catch (error) {
            console.error('Error saving marks', error);
            alert('Failed to save marks. Please try again.');
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                {/* Header Section */}
                <div style={styles.header}>
                    <div>
                        <h1 style={styles.title}>
                            <FaFileAlt style={{ color: "#4f46e5", marginRight: "10px" }} /> Internal Assessment Marks Sheet
                        </h1>
                        <p style={styles.subtitle}>Task (Max 10) | Behavior (Max 5) | Class Performance (Max 5)</p>
                    </div>
                    
                    <div style={styles.filterContainer}>
                        <FaFilter style={{ color: "#64748b", fontSize: "14px" }} />
                        <label style={styles.label}>Filter Class:</label>
                        <select 
                            value={selectedClass} 
                            onChange={(e) => setSelectedClass(e.target.value)}
                            style={styles.select}
                        >
                            <option value="ALL">All Classes</option>
                            {classes.map(cls => (
                                <option key={cls} value={cls}>{cls}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div style={styles.errorBanner}>
                        <FaExclamationTriangle style={{ marginRight: "10px", color: "#dc2626" }} />
                        <span>{error}</span>
                    </div>
                )}

                {/* Content Area */}
                {loading ? (
                    <div style={styles.centerState}>
                        <p style={styles.loadingText}>Fetching student records from database...</p>
                    </div>
                ) : (
                    <div style={styles.tableContainer}>
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.tableHeaderRow}>
                                    <th style={styles.th}>Student Name</th>
                                    <th style={styles.th}>Class</th>
                                    <th style={styles.th}>Exam Type</th>
                                    <th style={styles.th}>Subjects</th>
                                    <th style={styles.th}>Task (10)</th>
                                    <th style={styles.th}>Behavior (5)</th>
                                    <th style={styles.th}>Performance (5)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.length > 0 ? (
                                    filteredStudents.map((student, index) => {
                                        const studentId = student.student_id || student.id;
                                        return (
                                            <tr key={student.registration_id || studentId || index} style={styles.tableRow}>
                                                <td style={styles.td}>
                                                    <span style={styles.studentName}>{student.student_name || student.name}</span>
                                                    <div style={styles.subText}>ID: {studentId}</div>
                                                </td>
                                                <td style={styles.td}>{student.student_class || student.class_name}</td>
                                                <td style={styles.td}>
                                                    <span style={styles.examTypeBadge}>{student.exam_type || 'N/A'}</span>
                                                </td>
                                                <td style={styles.td}>
                                                    {Array.isArray(student.subjects) 
                                                        ? student.subjects.join(', ') 
                                                        : student.subjects || 'N/A'}
                                                </td>
                                                <td style={styles.td}>
                                                    <input 
                                                        type="number"
                                                        max="10"
                                                        min="0"
                                                        value={marks[studentId]?.task_marks ?? ''}
                                                        onChange={(e) => handleInputChange(studentId, 'task_marks', e.target.value, 10)}
                                                        style={styles.input}
                                                    />
                                                </td>
                                                <td style={styles.td}>
                                                    <input 
                                                        type="number"
                                                        max="5"
                                                        min="0"
                                                        value={marks[studentId]?.behavior_marks ?? ''}
                                                        onChange={(e) => handleInputChange(studentId, 'behavior_marks', e.target.value, 5)}
                                                        style={styles.input}
                                                    />
                                                </td>
                                                <td style={styles.td}>
                                                    <input 
                                                        type="number"
                                                        max="5"
                                                        min="0"
                                                        value={marks[studentId]?.performance_marks ?? ''}
                                                        onChange={(e) => handleInputChange(studentId, 'performance_marks', e.target.value, 5)}
                                                        style={styles.input}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" style={styles.centerStateTd}>
                                            <p style={styles.loadingText}>No student exam applications found.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Footer Action */}
                <div style={styles.footerAction}>
                    <button onClick={handleSubmitAll} style={styles.saveButton}>
                        <FaSave style={{ marginRight: "8px" }} /> Save All Marks
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- STYLES (White Theme) ---
const styles = {
    page: {
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "30px 20px",
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        color: "#1e293b",
    },
    container: {
        maxWidth: "1200px",
        margin: "0 auto",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "30px",
        flexWrap: "wrap",
        gap: "15px",
    },
    title: {
        fontSize: "26px",
        fontWeight: "800",
        margin: 0,
        display: "flex",
        alignItems: "center",
        color: "#0f172a",
    },
    subtitle: {
        fontSize: "14px",
        color: "#64748b",
        marginTop: "4px",
    },
    filterContainer: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        background: "#ffffff",
        padding: "8px 15px",
        borderRadius: "12px",
        border: "1px solid #cbd5e1",
        boxShadow: "0 2px 5px rgba(0,0,0,0.02)",
    },
    label: {
        fontWeight: "600",
        color: "#475569",
        fontSize: "13px",
    },
    select: {
        padding: "6px 12px",
        background: "#f8fafc",
        color: "#1e293b",
        border: "1px solid #cbd5e1",
        borderRadius: "8px",
        outline: "none",
        fontSize: "13px",
        fontWeight: "600",
        cursor: "pointer",
    },
    errorBanner: {
        background: "#fef2f2",
        border: "1px solid #fecaca",
        color: "#dc2626",
        padding: "12px 20px",
        borderRadius: "12px",
        marginBottom: "20px",
        display: "flex",
        alignItems: "center",
        fontSize: "14px",
        fontWeight: "600",
    },
    tableContainer: {
        background: "#ffffff",
        borderRadius: "16px",
        overflowX: "auto",
        boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
        border: "1px solid #e2e8f0",
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        textAlign: "left",
    },
    tableHeaderRow: {
        borderBottom: "1px solid #e2e8f0",
        background: "#f8fafc",
    },
    th: {
        padding: "15px 20px",
        fontSize: "12px",
        fontWeight: "700",
        color: "#475569",
        textTransform: "uppercase",
    },
    tableRow: {
        borderBottom: "1px solid #f1f5f9",
        transition: "background 0.2s",
    },
    td: {
        padding: "16px 20px",
        fontSize: "14px",
        color: "#334155",
        verticalAlign: "middle",
    },
    studentName: {
        fontWeight: "700",
        color: "#0f172a",
        display: "block",
    },
    subText: {
        fontSize: "11px",
        color: "#64748b",
        marginTop: "2px",
    },
    examTypeBadge: {
        padding: "4px 8px",
        background: "#f1f5f9",
        border: "1px solid #cbd5e1",
        borderRadius: "6px",
        fontSize: "12px",
        fontWeight: "600",
        color: "#475569",
    },
    input: {
        width: "65px",
        padding: "8px",
        background: "#ffffff",
        border: "1px solid #cbd5e1",
        borderRadius: "8px",
        color: "#1e293b",
        textAlign: "center",
        fontSize: "14px",
        fontWeight: "600",
        outline: "none",
        boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
    },
    centerState: {
        background: "#ffffff",
        borderRadius: "16px",
        padding: "50px",
        textAlign: "center",
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
    },
    centerStateTd: {
        textAlign: "center",
        padding: "50px",
    },
    loadingText: {
        color: "#64748b",
        fontSize: "15px",
        margin: 0,
        fontWeight: "500",
    },
    footerAction: {
        marginTop: "25px",
        display: "flex",
        justifyContent: "flex-end",
    },
    saveButton: {
        display: "inline-flex",
        alignItems: "center",
        padding: "12px 24px",
        background: "#4f46e5",
        color: "#fff",
        border: "none",
        borderRadius: "10px",
        fontWeight: "600",
        fontSize: "14px",
        cursor: "pointer",
        boxShadow: "0 4px 12px rgba(79, 70, 229, 0.2)",
        transition: "background 0.2s",
    },
};

export default InternalMarksSheet;