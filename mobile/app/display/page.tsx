'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/utils/supabase';
import dynamic from 'next/dynamic';

// P5Fireworksを動的にインポートしてSSRを無効化
const P5Fireworks = dynamic(() => import('@/components/P5Fireworks'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-black flex items-center justify-center text-white">Loading fireworks...</div>
});

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
    audioDuration?: number;
  } | null>(null);
  const lastTriggerTime = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);

  // 音声を有効にする関数
  const enableAudio = async () => {
    if (audioRef.current) {
      try {
        // 音声を一瞬再生してから止める（音声コンテキストを有効化）
        audioRef.current.volume = 0;
        await audioRef.current.play();
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.volume = 0.5;
        setAudioEnabled(true);
        console.log('音声が有効になりました');
      } catch (error) {
        console.error('音声有効化エラー:', error);
      }
    }
  };

  // 音声を再生する関数
  const playFireworkSound = async () => {
    // 音声が有効になっていない場合は早期リターン
    if (!audioEnabled) {
      console.log('音声が有効になっていないため、音声再生をスキップします');
      return;
    }
    
    if (audioRef.current) {
      try {
        audioRef.current.currentTime = 0; // 音声を最初から再生
        await audioRef.current.play();
        console.log('音声再生成功');
      } catch (error) {
        console.error('音声再生エラー:', error);
        // 音声再生に失敗した場合の追加情報
        if (error instanceof Error) {
          console.error('エラーメッセージ:', error.message);
          // 権限エラーの場合は音声を無効化
          if (error.name === 'NotAllowedError') {
            setAudioEnabled(false);
            console.log('音声が自動的に無効化されました。音声を有効にするボタンをクリックしてください。');
          }
        }
      }
    } else {
      console.log('音声ファイルが読み込まれていません');
    }
  };

  // 音声の初期設定
  useEffect(() => {
    audioRef.current = new Audio('/sounds.mp3');
    audioRef.current.volume = 0.5; // 音量を50%に設定
    audioRef.current.preload = 'auto'; // 音声を事前に読み込み
    
    // 音声の長さを取得
    audioRef.current.addEventListener('loadedmetadata', () => {
      if (audioRef.current) {
        setAudioDuration(audioRef.current.duration);
        console.log('音声の長さ:', audioRef.current.duration, '秒');
      }
    });
    
    // 音声の読み込み完了を監視
    audioRef.current.addEventListener('canplaythrough', () => {
      console.log('音声ファイルの読み込み完了');
    });
    
    // 音声読み込みエラーを監視
    audioRef.current.addEventListener('error', (error) => {
      console.error('音声ファイルの読み込みエラー:', error);
    });
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // 花火イベントが発生したときに音声を再生（音声が有効な場合のみ）
  useEffect(() => {
    if (fireworkEvent && audioEnabled) {
      playFireworkSound();
    }
  }, [fireworkEvent, audioEnabled]);

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
        async (payload) => {
          console.log('New firework event received:', payload);
          const newEvent = payload.new as FireworkEventData;
          
          // 花火イベントを設定
          setFireworkEvent({
            id: newEvent.id,
            vibe: newEvent.vibe,
            timestamp: Date.now(),
            audioDuration: audioDuration
          });
          setLastFireworkEvent(newEvent);
          
          console.log('Firework event created:', {
            id: newEvent.id,
            user_id: newEvent.user_id,
            event_type: newEvent.event_type,
            vibe: newEvent.vibe,
            acceleration: newEvent.event_data
          });

          // 花火イベントを表示した後、データベースから削除
          try {
            const { error } = await supabase
              .from('firework_events')
              .delete()
              .eq('id', newEvent.id);

            if (error) {
              console.error('Error deleting firework event:', error);
            } else {
              console.log('Firework event deleted successfully:', newEvent.id);
            }
          } catch (error) {
            console.error('Error during firework event deletion:', error);
          }
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
              size: Math.abs(data.acceleration.y) * 15, // サイズを大きくするため係数を増加
              pattern: 'fountain',
              seed: Math.floor(Math.random() * 1000)
            };
            
            const fallbackId = `fallback-${currentTime}`;
            setFireworkEvent({
              id: fallbackId,
              vibe: fallbackVibe,
              timestamp: currentTime,
              audioDuration: audioDuration
            });
            lastTriggerTime.current = currentTime;
            console.log("Firework triggered by polling (fallback):", data.acceleration.y);
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
  }, [audioDuration]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">Sky Canvas - Display</h1>
        <p className="text-gray-600">スマートフォンを傾けて花火を打ち上げよう！</p>
        
        {/* 音声有効化ボタン */}
        {!audioEnabled && (
          <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800 mb-2">
              🔊 音声を有効にすると、花火の音が聞こえます
            </p>
            <button
              onClick={enableAudio}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
            >
              音声を有効にする
            </button>
          </div>
        )}
        
        {audioEnabled && (
          <div className="mt-4 p-2 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-800">
              🎵 音声が有効になりました
            </p>
          </div>
        )}
        
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