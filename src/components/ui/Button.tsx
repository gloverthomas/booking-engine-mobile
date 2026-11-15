import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
} from "react-native";
import { radius, space, useTheme } from "@/theme";
import { Text } from "./Text";

export interface ButtonProps extends Omit<
  PressableProps,
  "children" | "style"
> {
  title: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
  /** Fill the width of the parent. */
  block?: boolean;
}

/** 48pt tall (above Apple's 44pt minimum), with a pressed state and a spinner while working. */
export function Button({
  title,
  variant = "primary",
  loading = false,
  block = false,
  disabled,
  ...rest
}: ButtonProps) {
  const t = useTheme();
  const palette = {
    primary: { bg: t.primary, fg: t.onPrimary, border: t.primary },
    secondary: { bg: t.surface, fg: t.ink, border: t.lineStrong },
    danger: { bg: t.danger, fg: t.onDanger, border: t.danger },
    ghost: { bg: "transparent", fg: t.ink, border: "transparent" },
  }[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: palette.bg, borderColor: palette.border },
        block && styles.block,
        pressed && { opacity: 0.8 },
        inactive && { opacity: 0.5 },
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <Text variant="label" style={{ color: palette.fg, fontSize: 16 }}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: space.xl,
    borderRadius: radius.control,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  block: { alignSelf: "stretch" },
});
