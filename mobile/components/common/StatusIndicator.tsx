'use client';

import React from 'react';
import { ConnectionStatus } from '@/types/firework';

interface StatusIndicatorProps {
  connectionStatus: ConnectionStatus;
  className?: string;
}

export default function StatusIndicator({ connectionStatus, className = '' }: StatusIndicatorProps) {
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'disconnected':
      case 'error':
      default: return 'bg-orange-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Real-time connected';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Polling mode';
      case 'error': return 'Connection error';
      default: return 'Unknown status';
    }
  };

  const shouldAnimate = connectionStatus === 'connected' || connectionStatus === 'connecting';

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div 
        className={`w-3 h-3 rounded-full ${getStatusColor()} ${shouldAnimate ? 'animate-pulse' : ''}`}
      ></div>
      <span className="text-sm hidden sm:inline">
        {getStatusText()}
      </span>
    </div>
  );
}