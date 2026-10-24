import { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { isNativeApp } from '@/lib/native';
import { Button } from '@/components/ui/button';
export default function NativeCapture({ onFile, disabled }: { onFile: (file: File) => void; disabled?: boolean }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  if (!isNativeApp()) return null;
  async function capture() {
    setBusy(true); setError('');
    try {
      const photo = await Camera.getPhoto({ quality: 85, resultType: CameraResultType.Uri, source: CameraSource.Camera, saveToGallery: false, width: 2400, height: 2400, correctOrientation: true });
      if (!photo.webPath) throw new Error('Photo unavailable.');
      const response = await fetch(photo.webPath);
      if (!response.ok) throw new Error('Photo unavailable.');
      const blob = await response.blob();
      if (!blob.size || blob.size > 25 * 1024 * 1024) throw new Error('Photo must be under 25 MB.');
      onFile(new File([blob], `coursework-${Date.now()}.${photo.format}`, { type: blob.type || `image/${photo.format}` }));
    } catch { setError('No photo selected. You can try again, allow camera access in device settings, or choose a file.'); }
    finally { setBusy(false); }
  }
  return <div className="space-y-2"><Button type="button" variant="outline" disabled={disabled || busy} onClick={() => void capture()}>{busy ? 'Opening camera…' : 'Photograph a document'}</Button>{error && <p role="status" className="text-sm">{error}</p>}</div>;
}
