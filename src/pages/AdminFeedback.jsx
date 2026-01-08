import React, { useEffect, useState } from "react";
import axios from "axios";

export default function AdminFeedback() {
    const [feedbacks, setFeedbacks] = useState([]);

    useEffect(() => {
        axios.get("/api/feedback/admin/all")
            .then(res => setFeedbacks(res.data))
            .catch(err => console.error(err));
    }, []);

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-xl font-bold mb-4">All Student Feedback</h2>
            {feedbacks.map(f => (
                <div key={f.id} className="border p-4 mb-4 rounded">
                    <h3 className="font-semibold">{f.name} ({f.class}) - {f.month}/{f.year}</h3>
                    <p>Suggestion: {f.suggestion}</p>
                    <p>Problem: {f.problem}</p>
                    <p>Rating: {f.rating} / 5</p>
                    <div>
                        {f.mcq_answers.map(a => (
                            <p key={a.question_number}>Q{a.question_number}: Option {a.answer}</p>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
