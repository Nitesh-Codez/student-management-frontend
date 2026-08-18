import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaFilePdf,
  FaDownload,
  FaTimes,
  FaSearch,
  FaArrowRight,
  FaBookOpen,
  FaLayerGroup,
  FaClock,
  FaBook,
} from "react-icons/fa";

/* =========================================================
   PROFESSIONAL SUBJECT THEMES
========================================================= */

const subjectThemes = {
  Math: {
    primary: "#4F46E5",
    light: "#EEF2FF",
    soft: "#F8F9FF",
  },

  Maths: {
    primary: "#4F46E5",
    light: "#EEF2FF",
    soft: "#F8F9FF",
  },

  Science: {
    primary: "#0F766E",
    light: "#F0FDFA",
    soft: "#F7FFFE",
  },

  English: {
    primary: "#2563EB",
    light: "#EFF6FF",
    soft: "#F7FAFF",
  },

  Hindi: {
    primary: "#C2410C",
    light: "#FFF7ED",
    soft: "#FFFBF7",
  },

  Physics: {
    primary: "#6D28D9",
    light: "#F5F3FF",
    soft: "#FAF9FF",
  },

  Chemistry: {
    primary: "#0369A1",
    light: "#F0F9FF",
    soft: "#F7FCFF",
  },

  Biology: {
    primary: "#15803D",
    light: "#F0FDF4",
    soft: "#F8FFF9",
  },

  History: {
    primary: "#92400E",
    light: "#FFFBEB",
    soft: "#FFFDF7",
  },

  Geography: {
    primary: "#0F766E",
    light: "#F0FDFA",
    soft: "#F7FFFE",
  },

  Civics: {
    primary: "#BE123C",
    light: "#FFF1F2",
    soft: "#FFF9FA",
  },

  Default: {
    primary: "#475569",
    light: "#F1F5F9",
    soft: "#F8FAFC",
  },
};

const getTheme = (subject) =>
  subjectThemes[subject] || subjectThemes.Default;

/* =========================================================
   COMPONENT
========================================================= */

const StudentStudyMaterial = () => {
  const studentClass =
    localStorage.getItem("studentClass")?.replace("class-", "") || "10";

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeSubject, setActiveSubject] = useState("All");

  const [viewFile, setViewFile] = useState(null);
  const [viewTitle, setViewTitle] = useState("");

  const [downloadingId, setDownloadingId] = useState(null);

  /* =======================================================
     FETCH MATERIAL
  ======================================================= */

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        setLoading(true);

        const res = await api.get(
          `/api/study-material/${studentClass}`
        );

        if (res.data.success) {
          setMaterials(res.data.materials || []);
        }
      } catch (err) {
        console.error("Study material error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMaterials();
  }, [studentClass]);

  /* =======================================================
     SUBJECTS
  ======================================================= */

  const subjects = useMemo(() => {
    const uniqueSubjects = [
      ...new Set(
        materials
          .map((item) => item.subject)
          .filter(Boolean)
      ),
    ];

    return ["All", ...uniqueSubjects];
  }, [materials]);

  /* =======================================================
     SUBJECT COUNTS
  ======================================================= */

  const subjectCounts = useMemo(() => {
    const counts = {};

    materials.forEach((item) => {
      if (item.subject) {
        counts[item.subject] =
          (counts[item.subject] || 0) + 1;
      }
    });

    return counts;
  }, [materials]);

  /* =======================================================
     FILTER + SEARCH
  ======================================================= */

  const filteredMaterials = useMemo(() => {
    const search = searchTerm
      .toLowerCase()
      .trim();

    return materials.filter((item) => {
      const subject =
        item.subject?.toLowerCase() || "";

      const title =
        item.title?.toLowerCase() || "";

      const matchesSubject =
        activeSubject === "All" ||
        item.subject === activeSubject;

      const matchesSearch =
        !search ||
        title.includes(search) ||
        subject.includes(search);

      return matchesSubject && matchesSearch;
    });
  }, [materials, searchTerm, activeSubject]);

  /* =======================================================
     GROUP MATERIALS
  ======================================================= */

  const grouped = useMemo(() => {
    return filteredMaterials.reduce((acc, item) => {
      const subject = item.subject || "Other";

      if (!acc[subject]) {
        acc[subject] = [];
      }

      acc[subject].push(item);

      return acc;
    }, {});
  }, [filteredMaterials]);

  /* =======================================================
     OPEN PDF READER
     DO NOT CHANGE
  ======================================================= */

  const openReader = (file, title) => {
    setViewFile(file);
    setViewTitle(title);
    document.body.style.overflow = "hidden";
  };

  const closeReader = () => {
    setViewFile(null);
    setViewTitle("");
    document.body.style.overflow = "auto";
  };

  /* =======================================================
     DOWNLOAD PDF
========================================================= */

  const downloadPDF = async (fileUrl, title, id) => {
    if (!fileUrl) return;

    try {
      setDownloadingId(id);

      const response = await fetch(fileUrl);

      if (!response.ok) {
        throw new Error("Unable to download file");
      }

      const blob = await response.blob();

      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = blobUrl;

      const safeName =
        (title || "study-material")
          .replace(/[<>:"/\\|?*]+/g, "")
          .trim() || "study-material";

      link.download = `${safeName}.pdf`;

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("PDF download failed:", error);

      /*
       * Fallback
       * Useful when Cloudinary/server does not allow
       * browser-side fetching because of CORS.
       */
      const link = document.createElement("a");

      link.href = fileUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloadingId(null);
    }
  };

  /* =======================================================
     STATS
  ======================================================= */

  const totalSubjects =
    subjects.length > 0
      ? subjects.length - 1
      : 0;

  /* =======================================================
     RESET FILTERS
  ======================================================= */

  const resetFilters = () => {
    setSearchTerm("");
    setActiveSubject("All");
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div style={styles.page}>

      {/* ===================================================
          PDF READER
          SAME AS BEFORE
      =================================================== */}

      <AnimatePresence>
        {viewFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.viewerOverlay}
          >
            <div style={styles.viewerHeader}>

              <div style={styles.viewerLeft}>

                <div style={styles.viewerPdfIcon}>
                  <FaFilePdf />
                </div>

                <div>
                  <div style={styles.viewerTitle}>
                    {viewTitle}
                  </div>

                  <div style={styles.viewerSub}>
                    Class {studentClass} • PDF Reader
                  </div>
                </div>

              </div>

              <button
                onClick={closeReader}
                style={styles.closeButton}
              >
                <FaTimes />
              </button>

            </div>

            <iframe
              src={viewFile}
              title="Study Material Reader"
              style={styles.iframe}
            />

          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================================================
          HERO
      =================================================== */}

      <section style={styles.hero}>

        <div style={styles.heroGlowOne} />
        <div style={styles.heroGlowTwo} />

        <div style={styles.heroInner}>

          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            style={styles.libraryBadge}
          >
            <FaBookOpen />
            SMART STUDENTS LIBRARY
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            style={styles.heroTitle}
          >
            Your Learning{" "}
            <span style={styles.heroTitleAccent}>
              Library
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            style={styles.heroDescription}
          >
            Study material, chapters and resources
            for your Class {studentClass} syllabus.
          </motion.p>

          {/* SEARCH */}

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={styles.searchBox}
          >

            <FaSearch style={styles.searchIcon} />

            <input
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
              placeholder="Search chapters, topics or subjects..."
              style={styles.searchInput}
            />

            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                style={styles.clearSearch}
                aria-label="Clear search"
              >
                <FaTimes />
              </button>
            )}

          </motion.div>

          {/* STATS */}

          <div style={styles.heroStats}>

            <div style={styles.heroStat}>
              <div style={styles.statIcon}>
                <FaBook />
              </div>

              <div style={styles.statContent}>
                <strong>
                  {materials.length}
                </strong>

                <span>
                  Resources
                </span>
              </div>
            </div>

            <div style={styles.heroDivider} />

            <div style={styles.heroStat}>
              <div style={styles.statIcon}>
                <FaLayerGroup />
              </div>

              <div style={styles.statContent}>
                <strong>
                  {totalSubjects}
                </strong>

                <span>
                  Subjects
                </span>
              </div>
            </div>

            <div style={styles.heroDivider} />

            <div style={styles.heroStat}>
              <div style={styles.statIcon}>
                <FaClock />
              </div>

              <div style={styles.statContent}>
                <strong>
                  24/7
                </strong>

                <span>
                  Access
                </span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ===================================================
          FILTER BAR
      =================================================== */}

      <div style={styles.filterWrapper}>

        <div style={styles.filterInner}>

          <div style={styles.filterLabel}>
            <span>SUBJECTS</span>
          </div>

          <div style={styles.subjectNav}>

            {subjects.map((subject) => {

              const theme =
                subject === "All"
                  ? subjectThemes.Default
                  : getTheme(subject);

              const active =
                activeSubject === subject;

              return (
                <motion.button
                  key={subject}
                  whileTap={{ scale: 0.96 }}
                  onClick={() =>
                    setActiveSubject(subject)
                  }
                  style={{
                    ...styles.subjectButton,
                    ...(active
                      ? {
                          background:
                            theme.primary,
                          color: "#fff",
                          borderColor:
                            theme.primary,
                          boxShadow:
                            `0 5px 14px ${theme.primary}25`,
                        }
                      : {}),
                  }}
                >

                  <span>
                    {subject}
                  </span>

                  {subject !== "All" && (
                    <span
                      style={{
                        ...styles.subjectCount,
                        background: active
                          ? "rgba(255,255,255,.18)"
                          : theme.light,
                        color: active
                          ? "#fff"
                          : theme.primary,
                      }}
                    >
                      {subjectCounts[subject] || 0}
                    </span>
                  )}

                </motion.button>
              );
            })}

          </div>

        </div>
      </div>

      {/* ===================================================
          MAIN CONTENT
      =================================================== */}

      <main style={styles.main}>

        {/* RESULTS HEADER */}

        <div style={styles.resultsHeader}>

          <div>

            <div style={styles.resultsEyebrow}>
              CLASS {studentClass} • STUDY MATERIAL
            </div>

            <h2 style={styles.resultsTitle}>
              {activeSubject === "All"
                ? "All Study Materials"
                : `${activeSubject} Resources`}
            </h2>

            <p style={styles.resultsSub}>
              Showing{" "}
              <strong>
                {filteredMaterials.length}
              </strong>{" "}
              {filteredMaterials.length === 1
                ? "resource"
                : "resources"}
              {searchTerm && (
                <>
                  {" "}
                  matching{" "}
                  <strong>
                    "{searchTerm}"
                  </strong>
                </>
              )}
            </p>

          </div>

          {(searchTerm ||
            activeSubject !== "All") && (
            <button
              onClick={resetFilters}
              style={styles.clearFilters}
            >
              <FaTimes />
              Clear filters
            </button>
          )}

        </div>

        {/* =================================================
            LOADING
        ================================================= */}

        {loading ? (

          <div style={styles.loadingArea}>

            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                repeat: Infinity,
                duration: 1,
                ease: "linear",
              }}
              style={styles.loadingIcon}
            >
              <FaBookOpen />
            </motion.div>

            <h3>
              Opening your library...
            </h3>

            <p>
              Preparing your study resources
            </p>

          </div>

        ) : filteredMaterials.length === 0 ? (

          /* =================================================
             EMPTY
          ================================================= */

          <motion.div
            initial={{
              opacity: 0,
              y: 15,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            style={styles.emptyState}
          >

            <div style={styles.emptyIcon}>
              <FaSearch />
            </div>

            <h2>
              No materials found
            </h2>

            <p>
              No study material matches your
              current search or subject filter.
            </p>

            <button
              onClick={resetFilters}
              style={styles.resetButton}
            >
              View All Materials
            </button>

          </motion.div>

        ) : (

          /* =================================================
             SUBJECT SECTIONS
          ================================================= */

          Object.keys(grouped).map(
            (subject, sectionIndex) => {

              const theme =
                getTheme(subject);

              return (
                <motion.section
                  key={subject}
                  initial={{
                    opacity: 0,
                    y: 18,
                  }}
                  whileInView={{
                    opacity: 1,
                    y: 0,
                  }}
                  viewport={{
                    once: true,
                    margin: "-50px",
                  }}
                  transition={{
                    duration: 0.35,
                    delay:
                      sectionIndex * 0.04,
                  }}
                  style={
                    styles.subjectSection
                  }
                >

                  {/* SECTION HEADER */}

                  <div
                    style={
                      styles.sectionHeader
                    }
                  >

                    <div
                      style={
                        styles.sectionTitleLeft
                      }
                    >

                      <div
                        style={{
                          ...styles.subjectIcon,
                          background:
                            theme.light,
                          color:
                            theme.primary,
                        }}
                      >
                        <FaBookOpen />
                      </div>

                      <div>

                        <h2
                          style={
                            styles.sectionTitle
                          }
                        >
                          {subject}
                        </h2>

                        <p
                          style={
                            styles.sectionSub
                          }
                        >
                          {
                            grouped[subject]
                              .length
                          }{" "}
                          {grouped[subject]
                            .length === 1
                            ? "resource"
                            : "resources"}
                        </p>

                      </div>

                    </div>

                    <div
                      style={{
                        ...styles.sectionLine,
                        background:
                          `linear-gradient(
                            90deg,
                            ${theme.primary}35,
                            transparent
                          )`,
                      }}
                    />

                  </div>

                  {/* MATERIAL GRID */}

                  <div style={styles.grid}>

                    {grouped[subject].map(
                      (item, index) => (

                        <motion.article
                          key={item.id}
                          initial={{
                            opacity: 0,
                            y: 12,
                          }}
                          whileInView={{
                            opacity: 1,
                            y: 0,
                          }}
                          viewport={{
                            once: true,
                          }}
                          transition={{
                            delay:
                              index * 0.035,
                          }}
                          whileHover={{
                            y: -4,
                          }}
                          style={{
                            ...styles.materialCard,
                            background:
                              theme.soft,
                          }}
                        >

                          {/* CARD TOP */}

                          <div
                            style={
                              styles.cardTop
                            }
                          >

                            <div
                              style={{
                                ...styles.pdfIcon,
                                background:
                                  theme.primary,
                              }}
                            >
                              <FaFilePdf />
                            </div>

                            <div
                              style={
                                styles.cardTag
                              }
                            >
                              PDF
                            </div>

                          </div>

                          {/* CONTENT */}

                          <div
                            style={
                              styles.cardBody
                            }
                          >

                            <h3
                              style={
                                styles.fileTitle
                              }
                              title={item.title}
                            >
                              {item.title}
                            </h3>

                            <div
                              style={
                                styles.fileMeta
                              }
                            >

                              <span>
                                <FaBookOpen />
                                {subject}
                              </span>

                              <span>
                                Class{" "}
                                {studentClass}
                              </span>

                            </div>

                          </div>

                          {/* ACTIONS */}

                          <div
                            style={
                              styles.cardFooter
                            }
                          >

                            <button
                              onClick={() =>
                                openReader(
                                  item.file_path,
                                  item.title
                                )
                              }
                              style={{
                                ...styles.readButton,
                                background:
                                  theme.primary,
                              }}
                            >
                              Read Material
                              <FaArrowRight />
                            </button>

                            <button
                              onClick={() =>
                                downloadPDF(
                                  item.file_path,
                                  item.title,
                                  item.id
                                )
                              }
                              disabled={
                                downloadingId ===
                                item.id
                              }
                              style={
                                styles.downloadButton
                              }
                              title="Download PDF"
                            >

                              {downloadingId ===
                              item.id ? (
                                <motion.span
                                  animate={{
                                    rotate: 360,
                                  }}
                                  transition={{
                                    repeat:
                                      Infinity,
                                    duration:
                                      0.8,
                                    ease:
                                      "linear",
                                  }}
                                  style={{
                                    display:
                                      "flex",
                                  }}
                                >
                                  <FaDownload />
                                </motion.span>
                              ) : (
                                <FaDownload />
                              )}

                            </button>

                          </div>

                        </motion.article>

                      )
                    )}

                  </div>

                </motion.section>
              );
            }
          )
        )}

        <div
          style={{
            height: "70px",
          }}
        />

      </main>

    </div>
  );
};

/* =========================================================
   STYLES
========================================================= */

const styles = {

  /* =======================================================
     PAGE
  ======================================================= */

  page: {
    minHeight: "100vh",
    width: "100%",
    background: "#F8FAFC",
    fontFamily:
      "'Inter', 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    overflowX: "hidden",
    color: "#0F172A",
  },

  /* =======================================================
     HERO
  ======================================================= */

  hero: {
    position: "relative",
    overflow: "hidden",
    background:
      "linear-gradient(135deg, #0B1220 0%, #111827 48%, #1E1B4B 100%)",
    color: "#fff",
  },

  heroGlowOne: {
    position: "absolute",
    width: "480px",
    height: "480px",
    borderRadius: "50%",
    background:
      "rgba(79,70,229,0.14)",
    filter: "blur(90px)",
    top: "-280px",
    right: "-100px",
    pointerEvents: "none",
  },

  heroGlowTwo: {
    position: "absolute",
    width: "380px",
    height: "380px",
    borderRadius: "50%",
    background:
      "rgba(37,99,235,0.10)",
    filter: "blur(90px)",
    bottom: "-260px",
    left: "-130px",
    pointerEvents: "none",
  },

  heroInner: {
    position: "relative",
    zIndex: 2,
    width: "100%",
    margin: "0 auto",
    padding:
      "58px clamp(20px, 4vw, 60px) 46px",
    boxSizing: "border-box",
    textAlign: "center",
  },

  libraryBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 14px",
    borderRadius: "999px",
    background:
      "rgba(255,255,255,0.07)",
    border:
      "1px solid rgba(255,255,255,0.11)",
    color: "#CBD5E1",
    fontSize: "10px",
    fontWeight: "800",
    letterSpacing: "1.1px",
  },

  heroTitle: {
    fontSize:
      "clamp(36px, 5.5vw, 62px)",
    lineHeight: 1.04,
    margin: "20px 0 13px",
    fontWeight: "900",
    letterSpacing: "-2.5px",
  },

  heroTitleAccent: {
    color: "#818CF8",
  },

  heroDescription: {
    maxWidth: "650px",
    margin: "0 auto",
    color: "#CBD5E1",
    fontSize: "15px",
    lineHeight: 1.7,
  },

  /* =======================================================
     SEARCH
  ======================================================= */

  searchBox: {
    position: "relative",
    width: "min(760px, 100%)",
    margin: "30px auto 26px",
  },

  searchIcon: {
    position: "absolute",
    left: "21px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#64748B",
    fontSize: "16px",
    zIndex: 2,
  },

  searchInput: {
    width: "100%",
    height: "60px",
    boxSizing: "border-box",
    padding: "0 58px",
    borderRadius: "15px",
    border:
      "1px solid rgba(255,255,255,.12)",
    outline: "none",
    background: "#FFFFFF",
    color: "#0F172A",
    fontSize: "15px",
    fontWeight: "600",
    boxShadow:
      "0 18px 45px rgba(0,0,0,.20)",
  },

  clearSearch: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    width: "35px",
    height: "35px",
    borderRadius: "9px",
    border: "none",
    background: "#F1F5F9",
    color: "#64748B",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  /* =======================================================
     HERO STATS
  ======================================================= */

  heroStats: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "32px",
    marginTop: "15px",
  },

  heroStat: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    textAlign: "left",
  },

  statIcon: {
    width: "35px",
    height: "35px",
    borderRadius: "10px",
    background:
      "rgba(255,255,255,.07)",
    border:
      "1px solid rgba(255,255,255,.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#A5B4FC",
    fontSize: "13px",
  },

  statContent: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },

  heroDivider: {
    height: "30px",
    width: "1px",
    background:
      "rgba(255,255,255,.13)",
  },

  /* =======================================================
     FILTER
  ======================================================= */

  filterWrapper: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    background:
      "rgba(255,255,255,.96)",
    backdropFilter: "blur(14px)",
    borderBottom:
      "1px solid #E2E8F0",
  },

  filterInner: {
    width: "100%",
    margin: "0 auto",
    padding:
      "12px clamp(16px, 3vw, 45px)",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    gap: "18px",
  },

  filterLabel: {
    flexShrink: 0,
    color: "#94A3B8",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "1px",
  },

  subjectNav: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    overflowX: "auto",
    scrollbarWidth: "none",
    width: "100%",
    paddingBottom: "1px",
  },

  subjectButton: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "8px 12px",
    borderRadius: "9px",
    border:
      "1px solid #E2E8F0",
    background: "#FFFFFF",
    color: "#475569",
    fontSize: "11px",
    fontWeight: "800",
    cursor: "pointer",
    transition:
      "all .2s ease",
  },

  subjectCount: {
    minWidth: "19px",
    height: "19px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "9px",
    fontWeight: "900",
  },

  /* =======================================================
     MAIN
     FULL WIDTH
  ======================================================= */

  main: {
    width: "100%",
    margin: "0",
    padding:
      "0 clamp(18px, 3.5vw, 55px)",
    boxSizing: "border-box",
  },

  /* =======================================================
     RESULTS
  ======================================================= */

  resultsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: "20px",
    padding:
      "32px 0 4px",
  },

  resultsEyebrow: {
    color: "#6366F1",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "1px",
    marginBottom: "5px",
  },

  resultsTitle: {
    margin: 0,
    color: "#0F172A",
    fontSize: "25px",
    fontWeight: "900",
    letterSpacing: "-0.7px",
  },

  resultsSub: {
    margin: "5px 0 0",
    color: "#64748B",
    fontSize: "12px",
  },

  clearFilters: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "9px 12px",
    borderRadius: "9px",
    border:
      "1px solid #E2E8F0",
    background: "#FFFFFF",
    color: "#475569",
    fontSize: "11px",
    fontWeight: "800",
    cursor: "pointer",
  },

  /* =======================================================
     SECTION
  ======================================================= */

  subjectSection: {
    marginTop: "34px",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    marginBottom: "16px",
  },

  sectionTitleLeft: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
    flexShrink: 0,
  },

  subjectIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "11px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
  },

  sectionTitle: {
    margin: 0,
    color: "#0F172A",
    fontSize: "18px",
    fontWeight: "900",
  },

  sectionSub: {
    margin: "3px 0 0",
    color: "#94A3B8",
    fontSize: "10px",
    fontWeight: "600",
  },

  sectionLine: {
    flex: 1,
    height: "1px",
    borderRadius: "10px",
  },

  /* =======================================================
     GRID
  ======================================================= */

  grid: {
    display: "grid",

    /*
     * Full width + wider cards
     */
    gridTemplateColumns:
      "repeat(auto-fill, minmax(300px, 1fr))",

    gap: "16px",
  },

  /* =======================================================
     CARD
  ======================================================= */

  materialCard: {
    border:
      "1px solid #E2E8F0",
    borderRadius: "16px",
    padding: "18px",
    minHeight: "188px",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    boxShadow:
      "0 3px 14px rgba(15,23,42,.035)",
    transition:
      "box-shadow .25s ease, border-color .25s ease",
  },

  cardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  pdfIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "11px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: "17px",
    boxShadow:
      "0 5px 12px rgba(15,23,42,.12)",
  },

  cardTag: {
    padding: "5px 8px",
    borderRadius: "6px",
    background: "#FFFFFF",
    border:
      "1px solid #E2E8F0",
    color: "#64748B",
    fontSize: "8px",
    fontWeight: "900",
    letterSpacing: ".6px",
  },

  cardBody: {
    flex: 1,
    paddingTop: "14px",
    minWidth: 0,
  },

  fileTitle: {
    margin: 0,
    color: "#1E293B",
    fontSize: "15px",
    fontWeight: "800",
    lineHeight: 1.45,

    /*
     * Keep cards uniform
     */
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },

  fileMeta: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "10px",
    color: "#94A3B8",
    fontSize: "10px",
    fontWeight: "700",
  },

  cardFooter: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    marginTop: "16px",
  },

  readButton: {
    flex: 1,
    height: "39px",
    border: "none",
    borderRadius: "9px",
    color: "#fff",
    fontSize: "11px",
    fontWeight: "800",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
  },

  downloadButton: {
    width: "39px",
    height: "39px",
    flexShrink: 0,
    borderRadius: "9px",
    background: "#FFFFFF",
    border:
      "1px solid #CBD5E1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#334155",
    fontSize: "12px",
    cursor: "pointer",
  },

  /* =======================================================
     LOADING
  ======================================================= */

  loadingArea: {
    minHeight: "350px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    color: "#64748B",
  },

  loadingIcon: {
    width: "52px",
    height: "52px",
    borderRadius: "14px",
    background: "#EEF2FF",
    color: "#4F46E5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "21px",
  },

  /* =======================================================
     EMPTY
  ======================================================= */

  emptyState: {
    minHeight: "400px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    padding: "30px",
  },

  emptyIcon: {
    width: "68px",
    height: "68px",
    borderRadius: "18px",
    background: "#EEF2FF",
    color: "#6366F1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "23px",
  },

  resetButton: {
    marginTop: "15px",
    border: "none",
    background: "#4F46E5",
    color: "#fff",
    padding: "10px 17px",
    borderRadius: "9px",
    fontWeight: "800",
    cursor: "pointer",
    fontSize: "11px",
  },

  /* =======================================================
     PDF VIEWER
     EXACT SAME FUNCTIONALITY
  ======================================================= */

  viewerOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 99999,
    background: "#0F172A",
    display: "flex",
    flexDirection: "column",
  },

  viewerHeader: {
    height: "66px",
    flexShrink: 0,
    background: "#111827",
    borderBottom:
      "1px solid rgba(255,255,255,.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 18px",
    color: "#fff",
    boxSizing: "border-box",
  },

  viewerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
    minWidth: 0,
  },

  viewerPdfIcon: {
    width: "37px",
    height: "37px",
    borderRadius: "10px",
    background: "#EF4444",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  viewerTitle: {
    fontSize: "13px",
    fontWeight: "800",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "65vw",
  },

  viewerSub: {
    color: "#94A3B8",
    fontSize: "9px",
    marginTop: "2px",
  },

  closeButton: {
    width: "38px",
    height: "38px",
    borderRadius: "11px",
    border:
      "1px solid rgba(255,255,255,.1)",
    background:
      "rgba(255,255,255,.08)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },

  iframe: {
    width: "100%",
    height: "100%",
    flex: 1,
    border: "none",
    background: "#fff",
  },
};

export default StudentStudyMaterial;