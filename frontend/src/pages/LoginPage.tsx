import { LoginCard } from "@/modules/auth/components/LoginCard";

function LoginPage() {
  return (
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--bg)" }}
    >
      {/* Background accent orb */}
      <div
        className="pointer-events-none fixed top-0 right-0 w-96 h-96 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--accent)", transform: "translate(30%, -30%)" }}
      />
      <div
        className="pointer-events-none fixed bottom-0 left-0 w-80 h-80 rounded-full opacity-10 blur-3xl"
        style={{ background: "var(--teal)", transform: "translate(-30%, 30%)" }}
      />

      <div className="relative z-10 w-full flex flex-col items-center gap-8">
        <LoginCard />

        <p style={{ fontSize: "11px", color: "var(--text-3)" }}>
          © {new Date().getFullYear()} Sage RH Automotive — Tous droits réservés
        </p>
      </div>
    </main>
  );
}

export default LoginPage;
