// frontend/src/components/panels/RawReportPanel.tsx
import React, { useState } from "react";
import type { DataQualityReport } from "../../types/report";
import Card from "../../ui/Card";
import Chip from "../../ui/Chip";
import { dlqColors } from "../../ui/theme";

interface Props {
  report: DataQualityReport;
}

const RawReportPanel: React.FC<Props> = ({ report }) => {
  const [expanded, setExpanded] = useState(false);

  const jsonText = JSON.stringify(report, null, 2);

  return (
    <Card
      title="Raw Report (Debug)"
      subtitle="Full JSON payload returned by the DataLakeQ backend – useful for debugging and integrations"
      variant="subtle"
      rightNode={
        <Chip
          tone="default"
          size="sm"
          subtle={!expanded}
          style={{ cursor: "pointer" }}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Hide raw JSON" : "Show raw JSON"}
        </Chip>
      }
    >
      {!expanded ? (
        <div
          style={{
            fontSize: 12,
            color: dlqColors.textSecondary,
          }}
        >
          Raw debug JSON is hidden by default to keep the dashboard clean. Click{" "}
          <strong>Show raw JSON</strong> to inspect full response from the
          backend.
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              fontSize: 11,
              color: dlqColors.textSecondary,
            }}
          >
            <span>
              JSON payload ·{" "}
              <span style={{ opacity: 0.8 }}>
                keys: {Object.keys(report || {}).length}
              </span>
            </span>
            <Chip
              subtle
              tone="info"
              size="sm"
              style={{ cursor: "pointer" }}
              onClick={() => {
                navigator.clipboard?.writeText(jsonText).catch(() => undefined);
              }}
            >
              Copy JSON
            </Chip>
          </div>

          <div
            style={{
              borderRadius: 8,
              backgroundColor: "#050816",
              border: `1px solid ${dlqColors.borderSubtle}`,
              overflow: "hidden",
            }}
          >
            <pre
              style={{
                margin: 0,
                padding: 10,
                maxHeight: 260,
                overflow: "auto",
                fontFamily:
                  "SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace",
                fontSize: 11,
                lineHeight: 1.4,
                color: "#e5e7eb",
              }}
            >
              {jsonText}
            </pre>
          </div>
        </div>
      )}
    </Card>
  );
};

export default RawReportPanel;
