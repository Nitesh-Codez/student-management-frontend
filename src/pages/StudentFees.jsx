import React, { useState, useEffect } from "react";
import axios from "axios";

const StudentFees = ({ user }) => {
  const API_URL = "https://student-management-system-4-hose.onrender.com";

  const [fees, setFees] = useState([]);
  const [selectedFee, setSelectedFee] = useState(null);
  const [showSheet, setShowSheet] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isNewStudent, setIsNewStudent] = useState(false); // New State for Welcome Msg
  const [dynamicFee, setDynamicFee] = useState("1000");

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const now = new Date();
  const currM = now.getMonth();
  const currY = now.getFullYear();

  useEffect(() => {
    if (!user || !user.id) return;

    const fetchFees = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/fees/student/${user.id}`);
        if (res.data.success) {
          // 1. Map History (Prev Month Logic)
          let feesData = res.data.fees.map(f => {
            const d = new Date(f.payment_date);
            let month = d.getMonth() - 1; 
            let year = d.getFullYear();
            if (month === -1) { month = 11; year -= 1; }
            
            const isLate = d.getDate() > 5; 
            return { ...f, feeMonth: month, feeYear: year, isLate, payDay: d.getDate() };
          });
          
          feesData.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
          setFees(feesData);

          // 2. Sync Status from Backend
          setIsPending(res.data.showPopup);
          setIsNewStudent(res.data.isNewStudent); // Backend se aayega

          if (feesData.length > 0) {
            setDynamicFee(feesData[0].amount || "1000");
          }
        }
      } catch (err) {
        console.error("Fetch Error:", err);
      }
    };
    fetchFees();
  }, [user.id]);

  const handlePayment = (mName) => {
    const upiUrl = `upi://pay?pa=9302122613@ybl&pn=SmartZone&am=${dynamicFee}&cu=INR&tn=Fees_For_${mName}`;
    window.location.href = upiUrl;
  };

  return (
    <div style={styles.appWrapper}>
      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.statusBar}>
          <span>{now.getHours()}:{now.getMinutes() < 10 ? '0'+now.getMinutes() : now.getMinutes()}</span>
          <div style={{ display: 'flex', gap: '8px' }}>📶 🔋</div>
        </div>
        
        <div style={styles.monthStack}>
          <div style={styles.monthLabelSmall}>{months[currM === 0 ? 11 : currM - 1]}</div>
          <div style={styles.monthLabelBig}>{months[currM]} {currY}</div>
          <div style={styles.monthLabelSmall}>{months[currM === 11 ? 0 : currM + 1]}</div>
        </div>
      </div>

      <div style={styles.contentArea}>
        <div style={styles.topRow}>
          <div style={styles.dropdown}>Smart Billing ▾</div>
          <div style={styles.performanceBadge}>
            {isNewStudent ? "✨ New Student" : isPending ? "⚠️ Due" : "🏆 Star Student"}
          </div>
        </div>

        <div style={styles.scrollArea}>
          
          {/* CASE 1: PENDING FEES (Only if not a new student or explicitly due) */}
          {isPending && (
            <div style={styles.overdueCard}>
              <div style={styles.cardMain}>
                <div style={styles.iconBoxRed}>💰</div>
                <div style={{flex: 1}}>
                  <div style={styles.cardTitle}>Due: {months[currM === 0 ? 11 : currM - 1]}</div>
                  <div style={styles.cardSub}>Kindly clear your pending dues.</div>
                </div>
                <div style={styles.cardPrice}>
                  <div style={styles.badgeRed}>PENDING</div>
                  <div style={styles.priceText}>₹{dynamicFee}</div>
                </div>
              </div>
              <div style={styles.cardActions}>
                <button onClick={() => handlePayment(months[currM - 1])} style={styles.btnPayRed}>Pay Now</button>
                <button style={styles.btnDismiss} onClick={() => setIsPending(false)}>Dismiss</button>
              </div>
            </div>
          )}

          {/* CASE 2: NEW STUDENT (No fees due yet) */}
          {!isPending && isNewStudent && (
            <div style={styles.newStudentCard}>
              <div style={styles.cardMain}>
                <div style={styles.iconBoxGold}>✨</div>
                <div style={{flex: 1}}>
                  <div style={styles.cardTitle}>Welcome to SmartZone!</div>
                  <div style={styles.cardSub}>Your first fee cycle starts next month.</div>
                </div>
              </div>
              <div style={styles.welcomeFooter}>Enjoy your learning journey! 🚀</div>
            </div>
          )}

          {/* CASE 3: OLD STUDENT - ALL PAID */}
          {!isPending && !isNewStudent && (
            <div style={styles.successNote}>
              <div style={{fontSize: "24px", marginBottom: "5px"}}>🏆</div>
              <strong>Great Job, {user?.name || 'Student'}!</strong><br/>
              <span style={{fontSize: "12px", opacity: 0.8}}>All your previous dues are settled. Stay punctual!</span>
            </div>
          )}

          <div style={styles.historyHeading}>PAYMENT HISTORY</div>

          {fees.length > 0 ? (
            fees.map((f, i) => (
              <div key={i} style={styles.historyRow} onClick={() => {setSelectedFee(f); setShowSheet(true);}}>
                <div style={f.isLate ? styles.iconBoxLate : styles.iconBoxGreen}>{f.isLate ? "⌛" : "✓"}</div>
                <div style={{flex: 1}}>
                  <div style={styles.historyTitle}>{months[f.feeMonth]} Fee</div>
                  <div style={f.isLate ? styles.lateSub : styles.historySub}>Paid on {f.payDay}th</div>
                </div>
                <div style={styles.historyPrice}>₹{f.amount}</div>
                <div style={styles.chevron}>›</div>
              </div>
            ))
          ) : (
            <div style={{textAlign: 'center', padding: '20px', color: '#ccc', fontSize: '14px'}}>
              No payment records found yet.
            </div>
          )}
          
          <div style={{ height: "100px" }}></div>
        </div>
      </div>

      {/* RECEIPT SHEET (SAME AS BEFORE) */}
      {showSheet && selectedFee && (
        <div style={styles.overlay} onClick={() => setShowSheet(false)}>
          <div style={styles.sheet} onClick={e => e.stopPropagation()}>
            <div style={styles.handle}></div>
            <div style={styles.receiptBox}>
              <div style={selectedFee.isLate ? styles.checkCircleLate : styles.checkCircle}>{selectedFee.isLate ? "!" : "✓"}</div>
              <div style={styles.receiptAmt}>₹{selectedFee.amount}</div>
              <div style={styles.receiptStatus}>{selectedFee.isLate ? "LATE SUBMISSION" : "PUNCTUAL PAYMENT"}</div>
              <div style={styles.detailsGrid}>
                <div style={styles.detailItem}><span>For Month</span><strong>{months[selectedFee.feeMonth]}</strong></div>
                <div style={styles.detailItem}><span>Ref ID</span><small>{selectedFee.id}</small></div>
              </div>
            </div>
            <button style={styles.closeBtn} onClick={() => setShowSheet(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  appWrapper: { width: "100vw", height: "100vh", backgroundColor: "#fff", display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0 },
  header: { background: "linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d)", padding: "40px 25px 60px 25px", color: "#fff", flexShrink: 0 },
  statusBar: { display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: "700", marginBottom: "30px" },
  monthStack: { display: "flex", flexDirection: "column" },
  monthLabelSmall: { fontSize: "22px", fontWeight: "800", opacity: 0.3 },
  monthLabelBig: { fontSize: "38px", fontWeight: "900", letterSpacing: "-1px" },
  contentArea: { flex: 1, backgroundColor: "#fff", marginTop: "-40px", borderTopLeftRadius: "45px", borderTopRightRadius: "45px", padding: "35px 25px 0 25px", display: "flex", flexDirection: "column", overflow: "hidden" },
  topRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  dropdown: { color: "#2d3785", fontSize: "19px", fontWeight: "800" },
  performanceBadge: { fontSize: "11px", fontWeight: "800", background: "#f8f9fa", padding: "4px 12px", borderRadius: "12px", color: "#2d3785" },
  scrollArea: { flex: 1, overflowY: "auto" },
  overdueCard: { background: "#fff", borderRadius: "30px", padding: "22px", marginBottom: "20px", boxShadow: "0 15px 35px rgba(255, 71, 87, 0.1)", borderLeft: "6px solid #ff4757" },
  newStudentCard: { background: "linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)", borderRadius: "30px", padding: "22px", marginBottom: "20px", color: "#fff" },
  welcomeFooter: { marginTop: "15px", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.2)", fontSize: "12px", fontStyle: "italic" },
  cardMain: { display: "flex", alignItems: "center", gap: "15px" },
  iconBoxRed: { width: "50px", height: "50px", background: "#fff5f5", borderRadius: "16px", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "22px" },
  iconBoxGold: { width: "50px", height: "50px", background: "rgba(255,255,255,0.2)", borderRadius: "16px", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "22px" },
  cardTitle: { fontWeight: "800", fontSize: "17px" },
  cardSub: { fontSize: "12px", opacity: 0.8 },
  cardPrice: { textAlign: "right" },
  badgeRed: { background: "#ff4757", color: "#fff", padding: "4px 8px", borderRadius: "8px", fontSize: "10px", fontWeight: "900" },
  priceText: { fontSize: "22px", fontWeight: "900", marginTop: "4px" },
  cardActions: { display: "flex", gap: "10px", marginTop: "15px" },
  btnPayRed: { flex: 1, padding: "14px", borderRadius: "18px", border: "none", background: "#ff4757", color: "#fff", fontWeight: "800" },
  btnDismiss: { flex: 1, padding: "14px", borderRadius: "18px", border: "1px solid #eee", background: "transparent", color: "#bdc3c7", fontWeight: "800" },
  successNote: { padding: "25px", borderRadius: "30px", background: "#f1fdf4", color: "#1b5e20", textAlign: "center", marginBottom: "20px", border: "1px dashed #c8e6c9" },
  historyHeading: { padding: "10px 0", fontSize: "12px", fontWeight: "800", color: "#bdc3c7", letterSpacing: "1px" },
  historyRow: { display: "flex", alignItems: "center", gap: "15px", padding: "18px 0", borderBottom: "1px solid #f8f9fa" },
  iconBoxGreen: { width: "42px", height: "42px", background: "#e8f5e9", color: "#4caf50", borderRadius: "14px", display: "flex", justifyContent: "center", alignItems: "center" },
  iconBoxLate: { width: "42px", height: "42px", background: "#fff9e6", color: "#f39c12", borderRadius: "14px", display: "flex", justifyContent: "center", alignItems: "center" },
  historyTitle: { fontWeight: "700", fontSize: "16px", color: "#2d3436" },
  historySub: { fontSize: "12px", color: "#4caf50", fontWeight: "600" },
  lateSub: { fontSize: "12px", color: "#f39c12", fontWeight: "600" },
  historyPrice: { fontSize: "17px", fontWeight: "800", color: "#2d3436" },
  chevron: { color: "#eee", fontSize: "20px" },
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "flex-end" },
  sheet: { width: "100%", background: "#fff", borderTopLeftRadius: "40px", borderTopRightRadius: "40px", padding: "20px 25px 40px 25px" },
  handle: { width: "40px", height: "5px", background: "#eee", borderRadius: "10px", margin: "0 auto 20px auto" },
  receiptBox: { textAlign: 'center' },
  checkCircle: { width: "60px", height: "60px", background: "#4caf50", color: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 15px auto", fontSize: "30px" },
  checkCircleLate: { width: "60px", height: "60px", background: "#f39c12", color: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 15px auto", fontSize: "30px" },
  receiptAmt: { fontSize: "40px", fontWeight: "900", color: "#2d3436" },
  receiptStatus: { fontSize: "11px", color: "#4caf50", fontWeight: "900", letterSpacing: "2px", marginBottom: "25px" },
  detailsGrid: { background: "#f8f9fa", padding: "20px", borderRadius: "25px", textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '10px' },
  detailItem: { display: 'flex', justifyContent: 'space-between', fontSize: '14px' },
  closeBtn: { width: "100%", padding: "16px", borderRadius: "20px", background: "#f1f2f6", border: "none", color: "#2d3436", fontWeight: "800", marginTop: "20px" }
};

export default StudentFees;