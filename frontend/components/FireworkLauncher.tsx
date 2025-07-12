'use client';

import React from 'react';

interface FireworkLauncherProps {
  onLaunch: () => void;
}

const FireworkLauncher: React.FC<FireworkLauncherProps> = ({ onLaunch }) => {
  return (
    <button
      onClick={onLaunch}
      style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 100,
        padding: '10px 20px',
        fontSize: '16px',
        cursor: 'pointer',
        backgroundColor: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        boxShadow: '2px 2px 5px rgba(0,0,0,0.3)',
      }}
    >
      Launch New Firework
    </button>
  );
};

export default FireworkLauncher; 