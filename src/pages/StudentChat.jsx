import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

// Backend API base
const API_URL = "https://student-management-system-4-hose.onrender.com/api";

const StudentChat = ({ user }) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [chatWith, setChatWith] = useState(""); // student id to chat with
  const [allStudents, setAllStudents] = useState([]);
  const chatBoxRef = useRef();

  // Fetch list of students excluding self
  useEffect(() => {
    axios
      .get(`${API_URL}/students`) // use students API
      .then((res) => {
        if (res.data) {
          // exclude self from the list
          const others = res.data.filter((s) => s.id !== user.id);
          setAllStudents(others);
        }
      })
      .catch((err) => console.error("Error fetching students:", err));
  }, [user]);

  // Fetch chat messages between two users
  useEffect(() => {
    if (!chatWith) return;

    const fetchMessages = async () => {
      try {
        const res = await axios.get(`${API_URL}/chat/${user.id}/${chatWith}`);
        if (res.data.success) setMessages(res.data.messages);
      } catch (err) {
        console.error("Error fetching messages:", err);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // auto-refresh every 3 sec
    return () => clearInterval(interval);
  }, [chatWith, user]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  // Send message (text or image)
  const handleSend = async () => {
    if (!text && !file) return;
    if (!chatWith) return alert("Select a student to chat with!");

    const formData = new FormData();
    formData.append("from_user", user.id);
    formData.append("to_user", chatWith);
    formData.append("text", text);
    if (file) formData.append("image", file);

    try {
      await axios.post(`${API_URL}/chat/send`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setText("");
      setFile(null);

      // Fetch updated messages immediately
      const res = await axios.get(`${API_URL}/chat/${user.id}/${chatWith}`);
      if (res.data.success) setMessages(res.data.messages);
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      <h2 style={{ textAlign: "center", marginBottom: 20 }}>Student Chat</h2>

      {/* Select student */}
      <select
        value={chatWith}
        onChange={(e) => setChatWith(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 10 }}
      >
        <option value="">Select Student</option>
        {allStudents.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      {/* Chat box */}
      <div
        ref={chatBoxRef}
        style={{
          border: "1px solid #ccc",
          minHeight: 300,
          margin: "10px 0",
          padding: 10,
          overflowY: "auto",
          borderRadius: 8,
          background: "#f9f9f9",
        }}
      >
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              textAlign: m.from_user === user.id ? "right" : "left",
              marginBottom: 10,
            }}
          >
            {m.text && (
              <span
                style={{
                  background: m.from_user === user.id ? "#aee1f9" : "#f1f5f9",
                  padding: 5,
                  borderRadius: 5,
                  display: "inline-block",
                  maxWidth: "70%",
                  wordBreak: "break-word",
                }}
              >
                {m.text}
              </span>
            )}
            {m.image_url && (
              <img
                src={`${API_URL}${m.image_url}`} // full path for image
                alt="chat"
                style={{ maxWidth: 150, display: "block", marginTop: 5 }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Input area */}
      <div style={{ display: "flex", gap: 5 }}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type message..."
          style={{ flex: 1, padding: 8, borderRadius: 5 }}
        />
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <button
          onClick={handleSend}
          style={{
            padding: "8px 12px",
            borderRadius: 5,
            background: "#1a73e8",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default StudentChat;
