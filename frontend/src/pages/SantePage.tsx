import { useEffect, useState, useContext } from "react";
import axios from "axios";
import AuthContext from "@/context/AuthProvider";

const API_ML = "http://localhost:9000/api/v1/health-ml";

interface Employee {
  matricule: string;
  full_name: string;
  department: string;
  burnout_score: number;
  absence_risk_pct: number;
  risk_level: string;
  risk_factors: string[];
  needs_conge: boolean;
  absence_rate_pct: number;
  overtime_hours: number;
}

interface DashboardData {
  employees: Employee[];
  summary: {
    total: number;
    critique: number;
    eleve: number;
    needs_conge: number;
    avg_burnout_score: number;
  };
}

const getRiskColor = (level: string) => {
  switch (level) {
    case "CRITIQUE":
    case "ÉLEVÉ":
      return { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" };
    case "MODÉRÉ":
      return { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" };
    default:
      return { bg: "#dcfce7", text: "#166534", border: "#86efac" };
  }
};

const getScoreColor = (score: number) => {
  if (score >= 70) return "#ef4444";
  if (score >= 40) return "#f59e0b";
  return "#22c55e";
};

export default function SantePage() {
  const { auth } = useContext(AuthContext);
  const token = auth.accessToken || auth.refreshToken;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [congeLoading, setCongeLoading] = useState(false);
  const [congeSuccess, setCongeSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_ML}/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
    } catch (e: any) {
      setError(e.response?.data?.error || "Impossible de contacter le service ML");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleConge = async (matricule: string) => {
    setCongeLoading(true);
    setCongeSuccess(null);
    try {
      await axios.post(
        `${API_ML}/conge/${matricule}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCongeSuccess(`Congé burnout créé pour ${matricule} ✅`);
    } catch (e: any) {
      setCongeSuccess("Erreur: " + (e.response?.data?.message || e.message));
    } finally {
      setCongeLoading(false);
    }
  };

  const filtered = (data?.employees ?? []).filter((e) => {
    const matchSearch =
      e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.matricule.includes(search);
    const matchFilter =
      filter === "ALL" ||
      (filter === "HIGH" && e.burnout_score >= 70) ||
      (filter === "MED" && e.burnout_score >= 40 && e.burnout_score < 70) ||
      (filter === "LOW" && e.burnout_score < 40);
    return matchSearch && matchFilter;
  });

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 16 }}>
        <div style={{ width: 40, height: 40, border: "3px solid #e5e7eb", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "#6b7280", fontFamily: "sans-serif" }}>Chargement des scores ML...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 32, fontFamily: "sans-serif" }}>
        <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: 20, color: "#991b1b" }}>
          <strong>⚠ Service ML indisponible</strong>
          <p style={{ margin: "8px 0 0" }}>{error}</p>
          <button onClick={fetchDashboard} style={{ marginTop: 12, background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", cursor: "pointer" }}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 32px", fontFamily: "'Segoe UI', sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "#0f172a" }}>
          🏥 Santé & Bien-être — Tableau de bord ML
        </h1>
        <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 14 }}>
          Scores calculés en temps réel sur {data?.summary?.total} employés
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total employés", value: data?.summary?.total, color: "#3b82f6", icon: "👥" },
          { label: "Risque critique", value: data?.summary?.critique, color: "#ef4444", icon: "⚠️" },
          { label: "Score moyen", value: `${data?.summary?.avg_burnout_score?.toFixed(1)}/100`, color: "#f59e0b", icon: "📊" },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", borderLeft: `4px solid ${kpi.color}` }}>
            <div style={{ fontSize: 22 }}>{kpi.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color, margin: "4px 0" }}>{kpi.value}</div>
            <div style={{ color: "#64748b", fontSize: 13 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          placeholder="Rechercher par nom ou matricule..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 220, padding: "8px 14px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none" }}
        />
        {[
          { key: "ALL", label: "Tous" },
          { key: "HIGH", label: "🔴 Critique (≥70)" },
          { key: "MED", label: "🟡 Modéré (40-70)" },
          { key: "LOW", label: "🟢 Faible (<40)" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", cursor: "pointer", fontSize: 13,
              background: filter === f.key ? "#0f172a" : "#fff",
              color: filter === f.key ? "#fff" : "#374151",
              fontWeight: filter === f.key ? 600 : 400,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {["Matricule", "Nom", "Département", "Score Burnout", "Absence %", "Heures Supp", "Niveau", "Action"].map((h) => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((emp, i) => {
              const riskStyle = getRiskColor(emp.risk_level);
              return (
                <tr key={emp.matricule} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "#64748b", fontFamily: "monospace" }}>{emp.matricule}</td>
                  <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 500, color: "#0f172a" }}>{emp.full_name}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "#475569" }}>{emp.department}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${emp.burnout_score}%`, background: getScoreColor(emp.burnout_score), borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: getScoreColor(emp.burnout_score), minWidth: 32 }}>{emp.burnout_score}</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "#475569" }}>{emp.absence_rate_pct?.toFixed(1)}%</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "#475569" }}>{emp.overtime_hours?.toFixed(1)}h</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ background: riskStyle.bg, color: riskStyle.text, border: `1px solid ${riskStyle.border}`, padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                      {emp.risk_level}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <button
                      onClick={() => setSelected(emp)}
                      style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontWeight: 500 }}
                    >
                      Voir
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Aucun employé trouvé</div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => { setSelected(null); setCongeSuccess(null); }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 500, maxWidth: "90vw", maxHeight: "85vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{selected.full_name}</h2>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>{selected.matricule} — {selected.department}</p>
              </div>
              <button onClick={() => { setSelected(null); setCongeSuccess(null); }}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>

            {/* Score */}
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: 20, marginBottom: 16, textAlign: "center" }}>
              <div style={{ fontSize: 48, fontWeight: 800, color: getScoreColor(selected.burnout_score) }}>
                {selected.burnout_score}<span style={{ fontSize: 20, color: "#94a3b8" }}>/100</span>
              </div>
              <div style={{ color: "#64748b", fontSize: 14 }}>Score Burnout ML</div>
              <span style={{
                background: getRiskColor(selected.risk_level).bg,
                color: getRiskColor(selected.risk_level).text,
                border: `1px solid ${getRiskColor(selected.risk_level).border}`,
                display: "inline-block", marginTop: 8, padding: "4px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600
              }}>
                {selected.risk_level}
              </span>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              {[
                { label: "Taux d'absence", value: `${selected.absence_rate_pct?.toFixed(1)}%` },
                { label: "Heures supp.", value: `${selected.overtime_hours?.toFixed(1)}h` },
                { label: "Risque absence", value: `${selected.absence_risk_pct}%` },
                { label: "Congé recommandé", value: selected.needs_conge ? "✅ Oui" : "❌ Non" },
              ].map((s) => (
                <div key={s.label} style={{ background: "#f8fafc", borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Risk Factors */}
            {selected.risk_factors?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ margin: "0 0 8px", fontSize: 13, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Facteurs de risque</h4>
                {selected.risk_factors.map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #f1f5f9", fontSize: 14, color: "#374151" }}>
                    <span style={{ color: "#ef4444" }}>⚡</span> {f}
                  </div>
                ))}
              </div>
            )}

            {/* Congé Action */}
            {selected.burnout_score >= 70 && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: 16 }}>
                <p style={{ margin: "0 0 12px", fontSize: 14, color: "#991b1b", fontWeight: 500 }}>
                  ⚠ Score critique — Congé burnout recommandé
                </p>
                {congeSuccess ? (
                  <div style={{ color: congeSuccess.includes("Erreur") ? "#991b1b" : "#166534", fontSize: 14, fontWeight: 500 }}>{congeSuccess}</div>
                ) : (
                  <button
                    onClick={() => handleConge(selected.matricule)}
                    disabled={congeLoading}
                    style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%", opacity: congeLoading ? 0.7 : 1 }}
                  >
                    {congeLoading ? "Création en cours..." : "🏖 Créer congé burnout"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
