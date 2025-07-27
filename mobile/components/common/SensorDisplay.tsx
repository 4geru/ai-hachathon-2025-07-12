'use client';

import React from 'react';
import { AccelerationData, OrientationData } from '@/types/firework';

interface SensorDisplayProps {
  accelerationData?: AccelerationData;
  orientationData?: OrientationData;
  showAcceleration?: boolean;
  showOrientation?: boolean;
  showTiltStrength?: boolean;
  launchThreshold?: number;
  className?: string;
}

export default function SensorDisplay({
  accelerationData,
  orientationData,
  showAcceleration = true,
  showOrientation = true,
  showTiltStrength = true,
  launchThreshold = 2.5,
  className = ''
}: SensorDisplayProps) {
  const calculateTiltStrength = () => {
    if (!accelerationData?.x || !accelerationData?.y) return 0;
    return Math.sqrt(accelerationData.x ** 2 + accelerationData.y ** 2);
  };

  const formatValue = (value: number | null) => {
    return value !== null ? value.toFixed(2) : 'N/A';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Acceleration Sensor Display */}
      {showAcceleration && accelerationData && (
        <div className="p-4 bg-blue-500 bg-opacity-20 border border-blue-400 rounded-lg">
          <h2 className="text-lg font-semibold mb-3 text-center text-blue-200">
            Acceleration Sensor
          </h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white bg-opacity-10 p-2 rounded">
              <p className="text-xs text-gray-300">X-axis</p>
              <p className="text-lg font-bold">{formatValue(accelerationData.x)}</p>
            </div>
            <div className="bg-white bg-opacity-10 p-2 rounded">
              <p className="text-xs text-gray-300">Y-axis</p>
              <p className="text-lg font-bold">{formatValue(accelerationData.y)}</p>
            </div>
            <div className="bg-white bg-opacity-10 p-2 rounded">
              <p className="text-xs text-gray-300">Z-axis</p>
              <p className="text-lg font-bold">{formatValue(accelerationData.z)}</p>
            </div>
          </div>
          
          {/* Tilt Strength Display */}
          {showTiltStrength && accelerationData.x !== null && accelerationData.y !== null && (
            <div className="mt-2 text-center">
              <p className="text-yellow-200 text-sm">
                Tilt strength: {calculateTiltStrength().toFixed(2)} (Launch threshold: {launchThreshold})
              </p>
            </div>
          )}
        </div>
      )}

      {/* Orientation Sensor Display */}
      {showOrientation && orientationData && (
        <div className="p-4 bg-purple-500 bg-opacity-20 border border-purple-400 rounded-lg">
          <h2 className="text-lg font-semibold mb-3 text-center text-purple-200">
            Orientation Sensor
          </h2>
          <div className="space-y-2">
            <div className="bg-white bg-opacity-10 p-2 rounded flex justify-between">
              <span className="text-sm text-gray-300">Alpha (Z-axis):</span>
              <span className="font-bold">{formatValue(orientationData.alpha)}°</span>
            </div>
            <div className="bg-white bg-opacity-10 p-2 rounded flex justify-between">
              <span className="text-sm text-gray-300">Beta (X-axis):</span>
              <span className="font-bold">{formatValue(orientationData.beta)}°</span>
            </div>
            <div className="bg-white bg-opacity-10 p-2 rounded flex justify-between">
              <span className="text-sm text-gray-300">Gamma (Y-axis):</span>
              <span className="font-bold">{formatValue(orientationData.gamma)}°</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}