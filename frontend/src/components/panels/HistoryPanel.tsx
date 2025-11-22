// frontend/src/components/panels/HistoryPanel.tsx
import React from "react";
import type { DataQualityReport, HistoryPoint } from "../../types/report";

interface Props {
  report: DataQualityReport;
}

const HistoryPanel: React.FC<Props> = ({ report }) => {
  const snapshot = report.history_snapshot;
  if (!snapshot) return null;

  const points = (snapshot.points || []) as HistoryPoint[];

  if (points.length === 0) {
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
        <p style={{ margin: 0, fontSize: 13, color: "#aaa" }}>
          Not enough runs yet to build a trend. Re-run the check on the same
          dataset to start seeing history.
        </p>
      </section>
    );
  }

  const scores: number[] = points.map((p) =>
    typeof p.overall_score === "number" ? p.overall_score : 0,
  );

  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const span = maxScore - minScore;
  const n = scores.length;

  const path = scores
    .map((s, i) => {
      const x = n === 1 ? 50 : (i / (n - 1)) * 100; // 0..100

      let y: number;
      if (span === 0) {
        // all scores identical → draw a flat line in the middle
        y = 20; // mid of 0..40 viewBox
      } else {
        const norm = (s - minScore) / span; // 0..1
        y = 5 + (1 - norm) * 30; // 5..35 (top-down)
      }

      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const latest = points[points.length - 1];

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

      <div style={{ marginBottom: 8, fontSize: 12, color: "#aaa" }}>
        Runs: {points.length} · Latest score:{" "}
        {latest.overall_score !== undefined
          ? latest.overall_score.toFixed(1)
          : "—"}
      </div>

      <svg
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        style={{
          width: "100%",
          height: 100,
          background: "#020208",
          borderRadius: 4,
          border: "1px solid #222",
          marginBottom: 8,
        }}
      >
        {/* reference lines */}
        <line x1="0" y1="35" x2="100" y2="35" stroke="#222" strokeWidth="0.4" />
        <line x1="0" y1="20" x2="100" y2="20" stroke="#222" strokeWidth="0.4" />
        <line x1="0" y1="5" x2="100" y2="5" stroke="#222" strokeWidth="0.4" />

        <path
          d={path}
          fill="none"
          stroke="#42a5f5"
          strokeWidth="1.2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>

      <ul
        style={{
          margin: 0,
          paddingLeft: 18,
          fontSize: 11,
          color: "#ccc",
          maxHeight: 140,
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
    </section>
  );
};

export default HistoryPanel;
