'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/utils/supabase'; // Supabaseクライアントをインポート
import dynamic from 'next/dynamic';
import SkyCanvasHeader from '@/components/SkyCanvasHeader';

// P5Fireworksを動的にインポートしてSSRを無効化
const P5Fireworks = dynamic(() => import('@/components/P5Fireworks'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-black"></div>
});

export default function PhonePage() {
  // === 状態管理 ===
  const [acceleration, setAcceleration] = useState<{ x: number | null; y: number | null; z: number | null }>({ x: null, y: null, z: null });
  const [orientation, setOrientation] = useState<{ alpha: number | null; beta: number | null; gamma: number | null }>({ alpha: null, beta: null, gamma: null });
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [orientationPermissionGranted, setOrientationPermissionGranted] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [fireworkSentMessage, setFireworkSentMessage] = useState<boolean>(false);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [debugMode, setDebugMode] = useState<boolean>(false); // デバッグモード切り替え
  const [tiltStrength, setTiltStrength] = useState<number>(0); // 現在の傾き強度
  const [isReadyToLaunch, setIsReadyToLaunch] = useState<boolean>(false); // 発射準備状態
  const [phoneFireworkEvent, setPhoneFireworkEvent] = useState<{
    id: string;
    vibe: { color: string; size: number; pattern: string; seed: number };
    timestamp: number;
    audioDuration?: number;
  } | null>(null); // スマホ側花火イベント
  const [isMounted, setIsMounted] = useState<boolean>(false); // クライアントサイド判定
  const lastMessageTime = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const requestPermission = async () => {
    // Audio permission - must be done first with user interaction
    await enableAudio();

    // DeviceMotionEvent permission
    if (typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
      try {
        const permissionState = await (DeviceMotionEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
        if (permissionState === 'granted') {
          setPermissionGranted(true);
          console.log("DeviceMotion permission granted.");
        } else {
          setPermissionGranted(false);
          setPermissionError("DeviceMotion permission denied.");
          console.warn("DeviceMotion permission denied.");
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setPermissionError(`Error requesting DeviceMotion permission: ${errorMessage}`);
        console.error("Error requesting DeviceMotion permission:", error);
      }
    } else {
      // For browsers that do not require permission (e.g., Android Chrome)
      setPermissionGranted(true);
      console.log("DeviceMotion permission not required or already granted.");
    }

    // DeviceOrientationEvent permission
    if (typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
      try {
        const permissionState = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
        if (permissionState === 'granted') {
          setOrientationPermissionGranted(true);
          console.log("DeviceOrientation permission granted.");
        } else {
          setOrientationPermissionGranted(false);
          console.warn("DeviceOrientation permission denied.");
        }
      } catch (error: unknown) {
        console.error("Error requesting DeviceOrientation permission:", error);
      }
    } else {
      // For browsers that do not require permission
      setOrientationPermissionGranted(true);
      console.log("DeviceOrientation permission not required or already granted.");
    }
  };

  /**
   * 手動花火発射関数 - ボタンクリック用
   */
  const launchManualFirework = async () => {
    console.log('=== 手動花火発射開始 ===');
    
    const timestamp = Date.now();
    
    // 連続発射防止
    if ((timestamp - lastMessageTime.current) < 1000) {
      console.log('手動発射: クールダウン中');
      return false;
    }
    
    // 発射実行
    setFireworkSentMessage(true);
    lastMessageTime.current = timestamp;
    setTimeout(() => setFireworkSentMessage(false), 3000);
    
    // スマホ側音声再生
    if (audioEnabled && audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
        console.log('手動発射: スマホ側音声再生成功');
      } catch (error) {
        console.error('手動発射: スマホ側音声再生エラー:', error);
      }
    }
    
    // 花火データ作成（手動発射用の特別な設定）
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'];
    const patterns = ['burst', 'ring', 'spiral'];
    
    const fireworkVibe = {
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 60 + Math.random() * 40, // 60-100のランダムサイズ
      pattern: patterns[Math.floor(Math.random() * patterns.length)],
      seed: Math.floor(Math.random() * 1000)
    };
    
    // スマホ側でも花火を表示
    setPhoneFireworkEvent({
      id: `manual-${timestamp}`,
      vibe: fireworkVibe,
      timestamp: timestamp,
      audioDuration: 4
    });
    
    // ディスプレイ側に送信
    const fireworkEvent = {
      user_id: 'manual-phone-user',
      event_type: 'gesture',
      event_data: {
        type: 'tap',
        direction: 'up',
        intensity: 1.0,
        timestamp: timestamp
      },
      vibe: fireworkVibe
    };
    
    try {
      const { error } = await supabase
        .from('firework_events')
        .insert(fireworkEvent);
      
      if (error) {
        console.error('手動発射: Supabase送信エラー:', error);
        return false;
      } else {
        console.log('手動発射: 花火イベント送信成功:', fireworkEvent);
        return true;
      }
    } catch (error) {
      console.error('手動発射: 送信プロセスエラー:', error);
      return false;
    }
  };

  /**
   * 花火発射メイン関数 - わかりやすく構造化
   */
  const launchFireworkFromPhone = async (accelerationData: { x: number; y: number; z: number }, timestamp: number) => {
    console.log('=== 花火発射プロセス開始 ===');
    
    // 1. 発射条件チェック
    const currentTiltStrength = Math.sqrt(accelerationData.x ** 2 + accelerationData.y ** 2);
    const isFireworkTrigger = currentTiltStrength > 2.5;
    const isNotTooSoon = (timestamp - lastMessageTime.current) > 1000;
    
    if (!isFireworkTrigger || !isNotTooSoon) {
      return false; // 発射条件を満たさない
    }
    
    // 2. 発射実行 - より長時間表示して分かりやすく
    setFireworkSentMessage(true);
    lastMessageTime.current = timestamp;
    setTimeout(() => setFireworkSentMessage(false), 3000); // 3秒間表示
    
    console.log('花火発射条件クリア - 強度:', currentTiltStrength.toFixed(2));
    
    // 3. スマホ側音声再生
    if (audioEnabled && audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
        console.log('スマホ側音声再生成功');
      } catch (error) {
        console.error('スマホ側音声再生エラー:', error);
      }
    }
    
    // 4. 花火データ作成
    const fireworkVibe = {
      color: '#ff6b6b',
      size: Math.abs(accelerationData.y) * 20,
      pattern: 'burst',
      seed: Math.floor(Math.random() * 1000)
    };
    
    // 4.5. スマホ側でも花火を表示
    setPhoneFireworkEvent({
      id: `phone-${timestamp}`,
      vibe: fireworkVibe,
      timestamp: timestamp,
      audioDuration: 4
    });
    
    // 5. ディスプレイ側に送信
    const fireworkEvent = {
      user_id: 'mobile-phone-user',
      event_type: 'tilt',
      event_data: {
        x: accelerationData.x,
        y: accelerationData.y,
        z: accelerationData.z,
        timestamp: timestamp
      },
      vibe: fireworkVibe
    };
    
    try {
      const { error } = await supabase
        .from('firework_events')
        .insert(fireworkEvent);
      
      if (error) {
        console.error('Supabase送信エラー:', error);
        return false;
      } else {
        console.log('花火イベント送信成功:', fireworkEvent);
        return true;
      }
    } catch (error) {
      console.error('花火送信プロセスエラー:', error);
      return false;
    }
  };

  // 音声を有効にする関数
  const enableAudio = async () => {
    try {
      // 音声ファイルを初期化
      if (!audioRef.current) {
        audioRef.current = new Audio('/sounds.mp3');
        audioRef.current.volume = 0.5;
        audioRef.current.preload = 'auto';
      }

      // 音声を一瞬再生してから止める（音声コンテキストを有効化）
      audioRef.current.volume = 0;
      await audioRef.current.play();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.volume = 0.5;
      setAudioEnabled(true);
      console.log('Phone: 音声が有効になりました');
    } catch (error) {
      console.error('Phone: 音声有効化エラー:', error);
    }
  };

  useEffect(() => {
    if (permissionGranted) {
      const handleDeviceMotion = (event: DeviceMotionEvent) => {
        if (event.accelerationIncludingGravity) {
          const currentAcceleration = {
            x: event.accelerationIncludingGravity.x,
            y: event.accelerationIncludingGravity.y,
            z: event.accelerationIncludingGravity.z,
          };
          setAcceleration(currentAcceleration);
        }
      };

      window.addEventListener('devicemotion', handleDeviceMotion);

      const sendAccelerationData = async () => {
        if (acceleration.x !== null && acceleration.y !== null && acceleration.z !== null) {
          try {
            // 内部APIへの送信（既存の機能を維持）
            await fetch('/api/firework-data', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ acceleration }),
            });

            // リアルタイム傾き強度とラウンチ準備状態の更新
            const currentTiltStrength = Math.sqrt(acceleration.x ** 2 + acceleration.y ** 2);
            setTiltStrength(currentTiltStrength);
            setIsReadyToLaunch(currentTiltStrength > 2.0); // Ready state at slightly lower value than launch threshold

            // 花火発射チェック - 新しい統合関数を使用
            const currentTime = Date.now();
            await launchFireworkFromPhone(
              { x: acceleration.x, y: acceleration.y, z: acceleration.z },
              currentTime
            );

          } catch (error) {
            console.error("加速度データ送信エラー:", error);
          }
        }
      };

      const intervalId = setInterval(sendAccelerationData, 100);

      return () => {
        window.removeEventListener('devicemotion', handleDeviceMotion);
        clearInterval(intervalId);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionGranted, acceleration]);

  // 角度センサーのuseEffect
  useEffect(() => {
    if (orientationPermissionGranted) {
      const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
        const currentOrientation = {
          alpha: event.alpha, // Z軸周りの回転 (0-360度)
          beta: event.beta,   // X軸周りの回転 (-180〜180度)
          gamma: event.gamma, // Y軸周りの回転 (-90〜90度)
        };
        setOrientation(currentOrientation);
      };

      window.addEventListener('deviceorientation', handleDeviceOrientation);

      return () => {
        window.removeEventListener('deviceorientation', handleDeviceOrientation);
      };
    }
  }, [orientationPermissionGranted]);

  // クライアントサイドマウント検出
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative min-h-screen w-full h-screen overflow-hidden" suppressHydrationWarning>
      {/* 固定ヘッダー */}
      <SkyCanvasHeader variant="phone" />

      {/* 花火のバックグラウンド */}
      <div className="absolute inset-0 z-0">
        <P5Fireworks key="phone-fireworks" fireworkEvent={phoneFireworkEvent} position="center" />
      </div>

      {/* 権限リクエストボタン（必要時のみ表示） - 上部固定 */}
      {(!permissionGranted || !orientationPermissionGranted || !audioEnabled) && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-60 w-full max-w-md px-6">
          <button
            onClick={requestPermission}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-xl shadow-xl border-3 border-white border-opacity-40 transition-all duration-300 transform hover:scale-110 w-full"
          >
            <div className="flex flex-col items-center space-y-2">
              <span className="text-2xl">🎵</span>
              <span className="text-lg">Enable Audio & Sensors</span>
            </div>
          </button>
          <p className="text-sm text-gray-300 text-center mt-3">
            Tap to enable audio and motion sensors
          </p>
        </div>
      )}

      {/* タップ指示とメイン花火ボタンのコンテナ - クライアントサイドでのみ中央配置 */}
      {isMounted && (
        <div className="fixed inset-0 w-full h-full z-50 flex items-center justify-center">
          <div className="flex flex-col items-center justify-center gap-4">
            {/* メイン花火ボタン */}
            <div className="relative flex items-center justify-center mx-auto">            
              <button
                onClick={launchManualFirework}
                disabled={fireworkSentMessage}
                className={`relative bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 hover:from-blue-400 hover:via-purple-400 hover:to-pink-400 disabled:from-gray-600 disabled:via-gray-500 disabled:to-gray-600 text-white font-bold rounded-3xl shadow-2xl border-4 border-white border-opacity-70 transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:opacity-50 ${
                  fireworkSentMessage ? 'animate-pulse' : ''
                }`}
                style={{ 
                  width: '300px', 
                  height: '120px',
                  boxShadow: fireworkSentMessage 
                    ? '0 0 50px rgba(59, 130, 246, 0.8), 0 0 100px rgba(168, 85, 247, 0.6)' 
                    : '0 20px 60px rgba(0, 0, 0, 0.4), 0 0 40px rgba(59, 130, 246, 0.3)'
                }}
              >
                <div className="flex flex-col items-center justify-center h-full space-y-2">
                  <span className="text-5xl">
                    {fireworkSentMessage ? '🚀' : '🎆'}
                  </span>
                  <div className="text-center">
                    <div className="text-2xl font-bold leading-tight">
                      {fireworkSentMessage ? 'LAUNCHING!' : 'LAUNCH'}
                    </div>
                    <div className="text-xl font-semibold opacity-90">
                      {fireworkSentMessage ? 'Please wait...' : 'FIREWORKS'}
                    </div>
                  </div>
                </div>
              </button>
              
              {/* パルス効果 */}
              {!fireworkSentMessage && (
                <div className="absolute inset-0 rounded-3xl border-4 border-white opacity-30 animate-ping" style={{ animationDuration: '2s' }}></div>
              )}
            </div>
            
            {/* 成功メッセージ - ボタンの下に配置 */}
            {fireworkSentMessage && (
              <div className="max-w-sm mx-auto">
                <div className="bg-green-900/80 backdrop-blur-sm border border-green-400 rounded-xl p-6 shadow-xl">
                  <div className="text-center">
                    <p className="text-green-200 text-xl font-bold animate-pulse">
                      ✨ Firework Launched! ✨
                    </p>
                    <p className="text-green-300 text-sm mt-2">
                      Watch the big screen for the spectacular show!
                    </p>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
} 