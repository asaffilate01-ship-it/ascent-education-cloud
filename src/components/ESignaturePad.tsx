import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser, Check, Pen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ESignaturePadProps {
  documentType: string;
  documentId?: string;
  fullName: string;
  onSigned?: (signatureData: string) => void;
}

export default function ESignaturePad({ documentType, documentId, fullName, onSigned }: ESignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = 'hsl(var(--foreground))';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => setIsDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const save = async () => {
    if (!hasSignature || !user) return;
    setSaving(true);
    const signatureData = canvasRef.current!.toDataURL('image/png');

    const { error } = await supabase.from('e_signatures').insert({
      user_id: user.id,
      document_type: documentType,
      document_id: documentId || null,
      signature_data: signatureData,
      full_name: fullName,
    } as any);

    setSaving(false);
    if (error) {
      toast.error('Failed to save signature');
    } else {
      toast.success('Signature saved successfully');
      onSigned?.(signatureData);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Pen className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Sign below</span>
      </div>
      <div className="border-2 border-dashed border-border rounded-lg overflow-hidden bg-background">
        <canvas
          ref={canvasRef}
          className="w-full h-32 cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <p className="text-[10px] text-muted-foreground text-center">
        By signing, I, <strong>{fullName}</strong>, confirm this is my legal electronic signature.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={clear} disabled={!hasSignature}>
          <Eraser className="w-3.5 h-3.5 mr-1" /> Clear
        </Button>
        <Button size="sm" onClick={save} disabled={!hasSignature || saving} className="flex-1">
          <Check className="w-3.5 h-3.5 mr-1" /> {saving ? 'Saving...' : 'Confirm Signature'}
        </Button>
      </div>
    </div>
  );
}
