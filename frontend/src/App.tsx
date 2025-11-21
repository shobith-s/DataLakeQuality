import { useState } from "react";

type QualityReport = {
  dataset_name: string;
  quality_score: number;
  quality_label: string;
  status: string;
  summary: {
    row_count: number;
    column_count: number;
    total_missing_cells: number;
    missing_ratio: number;
    duplicate_rows: number;
    duplicate_ratio: number;
    pii_column_count: number;
    contract_violations: number;
    overall_outlier_ratio: number;
    has_drift: boolean;
  };
  basic_profile: {
    missing_by_column: Record<string, number>;
  };
  contract: any;
  pii: {
    pii_columns: { column: string; detected_types: string[] }[];
    pii_column_count: number;
    has_pii: boolean;
  };
  outliers: {
    columns: {
      column: string;
      mean: number;
      std: number | null;
      outlier_count: number;
      value_count: number;
      outlier_ratio: number;
      severity: string;
    }[];
    total_outliers: number;
    total_numeric_values: number;
    overall_outlier_ratio: number;
  };
  drift: any;
  generated_at: string;
};

function getLabelColor(label: string): string {
  switch (label) {
    case "GREEN":
      return "#16a34a";
    case "YELLOW":
      return "#eab308";
    case "RED":
      return "#dc2626";
    default:
      return "#6b7280";
  }
}

function formatPercent(v: number): string {
  return (v * 100).toFixed(1) + "%";
}

function App() {
  const [datasetName, setDatasetName] = useState("customers");
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<QualityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    setError(null);
    setReport(null);

    if (!file) {
      setError("Please select a CSV file.");
      return;
    }

    const formData = new FormData();
    formData.append("dataset_name", datasetName);
    formData.append("file", file);

    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || `Request failed with ${res.status}`);
      }

      const data = (await res.json()) as QualityReport;
      setReport(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to analyze dataset.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "2rem",
        background: "#020617",
        color: "#e5e7eb",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
        DataLakeQ – Quality Gate
      </h1>
      <p style={{ marginBottom: "1.5rem", color: "#9ca3af" }}>
        Upload a CSV, run the quality gate, and see trust score, contract issues, PII,
        outliers, and drift in one view.
      </p>

      {/* Input panel */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <label style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
            Dataset name
          </label>
          <input
            value={datasetName}
            onChange={(e) => setDatasetName(e.target.value)}
            style={{
              display: "block",
              marginTop: "0.25rem",
              padding: "0.4rem 0.6rem",
              borderRadius: "0.375rem",
              border: "1px solid #374151",
              background: "#020617",
              color: "#e5e7eb",
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
            CSV file
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={{ display: "block", marginTop: "0.25rem" }}
          />
        </div>

        <button
          onClick={handleUpload}
          disabled={loading}
          style={{
            marginTop: "1.4rem",
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "none",
            background: loading ? "#4b5563" : "#4f46e5",
            color: "white",
            fontWeight: 600,
            cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? "Analyzing..." : "Run Quality Gate"}
        </button>
      </div>

      {error && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: "0.5rem",
            background: "#7f1d1d",
            color: "#fee2e2",
          }}
        >
          {error}
        </div>
      )}

      {/* Report area */}
      {report && (
        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "2fr 3fr" }}>
          {/* Left: score + summary */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div
              style={{
                padding: "1rem",
                borderRadius: "0.75rem",
                background: "#020617",
                border: "1px solid #1f2937",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
                    Quality score
                  </div>
                  <div style={{ fontSize: "2.5rem", fontWeight: 700 }}>
                    {report.quality_score.toFixed(1)}
                  </div>
                </div>
                <div
                  style={{
                    alignSelf: "center",
                    padding: "0.3rem 0.75rem",
                    borderRadius: "999px",
                    background: getLabelColor(report.quality_label) + "22",
                    color: getLabelColor(report.quality_label),
                    fontWeight: 600,
                    fontSize: "0.875rem",
                  }}
                >
                  {report.quality_label}
                </div>
              </div>
              <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#9ca3af" }}>
                Dataset: <span style={{ color: "#e5e7eb" }}>{report.dataset_name}</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                Generated at: {new Date(report.generated_at).toLocaleString()}
              </div>
            </div>

            <div
              style={{
                padding: "1rem",
                borderRadius: "0.75rem",
                background: "#020617",
                border: "1px solid #1f2937",
              }}
            >
              <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Summary</h2>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  fontSize: "0.875rem",
                  display: "grid",
                  gap: "0.25rem",
                }}
              >
                <li>
                  Rows: <strong>{report.summary.row_count}</strong> · Columns:{" "}
                  <strong>{report.summary.column_count}</strong>
                </li>
                <li>
                  Missing cells:{" "}
                  <strong>{report.summary.total_missing_cells}</strong> (
                  {formatPercent(report.summary.missing_ratio)})
                </li>
                <li>
                  Duplicate rows: <strong>{report.summary.duplicate_rows}</strong> (
                  {formatPercent(report.summary.duplicate_ratio)})
                </li>
                <li>
                  PII columns: <strong>{report.summary.pii_column_count}</strong>
                </li>
                <li>
                  Outlier ratio:{" "}
                  <strong>{formatPercent(report.summary.overall_outlier_ratio)}</strong>
                </li>
                <li>
                  Contract violations:{" "}
                  <strong>{report.summary.contract_violations}</strong>
                </li>
                <li>
                  Drift detected:{" "}
                  <strong>{report.summary.has_drift ? "YES" : "NO"}</strong>
                </li>
              </ul>
            </div>
          </div>

          {/* Right: details panels */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Contract panel */}
            <div
              style={{
                padding: "1rem",
                borderRadius: "0.75rem",
                background: "#020617",
                border: "1px solid #1f2937",
              }}
            >
              <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Contract</h2>
              {report.contract.note && (
                <p style={{ fontSize: "0.8rem", color: "#fbbf24" }}>
                  {report.contract.note}
                </p>
              )}
              <div style={{ fontSize: "0.875rem" }}>
                <p>
                  Status:{" "}
                  <strong style={{ color: report.contract.passed ? "#16a34a" : "#f97316" }}>
                    {report.contract.passed ? "Passed" : "Issues found"}
                  </strong>
                </p>
                <p>
                  Required columns missing:{" "}
                  <strong>
                    {report.contract.required_columns.missing.length > 0
                      ? report.contract.required_columns.missing.join(", ")
                      : "None"}
                  </strong>
                </p>
                {report.contract.type_mismatches.length > 0 && (
                  <div>
                    <p>Type mismatches:</p>
                    <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
                      {report.contract.type_mismatches.map((m: any, idx: number) => (
                        <li key={idx}>
                          {m.column}: expected <code>{m.expected}</code>, actual{" "}
                          <code>{m.actual}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* PII panel */}
            <div
              style={{
                padding: "1rem",
                borderRadius: "0.75rem",
                background: "#020617",
                border: "1px solid #1f2937",
              }}
            >
              <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>PII Detection</h2>
              {report.pii.has_pii ? (
                <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.875rem" }}>
                  {report.pii.pii_columns.map((c, idx) => (
                    <li key={idx}>
                      <strong>{c.column}</strong> → {c.detected_types.join(", ")}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ fontSize: "0.875rem", color: "#9ca3af" }}>No PII detected.</p>
              )}
            </div>

            {/* Outliers panel */}
            <div
              style={{
                padding: "1rem",
                borderRadius: "0.75rem",
                background: "#020617",
                border: "1px solid #1f2937",
              }}
            >
              <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Outliers</h2>
              {report.outliers.columns.length === 0 ? (
                <p style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
                  No numeric columns or no outliers detected.
                </p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.875rem" }}>
                  {report.outliers.columns
                    .slice() // copy
                    .sort(
                      (a, b) =>
                        b.outlier_ratio - a.outlier_ratio
                    )
                    .slice(0, 5)
                    .map((col, idx) => (
                      <li key={idx}>
                        <strong>{col.column}</strong> – outliers: {col.outlier_count} (
                        {formatPercent(col.outlier_ratio)}) [{col.severity}]
                      </li>
                    ))}
                </ul>
              )}
            </div>

            {/* Drift panel */}
            <div
              style={{
                padding: "1rem",
                borderRadius: "0.75rem",
                background: "#020617",
                border: "1px solid #1f2937",
              }}
            >
              <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Drift</h2>
              {report.drift.baseline_created ? (
                <p style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
                  Baseline created for this dataset. Re-run with a newer version to see drift
                  analysis.
                </p>
              ) : report.drift.columns && report.drift.columns.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.875rem" }}>
                  {report.drift.columns
                    .filter((c: any) => c.drift)
                    .map((c: any, idx: number) => (
                      <li key={idx}>
                        <strong>{c.column}</strong> – baseline mean:{" "}
                        {c.baseline_mean?.toFixed
                          ? c.baseline_mean.toFixed(2)
                          : c.baseline_mean}{" "}
                        → current:{" "}
                        {c.current_mean?.toFixed
                          ? c.current_mean.toFixed(2)
                          : c.current_mean}{" "}
                        {c.relative_change != null &&
                          `(change: ${(c.relative_change * 100).toFixed(1)}%)`}
                      </li>
                    ))}
                  {report.drift.columns.filter((c: any) => c.drift).length === 0 && (
                    <li>No significant drift detected.</li>
                  )}
                </ul>
              ) : (
                <p style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
                  No drift information available.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Optional raw JSON for debugging */}
      {report && (
        <details style={{ marginTop: "1.5rem" }}>
          <summary style={{ cursor: "pointer", fontSize: "0.875rem" }}>
            Show raw JSON report (debug)
          </summary>
          <pre
            style={{
              marginTop: "0.5rem",
              padding: "1rem",
              borderRadius: "0.75rem",
              background: "#020617",
              border: "1px solid #1f2937",
              fontSize: "0.75rem",
              overflowX: "auto",
            }}
          >
            {JSON.stringify(report, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

export default App;
