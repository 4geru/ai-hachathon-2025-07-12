'use client';

import React from 'react';

interface TiltStrengthIndicatorProps {
  tiltStrength: number;
  threshold: number;
  readyThreshold?: number;
  showProgressBar?: boolean;
  className?: string;
}

export default function TiltStrengthIndicator({
  tiltStrength,
  threshold,
  readyThreshold = threshold * 0.8,
  showProgressBar = true,
  className = ''
}: TiltStrengthIndicatorProps) {
  const getStatusColor = () => {
    if (tiltStrength >= threshold) return 'text-red-200';
    if (tiltStrength >= readyThreshold) return 'text-yellow-200';
    return 'text-gray-300';
  };

  const getProgressColor = () => {
    if (tiltStrength >= threshold) return 'bg-red-400';
    if (tiltStrength >= readyThreshold) return 'bg-yellow-400';
    return 'bg-blue-400';
  };

  const getProgressPercentage = () => {
    return Math.min((tiltStrength / threshold) * 100, 100);
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-300">Tilt Strength</span>
        <span className={`font-mono ${getStatusColor()}`}>
          {tiltStrength.toFixed(1)} / {threshold}
        </span>
      </div>
      
      {showProgressBar && (
        <div className="w-full bg-gray-600 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-200 ${getProgressColor()}`}
            style={{ width: `${getProgressPercentage()}%` }}
          ></div>
        </div>
      )}
    </div>
  );
}