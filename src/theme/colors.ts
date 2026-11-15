/** The web admin's palette (src/app/globals.css in booking-engine), light and dark. */
export interface Palette {
  paper: string;
  surface: string;
  peach: string;
  sunken: string;
  ink: string;
  inkMuted: string;
  inkSubtle: string;
  line: string;
  lineStrong: string;
  primary: string;
  onPrimary: string;
  success: string;
  successTint: string;
  warning: string;
  warningTint: string;
  danger: string;
  dangerTint: string;
  onDanger: string;
  info: string;
  infoTint: string;
}

export const light: Palette = {
  paper: "#fff8f1",
  surface: "#ffffff",
  peach: "#fde9d6",
  sunken: "#f6ebdd",
  ink: "#141210",
  inkMuted: "#4f463e",
  inkSubtle: "#6a5f55",
  line: "#e6d8c8",
  lineStrong: "#857a6e",
  primary: "#141210",
  onPrimary: "#fff8f1",
  success: "#1b6a41",
  successTint: "#e4f2e9",
  warning: "#7a4a00",
  warningTint: "#fbefd0",
  danger: "#a8231b",
  dangerTint: "#fbe4e1",
  onDanger: "#ffffff",
  info: "#1f4e8c",
  infoTint: "#e3ecf8",
};

export const dark: Palette = {
  paper: "#12100e",
  surface: "#1c1916",
  peach: "#2a2118",
  sunken: "#231f1b",
  ink: "#f7eee5",
  inkMuted: "#c4b8ab",
  inkSubtle: "#a39686",
  line: "#3a332c",
  lineStrong: "#8a7e71",
  primary: "#fde9d6",
  onPrimary: "#12100e",
  success: "#7fd6a4",
  successTint: "#16301f",
  warning: "#f2c66b",
  warningTint: "#33270b",
  danger: "#ff9c93",
  dangerTint: "#3a1512",
  onDanger: "#12100e",
  info: "#9cc2f5",
  infoTint: "#14263f",
};
