/**
 * Splash Screen Page
 *
 * This page is shown during app initialization while the main window loads.
 * It displays a loading animation with the Cognia branding.
 */

export default function SplashScreenPage() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-primary via-primary/80 to-primary/60">
      <div className="flex flex-col items-center gap-6">
        {/* Logo/Icon */}
        <div className="relative">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-pulse text-white"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>

          {/* Pulsing rings */}
          <div className="absolute inset-0 -m-4 animate-ping rounded-full bg-white/20 opacity-75" />
          <div className="absolute inset-0 -m-8 animate-ping rounded-full bg-white/10 opacity-50 animation-delay-500" />
        </div>

        {/* App name */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Cognia
          </h1>
          <p className="mt-2 text-sm text-white/80">
            AI Chat Assistant
          </p>
        </div>

        {/* Loading indicator */}
        <div className="mt-4 flex items-center gap-2">
          <div className="h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:-0.3s]" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:-0.15s]" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-white" />
        </div>

        {/* Version info */}
        <p className="mt-4 text-xs text-white/60">
          Version 0.1.0
        </p>
      </div>

      <style jsx>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        .animate-ping {
          animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .animation-delay-500 {
          animation-delay: 500ms;
        }
      `}</style>
    </div>
  );
}
