import type { HistoryFilter } from "../types";

const PRESETS: { key: HistoryFilter; label: string }[] = [
  { key: "today",  label: "Aujourd'hui"      },
  { key: "week",   label: "7 derniers jours" },
  { key: "month",  label: "Mois courant"     },
  { key: "custom", label: "Personnalisé"     },
  { key: "all",    label: "Toute la période" },
];

interface Props {
  filter: HistoryFilter;
  customFrom: string;
  customTo: string;
  onFilterChange: (filter: HistoryFilter, from: string, to: string) => void;
}

export function FilterBar({ filter, customFrom, customTo, onFilterChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onFilterChange(key, customFrom, customTo)}
          className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all"
          style={
            filter === key
              ? { background: "var(--accent)", color: "#fff" }
              : { background: "var(--white)", color: "var(--text2)", border: "1px solid var(--border)" }
          }
        >
          {label}
        </button>
      ))}

      {filter === "custom" && (
        <div className="flex items-center gap-2 ml-1">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => onFilterChange("custom", e.target.value, customTo)}
            className="rounded-lg border px-2 py-1.5 text-sm outline-none focus:ring-2"
            style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--white)" }}
          />
          <span className="text-sm" style={{ color: "var(--muted)" }}>→</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => onFilterChange("custom", customFrom, e.target.value)}
            className="rounded-lg border px-2 py-1.5 text-sm outline-none focus:ring-2"
            style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--white)" }}
          />
        </div>
      )}
    </div>
  );
}
