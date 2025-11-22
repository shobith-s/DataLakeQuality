// frontend/src/components/panels/PolicyGate.tsx
import React from "react";
import type { DataQualityReport } from "../../types/report";
import Card from "../../ui/Card";
import Badge from "../../ui/Badge";
import Chip from "../../ui/Chip";
import StatusIcon from "../../ui/StatusIcon";
import { dlqColors } from "../../ui/theme";

interface Props {
  report: DataQualityReport;
}

const PolicyGate: React.FC<Props> = ({ report }) => {
  const passed = report.policy_passed;
  const failures = report.policy_failures || [];

  const tone = passed ? "success" : "danger";
  const title = passed ? "Pipeline Gate: PASS" : "Pipeline Gate: FAIL";

  return (
    <Card
      title="Policy Engine"
      subtitle="Evaluates dataset against YAML-defined quality gates before pipeline execution"
      rightNode={
        <Badge tone={passed ? "success" : "danger"}>
          {passed ? "PASS" : "FAIL"}
        </Badge>
      }
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <StatusIcon tone={tone} size={22} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{title}</div>
            <div
              style={{
                fontSize: 12,
                color: dlqColors.textSecondary,
              }}
            >
              {passed
                ? "All configured thresholds were satisfied for this run."
                : "At least one policy rule was violated. Review failures before continuing downstream."}
            </div>
          </div>
        </div>

        {/* Compact summary chip */}
        <div>
          {passed ? (
            <Chip tone="success" size="md">
              No policy violations detected in this run.
            </Chip>
          ) : (
            <Chip tone="danger" size="md">
              {failures.length} policy violation
              {failures.length === 1 ? "" : "s"} detected.
            </Chip>
          )}
        </div>

        {/* Only show details if failed */}
        {!passed && failures.length > 0 && (
          <div
            style={{
              marginTop: 4,
              paddingTop: 6,
              borderTop: `1px dashed ${dlqColors.borderSubtle}`,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: dlqColors.textSecondary,
                marginBottom: 4,
              }}
            >
              Failed rules
            </div>
            <ul
              style={{
                listStyle: "none",
                paddingLeft: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                fontSize: 12,
              }}
            >
              {failures.map((f, idx) => (
                <li
                  key={`${f.code || "FAIL"}-${idx}`}
                  style={{
                    padding: "4px 6px",
                    borderRadius: 6,
                    backgroundColor: "rgba(127, 29, 29, 0.25)",
                    border: `1px solid rgba(248,113,113,0.30)`,
                  }}
                >
                  <div style={{ fontWeight: 500 }}>
                    {f.code || "RULE_VIOLATION"}
                  </div>
                  <div style={{ color: dlqColors.textSecondary }}>
                    {f.message ||
                      "This rule was violated for the current dataset run."}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
};

export default PolicyGate;
