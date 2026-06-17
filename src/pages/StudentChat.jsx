import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { FaPaperPlane, FaRobot, FaUserCircle } from "react-icons/fa";

const API_URL = "https://student-management-system-4-hose.onrender.com/api/chat";

const StudentChat = ({ user }) => {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hello 👋\nI am your AI Study Assistant.",
    },
  ]);

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const chatRef = useRef();

  // Auto Scroll
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // Send Message
  const handleSend = async () => {
    if (!text.trim()) return;

    const userMessage = {
      sender: "user",
      text,
    };

    setMessages((prev) => [...prev, userMessage]);

    const currentText = text;
    setText("");

    try {
      setLoading(true);

      const res = await axios.post(API_URL, {
        message: currentText,
        student_id: user?.id,
      });

      if (res.data.success) {
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: res.data.reply,
          },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "❌ AI server error",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <FaRobot size={24} color="#fff" />
          <div>
            <div style={styles.botName}>AI Study Assistant</div>
            <div style={styles.online}>Online</div>
          </div>
        </div>
      </div>

      {/* CHAT AREA */}
      <div style={styles.chatArea} ref={chatRef}>
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              ...styles.messageRow,
              justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                ...styles.bubble,
                background: msg.sender === "user" ? "#2563eb" : "#ffffff",
                color: msg.sender === "user" ? "#fff" : "#111827",
              }}
            >
              <div style={styles.msgText}>{msg.text}</div>
            </div>
          </div>
        ))}

        {loading && <div style={styles.loading}>AI is typing...</div>}
      </div>

      {/* FOOTER */}
      <div style={styles.footer}>
        <input
          type="text"
          placeholder="Ask anything..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          style={styles.input}
        />

        <button onClick={handleSend} style={styles.sendBtn}>
          <FaPaperPlane />
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    width: "100%",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "#f3f4f6",
  },
  header: {
    background: "linear-gradient(90deg,#2563eb,#1d4ed8)",
    padding: "16px 20px",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  botName: {
    fontWeight: "700",
    fontSize: "17px",
  },
  online: {
    fontSize: "12px",
    opacity: 0.9,
  },
  chatArea: {
    flex: 1,
    overflowY: "auto",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  messageRow: {
    display: "flex",
  },
  bubble: {
    maxWidth: "75%",
    padding: "12px 15px",
    borderRadius: "16px",
    boxShadow: "0 2px 5px rgba(0,0,0,0.08)",
    whiteSpace: "pre-wrap",
  },
  msgText: {
    fontSize: "14px",
    lineHeight: "1.5",
  },
  footer: {
    padding: "15px",
    background: "#fff",
    display: "flex",
    gap: "10px",
    borderTop: "1px solid #e5e7eb",
  },
  input: {
    flex: 1,
    border: "1px solid #d1d5db",
    borderRadius: "12px",
    padding: "12px",
    outline: "none",
    fontSize: "14px",
  },
  sendBtn: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    width: "50px",
    cursor: "pointer",
    fontSize: "16px",
  },
  loading: {
    fontSize: "12px",
    color: "#6b7280",
    marginTop: "5px",
  },
};

export default StudentChat;