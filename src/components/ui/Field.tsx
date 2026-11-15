import { TextInput, View, type TextInputProps } from "react-native";
import { radius, space, useTheme } from "@/theme";
import { Text } from "./Text";

export interface FieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function Field({ label, error, style, ...rest }: FieldProps) {
  const t = useTheme();
  return (
    <View style={{ gap: space.xs }}>
      <Text variant="label">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={t.inkSubtle}
        style={[
          {
            minHeight: 48,
            borderWidth: 1,
            borderColor: error ? t.danger : t.lineStrong,
            borderRadius: radius.control,
            paddingHorizontal: space.md,
            color: t.ink,
            backgroundColor: t.surface,
            fontSize: 16,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
