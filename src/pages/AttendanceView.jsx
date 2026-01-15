// AttendanceView.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

export default function AttendanceView() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState("");

  // Backend API URL
  const API_URL =
    process.env.REACT_APP_API_URL || "http://localhost:3000";

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          `${API_URL}/api/attendance/today-percent`
        );

        if (res.data.success) {
          setStudents(res.data.students);
          setDate(res.data.date);
        }
      } catch (err) {
        console.error("Error fetching attendance:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [API_URL]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        Attendance Percentage
      </h1>

      <p className="mb-4 font-medium">Date: {date}</p>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                <th className="border px-4 py-2">ID</th>
                <th className="border px-4 py-2">Name</th>
                <th className="border px-4 py-2">Present Days</th>
                <th className="border px-4 py-2">Total Days</th>
                <th className="border px-4 py-2">Percentage</th>
              </tr>
            </thead>

            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-4"
                  >
                    No data found
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.studentId}>
                    <td className="border px-4 py-2">
                      {student.studentId}
                    </td>
                    <td className="border px-4 py-2">
                      {student.name}
                    </td>
                    <td className="border px-4 py-2">
                      {student.present}
                    </td>
                    <td className="border px-4 py-2">
                      {student.total}
                    </td>
                    <td className="border px-4 py-2">
                      {student.percentage}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
