'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';

// Declare a global interface to extend DeviceOrientationEvent for requestPermission
declare global {
  interface DeviceOrientationEvent {
    requestPermission?: () => Promise<'granted' | 'denied'>;
  }
}

export default function PhonePage() {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [orientationData, setOrientationData] = useState({ alpha: 0, beta: 0, gamma: 0 });
  const [message, setMessage] = useState('Waiting for device orientation data...');

  useEffect(() => {
    if (permissionGranted) {
      const handleDeviceOrientation = async (event: DeviceOrientationEvent) => {
        const { alpha, beta, gamma } = event;
        setOrientationData({ alpha: alpha || 0, beta: beta || 0, gamma: gamma || 0 });

        // スマートフォンの傾きデータに基づいて花火イベントをSupabaseに送信
        try {
          const { error } = await supabase.from('fireworks_events').insert([
            { alpha: alpha, beta: beta, gamma: gamma, timestamp: new Date().toISOString() },
          ]);
          if (error) throw error;
          setMessage('Firework event sent!');
        } catch (error: unknown) {
          console.error('Error sending firework event:', (error as Error).message);
          setMessage(`Error: ${(error as Error).message}`);
        }
      };

      window.addEventListener('deviceorientation', handleDeviceOrientation);

      return () => {
        window.removeEventListener('deviceorientation', handleDeviceOrientation);
      };
    }
  }, [permissionGranted]);

  const requestPermission = async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permissionState = await DeviceOrientationEvent.requestPermission();
        if (permissionState === 'granted') {
          setPermissionGranted(true);
          setMessage('Device orientation permission granted.');
        } else {
          setMessage('Device orientation permission denied.');
        }
      } catch (error: unknown) {
        setMessage(`Permission request error: ${(error as Error).message}`);
      }
    } else {
      // Non-iOS 13+ devices or browsers that don't require permission
      setPermissionGranted(true);
      setMessage('Device orientation API available. No permission required.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center' }}>
      <h1>Phone Controller</h1>
      {!permissionGranted ? (
        <button onClick={requestPermission} style={{ padding: '10px 20px', fontSize: '18px' }}>
          Request Sensor Permission
        </button>
      ) : (
        <div>
          <p>Alpha: {orientationData.alpha.toFixed(2)}</p>
          <p>Beta: {orientationData.beta.toFixed(2)}</p>
          <p>Gamma: {orientationData.gamma.toFixed(2)}</p>
          <p>{message}</p>
        </div>
      )}
    </div>
  );
}
