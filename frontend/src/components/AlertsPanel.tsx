// frontend/src/components/AlertsPanel.tsx
import React from "react";

export type AlertLevel = "error" | "warning" | "info";

export interface Alert {
  level: AlertLevel;
  code: string;
  message: string;
}

interface AlertsPanelProps {
  alerts: Alert[] | null | undefined;
}

const levelLabel: Record<AlertLevel, string> = {
  error: "Error",
  warning: "Warning",
  info: "Info",
};

const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts }) => {
  if (!alerts || alerts.length === 0) {
    return (
      <section
        style={{
          border: "1px solid #333",
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
          background: "#111",
        }}
      >
        <h2 style={{ margin: 0, marginBottom: 8, fontSize: 18 }}>Alerts</h2>
        <p style={{ margin: 0, fontSize: 14, color: "#999" }}>
          No alerts generated for this run.
        </p>
      </section>
    );
  }

  return (
    <section
      style={{
        border: "1px solid #333",
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        background: "#111",
      }}
    >
      <h2 style={{ margin: 0, marginBottom: 8, fontSize: 18 }}>Alerts</h2>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {alerts.map((alert, idx) => {
          const icon =
            alert.level === "error"
              ? "🚨"
              : alert.level === "warning"
              ? "⚠️"
              : "ℹ️";

          const color =
            alert.level === "error"
              ? "#ff6b6b"
              : alert.level === "warning"
              ? "#ffd166"
              : "#9be7ff";

          return (
            <li
              key={`${alert.code}-${idx}`}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "6px 0",
                borderBottom:
                  idx < alerts.length - 1 ? "1px solid #222" : "none",
              }}
            >
              <span style={{ fontSize: 18 }}>{icon}</span>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    color,
                    marginBottom: 2,
                  }}
                >
                  {levelLabel[alert.level]} · {alert.code}
                </div>
                <div style={{ fontSize: 14, color: "#eee" }}>
                  {alert.message}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default AlertsPanel;
