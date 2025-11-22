// frontend/src/App.tsx
import React, { useState } from "react";
import AlertsPanel, { type Alert } from "./components/AlertsPanel";

interface ColumnProfile {
  name: string;
  dtype?: string;
  missing_ratio?: number;
  outlier_ratio?: number;
  pii_type?: string | null;
  drift_severity?: string | null;
  psi?: number | null;
}

interface PolicyFailure {
  code: string;
  message: string;
}

interface HistoryPoint {
  timestamp: string;
  overall_score?: number;
  missing_ratio?: number;
  outlier_ratio?: number;
}

interface HistorySnapshot {
  points: HistoryPoint[];
  [key: string]: unknown;
}

interface DataQualityReport {
  dataset_name: string;
  run_id: string;
  timestamp: string;
  overall_score?: number;
  missing_ratio: number;
  outlier_ratio: number;
  has_drift?: boolean;
  psi_severity?: string | null;
  columns: ColumnProfile[];
  policy_passed: boolean;
  policy_failures: PolicyFailure[];
  alerts: Alert[];
  autofix_plan?: unknown;
  autofix_script?: string;
  history_snapshot?: HistorySnapshot;
  // Extra backend fields stay flexible:
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

      // Adjust this URL if your backend is on a different origin or path.
      const res = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Backend error (${res.status}): ${text || res.statusText}`,
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

  const handleDownloadAutofix = () => {
    if (!report || !report.autofix_script) {
      return;
    }

    const blob = new Blob([report.autofix_script], {
      type: "text/x-python;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    const safeDataset = report.dataset_name || "dataset";
    const safeRunId = report.run_id || "run";
    a.href = url;
    a.download = `autofix_${safeDataset}_${safeRunId}.py`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderScoreCard = () => {
    if (!report) return null;

    const score =
      typeof report.overall_score === "number"
        ? report.overall_score
        : undefined;

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
        <div>
          <h2 style={{ margin: 0, marginBottom: 4, fontSize: 18 }}>
            Data Quality Score
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: "#aaa" }}>
            Higher is better. Based on missing data, outliers, PII, and drift.
          </p>
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

  const renderPolicyCard = () => {
    if (!report) return null;

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

  const renderAutofixPanel = () => {
    if (!report) return null;

    const hasScript = typeof report.autofix_script === "string";

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
            onClick={handleDownloadAutofix}
            disabled={!hasScript}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid #555",
              background: hasScript ? "#1e88e5" : "#222",
              color: "#fff",
              cursor: hasScript ? "pointer" : "default",
              fontSize: 12,
            }}
          >
            Download .py
          </button>
        </div>

        {hasScript ? (
          <pre
            style={{
              margin: 0,
              maxHeight: 220,
              overflow: "auto",
              fontSize: 11,
              background: "#020208",
              padding: 8,
              borderRadius: 4,
            }}
          >
            {report.autofix_script}
          </pre>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: "#aaa" }}>
            No AutoFix script generated for this run.
          </p>
        )}
      </section>
    );
  };

  const renderHistoryPanel = () => {
    if (!report || !report.history_snapshot) return null;

    const snapshot = report.history_snapshot;
    const points = (snapshot.points || []) as HistoryPoint[];

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
        {points.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: "#aaa" }}>
            Not enough runs yet to build a trend.
          </p>
        ) : (
          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              fontSize: 12,
              color: "#ccc",
              maxHeight: 220,
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
        )}
      </section>
    );
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
          Profiling · Drift · PII · Policy Engine · AutoFix · Alerts · History
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
          background: "#060612",
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

      {/* Main content when we have a report */}
      {report && (
        <main
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1.5fr",
            gap: 16,
            alignItems: "flex-start",
          }}
        >
          {/* Left column – score, policy, alerts */}
          <div>
            {renderScoreCard()}
            {renderPolicyCard()}
            <AlertsPanel alerts={report.alerts} />
          </div>

          {/* Right column – autofix, history, raw JSON */}
          <div>
            {renderAutofixPanel()}
            {renderHistoryPanel()}

            {/* Raw JSON debug viewer */}
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
                  maxHeight: 260,
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

      {/* Empty state */}
      {!report && !loading && (
        <p style={{ fontSize: 13, color: "#777", marginTop: 8 }}>
          Upload a CSV and run the data quality check to see score, alerts,
          policy verdict, AutoFix script, and history snapshot.
        </p>
      )}
    </div>
  );
};

export default App;
