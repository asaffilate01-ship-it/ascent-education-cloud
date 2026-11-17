import type { Lesson, LessonProgress } from '@/lib/structuredLessons';
import {parseZonedAcademicTimestamp} from '@/lib/academicTime';

export type ContinueLesson = Pick<Lesson, 'id' | 'module_id' | 'tenant_id' | 'title' | 'position' | 'status' | 'revision'>;
export type ContinueReason = 'resume' | 'next' | 'updated' | 'start' | 'review';
export type ContinueTarget = { lesson: ContinueLesson; saved?: LessonProgress; reason: ContinueReason };

/** The same current-revision completion rule used by the lesson workspace. */
export function chooseContinueLesson(lessons: ContinueLesson[], progress: LessonProgress[]): ContinueTarget | null {
  const published = lessons.filter(lesson => lesson.status === 'published');
  const byId = new Map(published.map(lesson => [lesson.id, lesson]));
  // PostgreSQL timestamps may be returned as UTC or as equivalent numeric
  // offsets. Sorting their strings can resume an older lesson. Fail closed on
  // any unverified progress instant and compare milliseconds instead.
  const instants = new Map<LessonProgress, number>();
  for (const item of progress) {
    const instant = parseZonedAcademicTimestamp(item.updated_at);
    if (instant === null) return null;
    instants.set(item, instant);
  }
  const current = progress.filter(item => byId.get(item.lesson_id)?.revision === item.revision)
    .sort((a, b) => instants.get(b)! - instants.get(a)! || a.lesson_id.localeCompare(b.lesson_id));
  const completed = new Set(current.filter(item => item.completed).map(item => item.lesson_id));
  const pending = published.filter(lesson => !completed.has(lesson.id))
    .sort((a, b) => a.module_id.localeCompare(b.module_id) || a.position - b.position || a.id.localeCompare(b.id));
  const recent = current.find(item => !item.completed && !completed.has(item.lesson_id));
  if (recent) return { lesson: byId.get(recent.lesson_id)!, saved: recent, reason: 'resume' };

  const lastStudied = current[0] && byId.get(current[0].lesson_id);
  const next = pending.find(lesson => lesson.module_id === lastStudied?.module_id) || pending[0];
  if (next) return {
    lesson: next,
    reason: progress.some(item => item.lesson_id === next.id && item.revision !== next.revision)
      ? 'updated' : lastStudied ? 'next' : 'start',
  };
  return lastStudied ? { lesson: lastStudied, saved: current[0], reason: 'review' } : null;
}

export function currentLessonCompletion(lessons: ContinueLesson[], progress: LessonProgress[]) {
  return lessons.filter(lesson => lesson.status === 'published' && progress.some(item =>
    item.lesson_id === lesson.id && item.revision === lesson.revision && item.completed)).length;
}

export function continueLessonPath(lesson: ContinueLesson) {
  return `/student/lessons?${new URLSearchParams({ module: lesson.module_id, lesson: lesson.id })}`;
}
