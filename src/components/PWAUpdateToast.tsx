/**
 * PWAUpdateToast — Notifies user when a new version of the app is available.
 */
import React from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';

interface PWAUpdateToastProps {
  hasUpdate: boolean;
  onApplyUpdate: () => void;
  onDismiss: () => void;
}

export default function PWAUpdateToast({
  hasUpdate,
  onApplyUpdate,
  onDismiss,
}: PWAUpdateToastProps) {
  if (!hasUpdate) return null;

  return (
    <div
      id="pwa-update-toast"
      className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full animate-in slide-in-from-bottom-5 duration-300 pointer-events-auto"
    >
      <div className="bg-[#1c1b1a]/95 backdrop-blur-xl border border-[#b8862f]/40 rounded-2xl p-4 shadow-2xl text-slate-100 flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-[#b8862f]/20 border border-[#b8862f]/40 flex items-center justify-center text-[#b8862f] shrink-0">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-white flex items-center gap-1.5">
            Update Available
            <span className="inline-block w-2 h-2 rounded-full bg-[#b8862f] animate-ping" />
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
            A new version of Dappersfit is ready with fresh updates and improvements.
          </p>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={onApplyUpdate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#b8862f] hover:bg-[#d4a843] text-black text-xs font-bold rounded-lg transition-all shadow-md active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload & Update
            </button>
            <button
              onClick={onDismiss}
              className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-medium rounded-lg transition"
            >
              Later
            </button>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="text-slate-500 hover:text-slate-300 p-1 rounded-lg transition"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
