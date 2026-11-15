import { Text as RNText, type TextProps } from "react-native";
import { useTheme } from "@/theme";

type Variant = "display" | "title" | "heading" | "body" | "label" | "caption";

const styles = {
  display: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: "700" },
  body: { fontSize: 16, lineHeight: 22, fontWeight: "400" },
  label: { fontSize: 14, lineHeight: 18, fontWeight: "600" },
  caption: { fontSize: 13, lineHeight: 17, fontWeight: "400" },
} as const;

export interface AppTextProps extends TextProps {
  variant?: Variant;
  tone?: "default" | "muted" | "subtle" | "danger" | "success" | "onPrimary";
  uppercase?: boolean;
}

export function Text({
  variant = "body",
  tone = "default",
  uppercase,
  style,
  ...rest
}: AppTextProps) {
  const t = useTheme();
  const color = {
    default: t.ink,
    muted: t.inkMuted,
    subtle: t.inkSubtle,
    danger: t.danger,
    success: t.success,
    onPrimary: t.onPrimary,
  }[tone];
  return (
    <RNText
      style={[
        styles[variant],
        { color },
        uppercase && { textTransform: "uppercase" },
        style,
      ]}
      {...rest}
    />
  );
}
