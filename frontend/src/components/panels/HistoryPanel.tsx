// frontend/src/components/panels/HistoryPanel.tsx
import React from "react";
import type { DataQualityReport, HistoryPoint } from "../../types/report";
import Card from "../../ui/Card";
import Chip from "../../ui/Chip";
import { dlqColors } from "../../ui/theme";

interface Props {
  report: DataQualityReport;
}

const HistoryPanel: React.FC<Props> = ({ report }) => {
  const snapshot = report.history_snapshot;
  const points: HistoryPoint[] = snapshot?.points || [];

  if (!points.length) {
    return (
      <Card
        title="History Snapshot"
        subtitle="Trend of overall data quality across recent runs"
        variant="subtle"
      >
        <div style={{ fontSize: 12, color: dlqColors.textSecondary }}>
          No history is available yet. Once you run this dataset multiple
          times, trend charts will appear here.
        </div>
      </Card>
    );
  }

  // Normalize to last N points (e.g., 20)
  const maxPoints = 20;
  const trimmed =
    points.length > maxPoints ? points.slice(points.length - maxPoints) : points;

  const scores = trimmed
    .map((p) => p.overall_score)
    .filter((v): v is number => typeof v === "number");

  const minScore = scores.length ? Math.min(...scores, 0) : 0;
  const maxScore = scores.length ? Math.max(...scores, 100) : 100;

  const width = 260;
  const height = 110;
  const paddingX = 12;
  const paddingY = 10;

  const xStep =
    trimmed.length > 1
      ? (width - paddingX * 2) / (trimmed.length - 1)
      : 0;

  const mapY = (val: number | undefined): number => {
    const v = typeof val === "number" ? val : minScore;
    if (maxScore === minScore) return height / 2;
    const ratio = (v - minScore) / (maxScore - minScore);
    // Invert because SVG y grows downward
    return paddingY + (1 - ratio) * (height - paddingY * 2);
  };

  const linePath = trimmed
    .map((p, idx) => {
      const x = paddingX + idx * xStep;
      const y = mapY(p.overall_score);
      return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const gradientId = "history-line-gradient";

  const last = trimmed[trimmed.length - 1];
  const previous = trimmed.length > 1 ? trimmed[trimmed.length - 2] : undefined;
  const lastScore = last.overall_score ?? null;
  const delta =
    lastScore != null && previous?.overall_score != null
      ? lastScore - previous.overall_score
      : null;

  return (
    <Card
      title="History Snapshot"
      subtitle="How this dataset's quality score evolved over time"
      variant="subtle"
      rightNode={
        lastScore != null && (
          <Chip tone="info" size="sm">
            Latest: {lastScore.toFixed(1)}
            {delta != null && (
              <span
                style={{
                  marginLeft: 6,
                  color: delta >= 0 ? "#22c55e" : "#f97316",
                }}
              >
                {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}
              </span>
            )}
          </Chip>
        )
      }
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {/* Chart */}
        <div
          style={{
            width: "100%",
            maxWidth: width,
            alignSelf: "center",
          }}
        >
          <svg width={width} height={height}>
            <defs>
              <linearGradient
                id={gradientId}
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* background line grid (light) */}
            <line
              x1={paddingX}
              y1={mapY(minScore)}
              x2={width - paddingX}
              y2={mapY(minScore)}
              stroke="rgba(148,163,184,0.25)"
              strokeWidth={0.5}
              strokeDasharray="2 4"
            />
            <line
              x1={paddingX}
              y1={mapY(maxScore)}
              x2={width - paddingX}
              y2={mapY(maxScore)}
              stroke="rgba(148,163,184,0.25)"
              strokeWidth={0.5}
              strokeDasharray="2 4"
            />

            {/* Chart area fill */}
            {linePath && (
              <path
                d={`${linePath} L ${
                  paddingX + (trimmed.length - 1) * xStep
                } ${height - paddingY} L ${paddingX} ${
                  height - paddingY
                } Z`}
                fill={`url(#${gradientId})`}
                opacity={0.6}
              />
            )}

            {/* Line */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#06b6d4"
                strokeWidth={2}
                strokeLinecap="round"
              />
            )}

            {/* Points */}
            {trimmed.map((p, idx) => {
              const x = paddingX + idx * xStep;
              const y = mapY(p.overall_score);
              const isLast = idx === trimmed.length - 1;
              return (
                <circle
                  key={p.timestamp + idx}
                  cx={x}
                  cy={y}
                  r={isLast ? 4 : 3}
                  fill={isLast ? "#06b6d4" : "#0ea5e9"}
                  stroke="rgba(15,23,42,0.9)"
                  strokeWidth={1}
                />
              );
            })}
          </svg>
        </div>

        {/* Last 2 runs compact info */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginTop: 2,
            fontSize: 11,
          }}
        >
          {trimmed
            .slice(-3)
            .reverse()
            .map((p, idx) => {
              const label =
                idx === 0
                  ? "Latest run"
                  : idx === 1
                  ? "Previous"
                  : "Earlier";
              const s =
                typeof p.overall_score === "number"
                  ? p.overall_score.toFixed(1)
                  : "—";
              return (
                <Chip key={p.timestamp + idx} subtle size="sm">
                  {label}: {s}
                </Chip>
              );
            })}
        </div>
      </div>
    </Card>
  );
};

export default HistoryPanel;
