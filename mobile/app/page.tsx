'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    // 背景の星のようなスパークルを生成
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
      {/* 背景のスパークル */}
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
          <p className={styles.subtitle}>空に描く、あなたの創造力</p>
        </div>
      </header>

      <main className={styles.main}>
        {/* ヒーローセクション */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <h2 className={styles.heroTitle}>
              🎵 <span className={styles.vibes}>Vibes</span> = 
              🎆 <span className={styles.fireworks}>花火</span> = 
              🔊 <span className={styles.sound}>音</span>
            </h2>
            <p className={styles.heroDescription}>
              あなたの感情が花火になる。音楽と光が織りなす全く新しい体験。
              <br />
              スマートフォンを振るだけで、心の動きが空に舞い踊ります。
            </p>
            <div className={styles.demoVideo}>
              <div className={styles.mockFirework}>
                <div className={styles.fireworkCore}></div>
                <div className={styles.fireworkParticles}></div>
              </div>
            </div>
          </div>
        </section>

        {/* 特徴セクション */}
        <section className={styles.features}>
          <h3 className={styles.sectionTitle}>✨ 3つの体験レイヤー</h3>
          <div className={styles.featureGrid}>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>🎵</div>
              <h4>感情層</h4>
              <p>あなたの「Vibe」をセンサーで感知し、感情の動きを読み取ります</p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>🎆</div>
              <h4>視覚層</h4>
              <p>感情を美しい花火として可視化。色・形・大きさで表現します</p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>🔊</div>
              <h4>聴覚層</h4>
              <p>音楽・音響効果で完全没入。花火と音楽が完全同期します</p>
            </div>
          </div>
        </section>

        {/* 使い方セクション */}
        <section className={styles.howItWorks}>
          <h3 className={styles.sectionTitle}>🚀 使い方</h3>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <h4>デバイスを選択</h4>
              <p>スマートフォンで操作、大画面で鑑賞</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <h4>感情を表現</h4>
              <p>スマートフォンを振って、あなたのVibesを伝える</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <h4>花火を楽しむ</h4>
              <p>音楽と連動した美しい花火を大画面で体験</p>
            </div>
          </div>
        </section>

        {/* ナビゲーションセクション */}
        <section className={styles.navigation}>
          <h3 className={styles.sectionTitle}>🎯 体験を始める</h3>
          <div className={styles.navButtons}>
            <Link href="/phone" className={styles.navButton}>
              <div className={styles.buttonIcon}>📱</div>
              <div className={styles.buttonContent}>
                <h4>Phone</h4>
                <p>スマートフォンで操作</p>
                <small>センサーでVibesを感知</small>
              </div>
            </Link>
            <Link href="/display" className={styles.navButton}>
              <div className={styles.buttonIcon}>🖥️</div>
              <div className={styles.buttonContent}>
                <h4>Display</h4>
                <p>大画面で鑑賞</p>
                <small>花火シンフォニーを表示</small>
              </div>
            </Link>
          </div>
        </section>

        {/* 技術情報セクション */}
        <section className={styles.tech}>
          <h3 className={styles.sectionTitle}>🛠️ 技術スタック</h3>
          <div className={styles.techGrid}>
            <div className={styles.techItem}>
              <span className={styles.techLabel}>🎵 音楽処理</span>
              <span className={styles.techValue}>Web Audio API</span>
            </div>
            <div className={styles.techItem}>
              <span className={styles.techLabel}>🎆 花火エンジン</span>
              <span className={styles.techValue}>p5.js + WebGL</span>
            </div>
            <div className={styles.techItem}>
              <span className={styles.techLabel}>📱 センサー</span>
              <span className={styles.techValue}>DeviceMotion API</span>
            </div>
            <div className={styles.techItem}>
              <span className={styles.techLabel}>🔄 リアルタイム</span>
              <span className={styles.techValue}>Supabase Realtime</span>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p className={styles.footerText}>
            <span className={styles.heartbeat}>💖</span>
            Vibes = 花火 = 音。あなたの心が空に舞い踊る。
          </p>
          <p className={styles.footerCredit}>
            Created with ❤️ for ゆるVibeCodingハッカソン
          </p>
        </div>
      </footer>
    </div>
  );
}
