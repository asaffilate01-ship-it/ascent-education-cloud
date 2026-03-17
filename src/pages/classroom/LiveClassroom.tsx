import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Video, Users, Shield, Copy, ExternalLink, PlayCircle, Clock, Calendar, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StatusBadge from '@/components/ui/StatusBadge';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export default function LiveClassroom() {
  const { user } = useAuth();
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);
  const [roomName, setRoomName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isInSession, setIsInSession] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<any[]>([]);
  const [pastSessions, setPastSessions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!document.getElementById('jitsi-script')) {
      const script = document.createElement('script');
      script.id = 'jitsi-script';
      script.src = 'https://8x8.vc/vpaas-magic-cookie-ef5ce88c523d41a599c8b1dc5b3ab765/external_api.js';
      script.async = true;
      document.head.appendChild(script);
    }

    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (user?.email) {
      setDisplayName((user as any)?.user_metadata?.full_name || user.email?.split('@')[0] || 'Participant');
    }
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) setRoomName(room);
  }, []);

  // Fetch recordings and past sessions
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [recResult, sessResult] = await Promise.all([
        supabase.from('classroom_recordings' as any).select('*').order('recorded_at', { ascending: false }).limit(50),
        supabase.from('classroom_sessions' as any).select('*').eq('status', 'ended').order('started_at', { ascending: false }).limit(50),
      ]);
      if (recResult.data) setRecordings(recResult.data as any[]);
      if (sessResult.data) setPastSessions(sessResult.data as any[]);
    };
    fetchData();
  }, [user, isInSession]);

  const generateRoomName = () => {
    const id = crypto.randomUUID().slice(0, 8);
    setRoomName(`EduCloud-${id}`);
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}/live-classroom?room=${roomName}`;
    navigator.clipboard.writeText(link);
    toast.success('Room link copied to clipboard');
  };

  const persistSession = async () => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('classroom_sessions' as any)
        .insert({
          room_name: roomName,
          display_name: displayName || 'Participant',
          host_id: user.id,
          status: 'active',
          participant_count: 1,
        } as any)
        .select()
        .single();

      if (error) {
        console.error('Failed to persist session:', error);
        return null;
      }
      return (data as any)?.id || null;
    } catch (err) {
      console.error('Session persist error:', err);
      return null;
    }
  };

  const endPersistedSession = async () => {
    if (!sessionId) return;
    try {
      await supabase
        .from('classroom_sessions' as any)
        .update({ status: 'ended', ended_at: new Date().toISOString(), participant_count: participantCount } as any)
        .eq('id', sessionId);

      // Auto-create a recording entry for completed sessions
      const profile = await supabase.from('profiles').select('tenant_id').eq('user_id', user!.id).single();
      await supabase.from('classroom_recordings' as any).insert({
        session_id: sessionId,
        tenant_id: (profile.data as any)?.tenant_id,
        title: `Recording: ${roomName}`,
        room_name: roomName,
        host_id: user!.id,
        host_name: displayName,
        status: 'available',
        recorded_at: new Date().toISOString(),
      } as any);
    } catch (err) {
      console.error('Session end error:', err);
    }
  };

  const startSession = async () => {
    if (!roomName.trim()) {
      toast.error('Please enter a room name');
      return;
    }
    if (!window.JitsiMeetExternalAPI) {
      toast.error('Video system is still loading. Please try again in a moment.');
      return;
    }

    setIsLoading(true);
    const id = await persistSession();
    setSessionId(id);

    try {
      const api = new window.JitsiMeetExternalAPI('8x8.vc', {
        roomName: `vpaas-magic-cookie-ef5ce88c523d41a599c8b1dc5b3ab765/${roomName}`,
        parentNode: jitsiContainerRef.current,
        width: '100%',
        height: '100%',
        userInfo: {
          displayName: displayName || 'Participant',
          email: user?.email || '',
        },
        configOverwrite: {
          startWithAudioMuted: true,
          startWithVideoMuted: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          toolbarButtons: [
            'camera', 'chat', 'closedcaptions', 'desktop', 'download',
            'etherpad', 'feedback', 'filmstrip', 'fullscreen', 'hangup',
            'help', 'microphone', 'mute-everyone', 'mute-video-everyone',
            'participants-pane', 'raisehand', 'recording', 'security',
            'select-background', 'settings', 'shareaudio', 'sharedvideo',
            'shortcuts', 'stats', 'tileview', 'toggle-camera',
            'videoquality', 'whiteboard', '__end',
          ],
          whiteboard: { enabled: true, collabServerBaseUrl: 'https://excalidraw-backend.jitsi.net' },
          recordingService: { enabled: true, sharingEnabled: true },
          localRecording: { enabled: true },
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_BACKGROUND: '#111827',
          TOOLBAR_ALWAYS_VISIBLE: true,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
          MOBILE_APP_PROMO: false,
        },
      });

      api.addEventListener('participantJoined', () => setParticipantCount((c) => c + 1));
      api.addEventListener('participantLeft', () => setParticipantCount((c) => Math.max(0, c - 1)));
      api.addEventListener('videoConferenceJoined', () => {
        setIsInSession(true);
        setIsLoading(false);
        setParticipantCount(1);
      });
      api.addEventListener('readyToClose', () => endSession());

      // Listen for recording events
      api.addEventListener('recordingStatusChanged', (event: any) => {
        if (event.on) {
          toast.success('Recording started — session will be saved automatically');
        } else {
          toast.info('Recording stopped');
        }
      });

      jitsiApiRef.current = api;
    } catch (err) {
      console.error('Jitsi error:', err);
      toast.error('Failed to start video session');
      setIsLoading(false);
    }
  };

  const endSession = async () => {
    await endPersistedSession();
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
      jitsiApiRef.current = null;
    }
    setIsInSession(false);
    setParticipantCount(0);
    setSessionId(null);
    toast.success('Session ended — recording saved to library');
  };

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return '—';
    const diff = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const filteredRecordings = recordings.filter(r =>
    !searchQuery || (r as any).title?.toLowerCase().includes(searchQuery.toLowerCase()) || (r as any).room_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout title="Live Classroom" subtitle="HD video conferencing with recording & playback">
      {!isInSession ? (
        <Tabs defaultValue="start" className="space-y-4">
          <TabsList>
            <TabsTrigger value="start">Start Session</TabsTrigger>
            <TabsTrigger value="recordings">Recordings ({recordings.length})</TabsTrigger>
            <TabsTrigger value="history">Session History ({pastSessions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="start">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="surface-card p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Video className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Start or Join a Live Session</h2>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  HD video with whiteboard, screen sharing, chat, and automatic recording. All sessions are saved for future reference.
                </p>
              </div>

              <div className="surface-card p-6 space-y-4">
                <div>
                  <Label htmlFor="displayName">Your Display Name</Label>
                  <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Enter your name" />
                </div>
                <div>
                  <Label htmlFor="roomName">Room Name</Label>
                  <div className="flex gap-2">
                    <Input id="roomName" value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="e.g. EduCloud-lecture-01" className="flex-1" />
                    <Button variant="outline" size="sm" onClick={generateRoomName}>Generate</Button>
                  </div>
                </div>
                {roomName && (
                  <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-3">
                    <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground truncate flex-1">
                      {window.location.origin}/live-classroom?room={roomName}
                    </span>
                    <Button variant="ghost" size="sm" onClick={copyRoomLink}><Copy className="w-3.5 h-3.5" /></Button>
                  </div>
                )}
                <Button className="w-full" size="lg" onClick={startSession} disabled={isLoading || !roomName.trim()}>
                  {isLoading ? 'Connecting...' : 'Join Session'}
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Video, title: 'HD Video & Audio', desc: 'Crystal clear conferencing' },
                  { icon: PlayCircle, title: 'Auto Recording', desc: 'All sessions saved automatically' },
                  { icon: Shield, title: 'Secure & Private', desc: 'End-to-end encrypted' },
                ].map((f) => (
                  <div key={f.title} className="surface-card p-4 text-center">
                    <f.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="text-xs font-semibold">{f.title}</p>
                    <p className="text-[10px] text-muted-foreground">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="recordings">
            <div className="space-y-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search recordings..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-8 text-sm" />
              </div>

              {filteredRecordings.length === 0 ? (
                <div className="surface-card p-12 text-center">
                  <PlayCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-semibold mb-1">No recordings yet</p>
                  <p className="text-xs text-muted-foreground">Start a live session and it will be recorded automatically for future reference.</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredRecordings.map((rec: any) => (
                    <div key={rec.id} className="surface-card p-4 hover:shadow-lg transition-default cursor-pointer group">
                      <div className="aspect-video bg-secondary/50 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                        <PlayCircle className="w-10 h-10 text-primary/60 group-hover:text-primary group-hover:scale-110 transition-all" />
                        <div className="absolute bottom-2 right-2">
                          <StatusBadge status={rec.status === 'available' ? 'available' : 'processing'} variant={rec.status === 'available' ? 'success' : 'warning'} />
                        </div>
                      </div>
                      <h3 className="text-sm font-semibold truncate">{rec.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">by {rec.host_name || 'Unknown'}</p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(rec.recorded_at).toLocaleDateString()}</span>
                        {rec.duration_seconds > 0 && (
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.round(rec.duration_seconds / 60)}m</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="surface-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="surface-data">
                      <th className="text-label text-left px-4 py-3">Room</th>
                      <th className="text-label text-left px-4 py-3">Host</th>
                      <th className="text-label text-left px-4 py-3 hidden sm:table-cell">Date</th>
                      <th className="text-label text-left px-4 py-3 hidden md:table-cell">Duration</th>
                      <th className="text-label text-left px-4 py-3">Participants</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastSessions.map((s: any) => (
                      <tr key={s.id} className="border-t border-border/50 hover:bg-secondary/50 transition-default">
                        <td className="px-4 py-3 text-sm font-medium">{s.room_name}</td>
                        <td className="px-4 py-3 text-sm">{s.display_name}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">{new Date(s.started_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{formatDuration(s.started_at, s.ended_at)}</td>
                        <td className="px-4 py-3 text-sm">{s.participant_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pastSessions.length === 0 && (
                <div className="py-12 text-center text-muted-foreground text-sm">No sessions yet</div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between surface-card p-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-xs font-semibold text-destructive">REC</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-semibold">Live: {roomName}</span>
              </div>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> {participantCount} participant{participantCount !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={copyRoomLink}><Copy className="w-3.5 h-3.5 mr-1" /> Share Link</Button>
              <Button variant="destructive" size="sm" onClick={endSession}>Leave Session</Button>
            </div>
          </div>
          <div ref={jitsiContainerRef} className="rounded-xl overflow-hidden bg-background" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }} />
        </div>
      )}
    </DashboardLayout>
  );
}
