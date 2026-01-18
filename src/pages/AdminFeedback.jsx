import React, { useEffect, useState } from "react";
import axios from "axios";

export default function AdminFeedback() {
  const [summary, setSummary] = useState({ positive: 0, neutral: 0, negative: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAnimate, setIsAnimate] = useState(false);

  const colors = {
    bg: "#0b0118",
    card: "rgba(30, 10, 60, 0.4)",
    accent: "#bc13fe", // Neon Purple
    success: "#00f5d4", // Cyan/Teal
    warning: "#fee440", // Yellow
    danger: "#ff006e", // Hot Pink
    text: "#f1e4ff"
  };

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        let API = process.env.REACT_APP_API_URL;
        if (!API) throw new Error("REACT_APP_API_URL not defined");
        API = API.replace(/\/$/, "");
        const res = await axios.get(`${API}/api/feedback/admin/summary`);
        if (res.data && res.data.success) {
          setSummary({
            positive: res.data.positive || 0,
            neutral: res.data.neutral || 0,
            negative: res.data.negative || 0,
          });
          setTimeout(() => setIsAnimate(true), 200);
        }
      } catch (err) {
        setError("Systems Offline: Unable to sync feedback.");
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  const total = summary.positive + summary.neutral + summary.negative || 1;
  const pPerc = ((summary.positive / total) * 100).toFixed(1);
  const nPerc = ((summary.neutral / total) * 100).toFixed(1);
  const negPerc = ((summary.negative / total) * 100).toFixed(1);

  if (loading) return (
    <div style={styles.loaderContainer}>
      <div className="loader-ring"></div>
      <p style={{marginTop: '20px', color: colors.accent, letterSpacing: '2px'}}>INITIALIZING_DATA_STREAM...</p>
      <style>{`
        .loader-ring { width: 50px; height: 50px; border: 3px solid transparent; border-top: 3px solid ${colors.accent}; border-radius: 50%; animation: spin 1s linear infinite; box-shadow: 0 0 15px ${colors.accent}; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: scale(0.95) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes pulseGlow { 0% { box-shadow: 0 0 5px ${colors.accent}44; } 50% { box-shadow: 0 0 20px ${colors.accent}88; } 100% { box-shadow: 0 0 5px ${colors.accent}44; } }
        .fade-in { animation: slideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .glass-card { transition: all 0.4s ease; border: 1px solid rgba(188, 19, 254, 0.1) !important; }
        .glass-card:hover { transform: translateY(-10px); border-color: ${colors.accent} !important; background: rgba(50, 15, 100, 0.6) !important; box-shadow: 0 15px 40px rgba(0,0,0,0.6), 0 0 15px ${colors.accent}33; }
        .circle-bar { transition: stroke-dashoffset 2s ease-out; }
      `}</style>

      <div style={styles.content}>
        <header style={styles.header} className="fade-in">
          <div>
            <h1 style={styles.title}>FEEDBACK_<span style={{color: colors.accent}}>QUANTUM</span></h1>
            <p style={{color: '#8a7db3', fontSize: '0.8rem', margin: 0}}>SECURE_ADMIN_DASHBOARD v4.0</p>
          </div>
          <div style={styles.statusChip} className="fade-in">SYSTEM_ACTIVE</div>
        </header>

        {/* High Tech Circle Filling Section */}
        <div style={styles.grid}>
          <CircularMetric label="POSITIVE" value={summary.positive} percent={pPerc} color={colors.success} />
          <CircularMetric label="NEUTRAL" value={summary.neutral} percent={nPerc} color={colors.warning} />
          <CircularMetric label="NEGATIVE" value={summary.negative} percent={negPerc} color={colors.danger} />
        </div>

        {/* Verdict Box */}
        <div style={{...styles.verdict, borderColor: pPerc >= 70 ? colors.success : negPerc >= 30 ? colors.danger : colors.warning}} className="fade-in">
          <div style={styles.aiTag}>AI_EVALUATION</div>
          <h2 style={{color: '#fff', margin: '15px 0 5px'}}>
             {pPerc >= 70 ? "OPTIMAL_FACULTY_STABILITY" : negPerc >= 30 ? "CRITICAL_ATTENTION_REQUIRED" : "MAINTAINING_STABILIZED_FEEDBACK"}
          </h2>
          <p style={{color: '#8a7db3', fontSize: '0.9rem'}}>Analysis based on {total} cumulative responses.</p>
        </div>
      </div>
    </div>
  );
}

// Custom Circular Component
const CircularMetric = ({ label, value, percent, color }) => {
  const radius = 50;
  const dash = 2 * Math.PI * radius;
  const offset = dash - (percent / 100) * dash;

  return (
    <div style={styles.card} className="fade-in glass-card">
      <span style={{...styles.cardLabel, color: color}}>{label}</span>
      <div style={styles.circleContainer}>
        <svg width="140" height="140">
          <circle cx="70" cy="70" r={radius} fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
          <circle 
            cx="70" cy="70" r={radius} 
            fill="transparent" 
            stroke={color} 
            strokeWidth="10" 
            strokeDasharray={dash} 
            strokeDashoffset={offset} 
            strokeLinecap="round"
            className="circle-bar"
            style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}
          />
        </svg>
        <div style={styles.circleText}>
          <h3 style={{fontSize: '1.8rem', margin: 0}}>{value}</h3>
          <span style={{fontSize: '0.7rem', color: '#8a7db3'}}>{percent}%</span>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { minHeight: "100vh", backgroundColor: "#0b0118", color: "#f1e4ff", padding: "60px 20px", fontFamily: "'Space Grotesk', sans-serif" },
  loaderContainer: { minHeight: "100vh", backgroundColor: "#0b0118", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  content: { maxWidth: "1000px", margin: "0 auto" },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '50px' },
  title: { fontSize: '2.2rem', letterSpacing: '6px', margin: 0, fontWeight: '900', textShadow: '0 0 20px rgba(188,19,254,0.4)' },
  statusChip: { padding: '6px 15px', background: 'rgba(0, 245, 212, 0.1)', color: '#00f5d4', borderRadius: '50px', fontSize: '0.65rem', letterSpacing: '2px', border: '1px solid #00f5d433' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' },
  card: { background: "rgba(30, 10, 60, 0.4)", padding: "40px 20px", borderRadius: "30px", textAlign: 'center', backdropFilter: "blur(20px)", position: 'relative', overflow: 'hidden' },
  circleContainer: { position: 'relative', display: 'flex', justifyContent: 'center', marginTop: '20px' },
  circleText: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column' },
  cardLabel: { fontSize: '0.8rem', letterSpacing: '4px', fontWeight: 'bold' },
  verdict: { marginTop: '50px', padding: '40px', borderRadius: '30px', background: 'linear-gradient(180deg, rgba(188,19,254,0.05) 0%, rgba(11,1,24,0) 100%)', border: '1px solid', textAlign: 'center' },
  aiTag: { display: 'inline-block', padding: '4px 12px', background: '#bc13fe', color: '#fff', fontSize: '0.6rem', borderRadius: '4px', letterSpacing: '2px', fontWeight: 'bold' },
  circleBar: { transition: 'stroke-dashoffset 2s ease-in-out' }
};