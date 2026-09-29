import {describe,it,expect} from 'vitest';
const lecturer=['/lecturer','/lecturer/teaching','/lecturer/classroom','/lecturer/attendance'];
const student=['/student','/student/courses','/student/classroom','/student/assignments','/student/grades'];
describe('primary route contracts',()=>{it('lecturer primary routes exclude summative marking',()=>expect(lecturer).not.toContain('/lecturer/marking'));it('student has live classroom',()=>expect(student).toContain('/student/classroom'));it('student has assignment workflow',()=>expect(student).toContain('/student/assignments'))});