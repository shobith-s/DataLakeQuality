// frontend/src/components/panels/PIIPanel.tsx
import React from "react";
import type { DataQualityReport, PiiColumn } from "../../types/report";

interface Props {
  report: DataQualityReport;
}

const PIIPanel: React.FC<Props> = ({ report }) => {
  const piiCols = (report.pii_columns ?? []) as PiiColumn[];
  const explicitCount = report.pii_column_count ?? piiCols.length;
  const hasPii = report.has_pii ?? explicitCount > 0;

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
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16 }}>PII Detection</h2>
        <span
          style={{
            padding: "3px 9px",
            borderRadius: 999,
            border: "1px solid #555",
            fontSize: 11,
            color: hasPii ? "#ffb74d" : "#81c784",
          }}
        >
          {hasPii
            ? `${explicitCount || piiCols.length} column(s) with PII`
            : "No PII detected"}
        </span>
      </div>

      {!hasPii && (
        <p style={{ margin: 0, fontSize: 13, color: "#aaa" }}>
          No PII-like patterns were detected in this dataset.
        </p>
      )}

      {hasPii && piiCols.length === 0 && (
        <p style={{ margin: 0, fontSize: 13, color: "#ffcc80" }}>
          PII flag is set, but no detailed PII columns were listed.
        </p>
      )}

      {hasPii && piiCols.length > 0 && (
        <ul
          style={{
            margin: 0,
            paddingLeft: 18,
            fontSize: 13,
            color: "#eee",
          }}
        >
          {piiCols.map((col, idx) => (
            <li key={`${col.column}-${idx}`}>
              <strong>{col.column}</strong>{" "}
              <span style={{ color: "#aaa" }}>
                ({col.detected_types.join(", ")})
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default PIIPanel;
