import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AuthProvider } from "@/components/auth/AuthProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SecondServing - Rescue Surplus Food",
  description:
    "Connect surplus food from restaurants, stores, and farms with households, food banks, and composters in real-time.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-screen flex-col font-sans">
        {mapsKey && (
          <Script
            src={`https://maps.googleapis.com/maps/api/js?key=${mapsKey}`}
            strategy="beforeInteractive"
          />
        )}
        <AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
