import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Video, Users, Shield, Copy, ExternalLink, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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

  useEffect(() => {
    // Load Jitsi Meet External API script
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
      setDisplayName(user.user_metadata?.full_name || user.email.split('@')[0]);
    }
  }, [user]);

  const generateRoomName = () => {
    const id = crypto.randomUUID().slice(0, 8);
    setRoomName(`EduCloud-${id}`);
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}/live-classroom?room=${roomName}`;
    navigator.clipboard.writeText(link);
    toast.success('Room link copied to clipboard');
  };

  const startSession = () => {
    if (!roomName.trim()) {
      toast.error('Please enter a room name');
      return;
    }
    if (!window.JitsiMeetExternalAPI) {
      toast.error('Video system is still loading. Please try again in a moment.');
      return;
    }

    setIsLoading(true);

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

      api.addEventListener('participantJoined', () => {
        setParticipantCount((c) => c + 1);
      });
      api.addEventListener('participantLeft', () => {
        setParticipantCount((c) => Math.max(0, c - 1));
      });
      api.addEventListener('videoConferenceJoined', () => {
        setIsInSession(true);
        setIsLoading(false);
        setParticipantCount(1);
      });
      api.addEventListener('readyToClose', () => {
        endSession();
      });

      jitsiApiRef.current = api;
    } catch (err) {
      console.error('Jitsi error:', err);
      toast.error('Failed to start video session');
      setIsLoading(false);
    }
  };

  const endSession = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
      jitsiApiRef.current = null;
    }
    setIsInSession(false);
    setParticipantCount(0);
  };

  // Check URL for room param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) setRoomName(room);
  }, []);

  return (
    <DashboardLayout title="Live Classroom" subtitle="HD video conferencing with whiteboard & screen sharing">
      {!isInSession ? (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Hero card */}
          <div className="surface-card p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Start or Join a Live Session</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              HD video conferencing with built-in whiteboard, screen sharing, chat, recording, and breakout rooms.
            </p>
          </div>

          {/* Room setup */}
          <div className="surface-card p-6 space-y-4">
            <div>
              <Label htmlFor="displayName">Your Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>

            <div>
              <Label htmlFor="roomName">Room Name</Label>
              <div className="flex gap-2">
                <Input
                  id="roomName"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g. EduCloud-lecture-01"
                  className="flex-1"
                />
                <Button variant="outline" size="sm" onClick={generateRoomName}>
                  Generate
                </Button>
              </div>
            </div>

            {roomName && (
              <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-3">
                <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground truncate flex-1">
                  {window.location.origin}/live-classroom?room={roomName}
                </span>
                <Button variant="ghost" size="sm" onClick={copyRoomLink}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={startSession}
              disabled={isLoading || !roomName.trim()}
            >
              {isLoading ? 'Connecting...' : 'Join Session'}
            </Button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Video, title: 'HD Video & Audio', desc: 'Crystal clear conferencing' },
              { icon: Users, title: 'Screen Sharing', desc: 'Share your screen or app' },
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
      ) : (
        <div className="space-y-3">
          {/* Session toolbar */}
          <div className="flex items-center justify-between surface-card p-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-semibold">Live: {roomName}</span>
              </div>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> {participantCount} participant{participantCount !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={copyRoomLink}>
                <Copy className="w-3.5 h-3.5 mr-1" /> Share Link
              </Button>
              <Button variant="destructive" size="sm" onClick={endSession}>
                Leave Session
              </Button>
            </div>
          </div>

          {/* Jitsi container */}
          <div
            ref={jitsiContainerRef}
            className="rounded-xl overflow-hidden bg-background"
            style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}
          />
        </div>
      )}
    </DashboardLayout>
  );
}
