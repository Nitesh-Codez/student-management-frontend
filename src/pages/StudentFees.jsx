import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import api from "../services/api";
import html2canvas from "html2canvas";
import { FaLock, FaTimes, FaDownload, FaBook, FaCheckCircle, FaRupeeSign } from "react-icons/fa";

const StudentFees = ({ user }) => {
  // --- App States ---
  const [fees, setFees] = useState([]);
  const [groupedFees, setGroupedFees] = useState({});
  const [isPending, setIsPending] = useState(false);
  const [isNewStudent, setIsNewStudent] = useState(false);
  const [dynamicFee, setDynamicFee] = useState("1000");

  // PDF Preview & Confirmation Modal States
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [selectedGroupForPdf, setSelectedGroupForPdf] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [activePdfKey, setActivePdfKey] = useState(null);

  // Official Fee Structure Mapping
  const feeStructureMap = {
    "LKG": { amount: 400, addOn: null },
    "UKG": { amount: 400, addOn: null },
    "1st": { amount: 500, addOn: null },
    "2nd": { amount: 500, addOn: null },
    "3rd": { amount: 500, addOn: null },
    "4th": { amount: 600, addOn: null },
    "5th": { amount: 600, addOn: "English Communication" },
    "6th": { amount: 800, addOn: "English Communication" },
    "7th": { amount: 800, addOn: "English Communication" },
    "8th": { amount: 1000, addOn: "English Communication" },
    "9th": { amount: 1100, addOn: null },
    "10th": { amount: 1400, addOn: "English Communication" },
    "11th": { amount: 1000, addOn: "Per Subject Rate" },
    "12th": { amount: 1000, addOn: "Per Subject Rate" }
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const now = new Date();
  const currM = now.getMonth();

  useEffect(() => {
    if (!user || !user.id) return;

    const fetchFees = async () => {
      try {
        const res = await api.get(`/api/fees/student/${user.id}`);
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

          const groups = {};
          currentSessionFees.slice().reverse().forEach((f, idx) => {
            const key = `${f.feeMonth}_${f.feeYear}`;
            if (!groups[key]) {
              groups[key] = {
                monthName: months[f.feeMonth],
                year: f.feeYear,
                transactions: [],
                slipNo: `SSC/2026-27/${String(idx + 1).padStart(3, '0')}`
              };
            }
            groups[key].transactions.push(f);
          });
          setGroupedFees(groups);

          setIsPending(res.data.showPopup);
          setIsNewStudent(res.data.isNewStudent);

          // Determine standard fee based on student class configuration
          const studentClassKey = String(user?.class || "5th").trim();
          const configuredFee = feeStructureMap[studentClassKey]?.amount || 
            (currentSessionFees.length > 0 ? currentSessionFees[0].amount : 1000);

          setDynamicFee(configuredFee);
        }
      } catch (err) {
        console.error("Fetch Error:", err);
      }
    };
    fetchFees();
  }, [user?.id, user?.session, user?.class]);

  const handlePayment = (mName) => {
    const upiUrl = `upi://pay?pa=9302122613@ybl&pn=SmartStudentsClasses&am=${dynamicFee}&cu=INR&tn=Fees_For_${mName}_Class_${user?.class || ''}`;
    window.location.href = upiUrl;
  };

  const handlePreviewPDF = async (groupKey) => {
    const group = groupedFees[groupKey];
    if (!group) return;

    setSelectedGroupForPdf({ key: groupKey, group });
    setActivePdfKey(groupKey);
    setIsGeneratingPdf(true);

    setTimeout(async () => {
      const input = document.getElementById(`pdf-receipt-${groupKey}`);
      if (!input) {
        setIsGeneratingPdf(false);
        setSelectedGroupForPdf(null);
        return;
      }

      try {
        const canvas = await html2canvas(input, { scale: 2, useCORS: true, allowTaint: true });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, "PNG", 0, 10, pdfWidth, pdfHeight);
        
        const pdfBlob = pdf.output("bloburl");
        setPreviewPdfUrl(pdfBlob);
        setShowPreviewModal(true);
      } catch (error) {
        console.error("PDF preview generation failed:", error);
        alert("Failed to generate PDF preview.");
      } finally {
        setIsGeneratingPdf(false);
      }
    }, 300);
  };

  const handlePreviewAllPDF = async () => {
    setSelectedGroupForPdf({ key: "all" });
    setActivePdfKey("all");
    setIsGeneratingPdf(true);

    setTimeout(async () => {
      const input = document.getElementById("pdf-receipt-all");
      if (!input) {
        setIsGeneratingPdf(false);
        setSelectedGroupForPdf(null);
        return;
      }

      try {
        const canvas = await html2canvas(input, { scale: 2, useCORS: true, allowTaint: true });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, "PNG", 0, 10, pdfWidth, pdfHeight);
        
        const pdfBlob = pdf.output("bloburl");
        setPreviewPdfUrl(pdfBlob);
        setShowPreviewModal(true);
      } catch (error) {
        console.error("Consolidated PDF preview generation failed:", error);
        alert("Failed to generate full ledger preview.");
      } finally {
        setIsGeneratingPdf(false);
      }
    }, 300);
  };

  const handleConfirmDownload = () => {
    if (!selectedGroupForPdf) return;

    if (selectedGroupForPdf.key === "all") {
      const input = document.getElementById("pdf-receipt-all");
      if (input) {
        html2canvas(input, { scale: 2, useCORS: true, allowTaint: true }).then((canvas) => {
          const imgData = canvas.toDataURL("image/png");
          const pdf = new jsPDF("p", "mm", "a4");
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          pdf.addImage(imgData, "PNG", 0, 10, pdfWidth, pdfHeight);
          pdf.save(`Consolidated_Ledger_${user?.name || 'Student'}.pdf`);
        });
      }
    } else {
      const groupKey = selectedGroupForPdf.key;
      const group = selectedGroupForPdf.group;
      const input = document.getElementById(`pdf-receipt-${groupKey}`);
      if (input && group) {
        html2canvas(input, { scale: 2, useCORS: true, allowTaint: true }).then((canvas) => {
          const imgData = canvas.toDataURL("image/png");
          const pdf = new jsPDF("p", "mm", "a4");
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          pdf.addImage(imgData, "PNG", 0, 10, pdfWidth, pdfHeight);
          pdf.save(`Fee_Slip_${group.slipNo.replace(/\//g, '_')}_${group.monthName}.pdf`);
        });
      }
    }

    setShowPreviewModal(false);
    setPreviewPdfUrl(null);
    setSelectedGroupForPdf(null);
  };

  // --- REAL ADMIN LOCK OVERLAY COMPONENT ---
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalCard}>
        <div style={styles.lockIconContainer}>
          <FaLock style={{ color: "#dc2626", fontSize: "28px" }} />
        </div>
        
        <h2 style={styles.modalTitleText}>Fee Section Locked</h2>
        <p style={styles.modalSubText}>Smart Students Classes • Official Portal</p>
        
        <div style={styles.instructionBanner}>
          You can see fee details later. The accounts ledger has been temporarily locked by administration (<b>Nitesh Kushwah</b>). Please contact the office for any fee verification.
        </div>

        <div style={styles.feeInfoSnippet}>
          <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Standard Class Fee Structure</div>
          <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 'bold', marginTop: '4px' }}>
            Class {user?.class || "Standard"}: ₹{dynamicFee}/month 
            {feeStructureMap[user?.class]?.addOn && ` + ${feeStructureMap[user?.class]?.addOn}`}
          </div>
        </div>

        <div style={styles.modalActions}>
          <button 
            style={styles.primaryButton} 
            onClick={() => window.history.back()}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============= STYLES SYSTEM ============= */
const styles = {
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  modalCard: {
    background: "#ffffff",
    padding: "32px",
    borderRadius: "16px",
    width: "90%",
    maxWidth: "440px",
    textAlign: "center",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
  },
  lockIconContainer: {
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    background: "#fee2e2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px auto",
  },
  modalTitleText: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#1e293b",
    margin: "0 0 6px 0",
  },
  modalSubText: {
    fontSize: "13px",
    color: "#64748b",
    margin: "0 0 20px 0",
  },
  instructionBanner: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    padding: "16px",
    borderRadius: "10px",
    fontSize: "14px",
    color: "#334155",
    lineHeight: "1.5",
    marginBottom: "16px",
    textAlign: "center",
  },
  feeInfoSnippet: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "24px",
    textAlign: "center"
  },
  modalActions: {
    display: "flex",
    justifyContent: "center",
  },
  primaryButton: {
    background: "#2563eb",
    color: "#ffffff",
    border: "none",
    padding: "12px 24px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    width: "100%",
    transition: "background 0.2s",
  }
};

export default StudentFees;