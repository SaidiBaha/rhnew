import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellIcon } from "@heroicons/react/24/solid";
import { BellIcon as BellOutlineIcon } from "@heroicons/react/24/outline";

import { useFetchRequests } from "@/lib/data/request";
import type { Request } from "@/modules/request/types";

interface Props {
  expanded: boolean;
}

const VIEWED_KEY = "viewed_request_notifications";

function getViewedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(VIEWED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveViewedIds(ids: Set<string>) {
  localStorage.setItem(VIEWED_KEY, JSON.stringify([...ids]));
}

export function RequestNotificationBell({ expanded }: Props) {
  const [open, setOpen] = useState(false);
  const [viewedIds, setViewedIds] = useState<Set<string>>(getViewedIds);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data } = useFetchRequests();

  const pending = (data?.data ?? []).filter(
    (r: Request) => r.status === "SOUMIS"
  );

  // Unread = pending requests not yet viewed
  const unread = pending.filter((r: Request) => !viewedIds.has(String(r.id)));
  const count = unread.length;

  // When dropdown opens, mark all current pending as viewed
  useEffect(() => {
    if (open && pending.length > 0) {
      const newViewed = new Set(viewedIds);
      pending.forEach((r: Request) => newViewed.add(String(r.id)));
      setViewedIds(newViewed);
      saveViewedIds(newViewed);
    }
  }, [open]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const goToRequests = () => {
    setOpen(false);
    navigate("/requests");
  };

  return (
    <div ref={ref} className="relative">
      {/* ── Bell button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Demandes en attente"
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

        {/* Badge — only shows unread count */}
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white shadow-sm">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {/* ── Dropdown ── */}
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
              <p className="text-sm font-bold text-slate-800">Demandes en attente</p>
            </div>
            {pending.length > 0 && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-600">
                {pending.length} à traiter
              </span>
            )}
          </div>

          {/* List */}
          <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-50">
            {pending.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <BellOutlineIcon className="mb-2 h-10 w-10 text-slate-200" />
                <p className="text-sm font-medium text-slate-500">Aucune notification</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Pas de demande en attente
                </p>
              </div>
            ) : (
              pending.slice(0, 10).map((r: Request) => (
                <button
                  key={r.id}
                  onClick={goToRequests}
                  className="group w-full px-4 py-3.5 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-start gap-3">
                    {/* Unread indicator — grey if viewed, blue if new */}
                    <div
                      className={`mt-[5px] h-2 w-2 shrink-0 rounded-full ${
                        viewedIds.has(String(r.id)) ? "bg-slate-200" : "bg-blue-400"
                      }`}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {r.employee.fullName}
                        <span className="ml-1 text-xs font-normal text-slate-400">
                          #{r.employee.matricule}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {r.requestType.replace(/_/g, " ")}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Soumis par{" "}
                        <span className="font-medium">
                          {r.createdBy.employee.fullName}
                        </span>
                      </p>
                      <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                        ⏳ En attente
                      </span>
                    </div>

                    <span className="mt-1 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500">
                      →
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-4 py-2.5">
            <button
              onClick={goToRequests}
              className="w-full text-center text-xs font-semibold hover:underline"
              style={{ color: "var(--accent)" }}
            >
              Voir toutes les demandes →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}