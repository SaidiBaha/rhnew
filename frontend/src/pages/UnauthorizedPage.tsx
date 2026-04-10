import { useNavigate } from "react-router-dom";
import useAuth from "@/hooks/useAuth";

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const { auth } = useAuth();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "var(--bg)",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 64, marginBottom: 16 }}>🔒</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", margin: 0 }}>
        Accès non autorisé
      </h1>
      <p style={{ fontSize: 15, color: "var(--text2)", marginTop: 12, maxWidth: 420 }}>
        Vous n'avez pas les permissions nécessaires pour accéder à cette page.
      </p>
      <button
        onClick={() => navigate(auth.accessToken ? "/" : "/login")}
        style={{
          marginTop: 28,
          padding: "10px 28px",
          borderRadius: 8,
          border: "none",
          background: "var(--accent)",
          color: "#fff",
          fontWeight: 600,
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        {auth.accessToken ? "← Retour à l'accueil" : "Se connecter"}
      </button>
    </div>
  );
}
