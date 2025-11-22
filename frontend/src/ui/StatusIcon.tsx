// frontend/src/ui/StatusIcon.tsx
import React from "react";
import { dlqColors } from "./theme";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

export interface StatusIconProps {
  tone?: StatusTone;
  size?: number;
}

const StatusIcon: React.FC<StatusIconProps> = ({ tone = "neutral", size }) => {
  const finalSize = size ?? 18;

  const color =
    tone === "success"
      ? dlqColors.success
      : tone === "warning"
      ? dlqColors.warning
      : tone === "danger"
      ? dlqColors.danger
      : tone === "info"
      ? dlqColors.info
      : dlqColors.textSecondary;

  const bg =
    tone === "success"
      ? dlqColors.successSoft
      : tone === "warning"
      ? dlqColors.warningSoft
      : tone === "danger"
      ? dlqColors.dangerSoft
      : tone === "info"
      ? dlqColors.infoSoft
      : "rgba(148, 163, 184, 0.18)";

  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: finalSize,
        height: finalSize,
        borderRadius: 999,
        backgroundColor: bg,
        color,
        fontSize: finalSize * 0.6,
      }}
    >
      {/* simple geometric glyph instead of icon library */}
      <span
        style={{
          width: finalSize * 0.42,
          height: finalSize * 0.42,
          borderRadius: 999,
          border: `2px solid ${color}`,
        }}
      />
    </span>
  );
};

export default StatusIcon;
