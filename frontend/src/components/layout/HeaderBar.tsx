// frontend/src/components/layout/HeaderBar.tsx
import React, { useState } from "react";
import { dlqColors, dlqSpace, dlqTypography } from "../../ui/theme";
import PillTabs from "../../ui/PillTabs";
import Chip from "../../ui/Chip";
import StatusIcon from "../../ui/StatusIcon";

export type NavTabId =
  | "profiling"
  | "drift"
  | "pii"
  | "policy"
  | "autofix"
  | "alerts"
  | "history"
  | "schema";

interface HeaderBarProps {
  activeTab: NavTabId;
  onTabChange: (id: NavTabId) => void;
  datasetName?: string;
}

const NAV_TABS: { id: NavTabId; label: string }[] = [
  { id: "profiling", label: "Profiling" },
  { id: "drift", label: "Drift" },
  { id: "pii", label: "PII" },
  { id: "policy", label: "Policy Engine" },
  { id: "autofix", label: "AutoFix" },
  { id: "alerts", label: "Alerts" },
  { id: "history", label: "History" },
  { id: "schema", label: "Schema" },
];

const HeaderBar: React.FC<HeaderBarProps> = ({
  activeTab,
  onTabChange,
  datasetName,
}) => {
  const [datasetMenuOpen, setDatasetMenuOpen] = useState(false);

  const handleTabChange = (id: string) => {
    onTabChange(id as NavTabId);
  };

  const displayName = datasetName || "No dataset selected";

  return (
    <header
      style={{
        marginBottom: dlqSpace.md,
        paddingBottom: dlqSpace.sm,
        borderBottom: `1px solid rgba(148,163,184,0.18)`,
        background:
          "linear-gradient(to bottom, rgba(15,23,42,0.9), rgba(15,23,42,0))",
        position: "sticky",
        top: 0,
        zIndex: 10,
        backdropFilter: "blur(14px)",
      }}
    >
      {/* Top row: title + dataset selector */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: dlqTypography.h1,
              letterSpacing: 0.2,
            }}
          >
            DataLakeQ – Data Quality Firewall
          </h1>
          <p
            style={{
              margin: 0,
              marginTop: 2,
              fontSize: 12,
              color: dlqColors.textSecondary,
            }}
          >
            Profiling · Drift · PII · Policy Engine · AutoFix · Alerts · History
            · Schema
          </p>
        </div>

        {/* Dataset selector */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setDatasetMenuOpen((open) => !open)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 999,
              border: `1px solid ${dlqColors.borderStrong}`,
              backgroundColor: "#050816",
              color: dlqColors.textPrimary,
              fontSize: 12,
              cursor: "pointer",
              minWidth: 180,
              justifyContent: "space-between",
              boxShadow: "0 12px 28px rgba(0,0,0,0.55)",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <StatusIcon tone={datasetName ? "info" : "neutral"} size={16} />
              <span
                style={{
                  maxWidth: 140,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {displayName}
              </span>
            </span>
            <span
              style={{
                fontSize: 10,
                opacity: 0.8,
              }}
            >
              ▼
            </span>
          </button>

          {datasetMenuOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                marginTop: 6,
                minWidth: 220,
                backgroundColor: "#050816",
                border: `1px solid ${dlqColors.borderSubtle}`,
                borderRadius: 10,
                boxShadow: "0 22px 40px rgba(0,0,0,0.8)",
                padding: 8,
                fontSize: 12,
                color: dlqColors.textSecondary,
              }}
            >
              <div
                style={{
                  marginBottom: 4,
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 0.35,
                  color: dlqColors.textMuted,
                }}
              >
                Current dataset
              </div>
              <Chip
                tone={datasetName ? "info" : "default"}
                size="md"
                style={{ width: "100%", justifyContent: "space-between" }}
              >
                <span
                  style={{
                    maxWidth: 160,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {displayName}
                </span>
              </Chip>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  color: dlqColors.textMuted,
                }}
              >
                Recent dataset history will appear here in a future version.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: navigation tabs */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <PillTabs
          tabs={NAV_TABS}
          activeId={activeTab}
          onChange={handleTabChange}
        />

        <Chip subtle tone="default" size="sm">
          Dashboard mode: <strong style={{ marginLeft: 4 }}>Insights</strong>
        </Chip>
      </div>
    </header>
  );
};

export default HeaderBar;
