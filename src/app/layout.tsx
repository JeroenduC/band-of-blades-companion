import type { Metadata } from 'next';
import { Cinzel, Geist, Geist_Mono, IM_Fell_English, Crimson_Pro, Special_Elite } from 'next/font/google';
import { LegionToaster } from '@/components/legion';
import './globals.css';

// Heading font — Cinzel is drawn from classical Roman inscriptions.
// Its martial, authoritative letterforms suit Band of Blades perfectly.
const cinzel = Cinzel({
  variable: '--font-cinzel',
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

// Auth page fonts — field journal / parchment aesthetic.
const imFell = IM_Fell_English({
  variable: '--font-im-fell',
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
});

const crimsonPro = Crimson_Pro({
  variable: '--font-crimson-pro',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const specialElite = Special_Elite({
  variable: '--font-special-elite',
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Band of Blades — Legion Phase Companion',
  description: 'Async campaign phase companion for Band of Blades.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // `dark` class activates all Shadcn `dark:` variant overrides (input bg,
      // button borders, etc.). Our app is dark-only; there is no light mode.
      className={`${cinzel.variable} ${geistSans.variable} ${geistMono.variable} ${imFell.variable} ${crimsonPro.variable} ${specialElite.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <LegionToaster />
      </body>
    </html>
  );
}
