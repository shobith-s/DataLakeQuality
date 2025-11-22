// frontend/src/ui/PillTabs.tsx
import React from "react";
import { dlqColors, dlqRadii, dlqSpace } from "./theme";

export interface PillTab {
  id: string;
  label: string;
}

export interface PillTabsProps {
  tabs: PillTab[];
  activeId: string;
  onChange: (id: string) => void;
}

const PillTabs: React.FC<PillTabsProps> = ({ tabs, activeId, onChange }) => {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: 2,
        borderRadius: dlqRadii.pill,
        backgroundColor: "#060716",
        border: `1px solid ${dlqColors.borderSubtle}`,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              padding: "4px 10px",
              borderRadius: dlqRadii.pill,
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              backgroundColor: isActive
                ? dlqColors.accentPrimary
                : "transparent",
              color: isActive ? "#fff" : dlqColors.textSecondary,
              boxShadow: isActive
                ? "0 0 0 1px rgba(255,255,255,0.08)"
                : "none",
              transition: "background-color 0.12s ease, color 0.12s ease",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default PillTabs;
