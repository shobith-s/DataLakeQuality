// frontend/src/components/panels/ScoreCard.tsx
import React from "react";
import type { DataQualityReport } from "../../types/report";

interface Props {
  report: DataQualityReport;
}

const ScoreCard: React.FC<Props> = ({ report }) => {
  const score =
    typeof report.overall_score === "number" ? report.overall_score : undefined;
  const grade = report.score_grade;

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
      <div style={{ flex: 1 }}>
        <h2 style={{ margin: 0, marginBottom: 4, fontSize: 18 }}>
          Data Quality Score
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: "#aaa" }}>
          Higher is better. Based on missing data, outliers, duplicates, PII,
          and drift.
        </p>

        {grade && (
          <div style={{ marginTop: 6 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "2px 8px",
                borderRadius: 999,
                border: "1px solid #444",
                fontSize: 12,
                background: "#050811",
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {grade.letter}
              </span>
              <span style={{ color: "#bbb" }}>{grade.label}</span>
            </span>

            {grade.reason && (
              <p
                style={{
                  margin: 0,
                  marginTop: 4,
                  fontSize: 12,
                  color: "#999",
                  maxWidth: 420,
                }}
              >
                {grade.reason}
              </p>
            )}
          </div>
        )}
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
