import type { Metadata } from "next";
import "./globals.css";

// Google Fontsの設定を一時的に無効化（デプロイ時のSSL証明書問題を回避）
// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
  title: "花火アプリ",
  description: "スマートフォンの加速度センサーで花火を打ち上げるアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        {children}
      </body>
    </html>
  );
}
