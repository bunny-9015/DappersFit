/**
 * PWAInstallBanner — Premium install prompt banner for Dappersfit
 * Appears at the bottom of the screen when the app is installable.
 */
import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Zap, WifiOff } from 'lucide-react';

interface PWAInstallBannerProps {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  onInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

export default function PWAInstallBanner({
  isInstallable,
  isInstalled,
  isOnline,
  onInstall,
}: PWAInstallBannerProps) {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('pwa_banner_dismissed') === 'true';
  });
  const [installing, setInstalling] = useState(false);
  const [showOfflineToast, setShowOfflineToast] = useState(false);

  // Show offline toast when going offline
  useEffect(() => {
    if (!isOnline) {
      setShowOfflineToast(true);
      const t = setTimeout(() => setShowOfflineToast(false), 5000);
      return () => clearTimeout(t);
    }
  }, [isOnline]);

  const handleInstall = async () => {
    setInstalling(true);
    const outcome = await onInstall();
    setInstalling(false);
    if (outcome !== 'accepted') {
      // If dismissed by user, remember for this session
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa_banner_dismissed', 'true');
  };

  const showBanner = isInstallable && !isInstalled && !dismissed;

  return (
    <>
      {/* ── Offline Toast ──────────────────────────────────── */}
      <div
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-500 ${
          showOfflineToast
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#1c1b1a] border border-red-500/30 rounded-full shadow-2xl backdrop-blur-md">
          <WifiOff className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span className="text-xs font-semibold text-red-300">
            You're offline — some features may be unavailable
          </span>
        </div>
      </div>

      {/* ── Install Banner ─────────────────────────────────── */}
      <div
        id="pwa-install-banner"
        className={`fixed bottom-0 left-0 right-0 z-[9998] transition-all duration-500 ease-out ${
          showBanner
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-full pointer-events-none'
        }`}
      >
        {/* Gradient border top */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#b8862f] to-transparent" />

        <div className="bg-[#0f172a]/95 backdrop-blur-xl border-t border-[#2a2826] px-4 pt-4 pb-6">
          <div className="max-w-lg mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#b8862f] flex items-center justify-center text-white font-black text-lg shrink-0 shadow-md">
                  D
                </div>
                <div>
                  <div className="text-sm font-bold text-white leading-tight">Install Dappersfit</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Add to your home screen</div>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition"
                aria-label="Dismiss install prompt"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Feature pills */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {[
                { icon: Zap, label: 'Instant launch' },
                { icon: Smartphone, label: 'Native feel' },
                { icon: WifiOff, label: 'Works offline' },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-semibold text-slate-400"
                >
                  <Icon className="w-3 h-3 text-[#b8862f]" />
                  {label}
                </div>
              ))}
            </div>

            {/* Install button */}
            <button
              id="pwa-install-btn"
              onClick={handleInstall}
              disabled={installing}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#b8862f] hover:bg-[#d4a843] text-black font-bold text-sm rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-[#b8862f]/20 hover:shadow-[#b8862f]/30 hover:-translate-y-0.5 active:translate-y-0"
            >
              {installing ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                  Installing…
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Install App
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
