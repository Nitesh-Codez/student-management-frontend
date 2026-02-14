import React, { useState, useEffect } from "react";
import axios from "axios";

const StudentFees = ({ user }) => {
  const API_URL = "https://student-management-system-4-hose.onrender.com";

  const [fees, setFees] = useState([]);
  const [selectedFee, setSelectedFee] = useState(null);
  const [showSheet, setShowSheet] = useState(false);
  const [isPrevMonthPending, setIsPrevMonthPending] = useState(false);
  const [dynamicFee, setDynamicFee] = useState("500");

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const now = new Date();
  const currM = now.getMonth();
  const currY = now.getFullYear();

  useEffect(() => {
    // Force Edge-to-Edge
    document.body.style.margin = "0";
    document.body.style.padding = "0";
   

    if (!user || !user.id) return;

    const fetchFees = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/fees/student/${user.id}`);
        if (res.data.success) {
          let feesData = res.data.fees.map(f => {
            const d = new Date(f.payment_date);
            let month = d.getMonth() - 1;
            let year = d.getFullYear();
            if (month === -1) { month = 11; year -= 1; }
            
            // IMPACT LOGIC: 5 tareek ke baad late
            const isLate = d.getDate() > 6;
            
            return { ...f, feeMonth: month, feeYear: year, isLate, payDay: d.getDate() };
          });
          
          feesData.sort((a, b) => b.feeYear !== a.feeYear ? b.feeYear - a.feeYear : b.feeMonth - a.feeMonth);
          setFees(feesData);

          const prevM = currM === 0 ? 11 : currM - 1;
          const prevY = currM === 0 ? currY - 1 : currY;
          const hasPaidPrev = feesData.some(f => f.feeMonth === prevM && f.feeYear === prevY);
          setIsPrevMonthPending(!hasPaidPrev);

          if (feesData.length > 0) setDynamicFee(feesData[0].amount);
        }
      } catch (err) { console.error(err); }
    };
    fetchFees();
 }, [user, currM, currY]);

  const handlePayment = (mName) => {
    const upiUrl = `upi://pay?pa=9302122613@ybl&pn=SmartZone&am=${dynamicFee}&cu=INR&tn=Fees_For_${mName}`;
    window.location.href = upiUrl;
  };

  const openDetails = (fee) => {
    setSelectedFee(fee);
    setShowSheet(true);
  };

  return (
    <div style={styles.appWrapper}>
      {/* HEADER SECTION - FIXED AT TOP */}
      <div style={styles.header}>
        <div style={styles.statusBar}>
          <span>{now.getHours()}:{now.getMinutes() < 10 ? '0'+now.getMinutes() : now.getMinutes()}</span>
          <div style={{ display: 'flex', gap: '8px' }}>📶 🔋</div>
        </div>
        
        <div style={styles.monthStack}>
          <div style={styles.monthLabelSmall}>{months[currM === 0 ? 11 : currM - 1]} {currM === 0 ? currY - 1 : currY}</div>
          <div style={styles.monthLabelBig}>{months[currM]} {currY}</div>
          <div style={styles.monthLabelSmall}>{months[currM === 11 ? 0 : currM + 1]} {currM === 11 ? currY + 1 : currY}</div>
        </div>
      </div>

      {/* WHITE CONTENT AREA - FLEX GROW TO FILL SCREEN */}
      <div style={styles.contentArea}>
        <div style={styles.topRow}>
          <div style={styles.dropdown}>All Payments ▾</div>
          <div style={styles.performanceBadge}>{now.getDate() <= 5 ? "✅ Early Bird" : "⚠️ Standard"}</div>
        </div>

        {/* SCROLLABLE AREA WITH BOTTOM PADDING */}
        <div style={styles.scrollArea}>
          {isPrevMonthPending && (
            <div style={styles.overdueCard}>
              <div style={styles.cardMain}>
                <div style={styles.iconBoxRed}>⚠️</div>
                <div style={{flex: 1}}>
                  <div style={styles.cardTitle}>Pending: {months[currM === 0 ? 11 : currM - 1]}</div>
                  <div style={styles.cardSub}>👤 {user?.name || "Student"}</div>
                </div>
                <div style={styles.cardPrice}>
                  <div style={styles.badgeRed}>OVERDUE</div>
                  <div style={styles.priceText}>₹{dynamicFee}</div>
                </div>
              </div>
              <div style={styles.cardActions}>
                <button onClick={() => handlePayment(months[currM-1])} style={styles.btnPayRed}>Pay Now</button>
                <button style={styles.btnDismiss}>Ignore</button>
              </div>
            </div>
          )}

          <div style={styles.card}>
            <div style={styles.cardMain}>
              <div style={styles.iconBoxBlue}>📚</div>
              <div style={{flex: 1}}>
                <div style={styles.cardTitle}>{months[currM]} Tuition Fee</div>
                <div style={styles.cardSub}>{now.getDate() <= 5 ? "Pay early to be Punctual" : "Due Date: 5th of Month"}</div>
              </div>
              <div style={styles.cardPrice}>
                <div style={styles.badgeGray}>{now.getDate()} {months[currM].slice(0,3)}</div>
                <div style={styles.priceText}>₹{dynamicFee}</div>
              </div>
            </div>
            <div style={styles.cardActions}>
              <button onClick={() => handlePayment(months[currM])} style={styles.btnPayBlue}>Quick Pay</button>
              <button style={styles.btnDismiss}>Dismiss</button>
            </div>
          </div>

          <div style={styles.historyHeading}>PAID HISTORY (Click for details)</div>

          {fees.map((f, i) => (
            <div key={i} style={styles.historyRow} onClick={() => openDetails(f)}>
              <div style={f.isLate ? styles.iconBoxLate : styles.iconBoxGreen}>
                {f.isLate ? "⌛" : "✓"}
              </div>
              <div style={{flex: 1}}>
                <div style={styles.historyTitle}>{months[f.feeMonth]} Fee</div>
                <div style={f.isLate ? styles.lateSub : styles.historySub}>
                  {f.isLate ? `Late Payment (${f.payDay}th)` : `On Time (${f.payDay}th)`}
                </div>
              </div>
              <div style={styles.historyPrice}>₹{f.amount}</div>
              <div style={styles.chevron}>›</div>
            </div>
          ))}
          
          {/* BOTTOM SPACER: Essential for full scroll visibility */}
          <div style={{ height: "100px" }}></div>
        </div>
      </div>

      {/* RECEIPT BOTTOM SHEET */}
      {showSheet && selectedFee && (
        <div style={styles.overlay} onClick={() => setShowSheet(false)}>
          <div style={styles.sheet} onClick={e => e.stopPropagation()}>
            <div style={styles.handle}></div>
            <div style={styles.receiptBox}>
              <div style={selectedFee.isLate ? styles.checkCircleLate : styles.checkCircle}>
                {selectedFee.isLate ? "!" : "✓"}
              </div>
              <div style={styles.receiptAmt}>₹{selectedFee.amount}</div>
              <div style={selectedFee.isLate ? styles.receiptStatusLate : styles.receiptStatus}>
                {selectedFee.isLate ? "LATE PAYMENT" : "PUNCTUAL PAYMENT"}
              </div>

              <div style={styles.detailsGrid}>
                <div style={styles.detailItem}><span>Month</span><strong>{months[selectedFee.feeMonth]}</strong></div>
                <div style={styles.detailItem}><span>Status</span><strong style={{color: selectedFee.isLate ? '#f39c12' : '#4caf50'}}>{selectedFee.isLate ? 'Delayed' : 'On Time'}</strong></div>
                <div style={styles.detailItem}><span>Date</span><strong>{new Date(selectedFee.payment_date).toLocaleDateString()}</strong></div>
                <div style={styles.detailItem}><span>Time</span><strong>{selectedFee.payment_time}</strong></div>
                <div style={styles.detailItem}><span>Ref ID</span><small style={{fontSize: '9px'}}>{String(selectedFee.id)}</small></div>
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
  header: { background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", padding: "40px 25px 60px 25px", color: "#fff", flexShrink: 0 },
  statusBar: { display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: "700", marginBottom: "30px" },
  monthStack: { display: "flex", flexDirection: "column" },
  monthLabelSmall: { fontSize: "22px", fontWeight: "800", opacity: 0.3 },
  monthLabelBig: { fontSize: "38px", fontWeight: "900", letterSpacing: "-1px" },
  
  contentArea: { flex: 1, backgroundColor: "#fff", marginTop: "-40px", borderTopLeftRadius: "45px", borderTopRightRadius: "45px", padding: "35px 25px 0 25px", display: "flex", flexDirection: "column", overflow: "hidden" },
  topRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexShrink: 0 },
  dropdown: { color: "#2d3785", fontSize: "19px", fontWeight: "800" },
  performanceBadge: { fontSize: "12px", fontWeight: "800", background: "#f8f9fa", padding: "4px 12px", borderRadius: "12px", color: "#2d3785" },
  searchIcon: { color: "#ccc", fontSize: "18px" },
  
  scrollArea: { flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", paddingRight: "5px" },

  card: { background: "#fff", borderRadius: "30px", padding: "22px", marginBottom: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.04)", border: "1px solid #f1f2f6" },
  overdueCard: { background: "#fff", borderRadius: "30px", padding: "22px", marginBottom: "20px", boxShadow: "0 15px 35px rgba(255, 71, 87, 0.1)", borderLeft: "6px solid #ff4757" },
  cardMain: { display: "flex", alignItems: "center", gap: "15px", marginBottom: "15px" },
  iconBoxBlue: { width: "50px", height: "50px", background: "#e3f2fd", borderRadius: "16px", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "22px" },
  iconBoxRed: { width: "50px", height: "50px", background: "#fff5f5", borderRadius: "16px", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "22px" },
  cardTitle: { fontWeight: "800", fontSize: "17px", color: "#2d3436" },
  cardSub: { fontSize: "13px", color: "#b2bec3" },
  cardPrice: { textAlign: "right" },
  badgeGray: { background: "#f1f2f6", padding: "4px 8px", borderRadius: "8px", fontSize: "11px", fontWeight: "bold", color: "#b2bec3" },
  badgeRed: { background: "#ff4757", color: "#fff", padding: "4px 8px", borderRadius: "8px", fontSize: "10px", fontWeight: "900" },
  priceText: { fontSize: "24px", fontWeight: "900", color: "#2d3785", marginTop: "4px" },
  cardActions: { display: "flex", gap: "10px" },
  btnPayBlue: { flex: 1, padding: "14px", borderRadius: "18px", border: "none", background: "linear-gradient(90deg, #4facfe, #00f2fe)", color: "#fff", fontWeight: "800" },
  btnPayRed: { flex: 1, padding: "14px", borderRadius: "18px", border: "none", background: "#ff4757", color: "#fff", fontWeight: "800" },
  btnDismiss: { flex: 1, padding: "14px", borderRadius: "18px", border: "1px solid #f1f2f6", background: "transparent", color: "#bdc3c7", fontWeight: "800" },

  historyHeading: { padding: "10px 0", fontSize: "12px", fontWeight: "800", color: "#bdc3c7", letterSpacing: "1px" },
  historyRow: { display: "flex", alignItems: "center", gap: "15px", padding: "18px 0", borderBottom: "1px solid #f8f9fa" },
  iconBoxGreen: { width: "42px", height: "42px", background: "#e8f5e9", color: "#4caf50", borderRadius: "14px", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "bold" },
  iconBoxLate: { width: "42px", height: "42px", background: "#fff9e6", color: "#f39c12", borderRadius: "14px", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "18px" },
  historyTitle: { fontWeight: "700", fontSize: "16px", color: "#2d3436" },
  historySub: { fontSize: "12px", color: "#4caf50", fontWeight: "600" },
  lateSub: { fontSize: "12px", color: "#f39c12", fontWeight: "600" },
  historyPrice: { fontSize: "18px", fontWeight: "800", color: "#2d3436" },
  chevron: { color: "#eee", fontSize: "20px" },

  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "flex-end" },
  sheet: { width: "100%", background: "#fff", borderTopLeftRadius: "40px", borderTopRightRadius: "40px", padding: "20px 25px 40px 25px" },
  handle: { width: "40px", height: "5px", background: "#eee", borderRadius: "10px", margin: "0 auto 20px auto" },
  receiptBox: { textAlign: 'center' },
  checkCircle: { width: "60px", height: "60px", background: "#4caf50", color: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 15px auto", fontSize: "30px" },
  checkCircleLate: { width: "60px", height: "60px", background: "#f39c12", color: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 15px auto", fontSize: "30px" },
  receiptAmt: { fontSize: "40px", fontWeight: "900", color: "#2d3436" },
  receiptStatus: { fontSize: "11px", color: "#4caf50", fontWeight: "900", letterSpacing: "2px", marginBottom: "25px" },
  receiptStatusLate: { fontSize: "11px", color: "#f39c12", fontWeight: "900", letterSpacing: "2px", marginBottom: "25px" },
  detailsGrid: { background: "#f8f9fa", padding: "20px", borderRadius: "25px", textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '15px' },
  detailItem: { display: 'flex', justifyContent: 'space-between', fontSize: '14px' },
  closeBtn: { width: "100%", padding: "16px", borderRadius: "20px", background: "#f1f2f6", border: "none", color: "#2d3436", fontWeight: "800", marginTop: "20px" }
};

export default StudentFees;