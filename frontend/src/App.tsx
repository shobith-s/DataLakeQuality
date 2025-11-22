// frontend/src/App.tsx
import React, { useState } from "react";
import AlertsPanel, { type Alert } from "./components/AlertsPanel";

interface ColumnProfile {
  name: string;
  dtype: string;
  missing_ratio: number;
  outlier_ratio: number;
  pii_type?: string | null;
  drift_severity?: string | null;
  psi?: number | null;
}

interface PolicyFailure {
  code: string;
  message: string;
}

interface DataQualityReport {
  dataset_name: string;
  run_id: string;
  overall_score: number;
  missing_ratio: number;
  outlier_ratio: number;
  has_drift: boolean;
  psi_severity?: string | null;
  columns: ColumnProfile[];
  policy_passed: boolean;
  policy_failures: PolicyFailure[];
  alerts: Alert[];
  // Keep extra fields flexible so we don't break your existing backend
  [key: string]: unknown;
}

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<DataQualityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setReport(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Adjust this endpoint to match your actual FastAPI route.
      const res = await fetch("/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Backend error (${res.status}): ${text || res.statusText}`
        );
      }

      const data = (await res.json()) as DataQualityReport;
      setReport(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unknown error during analysis.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050509",
        color: "#f5f5f5",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        padding: 16,
      }}
    >
      {/* Header */}
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>DataLakeQ – Data Quality Firewall</h1>
        <p style={{ margin: 0, fontSize: 14, color: "#aaa" }}>
          Profiling · Drift · PII · Policy Engine · AutoFix · Alerts
        </p>
      </header>

      {/* Upload + Actions */}
      <section
        style={{
          border: "1px solid #333",
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          style={{ fontSize: 14 }}
        />
        <button
          onClick={handleAnalyze}
          disabled={!file || loading}
          style={{
            padding: "6px 14px",
            borderRadius: 6,
            border: "1px solid #555",
            background: loading ? "#222" : "#1e88e5",
            color: "#fff",
            cursor: loading ? "default" : "pointer",
            fontSize: 14,
          }}
        >
          {loading ? "Analyzing..." : "Run Data Quality Check"}
        </button>
        {file && (
          <span style={{ fontSize: 12, color: "#ccc" }}>
            Selected: {file.name}
          </span>
        )}
      </section>

      {/* Error state */}
      {error && (
        <section
          style={{
            border: "1px solid #552222",
            background: "#220707",
            color: "#ffb3b3",
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <strong>Error:</strong> {error}
        </section>
      )}

      {/* Main Content */}
      {report && (
        <main
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1.5fr",
            gap: 16,
            alignItems: "flex-start",
          }}
        >
          {/* Left column – core summary + alerts */}
          <div>
            {/* Alerts Panel */}
            <AlertsPanel alerts={report.alerts} />

            {/* TODO: Add your existing summary components here */}
            {/* Example: ScorePanel, PolicyPanel, DriftPanel, etc. */}
            {/* <ScorePanel report={report} /> */}
            {/* <PolicyPanel policy_passed={report.policy_passed} failures={report.policy_failures} /> */}
          </div>

          {/* Right column – history, autofix, raw JSON, etc. */}
          <div>
            {/* TODO: Hook your existing panels here */}
            {/* <HistoryPanel history={report.history_snapshot} /> */}
            {/* <AutoFixPanel autofix={report.autofix_plan} /> */}

            {/* Temporary raw JSON viewer for debugging */}
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
                Raw Report (Debug)
              </h2>
              <pre
                style={{
                  margin: 0,
                  maxHeight: 300,
                  overflow: "auto",
                  fontSize: 11,
                  background: "#020208",
                  padding: 8,
                  borderRadius: 4,
                }}
              >
                {JSON.stringify(report, null, 2)}
              </pre>
            </section>
          </div>
        </main>
      )}

      {!report && !loading && (
        <p style={{ fontSize: 13, color: "#777", marginTop: 8 }}>
          Upload a CSV and run the data quality check to see alerts, policy
          status, and AutoFix suggestions.
        </p>
      )}
    </div>
  );
};

export default App;
