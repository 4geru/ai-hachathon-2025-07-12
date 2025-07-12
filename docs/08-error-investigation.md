# Sky Canvas - エラー調査と解決の検討

## 1. エラーメッセージ

```
THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values. {}
```

このエラーは、Three.js の `BufferGeometry` が持つ `position` 属性に `NaN` (Not a Number) の値が含まれていることを示しています。これは、パーティクルの位置計算中に数値ではない値が生成された場合に発生します。

## 2. 考えられる原因と対策

### 2.1. 初期位置または速度計算での NaN の発生

- **原因**: `initialPosition` や `initialVelocity` の計算、または `useFrame` 内での `position.addScaledVector(velocity, delta)` の計算中に `NaN` が発生している可能性があります。特に `delta` はフレーム間の時間差を表すため、非常に小さい値や、稀に0になることがあります。これにより割り算などが発生した場合に `NaN` が発生する可能性があります。
- **対策**: 計算時に値が有効であるかを確認する、または `delta` の値が極端に小さい場合の処理を考慮する。

### 2.2. パーティクルのライフサイクル管理の問題

- **原因**: パーティクルがリストから削除されるタイミングや、新しいパーティクルが追加されるタイミングで、Three.js のジオメトリの更新が正しく行われていない可能性があります。`useRef` を使用して `positions`, `colors`, `opacities` を管理していますが、これらの配列のサイズが適切にリサイズされていない、または更新フラグが正しく設定されていない可能性があります。
- **対策**: `useEffect` で `particles.length` に応じて配列を初期化するロジックを再確認し、`needsUpdate = true` が確実に設定されているか確認する。

### 2.3. 非同期処理と状態更新の競合

- **原因**: React の `useState` と `useRef` を組み合わせたThree.jsのレンダリングループでは、状態の非同期更新が原因で、古いデータがレンダリングに使われてしまうことがあります。
- **対策**: `useFrame` 内での `setParticles` の呼び出しを減らし、可能な限りミュータブルな `useRef` を介してデータを更新し、最後に `needsUpdate` を設定する方式を検討する。

## 3. 実装の検討

これらの原因を踏まえ、まずは `frontend/components/Fireworks.tsx` の `useFrame` および `useEffect` のロジックを詳細に確認し、数値の安定性とデータ更新のタイミングを改善します。

特に、`delta` が非常に小さい場合にパーティクルの速度が急激に変化しないようにするための処理や、`positions`, `colors`, `opacities` の配列の再生成ロジックの厳密な管理が必要と考えられます。

また、`setParticles` の頻繁な呼び出しがパフォーマンスに影響を与え、レンダリングループと状態管理の間で競合を引き起こしている可能性もあるため、これを最適化します。 