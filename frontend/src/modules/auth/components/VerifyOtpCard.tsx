import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import axios from "axios";
import { TriangleAlert, ArrowLeft, RefreshCw } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, 1);
  const masked = "*".repeat(Math.max(local.length - 2, 2));
  return `${visible}${masked}@${domain}`;
}

export function VerifyOtpCard() {
  const location = useLocation();
  const navigate = useNavigate();
  const email: string = (location.state as { email?: string })?.email ?? "";

  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  // Countdown pour le bouton "Renvoyer"
  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  function handleInput(index: number, value: string) {
    const char = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = char;
    setOtp(next);
    if (char && index < 5) inputs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    const next = [...otp];
    digits.forEach((d, i) => { next[i] = d; });
    setOtp(next);
    const lastFilled = Math.min(digits.length, 5);
    inputs.current[lastFilled]?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) { setError("Veuillez saisir les 6 chiffres du code."); return; }
    setError("");
    setLoading(true);
    try {
      const { data } = await axios.post("/auth/verify-otp", { email, otp: code }, { baseURL: API_BASE_URL });
      navigate("/reset-password", { state: { resetToken: data.resetToken } });
    } catch {
      setError("Code OTP invalide ou expiré. Veuillez réessayer.");
      setOtp(Array(6).fill(""));
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResendLoading(true);
    try {
      await axios.post("/auth/forgot-password", { email }, { baseURL: API_BASE_URL });
      setCountdown(60);
      setCanResend(false);
      setOtp(Array(6).fill(""));
      setError("");
      inputs.current[0]?.focus();
    } catch {
      setError("Impossible de renvoyer le code.");
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <div
      className="w-full md:w-[440px] rounded-lg overflow-hidden"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "0 8px 40px rgba(26,35,50,0.12)",
      }}
    >
      {/* Header */}
      <div
        className="px-8 py-6"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface2)", position: "relative", overflow: "hidden" }}
      >
        <div className="absolute bottom-0 left-0 h-0.5 w-40" style={{ background: "linear-gradient(to right, var(--accent), transparent)" }} />
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg text-white text-lg font-black" style={{ background: "var(--accent)" }}>S</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--navy)" }}>Sage RH</div>
            <div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-3)" }}>Automotive</div>
          </div>
        </div>
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--navy)" }}>Vérification du code</h1>
        <p style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "4px" }}>
          Code envoyé à <span style={{ fontWeight: 600, color: "var(--text-2)" }}>{maskEmail(email)}</span>
        </p>
      </div>

      {/* Body */}
      <div className="px-8 py-7">
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* 6 boxes OTP */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: "12px", textAlign: "center" }}>
              Saisissez le code à 6 chiffres
            </label>
            <div className="flex justify-center gap-2" onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInput(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="text-center font-bold text-lg rounded-lg outline-none transition-[border-color,box-shadow]"
                  style={{
                    width: "48px",
                    height: "56px",
                    border: digit ? "2px solid var(--accent)" : "1.5px solid var(--border)",
                    background: digit ? "var(--accent-light)" : "var(--surface2)",
                    color: "var(--navy)",
                    fontSize: "22px",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(47,107,255,0.10)"; }}
                  onBlur={(e) => { if (!digit) { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; } }}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || otp.join("").length < 6}
            className="ds-btn-primary w-full justify-center py-2.5"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Vérification…
              </span>
            ) : "Vérifier le code"}
          </button>

          {error && (
            <div
              className="flex items-center gap-2 rounded-md px-4 py-3"
              style={{ background: "var(--red-soft)", border: "1px solid rgba(200,51,58,0.25)", color: "var(--red)", fontSize: "13px", fontWeight: 500 }}
            >
              <TriangleAlert className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>

        {/* Resend */}
        <div className="mt-5 text-center">
          {canResend ? (
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
              className="inline-flex items-center gap-1.5 text-sm"
              style={{ color: "var(--accent)", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${resendLoading ? "animate-spin" : ""}`} />
              {resendLoading ? "Envoi…" : "Renvoyer le code"}
            </button>
          ) : (
            <span style={{ fontSize: "13px", color: "var(--muted)" }}>
              Renvoyer dans <span style={{ fontWeight: 600, color: "var(--text-2)" }}>{countdown}s</span>
            </span>
          )}
        </div>

        <div className="mt-3 text-center">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm" style={{ color: "var(--muted)", fontWeight: 500 }}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
