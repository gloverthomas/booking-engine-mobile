import { Pressable } from "react-native";
import { radius, space, useTheme } from "@/theme";
import { Text } from "./Text";

export interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}

/** A selectable pill. 44pt tall, selected state shown by fill and a check mark, not colour alone. */
export function Chip({ label, selected, onPress, disabled }: ChipProps) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        justifyContent: "center",
        paddingHorizontal: space.lg,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: selected ? t.primary : t.lineStrong,
        backgroundColor: selected ? t.primary : t.surface,
        opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
      })}
    >
      <Text variant="label" style={{ color: selected ? t.onPrimary : t.ink }}>
        {selected ? "✓ " : ""}
        {label}
      </Text>
    </Pressable>
  );
}
