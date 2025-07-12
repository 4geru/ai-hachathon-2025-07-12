import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // フォント最適化を無効にしてビルドエラーを回避
  experimental: {
    optimizeCss: false,
  },
  // SSL証明書の問題を回避
  typescript: {
    // ビルド時のTypeScriptエラーを無視（必要に応じて）
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
