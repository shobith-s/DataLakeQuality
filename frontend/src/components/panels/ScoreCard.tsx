// frontend/src/components/panels/ScoreCard.tsx
import React from "react";
import type { DataQualityReport } from "../../types/report";

interface Props {
  report: DataQualityReport;
}

const ScoreCard: React.FC<Props> = ({ report }) => {
  const score =
    typeof report.overall_score === "number" ? report.overall_score : undefined;

  return (
    <section
      style={{
        border: "1px solid #333",
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        background: "#060612",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
      }}
    >
      <div>
        <h2 style={{ margin: 0, marginBottom: 4, fontSize: 18 }}>
          Data Quality Score
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: "#aaa" }}>
          Higher is better. Based on missing data, outliers, duplicates, PII,
          and drift.
        </p>
      </div>
      <div
        style={{
          minWidth: 72,
          textAlign: "center",
          borderRadius: 999,
          border: "1px solid #444",
          padding: "6px 12px",
          background: "#0b1020",
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 600 }}>
          {score !== undefined ? score.toFixed(1) : "—"}
        </div>
        <div style={{ fontSize: 11, color: "#aaa" }}>score / 100</div>
      </div>
    </section>
  );
};

export default ScoreCard;
