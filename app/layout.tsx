import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apple Refurb Monitor - MacBook Pro",
  description:
    "Surveillez les MacBook Pro reconditionnés sur le store Apple France",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
