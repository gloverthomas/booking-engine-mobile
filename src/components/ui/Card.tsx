import { View, type ViewProps } from "react-native";
import { radius, space, useTheme } from "@/theme";

export interface CardProps extends ViewProps {
  tone?: "default" | "peach";
}

export function Card({ tone = "default", style, ...rest }: CardProps) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: tone === "peach" ? t.peach : t.surface,
          borderColor: t.line,
          borderWidth: 1,
          borderRadius: radius.card,
          padding: space.lg,
          gap: space.sm,
        },
        style,
      ]}
      {...rest}
    />
  );
}
