"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import QRCode from "react-qr-code";

// ─── Types ────────────────────────────────────────────────────
type KioskState = "idle" | "qr" | "activating" | "active" | "deactivating" | "error";

interface SessionData {
  sessionId: string;
  checkoutUrl: string;
  status: string;
  hoursRemaining?: number;
  secondsRemaining?: number;
  projectorOn?: boolean;
  hoursPurchased?: number;
}

// ─── Main Component ───────────────────────────────────────────
export default function KioskClient() {
  const [state, setState] = useState<KioskState>("idle");
  const [hours, setHours] = useState(1);
  const [session, setSession] = useState<SessionData | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [qrExpiry, setQrExpiry] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Cleanup intervals on unmount ───────────────────────────
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ─── Poll session status ───────────────────────────────────
  const startPolling = useCallback((sessionId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);

    const poll = async () => {
      try {
        const res = await fetch(`/api/kiosk/session-status?sessionId=${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.status === "active") {
          // Session was activated by webhook
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setSession((prev) => prev ? { ...prev, ...data } : prev);
          setSecondsLeft(data.secondsRemaining || 0);
          setState("active");
          startCountdown(sessionId, data.secondsRemaining || 0);
        } else if (data.status === "expired" || data.status === "cancelled") {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          resetToIdle();
        }
      } catch {
        // Silent fail — will retry on next poll
      }
    };

    pollRef.current = setInterval(poll, 3000);
    poll(); // immediate first check
  }, []);

  // ─── Countdown timer ───────────────────────────────────────
  const startCountdown = useCallback((sessionId: string, initialSeconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current);

    let remaining = initialSeconds;
    setSecondsLeft(remaining);

    timerRef.current = setInterval(() => {
      remaining -= 1;
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        handleExpire(sessionId);
      }
    }, 1000);
  }, []);

  // ─── Reset to idle ─────────────────────────────────────────
  const resetToIdle = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    pollRef.current = null;
    timerRef.current = null;
    setState("idle");
    setSession(null);
    setSecondsLeft(0);
    setError(null);
    setHours(1);
    setQrExpiry(0);
  };

  // ─── Check for active session on mount ─────────────────────
  useEffect(() => {
    const checkActive = async () => {
      try {
        const res = await fetch("/api/kiosk/session-status?checkActive=true");
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "active" && data.secondsRemaining > 0) {
          setSession(data);
          setSecondsLeft(data.secondsRemaining);
          setState("active");
          startCountdown(data.sessionId, data.secondsRemaining);
        }
      } catch {
        // No active session — stay idle
      }
    };
    checkActive();
  }, [startCountdown]);

  // ─── Create session + QR code ──────────────────────────────
  const handleCreateSession = async () => {
    try {
      setError(null);
      const res = await fetch("/api/kiosk/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create session");
      }

      const data = await res.json();
      setSession({
        sessionId: data.sessionId,
        checkoutUrl: data.checkoutUrl,
        status: "pending",
        hoursPurchased: hours,
      });
      setState("qr");
      setQrExpiry(Date.now() + 30 * 60 * 1000); // 30 min expiry
      startPolling(data.sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setState("error");
    }
  };

  // ─── Extend session ────────────────────────────────────────
  const handleExtend = async () => {
    if (!session) return;

    try {
      setError(null);
      const res = await fetch("/api/kiosk/extend-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to extend session");
      }

      const data = await res.json();
      setSession((prev) =>
        prev
          ? {
              ...prev,
              checkoutUrl: data.checkoutUrl,
            }
          : prev
      );
      setState("qr");
      setQrExpiry(Date.now() + 30 * 60 * 1000);
      // Keep countdown running, start polling for extension payment
      startPolling(session.sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  // ─── Expire session ────────────────────────────────────────
  const handleExpire = async (sessionId: string) => {
    setState("deactivating");
    try {
      await fetch("/api/kiosk/expire-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
    } catch {
      // Cron will catch this as a safety net
    }
    // Small delay to show the shutdown message
    setTimeout(resetToIdle, 5000);
  };

  // ─── Cancel QR / go back ──────────────────────────────────
  const handleCancel = () => {
    resetToIdle();
  };

  // ─── Format time ──────────────────────────────────────────
  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // ─── Render ────────────────────────────────────────────────
  return (
    <div style={styles.container}>
      {state === "idle" && (
        <IdleScreen
          hours={hours}
          setHours={setHours}
          onStart={handleCreateSession}
        />
      )}

      {state === "qr" && session && (
        <QRScreen
          checkoutUrl={session.checkoutUrl}
          hours={session.hoursPurchased || hours}
          qrExpiry={qrExpiry}
          onCancel={handleCancel}
        />
      )}

      {state === "activating" && <TransitionScreen message="Starting projector..." />}

      {state === "active" && session && (
        <ActiveScreen
          secondsLeft={secondsLeft}
          formatTime={formatTime}
          onExtend={handleExtend}
        />
      )}

      {state === "deactivating" && <TransitionScreen message="Shutting down projector..." />}

      {state === "error" && (
        <ErrorScreen error={error} onRetry={resetToIdle} />
      )}
    </div>
  );
}

// ─── Idle Screen ─────────────────────────────────────────────
function IdleScreen({
  hours,
  setHours,
  onStart,
}: {
  hours: number;
  setHours: (h: number) => void;
  onStart: () => void;
}) {
  return (
    <div style={styles.screen}>
      {/* Projector icon */}
      <div style={styles.iconContainer}>
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <circle cx="12" cy="12" r="3" />
          <line x1="6" y1="18" x2="6" y2="21" />
          <line x1="18" y1="18" x2="18" y2="21" />
          <circle cx="6" cy="9" r="1" fill="currentColor" />
        </svg>
      </div>

      <h1 style={styles.heroTitle}>Use the Projector</h1>
      <p style={styles.heroSubtitle}>
        Pay with your phone to start the projector &amp; screen
      </p>

      {/* Price */}
      <div style={styles.priceTag}>
        <span style={styles.priceAmount}>$1</span>
        <span style={styles.priceUnit}>/hour</span>
      </div>

      {/* Hour selector */}
      <div style={styles.hourSelector}>
        {[1, 2, 3, 4].map((h) => (
          <button
            key={h}
            onClick={() => setHours(h)}
            style={{
              ...styles.hourButton,
              ...(hours === h ? styles.hourButtonActive : {}),
            }}
          >
            {h} hr{h > 1 ? "s" : ""}
          </button>
        ))}
      </div>

      {/* Total */}
      <p style={styles.totalPrice}>
        Total: <strong>${hours}.00</strong>
      </p>

      {/* Start button */}
      <button onClick={onStart} style={styles.primaryButton}>
        <span style={styles.buttonIcon}>📱</span>
        Pay &amp; Start — ${hours}.00
      </button>
    </div>
  );
}

// ─── QR Screen ───────────────────────────────────────────────
function QRScreen({
  checkoutUrl,
  hours,
  qrExpiry,
  onCancel,
}: {
  checkoutUrl: string;
  hours: number;
  qrExpiry: number;
  onCancel: () => void;
}) {
  const [qrSecondsLeft, setQrSecondsLeft] = useState(
    Math.max(0, Math.floor((qrExpiry - Date.now()) / 1000))
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((qrExpiry - Date.now()) / 1000));
      setQrSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        onCancel();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [qrExpiry, onCancel]);

  const minutes = Math.floor(qrSecondsLeft / 60);

  return (
    <div style={styles.screen}>
      <h2 style={styles.qrTitle}>Scan to Pay</h2>
      <p style={styles.qrSubtitle}>
        {hours} hour{hours > 1 ? "s" : ""} — ${hours}.00
      </p>

      {/* QR Code */}
      <div style={styles.qrContainer}>
        <div style={styles.qrInner}>
          <QRCode
            value={checkoutUrl}
            size={280}
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            bgColor="#ffffff"
            fgColor="#000000"
            level="M"
          />
        </div>
      </div>

      <p style={styles.qrInstruction}>
        Open your phone camera and point it at the QR code
      </p>

      <p style={styles.qrTimer}>
        QR code expires in {minutes} min
      </p>

      <button onClick={onCancel} style={styles.secondaryButton}>
        Cancel
      </button>
    </div>
  );
}

// ─── Active Screen ───────────────────────────────────────────
function ActiveScreen({
  secondsLeft,
  formatTime,
  onExtend,
}: {
  secondsLeft: number;
  formatTime: (s: number) => string;
  onExtend: () => void;
}) {
  const isWarning = secondsLeft <= 300 && secondsLeft > 0; // 5 min warning
  const isCritical = secondsLeft <= 60 && secondsLeft > 0;

  return (
    <div style={styles.screen}>
      {/* Warning banner */}
      {isWarning && (
        <div
          style={{
            ...styles.warningBanner,
            ...(isCritical ? styles.criticalBanner : {}),
          }}
        >
          {isCritical
            ? "⚠️ Less than 1 minute remaining!"
            : "⏰ Less than 5 minutes remaining"}
        </div>
      )}

      {/* Status indicator */}
      <div style={styles.statusRow}>
        <div style={styles.statusDot} />
        <span style={styles.statusText}>PROJECTOR ON</span>
      </div>

      {/* Countdown */}
      <div
        style={{
          ...styles.countdown,
          ...(isWarning ? styles.countdownWarning : {}),
          ...(isCritical ? styles.countdownCritical : {}),
        }}
      >
        {formatTime(Math.max(0, secondsLeft))}
      </div>

      <p style={styles.countdownLabel}>remaining</p>

      {/* Extend button */}
      <button onClick={onExtend} style={styles.extendButton}>
        <span style={styles.buttonIcon}>📱</span>
        Add 1 Hour — $1.00
      </button>
    </div>
  );
}

// ─── Transition Screen ───────────────────────────────────────
function TransitionScreen({ message }: { message: string }) {
  return (
    <div style={styles.screen}>
      {/* Spinner */}
      <div style={styles.spinner}>
        <div style={styles.spinnerRing} />
      </div>
      <h2 style={styles.transitionText}>{message}</h2>
      <p style={styles.transitionSubtext}>Please wait...</p>
    </div>
  );
}

// ─── Error Screen ────────────────────────────────────────────
function ErrorScreen({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <div style={styles.screen}>
      <div style={styles.errorIcon}>⚠️</div>
      <h2 style={styles.errorTitle}>Something went wrong</h2>
      <p style={styles.errorMessage}>{error || "Please try again"}</p>
      <button onClick={onRetry} style={styles.primaryButton}>
        Try Again
      </button>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100dvh",
    padding: "24px",
  },
  screen: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    gap: "16px",
    maxWidth: "480px",
    width: "100%",
  },

  // ─── Idle ─────────────────────────────
  iconContainer: {
    color: "#818cf8",
    marginBottom: "8px",
    opacity: 0.8,
  },
  heroTitle: {
    fontSize: "2.5rem",
    fontWeight: 700,
    letterSpacing: "-0.02em",
    margin: 0,
    background: "linear-gradient(135deg, #e0e7ff 0%, #818cf8 50%, #6366f1 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  heroSubtitle: {
    fontSize: "1.1rem",
    color: "#94a3b8",
    margin: 0,
    lineHeight: 1.5,
  },
  priceTag: {
    display: "flex",
    alignItems: "baseline",
    gap: "4px",
    margin: "8px 0",
  },
  priceAmount: {
    fontSize: "3rem",
    fontWeight: 800,
    color: "#a5f3fc",
  },
  priceUnit: {
    fontSize: "1.25rem",
    color: "#67e8f9",
    fontWeight: 500,
  },
  hourSelector: {
    display: "flex",
    gap: "12px",
    margin: "8px 0",
  },
  hourButton: {
    padding: "12px 24px",
    fontSize: "1rem",
    fontWeight: 600,
    border: "2px solid #334155",
    borderRadius: "12px",
    background: "rgba(30, 41, 59, 0.5)",
    color: "#cbd5e1",
    cursor: "pointer",
    transition: "all 0.2s ease",
    minWidth: "72px",
  },
  hourButtonActive: {
    borderColor: "#818cf8",
    background: "rgba(129, 140, 248, 0.15)",
    color: "#e0e7ff",
    boxShadow: "0 0 20px rgba(129, 140, 248, 0.2)",
  },
  totalPrice: {
    fontSize: "1.1rem",
    color: "#94a3b8",
    margin: "4px 0",
  },
  primaryButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "18px 48px",
    fontSize: "1.25rem",
    fontWeight: 700,
    border: "none",
    borderRadius: "16px",
    background: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)",
    color: "#ffffff",
    cursor: "pointer",
    marginTop: "8px",
    boxShadow: "0 4px 24px rgba(99, 102, 241, 0.4)",
    transition: "all 0.2s ease",
    letterSpacing: "0.01em",
  },
  buttonIcon: {
    fontSize: "1.4rem",
  },

  // ─── QR ───────────────────────────────
  qrTitle: {
    fontSize: "2rem",
    fontWeight: 700,
    margin: 0,
    color: "#e0e7ff",
  },
  qrSubtitle: {
    fontSize: "1.25rem",
    color: "#a5f3fc",
    fontWeight: 600,
    margin: 0,
  },
  qrContainer: {
    padding: "20px",
    background: "rgba(255, 255, 255, 0.05)",
    borderRadius: "24px",
    border: "2px solid rgba(129, 140, 248, 0.3)",
    boxShadow: "0 0 40px rgba(129, 140, 248, 0.1)",
    margin: "8px 0",
  },
  qrInner: {
    padding: "20px",
    background: "#ffffff",
    borderRadius: "16px",
  },
  qrInstruction: {
    fontSize: "1.1rem",
    color: "#94a3b8",
    margin: 0,
  },
  qrTimer: {
    fontSize: "0.9rem",
    color: "#64748b",
    margin: 0,
  },
  secondaryButton: {
    padding: "14px 36px",
    fontSize: "1rem",
    fontWeight: 600,
    border: "2px solid #334155",
    borderRadius: "12px",
    background: "transparent",
    color: "#94a3b8",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  // ─── Active ───────────────────────────
  statusRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 24px",
    background: "rgba(34, 197, 94, 0.1)",
    borderRadius: "100px",
    border: "1px solid rgba(34, 197, 94, 0.3)",
  },
  statusDot: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    background: "#22c55e",
    boxShadow: "0 0 12px rgba(34, 197, 94, 0.6)",
    animation: "pulse 2s ease-in-out infinite",
  },
  statusText: {
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "#86efac",
    letterSpacing: "0.1em",
  },
  countdown: {
    fontSize: "6rem",
    fontWeight: 800,
    letterSpacing: "-0.02em",
    fontVariantNumeric: "tabular-nums",
    color: "#e0e7ff",
    margin: "8px 0 0 0",
    lineHeight: 1,
    transition: "color 0.5s ease",
  },
  countdownWarning: {
    color: "#fbbf24",
  },
  countdownCritical: {
    color: "#ef4444",
  },
  countdownLabel: {
    fontSize: "1.25rem",
    color: "#64748b",
    fontWeight: 500,
    margin: 0,
    textTransform: "uppercase" as const,
    letterSpacing: "0.15em",
  },
  warningBanner: {
    padding: "12px 24px",
    background: "rgba(251, 191, 36, 0.15)",
    border: "1px solid rgba(251, 191, 36, 0.4)",
    borderRadius: "12px",
    color: "#fcd34d",
    fontWeight: 600,
    fontSize: "1rem",
    width: "100%",
  },
  criticalBanner: {
    background: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.4)",
    color: "#fca5a5",
  },
  extendButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "16px 40px",
    fontSize: "1.1rem",
    fontWeight: 700,
    border: "2px solid #22c55e",
    borderRadius: "16px",
    background: "rgba(34, 197, 94, 0.1)",
    color: "#86efac",
    cursor: "pointer",
    marginTop: "16px",
    transition: "all 0.2s ease",
  },

  // ─── Transition ───────────────────────
  spinner: {
    width: "64px",
    height: "64px",
    position: "relative" as const,
    marginBottom: "16px",
  },
  spinnerRing: {
    width: "64px",
    height: "64px",
    border: "4px solid rgba(129, 140, 248, 0.2)",
    borderTop: "4px solid #818cf8",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  transitionText: {
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "#e0e7ff",
    margin: 0,
  },
  transitionSubtext: {
    fontSize: "1rem",
    color: "#64748b",
    margin: 0,
  },

  // ─── Error ────────────────────────────
  errorIcon: {
    fontSize: "4rem",
    marginBottom: "8px",
  },
  errorTitle: {
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "#fca5a5",
    margin: 0,
  },
  errorMessage: {
    fontSize: "1rem",
    color: "#94a3b8",
    margin: 0,
    maxWidth: "360px",
  },
};
