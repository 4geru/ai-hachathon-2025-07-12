'use client';

import React from 'react';

export default function DisplayPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center', backgroundColor: '#000' }}>
      <h1 style={{ color: '#fff' }}>Sky Canvas Display</h1>
      <p style={{ color: '#fff' }}>Waiting for fireworks...</p>
      {/* ここに花火のレンダリングコンポーネントを配置します */}
    </div>
  );
} 