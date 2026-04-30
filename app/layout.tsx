import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vett: Invoice Fraud Detector",
  description:
    "Upload any invoice and get an AI-powered fraud risk score with a full breakdown of suspicious signals.",
  openGraph: {
    title: "Vett: Invoice Fraud Detector",
    description:
      "Upload any invoice and get an AI-powered fraud risk score with a full breakdown of suspicious signals.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
