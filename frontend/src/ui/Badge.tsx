// frontend/src/ui/Badge.tsx
import React from "react";
import { dlqColors, dlqRadii, dlqSpace } from "./theme";

export interface BadgeProps {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  outline?: boolean;
  style?: React.CSSProperties;
}

const toneToColors = (tone: NonNullable<BadgeProps["tone"]>) => {
  switch (tone) {
    case "success":
      return { bg: dlqColors.successSoft, fg: dlqColors.success };
    case "warning":
      return { bg: dlqColors.warningSoft, fg: dlqColors.warning };
    case "danger":
      return { bg: dlqColors.dangerSoft, fg: dlqColors.danger };
    case "info":
      return { bg: dlqColors.infoSoft, fg: dlqColors.info };
    default:
      return { bg: dlqColors.chipBg, fg: dlqColors.textSecondary };
  }
};

const Badge: React.FC<BadgeProps> = ({
  children,
  tone = "neutral",
  outline = false,
  style,
}) => {
  const c = toneToColors(tone);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2px 10px",
        borderRadius: dlqRadii.pill,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.4,
        textTransform: "uppercase",
        color: c.fg,
        backgroundColor: outline ? "transparent" : c.bg,
        border: outline ? `1px solid ${c.fg}` : "none",
        ...style,
      }}
    >
      {children}
    </span>
  );
};

export default Badge;
