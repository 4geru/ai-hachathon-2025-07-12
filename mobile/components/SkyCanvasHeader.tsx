'use client';

import React from 'react';

interface SkyCanvasHeaderProps {
  variant?: 'display' | 'phone';
  showConnectionStatus?: boolean;
  connectionStatus?: 'connecting' | 'connected' | 'disconnected' | 'error';
  phoneUrl?: string;
}

export default function SkyCanvasHeader({ 
  variant = 'display', 
  showConnectionStatus = false,
  connectionStatus = 'connecting',
  phoneUrl 
}: SkyCanvasHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black bg-opacity-80 backdrop-blur-sm border-b border-gray-600 h-16">
      <div className="container mx-auto px-4 h-full">
        <div className="flex items-center justify-between h-full">
          {/* ロゴ・タイトル部分 */}
          <div className="flex items-center space-x-3">
            <div>
              <h1 className="text-xl font-bold text-white">🎆 Sky Canvas 🎆</h1>
              <p className="text-xs text-gray-300">
                {variant === 'display' ? '空に描く、あなたの創造力' : 'スマートフォンコントローラー'}
              </p>
            </div>
          </div>

          {/* 右側情報 */}
          <div className="flex items-center space-x-4">
            {/* Phone URL表示 (display版のみ) */}
            {variant === 'display' && phoneUrl && (
              <div className="hidden md:block text-right">
                <p className="text-xs text-gray-400">操作用URL:</p>
                <a 
                  href={phoneUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sm text-cyan-400 hover:underline"
                >
                  {phoneUrl.replace('http://', '').replace('https://', '')}
                </a>
              </div>
            )}

            {/* 接続状態表示 */}
            {showConnectionStatus && (
              <div className="flex items-center space-x-2">
                {connectionStatus === 'connected' && (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-200 text-sm hidden sm:inline">接続中</span>
                  </>
                )}
                {connectionStatus === 'connecting' && (
                  <>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                    <span className="text-yellow-200 text-sm hidden sm:inline">接続中...</span>
                  </>
                )}
                {(connectionStatus === 'disconnected' || connectionStatus === 'error') && (
                  <>
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-orange-200 text-sm hidden sm:inline">オフライン</span>
                  </>
                )}
              </div>
            )}

            {/* バージョン表示 */}
            <div className="text-xs text-gray-500">
              v1.0
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}