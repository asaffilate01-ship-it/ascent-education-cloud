import DashboardLayout from '@/components/layout/DashboardLayout';
import { Search, Send, Paperclip, Star, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Conversation {
  id: string;
  name: string;
  type: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  avatar: string;
}

interface Message {
  id: string;
  sender_name: string;
  content: string;
  created_at: string;
  mine: boolean;
}

// Fallback mock data when no conversations exist (no auth or fresh db)
const MOCK_CONVERSATIONS: Conversation[] = [
  { id: '1', name: 'Dr. Ahmed Khan', type: 'direct', lastMessage: 'Please review the updated slides for Week 9', lastTime: '10:30 AM', unread: 2, avatar: 'AK' },
  { id: '2', name: 'Admissions Office', type: 'direct', lastMessage: 'Your document verification is complete', lastTime: '9:15 AM', unread: 0, avatar: 'AO' },
  { id: '3', name: 'Sara Ali', type: 'direct', lastMessage: 'Thank you for the feedback on my assignment', lastTime: 'Yesterday', unread: 0, avatar: 'SA' },
  { id: '4', name: 'Finance Department', type: 'direct', lastMessage: 'Your instalment payment is due on March 20', lastTime: 'Yesterday', unread: 1, avatar: 'FD' },
  { id: '5', name: 'Class — Strategic Management', type: 'group', lastMessage: 'Omar: Can someone share the notes from today?', lastTime: 'Mar 13', unread: 5, avatar: 'SM' },
  { id: '6', name: 'Career Services', type: 'direct', lastMessage: 'New internship opportunity at TechCorp', lastTime: 'Mar 12', unread: 0, avatar: 'CS' },
];

const MOCK_MESSAGES: Message[] = [
  { id: '1', sender_name: 'Dr. Ahmed Khan', content: "Good afternoon everyone. I've uploaded the updated slides for Week 9 on Porter's Value Chain analysis.", created_at: '10:15 AM', mine: false },
  { id: '2', sender_name: 'Dr. Ahmed Khan', content: "Please review them before our next session. There's also a new reading list added to the Learning Library.", created_at: '10:16 AM', mine: false },
  { id: '3', sender_name: 'You', content: 'Thank you sir! Will the value chain analysis be covered in the assignment?', created_at: '10:20 AM', mine: true },
  { id: '4', sender_name: 'Dr. Ahmed Khan', content: "Yes, it's a key part of the Strategy Report. Focus on applying it to your chosen company.", created_at: '10:25 AM', mine: false },
  { id: '5', sender_name: 'Dr. Ahmed Khan', content: 'Please review the updated slides for Week 9', created_at: '10:30 AM', mine: false },
];

export default function MessagingInbox() {
  const { user } = useAuth();
  const [selectedConvo, setSelectedConvo] = useState('1');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [dbMode, setDbMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchConversations() {
      if (!user) return;
      const { data: convos } = await supabase
        .from('conversations')
        .select('*, conversation_participants!inner(user_id)')
        .order('updated_at', { ascending: false });

      if (convos && convos.length > 0) {
        setDbMode(true);
        const mapped: Conversation[] = convos.map((c: any) => ({
          id: c.id,
          name: c.name || 'Conversation',
          type: c.type,
          lastMessage: '',
          lastTime: new Date(c.updated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          unread: 0,
          avatar: (c.name || 'C').slice(0, 2).toUpperCase(),
        }));
        setConversations(mapped);
        if (mapped.length > 0) setSelectedConvo(mapped[0].id);
      }
    }
    fetchConversations();
  }, [user]);

  useEffect(() => {
    async function fetchMessages() {
      if (!dbMode || !selectedConvo) return;
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedConvo)
        .order('created_at', { ascending: true });

      if (data) {
        setMessages(data.map((m: any) => ({
          id: m.id,
          sender_name: m.sender_name,
          content: m.content,
          created_at: new Date(m.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          mine: m.sender_id === user?.id,
        })));
      }
    }
    fetchMessages();
  }, [selectedConvo, dbMode, user]);

  // Real-time messages subscription
  useEffect(() => {
    if (!dbMode || !selectedConvo) return;
    const channel = supabase
      .channel(`messages-${selectedConvo}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedConvo}` }, (payload) => {
        const m = payload.new as any;
        setMessages((prev) => [...prev, {
          id: m.id,
          sender_name: m.sender_name,
          content: m.content,
          created_at: new Date(m.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          mine: m.sender_id === user?.id,
        }]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConvo, dbMode, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim()) return;
    if (dbMode && user) {
      await supabase.from('messages').insert({
        conversation_id: selectedConvo,
        sender_id: user.id,
        sender_name: user.name,
        content: message,
      });
    } else {
      // Mock mode
      setMessages((prev) => [...prev, {
        id: String(Date.now()),
        sender_name: 'You',
        content: message,
        created_at: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        mine: true,
      }]);
    }
    setMessage('');
  };

  const filteredConvos = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedConversation = conversations.find((c) => c.id === selectedConvo);

  return (
    <DashboardLayout title="Messages" subtitle="Inbox and announcements">
      <div className="flex gap-0 h-[calc(100vh-180px)] surface-card overflow-hidden rounded-xl">
        {/* Conversation List */}
        <div className="w-80 border-r border-border flex flex-col shrink-0">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search messages..."
                className="w-full bg-secondary text-xs pl-9 pr-3 py-2 rounded-lg outline-none text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredConvos.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedConvo(c.id)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-default border-b border-border/30 ${
                  selectedConvo === c.id ? 'bg-primary/5' : 'hover:bg-secondary/50'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-primary">{c.avatar}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold truncate">{c.name}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{c.lastTime}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{c.lastMessage}</p>
                </div>
                {c.unread > 0 && (
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                    {c.unread}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary">{selectedConversation?.avatar || '?'}</span>
              </div>
              <div>
                <p className="text-sm font-semibold">{selectedConversation?.name || 'Select a conversation'}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{selectedConversation?.type || ''}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="w-8 h-8 p-0"><Star className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="sm" className="w-8 h-8 p-0"><Archive className="w-3.5 h-3.5" /></Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[70%]">
                  {!m.mine && (
                    <p className="text-[10px] font-semibold text-primary mb-0.5 ml-1">{m.sender_name}</p>
                  )}
                  <div className={`p-3 rounded-xl text-xs leading-relaxed ${
                    m.mine ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-secondary rounded-bl-sm'
                  }`}>
                    {m.content}
                  </div>
                  <p className={`text-[9px] text-muted-foreground mt-0.5 ${m.mine ? 'text-right mr-1' : 'ml-1'}`}>{m.created_at}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-border">
            <div className="flex gap-2 items-end">
              <Button variant="ghost" size="sm" className="w-9 h-9 p-0 shrink-0">
                <Paperclip className="w-4 h-4" />
              </Button>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 bg-secondary text-sm px-3 py-2 rounded-lg outline-none text-foreground placeholder:text-muted-foreground resize-none"
              />
              <Button size="sm" className="h-9 w-9 p-0 shrink-0" onClick={handleSend}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
