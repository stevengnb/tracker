import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { Toaster } from "@/components/Toaster";
import { ConfirmHost } from "@/components/ConfirmHost";
import { CommandPalette } from "@/components/CommandPalette";
import { PageviewLogger } from "@/components/PageviewLogger";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Tracker", template: "%s — Tracker" },
  description: "Personal tracker: brain challenges, tasks, goals, habits.",
  appleWebApp: { capable: true, title: "Tracker" },
  icons: { apple: "/apple-touch-icon.png" },
};

// Colours the Android status bar once the PWA is installed standalone.
export const viewport: Viewport = {
  themeColor: "#0a0a0b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full font-sans text-[14px]">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <TopBar />
              <main className="fade-in mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8">
                {children}
              </main>
            </div>
          </div>
          <Toaster />
          <ConfirmHost />
          <CommandPalette />
          <PageviewLogger />
        </ThemeProvider>
      </body>
    </html>
  );
}
