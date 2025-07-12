'use client';

import P5Fireworks from '@/components/P5Fireworks';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/utils/supabase';

interface FireworkEventData {
  id: string;
  user_id: string;
  event_type: string;
  event_data: {
    x: number;
    y: number;
    z: number;
    timestamp: number;
  };
  vibe: {
    color: string;
    size: number;
    pattern: string;
    seed: number;
  };
  created_at: string;
}

export default function DisplayPage() {
  const [lastFireworkEvent, setLastFireworkEvent] = useState<FireworkEventData | null>(null);
  const [fireworkEvent, setFireworkEvent] = useState<{
    id: string;
    vibe: FireworkEventData['vibe'];
    timestamp: number;
  } | null>(null);
  const lastTriggerTime = useRef(0);

  useEffect(() => {
    console.log('Setting up Supabase Realtime subscription...');
    
    // Supabase Realtimeでfirework_eventsテーブルの変更を監視
    const channel = supabase
      .channel('firework_events_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'firework_events'
        },
        (payload) => {
          console.log('New firework event received:', payload);
          const newEvent = payload.new as FireworkEventData;
          
          // 花火イベントを設定
          setFireworkEvent({
            id: newEvent.id,
            vibe: newEvent.vibe,
            timestamp: Date.now()
          });
          setLastFireworkEvent(newEvent);
          
          console.log('Firework event created:', {
            id: newEvent.id,
            user_id: newEvent.user_id,
            event_type: newEvent.event_type,
            vibe: newEvent.vibe,
            acceleration: newEvent.event_data
          });
        }
      )
      .subscribe((status) => {
        console.log('Supabase Realtime subscription status:', status);
      });

    // 既存のポーリング機能も維持（フォールバック用）
    const fetchAccelerationData = async () => {
      try {
        const response = await fetch('/api/firework-data');
        const data = await response.json();
        
        if (data.acceleration && data.acceleration.y !== null) {
          const currentTime = Date.now();
          // Y軸の加速度が閾値を超え、かつ前回のトリガーから十分な時間が経過している場合
          if (data.acceleration.y > 10 && (currentTime - lastTriggerTime.current > 1000)) {
            const fallbackVibe = {
              color: '#4ecdc4',
              size: Math.abs(data.acceleration.y) * 8,
              pattern: 'fountain',
              seed: Math.floor(Math.random() * 1000)
            };
            
            const fallbackId = `fallback-${currentTime}`;
            setFireworkEvent({
              id: fallbackId,
              vibe: fallbackVibe,
              timestamp: currentTime
            });
            lastTriggerTime.current = currentTime;
            console.log("Firework triggered by polling (fallback):", data.acceleration.y);

            // Supabaseに正しい形式でレコードを追加（フォールバック用）
            const fireworkEventData = {
              user_id: 'mobile-display-user',
              event_type: 'tilt',
              event_data: {
                x: data.acceleration.x,
                y: data.acceleration.y,
                z: data.acceleration.z,
                timestamp: currentTime
              },
              vibe: fallbackVibe
            };

            const { error } = await supabase
              .from('firework_events')
              .insert(fireworkEventData);

            if (error) {
              console.error("Error inserting firework event into Supabase:", error);
            } else {
              console.log("Firework event successfully sent to Supabase (fallback):", fireworkEventData);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching acceleration data:", error);
      }
    };

    const intervalId = setInterval(fetchAccelerationData, 100);

    // クリーンアップ
    return () => {
      console.log('Cleaning up Supabase Realtime subscription...');
      supabase.removeChannel(channel);
      clearInterval(intervalId);
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">Sky Canvas - Display</h1>
        <p className="text-gray-600">スマートフォンを傾けて花火を打ち上げよう！</p>
        {lastFireworkEvent && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-700">
              最新の花火: {lastFireworkEvent.user_id} さんが {lastFireworkEvent.event_type} で発火
            </p>
            <p className="text-xs text-gray-500">
              色: {lastFireworkEvent.vibe.color} | 
              サイズ: {lastFireworkEvent.vibe.size.toFixed(1)} | 
              パターン: {lastFireworkEvent.vibe.pattern}
            </p>
          </div>
        )}
      </div>
      <P5Fireworks fireworkEvent={fireworkEvent} />
    </main>
  );
} 