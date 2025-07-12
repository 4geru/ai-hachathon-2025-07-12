# Sky Canvas - 技術スタック

本プロジェクト「Sky Canvas」で使用する主要な技術スタックを以下にまとめます。

## 1. フロントエンド技術

### 1.1. スマートフォンアプリ
- **フレームワーク/言語:** React, TypeScript
- **センサー連携:** DeviceOrientation API, Vibration API
- **バックエンド連携:** Supabase Client SDK

### 1.2. ディスプレイアプリ
- **フレームワーク/言語:** React, TypeScript
- **グラフィック:** Three.js, WebGL
- **音声:** Web Audio API
- **バックエンド連携:** Supabase Client SDK

## 2. バックエンド技術

- **プラットフォーム:** Supabase
- **データベース:** PostgreSQL
- **リアルタイム通信:** Supabase Realtime Subscription

## 3. 開発環境・ツール

### 3.1. 必須ツール
- **ランタイム:** Node.js v18以上
- **パッケージマネージャー:** pnpm
- **エディタ:** Visual Studio Code (VS Code)
- **デバッグツール:** Chrome DevTools
- **データベース管理:** Supabase CLI

### 3.2. 推奨VS Code拡張機能
- ESLint (コード品質維持)
- Prettier (コードフォーマット)
- TypeScript Vue Plugin (TypeScript開発補助 - 今回はReactですが、TypeScriptの補完強化のため記載されていた可能性を考慮)
- Three.js Editor (Three.js開発補助)
- WebGL Shader Editor (WebGLシェーダー開発補助) 