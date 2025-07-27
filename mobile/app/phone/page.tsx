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
    <div className="relative min-h-screen">
      {/* 固定ヘッダー */}
      <SkyCanvasHeader variant="phone" />
            
      {/* UI コンテンツ - ヘッダー分の余白を追加 */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4 pt-20">
        <div className="bg-black bg-opacity-70 rounded-lg p-6 text-white border border-gray-300 shadow-2xl max-w-md w-full">
          <p className="text-center text-lg mb-4">Tilt your smartphone to launch fireworks!</p>
          
          {/* デバッグモード切り替えボタン */}
          <div className="flex justify-center mb-4">
            <button
              onClick={() => setDebugMode(!debugMode)}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg text-sm"
            >
              {debugMode ? '🔧 Hide Debug' : '🔧 Show Debug'}
            </button>
          </div>
          
          {(!permissionGranted || !orientationPermissionGranted || !audioEnabled) && (
            <div className="space-y-3">
              <button
                onClick={requestPermission}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg border-2 border-white border-opacity-30 transition-all duration-300 transform hover:scale-105 w-full"
              >
                Request Sensor and Audio Permission
              </button>
              <div className="text-sm text-gray-300 text-center">
                <p>🎵 Audio will play along with fireworks</p>
                <p>📱 Sensor and audio permissions required</p>
              </div>
            </div>
          )}
          {permissionError && (
            <div className="mt-4 p-3 bg-red-500 bg-opacity-20 border border-red-400 rounded-lg">
              <p className="text-red-300 text-center">Error: {permissionError}</p>
            </div>
          )}
          
          {/* デバッグ情報 - 切り替え可能 */}
          {debugMode && (
            <>
              {/* 加速度センサーの表示 */}
              {permissionGranted && (
                <div className="mt-4 p-4 bg-blue-500 bg-opacity-20 border border-blue-400 rounded-lg">
                  <h2 className="text-lg font-semibold mb-3 text-center text-blue-200">Acceleration Sensor</h2>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white bg-opacity-10 p-2 rounded">
                      <p className="text-xs text-gray-300">X-axis</p>
                      <p className="text-lg font-bold">{acceleration.x !== null ? acceleration.x.toFixed(2) : 'N/A'}</p>
                    </div>
                    <div className="bg-white bg-opacity-10 p-2 rounded">
                      <p className="text-xs text-gray-300">Y-axis</p>
                      <p className="text-lg font-bold">{acceleration.y !== null ? acceleration.y.toFixed(2) : 'N/A'}</p>
                    </div>
                    <div className="bg-white bg-opacity-10 p-2 rounded">
                      <p className="text-xs text-gray-300">Z-axis</p>
                      <p className="text-lg font-bold">{acceleration.z !== null ? acceleration.z.toFixed(2) : 'N/A'}</p>
                    </div>
                  </div>
                  {acceleration.x !== null && acceleration.y !== null && (
                    <div className="mt-2 text-center">
                      <p className="text-yellow-200 text-sm">
                        Tilt strength: {Math.sqrt(acceleration.x ** 2 + acceleration.y ** 2).toFixed(2)} (Launch threshold: 2.5)
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {/* 角度センサーの表示 */}
              {orientationPermissionGranted && (
                <div className="mt-4 p-4 bg-purple-500 bg-opacity-20 border border-purple-400 rounded-lg">
                  <h2 className="text-lg font-semibold mb-3 text-center text-purple-200">Orientation Sensor</h2>
                  <div className="space-y-2">
                    <div className="bg-white bg-opacity-10 p-2 rounded flex justify-between">
                      <span className="text-sm text-gray-300">Alpha (Z-axis):</span>
                      <span className="font-bold">{orientation.alpha !== null ? orientation.alpha.toFixed(2) : 'N/A'}°</span>
                    </div>
                    <div className="bg-white bg-opacity-10 p-2 rounded flex justify-between">
                      <span className="text-sm text-gray-300">Beta (X-axis):</span>
                      <span className="font-bold">{orientation.beta !== null ? orientation.beta.toFixed(2) : 'N/A'}°</span>
                    </div>
                    <div className="bg-white bg-opacity-10 p-2 rounded flex justify-between">
                      <span className="text-sm text-gray-300">Gamma (Y-axis):</span>
                      <span className="font-bold">{orientation.gamma !== null ? orientation.gamma.toFixed(2) : 'N/A'}°</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          
          {/* 音声状態表示 */}
          {audioEnabled && (
            <div className="mt-4 p-3 bg-green-500 bg-opacity-20 border border-green-400 rounded-lg">
              <p className="text-green-200 text-center">🎵 Audio enabled successfully</p>
            </div>
          )}

          {/* シンプルな状態表示 - 視覚的フィードバック強化 */}
          {(permissionGranted || orientationPermissionGranted) && (
            <div className="mt-4 text-center">
              {fireworkSentMessage ? (
                <div className="p-4 bg-green-500 bg-opacity-30 border border-green-400 rounded-lg animate-pulse">
                  <p className="text-green-200 text-xl font-bold animate-bounce">🎆 Firework Launched! 🎆</p>
                  <p className="text-green-200 text-sm">Playing simultaneously on display and phone</p>
                  <div className="mt-2 text-yellow-200 text-xs">
                    Strength: {tiltStrength.toFixed(1)} / 2.5
                  </div>
                </div>
              ) : (
                <div className={`p-3 rounded-lg transition-all duration-200 ${
                  isReadyToLaunch 
                    ? 'bg-yellow-500 bg-opacity-30 border border-yellow-400 animate-pulse' 
                    : 'bg-blue-500 bg-opacity-20 border border-blue-400'
                }`}>
                  <p className={`text-lg font-semibold ${
                    isReadyToLaunch ? 'text-yellow-200' : 'text-blue-200'
                  }`}>
                    {isReadyToLaunch ? '⚡ Ready to Launch!' : '📱 Ready'}
                  </p>
                  <p className={`text-sm ${
                    isReadyToLaunch ? 'text-yellow-200' : 'text-blue-200'
                  }`}>
                    {isReadyToLaunch ? 'Tilt a bit more to launch!' : 'Shake your smartphone to launch fireworks'}
                  </p>
                  
                  {/* リアルタイム傾き強度表示 */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-300">Tilt Strength</span>
                      <span className={`font-mono ${
                        tiltStrength >= 2.5 ? 'text-red-200' :
                        tiltStrength >= 2.0 ? 'text-yellow-200' :
                        'text-gray-300'
                      }`}>
                        {tiltStrength.toFixed(1)} / 2.5
                      </span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-200 ${
                          tiltStrength >= 2.5 ? 'bg-red-400' :
                          tiltStrength >= 2.0 ? 'bg-yellow-400' :
                          'bg-blue-400'
                        }`}
                        style={{ width: `${Math.min((tiltStrength / 2.5) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 花火のバックグラウンド */}
      <div className="absolute inset-0 z-0">
        <P5Fireworks fireworkEvent={phoneFireworkEvent} position="center" />
      </div>
    </div>
  );
} 