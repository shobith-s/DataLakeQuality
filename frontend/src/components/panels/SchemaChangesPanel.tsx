// frontend/src/components/panels/SchemaChangesPanel.tsx
import React from "react";
import type { DataQualityReport, SchemaChanges } from "../../types/report";

interface Props {
  report: DataQualityReport;
}

const SchemaChangesPanel: React.FC<Props> = ({ report }) => {
  const sc: SchemaChanges | undefined = report.schema_changes;

  if (!sc) return null;

  const { status, added_columns, removed_columns, type_changes, pii_changes, is_breaking } = sc;

  const badgeColor = is_breaking
    ? "#e53935"
    : status === "changed"
    ? "#ffb300"
    : "#78909c";

  const badgeText =
    status === "baseline_created"
      ? "BASELINE"
      : status === "no_change"
      ? "NO CHANGE"
      : "CHANGED";

  const hasAnyChanges =
    (added_columns && added_columns.length > 0) ||
    (removed_columns && removed_columns.length > 0) ||
    (type_changes && type_changes.length > 0) ||
    (pii_changes && pii_changes.length > 0);

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
        <h2 style={{ margin: 0, fontSize: 16 }}>Schema Changes</h2>
        <span
          style={{
            padding: "3px 9px",
            borderRadius: 999,
            border: `1px solid ${badgeColor}`,
            color: badgeColor,
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {badgeText}
        </span>
      </div>

      {status === "baseline_created" && (
        <p style={{ margin: 0, fontSize: 13, color: "#aaa" }}>
          First run for this dataset. Schema baseline created from this run.
        </p>
      )}

      {status === "no_change" && (
        <p style={{ margin: 0, fontSize: 13, color: "#aaa" }}>
          No schema changes detected compared to the baseline.
        </p>
      )}

      {status === "changed" && (
        <>
          {!hasAnyChanges && (
            <p style={{ margin: 0, fontSize: 13, color: "#aaa" }}>
              Schema marked as changed but no details were provided.
            </p>
          )}

          {hasAnyChanges && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 10,
                fontSize: 12,
              }}
            >
              {added_columns && added_columns.length > 0 && (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    Added columns
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {added_columns.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {removed_columns && removed_columns.length > 0 && (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    Removed columns
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {removed_columns.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {type_changes && type_changes.length > 0 && (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    Type changes
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {type_changes.map((t, idx) => (
                      <li key={`${t.column}-${idx}`}>
                        <strong>{t.column}</strong>:{" "}
                        {t.before || "unknown"} → {t.after || "unknown"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {pii_changes && pii_changes.length > 0 && (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    PII changes
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {pii_changes.map((p, idx) => {
                      const beforeTypes = (p.before.pii_types || []).join(", ") || "none";
                      const afterTypes = (p.after.pii_types || []).join(", ") || "none";
                      return (
                        <li key={`${p.column}-${idx}`}>
                          <strong>{p.column}</strong>:{" "}
                          {p.before.has_pii ? "PII" : "non-PII"} ({beforeTypes}) →{" "}
                          {p.after.has_pii ? "PII" : "non-PII"} ({afterTypes})
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          {is_breaking && (
            <p
              style={{
                margin: 0,
                marginTop: 8,
                fontSize: 12,
                color: "#ef9a9a",
              }}
            >
              Marked as <strong>breaking</strong> because of removed columns, type
              changes, or new PII columns.
            </p>
          )}
        </>
      )}
    </section>
  );
};

export default SchemaChangesPanel;
