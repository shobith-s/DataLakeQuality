// frontend/src/components/panels/AutofixPanel.tsx
import React from "react";
import type { DataQualityReport } from "../../types/report";
import Card from "../../ui/Card";
import Chip from "../../ui/Chip";
import Badge from "../../ui/Badge";
import { dlqColors } from "../../ui/theme";

interface Props {
  report: DataQualityReport;
  onDownload: (script: string | undefined) => void;
}

const AutofixPanel: React.FC<Props> = ({ report, onDownload }) => {
  const plan = Array.isArray(report.autofix_plan) ? report.autofix_plan : [];
  const script = report.autofix_script || "";

  const hasScript = script.trim().length > 0;
  const hasPlan = plan.length > 0;

  const handleDownloadClick = () => {
    if (!hasScript) return;
    onDownload(script);
  };

  return (
    <Card
      title="AutoFix Script"
      subtitle="Automatically generated cleaning pipeline you can run as a standalone Python script"
      variant="soft"
      rightNode={
        <button
          type="button"
          onClick={handleDownloadClick}
          disabled={!hasScript}
          style={{
            padding: "6px 12px",
            borderRadius: 999,
            border: "none",
            backgroundColor: hasScript ? "#4f46e5" : "#2d3248",
            color: "#fff",
            cursor: hasScript ? "pointer" : "default",
            fontSize: 12,
            fontWeight: 500,
            boxShadow: hasScript
              ? "0 0 0 1px rgba(129,140,248,0.70), 0 14px 30px rgba(0,0,0,0.75)"
              : "none",
          }}
        >
          Download .py
        </button>
      }
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* High-level summary */}
        <div
          style={{
            fontSize: 12,
            color: dlqColors.textSecondary,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
          }}
        >
          {hasPlan ? (
            <>
              <Badge tone="info">Generated</Badge>
              <span>
                This script was generated from current profiling results. You
                can edit steps or disable ones you don't need.
              </span>
            </>
          ) : (
            <>
              <Badge tone="neutral">No changes</Badge>
              <span>
                No AutoFix steps were suggested for this run (either the dataset
                is very clean, or rules are not configured).
              </span>
            </>
          )}
        </div>

        {/* Plan list if available */}
        {hasPlan && (
          <div
            style={{
              marginTop: 4,
              padding: "6px 8px",
              borderRadius: 8,
              backgroundColor: "rgba(15,23,42,0.85)",
              border: `1px dashed ${dlqColors.borderSubtle}`,
              fontSize: 12,
            }}
          >
            <div
              style={{
                marginBottom: 4,
                color: dlqColors.textSecondary,
              }}
            >
              Planned steps
            </div>
            <ul
              style={{
                margin: 0,
                paddingLeft: 16,
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              {plan.map((step: any, idx: number) => (
                <li key={idx}>
                  {typeof step === "string"
                    ? step
                    : step.description || JSON.stringify(step)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Script preview */}
        <div
          style={{
            marginTop: 6,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              alignItems: "center",
              fontSize: 11,
              color: dlqColors.textSecondary,
            }}
          >
            <span>Preview (Python script)</span>
            {hasScript ? (
              <span
                role="button"
                tabIndex={0}
                onClick={() => {
                  navigator.clipboard?.writeText(script).catch(() => undefined);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    navigator.clipboard?.writeText(script).catch(() => undefined);
                  }
                }}
                style={{ display: "inline-flex", cursor: "pointer" }}
              >
                <Chip subtle tone="info" size="sm">
                  Copy to clipboard
                </Chip>
              </span>
            ) : (
              <Chip subtle tone="default" size="sm">
                No script generated
              </Chip>
            )}
          </div>

          <div
            style={{
              borderRadius: 8,
              backgroundColor: "#050816",
              border: `1px solid ${dlqColors.borderSubtle}`,
              overflow: "hidden",
            }}
          >
            <textarea
              readOnly
              value={
                hasScript
                  ? script
                  : "# No AutoFix script generated for this run.\n# Configure rules or introduce data issues to see AutoFix suggestions."
              }
              style={{
                width: "100%",
                minHeight: 220,
                maxHeight: 280,
                padding: 10,
                border: "none",
                resize: "vertical",
                fontFamily: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: 12,
                lineHeight: 1.4,
                backgroundColor: "transparent",
                color: "#e5e7eb",
              }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AutofixPanel;
