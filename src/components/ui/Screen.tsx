import type { ReactNode } from "react";
import { RefreshControl, ScrollView, View, type ViewStyle } from "react-native";
import { space, useTheme } from "@/theme";

export interface ScreenProps {
  children: ReactNode;
  /** Pull to refresh. */
  onRefresh?: () => void;
  refreshing?: boolean;
  contentStyle?: ViewStyle;
  /** Plain View instead of a ScrollView, for screens that own a list. */
  fixed?: boolean;
}

export function Screen({
  children,
  onRefresh,
  refreshing = false,
  contentStyle,
  fixed,
}: ScreenProps) {
  const t = useTheme();
  const padding = {
    padding: space.lg,
    gap: space.md,
    paddingBottom: space.xxl,
  };
  if (fixed) {
    return (
      <View
        style={[{ flex: 1, backgroundColor: t.paper }, padding, contentStyle]}
      >
        {children}
      </View>
    );
  }
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.paper }}
      contentContainerStyle={[padding, contentStyle]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}
