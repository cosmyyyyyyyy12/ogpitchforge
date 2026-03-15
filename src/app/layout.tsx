import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { OfflineBanner } from "@/components/layout/offline-banner";


const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["500", "600", "700", "800"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "PitchForge | AI Game Pitch Deck Generator",
  description: "Pitch your game. Get funded.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${jakarta.variable} ${inter.variable} antialiased`}
      >
        <Script id="theme-init" strategy="beforeInteractive">
          {`(() => {
            const savedTheme = localStorage.getItem("pitchforge-theme");
            document.documentElement.dataset.theme = savedTheme === "dark" ? "dark" : "light";
          })();`}
        </Script>
        <AuthProvider>
          {children}
          <OfflineBanner />
        </AuthProvider>
      </body>
    </html>
  );
}
