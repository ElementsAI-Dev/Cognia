'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

/**
 * Splash Screen Page
 *
 * This page is shown during app initialization while the main window loads.
 * It displays a loading animation with the Cognia branding.
 */

export default function SplashScreenPage() {
  const t = useTranslations('splashscreen');
  // Primary blue color for the splash
  const primary = '#3b82f6';
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');

  // Simulate loading progress with realistic stages
  useEffect(() => {
    const stages = [
      { progress: 0, text: t('initializing') },
      { progress: 15, text: t('loadingCore') },
      { progress: 35, text: t('initializingProviders') },
      { progress: 55, text: t('loadingThemes') },
      { progress: 75, text: t('preparingWorkspace') },
      { progress: 90, text: t('almostReady') },
      { progress: 100, text: t('ready') },
    ];
    
    // Set initial text
    setLoadingText(stages[0].text);

    let currentStage = 0;
    const interval = setInterval(() => {
      if (currentStage < stages.length) {
        setProgress(stages[currentStage].progress);
        setLoadingText(stages[currentStage].text);
        currentStage++;
      } else {
        clearInterval(interval);
      }
    }, 400);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#09090b] overflow-hidden">
      {/* Background gradient effects */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% -20%, rgba(59, 130, 246, 0.15), transparent),
                       radial-gradient(ellipse 60% 40% at 80% 100%, rgba(139, 92, 246, 0.1), transparent)`,
        }}
      />
      
      <div className="relative flex flex-col items-center gap-8">
        {/* Logo Container */}
        <div className="relative">
          {/* Outer rotating glow */}
          <div
            className="absolute -inset-8 rounded-full opacity-40"
            style={{
              background: `conic-gradient(from 0deg, transparent, ${primary}, transparent)`,
              animation: 'spin 4s linear infinite',
            }}
          />
          
          {/* Middle pulsing ring */}
          <div
            className="absolute -inset-5 rounded-full"
            style={{
              border: '2px solid rgba(59, 130, 246, 0.2)',
              animation: 'pulse-ring 2s ease-in-out infinite',
            }}
          />
          
          {/* Inner breathing ring */}
          <div
            className="absolute -inset-3 rounded-full"
            style={{
              border: '1px solid rgba(59, 130, 246, 0.15)',
              animation: 'pulse-ring 2s ease-in-out infinite 0.5s',
            }}
          />

          {/* Logo container with glass effect */}
          <div
            className="relative h-24 w-24 rounded-2xl flex items-center justify-center overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 0 60px rgba(59, 130, 246, 0.4), inset 0 0 30px rgba(59, 130, 246, 0.1)',
            }}
          >
            {/* Shimmer effect */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(45deg, ${primary}30, transparent, ${primary}15)`,
                animation: 'shimmer 3s ease-in-out infinite',
              }}
            />
            
            {/* Neural network logo */}
            <div className="relative z-10">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12" cy="12" r="3.5"
                  fill={primary}
                  style={{ animation: 'pulse 2s ease-in-out infinite' }}
                />
                <circle cx="12" cy="4" r="2" fill={primary} opacity="0.7" style={{ animation: 'pulse 2s ease-in-out infinite 0.2s' }} />
                <circle cx="12" cy="20" r="2" fill={primary} opacity="0.7" style={{ animation: 'pulse 2s ease-in-out infinite 0.4s' }} />
                <circle cx="4" cy="12" r="2" fill={primary} opacity="0.7" style={{ animation: 'pulse 2s ease-in-out infinite 0.6s' }} />
                <circle cx="20" cy="12" r="2" fill={primary} opacity="0.7" style={{ animation: 'pulse 2s ease-in-out infinite 0.8s' }} />
                <line x1="12" y1="8.5" x2="12" y2="6" stroke={primary} strokeWidth="1.5" opacity="0.6" />
                <line x1="12" y1="15.5" x2="12" y2="18" stroke={primary} strokeWidth="1.5" opacity="0.6" />
                <line x1="8.5" y1="12" x2="6" y2="12" stroke={primary} strokeWidth="1.5" opacity="0.6" />
                <line x1="15.5" y1="12" x2="18" y2="12" stroke={primary} strokeWidth="1.5" opacity="0.6" />
              </svg>
            </div>
          </div>
        </div>

        {/* Brand name */}
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-3xl font-semibold text-white tracking-tight">
            {t('appName')}
          </h1>
          <p className="text-sm text-white/50">
            {t('appDescription')}
          </p>
          
          {/* Progress bar container */}
          <div className="w-48 flex flex-col items-center gap-2 mt-2">
            {/* Progress bar background */}
            <div
              className="relative w-full h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              {/* Progress bar fill */}
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${primary}, ${primary}cc)`,
                  boxShadow: `0 0 12px rgba(59, 130, 246, 0.4)`,
                }}
              />
              {/* Shimmer effect */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                  animation: 'progress-shimmer 1.5s ease-in-out infinite',
                }}
              />
            </div>
            
            {/* Progress percentage and text */}
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-medium text-white/50 transition-all duration-300">
                {loadingText}
              </span>
              <span className="text-xs font-mono" style={{ color: primary }}>
                {progress}%
              </span>
            </div>
          </div>
        </div>

        {/* Version info */}
        <p className="text-xs text-white/30 mt-4">
          Version 0.1.0
        </p>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.95); }
        }
        @keyframes pulse-ring {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.08); opacity: 0.6; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes progress-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
