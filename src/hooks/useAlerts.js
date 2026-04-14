import { useEffect, useRef, useCallback } from 'react';

const SETTINGS_KEY = 'qa-alert-settings';

export function loadAlertSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveAlertSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function playBeep(frequency = 880, duration = 250) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration / 1000);
  } catch (e) {
    // AudioContext not available
  }
}

function sendNotification(title, body) {
  if (Notification.permission === 'granted') {
    new Notification(title, { body: body.substring(0, 100), icon: '/favicon.ico' });
  }
}

export function useAlerts(stream, settings) {
  const prevErrorCount = useRef(0);
  const lastImagingObtained = useRef(0);
  const lastImagingTime = useRef(null);
  const stallTimerRef = useRef(null);

  const stallThreshold = (settings?.stallThresholdSec || 30) * 1000;
  const soundEnabled = settings?.soundEnabled ?? true;
  const notifyEnabled = settings?.notifyEnabled ?? false;

  // Detect new errors
  useEffect(() => {
    const current = stream.errorCount || 0;
    if (current > prevErrorCount.current && stream.connectionStatus === 'connected') {
      const latestError = stream.errors?.[stream.errors.length - 1];
      if (soundEnabled) playBeep(660, 300);
      if (notifyEnabled) sendNotification('⚠️ 에러 발생', latestError?.message || 'Error detected');
    }
    prevErrorCount.current = current;
  }, [stream.errorCount]);

  // Track imaging stall
  useEffect(() => {
    const obtained = stream.imagingObtained || 0;
    if (obtained !== lastImagingObtained.current) {
      lastImagingObtained.current = obtained;
      lastImagingTime.current = Date.now();
      if (stallTimerRef.current) clearInterval(stallTimerRef.current);
      if (stream.connectionStatus === 'connected' && stream.currentStep === 'imaging') {
        stallTimerRef.current = setInterval(() => {
          const elapsed = Date.now() - (lastImagingTime.current || Date.now());
          if (elapsed >= stallThreshold) {
            if (soundEnabled) playBeep(440, 500);
            if (notifyEnabled) sendNotification('⏸️ 이미징 정지', `${Math.floor(elapsed/1000)}초 동안 이미징 진행 없음 (${obtained}장 취득)`);
            clearInterval(stallTimerRef.current);
          }
        }, 5000);
      }
    }
    return () => { if (stallTimerRef.current) clearInterval(stallTimerRef.current); };
  }, [stream.imagingObtained, stream.currentStep, stream.connectionStatus]);

  // Reset on disconnect
  useEffect(() => {
    if (stream.connectionStatus !== 'connected') {
      prevErrorCount.current = 0;
      lastImagingObtained.current = 0;
      lastImagingTime.current = null;
      if (stallTimerRef.current) clearInterval(stallTimerRef.current);
    }
  }, [stream.connectionStatus]);

  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  const testBeep = useCallback(() => playBeep(), []);

  return { requestPermission, testBeep };
}
