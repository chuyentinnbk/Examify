import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Examify AI - Production-Ready Exam Generation System',
  description:
    'Full-stack enterprise exam generator with multi-AI strategy, self-hosted security, and automated curriculum matrix.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
