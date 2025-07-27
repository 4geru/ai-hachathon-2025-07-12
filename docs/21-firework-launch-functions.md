# 花火打ち上げ関数ガイド

## 概要
Sky Canvasアプリケーションにおける花火の打ち上げと音声再生を制御する関数の詳細説明とアーキテクチャ解説です。

## 主要な花火打ち上げ関数

### 1. playFireworkLaunchSound() - ヒュー音再生

**場所**: `mobile/app/display/page.tsx:254-287`

**目的**: 花火発射時のヒュー音（sounds_launch.mp3）を再生

```typescript
const playFireworkLaunchSound = async () => {
  // 前提条件チェック
  if (!audioEnabled || !audioCtxRef.current || !launchBufferRef.current) {
    console.log('ヒュー音再生スキップ - 音声が無効またはバッファ未準備');
    return;
  }

  const ctx = audioCtxRef.current;
  
  // AudioContext状態確認
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
  
  try {
    // Web Audio API で sounds_launch.mp3 を再生
    const audioSource = ctx.createBufferSource();
    const volumeControl = ctx.createGain();
    
    audioSource.buffer = launchBufferRef.current;
    volumeControl.gain.setValueAtTime(1.5, ctx.currentTime); // 音量設定
    
    // 音声ルーティング: 音源 → 音量調整 → スピーカー
    audioSource.connect(volumeControl);
    volumeControl.connect(ctx.destination);
    
    // 再生開始
    audioSource.start(ctx.currentTime);
    console.log('ヒュー音再生開始 (sounds_launch.mp3)');
    
  } catch (error) {
    console.error('ヒュー音再生エラー:', error);
  }
};
```

**特徴**:
- **音量**: 1.5倍で確実に聞こえるように調整
- **タイミング**: 花火の視覚的発射と完全同期
- **音声ファイル**: `/public/sounds_launch.mp3` (2秒, 48kHz, ステレオ)

### 2. playFireworkExplosionSound() - 爆発音再生

**場所**: `mobile/app/display/page.tsx:228-259`

**目的**: 花火爆発時の爆発音（sounds_explosion.mp3）を再生

```typescript
const playFireworkExplosionSound = () => {
  // 前提条件チェック
  if (!audioEnabled || !audioCtxRef.current || !explosionBufferRef.current) {
    console.log('爆発音再生スキップ - 音声が無効またはバッファ未準備');
    return;
  }

  const ctx = audioCtxRef.current;
  const buffer = explosionBufferRef.current;
  
  // 視覚的爆発との同期調整
  const visualFrameLag = 1 / 60; // 1フレーム分の遅延（約16ms）
  const audioOffset = Math.max(0, peakOffsetRef.current - visualFrameLag);

  try {
    // 爆発音を複数回重ねて迫力を演出
    for (let i = 0; i < explosionRepeats; i++) {
      const audioSource = ctx.createBufferSource();
      audioSource.buffer = buffer;
      audioSource.connect(ctx.destination);
      
      // 少しずつ時間をずらして重厚感を演出
      const startTime = ctx.currentTime + (i * explosionRepeatGap);
      audioSource.start(startTime, audioOffset);
    }
    
    console.log(`爆発音再生開始 (${explosionRepeats}回重ね, オフセット: ${audioOffset.toFixed(3)}s)`);
    
  } catch (error) {
    console.error('爆発音再生エラー:', error);
  }
};
```

**特徴**:
- **重ね再生**: 2回重ねて迫力を演出
- **同期調整**: 視覚的爆発と120ms精度で同期
- **音声ファイル**: `/public/sounds_explosion.mp3` (2.008秒, 48kHz, ステレオ)

## 花火打ち上げフロー

### 1. 花火イベント受信
```
スマートフォン操作 → Supabase → DisplayPage
```

### 2. 花火作成とヒュー音再生
```
P5Fireworks.useEffect → fireworkLaunched イベント発行 → playFireworkLaunchSound()
```

**実装場所**: `mobile/components/P5Fireworks.tsx:261-283`

```typescript
useEffect(() => {
  if (fireworkEvent && fireworkEvent.id !== lastEventId.current && p5Instance.current) {
    const p = p5Instance.current;
    const startX = position === 'center' ? p.width / 2 : p.random(p.width * 0.2, p.width * 0.8);
    const startY = p.height - 50;
    
    console.log('New firework creating:', fireworkEvent.id);
    
    // 花火作成と同時にヒュー音イベントを発行（視覚的発射と完全同期）
    window.dispatchEvent(new CustomEvent('fireworkLaunched', {
      detail: { 
        id: `launch-${fireworkEvent.id}`,
        x: startX, 
        y: startY
      }
    }));
    
    // 花火オブジェクトを作成
    fireworks.current.push(new Firework(p, startX, startY, fireworkEvent.vibe, fireworkEvent.audioDuration));
    lastEventId.current = fireworkEvent.id;
  }
}, [fireworkEvent, position]);
```

### 3. 花火爆発と爆発音再生
```
Firework.update() → fireworkExploded イベント発行 → playFireworkExplosionSound()
```

**実装場所**: `mobile/components/P5Fireworks.tsx:152-164`

```typescript
if (this.firework.vel.y >= 0) { // 花火が頂点に到達
  this.explode(this.firework.pos.x, this.firework.pos.y, this.hue);
  this.exploded = true;
  
  // 爆発タイミングで音声再生イベントを発行
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

## イベントリスナー設定

### ヒュー音イベントリスナー
**場所**: `mobile/app/display/page.tsx:311-316`

```typescript
useEffect(() => {
  window.addEventListener('fireworkLaunched', playFireworkLaunchSound);
  return () => {
    window.removeEventListener('fireworkLaunched', playFireworkLaunchSound);
  };
}, [audioEnabled]);
```

### 爆発音イベントリスナー
**場所**: `mobile/app/display/page.tsx:262-267`

```typescript
useEffect(() => {
  window.addEventListener('fireworkExploded', playFireworkExplosionSound);
  return () => {
    window.removeEventListener('fireworkExploded', playFireworkExplosionSound);
  };
}, [audioEnabled]);
```

## 音声ファイル仕様

### sounds_launch.mp3 (ヒュー音)
- **ファイルサイズ**: 32,876 bytes
- **再生時間**: 2.0秒
- **サンプルレート**: 48,000 Hz
- **チャンネル数**: 2 (ステレオ)
- **音量**: 1.5倍に増幅

### sounds_explosion.mp3 (爆発音)
- **ファイルサイズ**: 32,876 bytes
- **再生時間**: 2.008秒
- **サンプルレート**: 48,000 Hz
- **チャンネル数**: 2 (ステレオ)
- **重ね再生**: 2回、0.12秒間隔

## テスト機能

### テストボタン実装
**場所**: `mobile/app/display/page.tsx:486-514`

```typescript
// ヒュー音のみテスト
<button onClick={() => playFireworkLaunchSound()}>
  ヒュー音のみ
</button>

// 爆発音のみテスト  
<button onClick={() => playFireworkExplosionSound()}>
  爆発音のみ
</button>

// 完全な花火テスト
<button onClick={() => setFireworkEvent({...})}>
  完全テスト
</button>
```

## 設定パラメータ

| パラメータ | 値 | 説明 |
|-----------|-----|------|
| `explosionSyncDelay` | 120ms | 爆発同期遅延時間 |
| `explosionRepeats` | 2 | 爆発音の重ね回数 |
| `explosionRepeatGap` | 0.12秒 | 重ね再生の間隔 |
| `launchVolume` | 1.5 | ヒュー音の音量倍率 |

## トラブルシューティング

### ヒュー音が聞こえない場合
1. `audioEnabled` が `true` か確認
2. `launchBufferRef.current` にバッファが読み込まれているか確認
3. ブラウザの自動再生ポリシーを確認
4. コンソールログでエラーメッセージを確認

### 爆発音が遅れる場合
1. `explosionSyncDelay` の値を調整
2. デバイス性能による遅延を考慮
3. `peakOffsetRef.current` の値を確認

### デバッグログ例
```
New firework creating: test-1643723400000
ヒュー音再生開始 (sounds_launch.mp3)
爆発音再生開始 (2回重ね, オフセット: 0.021s)
```

## 依存関係

### Web Audio API
- `AudioContext`: 音声コンテキスト管理
- `AudioBuffer`: 音声データバッファ
- `AudioBufferSourceNode`: 音声再生ノード
- `GainNode`: 音量制御ノード

### React Hook
- `useEffect`: イベントリスナー管理
- `useRef`: 音声バッファ参照管理

### カスタムイベント
- `fireworkLaunched`: 花火発射イベント
- `fireworkExploded`: 花火爆発イベント

## まとめ

Sky Canvasの花火打ち上げシステムは、視覚的エフェクトと音声が完全に同期した高品質な体験を提供します。Web Audio APIを活用した精密な音声制御により、リアルタイムな花火体験を実現しています。