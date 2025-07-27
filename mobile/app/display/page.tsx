'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/utils/supabase';
import dynamic from 'next/dynamic';

// P5Fireworksを動的にインポートしてSSRを無効化
const P5Fireworks = dynamic(() => import('@/components/P5Fireworks'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-black flex items-center justify-center text-white">Loading fireworks...</div>
});

// 仕様書とバックエンドに合わせた統一的な型定義
interface TiltData {
  alpha: number;
  beta: number;
  gamma: number;
  timestamp: number;
}

interface GestureData {
  type: 'flick' | 'swing';
  direction: 'up' | 'down' | 'left' | 'right';
  intensity: number;
  timestamp: number;
}

interface FireworkEvent {
  id: string;
  type: 'tilt' | 'gesture';
  data: TiltData | GestureData;
  userId: string;
  deviceType: string;
  timestamp: number;
  vibe: {
    color: string;
    size: number;
    pattern: string;
    seed: number;
  };
}

// Supabaseから受け取るペイロードの型
interface FireworkEventPayload {
  id: string;
  user_id: string;
  event_type: 'tilt' | 'gesture';
  event_data: TiltData | GestureData;
  vibe: {
    color: string;
    size: number;
    pattern: string;
    seed: number;
  };
  created_at: string;
}

export default function DisplayPage() {
  const [lastFireworkEvent, setLastFireworkEvent] = useState<FireworkEvent | null>(null);
  const [fireworkEvent, setFireworkEvent] = useState<{
    id: string;
    vibe: FireworkEvent['vibe'];
    timestamp: number;
    audioDuration?: number;
  } | null>(null);
  const lastTriggerTime = useRef(0);
  // Web Audio API 用の参照
  const audioCtxRef = useRef<AudioContext | null>(null);
  const launchBufferRef = useRef<AudioBuffer | null>(null);
  const explosionBufferRef = useRef<AudioBuffer | null>(null);
  const peakOffsetRef = useRef<number>(0);
  const explosionSyncDelay = 120; // 視覚的爆発との同期のための遅延時間（ms）
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [phoneUrl, setPhoneUrl] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  // ========= 画面スリープ防止 (Wake Lock) =========
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          wakeLockRef.current?.addEventListener('release', () => {
            console.log('Wake Lock released');
          });
          console.log('Wake Lock acquired');
        }
      } catch (err) {
        console.error('Wake Lock error:', err);
      }
    };

    requestWakeLock();

    // タブが非表示→再表示になった際に再取得
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, []);
  const explosionRepeats = 2; // 爆発音の繰り返し回数
  const explosionRepeatGap = 0.12; // 繰り返し間隔（秒）

  // 現在のホスト名を取得してphone URLを生成
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentUrl = window.location.origin;
      setPhoneUrl(`${currentUrl}/phone`);
    }
  }, []);

  // 音声を有効にする関数
  const enableAudio = async () => {
    try {
      console.log('音声有効化を試行中...');
      
      /* ---------------- Web Audio 初期化 ---------------- */
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      
      // AudioContext をユーザー操作内で resume
      if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
      }
      
      if (audioCtxRef.current && (!launchBufferRef.current || !explosionBufferRef.current)) {
        console.log('音声ファイルの読み込み開始...');
        
        // launch 音源
        try {
          console.log('sounds_launch.mp3 の読み込み開始');
          const launchRes = await fetch('/sounds_launch.mp3');
          if (!launchRes.ok) {
            throw new Error(`HTTP ${launchRes.status}: ${launchRes.statusText}`);
          }
          const launchArr = await launchRes.arrayBuffer();
          console.log('sounds_launch.mp3 ArrayBuffer取得完了, size:', launchArr.byteLength);
          launchBufferRef.current = await audioCtxRef.current.decodeAudioData(launchArr);
          console.log('sounds_launch.mp3 デコード完了:', {
            duration: launchBufferRef.current.duration,
            sampleRate: launchBufferRef.current.sampleRate,
            channels: launchBufferRef.current.numberOfChannels
          });
        } catch (error) {
          console.error('sounds_launch.mp3 読み込みエラー:', error);
        }

        // explosion 音源
        try {
          console.log('sounds_explosion.mp3 の読み込み開始');
          const expRes = await fetch('/sounds_explosion.mp3');
          if (!expRes.ok) {
            throw new Error(`HTTP ${expRes.status}: ${expRes.statusText}`);
          }
          const expArr = await expRes.arrayBuffer();
          console.log('sounds_explosion.mp3 ArrayBuffer取得完了, size:', expArr.byteLength);
          const decoded = await audioCtxRef.current.decodeAudioData(expArr);
          explosionBufferRef.current = decoded;
          console.log('sounds_explosion.mp3 デコード完了:', {
            duration: decoded.duration,
            sampleRate: decoded.sampleRate,
            channels: decoded.numberOfChannels
          });
        } catch (error) {
          console.error('sounds_explosion.mp3 読み込みエラー:', error);
        }
        
        // ピーク検出（簡易 RMS） - explosionBufferRef.currentが存在する場合のみ
        if (explosionBufferRef.current) {
          try {
            const ch = explosionBufferRef.current.getChannelData(0);
            let maxRms = 0;
            let peakSample = 0;
            const block = 1024;
            for (let i = 0; i < ch.length; i += block) {
              let sum = 0;
              for (let j = 0; j < block && i + j < ch.length; j++) {
                const v = ch[i + j];
                sum += v * v;
              }
              const rms = Math.sqrt(sum / block);
              if (rms > maxRms) {
                maxRms = rms;
                peakSample = i;
              }
            }
            peakOffsetRef.current = peakSample / explosionBufferRef.current.sampleRate;
            console.log('爆発音ピークオフセット(sec):', peakOffsetRef.current);
          } catch (error) {
            console.error('ピーク検出エラー:', error);
            peakOffsetRef.current = 0;
          }
        }
      }

      // 全て準備完了後に audioEnabled
      setAudioEnabled(true);
      console.log('音声が有効になりました');
    } catch (error) {
      console.error('音声有効化エラー:', error);
      if (error instanceof Error) {
        console.error('エラー詳細:', error.name, error.message);
      }
    }
  };




  /**
   * 花火爆発音を再生する関数
   * sounds_explosion.mp3 を Web Audio API で再生（同期調整付き）
   */
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

  // 花火爆発イベントを監視
  useEffect(() => {
    window.addEventListener('fireworkExploded', playFireworkExplosionSound);
    return () => {
      window.removeEventListener('fireworkExploded', playFireworkExplosionSound);
    };
  }, [audioEnabled]);

  /**
   * 花火打ち上げ音（ヒュー音）を再生する関数
   * sounds_launch.mp3 を Web Audio API で再生
   */
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

  /**
   * 完全な花火打ち上げ関数
   * ヒュー音再生 + 花火イベント作成を統合
   */
  const launchCompleteFirework = async (eventData?: {
    id?: string;
    vibe?: {
      color: string;
      size: number;
      pattern: string;
      seed: number;
    };
    clickPosition?: { x: number; y: number }; // クリック位置
  }) => {
    console.log('=== 完全花火打ち上げ開始 ===');
    
    // デフォルト値の設定
    const fireworkId = eventData?.id || `complete-${Date.now()}`;
    const defaultVibe = {
      color: '#4ecdc4',
      size: 50,
      pattern: 'burst',
      seed: Math.random()
    };
    const vibe = eventData?.vibe || defaultVibe;

    try {
      // 1. ヒュー音を即座に再生
      await playFireworkLaunchSound();
      
      // 2. 花火イベントを作成（視覚的な花火打ち上げ）
      setFireworkEvent({
        id: fireworkId,
        vibe: vibe,
        timestamp: Date.now(),
        audioDuration: 4,
        clickPosition: eventData?.clickPosition // クリック位置を渡す
      });
      
      console.log('完全花火打ち上げ完了:', fireworkId);
      
    } catch (error) {
      console.error('完全花火打ち上げエラー:', error);
    }
  };

  // fireworkEventの自動再生は削除 - P5Fireworks側のfireworkLaunchedイベントのみでヒュー音を再生

  // クリック花火打ち上げイベントを監視
  useEffect(() => {
    const handleClickLaunch = async (event: CustomEvent) => {
      const { id, vibe, x, y } = event.detail;
      console.log('クリック花火打ち上げ:', id, 'at position:', x, y);
      await launchCompleteFirework({ 
        id, 
        vibe, 
        clickPosition: { x, y } 
      });
    };

    window.addEventListener('fireworkClickLaunch', handleClickLaunch as EventListener);
    return () => {
      window.removeEventListener('fireworkClickLaunch', handleClickLaunch as EventListener);
    };
  }, [audioEnabled]);

  useEffect(() => {
    console.log('Setting up Supabase Realtime subscription...');
    setConnectionStatus('connecting');
    let retryCount = 0;
    const maxRetries = 3;
    
    // Supabase Realtimeでfirework_eventsテーブルの変更を監視
    const channel = supabase
      .channel('firework_events_channel', {
        config: {
          presence: {
            key: 'user-1',
          },
          broadcast: { self: true },
          // @ts-expect-error supabase-js 型定義に未反映のオプション
          postgres_changes: { enabled: true }
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'firework_events'
        },
        async (payload) => {
          console.log('New firework event received:', payload);
          const newEventPayload = payload.new as FireworkEventPayload;

          // ペイロード（スネークケース）をアプリケーション内の型（キャメルケース）に変換
          const newEvent: FireworkEvent = {
            id: newEventPayload.id,
            type: newEventPayload.event_type,
            data: newEventPayload.event_data,
            userId: newEventPayload.user_id,
            deviceType: 'unknown', // ペイロードにないのでデフォルト値を設定
            timestamp: Date.now(), // DBのcreated_atではなく受信時のタイムスタンプを使用
            vibe: newEventPayload.vibe,
          };
          
          // 完全な花火打ち上げを実行
          await launchCompleteFirework({
            id: newEvent.id,
            vibe: newEvent.vibe
          });
          setLastFireworkEvent(newEvent);
          
          console.log('Firework event created:', {
            id: newEvent.id,
            userId: newEvent.userId,
            type: newEvent.type,
            vibe: newEvent.vibe,
            data: newEvent.data
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
        if (status === 'SUBSCRIBED') {
          console.log('✅ Supabase Realtime connected successfully');
          setConnectionStatus('connected');
          retryCount = 0; // Reset retry count on successful connection
        } else if (status === 'CHANNEL_ERROR') {
          retryCount++;
          if (retryCount >= maxRetries) {
            console.warn('⚠️ Supabase Realtime connection failed after', maxRetries, 'attempts - using fallback polling only');
            setConnectionStatus('error');
          } else {
            console.warn('⚠️ Supabase Realtime connection failed, retrying...', retryCount, '/', maxRetries);
            setConnectionStatus('connecting');
          }
        } else if (status === 'TIMED_OUT') {
          console.warn('⚠️ Supabase Realtime timed out - using fallback polling only');
          setConnectionStatus('disconnected');
        } else if (status === 'CLOSED') {
          console.warn('⚠️ Supabase Realtime connection closed - using fallback polling only');
          setConnectionStatus('disconnected');
        }
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
              pattern: 'default',
              seed: Math.random()
            };
            
            const fallbackId = `fallback-${currentTime}`;
            await launchCompleteFirework({
              id: fallbackId,
              vibe: fallbackVibe
            });
            lastTriggerTime.current = currentTime;
            console.log("Firework triggered by polling (fallback):", data.acceleration.y);
          }
        }
      } catch (error) {
        console.error('Error fetching acceleration data:', error);
      }
    };

    const intervalId = setInterval(fetchAccelerationData, 2000);

    return () => {
      // supabase.removeChannel(channel);
      channel.unsubscribe();
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden" onClick={enableAudio}>
      <P5Fireworks fireworkEvent={fireworkEvent} />
      <div className="absolute top-4 left-4 text-white bg-black bg-opacity-50 p-4 rounded-lg">
        <h1 className="text-3xl font-bold">Sky Canvas</h1>
        <p>スマートフォンを傾けて、あなただけの花火を打ち上げよう！</p>
        <div className="mt-4 p-4 border border-gray-600 rounded-lg">
          <p className="text-lg">操作用URL:</p>
          {phoneUrl ? (
            <a href={phoneUrl} target="_blank" rel="noopener noreferrer" className="text-xl text-cyan-400 hover:underline">
              {phoneUrl}
            </a>
          ) : (
            <p>URLを生成中...</p>
          )}
        </div>
        {!audioEnabled && (
          <div className="mt-4 p-4 bg-yellow-900 border border-yellow-600 rounded-lg">
            <p className="font-bold">画面をクリックして音声を有効にしてください</p>
          </div>
        )}
        {audioEnabled && (
          <div className="mt-4 p-4 bg-green-900 border border-green-600 rounded-lg">
            <p className="font-bold text-green-200">🎵 音声システム有効</p>
            <p className="text-green-300 text-sm">Web Audio API使用</p>
            <p className="text-green-300 text-sm">爆発同期遅延: {explosionSyncDelay}ms</p>
            <p className="text-green-300 text-sm">ヒュー音: sounds_launch.mp3</p>
            <div className="mt-2 space-x-2 flex flex-wrap gap-2">
              <button 
                onClick={() => {
                  console.log('「ヒュー音のみ」ボタンがクリックされました');
                  playFireworkLaunchSound();
                }}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded text-sm"
              >
                ヒュー音のみ
              </button>
              <button 
                onClick={() => {
                  console.log('「爆発音のみ」ボタンがクリックされました');
                  playFireworkExplosionSound();
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-3 rounded text-sm"
              >
                爆発音のみ
              </button>
              <button 
                onClick={() => {
                  console.log('「完全テスト」ボタンがクリックされました');
                  // 完全な花火テスト（統合関数使用）
                  launchCompleteFirework({
                    id: `test-${Date.now()}`,
                    vibe: { color: '#4ecdc4', size: 50, pattern: 'burst', seed: Math.random() }
                  });
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded text-sm"
              >
                完全テスト
              </button>
            </div>
          </div>
        )}
        
        {/* 接続状態表示 */}
        <div className="mt-4 p-3 bg-gray-900 border border-gray-600 rounded-lg">
          <div className="flex items-center space-x-2">
            {connectionStatus === 'connected' && (
              <>
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-200 text-sm">リアルタイム接続中</span>
              </>
            )}
            {connectionStatus === 'connecting' && (
              <>
                <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-yellow-200 text-sm">接続中...</span>
              </>
            )}
            {(connectionStatus === 'disconnected' || connectionStatus === 'error') && (
              <>
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-orange-200 text-sm">ポーリングモード</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="absolute bottom-4 left-4 text-white text-xs bg-black bg-opacity-50 p-2 rounded">
        {lastFireworkEvent && (
          <div>
            <p>最新の花火: {lastFireworkEvent.userId} さんが {lastFireworkEvent.type} で発火</p>
            <p>
              色: {lastFireworkEvent.vibe.color} |
              サイズ: {lastFireworkEvent.vibe.size.toFixed(1)} |
              パターン: {lastFireworkEvent.vibe.pattern}
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 