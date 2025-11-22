// frontend/src/components/AlertsPanel.tsx
import React from "react";
import Card from "../ui/Card";
import Chip from "../ui/Chip";
import StatusIcon from "../ui/StatusIcon";
import { dlqColors } from "../ui/theme";

export interface AlertItem {
  level?: string;
  code?: string;
  message?: string;
}

interface AlertsPanelProps {
  alerts: AlertItem[] | undefined;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts }) => {
  const list = alerts || [];

  const hasCritical = list.some(
    (a) =>
      (a.level || "").toLowerCase() === "error" ||
      (a.level || "").toLowerCase() === "critical"
  );
  const hasWarning = list.some(
    (a) => (a.level || "").toLowerCase() === "warning"
  );

  let overallTone: "success" | "warning" | "danger" | "info" = "success";
  let summaryText = "No significant data quality alerts for this run.";

  if (hasCritical) {
    overallTone = "danger";
    summaryText = "Critical issues detected. Review before running pipelines.";
  } else if (hasWarning) {
    overallTone = "warning";
    summaryText = "Warnings detected. Some dimensions need attention.";
  } else if (list.length > 0) {
    overallTone = "info";
    summaryText = "Informational alerts present.";
  }

  const headerChip =
    list.length === 0 ? (
      <Chip tone="success" size="sm">
        All clear
      </Chip>
    ) : (
      <Chip tone={overallTone} size="sm">
        {list.length} alert{list.length === 1 ? "" : "s"}
      </Chip>
    );

  return (
    <Card
      title="Alerts"
      subtitle="Summarized signals from policy engine, PII scan, and drift detectors"
      rightNode={headerChip}
      variant="subtle"
    >
      {list.length === 0 ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: dlqColors.textSecondary,
          }}
        >
          <StatusIcon tone="success" size={20} />
          <span>{summaryText}</span>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            fontSize: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: dlqColors.textSecondary,
            }}
          >
            <StatusIcon tone={overallTone} size={20} />
            <span>{summaryText}</span>
          </div>

          <ul
            style={{
              listStyle: "none",
              paddingLeft: 0,
              margin: 4,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {list.map((a, idx) => {
              const lvl = (a.level || "").toLowerCase();
              const tone =
                lvl === "error" || lvl === "critical"
                  ? "danger"
                  : lvl === "warning"
                  ? "warning"
                  : lvl === "info"
                  ? "info"
                  : "neutral";

              return (
                <li
                  key={`${a.code || "ALERT"}-${idx}`}
                  style={{
                    padding: "6px 8px",
                    borderRadius: 8,
                    backgroundColor:
                      tone === "danger"
                        ? "rgba(127,29,29,0.30)"
                        : tone === "warning"
                        ? "rgba(120,53,15,0.30)"
                        : "rgba(15,23,42,0.70)",
                    border:
                      tone === "danger"
                        ? "1px solid rgba(248,113,113,0.65)"
                        : tone === "warning"
                        ? "1px solid rgba(251,191,36,0.65)"
                        : `1px solid ${dlqColors.borderSubtle}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 2,
                    }}
                  >
                    <StatusIcon
                      tone={
                        tone === "danger"
                          ? "danger"
                          : tone === "warning"
                          ? "warning"
                          : "info"
                      }
                      size={16}
                    />
                    <strong style={{ fontSize: 11 }}>
                      {(a.level || "INFO").toUpperCase()} ·{" "}
                      {(a.code || "ALERT").toUpperCase()}
                    </strong>
                  </div>
                  <div style={{ color: dlqColors.textSecondary }}>
                    {a.message || "No additional details provided."}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
};

export default AlertsPanel;
