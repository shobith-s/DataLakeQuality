// frontend/src/ui/FileDropZone.tsx
import React, { useRef, useState } from "react";
import { dlqColors, dlqRadii, dlqSpace } from "./theme";
import Chip from "./Chip";

export interface FileDropZoneProps {
  file: File | null;
  onFileSelected: (file: File | null) => void;
  onRun: () => void;
  loading?: boolean;
}

const formatBytes = (bytes: number): string => {
  if (!bytes) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${sizes[i]}`;
};

const FileDropZone: React.FC<FileDropZoneProps> = ({
  file,
  onFileSelected,
  onRun,
  loading = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleBrowseClick = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    onFileSelected(f);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const f = e.dataTransfer.files[0];
      onFileSelected(f);
      e.dataTransfer.clearData();
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const canRun = !!file && !loading;

  return (
    <section
      style={{
        borderRadius: 12,
        padding: dlqSpace.lg,
        marginBottom: 20,
        background: "rgba(7, 10, 24, 0.95)",
        border: isDragging
          ? `1px solid ${dlqColors.accentPrimary}`
          : `1px dashed ${dlqColors.borderStrong}`,
        boxShadow: "0 18px 40px rgba(0,0,0,0.65)",
        display: "flex",
        flexDirection: "column",
        gap: dlqSpace.sm,
      }}
    >
      {/* Hidden input */}
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        onChange={handleFileInputChange}
        style={{ display: "none" }}
      />

      {/* Drop region */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDragEnd={handleDragLeave}
        style={{
          borderRadius: dlqRadii.md,
          padding: dlqSpace.md,
          background: isDragging ? "rgba(99,102,241,0.1)" : "#050816",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: dlqSpace.md,
          cursor: "pointer",
        }}
        onClick={handleBrowseClick}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: dlqSpace.sm,
          }}
        >
          {/* Simple file icon */}
          <div
            aria-hidden="true"
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              border: `1px solid ${dlqColors.borderStrong}`,
              background:
                "linear-gradient(135deg, rgba(148,163,253,0.2), rgba(15,23,42,0.9))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            📄
          </div>
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {isDragging
                ? "Drop your CSV file here"
                : "Drag & drop a CSV file, or click to browse"}
            </div>
            <div
              style={{
                fontSize: 12,
                color: dlqColors.textSecondary,
                marginTop: 2,
              }}
            >
              We only read your data locally and send it to the DataLakeQ
              backend for profiling.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleBrowseClick();
            }}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: `1px solid ${dlqColors.borderSubtle}`,
              background: "#0b1020",
              color: dlqColors.textPrimary,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Browse…
          </button>
        </div>
      </div>

      {/* Selected file + Run button row */}
      <div
        style={{
          marginTop: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: dlqSpace.sm,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minHeight: 20 }}>
          {file ? (
            <Chip
              tone="info"
              size="md"
              style={{ maxWidth: 360, overflow: "hidden" }}
            >
              <span
                style={{
                  maxWidth: 260,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {file.name}
              </span>
              <span style={{ opacity: 0.85, marginLeft: 6 }}>
                · {formatBytes(file.size)}
              </span>
            </Chip>
          ) : (
            <span
              style={{ fontSize: 12, color: dlqColors.textSecondary }}
            >
              No file selected yet.
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onRun}
          disabled={!canRun}
          style={{
            padding: "7px 18px",
            borderRadius: 999,
            border: "none",
            background: canRun ? "#6366f1" : "#262b40",
            color: "#fff",
            cursor: canRun ? "pointer" : "default",
            fontSize: 13,
            fontWeight: 500,
            boxShadow: canRun
              ? "0 0 0 1px rgba(129,140,248,0.65), 0 14px 30px rgba(0,0,0,0.6)"
              : "none",
            opacity: loading ? 0.8 : 1,
            transition: "background 0.15s ease, transform 0.08s ease",
          }}
        >
          {loading ? "Analyzing…" : "Run Data Quality Check"}
        </button>
      </div>
    </section>
  );
};

export default FileDropZone;
