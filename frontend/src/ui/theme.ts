// frontend/src/ui/theme.ts

// Design tokens for DataLakeQ UI

export const dlqColors = {
  // Backgrounds
  pageBg: "#050509",
  pageBgAlt: "#090b16",
  cardBg: "#060612",
  cardBgSoft: "#090c20",

  // Borders / outlines
  borderSubtle: "#262737",
  borderStrong: "#3a3c50",

  // Text
  textPrimary: "#ffffff",
  textSecondary: "#a0a5c0",
  textMuted: "#7b819b",

  // Accents
  accentPrimary: "#6366f1", // Indigo
  accentPrimarySoft: "rgba(99,102,241,0.15)",
  accentPrimaryStrong: "#4f46e5",

  // Status
  success: "#22c55e",
  successSoft: "rgba(34,197,94,0.15)",
  warning: "#f59e0b",
  warningSoft: "rgba(245,158,11,0.18)",
  danger: "#ef4444",
  dangerSoft: "rgba(239,68,68,0.18)",
  info: "#3b82f6",
  infoSoft: "rgba(59,130,246,0.18)",

  // Misc
  chipBg: "#151829",
  chipBorder: "#33364d",
};

export const dlqRadii = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  pill: 999,
};

export const dlqShadows = {
  card: "0 18px 35px rgba(0,0,0,0.50)",
  soft: "0 10px 25px rgba(0,0,0,0.40)",
};

export const dlqSpace = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const dlqTypography = {
  fontFamily:
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  h1: 24,
  h2: 18,
  body: 14,
  small: 12,
};

export const dlqCardStyle: React.CSSProperties = {
  borderRadius: dlqRadii.lg,
  border: `1px solid ${dlqColors.borderSubtle}`,
  background: dlqColors.cardBg,
  padding: dlqSpace.lg,
};
