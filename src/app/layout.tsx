import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Infobuilding — Localitzador de Dades d'Edificis",
  description: "Automatitza la recopilació de dades oficials, històriques i urbanístiques de qualsevol edifici a Espanya. Integra Catastro, Open Data, i Intel·ligència Artificial.",
  keywords: "edifici, catastro, patrimoni, arquitectura, Barcelona, Madrid, Espanya",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ca">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossOrigin="anonymous" />
      </head>
      <body className="antialiased min-h-screen bg-slate-950">
        {children}
      </body>
    </html>
  );
}
