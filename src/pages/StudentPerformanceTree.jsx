import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Crown, Award, ShieldCheck, Zap } from 'lucide-react';
import api from '../services/api';

export default function StudentPerformanceTree() {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCrown, setShowCrown] = useState(false);

  // Helper function to get authorization headers if needed by api service
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    };
  };

  const fetchData = useCallback(async () => {
    try {
      const session = localStorage.getItem('session') || '2026-27';

      // Using configured custom api service instead of raw fetch
      const response = await api.get(`/api/student-stars/leaderboard`, {
        params: { session },
        ...getAuthHeaders(),
      });

      const data = response.data;

      const students =
        data.leaderboard ||
        data.students ||
        (Array.isArray(data) ? data : []);

      // Sort students: highest stars at the top
      const sortedStudents = [...students].sort(
        (a, b) => (b.stars || 0) - (a.stars || 0)
      );

      // Group students by star count (hierarchy levels)
      const starGroups = {};
      sortedStudents.forEach((student) => {
        const s = student.stars || 0;
        if (!starGroups[s]) starGroups[s] = [];
        starGroups[s].push(student);
      });

      // Convert groups into an array sorted by highest stars first
      const groupedLevels = Object.keys(starGroups)
        .sort((a, b) => Number(b) - Number(a))
        .map((starsKey) => starGroups[starsKey]);

      setLevels(groupedLevels);
      setLoading(false);

      const timer = setTimeout(() => {
        setShowCrown(true);
      }, 800);

      return () => clearTimeout(timer);
    } catch (err) {
      console.error('Error fetching tree data:', err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helper function to assign performance tags and badge styles based on row index or star count
  const getPerformanceBadge = (levelIndex, totalLevels) => {
    if (levelIndex === 0) {
      return { label: '👑 Elite Champion', bg: '#fef3c7', color: '#b45309', border: '#f59e0b', icon: Crown };
    } else if (levelIndex === 1 && totalLevels > 2) {
      return { label: '⚡ Star Performer', bg: '#e0f2fe', color: '#0369a1', border: '#38bdf8', icon: Zap };
    } else if (levelIndex === totalLevels - 1 && totalLevels > 1) {
      return { label: '🌱 Rising Star', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', icon: ShieldCheck };
    } else {
      return { label: '⭐ Achiever', bg: '#fdf4ff', color: '#86198f', border: '#e879f9', icon: Award };
    }
  };

  if (loading) {
    return (
      <div style={styles.loaderContainer}>
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          style={styles.spinner}
        />
        <p style={{ color: '#2563eb', marginTop: '15px', fontWeight: '800', fontSize: '18px' }}>
          ✨ Loading Clean White Hierarchy... 🌟
        </p>
      </div>
    );
  }

  const totalLevelsCount = levels.length;

  return (
    <div style={styles.container}>
      {/* Subtle shining light effects in clean white background */}
      <div style={styles.lightShine1} />
      <div style={styles.lightShine2} />

      <motion.h1
        initial={{ y: -25, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        style={styles.heading}
      >
        🌟 Student Star Hierarchy Tree 🌟
      </motion.h1>

      {levels.length === 0 ? (
        <p style={styles.noData}>No star data found!</p>
      ) : (
        <div style={styles.treeWrapper}>
          {levels.map((levelStudents, levelIndex) => {
            const isHighestLevel = levelIndex === 0;
            const badgeInfo = getPerformanceBadge(levelIndex, totalLevelsCount);
            const BadgeIcon = badgeInfo.icon;

            return (
              <React.Fragment key={levelIndex}>
                {levelIndex > 0 && (
                  <div style={styles.branchConnectorContainer}>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: '45px' }}
                      transition={{ duration: 0.5, delay: levelIndex * 0.1 }}
                      style={styles.solidBranch}
                    />
                  </div>
                )}

                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: levelIndex * 0.15 }}
                  style={styles.levelRow}
                >
                  {levelStudents.map((student, idx) => {
                    const studentStars = student.stars || 0;
                    const starItemsArray = Array.from({ length: studentStars });

                    return (
                      <motion.div
                        key={student.student_id || student.id || idx}
                        whileHover={{ scale: 1.05, y: -5 }}
                        whileTap={{ scale: 0.95 }}
                        style={styles.profileCard}
                      >
                        {/* Ultra Premium Glowing Crown */}
                        {isHighestLevel && (
                          <AnimatePresence>
                            {showCrown && (
                              <motion.div
                                initial={{ scale: 0, y: -35, rotate: -20 }}
                                animate={{
                                  scale: [0, 1.2, 1],
                                  y: -28,
                                  rotate: [-6, 6, -3, 3, 0],
                                }}
                                transition={{
                                  type: 'spring',
                                  stiffness: 300,
                                  damping: 12,
                                  delay: 0.15 + idx * 0.1,
                                }}
                                style={styles.crownWrapper}
                              >
                                <svg width="52" height="38" viewBox="0 0 32 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M3 19H29V21H3V19Z" fill="#ca8a04" opacity="0.6" />
                                  <path 
                                    d="M2 18H30V20H2V18ZM3 7L9 12L16 3L23 12L29 7L27 16H5L3 7Z" 
                                    fill="url(#superGoldGradient)" 
                                    stroke="#854d0e" 
                                    strokeWidth="1.2" 
                                    strokeLinejoin="round" 
                                  />
                                  <path d="M9 12L16 3L23 12L16 14L9 12Z" fill="url(#innerShine)" opacity="0.7" />

                                  <circle cx="16" cy="3" r="2" fill="#ef4444" stroke="#ffffff" strokeWidth="0.6" />
                                  <motion.circle 
                                    cx="16" cy="3" r="2.8" 
                                    stroke="#f87171" 
                                    strokeWidth="0.8" 
                                    fill="none"
                                    animate={{ scale: [1, 1.6, 1], opacity: [0.8, 0, 0.8] }}
                                    transition={{ repeat: Infinity, duration: 1.8 }}
                                  />

                                  <circle cx="3" cy="7" r="1.6" fill="#10b981" stroke="#ffffff" strokeWidth="0.5" />
                                  <circle cx="29" cy="7" r="1.6" fill="#3b82f6" stroke="#ffffff" strokeWidth="0.5" />
                                  <circle cx="9" cy="12" r="1.2" fill="#e0f2fe" />
                                  <circle cx="23" cy="12" r="1.2" fill="#e0f2fe" />

                                  <defs>
                                    <linearGradient id="superGoldGradient" x1="2" y1="3" x2="30" y2="20" gradientUnits="userSpaceOnUse">
                                      <stop stopColor="#fef08a" />
                                      <stop offset="0.35" stopColor="#eab308" />
                                      <stop offset="0.7" stopColor="#ca8a04" />
                                      <stop offset="1" stopColor="#a16207" />
                                    </linearGradient>
                                    <linearGradient id="innerShine" x1="9" y1="3" x2="23" y2="14" gradientUnits="userSpaceOnUse">
                                      <stop stopColor="#ffffff" stopOpacity="0.9" />
                                      <stop offset="1" stopColor="#eab308" stopOpacity="0.2" />
                                    </linearGradient>
                                  </defs>
                                </svg>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        )}

                        {/* Large Profile Photo Area */}
                        <div style={styles.imageWrapper}>
                          <img
                            src={
                              student.profile_photo ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
                            }
                            alt={student.name}
                            style={styles.image}
                          />
                        </div>

                        {/* Name and Class */}
                        <h3 style={styles.name}>{student.name}</h3>
                        <p style={styles.className}>
                          {student.class_name || 'Class N/A'}
                        </p>

                        {/* Star Vault Container */}
                        <div style={styles.starPotContainer}>
                          <div style={styles.starPotHeader}>
                            <Star style={{ width: '11px', height: '11px', color: '#ca8a04', fill: '#ca8a04' }} />
                            <span style={styles.starPotTitle}>Star Vault ({studentStars})</span>
                          </div>
                          <div style={styles.starPotBox}>
                            {starItemsArray.length === 0 ? (
                              <span style={styles.noStarText}>No stars yet</span>
                            ) : (
                              starItemsArray.map((_, sIdx) => (
                                <motion.div
                                  key={sIdx}
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                                  transition={{ delay: sIdx * 0.05, duration: 0.3 }}
                                  style={styles.liveStarWrapper}
                                >
                                  <Star style={styles.liveStarIcon} />
                                </motion.div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Performance Tag */}
                        <div style={{ ...styles.performanceTag, backgroundColor: badgeInfo.bg, color: badgeInfo.color, borderColor: badgeInfo.border }}>
                          <BadgeIcon style={{ width: '12px', height: '12px' }} />
                          <span>{badgeInfo.label}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    minHeight: '100vh',
    background: '#ffffff',
    color: '#0f172a',
    padding: '40px 20px',
    boxSizing: 'border-box',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    overflowX: 'hidden',
    position: 'relative',
  },
  lightShine1: {
    position: 'absolute',
    top: '5%',
    left: '15%',
    width: '350px',
    height: '350px',
    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.06) 0%, rgba(255,255,255,0) 70%)',
    borderRadius: '50%',
    zIndex: 0,
    pointerEvents: 'none',
  },
  lightShine2: {
    position: 'absolute',
    top: '40%',
    right: '10%',
    width: '400px',
    height: '400px',
    background: 'radial-gradient(circle, rgba(234, 179, 8, 0.05) 0%, rgba(255,255,255,0) 70%)',
    borderRadius: '50%',
    zIndex: 0,
    pointerEvents: 'none',
  },
  loaderContainer: {
    width: '100%',
    height: '100vh',
    background: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #2563eb',
    borderTop: '4px solid transparent',
    borderRadius: '50%',
  },
  heading: {
    fontSize: '30px',
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: '40px',
    color: '#0f172a',
    letterSpacing: '-0.5px',
    position: 'relative',
    zIndex: 1,
  },
  noData: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: '16px',
    fontWeight: '600',
    marginTop: '50px',
    position: 'relative',
    zIndex: 1,
  },
  treeWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    position: 'relative',
    zIndex: 1,
    paddingBottom: '60px',
  },
  branchConnectorContainer: {
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
    height: '45px',
    position: 'relative',
  },
  solidBranch: {
    width: '4px',
    backgroundColor: '#cbd5e1',
    borderRadius: '2px',
    boxShadow: '0 0 8px rgba(0,0,0,0.05)',
  },
  levelRow: {
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: '25px',
    width: '100%',
    maxWidth: '1000px',
    background: '#f8fafc',
    borderRadius: '28px',
    padding: '30px 20px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03)',
    border: '1px solid #e2e8f0',
  },
  profileCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '20px',
    width: '195px',
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.05)',
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.3s ease',
  },
  crownWrapper: {
    position: 'absolute',
    top: '-24px',
    zIndex: 10,
    filter: 'drop-shadow(0 6px 10px rgba(202, 138, 4, 0.45))',
  },
  imageWrapper: {
    width: '75px',
    height: '75px',
    borderRadius: '50%',
    overflow: 'hidden',
    border: '3px solid #3b82f6',
    marginBottom: '10px',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  name: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 2px 0',
    width: '100%',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  className: {
    fontSize: '11px',
    fontWeight: '500',
    color: '#64748b',
    margin: '0 0 8px 0',
    width: '100%',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  starPotContainer: {
    width: '100%',
    marginBottom: '8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  starPotHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginBottom: '3px',
  },
  starPotTitle: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#854d0e',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  starPotBox: {
    width: '100%',
    minHeight: '42px',
    maxHeight: '75px',
    overflowY: 'auto',
    backgroundColor: '#fffbeb',
    border: '1.5px dashed #fde047',
    borderRadius: '12px',
    padding: '6px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    justifyContent: 'center',
    alignItems: 'center',
    boxSizing: 'border-box',
  },
  liveStarWrapper: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    filter: 'drop-shadow(0 1px 2px rgba(202, 138, 4, 0.4))',
  },
  liveStarIcon: {
    width: '15px',
    height: '15px',
    color: '#eab308',
    fill: '#facc15',
  },
  noStarText: {
    fontSize: '10px',
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  performanceTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    borderWidth: '1px',
    borderStyle: 'solid',
    padding: '3px 8px',
    borderRadius: '8px',
    fontSize: '10px',
    fontWeight: '700',
    width: '100%',
    justifyContent: 'center',
    boxSizing: 'border-box',
  },
};