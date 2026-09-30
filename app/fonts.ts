import { JetBrains_Mono, Newsreader } from "next/font/google";
import localFont from "next/font/local";

// The same three faces as travls-landing (see its app/fonts.ts): Switzer for
// headings and UI, Newsreader for figures, JetBrains Mono for eyebrows.
export const switzer = localFont({
  src: "./fonts/Switzer-Variable.woff2",
  variable: "--font-switzer",
  weight: "400 800",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: "400",
});

export const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: "400",
});

export const fontVariables = [switzer.variable, newsreader.variable, jetbrainsMono.variable].join(" ");
