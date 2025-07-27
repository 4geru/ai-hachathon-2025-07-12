// Shared audio utilities for Sky Canvas application

export class AudioManager {
  private audioCtx: AudioContext | null = null;
  private launchBuffer: AudioBuffer | null = null;
  private explosionBuffer: AudioBuffer | null = null;
  private peakOffset: number = 0;
  private isEnabled: boolean = false;

  constructor() {
    this.init();
  }

  private async init() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtx();
    } catch (error) {
      console.error('AudioContext initialization failed:', error);
    }
  }

  async enable(): Promise<boolean> {
    try {
      if (!this.audioCtx) {
        await this.init();
      }

      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      if (this.audioCtx && (!this.launchBuffer || !this.explosionBuffer)) {
        await this.loadAudioFiles();
      }

      this.isEnabled = true;
      console.log('Audio enabled successfully');
      return true;
    } catch (error) {
      console.error('Audio enable error:', error);
      return false;
    }
  }

  private async loadAudioFiles() {
    if (!this.audioCtx) return;

    try {
      // Load launch sound
      const launchRes = await fetch('/sounds_launch.mp3');
      if (launchRes.ok) {
        const launchArr = await launchRes.arrayBuffer();
        this.launchBuffer = await this.audioCtx.decodeAudioData(launchArr);
        console.log('Launch sound loaded successfully');
      }

      // Load explosion sound
      const expRes = await fetch('/sounds_explosion.mp3');
      if (expRes.ok) {
        const expArr = await expRes.arrayBuffer();
        this.explosionBuffer = await this.audioCtx.decodeAudioData(expArr);
        console.log('Explosion sound loaded successfully');
        
        // Calculate peak offset for sync
        this.calculatePeakOffset();
      }
    } catch (error) {
      console.error('Error loading audio files:', error);
    }
  }

  private calculatePeakOffset() {
    if (!this.explosionBuffer) return;

    try {
      const ch = this.explosionBuffer.getChannelData(0);
      let maxRms = 0;
      let peakSample = 0;
      const block = 1024;

      for (let i = 0; i < ch.length; i += block) {
        let sum = 0;
        for (let j = 0; j < block && i + j < ch.length; j++) {
          const v = ch[i + j];
          sum += v * v;
        }
        const rms = Math.sqrt(sum / block);
        if (rms > maxRms) {
          maxRms = rms;
          peakSample = i;
        }
      }
      this.peakOffset = peakSample / this.explosionBuffer.sampleRate;
      console.log('Peak offset calculated:', this.peakOffset);
    } catch (error) {
      console.error('Peak calculation error:', error);
      this.peakOffset = 0;
    }
  }

  playLaunchSound(volume: number = 1.5): boolean {
    if (!this.isEnabled || !this.audioCtx || !this.launchBuffer) {
      console.log('Launch sound skipped - audio not ready');
      return false;
    }

    try {
      const audioSource = this.audioCtx.createBufferSource();
      const volumeControl = this.audioCtx.createGain();

      audioSource.buffer = this.launchBuffer;
      volumeControl.gain.setValueAtTime(volume, this.audioCtx.currentTime);

      audioSource.connect(volumeControl);
      volumeControl.connect(this.audioCtx.destination);

      audioSource.start(this.audioCtx.currentTime);
      console.log('Launch sound played');
      return true;
    } catch (error) {
      console.error('Launch sound error:', error);
      return false;
    }
  }

  playExplosionSound(repeats: number = 2, repeatGap: number = 0.12): boolean {
    if (!this.isEnabled || !this.audioCtx || !this.explosionBuffer) {
      console.log('Explosion sound skipped - audio not ready');
      return false;
    }

    try {
      const visualFrameLag = 1 / 60;
      const audioOffset = Math.max(0, this.peakOffset - visualFrameLag);

      for (let i = 0; i < repeats; i++) {
        const audioSource = this.audioCtx.createBufferSource();
        audioSource.buffer = this.explosionBuffer;
        audioSource.connect(this.audioCtx.destination);

        const startTime = this.audioCtx.currentTime + (i * repeatGap);
        audioSource.start(startTime, audioOffset);
      }

      console.log(`Explosion sound played (${repeats} layers)`);
      return true;
    } catch (error) {
      console.error('Explosion sound error:', error);
      return false;
    }
  }

  get enabled(): boolean {
    return this.isEnabled;
  }

  get context(): AudioContext | null {
    return this.audioCtx;
  }
}