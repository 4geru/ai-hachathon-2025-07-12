'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Firework, { ExplosionType } from '../../components/Fireworks'; // ExplosionTypeをインポート
import FireworkLauncher from '../../components/FireworkLauncher';
import { useState, useCallback } from 'react';

export default function DisplayPage() {
  const [fireworks, setFireworks] = useState<Array<{
    id: string;
    position: [number, number, number];
    explosionType?: ExplosionType; // 追加
    baseColor?: [number, number, number]; // 追加
  }>>([]);

  // 花火が破裂した際に呼ばれるコールバック
  const handleFireworkExplode = useCallback((fireId: string) => {
    // 花火がフェードアウトしたらリストから削除
    setFireworks((prevFireworks) => prevFireworks.filter((fw) => fw.id !== fireId));
  }, []);

  // 新しい花火をトリガーする関数
  const triggerFirework = useCallback(() => {
    const id = Date.now().toString();
    const x = (Math.random() - 0.5) * 10;
    const z = (Math.random() - 0.5) * 10;
    const types: ExplosionType[] = ['sphere', 'fountain', 'star', 'custom', 'ring']; // 'ring'を追加
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    // ランダムな色を生成 (RGB)
    const randomColor: [number, number, number] = [
      Math.random(),
      Math.random(),
      Math.random()
    ];

    setFireworks((prevFireworks) => [...prevFireworks, { 
      id,
      position: [x, -5, z],
      explosionType: randomType,
      baseColor: randomColor
    }]);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <FireworkLauncher onLaunch={triggerFirework} />
      <Canvas camera={{ position: [0, 0, 15], fov: 75 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        {fireworks.map((fw) => (
          <Firework
            key={fw.id}
            fireId={fw.id}
            initialPosition={fw.position}
            onExplode={handleFireworkExplode}
            explosionType={fw.explosionType} // 追加
            baseColor={fw.baseColor} // 追加
          />
        ))}
        <OrbitControls />
      </Canvas>
    </div>
  );
} 