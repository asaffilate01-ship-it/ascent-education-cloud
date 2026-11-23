import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export type LabKind = 'tech' | 'language';
export interface LiveSession {
  id: string; kind: LabKind; title: string; join_code: string; status: 'live' | 'ended';
  activity_id: string | null; activity_revision: number; broadcast: Broadcast; locked: boolean; created_at: string; created_by: string;
}
/** What a teacher has pushed to every device in a language session. */
export interface Broadcast { mode?: 'repeat' | 'dictation' | 'speaking'; item_id?: string; revision?: number; play_revision?: number; rate?: number }
export interface Participant { id: string; session_id: string; user_id: string; display_name: string; location: 'in_class' | 'remote'; status: 'working' | 'stuck' | 'done'; hand_raised: boolean; current_activity: string | null; last_seen: string; joined_at: string }
export interface Attempt { id: string; user_id: string; session_id: string | null; lab_kind: LabKind; activity_id: string; content: string; score: number | null; passed: boolean | null; result: Record<string, unknown>; audio_path: string | null; teacher_feedback: string | null; feedback_at: string | null; created_at: string }

const SESSION_COLUMNS = 'id,kind,title,join_code,status,activity_id,activity_revision,broadcast,locked,created_at,created_by';

async function functionError(error: unknown, fallback: string) {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === 'function') {
    try { const body = await ctx.clone().json(); if (body?.error) return String(body.error); } catch { /* ignore */ }
  }
  return fallback;
}

export async function callCoach<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('interactive-lab-coach', { body });
  if (error) throw new Error(await functionError(error, 'The AI coach is unavailable. Check your connection and try again.'));
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

export async function transcribe(blob: Blob, language: string): Promise<string> {
  const form = new FormData();
  const type = blob.type || 'audio/webm';
  form.append('file', new File([blob], `speech.${type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'}`, { type }));
  form.append('language', language);
  const { data, error } = await supabase.functions.invoke('interactive-lab-transcribe', { body: form });
  if (error) throw new Error(await functionError(error, 'Speech recognition is unavailable. Check your connection and try again.'));
  if (!data?.text) throw new Error(data?.error || 'No speech was detected.');
  return String(data.text);
}

export async function uploadRecording(userId: string, blob: Blob) {
  const type = (blob.type || 'audio/webm').split(';')[0];
  const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('language-lab-recordings').upload(path, blob, { contentType: type, upsert: false });
  if (error) throw new Error('Your recording could not be uploaded. Check your connection and try again.');
  return path;
}

export async function recordingUrl(path: string) {
  const { data, error } = await supabase.storage.from('language-lab-recordings').createSignedUrl(path, 300);
  if (error || !data?.signedUrl) throw new Error('Recording unavailable');
  return data.signedUrl;
}

export async function saveAttempt(input: { userId: string; tenantId: string; sessionId?: string | null; kind: LabKind; activityId: string; content: string; score?: number | null; passed?: boolean | null; result?: Record<string, unknown>; audioPath?: string | null }) {
  const { data, error } = await supabase.from('interactive_lab_attempts').insert({
    user_id: input.userId, tenant_id: input.tenantId, session_id: input.sessionId || null, lab_kind: input.kind,
    activity_id: input.activityId, content: input.content.slice(0, 20000), score: input.score ?? null, passed: input.passed ?? null,
    result: (input.result || {}) as Json, audio_path: input.audioPath || null,
  }).select('id').single();
  if (error) throw new Error('Your work was checked but could not be saved. Try again.');
  return data.id as string;
}

export async function myAttempts(userId: string, kind: LabKind, limit = 200) {
  const { data, error } = await supabase.from('interactive_lab_attempts')
    .select('id,user_id,session_id,lab_kind,activity_id,content,score,passed,result,audio_path,teacher_feedback,feedback_at,created_at')
    .eq('user_id', userId).eq('lab_kind', kind).order('created_at', { ascending: false }).limit(limit);
  if (error) throw new Error('Your saved lab work could not be loaded.');
  return (data || []) as unknown as Attempt[];
}

const storageKey = (kind: LabKind) => `unipathway-live-lab-${kind}`;

/** A learner's connection to a teacher-led live session (works the same in class and remotely). */
export function useLiveLab(kind: LabKind, enabled: boolean) {
  const [sessionId, setSessionId] = useState<string | null>(() => (typeof window !== 'undefined' ? sessionStorage.getItem(storageKey(kind)) : null));
  const [session, setSession] = useState<LiveSession | null>(null);
  const [error, setError] = useState('');
  const presence = useRef({ status: 'working' as Participant['status'], hand: false, activity: null as string | null });

  const leave = useCallback(() => { sessionStorage.removeItem(storageKey(kind)); setSessionId(null); setSession(null); }, [kind]);

  const join = useCallback(async (code: string, location: 'in_class' | 'remote') => {
    setError('');
    const { data, error: e } = await supabase.rpc('join_interactive_lab', { p_code: code.trim().toUpperCase(), p_location: location });
    if (e || !data) { setError(e?.message?.includes('code') || e?.message?.includes('closed') ? e.message : 'That code did not work. Check it with your teacher.'); return false; }
    const { data: row } = await supabase.from('interactive_lab_sessions').select(SESSION_COLUMNS).eq('id', data as string).maybeSingle();
    if (!row || row.kind !== kind) {
      setError(row ? `That code is for the ${row.kind === 'tech' ? 'tech lab' : 'language lab'}. Open that lab to join.` : 'Session not found.');
      return false;
    }
    sessionStorage.setItem(storageKey(kind), row.id); setSessionId(row.id); setSession(row as unknown as LiveSession);
    return true;
  }, [kind]);

  const sendPresence = useCallback(async (patch: Partial<typeof presence.current>) => {
    presence.current = { ...presence.current, ...patch };
    if (!sessionId) return;
    await supabase.rpc('touch_interactive_lab', { p_session: sessionId, p_status: presence.current.status, p_hand: presence.current.hand, p_activity: presence.current.activity ?? '' });
  }, [sessionId]);

  useEffect(() => {
    if (!enabled || !sessionId) return;
    let active = true;
    const poll = async () => {
      const { data, error: e } = await supabase.from('interactive_lab_sessions').select(SESSION_COLUMNS).eq('id', sessionId).maybeSingle();
      if (!active) return;
      if (e) { setError('Connection to the class session dropped. Retrying…'); return; }
      if (!data) { leave(); return; }
      setError(''); setSession(data as unknown as LiveSession);
    };
    void poll(); void sendPresence({});
    const a = setInterval(poll, 3000), b = setInterval(() => void sendPresence({}), 15000);
    return () => { active = false; clearInterval(a); clearInterval(b); };
  }, [enabled, sessionId, leave, sendPresence]);

  return { sessionId, session, error, join, leave, sendPresence, hand: presence.current.hand };
}
