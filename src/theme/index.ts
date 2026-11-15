import { useColorScheme } from "react-native";
import { dark, light, type Palette } from "./colors";

export type { Palette };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { control: 10, card: 14, pill: 999 } as const;

/** Colours for the current appearance. Follows the phone's light or dark setting. */
export function useTheme(): Palette {
  return useColorScheme() === "dark" ? dark : light;
}
