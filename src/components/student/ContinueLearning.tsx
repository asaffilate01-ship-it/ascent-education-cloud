import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/db';
import { rowsByIds } from '@/lib/pagedRows';
import type { LessonProgress } from '@/lib/structuredLessons';
import { chooseContinueLesson, continueLessonPath, currentLessonCompletion, type ContinueLesson, type ContinueReason } from '@/lib/learning/continueLearning';
import { verifyContinueLearningSnapshot, type OwnedLearningProgress } from '@/lib/learning/verifiedContinueLearning';

type Module = { id: string; title: string; code?: string | null };
type Snapshot = { key: string; lessons: ContinueLesson[]; progress: LessonProgress[]; error: boolean };
const descriptions: Record<ContinueReason, { label: string; description: string; action: string }> = {
  resume: { label: 'In progress', description: 'Continue the current lesson from your saved study progress.', action: 'Resume lesson' },
  next: { label: 'Next lesson', description: 'Your last lesson is complete. Continue with the next published lesson.', action: 'Open next lesson' },
  updated: { label: 'Updated lesson', description: 'This lesson has changed since your saved progress. Open its current version.', action: 'Open updated lesson' },
  start: { label: 'Ready to begin', description: 'No synced lesson progress yet. Start with this published lesson.', action: 'Start lesson' },
  review: { label: 'Ready to review', description: 'You have completed all currently published lessons. Revisit your most recent lesson.', action: 'Review lesson' },
};

/** Modules come from the dashboard's active-enrolment query; RLS still authorises every read. */
export default function ContinueLearning({ modules }: { modules: Module[] }) {
  const { user } = useAuth();
  const verified = !!user?.id && !!user.tenantId && user.role === 'student' && user.roles?.includes('student');
  const [refresh, setRefresh] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const moduleIds = [...new Set(modules.map(module => module.id))].sort();
  const key = JSON.stringify([user?.id, user?.tenantId, user?.role, user?.roles, moduleIds, refresh]);
  useEffect(() => {
    let active = true;
    if (!verified) return () => { active = false; };
    void (async () => {
      try {
        const rows = await rowsByIds<ContinueLesson>(moduleIds, ids => () => db.from('unipathway_lessons')
          .select('id,module_id,tenant_id,title,position,status,revision')
          .eq('tenant_id', user.tenantId).eq('status', 'published').in('module_id', ids), () => active);
        const scope = {studentId:user.id,tenantId:user.tenantId,moduleIds};
        // Verify lesson ownership and published revision BEFORE reading progress.
        const authorised = verifyContinueLearningSnapshot(rows, [], scope);
        const progressRows = await rowsByIds<OwnedLearningProgress>(authorised.lessons.map(lesson => lesson.id), ids => () =>
          db.from('unipathway_lesson_progress').select('student_id,lesson_id,revision,position_seconds,completed,updated_at')
            .eq('student_id', user.id).in('lesson_id', ids).order('revision'), () => active, 'lesson_id');
        // A foreign, duplicate, malformed or future-revision progress row
        // invalidates this card rather than producing an incorrect resume link.
        const checked = verifyContinueLearningSnapshot(authorised.lessons, progressRows, scope);
        if (active) setSnapshot({ key, ...checked, error: false });
      } catch {
        if (active) setSnapshot({ key, lessons: [], progress: [], error: true });
      }
    })();
    return () => { active = false; };
  // The key includes the entire account, role, enrolled module scope and retry generation.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const current = snapshot?.key === key ? snapshot : null;
  const target = current && !current.error ? chooseContinueLesson(current.lessons, current.progress) : null;
  const detail = target && descriptions[target.reason];
  const module = target && modules.find(item => item.id === target.lesson.module_id);
  const completed = current ? currentLessonCompletion(current.lessons, current.progress) : 0;

  return <section className="surface-card mb-6 p-5 sm:p-6" aria-labelledby="continue-learning-heading">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 id="continue-learning-heading" className="flex items-center gap-2 text-lg font-semibold"><BookOpen className="size-5 text-primary" aria-hidden="true" />Continue learning</h2>
        <p className="mt-1 text-sm text-muted-foreground">Pick up from your latest synced lesson progress.</p></div>
      {verified && <Link className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4" to="/student/courses">View all courses</Link>}
    </div>
    {!verified ? <p role="alert" className="mt-4 text-sm">An active, verified Student role and assigned centre are required to load your learning progress.</p>
      : !current ? <p role="status" className="mt-4 text-sm text-muted-foreground">Checking your published lessons and saved progress…</p>
      : current.error ? <div className="mt-4 space-y-3"><p role="alert" className="text-sm">Your lessons and saved progress could not be verified. Try again to continue.</p><Button className="min-h-11" variant="outline" onClick={() => setRefresh(value => value + 1)}>Retry learning progress</Button></div>
      : !modules.length ? <p className="mt-4 text-sm text-muted-foreground">No modules are available for your active enrolments.</p>
      : !target ? <div className="mt-4 space-y-3"><h3 className="font-semibold">No published lessons yet</h3><p className="text-sm text-muted-foreground">Open a module to check its classes and materials.</p>
        <ul className="divide-y">{modules.slice(0, 3).map(item => <li key={item.id}><Link className="flex min-h-11 items-center justify-between gap-3 py-3 text-sm font-medium underline underline-offset-4" to={`/student/module?${new URLSearchParams({ module: item.id })}`}><span className="min-w-0 break-words">Open {item.title} module</span><ArrowRight className="size-4 shrink-0" aria-hidden="true" /></Link></li>)}</ul></div>
      : <article className="mt-5 grid gap-5 border-t border-border/60 pt-5 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-success">{detail.label}</p>
          <h3 className="mt-2 break-words text-xl font-semibold">{target.lesson.title}</h3>
          <p className="mt-1 break-words text-sm text-muted-foreground">{module?.title}{module?.code ? ` · ${module.code}` : ''}</p>
          <p className="mt-3 text-sm text-muted-foreground">{detail.description}</p>
          <p className="mt-2 text-xs text-muted-foreground">Verified against your active enrolled modules and this account's saved learning progress. The lesson checks access again when opened.</p>
          {target.saved && <p className="mt-2 text-xs text-muted-foreground">Last synced <time dateTime={target.saved.updated_at}>{new Date(target.saved.updated_at).toLocaleString('en-PK', { timeZone: 'Asia/Karachi', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</time> · Pakistan time</p>}
        </div>
        <div className="flex min-w-0 flex-col items-start gap-2 md:items-end"><Button className="min-h-11" asChild><Link to={continueLessonPath(target.lesson)}>{detail.action}<ArrowRight className="size-4" aria-hidden="true" /></Link></Button>
          <Link className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4" to={`/student/module?${new URLSearchParams({ module: target.lesson.module_id })}`}>Open module overview</Link>
        </div>
        <p className="text-xs text-muted-foreground md:col-span-2">{completed} of {current.lessons.length} current lessons completed across your enrolled modules. <Link className="inline-flex min-h-11 items-center underline underline-offset-4" to="/student/downloads">Manage saved learning and unsynced progress</Link></p>
      </article>}
  </section>;
}
