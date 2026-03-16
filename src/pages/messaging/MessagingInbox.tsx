import DashboardLayout from '@/components/layout/DashboardLayout';
import { Search, Send, Paperclip, Star, Archive, Plus, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { DashboardSkeleton } from '@/components/ui/Skeletons';

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

export default function MessagingInbox() {
  const { user } = useAuth();
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newConvoName, setNewConvoName] = useState('');
  const [newConvoOpen, setNewConvoOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    const { data: parts } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (!parts || parts.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const convoIds = parts.map(p => p.conversation_id);
    const { data: convos } = await supabase
      .from('conversations')
      .select('*')
      .in('id', convoIds)
      .order('updated_at', { ascending: false });

    if (convos && convos.length > 0) {
      const mapped: Conversation[] = await Promise.all(convos.map(async (c: any) => {
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content, created_at')
          .eq('conversation_id', c.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', c.id)
          .eq('read', false)
          .neq('sender_id', user.id);

        return {
          id: c.id,
          name: c.name || 'Conversation',
          type: c.type,
          lastMessage: lastMsg?.[0]?.content || '',
          lastTime: lastMsg?.[0]?.created_at
            ? new Date(lastMsg[0].created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
            : '',
          unread: count || 0,
          avatar: (c.name || 'C').slice(0, 2).toUpperCase(),
        };
      }));
      setConversations(mapped);
      if (!selectedConvo && mapped.length > 0) setSelectedConvo(mapped[0].id);
    } else {
      setConversations([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    async function fetchMessages() {
      if (!selectedConvo) return;
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
  }, [selectedConvo, user]);

  // Real-time messages subscription
  useEffect(() => {
    if (!selectedConvo) return;
    const channel = supabase
      .channel(`messages-${selectedConvo}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedConvo}` }, (payload) => {
        const m = payload.new as any;
        setMessages((prev) => {
          if (prev.some(msg => msg.id === m.id)) return prev;
          return [...prev, {
            id: m.id,
            sender_name: m.sender_name,
            content: m.content,
            created_at: new Date(m.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            mine: m.sender_id === user?.id,
          }];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConvo, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !user || !selectedConvo) return;
    const { error } = await supabase.from('messages').insert({
      conversation_id: selectedConvo,
      sender_id: user.id,
      sender_name: user.name,
      content: message,
    });
    if (error) {
      toast.error('Failed to send message');
      return;
    }
    setMessage('');
  };

  const handleCreateConversation = async () => {
    if (!newConvoName.trim() || !user) return;
    setCreating(true);
    const { data: convo, error } = await supabase
      .from('conversations')
      .insert({ name: newConvoName.trim(), type: 'direct' })
      .select()
      .single();

    if (error || !convo) {
      toast.error('Failed to create conversation');
      setCreating(false);
      return;
    }

    await supabase.from('conversation_participants').insert({
      conversation_id: convo.id,
      user_id: user.id,
    });

    const newConvo: Conversation = {
      id: convo.id,
      name: convo.name || 'Conversation',
      type: convo.type,
      lastMessage: '',
      lastTime: 'Now',
      unread: 0,
      avatar: (convo.name || 'C').slice(0, 2).toUpperCase(),
    };
    setConversations(prev => [newConvo, ...prev]);
    setSelectedConvo(convo.id);
    setNewConvoName('');
    setNewConvoOpen(false);
    setCreating(false);
    toast.success('Conversation created');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !selectedConvo) return;
    const path = `${user.id}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('resources').upload(path, file);
    if (error) {
      toast.error('File upload failed');
      return;
    }
    const { data: urlData } = supabase.storage.from('resources').getPublicUrl(path);
    await supabase.from('messages').insert({
      conversation_id: selectedConvo,
      sender_id: user.id,
      sender_name: user.name,
      content: `📎 [${file.name}](${urlData.publicUrl})`,
    });
    toast.success('File shared');
  };

  const filteredConvos = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedConversation = conversations.find((c) => c.id === selectedConvo);

  if (loading) return <DashboardSkeleton />;

  return (
    <DashboardLayout title="Messages" subtitle="Inbox and announcements"
      actions={
        <Dialog open={newConvoOpen} onOpenChange={setNewConvoOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="w-3.5 h-3.5" /> New Chat</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Conversation</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <input
                value={newConvoName}
                onChange={(e) => setNewConvoName(e.target.value)}
                placeholder="Conversation name..."
                className="w-full bg-secondary text-sm px-3 py-2 rounded-lg outline-none"
              />
              <Button onClick={handleCreateConversation} disabled={creating} className="w-full">
                {creating ? 'Creating...' : 'Create Conversation'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No conversations yet</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            Start a new conversation to message lecturers, admissions, or classmates.
          </p>
          <Button onClick={() => setNewConvoOpen(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> Start a Conversation
          </Button>
        </div>
      ) : (
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
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  No messages yet. Send the first one!
                </div>
              )}
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
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                <Button variant="ghost" size="sm" className="w-9 h-9 p-0 shrink-0" onClick={() => fileInputRef.current?.click()}>
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
      )}
    </DashboardLayout>
  );
}
