export interface TiltData {
  alpha: number;  // z軸周りの回転角（0-360度）
  beta: number;   // x軸周りの回転角（-180-180度）
  gamma: number;  // y軸周りの回転角（-90-90度）
  timestamp: number;
}

export interface GestureData {
  type: 'flick' | 'swing';
  direction: 'up' | 'down' | 'left' | 'right';
  intensity: number;  // 0-1の範囲
  timestamp: number;
}

export interface FireworkEvent {
  id: string; // UUID
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