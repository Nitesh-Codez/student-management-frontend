import React, { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "https://student-management-system-4-hose.onrender.com/api/chat";

const AdminChat = () => {
  const [students, setStudents] = useState([]);
  const [chatWith, setChatWith] = useState(""); // student id
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);

  // Fetch all students
  useEffect(() => {
    axios.get(`${API_URL}/students`).then(res => {
      if (res.data.success) setStudents(res.data.students);
    });
  }, []);

  // Fetch messages
  useEffect(() => {
    if (!chatWith) return;
    const fetchMessages = async () => {
      const res = await axios.get(`${API_URL}/admin/${chatWith}`);
      if (res.data.success) setMessages(res.data.messages);
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [chatWith]);

  const handleSend = async () => {
    if (!text && !file) return;
    const formData = new FormData();
    formData.append("from_admin", true);
    formData.append("to_user", chatWith);
    formData.append("text", text);
    if (file) formData.append("image", file);

    await axios.post(`${API_URL}/admin/send`, formData);
    setText(""); setFile(null);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Admin Chat Monitor</h2>
      <select value={chatWith} onChange={(e) => setChatWith(e.target.value)}>
        <option value="">Select Student</option>
        {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      <div style={{ border: "1px solid #ccc", minHeight: 300, margin: "10px 0", padding: 10, overflowY: "auto" }}>
        {messages.map(m => (
          <div key={m.id} style={{ textAlign: m.from_admin ? "right" : "left", marginBottom: 10 }}>
            {m.text && <span style={{ background: "#f1f5f9", padding: 5, borderRadius: 5 }}>{m.text}</span>}
            {m.image_url && <img src={m.image_url} alt="chat" style={{ maxWidth: 100, display: "block" }} />}
          </div>
        ))}
      </div>

      <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type message..." />
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={handleSend}>Send</button>
    </div>
  );
};

export default AdminChat;
