// frontend/src/components/panels/ScoreCard.tsx
import React from "react";
import type { DataQualityReport } from "../../types/report";
import Card from "../../ui/Card";
import Chip from "../../ui/Chip";
import Badge from "../../ui/Badge";
import StatusIcon from "../../ui/StatusIcon";
import { dlqColors } from "../../ui/theme";

interface Props {
  report: DataQualityReport;
}

const clampScore = (s: number | undefined | null): number => {
  if (s == null || Number.isNaN(s)) return 0;
  if (s < 0) return 0;
  if (s > 100) return 100;
  return s;
};

const ScoreCard: React.FC<Props> = ({ report }) => {
  const rawScore = report.overall_score ?? report.score_grade?.final_score ?? 0;
  const score = clampScore(rawScore);

  let statusLabel = "Unknown";
  let statusTone: "success" | "warning" | "danger" = "warning";

  if (score >= 90) {
    statusLabel = "Excellent";
    statusTone = "success";
  } else if (score >= 75) {
    statusLabel = "Good";
    statusTone = "success";
  } else if (score >= 60) {
    statusLabel = "Fair";
    statusTone = "warning";
  } else {
    statusLabel = "Needs Attention";
    statusTone = "danger";
  }

  // Basic penalties (fallback to ratios if breakdown not provided)
  const breakdown = report.score_breakdown || {};
  const missingPenalty =
    typeof breakdown.penalty_missing === "number"
      ? breakdown.penalty_missing
      : (report.missing_ratio || 0) * 100;
  const outlierPenalty =
    typeof breakdown.penalty_outliers === "number"
      ? breakdown.penalty_outliers
      : (report.outlier_ratio || 0) * 100;
  const duplicatePenalty =
    typeof breakdown.penalty_duplicates === "number"
      ? breakdown.penalty_duplicates
      : (report.duplicate_ratio || 0) * 100;
  const piiPenalty =
    typeof breakdown.penalty_pii === "number"
      ? breakdown.penalty_pii
      : (report.has_pii ? 5 : 0);
  const driftPenalty =
    typeof breakdown.penalty_drift === "number"
      ? breakdown.penalty_drift
      : report.has_drift
      ? 5
      : 0;

  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  const gradientId = "score-ring-gradient";

  return (
    <Card
      title="Data Quality Score"
      subtitle="Composite score from missing data, outliers, duplicates, PII, and drift"
      variant="soft"
      rightNode={
        <Badge tone={statusTone}>{statusLabel}</Badge>
      }
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        {/* Donut score visualization */}
        <div style={{ position: "relative", width: 120, height: 120 }}>
          <svg width={120} height={120}>
            <defs>
              <linearGradient
                id={gradientId}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="50%" stopColor="#4ade80" />
                <stop offset="100%" stopColor="#a3e635" />
              </linearGradient>
            </defs>

            {/* Background circle */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke="rgba(30,64,175,0.45)"
              strokeWidth="10"
              fill="none"
            />

            {/* Progress circle */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke={statusTone === "success" ? `url(#${gradientId})` : "#f97316"}
              strokeWidth="10"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
            />
          </svg>

          {/* Score text center */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              {score.toFixed(1)}
            </div>
            <div
              style={{
                fontSize: 11,
                color: dlqColors.textSecondary,
                marginTop: 2,
              }}
            >
              / 100
            </div>
          </div>
        </div>

        {/* Score metadata & breakdown */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <StatusIcon tone={statusTone} size={20} />
            <span
              style={{
                fontSize: 13,
                color: dlqColors.textSecondary,
              }}
            >
              Higher is better. Significant issues in any dimension will reduce
              this score.
            </span>
          </div>

          {/* compact breakdown row */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginTop: 4,
            }}
          >
            <Chip subtle tone="default" size="sm">
              Missing ·{" "}
              <span style={{ marginLeft: 4 }}>
                {missingPenalty.toFixed(1)} penalty
              </span>
            </Chip>
            <Chip subtle tone="default" size="sm">
              Outliers ·{" "}
              <span style={{ marginLeft: 4 }}>
                {outlierPenalty.toFixed(1)} penalty
              </span>
            </Chip>
            <Chip subtle tone="default" size="sm">
              Duplicates ·{" "}
              <span style={{ marginLeft: 4 }}>
                {duplicatePenalty.toFixed(1)} penalty
              </span>
            </Chip>
            <Chip subtle tone={report.has_pii ? "warning" : "default"} size="sm">
              PII ·{" "}
              <span style={{ marginLeft: 4 }}>
                {piiPenalty.toFixed(1)} penalty
              </span>
            </Chip>
            <Chip
              subtle
              tone={report.has_drift ? "warning" : "default"}
              size="sm"
            >
              Drift ·{" "}
              <span style={{ marginLeft: 4 }}>
                {driftPenalty.toFixed(1)} penalty
              </span>
            </Chip>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ScoreCard;
