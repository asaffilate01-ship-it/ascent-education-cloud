import { supabase } from '@/integrations/supabase/client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const TUTOR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`;

import { forwardRef } from 'react';

const AIChatWidget = forwardRef<HTMLDivElement>(function AIChatWidget(_props, ref) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const activeRequest = useRef<AbortController | null>(null);
  const requestVersion = useRef(0);
  const [notice, setNotice] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    requestVersion.current++;
    activeRequest.current?.abort(); activeRequest.current=null;
    setMessages([]); setInput(''); setOpen(false); setLoading(false); setNotice(''); setRemaining(null);
    return () => { requestVersion.current++; activeRequest.current?.abort(); activeRequest.current=null; };
  }, [user?.id, user?.tenantId]);
  const sendMessage = useCallback(async () => {
    if (!user || !input.trim() || activeRequest.current || input.length>2000) return;
    const version=++requestVersion.current;
    const controller=new AbortController();activeRequest.current=controller;
    const userMsg: Message={role:'user',content:input.trim()};
    const history=[...messages.slice(-18),userMsg];
    while(history.length>1&&history.reduce((n,m)=>n+m.content.length,0)>20000)history.shift();
    setMessages(history);setInput('');setLoading(true);setNotice('');
    const current=()=>version===requestVersion.current&&!controller.signal.aborted;
    try {
      const {data,error}=await supabase.auth.getSession();
      if(!current())return;
      if(error||!data.session||data.session.user.id!==user.id)throw Error('Your session has expired. Please sign in again.');
      const resp=await fetch(TUTOR_URL,{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json',apikey:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify({messages:history})});
      const result=await resp.json();if(!current())return;
      if(typeof result.usage?.remaining==='number')setRemaining(result.usage.remaining);
      if(!resp.ok)throw Error(result.error||'Study tutor unavailable. Please try again.');
      if(typeof result.reply!=='string')throw Error('No answer received. Please try again.');
      setMessages(prev=>[...prev,{role:'assistant',content:result.reply}]);
    } catch(error) {if(current()){setNotice(error instanceof Error?error.message:'Connection error. Please try again.');setMessages(messages);setInput(userMsg.content);}}
    finally {if(current()){setLoading(false);activeRequest.current=null;}}
  },[input,messages,user]);

  if (!user) return null;

  return (
    <>
      {/* FAB */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            aria-label="Open AI Study Tutor"
            onClick={() => setOpen(true)}
            className="fixed bottom-20 lg:bottom-6 right-4 z-50 w-14 h-14 rounded-full gradient-primary text-primary-foreground shadow-xl hover:shadow-2xl transition-all flex items-center justify-center"
          >
            <Sparkles className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 lg:bottom-6 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[70vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-bold">AI Study Tutor</p>
                  <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <img src="/brand/omniqora-icon.png" alt="" aria-hidden="true" width={16} height={16} className="size-4 shrink-0 object-contain" />
                    <span>Powered by Omniqora</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button disabled={loading} onClick={() => {setMessages([]);setNotice('');}} className="p-1.5 rounded-lg hover:bg-accent transition-colors" title="Clear chat">
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button aria-label="Close study tutor" onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="border-b px-4 py-2 text-[11px] text-muted-foreground">50 questions/day · 5/minute · resets at midnight PKT. {remaining!==null&&`${remaining} remaining today.`} Requests sent to Omniqora count even if interrupted.</div>
            {notice&&<p role="alert" className="px-4 py-2 text-xs text-destructive">{notice}</p>}
            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <Sparkles className="w-10 h-10 text-primary/30 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-foreground">Hi {user.name?.split(' ')[0]}! 👋</p>
                  <p className="text-xs text-muted-foreground mt-1">Ask me anything about your courses, assignments, or exam prep.</p>
                  <div className="flex flex-wrap gap-1.5 justify-center mt-4">
                    {['Explain Harvard referencing', 'Help with essay structure', 'What is critical analysis?'].map(q => (
                      <button
                        key={q}
                        onClick={() => { setInput(q); }}
                        className="text-[10px] px-2.5 py-1.5 rounded-full bg-accent text-accent-foreground hover:bg-primary/10 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-accent text-accent-foreground rounded-bl-sm'
                  }`}>
                    {m.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-li:my-0.5 prose-headings:mb-1 prose-headings:mt-2">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : m.content}
                  </div>
                </div>
              ))}
              {loading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex justify-start">
                  <div className="bg-accent rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border bg-card">
              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                className="flex items-center gap-2"
              >
                <input
                  aria-label="Ask your study tutor" maxLength={2000}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question…"
                  className="min-w-0 flex-1 bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                  disabled={loading}
                />
                <button
                  aria-label="Send question" type="submit"
                  disabled={!input.trim() || loading}
                  className="p-2.5 rounded-xl gradient-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-md"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

export default AIChatWidget;
