import DashboardLayout from '@/components/layout/DashboardLayout';
import { MessageSquare, Search, Send, Paperclip, Bell, Users, Star, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const CONVERSATIONS = [
  { id: '1', name: 'Dr. Ahmed Khan', role: 'Lecturer', lastMessage: 'Please review the updated slides for Week 9', time: '10:30 AM', unread: 2, avatar: 'AK' },
  { id: '2', name: 'Admissions Office', role: 'Admin', lastMessage: 'Your document verification is complete', time: '9:15 AM', unread: 0, avatar: 'AO' },
  { id: '3', name: 'Sara Ali', role: 'Student', lastMessage: 'Thank you for the feedback on my assignment', time: 'Yesterday', unread: 0, avatar: 'SA' },
  { id: '4', name: 'Finance Department', role: 'Admin', lastMessage: 'Your instalment payment is due on March 20', time: 'Yesterday', unread: 1, avatar: 'FD' },
  { id: '5', name: 'Class — Strategic Management', role: 'Group', lastMessage: 'Omar: Can someone share the notes from today?', time: 'Mar 13', unread: 5, avatar: 'SM' },
  { id: '6', name: 'Career Services', role: 'Admin', lastMessage: 'New internship opportunity at TechCorp', time: 'Mar 12', unread: 0, avatar: 'CS' },
];

const MESSAGES = [
  { sender: 'Dr. Ahmed Khan', text: 'Good afternoon everyone. I\'ve uploaded the updated slides for Week 9 on Porter\'s Value Chain analysis.', time: '10:15 AM', mine: false },
  { sender: 'Dr. Ahmed Khan', text: 'Please review them before our next session. There\'s also a new reading list added to the Learning Library.', time: '10:16 AM', mine: false },
  { sender: 'You', text: 'Thank you sir! Will the value chain analysis be covered in the assignment?', time: '10:20 AM', mine: true },
  { sender: 'Dr. Ahmed Khan', text: 'Yes, it\'s a key part of the Strategy Report. Focus on applying it to your chosen company.', time: '10:25 AM', mine: false },
  { sender: 'Dr. Ahmed Khan', text: 'Please review the updated slides for Week 9', time: '10:30 AM', mine: false },
];

export default function MessagingInbox() {
  const [selectedConvo, setSelectedConvo] = useState('1');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');

  const filteredConvos = CONVERSATIONS.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

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
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{c.time}</span>
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
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary">AK</span>
              </div>
              <div>
                <p className="text-sm font-semibold">Dr. Ahmed Khan</p>
                <p className="text-[10px] text-muted-foreground">Lecturer · Strategic Management</p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="w-8 h-8 p-0"><Star className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="sm" className="w-8 h-8 p-0"><Archive className="w-3.5 h-3.5" /></Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {MESSAGES.map((m, i) => (
              <div key={i} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] ${m.mine ? 'order-2' : ''}`}>
                  {!m.mine && (
                    <p className="text-[10px] font-semibold text-primary mb-0.5 ml-1">{m.sender}</p>
                  )}
                  <div className={`p-3 rounded-xl text-xs leading-relaxed ${
                    m.mine ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-secondary rounded-bl-sm'
                  }`}>
                    {m.text}
                  </div>
                  <p className={`text-[9px] text-muted-foreground mt-0.5 ${m.mine ? 'text-right mr-1' : 'ml-1'}`}>{m.time}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border">
            <div className="flex gap-2 items-end">
              <Button variant="ghost" size="sm" className="w-9 h-9 p-0 shrink-0">
                <Paperclip className="w-4 h-4" />
              </Button>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 bg-secondary text-sm px-3 py-2 rounded-lg outline-none text-foreground placeholder:text-muted-foreground resize-none"
              />
              <Button size="sm" className="h-9 w-9 p-0 shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
