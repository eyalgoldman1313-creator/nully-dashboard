import type { Metadata, Viewport } from 'next';
import { Heebo } from 'next/font/google';
import './globals.css';
import { MobileBar, Sidebar, TabBar } from '@/components/Nav';

const heebo = Heebo({ subsets: ['hebrew', 'latin'], weight: ['400', '500', '600', '700'], variable: '--font-heebo', display: 'swap' });
export const metadata: Metadata = { title: 'Nully · לוח בקרה', description: 'לוח בקרה לפרויקט חנות Nully', robots: { index: false, follow: false } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0d5c59' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body>
        <a className="skip" href="#main">דילוג לתוכן</a>
        <div className="shell">
          <Sidebar />
          <div className="content">
            <MobileBar />
            <main id="main" className="wrap">{children}</main>
          </div>
        </div>
        <TabBar />
      </body>
    </html>
  );
}
