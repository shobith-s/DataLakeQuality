// frontend/src/components/AlertsPanel.tsx
import React from "react";
import type { Alert } from "../types/report";

interface AlertsPanelProps {
  alerts: Alert[] | undefined;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts }) => {
  const list = alerts ?? [];

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
      <h2 style={{ margin: 0, marginBottom: 8, fontSize: 16 }}>Alerts</h2>
      {list.length === 0 && (
        <p style={{ margin: 0, fontSize: 13, color: "#aaa" }}>
          No alerts for this run.
        </p>
      )}
      {list.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            fontSize: 13,
          }}
        >
          {list.map((a, idx) => (
            <li
              key={`${a.code}-${idx}`}
              style={{
                padding: 8,
                borderRadius: 6,
                border: "1px solid #222",
                background: "#05050c",
                marginBottom: 6,
              }}
            >
              <div style={{ marginBottom: 2 }}>
                <span style={{ fontWeight: 600 }}>
                  {a.level.toUpperCase()} · {a.code}
                </span>
              </div>
              <div style={{ color: "#ccc" }}>{a.message}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default AlertsPanel;
export type { Alert };
