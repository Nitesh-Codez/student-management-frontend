import React, { useEffect, useState } from "react";
import axios from "axios";

export default function AdminDashboard() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        let API = process.env.REACT_APP_API_URL || "https://student-management-system-4-hose.onrender.com";
        API = API.replace(/\/$/, "");
        const res = await axios.get(`${API}/api/feedback/admin/all`);
        setFeedbacks(res.data || []);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch feedbacks.");
      } finally {
        setLoading(false);
      }
    };
    fetchFeedbacks();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h1>All Feedbacks</h1>
      {feedbacks.length === 0 ? (
        <p>No feedbacks found.</p>
      ) : (
        <ul>
          {feedbacks.map(f => (
            <li key={f._id}>
              {f.studentName}: {f.comment} ({f.type})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
