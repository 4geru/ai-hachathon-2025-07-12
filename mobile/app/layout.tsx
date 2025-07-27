import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sky Canvas - 空に描く、あなたの創造力",
  description: "あなたの感情が花火になる。音楽と光が織りなす全く新しい体験。スマートフォンを振るだけで、心の動きが空に舞い踊る。Vibes = 花火 = 音の融合体験。",
  keywords: ["花火", "音楽", "センサー", "リアルタイム", "WebGL", "p5.js", "感情表現", "デジタルアート"],
  authors: [{ name: "Sky Canvas Team" }],
  openGraph: {
    title: "Sky Canvas - 空に描く、あなたの創造力",
    description: "あなたの感情が花火になる。音楽と光が織りなす全く新しい体験。",
    type: "website",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sky Canvas - 空に描く、あなたの創造力",
    description: "あなたの感情が花火になる。音楽と光が織りなす全く新しい体験。",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" 
          rel="stylesheet" 
        />
        <meta name="theme-color" content="#1a1a2e" />
        <meta name="msapplication-TileColor" content="#1a1a2e" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Sky Canvas" />
      </head>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
