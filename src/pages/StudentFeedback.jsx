import React, { useState } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL; // Your backend API

// Feedback questions
const questions = [
  "Bhaiya's behavior this month",
  "Bhaiya explained well this month",
  "Fast teaching this month",
  "Did not understand anything",
  "Bhaiya got angry",
  "Did not like the month",
  "Participated well",
  "Homework explanation",
  "Class environment",
  "Overall satisfaction"
];

export default function StudentFeedback({ studentId }) {
  const [mcqAnswers, setMcqAnswers] = useState(Array(10).fill(null));
  const [suggestion, setSuggestion] = useState("");
  const [rating, setRating] = useState(0);
  const [problem, setProblem] = useState("");

  // Select MCQ answer
  const handleOption = (qIndex, option) => {
    const newAnswers = [...mcqAnswers];
    newAnswers[qIndex] = option;
    setMcqAnswers(newAnswers);
  };

  // Submit feedback
  const handleSubmit = async () => {
    try {
      if (mcqAnswers.includes(null)) {
        return alert("Please answer all MCQs before submitting!");
      }

      await axios.post(`${API_URL}/api/feedback/student/submit`, {
        student_id: studentId,
        month: new Date().getMonth() || 12, // previous month
        year: new Date().getFullYear(),
        mcqAnswers,
        suggestion,
        rating,
        problem
      });

      alert("Feedback submitted successfully!");
      // Reset form
      setMcqAnswers(Array(10).fill(null));
      setSuggestion("");
      setProblem("");
      setRating(0);
    } catch (err) {
      console.error(err);
      alert("Feedback submission failed. Try again!");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6 text-center">Monthly Feedback (Previous Month)</h2>

      {questions.map((q, idx) => (
        <div key={idx} className="mb-4 p-4 border rounded shadow-sm">
          <p className="font-medium mb-2">{idx + 1}. {q}</p>
          <div className="flex gap-3">
            {[1, 2, 3, 4].map(opt => (
              <label
                key={opt}
                className={`flex items-center gap-2 px-3 py-1 border rounded cursor-pointer
                  ${mcqAnswers[idx] === opt ? "bg-blue-500 text-white border-blue-700" : "bg-white text-black border-gray-300"}
                  hover:bg-blue-100`}
              >
                <input
                  type="radio"
                  name={`q${idx}`}
                  value={opt}
                  checked={mcqAnswers[idx] === opt}
                  onChange={() => handleOption(idx, opt)}
                  className="hidden"
                />
                Option {opt}
              </label>
            ))}
          </div>
        </div>
      ))}

      <div className="mb-4">
        <label className="font-medium">Suggestion:</label>
        <textarea
          className="border p-2 w-full rounded"
          value={suggestion}
          onChange={e => setSuggestion(e.target.value)}
          placeholder="Write your suggestion here..."
        />
      </div>

      <div className="mb-4">
        <label className="font-medium">Problem:</label>
        <textarea
          className="border p-2 w-full rounded"
          value={problem}
          onChange={e => setProblem(e.target.value)}
          placeholder="Any problems faced?"
        />
      </div>

      <div className="mb-6">
        <label className="font-medium">Rating:</label>
        <div className="flex gap-1 mt-1">
          {[1, 2, 3, 4, 5].map(star => (
            <span
              key={star}
              onClick={() => setRating(star)}
              style={{
                color: star <= rating ? "gold" : "gray",
                cursor: "pointer",
                fontSize: "28px",
                transition: "0.2s"
              }}
            >★</span>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        className="px-6 py-2 bg-green-500 text-white font-semibold rounded hover:bg-green-600 transition"
      >
        Submit Feedback
      </button>
    </div>
  );
}
