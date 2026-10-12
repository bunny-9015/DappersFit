/**
 * usePWA — React hook for PWA install prompt, SW updates, and online status.
 */
import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PWAStatus {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  hasUpdate: boolean;
  swRegistration: ServiceWorkerRegistration | null;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  applyUpdate: () => void;
  dismissUpdate: () => void;
}

export function usePWA(): PWAStatus {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  // ── Detect installed state ─────────────────────────────────
  useEffect(() => {
    const mql = window.matchMedia('(display-mode: standalone)');
    setIsInstalled(mql.matches || (navigator as any).standalone === true);
    const handler = (e: MediaQueryListEvent) => setIsInstalled(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // ── Capture install prompt ─────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // ── Online / Offline ───────────────────────────────────────
  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, []);

  // ── Service Worker registration & update detection ─────────
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let mounted = true;

    navigator.serviceWorker.ready.then((reg) => {
      if (!mounted) return;
      setSwRegistration(reg);

      // Check for an already waiting worker
      if (reg.waiting) {
        setWaitingWorker(reg.waiting);
        setHasUpdate(true);
      }

      // Listen for new workers installing
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            if (mounted) {
              setWaitingWorker(newWorker);
              setHasUpdate(true);
            }
          }
        });
      });
    });

    // Listen for controller change (update applied)
    let refreshing = false;
    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      mounted = false;
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  // ── Prompt Install ─────────────────────────────────────────
  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) return 'unavailable';
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setIsInstallable(false);
      if (outcome === 'accepted') setIsInstalled(true);
      return outcome;
    } catch {
      return 'dismissed';
    }
  }, [deferredPrompt]);

  // ── Apply SW Update ────────────────────────────────────────
  const applyUpdate = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  }, [waitingWorker]);

  const dismissUpdate = useCallback(() => {
    setHasUpdate(false);
  }, []);

  return {
    isInstallable,
    isInstalled,
    isOnline,
    hasUpdate,
    swRegistration,
    promptInstall,
    applyUpdate,
    dismissUpdate,
  };
}
