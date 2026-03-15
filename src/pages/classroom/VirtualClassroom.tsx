import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { 
  Video, VideoOff, Mic, MicOff, Monitor, Hand, MessageSquare, 
  Users, Settings, PhoneOff, Maximize, PenTool, FileText,
  Camera, ScreenShare, MoreVertical, Clock, Circle,
  ChevronDown, Send, Smile, Paperclip
} from 'lucide-react';
import { useState } from 'react';

const MOCK_STUDENTS = [
  { id: 1, name: 'Sara Ali', status: 'online', camera: true, mic: false, hand: false },
  { id: 2, name: 'Omar Farooq', status: 'online', camera: true, mic: false, hand: true },
  { id: 3, name: 'Zara Sheikh', status: 'online', camera: false, mic: false, hand: false },
  { id: 4, name: 'Hassan Malik', status: 'online', camera: true, mic: false, hand: false },
  { id: 5, name: 'Ayesha Noor', status: 'online', camera: true, mic: true, hand: false },
  { id: 6, name: 'Bilal Ahmed', status: 'online', camera: false, mic: false, hand: false },
  { id: 7, name: 'Fatima Khan', status: 'away', camera: false, mic: false, hand: false },
  { id: 8, name: 'Usman Raza', status: 'online', camera: true, mic: false, hand: false },
  { id: 9, name: 'Mariam Iqbal', status: 'online', camera: true, mic: false, hand: true },
  { id: 10, name: 'Ali Hussain', status: 'online', camera: false, mic: false, hand: false },
  { id: 11, name: 'Nadia Tariq', status: 'online', camera: true, mic: false, hand: false },
  { id: 12, name: 'Kamran Yousuf', status: 'offline', camera: false, mic: false, hand: false },
];

const CHAT_MESSAGES = [
  { sender: 'Dr. Khan', text: 'Welcome to today\'s lecture on Strategic Management', time: '09:01', role: 'lecturer' },
  { sender: 'Sara Ali', text: 'Good morning sir!', time: '09:02', role: 'student' },
  { sender: 'Omar Farooq', text: 'Can you share the slides please?', time: '09:03', role: 'student' },
  { sender: 'Dr. Khan', text: 'Slides are now being shared. Please open your notebooks.', time: '09:04', role: 'lecturer' },
  { sender: 'Ayesha Noor', text: 'Sir, will this topic be in the exam?', time: '09:08', role: 'student' },
  { sender: 'Dr. Khan', text: 'Yes, competitive strategy analysis is a key exam topic.', time: '09:09', role: 'lecturer' },
];

type ViewMode = 'gallery' | 'speaker' | 'whiteboard';

export default function VirtualClassroom() {
  const [viewMode, setViewMode] = useState<ViewMode>('speaker');
  const [chatOpen, setChatOpen] = useState(true);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [chatMessage, setChatMessage] = useState('');

  const onlineCount = MOCK_STUDENTS.filter(s => s.status === 'online').length;
  const handsUp = MOCK_STUDENTS.filter(s => s.hand).length;

  return (
    <DashboardLayout title="Virtual Classroom" subtitle="Strategic Management (Level 5) — Live Session">
      {/* Class Info Bar */}
      <div className="surface-card p-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Circle className="w-2.5 h-2.5 text-destructive fill-destructive animate-pulse" />
            <span className="text-xs font-semibold text-destructive uppercase">Live</span>
          </div>
          <span className="text-sm font-medium">Strategic Management — Week 8: Competitive Analysis</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" /> 01:23:45
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isRecording && (
            <span className="flex items-center gap-1.5 text-xs text-destructive font-medium">
              <Circle className="w-2 h-2 fill-destructive animate-pulse" /> Recording
            </span>
          )}
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="w-3 h-3" /> {onlineCount}/{MOCK_STUDENTS.length}
          </span>
          {handsUp > 0 && (
            <span className="text-xs text-warning font-medium flex items-center gap-1">
              <Hand className="w-3 h-3" /> {handsUp}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-4 h-[calc(100vh-220px)]">
        {/* Main Video Area */}
        <div className="flex-1 flex flex-col">
          {/* View Mode Tabs */}
          <div className="flex items-center gap-1 mb-3">
            {(['speaker', 'gallery', 'whiteboard'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-default ${
                  viewMode === mode ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-accent'
                }`}
              >
                {mode === 'speaker' ? 'Speaker View' : mode === 'gallery' ? 'Gallery View' : 'Whiteboard'}
              </button>
            ))}
          </div>

          {/* Video Content */}
          <div className="flex-1 rounded-xl overflow-hidden bg-foreground/95 relative">
            {viewMode === 'speaker' && (
              <>
                {/* Main speaker */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl font-bold text-primary-foreground/70">DK</span>
                    </div>
                    <p className="text-primary-foreground/80 text-sm font-medium">Dr. Ahmed Khan</p>
                    <p className="text-primary-foreground/40 text-xs">Sharing screen...</p>
                  </div>
                </div>
                {/* Slide preview overlay */}
                <div className="absolute inset-4 rounded-lg bg-background/95 p-8 flex flex-col items-center justify-center">
                  <div className="text-center max-w-xl">
                    <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-4">Chapter 8 — Strategic Management</p>
                    <h2 className="text-2xl font-bold mb-6">Porter's Five Forces Analysis</h2>
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      {['Threat of New Entrants', 'Bargaining Power of Suppliers', 'Bargaining Power of Buyers', 'Threat of Substitutes', 'Industry Rivalry', 'Competitive Advantage'].map((f) => (
                        <div key={f} className="surface-data p-3 rounded-lg text-xs font-medium">{f}</div>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">Slide 14 of 32</p>
                  </div>
                </div>
                {/* Mini student grid */}
                <div className="absolute bottom-3 right-3 flex gap-1.5">
                  {MOCK_STUDENTS.filter(s => s.camera && s.status === 'online').slice(0, 4).map((s) => (
                    <div key={s.id} className="w-20 h-14 rounded-lg bg-foreground/80 flex items-center justify-center relative">
                      <span className="text-[10px] text-primary-foreground/60 font-medium">{s.name.split(' ')[0]}</span>
                      {s.hand && <Hand className="w-3 h-3 text-warning absolute top-1 right-1" />}
                    </div>
                  ))}
                </div>
              </>
            )}

            {viewMode === 'gallery' && (
              <div className="grid grid-cols-4 gap-2 p-3 h-full auto-rows-fr">
                {MOCK_STUDENTS.map((s) => (
                  <div key={s.id} className={`rounded-lg flex items-center justify-center relative ${
                    s.status === 'offline' ? 'bg-foreground/60' : s.camera ? 'bg-foreground/80' : 'bg-foreground/70'
                  }`}>
                    <div className="text-center">
                      <div className="w-10 h-10 rounded-full bg-primary/30 flex items-center justify-center mx-auto mb-1">
                        <span className="text-xs font-bold text-primary-foreground/70">
                          {s.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <p className="text-[10px] text-primary-foreground/70 font-medium">{s.name}</p>
                    </div>
                    {/* Status indicators */}
                    <div className="absolute bottom-1.5 left-1.5 flex gap-1">
                      {s.mic ? <Mic className="w-2.5 h-2.5 text-primary-foreground/50" /> : <MicOff className="w-2.5 h-2.5 text-destructive/70" />}
                      {!s.camera && <VideoOff className="w-2.5 h-2.5 text-destructive/70" />}
                    </div>
                    {s.hand && <Hand className="w-3.5 h-3.5 text-warning absolute top-1.5 right-1.5 animate-bounce" />}
                    {s.status === 'offline' && (
                      <span className="absolute top-1.5 left-1.5 text-[8px] text-destructive/80 font-medium">Offline</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {viewMode === 'whiteboard' && (
              <div className="absolute inset-0 bg-background flex flex-col">
                {/* Whiteboard toolbar */}
                <div className="flex items-center gap-2 p-3 border-b border-border">
                  <Button variant="outline" size="sm" className="h-8 text-xs"><PenTool className="w-3 h-3 mr-1" />Draw</Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs">Text</Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs">Shape</Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs">Eraser</Button>
                  <div className="flex gap-1 ml-2">
                    {['bg-foreground', 'bg-primary', 'bg-destructive', 'bg-success', 'bg-warning'].map((c, i) => (
                      <button key={i} className={`w-5 h-5 rounded-full ${c} border-2 border-background`} />
                    ))}
                  </div>
                  <div className="ml-auto flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-xs">Undo</Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs">Clear</Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs">Save</Button>
                  </div>
                </div>
                {/* Canvas area */}
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <PenTool className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">Interactive Whiteboard</p>
                    <p className="text-xs mt-1">Draw diagrams, write formulas, annotate slides</p>
                    <p className="text-[10px] mt-2 text-primary">Canvas integration ready for WebRTC</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-center gap-2 mt-3 py-2">
            <Button
              variant={micOn ? 'outline' : 'destructive'}
              size="sm"
              className="rounded-full w-10 h-10 p-0"
              onClick={() => setMicOn(!micOn)}
            >
              {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </Button>
            <Button
              variant={cameraOn ? 'outline' : 'destructive'}
              size="sm"
              className="rounded-full w-10 h-10 p-0"
              onClick={() => setCameraOn(!cameraOn)}
            >
              {cameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </Button>
            <Button
              variant={screenSharing ? 'default' : 'outline'}
              size="sm"
              className="rounded-full w-10 h-10 p-0"
              onClick={() => setScreenSharing(!screenSharing)}
            >
              <ScreenShare className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="rounded-full w-10 h-10 p-0">
              <Hand className="w-4 h-4" />
            </Button>
            <Button
              variant={isRecording ? 'destructive' : 'outline'}
              size="sm"
              className="rounded-full w-10 h-10 p-0"
              onClick={() => setIsRecording(!isRecording)}
            >
              <Circle className="w-4 h-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-2" />
            <Button
              variant={chatOpen ? 'default' : 'outline'}
              size="sm"
              className="rounded-full w-10 h-10 p-0"
              onClick={() => { setChatOpen(!chatOpen); setParticipantsOpen(false); }}
            >
              <MessageSquare className="w-4 h-4" />
            </Button>
            <Button
              variant={participantsOpen ? 'default' : 'outline'}
              size="sm"
              className="rounded-full w-10 h-10 p-0"
              onClick={() => { setParticipantsOpen(!participantsOpen); setChatOpen(false); }}
            >
              <Users className="w-4 h-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-2" />
            <Button variant="destructive" size="sm" className="rounded-full px-4 h-10">
              <PhoneOff className="w-4 h-4 mr-1.5" /> End
            </Button>
          </div>
        </div>

        {/* Side Panel: Chat or Participants */}
        {(chatOpen || participantsOpen) && (
          <div className="w-72 surface-card flex flex-col shrink-0">
            {chatOpen && (
              <>
                <div className="p-3 border-b border-border">
                  <h3 className="text-sm font-semibold">Class Chat</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {CHAT_MESSAGES.map((m, i) => (
                    <div key={i} className={m.role === 'lecturer' ? '' : ''}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-[10px] font-semibold ${m.role === 'lecturer' ? 'text-primary' : 'text-foreground'}`}>
                          {m.sender}
                        </span>
                        <span className="text-[9px] text-muted-foreground">{m.time}</span>
                      </div>
                      <p className={`text-xs leading-relaxed p-2 rounded-lg ${
                        m.role === 'lecturer' ? 'bg-primary/10' : 'bg-secondary'
                      }`}>{m.text}</p>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-border">
                  <div className="flex gap-2">
                    <input
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 bg-secondary text-sm px-3 py-2 rounded-lg outline-none text-foreground placeholder:text-muted-foreground"
                    />
                    <Button size="sm" className="h-9 w-9 p-0 shrink-0">
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </>
            )}

            {participantsOpen && (
              <>
                <div className="p-3 border-b border-border">
                  <h3 className="text-sm font-semibold">Participants ({MOCK_STUDENTS.length})</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                  {/* Lecturer */}
                  <div className="flex items-center gap-2.5 p-2 rounded-lg bg-primary/5">
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-primary">DK</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-primary">Dr. Ahmed Khan</p>
                      <p className="text-[10px] text-muted-foreground">Lecturer (Host)</p>
                    </div>
                    <Mic className="w-3 h-3 text-success" />
                  </div>
                  {/* Students */}
                  {MOCK_STUDENTS.map((s) => (
                    <div key={s.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-secondary transition-default">
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center relative">
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {s.name.split(' ').map(n => n[0]).join('')}
                        </span>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${
                          s.status === 'online' ? 'bg-success' : s.status === 'away' ? 'bg-warning' : 'bg-muted-foreground'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{s.name}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {s.hand && <Hand className="w-3 h-3 text-warning" />}
                        {s.mic ? <Mic className="w-3 h-3 text-success" /> : <MicOff className="w-3 h-3 text-muted-foreground/40" />}
                        <button className="p-1 hover:bg-accent rounded">
                          <MoreVertical className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-border space-y-1.5">
                  <Button variant="outline" size="sm" className="w-full text-xs">Mute All Students</Button>
                  <Button variant="outline" size="sm" className="w-full text-xs">Disable All Cameras</Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
