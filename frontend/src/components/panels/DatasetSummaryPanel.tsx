// frontend/src/components/panels/DatasetSummaryPanel.tsx
import React from "react";
import type { DataQualityReport } from "../../types/report";

interface Props {
  report: DataQualityReport;
}

const DatasetSummaryPanel: React.FC<Props> = ({ report }) => {
  const s = report.summary;
  if (!s) return null;

  const missingPct = (s.missing_ratio ?? 0) * 100;
  const dupPct = (s.duplicate_ratio ?? 0) * 100;

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
        Dataset Summary
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 8,
          fontSize: 13,
        }}
      >
        <div>
          <div style={{ color: "#888", marginBottom: 2 }}>Rows</div>
          <div style={{ fontWeight: 600 }}>{s.row_count}</div>
        </div>
        <div>
          <div style={{ color: "#888", marginBottom: 2 }}>Columns</div>
          <div style={{ fontWeight: 600 }}>{s.column_count}</div>
        </div>
        <div>
          <div style={{ color: "#888", marginBottom: 2 }}>Missing cells</div>
          <div style={{ fontWeight: 600 }}>{s.total_missing_cells}</div>
        </div>
        <div>
          <div style={{ color: "#888", marginBottom: 2 }}>Missing ratio</div>
          <div style={{ fontWeight: 600 }}>{missingPct.toFixed(1)}%</div>
        </div>
        <div>
          <div style={{ color: "#888", marginBottom: 2 }}>Duplicate rows</div>
          <div style={{ fontWeight: 600 }}>{s.duplicate_rows ?? 0}</div>
        </div>
        <div>
          <div style={{ color: "#888", marginBottom: 2 }}>Duplicate ratio</div>
          <div style={{ fontWeight: 600 }}>{dupPct.toFixed(1)}%</div>
        </div>
      </div>
    </section>
  );
};

export default DatasetSummaryPanel;
