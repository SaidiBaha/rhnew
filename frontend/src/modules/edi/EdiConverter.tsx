import { useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import useAuth from "@/hooks/useAuth";

interface ConversionResult {
  csvContent: string;
  suggestedFilename: string;
  messageCount: number;
  deliveryLineCount: number;
  totalScheduleEntries: number;
  csvSizeBytes: number;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  messageCount: number;
}

export default function EdiConverter() {
  const { auth } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [validating, setValidating] = useState(false);
  const [converting, setConverting] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [result, setResult] = useState<ConversionResult | null>(null);

  const headers = { Authorization: `Bearer ${auth.accessToken}` };
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  // ── drag & drop ──────────────────────────────────────────────────────────

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) acceptFile(dropped);
  };

  const acceptFile = (f: File) => {
    setFile(f);
    setValidation(null);
    setResult(null);
  };

  // ── validate ─────────────────────────────────────────────────────────────

  const handleValidate = async () => {
    if (!file) return;
    setValidating(true);
    setValidation(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await axios.post<ValidationResult>(
        `${baseUrl}/edi/validate`,
        form,
        { headers }
      );
      setValidation(res.data);
      if (res.data.valid) {
        toast.success(`Fichier valide — ${res.data.messageCount} messages DELFOR`);
      } else {
        toast.error(`Validation échouée — ${res.data.errors.length} erreur(s)`);
      }
    } catch {
      toast.error("Erreur lors de la validation");
    } finally {
      setValidating(false);
    }
  };

  // ── convert ──────────────────────────────────────────────────────────────

  const handleConvert = async () => {
    if (!file) return;
    setConverting(true);
    setResult(null);
    try {
      const ediContent = await file.text();
      const res = await axios.post<ConversionResult>(
        `${baseUrl}/edi/convert/text`,
        { ediContent, fileName: file.name },
        { headers: { ...headers, "Content-Type": "application/json" } }
      );
      setResult(res.data);
      toast.success(`Conversion réussie — ${res.data.messageCount} messages`);
    } catch (err: any) {
      if (err.response?.status === 400) {
        toast.error("Fichier EDI invalide ou non reconnu");
      } else if (err.response?.status === 422) {
        toast.error("Fichier EDI rejeté par la validation");
      } else {
        toast.error("Erreur lors de la conversion");
      }
    } finally {
      setConverting(false);
    }
  };

  // ── download ─────────────────────────────────────────────────────────────

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result.csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.suggestedFilename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── CSV preview (first 10 lines) ─────────────────────────────────────────

  const previewLines = result
    ? result.csvContent.split("\n").filter((l) => l.trim()).slice(0, 10)
    : [];

  const totalLines = result
    ? result.csvContent.split("\n").filter((l) => l.trim()).length
    : 0;

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "var(--accent)" : "var(--border)"}`,
          borderRadius: "var(--radius)",
          background: dragging ? "var(--accent-light)" : "var(--white)",
          padding: "40px 24px",
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".EDI,.edi,.txt"
          style={{ display: "none" }}
          onChange={(e) => e.target.files?.[0] && acceptFile(e.target.files[0])}
        />
        <div style={{ fontSize: 36, marginBottom: 8 }}>📂</div>
        {file ? (
          <>
            <div style={{ fontWeight: 600, color: "var(--text)", fontSize: 15 }}>
              {file.name}
            </div>
            <div style={{ color: "var(--text2)", fontSize: 13, marginTop: 4 }}>
              {(file.size / 1024).toFixed(1)} Ko — cliquer pour changer
            </div>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 600, color: "var(--text)", fontSize: 15 }}>
              Déposer un fichier EDI DELFOR ici
            </div>
            <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
              ou cliquer pour parcourir (.EDI, .edi, .txt)
            </div>
          </>
        )}
      </div>

      {/* Action buttons */}
      {file && (
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            onClick={handleValidate}
            disabled={validating}
            style={{
              padding: "9px 20px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--white)",
              color: "var(--text)",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              opacity: validating ? 0.6 : 1,
            }}
          >
            {validating ? "Validation…" : "Valider"}
          </button>

          <button
            onClick={handleConvert}
            disabled={converting}
            style={{
              padding: "9px 20px",
              borderRadius: 8,
              border: "none",
              background: "var(--accent)",
              color: "#fff",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              opacity: converting ? 0.6 : 1,
            }}
          >
            {converting ? "Conversion…" : "Convertir en CSV"}
          </button>

          {result && (
            <button
              onClick={handleDownload}
              style={{
                padding: "9px 20px",
                borderRadius: 8,
                border: "none",
                background: "var(--accent2)",
                color: "#fff",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                marginLeft: "auto",
              }}
            >
              Télécharger CSV
            </button>
          )}
        </div>
      )}

      {/* Validation result */}
      {validation && (
        <div
          style={{
            marginTop: 16,
            padding: "14px 18px",
            borderRadius: "var(--radius)",
            background: validation.valid ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${validation.valid ? "#86efac" : "#fca5a5"}`,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14, color: validation.valid ? "#15803d" : "#dc2626" }}>
            {validation.valid
              ? `✓ Fichier valide — ${validation.messageCount} messages DELFOR`
              : `✗ Validation échouée — ${validation.errors.length} erreur(s)`}
          </div>
          {!validation.valid && (
            <ul style={{ margin: "8px 0 0", paddingLeft: 20, fontSize: 13, color: "#dc2626" }}>
              {validation.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Conversion stats */}
      {result && (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
              marginBottom: 16,
            }}
          >
            {[
              { label: "Messages", value: result.messageCount },
              { label: "Lignes LIN", value: result.deliveryLineCount },
              { label: "Entrées planning", value: result.totalScheduleEntries },
              { label: "Taille CSV", value: `${(result.csvSizeBytes / 1024).toFixed(1)} Ko` },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: "var(--white)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "14px 16px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)" }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 2 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Filename */}
          <div
            style={{
              background: "var(--accent-light)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              color: "var(--text2)",
              marginBottom: 16,
            }}
          >
            <span style={{ color: "var(--muted)" }}>Fichier CSV : </span>
            <span style={{ fontFamily: "var(--font-mono, monospace)", color: "var(--text)", fontWeight: 600 }}>
              {result.suggestedFilename}
            </span>
          </div>

          {/* CSV Preview */}
          <div
            style={{
              background: "var(--white)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "10px 16px",
                borderBottom: "1px solid var(--border)",
                fontWeight: 600,
                fontSize: 13,
                color: "var(--text2)",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Aperçu CSV</span>
              <span style={{ color: "var(--muted)", fontWeight: 400 }}>
                {previewLines.length < totalLines
                  ? `10 premières lignes sur ${totalLines}`
                  : `${totalLines} lignes`}
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {previewLines.map((line, i) => (
                    <tr
                      key={i}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        background: i % 2 === 0 ? "transparent" : "var(--bg)",
                      }}
                    >
                      <td
                        style={{
                          padding: "6px 16px",
                          fontFamily: "var(--font-mono, 'Fira Code', monospace)",
                          fontSize: 12,
                          color: "var(--text)",
                          whiteSpace: "nowrap",
                          maxWidth: 760,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {line}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
