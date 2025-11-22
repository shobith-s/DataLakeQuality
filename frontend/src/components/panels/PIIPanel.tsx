// frontend/src/components/panels/PIIPanel.tsx
import React from "react";
import type { DataQualityReport } from "../../types/report";
import Card from "../../ui/Card";
import Chip from "../../ui/Chip";
import StatusIcon from "../../ui/StatusIcon";
import { dlqColors } from "../../ui/theme";

interface Props {
  report: DataQualityReport;
}

const PIIPanel: React.FC<Props> = ({ report }) => {
  const piiColumns = report.pii_columns || [];
  const count = report.pii_column_count ?? piiColumns.length ?? 0;
  const hasPII = report.has_pii || count > 0;

  const tone = hasPII ? "warning" : "success";
  const summary = hasPII
    ? `${count} column${count === 1 ? "" : "s"} flagged with potential PII.`
    : "No PII signatures detected in this dataset.";

  return (
    <Card
      title="PII Detection"
      subtitle="Heuristic pattern matching for emails, phones, addresses, and names"
      variant="subtle"
      rightNode={
        <Chip tone={tone} size="sm">
          {count} column{count === 1 ? "" : "s"} with PII
        </Chip>
      }
    >
      {!hasPII ? (
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
          <span>{summary}</span>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: dlqColors.textSecondary,
            }}
          >
            <StatusIcon tone="warning" size={20} />
            <span>{summary}</span>
          </div>

          <ul
            style={{
              listStyle: "none",
              paddingLeft: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              fontSize: 12,
            }}
          >
            {piiColumns.map((item, idx) => (
              <li
                key={`${item.column || "pii"}-${idx}`}
                style={{
                  padding: "5px 8px",
                  borderRadius: 8,
                  backgroundColor: "rgba(120,53,15,0.35)",
                  border: "1px solid rgba(251,191,36,0.55)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 500 }}>
                    {item.column}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: dlqColors.textSecondary,
                    }}
                  >
                    {(item.detected_types || []).join(", ")}
                  </span>
                </div>
                <Chip subtle tone="warning" size="sm">
                  Review or mask before export
                </Chip>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
};

export default PIIPanel;
