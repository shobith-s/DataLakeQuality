// frontend/src/components/panels/HistoryPanel.tsx
import React from "react";
import type { DataQualityReport, HistoryPoint } from "../../types/report";

interface Props {
  report: DataQualityReport;
}

const HistoryPanel: React.FC<Props> = ({ report }) => {
  if (!report.history_snapshot) return null;

  const points = (report.history_snapshot.points || []) as HistoryPoint[];

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
        History Snapshot
      </h2>
      {points.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: "#aaa" }}>
          Not enough runs yet to build a trend.
        </p>
      ) : (
        <ul
          style={{
            margin: 0,
            paddingLeft: 18,
            fontSize: 12,
            color: "#ccc",
            maxHeight: 220,
            overflow: "auto",
          }}
        >
          {points.map((pt, idx) => (
            <li key={idx}>
              <strong>{pt.timestamp}</strong> – score:{" "}
              {pt.overall_score !== undefined
                ? pt.overall_score.toFixed(1)
                : "—"}
              , missing:{" "}
              {pt.missing_ratio !== undefined
                ? (pt.missing_ratio * 100).toFixed(1) + "%"
                : "—"}
              , outliers:{" "}
              {pt.outlier_ratio !== undefined
                ? (pt.outlier_ratio * 100).toFixed(1) + "%"
                : "—"}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default HistoryPanel;
