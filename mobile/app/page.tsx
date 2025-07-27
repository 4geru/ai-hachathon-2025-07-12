'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    // Generate star-like sparkles for background
    const newSparkles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 3
    }));
    setSparkles(newSparkles);
  }, []);

  return (
    <div className={styles.container}>
      {/* Background sparkles */}
      <div className={styles.sparkles}>
        {sparkles.map((sparkle) => (
          <div
            key={sparkle.id}
            className={styles.sparkle}
            style={{
              left: `${sparkle.x}%`,
              top: `${sparkle.y}%`,
              animationDelay: `${sparkle.delay}s`
            }}
          />
        ))}
      </div>

      <header className={styles.header}>
        <div className={styles.logo}>
          <h1 className={styles.title}>
            <span className={styles.sky}>Sky</span>
            <span className={styles.canvas}>Canvas</span>
          </h1>
          <p className={styles.subtitle}>Draw your creativity in the sky</p>
        </div>
      </header>

      <main className={styles.main}>
        {/* Hero section */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <h2 className={styles.heroTitle}>
              🎵 <span className={styles.vibes}>Vibes</span> = 
              🎆 <span className={styles.fireworks}>Fireworks</span> = 
              🔊 <span className={styles.sound}>Sound</span>
            </h2>
            <p className={styles.heroDescription}>
              Your emotions become fireworks. A completely new experience woven by music and light.
              <br />
              Simply shake your smartphone, and your heart's movements dance in the sky.
            </p>
            <div className={styles.demoVideo}>
              <div className={styles.mockFirework}>
                <div className={styles.fireworkCore}></div>
                <div className={styles.fireworkParticles}></div>
              </div>
            </div>
          </div>
        </section>

        {/* Features section */}
        <section className={styles.features}>
          <h3 className={styles.sectionTitle}>✨ 3 Experience Layers</h3>
          <div className={styles.featureGrid}>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>🎵</div>
              <h4>Emotion Layer</h4>
              <p>Sensors detect your "Vibe" and read the movements of your emotions</p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>🎆</div>
              <h4>Visual Layer</h4>
              <p>Visualize emotions as beautiful fireworks. Express through color, shape, and size</p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>🔊</div>
              <h4>Audio Layer</h4>
              <p>Complete immersion with music and sound effects. Perfect synchronization between fireworks and music</p>
            </div>
          </div>
        </section>

        {/* How it works section */}
        <section className={styles.howItWorks}>
          <h3 className={styles.sectionTitle}>🚀 How It Works</h3>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <h4>Choose Device</h4>
              <p>Control with smartphone, enjoy on big screen</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <h4>Express Emotions</h4>
              <p>Shake your smartphone to convey your Vibes</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <h4>Enjoy Fireworks</h4>
              <p>Experience beautiful fireworks synchronized with music on the big screen</p>
            </div>
          </div>
        </section>

        {/* Navigation section */}
        <section className={styles.navigation}>
          <h3 className={styles.sectionTitle}>🎯 Start Experience</h3>
          <div className={styles.navButtons}>
            <Link href="/phone" className={styles.navButton}>
              <div className={styles.buttonIcon}>📱</div>
              <div className={styles.buttonContent}>
                <h4>Phone</h4>
                <p>Control with smartphone</p>
                <small>Detect Vibes with sensors</small>
              </div>
            </Link>
            <Link href="/display" className={styles.navButton}>
              <div className={styles.buttonIcon}>🖥️</div>
              <div className={styles.buttonContent}>
                <h4>Display</h4>
                <p>Watch on big screen</p>
                <small>Display fireworks symphony</small>
              </div>
            </Link>
          </div>
        </section>

        {/* Technology section */}
        <section className={styles.tech}>
          <h3 className={styles.sectionTitle}>🛠️ Technology Stack</h3>
          <div className={styles.techGrid}>
            <div className={styles.techItem}>
              <span className={styles.techLabel}>🎵 Audio Processing</span>
              <span className={styles.techValue}>Web Audio API</span>
            </div>
            <div className={styles.techItem}>
              <span className={styles.techLabel}>🎆 Fireworks Engine</span>
              <span className={styles.techValue}>p5.js + WebGL</span>
            </div>
            <div className={styles.techItem}>
              <span className={styles.techLabel}>📱 Sensors</span>
              <span className={styles.techValue}>DeviceMotion API</span>
            </div>
            <div className={styles.techItem}>
              <span className={styles.techLabel}>🔄 Real-time</span>
              <span className={styles.techValue}>Supabase Realtime</span>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p className={styles.footerText}>
            <span className={styles.heartbeat}>💖</span>
            Vibes = Fireworks = Sound. Your heart dances in the sky.
          </p>
          <p className={styles.footerCredit}>
            Created with ❤️ for Supabase Launch Week 15 hackathon
          </p>
        </div>
      </footer>
    </div>
  );
}
