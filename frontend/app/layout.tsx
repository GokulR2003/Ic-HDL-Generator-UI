import type { Metadata } from 'next';
import { Syne, IBM_Plex_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'IC HDL Generator',
  description: 'Design digital circuits. Get clean Verilog. In your browser.',
  manifest: '/manifest.json',
  themeColor: '#3dd9d6',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'IC HDL',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${ibmPlexMono.variable}`}>
      <body>
        {children}
        <Toaster
          position="top-right"
          theme="dark"
          toastOptions={{
            style: {
              background: 'var(--surface-3)',
              border: '1px solid var(--border-mid)',
              color: 'var(--text-1)',
              fontFamily: 'var(--font-sans)',
              fontSize: '13px',
              borderRadius: 'var(--radius-md)',
            },
          }}
        />
      </body>
    </html>
  );
}
