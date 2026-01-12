import React, { useEffect, useState } from "react";
import axios from "axios";

export default function AdminFeedback() {
  const [feedbacks, setFeedbacks] = useState([]);

  // Positive/negative mapping for MCQs
  const positiveOptions = [1, 2]; // Option 1 & 2 considered positive
  const negativeOptions = [3, 4]; // Option 3 & 4 considered negative

  useEffect(() => {
    // ✅ Use full URL from .env
    axios.get(`${process.env.REACT_APP_API_URL}/api/feedback/admin/all`)
      .then(res => {
        if (res.data.success) {
          // Ensure mcq_answers is parsed as array
          const parsedFeedbacks = res.data.feedbacks.map(f => ({
            ...f,
            mcq_answers: Array.isArray(f.mcq_answers) ? f.mcq_answers : JSON.parse(f.mcq_answers)
          }));
          setFeedbacks(parsedFeedbacks);
        }
      })
      .catch(err => console.error("Error fetching feedback:", err));
  }, []);

  return (
    <div className="min-h-screen p-6 bg-gray-100">
      <h2 className="text-3xl font-bold mb-6 text-center">All Student Feedback</h2>

      {feedbacks.length === 0 && (
        <p className="text-center text-gray-500">No feedback found.</p>
      )}

      {feedbacks.map(f => {
        const total = f.mcq_answers.length || 1; // avoid divide by zero
        const positiveCount = f.mcq_answers.filter(a => positiveOptions.includes(a.answer)).length;
        const negativeCount = f.mcq_answers.filter(a => negativeOptions.includes(a.answer)).length;
        const positivePercent = ((positiveCount / total) * 100).toFixed(1);
        const negativePercent = ((negativeCount / total) * 100).toFixed(1);

        // Get question numbers for negative answers
        const negativeQuestions = f.mcq_answers
          .filter(a => negativeOptions.includes(a.answer))
          .map(a => `Q${a.question_number}: Option ${a.answer}`);

        return (
          <div key={f.id} className="border-4 border-black rounded-lg p-6 mb-6 bg-white shadow-lg">
            <h3 className="text-xl font-bold mb-3">{f.name} ({f.class}) - {f.month}/{f.year}</h3>
            
            <p className="mb-2"><span className="font-bold">Suggestion:</span> {f.suggestion || "N/A"}</p>
            <p className="mb-2"><span className="font-bold">Problem:</span> {f.problem || "N/A"}</p>
            <p className="mb-2"><span className="font-bold">Rating:</span> {f.rating} / 5</p>

            <p className="mb-2 font-bold">MCQ Analysis:</p>
            <p className="mb-1">✅ Positive: {positiveCount} ({positivePercent}%)</p>
            <p className="mb-2">❌ Negative: {negativeCount} ({negativePercent}%)</p>

            {negativeQuestions.length > 0 && (
              <div className="bg-red-100 border-l-4 border-red-500 p-3 rounded-md mt-2">
                <p className="font-semibold mb-1">Negative Answers (Review):</p>
                <ul className="list-disc list-inside">
                  {negativeQuestions.map((q, i) => <li key={i}>{q}</li>)}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
