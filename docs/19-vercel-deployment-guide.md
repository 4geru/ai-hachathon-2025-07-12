# Vercel デプロイガイド - Sky Canvas

## 📋 デプロイ実行記録

**実行日**: 2025年1月12日  
**プロジェクト**: Sky Canvas Mobile App  
**デプロイ先**: https://mobile-nk6aipicz-4gerus-projects.vercel.app

## 🚀 デプロイの流れ

### 1. 事前準備

#### プロジェクト構成の確認
```bash
cd mobile
ls -la
# 必要なファイルの確認:
# - package.json
# - next.config.ts
# - tsconfig.json
# - app/ ディレクトリ
```

#### 依存関係の確認
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.50.5",
    "@types/p5": "^1.7.6",
    "next": "15.3.5",
    "p5": "^2.0.3",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

### 2. ビルドエラーの修正

#### エラー1: TypeScript/ESLintエラー
**問題**: 未使用変数やReact Hooks警告
```bash
./app/phone/page.tsx
5:8  Error: 'P5Fireworks' is defined but never used.
14:10  Error: 'fireworkEvent' is assigned a value but never used.
62:15  Error: 'errorMessage' is assigned a value but never used.
```

**解決方法**:
```tsx
// 未使用のimportを削除
- import P5Fireworks from '@/components/P5Fireworks';

// 未使用の変数を削除
- const [fireworkEvent, setFireworkEvent] = useState<...>(undefined);
- const errorMessage = error instanceof Error ? error.message : 'Unknown error';
```

#### エラー2: SSR (Server-Side Rendering) 問題
**問題**: p5.jsライブラリが`window`オブジェクトを使用
```bash
ReferenceError: window is not defined
```

**解決方法**:
```tsx
// dynamic importを使用してSSRを無効化
import dynamic from 'next/dynamic';

const P5Fireworks = dynamic(() => import('@/components/P5Fireworks'), {
  ssr: false,
  loading: () => <div>Loading fireworks...</div>
});
```

### 3. 環境変数の設定

#### Supabaseクライアントの設定
```typescript
// utils/supabase.ts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing...');
}
```

#### 環境変数の取得
```bash
# Supabase情報を取得
Project ID: twgpkuhorarfcdjsbtgw
URL: https://twgpkuhorarfcdjsbtgw.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Vercelデプロイの実行

#### 初回デプロイ
```bash
cd mobile
npx vercel --prod
```

#### デプロイの流れ
1. **プロジェクトの設定**
   - Scope: 4geru's projects
   - Project name: mobile
   - Directory: ./

2. **自動検出された設定**
   - Build Command: `next build`
   - Development Command: `next dev --port $PORT`
   - Install Command: `npm install`
   - Output Directory: Next.js default

3. **デプロイ結果**
   - 🔗 Project URL: https://mobile-nk6aipicz-4gerus-projects.vercel.app
   - 🔍 Inspect: https://vercel.com/4gerus-projects/mobile/...

### 5. 環境変数の設定（Vercelダッシュボード）

#### 設定場所
1. https://vercel.com/4gerus-projects/mobile
2. Settings → Environment Variables
3. Add ボタンをクリック

#### 設定する環境変数
```bash
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://twgpkuhorarfcdjsbtgw.supabase.co

Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3Z3BrdWhvcmFyZmNkanNidGd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyOTYxNTQsImV4cCI6MjA2Nzg3MjE1NH0.QECU-a-5drh-_rJp3Lgn83PiYglwB5ofpGwWn27Tmb0
```

### 6. 再デプロイの実行

#### 環境変数設定後の再デプロイ
```bash
npx vercel --prod
```

または、Vercelダッシュボードから「Redeploy」ボタンをクリック

## 🔧 遭遇した問題と解決方法

### 問題1: ビルドエラー（TypeScript）
**症状**: 未使用変数やReact Hooksの警告
**原因**: 開発中のコードに未使用の変数が残存
**解決**: 未使用のimportと変数を削除

### 問題2: SSRエラー
**症状**: `window is not defined`
**原因**: p5.jsライブラリがブラウザ専用のAPIを使用
**解決**: Dynamic import + SSR無効化

### 問題3: 環境変数エラー
**症状**: `supabaseUrl is required`
**原因**: Vercelデプロイ時に環境変数が未設定
**解決**: Vercelダッシュボードでの環境変数設定

### 問題4: 音声再生の問題
**症状**: デプロイ後に音声が再生されない
**原因**: ブラウザの音声自動再生ポリシー（ユーザーの操作なしに音声を再生できない）
**解決**: 音声有効化ボタンの実装とユーザー操作による音声許可の取得

#### 音声問題の具体的な解決方法

1. **音声有効化ボタンの実装**
```tsx
// 音声有効化の状態管理
const [audioEnabled, setAudioEnabled] = useState<boolean>(false);

// 音声を有効にする関数
const enableAudio = async () => {
  if (audioRef.current) {
    try {
      audioRef.current.volume = 0;
      await audioRef.current.play();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.volume = 0.5;
      setAudioEnabled(true);
    } catch (error) {
      console.error('音声有効化エラー:', error);
    }
  }
};
```

2. **ユーザーインターフェースの改善**
```tsx
{!audioEnabled && (
  <button onClick={enableAudio}>
    音声を有効にする
  </button>
)}
```

3. **音声再生の条件分岐**
```tsx
const playFireworkSound = async () => {
  if (audioRef.current && audioEnabled) {
    await audioRef.current.play();
  }
};
```

## 📊 デプロイ結果

### ビルド情報
```
Route (app)                                 Size  First Load JS    
┌ ○ /                                    5.76 kB         107 kB
├ ○ /_not-found                            977 B         102 kB
├ ƒ /api/firework-data                     136 B         102 kB
├ ○ /display                             2.95 kB         141 kB
└ ○ /phone                               2.51 kB         140 kB
+ First Load JS shared by all             101 kB
```

### アクセス可能なURL
- **トップページ**: https://mobile-nk6aipicz-4gerus-projects.vercel.app
- **Phone ページ**: https://mobile-nk6aipicz-4gerus-projects.vercel.app/phone
- **Display ページ**: https://mobile-nk6aipicz-4gerus-projects.vercel.app/display

## ✅ デプロイ完了後の確認項目

### 機能テスト
- [ ] Phone ページでのセンサーデータ表示
- [ ] Display ページでの花火表示
- [ ] API Routes の動作確認
- [ ] Supabase Realtimeの動作確認
- [ ] 音声再生の確認
- [ ] モバイルデバイスでの動作確認

### パフォーマンス
- [ ] ページ読み込み速度
- [ ] リアルタイム通信の遅延
- [ ] 花火アニメーションの滑らかさ

### セキュリティ
- [ ] HTTPS接続の確認
- [ ] 環境変数の適切な設定
- [ ] CORS設定の確認

## 🎯 今後の改善点

1. **カスタムドメイン**: 独自ドメインの設定
2. **監視設定**: エラーログとパフォーマンス監視
3. **CI/CD**: GitHub Actionsとの連携
4. **環境分離**: 開発・ステージング・本番環境の構築

## 📝 メモ

- Next.js 15.3.5 + React 19.0.0の組み合わせで正常動作
- p5.jsライブラリのSSR対応が重要
- Supabase環境変数の設定が必須
- 静的ファイル（音声等）の配置場所に注意が必要

---

**最終更新**: 2025年1月12日  
**作成者**: AI Assistant  
**ステータス**: デプロイ完了、音声問題対応中 