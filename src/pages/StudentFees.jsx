import React, { useState, useEffect } from "react";
import axios from "axios";

const StudentFees = ({ user }) => {
  const API_URL = "https://student-management-system-4-hose.onrender.com";

  // States
  const [fees, setFees] = useState([]);
  const [groupedFees, setGroupedFees] = useState({});
  const [isPending, setIsPending] = useState(false);
  const [isNewStudent, setIsNewStudent] = useState(false);
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
          let feesData = res.data.fees.map(f => {
            const d = new Date(f.payment_date);
            let month = d.getMonth() - 1;
            let year = d.getFullYear();
            if (month === -1) { month = 11; year -= 1; }

            const isLate = d.getDate() > 5;
            return {
              ...f,
              feeMonth: month,
              feeYear: year,
              isLate,
              payDay: d.getDate(),
              formattedDate: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
              mode: f.payment_mode || "Online"
            };
          });

          const currentSessionFees = feesData.filter(f => {
            if (!f.session || !user.session) return true;
            return f.session === user.session;
          });

          currentSessionFees.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
          setFees(currentSessionFees);

          // Grouping transactions by Month & Year to catch installments
          const groups = {};
          currentSessionFees.forEach(f => {
            const key = `${f.feeMonth}_${f.feeYear}`;
            if (!groups[key]) {
              groups[key] = {
                monthName: months[f.feeMonth],
                year: f.feeYear,
                totalAmount: 0,
                transactions: []
              };
            }
            groups[key].totalAmount += Number(f.amount);
            groups[key].transactions.push(f);
          });
          setGroupedFees(groups);

          setIsPending(res.data.showPopup);
          setIsNewStudent(res.data.isNewStudent);

          if (currentSessionFees.length > 0) {
            setDynamicFee(currentSessionFees[0].amount || "1000");
          }
        }
      } catch (err) {
        console.error("Fetch Error:", err);
      }
    };
    fetchFees();
  }, [user.id, user.session]);

  const handlePayment = (mName) => {
    const upiUrl = `upi://pay?pa=9302122613@ybl&pn=SmartZone&am=${dynamicFee}&cu=INR&tn=Fees_For_${mName}`;
    window.location.href = upiUrl;
  };

  // --- PRINT COMPUTERIZED MONTHLY STATEMENT / TRANSACTION RECEIPT ---
  const handlePrintMonthlyReceipt = (groupKey) => {
    const group = groupedFees[groupKey];
    if (!group) return;

    const printWindow = window.open("", "_blank");
    
    // Installment details generation
    let txRows = group.transactions.map((t, idx) => `
      <tr>
        <td style="padding: 10px; border: 1px solid #1a237e; text-align: center;">${idx + 1}</td>
        <td style="padding: 10px; border: 1px solid #1a237e; font-family: monospace;">${t.merchant_txn_id || "TXN_CASH_DIR"}</td>
        <td style="padding: 10px; border: 1px solid #1a237e; text-align: center;">${t.formattedDate}</td>
        <td style="padding: 10px; border: 1px solid #1a237e; text-align: center; font-weight: 600;">${t.mode}</td>
        <td style="padding: 10px; border: 1px solid #1a237e; text-align: center; color: ${t.isLate ? '#c0392b' : '#159349'}; font-weight: bold;">
          ${t.isLate ? 'Late Deposit' : 'Standard'}
        </td>
        <td style="padding: 10px; border: 1px solid #1a237e; text-align: right; font-weight: bold;">₹${t.amount}</td>
      </tr>
    `).join("");

    const isInstallment = group.transactions.length > 1;

    printWindow.document.write(`
      <html>
        <head>
          <title>FeeReceipt_${group.monthName}_${user?.name || 'Student'}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; background: #fff; color: #333; }
            .receipt-box { max-width: 800px; margin: 0 auto; border: 4px double #1a237e; padding: 25px; position: relative; }
            .header-table { width: 100%; border-bottom: 3px solid #1a237e; padding-bottom: 15px; margin-bottom: 20px; }
            .title { font-size: 26px; font-weight: 900; color: #1a237e; margin: 0; }
            .subtitle { font-size: 11px; color: #c0392b; font-weight: bold; letter-spacing: 1px; margin-top: 2px; }
            .doc-type { background: #1a237e; color: #fff; padding: 5px 15px; font-size: 12px; font-weight: bold; display: inline-block; border-radius: 3px; margin-top: 5px; }
            
            .info-grid { width: 100%; border-collapse: collapse; background: #f8f9fa; border: 1px solid #ddd; margin-bottom: 20px; }
            .info-grid td { padding: 8px 12px; font-size: 13px; color: #2c3e50; }
            
            .tx-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            .tx-table th { background: #1a237e; color: #fff; padding: 10px; font-size: 12px; border: 1px solid #1a237e; }
            
            .summary-box { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 20px; background: #f1f3f9; padding: 15px; border: 1px solid #1a237e; }
            
            .footer-sig { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 50px; text-align: center; }
            .sig-line { border-top: 1.5px solid #000; width: 180px; margin-top: 40px; padding-top: 5px; font-size: 12px; font-weight: bold; }
            .seal-circle { width: 90px; height: 90px; border: 2px dashed #1a237e; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: #1a237e; transform: rotate(-5deg); }
            
            @media print {
              body { padding: 0; }
              .receipt-box { border: 4px double #1a237e !important; }
            }
          </style>
        </head>
        <body>
          <div class="receipt-box">
            <table class="header-table">
              <tr>
                <td>
                  <div class="title">SMART STUDENTS CLASSES</div>
                  <div class="subtitle">OFFICIAL ACADEMIC FEE RECEIPT / LEDGER</div>
                  <div class="doc-type">MONTHLY STATEMENT: ${group.monthName.toUpperCase()} ${group.year}</div>
                </td>
                <td style="text-align: right; font-size: 12px; color: #555;">
                  <strong>System Gen ID:</strong> #FEE-${groupKey}<br/>
                  <strong>Print Date:</strong> ${new Date().toLocaleDateString('en-IN')}
                </td>
              </tr>
            </table>

            <table class="info-grid">
              <tr>
                <td><strong>Student Name:</strong> ${user?.name?.toUpperCase() || "N/A"}</td>
                <td><strong>Roll Number / ID:</strong> #${user?.id || "N/A"}</td>
              </tr>
              <tr>
                <td><strong>Class / Course:</strong> Class ${user?.class || "Smart Group"}</td>
                <td><strong>Active Session:</strong> ${user?.session || "2026-2027"}</td>
              </tr>
              <tr>
                <td><strong>Payment Breakdown:</strong> ${isInstallment ? '⚠️ MULTIPLE PARTIAL INSTALLMENTS' : '⚡ SINGLE ON-TIME PAYMENT'}</td>
                <td><strong>Status:</strong> <span style="color: green; font-weight: bold;">💸 VERIFIED & RECORDED</span></td>
              </tr>
            </table>

            <h4 style="margin: 10px 0 5px 0; color: #1a237e; font-size: 14px;">TRANSACTION BREAKDOWN</h4>
            <table class="tx-table">
              <thead>
                <tr>
                  <th>SR.</th>
                  <th>TRANSACTION / REFERENCE ID</th>
                  <th>PAYMENT DATE</th>
                  <th>MODE</th>
                  <th>TIMELINE</th>
                  <th style="text-align: right;">AMOUNT PAID</th>
                </tr>
              </thead>
              <tbody>
                ${txRows}
                <tr style="background: #eef2ff; font-weight: bold;">
                  <td colSpan="5" style="padding: 10px; border: 1px solid #1a237e; text-align: right; color: #1a237e;">TOTAL FEES COLLECTED:</td>
                  <td style="padding: 10px; border: 1px solid #1a237e; text-align: right; font-size: 15px; color: #1a237e;">₹${group.totalAmount}</td>
                </tr>
              </tbody>
            </table>

            <div class="summary-box">
              <div style="font-size: 11px; color: #555; max-width: 60%;">
                <strong>Note:</strong> This is a verified electronic computerized statement generated by SmartZone accounts terminal. No physical signature is mandatory unless disputed.
              </div>
              <div style="text-align: right; font-size: 13px;">
                <strong>Payment Type:</strong> ${isInstallment ? 'Installment Plan' : 'Full Clear Plan'}<br/>
                <strong>Gross Received:</strong> <span style="font-weight: 900; color: #1a237e;">₹${group.totalAmount}</span>
              </div>
            </div>

            <div class="footer-sig">
              <div class="seal-circle">
                <div>SMART ZONE</div>
                <div style="font-size:7px; margin-top:2px;">OFFICIAL</div>
                <div style="font-size:8px;">ACCOUNTS</div>
              </div>
              <div>
                <div style="font-family: 'Courier New', monospace; font-style: italic; font-size: 14px; color: #1a237e; font-weight: bold;">Nitesh Kushwah</div>
                <div class="sig-line">Authorized Controller</div>
              </div>
            </div>
          </div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // --- PRINT ALL CONSOLIDATED HISTORY ---
  const handlePrintAll = () => {
    const printWindow = window.open("", "_blank");
    let ledgerItems = fees.map((f, idx) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #1a237e; text-align:center;">${idx+1}</td>
        <td style="padding: 8px; border: 1px solid #1a237e; font-weight:bold;">${months[f.feeMonth]} ${f.feeYear}</td>
        <td style="padding: 8px; border: 1px solid #1a237e; font-family:monospace;">#${f.id || 'N/A'}</td>
        <td style="padding: 8px; border: 1px solid #1a237e; text-align:center;">${f.formattedDate}</td>
        <td style="padding: 8px; border: 1px solid #1a237e; text-align:center;">${f.mode}</td>
        <td style="padding: 8px; border: 1px solid #1a237e; text-align:center; color:${f.isLate ? '#c0392b':'#159349'}; font-weight:600;">${f.isLate ? 'Late':'On-Time'}</td>
        <td style="padding: 8px; border: 1px solid #1a237e; text-align:right; font-weight:bold;">₹${f.amount}</td>
      </tr>
    `).join("");

    const totalSessionFees = fees.reduce((acc, curr) => acc + Number(curr.amount), 0);

    printWindow.document.write(`
      <html>
        <head>
          <title>Consolidated_Statement_${user?.name || 'Student'}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; }
            .container { border: 4px double #1a237e; padding: 25px; }
            .header { border-bottom: 3px solid #1a237e; padding-bottom: 10px; margin-bottom: 20px; }
            .title { font-size: 24px; font-weight: 900; color: #1a237e; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background: #1a237e; color: #fff; padding: 8px; font-size: 12px; border: 1px solid #1a237e; }
            .footer { display: flex; justify-content: space-between; margin-top: 50px; }
            .sig-line { border-top: 1.5px solid #000; width: 180px; text-align: center; padding-top: 5px; font-weight: bold; font-size: 12px;}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="title">SMART STUDENTS CLASSES</div>
              <div style="font-size:12px; font-weight:bold; color:#c0392b;">CONSOLIDATED ACADEMIC FEE LEDGER STATEMENT</div>
              <div style="font-size:11px; margin-top:5px; color:#555;">Generated for Session: ${user?.session || '2026-27'} | Date: ${new Date().toLocaleDateString('en-IN')}</div>
            </div>

            <table style="width:100%; margin-bottom:20px; background:#f9f9f9; border:1px solid #ddd;">
              <tr>
                <td style="padding:8px; font-size:13px;"><strong>Student Name:</strong> ${user?.name?.toUpperCase() || "N/A"}</td>
                <td style="padding:8px; font-size:13px;"><strong>Roll No / ID:</strong> #${user?.id || "N/A"}</td>
                <td style="padding:8px; font-size:13px;"><strong>Class:</strong> Class ${user?.class || "N/A"}</td>
              </tr>
            </table>

            <table>
              <thead>
                <tr>
                  <th>SR.</th>
                  <th>FEE MONTH</th>
                  <th>RECEIPT ID</th>
                  <th>PAYMENT DATE</th>
                  <th>MODE</th>
                  <th>TIMELINE</th>
                  <th style="text-align:right;">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                ${ledgerItems}
                <tr style="background:#f1f3f9; font-weight:900;">
                  <td colSpan="6" style="padding:10px; border:1px solid #1a237e; text-align:right;">SESSION GRAND TOTAL COLLECTED:</td>
                  <td style="padding:10px; border:1px solid #1a237e; text-align:right; font-size:14px; color:#1a237e;">₹${totalSessionFees}</td>
                </tr>
              </tbody>
            </table>

            <div class="footer">
              <div style="border: 2px dashed #1a237e; width:90px; height:90px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold; color:#1a237e;">OFFICIAL SEAL</div>
              <div>
                <div style="font-family: 'Courier New', monospace; font-style: italic; font-weight:bold; color:#1a237e; text-align:center;">Nitesh Kushwah</div>
                <div class="sig-line">Authorized Signatory</div>
              </div>
            </div>
          </div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div style={styles.appWrapper}>
      {/* --- PROFESSIONAL CLEAN WHITE DASHBOARD WRAPPER --- */}
      <div style={styles.header}>
        <div style={styles.brandingZone}>
          <h2 style={styles.brandTitle}>SMART STUDENTS CLASSES</h2>
          <p style={styles.brandSub}>Accounts Ledger Management Terminal</p>
        </div>
        <div style={styles.sessionBox}>
          <span>Active Session: <b>{user?.session || "2026-27"}</b></span>
        </div>
      </div>

      <div style={styles.contentArea}>
        {/* --- SYSTEM STATS & INFO BAR --- */}
        <div style={styles.infoBarRow}>
          <div style={styles.profileIndicator}>
            <span style={styles.dotAccent}></span>
            <strong>{user?.name || "Student"}</strong> (Class {user?.class || "Smart Group"})
          </div>
          {fees.length > 0 && (
            <button onClick={handlePrintAll} style={styles.btnPrintAll}>
              🖨️ Print Full Ledger Statement
            </button>
          )}
        </div>

        {/* --- CASE 1: PENDING DUES ALERT --- */}
        {isPending && (
          <div style={styles.overdueCard}>
            <div style={styles.cardMain}>
              <div style={styles.iconBoxRed}>⚠️</div>
              <div style={{ flex: 1 }}>
                <div style={styles.cardTitle}>Outstanding Due Found!</div>
                <div style={styles.cardSub}>Pending fees statement generated for recent academic period.</div>
              </div>
              <div style={styles.cardPrice}>
                <span style={styles.badgeRed}>DUE STATUS</span>
                <div style={styles.priceText}>₹{dynamicFee}</div>
              </div>
            </div>
            <div style={styles.cardActions}>
              <button onClick={() => handlePayment(months[currM - 1])} style={styles.btnPayRed}>Proceed to Instant UPI Settlement</button>
            </div>
          </div>
        )}

        {/* --- CASE 2: NEW JOINING WELCOME --- */}
        {!isPending && isNewStudent && (
          <div style={styles.newStudentCard}>
            <div style={styles.cardMain}>
              <div style={styles.iconBoxGold}>🎓</div>
              <div style={{ flex: 1 }}>
                <div style={styles.cardTitle}>Welcome Setup Initiated</div>
                <div style={styles.cardSub}>Accounts ledger database config ready for Class {user?.class}.</div>
              </div>
            </div>
            <div style={styles.welcomeFooter}>Accounts structure synced successfully. Regular logs will appear below.</div>
          </div>
        )}

        {/* --- CASE 3: PUNCTUAL DUES CLEARED --- */}
        {!isPending && !isNewStudent && (
          <div style={styles.successNote}>
            <div style={styles.shieldVerify}>✓</div>
            <div style={{ textAlign: 'left' }}>
              <strong style={{ fontSize: '15px', color: '#159349' }}>All Session Accounts Balanced</strong>
              <div style={{ fontSize: '12px', color: '#555', marginTop: '1px' }}>No active outstanding invoices detected on this server.</div>
            </div>
          </div>
        )}

        {/* --- COMPUTERIZED MONTHLY LOG VIEW (VERTICAL COMPONENT DETAILS) --- */}
        <div style={styles.ledgerHeading}>VERIFIED MONTHLY TRANSACTION STACKS</div>
        
        {Object.keys(groupedFees).length > 0 ? (
          <div style={styles.stackContainer}>
            {Object.keys(groupedFees).map((key) => {
              const group = groupedFees[key];
              const hasMultipleInstallments = group.transactions.length > 1;

              return (
                <div key={key} style={styles.monthCard}>
                  {/* Vertical Details Block */}
                  <div style={styles.monthMetaBlock}>
                    <div style={styles.monthNameTag}>{group.monthName.toUpperCase()} {group.year}</div>
                    <div style={styles.paymentStructureBadge}>
                      {hasMultipleInstallments ? "📋 Paid in Installments" : "⚡ Single Clean Payment"}
                    </div>
                  </div>

                  <div style={styles.verticalTxDetails}>
                    <div style={styles.totalCollectedLabel}>
                      Gross Fees Logged: <strong style={{color: '#1a237e', fontSize: '16px'}}>₹{group.totalAmount}</strong>
                    </div>

                    {/* Collapsed view of installments inside the card */}
                    <div style={styles.miniTxLogsContainer}>
                      {group.transactions.map((t, idx) => (
                        <div key={idx} style={styles.miniTxRow}>
                          <span style={styles.miniTxBullet}>▪</span>
                          <span style={styles.miniTxMode}>{t.mode}: </span>
                          <span style={styles.miniTxDate}>Paid ₹{t.amount} on {t.formattedDate}</span>
                          <span style={t.isLate ? styles.lateTextLabel : styles.ontimeTextLabel}>
                            ({t.isLate ? 'Late' : 'Standard'})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={styles.monthActionBlock}>
                    <button 
                      onClick={() => handlePrintMonthlyReceipt(key)} 
                      style={styles.btnGetReceiptComputer}
                    >
                      📄 Computerized Receipt
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '30px', marginBottom: '8px' }}>📂</div>
            No validated transaction ledgers tracked for Session {user?.session || 'Current'}.
          </div>
        )}
      </div>
    </div>
  );
};

/* ============= OFFICIAL ACCOUNT TERMINAL DESIGN SYSTEM ============= */
const styles = {
  appWrapper: { 
    width: "100%", 
    minHeight: "100vh", 
    backgroundColor: "#f4f6f9", 
    display: "flex", 
    flexDirection: "column", 
    fontFamily: "'Segoe UI', Roboto, Helvetica, sans-serif",
  },
  header: { 
    background: "#fff", 
    padding: "20px 24px", 
    color: "#333", 
    borderBottom: "3px solid #1a237e",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
  },
  brandingZone: { textAlign: "left" },
  brandTitle: { margin: 0, color: "#1a237e", fontWeight: "900", fontSize: "1.6rem", letterSpacing: "0.5px" },
  brandSub: { margin: "2px 0 0 0", color: "#c0392b", fontSize: "0.8rem", fontWeight: "bold", letterSpacing: "1px" },
  sessionBox: { background: "#f1f3f9", padding: "6px 14px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "0.85rem", color: "#2c3e50" },
  
  contentArea: { 
    flex: 1, 
    padding: "24px", 
    display: "flex", 
    flexDirection: "column",
    maxWidth: "1000px",
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box"
  },
  infoBarRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  profileIndicator: { fontSize: "0.95rem", color: "#333", display: "flex", alignItems: "center", gap: "8px" },
  dotAccent: { width: "8px", height: "8px", backgroundColor: "#159349", borderRadius: "50%" },
  btnPrintAll: { padding: "8px 16px", background: "#1a237e", color: "#fff", borderRadius: "4px", border: "none", fontWeight: "bold", fontSize: "0.8rem", cursor: "pointer", boxShadow: "0 2px 5px rgba(26,35,126,0.2)" },
  
  overdueCard: { background: "#fff", borderRadius: "6px", padding: "20px", marginBottom: "20px", border: "1px solid #ddd", borderLeft: "5px solid #c0392b", boxShadow: "0 2px 6px rgba(0,0,0,0.04)" },
  cardMain: { display: "flex", alignItems: "center", gap: "14px" },
  iconBoxRed: { width: "40px", height: "40px", background: "#fde8e8", color: "#c0392b", borderRadius: "4px", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "18px", fontWeight: "bold" },
  cardTitle: { fontWeight: "bold", fontSize: "1rem", color: "#111" },
  cardSub: { fontSize: "0.8rem", color: "#666", marginTop: "2px" },
  cardPrice: { textAlign: "right", marginLeft: "auto" },
  badgeRed: { background: "#c0392b", color: "#fff", padding: "2px 6px", borderRadius: "3px", fontSize: "0.65rem", fontWeight: "bold" },
  priceText: { fontSize: "1.4rem", fontWeight: "900", marginTop: "2px", color: "#c0392b" },
  cardActions: { marginTop: "15px", display: "flex" },
  btnPayRed: { width: "100%", padding: "10px", borderRadius: "4px", border: "none", background: "#c0392b", color: "#fff", fontWeight: "bold", fontSize: "0.9rem", cursor: "pointer" },

  newStudentCard: { background: "#f8f9fa", border: "1px solid #ddd", borderLeft: "5px solid #f39c12", borderRadius: "6px", padding: "20px", marginBottom: "20px" },
  iconBoxGold: { width: "40px", height: "40px", background: "#fef9ec", borderRadius: "4px", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "18px" },
  welcomeFooter: { marginTop: "10px", paddingTop: "8px", borderTop: "1px dashed #ddd", fontSize: "0.75rem", color: "#666" },

  successNote: { display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", borderRadius: "6px", background: "#edf7ed", marginBottom: "20px", border: "1px solid #c8e6c9" },
  shieldVerify: { width: "24px", height: "24px", backgroundColor: "#159349", color: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContext: "center", justifyContent: "center", fontWeight: "bold", fontSize: "12px" },

  ledgerHeading: { fontSize: "0.75rem", fontWeight: "bold", color: "#777", letterSpacing: "1px", marginBottom: "10px", textTransform: "uppercase" },
  stackContainer: { display: "flex", flexDirection: "column", gap: "14px" },
  
  /* Modern High-Tech Compact Month Card Layout */
  monthCard: { background: "#fff", border: "1px solid #ddd", borderRadius: "6px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px", boxShadow: "0 2px 5px rgba(0,0,0,0.02)" },
  monthMetaBlock: { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee", paddingBottom: "8px" },
  monthNameTag: { fontValues: "sans-serif", fontWeight: "900", color: "#1a237e", fontSize: "1.1rem" },
  paymentStructureBadge: { fontSize: "0.7rem", fontWeight: "bold", background: "#eef2ff", color: "#1a237e", padding: "4px 8px", borderRadius: "4px", border: "1px solid #c7d2fe" },
  
  verticalTxDetails: { display: "flex", flexDirection: "column", gap: "8px", textAlign: "left" },
  totalCollectedLabel: { fontSize: "0.85rem", color: "#555" },
  miniTxLogsContainer: { background: "#f8f9fa", padding: "8px 12px", borderRadius: "4px", border: "1px solid #edf2f7" },
  miniTxRow: { fontSize: "0.8rem", color: "#444", display: "flex", alignItems: "center", gap: "6px", padding: "3px 0" },
  miniTxBullet: { color: "#1a237e" },
  miniTxMode: { fontWeight: "bold", color: "#333" },
  miniTxDate: { color: "#666" },
  lateTextLabel: { color: "#c0392b", fontWeight: "bold", fontSize: "0.75rem", marginLeft: "4px" },
  ontimeTextLabel: { color: "#159349", fontWeight: "bold", fontSize: "0.75rem", marginLeft: "4px" },

  monthActionBlock: { display: "flex", justifyContent: "flex-end", borderTop: "1px solid #eee", paddingTop: "10px" },
  btnGetReceiptComputer: { background: "#fff", color: "#1a237e", border: "1px solid #1a237e", padding: "6px 14px", borderRadius: "4px", fontSize: "0.8rem", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s" },

  emptyState: { textAlign: "center", padding: "40px 20px", color: "#999", fontSize: "0.85rem", background: "#fff", border: "1px dashed #ccc", borderRadius: "6px" }
};

export default StudentFees;