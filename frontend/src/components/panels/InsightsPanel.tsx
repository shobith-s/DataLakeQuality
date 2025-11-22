import React from "react";
import type { DataQualityReport, InsightItem } from "../../types/report";
import Card from "../../ui/Card";
import Chip from "../../ui/Chip";
import StatusIcon from "../../ui/StatusIcon";
import { dlqColors } from "../../ui/theme";

interface Props {
  report: DataQualityReport;
}

const severityTone = (severity: string) => {
  const s = severity.toLowerCase();
  if (s === "critical") return "danger";
  if (s === "warning") return "warning";
  if (s === "info") return "info";
  return "default";
};

const InsightsPanel: React.FC<Props> = ({ report }) => {
  const insights: InsightItem[] = report.insights || [];

  const headline =
    insights.length === 0
      ? "No major issues detected. Dataset looks healthy."
      : "Highlights from this run based on score, drift, PII, and schema checks.";

  return (
    <Card
      title="AI-style Insights"
      subtitle={headline}
      variant="subtle"
      rightNode={
        <Chip tone="default" size="sm" subtle>
          {insights.length === 0 ? "All clear" : `${insights.length} insight(s)`}
        </Chip>
      }
    >
      {insights.length === 0 ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: dlqColors.textSecondary,
          }}
        >
          <StatusIcon tone="success" size={18} />
          <span>
            DataLakeQ did not find any dimension severe enough to highlight for
            this run. Keep monitoring history to catch regressions early.
          </span>
        </div>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            fontSize: 12,
          }}
        >
          {insights.slice(0, 4).map((item, idx) => (
            <li
              key={`${item.category}-${idx}`}
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
              }}
            >
              <StatusIcon tone={severityTone(item.severity)} size={18} />
              <div>
                <div
                  style={{
                    marginBottom: 2,
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                    color: dlqColors.textSecondary,
                  }}
                >
                  {item.category}
                </div>
                <div>{item.message}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

export default InsightsPanel;
