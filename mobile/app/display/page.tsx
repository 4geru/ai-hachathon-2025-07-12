'use client';

import P5Fireworks from '@/components/P5Fireworks';
import { useEffect, useRef, useState } from 'react'; // useEffect, useRef, useState をインポート
import { supabase } from '@/utils/supabase'; // Supabaseクライアントをインポート

export default function DisplayPage() {
  const [fireworkTrigger, setFireworkTrigger] = useState(0);
  const lastTriggerTime = useRef(0);

  useEffect(() => {
    const fetchAccelerationData = async () => {
      try {
        const response = await fetch('/api/firework-data');
        const data = await response.json();
        
        if (data.acceleration && data.acceleration.y !== null) {
          const currentTime = Date.now();
          // Y軸の加速度が閾値を超え、かつ前回のトリガーから十分な時間が経過している場合
          if (data.acceleration.y > 10 && (currentTime - lastTriggerTime.current > 1000)) { // 加速度が10以上、1000ms間隔に調整
            setFireworkTrigger(prev => prev + 1); // 花火をトリガーするための状態を更新
            lastTriggerTime.current = currentTime;
            console.log("Firework triggered by acceleration:", data.acceleration.y);

            // Supabaseにレコードを追加
            const { error } = await supabase
              .from('firework_events')
              .insert({
                device_id: 'mobile-display', // 仮のデバイスID
                tilt_x: data.acceleration.x,
                tilt_y: data.acceleration.y,
                tilt_z: data.acceleration.z,
                firework_type: 'p5-default', // 仮の花火タイプ
                intensity: data.acceleration.y, // Y軸の加速度を強度として利用
                metadata: {},
              });

            if (error) {
              console.error("Error inserting data into Supabase:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching acceleration data:", error);
      }
    };

    const intervalId = setInterval(fetchAccelerationData, 100); // 100msごとに加速度データをフェッチ

    return () => clearInterval(intervalId);
  }, []); // 空の依存配列で初回のみ実行

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      {/* fireworkTrigger の値をキーとして P5Fireworks を再マウントすることで花火をトリガー */}
      <P5Fireworks key={fireworkTrigger} />
    </main>
  );
} 