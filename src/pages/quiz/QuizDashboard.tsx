import { useState, useEffect, useRef, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Play, Clock, Trophy, Pencil, Trash2, CheckCircle, XCircle, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { db } from '@/lib/db';
import StatusBadge from '@/components/ui/StatusBadge';

interface Quiz {
  id: string;
  title: string;
  description: string;
  module_id: string;
  time_limit_minutes: number;
  max_attempts: number;
  pass_percentage: number;
  shuffle_questions: boolean;
  show_results: boolean;
  status: string;
  created_by: string;
}

interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  points: number;
  explanation: string;
  sort_order: number;
}

interface Attempt {
  id: string;
  quiz_id: string;
  student_id: string;
  answers: Record<string, string>;
  score: number;
  total_points: number;
  percentage: number;
  passed: boolean;
  started_at: string;
  completed_at: string;
  time_spent_seconds: number;
}

export default function QuizDashboard() {
  const { user } = useAuth();
  const isStaff = ['lecturer', 'centre_director', 'programme_leader', 'superadmin'].includes(user?.role || '');

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [takingQuiz, setTakingQuiz] = useState<Quiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizTimer, setQuizTimer] = useState(0);
  const [showAddQ, setShowAddQ] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const deadline = useRef(0);
  const answersRef = useRef<Record<string,string>>({});
  const submitting = useRef(false);
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());

  // Form state
  const [form, setForm] = useState({
    title: '', description: '', module_id: '', time_limit_minutes: 30,
    max_attempts: 1, pass_percentage: 50, shuffle_questions: true, show_results: true,
  });

  const [qForm, setQForm] = useState({
    question_text: '', question_type: 'mcq' as string,
    options: ['', '', '', ''], correct_answer: '', points: 1, explanation: '',
  });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [qRes, mRes, aRes] = await Promise.all([
      supabase.from('quizzes').select('*').order('created_at', { ascending: false }),
      supabase.from('modules').select('*').order('title'),
      db.rpc('my_quiz_attempts'),
    ]);
    if (qRes.error || mRes.error || aRes.error) toast.error('Some quiz information could not be loaded. Please retry.');
    if (qRes.data) setQuizzes(qRes.data as any);
    if (mRes.data) setModules(mRes.data);
    if (aRes.data) setAttempts(aRes.data as any);
    setLoading(false);
  };

  const createQuiz = async () => {
    if (!form.title) { toast.error('Title required'); return; }
    const profile = await supabase.from('profiles').select('tenant_id').eq('user_id', user!.id).single();
    const { error } = await supabase.from('quizzes').insert({
      ...form,
      tenant_id: profile.data?.tenant_id,
      created_by: user!.id,
      status: 'draft',
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Quiz created');
    setShowCreate(false);
    setForm({ title: '', description: '', module_id: '', time_limit_minutes: 30, max_attempts: 1, pass_percentage: 50, shuffle_questions: true, show_results: true });
    fetchData();
  };

  const loadQuestions = async (quizId: string) => {
    const { data, error } = await supabase.from('quiz_questions').select('*').eq('quiz_id', quizId).order('sort_order');
    if (error) { toast.error('Questions could not be loaded'); return; }
    setQuestions((data as any) || []);
  };

  const openQuiz = async (quiz: Quiz) => {
    setActiveQuiz(quiz);
    await loadQuestions(quiz.id);
  };

  const addQuestion = async () => {
    if (!qForm.question_text || !qForm.correct_answer) { toast.error('Fill question and answer'); return; }
    const { error } = await supabase.from('quiz_questions').insert({
      quiz_id: activeQuiz!.id,
      ...qForm,
      options: qForm.question_type === 'mcq' ? qForm.options.filter(o => o) : [],
      sort_order: questions.length,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Question added');
    setShowAddQ(false);
    setQForm({ question_text: '', question_type: 'mcq', options: ['', '', '', ''], correct_answer: '', points: 1, explanation: '' });
    loadQuestions(activeQuiz!.id);
  };

  const publishQuiz = async (quizId: string) => {
    const { error } = await supabase.from('quizzes').update({ status: 'published' } as any).eq('id', quizId);
    if (error) { toast.error(error.message); return; }
    toast.success('Quiz published');
    fetchData();
    if (activeQuiz?.id === quizId) setActiveQuiz({ ...activeQuiz!, status: 'published' });
  };

  const deleteQuestion = async (id: string) => {
    const { error } = await supabase.from('quiz_questions').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Question removed');
    loadQuestions(activeQuiz!.id);
  };

  const startQuiz = async (quiz: Quiz) => {
    if (busy) return;
    setBusy(true);
    try {
      const {data,error}=await db.rpc('start_quiz_attempt',{p_quiz_id:quiz.id});
      if (error) throw error;
      setQuestions(data.questions);setAttemptId(data.attempt_id);
      answersRef.current=data.answers||{};setQuizAnswers(answersRef.current);
      const remaining=Math.max(0,new Date(data.expires_at).getTime()-new Date(data.server_now).getTime());
      deadline.current=Date.now()+remaining;setQuizTimer(Math.ceil(remaining/1000));
      setSaveStatus('Answers saved');setTakingQuiz(quiz);
    } catch(error) { toast.error(error instanceof Error?error.message:(error as {message?:string})?.message||'Quiz could not be started'); }
    finally { setBusy(false); }
  };

  const submitQuiz = useCallback(async () => {
    if (!attemptId || submitting.current) return;
    submitting.current=true;setBusy(true);
    try {
      await saveQueue.current;
      const {data,error}=await db.rpc('submit_quiz_attempt',{p_attempt_id:attemptId,p_answers:answersRef.current});
      if (error) throw error;
      toast.success(data.results_visible?`Quiz submitted! Score: ${data.percentage}%`:'Quiz submitted. Results are withheld by your teacher.');
      setTakingQuiz(null);setAttemptId(null);void fetchData();
    } catch { toast.error('Submission was not confirmed. Your attempt remains open; please retry.'); }
    finally { submitting.current=false;setBusy(false); }
  },[attemptId]);

  useEffect(()=>{
    if (!takingQuiz) return;
    const tick=()=>setQuizTimer(Math.max(0,Math.ceil((deadline.current-Date.now())/1000)));
    tick();const timer=setInterval(tick,1000);return()=>clearInterval(timer);
  },[takingQuiz]);
  useEffect(()=>{
    if (takingQuiz && quizTimer===0) void submitQuiz();
  },[takingQuiz,quizTimer,submitQuiz]);
  useEffect(()=>{
    if (!attemptId || !takingQuiz || submitting.current || quizTimer===0) return;
    setSaveStatus('Saving answers…');
    const timer=setTimeout(()=>{
      const snapshot=quizAnswers;
      saveQueue.current=saveQueue.current.catch(()=>{}).then(async()=>{
        const {error}=await db.rpc('save_quiz_answers',{p_attempt_id:attemptId,p_answers:snapshot});
        setSaveStatus(error?'Answers not saved. Check your connection and submit before time runs out.':'Answers saved');
      });
    },350);
    return()=>clearTimeout(timer);
  },[quizAnswers,attemptId,takingQuiz]);
  const answer=(id:string,value:string)=>{
    answersRef.current={...answersRef.current,[id]:value};setQuizAnswers(answersRef.current);
  };

  const modMap: Record<string, any> = {};
  modules.forEach(m => { modMap[m.id] = m; });

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // Taking quiz view
  if (takingQuiz) {
    return (
      <DashboardLayout title={takingQuiz.title} subtitle="Answer all questions">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between surface-card p-4">
            <span className="text-sm font-medium">{questions.length} Questions</span>
            <span className="text-sm font-bold text-destructive flex items-center gap-1">
              <Clock className="w-4 h-4" /> {formatTime(quizTimer)}
            </span>
          </div>
          {questions.map((q, i) => (
            <div key={q.id} className="surface-card p-5">
              <p className="text-sm font-semibold mb-3">{i + 1}. {q.question_text} <span className="text-muted-foreground">({q.points} pt{q.points > 1 ? 's' : ''})</span></p>
              {q.question_type === 'mcq' && (q.options as string[]).map((opt, oi) => (
                <label key={oi} className={`flex items-center gap-3 p-3 rounded-lg border mb-2 cursor-pointer transition-all ${quizAnswers[q.id] === opt ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                  <input type="radio" name={q.id} value={opt} checked={quizAnswers[q.id] === opt}
                    disabled={busy || quizTimer===0} onChange={() => answer(q.id,opt)} className="accent-primary" />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
              {q.question_type === 'true_false' && ['True', 'False'].map(opt => (
                <label key={opt} className={`flex items-center gap-3 p-3 rounded-lg border mb-2 cursor-pointer transition-all ${quizAnswers[q.id] === opt ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                  <input type="radio" name={q.id} value={opt} checked={quizAnswers[q.id] === opt}
                    disabled={busy || quizTimer===0} onChange={() => answer(q.id,opt)} className="accent-primary" />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
              {q.question_type === 'short_answer' && (
                <Input aria-label={`Answer to question ${i+1}`} maxLength={4000} disabled={busy || quizTimer===0} value={quizAnswers[q.id] || ''} onChange={e => answer(q.id,e.target.value)} placeholder="Type your answer" />
              )}
            </div>
          ))}
          <p role="status" className="text-sm text-muted-foreground">{saveStatus}</p><p className="text-xs text-muted-foreground">Answers are saved as you work. When time expires, only answers received by the server before the deadline are marked. Short answers ignore letter case and surrounding spaces.</p>
          <Button disabled={busy} className="w-full" onClick={submitQuiz}>{busy ? 'Submitting…' : 'Submit Quiz'}</Button>
        </div>
      </DashboardLayout>
    );
  }

  // Staff: editing quiz questions
  if (activeQuiz && isStaff) {
    return (
      <DashboardLayout title={activeQuiz.title} subtitle="Manage questions">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setActiveQuiz(null)}>← Back</Button>
            <div className="flex gap-2">
              {activeQuiz.status === 'draft' && (
                <Button size="sm" onClick={() => publishQuiz(activeQuiz.id)} disabled={questions.length === 0}>Publish</Button>
              )}
              <Button size="sm" onClick={() => setShowAddQ(true)}><Plus className="w-4 h-4 mr-1" /> Add Question</Button>
            </div>
          </div>

          <div className="surface-card p-4 text-sm">
            <p><strong>Module:</strong> {modMap[activeQuiz.module_id]?.title || '—'}</p>
            <p><strong>Time Limit:</strong> {activeQuiz.time_limit_minutes} min · <strong>Pass:</strong> {activeQuiz.pass_percentage}% · <strong>Attempts:</strong> {activeQuiz.max_attempts}</p>
            <StatusBadge status={activeQuiz.status} />
          </div>

          {questions.length === 0 ? (
            <div className="surface-card p-8 text-center text-muted-foreground text-sm">No questions yet. Add your first question.</div>
          ) : questions.map((q, i) => (
            <div key={q.id} className="surface-card p-4">
              <div className="flex justify-between items-start mb-2">
                <p className="text-sm font-semibold">{i + 1}. {q.question_text}</p>
                <Button variant="ghost" size="sm" onClick={() => deleteQuestion(q.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
              </div>
              <p className="text-xs text-muted-foreground mb-1">Type: {q.question_type} · {q.points} pt(s)</p>
              {q.question_type === 'mcq' && (
                <div className="space-y-1">
                  {(q.options as string[]).map((opt, oi) => (
                    <div key={oi} className={`text-xs px-2 py-1 rounded ${opt === q.correct_answer ? 'bg-success/10 text-success font-medium' : 'text-muted-foreground'}`}>
                      {opt === q.correct_answer ? <CheckCircle className="w-3 h-3 inline mr-1" /> : null}{opt}
                    </div>
                  ))}
                </div>
              )}
              {q.question_type !== 'mcq' && <p className="text-xs text-success">Answer: {q.correct_answer}</p>}
              {q.explanation && <p className="text-xs text-muted-foreground mt-1 italic">💡 {q.explanation}</p>}
            </div>
          ))}
        </div>

        {/* Add question dialog */}
        <Dialog open={showAddQ} onOpenChange={setShowAddQ}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Question</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Question Type</Label>
                <Select value={qForm.question_type} onValueChange={v => setQForm(p => ({ ...p, question_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcq">Multiple Choice</SelectItem>
                    <SelectItem value="true_false">True / False</SelectItem>
                    <SelectItem value="short_answer">Short Answer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Question</Label>
                <Textarea value={qForm.question_text} onChange={e => setQForm(p => ({ ...p, question_text: e.target.value }))} />
              </div>
              {qForm.question_type === 'mcq' && (
                <div className="space-y-2">
                  <Label>Options</Label>
                  {qForm.options.map((opt, i) => (
                    <Input key={i} value={opt} placeholder={`Option ${i + 1}`}
                      onChange={e => { const o = [...qForm.options]; o[i] = e.target.value; setQForm(p => ({ ...p, options: o })); }} />
                  ))}
                </div>
              )}
              <div>
                <Label>Correct Answer</Label>
                {qForm.question_type === 'true_false' ? (
                  <Select value={qForm.correct_answer} onValueChange={v => setQForm(p => ({ ...p, correct_answer: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="True">True</SelectItem>
                      <SelectItem value="False">False</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={qForm.correct_answer} onChange={e => setQForm(p => ({ ...p, correct_answer: e.target.value }))} placeholder="Exact correct answer" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Points</Label>
                  <Input type="number" value={qForm.points} onChange={e => setQForm(p => ({ ...p, points: +e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Explanation (staff reference)</Label>
                <Textarea value={qForm.explanation} onChange={e => setQForm(p => ({ ...p, explanation: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddQ(false)}>Cancel</Button>
              <Button onClick={addQuestion}>Add Question</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Quizzes & Assessments" subtitle={isStaff ? 'Create and manage quizzes' : 'Take quizzes and view results'}>
      <Tabs defaultValue={isStaff ? 'manage' : 'available'} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            {isStaff && <TabsTrigger value="manage">Manage Quizzes</TabsTrigger>}
            <TabsTrigger value="available">Available Quizzes</TabsTrigger>
            <TabsTrigger value="results">My Results</TabsTrigger>
          </TabsList>
          {isStaff && <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> Create Quiz</Button>}
        </div>

        {isStaff && (
          <TabsContent value="manage">
            {quizzes.length === 0 ? (
              <div className="surface-card p-12 text-center text-muted-foreground text-sm">No quizzes created yet</div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {quizzes.filter(q => q.created_by === user?.id || isStaff).map(quiz => (
                  <div key={quiz.id} className="surface-card p-5 hover:shadow-md transition-all cursor-pointer" onClick={() => openQuiz(quiz)}>
                    <div className="flex items-center justify-between mb-2">
                      <StatusBadge status={quiz.status} />
                      <span className="text-xs text-muted-foreground">{quiz.time_limit_minutes}m</span>
                    </div>
                    <h3 className="text-sm font-bold mb-1">{quiz.title}</h3>
                    <p className="text-xs text-muted-foreground">{modMap[quiz.module_id]?.title || 'No module'}</p>
                    <p className="text-xs text-muted-foreground mt-1">Pass: {quiz.pass_percentage}% · Attempts: {quiz.max_attempts}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        <TabsContent value="available">
          {quizzes.filter(q => q.status === 'published').length === 0 ? (
            <div className="surface-card p-12 text-center text-muted-foreground text-sm">No quizzes available</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {quizzes.filter(q => q.status === 'published').map(quiz => {
                const myAttempts = attempts.filter(a => a.quiz_id === quiz.id);
                const marked = myAttempts.filter(a=>a.percentage!==null && a.completed_at);
                const resumable=myAttempts.some(a=>!a.completed_at);
                const best = marked.length > 0 ? Math.max(...marked.map(a => a.percentage)) : null;
                return (
                  <div key={quiz.id} className="surface-card p-5">
                    <h3 className="text-sm font-bold mb-1">{quiz.title}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{modMap[quiz.module_id]?.title || '—'}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{quiz.time_limit_minutes}m</span>
                      <span>Pass: {quiz.pass_percentage}%</span>
                      <span>{myAttempts.length}/{quiz.max_attempts} attempts</span>
                    </div>
                    {best !== null && (
                      <p className={`text-xs font-medium mb-2 ${best >= quiz.pass_percentage ? 'text-success' : 'text-destructive'}`}>
                        Best: {best}% {best >= quiz.pass_percentage ? '✓ Passed' : '✗ Failed'}
                      </p>
                    )}
                    <Button size="sm" className="w-full" onClick={() => startQuiz(quiz)} disabled={busy || (!resumable && myAttempts.length >= quiz.max_attempts)}>
                      <Play className="w-3.5 h-3.5 mr-1" /> {resumable ? 'Resume attempt' : myAttempts.length > 0 ? 'Retake' : 'Start Quiz'}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="results">
          {attempts.length === 0 ? (
            <div className="surface-card p-12 text-center text-muted-foreground text-sm">No quiz attempts yet</div>
          ) : (
            <div className="space-y-3">
              {attempts.map(a => {
                const quiz = quizzes.find(q => q.id === a.quiz_id);
                return (
                  <div key={a.id} className="surface-card p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{quiz?.title || 'Quiz'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.started_at).toLocaleDateString()} · {a.time_spent_seconds ? formatTime(a.time_spent_seconds) : '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${a.passed ? 'text-success' : 'text-destructive'}`}>{!a.completed_at ? 'In progress' : a.percentage===null ? 'Results withheld' : `${a.percentage}%`}</p>
                      <p className="text-xs text-muted-foreground">{a.score!==null && a.completed_at ? `${a.score}/${a.total_points} pts` : ''}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create quiz dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Quiz</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div>
              <Label>Module</Label>
              <Select value={form.module_id} onValueChange={v => setForm(p => ({ ...p, module_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
                <SelectContent>{modules.map(m => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Time (min)</Label><Input type="number" value={form.time_limit_minutes} onChange={e => setForm(p => ({ ...p, time_limit_minutes: +e.target.value }))} /></div>
              <div><Label>Attempts</Label><Input type="number" value={form.max_attempts} onChange={e => setForm(p => ({ ...p, max_attempts: +e.target.value }))} /></div>
              <div><Label>Pass %</Label><Input type="number" value={form.pass_percentage} onChange={e => setForm(p => ({ ...p, pass_percentage: +e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={createQuiz}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
