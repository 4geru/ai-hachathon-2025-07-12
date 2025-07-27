'use client';

import React, { useRef, useEffect } from 'react';
import p5 from 'p5';

interface FireworkVibe {
  color: string;
  size: number;
  pattern: string;
  seed: number;
}

interface P5FireworksProps {
  vibe?: FireworkVibe;
  position?: 'center' | 'random';
  fireworkEvent?: {
    id: string;
    vibe: FireworkVibe;
    timestamp: number;
    audioDuration?: number;
    clickPosition?: { x: number; y: number };
  } | null;
}

interface IParticleData {
  p: p5;
  pos: p5.Vector;
  vel: p5.Vector;
  acc: p5.Vector;
  lifespan: number;
  hue: number;
  saturation: number;
  brightness: number;
  exploded: boolean;
}

class Particle implements IParticleData {
  p: p5;
  pos: p5.Vector;
  vel: p5.Vector;
  acc: p5.Vector;
  lifespan: number;
  hue: number;
  saturation: number;
  brightness: number;
  exploded: boolean;

  constructor(p: p5, x: number, y: number, hue: number, lifespan: number, exploded: boolean = false) {
    this.p = p;
    this.pos = p.createVector(x, y);
    this.vel = p.createVector(0, 0);
    this.acc = p.createVector(0, 0);
    this.lifespan = lifespan;
    this.hue = hue;
    this.saturation = 100;
    this.brightness = 100;
    this.exploded = exploded;

    if (exploded) {
      this.vel = p5.Vector.random2D().mult(p.random(1, 10));
    } else {
      this.vel = p.createVector(0, p.random(-18, -12));
    }
  }

  applyForce(force: p5.Vector) {
    this.acc.add(force);
  }

  update() {
    if (!this.exploded) {
      this.applyForce(this.p.createVector(0, 0.2));
      this.vel.add(this.acc);
      this.pos.add(this.vel);
      this.acc.mult(0);
      this.lifespan -= 1;
    } else {
      this.vel.mult(0.95);
      this.applyForce(this.p.createVector(0, 0.1));
      this.vel.add(this.acc);
      this.pos.add(this.vel);
      this.acc.mult(0);
      this.lifespan -= 3;
    }
  }

  display() {
    this.p.stroke(this.hue, this.saturation, this.brightness, this.lifespan);
    this.p.strokeWeight(3);
    this.p.point(this.pos.x, this.pos.y);
  }

  isDead() {
    return this.lifespan < 0;
  }
}

class Firework {
  p: p5;
  firework: Particle;
  exploded: boolean;
  particles: Particle[];
  hue: number;
  size: number;
  pattern: string;
  audioDuration?: number;

  constructor(p: p5, x: number, y: number, vibe?: FireworkVibe, audioDuration?: number) {
    this.p = p;
    this.audioDuration = audioDuration;
    
    if (vibe) {
      this.hue = this.colorStringToHue(vibe.color);
      this.size = Math.max(1.0, Math.min(4.0, vibe.size / 30));
      this.pattern = vibe.pattern;
      p.randomSeed(vibe.seed);
    } else {
      this.hue = p.random(0, 360);
      this.size = 1.0;
      this.pattern = 'burst';
    }
    
    this.firework = new Particle(p, x, y, this.hue, 255);
    this.exploded = false;
    this.particles = [];
  }

  colorStringToHue(colorString: string): number {
    const colorMap: { [key: string]: number } = {
      '#ff6b6b': 0,
      '#4ecdc4': 180,
      '#45b7d1': 200,
      '#96ceb4': 120,
      '#ffeaa7': 50,
      '#fd79a8': 320,
      '#a29bfe': 250,
      '#fd7f6f': 10,
    };
    
    return colorMap[colorString] || this.p.random(0, 360);
  }

  update() {
    if (!this.exploded) {
      this.firework.update();
      if (this.firework.vel.y >= 0) {
        this.explode(this.firework.pos.x, this.firework.pos.y, this.hue);
        this.exploded = true;
        
        // 爆発タイミングで音声再生イベントを発行
        window.dispatchEvent(new CustomEvent('fireworkExploded', {
          detail: { 
            id: `explosion-${Date.now()}-${Math.random()}`,
            x: this.firework.pos.x, 
            y: this.firework.pos.y,
            hue: this.hue
          }
        }));
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].isDead()) {
        this.particles.splice(i, 1);
      }
    }
  }

  display() {
    if (!this.exploded) {
      this.firework.display();
    }
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].display();
    }
  }

  explode(x: number, y: number, baseHue: number) {
    let numParticles = 40;
    const lifespan = this.audioDuration ? Math.floor(this.audioDuration * 50) : 255;

    if (this.pattern === 'fountain') {
      numParticles = Math.floor(numParticles * 0.6);
    } else if (this.pattern === 'burst') {
      numParticles = Math.floor(numParticles * Math.min(this.size, 2.0));
    }

    for (let i = 0; i < numParticles; i++) {
      const particleHue = (baseHue + this.p.random(-30, 30)) % 360;
      const particle = new Particle(this.p, x, y, particleHue < 0 ? particleHue + 360 : particleHue, lifespan, true);
      
      if (this.pattern === 'fountain') {
        particle.vel = this.p.createVector(this.p.random(-2, 2), this.p.random(-8, -4));
      } else if (this.pattern === 'burst') {
        particle.vel = p5.Vector.random2D().mult(this.p.random(2, 15 * this.size));
      }
      
      this.particles.push(particle);
    }
  }

  isFinished() {
    return this.exploded && this.particles.length === 0;
  }
}

// グローバル変数でp5インスタンスを追跡
let globalP5Instance: p5 | null = null;

const P5Fireworks: React.FC<P5FireworksProps> = ({ vibe, position = 'random', fireworkEvent }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);
  const fireworksRef = useRef<Firework[]>([]);
  const lastEventIdRef = useRef<string | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    // SSRチェック - windowが存在しない場合は何もしない
    if (typeof window === 'undefined') return;
    if (mountedRef.current || !containerRef.current) return;
    
    // 遅延してcanvas作成（React重複レンダリング回避）
    const timeoutId = setTimeout(() => {
      // グローバルインスタンスが既に存在する場合は削除
      if (globalP5Instance) {
        globalP5Instance.remove();
        globalP5Instance = null;
      }
      
      // 既存のcanvasを削除（ページ全体から）
      const allCanvases = document.querySelectorAll('canvas');
      allCanvases.forEach(canvas => canvas.remove());
      
      mountedRef.current = true;
      
      const sketch = (p: p5) => {
        p.setup = () => {
          const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
          canvas.parent(containerRef.current!);
          p.colorMode(p.HSB, 360, 100, 100, 255);
          p.background(0);
          p.frameRate(50);
        };

        p.draw = () => {
          p.background(0, 0, 0, 25);
          for (let i = fireworksRef.current.length - 1; i >= 0; i--) {
            fireworksRef.current[i].update();
            fireworksRef.current[i].display();
            if (fireworksRef.current[i].isFinished()) {
              fireworksRef.current.splice(i, 1);
            }
          }
        };

        p.windowResized = () => {
          p.resizeCanvas(p.windowWidth, p.windowHeight);
        };

        p.mouseClicked = () => {
          if (p.mouseY < p.height - 50) {
            window.dispatchEvent(new CustomEvent('fireworkClickLaunch', {
              detail: { 
                id: `click-${Date.now()}`,
                x: p.mouseX, 
                y: p.mouseY,
                vibe: vibe || {
                  color: '#4ecdc4',
                  size: 50,
                  pattern: 'burst',
                  seed: Math.random()
                }
              }
            }));
          }
        };
      };

      p5InstanceRef.current = new p5(sketch);
      globalP5Instance = p5InstanceRef.current;
    }, 100); // 100ms遅延

    return () => {
      clearTimeout(timeoutId);
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
      if (globalP5Instance === p5InstanceRef.current) {
        globalP5Instance = null;
      }
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (fireworkEvent && fireworkEvent.id !== lastEventIdRef.current && p5InstanceRef.current) {
      const p = p5InstanceRef.current;
      
      let startX, startY;
      if (fireworkEvent.clickPosition) {
        startX = fireworkEvent.clickPosition.x;
        startY = fireworkEvent.clickPosition.y;
      } else {
        startX = position === 'center' ? p.width / 2 : p.random(p.width * 0.2, p.width * 0.8);
        startY = p.height - 50;
      }
      
      fireworksRef.current.push(new Firework(p, startX, startY, fireworkEvent.vibe, fireworkEvent.audioDuration));
      lastEventIdRef.current = fireworkEvent.id;
    }
  }, [fireworkEvent, position]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default P5Fireworks;