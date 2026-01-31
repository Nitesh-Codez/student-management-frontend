import React, { useState, useEffect } from "react";
import axios from "axios";

const StudentFees = ({ user }) => {
  const API_URL = "https://student-management-system-4-hose.onrender.com";

  const [fees, setFees] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [showMonths, setShowMonths] = useState(true);
  const [isCurrentMonthUnpaid, setIsCurrentMonthUnpaid] = useState(false);
  const [dynamicFee, setDynamicFee] = useState("500");
  const [isLockSet, setIsLockSet] = useState(localStorage.getItem("app_lock_enabled") === "true");

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    if (!user) return;
    const fetchFees = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/fees/student/${user.id}`);
        if (res.data.success) {
          let feesData = res.data.fees.map(f => {
            const d = new Date(f.payment_date);
            let month = d.getMonth() - 1;
            let year = d.getFullYear();
            if (month === -1) { month = 11; year -= 1; }
            return { ...f, feeMonth: month, feeYear: year };
          });
          setFees(feesData);

          const now = new Date();
          const hasPaid = feesData.some(f => f.feeMonth === now.getMonth() && f.feeYear === now.getFullYear() && f.payment_status === "SUCCESS");
          setIsCurrentMonthUnpaid(!hasPaid);

          if (feesData.length > 0) {
            const sorted = [...feesData].sort((a,b) => new Date(b.payment_date) - new Date(a.payment_date));
            setDynamicFee(sorted[0].amount);
          }
        }
      } catch (err) { console.error(err); }
    };
    fetchFees();
  }, [user, API_URL]);

  const handleSetLock = async () => {
    if (!window.PublicKeyCredential) {
      alert("Browser not supported");
      return;
    }
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const options = {
        publicKey: {
          challenge,
          rp: { name: "SmartZone" },
          user: { id: crypto.getRandomValues(new Uint8Array(16)), name: user.name, displayName: user.name },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: { authenticatorAttachment: "platform" },
          timeout: 60000,
        },
      };
      const credential = await navigator.credentials.create(options);
      if (credential) {
        localStorage.setItem("app_lock_enabled", "true");
        setIsLockSet(true);
      }
    } catch (err) { console.log("Lock cancelled"); }
  };

  const handlePayment = () => {
    const upiUrl = `upi://pay?pa=9302122613@ybl&pn=SmartZone&am=${dynamicFee}&cu=INR&tn=Fees_For_${months[new Date().getMonth()]}`;
    window.location.href = upiUrl;
  };

  const filteredFees = selectedMonth === null ? [] : fees.filter(f => f.feeMonth === selectedMonth);

  return (
    <div style={styles.fullScreenWrapper}>
      {/* Action Header */}
      <div style={styles.topNav}>
        <span style={styles.brandName}>𝐒MARTZØηE</span>
        <button onClick={handleSetLock} style={isLockSet ? styles.lockActive : styles.lockInactive}>
          {isLockSet ? "🔒 Secured" : "🔑 Set Lock"}
        </button>
      </div>

      {/* Edge-to-Edge Banner */}
      {isCurrentMonthUnpaid && (
        <div style={styles.edgeBanner}>
          <div>
            <div style={{fontWeight: '700', fontSize: '16px'}}>Payment Due</div>
            <div style={{fontSize: '12px', opacity: 0.8}}>{months[new Date().getMonth()]} Fee: ₹{dynamicFee}</div>
          </div>
          <button onClick={handlePayment} style={styles.bannerBtn}>Pay Now</button>
        </div>
      )}

      <div style={styles.container}>
        <h2 style={styles.sectionTitle}>
          {showMonths ? "Fee Ledger" : `${months[selectedMonth]} Payment`}
        </h2>

        {showMonths ? (
          <div style={styles.verticalMonthList}>
            {months.map((m, i) => {
              const isPaid = fees.some(f => f.feeMonth === i && f.payment_status === "SUCCESS");
              return (
                <div
                  key={i}
                  style={isPaid ? styles.monthRowPaid : styles.monthRowUnpaid}
                  onClick={() => { setSelectedMonth(i); setShowMonths(false); }}
                >
                  <div style={styles.monthInfo}>
                    <div style={styles.monthNumber}>{i + 1}</div>
                    <div style={styles.monthTitle}>{m}</div>
                  </div>
                  <div style={isPaid ? styles.statusPaid : styles.statusUnpaid}>
                    {isPaid ? "● Completed" : "○ Pending"}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={styles.detailBox}>
            <button onClick={() => setShowMonths(true)} style={styles.backLink}>← Back to Overview</button>
            
            {filteredFees.length === 0 ? (
              <div style={styles.emptyState}>No transaction history found.</div>
            ) : (
              filteredFees.map(f => (
                <div key={f.id} style={styles.receiptCard}>
                  <div style={styles.receiptHeader}>Transaction Details</div>
                  <div style={styles.receiptRow}><span>Date:</span> <strong>{new Date(f.payment_date).toDateString()}</strong></div>
                  <div style={styles.receiptRow}><span>Time:</span> <strong>{f.payment_time}</strong></div>
                  <div style={styles.receiptRow}><span>Amount:</span> <strong style={{color: '#10b981', fontSize: '18px'}}>₹{f.amount}</strong></div>
                  <div style={styles.receiptRow}><span>Status:</span> <span style={styles.successBadge}>{f.payment_status}</span></div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  fullScreenWrapper: {
    minHeight: "100vh",
    background: "#000000",
    color: "#ffffff",
    fontFamily: "'-apple-system', 'Roboto', sans-serif",
    margin: 0,
    padding: 0,
  },
  topNav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px",
    background: "rgba(255,255,255,0.03)",
    borderBottom: "1px solid #111"
  },
  brandName: { fontSize: "20px", fontWeight: "900", letterSpacing: "2px" },
  lockInactive: { background: "#ffcc00", color: "#000", border: "none", padding: "6px 12px", borderRadius: "20px", fontWeight: "700", fontSize: "11px" },
  lockActive: { background: "#10b981", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "20px", fontWeight: "700", fontSize: "11px" },
  edgeBanner: {
    background: "linear-gradient(90deg, #ff416c, #ff4b2b)",
    padding: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bannerBtn: { background: "#fff", color: "#ff416c", border: "none", padding: "10px 20px", borderRadius: "10px", fontWeight: "900" },
  container: { padding: "20px" },
  sectionTitle: { fontSize: "24px", fontWeight: "700", marginBottom: "20px", opacity: 0.9 },
  verticalMonthList: { display: "flex", flexDirection: "column", gap: "10px" },
  monthRowUnpaid: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "18px", background: "#111", borderRadius: "15px", border: "1px solid #222"
  },
  monthRowPaid: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "18px", background: "rgba(16, 185, 129, 0.05)", borderRadius: "15px", border: "1px solid rgba(16, 185, 129, 0.2)"
  },
  monthInfo: { display: "flex", alignItems: "center", gap: "15px" },
  monthNumber: { fontSize: "12px", color: "#555", fontWeight: "bold" },
  monthTitle: { fontSize: "16px", fontWeight: "600" },
  statusPaid: { color: "#10b981", fontSize: "12px", fontWeight: "700" },
  statusUnpaid: { color: "#555", fontSize: "12px" },
  detailBox: { marginTop: "10px" },
  backLink: { background: "none", border: "none", color: "#ffcc00", marginBottom: "20px", cursor: "pointer", fontSize: "14px" },
  receiptCard: {
    background: "#111", borderRadius: "20px", padding: "25px", border: "1px dashed #333",
    display: "flex", flexDirection: "column", gap: "15px"
  },
  receiptHeader: { textAlign: "center", fontSize: "12px", letterSpacing: "2px", color: "#555", textTransform: "uppercase", borderBottom: "1px solid #222", paddingBottom: "10px" },
  receiptRow: { display: "flex", justifyContent: "space-between", fontSize: "14px", color: "#ccc" },
  successBadge: { background: "#10b981", color: "#fff", padding: "2px 8px", borderRadius: "5px", fontSize: "10px", fontWeight: "bold" },
  emptyState: { textAlign: "center", padding: "40px", color: "#444" }
};

export default StudentFees;