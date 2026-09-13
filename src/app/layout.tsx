import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Rondia · Organizar juntos, con las cosas claras',
  description: 'Consultas, avisos y seguimiento de pagos para eventos de familias.',
  icons: {
    icon: [
      { url: '/brand/rondia/favicon.svg', type: 'image/svg+xml' },
      { url: '/brand/rondia/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/brand/rondia/app-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
