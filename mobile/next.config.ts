import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Next.jsのフォント最適化を無効にする
  // これにより、ビルド時のGoogle Fontsのフェッチエラーを回避できる可能性があります。
  // セキュリティ上の理由から、本番環境ではこの設定を見直す必要があります。
  optimizeFonts: false,
};

export default nextConfig;
