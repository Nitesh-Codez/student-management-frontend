import React, { useEffect, useState, useCallback, useMemo } from "react";
import api from "../services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  FaUserPlus, FaTrashAlt, FaSearch, FaMicrophone,
  FaPhoneAlt, FaTimes, FaCheckCircle, FaCamera, FaIdBadge,
  FaLock, FaUnlock, FaEye, FaShieldAlt,
  FaUser, FaEnvelope, FaGraduationCap, FaVenusMars, FaHome,
  FaCity, FaMapPin, FaLayerGroup, FaMoneyBillWave, FaFilePdf, FaCalendarAlt
} from "react-icons/fa";

const ManageStudents = () => {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEncryptedPhones, setShowEncryptedPhones] = useState(false);
  const [isMasterDecrypted, setIsMasterDecrypted] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);

  // --- PDF EXPORT SECURITY MODAL STATES ---
  const [showPdfPasswordModal, setShowPdfPasswordModal] = useState(false);
  const [pdfPasswordInput, setPdfPasswordInput] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    class: "",
    mobile: "",
    address: "",
    father_name: "",
    mother_name: "",
    gender: "Male",
    dob: "",
    email: "",
    blood_group: "",
    category: "OBC",
    city: "Gwalior",
    state: "Madhya Pradesh",
    pincode: "",
    district: "Gwalior",
    session: "2026-27",
    stream: "",
    password: "",
    monthly_fee: 0,
    board: ""
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // Mask phone number
  const maskPhoneNumber = (phone) => {
    if (!phone) return "—";
    if (showEncryptedPhones || isMasterDecrypted) {
      return phone;
    }
    const cleaned = phone.trim();
    if (cleaned.length > 4) {
      const visibleEnd = cleaned.slice(-4);
      return `••••-••${visibleEnd}`;
    }
    return "••••••••";
  };

  // Fetch Students
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/students");
      let data = res.data.success
        ? res.data.students
        : (Array.isArray(res.data) ? res.data : []);

      const sortedData = data.sort((a, b) =>
        (a.name || "")
          .toLowerCase()
          .localeCompare((b.name || "").toLowerCase())
      );
      setStudents(sortedData);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // View Student Profile
  const handleViewProfile = async (userId) => {
    setDetailLoading(true);
    setShowDetailDrawer(true);
    setSelectedStudent(null);

    try {
      const res = await api.get(`/api/students/profile?id=${userId}`);
      if (res.data && res.data.success) {
        setSelectedStudent(
          res.data.student ||
          res.data.data ||
          res.data
        );
      } else {
        const fallback = students.find(s => String(s.id) === String(userId));
        setSelectedStudent(fallback || null);
      }
    } catch (err) {
      console.error("Profile Fetch Error:", err);
      const fallback = students.find(s => String(s.id) === String(userId));
      setSelectedStudent(fallback || null);
    } finally {
      setDetailLoading(false);
    }
  };

  // Search
  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;
    const lowerSearch = searchTerm.toLowerCase();
    return students.filter(s =>
      s.name?.toLowerCase().includes(lowerSearch) ||
      s.class?.toLowerCase().includes(lowerSearch) ||
      s.id?.toString().includes(lowerSearch) ||
      s.code?.toLowerCase().includes(lowerSearch)
    );
  }, [searchTerm, students]);

  // Input Change
  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // File Change
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Register Student
  const handleRegister = async () => {
    if (!formData.name || !formData.class || !formData.password) {
      return alert("Name, Class and Password are required!");
    }

    setIsRegistering(true);
    try {
      const studentPayload = {
        name: formData.name,
        code: formData.code || undefined,
        class: formData.class,
        password: formData.password,
        mobile: formData.mobile || null,
        address: formData.address || null,
        father_name: formData.father_name || null,
        mother_name: formData.mother_name || null,
        gender: formData.gender || null,
        dob: formData.dob || null,
        email: formData.email || null,
        blood_group: formData.blood_group || null,
        category: formData.category || null,
        city: formData.city || null,
        state: formData.state || null,
        pincode: formData.pincode || null,
        district: formData.district || null,
        session: formData.session || null,
        stream: formData.stream || null,
        monthly_fee: formData.monthly_fee || 0,
        board: formData.board || null
      };

      const res = await api.post("/api/students", studentPayload);

      if (res.data.success) {
        const newStudentId = res.data.id || res.data.student?.id;

        if (selectedFile && newStudentId) {
          const photoData = new FormData();
          photoData.append("photo", selectedFile);
          await api.post(`/api/students/${newStudentId}/profile-photo`, photoData);
        }

        alert("Student Registered Successfully!");
        setShowModal(false);
        fetchStudents();

        setFormData({
          name: "",
          code: "",
          class: "",
          mobile: "",
          address: "",
          father_name: "",
          mother_name: "",
          gender: "Male",
          dob: "",
          email: "",
          blood_group: "",
          category: "OBC",
          city: "Gwalior",
          state: "Madhya Pradesh",
          pincode: "",
          district: "Gwalior",
          session: "2026-27",
          stream: "",
          password: "",
          monthly_fee: 0,
          board: ""
        });
        setSelectedFile(null);
        setPreviewUrl(null);
      }
    } catch (err) {
      console.error("Registration error:", err);
      alert("Registration Failed");
    } finally {
      setIsRegistering(false);
    }
  };

  // Delete Student
  const handleDelete = async (id) => {
    if (window.confirm("Permanent deletion of record. Proceed?")) {
      try {
        await api.delete(`/api/students/${id}`);
        fetchStudents();
        if (selectedStudent && String(selectedStudent.id) === String(id)) {
          setShowDetailDrawer(false);
        }
      } catch (err) {
        alert("Delete failed");
      }
    }
  };

  // Voice Search
  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return alert("Browser not supported");
    }
    const recognition = new SpeechRecognition();
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (e) => setSearchTerm(e.results[0][0].transcript);
    recognition.start();
  };

  // --- PDF EXPORT HANDLERS ---
  const handlePdfPasswordSubmit = (e) => {
    e.preventDefault();
    if (pdfPasswordInput === "nite15") {
      setShowPdfPasswordModal(false);
      setPdfPasswordInput("");
      executeStudentPdfGeneration();
    } else {
      alert("Incorrect Security Password for Digital Signature!");
      setPdfPasswordInput("");
    }
  };

  // Helper to load image for PDF autoTable rendering
  const loadImage = (src) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  };

  const executeStudentPdfGeneration = async () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');

      // Top Modern Slate Header (Distinct from Fee Ledger PDF)
     // Light Navy Blue Header
doc.setFillColor(30, 58, 138);

      doc.rect(0, 0, 210, 36, 'F');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text("SMART STUDENTS CLASSES", 105, 12, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Active Registration List", 105, 19, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`Session: 2026-27  |  Total Enrolled Students: ${filteredStudents.length}`, 105, 26, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`Date: ${new Date().toLocaleDateString("en-IN")}`, 105, 32, { align: "center" });

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      // Text Color (Purple) aur Font Size (11) set karke print karein
doc.setTextColor(159, 40, 159); // Rich Purple Color
doc.setFont("helvetica", "bold");
doc.setFontSize(11); // Font Size set kiya (11pt)
doc.text("SMART STUDENTS CLASSES -  Active Students Registration List", 14, 45);

      // Pre-load all profile photos
      const loadedImages = await Promise.all(
        filteredStudents.map(s => {
          const photoUrl = s.profile_photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=6366f1&color=fff&bold=true`;
          return loadImage(photoUrl);
        })
      );

      const tableColumn = ["S.No", "Photo", "Student Name", "UID / Code", "Class", "Mobile No.", "Address"];
      const tableRows = filteredStudents.map((s, index) => [
        index + 1,
        "", // Photo cell (drawn dynamically in didDrawCell)
        (s.name || "").toUpperCase(),
        s.code ? `${s.id} (${s.code})` : String(s.id),
        s.class || "-",
        s.mobile || "-",
        s.address || "-"
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 50,
        theme: 'grid',
        headStyles: { fillColor: [49, 46, 129], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontSize: 8, textColor: [30, 41, 59], minCellHeight: 12 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10, valign: 'middle' },
          1: { halign: 'center', cellWidth: 14, valign: 'middle' },
          2: { cellWidth: 38, fontStyle: 'bold', valign: 'middle' },
          3: { halign: 'center', cellWidth: 22, valign: 'middle' },
          4: { halign: 'center', cellWidth: 18, valign: 'middle' },
          5: { halign: 'center', cellWidth: 28, valign: 'middle' },
          6: { cellWidth: 52, valign: 'middle' }
        },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 1) {
            const rowIndex = data.row.index;
            const img = loadedImages[rowIndex];
            if (img) {
              const dim = 9;
              const posX = data.cell.x + (data.cell.width - dim) / 2;
              const posY = data.cell.y + (data.cell.height - dim) / 2;
              doc.addImage(img, 'JPEG', posX, posY, dim, dim);
            }
          }
        },
        margin: { top: 15, left: 14, right: 14 }
      });

      const finalY = doc.lastAutoTable.finalY + 12;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text("Digitally Signed & Approved By:", 14, finalY);
      doc.text("SMART STUDENTS CLASSES - ADMINISTRATION", 14, finalY + 6);

      doc.setDrawColor(49, 46, 129);
      doc.setLineWidth(0.5);
      doc.line(14, finalY + 16, 75, finalY + 16);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Nitesh Kushwah", 14, finalY + 22);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Authorized Signatory (Digital Stamp Verified)", 14, finalY + 27);

      // Left-aligned THANK YOU
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(49, 46, 129);
      doc.text("THANK YOU", 14, finalY + 39, { align: "left" });

      doc.save(`Smart_Students_Registration_List_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err) {
      alert("Failed to export secure PDF. Error: " + err.message);
    }
  };

  return (
    <div style={ui.appContainer}>

      {/* HEADER WITH RICH GRADIENT ACCENT */}
      <header style={ui.headerSection}>
        <div style={ui.brandGroup}>
          <div style={ui.logoBox}>
            <FaIdBadge />
          </div>
          <div>
            <h1 style={ui.mainTitle}>SMART STUDENTS CLASSES</h1>
            <p style={ui.subTitle}>Master Student Registry & Student Admission Portal</p>
          </div>
        </div>

        <div style={ui.headerRightActions}>
          <button
            style={{
              ...ui.masterDecryptBtn,
              background: isMasterDecrypted ? "#059669" : "#334155",
            }}
            onClick={() => {
              setIsMasterDecrypted(!isMasterDecrypted);
              setShowEncryptedPhones(!isMasterDecrypted);
            }}
          >
            {isMasterDecrypted ? <FaUnlock /> : <FaLock />}
            <span>{isMasterDecrypted ? "Data Decrypted" : "Decrypt Records"}</span>
          </button>

          <div style={ui.statsContainer}>
            <div style={ui.statItem}>
              <span style={ui.statVal}>{students.length}</span>
              <span style={ui.statLab}>Total Enrolled</span>
            </div>
          </div>
        </div>
      </header>

      {/* COMMAND BAR */}
      <div style={ui.commandBar}>
        <div style={ui.searchCluster}>
          <div style={ui.voiceSearchWrapper}>
            <FaSearch style={ui.searchIcon} />
            <input
              type="text"
              placeholder="Search by name, class, Code or UID..."
              style={ui.searchField}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              style={{
                ...ui.micBtn,
                color: isListening ? "#ef4444" : "#64748b"
              }}
              onClick={handleVoiceSearch}
            >
              <FaMicrophone />
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            style={ui.exportPdfBtn}
            onClick={() => setShowPdfPasswordModal(true)}
          >
            <FaFilePdf /> Export PDF
          </button>
          <button
            style={ui.newRegBtn}
            onClick={() => setShowModal(true)}
          >
            <FaUserPlus /> New Admission Form
          </button>
        </div>
      </div>

      {/* SIGNATURE PASSWORD MODAL */}
      {showPdfPasswordModal && (
        <div style={ui.modalOverlay}>
          <div style={{ ...ui.modalCard, maxWidth: "400px" }}>
            <div style={ui.modalHeader}>
              <h3 style={{ margin: 0, fontSize: "16px", color: "#1e293b" }}>✒️ Authorize & Sign PDF</h3>
              <button onClick={() => setShowPdfPasswordModal(false)} style={ui.iconCloseBtn}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handlePdfPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: "20px" }}>
              <input
                type="password"
                placeholder="Enter signature password"
                value={pdfPasswordInput}
                onChange={(e) => setPdfPasswordInput(e.target.value)}
                style={ui.panelInput}
                autoFocus
                required
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" style={ui.primarySubmitBtn}>Confirm & Download</button>
                <button type="button" onClick={() => setShowPdfPasswordModal(false)} style={ui.cancelBtn}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENTS TABLE WITH PREMIUM CARD ROWS */}
      <main style={ui.gridWrapper}>
        <div style={ui.scrollContainer}>
          <table style={ui.enterpriseTable}>
            <thead>
              <tr style={ui.tableHeaderRow}>
                <th style={{ ...ui.th, width: "25%" }}>Student Profile</th>
                <th style={{ ...ui.th, width: "12%" }}>Batch/Class</th>
                <th style={{ ...ui.th, width: "18%" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>Contact No.</span>
                    <button
                      onClick={() => setShowEncryptedPhones(!showEncryptedPhones)}
                      style={ui.decryptToggleBtn}
                      title={showEncryptedPhones ? "Click to encrypt/mask contacts" : "Click to reveal contacts"}
                    >
                      {showEncryptedPhones || isMasterDecrypted ? <FaUnlock color="#059669" /> : <FaLock color="#d97706" />}
                    </button>
                  </div>
                </th>
                <th style={{ ...ui.th, width: "22%" }}>Address</th>
                <th style={{ ...ui.th, width: "13%" }}>Verification</th>
                <th style={{ ...ui.th, width: "10%", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s) => (
                <tr key={s.id} style={ui.trStyle}>
                  <td style={ui.td}>
                    <div style={ui.identityGroup}>
                      <div style={ui.avatarStyle}>
                        <img
                          src={s.profile_photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=4f46e5&color=fff&bold=true`}
                          alt=""
                          style={ui.avatarImg}
                          onError={(e) => {
                            e.target.src = "https://ui-avatars.com/api/?name=User&background=4f46e5&color=fff";
                          }}
                        />
                      </div>
                      <div>
                        <div style={ui.empName}>{s.name}</div>
                        <div style={ui.empId}>UID: {s.id} {s.code ? `• Code: ${s.code}` : ""}</div>
                      </div>
                    </div>
                  </td>
                  <td style={ui.td}>
                    <span style={ui.deptBadge}>{s.class}</span>
                  </td>
                  <td style={ui.td}>
                    <div style={ui.contactInfo}>
                      <FaPhoneAlt size={11} color="#4f46e5" />
                      {maskPhoneNumber(s.mobile)}
                    </div>
                  </td>
                  <td style={ui.td}>
                    <div style={ui.addressInfo}>{s.address || "N/A"}</div>
                  </td>
                  <td style={ui.td}>
                    <span style={ui.statusTag}>
                      <FaCheckCircle size={10} /> Active
                    </span>
                  </td>
                  <td style={ui.td}>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                      <button style={ui.rowDetailBtn} onClick={() => handleViewProfile(s.id)} title="View Full Profile Details">
                        <FaEye />
                      </button>
                      <button style={ui.rowActionBtn} onClick={() => handleDelete(s.id)} title="Delete Record">
                        <FaTrashAlt />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && <div style={ui.loaderStyle}>Loading secure student database...</div>}
        {!loading && filteredStudents.length === 0 && (
          <div style={ui.loaderStyle}>No matching student records found.</div>
        )}
      </main>

      {/* REALISTIC NEW ADMISSION FORM MODAL */}
      {showModal && (
        <div style={ui.modalOverlay}>
          <div style={ui.modalCard}>
            
            {/* Header with Cross Close Button */}
            <div style={ui.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ background: "#4f46e5", color: "#fff", width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FaUserPlus size={16} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#0f172a" }}>
                    Student Admission Form
                  </h2>
                  <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>Academic Session 2026-27 | Official Registration</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={ui.iconCloseBtn} title="Close Form">
                <FaTimes size={16} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div style={ui.modalBody}>
              
              {/* Photo Upload Section */}
              <div style={ui.photoUploadSection}>
                <div style={ui.photoPreviewBox}>
                  {previewUrl ? (
                    <img src={previewUrl} style={ui.avatarImg} alt="Preview" />
                  ) : (
                    <FaCamera size={28} color="#94a3b8" />
                  )}
                </div>
                <label style={ui.photoUploadLabel}>
                  {previewUrl ? "Change Passport Photo" : "Upload Passport Photo"}
                  <input type="file" hidden accept="image/*" onChange={handleFileChange} />
                </label>
              </div>

              {/* Form Grid */}
              <div style={ui.formGrid}>

                <div style={ui.fieldBlock}>
                  <label style={ui.labelStyle}><FaUser size={11} /> Full Name *</label>
                  <input name="name" style={ui.panelInput} value={formData.name} onChange={handleInputChange} placeholder="Student Name" required />
                </div>

                <div style={ui.fieldBlock}>
                  <label style={ui.labelStyle}><FaGraduationCap size={11} /> Class / Standard *</label>
                  <select name="class" style={ui.panelInput} value={formData.class} onChange={handleInputChange}>
                    <option value="">Select Class</option>
                    <option value="LKG">L.K.G</option>
                    <option value="UKG">U.K.G</option>
                    <option value="1st">1st</option>
                    <option value="2nd">2nd</option>
                    <option value="3rd">3rd</option>
                    <option value="4th">4th</option>
                    <option value="5th">5th</option>
                    <option value="6th">6th</option>
                    <option value="7th">7th</option>
                    <option value="8th">8th</option>
                    <option value="9th">9th</option>
                    <option value="10th">10th</option>
                    <option value="11th">11th</option>
                    <option value="12th">12th</option>
                  </select>
                </div>

                <div style={ui.fieldBlock}>
                  <label style={ui.labelStyle}><FaMoneyBillWave size={11} /> Monthly Fee (₹)</label>
                  <input name="monthly_fee" type="number" min="0" style={ui.panelInput} value={formData.monthly_fee} onChange={handleInputChange} placeholder="Enter monthly fee" />
                </div>

                <div style={ui.fieldBlock}>
                  <label style={ui.labelStyle}><FaGraduationCap size={11} /> Board</label>
                  <select name="board" style={ui.panelInput} value={formData.board} onChange={handleInputChange}>
                    <option value="">Select Board</option>
                    <option value="CBSE">CBSE</option>
                    <option value="MP">MP Board</option>
                    <option value="ICSE">ICSE</option>
                  </select>
                </div>

                <div style={ui.fieldBlock}>
                  <label style={ui.labelStyle}><FaLock size={11} /> Auth Password *</label>
                  <input name="password" type="password" style={ui.panelInput} value={formData.password} onChange={handleInputChange} placeholder="••••••••" required />
                </div>

                <div style={ui.fieldBlock}>
                  <label style={ui.labelStyle}><FaPhoneAlt size={11} /> Mobile Number</label>
                  <input name="mobile" style={ui.panelInput} value={formData.mobile} onChange={handleInputChange} placeholder="10-digit mobile number" />
                </div>

                <div style={ui.fieldBlock}>
                  <label style={ui.labelStyle}><FaUser size={11} /> Father's Name</label>
                  <input name="father_name" style={ui.panelInput} value={formData.father_name} onChange={handleInputChange} placeholder="Father's Name" />
                </div>

                <div style={ui.fieldBlock}>
                  <label style={ui.labelStyle}><FaUser size={11} /> Mother's Name</label>
                  <input name="mother_name" style={ui.panelInput} value={formData.mother_name} onChange={handleInputChange} placeholder="Mother's Name" />
                </div>

                <div style={ui.fieldBlock}>
                  <label style={ui.labelStyle}><FaVenusMars size={11} /> Gender</label>
                  <select name="gender" style={ui.panelInput} value={formData.gender} onChange={handleInputChange}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div style={ui.fieldBlock}>
                  <label style={ui.labelStyle}><FaCalendarAlt size={11} /> Date of Birth</label>
                  <input name="dob" type="date" style={ui.panelInput} value={formData.dob} onChange={handleInputChange} />
                </div>

                <div style={ui.fieldBlock}>
                  <label style={ui.labelStyle}><FaEnvelope size={11} /> Email Address</label>
                  <input name="email" type="email" style={ui.panelInput} value={formData.email} onChange={handleInputChange} placeholder="student@gmail.com" />
                </div>

                <div style={ui.fieldBlock}>
                  <label style={ui.labelStyle}><FaLayerGroup size={11} /> Category</label>
                  <select name="category" style={ui.panelInput} value={formData.category} onChange={handleInputChange}>
                    <option value="General">General</option>
                    <option value="OBC">OBC</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                  </select>
                </div>

                <div style={ui.fieldBlock}>
                  <label style={ui.labelStyle}><FaCity size={11} /> City</label>
                  <input name="city" style={ui.panelInput} value={formData.city} onChange={handleInputChange} placeholder="Gwalior" />
                </div>

                <div style={ui.fieldBlock}>
                  <label style={ui.labelStyle}><FaMapPin size={11} /> Pincode</label>
                  <input name="pincode" style={ui.panelInput} value={formData.pincode} onChange={handleInputChange} placeholder="474006" />
                </div>

                <div style={{ ...ui.fieldBlock, gridColumn: "1 / -1" }}>
                  <label style={ui.labelStyle}><FaHome size={11} /> Residential Address</label>
                  <textarea name="address" style={ui.panelTextarea} value={formData.address} onChange={handleInputChange} placeholder="Full residential address..." />
                </div>

              </div>

              {/* Footer Actions */}
              <div style={ui.formFooter}>
                <button type="button" onClick={() => setShowModal(false)} style={ui.cancelBtn}>
                  Cancel
                </button>
                <button style={ui.primarySubmitBtn} onClick={handleRegister} disabled={isRegistering}>
                  {isRegistering ? "Registering Student..." : "Submit Admission Form"}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* DETAIL DRAWER */}
      <div
        style={{
          ...ui.detailDrawer,
          transform: showDetailDrawer ? "translateX(0)" : "translateX(100%)"
        }}
      >
        <div style={ui.panelHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FaShieldAlt color="#4f46e5" />
            <h2 style={{ margin: 0, fontSize: "18px", color: "#0f172a" }}>Student Dossier</h2>
          </div>
          <button onClick={() => setShowDetailDrawer(false)} style={ui.iconCloseBtn}>
            <FaTimes />
          </button>
        </div>

        <div style={ui.panelBody}>
          {detailLoading ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>
              <div style={{ fontSize: "14px", fontWeight: "600" }}>Loading Record...</div>
            </div>
          ) : selectedStudent ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", background: "#f8fafc", padding: "24px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                <div style={{ width: "90px", height: "90px", borderRadius: "16px", overflow: "hidden", marginBottom: "12px", border: "2px solid #4f46e5", boxShadow: "0 4px 12px rgba(79,70,229,0.15)" }}>
                  <img
                    src={selectedStudent.profile_photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedStudent.name)}&background=4f46e5&color=fff`}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
                <h3 style={{ margin: 0, fontSize: "18px", color: "#0f172a" }}>{selectedStudent.name}</h3>
                <span style={{ fontSize: "12px", color: "#4f46e5", fontWeight: "600", marginTop: "4px" }}>
                  Class: {selectedStudent.class} | UID: {selectedStudent.id}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>No record selected.</div>
          )}
        </div>
      </div>

    </div>
  );
};

// --- STYLES (PREMIUM ENHANCED WHITE THEME & RICH HEADER) ---
const ui = {
  appContainer: { minHeight: "100vh", background: "#f8fafc", color: "#0f172a", padding: "24px", fontFamily: "'Inter', sans-serif" },
  
  // Header with rich gradient background and soft drop shadow
  headerSection: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", background: "linear-gradient(135deg, #1e1b4b 0%, #514eb0 100%)", padding: "24px 28px", borderRadius: "16px", boxShadow: "0 10px 25px -5px rgba(30, 27, 75, 0.2)" },
  brandGroup: { display: "flex", alignItems: "center", gap: "18px" },
  logoBox: { width: "52px", height: "52px", borderRadius: "14px", background: "rgba(255, 255, 255, 0.15)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" },
  mainTitle: { margin: 0, fontSize: "30px", fontWeight: "600", color: "#fff", letterSpacing: "-0.5px" },
  subTitle: { margin: "4px 0 0 0", fontSize: "18px", color: "#cbd5e1" },
  headerRightActions: { display: "flex", alignItems: "center", gap: "16px" },
  masterDecryptBtn: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", fontWeight: "600", fontSize: "13px", cursor: "pointer", background: "rgba(255,255,255,0.1)", backdropFilter: "blur(4px)" },
  statsContainer: { display: "flex", gap: "12px" },
  statItem: { background: "rgba(255, 255, 255, 0.1)", backdropFilter: "blur(4px)", padding: "8px 18px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.15)", display: "flex", flexDirection: "column", alignItems: "center" },
  statVal: { fontSize: "18px", fontWeight: "800", color: "#fff" },
  statLab: { fontSize: "10px", color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "0.5px" },
  
  commandBar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", gap: "16px" },
  searchCluster: { flex: 1, maxWidth: "500px" },
  voiceSearchWrapper: { display: "flex", alignItems: "center", background: "#ffffff", borderRadius: "12px", border: "1px solid #cbd5e1", padding: "0 14px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" },
  searchIcon: { color: "#64748b", marginRight: "10px" },
  searchField: { flex: 1, background: "transparent", border: "none", color: "#0f172a", padding: "12px 0", fontSize: "14px", outline: "none" },
  micBtn: { background: "transparent", border: "none", cursor: "pointer", fontSize: "16px", padding: "4px" },
  
  newRegBtn: { display: "flex", alignItems: "center", gap: "8px", background: "#4f46e5", color: "#fff", border: "none", padding: "12px 22px", borderRadius: "12px", fontWeight: "700", fontSize: "14px", cursor: "pointer", boxShadow: "0 4px 12px rgba(79,70,229,0.3)", transition: "all 0.2s" },
  exportPdfBtn: { display: "flex", alignItems: "center", gap: "8px", background: "#059669", color: "#fff", border: "none", padding: "12px 22px", borderRadius: "12px", fontWeight: "700", fontSize: "14px", cursor: "pointer", boxShadow: "0 4px 12px rgba(5,150,105,0.3)" },
  
  // Refined Student List Container & Table Design
  gridWrapper: { background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.04), 0 8px 10px -6px rgba(0,0,0,0.04)" },
  scrollContainer: { overflowX: "auto" },
  enterpriseTable: { width: "100%", borderCollapse: "collapse", textAlign: "left" },
  tableHeaderRow: { background: "#f8fafc", borderBottom: "2px solid #e2e8f0" },
  th: { padding: "18px 20px", fontSize: "12px", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" },
  trStyle: { borderBottom: "1px solid #f1f5f9", transition: "background 0.15s ease" },
  td: { padding: "16px 20px", fontSize: "14px", color: "#1e293b", verticalAlign: "middle" },
  
  identityGroup: { display: "flex", alignItems: "center", gap: "14px" },
  avatarStyle: { width: "42px", height: "42px", borderRadius: "12px", overflow: "hidden", background: "#e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.08)" },
  avatarImg: { width: "100%", height: "100%", objectFit: "cover" },
  empName: { fontWeight: "700", color: "#0f172a" },
  empId: { fontSize: "11px", color: "#64748b", marginTop: "2px" },
  deptBadge: { background: "#eef2ff", color: "#4f46e5", padding: "5px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "700", border: "1px solid #c7d2fe" },
  contactInfo: { display: "flex", alignItems: "center", gap: "8px", fontFamily: "monospace", fontSize: "13px", fontWeight: "600", color: "#334155" },
  decryptToggleBtn: { background: "transparent", border: "none", cursor: "pointer", padding: "2px 6px", fontSize: "12px" },
  addressInfo: { color: "#64748b", fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "250px" },
  statusTag: { display: "inline-flex", alignItems: "center", gap: "6px", background: "#f0fdf4", color: "#16a34a", padding: "5px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "700", border: "1px solid #bbf7d0" },
  
  rowDetailBtn: { background: "#f1f5f9", border: "1px solid #cbd5e1", color: "#334155", padding: "8px 10px", borderRadius: "8px", cursor: "pointer", transition: "all 0.2s" },
  rowActionBtn: { background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "8px 10px", borderRadius: "8px", cursor: "pointer", transition: "all 0.2s" },
  loaderStyle: { padding: "50px", textAlign: "center", color: "#64748b", fontSize: "14px", fontWeight: "500" },
  
  // MODAL STYLES
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" },
  modalCard: { background: "#ffffff", width: "100%", maxWidth: "720px", borderRadius: "20px", border: "1px solid #e2e8f0", overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" },
  modalHeader: { padding: "20px 24px", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0" },
  iconCloseBtn: { background: "#f1f5f9", border: "1px solid #cbd5e1", color: "#64748b", cursor: "pointer", width: "34px", height: "34px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" },
  modalBody: { padding: "24px", overflowY: "auto", flex: 1 },
  
  photoUploadSection: { display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "22px" },
  photoPreviewBox: { width: "96px", height: "96px", borderRadius: "16px", background: "#f8fafc", border: "2px dashed #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: "10px" },
  photoUploadLabel: { background: "#f1f5f9", color: "#1e293b", padding: "6px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer", border: "1px solid #cbd5e1" },
  
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  fieldBlock: { display: "flex", flexDirection: "column", gap: "6px" },
  labelStyle: { fontSize: "12px", fontWeight: "700", color: "#475569", display: "flex", alignItems: "center", gap: "6px" },
  panelInput: { background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "10px 14px", color: "#0f172a", fontSize: "14px", outline: "none", width: "100%", boxSizing: "border-box", transition: "border-color 0.2s" },
  panelTextarea: { background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "10px 14px", color: "#0f172a", fontSize: "14px", outline: "none", width: "100%", minHeight: "80px", boxSizing: "border-box" },
  
  formFooter: { display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px", borderTop: "1px solid #e2e8f0", paddingTop: "18px", gridColumn: "1 / -1" },
  primarySubmitBtn: { background: "#4f46e5", color: "#ffffff", border: "none", padding: "12px 24px", borderRadius: "10px", fontWeight: "700", fontSize: "14px", cursor: "pointer", flex: 1, boxShadow: "0 4px 12px rgba(79,70,229,0.3)" },
  cancelBtn: { background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "12px 20px", borderRadius: "10px", fontWeight: "600", fontSize: "14px", cursor: "pointer" },
  
  detailDrawer: { position: "fixed", top: 0, right: 0, width: "400px", height: "100vh", background: "#ffffff", borderLeft: "1px solid #e2e8f0", zIndex: 1100, transition: "transform 0.3s ease", display: "flex", flexDirection: "column", boxShadow: "-10px 0 30px rgba(0,0,0,0.1)" },
  panelHeader: { padding: "20px 24px", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0" },
  panelBody: { padding: "24px", overflowY: "auto", flex: 1 }
};

export default ManageStudents;