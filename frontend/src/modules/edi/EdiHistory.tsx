import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import useAuth from "@/hooks/useAuth";

interface HistoryEntry {
  id: number;
  ediFileName: string;
  ediFileSizeBytes: number;
  csvFileName: string | null;
  csvFileSizeBytes: number | null;
  messageCount: number | null;
  lineCount: number | null;
  status: "SUCCESS" | "ERROR";
  errorMessage: string | null;
  convertedByMatricule: string;
  convertedByName: string;
  convertedAt: string;
  interchangeRef: string | null;
  senderCode: string | null;
  receiverCode: string | null;
}

interface PageResponse {
  content: HistoryEntry[];
  totalPages: number;
  totalElements: number;
  pageNumber: number;
}

export default function EdiHistory() {
  const { auth } = useAuth();
  const isSuperAdmin = auth.user?.role === "SUPER_ADMIN";
  const headers = { Authorization: `Bearer ${auth.accessToken}` };
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  const [data, setData]       = useState<PageResponse | null>(null);
  const [page, setPage]       = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [page]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await axios.get<PageResponse>(
        `${baseUrl}/edi/history?page=${page}&size=20`,
        { headers }
      );
      setData(res.data);
    } catch {
      toast.error("Erreur lors du chargement de l'historique");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (id: number, csvFileName: string) => {
    try {
      const res = await axios.get(`${baseUrl}/edi/history/${id}/download`, {
        headers,
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = csvFileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      if (err.response?.status === 403) {
        toast.error("Accès refusé : vous ne pouvez télécharger que vos propres fichiers");
      } else {
        toast.error("Erreur lors du téléchargement");
      }
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("fr-FR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const formatSize = (bytes: number | null) => {
    if (bytes == null) return "—";
    if (bytes < 1024) return `${bytes} o`;
    return `${(bytes / 1024).toFixed(1)} Ko`;
  };

  const entries = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>
          Historique des conversions
          {isSuperAdmin && (
            <span style={{ fontSize: 12, fontWeight: 400, color: "var(--muted)", marginLeft: 8 }}>
              — tous les utilisateurs
            </span>
          )}
        </div>
        {data && (
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            {data.totalElements} conversion{data.totalElements > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>Chargement…</div>
      ) : entries.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: 48,
            color: "var(--muted)",
            background: "var(--white)",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
          }}
        >
          Aucune conversion enregistrée
        </div>
      ) : (
        <div
          style={{
            background: "var(--white)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
                  <Th>Date / Heure</Th>
                  <Th>Fichier EDI</Th>
                  <Th>Fichier CSV</Th>
                  <Th>Messages</Th>
                  <Th>Lignes</Th>
                  <Th>Taille CSV</Th>
                  <Th>Statut</Th>
                  {isSuperAdmin && <Th>Converti par</Th>}
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <tr
                    key={entry.id}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      background: i % 2 === 0 ? "transparent" : "var(--bg)",
                    }}
                  >
                    <Td mono>{formatDate(entry.convertedAt)}</Td>
                    <Td mono>{entry.ediFileName}</Td>
                    <Td mono>{entry.csvFileName ?? "—"}</Td>
                    <Td center>{entry.messageCount ?? "—"}</Td>
                    <Td center>{entry.lineCount ?? "—"}</Td>
                    <Td center>{formatSize(entry.csvFileSizeBytes)}</Td>
                    <Td>
                      {entry.status === "SUCCESS" ? (
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: 99,
                            fontSize: 11,
                            fontWeight: 600,
                            background: "#dcfce7",
                            color: "#15803d",
                          }}
                        >
                          Succès
                        </span>
                      ) : (
                        <span
                          title={entry.errorMessage ?? undefined}
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: 99,
                            fontSize: 11,
                            fontWeight: 600,
                            background: "#fee2e2",
                            color: "#dc2626",
                            cursor: "help",
                          }}
                        >
                          Erreur
                        </span>
                      )}
                    </Td>
                    {isSuperAdmin && (
                      <Td>
                        <span style={{ color: "var(--text)" }}>{entry.convertedByName}</span>
                        <span style={{ color: "var(--muted)", fontSize: 11, marginLeft: 4 }}>
                          #{entry.convertedByMatricule}
                        </span>
                      </Td>
                    )}
                    <Td>
                      {entry.status === "SUCCESS" && entry.csvFileName && (
                        <button
                          onClick={() => handleDownload(entry.id, entry.csvFileName!)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 6,
                            border: "1px solid var(--border)",
                            background: "var(--white)",
                            color: "var(--accent)",
                            fontWeight: 600,
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          Télécharger
                        </button>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 8,
                padding: "12px 16px",
                borderTop: "1px solid var(--border)",
              }}
            >
              <PageBtn disabled={page === 0} onClick={() => setPage(page - 1)}>← Précédent</PageBtn>
              <span style={{ lineHeight: "32px", fontSize: 13, color: "var(--text2)" }}>
                Page {page + 1} / {totalPages}
              </span>
              <PageBtn disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Suivant →</PageBtn>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Mini helpers ──────────────────────────────────────────────────────────────

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        padding: "10px 14px",
        textAlign: "left",
        fontWeight: 600,
        fontSize: 12,
        color: "var(--text2)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, mono, center }: { children: React.ReactNode; mono?: boolean; center?: boolean }) {
  return (
    <td
      style={{
        padding: "9px 14px",
        color: "var(--text)",
        fontFamily: mono ? "var(--font-mono, 'Fira Code', monospace)" : undefined,
        fontSize: mono ? 12 : 13,
        textAlign: center ? "center" : "left",
        whiteSpace: "nowrap",
        maxWidth: 240,
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {children}
    </td>
  );
}

function PageBtn({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: 6,
        border: "1px solid var(--border)",
        background: disabled ? "var(--bg)" : "var(--white)",
        color: disabled ? "var(--muted)" : "var(--text)",
        fontWeight: 600,
        fontSize: 13,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {children}
    </button>
  );
}
