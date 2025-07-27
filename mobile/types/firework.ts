// Shared types for the Sky Canvas firework application

export interface TiltData {
  alpha: number;
  beta: number;
  gamma: number;
  timestamp: number;
}

export interface GestureData {
  type: 'flick' | 'swing';
  direction: 'up' | 'down' | 'left' | 'right';
  intensity: number;
  timestamp: number;
}

export interface FireworkVibe {
  color: string;
  size: number;
  pattern: string;
  seed: number;
}

export interface FireworkEvent {
  id: string;
  type: 'tilt' | 'gesture';
  data: TiltData | GestureData;
  userId: string;
  deviceType: string;
  timestamp: number;
  vibe: FireworkVibe;
}

export interface FireworkEventPayload {
  id: string;
  user_id: string;
  event_type: 'tilt' | 'gesture';
  event_data: TiltData | GestureData;
  vibe: FireworkVibe;
  created_at: string;
}

export interface DisplayFireworkEvent {
  id: string;
  vibe: FireworkVibe;
  timestamp: number;
  audioDuration?: number;
  clickPosition?: { x: number; y: number };
}

export interface AccelerationData {
  x: number | null;
  y: number | null;
  z: number | null;
}

export interface OrientationData {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';