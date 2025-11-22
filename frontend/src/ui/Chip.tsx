// frontend/src/ui/Chip.tsx
import React from "react";
import { dlqColors, dlqRadii, dlqSpace } from "./theme";

export interface ChipProps {
  children: React.ReactNode;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info";
  size?: "sm" | "md";
  subtle?: boolean;
  style?: React.CSSProperties;
}

const toneMap: Record<
  NonNullable<ChipProps["tone"]>,
  { bg: string; color: string; border?: string }
> = {
  default: {
    bg: dlqColors.chipBg,
    color: dlqColors.textSecondary,
    border: dlqColors.chipBorder,
  },
  success: {
    bg: dlqColors.successSoft,
    color: dlqColors.success,
  },
  warning: {
    bg: dlqColors.warningSoft,
    color: dlqColors.warning,
  },
  danger: {
    bg: dlqColors.dangerSoft,
    color: dlqColors.danger,
  },
  info: {
    bg: dlqColors.infoSoft,
    color: dlqColors.info,
  },
};

const Chip: React.FC<ChipProps> = ({
  children,
  iconLeft,
  iconRight,
  tone = "default",
  size = "sm",
  subtle = false,
  style,
}) => {
  const base = toneMap[tone];

  const paddingX = size === "md" ? dlqSpace.sm : dlqSpace.sm - 2;
  const paddingY = size === "md" ? 5 : 3;
  const fontSize = size === "md" ? 12 : 11;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: `${paddingY}px ${paddingX}px`,
        borderRadius: dlqRadii.pill,
        fontSize,
        color: subtle ? dlqColors.textSecondary : base.color,
        backgroundColor: subtle ? dlqColors.chipBg : base.bg,
        border: subtle
          ? `1px solid ${dlqColors.chipBorder}`
          : base.border
          ? `1px solid ${base.border}`
          : "none",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {iconLeft && <span style={{ display: "inline-flex" }}>{iconLeft}</span>}
      <span>{children}</span>
      {iconRight && (
        <span style={{ display: "inline-flex" }}>{iconRight}</span>
      )}
    </span>
  );
};

export default Chip;
