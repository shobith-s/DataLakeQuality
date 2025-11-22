// frontend/src/ui/Card.tsx
import React from "react";
import { dlqCardStyle, dlqColors, dlqRadii, dlqSpace } from "./theme";

export interface CardProps {
  title?: string;
  subtitle?: string;
  rightNode?: React.ReactNode;
  children: React.ReactNode;
  variant?: "default" | "soft" | "subtle";
  style?: React.CSSProperties;
}

const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  rightNode,
  children,
  variant = "default",
  style,
}) => {
  const variantStyle: React.CSSProperties =
    variant === "soft"
      ? {
          background: "radial-gradient(circle at top, #101427 0, #050509 55%)",
        }
      : variant === "subtle"
      ? {
          background: "#070918",
        }
      : {};

  return (
    <section
      style={{
        ...dlqCardStyle,
        ...variantStyle,
        ...style,
      }}
    >
      {(title || rightNode || subtitle) && (
        <header
          style={{
            display: "flex",
            alignItems: subtitle ? "flex-start" : "center",
            justifyContent: "space-between",
            gap: dlqSpace.sm,
            marginBottom: dlqSpace.sm,
          }}
        >
          <div>
            {title && (
              <h2
                style={{
                  margin: 0,
                  fontSize: 15,
                  letterSpacing: 0.1,
                }}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                style={{
                  margin: 0,
                  marginTop: 2,
                  fontSize: 12,
                  color: dlqColors.textSecondary,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {rightNode && <div style={{ marginLeft: "auto" }}>{rightNode}</div>}
        </header>
      )}
      <div>{children}</div>
    </section>
  );
};

export default Card;
