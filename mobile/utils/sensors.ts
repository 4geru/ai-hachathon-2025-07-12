// Shared sensor utilities for Sky Canvas application
import { AccelerationData, OrientationData } from '@/types/firework';

export class SensorManager {
  private accelerationData: AccelerationData = { x: null, y: null, z: null };
  private orientationData: OrientationData = { alpha: null, beta: null, gamma: null };
  private motionPermissionGranted = false;
  private orientationPermissionGranted = false;
  private onAccelerationChange?: (data: AccelerationData) => void;
  private onOrientationChange?: (data: OrientationData) => void;

  async requestPermissions(): Promise<{
    motion: boolean;
    orientation: boolean;
    error?: string;
  }> {
    const result = { motion: false, orientation: false, error: undefined as string | undefined };

    // Request DeviceMotionEvent permission
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const permissionState = await (DeviceMotionEvent as any).requestPermission();
        result.motion = permissionState === 'granted';
        this.motionPermissionGranted = result.motion;
        console.log('DeviceMotion permission:', permissionState);
      } catch (error) {
        result.error = `DeviceMotion permission error: ${error}`;
        console.error('DeviceMotion permission error:', error);
      }
    } else {
      // For browsers that don't require permission
      result.motion = true;
      this.motionPermissionGranted = true;
      console.log('DeviceMotion permission not required');
    }

    // Request DeviceOrientationEvent permission
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        result.orientation = permissionState === 'granted';
        this.orientationPermissionGranted = result.orientation;
        console.log('DeviceOrientation permission:', permissionState);
      } catch (error) {
        console.error('DeviceOrientation permission error:', error);
      }
    } else {
      // For browsers that don't require permission
      result.orientation = true;
      this.orientationPermissionGranted = true;
      console.log('DeviceOrientation permission not required');
    }

    return result;
  }

  startMotionTracking(callback?: (data: AccelerationData) => void) {
    if (!this.motionPermissionGranted) {
      console.warn('Motion permission not granted');
      return false;
    }

    this.onAccelerationChange = callback;

    const handleDeviceMotion = (event: DeviceMotionEvent) => {
      if (event.accelerationIncludingGravity) {
        const newData: AccelerationData = {
          x: event.accelerationIncludingGravity.x,
          y: event.accelerationIncludingGravity.y,
          z: event.accelerationIncludingGravity.z,
        };
        this.accelerationData = newData;
        this.onAccelerationChange?.(newData);
      }
    };

    window.addEventListener('devicemotion', handleDeviceMotion);
    console.log('Motion tracking started');
    return true;
  }

  startOrientationTracking(callback?: (data: OrientationData) => void) {
    if (!this.orientationPermissionGranted) {
      console.warn('Orientation permission not granted');
      return false;
    }

    this.onOrientationChange = callback;

    const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
      const newData: OrientationData = {
        alpha: event.alpha, // Z-axis rotation (0-360 degrees)
        beta: event.beta,   // X-axis rotation (-180 to 180 degrees)
        gamma: event.gamma, // Y-axis rotation (-90 to 90 degrees)
      };
      this.orientationData = newData;
      this.onOrientationChange?.(newData);
    };

    window.addEventListener('deviceorientation', handleDeviceOrientation);
    console.log('Orientation tracking started');
    return true;
  }

  stopTracking() {
    window.removeEventListener('devicemotion', this.handleDeviceMotion);
    window.removeEventListener('deviceorientation', this.handleDeviceOrientation);
    console.log('Sensor tracking stopped');
  }

  private handleDeviceMotion = (event: DeviceMotionEvent) => {
    if (event.accelerationIncludingGravity) {
      const newData: AccelerationData = {
        x: event.accelerationIncludingGravity.x,
        y: event.accelerationIncludingGravity.y,
        z: event.accelerationIncludingGravity.z,
      };
      this.accelerationData = newData;
      this.onAccelerationChange?.(newData);
    }
  };

  private handleDeviceOrientation = (event: DeviceOrientationEvent) => {
    const newData: OrientationData = {
      alpha: event.alpha,
      beta: event.beta,
      gamma: event.gamma,
    };
    this.orientationData = newData;
    this.onOrientationChange?.(newData);
  };

  calculateTiltStrength(data: AccelerationData): number {
    if (data.x === null || data.y === null) return 0;
    return Math.sqrt(data.x ** 2 + data.y ** 2);
  }

  shouldTriggerFirework(
    data: AccelerationData,
    threshold: number = 2.5,
    lastTriggerTime: number = 0,
    cooldown: number = 1000
  ): boolean {
    const tiltStrength = this.calculateTiltStrength(data);
    const currentTime = Date.now();
    
    return tiltStrength > threshold && 
           (currentTime - lastTriggerTime) > cooldown;
  }

  get currentAcceleration(): AccelerationData {
    return this.accelerationData;
  }

  get currentOrientation(): OrientationData {
    return this.orientationData;
  }

  get hasMotionPermission(): boolean {
    return this.motionPermissionGranted;
  }

  get hasOrientationPermission(): boolean {
    return this.orientationPermissionGranted;
  }
}