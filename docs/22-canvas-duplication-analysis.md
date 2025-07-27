# Canvas重複問題 - 調査と解決策

## 問題の概要

P5Fireworksコンポーネントで複数のcanvas要素が作成され、画面に2つのcanvasが表示される問題が発生。

## 原因分析

### 1. React StrictModeによる重複レンダリング
- **現象**: 開発環境でコンポーネントが2回マウントされる
- **影響**: useEffectが2回実行され、2つのp5.jsインスタンスが作成
- **確認方法**: 本番ビルドでは問題が発生しない

### 2. Dynamic Import + Loading状態の問題
- **現象**: dynamic importのloading状態とコンポーネント本体で2回レンダリング
- **影響**: SSR無効化のためdynamic importが必須だが、loading状態で一時的なコンポーネントが作成される
- **確認**: loading中とloading完了後でcanvasが重複作成

### 3. p5.jsの重複インスタンス作成
- **現象**: p5インスタンスの削除が不完全
- **影響**: 古いcanvasが残存し、新しいcanvasと重複表示
- **確認**: DOM上で`<canvas id="defaultCanvas0">`が複数存在

### 4. useEffectの依存配列問題
- **現象**: 依存配列に含まれるpropsの変更で新しいp5インスタンスが作成
- **影響**: `vibe`などのpropsが変更される度に新しいcanvasが作成される

## 実装した解決策

### 解決策1: React StrictMode無効化
```javascript
// next.config.js
const nextConfig = {
  reactStrictMode: false, // 開発環境での重複レンダリングを防止
}
```

### 解決策2: 固定キーによるコンポーネント安定化
```jsx
<P5Fireworks key="single-fireworks" fireworkEvent={fireworkEvent} />
<P5Fireworks key="phone-fireworks" fireworkEvent={phoneFireworkEvent} position="center" />
```

### 解決策3: グローバルインスタンス追跡
```javascript
// グローバル変数でp5インスタンスを追跡
let globalP5Instance: p5 | null = null;

// 既存インスタンスの強制削除
if (globalP5Instance) {
  globalP5Instance.remove();
  globalP5Instance = null;
}
```

### 解決策4: Canvas全削除 + 遅延作成
```javascript
// 既存のcanvasを全削除
const allCanvases = document.querySelectorAll('canvas');
allCanvases.forEach(canvas => canvas.remove());

// 100ms遅延でcanvas作成（React重複レンダリング回避）
setTimeout(() => {
  p5InstanceRef.current = new p5(sketch);
  globalP5Instance = p5InstanceRef.current;
}, 100);
```

### 解決策5: マウント状態管理
```javascript
const mountedRef = useRef(false);

useEffect(() => {
  if (mountedRef.current || !containerRef.current) return;
  mountedRef.current = true;
  // canvas作成処理
}, []);
```

## 影響範囲

### 修正対象ファイル
- `/mobile/next.config.js` - 新規作成
- `/mobile/components/P5Fireworks.tsx` - 大幅修正
- `/mobile/app/display/page.tsx` - key追加
- `/mobile/app/phone/page.tsx` - key追加

### 修正内容
1. React StrictMode無効化
2. グローバルp5インスタンス管理
3. canvas全削除 + 遅延作成
4. 固定keyでコンポーネント安定化
5. マウント状態追跡

## 結果

- **期待**: 1つのcanvasのみ表示
- **確認方法**: ブラウザ開発者ツールでcanvas要素数をチェック
- **フォールバック**: 問題が続く場合はThree.jsや純粋Canvas APIへの移行を検討

## 今後の対策

1. **本番環境での検証**: StrictMode無効化の影響確認
2. **代替ライブラリ検討**: p5.js以外の描画ライブラリ
3. **パフォーマンス監視**: canvas重複によるメモリリーク監視

## 教訓

- p5.jsはSSRと相性が悪く、慎重な初期化が必要
- React StrictModeとDOM操作ライブラリの組み合わせは注意が必要
- dynamic importのloading状態も重複レンダリングの原因となる
- グローバル状態管理でDOM要素の重複を防止する必要がある