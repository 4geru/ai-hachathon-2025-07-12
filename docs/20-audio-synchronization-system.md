# 花火音声同期システム実装ガイド

## 概要
Sky Canvasアプリケーションにおける花火の視覚的爆発と音声の完璧な同期を実現するシステムの実装手順とアーキテクチャについて説明します。

## 実装内容

### 1. 音声プールシステム
複数の花火が同時に爆発した際の音声重複再生を可能にするため、音声プールアーキテクチャを採用しています。

#### 主要コンポーネント
- **音声プールサイズ**: 5個の同時再生対応
- **音声ファイル**: `/public/sounds.mp3` (4.008秒)
- **音量設定**: 30% (複数再生時の音割れ防止)

#### コード実装場所
```typescript
// mobile/app/display/page.tsx
const audioPool = useRef<HTMLAudioElement[]>([]);
const maxConcurrentSounds = 5;
```

### 2. 爆発タイミング同期システム

#### 2.1 爆発検出
花火の物理的な爆発タイミングを正確に検出します。

**実装場所**: `mobile/components/P5Fireworks.tsx:152-164`

```typescript
if (this.firework.vel.y >= 0) { // 速度がゼロになった瞬間
  this.explode(this.firework.pos.x, this.firework.pos.y, this.hue);
  this.exploded = true;
  
  // 爆発イベント発行
  window.dispatchEvent(new CustomEvent('fireworkExploded', {
    detail: { 
      id: `explosion-${Date.now()}-${Math.random()}`,
      x: this.firework.pos.x, 
      y: this.firework.pos.y,
      hue: this.hue
    }
  }));
}
```

#### 2.2 音声同期遅延
視覚的な爆発エフェクトの展開に合わせて音声を遅延再生します。

**設定値**: `explosionSyncDelay = 120ms`

**実装場所**: `mobile/app/display/page.tsx:283-287`

```typescript
if (audioEnabled) {
  // 視覚的な爆発エフェクトとの同期のための遅延
  playFireworkSound(explosionSyncDelay);
  console.log(`爆発音再生予約: ${id} (${explosionSyncDelay}ms遅延)`);
}
```

### 3. 高精度タイミング制御

#### 3.1 requestAnimationFrame使用
従来の`setTimeout`ではなく、`requestAnimationFrame`と`performance.now()`を組み合わせて高精度な遅延制御を実現。

**実装場所**: `mobile/app/display/page.tsx:190-202`

```typescript
if (delay > 0) {
  const startTime = performance.now();
  const waitForPreciseDelay = () => {
    if (performance.now() - startTime >= delay) {
      playFireworkSound(0);
    } else {
      requestAnimationFrame(waitForPreciseDelay);
    }
  };
  requestAnimationFrame(waitForPreciseDelay);
  return;
}
```

#### 3.2 利点
- **フレーム精度**: 約16ms精度での制御
- **非ブロッキング**: UIをブロックしない
- **ブラウザ最適化**: ブラウザのレンダリングサイクルと同期

### 4. 音声プール管理

#### 4.1 初期化プロセス
1. メイン音声要素でメタデータ取得
2. 音声の長さ確定後にプール作成
3. 各音声要素にイベントリスナー追加

**実装場所**: `mobile/app/display/page.tsx:163-180`

#### 4.2 音声要素選択アルゴリズム
```typescript
const getAvailableAudio = (): HTMLAudioElement | null => {
  // 1. 再生中でない音声要素を探す
  for (const audio of audioPool.current) {
    if (audio.paused || audio.ended) {
      return audio;
    }
  }
  
  // 2. 全て使用中の場合、最古の音声を停止して再利用
  if (audioPool.current.length > 0) {
    const oldestAudio = audioPool.current[0];
    oldestAudio.pause();
    oldestAudio.currentTime = 0;
    return oldestAudio;
  }
  
  return null;
};
```

### 5. ユーザーインターフェース

#### 5.1 音声状態表示
- 音声プール状態: "音声プール: 5個同時再生対応"
- 同期設定表示: "爆発同期遅延: 120ms"

#### 5.2 テスト機能
- **即座音声テスト**: 遅延なしの音声再生
- **遅延音声テスト**: 実際の花火と同じ遅延での音声再生

**実装場所**: `mobile/app/display/page.tsx:457-477`

### 6. パフォーマンス最適化

#### 6.1 メモリ効率化
```typescript
audio.addEventListener('ended', () => {
  audio.currentTime = 0; // 再生終了時にリセット
});
```

#### 6.2 エラーハンドリング
- 音声権限エラーの自動検出
- 静かなエラー処理（コンソールスパム防止）
- 音声無効化の自動実行

### 7. システム設定

#### 7.1 調整可能パラメータ
| パラメータ | 値 | 説明 |
|-----------|-----|------|
| `maxConcurrentSounds` | 5 | 同時再生可能音声数 |
| `explosionSyncDelay` | 120ms | 爆発同期遅延時間 |
| `audio.volume` | 0.3 | 音声音量 |

#### 7.2 設定変更手順
1. `mobile/app/display/page.tsx`の定数を変更
2. 必要に応じてUI表示を更新
3. テスト機能で動作確認

### 8. トラブルシューティング

#### 8.1 音声が再生されない場合
1. ブラウザの自動再生ポリシー確認
2. 音声有効化ボタンのクリック
3. コンソールログでエラー確認

#### 8.2 同期がずれる場合
1. `explosionSyncDelay`値の調整
2. デバイス性能による遅延の考慮
3. ネットワーク遅延の影響確認

#### 8.3 デバッグログ
```
音声システムを初期化中...
音声の長さ: 4.008 秒
音声プール初期化完了: 5個の音声要素を作成
爆発音再生予約: explosion-1643723400000-0.123 (120ms遅延)
音声プール再生成功
```

### 9. 今後の拡張可能性

#### 9.1 動的遅延調整
- デバイス性能に基づく自動調整
- ユーザー設定による手動調整
- リアルタイム同期精度測定

#### 9.2 音声効果の多様化
- 花火タイプ別音声
- 距離感による音量調整
- 3D音響効果

#### 9.3 パフォーマンス改善
- Web Audio API活用
- 音声ストリーミング
- より大きな音声プール

## まとめ
本システムにより、花火の視覚的爆発と音声が120ms精度で同期し、複数花火の同時爆発にも対応した高品質な音響体験を提供しています。requestAnimationFrameによる高精度制御と音声プールアーキテクチャにより、パフォーマンスとユーザー体験の両立を実現しています。