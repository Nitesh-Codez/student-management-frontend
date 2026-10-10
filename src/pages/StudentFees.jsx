import React, { useState } from "react";
import { FaLock, FaShieldAlt, FaExclamationTriangle, FaTimes } from "react-icons/fa";

const StudentFees = () => {
  const [showModal, setShowModal] = useState(true);

  return (
    <div style={styles.container}>
      {/* Background Restricted Notice Card */}
      <div style={styles.lockedCard}>
        <div style={styles.lockIconCircle}>
          <FaLock size={28} color="#dc2626" />
        </div>
        <h2 style={styles.lockedTitle}>Fee Portal Locked</h2>
        <p style={styles.lockedSubtext}>
          Access to fee ledger and digital receipts is temporarily restricted due to security reasons.
        </p>
        <button style={styles.reopenBtn} onClick={() => setShowModal(true)}>
          <FaShieldAlt style={{ marginRight: "8px" }} /> View Security Notice
        </button>
      </div>

      {/* Security Notice Modal / Popup */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <button style={styles.closeBtn} onClick={() => setShowModal(false)}>
              <FaTimes size={16} />
            </button>

            <div style={styles.modalHeader}>
              <div style={styles.modalIconWrapper}>
                <FaExclamationTriangle size={24} color="#d97706" />
              </div>
              <h3 style={styles.modalTitle}>Fee Locker Locked</h3>
            </div>

            <div style={styles.modalBody}>
              <p style={styles.noticeText}>
                The Fee Locker is currently locked due to maintenance and security updates. It will be unlocked shortly.
              </p>
              <div style={styles.infoBox}>
                <p style={styles.infoText}>
                  <strong>Note:</strong> Your payment history and verified digital receipts are completely safe and secure. Please try accessing the portal again after some time.
                </p>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.primaryButton} onClick={() => setShowModal(false)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: "20px",
    maxWidth: "600px",
    margin: "80px auto 0 auto",
    fontFamily: "'Inter', sans-serif",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "60vh"
  },
  lockedCard: {
    background: "#ffffff",
    border: "1px solid #fee2e2",
    borderRadius: "16px",
    padding: "40px 24px",
    textAlign: "center",
    boxShadow: "0 10px 25px -5px rgba(220, 38, 38, 0.08)",
    width: "100%"
  },
  lockIconCircle: {
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    backgroundColor: "#fef2f2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px auto",
    border: "1px solid #fecaca"
  },
  lockedTitle: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#991b1b",
    margin: "0 0 8px 0"
  },
  lockedSubtext: {
    fontSize: "14px",
    color: "#6b7280",
    margin: "0 0 20px 0",
    lineHeight: "1.5"
  },
  reopenBtn: {
    background: "#dc2626",
    color: "#ffffff",
    border: "none",
    padding: "10px 20px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    transition: "background 0.2s"
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    backdropFilter: "blur(4px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: "20px"
  },
  modalContent: {
    background: "#ffffff",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "460px",
    padding: "24px",
    position: "relative",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
    animation: "fadeIn 0.2s ease-out"
  },
  closeBtn: {
    position: "absolute",
    top: "16px",
    right: "16px",
    background: "#f1f5f9",
    border: "none",
    borderRadius: "50%",
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#64748b",
    cursor: "pointer"
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px"
  },
  modalIconWrapper: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    backgroundColor: "#fef3c7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #fde68a"
  },
  modalTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#1e293b",
    margin: 0
  },
  modalBody: {
    marginBottom: "20px"
  },
  noticeText: {
    fontSize: "14px",
    color: "#334155",
    lineHeight: "1.6",
    margin: "0 0 14px 0"
  },
  infoBox: {
    background: "#f8fafc",
    borderLeft: "4px solid #2563eb",
    padding: "12px",
    borderRadius: "0 8px 8px 0"
  },
  infoText: {
    fontSize: "12px",
    color: "#475569",
    margin: 0,
    lineHeight: "1.5"
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end"
  },
  primaryButton: {
    background: "#1e293b",
    color: "#ffffff",
    border: "none",
    padding: "10px 20px",
    borderRadius: "8px",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
    width: "100%"
  }
};

export default StudentFees;