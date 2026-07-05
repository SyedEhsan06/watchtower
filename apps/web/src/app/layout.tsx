import type { Metadata, Viewport } from "next";
import { Outfit, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Watchtower",
  description: "Internal server and service monitoring",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Watchtower",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster />
          <ServiceWorkerRegistration />
        </ThemeProvider>
      </body>
    </html>
  );
}
