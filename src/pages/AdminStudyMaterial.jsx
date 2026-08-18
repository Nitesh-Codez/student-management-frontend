import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const AdminStudyMaterial = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [file, setFile] = useState(null);

  const [materials, setMaterials] = useState([]);
  const [allMaterials, setAllMaterials] = useState([]);

  const [search, setSearch] = useState("");
  const [activeSubject, setActiveSubject] = useState("All");

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const [viewMode, setViewMode] = useState("grid");

  const subjects = [
    "Hindi",
    "English",
    "Maths",
    "Science",
    "S.S.T",
    "History",
    "Geography",
    "Civics",
    "Chemistry",
    "Biology",
    "Physics",
    "Computer",
  ];

  // ================= FETCH CLASSES =================
  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await api.get("/api/students");

      if (res.data.success) {
        const uniqueClasses = [
          ...new Set(
            res.data.students
              .map((s) => s.class)
              .filter(Boolean)
          ),
        ];

        const sorted = uniqueClasses.sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true })
        );

        setClasses(sorted);

        // ALL classes initially
        fetchAllMaterials(sorted);
      }
    } catch (err) {
      console.error("Classes fetch failed:", err);
    }
  };

  // ================= FETCH ALL MATERIALS =================
  const fetchAllMaterials = async (classList = classes) => {
    try {
      setLoading(true);

      const results = await Promise.all(
        classList.map(async (cls) => {
          try {
            const res = await api.get(`/api/study-material/${cls}`);

            if (
              res.data.success &&
              Array.isArray(res.data.materials)
            ) {
              return res.data.materials;
            }

            return [];
          } catch {
            return [];
          }
        })
      );

      const combined = results.flat();

      setAllMaterials(combined);
      setMaterials(combined);
    } catch (err) {
      console.error("All materials fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // ================= FETCH SELECTED CLASS =================
  const fetchMaterials = async (cls) => {
    try {
      setLoading(true);

      if (!cls) {
        setMaterials(allMaterials);
        setActiveSubject("All");
        return;
      }

      const res = await api.get(`/api/study-material/${cls}`);

      if (
        res.data.success &&
        Array.isArray(res.data.materials)
      ) {
        setMaterials(res.data.materials);
      } else {
        setMaterials([]);
      }

      setActiveSubject("All");
    } catch (err) {
      console.error("Fetch failed:", err);
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  // ================= CLASS CHANGE =================
  const handleClassChange = (cls) => {
    setSelectedClass(cls);
    setSearch("");
    setActiveSubject("All");

    if (cls) {
      fetchMaterials(cls);
    } else {
      setMaterials(allMaterials);
    }
  };

  // ================= UPLOAD =================
  const handleUpload = async () => {
    if (!title || !subject || !selectedClass || !file) {
      setMessage("⚠️ Please complete all fields.");
      return;
    }

    try {
      setUploading(true);
      setMessage("");

      const formData = new FormData();

      formData.append("title", title);
      formData.append("class_name", selectedClass);
      formData.append("subject", subject);
      formData.append("file", file);

      const res = await api.post(
        "/api/study-material/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (res.data.success) {
        setMessage("✅ Material uploaded successfully!");

        setTitle("");
        setSubject("");
        setFile(null);

        document.getElementById("pdfUpload").value = "";

        await fetchAllMaterials(classes);
        await fetchMaterials(selectedClass);
      }
    } catch (err) {
      setMessage(
        err.response?.data?.message ||
          "❌ Upload failed. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  // ================= DOWNLOAD =================
  const getDownloadUrl = (material) => {
    if (material.storage_type === "cloudinary") {
      return `${material.file_path}?fl_attachment=true`;
    }

    return material.file_path;
  };

  // ================= FILTER =================
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchesSubject =
        activeSubject === "All" ||
        m.subject?.toLowerCase() ===
          activeSubject.toLowerCase();

      const query = search.toLowerCase().trim();

      const matchesSearch =
        !query ||
        m.title?.toLowerCase().includes(query) ||
        m.subject?.toLowerCase().includes(query) ||
        m.class_name?.toLowerCase().includes(query);

      return matchesSubject && matchesSearch;
    });
  }, [materials, activeSubject, search]);

  // ================= STATS =================
  const totalMaterials = materials.length;

  const totalSubjects = new Set(
    materials.map((m) => m.subject)
  ).size;

  const totalClasses = new Set(
    materials.map((m) => m.class_name)
  ).size;

  // ================= SUBJECT COUNTS =================
  const subjectCounts = useMemo(() => {
    const counts = {};

    materials.forEach((m) => {
      counts[m.subject] =
        (counts[m.subject] || 0) + 1;
    });

    return counts;
  }, [materials]);

  return (
    <div style={styles.page}>
      {/* ================= TOP NAV ================= */}
      <header style={styles.topHeader}>
        <div style={styles.brandArea}>
          <div style={styles.logoBox}>📚</div>

          <div>
            <div style={styles.brandTitle}>
              Smart Student Library
            </div>

            <div style={styles.brandSubtitle}>
              Academic Resource Management
            </div>
          </div>
        </div>

        <div style={styles.headerBadge}>
          🛡️ Admin Library
        </div>
      </header>

      {/* ================= HERO ================= */}
      <section style={styles.hero}>
        <div style={styles.heroText}>
          <div style={styles.heroSmall}>
            DIGITAL ACADEMIC LIBRARY
          </div>

          <h1 style={styles.heroTitle}>
            Everything your students
            <br />
            <span style={styles.heroGradient}>
              need to learn.
            </span>
          </h1>

          <p style={styles.heroDescription}>
            Organize notes, chapters, study material and
            resources class-wise and subject-wise in one
            powerful library.
          </p>
        </div>

        <div style={styles.heroIcon}>
          📖
        </div>
      </section>

      {/* ================= STATS ================= */}
      <section style={styles.statsGrid}>
        <StatCard
          icon="📚"
          title="Total Materials"
          value={totalMaterials}
          text="Available resources"
          type="purple"
        />

        <StatCard
          icon="🎓"
          title="Classes"
          value={totalClasses}
          text="Classes covered"
          type="blue"
        />

        <StatCard
          icon="📘"
          title="Subjects"
          value={totalSubjects}
          text="Active subjects"
          type="green"
        />

        <StatCard
          icon="⚡"
          title="Library Status"
          value="LIVE"
          text="System operational"
          type="orange"
        />
      </section>

      {/* ================= MAIN GRID ================= */}
      <div style={styles.mainGrid}>
        {/* ================= UPLOAD PANEL ================= */}
        <section style={styles.uploadPanel}>
          <div style={styles.panelHeader}>
            <div>
              <div style={styles.panelKicker}>
                LIBRARY MANAGEMENT
              </div>

              <h2 style={styles.panelTitle}>
                Add New Material
              </h2>
            </div>

            <div style={styles.uploadIcon}>
              ⬆
            </div>
          </div>

          <div style={styles.form}>
            {/* CLASS */}
            <div style={styles.field}>
              <label style={styles.label}>
                CLASS
              </label>

              <select
                value={selectedClass}
                onChange={(e) =>
                  handleClassChange(e.target.value)
                }
                style={styles.input}
              >
                <option value="">
                  Select class
                </option>

                {classes.map((cls, index) => (
                  <option key={index} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            {/* SUBJECT */}
            <div style={styles.field}>
              <label style={styles.label}>
                SUBJECT
              </label>

              <select
                value={subject}
                onChange={(e) =>
                  setSubject(e.target.value)
                }
                style={styles.input}
              >
                <option value="">
                  Select subject
                </option>

                {subjects.map((sub, index) => (
                  <option key={index} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            {/* TITLE */}
            <div style={styles.field}>
              <label style={styles.label}>
                MATERIAL TITLE
              </label>

              <input
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
                placeholder="e.g. Chapter 1 - Real Numbers"
                style={styles.input}
              />
            </div>

            {/* FILE */}
            <div style={styles.field}>
              <label style={styles.label}>
                PDF DOCUMENT
              </label>

              <label style={styles.fileDrop}>
                <div style={styles.fileIcon}>
                  📄
                </div>

                <div>
                  <strong>
                    {file
                      ? file.name
                      : "Choose PDF file"}
                  </strong>

                  <small>
                    {file
                      ? `${(
                          file.size /
                          1024 /
                          1024
                        ).toFixed(2)} MB`
                      : "PDF documents only"}
                  </small>
                </div>

                <input
                  id="pdfUpload"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) =>
                    setFile(e.target.files[0])
                  }
                  style={{ display: "none" }}
                />
              </label>
            </div>

            {/* MESSAGE */}
            {message && (
              <div
                style={{
                  ...styles.message,
                  color: message.startsWith("✅")
                    ? "#047857"
                    : "#b91c1c",
                  background:
                    message.startsWith("✅")
                      ? "#ecfdf5"
                      : "#fef2f2",
                }}
              >
                {message}
              </div>
            )}

            {/* BUTTON */}
            <button
              onClick={handleUpload}
              disabled={uploading}
              style={{
                ...styles.uploadButton,
                opacity: uploading ? 0.7 : 1,
              }}
            >
              {uploading
                ? "Uploading..."
                : "⬆  Upload to Library"}
            </button>
          </div>
        </section>

        {/* ================= LIBRARY PANEL ================= */}
        <section style={styles.libraryPanel}>
          <div style={styles.libraryHeader}>
            <div>
              <div style={styles.panelKicker}>
                RESOURCE EXPLORER
              </div>

              <h2 style={styles.panelTitle}>
                Browse Library
              </h2>
            </div>

            <div style={styles.viewButtons}>
              <button
                onClick={() => setViewMode("grid")}
                style={{
                  ...styles.viewButton,
                  background:
                    viewMode === "grid"
                      ? "#111827"
                      : "#f8fafc",
                  color:
                    viewMode === "grid"
                      ? "#fff"
                      : "#64748b",
                }}
              >
                ▦
              </button>

              <button
                onClick={() => setViewMode("list")}
                style={{
                  ...styles.viewButton,
                  background:
                    viewMode === "list"
                      ? "#111827"
                      : "#f8fafc",
                  color:
                    viewMode === "list"
                      ? "#fff"
                      : "#64748b",
                }}
              >
                ☰
              </button>
            </div>
          </div>

          {/* SEARCH */}
          <div style={styles.searchBox}>
            <span>⌕</span>

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search chapter, subject or class..."
              style={styles.searchInput}
            />

            {search && (
              <button
                onClick={() => setSearch("")}
                style={styles.clearButton}
              >
                ×
              </button>
            )}
          </div>

          {/* CLASS FILTER */}
          <div style={styles.filterRow}>
            <button
              onClick={() => handleClassChange("")}
              style={{
                ...styles.classFilter,
                background:
                  !selectedClass
                    ? "#111827"
                    : "#fff",
                color:
                  !selectedClass
                    ? "#fff"
                    : "#475569",
              }}
            >
              All Classes
            </button>

            {classes.map((cls) => (
              <button
                key={cls}
                onClick={() =>
                  handleClassChange(cls)
                }
                style={{
                  ...styles.classFilter,
                  background:
                    selectedClass === cls
                      ? "#4f46e5"
                      : "#fff",
                  color:
                    selectedClass === cls
                      ? "#fff"
                      : "#475569",
                }}
              >
                Class {cls}
              </button>
            ))}
          </div>

          {/* SUBJECT FILTER */}
          <div style={styles.subjectScroll}>
            <button
              onClick={() =>
                setActiveSubject("All")
              }
              style={{
                ...styles.subjectButton,
                background:
                  activeSubject === "All"
                    ? "#ede9fe"
                    : "#f8fafc",
                color:
                  activeSubject === "All"
                    ? "#6d28d9"
                    : "#64748b",
              }}
            >
              All
            </button>

            {subjects
              .filter(
                (sub) => subjectCounts[sub]
              )
              .map((sub) => (
                <button
                  key={sub}
                  onClick={() =>
                    setActiveSubject(sub)
                  }
                  style={{
                    ...styles.subjectButton,
                    background:
                      activeSubject === sub
                        ? "#ede9fe"
                        : "#f8fafc",
                    color:
                      activeSubject === sub
                        ? "#6d28d9"
                        : "#64748b",
                  }}
                >
                  {sub}
                  <span style={styles.countBadge}>
                    {subjectCounts[sub]}
                  </span>
                </button>
              ))}
          </div>

          {/* RESULT COUNT */}
          <div style={styles.resultBar}>
            <span>
              Showing{" "}
              <strong>
                {filteredMaterials.length}
              </strong>{" "}
              resources
            </span>

            {(selectedClass ||
              activeSubject !== "All" ||
              search) && (
              <button
                onClick={() => {
                  setSelectedClass("");
                  setActiveSubject("All");
                  setSearch("");
                  setMaterials(allMaterials);
                }}
                style={styles.resetButton}
              >
                Reset filters
              </button>
            )}
          </div>

          {/* ================= MATERIALS ================= */}
          {loading ? (
            <div style={styles.emptyState}>
              <div style={styles.loader}></div>

              <h3>
                Loading library...
              </h3>

              <p>
                Fetching your academic resources
              </p>
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>
                📭
              </div>

              <h3>
                No materials found
              </h3>

              <p>
                Try another class, subject or search
                keyword.
              </p>
            </div>
          ) : (
            <div
              style={{
                ...styles.materialGrid,
                gridTemplateColumns:
                  viewMode === "grid"
                    ? "repeat(auto-fill, minmax(230px, 1fr))"
                    : "1fr",
              }}
            >
              {filteredMaterials.map(
                (material, index) => (
                  <MaterialCard
                    key={material.id || index}
                    material={material}
                    viewMode={viewMode}
                    getDownloadUrl={
                      getDownloadUrl
                    }
                  />
                )
              )}
            </div>
          )}
        </section>
      </div>

      <div style={styles.footer}>
        <span>
          📚 Smart Student Classes
        </span>

        <span>
          Digital Academic Library
        </span>
      </div>
    </div>
  );
};

/* =========================================================
   STAT CARD
========================================================= */

const StatCard = ({
  icon,
  title,
  value,
  text,
  type,
}) => {
  const colors = {
    purple: "#7c3aed",
    blue: "#2563eb",
    green: "#059669",
    orange: "#ea580c",
  };

  return (
    <div style={styles.statCard}>
      <div
        style={{
          ...styles.statIcon,
          background: `${colors[type]}15`,
          color: colors[type],
        }}
      >
        {icon}
      </div>

      <div>
        <div style={styles.statTitle}>
          {title}
        </div>

        <div
          style={{
            ...styles.statValue,
            color: colors[type],
          }}
        >
          {value}
        </div>

        <div style={styles.statText}>
          {text}
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   MATERIAL CARD
========================================================= */

const MaterialCard = ({
  material,
  viewMode,
  getDownloadUrl,
}) => {
  const getSubjectIcon = (subject) => {
    const icons = {
      Maths: "📐",
      Mathematics: "📐",
      Science: "🔬",
      Chemistry: "⚗️",
      Biology: "🧬",
      Physics: "⚛️",
      English: "📖",
      Hindi: "🪶",
      History: "🏛️",
      Geography: "🌍",
      Civics: "⚖️",
      Computer: "💻",
      "S.S.T": "🌎",
    };

    return icons[subject] || "📚";
  };

  if (viewMode === "list") {
    return (
      <div style={styles.listCard}>
        <div style={styles.listIcon}>
          {getSubjectIcon(material.subject)}
        </div>

        <div style={styles.listInfo}>
          <div style={styles.subjectMini}>
            {material.subject}
          </div>

          <h3 style={styles.listTitle}>
            {material.title}
          </h3>

          <span style={styles.classMini}>
            Class {material.class_name}
          </span>
        </div>

        <div style={styles.listActions}>
          <a
            href={material.file_path}
            target="_blank"
            rel="noreferrer"
            style={styles.viewButtonLarge}
          >
            👁 View
          </a>

          <a
            href={getDownloadUrl(material)}
            target="_blank"
            rel="noreferrer"
            style={styles.downloadButton}
          >
            ↓
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.materialCard}>
      <div style={styles.materialTop}>
        <div style={styles.pdfIcon}>
          📄
        </div>

        <div style={styles.subjectPill}>
          {material.subject}
        </div>
      </div>

      <div style={styles.materialBody}>
        <h3 style={styles.materialTitle}>
          {material.title}
        </h3>

        <div style={styles.materialClass}>
          🎓 Class {material.class_name}
        </div>
      </div>

      <div style={styles.cardActions}>
        <a
          href={material.file_path}
          target="_blank"
          rel="noreferrer"
          style={styles.viewButtonLarge}
        >
          👁 View
        </a>

        <a
          href={getDownloadUrl(material)}
          target="_blank"
          rel="noreferrer"
          style={styles.downloadButton}
        >
          ↓
        </a>
      </div>
    </div>
  );
};

/* =========================================================
   STYLES
========================================================= */

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#f8fafc 0%,#eef2ff 45%,#f8fafc 100%)",
    fontFamily:
      "'Inter','Poppins',Arial,sans-serif",
    color: "#111827",
    boxSizing: "border-box",
  },

  topHeader: {
    height: "72px",
    background: "rgba(255,255,255,.88)",
    backdropFilter: "blur(18px)",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 5%",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },

  brandArea: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  logoBox: {
    width: "42px",
    height: "42px",
    borderRadius: "13px",
    background:
      "linear-gradient(135deg,#4f46e5,#7c3aed)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "21px",
    boxShadow:
      "0 8px 20px rgba(79,70,229,.25)",
  },

  brandTitle: {
    fontSize: "17px",
    fontWeight: "800",
    letterSpacing: "-.3px",
  },

  brandSubtitle: {
    fontSize: "10px",
    color: "#94a3b8",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: ".7px",
  },

  headerBadge: {
    background: "#f1f5f9",
    color: "#475569",
    padding: "9px 14px",
    borderRadius: "30px",
    fontSize: "12px",
    fontWeight: "700",
  },

  hero: {
    maxWidth: "1300px",
    margin: "30px auto 20px",
    padding: "38px 42px",
    borderRadius: "28px",
    position: "relative",
    overflow: "hidden",
    background:
      "linear-gradient(120deg,#111827,#312e81,#4f46e5)",
    color: "#fff",
    boxShadow:
      "0 25px 60px rgba(79,70,229,.20)",
  },

  heroText: {
    position: "relative",
    zIndex: 2,
    maxWidth: "650px",
  },

  heroSmall: {
    fontSize: "10px",
    fontWeight: "800",
    letterSpacing: "2px",
    color: "#c4b5fd",
    marginBottom: "10px",
  },

  heroTitle: {
    margin: 0,
    fontSize: "36px",
    lineHeight: "1.15",
    letterSpacing: "-1.3px",
  },

  heroGradient: {
    color: "#a5b4fc",
  },

  heroDescription: {
    margin: "15px 0 0",
    fontSize: "14px",
    lineHeight: "1.7",
    color: "#cbd5e1",
  },

  heroIcon: {
    position: "absolute",
    right: "8%",
    top: "15px",
    fontSize: "150px",
    opacity: ".10",
    transform: "rotate(-10deg)",
  },

  statsGrid: {
    maxWidth: "1300px",
    margin: "0 auto 24px",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(210px,1fr))",
    gap: "15px",
    padding: "0 20px",
    boxSizing: "border-box",
  },

  statCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "18px",
    display: "flex",
    gap: "14px",
    alignItems: "center",
    boxShadow:
      "0 8px 25px rgba(15,23,42,.04)",
  },

  statIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "14px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "21px",
  },

  statTitle: {
    fontSize: "11px",
    color: "#64748b",
    fontWeight: "700",
    textTransform: "uppercase",
  },

  statValue: {
    fontSize: "23px",
    fontWeight: "900",
    margin: "2px 0",
  },

  statText: {
    fontSize: "10px",
    color: "#94a3b8",
  },

  mainGrid: {
    maxWidth: "1300px",
    margin: "0 auto",
    padding: "0 20px 40px",
    display: "grid",
    gridTemplateColumns:
      "330px minmax(0,1fr)",
    gap: "20px",
    boxSizing: "border-box",
  },

  uploadPanel: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "22px",
    padding: "22px",
    height: "fit-content",
    boxShadow:
      "0 10px 30px rgba(15,23,42,.05)",
  },

  libraryPanel: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "22px",
    padding: "22px",
    minWidth: 0,
    boxShadow:
      "0 10px 30px rgba(15,23,42,.05)",
  },

  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "22px",
  },

  libraryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "18px",
  },

  panelKicker: {
    color: "#6366f1",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "1.5px",
    marginBottom: "4px",
  },

  panelTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "850",
    letterSpacing: "-.5px",
  },

  uploadIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    background: "#eef2ff",
    color: "#4f46e5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "19px",
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },

  label: {
    fontSize: "10px",
    color: "#64748b",
    fontWeight: "800",
    letterSpacing: ".8px",
  },

  input: {
    width: "100%",
    height: "44px",
    padding: "0 12px",
    borderRadius: "11px",
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    outline: "none",
    fontSize: "13px",
    color: "#1e293b",
    boxSizing: "border-box",
  },

  fileDrop: {
    minHeight: "70px",
    borderRadius: "13px",
    border: "1.5px dashed #cbd5e1",
    background: "#f8fafc",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 13px",
    cursor: "pointer",
    boxSizing: "border-box",
  },

  fileIcon: {
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    background: "#fee2e2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
  },

  uploadButton: {
    border: "none",
    height: "46px",
    borderRadius: "12px",
    background:
      "linear-gradient(135deg,#4f46e5,#7c3aed)",
    color: "#fff",
    fontSize: "13px",
    fontWeight: "800",
    cursor: "pointer",
    boxShadow:
      "0 10px 20px rgba(79,70,229,.22)",
  },

  message: {
    padding: "10px 12px",
    borderRadius: "10px",
    fontSize: "12px",
    fontWeight: "700",
  },

  searchBox: {
    height: "46px",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    background: "#f8fafc",
    display: "flex",
    alignItems: "center",
    gap: "9px",
    padding: "0 13px",
  },

  searchInput: {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: "13px",
    color: "#334155",
  },

  clearButton: {
    border: "none",
    background: "none",
    fontSize: "20px",
    color: "#94a3b8",
    cursor: "pointer",
  },

  filterRow: {
    display: "flex",
    gap: "7px",
    overflowX: "auto",
    padding: "13px 0 8px",
  },

  classFilter: {
    border: "1px solid #e2e8f0",
    padding: "7px 12px",
    borderRadius: "9px",
    whiteSpace: "nowrap",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: "700",
  },

  subjectScroll: {
    display: "flex",
    gap: "7px",
    overflowX: "auto",
    paddingBottom: "13px",
  },

  subjectButton: {
    border: "none",
    padding: "7px 10px",
    borderRadius: "9px",
    whiteSpace: "nowrap",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: "700",
    display: "flex",
    gap: "5px",
    alignItems: "center",
  },

  countBadge: {
    fontSize: "9px",
    background: "#fff",
    padding: "2px 5px",
    borderRadius: "5px",
  },

  resultBar: {
    borderTop: "1px solid #f1f5f9",
    padding: "13px 0",
    display: "flex",
    justifyContent: "space-between",
    color: "#64748b",
    fontSize: "11px",
  },

  resetButton: {
    border: "none",
    background: "none",
    color: "#6366f1",
    cursor: "pointer",
    fontWeight: "800",
  },

  materialGrid: {
    display: "grid",
    gap: "12px",
  },

  materialCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "15px",
    background: "#fff",
    transition: "all .25s ease",
  },

  materialTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  pdfIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    background: "#fff1f2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
  },

  subjectPill: {
    background: "#f1f5f9",
    color: "#475569",
    padding: "5px 8px",
    borderRadius: "7px",
    fontSize: "9px",
    fontWeight: "800",
  },

  materialBody: {
    padding: "15px 0",
    minHeight: "75px",
  },
};

export default AdminStudyMaterial;