// Shared firework utilities for Sky Canvas application
import { supabase } from '@/utils/supabase';
import { FireworkVibe, AccelerationData, DisplayFireworkEvent } from '@/types/firework';

export class FireworkManager {
  private lastTriggerTime = 0;

  generateVibe(accelerationData: AccelerationData, colorOverride?: string): FireworkVibe {
    return {
      color: colorOverride || '#ff6b6b',
      size: Math.abs(accelerationData.y || 0) * 20,
      pattern: 'burst',
      seed: Math.floor(Math.random() * 1000)
    };
  }

  generateRandomVibe(): FireworkVibe {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#fd79a8', '#a29bfe'];
    return {
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 60 + 20, // 20-80
      pattern: Math.random() > 0.5 ? 'burst' : 'fountain',
      seed: Math.floor(Math.random() * 1000)
    };
  }

  async sendToSupabase(
    accelerationData: AccelerationData,
    vibe: FireworkVibe,
    userId: string = 'mobile-phone-user'
  ): Promise<boolean> {
    try {
      const currentTime = Date.now();
      const fireworkEvent = {
        user_id: userId,
        event_type: 'tilt' as const,
        event_data: {
          x: accelerationData.x,
          y: accelerationData.y,
          z: accelerationData.z,
          timestamp: currentTime
        },
        vibe: vibe
      };

      const { error } = await supabase
        .from('firework_events')
        .insert(fireworkEvent);

      if (error) {
        console.error('Supabase send error:', error);
        return false;
      } else {
        console.log('Firework event sent successfully:', fireworkEvent);
        return true;
      }
    } catch (error) {
      console.error('Firework send process error:', error);
      return false;
    }
  }

  createDisplayEvent(
    id: string,
    vibe: FireworkVibe,
    audioDuration: number = 4,
    clickPosition?: { x: number; y: number }
  ): DisplayFireworkEvent {
    return {
      id,
      vibe,
      timestamp: Date.now(),
      audioDuration,
      clickPosition
    };
  }

  shouldTriggerCooldown(cooldownMs: number = 1000): boolean {
    const currentTime = Date.now();
    if (currentTime - this.lastTriggerTime > cooldownMs) {
      this.lastTriggerTime = currentTime;
      return true;
    }
    return false;
  }

  resetCooldown() {
    this.lastTriggerTime = 0;
  }

  async sendInternalAPI(accelerationData: AccelerationData): Promise<boolean> {
    try {
      await fetch('/api/firework-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ acceleration: accelerationData }),
      });
      return true;
    } catch (error) {
      console.error('Internal API send error:', error);
      return false;
    }
  }

  getDefaultTestVibe(): FireworkVibe {
    return {
      color: '#4ecdc4',
      size: 50,
      pattern: 'burst',
      seed: Math.random()
    };
  }
}