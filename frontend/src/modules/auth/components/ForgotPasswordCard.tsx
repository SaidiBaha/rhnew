import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { TriangleAlert, Mail, ArrowLeft, CheckCircle } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function ForgotPasswordCard() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Veuillez saisir une adresse email valide.");
      return;
    }
    setLoading(true);
    try {
      await axios.post("/auth/forgot-password", { email }, { baseURL: API_BASE_URL });
      setSent(true);
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
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
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--surface2)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          className="absolute bottom-0 left-0 h-0.5 w-40"
          style={{ background: "linear-gradient(to right, var(--accent), transparent)" }}
        />
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white text-lg font-black"
            style={{ background: "var(--accent)" }}
          >
            S
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--navy)" }}>Sage RH</div>
            <div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-3)" }}>
              Automotive
            </div>
          </div>
        </div>
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--navy)" }}>
          Mot de passe oublié
        </h1>
        <p style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "4px" }}>
          Entrez votre email pour recevoir un code de vérification
        </p>
      </div>

      {/* Body */}
      <div className="px-8 py-7">
        {sent ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: "var(--accent-light)" }}
            >
              <CheckCircle className="h-7 w-7" style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <p style={{ fontWeight: 600, color: "var(--navy)", fontSize: "15px" }}>
                Email envoyé !
              </p>
              <p style={{ fontSize: "13px", color: "var(--text-3)", marginTop: "6px" }}>
                Si cet email est enregistré, un code de vérification a été envoyé.
                Vérifiez votre boîte mail.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/verify-otp", { state: { email } })}
              className="ds-btn-primary w-full justify-center py-2.5 mt-2"
            >
              Saisir le code OTP
            </button>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: "6px" }}>
                Adresse email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                  style={{ color: "var(--muted)" }}
                />
                <input
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="pl-9 h-10 w-full rounded-lg border text-sm outline-none transition-[border-color,box-shadow]"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(47,107,255,0.10)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="ds-btn-primary w-full justify-center py-2.5"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Envoi en cours…
                </span>
              ) : "Envoyer le code"}
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

        <div className="mt-5 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm"
            style={{ color: "var(--accent)", fontWeight: 500 }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
