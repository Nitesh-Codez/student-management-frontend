import React, { useState, useEffect } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

// ================= QUESTIONS =================
const questions = [
  {
    question: "How would you rate Bhaiya's behavior during this month in class?",
    options: ["Very Friendly", "Friendly", "Neutral", "Not Friendly"],
    colors: ["#E8F5E9", "#E3F2FD", "#F5F5F5", "#FDECEA"]
  },
  {
    question: "How well did Bhaiya explain the lessons this month?",
    options: ["Very Clearly", "Clearly", "Somewhat Clear", "Not Clear at All"],
    colors: ["#E8F5E9", "#E3F2FD", "#FFF8E1", "#FDECEA"]
  },
  {
    question: "Was the teaching pace suitable for you this month?",
    options: ["Perfect Pace", "Good Pace", "Moderate", "Too Slow/Fast"],
    colors: ["#E8F5E9", "#E3F2FD", "#FFF8E1", "#FDECEA"]
  },
  {
    question: "How much did you understand the lessons this month?",
    options: ["Completely", "Mostly", "Partially", "Did not understand"],
    colors: ["#E8F5E9", "#E3F2FD", "#FFF8E1", "#FDECEA"]
  },
  {
    question: "How often did Bhaiya get angry in class this month?",
    options: ["Never", "Rarely", "Sometimes", "Often"],
    colors: ["#E8F5E9", "#E3F2FD", "#FFF8E1", "#FDECEA"]
  },
  {
    question: "How did you feel about the overall teaching quality this month?",
    options: ["Loved it", "Liked it", "Neutral", "Did not like it"],
    colors: ["#E8F5E9", "#E3F2FD", "#F5F5F5", "#FDECEA"]
  },
  {
    question: "How actively did you participate in class this month?",
    options: ["Very Actively", "Actively", "Sometimes", "Rarely"],
    colors: ["#E8F5E9", "#E3F2FD", "#FFF8E1", "#FDECEA"]
  },
  {
    question: "How helpful were Bhaiya's homework explanations?",
    options: ["Very Helpful", "Helpful", "Somewhat Helpful", "Not Helpful"],
    colors: ["#E8F5E9", "#E3F2FD", "#FFF8E1", "#FDECEA"]
  },
  {
    question: "How would you rate the overall class environment this month?",
    options: ["Very Comfortable", "Comfortable", "Neutral", "Uncomfortable"],
    colors: ["#E8F5E9", "#E3F2FD", "#F5F5F5", "#FDECEA"]
  },
  {
    question: "Overall, how satisfied are you with this month’s teaching?",
    options: ["Very Satisfied", "Satisfied", "Neutral", "Not Satisfied"],
    colors: ["#E8F5E9", "#E3F2FD", "#F5F5F5", "#FDECEA"]
  }
];

export default function StudentFeedback({ studentId }) {
  const [mcqAnswers, setMcqAnswers] = useState(Array(questions.length).fill(null));
  const [suggestion, setSuggestion] = useState("");
  const [problem, setProblem] = useState("");
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [monthLabel, setMonthLabel] = useState("");

  useEffect(() => {
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    setMonthLabel(months[prevMonth - 1]);
  }, []);

  const handleOption = (q, o) => {
    const copy = [...mcqAnswers];
    copy[q] = o + 1;
    setMcqAnswers(copy);
  };

  const handleSubmit = async () => {
    if (mcqAnswers.includes(null)) {
      return alert("Please answer all questions.");
    }
    try {
      const now = new Date();
      await axios.post(`${API_URL}/api/feedback/student/submit`, {
        student_id: studentId,
        month: now.getMonth() === 0 ? 12 : now.getMonth(),
        year: now.getFullYear(),
        mcqAnswers,
        suggestion,
        problem,
        rating
      });
      setSubmitted(true);
    } catch {
      alert("Submission failed");
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <div className="bg-white p-10 rounded-xl shadow-lg text-center">
          <h2 className="text-3xl font-bold text-green-700 mb-3">
            Thank You!
          </h2>
          <p className="text-lg">
            Your feedback for <b>{monthLabel}</b> has been submitted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-10">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-center text-slate-800 mb-2">
          Faculty Monthly Feedback
        </h1>
        <p className="text-center text-slate-600 mb-8">
          Please answer honestly ({monthLabel})
        </p>

        {questions.map((q, i) => {
          const sel = mcqAnswers[i] ? mcqAnswers[i] - 1 : null;
          return (
            <div
              key={i}
              className="mb-6 p-6 rounded-xl border-2"
              style={{
                backgroundColor: sel !== null ? q.colors[sel] : "#ffffff",
                borderColor: sel !== null ? "#4CAF50" : "#E5E7EB"
              }}
            >
              <p className="font-semibold text-lg mb-4">
                {i + 1}. {q.question}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {q.options.map((op, oi) => (
                  <label
                    key={oi}
                    className="flex items-center gap-3 border rounded-lg px-4 py-3 cursor-pointer bg-white"
                  >
                    <input
                      type="radio"
                      name={`q${i}`}
                      checked={sel === oi}
                      onChange={() => handleOption(i, oi)}
                    />
                    {op}
                  </label>
                ))}
              </div>
            </div>
          );
        })}

        {/* Suggestion */}
        <div className="mb-6">
          <label className="font-semibold">Suggestion (optional)</label>
          <textarea
            className="w-full border rounded-lg p-3 mt-2"
            rows={4}
            value={suggestion}
            onChange={e => setSuggestion(e.target.value)}
          />
        </div>

        {/* Problem */}
        <div className="mb-6">
          <label className="font-semibold">Any Problem (optional)</label>
          <textarea
            className="w-full border rounded-lg p-3 mt-2"
            rows={4}
            value={problem}
            onChange={e => setProblem(e.target.value)}
          />
        </div>

        {/* Rating */}
        <div className="mb-8">
          <label className="font-semibold block mb-2">Overall Rating</label>
          <div className="flex gap-2 text-3xl">
            {[1,2,3,4,5].map(s => (
              <span
                key={s}
                onClick={() => setRating(s)}
                className={`cursor-pointer ${s <= rating ? "text-yellow-400" : "text-gray-300"}`}
              >
                ★
              </span>
            ))}
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={handleSubmit}
            className="bg-green-600 text-white px-10 py-3 rounded-lg font-semibold hover:bg-green-700"
          >
            Submit Feedback
          </button>
        </div>
      </div>
    </div>
  );
}
