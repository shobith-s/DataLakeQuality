// frontend/src/components/panels/AutofixPanel.tsx
import React from "react";
import type { DataQualityReport } from "../../types/report";

interface Props {
  report: DataQualityReport;
  onDownload: () => void;
}

const AutofixPanel: React.FC<Props> = ({ report, onDownload }) => {
  const hasScript =
    typeof report.autofix_script === "string" &&
    report.autofix_script.trim().length > 0;

  return (
    <section
      style={{
        border: "1px solid #333",
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        background: "#060612",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16 }}>AutoFix Script</h2>
        <button
          onClick={onDownload}
          disabled={!hasScript}
          style={{
            padding: "4px 10px",
            borderRadius: 6,
            border: "1px solid #555",
            background: hasScript ? "#1e88e5" : "#222",
            color: "#fff",
            cursor: hasScript ? "pointer" : "default",
            fontSize: 12,
          }}
        >
          Download .py
        </button>
      </div>

      {hasScript ? (
        <pre
          style={{
            margin: 0,
            maxHeight: 220,
            overflow: "auto",
            fontSize: 11,
            background: "#020208",
            padding: 8,
            borderRadius: 4,
          }}
        >
          {report.autofix_script}
        </pre>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: "#aaa" }}>
          No AutoFix script generated for this run (clean dataset or no
          configured fixes).
        </p>
      )}
    </section>
  );
};

export default AutofixPanel;
