// frontend/src/App.tsx
import React, { useState } from "react";
import AlertsPanel from "./components/AlertsPanel";
import ScoreCard from "./components/panels/ScoreCard";
import PolicyGate from "./components/panels/PolicyGate";
import DatasetSummaryPanel from "./components/panels/DatasetSummaryPanel";
import PIIPanel from "./components/panels/PIIPanel";
import AutofixPanel from "./components/panels/AutofixPanel";
import HistoryPanel from "./components/panels/HistoryPanel";
import RawReportPanel from "./components/panels/RawReportPanel";

import type { DataQualityReport } from "./types/report";

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
    if (!report || !report.autofix_script) return;

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
        <h1 style={{ margin: 0, fontSize: 24 }}>
          DataLakeQ – Data Quality Firewall
        </h1>
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

      {/* Main content */}
      {report && (
        <main
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1.5fr",
            gap: 16,
            alignItems: "flex-start",
          }}
        >
          {/* Left column */}
          <div>
            <ScoreCard report={report} />
            <PolicyGate report={report} />
            <DatasetSummaryPanel report={report} />
            <PIIPanel report={report} />
            <AlertsPanel alerts={report.alerts} />
          </div>

          {/* Right column */}
          <div>
            <AutofixPanel report={report} onDownload={handleDownloadAutofix} />
            <HistoryPanel report={report} />
            <RawReportPanel report={report} />
          </div>
        </main>
      )}

      {!report && !loading && (
        <p style={{ fontSize: 13, color: "#777", marginTop: 8 }}>
          Upload a CSV and run the data quality check to see score, alerts,
          policy verdict, summary, AutoFix script, and history snapshot.
        </p>
      )}
    </div>
  );
};

export default App;
