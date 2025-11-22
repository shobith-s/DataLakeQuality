// frontend/src/components/panels/PolicyGate.tsx
import React from "react";
import type { DataQualityReport } from "../../types/report";

interface Props {
  report: DataQualityReport;
}

const PolicyGate: React.FC<Props> = ({ report }) => {
  const passed = report.policy_passed;
  const failures = report.policy_failures || [];
  const badgeColor = passed ? "#2e7d32" : "#c62828";
  const badgeText = passed ? "PASS" : "FAIL";

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
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18 }}>Policy Gate</h2>
        <span
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            border: `1px solid ${badgeColor}`,
            color: badgeColor,
            fontSize: 12,
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          {badgeText}
        </span>
      </div>

      {passed && (
        <p style={{ margin: 0, fontSize: 13, color: "#9ccc65" }}>
          Pipeline passed all configured policy checks.
        </p>
      )}

      {!passed && failures.length === 0 && (
        <p style={{ margin: 0, fontSize: 13, color: "#ffcc80" }}>
          Pipeline failed, but no specific failures were listed.
        </p>
      )}

      {!passed && failures.length > 0 && (
        <ul
          style={{
            margin: 0,
            marginTop: 4,
            paddingLeft: 18,
            fontSize: 13,
            color: "#ffab91",
          }}
        >
          {failures.map((f, idx) => (
            <li key={`${f.code}-${idx}`}>
              <strong>{f.code}</strong>: {f.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default PolicyGate;
