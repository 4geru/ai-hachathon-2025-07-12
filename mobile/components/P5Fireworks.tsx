'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import p5 from 'p5';

interface FireworkVibe {
  color: string;
  size: number;
  pattern: string;
  seed: number;
}

interface P5FireworksProps {
  vibe?: FireworkVibe;
  position?: 'center' | 'random'; // 発射位置を制御
  fireworkEvent?: {
    id: string;
    vibe: FireworkVibe;
    timestamp: number;
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
  // 多段階破裂のための追加プロパティ
  isSecondaryTrigger?: boolean; // 二次爆発をトリガーするパーティクルか
  secondaryExplosionDelay?: number; // 二次爆発までの遅延時間
  hasTriggeredSecondary?: boolean; // 二次爆発が既にトリガーされたか
  isChildParticle?: boolean; // 二次爆発で生成されたパーティクルか
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
  isSecondaryTrigger?: boolean;
  secondaryExplosionDelay?: number;
  hasTriggeredSecondary?: boolean;
  isChildParticle?: boolean;

  constructor(p: p5, x: number, y: number, hue: number, lifespan: number, exploded: boolean = false, isSecondaryTrigger: boolean = false, secondaryExplosionDelay: number = 0, isChildParticle: boolean = false) {
    this.p = p;
    this.pos = p.createVector(x, y);
    this.vel = p.createVector(0, 0);
    this.acc = p.createVector(0, 0);
    this.lifespan = lifespan;
    this.hue = hue;
    this.saturation = 100;
    this.brightness = 100;
    this.exploded = exploded;
    this.isSecondaryTrigger = isSecondaryTrigger;
    this.secondaryExplosionDelay = secondaryExplosionDelay;
    this.hasTriggeredSecondary = false;
    this.isChildParticle = isChildParticle;

    if (exploded) {
      this.vel = p5.Vector.random2D().mult(p.random(1, 10));
    } else {
      this.vel = p.createVector(0, p.random(-18, -12)); // Initial upward velocity for launch (increased for higher launch)
    }
  }

  applyForce(force: p5.Vector) {
    this.acc.add(force);
  }

  update() {
    if (!this.exploded) {
      this.applyForce(this.p.createVector(0, 0.2)); // Gravity for launch particle
      this.vel.add(this.acc);
      this.pos.add(this.vel);
      this.acc.mult(0);
      this.lifespan -= 1;
    } else {
      this.vel.mult(0.95); // Air resistance for exploded particles
      this.applyForce(this.p.createVector(0, 0.1)); // Gravity for exploded particles
      this.vel.add(this.acc);
      this.pos.add(this.vel);
      this.acc.mult(0);
      // 二次爆発をトリガーするロジック
      if (this.isSecondaryTrigger && !this.hasTriggeredSecondary && this.lifespan <= (255 - this.secondaryExplosionDelay! * 100)) { // 遅延時間に応じてライフスパンを調整
        // 二次爆発のトリガー
        window.dispatchEvent(new CustomEvent('secondaryExplosion', {
          detail: { x: this.pos.x, y: this.pos.y, hue: this.hue }
        }));
        this.hasTriggeredSecondary = true;
      }
      this.lifespan -= this.isChildParticle ? 3 : 2; // 子パーティクルはより早く消える
    }
  }

  display() {
    this.p.stroke(this.hue, this.saturation, this.brightness, this.lifespan);
    this.p.strokeWeight(3); // パーティクルのサイズを大きくして、より見やすく
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

  constructor(p: p5, x: number, y: number, vibe?: FireworkVibe) {
    this.p = p;
    
    // vibeデータがある場合はそれを使用、なければランダム
    if (vibe) {
      // 色文字列をHSBの色相に変換
      this.hue = this.colorStringToHue(vibe.color);
      this.size = Math.max(1.0, Math.min(4.0, vibe.size / 30)); // サイズを1.0-4.0の範囲に正規化（より大きく）
      this.pattern = vibe.pattern;
      
      // シードを使用してランダムを再現可能にする
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

  // 色文字列をHSBの色相に変換
  colorStringToHue(colorString: string): number {
    // 簡単な色マッピング（実際のプロジェクトではより高度な変換が必要）
    const colorMap: { [key: string]: number } = {
      '#ff6b6b': 0,    // 赤
      '#4ecdc4': 180,  // シアン
      '#45b7d1': 200,  // 青
      '#96ceb4': 120,  // 緑
      '#ffeaa7': 50,   // 黄
      '#fd79a8': 320,  // ピンク
      '#a29bfe': 250,  // 紫
      '#fd7f6f': 10,   // オレンジ
    };
    
    return colorMap[colorString] || this.p.random(0, 360);
  }

  update() {
    if (!this.exploded) {
      this.firework.update();
      if (this.firework.vel.y >= 0) { // When launch particle starts falling, explode
        this.explode(this.firework.pos.x, this.firework.pos.y, this.hue, false);
        this.exploded = true;
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

  // explodeメソッドを拡張して、パターンとサイズに対応
  explode(x: number, y: number, baseHue: number, isSecondary: boolean = false) {
    let numParticles = isSecondary ? 50 : 100;
    const lifespan = isSecondary ? 100 : 255;

    // パターンに応じてパーティクル数を調整
    if (this.pattern === 'fountain') {
      numParticles = Math.floor(numParticles * 0.7); // 噴水は少なめ
    } else if (this.pattern === 'burst') {
      numParticles = Math.floor(numParticles * this.size); // サイズに応じて調整
    }

    for (let i = 0; i < numParticles; i++) {
      const particleHue = (baseHue + this.p.random(-30, 30)) % 360;
      const isSecondaryTrigger = !isSecondary && this.p.random() < 0.1;
      const secondaryDelay = isSecondaryTrigger ? this.p.random(0.3, 1.0) : 0;

      const particle = new Particle(this.p, x, y, particleHue < 0 ? particleHue + 360 : particleHue, lifespan, true, isSecondaryTrigger, secondaryDelay, isSecondary);
      
      // パターンに応じて初期速度を調整
      if (this.pattern === 'fountain') {
        // 噴水パターン：上方向メインで少し横にも散らばる
        particle.vel = this.p.createVector(this.p.random(-2, 2), this.p.random(-8, -4));
      } else if (this.pattern === 'burst') {
        // バーストパターン：全方向に均等に散らばる
        particle.vel = p5.Vector.random2D().mult(this.p.random(2, 15 * this.size));
      }
      
      this.particles.push(particle);
    }
  }

  isFinished() {
    return this.exploded && this.particles.length === 0;
  }
}

const P5Fireworks: React.FC<P5FireworksProps> = ({ vibe, position = 'random', fireworkEvent }) => {
  const sketchRef = useRef<HTMLDivElement>(null);
  const p5Instance = useRef<p5 | null>(null);
  const fireworks = useRef<Firework[]>([]);
  const lastEventId = useRef<string | null>(null);

  const sketch = useCallback((p: p5) => {
    p.setup = () => {
      p.createCanvas(p.windowWidth, p.windowHeight).parent(sketchRef.current || document.body);
      p.colorMode(p.HSB, 360, 100, 100, 255);
      p.background(0);
      
      // 自動的に花火を発射しない（fireworkEventがある場合のみ発射）
    };

    p.draw = () => {
      p.background(0, 0, 0, 25); // Trailing effect
      for (let i = fireworks.current.length - 1; i >= 0; i--) {
        fireworks.current[i].update();
        fireworks.current[i].display();
        if (fireworks.current[i].isFinished()) {
          fireworks.current.splice(i, 1);
        }
      }
    };

    p.windowResized = () => {
      p.resizeCanvas(p.windowWidth, p.windowHeight);
    };

    p.mouseClicked = () => {
      if (p.mouseY < p.height - 50) {
        fireworks.current.push(new Firework(p, p.mouseX, p.mouseY, vibe));
      }
    };

    // カスタムイベントリスナーを追加して二次爆発を処理
    window.addEventListener('secondaryExplosion', (event: Event) => {
      const customEvent = event as CustomEvent;
      const { x, y, hue } = customEvent.detail;
      const parentFirework = fireworks.current.find(fw => fw.exploded && fw.particles.some(p => p.pos.x === x && p.pos.y === y));
      if (parentFirework) {
        parentFirework.explode(x, y, hue, true);
      } else {
        const newFirework = new Firework(p, x, y, vibe);
        newFirework.explode(x, y, hue, true);
        fireworks.current.push(newFirework);
      }
    });

  }, [vibe]);

  // 新しい花火イベントを監視
  useEffect(() => {
    if (fireworkEvent && fireworkEvent.id !== lastEventId.current && p5Instance.current) {
      const p = p5Instance.current;
      const startX = position === 'center' ? p.width / 2 : p.random(p.width * 0.2, p.width * 0.8);
      const startY = p.height - 50;
      fireworks.current.push(new Firework(p, startX, startY, fireworkEvent.vibe));
      lastEventId.current = fireworkEvent.id;
      console.log('New firework added:', fireworkEvent.id);
    }
  }, [fireworkEvent, position]);

  useEffect(() => {
    if (sketchRef.current && !p5Instance.current) {
      p5Instance.current = new p5(sketch, sketchRef.current);
    }

    return () => {
      if (p5Instance.current) {
        p5Instance.current.remove();
        p5Instance.current = null;
      }
    };
  }, [sketch]);

  return <div ref={sketchRef} className="w-full h-full" />;
};

export default P5Fireworks; 