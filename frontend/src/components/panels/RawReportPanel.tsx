// frontend/src/components/panels/RawReportPanel.tsx
import React from "react";
import type { DataQualityReport } from "../../types/report";

interface Props {
  report: DataQualityReport;
}

const RawReportPanel: React.FC<Props> = ({ report }) => {
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
      <h2 style={{ margin: 0, marginBottom: 8, fontSize: 16 }}>
        Raw Report (Debug)
      </h2>
      <pre
        style={{
          margin: 0,
          maxHeight: 260,
          overflow: "auto",
          fontSize: 11,
          background: "#020208",
          padding: 8,
          borderRadius: 4,
        }}
      >
        {JSON.stringify(report, null, 2)}
      </pre>
    </section>
  );
};

export default RawReportPanel;
