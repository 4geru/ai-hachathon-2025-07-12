'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/utils/supabase';
import dynamic from 'next/dynamic';
import { QRCodeSVG } from 'qrcode.react';

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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioPool = useRef<HTMLAudioElement[]>([]);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const maxConcurrentSounds = 5; // 同時再生可能な音声数
  const explosionSyncDelay = 120; // 視覚的爆発との同期のための遅延時間（ms）
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [phoneUrl, setPhoneUrl] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');

  // 現在のホスト名を取得してphone URLを生成
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentUrl = window.location.origin;
      setPhoneUrl(`${currentUrl}/phone`);
    }
  }, []);

  // 音声を有効にする関数
  const enableAudio = async () => {
    if (audioRef.current) {
      try {
        console.log('音声有効化を試行中...');
        
        // 音声ファイルの準備状態をチェック
        if (audioRef.current.readyState < 2) {
          console.log('音声ファイルがまだ読み込まれていません');
          // 音声ファイルの読み込みを待つ
          await new Promise((resolve) => {
            audioRef.current!.addEventListener('canplay', resolve, { once: true });
          });
        }

        // 音声を一瞬再生してから止める（音声コンテキストを有効化）
        const originalVolume = audioRef.current.volume;
        audioRef.current.volume = 0.1; // 完全に0にするとブラウザが再生を無視する場合がある
        
        const playPromise = audioRef.current.play();
        await playPromise;
        
        // 少し待ってから停止
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current.volume = 0.5; // 通常の音量に戻す
          }
        }, 100);
        
        setAudioEnabled(true);
        console.log('音声が有効になりました');
      } catch (error) {
        console.error('音声有効化エラー:', error);
        // エラーの詳細を表示
        if (error instanceof Error) {
          console.error('エラー詳細:', error.name, error.message);
        }
      }
    } else {
      console.error('audioRef.currentがnullです');
    }
  };

  // ページロード後に音声ファイルの状態をチェック
  useEffect(() => {
    const checkAudioReady = () => {
      if (audioRef.current && audioRef.current.readyState >= 2) {
        console.log('音声ファイル準備完了');
        // 音声ファイルが準備完了した段階では、まだaudioEnabledはfalseのまま
        // ユーザーのクリックを待つ
      }
    };

    const timer = setTimeout(checkAudioReady, 1000);
    return () => clearTimeout(timer);
  }, []);

  // 音声プールから利用可能な音声要素を取得
  const getAvailableAudio = (): HTMLAudioElement | null => {
    // 再生中でない音声要素を探す
    for (const audio of audioPool.current) {
      if (audio.paused || audio.ended) {
        return audio;
      }
    }
    
    // 利用可能な音声がない場合、最も古い音声を停止して再利用
    if (audioPool.current.length > 0) {
      const oldestAudio = audioPool.current[0];
      oldestAudio.pause();
      oldestAudio.currentTime = 0;
      return oldestAudio;
    }
    
    return null;
  };

  // 音声プールを初期化
  const initializeAudioPool = () => {
    audioPool.current = [];
    for (let i = 0; i < maxConcurrentSounds; i++) {
      const audio = new Audio('/sounds.mp3');
      audio.volume = 0.3; // 複数花火に適した音量
      audio.preload = 'auto';
      
      // パフォーマンス最適化のためのイベントリスナー
      audio.addEventListener('ended', () => {
        // 再生終了時にリセット（メモリ効率化）
        audio.currentTime = 0;
      });
      
      audioPool.current.push(audio);
    }
    console.log(`音声プール初期化完了: ${maxConcurrentSounds}個の音声要素を作成`);
  };

  // 音声を再生する関数（プール使用）
  const playFireworkSound = async (delay: number = 0) => {
    // 音声が有効になっていない場合は早期リターン
    if (!audioEnabled) {
      return;
    }
    
    // 遅延指定がある場合は高精度タイマーで待機してから再生
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
    
    const audio = getAvailableAudio();
    if (audio) {
      try {
        audio.volume = 0.3; // 複数花火に適した音量
        audio.currentTime = 0;
        
        // 非同期再生でパフォーマンス向上
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
        
        console.log('音声プール再生成功');
      } catch (error) {
        // 再生エラーは静かに処理（スパム防止）
        if (error instanceof Error && error.name === 'NotAllowedError') {
          setAudioEnabled(false);
          console.log('音声が自動的に無効化されました');
        }
      }
    }
  };

  // 音声の初期設定
  useEffect(() => {
    console.log('音声システムを初期化中...');
    
    // メイン音声要素（メタデータ取得用）
    audioRef.current = new Audio('/sounds.mp3');
    audioRef.current.volume = 0.5;
    audioRef.current.preload = 'auto';
    
    // 音声の長さを取得
    audioRef.current.addEventListener('loadedmetadata', () => {
      if (audioRef.current) {
        setAudioDuration(audioRef.current.duration);
        console.log('音声の長さ:', audioRef.current.duration, '秒');
        // メタデータ取得後に音声プールを初期化
        initializeAudioPool();
      }
    });
    
    // 音声の読み込み完了を監視
    audioRef.current.addEventListener('canplaythrough', () => {
      console.log('音声ファイルの読み込み完了');
    });
    
    // 音声読み込みエラーを監視
    audioRef.current.addEventListener('error', (event) => {
      console.error('音声ファイルの読み込みエラー:', event);
      const audio = event.target as HTMLAudioElement;
      if (audio && audio.error) {
        console.error('エラーコード:', audio.error.code);
        console.error('エラーメッセージ:', audio.error.message);
      }
    });

    // 音声ファイルのロード開始
    audioRef.current.addEventListener('loadstart', () => {
      console.log('音声ファイルのロード開始');
    });

    // 音声ファイルのロード進行状況
    audioRef.current.addEventListener('progress', () => {
      console.log('音声ファイルのロード中...');
    });
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      // 音声プールをクリーンアップ
      audioPool.current.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      audioPool.current = [];
    };
  }, []);

  // 花火爆発イベントを監視して音声を再生
  useEffect(() => {
    const handleFireworkExplosion = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { id } = customEvent.detail;
      
      if (audioEnabled) {
        // 視覚的な爆発エフェクトとの同期のための遅延
        playFireworkSound(explosionSyncDelay);
        console.log(`爆発音再生予約: ${id} (${explosionSyncDelay}ms遅延)`);
      }
    };

    window.addEventListener('fireworkExploded', handleFireworkExplosion);
    
    return () => {
      window.removeEventListener('fireworkExploded', handleFireworkExplosion);
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
          
          // 花火イベントを設定
          setFireworkEvent({
            id: newEvent.id,
            vibe: newEvent.vibe,
            timestamp: newEvent.timestamp,
            audioDuration: audioDuration
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
        console.error('Error fetching acceleration data:', error);
      }
    };

    const intervalId = setInterval(fetchAccelerationData, 2000);

    return () => {
      // supabase.removeChannel(channel);
      channel.unsubscribe();
      clearInterval(intervalId);
    };
  }, [audioDuration]);

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
            <p className="text-green-300 text-sm">音声プール: {maxConcurrentSounds}個同時再生対応</p>
            <p className="text-green-300 text-sm">爆発同期遅延: {explosionSyncDelay}ms</p>
            <div className="mt-2 space-x-2">
              <button 
                onClick={() => playFireworkSound()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                即座に音声テスト
              </button>
              <button 
                onClick={() => playFireworkSound(explosionSyncDelay)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
              >
                遅延音声テスト
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