import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SF Design Jobs",
  description:
    "Product design roles in the San Francisco Bay Area — aggregated live from Greenhouse, Ashby, and Lever.",
  openGraph: {
    title: "SF Design Jobs",
    description: "Live product design job board for the SF Bay Area.",
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
      <body>{children}</body>
    </html>
  );
}
