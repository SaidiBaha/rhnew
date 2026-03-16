import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { VerifyOtpCard } from "@/modules/auth/components/VerifyOtpCard";

function VerifyOtpPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Rediriger si on arrive sans email (accès direct à la page)
  useEffect(() => {
    const email = (location.state as { email?: string })?.email;
    if (!email) navigate("/forgot-password", { replace: true });
  }, [location, navigate]);

  return (
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--bg)" }}
    >
      <div className="pointer-events-none fixed top-0 right-0 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: "var(--accent)", transform: "translate(30%, -30%)" }} />
      <div className="pointer-events-none fixed bottom-0 left-0 w-80 h-80 rounded-full opacity-10 blur-3xl" style={{ background: "var(--teal)", transform: "translate(-30%, 30%)" }} />
      <div className="relative z-10 w-full flex flex-col items-center gap-8">
        <VerifyOtpCard />
        <p style={{ fontSize: "11px", color: "var(--text-3)" }}>
          © {new Date().getFullYear()} Sage RH Automotive — Tous droits réservés
        </p>
      </div>
    </main>
  );
}

export default VerifyOtpPage;
