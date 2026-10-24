import {useEffect, useRef, useState} from 'react';
import {Button} from '@/components/ui/button';

const MAX_AUDIO_BYTES = 100 * 1024 * 1024;
export default function IELTSAudioWorkstation() {
  const audio = useRef<HTMLAudioElement>(null);
  const sourceRef = useRef('');
  const previewRef = useRef('');
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const generation = useRef(0);
  const [source, setSource] = useState('');
  const [filename, setFilename] = useState('');
  const [volume, setVolume] = useState(0.5);
  const [speed, setSpeed] = useState(1);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [start, setStart] = useState<number | null>(null);
  const [end, setEnd] = useState<number | null>(null);
  const [loop, setLoop] = useState(false);
  const [error, setError] = useState('');
  const [micState, setMicState] = useState<'idle' | 'requesting' | 'recording'>('idle');
  const [preview, setPreview] = useState('');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [device, setDevice] = useState('');

  function releaseMic() {
    clearTimeout(timerRef.current);
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }
  useEffect(() => () => {
    generation.current++;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    releaseMic();
    if (sourceRef.current) URL.revokeObjectURL(sourceRef.current);
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);
  useEffect(() => {
    if (audio.current) {audio.current.volume = volume; audio.current.playbackRate = speed;}
  }, [volume, speed, source]);
  function clearFile() {
    audio.current?.pause();
    if (sourceRef.current) URL.revokeObjectURL(sourceRef.current);
    sourceRef.current = ''; setSource(''); setFilename(''); setPosition(0); setDuration(0);
    setStart(null); setEnd(null); setLoop(false);
  }
  function loadFile(file?: File) {
    if (!file) return;
    setError('');
    if (!file.size || file.size > MAX_AUDIO_BYTES || (!file.type.startsWith('audio/') && !/\.(mp3|wav|m4a|ogg|webm)$/i.test(file.name))) {
      setError('Choose an audio file up to 100 MB.'); return;
    }
    clearFile(); sourceRef.current = URL.createObjectURL(file); setSource(sourceRef.current); setFilename(file.name);
  }
  function seek(seconds: number) {
    if (!audio.current || !duration) return;
    const next = Math.max(0, Math.min(duration, seconds)); audio.current.currentTime = next; setPosition(next);
  }
  function stopMic() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    releaseMic();
  }
  async function testMic() {
    if (micState !== 'idle') return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Microphone testing requires a supported browser over HTTPS.'); return;
    }
    const token = ++generation.current;
    setMicState('requesting'); setError(''); audio.current?.pause();
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = ''; setPreview('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: {deviceId: device ? {exact: device} : undefined, echoCancellation: true, noiseSuppression: true}});
      if (token !== generation.current) {stream.getTracks().forEach(track => track.stop()); return;}
      streamRef.current = stream;
      void navigator.mediaDevices.enumerateDevices?.().then(list => {
        if (token === generation.current) setDevices(list.filter(item => item.kind === 'audioinput'));
      }).catch(() => {});
      const recorder = new MediaRecorder(stream); recorderRef.current = recorder;
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = event => {if (event.data.size) chunks.push(event.data);};
      recorder.onstop = () => {
        releaseMic();
        if (token !== generation.current) return;
        setMicState('idle');
        const blob = new Blob(chunks, {type: recorder.mimeType});
        if (!blob.size) {setError('No microphone audio was captured. Check the selected input and hardware mute.'); return;}
        previewRef.current = URL.createObjectURL(blob); setPreview(previewRef.current);
      };
      recorder.onerror = () => {generation.current++; releaseMic(); setMicState('idle'); setError('Microphone test failed. Check your headset and try again.');};
      recorder.start(); setMicState('recording'); timerRef.current = setTimeout(stopMic, 10000);
    } catch {
      releaseMic();
      if (token === generation.current) {setMicState('idle'); setError('Microphone permission was denied or the selected device is unavailable. Check browser permissions and reconnect the headset.');}
    }
  }
  return <section className="surface-card p-5 space-y-4" aria-label="Individual audio workstation">
    <div><h3 className="text-lg font-semibold">My language-lab audio station</h3>
      <p className="text-sm text-muted-foreground">Use your own headphones in class or remotely. Open a practice recording supplied by your tutor or one you have permission to use. Files and microphone checks stay on this device and are cleared when you leave this station.</p></div>
    <label className="block text-sm font-medium">Open practice audio
      <input className="block mt-2 max-w-full text-sm" type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm" onChange={event => {loadFile(event.target.files?.[0]); event.target.value = '';}} />
    </label>
    {source && <div className="space-y-3">
      <p className="text-sm break-all">{filename}</p>
      <audio ref={audio} src={source} controls preload="metadata" className="w-full" aria-label="Practice audio player"
        onLoadedMetadata={() => {const value = audio.current?.duration; setDuration(value && Number.isFinite(value) ? value : 0);}}
        onTimeUpdate={() => {const value = audio.current?.currentTime || 0; if (loop && start !== null && end !== null && value >= end) seek(start); else setPosition(value);}}
        onEnded={() => {if (loop && start !== null && end !== null) {seek(start); void audio.current?.play().catch(() => setError('Press Play to resume the repeat section.'));}}}
        onVolumeChange={() => {if(audio.current) setVolume(audio.current.volume);}}
        onRateChange={() => {if(audio.current) setSpeed(audio.current.playbackRate);}}
        onError={() => {setDuration(0); setLoop(false); setError('This audio could not be decoded. Ask your tutor for an MP3 or WAV version.');}} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">Volume · {Math.round(volume * 100)}%<input className="block w-full" type="range" min="0" max="1" step="0.05" value={volume} onChange={e => setVolume(Number(e.target.value))} /></label>
        <label className="text-sm">Playback speed<select className="block border rounded p-2 bg-background" value={speed} onChange={e => setSpeed(Number(e.target.value))}>{[0.75, 1, 1.25, 1.5].map(rate => <option value={rate} key={rate}>{rate}×</option>)}</select></label>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" disabled={!duration} onClick={() => seek(position - 10)}>Back 10 seconds</Button>
        <Button variant="outline" disabled={!duration} onClick={() => {setStart(position); setEnd(null); setLoop(false);}}>Set repeat start</Button>
        <Button variant="outline" disabled={start === null || position <= start + 0.25} onClick={() => {setEnd(position); setLoop(false);}}>Set repeat end</Button>
        <Button variant="outline" disabled={start === null || end === null} aria-pressed={loop} onClick={() => {setLoop(!loop); if (!loop && start !== null) seek(start);}}>{loop ? 'Stop repeating' : 'Repeat section'}</Button>
        <Button variant="outline" onClick={clearFile}>Clear audio</Button>
      </div>
      {start !== null && <p className="text-xs">Repeat section: {start.toFixed(1)}s → {end === null ? 'choose an end point' : `${end.toFixed(1)}s`}</p>}
    </div>}
    <div className="border-t pt-4 space-y-3">
      <h4 className="font-medium">Headset and microphone check</h4>
      <p className="text-sm text-muted-foreground">Start at a comfortable low volume. Record a short phrase, then play it back to check your microphone and headphones. This check stops after 10 seconds and is never uploaded. Choose your headphone output in your device’s sound settings.</p>
      <label className="block text-sm">Microphone<select className="block border rounded p-2 bg-background max-w-full" value={device} disabled={micState !== 'idle'} onChange={e => setDevice(e.target.value)}><option value="">System default</option>{devices.map((item, index) => <option key={item.deviceId} value={item.deviceId}>{item.label || `Microphone ${index + 1}`}</option>)}</select></label>
      {micState === 'recording' ? <Button variant="outline" onClick={stopMic}>Stop microphone check</Button> : <Button variant="outline" disabled={micState !== 'idle'} onClick={() => void testMic()}>{micState === 'requesting' ? 'Waiting for microphone permission…' : 'Test microphone for 10 seconds'}</Button>}
      {micState === 'recording' && <p role="status">Microphone is recording locally…</p>}
      {preview && <div className="space-y-2"><audio controls src={preview} className="w-full" aria-label="Local microphone check" /><Button variant="outline" onClick={() => {URL.revokeObjectURL(previewRef.current); previewRef.current = ''; setPreview('');}}>Discard microphone check</Button></div>}
    </div>
    <p className="text-xs text-muted-foreground">Practice mode allows replay and speed changes. This station is not an exam player or a tutor-controlled live room. Use the Speaking studio to submit practice for tutor feedback.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section>;
}
