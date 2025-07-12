'use client';

import React, { useEffect, useState, useRef } from 'react';

export default function PhonePage() {
  const [acceleration, setAcceleration] = useState<{ x: number | null; y: number | null; z: number | null }>({ x: null, y: null, z: null });
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [fireworkSentMessage, setFireworkSentMessage] = useState<boolean>(false); // 新しい状態変数
  const lastMessageTime = useRef(0); // メッセージ表示のクールダウン用

  const requestPermission = async () => {
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const permissionState = await (DeviceMotionEvent as any).requestPermission();
        if (permissionState === 'granted') {
          setPermissionGranted(true);
          console.log("DeviceMotion permission granted.");
        } else {
          setPermissionGranted(false);
          setPermissionError("DeviceMotion permission denied.");
          console.warn("DeviceMotion permission denied.");
        }
      } catch (error: any) {
        setPermissionError(`Error requesting DeviceMotion permission: ${error.message}`);
        console.error("Error requesting DeviceMotion permission:", error);
      }
    } else {
      // For browsers that do not require permission (e.g., Android Chrome)
      setPermissionGranted(true);
      console.log("DeviceMotion permission not required or already granted.");
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
          // For now, just log to console. This data will be sent to the display later.
          // console.log("Acceleration:", event.accelerationIncludingGravity);
        }
      };

      window.addEventListener('devicemotion', handleDeviceMotion);

      const sendAccelerationData = async () => {
        if (acceleration.x !== null) { // データがある場合のみ送信
          try {
            await fetch('/api/firework-data', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ acceleration }),
            });
            // console.log("Acceleration data sent.", acceleration);
            const currentTime = Date.now();
            // スマホ側でも発火条件をチェックし、メッセージを表示
            // ここで設定する閾値はdisplay側のものと合わせるのが望ましい
            if (acceleration.y !== null && acceleration.y > 3 && (currentTime - lastMessageTime.current > 1000)) { // display側と合わせた閾値とクールダウン
              setFireworkSentMessage(true);
              lastMessageTime.current = currentTime;
              setTimeout(() => setFireworkSentMessage(false), 1500); // 1.5秒後にメッセージを非表示
              console.log("Firework trigger condition met on phone.");
            }

          } catch (error) {
            console.error("Error sending acceleration data:", error);
          }
        }
      };

      const intervalId = setInterval(sendAccelerationData, 100); // 100msごとに送信

      return () => {
        window.removeEventListener('devicemotion', handleDeviceMotion);
        clearInterval(intervalId);
      };
    }
  }, [permissionGranted, acceleration]); // accelerationを依存配列に追加

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-4">スマートフォンを傾けてください</h1>
      {!permissionGranted && (
        <button
          onClick={requestPermission}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          センサーの許可をリクエスト
        </button>
      )}
      {permissionError && <p className="text-red-500 mt-2">Error: {permissionError}</p>}
      {permissionGranted && (
        <div className="mt-4 text-center">
          <p>X: {acceleration.x !== null ? acceleration.x.toFixed(2) : 'N/A'}</p>
          <p>Y: {acceleration.y !== null ? acceleration.y.toFixed(2) : 'N/A'}</p>
          <p>Z: {acceleration.z !== null ? acceleration.z.toFixed(2) : 'N/A'}</p>
          {fireworkSentMessage && (
            <p className="text-green-500 text-xl font-bold mt-4 animate-bounce">花火発火！</p>
          )}
          <p className="mt-2 text-gray-500">データを取得中...</p>
        </div>
      )}
    </div>
  );
} 