import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apple Refurb Monitor - MacBook Air & Pro",
  description:
    "Surveillez les MacBook Air et MacBook Pro reconditionnes sur le store Apple France",
};

const themeScript = `
  (function() {
    var theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
