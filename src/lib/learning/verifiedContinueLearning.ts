import type {LessonProgress} from '@/lib/structuredLessons';
import type {ContinueLesson} from '@/lib/learning/continueLearning';

export type OwnedLearningProgress=LessonProgress & {student_id:string};
export type VerifiedContinueSnapshot=Readonly<{
 lessons:ContinueLesson[];
 progress:LessonProgress[];
}>;
type Scope=Readonly<{studentId:string;tenantId:string;moduleIds:readonly string[]}>;
const MAX_SNAPSHOT_ROWS=10000;

function record(value:unknown):Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value))
  throw Error('Learning record is unverified');
 return value as Record<string,unknown>;
}
function validId(value:unknown):value is string{
 return typeof value==='string'&&value.trim().length>0&&value.length<=128;
}
function integer(value:unknown,min:number,max=Number.MAX_SAFE_INTEGER):value is number{
 return typeof value==='number'&&Number.isSafeInteger(value)&&value>=min&&value<=max;
}
function validDate(value:unknown):value is string{
 return typeof value==='string'&&value.trim().length>0&&Number.isFinite(Date.parse(value));
}

/**
 * Independent source validation for a learner's Continue Learning card.
 * The caller MUST first use verified centre + student scoped, authenticated
 * RLS queries; this is an additional client-side containment check, not auth.
 * A response with any inconsistent row fails in full, never partially.
 *
 * Older saved revisions are valid evidence for "Updated lesson"; a progress
 * revision newer than the published lesson is not.
 */
export function verifyContinueLearningSnapshot(
 lessonRows:unknown,progressRows:unknown,scope:Scope,
):VerifiedContinueSnapshot{
 if(!validId(scope.studentId)||!validId(scope.tenantId)||
  !Array.isArray(scope.moduleIds)||!Array.isArray(lessonRows)||!Array.isArray(progressRows)||
  lessonRows.length>MAX_SNAPSHOT_ROWS||progressRows.length>MAX_SNAPSHOT_ROWS)
  throw Error('Incomplete or unbounded learning snapshot');

 const modules=new Set<string>();
 for(const moduleId of scope.moduleIds){
  if(!validId(moduleId))throw Error('Unverified active module ID');
  modules.add(moduleId);
 }
 const byId=new Map<string,ContinueLesson>();
 const lessons:ContinueLesson[]=[];
 for(const raw of lessonRows){
  const row=record(raw);
  if(!validId(row.id)||!validId(row.module_id)||!validId(row.tenant_id)||
   !modules.has(row.module_id)||row.tenant_id!==scope.tenantId||
   row.status!=='published'||typeof row.title!=='string'||!row.title.trim()||
   row.title.length>200||!integer(row.position,1)||!integer(row.revision,1)||
   byId.has(row.id))
   throw Error('Published lesson failed enrolment, centre or revision verification');
  const lesson:ContinueLesson={
   id:row.id,module_id:row.module_id,tenant_id:row.tenant_id,
   title:row.title,position:row.position,status:'published',revision:row.revision,
  };
  byId.set(lesson.id,lesson);
  lessons.push(lesson);
 }
 const tuples=new Set<string>();
 const progress:LessonProgress[]=[];
 for(const raw of progressRows){
  const row=record(raw);
  const lesson=validId(row.lesson_id)?byId.get(row.lesson_id):undefined;
  const key=`${row.lesson_id}:${row.revision}`;
  if(row.student_id!==scope.studentId||!lesson||!integer(row.revision,1)||
   row.revision>lesson.revision||!integer(row.position_seconds,0,86400)||
   typeof row.completed!=='boolean'||!validDate(row.updated_at)||
   tuples.has(key))
   throw Error('Lesson progress failed student ownership or revision verification');
  tuples.add(key);
  progress.push({
   lesson_id:lesson.id,revision:row.revision,position_seconds:row.position_seconds,
   completed:row.completed,updated_at:row.updated_at,
  });
 }
 return {lessons,progress};
}
