
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const resolveStudentData = (propUser) => {
  if (propUser && typeof propUser === "object") {
    const u = propUser.user || propUser;
    return {
      id: u.id ?? u.studentId ?? u.student_id ?? u.userId ?? "",
      name: u.name ?? u.fullName ?? u.studentName ?? ""
    };
  }

  const keys = [
    "user", "currentUser", "studentUser",
    "authUser", "loggedInUser"
  ];

  for (const key of keys) {
    try {
      const raw =
        localStorage.getItem(key) || sessionStorage.getItem(key);

      if (!raw) continue;

      const parsed = JSON.parse(raw);
      const obj = parsed?.user || parsed;
      const id =
        obj?.id ?? obj?.studentId ??
        obj?.student_id ?? obj?.userId;

      if (id) {
        return {
          id,
          name: obj?.name ?? obj?.fullName ?? obj?.studentName ?? ""
        };
      }
    } catch {
      // Ignore invalid stored data
    }
  }

  return { id: "", name: "" };
};

export default function VivaVerificationPage({ user, onVerified }) {
  const navigate = useNavigate();

  const stored = useMemo(
    () => resolveStudentData(user),
    [user]
  );

  const [studentId, setStudentId] = useState(stored.id);
  const [otp, setOtp] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [resendTimer, setResendTimer] = useState(0);

  const [isVerified, setIsVerified] = useState(
    () =>
      sessionStorage.getItem("viva_verified") === "true" &&
      sessionStorage.getItem("viva_verified_student_id") ===
        String(stored.id)
  );

  const [popup, setPopup] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [isOnline, setIsOnline] = useState(
    () => navigator.onLine
  );

  const [cameraStatus, setCameraStatus] = useState("not-checked");
  const [cameraLoading, setCameraLoading] = useState(false);
  const [botSpeaking, setBotSpeaking] = useState(false);

  // --------------------------------
  // SMARTBOT VOICE
  // --------------------------------

  const botMessage = `
    Hello ${stored.name || "Student"}.
    Welcome to Smart Students Classes.
    I am SmartBot, your virtual examination assistant.

    Firstly, I will verify your identity before your AI Interview.

    I will send a six digit verification code to your registered email address.
    Please enter that code to verify your identity.

    Before proceeding, please ensure that your internet connection
    is stable and your camera is working properly.

    Once verification is completed, you can continue to your AI Interview.

    Best wishes for your examination.
  `;

  const speakBot = useCallback((message = botMessage) => {
    if (!("speechSynthesis" in window)) {
      setErrorMsg("Voice support is not available in this browser.");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);

    utterance.lang = "en-US";
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => setBotSpeaking(true);
    utterance.onend = () => setBotSpeaking(false);
    utterance.onerror = () => setBotSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [botMessage]);

  useEffect(() => {
    // Try greeting automatically.
    // If browser blocks autoplay, user can press Hear SmartBot.
    const timer = setTimeout(() => {
      speakBot();
    }, 800);

    return () => {
      clearTimeout(timer);
      window.speechSynthesis?.cancel();
    };
  }, [speakBot]);

  // --------------------------------
  // INTERNET STATUS
  // --------------------------------

  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);

    window.addEventListener("online", online);
    window.addEventListener("offline", offline);

    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);

  // --------------------------------
  // RESEND TIMER
  // --------------------------------

  useEffect(() => {
    if (resendTimer <= 0) return;

    const timer = setTimeout(() => {
      setResendTimer((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [resendTimer]);

  // --------------------------------
  // CAMERA CHECK
  // --------------------------------

  const checkCamera = async () => {
    setCameraLoading(true);
    setCameraStatus("checking");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access is not supported.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });

      stream.getTracks().forEach((track) => track.stop());

      setCameraStatus("ready");
    } catch (error) {
      console.error("Camera check:", error);
      setCameraStatus("error");
    } finally {
      setCameraLoading(false);
    }
  };

  // --------------------------------
  // SEND OTP
  // --------------------------------

  const handleSendOtp = async (e) => {
    e.preventDefault();

    if (sending || resendTimer > 0) return;

    setErrorMsg("");

    const cleanId = String(studentId).trim();

    if (!cleanId) {
      setErrorMsg("Please enter a valid Student ID.");
      return;
    }

    if (!navigator.onLine) {
      setErrorMsg("Internet connection is unavailable.");
      return;
    }

    setSending(true);

    try {
      const res = await api.post(
        "/api/interview/email-verification",
        {
          studentId: cleanId,
          action: "send"
        }
      );

      if (!res.data?.success) {
        throw new Error(
          res.data?.message || "Unable to send OTP."
        );
      }

      setOtpSent(true);
      setMaskedEmail(res.data.email || "");
      setOtp("");
      setResendTimer(30);

      setPopup({
        type: "success",
        title: "Verification Code Sent!",
        message: `A 6-digit verification code has been sent to ${
          res.data.email || "your registered email"
        }. Please check your inbox or spam folder and enter the code below. The code is valid for 5 minutes.`,
        actionLabel: "Enter Verification Code",
        onAction: () => {
          setPopup(null);
          setTimeout(() => {
            document.getElementById("viva-otp-input")?.focus();
          }, 100);
        }
      });

      speakBot(
        "Great! Your verification code has been sent successfully. " +
        "Please check your registered email address and enter the six digit code. " +
        "The code is valid for five minutes."
      );

    } catch (error) {
      console.error("Send OTP:", error);

      setErrorMsg(
        error.response?.data?.message ||
        error.message ||
        "Could not send verification code."
      );
    } finally {
      setSending(false);
    }
  };

  // --------------------------------
  // VERIFY OTP
  // --------------------------------

  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    if (verifying) return;

    setErrorMsg("");

    const cleanId = String(studentId).trim();
    const cleanOtp = String(otp).trim();

    if (!cleanId || !/^\d{6}$/.test(cleanOtp)) {
      setErrorMsg("Please enter a valid 6-digit OTP.");
      return;
    }

    if (!navigator.onLine) {
      setErrorMsg("Internet connection is unavailable.");
      return;
    }

    setVerifying(true);

    try {
      const res = await api.post(
        "/api/interview/email-verification",
        {
          studentId: cleanId,
          otp: cleanOtp,
          action: "verify"
        }
      );

      if (!res.data?.success || !res.data?.verified) {
        throw new Error(
          res.data?.message || "Invalid or expired OTP."
        );
      }

      setIsVerified(true);

      sessionStorage.setItem("viva_verified", "true");
      sessionStorage.setItem(
        "viva_verified_student_id",
        cleanId
      );

      onVerified?.({
        studentId: cleanId,
        email: maskedEmail
      });

      setPopup({
        type: "success",
        title: "Identity Verified Successfully!",
        message:
          "Your registered email has been verified. " +
          "You can now proceed to your English AI Interview.",
        actionLabel: "Continue to AI Interview",
        onAction: () => {
          window.speechSynthesis?.cancel();

          speakBot(
            "Congratulations! Your identity verification is complete. " +
            "You can now proceed to your AI interview. Best wishes!"
          );

          navigate(
            "/student/interview-english-practice",
            { replace: true }
          );
        }
      });

    } catch (error) {
      console.error("Verify OTP:", error);

      setErrorMsg(
        error.response?.data?.message ||
        error.message ||
        "OTP verification failed."
      );
    } finally {
      setVerifying(false);
    }
  };

  // --------------------------------
  // UI
  // --------------------------------

  return (
    <div style={styles.page}>

      {/* POPUP */}

      {popup && (
        <div style={styles.overlay}>
          <div style={styles.popup}>

            <div style={styles.popupIcon}>
              {popup.type === "success" ? "✓" : "!"}
            </div>

            <h2 style={styles.popupTitle}>
              {popup.title}
            </h2>

            <p style={styles.popupText}>
              {popup.message}
            </p>

            <button
              type="button"
              onClick={popup.onAction}
              style={styles.popupButton}
            >
              {popup.actionLabel}
            </button>

          </div>
        </div>
      )}

      <div style={styles.main}>

        {/* HEADER */}

        <div style={styles.header}>
          <div style={styles.logo}>SS</div>

          <div>
            <h2 style={styles.brand}>
              Welcome  to Interview Platform
            </h2>
            <p style={styles.brandSub}>
              AI Viva & Examination Portal
            </p>
          </div>
        </div>

        {/* PROGRESS */}

        <div style={styles.progress}>
          <div style={styles.stepActive}>
            <span>1</span>
            <small>Email Verification</small>
          </div>

          <div style={styles.progressLine} />

          <div style={styles.step}>
            <span>2</span>
            <small>AI Interview</small>
          </div>

          <div style={styles.progressLine} />

          <div style={styles.step}>
            <span>3</span>
            <small>Completion</small>
          </div>
        </div>

        {/* SMARTBOT */}

        <div style={styles.botCard}>

          <div style={styles.botTop}>
            <div style={styles.botAvatar}>🤖</div>

            <div style={{ flex: 1 }}>
              <h3 style={styles.botName}>SmartBot</h3>
              <p style={styles.botStatus}>
                <span style={styles.onlineDot} />
                Your AI Examination Assistant
              </p>
            </div>

            <span style={styles.botTag}>AI ASSISTANT</span>
          </div>

          <div style={styles.botMessage}>
            <strong>Hello {stored.name || "Student"}!</strong>
            <p>
              Welcome to Smart Students Classes. Firstly,
              I will verify your identity before your AI Interview.
              Please verify your registered email address and
              make sure your internet connection and camera are ready.
            </p>
          </div>

          <button
            type="button"
            onClick={() => speakBot()}
            style={styles.voiceButton}
          >
            {botSpeaking ? "🔊 SmartBot Speaking..." : "🔊 Hear SmartBot"}
          </button>

        </div>

        {/* MAIN CONTENT */}

        <div style={styles.content}>

          <div style={styles.heading}>
            <h1>Viva Identity Verification</h1>
            <p>
              Complete the verification process to enter your
              AI-powered viva examination.
            </p>
          </div>

          {/* STUDENT */}

          <div style={styles.studentBox}>
            <div style={styles.studentIcon}>👨‍🎓</div>

            <div style={{ flex: 1 }}>
              <small>Student Name</small>
              <strong>{stored.name || "Student"}</strong>
            </div>

            <div style={styles.idBox}>
              <small>Student ID</small>
              <strong>{studentId || "Not available"}</strong>
            </div>
          </div>

          {/* EMAIL VERIFICATION */}

          <div style={styles.section}>
            <h3>📧 Email Verification</h3>

            <p style={styles.description}>
              A one-time verification code will be sent to your
              registered student email address.
            </p>

            <form onSubmit={handleSendOtp}>

              {!stored.id && (
                <div style={{ marginBottom: 14 }}>
                  <label style={styles.label}>Student ID</label>

                  <input
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="Enter your Student ID"
                    style={styles.input}
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={sending || resendTimer > 0 || otpSent && resendTimer > 0}
                style={{
                  ...styles.sendButton,
                  opacity: sending || resendTimer > 0 ? 0.6 : 1
                }}
              >
                {resendTimer > 0
                  ? `Resend OTP in ${resendTimer}s`
                  : otpSent
                  ? "Resend Verification Code"
                  : "Send Verification Code"}
              </button>

            </form>

            {/* OTP INPUT - ONLY AFTER SENDING */}

            {otpSent && !isVerified && (
              <div style={styles.otpSection}>

                <div style={styles.emailNotice}>
                  <span>✉️</span>
                  <div>
                    <strong>Check your email</strong>
                    <p>
                      Verification code sent to {maskedEmail}.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleVerifyOtp}>

                  <label style={styles.label}>
                    Enter 6-Digit Verification Code
                  </label>

                  <input
                    id="viva-otp-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="000000"
                    style={styles.otpInput}
                    required
                  />

                  <p style={styles.otpHint}>
                    Your verification code expires in 5 minutes.
                  </p>

                  <button
                    type="submit"
                    disabled={verifying || otp.length !== 6}
                    style={{
                      ...styles.verifyButton,
                      opacity: verifying || otp.length !== 6 ? 0.6 : 1
                    }}
                  >
                    {verifying
                      ? "Please wait..."
                      : "Verify Identity →"}
                  </button>

                </form>
              </div>
            )}

            {isVerified && (
              <div style={styles.verifiedBox}>
                ✓ Email Identity Verified Successfully
              </div>
            )}

            {errorMsg && (
              <div style={styles.errorBox}>
                ⚠️ {errorMsg}
              </div>
            )}

          </div>

          {/* SYSTEM CHECKS */}

          <div style={styles.section}>
            <h3>🖥️ Examination Readiness Check</h3>

            <p style={styles.description}>
              Please check your device before starting the AI Interview.
            </p>

            <div style={styles.checkRow}>
              <div>
                <strong>🌐 Internet Connection</strong>
                <small>Network connectivity status</small>
              </div>

              <span style={{
                ...styles.status,
                background: isOnline ? "#dcfce7" : "#fee2e2",
                color: isOnline ? "#15803d" : "#dc2626"
              }}>
                {isOnline ? "Online ✓" : "Offline"}
              </span>
            </div>

            <div style={styles.checkRow}>
              <div>
                <strong>📷 Camera Availability</strong>
                <small>Camera permission and availability</small>
              </div>

              <span style={{
                ...styles.status,
                background:
                  cameraStatus === "ready" ? "#dcfce7" :
                  cameraStatus === "error" ? "#fee2e2" :
                  "#f1f5f9",
                color:
                  cameraStatus === "ready" ? "#15803d" :
                  cameraStatus === "error" ? "#dc2626" :
                  "#475569"
              }}>
                {cameraStatus === "ready" ? "Ready ✓" :
                 cameraStatus === "error" ? "Check Failed" :
                 cameraStatus === "checking" ? "Checking..." :
                 "Not Checked"}
              </span>
            </div>

            <button
              type="button"
              onClick={checkCamera}
              disabled={cameraLoading}
              style={styles.cameraButton}
            >
              {cameraLoading ? "Checking Camera..." : "Test Camera"}
            </button>

            <p style={styles.cameraHint}>
              Camera testing is optional on this verification page.
              Your AI Interview may require camera permission.
            </p>

          </div>

          {/* CONTINUE */}

          {isVerified && (
            <button
              type="button"
              disabled={!isOnline}
              onClick={() => {
                speakBot(
                  "Your email verification is complete. " +
                  "Let's proceed to your AI interview."
                );

               navigate(
  "/student/interview-english-practice",
  { replace: true }
);
              }}
              style={styles.continueButton}
            >
              Continue to AI Interview →
            </button>
          )}

          <p style={styles.footer}>
            Secure Student Verification • Smart Students Classes
            <br />
            Academic Session 2026–27
          </p>

        </div>
      </div>
    </div>
  );
}

// --------------------------------
// STYLES
// --------------------------------

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f1f5f9",
    padding: "25px 15px",
    fontFamily: "Inter, system-ui, sans-serif",
    color: "#0f172a"
  },

  main: {
    maxWidth: "720px",
    margin: "auto",
    background: "#fff",
    borderRadius: "18px",
    overflow: "hidden",
    boxShadow: "0 15px 45px rgba(15,23,42,0.08)"
  },

  header: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
    padding: "22px 25px",
    borderBottom: "1px solid #e2e8f0"
  },

  logo: {
    width: "48px",
    height: "48px",
    borderRadius: "13px",
    background: "#1e3a8a",
    color: "#fff",
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    fontSize: "19px"
  },

  brand: {
    margin: 0,
    fontSize: "18px",
    color: "#1e3a8a"
  },

  brandSub: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "12px"
  },

  progress: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "23px 12px",
    background: "#f8fafc"
  },

  stepActive: {
    display: "flex",
    alignItems: "center",
    flexDirection: "column",
    gap: "6px",
    color: "#2563eb",
    fontWeight: 700,
    fontSize: "12px",
    textAlign: "center"
  },

  step: {
    display: "flex",
    alignItems: "center",
    flexDirection: "column",
    gap: "6px",
    color: "#94a3b8",
    fontSize: "12px",
    textAlign: "center"
  },

  progressLine: {
    width: "55px",
    height: "2px",
    background: "#cbd5e1",
    margin: "0 8px 20px"
  },

  botCard: {
    margin: "20px 24px",
    padding: "18px",
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    borderRadius: "14px"
  },

  botTop: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },

  botAvatar: {
    width: "45px",
    height: "45px",
    borderRadius: "50%",
    background: "#dbeafe",
    display: "grid",
    placeItems: "center",
    fontSize: "24px"
  },

  botName: {
    margin: 0,
    fontSize: "16px",
    color: "#1e3a8a"
  },

  botStatus: {
    margin: "4px 0 0",
    fontSize: "11px",
    color: "#475569"
  },

  onlineDot: {
    display: "inline-block",
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: "#16a34a",
    marginRight: "5px"
  },

  botTag: {
    fontSize: "9px",
    fontWeight: 800,
    color: "#1d4ed8",
    letterSpacing: "1px"
  },

  botMessage: {
    marginTop: "15px",
    fontSize: "13px",
    lineHeight: 1.7,
    color: "#334155"
  },

  voiceButton: {
    marginTop: "10px",
    border: "1px solid #93c5fd",
    borderRadius: "8px",
    padding: "9px 14px",
    background: "#fff",
    color: "#1d4ed8",
    cursor: "pointer",
    fontWeight: 700
  },

  content: {
    padding: "10px 25px 25px"
  },

  heading: {
    textAlign: "center",
    marginBottom: "23px"
  },

  headingH1: {
    fontSize: "24px"
  },

  headingText: {
    color: "#64748b",
    fontSize: "13px"
  },

  studentBox: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px",
    background: "#f8fafc",
    borderRadius: "10px",
    marginBottom: "22px"
  },

  studentIcon: {
    fontSize: "26px"
  },

  idBox: {
    textAlign: "right"
  },

  section: {
    padding: "18px",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    marginBottom: "18px"
  },

  description: {
    fontSize: "13px",
    color: "#64748b",
    lineHeight: 1.6
  },

  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: 700,
    marginBottom: "9px"
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    fontSize: "14px"
  },

  sendButton: {
    width: "100%",
    padding: "13px",
    border: "none",
    borderRadius: "8px",
    background: "#1e40af",
    color: "#fff",
    fontWeight: 700,
    fontSize: "14px",
    cursor: "pointer"
  },

  otpSection: {
    marginTop: "20px",
    paddingTop: "18px",
    borderTop: "1px solid #e2e8f0"
  },

  emailNotice: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    background: "#eff6ff",
    padding: "13px",
    borderRadius: "9px",
    marginBottom: "18px",
    fontSize: "13px",
    color: "#1e40af"
  },

  otpInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "14px",
    border: "1px solid #93c5fd",
    borderRadius: "9px",
    fontSize: "24px",
    letterSpacing: "12px",
    textAlign: "center",
    fontWeight: 800
  },

  otpHint: {
    fontSize: "11px",
    color: "#64748b"
  },

  verifyButton: {
    width: "100%",
    padding: "13px",
    border: "none",
    borderRadius: "8px",
    background: "#15803d",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
    marginTop: "10px"
  },

  checkRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    padding: "13px 0",
    borderBottom: "1px solid #e2e8f0"
  },

  status: {
    fontSize: "11px",
    fontWeight: 700,
    padding: "7px 10px",
    borderRadius: "20px",
    whiteSpace: "nowrap"
  },

  cameraButton: {
    marginTop: "15px",
    padding: "10px 16px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 700
  },

  cameraHint: {
    color: "#64748b",
    fontSize: "11px",
    lineHeight: 1.5
  },

  verifiedBox: {
    marginTop: "15px",
    padding: "13px",
    background: "#dcfce7",
    color: "#166534",
    borderRadius: "8px",
    fontWeight: 700,
    textAlign: "center",
    fontSize: "13px"
  },

  errorBox: {
    marginTop: "15px",
    padding: "12px",
    borderRadius: "8px",
    background: "#fef2f2",
    color: "#b91c1c",
    fontSize: "13px"
  },

  continueButton: {
    width: "100%",
    padding: "15px",
    background: "#1e40af",
    color: "#fff",
    border: "none",
    borderRadius: "9px",
    fontSize: "15px",
    fontWeight: 800,
    cursor: "pointer"
  },

  footer: {
    textAlign: "center",
    fontSize: "11px",
    lineHeight: 1.8,
    color: "#94a3b8",
    marginTop: "25px"
  },

  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    background: "rgba(15,23,42,0.65)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "18px"
  },

  popup: {
    background: "#fff",
    width: "100%",
    maxWidth: "390px",
    borderRadius: "16px",
    padding: "28px",
    textAlign: "center",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)"
  },

  popupIcon: {
    width: "55px",
    height: "55px",
    borderRadius: "50%",
    margin: "auto",
    display: "grid",
    placeItems: "center",
    background: "#dcfce7",
    color: "#15803d",
    fontSize: "30px",
    fontWeight: 800
  },

  popupTitle: {
    fontSize: "20px",
    margin: "17px 0 10px",
    color: "#0f172a"
  },

  popupText: {
    fontSize: "13px",
    color: "#64748b",
    lineHeight: 1.7,
    marginBottom: "22px"
  },

  popupButton: {
    width: "100%",
    padding: "13px",
    border: "none",
    borderRadius: "8px",
    background: "#1e40af",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer"
  }
};
