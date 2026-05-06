import { useContext, useState } from "react";
import axios from "axios";
import AuthContext from "@/context/AuthProvider";

const API = "http://localhost:9000/api/v1/health";
const ML = "http://localhost:8001";

interface YesNoQuestion {
  id: string;
  text: string;
  detailLabel?: string;
}

const SECTION_1: YesNoQuestion[] = [
  { id: "maladie_chronique", text: "Souffrez-vous d'une maladie infectieuse chronique ?", detailLabel: "Si oui, laquelle et depuis quand ?" },
  { id: "invalidite", text: "Avez-vous un risque d'invalidité ou maladie interne grave ?", detailLabel: "Si oui, précisez" },
  { id: "infirmite", text: "Souffrez-vous d'une infirmité motrice ?", detailLabel: "Si oui, laquelle et depuis quand ?" },
  { id: "systeme_nerveux", text: "Avez-vous une maladie du système nerveux ?", detailLabel: "Si oui, précisez" },
  { id: "oncologie", text: "Avez-vous ou avez-vous eu une affection oncologique ?", detailLabel: "Si oui, laquelle et depuis quand ?" },
  { id: "cardio", text: "Souffrez-vous d'une maladie cardiovasculaire ?", detailLabel: "Si oui, précisez" },
  { id: "respiratoire", text: "Avez-vous des problèmes respiratoires chroniques ?", detailLabel: "Si oui, précisez" },
  { id: "diabete", text: "Êtes-vous diabétique ou prédiabétique ?", detailLabel: "Si oui, type et traitement en cours" },
];

const SECTION_2: YesNoQuestion[] = [
  { id: "stress_chron", text: "Ressentez-vous un stress chronique lié au travail ?" },
  { id: "burn_symptomes", text: "Avez-vous des symptômes de burnout (épuisement, détachement, inefficacité) ?" },
  { id: "sommeil", text: "Souffrez-vous de troubles du sommeil (insomnie, réveils fréquents) ?" },
  { id: "anxiete", text: "Avez-vous des épisodes d'anxiété ou d'attaques de panique ?" },
  { id: "depression", text: "Avez-vous été diagnostiqué(e) pour dépression ou trouble de l'humeur ?" },
];

const SECTION_3: YesNoQuestion[] = [
  { id: "douleurs_dos", text: "Avez-vous des douleurs dorsales ou lombaires régulières ?" },
  { id: "tms", text: "Souffrez-vous de troubles musculo-squelettiques (TMS) liés au travail ?" },
  { id: "migraines", text: "Souffrez-vous de migraines ou céphalées fréquentes ?" },
  { id: "fatigue", text: "Ressentez-vous une fatigue physique persistante malgré le repos ?" },
  { id: "medicaments", text: "Prenez-vous des médicaments de façon régulière ?", detailLabel: "Si oui, lesquels ?" },
];

type Screen = "form" | "submitting" | "result";

interface MLResult {
  burnout_score: number;
  risk_level: string;
  stats: { absence_rate_pct: number; overtime_hours: number; total_days: number };
  recommendation: { message: string } | null;
}

export default function EmployeeWellnessPage() {
  const { auth } = useContext(AuthContext);
  const token = auth.accessToken || auth.refreshToken;
  const matricule = (auth.user as any)?.matricule;
  const fullName = auth.user?.fullName || "";

  const [screen, setScreen] = useState<Screen>("form");
  const [answers, setAnswers] = useState<Record<string, "oui" | "non" | null>>({});
  const [details, setDetails] = useState<Record<string, string>>({});
  const [generalNote, setGeneralNote] = useState("");
  const [mlResult, setMlResult] = useState<MLResult | null>(null);
  const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  const setAnswer = (id: string, val: "oui" | "non") =>
    setAnswers((prev) => ({ ...prev, [id]: val }));

  const setDetail = (id: string, val: string) =>
    setDetails((prev) => ({ ...prev, [id]: val }));

  const allQuestions = [...SECTION_1, ...SECTION_2, ...SECTION_3];
  const answered = allQuestions.filter((q) => answers[q.id] != null).length;
  const total = allQuestions.length;
  const complete = answered === total;

  const submit = async () => {
    setScreen("submitting");
    try {
      const yesAnswers = allQuestions
        .filter((q) => answers[q.id] === "oui")
        .map((q) => `${q.text}${details[q.id] ? ` (${details[q.id]})` : ""}`)
        .join(" | ");

      const symptoms = yesAnswers || "Aucun symptôme signalé";

      await axios.post(`${API}/request`,
        { symptoms, notes: generalNote },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (matricule) {
        const res = await axios.get(`${ML}/ml/risk/${matricule}`);
        setMlResult(res.data);
      }
      setScreen("result");
    } catch {
      setScreen("result");
    }
  };

  // ── SUBMITTING ────────────────────────────────────────────────────────────
  if (screen === "submitting") return (
    <div style={s.page}>
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
        <p style={{ color: "#374151", fontSize: 15 }}>Envoi en cours...</p>
      </div>
    </div>
  );

  // ── RESULT ────────────────────────────────────────────────────────────────
  if (screen === "result") {
    const score = mlResult?.burnout_score ?? 0;
    const level = mlResult?.risk_level ?? "—";
    const scoreColor = score >= 80 ? "#dc2626" : score >= 70 ? "#ea580c" : score >= 40 ? "#d97706" : "#16a34a";
    const yesCount = allQuestions.filter((q) => answers[q.id] === "oui").length;

    return (
      <div style={s.page}>
        <div style={s.doc}>
          {/* Header */}
          <div style={s.docHeader}>
            <div style={s.headerLeft}>
              <div style={s.companyLabel}>SAGE RH — SERVICE MÉDICAL</div>
              <h1 style={s.docTitle}>Résultat du Bilan de Santé</h1>
              <div style={s.docMeta}>Employé(e) : <strong>{fullName}</strong> — Matricule : <strong>{matricule}</strong></div>
              <div style={s.docMeta}>Date : {today}</div>
            </div>
            <div style={{
              padding: "16px 24px",
              borderRadius: 8,
              background: `${scoreColor}12`,
              border: `2px solid ${scoreColor}`,
              textAlign: "center",
              minWidth: 120,
            }}>
              <div style={{ fontSize: 11, color: scoreColor, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>SCORE BURNOUT</div>
              <div style={{ fontSize: 44, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{score}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>/100</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: scoreColor, marginTop: 6 }}>{level}</div>
            </div>
          </div>

          <div style={s.divider} />

          {/* ML Stats */}
          {mlResult?.stats && (
            <div style={{ marginBottom: 24 }}>
              <div style={s.sectionTitle}>Données de présence (analyse ML)</div>
              <table style={s.table}>
                <tbody>
                  <tr style={s.tr}>
                    <td style={s.tdLabel}>Taux d'absence</td>
                    <td style={s.tdValue}>{mlResult.stats.absence_rate_pct}%</td>
                    <td style={s.tdLabel}>Heures supplémentaires</td>
                    <td style={s.tdValue}>{mlResult.stats.overtime_hours}h</td>
                    <td style={s.tdLabel}>Jours travaillés</td>
                    <td style={s.tdValue}>{mlResult.stats.total_days}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Symptom summary */}
          <div style={{ marginBottom: 24 }}>
            <div style={s.sectionTitle}>Résumé du questionnaire</div>
            <table style={s.table}>
              <tbody>
                {allQuestions.map((q) => (
                  <tr key={q.id} style={s.tr}>
                    <td style={{ ...s.tdLabel, width: "70%" }}>{q.text}</td>
                    <td style={{
                      ...s.tdValue,
                      color: answers[q.id] === "oui" ? "#dc2626" : "#16a34a",
                      fontWeight: 700,
                    }}>
                      {answers[q.id]?.toUpperCase() ?? "—"}
                    </td>
                    {answers[q.id] === "oui" && details[q.id] && (
                      <td style={{ ...s.tdLabel, fontStyle: "italic", color: "#6b7280" }}>
                        {details[q.id]}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 8, fontSize: 13, color: "#374151" }}>
              <strong>{yesCount}</strong> réponse(s) positive(s) sur {total} questions
            </div>
          </div>

          {/* Notes */}
          {generalNote && (
            <div style={{ marginBottom: 24 }}>
              <div style={s.sectionTitle}>Notes complémentaires</div>
              <div style={{ ...s.noteBox, fontStyle: "italic" }}>{generalNote}</div>
            </div>
          )}

          {/* Recommendation */}
          {mlResult?.recommendation && (
            <div style={{ ...s.noteBox, borderColor: "#fbbf24", background: "#fffbeb", marginBottom: 24 }}>
              <strong style={{ color: "#92400e" }}>Recommandation :</strong>{" "}
              <span style={{ color: "#78350f" }}>{mlResult.recommendation.message}</span>
            </div>
          )}

          {/* Confirmation */}
          <div style={{ ...s.noteBox, borderColor: "#86efac", background: "#f0fdf4", marginBottom: 24, textAlign: "center" }}>
            <strong style={{ color: "#15803d" }}>✅ Bilan transmis à l'infirmière</strong>
            <div style={{ fontSize: 12, color: "#166534", marginTop: 4 }}>
              Elle vous contactera prochainement pour un suivi.
            </div>
          </div>

          {/* Footer */}
          <div style={s.docFooter}>
            <div>Document généré automatiquement — {today}</div>
            <button style={s.btnNew} onClick={() => { setAnswers({}); setDetails({}); setGeneralNote(""); setScreen("form"); }}>
              Nouveau bilan
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── FORM ──────────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <div style={s.doc}>
        {/* Document header */}
        <div style={s.docHeader}>
          <div style={s.headerLeft}>
            <div style={s.companyLabel}>SAGE RH — SERVICE MÉDICAL</div>
            <h1 style={s.docTitle}>Questionnaire de Santé au Travail</h1>
            <div style={s.docMeta}>Employé(e) : <strong>{fullName}</strong> — Matricule : <strong>{matricule}</strong></div>
            <div style={s.docMeta}>Date : {today}</div>
          </div>
          <div style={s.progressBox}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>{answered}/{total}</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>questions</div>
            <div style={s.progressTrack}>
              <div style={{ ...s.progressFill, width: `${(answered / total) * 100}%` }} />
            </div>
          </div>
        </div>

        <div style={s.divider} />

        {/* Instructions */}
        <p style={s.instructions}>
          Ce questionnaire est confidentiel et destiné au service médical. Répondez par <strong>OUI</strong> ou <strong>NON</strong> à chaque question. En cas de réponse positive, précisez si demandé.
        </p>

        {/* Section 1 */}
        <Section title="1. Antécédents médicaux" questions={SECTION_1}
          answers={answers} details={details} setAnswer={setAnswer} setDetail={setDetail} />

        {/* Section 2 */}
        <Section title="2. Santé mentale et bien-être psychologique" questions={SECTION_2}
          answers={answers} details={details} setAnswer={setAnswer} setDetail={setDetail} />

        {/* Section 3 */}
        <Section title="3. Symptômes physiques liés au travail" questions={SECTION_3}
          answers={answers} details={details} setAnswer={setAnswer} setDetail={setDetail} />

        {/* General notes */}
        <div style={{ marginBottom: 28 }}>
          <div style={s.sectionTitle}>Observations complémentaires (optionnel)</div>
          <textarea
            style={s.textarea}
            placeholder="Décrivez tout autre symptôme ou situation que vous souhaitez porter à la connaissance de l'infirmière..."
            value={generalNote}
            onChange={(e) => setGeneralNote(e.target.value)}
            rows={3}
          />
        </div>

        {/* Submit */}
        <div style={s.submitRow}>
          {!complete && (
            <span style={{ fontSize: 13, color: "#9ca3af" }}>
              {total - answered} question(s) sans réponse
            </span>
          )}
          <button
            style={{
              ...s.btnSubmit,
              opacity: complete ? 1 : 0.4,
              cursor: complete ? "pointer" : "not-allowed",
              marginLeft: "auto",
            }}
            disabled={!complete}
            onClick={submit}
          >
            Soumettre le bilan →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Section component ────────────────────────────────────────────────────────
function Section({ title, questions, answers, details, setAnswer, setDetail }: {
  title: string;
  questions: YesNoQuestion[];
  answers: Record<string, "oui" | "non" | null>;
  details: Record<string, string>;
  setAnswer: (id: string, val: "oui" | "non") => void;
  setDetail: (id: string, val: string) => void;
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={s.sectionTitle}>{title}</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {questions.map((q, i) => (
            <>
              <tr key={q.id} style={{
                borderBottom: "1px dotted #d1d5db",
                background: i % 2 === 0 ? "#fff" : "#f9fafb",
              }}>
                <td style={{ padding: "10px 8px", fontSize: 14, color: "#111827", width: "65%" }}>
                  {q.text}
                </td>
                <td style={{ padding: "10px 8px", textAlign: "center", width: "17.5%" }}>
                  <label style={s.yesNoLabel}>
                    <div
                      onClick={() => setAnswer(q.id, "oui")}
                      style={{
                        ...s.checkbox,
                        borderColor: answers[q.id] === "oui" ? "#dc2626" : "#9ca3af",
                        background: answers[q.id] === "oui" ? "#dc2626" : "#fff",
                      }}
                    >
                      {answers[q.id] === "oui" && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 13, color: "#374151" }}>Oui</span>
                  </label>
                </td>
                <td style={{ padding: "10px 8px", textAlign: "center", width: "17.5%" }}>
                  <label style={s.yesNoLabel}>
                    <div
                      onClick={() => setAnswer(q.id, "non")}
                      style={{
                        ...s.checkbox,
                        borderColor: answers[q.id] === "non" ? "#16a34a" : "#9ca3af",
                        background: answers[q.id] === "non" ? "#16a34a" : "#fff",
                      }}
                    >
                      {answers[q.id] === "non" && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 13, color: "#374151" }}>Non</span>
                  </label>
                </td>
              </tr>
              {q.detailLabel && answers[q.id] === "oui" && (
                <tr key={`${q.id}-detail`} style={{ background: "#fef2f2" }}>
                  <td colSpan={3} style={{ padding: "6px 8px 10px 24px" }}>
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{q.detailLabel}</div>
                    <input
                      style={s.detailInput}
                      placeholder="Précisez..."
                      value={details[q.id] || ""}
                      onChange={(e) => setDetail(q.id, e.target.value)}
                    />
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    background: "#fff",
    minHeight: "100vh",
    padding: "0",
    fontFamily: "'Georgia', 'Times New Roman', serif",
  },
  doc: {
    maxWidth: "100%",
    margin: "0",
    background: "#fff",
    border: "none",
    borderRadius: 0,
    padding: "32px 48px",
    boxShadow: "none",
  },
  docHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    gap: 20,
  },
  headerLeft: { flex: 1 },
  companyLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: 6,
    fontFamily: "'Arial', sans-serif",
  },
  docTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "#111827",
    margin: "0 0 8px",
    fontFamily: "'Arial', sans-serif",
  },
  docMeta: {
    fontSize: 13,
    color: "#374151",
    marginBottom: 3,
    fontFamily: "'Arial', sans-serif",
  },
  progressBox: {
    textAlign: "center",
    minWidth: 100,
    fontFamily: "'Arial', sans-serif",
  },
  progressTrack: {
    width: 90,
    height: 6,
    background: "#e5e7eb",
    borderRadius: 99,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "#2563eb",
    borderRadius: 99,
    transition: "width 0.3s",
  },
  divider: {
    borderTop: "2px solid #111827",
    marginBottom: 16,
  },
  instructions: {
    fontSize: 13,
    color: "#374151",
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 0,
    padding: "10px 14px",
    marginBottom: 24,
    lineHeight: 1.6,
    fontFamily: "'Arial', sans-serif",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#111827",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 10,
    fontFamily: "'Arial', sans-serif",
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: 6,
  },
  yesNoLabel: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    cursor: "pointer",
    fontFamily: "'Arial', sans-serif",
  },
  checkbox: {
    width: 16,
    height: 16,
    border: "2px solid",
    borderRadius: 2,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
    transition: "all 0.15s",
  },
  detailInput: {
    width: "100%",
    border: "none",
    borderBottom: "1px dotted #9ca3af",
    padding: "4px 0",
    fontSize: 13,
    color: "#374151",
    background: "transparent",
    outline: "none",
    fontFamily: "'Arial', sans-serif",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    border: "none",
    borderRadius: 0,
    padding: "10px 12px",
    fontSize: 13,
    color: "#374151",
    resize: "vertical",
    outline: "none",
    fontFamily: "'Arial', sans-serif",
    boxSizing: "border-box",
  },
  submitRow: {
    display: "flex",
    alignItems: "center",
    paddingTop: 16,
    borderTop: "1px solid #e5e7eb",
  },
  btnSubmit: {
    background: "#1d4ed8",
    color: "#fff",
    border: "none",
    borderRadius: 0,
    padding: "12px 32px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Arial', sans-serif",
    transition: "opacity 0.2s",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontFamily: "'Arial', sans-serif",
  },
  tr: { borderBottom: "1px dotted #d1d5db" },
  tdLabel: { padding: "8px", fontSize: 13, color: "#374151" },
  tdValue: { padding: "8px", fontSize: 13, color: "#111827", fontFamily: "'Arial', sans-serif" },
  noteBox: {
    border: "none",
    borderRadius: 0,
    padding: "12px 16px",
    fontSize: 13,
    color: "#374151",
    fontFamily: "'Arial', sans-serif",
    lineHeight: 1.6,
  },
  docFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTop: "1px solid #e5e7eb",
    fontSize: 12,
    color: "#9ca3af",
    fontFamily: "'Arial', sans-serif",
  },
  btnNew: {
    background: "transparent",
    color: "#2563eb",
    border: "1px solid #2563eb",
    borderRadius: 0,
    padding: "8px 20px",
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "'Arial', sans-serif",
  },
};
