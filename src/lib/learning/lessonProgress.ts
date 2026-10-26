import { db } from '@/lib/db';
import type { LessonProgress } from '@/lib/structuredLessons';
import { mergeLessonProgress } from './offlineLessons';

// Optimistic concurrency preserves work saved on another device while this one was offline.
export async function persistLessonProgress(studentId: string, item: LessonProgress) {
 for (let attempt = 0; attempt < 3; attempt++) {
  const current = await db.from('unipathway_lesson_progress').select('*').eq('student_id', studentId)
   .eq('lesson_id', item.lesson_id).eq('revision', item.revision).maybeSingle();
  if (current.error) throw current.error;
  const merged = mergeLessonProgress(current.data ? [current.data] : [], [item])[0];
  const row = { student_id: studentId, lesson_id: item.lesson_id, revision: item.revision,
   position_seconds: merged.position_seconds, completed: merged.completed, updated_at: merged.updated_at };
  const write = current.data
   ? db.from('unipathway_lesson_progress').update(row).eq('student_id', studentId).eq('lesson_id', item.lesson_id).eq('revision', item.revision).eq('updated_at', current.data.updated_at)
   : db.from('unipathway_lesson_progress').insert(row);
  const result = await write.select('lesson_id');
  if (result.error && result.error.code !== '23505') throw result.error;
  if (!result.error && result.data?.length) return;
 }
 throw Error('Progress changed on another device. Retry sync.');
}
