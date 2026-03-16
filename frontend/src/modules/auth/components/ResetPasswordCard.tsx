import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import axios from "axios";
import { TriangleAlert, Eye, EyeOff, ArrowLeft, CheckCircle } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function getStrength(password: string): { label: string; color: string; width: string } {
  if (password.length === 0) return { label: "", color: "transparent", width: "0%" };
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const variety = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;
  if (password.length < 6) return { label: "Faible", color: "#f03e3e", width: "25%" };
  if (password.length < 8 || variety < 2) return { label: "Moyen", color: "#ff8c00", width: "55%" };
  return { label: "Fort", color: "#00c48c", width: "100%" };
}

export function ResetPasswordCard() {
  const location = useLocation();
  const navigate = useNavigate();
  const resetToken: string = (location.state as { resetToken?: string })?.resetToken ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const strength = getStrength(newPassword);

  // Redirection auto après succès
  useEffect(() => {
    if (!success) return;
    if (countdown <= 0) { navigate("/login"); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [success, countdown, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) { setError("Le mot de passe doit contenir au moins 6 caractères."); return; }
    if (newPassword !== confirmPassword) { setError("Les mots de passe ne correspondent pas."); return; }
    setLoading(true);
    try {
      await axios.post("/auth/reset-password", { resetToken, newPassword, confirmPassword }, { baseURL: API_BASE_URL });
      setSuccess(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Une erreur est survenue. Veuillez recommencer.");
    } finally {
      setLoading(false);
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
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--navy)" }}>Nouveau mot de passe</h1>
        <p style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "4px" }}>
          Choisissez un mot de passe sécurisé
        </p>
      </div>

      {/* Body */}
      <div className="px-8 py-7">
        {success ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "#e8faf4" }}>
              <CheckCircle className="h-7 w-7" style={{ color: "#00c48c" }} />
            </div>
            <div>
              <p style={{ fontWeight: 600, color: "var(--navy)", fontSize: "15px" }}>
                Mot de passe réinitialisé !
              </p>
              <p style={{ fontSize: "13px", color: "var(--text-3)", marginTop: "6px" }}>
                Redirection vers la connexion dans{" "}
                <span style={{ fontWeight: 700, color: "var(--accent)" }}>{countdown}s</span>…
              </p>
            </div>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Nouveau mot de passe */}
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: "6px" }}>
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  className="pr-10 pl-3 h-10 w-full rounded-lg border text-sm outline-none transition-[border-color,box-shadow]"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(47,107,255,0.10)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--muted)", background: "none", border: "none", cursor: "pointer" }}
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Indicateur de force */}
              {newPassword.length > 0 && (
                <div className="mt-2">
                  <div className="h-1.5 w-full rounded-full" style={{ background: "var(--border)" }}>
                    <div
                      className="h-1.5 rounded-full transition-all duration-300"
                      style={{ width: strength.width, background: strength.color }}
                    />
                  </div>
                  <p className="mt-1 text-xs font-medium" style={{ color: strength.color }}>
                    {strength.label}
                  </p>
                </div>
              )}
            </div>

            {/* Confirmer mot de passe */}
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: "6px" }}>
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="pr-10 pl-3 h-10 w-full rounded-lg border text-sm outline-none transition-[border-color,box-shadow]"
                  style={{
                    background: "var(--surface2)",
                    border: `1px solid ${confirmPassword && confirmPassword !== newPassword ? "#f03e3e" : "var(--border)"}`,
                    color: "var(--text)"
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(47,107,255,0.10)"; }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = confirmPassword && confirmPassword !== newPassword ? "#f03e3e" : "var(--border)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--muted)", background: "none", border: "none", cursor: "pointer" }}
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="mt-1 text-xs" style={{ color: "#f03e3e" }}>Les mots de passe ne correspondent pas</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword}
              className="ds-btn-primary w-full justify-center py-2.5"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Réinitialisation…
                </span>
              ) : "Réinitialiser le mot de passe"}
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
        )}

        {!success && (
          <div className="mt-5 text-center">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-sm" style={{ color: "var(--muted)", fontWeight: 500 }}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour à la connexion
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
