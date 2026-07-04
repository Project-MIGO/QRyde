import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.scss";
import { QrydeProvider } from "./_components/QrydeProvider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "QRyde",
  description:
    "QR-based P2P commute payment system. Pay tricycle fares in stablecoins settled on Stellar - no app for the driver, no coins for the passenger.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1a237e",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <QrydeProvider>{children}</QrydeProvider>
      </body>
    </html>
  );
}
