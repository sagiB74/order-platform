import type { Metadata } from "next";
import { Assistant } from "next/font/google";
import "./globals.css";

// Assistant — a clean Hebrew + Latin face. Loaded via next/font (self-hosted at
// build time, no external request at runtime). Exposed as --font-assistant,
// which globals.css maps to --font-sans.
const assistant = Assistant({
  variable: "--font-assistant",
  subsets: ["hebrew", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "בית ללא גלוטן",
  description: "מאפים ביתיים ללא גלוטן — טרי, מפנק, מלא בטעם",
};

// The whole app is Hebrew, right-to-left.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="he" dir="rtl" className={`${assistant.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
