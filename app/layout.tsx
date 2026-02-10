import type { Metadata, Viewport } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { ServiceWorkerRegister } from "./components/pwa/sw-register";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Transcripts - AI Audio Transcription",
  description: "Real-time audio transcription with AI-powered summaries",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Transcripts",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#FBF5EE",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${lora.variable}`}>
        <ConvexClientProvider>{children}</ConvexClientProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
