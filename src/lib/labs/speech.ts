import { useCallback, useEffect, useRef, useState } from 'react';

export const speechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

function pickVoice(lang: string) {
  const voices = window.speechSynthesis.getVoices();
  const base = lang.split('-')[0];
  return voices.find(v => v.lang === lang) || voices.find(v => v.lang.replace('_', '-').startsWith(base)) || null;
}

/** Speaks text with the device voice. Resolves when finished (or immediately if unsupported). */
export function speak(text: string, lang: string, rate = 1): Promise<void> {
  return new Promise(resolve => {
    if (!speechSupported()) { resolve(); return; }
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang; u.rate = rate;
    const voice = pickVoice(lang); if (voice) u.voice = voice;
    u.onend = () => resolve(); u.onerror = () => resolve();
    synth.speak(u);
  });
}
export const stopSpeaking = () => { if (speechSupported()) window.speechSynthesis.cancel(); };

export type RecorderState = 'idle' | 'requesting' | 'recording';
/** Microphone recorder with a hard time limit. Audio stays on the device until the learner submits it. */
export function useRecorder(maxSeconds = 120) {
  const [state, setState] = useState<RecorderState>('idle');
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const rec = useRef<MediaRecorder | null>(null), stream = useRef<MediaStream | null>(null), timer = useRef<ReturnType<typeof setInterval>>(), urlRef = useRef('');
  const release = () => { clearInterval(timer.current); stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; };
  const clear = useCallback(() => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); urlRef.current = ''; setUrl(''); setBlob(null); setElapsed(0); }, []);
  useEffect(() => () => { if (rec.current?.state === 'recording') rec.current.stop(); release(); if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);
  const stop = useCallback(() => { if (rec.current && rec.current.state !== 'inactive') rec.current.stop(); }, []);
  const start = useCallback(async () => {
    if (state !== 'idle') return;
    setError(''); clear();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setError('Recording needs a recent browser such as Chrome, Edge or Safari.'); return; }
    setState('requesting');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      stream.current = s;
      const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find(t => MediaRecorder.isTypeSupported?.(t));
      const r = new MediaRecorder(s, type ? { mimeType: type } : undefined); rec.current = r;
      const chunks: BlobPart[] = [];
      r.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      r.onstop = () => {
        release(); setState('idle');
        const b = new Blob(chunks, { type: (r.mimeType || 'audio/webm').split(';')[0].replace('video/', 'audio/') });
        if (!b.size) { setError('No sound was recorded. Check your microphone is not muted.'); return; }
        urlRef.current = URL.createObjectURL(b); setUrl(urlRef.current); setBlob(b);
      };
      r.start(250); setState('recording');
      const started = Date.now();
      timer.current = setInterval(() => { const sec = Math.floor((Date.now() - started) / 1000); setElapsed(sec); if (sec >= maxSeconds) r.stop(); }, 250);
    } catch {
      release(); setState('idle');
      setError('Microphone permission was blocked. Allow the microphone in your browser settings, then try again.');
    }
  }, [state, clear, maxSeconds]);
  return { state, blob, url, error, elapsed, start, stop, clear };
}
