'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/utils/supabase'; // Supabaseクライアントをインポート

export default function PhonePage() {
  const [acceleration, setAcceleration] = useState<{ x: number | null; y: number | null; z: number | null }>({ x: null, y: null, z: null });
  const [orientation, setOrientation] = useState<{ alpha: number | null; beta: number | null; gamma: number | null }>({ alpha: null, beta: null, gamma: null });
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [orientationPermissionGranted, setOrientationPermissionGranted] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [fireworkSentMessage, setFireworkSentMessage] = useState<boolean>(false);
  const lastMessageTime = useRef(0);

  const requestPermission = async () => {
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
        if (acceleration.x !== null) {
          try {
            // 内部APIへの送信（既存の機能を維持）
            await fetch('/api/firework-data', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ acceleration }),
            });

            const currentTime = Date.now();
            // 花火発火条件をチェック（角度変化による発火）
            // X軸（左右）またはY軸（前後）の加速度が一定値を超えた場合
            if (acceleration.x !== null && acceleration.y !== null) {
              const tiltStrength = Math.sqrt(
                acceleration.x ** 2 + 
                acceleration.y ** 2
              );
              if (tiltStrength > 2.5 && (currentTime - lastMessageTime.current > 1000)) {
              setFireworkSentMessage(true);
              lastMessageTime.current = currentTime;
              setTimeout(() => setFireworkSentMessage(false), 1500);
              console.log("Firework trigger condition met on phone.");

              // 花火のvibeデータを生成
              const fireworkVibe = {
                color: '#ff6b6b',
                size: Math.abs(acceleration.y) * 20, // サイズを大きくするため係数を増加
                pattern: 'burst',
                seed: Math.floor(Math.random() * 1000)
              };

              // 花火をトリガー（Display側で処理）

              // Supabaseに花火イベントを送信
              const fireworkEvent = {
                user_id: 'mobile-phone-user', // 仮のユーザーID
                event_type: 'tilt',
                event_data: {
                  x: acceleration.x,
                  y: acceleration.y,
                  z: acceleration.z,
                  timestamp: currentTime
                },
                vibe: fireworkVibe
              };

              const { error } = await supabase
                .from('firework_events')
                .insert(fireworkEvent);

              if (error) {
                console.error("Error inserting firework event into Supabase:", error);
              } else {
                console.log("Firework event successfully sent to Supabase:", fireworkEvent);
              }
              }
            }

          } catch (error) {
            console.error("Error sending acceleration data:", error);
          }
        }
      };

      const intervalId = setInterval(sendAccelerationData, 100);

      return () => {
        window.removeEventListener('devicemotion', handleDeviceMotion);
        clearInterval(intervalId);
      };
    }
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

  return (
    <div className="relative min-h-screen">
      {/* 花火のバックグラウンド */}
      {/* <div className="absolute inset-0 z-0">
        <P5Fireworks fireworkEvent={fireworkEvent} position="center" />
      </div> */}
      
      {/* UI コンテンツ */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4">
        <div className="bg-black bg-opacity-80 rounded-lg p-6 text-white border border-gray-300 shadow-2xl">
          <h1 className="text-2xl font-bold mb-4 text-center drop-shadow-lg">スマートフォンを傾けてください</h1>
          {(!permissionGranted || !orientationPermissionGranted) && (
            <button
              onClick={requestPermission}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg border-2 border-white border-opacity-30 transition-all duration-300 transform hover:scale-105 w-full"
            >
              センサーの許可をリクエスト
            </button>
          )}
          {permissionError && (
            <div className="mt-4 p-3 bg-red-500 bg-opacity-20 border border-red-400 rounded-lg">
              <p className="text-red-300 text-center">Error: {permissionError}</p>
            </div>
          )}
          
          {/* 加速度センサーの表示 */}
          {permissionGranted && (
            <div className="mt-4 p-4 bg-blue-500 bg-opacity-20 border border-blue-400 rounded-lg">
              <h2 className="text-lg font-semibold mb-3 text-center text-blue-200">加速度センサー</h2>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white bg-opacity-10 p-2 rounded">
                  <p className="text-xs text-gray-300">X軸</p>
                  <p className="text-lg font-bold">{acceleration.x !== null ? acceleration.x.toFixed(2) : 'N/A'}</p>
                </div>
                <div className="bg-white bg-opacity-10 p-2 rounded">
                  <p className="text-xs text-gray-300">Y軸</p>
                  <p className="text-lg font-bold">{acceleration.y !== null ? acceleration.y.toFixed(2) : 'N/A'}</p>
                </div>
                <div className="bg-white bg-opacity-10 p-2 rounded">
                  <p className="text-xs text-gray-300">Z軸</p>
                  <p className="text-lg font-bold">{acceleration.z !== null ? acceleration.z.toFixed(2) : 'N/A'}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* 角度センサーの表示 */}
          {orientationPermissionGranted && (
            <div className="mt-4 p-4 bg-purple-500 bg-opacity-20 border border-purple-400 rounded-lg">
              <h2 className="text-lg font-semibold mb-3 text-center text-purple-200">角度センサー</h2>
              <div className="space-y-2">
                <div className="bg-white bg-opacity-10 p-2 rounded flex justify-between">
                  <span className="text-sm text-gray-300">Alpha (Z軸):</span>
                  <span className="font-bold">{orientation.alpha !== null ? orientation.alpha.toFixed(2) : 'N/A'}°</span>
                </div>
                <div className="bg-white bg-opacity-10 p-2 rounded flex justify-between">
                  <span className="text-sm text-gray-300">Beta (X軸):</span>
                  <span className="font-bold">{orientation.beta !== null ? orientation.beta.toFixed(2) : 'N/A'}°</span>
                </div>
                <div className="bg-white bg-opacity-10 p-2 rounded flex justify-between">
                  <span className="text-sm text-gray-300">Gamma (Y軸):</span>
                  <span className="font-bold">{orientation.gamma !== null ? orientation.gamma.toFixed(2) : 'N/A'}°</span>
                </div>
              </div>
            </div>
          )}
          
          {(permissionGranted || orientationPermissionGranted) && (
            <div className="mt-4 text-center">
              {fireworkSentMessage && (
                <div className="mt-4 p-3 bg-green-500 bg-opacity-30 border border-green-400 rounded-lg">
                  <p className="text-green-200 text-xl font-bold animate-bounce">🎆 花火発火！ 🎆</p>
                </div>
              )}
              <div className="mt-3 p-2 bg-gray-500 bg-opacity-20 border border-gray-400 rounded-lg">
                <p className="text-gray-300 text-sm">📡 データを取得中...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 