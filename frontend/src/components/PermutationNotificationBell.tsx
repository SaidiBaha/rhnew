import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellIcon } from "@heroicons/react/24/solid";
import { BellIcon as BellOutlineIcon } from "@heroicons/react/24/outline";

import { useFetchPermutations } from "@/modules/permutation/hooks/useFetchPermutations";
import type { Permutation } from "@/modules/permutation/types";

interface Props {
  expanded: boolean;
}

export function PermutationNotificationBell({ expanded }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data } = useFetchPermutations();

  // Permutations reçues en attente = notifications non traitées
  const pending = (data ?? []).filter(
    (p: Permutation) => p.asReceiver && p.status === "EN_ATTENTE"
  );
  const count = pending.length;

  // Même logique que getSendersList dans PermutationsClient
  const getSenderName = (p: Permutation): string => {
    const names = (p as any).senderFullNames as string[] | undefined;
    if (names && names.length > 0) {
      const first = names[0]?.trim();
      if (first) return names.length > 1 ? `${first} +${names.length - 1}` : first;
    }
    const oldName = (p.senderFullName as string | undefined)?.trim();
    if (oldName) return oldName;
    return `#${p.senderId}`;
  };

  // Fermer le dropdown en cliquant en dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const goToPermutations = () => {
    setOpen(false);
    navigate("/permutations");
  };

  return (
    <div ref={ref} className="relative">
      {/* ── Bouton cloche ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Notifications de permutations"
        className="relative flex items-center justify-center rounded-lg p-1.5 transition-colors"
        style={{
          color: open ? "var(--accent)" : "var(--text-3)",
          background: open ? "var(--accent-soft)" : "transparent",
        }}
        onMouseEnter={(e) => {
          if (!open) {
            (e.currentTarget as HTMLElement).style.color = "var(--accent)";
            (e.currentTarget as HTMLElement).style.background = "var(--accent-soft)";
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            (e.currentTarget as HTMLElement).style.color = "var(--text-3)";
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }
        }}
      >
        {count > 0 ? (
          <BellIcon className="h-5 w-5" />
        ) : (
          <BellOutlineIcon className="h-5 w-5" />
        )}

        {/* Badge compteur */}
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white shadow-sm">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {/* ── Dropdown notifications ── */}
      {open && (
        <div
          className={`absolute z-60 w-80 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl ${
            expanded ? "left-0 top-full mt-2" : "left-full top-0 ml-3"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <BellIcon className="h-4 w-4" style={{ color: "var(--accent)" }} />
              <p className="text-sm font-bold text-slate-800">Notifications</p>
            </div>
            {count > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-600">
                {count} en attente
              </span>
            )}
          </div>

          {/* Liste */}
          <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-50">
            {pending.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <BellOutlineIcon className="mb-2 h-10 w-10 text-slate-200" />
                <p className="text-sm font-medium text-slate-500">Aucune notification</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Pas de permutation en attente
                </p>
              </div>
            ) : (
              pending.map((p: Permutation) => (
                <button
                  key={p.id}
                  onClick={goToPermutations}
                  className="group w-full px-4 py-3.5 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-start gap-3">
                    {/* Indicateur non lu */}
                    <div className="mt-[5px] h-2 w-2 shrink-0 rounded-full bg-amber-400" />

                    <div className="min-w-0 flex-1">
                      {/* Émetteur */}
                      <p className="truncate text-sm font-semibold text-slate-900">
                        De{" "}
                        <span style={{ color: "var(--accent)" }}>
                          {getSenderName(p)}
                        </span>
                      </p>

                      {/* Opérateurs + période */}
                      <p className="mt-0.5 text-xs text-slate-500">
                        <span className="font-medium">
                          {p.operatorIds.length} opérateur{p.operatorIds.length > 1 ? "s" : ""}
                        </span>
                        {" · "}
                        {p.startDate === p.endDate
                          ? p.startDate
                          : `${p.startDate} → ${p.endDate}`}
                      </p>

                      {/* Horaires */}
                      <p className="text-[11px] text-slate-400">
                        {p.startTime} – {p.endTime}
                      </p>

                      {/* Noms opérateurs si disponibles */}
                      {p.operatorNames && p.operatorNames.length > 0 && (
                        <p className="mt-0.5 truncate text-[11px] text-slate-400">
                          {p.operatorNames.slice(0, 2).join(", ")}
                          {p.operatorNames.length > 2 && ` +${p.operatorNames.length - 2}`}
                        </p>
                      )}

                      {/* Badge statut */}
                      <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        ⏳ En attente
                      </span>
                    </div>

                    {/* Flèche */}
                    <span className="mt-1 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500">
                      →
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer — lien vers la page */}
          <div className="border-t border-slate-100 px-4 py-2.5">
            <button
              onClick={goToPermutations}
              className="w-full text-center text-xs font-semibold hover:underline" style={{ color: "var(--accent)" }}
            >
              Voir toutes les permutations →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
