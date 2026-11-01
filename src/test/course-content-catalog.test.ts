import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {
 COURSE_BOARDS,catalogueBoardFor,eligibleCourseModules,moduleMaterialCoverage,courseContentMatches,
 type ProgrammeRow,type ModuleRow,type MaterialRow
} from '@/lib/learning/courseContentCatalog';
const programme=(id:string,tenant:string,body:string):ProgrammeRow=>({
 id,tenant_id:tenant,title:'Accounting and business',level:'Level 4',awarding_body:body,status:'active'
});
const mod=(id:string,programme_id:string,tenant_id='a',lecturer_id:string|null='teacher'):ModuleRow=>({
 id,programme_id,tenant_id,title:'Accounting fundamentals',lecturer_id
});
describe('UniPathway board-organised course content',()=>{
 it('covers requested education bodies without asserting centre accreditation',()=>{
  for(const id of ['othm','qualifi','athe','iab','pearson-btec','pearson-edexcel',
   'cambridge','fbise','bise-rawalpindi','bise-lahore','bise-other','aku-eb','navttc']){
   const item=COURSE_BOARDS.find(x=>x.id===id);
   expect(item,id).toBeDefined();
   expect(item!.planningNote.length).toBeGreaterThan(18);
  }
  expect(new Set(COURSE_BOARDS.map(x=>x.id)).size).toBe(COURSE_BOARDS.length);
 });
 it('maps actual programme codes without inferring unsupported board accreditation',()=>{
  expect(catalogueBoardFor(programme('x','a','OTHM'))?.label).toBe('OTHM');
  expect(catalogueBoardFor(programme('x','a','QUALIFI'))?.label).toBe('Qualifi');
  expect(catalogueBoardFor(programme('x','a','IAB'))?.label).toBe('IAB');
  expect(catalogueBoardFor(programme('x','a','UNKNOWN'))).toBeUndefined();
 });
 it('requires centre-matching programmes and lecturer allocations',()=>{
  const ps=[programme('p1','a','OTHM'),programme('p2','b','QUALIFI')];
  const modules=[mod('own','p1'),mod('other-staff','p1','a','other'),mod('other-centre','p2','b','teacher'),mod('unmapped','p404')];
  expect(eligibleCourseModules(ps,modules,'a','teacher','lecturer').map(x=>x.id)).toEqual(['own']);
  expect(eligibleCourseModules(ps,modules,'a','director','centre_director').map(x=>x.id)).toEqual(['own','other-staff']);
  expect(eligibleCourseModules([],modules,'a','director','centre_director')).toEqual([]);
 });
 it('never counts materials outside the authorised centre or selected modules',()=>{
  const allowed=[mod('one','p1'),mod('two','p1')];
  const rows:MaterialRow[]=[
   {id:'1',tenant_id:'a',module_id:'one',publication_status:'published'},
   {id:'2',tenant_id:'a',module_id:'two',publication_status:'draft'},
   {id:'3',tenant_id:'b',module_id:'one',publication_status:'published'},
   {id:'4',tenant_id:'a',module_id:'secret',publication_status:'published'},
  ];
  expect(moduleMaterialCoverage(allowed,rows,'a')).toEqual({modules:2,drafts:1,published:1});
 });
 it('matches a board or subject using complete order-independent search words',()=>{
  expect(courseContentMatches('Pearson Edexcel International GCSE Mathematics','Maths')).toBe(false);
  expect(courseContentMatches('Pearson Edexcel International GCSE Mathematics',' gcse pearson ')).toBe(true);
  expect(courseContentMatches('OTHM Level 4 Business','Cambridge')).toBe(false);
 });
 it('exposes only roles with teaching/catalogue authority at the route boundary',()=>{
  const app=readFileSync('src/App.tsx','utf8');
  for(const [route,guard] of [
   ['/lecturer/course-content','LecturerR'],
   ['/director/course-content','Director'],
   ['/programme/course-content','Programme'],
   ['/landlord/course-content','Landlord']
  ]){
   expect(app).toContain(`<Route path="${route}" element={<${guard}><CourseContentHub /></${guard}>} />`);
  }
 });
});
