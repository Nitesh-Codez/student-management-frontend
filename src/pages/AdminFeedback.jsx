import React, { useEffect, useState } from "react";
import axios from "axios";

export default function AdminFeedback() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Correctly use your backend URL from .env
    const fetchSummary = async () => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/feedback/admin/summary`
        );

        if (res.data.success) {
          setSummary(res.data.summary);
        } else {
          setError("Failed to fetch feedback summary.");
        }
      } catch (err) {
        console.error("Error fetching admin summary:", err);
        setError("Server not reachable or invalid response.");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-500 text-xl">Loading feedback summary...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-100">
        <p className="text-red-600 text-xl font-bold">{error}</p>
      </div>
    );
  }

  const total = summary.positive + summary.neutral + summary.negative || 1;
  const positivePercent = ((summary.positive / total) * 100).toFixed(1);
  const neutralPercent = ((summary.neutral / total) * 100).toFixed(1);
  const negativePercent = ((summary.negative / total) * 100).toFixed(1);

  return (
    <div className="min-h-screen p-6 bg-gradient-to-r from-green-100 via-yellow-100 to-pink-100">
      <h2 className="text-4xl font-extrabold mb-8 text-center text-green-800">
        Faculty Feedback Summary
      </h2>

      <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-green-200 rounded-3xl shadow-lg text-center">
          <p className="text-2xl font-bold">✅ Positive</p>
          <p className="text-3xl font-extrabold mt-3">{summary.positive}</p>
          <p className="text-lg mt-1">{positivePercent}%</p>
        </div>

        <div className="p-6 bg-yellow-200 rounded-3xl shadow-lg text-center">
          <p className="text-2xl font-bold">⚪ Neutral</p>
          <p className="text-3xl font-extrabold mt-3">{summary.neutral}</p>
          <p className="text-lg mt-1">{neutralPercent}%</p>
        </div>

        <div className="p-6 bg-red-200 rounded-3xl shadow-lg text-center">
          <p className="text-2xl font-bold">❌ Negative</p>
          <p className="text-3xl font-extrabold mt-3">{summary.negative}</p>
          <p className="text-lg mt-1">{negativePercent}%</p>
        </div>
      </div>

      <div className="mt-10 text-center">
        {positivePercent >= 70 ? (
          <p className="text-3xl font-bold text-green-700">
            🌟 Overall Feedback: Excellent 🌟
          </p>
        ) : negativePercent >= 30 ? (
          <p className="text-3xl font-bold text-red-700">
            ⚠️ Overall Feedback: Needs Improvement ⚠️
          </p>
        ) : (
          <p className="text-3xl font-bold text-yellow-700">
            ⚪ Overall Feedback: Moderate
          </p>
        )}
      </div>
    </div>
  );
}
