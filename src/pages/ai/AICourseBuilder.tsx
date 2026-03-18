import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Brain, ListChecks, Route, Sparkles, Loader2, Copy, Download, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type ActionType = 'lesson_plan' | 'quiz' | 'learning_path';

export default function AICourseBuilder() {
  const [action, setAction] = useState<ActionType>('lesson_plan');
  const [programmeTitle, setProgrammeTitle] = useState('');
  const [level, setLevel] = useState('');
  const [moduleName, setModuleName] = useState('');
  const [topics, setTopics] = useState('');
  const [learningOutcomes, setLearningOutcomes] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!moduleName.trim()) {
      toast.error('Module name is required');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('ai-course-builder', {
        body: { action, programmeTitle, level, moduleName, topics, learningOutcomes },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data.result);
      toast.success('Generated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const copyResult = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadResult = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${action}-${moduleName.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout title="AI Course Builder" subtitle="Auto-generate lesson plans, quizzes & learning paths using AI">
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Generation Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={action} onValueChange={(v) => setAction(v as ActionType)}>
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="lesson_plan" className="text-xs gap-1"><BookOpen className="w-3.5 h-3.5" /> Lesson</TabsTrigger>
                  <TabsTrigger value="quiz" className="text-xs gap-1"><ListChecks className="w-3.5 h-3.5" /> Quiz</TabsTrigger>
                  <TabsTrigger value="learning_path" className="text-xs gap-1"><Route className="w-3.5 h-3.5" /> Pathway</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Course Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Programme Title</label>
                <Input value={programmeTitle} onChange={(e) => setProgrammeTitle(e.target.value)} placeholder="e.g. Diploma in Business Management" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Level</label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>
                    {['Level 3', 'Level 4', 'Level 5', 'Level 6', 'Level 7'].map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Module Name *</label>
                <Input value={moduleName} onChange={(e) => setModuleName(e.target.value)} placeholder="e.g. Strategic Marketing" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Topics / Focus Areas</label>
                <Textarea value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="e.g. SWOT analysis, Porter's Five Forces, Digital marketing strategy" rows={3} />
              </div>
              {action === 'lesson_plan' && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Learning Outcomes</label>
                  <Textarea value={learningOutcomes} onChange={(e) => setLearningOutcomes(e.target.value)} placeholder="e.g. Critically evaluate marketing strategies..." rows={3} />
                </div>
              )}
              <Button onClick={generate} disabled={loading || !moduleName.trim()} className="w-full gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                {loading ? 'Generating…' : `Generate ${action === 'lesson_plan' ? 'Lesson Plan' : action === 'quiz' ? 'Quiz' : 'Learning Path'}`}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Result Panel */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader className="pb-3 flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" /> Generated Content
              </CardTitle>
              {result && (
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={copyResult} className="h-7 text-xs gap-1">
                    {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={downloadResult} className="h-7 text-xs gap-1">
                    <Download className="w-3 h-3" /> Export
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {loading && (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                  <p className="text-sm font-medium">Generating with AI…</p>
                  <p className="text-xs text-muted-foreground">This may take 10-20 seconds</p>
                </div>
              )}
              {!loading && !result && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Sparkles className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-medium">No content generated yet</p>
                  <p className="text-xs mt-1">Fill in the details and click Generate</p>
                </div>
              )}
              {!loading && result && typeof result === 'object' && (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  {/* Lesson Plan */}
                  {result.title && result.objectives && (
                    <>
                      <div>
                        <h3 className="text-base font-bold">{result.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{result.duration_minutes} minutes</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Objectives</h4>
                        <ul className="space-y-1">
                          {result.objectives?.map((o: string, i: number) => (
                            <li key={i} className="text-sm flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />{o}</li>
                          ))}
                        </ul>
                      </div>
                      {result.warm_up && (
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Warm-Up</h4>
                          <p className="text-sm">{result.warm_up}</p>
                        </div>
                      )}
                      {result.main_activities && (
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Activities</h4>
                          <div className="space-y-2">
                            {result.main_activities.map((a: any, i: number) => (
                              <div key={i} className="p-3 rounded-lg bg-accent/50 border border-border">
                                <div className="flex justify-between items-start">
                                  <p className="text-sm font-medium">{a.activity}</p>
                                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{a.duration}</span>
                                </div>
                                {a.resources && <p className="text-xs text-muted-foreground mt-1">Resources: {a.resources}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {result.assessment_method && (
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Assessment</h4>
                          <p className="text-sm">{result.assessment_method}</p>
                        </div>
                      )}
                      {result.homework && (
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Homework</h4>
                          <p className="text-sm">{result.homework}</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Quiz */}
                  {result.quiz_title && result.questions && (
                    <>
                      <h3 className="text-base font-bold">{result.quiz_title}</h3>
                      <div className="space-y-4">
                        {result.questions.map((q: any, i: number) => (
                          <div key={i} className="p-3 rounded-lg bg-accent/50 border border-border">
                            <div className="flex items-start gap-2 mb-2">
                              <span className="text-xs bg-primary/10 text-primary font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">{i + 1}</span>
                              <div className="flex-1">
                                <p className="text-sm font-medium">{q.question}</p>
                                <span className="text-[10px] text-muted-foreground uppercase">{q.type} · {q.bloom_level}</span>
                              </div>
                            </div>
                            {q.options && (
                              <div className="ml-8 space-y-1 mb-2">
                                {q.options.map((opt: string, j: number) => (
                                  <div key={j} className={`text-xs px-2 py-1 rounded ${opt === q.correct_answer ? 'bg-green-500/10 text-green-700 font-medium' : ''}`}>
                                    {String.fromCharCode(65 + j)}. {opt}
                                  </div>
                                ))}
                              </div>
                            )}
                            {q.correct_answer && !q.options && (
                              <p className="ml-8 text-xs text-green-600 font-medium">Answer: {q.correct_answer}</p>
                            )}
                            {q.explanation && <p className="ml-8 text-xs text-muted-foreground mt-1">💡 {q.explanation}</p>}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Learning Path */}
                  {result.pathway_title && result.weeks && (
                    <>
                      <div>
                        <h3 className="text-base font-bold">{result.pathway_title}</h3>
                        {result.description && <p className="text-sm text-muted-foreground mt-1">{result.description}</p>}
                      </div>
                      <div className="space-y-3">
                        {result.weeks.map((w: any, i: number) => (
                          <div key={i} className="p-3 rounded-lg bg-accent/50 border border-border">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs bg-primary text-primary-foreground font-bold px-2 py-0.5 rounded-full">Week {w.week_number}</span>
                              <span className="text-sm font-medium">{w.topic}</span>
                            </div>
                            {w.learning_outcomes && (
                              <div className="ml-4 mb-1">
                                {w.learning_outcomes.map((lo: string, j: number) => (
                                  <p key={j} className="text-xs text-muted-foreground">• {lo}</p>
                                ))}
                              </div>
                            )}
                            {w.assessment && <p className="text-xs text-primary ml-4">📝 {w.assessment}</p>}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Raw string fallback */}
                  {typeof result === 'string' && <pre className="text-xs whitespace-pre-wrap bg-accent/50 p-4 rounded-lg">{result}</pre>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
