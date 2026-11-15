import { View } from "react-native";
import { radius, useTheme } from "@/theme";
import type { StatusStyle } from "@/lib/status";
import { Text } from "./Text";

/** A status label. Colour never carries meaning alone: the words are always there. */
export function Badge({ label, tone }: StatusStyle) {
  const t = useTheme();
  const colours = {
    neutral: { bg: t.sunken, fg: t.inkMuted },
    success: { bg: t.successTint, fg: t.success },
    warning: { bg: t.warningTint, fg: t.warning },
    danger: { bg: t.dangerTint, fg: t.danger },
    info: { bg: t.infoTint, fg: t.info },
  }[tone];
  return (
    <View
      style={{
        backgroundColor: colours.bg,
        borderRadius: radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 3,
        alignSelf: "flex-start",
      }}
    >
      <Text variant="caption" style={{ color: colours.fg, fontWeight: "700" }}>
        {label}
      </Text>
    </View>
  );
}
