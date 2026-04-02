import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hack Club AI Chat',
  description: 'Generated using Next.js without AI SDK',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
