import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Travls Ops — Social Mining",
  description: "Internal dashboard for tracking X shares, engagement, and reward credits.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f4ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c0c" },
  ],
  colorScheme: "light dark",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Set by the theme toggle; without it the page follows the system appearance.
  const pinned = (await cookies()).get("theme")?.value;
  const theme = pinned === "light" || pinned === "dark" ? pinned : undefined;
  return (
    <html lang="en" data-theme={theme} className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
