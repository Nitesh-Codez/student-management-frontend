import React, { useState, useEffect } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

// ================= FEEDBACK QUESTIONS + OPTIONS =================
const questions = [
  {
    question: "How would you rate Bhaiya's behavior during this month in class?",
    options: ["Very Friendly", "Friendly", "Neutral", "Not Friendly"],
    colors: ["#FFEEAD", "#ADE8F4", "#D3D3D3", "#FFB6C1"]
  },
  {
    question: "How well did Bhaiya explain the lessons this month?",
    options: ["Very Clearly", "Clearly", "Somewhat Clear", "Not Clear at All"],
    colors: ["#FFEEAD", "#ADE8F4", "#FFDAB9", "#FFB6C1"]
  },
  {
    question: "Was the teaching pace suitable for you this month?",
    options: ["Perfect Pace", "Good Pace", "Moderate", "Too Slow/Fast"],
    colors: ["#FFEEAD", "#ADE8F4", "#FFDAB9", "#FFB6C1"]
  },
  {
    question: "How much did you understand the lessons this month?",
    options: ["Completely", "Mostly", "Partially", "Did not understand"],
    colors: ["#FFEEAD", "#ADE8F4", "#FFDAB9", "#FFB6C1"]
  },
  {
    question: "How often did Bhaiya get angry in class this month?",
    options: ["Never", "Rarely", "Sometimes", "Often"],
    colors: ["#FFEEAD", "#ADE8F4", "#FFDAB9", "#FFB6C1"]
  },
  {
    question: "How did you feel about the overall teaching quality this month?",
    options: ["Loved it", "Liked it", "Neutral", "Did not like it"],
    colors: ["#FFEEAD", "#ADE8F4", "#D3D3D3", "#FFB6C1"]
  },
  {
    question: "How actively did you participate in class this month?",
    options: ["Very Actively", "Actively", "Sometimes", "Rarely"],
    colors: ["#FFEEAD", "#ADE8F4", "#FFDAB9", "#FFB6C1"]
  },
  {
    question: "How helpful were Bhaiya's homework explanations?",
    options: ["Very Helpful", "Helpful", "Somewhat Helpful", "Not Helpful"],
    colors: ["#FFEEAD", "#ADE8F4", "#FFDAB9", "#FFB6C1"]
  },
  {
    question: "How would you rate the overall class environment this month?",
    options: ["Very Comfortable", "Comfortable", "Neutral", "Uncomfortable"],
    colors: ["#FFEEAD", "#ADE8F4", "#D3D3D3", "#FFB6C1"]
  },
  {
    question: "Overall, how satisfied are you with this month’s teaching?",
    options: ["Very Satisfied", "Satisfied", "Neutral", "Not Satisfied"],
    colors: ["#FFEEAD", "#ADE8F4", "#D3D3D3", "#FFB6C1"]
  }
];

export default function StudentFeedback({ studentId }) {
  const [mcqAnswers, setMcqAnswers] = useState(Array(questions.length).fill(null));
  const [suggestion, setSuggestion] = useState("");
  const [rating, setRating] = useState(0);
  const [problem, setProblem] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [monthLabel, setMonthLabel] = useState("");

  useEffect(() => {
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    setMonthLabel(monthNames[prevMonth - 1]);
  }, []);

  const handleOption = (qIndex, optionIndex) => {
    const newAnswers = [...mcqAnswers];
    newAnswers[qIndex] = optionIndex + 1;
    setMcqAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    if (mcqAnswers.includes(null)) return alert("Please answer all MCQs before submitting!");
    try {
      const now = new Date();
      const month = now.getMonth() === 0 ? 12 : now.getMonth();
      const year = now.getFullYear();

      await axios.post(`${API_URL}/api/feedback/student/submit`, {
        student_id: studentId,
        month,
        year,
        mcqAnswers,
        suggestion,
        rating,
        problem
      });

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert("Feedback submission failed. Try again!");
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-r from-purple-300 via-pink-300 to-yellow-300">
        <h1 className="text-5xl font-extrabold text-white mb-6 animate-bounce">🎉 Thank You! 🎉</h1>
        <p className="text-2xl font-bold text-white">Your feedback for {monthLabel} has been submitted successfully!</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-10 bg-gradient-to-r from-pink-50 via-yellow-50 to-green-50">
      <div className="max-w-6xl mx-auto space-y-8">
        <h2 className="text-4xl font-extrabold mb-8 text-center text-green-800">Monthly Feedback ({monthLabel})</h2>

        {questions.map((q, idx) => {
          const selectedIndex = mcqAnswers[idx] ? mcqAnswers[idx] - 1 : null;
          const bgColor = selectedIndex !== null ? q.colors[selectedIndex] : "white";

          return (
            <div
              key={idx}
              className={`p-6 border-4 rounded-3xl shadow-2xl transition-all duration-300 hover:shadow-3xl`}
              style={{
                backgroundColor: bgColor,
                borderColor: idx === 0 ? "green" : "#ccc"
              }}
            >
              <p className="font-extrabold text-gray-900 mb-5 text-2xl border-b-4 border-green-500 pb-2">{idx + 1}. {q.question}</p>
              <div className="flex flex-wrap gap-4 mt-3">
                {q.options.map((opt, optIdx) => (
                  <label
                    key={optIdx}
                    className={`flex-1 min-w-[180px] md:min-w-[220px] flex items-center justify-center gap-3 px-6 py-4 border-2 rounded-2xl cursor-pointer font-bold text-gray-800 hover:scale-105 transition-all shadow-md`}
                    style={{
                      backgroundColor: selectedIndex === optIdx ? q.colors[optIdx] : "transparent",
                      borderColor: selectedIndex === optIdx ? "#555" : "#ccc"
                    }}
                  >
                    <input
                      type="radio"
                      name={`q${idx}`}
                      value={optIdx + 1}
                      checked={selectedIndex === optIdx}
                      onChange={() => handleOption(idx, optIdx)}
                      className="hidden"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          );
        })}

        {/* Suggestion Box */}
        <div>
          <label className="font-extrabold text-gray-900 text-3xl mb-3 block">💡 Suggestion:</label>
          <textarea
            className="border-2 border-gray-400 rounded-2xl p-6 w-full shadow-lg focus:outline-none focus:ring-4 focus:ring-yellow-400 resize-none text-gray-900 font-extrabold text-xl"
            rows={5}
            value={suggestion}
            onChange={e => setSuggestion(e.target.value)}
            placeholder="Write your suggestions to improve the class..."
          />
        </div>

        {/* Problem Box */}
        <div>
          <label className="font-extrabold text-gray-900 text-3xl mb-3 block">⚠️ Problem:</label>
          <textarea
            className="border-2 border-gray-400 rounded-2xl p-6 w-full shadow-lg focus:outline-none focus:ring-4 focus:ring-red-400 resize-none text-gray-900 font-extrabold text-xl"
            rows={5}
            value={problem}
            onChange={e => setProblem(e.target.value)}
            placeholder="Any problems or difficulties faced?"
          />
        </div>

        {/* Rating */}
        <div className="mt-8">
          <label className="font-extrabold text-gray-900 text-3xl mb-3 block">⭐ Overall Rating:</label>
          <div className="flex gap-5">
            {[1,2,3,4,5].map(star => (
              <span
                key={star}
                onClick={() => setRating(star)}
                className={`text-6xl cursor-pointer transition-transform duration-200 ${star <= rating ? "text-yellow-400 scale-125" : "text-gray-300 hover:text-yellow-300 hover:scale-110"}`}
              >★</span>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="mt-10 text-center">
          <button
            onClick={handleSubmit}
            className="px-12 py-5 bg-green-500 text-white font-extrabold rounded-3xl shadow-2xl hover:bg-green-600 hover:scale-105 transition-all text-2xl"
          >
            Submit Feedback
          </button>
        </div>
      </div>
    </div>
  );
}
