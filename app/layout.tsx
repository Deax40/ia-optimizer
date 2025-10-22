import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Optimiseur Perf + SEO',
  description: 'Panel d\'administration pour l\'optimisation automatique de sites Next.js',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
