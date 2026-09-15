import React, { useEffect, useState, useCallback, useMemo } from "react";
import api from "../services/api";
import {
  FaUserPlus, FaTrashAlt, FaSearch, FaMicrophone,
  FaPhoneAlt, FaTimes, FaCheckCircle, FaCamera, FaIdBadge,
  FaLock, FaUnlock, FaEye, FaMapMarkerAlt, FaCalendarAlt, FaShieldAlt,
  FaUser, FaEnvelope, FaGraduationCap, FaVenusMars, FaHome,
  FaCity, FaMapPin, FaLayerGroup, FaMoneyBillWave
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

    // NEW
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
        const fallback = students.find(
          s => String(s.id) === String(userId)
        );

        setSelectedStudent(fallback || null);
      }

    } catch (err) {
      console.error("Profile Fetch Error:", err);

      const fallback = students.find(
        s => String(s.id) === String(userId)
      );

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

        // NEW
        monthly_fee: formData.monthly_fee || 0,
        board: formData.board || null
      };

      const res = await api.post(
        "/api/students",
        studentPayload
      );

      if (res.data.success) {

        const newStudentId =
          res.data.id ||
          res.data.student?.id;

        // Upload photo
        if (selectedFile && newStudentId) {

          const photoData = new FormData();

          photoData.append(
            "photo",
            selectedFile
          );

          await api.post(
            `/api/students/${newStudentId}/profile-photo`,
            photoData
          );
        }

        alert("Student Registered Successfully!");

        setShowModal(false);

        fetchStudents();

        // Reset Form
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

          // NEW
          monthly_fee: 0,
          board: ""
        });

        setSelectedFile(null);
        setPreviewUrl(null);
      }

    } catch (err) {

      console.error(
        "Registration error:",
        err
      );

      alert("Registration Failed");

    } finally {
      setIsRegistering(false);
    }
  };

  // Delete Student
  const handleDelete = async (id) => {

    if (window.confirm(
      "Permanent deletion of record. Proceed?"
    )) {

      try {

        await api.delete(
          `/api/students/${id}`
        );

        fetchStudents();

        if (
          selectedStudent &&
          String(selectedStudent.id) === String(id)
        ) {
          setShowDetailDrawer(false);
        }

      } catch (err) {
        alert("Delete failed");
      }
    }
  };

  // Voice Search
  const handleVoiceSearch = () => {

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return alert("Browser not supported");
    }

    const recognition =
      new SpeechRecognition();

    recognition.onstart = () =>
      setIsListening(true);

    recognition.onend = () =>
      setIsListening(false);

    recognition.onresult = (e) =>
      setSearchTerm(
        e.results[0][0].transcript
      );

    recognition.start();
  };

  return (
    <div style={ui.appContainer}>

      {/* HEADER */}
      <header style={ui.headerSection}>

        <div style={ui.brandGroup}>

          <div style={ui.logoBox}>
            <FaIdBadge />
          </div>

          <div>
            <h1 style={ui.mainTitle}>
              Smart Students
            </h1>

            <p style={ui.subTitle}>
              Master Student Registry & Live Secure Database
            </p>
          </div>

        </div>

        <div style={ui.headerRightActions}>

          <button
            style={{
              ...ui.masterDecryptBtn,
              background:
                isMasterDecrypted
                  ? "#059669"
                  : "#334155",
              borderColor:
                isMasterDecrypted
                  ? "#10b981"
                  : "#475569"
            }}
            onClick={() => {

              setIsMasterDecrypted(
                !isMasterDecrypted
              );

              setShowEncryptedPhones(
                !isMasterDecrypted
              );
            }}
          >

            {isMasterDecrypted
              ? <FaUnlock />
              : <FaLock />}

            <span>
              {isMasterDecrypted
                ? "Data Decrypted (Click to Lock)"
                : "Decrypt All Records"}
            </span>

          </button>

          <div style={ui.statsContainer}>

            <div style={ui.statItem}>

              <span style={ui.statVal}>
                {students.length}
              </span>

              <span style={ui.statLab}>
                Total Enrolled
              </span>

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
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
            />

            <button
              style={{
                ...ui.micBtn,
                color:
                  isListening
                    ? "#ff4d4d"
                    : "#94a3b8"
              }}
              onClick={handleVoiceSearch}
            >
              <FaMicrophone />
            </button>

          </div>

        </div>

        <button
          style={ui.newRegBtn}
          onClick={() =>
            setShowModal(true)
          }
        >
          <FaUserPlus />
          New Admission
        </button>

      </div>

      {/* STUDENTS TABLE */}
      <main style={ui.gridWrapper}>

        <div style={ui.scrollContainer}>

          <table style={ui.enterpriseTable}>

            <thead>

              <tr style={ui.tableHeaderRow}>

                <th style={{ ...ui.th, width: "25%" }}>
                  Student Profile
                </th>

                <th style={{ ...ui.th, width: "12%" }}>
                  Batch/Class
                </th>

                <th style={{ ...ui.th, width: "18%" }}>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                  >

                    <span>
                      Contact No.
                    </span>

                    <button
                      onClick={() =>
                        setShowEncryptedPhones(
                          !showEncryptedPhones
                        )
                      }
                      style={ui.decryptToggleBtn}
                      title={
                        showEncryptedPhones
                          ? "Click to encrypt/mask contacts"
                          : "Click to reveal contacts"
                      }
                    >

                      {showEncryptedPhones ||
                      isMasterDecrypted
                        ? <FaUnlock color="#10b981" />
                        : <FaLock color="#f59e0b" />}

                    </button>

                  </div>

                </th>

                <th style={{ ...ui.th, width: "22%" }}>
                  Address
                </th>

                <th style={{ ...ui.th, width: "13%" }}>
                  Verification
                </th>

                <th
                  style={{
                    ...ui.th,
                    width: "10%",
                    textAlign: "center"
                  }}
                >
                  Actions
                </th>

              </tr>

            </thead>

            <tbody>

              {filteredStudents.map((s) => (

                <tr
                  key={s.id}
                  style={ui.trStyle}
                  className="row-hover"
                >

                  <td style={ui.td}>

                    <div style={ui.identityGroup}>

                      <div style={ui.avatarStyle}>

                        <img
                          src={
                            s.profile_photo ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              s.name
                            )}&background=6366f1&color=fff&bold=true`
                          }
                          alt=""
                          style={ui.avatarImg}
                          onError={(e) => {
                            e.target.src =
                              "https://ui-avatars.com/api/?name=User&background=6366f1&color=fff";
                          }}
                        />

                      </div>

                      <div>

                        <div style={ui.empName}>
                          {s.name}
                        </div>

                        <div style={ui.empId}>
                          UID: {s.id}{" "}
                          {s.code
                            ? `• Code: ${s.code}`
                            : ""}
                        </div>

                      </div>

                    </div>

                  </td>

                  <td style={ui.td}>
                    <span style={ui.deptBadge}>
                      {s.class}
                    </span>
                  </td>

                  <td style={ui.td}>

                    <div style={ui.contactInfo}>

                      <FaPhoneAlt
                        size={11}
                        color="#6366f1"
                      />

                      {maskPhoneNumber(
                        s.mobile
                      )}

                    </div>

                  </td>

                  <td style={ui.td}>

                    <div style={ui.addressInfo}>
                      {s.address || "N/A"}
                    </div>

                  </td>

                  <td style={ui.td}>

                    <span style={ui.statusTag}>
                      <FaCheckCircle size={10} />
                      Active
                    </span>

                  </td>

                  <td style={ui.td}>

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        justifyContent: "center"
                      }}
                    >

                      <button
                        style={ui.rowDetailBtn}
                        onClick={() =>
                          handleViewProfile(s.id)
                        }
                        title="View Full Profile Details"
                      >
                        <FaEye />
                      </button>

                      <button
                        style={ui.rowActionBtn}
                        onClick={() =>
                          handleDelete(s.id)
                        }
                        title="Delete Record"
                      >
                        <FaTrashAlt />
                      </button>

                    </div>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

        {loading && (
          <div style={ui.loaderStyle}>
            Loading secure database...
          </div>
        )}

        {!loading &&
          filteredStudents.length === 0 && (
            <div style={ui.loaderStyle}>
              No matching records found.
            </div>
          )}

      </main>

      {/* NEW ADMISSION MODAL */}
      {showModal && (

        <div style={ui.modalOverlay}>

          <div style={ui.modalContent}>

            <div style={ui.modalHeader}>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px"
                }}
              >

                <FaUserPlus
                  color="#818cf8"
                  size={20}
                />

                <h2
                  style={{
                    margin: 0,
                    fontSize: "20px",
                    fontWeight: "800",
                    color: "#fff"
                  }}
                >
                  Smart Students - New Admission
                </h2>

              </div>

              <button
                onClick={() =>
                  setShowModal(false)
                }
                style={ui.closeModalBtn}
              >
                <FaTimes />
              </button>

            </div>

            <div style={ui.modalBody}>

              {/* PHOTO */}
              <div style={ui.squarePhotoUploadSection}>

                <div style={ui.squarePreviewBox}>

                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      style={ui.avatarImg}
                      alt="Preview"
                    />
                  ) : (
                    <FaCamera
                      size={34}
                      color="#94a3b8"
                    />
                  )}

                </div>

                <label style={ui.squareUploadLabel}>

                  {previewUrl
                    ? "Change Photo"
                    : "Upload Photo"}

                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleFileChange}
                  />

                </label>

              </div>

              <div style={ui.formVerticalGroup}>

                {/* NAME */}
                <div style={ui.fieldBlock}>

                  <label style={ui.labelStyle}>
                    <FaUser size={11} />
                    Full Name *
                  </label>

                  <input
                    name="name"
                    style={ui.panelInput}
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Students Name"
                  />

                </div>

                {/* CLASS */}
                <div style={ui.fieldBlock}>

                  <label style={ui.labelStyle}>
                    <FaGraduationCap size={11} />
                    Class *
                  </label>

                  <select
                    name="class"
                    style={ui.panelInput}
                    value={formData.class}
                    onChange={handleInputChange}
                  >

                    <option value="">
                      Select Class / Standard
                    </option>

                    <option value="LKG">
                      L.K.G
                    </option>

                    <option value="UKG">
                      U.K.G
                    </option>

                    <option value="1st">
                      1st
                    </option>

                    <option value="2nd">
                      2nd
                    </option>

                    <option value="3rd">
                      3rd
                    </option>

                    <option value="4th">
                      4th
                    </option>

                    <option value="5th">
                      5th
                    </option>

                    <option value="6th">
                      6th
                    </option>

                    <option value="7th">
                      7th
                    </option>

                    <option value="8th">
                      8th
                    </option>

                    <option value="9th">
                      9th
                    </option>

                    <option value="10th">
                      10th
                    </option>

                    <option value="11th">
                      11th
                    </option>

                    <option value="12th">
                      12th
                    </option>

                  </select>

                </div>

                {/* MONTHLY FEE - NEW */}
                <div style={ui.fieldBlock}>

                  <label style={ui.labelStyle}>
                    <FaMoneyBillWave size={11} />
                    Monthly Fee
                  </label>

                  <input
                    name="monthly_fee"
                    type="number"
                    min="0"
                    style={ui.panelInput}
                    value={formData.monthly_fee}
                    onChange={handleInputChange}
                    placeholder="Enter monthly fee"
                  />

                </div>

                {/* BOARD - NEW */}
                <div style={ui.fieldBlock}>

                  <label style={ui.labelStyle}>
                    <FaGraduationCap size={11} />
                    Board
                  </label>

                  <select
  name="board"
  style={ui.panelInput}
  value={formData.board}
  onChange={handleInputChange}
>
  <option value="">Select Board</option>
  <option value="CBSE">CBSE</option>
  <option value="MP">MP Board</option>
  <option value="ICSE">ICSE</option>
</select>

                </div>

                {/* PASSWORD */}
                <div style={ui.fieldBlock}>

                  <label style={ui.labelStyle}>
                    <FaLock size={11} />
                    Auth Password *
                  </label>

                  <input
                    name="password"
                    type="password"
                    style={ui.panelInput}
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                  />

                </div>

                {/* MOBILE */}
                <div style={ui.fieldBlock}>

                  <label style={ui.labelStyle}>
                    <FaPhoneAlt size={11} />
                    Mobile Number
                  </label>

                  <input
                    name="mobile"
                    style={ui.panelInput}
                    value={formData.mobile}
                    onChange={handleInputChange}
                    placeholder="10 digit mobile number"
                  />

                </div>

                {/* FATHER */}
                <div style={ui.fieldBlock}>

                  <label style={ui.labelStyle}>
                    <FaUser size={11} />
                    Father's Name
                  </label>

                  <input
                    name="father_name"
                    style={ui.panelInput}
                    value={formData.father_name}
                    onChange={handleInputChange}
                    placeholder="Fathers Name"
                  />

                </div>

                {/* MOTHER */}
                <div style={ui.fieldBlock}>

                  <label style={ui.labelStyle}>
                    <FaUser size={11} />
                    Mother's Name
                  </label>

                  <input
                    name="mother_name"
                    style={ui.panelInput}
                    value={formData.mother_name}
                    onChange={handleInputChange}
                    placeholder="Mothers Name"
                  />

                </div>

                {/* GENDER */}
                <div style={ui.fieldBlock}>

                  <label style={ui.labelStyle}>
                    <FaVenusMars size={11} />
                    Gender
                  </label>

                  <select
                    name="gender"
                    style={ui.panelInput}
                    value={formData.gender}
                    onChange={handleInputChange}
                  >

                    <option value="Male">
                      Male
                    </option>

                    <option value="Female">
                      Female
                    </option>

                    <option value="Other">
                      Other
                    </option>

                  </select>

                </div>

                {/* DOB */}
                <div style={ui.fieldBlock}>

                  <label style={ui.labelStyle}>
                    <FaCalendarAlt size={11} />
                    Date of Birth
                  </label>

                  <input
                    name="dob"
                    type="date"
                    style={ui.panelInput}
                    value={formData.dob}
                    onChange={handleInputChange}
                  />

                </div>

                {/* EMAIL */}
                <div style={ui.fieldBlock}>

                  <label style={ui.labelStyle}>
                    <FaEnvelope size={11} />
                    Email Address
                  </label>

                  <input
                    name="email"
                    type="email"
                    style={ui.panelInput}
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="student@gmail.com"
                  />

                </div>

                {/* CATEGORY */}
                <div style={ui.fieldBlock}>

                  <label style={ui.labelStyle}>
                    <FaLayerGroup size={11} />
                    Category
                  </label>

                  <select
                    name="category"
                    style={ui.panelInput}
                    value={formData.category}
                    onChange={handleInputChange}
                  >

                    <option value="General">
                      General
                    </option>

                    <option value="OBC">
                      OBC
                    </option>

                    <option value="SC">
                      SC
                    </option>

                    <option value="ST">
                      ST
                    </option>

                  </select>

                </div>

                {/* CITY */}
                <div style={ui.fieldBlock}>

                  <label style={ui.labelStyle}>
                    <FaCity size={11} />
                    City
                  </label>

                  <input
                    name="city"
                    style={ui.panelInput}
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Gwalior"
                  />

                </div>

                {/* PINCODE */}
                <div style={ui.fieldBlock}>

                  <label style={ui.labelStyle}>
                    <FaMapPin size={11} />
                    Pincode
                  </label>

                  <input
                    name="pincode"
                    style={ui.panelInput}
                    value={formData.pincode}
                    onChange={handleInputChange}
                    placeholder="474006"
                  />

                </div>

                {/* ADDRESS */}
                <div style={ui.fieldBlock}>

                  <label style={ui.labelStyle}>
                    <FaHome size={11} />
                    Residential Address
                  </label>

                  <textarea
                    name="address"
                    style={ui.panelTextarea}
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Suraiya pura Morar..."
                  />

                </div>

                {/* SUBMIT */}
                <button
                  style={ui.submitRegistrationBtn}
                  onClick={handleRegister}
                  disabled={isRegistering}
                >

                  {isRegistering
                    ? "Syncing with Cloud..."
                    : "Complete Admission & Save Student"}

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
          transform:
            showDetailDrawer
              ? "translateX(0)"
              : "translateX(100%)"
        }}
      >

        <div style={ui.panelHeader}>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}
          >

            <FaShieldAlt color="#818cf8" />

            <h2
              style={{
                margin: 0,
                fontSize: "18px"
              }}
            >
              Student Dossier
            </h2>

          </div>

          <button
            onClick={() =>
              setShowDetailDrawer(false)
            }
            style={ui.closePanelBtn}
          >
            <FaTimes />
          </button>

        </div>

        <div style={ui.panelBody}>

          {detailLoading ? (

            <div
              style={{
                textAlign: "center",
                padding: "60px 0",
                color: "#64748b"
              }}
            >
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "600"
                }}
              >
                Decrypting & Fetching Record...
              </div>
            </div>

          ) : selectedStudent ? (

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "20px"
              }}
            >

              {/* PROFILE */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  background: "#f8fafc",
                  padding: "24px",
                  borderRadius: "16px",
                  border: "1px solid #e2e8f0"
                }}
              >

                <div
                  style={{
                    width: "90px",
                    height: "90px",
                    borderRadius: "20px",
                    overflow: "hidden",
                    marginBottom: "12px",
                    border: "3px solid #6366f1",
                    boxShadow:
                      "0 4px 12px rgba(99,102,241,0.2)"
                  }}
                >

                  <img
                    src={
                      selectedStudent.profile_photo ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        selectedStudent.name ||
                        "Student"
                      )}&background=6366f1&color=fff&bold=true`
                    }
                    alt="Profile"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover"
                    }}
                  />

                </div>

                <h3
                  style={{
                    margin: "0 0 4px 0",
                    fontSize: "18px",
                    color: "#0f172a"
                  }}
                >
                  {selectedStudent.name}
                </h3>

                <span
                  style={{
                    fontSize: "12px",
                    color: "#6366f1",
                    fontWeight: "700",
                    background: "#eef2ff",
                    padding: "3px 10px",
                    borderRadius: "20px"
                  }}
                >
                  UID: {selectedStudent.id}{" "}
                  {selectedStudent.code
                    ? `• ${selectedStudent.code}`
                    : ""}
                </span>

              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px"
                }}
              >

                <div style={ui.detailCard}>
                  <span style={ui.detailLabel}>
                    Assigned Class / Batch
                  </span>

                  <strong style={ui.detailValue}>
                    {selectedStudent.class || "N/A"}
                  </strong>
                </div>

                <div style={ui.detailCard}>
                  <span style={ui.detailLabel}>
                    Monthly Fee
                  </span>

                  <strong style={ui.detailValue}>
                    ₹{selectedStudent.monthly_fee ?? 0}
                  </strong>
                </div>

                <div style={ui.detailCard}>
                  <span style={ui.detailLabel}>
                    Board
                  </span>

                  <strong style={ui.detailValue}>
                    {selectedStudent.board || "N/A"}
                  </strong>
                </div>

                <div style={ui.detailCard}>

                  <span style={ui.detailLabel}>
                    Contact Number
                  </span>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >

                    <strong style={ui.detailValue}>
                      {isMasterDecrypted ||
                      showEncryptedPhones
                        ? (
                          selectedStudent.mobile ||
                          "—"
                        )
                        : maskPhoneNumber(
                          selectedStudent.mobile
                        )}
                    </strong>

                    <FaPhoneAlt
                      size={12}
                      color="#6366f1"
                    />

                  </div>

                </div>

                {selectedStudent.father_name && (
                  <div style={ui.detailCard}>

                    <span style={ui.detailLabel}>
                      Father's Name
                    </span>

                    <strong style={ui.detailValue}>
                      {selectedStudent.father_name}
                    </strong>

                  </div>
                )}

                {selectedStudent.mother_name && (
                  <div style={ui.detailCard}>

                    <span style={ui.detailLabel}>
                      Mother's Name
                    </span>

                    <strong style={ui.detailValue}>
                      {selectedStudent.mother_name}
                    </strong>

                  </div>
                )}

                {selectedStudent.dob && (
                  <div style={ui.detailCard}>

                    <span style={ui.detailLabel}>
                      Date of Birth
                    </span>

                    <strong style={ui.detailValue}>
                      {selectedStudent.dob}
                    </strong>

                  </div>
                )}

                {selectedStudent.email && (
                  <div style={ui.detailCard}>

                    <span style={ui.detailLabel}>
                      Email Address
                    </span>

                    <strong style={ui.detailValue}>
                      {selectedStudent.email}
                    </strong>

                  </div>
                )}

                <div style={ui.detailCard}>

                  <span style={ui.detailLabel}>
                    Residential Address
                  </span>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      marginTop: "4px"
                    }}
                  >

                    <FaMapMarkerAlt
                      size={13}
                      color="#ef4444"
                      style={{ marginTop: "2px" }}
                    />

                    <span
                      style={{
                        fontSize: "13px",
                        color: "#334155",
                        lineHeight: "1.4"
                      }}
                    >
                      {selectedStudent.address ||
                        "No address recorded."}
                    </span>

                  </div>

                </div>

                <div style={ui.detailCard}>

                  <span style={ui.detailLabel}>
                    Admission Session / Date
                  </span>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginTop: "4px"
                    }}
                  >

                    <FaCalendarAlt
                      size={12}
                      color="#10b981"
                    />

                    <span
                      style={{
                        fontSize: "13px",
                        color: "#334155"
                      }}
                    >
                      {selectedStudent.session ||
                        selectedStudent.joining_date ||
                        "2026-27"}
                    </span>

                  </div>

                </div>

              </div>

              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginTop: "10px"
                }}
              >

                <FaCheckCircle color="#16a34a" />

                <span
                  style={{
                    fontSize: "12px",
                    color: "#166534",
                    fontWeight: "600"
                  }}
                >
                  Record securely linked with central database.
                </span>

              </div>

            </div>

          ) : (

            <div
              style={{
                textAlign: "center",
                padding: "40px",
                color: "#64748b"
              }}
            >
              Could not load profile details.
            </div>

          )}

        </div>

      </div>

      {showModal && (
        <div
          style={ui.panelOverlay}
          onClick={() =>
            setShowModal(false)
          }
        />
      )}

      {showDetailDrawer && (
        <div
          style={ui.panelOverlay}
          onClick={() =>
            setShowDetailDrawer(false)
          }
        />
      )}

      <style>{`
        .row-hover:hover {
          background-color: #f8fafc !important;
        }

        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
      `}</style>

    </div>
  );
};

const ui = {

  appContainer: {
    background: "#f8fafc",
    minHeight: "100vh",
    width: "100%",
    overflowX: "hidden",
    fontFamily: "'Inter', system-ui, sans-serif"
  },

  headerSection: {
    display: "flex",
    justifyContent: "space-between",
    padding: "20px 5%",
    background: "#1e293b",
    color: "#fff",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "15px"
  },

  brandGroup: {
    display: "flex",
    alignItems: "center",
    gap: "20px"
  },

  logoBox: {
    width: "50px",
    height: "50px",
    background:
      "linear-gradient(135deg, #6366f1, #4338ca)",
    borderRadius: "14px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "24px",
    boxShadow:
      "0 4px 12px rgba(0,0,0,0.2)"
  },

  mainTitle: {
    fontSize: "22px",
    margin: 0,
    fontWeight: "800",
    letterSpacing: "-0.5px"
  },

  subTitle: {
    fontSize: "12px",
    opacity: 0.6,
    margin: 0
  },

  headerRightActions: {
    display: "flex",
    alignItems: "center",
    gap: "16px"
  },

  masterDecryptBtn: {
    border: "1px solid",
    color: "#fff",
    padding: "10px 18px",
    borderRadius: "10px",
    fontWeight: "700",
    fontSize: "13px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "0.2s",
    boxShadow:
      "0 2px 8px rgba(0,0,0,0.1)"
  },

  statsContainer: {
    display: "flex",
    alignItems: "center",
    background:
      "rgba(255,255,255,0.05)",
    padding: "10px 20px",
    borderRadius: "12px"
  },

  statItem: {
    textAlign: "center"
  },

  statVal: {
    display: "block",
    fontSize: "24px",
    fontWeight: "900",
    color: "#818cf8"
  },

  statLab: {
    fontSize: "10px",
    opacity: 0.7,
    textTransform: "uppercase",
    fontWeight: "700"
  },

  commandBar: {
    display: "flex",
    justifyContent: "space-between",
    padding: "15px 5%",
    borderBottom: "1px solid #e2e8f0",
    background: "#fff",
    alignItems: "center",
    position: "sticky",
    top: 0,
    zIndex: 10,
    flexWrap: "wrap",
    gap: "12px"
  },

  searchCluster: {
    flex: 0.7,
    minWidth: "260px"
  },

  voiceSearchWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center"
  },

  searchIcon: {
    position: "absolute",
    left: "15px",
    color: "#64748b"
  },

  searchField: {
    width: "100%",
    padding: "12px 45px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    background: "#f1f5f9",
    outline: "none",
    fontSize: "15px",
    transition: "0.3s focus"
  },

  micBtn: {
    position: "absolute",
    right: "15px",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "18px"
  },

  newRegBtn: {
    background: "#6366f1",
    color: "#fff",
    border: "none",
    padding: "12px 28px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    transition: "0.2s"
  },

  gridWrapper: {
    width: "100%",
    padding: "0 5%"
  },

  scrollContainer: {
    overflowX: "auto",
    background: "#fff",
    borderRadius: "16px",
    marginTop: "20px",
    boxShadow:
      "0 4px 6px -1px rgba(0,0,0,0.1)"
  },

  enterpriseTable: {
    width: "100%",
    borderCollapse: "collapse"
  },

  tableHeaderRow: {
    background: "#f8fafc",
    borderBottom:
      "2px solid #e2e8f0"
  },

  th: {
    padding: "18px 24px",
    textAlign: "left",
    fontSize: "12px",
    color: "#64748b",
    textTransform: "uppercase",
    fontWeight: "800",
    letterSpacing: "1px"
  },

  td: {
    padding: "16px 24px",
    borderBottom:
      "1px solid #f1f5f9",
    verticalAlign: "middle"
  },

  trStyle: {
    transition: "0.2s"
  },

  identityGroup: {
    display: "flex",
    alignItems: "center",
    gap: "15px"
  },

  avatarStyle: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    overflow: "hidden",
    border: "2px solid #f1f5f9",
    flexShrink: 0
  },

  avatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover"
  },

  empName: {
    fontWeight: "700",
    color: "#0f172a",
    fontSize: "15px"
  },

  empId: {
    fontSize: "11px",
    color: "#64748b",
    fontWeight: "600"
  },

  deptBadge: {
    background: "#eef2ff",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    color: "#4338ca",
    fontWeight: "700",
    border: "1px solid #e0e7ff"
  },

  contactInfo: {
    fontSize: "13px",
    color: "#334155",
    fontWeight: "500",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },

  addressInfo: {
    fontSize: "13px",
    color: "#64748b",
    maxWidth: "260px",
    lineHeight: "1.4",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },

  statusTag: {
    padding: "6px 12px",
    background: "#f0fdf4",
    color: "#166534",
    borderRadius: "8px",
    fontSize: "11px",
    fontWeight: "700",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    border: "1px solid #dcfce7"
  },

  rowDetailBtn: {
    background: "#eef2ff",
    border: "none",
    color: "#4338ca",
    padding: "10px",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "0.2s"
  },

  rowActionBtn: {
    background: "#fef2f2",
    border: "none",
    color: "#ef4444",
    padding: "10px",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "0.2s"
  },

  decryptToggleBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    fontSize: "14px",
    padding: "4px"
  },

  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background:
      "rgba(15, 23, 42, 0.6)",
    backdropFilter: "blur(5px)",
    zIndex: 1000,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px"
  },

  modalContent: {
    background: "#fff",
    width: "100%",
    maxWidth: "650px",
    maxHeight: "90vh",
    borderRadius: "20px",
    display: "flex",
    flexDirection: "column",
    boxShadow:
      "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    overflow: "hidden"
  },

  modalHeader: {
    padding: "20px 24px",
    background: "#1e293b",
    color: "#fff",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },

  closeModalBtn: {
    background:
      "rgba(255,255,255,0.1)",
    border: "none",
    color: "#fff",
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },

  modalBody: {
    padding: "28px",
    overflowY: "auto",
    flex: 1
  },

  squarePhotoUploadSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: "25px",
    background: "#f8fafc",
    padding: "20px",
    borderRadius: "14px",
    border: "1px solid #e2e8f0"
  },

  squarePreviewBox: {
    width: "110px",
    height: "110px",
    borderRadius: "12px",
    background: "#fff",
    border: "2px dashed #cbd5e1",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: "12px",
    boxShadow:
      "0 4px 6px -1px rgba(0,0,0,0.05)"
  },

  squareUploadLabel: {
    color: "#6366f1",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    background: "#eef2ff",
    padding: "8px 16px",
    borderRadius: "8px",
    border: "1px solid #e0e7ff"
  },

  formVerticalGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  },

  fieldBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },

  detailDrawer: {
    position: "fixed",
    top: 0,
    right: 0,
    width: "420px",
    maxWidth: "100%",
    height: "100%",
    background: "#fff",
    zIndex: 1000,
    transition:
      "0.4s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow:
      "-20px 0 50px rgba(0,0,0,0.15)",
    display: "flex",
    flexDirection: "column"
  },

  panelHeader: {
    padding: "24px",
    background: "#1e293b",
    color: "#fff",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },

  closePanelBtn: {
    background:
      "rgba(255,255,255,0.1)",
    border: "none",
    color: "#fff",
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },

  panelBody: {
    padding: "28px",
    overflowY: "auto",
    flex: 1
  },

  detailCard: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    padding: "14px 16px",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  },

  detailLabel: {
    fontSize: "10px",
    textTransform: "uppercase",
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: "0.5px"
  },

  detailValue: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#0f172a"
  },

  labelStyle: {
    fontSize: "11px",
    fontWeight: "800",
    color: "#64748b",
    textTransform: "uppercase",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },

  panelInput: {
    padding: "12px 16px",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    fontSize: "14px",
    outline: "none",
    background: "#f8fafc",
    transition: "0.2s focus",
    width: "100%",
    boxSizing: "border-box"
  },

  panelTextarea: {
    padding: "12px 16px",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    height: "90px",
    fontSize: "14px",
    outline: "none",
    background: "#f8fafc",
    resize: "none",
    width: "100%",
    boxSizing: "border-box"
  },

  submitRegistrationBtn: {
    background: "#6366f1",
    color: "#fff",
    border: "none",
    padding: "16px",
    borderRadius: "12px",
    fontWeight: "700",
    cursor: "pointer",
    marginTop: "10px",
    fontSize: "15px",
    width: "100%",
    boxShadow:
      "0 4px 12px rgba(99,102,241,0.3)"
  },

  panelOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.4)",
    zIndex: 999
  },

  loaderStyle: {
    textAlign: "center",
    padding: "100px",
    color: "#64748b",
    fontSize: "15px",
    fontWeight: "500"
  }

};

export default ManageStudents;
