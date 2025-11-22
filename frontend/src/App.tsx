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
import InsightsPanel from "./components/panels/InsightsPanel";
import ContractPanel from "./components/panels/ContractPanel";
import HeaderBar, { type NavTabId } from "./components/layout/HeaderBar";

import type { DataQualityReport } from "./types/report";
import { dlqColors, dlqTypography } from "./ui/theme";
import FileDropZone from "./ui/FileDropZone";

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

  const handleDownloadAutofixScript = (script: string | undefined) => {
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

  const handleDownloadCleanCsv = async () => {
    if (!file) {
      alert("Upload a CSV and run a check first.");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("options_json", JSON.stringify({}));

      const res = await fetch("http://localhost:8000/autofix/clean", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `AutoFix clean error (${res.status}): ${text || res.statusText}`
        );
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const baseName = file.name.replace(/\.[^.]+$/, "");
      a.href = url;
      a.download = `autofixed_${baseName}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to download cleaned CSV.");
    }
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

        {/* Drag & drop uploader + run button */}
        <FileDropZone
          file={file}
          onFileSelected={(f) => {
            setFile(f);
            setReport(null);
            setError(null);
          }}
          onRun={handleAnalyze}
          loading={loading}
        />

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

        {/* Empty state hint */}
        {!report && !loading && (
          <p
            style={{
              fontSize: 13,
              color: "#888",
              marginTop: 4,
              marginBottom: 8,
            }}
          >
            Once you run a check, you’ll see score, AI insights, schema changes,
            PII, AutoFix plan, alerts, and history in the dashboard below.
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
            {/* Row 1 – Score + Insights (left) / Policy (right) */}
            <section
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1.2fr",
                gap: 16,
                alignItems: "stretch",
              }}
            >
              <div
                id="section-profiling"
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                <ScoreCard report={report} />
                <InsightsPanel report={report} />
              </div>

              <div id="section-policy">
                <PolicyGate report={report} />
              </div>
            </section>

            {/* Row 1.5 – History full width */}
            <section id="section-history">
              <HistoryPanel report={report} />
            </section>

            {/* Row 2 – Left: Dataset + Schema + Contract, Right: PII */}
            <section
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1.2fr",
                gap: 16,
                alignItems: "flex-start",
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
                <ContractPanel report={report} />
              </div>

              <div id="section-pii">
                <PIIPanel report={report} />
              </div>
            </section>

            {/* Row 3 – Left: AutoFix, Right: Alerts + Raw JSON */}
            <section
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1.2fr",
                gap: 16,
                alignItems: "flex-start",
              }}
            >
              <div id="section-autofix">
                <AutofixPanel
                  report={report}
                  onDownload={handleDownloadAutofixScript}
                  onDownloadCleanCsv={handleDownloadCleanCsv}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div id="section-alerts">
                  <AlertsPanel alerts={report.alerts} />
                </div>
                <RawReportPanel report={report} />
              </div>
            </section>
          </main>
        )}
      </div>
    </div>
  );
};

export default App;
