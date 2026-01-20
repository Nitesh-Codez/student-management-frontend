import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { 
  FaPaperPlane, FaPaperclip, FaUserCircle, 
  FaSearch, FaArrowLeft, FaEllipsisV 
} from "react-icons/fa";

// Is URL ko dhyan se check kar, /api/chat hona chahiye
const API_URL = "https://student-management-system-4-hose.onrender.com/api/chat";

const StudentChat = ({ user }) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [chatWith, setChatWith] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const chatBoxRef = useRef();

  // 1. Contacts Fetching (Sahi endpoint use ho raha hai)
  useEffect(() => {
    if (!user?.id) return;
    const fetchContacts = async () => {
      try {
        const res = await axios.get(`${API_URL}/students?senderId=${user.id}`);
        if (res.data.success) {
          setAllStudents(res.data.students);
        }
      } catch (err) {
        console.error("Contacts Error:", err);
      }
    };
    fetchContacts();
  }, [user]);

  // 2. Messages Fetching (Backend ke ordered results fetch karega)
  useEffect(() => {
    if (!chatWith?.id || !user?.id) return;

    const fetchMessages = async () => {
      try {
        const res = await axios.get(`${API_URL}/${user.id}/${chatWith.id}`);
        if (res.data.success) {
          setMessages(res.data.messages);
        }
      } catch (err) {
        console.error("Messages Sync Error:", err);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // 3 sec polling
    return () => clearInterval(interval);
  }, [chatWith, user]);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  // 3. Send Message (Cloudinary URL backend handle kar raha hai)
  const handleSend = async () => {
    if (!text && !file) return;
    if (!chatWith) return alert("Select a contact!");

    const formData = new FormData();
    formData.append("from_user", user.id);
    formData.append("to_user", chatWith.id);
    formData.append("text", text);
    if (file) formData.append("image", file);

    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/send`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        setText("");
        setFile(null);
        // Instant Fetch taaki bubble turant dikhe
        const update = await axios.get(`${API_URL}/${user.id}/${chatWith.id}`);
        setMessages(update.data.messages);
      }
    } catch (err) {
      console.error("Send Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={ui.container}>
      {/* SIDEBAR */}
      <div style={{...ui.sidebar, display: (chatWith && window.innerWidth < 768) ? 'none' : 'flex'}}>
        <div style={ui.sidebarHeader}>
          <h2 style={{margin: 0}}>Chats</h2>
          <div style={ui.searchBox}>
            <FaSearch size={14} color="#64748b" />
            <input 
              placeholder="Search students..." 
              style={ui.searchInput}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div style={ui.contactList}>
          {allStudents.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(student => (
            <div key={student.id} style={{...ui.contactCard, background: chatWith?.id === student.id ? '#f0f2f5' : 'transparent'}} onClick={() => setChatWith(student)}>
              <img src={`https://ui-avatars.com/api/?name=${student.name}&background=random`} style={ui.avatar} alt="" />
              <div>
                <div style={ui.contactName}>{student.name}</div>
                <div style={ui.lastMsg}>Class: {student.class || 'N/A'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CHAT WINDOW */}
      <div style={{...ui.chatArea, display: (!chatWith && window.innerWidth < 768) ? 'none' : 'flex'}}>
        {chatWith ? (
          <>
            <div style={ui.chatHeader}>
              <button style={ui.backBtn} onClick={() => setChatWith(null)}><FaArrowLeft /></button>
              <img src={`https://ui-avatars.com/api/?name=${chatWith.name}`} style={ui.avatarSmall} alt="" />
              <div style={{flex: 1}}><div style={ui.contactName}>{chatWith.name}</div><div style={ui.onlineStatus}>online</div></div>
              <FaEllipsisV color="#54656f" />
            </div>

            <div style={ui.messageArea} ref={chatBoxRef}>
              {messages.map((m) => (
                <div key={m.id} style={{...ui.messageRow, justifyContent: parseInt(m.from_user) === parseInt(user.id) ? "flex-end" : "flex-start"}}>
                  <div style={{...ui.bubble, background: parseInt(m.from_user) === parseInt(user.id) ? "#d9fdd3" : "#fff"}}>
                    {m.image_url && <img src={m.image_url} style={ui.chatImg} alt="sent" />}
                    <div style={ui.msgText}>{m.text}</div>
                    {/* Yahan 'timestamp' use kiya hai jo tere controller se aa raha hai */}
                    <div style={ui.msgTime}>{m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={ui.chatFooter}>
              <label style={{cursor:'pointer'}}><FaPaperclip /><input type="file" hidden onChange={(e)=>setFile(e.target.files[0])}/></label>
              <input style={ui.input} placeholder={file ? file.name : "Type a message..."} value={text} onChange={(e)=>setText(e.target.value)} onKeyPress={(e)=>e.key==='Enter' && handleSend()}/>
              <button style={ui.sendBtn} onClick={handleSend} disabled={loading}><FaPaperPlane /></button>
            </div>
          </>
        ) : (
          <div style={ui.welcomeScreen}><h2>Select a student to chat</h2></div>
        )}
      </div>
    </div>
  );
};

const ui = {
  container: { display: 'flex', height: '100vh', width: '100vw', background: '#f0f2f5' },
  sidebar: { width: '30%', minWidth: '300px', background: '#fff', borderRight: '1px solid #d1d7db', flexDirection: 'column' },
  sidebarHeader: { background: '#f0f2f5', padding: '15px' },
  searchBox: { background: '#fff', display: 'flex', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', marginTop: '10px' },
  searchInput: { border: 'none', outline: 'none', marginLeft: '10px', width: '100%' },
  contactList: { flex: 1, overflowY: 'auto' },
  contactCard: { display: 'flex', padding: '12px 15px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', alignItems: 'center' },
  avatar: { width: '45px', height: '45px', borderRadius: '50%', marginRight: '15px' },
  avatarSmall: { width: '40px', height: '40px', borderRadius: '50%', marginRight: '10px' },
  contactName: { fontWeight: '600', color: '#111b21' },
  lastMsg: { fontSize: '12px', color: '#667781' },
  chatArea: { flex: 1, background: '#efeae2', flexDirection: 'column' },
  chatHeader: { background: '#f0f2f5', padding: '10px 16px', display: 'flex', alignItems: 'center' },
  onlineStatus: { fontSize: '11px', color: '#00a884' },
  messageArea: { flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column' },
  messageRow: { display: 'flex', marginBottom: '10px' },
  bubble: { padding: '8px 12px', maxWidth: '70%', borderRadius: '8px', boxShadow: '0 1px 1px rgba(0,0,0,0.1)' },
  chatImg: { maxWidth: '100%', borderRadius: '8px', marginBottom: '5px' },
  msgText: { fontSize: '14px' },
  msgTime: { fontSize: '10px', color: '#667781', textAlign: 'right', marginTop: '3px' },
  chatFooter: { background: '#f0f2f5', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '15px' },
  input: { flex: 1, border: 'none', padding: '12px', borderRadius: '8px', outline: 'none' },
  sendBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#00a884' },
  welcomeScreen: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#667781' },
  backBtn: { background: 'none', border: 'none', marginRight: '10px', cursor: 'pointer' }
};

export default StudentChat;