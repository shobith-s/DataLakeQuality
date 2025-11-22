import React from "react";
import type { DataQualityReport } from "../../types/report";
import Card from "../../ui/Card";
import Chip from "../../ui/Chip";
import { dlqColors } from "../../ui/theme";

interface Props {
  report: DataQualityReport;
}

const ContractPanel: React.FC<Props> = ({ report }) => {
  const yaml = report.contract_yaml || "";
  const hasContract = yaml.trim().length > 0;

  const handleDownload = () => {
    if (!hasContract) return;
    const blob = new Blob([yaml], { type: "text/yaml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = report.dataset_name || "dataset";
    a.href = url;
    a.download = `${safeName}_contract.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card
      title="Data Contract (Preview)"
      subtitle="Auto-generated YAML contract inferred from the dataset's schema, nullability, and PII flags."
      variant="subtle"
      rightNode={
        <button
          type="button"
          onClick={handleDownload}
          disabled={!hasContract}
          style={{
            padding: "6px 12px",
            borderRadius: 999,
            border: "none",
            backgroundColor: hasContract ? "#4f46e5" : "#2d3248",
            color: "#fff",
            cursor: hasContract ? "pointer" : "default",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          Download .yaml
        </button>
      }
    >
      {!hasContract ? (
        <div
          style={{
            fontSize: 12,
            color: dlqColors.textSecondary,
          }}
        >
          Contract text is not available for this run.
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
              fontSize: 11,
              color: dlqColors.textSecondary,
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              alignItems: "center",
            }}
          >
            <span>Inferred data contract (YAML)</span>
            <Chip
              subtle
              tone="info"
              size="sm"
              style={{ cursor: "pointer" }}
              onClick={() => {
                navigator.clipboard?.writeText(yaml).catch(() => undefined);
              }}
            >
              Copy YAML
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
                maxHeight: 220,
                overflow: "auto",
                fontFamily:
                  "SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace",
                fontSize: 11,
                lineHeight: 1.4,
                color: "#e5e7eb",
              }}
            >
              {yaml}
            </pre>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ContractPanel;

