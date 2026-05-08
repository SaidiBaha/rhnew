import { useState, useMemo } from "react";
import { Shield, Users, UserCheck, UserX, Activity, Pencil, Lock, Unlock, History, Search, X } from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import axios from "axios";

import { Heading } from "@/components/Heading";
import { Separator } from "@/components/ui/Separator";
import { Loader } from "@/components/Loader";
import { useFetchUsers } from "@/modules/user-management/hooks/useFetchUsers";
import { useFetchUserStats } from "@/modules/user-management/hooks/useFetchUserStats";
import { useBlockUser } from "@/modules/user-management/hooks/useBlockUser";
import { useUpdateUser } from "@/modules/user-management/hooks/useUpdateUser";
import { UserActivityModal } from "@/modules/user-management/components/UserActivityModal";
import type { UserAdmin, UpdateUserRequest } from "@/modules/user-management/types";

const ROLES = ["ADMIN", "SUPERVISOR", "OPERATIONAL_MANAGER", "PLANIFICATEUR", "SUPER_ADMIN", "NURSE", "INGENIEUR_HSE"];

const ROLE_LABELS: Record<string, string> = {
  ADMIN:              "Admin",
  SUPERVISOR:         "Superviseur",
  OPERATIONAL_MANAGER:"Chef d'opérations",
  PLANIFICATEUR:      "Planificateur",
  SUPER_ADMIN:        "Super Admin",
  NURSE:              "Infirmier(e)",
  INGENIEUR_HSE:      "Ingénieur HSE",
};

function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    if (data?.message) return data.message;
    if (typeof data === "string") return data;
  }
  if (err instanceof Error) return err.message;
  return "Une erreur est survenue";
}

function fmt(dt: string | null) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/* ─── Stat Card ──────────────────────────────────────────── */
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent?: string;
}
function StatCard({ icon, label, value, accent = "var(--accent)" }: StatCardProps) {
  return (
    <div
      className="flex items-center gap-4 rounded-2xl p-5"
      style={{ background: "var(--white)", border: "1px solid var(--border)" }}
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{ background: accent + "18", color: accent }}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>{value}</p>
        <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text2)" }}>{label}</p>
      </div>
    </div>
  );
}

/* ─── Edit Modal ─────────────────────────────────────────── */
interface EditModalProps {
  user: UserAdmin;
  onClose: () => void;
  onSave: (data: UpdateUserRequest) => void;
  loading: boolean;
}
function EditModal({ user, onClose, onSave, loading }: EditModalProps) {
  const [role, setRole]   = useState(user.role);
  const [email, setEmail] = useState(user.email ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ background: "var(--white)", border: "1px solid var(--border)" }}
      >
        <h2 className="mb-4 text-lg font-bold" style={{ color: "var(--text)" }}>
          Modifier l'utilisateur
        </h2>
        <p className="mb-4 text-sm" style={{ color: "var(--text2)" }}>
          {user.fullName ?? user.matricule}
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: "var(--text)" }}>
              Rôle
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ border: "1px solid var(--border)", color: "var(--text)", background: "var(--bg)" }}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: "var(--text)" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemple.com"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ border: "1px solid var(--border)", color: "var(--text)", background: "var(--bg)" }}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{ border: "1px solid var(--border)", color: "var(--text2)" }}
          >
            Annuler
          </button>
          <button
            onClick={() => onSave({ role, email })}
            disabled={loading}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "var(--accent)", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Client ────────────────────────────────────────── */
export function UserManagementClient() {
  const { data: users,  isLoading: loadingUsers  } = useFetchUsers();
  const { data: stats,  isLoading: loadingStats  } = useFetchUserStats();
  const blockMutation  = useBlockUser();
  const updateMutation = useUpdateUser();

  const [search, setSearch]           = useState("");
  const [editTarget, setEditTarget]   = useState<UserAdmin | null>(null);
  const [historyUser, setHistoryUser] = useState<UserAdmin | null>(null);

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = search.toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.fullName ?? "").toLowerCase().includes(q) ||
        u.matricule.toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [users, search]);

  const handleBlock = async (u: UserAdmin) => {
    const action = u.blocked ? "débloquer" : "bloquer";
    const result = await Swal.fire({
      title: `${u.blocked ? "Débloquer" : "Bloquer"} ce compte ?`,
      text: `Vous allez ${action} le compte de ${u.fullName ?? u.matricule}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: u.blocked ? "Débloquer" : "Bloquer",
      cancelButtonText: "Annuler",
      confirmButtonColor: u.blocked ? "#00c48c" : "#f03e3e",
    });
    if (!result.isConfirmed) return;

    blockMutation.mutate(
      { id: u.id, blocked: !u.blocked },
      {
        onSuccess: () => toast.success(`Compte ${u.blocked ? "débloqué" : "bloqué"}`),
        onError: (err) => toast.error(extractErrorMessage(err)),
      }
    );
  };

  const handleSave = (data: UpdateUserRequest) => {
    if (!editTarget) return;
    updateMutation.mutate(
      { id: editTarget.id, data },
      {
        onSuccess: () => { toast.success("Compte mis à jour"); setEditTarget(null); },
        onError: (err) => toast.error(extractErrorMessage(err)),
      }
    );
  };

  const isLoading = loadingUsers || loadingStats;

  return (
    <div className="flex flex-col gap-6 p-6">
      <Heading
        title="Gestion des utilisateurs"
        description="Tableau de bord et gestion des comptes utilisateurs de l'application"
      />

      <Separator />

      {/* ─── Stats ─── */}
      {loadingStats ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl" style={{ background: "var(--border)" }} />
          ))}
        </div>
      ) : stats && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={<Users className="h-5 w-5" />}     label="Total utilisateurs"  value={stats.totalUsers}     accent="var(--accent)" />
            <StatCard icon={<UserCheck className="h-5 w-5" />}  label="Comptes actifs"      value={stats.activeUsers}    accent="var(--accent2)" />
            <StatCard icon={<UserX className="h-5 w-5" />}      label="Comptes bloqués"     value={stats.blockedUsers}   accent="var(--accent4)" />
            <StatCard icon={<Activity className="h-5 w-5" />}   label="Connectés aujourd'hui" value={stats.connectedToday} accent="var(--accent3)" />
          </div>

          {/* Par rôle */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "var(--white)", border: "1px solid var(--border)" }}
          >
            <div className="mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4" style={{ color: "var(--accent)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Répartition par rôle</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {Object.entries(stats.byRole).map(([role, count]) => (
                <div
                  key={role}
                  className="flex items-center gap-2 rounded-xl px-3 py-2"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                >
                  <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{count}</span>
                  <span className="text-xs" style={{ color: "var(--text2)" }}>{ROLE_LABELS[role] ?? role}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ─── Table ─── */}
      <div>
        {/* Search */}
        <div className="mb-4 flex items-center gap-3">
          <div
            className="flex flex-1 max-w-xs items-center gap-2 rounded-xl px-3 py-2"
            style={{ background: "var(--white)", border: "1px solid var(--border)" }}
          >
            <Search className="h-4 w-4 shrink-0" style={{ color: "var(--muted)" }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "var(--text)" }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ color: "var(--muted)" }}>
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <Loader />
        ) : (
          <div
            className="overflow-hidden rounded-2xl"
            style={{ border: "1px solid var(--border)", background: "var(--white)" }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Utilisateur</th>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Matricule</th>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Email</th>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Rôle</th>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Statut</th>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Dernière connexion</th>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text2)" }}>Dernière activité</th>
                    <th className="px-4 py-3 text-right font-semibold" style={{ color: "var(--text2)" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-sm" style={{ color: "var(--muted)" }}>
                        {search ? `Aucun résultat pour « ${search} »` : "Aucun utilisateur"}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((u, i) => (
                      <tr
                        key={u.id}
                        style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none" }}
                        className="hover:bg-[var(--bg)] transition-colors"
                      >
                        {/* Utilisateur */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                              style={{ background: u.blocked ? "var(--muted)" : "var(--accent)" }}
                            >
                              {(u.fullName ?? u.matricule).slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-semibold" style={{ color: "var(--text)" }}>
                              {u.fullName ?? "—"}
                            </span>
                          </div>
                        </td>

                        {/* Matricule */}
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--muted)" }}>
                          #{u.matricule}
                        </td>

                        {/* Email */}
                        <td className="px-4 py-3 text-xs" style={{ color: "var(--text2)" }}>
                          {u.email ?? "—"}
                        </td>

                        {/* Rôle */}
                        <td className="px-4 py-3">
                          <span
                            className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
                            style={{ background: "rgba(47,107,255,0.1)", color: "var(--accent)" }}
                          >
                            {ROLE_LABELS[u.role] ?? u.role}
                          </span>
                        </td>

                        {/* Statut */}
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                            style={
                              u.blocked
                                ? { background: "rgba(240,62,62,0.12)", color: "var(--accent4)" }
                                : { background: "rgba(0,196,140,0.12)", color: "var(--accent2)" }
                            }
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ background: u.blocked ? "var(--accent4)" : "var(--accent2)" }}
                            />
                            {u.blocked ? "Bloqué" : "Actif"}
                          </span>
                        </td>

                        {/* Dernière connexion */}
                        <td className="px-4 py-3 text-xs" style={{ color: "var(--text2)" }}>
                          {fmt(u.lastLoginAt)}
                        </td>

                        {/* Dernière activité */}
                        <td className="px-4 py-3">
                          <div className="text-xs" style={{ color: "var(--text2)" }}>
                            {fmt(u.lastActivityAt)}
                          </div>
                          {u.lastActivityIp && (
                            <div className="font-mono text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                              {u.lastActivityIp}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditTarget(u)}
                              title="Modifier"
                              className="rounded-lg p-1.5 transition-colors hover:bg-[var(--accent-light)]"
                              style={{ color: "var(--accent)" }}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleBlock(u)}
                              title={u.blocked ? "Débloquer" : "Bloquer"}
                              className="rounded-lg p-1.5 transition-colors"
                              style={u.blocked
                                ? { color: "var(--accent2)" }
                                : { color: "var(--accent4)" }}
                            >
                              {u.blocked
                                ? <Unlock className="h-4 w-4" />
                                : <Lock   className="h-4 w-4" />
                              }
                            </button>
                            <button
                              onClick={() => setHistoryUser(u)}
                              title="Historique"
                              className="rounded-lg p-1.5 transition-colors hover:bg-[var(--bg)]"
                              style={{ color: "var(--text2)" }}
                            >
                              <History className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {editTarget && (
        <EditModal
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleSave}
          loading={updateMutation.isPending}
        />
      )}

      {historyUser && (
        <UserActivityModal
          user={historyUser}
          onClose={() => setHistoryUser(null)}
        />
      )}
    </div>
  );
}
