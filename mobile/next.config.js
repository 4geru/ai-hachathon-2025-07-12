/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // StrictModeを無効化してcanvas重複を防止
  experimental: {
    optimizePackageImports: ['p5']
  }
}

module.exports = nextConfig