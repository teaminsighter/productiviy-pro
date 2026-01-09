import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Productify Pro - AI-Powered Productivity Tracking',
  description: 'Track, analyze, and improve your digital habits with AI-powered insights. Boost your productivity today.',
  keywords: 'productivity, time tracking, focus, AI, analytics',
  openGraph: {
    title: 'Productify Pro - AI-Powered Productivity Tracking',
    description: 'Track, analyze, and improve your digital habits with AI-powered insights.',
    url: 'https://productifypro.com',
    siteName: 'Productify Pro',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Productify Pro',
    description: 'AI-Powered Productivity Tracking',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
