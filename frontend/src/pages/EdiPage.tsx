import { useState } from "react";
import EdiConverter from "@/modules/edi/EdiConverter";
import EdiHistory from "@/modules/edi/EdiHistory";

type Tab = "convert" | "history";

export default function EdiPage() {
  const [activeTab, setActiveTab] = useState<Tab>("convert");

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: 0 }}>
          Module EDI DELFOR
        </h1>
        <p style={{ fontSize: 14, color: "var(--text2)", marginTop: 4, marginBottom: 0 }}>
          Conversion de fichiers EDIFACT DELFOR vers CSV et historique des exports.
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "1px solid var(--border)",
          marginBottom: 24,
        }}
      >
        {(
          [
            { key: "convert", label: "Conversion" },
            { key: "history", label: "Historique" },
          ] as { key: Tab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "8px 20px",
              fontSize: 14,
              fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? "var(--accent)" : "var(--text2)",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === tab.key
                ? "2px solid var(--accent)"
                : "2px solid transparent",
              cursor: "pointer",
              marginBottom: -1,
              transition: "all 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "convert" ? <EdiConverter /> : <EdiHistory />}
    </div>
  );
}
