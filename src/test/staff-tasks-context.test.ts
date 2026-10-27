import {expect,it} from 'vitest';
import {taskOverdue,sortTasks,pakistanDay,type StaffTask} from '@/lib/staffTasks';
import {workspacePath} from '@/lib/workspaceContext';
it('uses Pakistan midnight for due tasks and excludes closed tasks',()=>{
 expect(pakistanDay(new Date('2026-10-26T20:00:00Z'))).toBe('2026-10-27');
 expect(taskOverdue({due_on:'2026-10-26',status:'blocked'},'2026-10-27')).toBe(true);
 expect(taskOverdue({due_on:'2026-10-26',status:'done'},'2026-10-27')).toBe(false);
});
it('puts overdue work before future high-priority work',()=>{
 const a={id:'a',due_on:'2026-10-25',status:'open',priority:'normal'} as StaffTask;
 const b={id:'b',due_on:'2026-10-28',status:'open',priority:'high'} as StaffTask;
 expect(sortTasks([b,a],'2026-10-26')[0].id).toBe('a');
});
it('preserves module identity only on supported tools',()=>{
 expect(workspacePath('/student/assignments','?module=course-a&student=other')).toBe('/student/assignments?module=course-a');
 expect(workspacePath('/student/courses','?module=course-a')).toBe('/student/courses');
 expect(workspacePath('/director/finance','?module=course-a')).toBe('/director/finance');
});

it('preserves the selected module when opening student material and recording pages',()=>{
 expect(workspacePath('/student/materials','?module=course-a&material=old')).toBe('/student/materials?module=course-a');
 expect(workspacePath('/student/lesson-archive','?module=course-a')).toBe('/student/lesson-archive?module=course-a');
});
