// frontend/src/components/panels/AutofixPanel.tsx
import React, { useEffect, useMemo, useState } from "react";
import type { AutofixPlan, DataQualityReport } from "../../types/report";

interface Props {
  report: DataQualityReport;
  onDownload: (script: string | undefined) => void;
}

const AutofixPanel: React.FC<Props> = ({ report, onDownload }) => {
  const plan: AutofixPlan | null | undefined = report.autofix_plan;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [customScript, setCustomScript] = useState<string | undefined>(
    report.autofix_script ?? undefined,
  );

  // Initialize selected steps whenever plan changes
  useEffect(() => {
    if (!plan || !plan.steps) {
      setSelectedIds(new Set());
      setCustomScript(report.autofix_script ?? undefined);
      return;
    }
    const initial = new Set<string>();
    for (const step of plan.steps) {
      if (step.enabled) {
        initial.add(step.id);
      }
    }
    setSelectedIds(initial);
  }, [plan, report.autofix_script]);

  const currentScript = useMemo(() => {
    if (!plan || !plan.steps || plan.steps.length === 0) {
      return report.autofix_script ?? "";
    }
    const header = plan.header || "";
    const footer = plan.footer || "";
    const selectedSteps = plan.steps.filter((s) => selectedIds.has(s.id));
    const body = selectedSteps.map((s) => s.code || "").join("\n\n");
    return [header.trimEnd(), body.trim(), footer.trimStart()].join("\n\n");
  }, [plan, selectedIds, report.autofix_script]);

  useEffect(() => {
    setCustomScript(currentScript);
  }, [currentScript]);

  const toggleStep = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const disabled = !plan || !plan.steps || plan.steps.length === 0;

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
        <h2 style={{ margin: 0, fontSize: 16 }}>AutoFix Script</h2>

        <button
          onClick={() => onDownload(customScript)}
          disabled={!customScript}
          style={{
            padding: "4px 10px",
            borderRadius: 6,
            border: "1px solid #555",
            background: customScript ? "#1e88e5" : "#222",
            color: "#fff",
            cursor: customScript ? "pointer" : "default",
            fontSize: 12,
          }}
        >
          Download .py
        </button>
      </div>

      {!plan || !plan.steps || plan.steps.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: "#aaa" }}>
          No AutoFix script generated for this run (clean dataset or engine
          disabled).
        </p>
      ) : (
        <>
          <p style={{ marginTop: 0, fontSize: 13, color: "#aaa" }}>
            Select which automatic cleaning steps to include. The Python script
            below updates live based on your choices.
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginBottom: 8,
              maxHeight: 160,
              overflow: "auto",
              borderRadius: 6,
              border: "1px solid #222",
              padding: 8,
              background: "#05050d",
            }}
          >
            {plan.steps.map((step) => (
              <label
                key={step.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 6,
                  fontSize: 12,
                  opacity: disabled ? 0.7 : 1,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(step.id)}
                  onChange={() => toggleStep(step.id)}
                  disabled={disabled}
                  style={{ marginTop: 2 }}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {step.label}{" "}
                    <span style={{ color: "#888", fontWeight: 400 }}>
                      ({step.category})
                    </span>
                  </div>
                  {step.description && (
                    <div style={{ color: "#aaa" }}>{step.description}</div>
                  )}
                </div>
              </label>
            ))}
          </div>

          <div
            style={{
              fontSize: 11,
              color: "#ddd",
              borderRadius: 6,
              border: "1px solid #222",
              background: "#020208",
              padding: 8,
              maxHeight: 260,
              overflow: "auto",
              whiteSpace: "pre",
              fontFamily: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
            }}
          >
            {customScript || "# No AutoFix script available."}
          </div>
        </>
      )}
    </section>
  );
};

export default AutofixPanel;
