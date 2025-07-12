# 花火効果音実装ドキュメント

## 概要
Sky Canvasアプリケーションで、花火が打ち上がるタイミングで効果音を再生し、花火の視覚的な表示と音声の終了タイミングを同期させる機能を実装しました。

## 実装ファイル
- `mobile/app/display/page.tsx` - メインの表示ページ
- `mobile/components/P5Fireworks.tsx` - 花火の描画コンポーネント
- `mobile/public/sounds.mp3` - 効果音ファイル

## 機能概要

### 1. 音声ファイルの管理
- `sounds.mp3`を`mobile/public/`フォルダに配置
- HTML Audio APIを使用して音声を制御
- 音声の事前読み込み（`preload='auto'`）
- 音量を50%に設定

### 2. 音声の長さ動的取得
```typescript
audioRef.current.addEventListener('loadedmetadata', () => {
  if (audioRef.current) {
    setAudioDuration(audioRef.current.duration);
    console.log('音声の長さ:', audioRef.current.duration, '秒');
  }
});
```

### 3. 花火との同期機能
- 音声の長さ（秒）× 50fps = 花火のライフスパン
- 二次爆発は音声の長さの40%で設定
- 花火が完全に消えるタイミングと音声終了タイミングが同期

## 技術仕様

### 音声再生制御
- **再生開始**: 花火イベント発生時に自動再生
- **重複制御**: `currentTime = 0`で音声を最初から再生
- **エラーハンドリング**: 音声再生失敗時のエラー処理

### 同期計算
```typescript
// 音声の長さに基づいてライフスパンを計算（フレームレート50fps）
const baseLifespan = this.audioDuration ? Math.floor(this.audioDuration * 50) : 255;
const lifespan = isSecondary ? Math.floor(baseLifespan * 0.4) : baseLifespan;
```

### データフロー
1. 音声ファイル読み込み → 音声の長さ取得
2. 花火イベント発生 → 音声再生 + 花火生成
3. 花火のライフスパン計算 → 音声の長さに基づく同期
4. 花火消滅と音声終了が同時

## 実装の詳細

### displayページの変更点
- `audioRef`: 音声要素の参照
- `audioDuration`: 音声の長さの状態管理
- `playFireworkSound()`: 音声再生関数
- 花火イベントに`audioDuration`を追加

### P5Fireworksコンポーネントの変更点
- `FireworkVibe`インターフェースに`audioDuration`追加
- `Firework`クラスに音声の長さを保存
- `explode()`メソッドで動的ライフスパン計算
- 二次爆発も音声の長さに基づく調整

## 動作例

### 音声の長さが3秒の場合
- 花火のライフスパン: 150フレーム（3秒×50fps）
- 二次爆発のライフスパン: 60フレーム（150×0.4）

### 音声の長さが5秒の場合
- 花火のライフスパン: 250フレーム（5秒×50fps）
- 二次爆発のライフスパン: 100フレーム（250×0.4）

## 対応する花火イベント

### Supabase Realtimeイベント
```typescript
setFireworkEvent({
  id: newEvent.id,
  vibe: newEvent.vibe,
  timestamp: Date.now(),
  audioDuration: audioDuration
});
```

### フォールバック（ポーリング）イベント
```typescript
setFireworkEvent({
  id: fallbackId,
  vibe: fallbackVibe,
  timestamp: currentTime,
  audioDuration: audioDuration
});
```

## パフォーマンス考慮
- 音声の事前読み込みにより初回再生の遅延を最小化
- 花火のライフスパンを動的に調整することで適切な同期を実現
- フレームレート50fpsでの安定した描画

## 今後の拡張可能性
- 複数の効果音への対応
- 音量調整機能
- 花火の種類に応じた効果音の切り替え
- 音声のフェードイン/フェードアウト効果

## 注意点
- ブラウザの自動再生ポリシーにより、ユーザーの初回インタラクションが必要な場合があります
- 音声ファイルの読み込みに時間がかかる場合、最初の花火では同期が取れない可能性があります
- 複数の花火が短時間で発生した場合、音声が重複して再生される可能性があります

## デバッグ情報
- 音声の長さはコンソールに出力されます
- 花火イベントの生成時に音声の長さも表示されます
- 音声再生エラーもコンソールに出力されます 