import React, { useEffect, useState } from "react";
import axios from "axios";

export default function AdminFeedback() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        let API = process.env.REACT_APP_API_URL;

        if (!API) {
          throw new Error("REACT_APP_API_URL not defined");
        }

        // remove trailing slash
        API = API.replace(/\/$/, "");

        // 🔥 FINAL CORRECT ENDPOINT
        const FINAL_URL = `${API}/feedback/admin/summary`;

        console.log("✅ Hitting API:", FINAL_URL);

        const res = await axios.get(FINAL_URL);

        if (res.data && res.data.success) {
          setSummary(res.data.summary);
        } else {
          throw new Error("Invalid API response");
        }
      } catch (err) {
        console.error("❌ Admin feedback error:", err);
        setError("Unable to load feedback summary");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  // ---------------- UI STATES ----------------

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl text-gray-500">
        Loading feedback summary...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600 text-xl font-bold">
        {error}
      </div>
    );
  }

  // ---------------- CALCULATIONS ----------------

  const total =
    summary.positive + summary.neutral + summary.negative || 1;

  const positivePercent = ((summary.positive / total) * 100).toFixed(1);
  const neutralPercent = ((summary.neutral / total) * 100).toFixed(1);
  const negativePercent = ((summary.negative / total) * 100).toFixed(1);

  // ---------------- UI ----------------

  return (
    <div className="min-h-screen p-8 bg-gradient-to-r from-green-100 via-yellow-100 to-red-100">
      <h1 className="text-4xl font-extrabold text-center mb-10 text-gray-800">
        Faculty Feedback Summary
      </h1>

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Positive */}
        <div className="bg-green-200 rounded-2xl p-6 text-center shadow-lg">
          <h2 className="text-2xl font-bold">✅ Positive</h2>
          <p className="text-4xl font-extrabold mt-3">
            {summary.positive}
          </p>
          <p className="text-lg mt-1">{positivePercent}%</p>
        </div>

        {/* Neutral */}
        <div className="bg-yellow-200 rounded-2xl p-6 text-center shadow-lg">
          <h2 className="text-2xl font-bold">⚪ Neutral</h2>
          <p className="text-4xl font-extrabold mt-3">
            {summary.neutral}
          </p>
          <p className="text-lg mt-1">{neutralPercent}%</p>
        </div>

        {/* Negative */}
        <div className="bg-red-200 rounded-2xl p-6 text-center shadow-lg">
          <h2 className="text-2xl font-bold">❌ Negative</h2>
          <p className="text-4xl font-extrabold mt-3">
            {summary.negative}
          </p>
          <p className="text-lg mt-1">{negativePercent}%</p>
        </div>
      </div>

      {/* Overall Result */}
      <div className="mt-12 text-center">
        {positivePercent >= 70 ? (
          <p className="text-3xl font-bold text-green-700">
            🌟 Overall Feedback: Excellent
          </p>
        ) : negativePercent >= 30 ? (
          <p className="text-3xl font-bold text-red-700">
            ⚠️ Overall Feedback: Needs Improvement
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
