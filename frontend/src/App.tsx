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
import SchemaChangesPanel from "./components/panels/SchemaChangesPanel";
import HeaderBar, {
  type NavTabId,
} from "./components/layout/HeaderBar";

import type { DataQualityReport } from "./types/report";
import { dlqColors, dlqTypography } from "./ui/theme";

const NAV_TO_SECTION_ID: Record<NavTabId, string> = {
  profiling: "section-profiling",
  drift: "section-history",
  pii: "section-pii",
  policy: "section-policy",
  autofix: "section-autofix",
  alerts: "section-alerts",
  history: "section-history",
  schema: "section-schema",
};

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<DataQualityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NavTabId>("profiling");

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

  const handleDownloadAutofix = (script: string | undefined) => {
    if (!report || !script) return;

    const blob = new Blob([script], {
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

  const handleNavChange = (id: NavTabId) => {
    setActiveTab(id);
    const sectionId = NAV_TO_SECTION_ID[id];
    if (sectionId) {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #101420 0, #050509 55%, #020207 100%)",
        color: dlqColors.textPrimary,
        fontFamily: dlqTypography.fontFamily,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "8px 16px 32px",
        }}
      >
        {/* Header with navigation + dataset selector */}
        <HeaderBar
          activeTab={activeTab}
          onTabChange={handleNavChange}
          datasetName={report?.dataset_name}
        />

        {/* File upload + Run button */}
        <section
          style={{
            borderRadius: 10,
            padding: 12,
            marginBottom: 20,
            background: "rgba(9, 11, 22, 0.9)",
            border: "1px solid rgba(70, 80, 140, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              style={{
                fontSize: 13,
                padding: "4px",
                borderRadius: 6,
                border: "1px solid #333",
                background: "#050509",
              }}
            />
            <button
              onClick={handleAnalyze}
              disabled={!file || loading}
              style={{
                padding: "7px 16px",
                borderRadius: 999,
                border: "none",
                background: loading ? "#283046" : "#4169e1",
                color: "#fff",
                cursor: !file || loading ? "default" : "pointer",
                fontSize: 13,
                fontWeight: 500,
                boxShadow: loading
                  ? "none"
                  : "0 0 0 1px rgba(65,105,225,0.5), 0 10px 24px rgba(0,0,0,0.4)",
                transition: "background 0.15s ease",
              }}
            >
              {loading ? "Analyzing…" : "Run Data Quality Check"}
            </button>
          </div>
          <div style={{ fontSize: 12, color: dlqColors.textSecondary }}>
            {file ? (
              <>
                Selected:{" "}
                <span style={{ color: "#fff", fontWeight: 500 }}>
                  {file.name}
                </span>
              </>
            ) : (
              "Upload a CSV to start."
            )}
          </div>
        </section>

        {/* Error state */}
        {error && (
          <section
            style={{
              borderRadius: 10,
              padding: 10,
              marginBottom: 18,
              background: "#220707",
              border: "1px solid #552222",
              color: "#ffb3b3",
              fontSize: 13,
            }}
          >
            <strong>Error:</strong> {error}
          </section>
        )}

        {/* Empty state */}
        {!report && !loading && (
          <p
            style={{
              fontSize: 13,
              color: "#888",
              marginTop: 8,
            }}
          >
            Once you run a check, you’ll see score, schema changes, PII, AutoFix
            plan, alerts, and history laid out in the dashboard below.
          </p>
        )}

        {/* Main dashboard */}
        {report && (
          <main
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {/* Row 1 – core metrics: score, policy, history */}
            <section
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(260px, minmax(0, 1fr)))",
                gap: 16,
              }}
            >
              <div id="section-profiling">
                <ScoreCard report={report} />
              </div>

              <div id="section-policy">
                <PolicyGate report={report} />
              </div>

              <div id="section-history">
                <HistoryPanel report={report} />
              </div>
            </section>

            {/* Row 2 – dataset / schema / PII vs AutoFix */}
            <section
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1.6fr)",
                gap: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <DatasetSummaryPanel report={report} />
                <div id="section-schema">
                  <SchemaChangesPanel report={report} />
                </div>
                <div id="section-pii">
                  <PIIPanel report={report} />
                </div>
              </div>

              <div id="section-autofix">
                <AutofixPanel
                  report={report}
                  onDownload={handleDownloadAutofix}
                />
              </div>
            </section>

            {/* Row 3 – alerts & raw JSON */}
            <section
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1.8fr)",
                gap: 16,
                alignItems: "stretch",
              }}
            >
              <div id="section-alerts">
                <AlertsPanel alerts={report.alerts} />
              </div>
              <RawReportPanel report={report} />
            </section>
          </main>
        )}
      </div>
    </div>
  );
};

export default App;
