import { useState, useEffect, useRef, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Video, Users, Shield, Copy, ExternalLink, PlayCircle, Clock, Calendar, Search, BookOpen, Radio, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StatusBadge from '@/components/ui/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [modules, setModules] = useState<any[]>([]);
  const [programmes, setProgrammes] = useState<any[]>([]);

  const isLecturer = user?.role === 'lecturer' || user?.role === 'centre_director' || user?.role === 'programme_leader';
  const isStudent = user?.role === 'student';

  useEffect(() => {
    if (!document.getElementById('jitsi-script')) {
      const script = document.createElement('script');
      script.id = 'jitsi-script';
      script.src = 'https://meet.jit.si/external_api.js';
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
    if (user?.name) setDisplayName(user.name);
    else if (user?.email) setDisplayName(user.email.split('@')[0]);
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) setRoomName(room);
  }, []);

  // Fetch modules, programmes, recordings, sessions
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [modResult, progResult, recResult, sessResult, activeResult] = await Promise.all([
        supabase.from('modules').select('*').order('title', { ascending: true }),
        supabase.from('programmes').select('*'),
        supabase.from('classroom_recordings' as any).select('*').order('recorded_at', { ascending: false }).limit(50),
        supabase.from('classroom_sessions' as any).select('*').eq('status', 'ended').order('started_at', { ascending: false }).limit(50),
        supabase.from('classroom_sessions' as any).select('*').eq('status', 'active').order('started_at', { ascending: false }),
      ]);
      if (modResult.data) setModules(modResult.data);
      if (progResult.data) setProgrammes(progResult.data);
      if (recResult.data) setRecordings(recResult.data as any[]);
      if (sessResult.data) setPastSessions(sessResult.data as any[]);
      if (activeResult.data) setActiveSessions(activeResult.data as any[]);
    };
    fetchData();
  }, [user, isInSession]);

  // Build programme map and module lookup
  const progMap = useMemo(() => {
    const map: Record<string, any> = {};
    programmes.forEach(p => { map[p.id] = p; });
    return map;
  }, [programmes]);

  const moduleMap = useMemo(() => {
    const map: Record<string, any> = {};
    modules.forEach(m => { map[m.id] = m; });
    return map;
  }, [modules]);

  // For lecturers: filter to their assigned modules
  const myModules = useMemo(() => {
    if (isLecturer) {
      const assigned = modules.filter(m => m.lecturer_id === user?.id);
      return assigned.length > 0 ? assigned : modules;
    }
    return modules;
  }, [modules, user, isLecturer]);

  const generateRoomName = (mod: any) => {
    const prog = progMap[mod.programme_id];
    const courseNum = (prog as any)?.course_number || prog?.level?.replace(/\s/g, '') || 'PROG';
    const modCode = (mod as any)?.module_number || mod.code || mod.title.substring(0, 6).toUpperCase().replace(/\s/g, '');
    return `${courseNum}-${modCode}-${Date.now().toString(36).slice(-4)}`.toUpperCase();
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}/live-classroom?room=${roomName}`;
    navigator.clipboard.writeText(link);
    toast.success('Room link copied to clipboard');
  };

  const persistSession = async (moduleId?: string) => {
    if (!user) return null;
    try {
      const profile = await supabase.from('profiles').select('tenant_id').eq('user_id', user.id).single();
      const { data, error } = await supabase
        .from('classroom_sessions' as any)
        .insert({
          room_name: roomName,
          display_name: displayName || 'Participant',
          host_id: user.id,
          status: 'active',
          participant_count: 1,
          module_id: moduleId || null,
          tenant_id: (profile.data as any)?.tenant_id || null,
        } as any)
        .select()
        .single();
      if (error) { console.error('Failed to persist session:', error); return null; }
      return (data as any)?.id || null;
    } catch (err) { console.error('Session persist error:', err); return null; }
  };

  const endPersistedSession = async () => {
    if (!sessionId) return;
    try {
      await supabase
        .from('classroom_sessions' as any)
        .update({ status: 'ended', ended_at: new Date().toISOString(), participant_count: participantCount } as any)
        .eq('id', sessionId);
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
    } catch (err) { console.error('Session end error:', err); }
  };

  const startJitsi = async (modId?: string) => {
    if (!roomName.trim()) { toast.error('Please enter a room name'); return; }
    if (!window.JitsiMeetExternalAPI) { toast.error('Video system is still loading. Please try again.'); return; }
    setIsLoading(true);

    // Only lecturers persist the session (students just join)
    const id = isLecturer ? await persistSession(modId) : null;
    setSessionId(id);

    try {
      const api = new window.JitsiMeetExternalAPI('8x8.vc', {
        roomName: `vpaas-magic-cookie-ef5ce88c523d41a599c8b1dc5b3ab765/${roomName}`,
        parentNode: jitsiContainerRef.current,
        width: '100%',
        height: '100%',
        userInfo: { displayName: displayName || 'Participant', email: user?.email || '' },
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
      api.addEventListener('participantJoined', () => setParticipantCount(c => c + 1));
      api.addEventListener('participantLeft', () => setParticipantCount(c => Math.max(0, c - 1)));
      api.addEventListener('videoConferenceJoined', () => { setIsInSession(true); setIsLoading(false); setParticipantCount(1); });
      api.addEventListener('readyToClose', () => endSession());
      api.addEventListener('recordingStatusChanged', (event: any) => {
        if (event.on) toast.success('Recording started');
        else toast.info('Recording stopped');
      });
      jitsiApiRef.current = api;
    } catch (err) {
      console.error('Jitsi error:', err);
      toast.error('Failed to start video session');
      setIsLoading(false);
    }
  };

  const endSession = async () => {
    if (isLecturer) await endPersistedSession();
    if (jitsiApiRef.current) { jitsiApiRef.current.dispose(); jitsiApiRef.current = null; }
    setIsInSession(false);
    setParticipantCount(0);
    setSessionId(null);
    toast.success(isLecturer ? 'Session ended — recording saved' : 'You left the session');
  };

  const handleStartLecturerSession = () => {
    if (!selectedModuleId) { toast.error('Please select a module'); return; }
    const mod = moduleMap[selectedModuleId];
    if (mod && !roomName) setRoomName(generateRoomName(mod));
    startJitsi(selectedModuleId);
  };

  const handleJoinSession = (session: any) => {
    setRoomName(session.room_name);
    setTimeout(() => startJitsi(), 100);
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
    <DashboardLayout title="Live Classroom" subtitle={isLecturer ? 'Start live sessions for your modules' : 'Join live lectures from your lecturers'}>
      {!isInSession ? (
        <Tabs defaultValue={isStudent ? 'live' : 'start'} className="space-y-4">
          <TabsList>
            {isStudent && <TabsTrigger value="live">Live Now ({activeSessions.length})</TabsTrigger>}
            {isLecturer && <TabsTrigger value="start">Start Session</TabsTrigger>}
            <TabsTrigger value="recordings">Recordings ({recordings.length})</TabsTrigger>
            <TabsTrigger value="history">History ({pastSessions.length})</TabsTrigger>
          </TabsList>

          {/* ─── STUDENT: Live Sessions to Join ─── */}
          {isStudent && (
            <TabsContent value="live">
              <div className="space-y-4">
                {activeSessions.length === 0 ? (
                  <div className="surface-card p-12 text-center">
                    <Video className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-semibold mb-1">No live sessions right now</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">Your lecturers will start sessions for your enrolled modules. Check back later or view past recordings.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {activeSessions.map((session: any) => {
                      const mod = session.module_id ? moduleMap[session.module_id] : null;
                      const prog = mod ? progMap[mod.programme_id] : null;
                      return (
                        <div key={session.id} className="surface-card p-5 hover:shadow-lg transition-all border border-border/50 hover:border-primary/20 group">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="flex items-center gap-1.5">
                              <Radio className="w-3 h-3 text-destructive animate-pulse" />
                              <span className="text-[10px] font-bold text-destructive uppercase">Live</span>
                            </div>
                            {mod && (
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded ml-auto">
                                {(mod as any).module_number || mod.code || ''}
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold mb-1">{mod ? mod.title : session.room_name}</h3>
                          {prog && (
                            <p className="text-xs text-muted-foreground mb-1">
                              {(prog as any).course_number ? `${(prog as any).course_number} · ` : ''}{prog.title}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mb-3">Host: {session.display_name}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="w-3 h-3" /> {session.participant_count} in session
                            </span>
                            <Button size="sm" onClick={() => handleJoinSession(session)} className="text-xs">
                              Join <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          )}

          {/* ─── LECTURER: Start Session ─── */}
          {isLecturer && (
            <TabsContent value="start">
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="surface-card p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Video className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Start a Live Session</h2>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    Select a module to begin. HD video with collaborative whiteboard, screen sharing, chat, and automatic recording.
                  </p>
                </div>

                <div className="surface-card p-6 space-y-4">
                  <div>
                    <Label>Select Module *</Label>
                    <Select value={selectedModuleId} onValueChange={(v) => {
                      setSelectedModuleId(v);
                      const mod = moduleMap[v];
                      if (mod) setRoomName(generateRoomName(mod));
                    }}>
                      <SelectTrigger><SelectValue placeholder="Choose a module to teach..." /></SelectTrigger>
                      <SelectContent>
                        {myModules.map((mod) => {
                          const prog = progMap[mod.programme_id];
                          return (
                            <SelectItem key={mod.id} value={mod.id}>
                              <span className="font-medium">{(mod as any).module_number || mod.code || ''}</span>
                              {' '}{mod.title}
                              {prog && <span className="text-muted-foreground"> — {prog.title}</span>}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Your Display Name</Label>
                    <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Enter your name" />
                  </div>
                  <div>
                    <Label>Room ID</Label>
                    <Input value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="Auto-generated from module" className="font-mono text-sm" />
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
                  <Button className="w-full" size="lg" onClick={handleStartLecturerSession} disabled={isLoading || !selectedModuleId}>
                    {isLoading ? 'Connecting...' : 'Start Live Session'}
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Video, title: 'HD Video & Audio', desc: 'Crystal clear conferencing' },
                    { icon: PlayCircle, title: 'Auto Recording', desc: 'All sessions saved' },
                    { icon: Shield, title: 'Whiteboard', desc: 'Collaborative drawing' },
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
          )}

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
                  <p className="text-xs text-muted-foreground">Sessions are recorded automatically for future reference.</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredRecordings.map((rec: any) => {
                    const mod = rec.session_id ? activeSessions.concat(pastSessions).find((s: any) => s.id === rec.session_id) : null;
                    return (
                      <div key={rec.id} className="surface-card p-4 hover:shadow-lg transition-all cursor-pointer group">
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
                    );
                  })}
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
                      <th className="text-label text-left px-4 py-3">Module</th>
                      <th className="text-label text-left px-4 py-3">Host</th>
                      <th className="text-label text-left px-4 py-3 hidden sm:table-cell">Date</th>
                      <th className="text-label text-left px-4 py-3 hidden md:table-cell">Duration</th>
                      <th className="text-label text-left px-4 py-3">Participants</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastSessions.map((s: any) => {
                      const mod = s.module_id ? moduleMap[s.module_id] : null;
                      return (
                        <tr key={s.id} className="border-t border-border/50 hover:bg-secondary/50 transition-all">
                          <td className="px-4 py-3 text-sm font-mono text-xs">{s.room_name}</td>
                          <td className="px-4 py-3 text-sm">{mod ? mod.title : '—'}</td>
                          <td className="px-4 py-3 text-sm">{s.display_name}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">{new Date(s.started_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{formatDuration(s.started_at, s.ended_at)}</td>
                          <td className="px-4 py-3 text-sm">{s.participant_count}</td>
                        </tr>
                      );
                    })}
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
              {isLecturer && <Button variant="ghost" size="sm" onClick={copyRoomLink}><Copy className="w-3.5 h-3.5 mr-1" /> Share</Button>}
              <Button variant="destructive" size="sm" onClick={endSession}>
                {isLecturer ? 'End Session' : 'Leave Session'}
              </Button>
            </div>
          </div>
          <div ref={jitsiContainerRef} className="rounded-xl overflow-hidden bg-background" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }} />
        </div>
      )}
    </DashboardLayout>
  );
}
