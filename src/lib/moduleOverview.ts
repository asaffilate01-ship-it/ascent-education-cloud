import {db} from '@/lib/db';
import {pagedRows, rowsByIds} from './pagedRows';
import {learningResources} from './learningResources';
import {latestAttempt, nextLearningTask, type LearningPlan, type LearningTask, type LearningAttempt} from './tuitionLearning';
export type OverviewItem = {id:string;title:string;detail:string;to:string};
export type OverviewPanel = {title:string;summary:string;items:OverviewItem[];to:string;error?:boolean};
export type OverviewModule = {id:string;programme_id:string;title:string;code:string;lecturer_id:string};
type Brief = {id:string;title:string;status:string;due_at:string;submission_cutoff:string};
type Attempt = {id:string;brief_id:string;attempt_no:number;status:string};
export const modulePath=(teacher:boolean,path:string,moduleId:string)=>`/${teacher?'lecturer':'student'}/${path}?${new URLSearchParams({module:moduleId})}`;
export function courseworkState(brief:Brief, attempts:Attempt[], now=Date.now()) {
  const latest=attempts.filter(a=>a.brief_id===brief.id).sort((a,b)=>b.attempt_no-a.attempt_no)[0];
  if(latest&&latest.status!=='resubmission_requested')return 'Submitted — follow assessment status';
  if(Date.parse(brief.submission_cutoff)<now)return 'Submission window closed — contact your programme team';
  if(latest)return 'Resubmission requested — read your feedback';
  return Date.parse(brief.due_at)<now?'Overdue — check submission rules':'Ready for your first submission';
}
export async function loadModuleOverview(student:string,tenant:string,moduleId:string,teacher:boolean,current=()=>true) {
  const modules=await pagedRows<OverviewModule>(()=>db.from('modules').select('id,programme_id,title,code,lecturer_id').eq('id',moduleId).eq('tenant_id',tenant),current);
  const module=modules.find(m=>m.id===moduleId);
  if(!module)return {module:null,panels:[]};
  if(teacher){if(module.lecturer_id!==student)return {module:null,panels:[]};}
  else {
    const enrolments=await pagedRows<{programme_id:string}>(()=>db.from('student_enrolments').select('id,programme_id').eq('student_id',student).eq('tenant_id',tenant).eq('programme_id',module.programme_id).eq('status','active'),current);
    if(!enrolments.some(e=>e.programme_id===module.programme_id))return {module:null,panels:[]};
  }
  const path=(p:string)=>modulePath(teacher,p,moduleId);
  const definitions = [
    {title:'Classes',to:path('classroom'),load:async()=>{
      const r=await db.from('live_class_sessions').select('id,title,starts_at,ends_at,status').eq('tenant_id',tenant).eq('module_id',moduleId).in('status',['scheduled','live']).gte('ends_at',new Date().toISOString()).order('starts_at').order('id').limit(5);
      if(r.error||!Array.isArray(r.data))throw Error('Unavailable');
      return {summary:r.data.length?'Next scheduled classes':'No upcoming classes available',items:r.data.map(s=>({id:s.id,title:s.title,detail:`${new Date(s.starts_at).toLocaleString()} · ${s.status==='live'?'Live':'Scheduled'}`,to:path('classroom')}))};
    }},
    {title:'Coursework',to:path(teacher?'assessments':'assignments'),load:async()=>{
      const briefs=await pagedRows<Brief>(()=>db.from('unipathway_assessment_briefs').select('id,title,status,due_at,submission_cutoff').eq('tenant_id',tenant).eq('module_id',moduleId).eq('status','published'),current);
      const attempts=teacher?[]:await rowsByIds<Attempt>(briefs.map(b=>b.id),ids=>()=>db.from('unipathway_assessment_attempts').select('id,brief_id,attempt_no,status').eq('tenant_id',tenant).eq('student_id',student).in('brief_id',ids),current);
      return {summary:`${briefs.length} published assessments`,items:briefs.sort((a,b)=>{const priority=(brief:Brief)=>{const latest=attempts.filter(x=>x.brief_id===brief.id).sort((x,y)=>y.attempt_no-x.attempt_no)[0];return Date.parse(brief.submission_cutoff)>=Date.now()&&(teacher||!latest||latest.status==='resubmission_requested')?0:1;};return priority(a)-priority(b)||a.due_at.localeCompare(b.due_at);}).slice(0,5).map(b=>({id:b.id,title:b.title,detail:`Due ${new Date(b.due_at).toLocaleString()} · ${teacher?'Published':courseworkState(b,attempts)}`,to:path(teacher?'assessments':'assignments')}))};
    }},
    {title:'Materials and recordings',to:path(teacher?'materials':'library'),load:async()=>{
      if(teacher){
        const materials=await pagedRows<{id:string;title:string;publication_status:string}>(()=>db.from('unipathway_module_materials').select('id,title,publication_status').eq('tenant_id',tenant).eq('module_id',moduleId),current);
        return {summary:`${materials.length} materials · ${materials.filter(m=>m.publication_status==='draft').length} drafts`,items:[...materials.slice(0,4).map(m=>({id:m.id,title:m.title,detail:m.publication_status,to:path('materials')})),{id:'recording-review',title:'Review class recordings',detail:'Check processing and approve release in the lesson archive',to:path('lesson-archive')}]};
      }
      const resources=await learningResources(student,tenant,moduleId,current);
      return {summary:`${resources.length} available resources · ${resources.filter(r=>r.kind==='recording').length} released recordings`,items:resources.slice(0,5).map(r=>({id:r.id,title:r.title,detail:r.kind,to:path('library')+(r.kind==='recording'?'&kind=recording':'')}))};
    }},
    {title:'Individual practice',to:path(teacher?'learning-plans':'learning-plan'),load:async()=>{
      const plans=await pagedRows<LearningPlan>(()=>{let q=db.from('unipathway_learning_plans').select('id,module_id,student_id,goal').eq('module_id',moduleId);if(!teacher)q=q.eq('student_id',student);return q;},current);
      const tasks=await rowsByIds<LearningTask>(plans.map(p=>p.id),ids=>()=>db.from('unipathway_learning_tasks').select('id,plan_id,skill,position,baseline').in('plan_id',ids),current);
      const attempts=await rowsByIds<LearningAttempt>(tasks.map(t=>t.id),ids=>()=>db.from('unipathway_learning_attempts').select('id,task_id,help_requested,submitted_at,outcome').in('task_id',ids),current);
      const pending=attempts.filter(a=>!a.outcome),next=nextLearningTask(tasks,attempts);
      return {summary:teacher?`${plans.length} plans · ${pending.length} awaiting review · ${pending.filter(a=>a.help_requested).length} help requests`:!plans.length?'Your tutor has not created a plan yet':next?`Suggested next activity: ${next.skill}`:'Review your feedback or wait for your tutor’s next activity',items:teacher?[]:plans.map(p=>({id:p.id,title:p.goal,detail:`${tasks.filter(t=>t.plan_id===p.id&&latestAttempt(t.id,attempts)?.outcome==='independent').length} skills demonstrated independently on the latest attempt`,to:path('learning-plan')}))};
    }},
  ];
  if(!teacher)definitions.push({title:'Released results',to:path('grades'),load:async()=>{
    const briefs=await pagedRows<{id:string}>(()=>db.from('unipathway_assessment_briefs').select('id').eq('tenant_id',tenant).eq('module_id',moduleId),current);
    // Results are an RLS-protected table; the unique key is attempt_id, not id.
    let count=0;
    for(let i=0;i<briefs.length;i+=50){for(let offset=0;;offset+=250){
      const r=await db.from('unipathway_assessment_released_results').select('attempt_id').eq('tenant_id',tenant).eq('student_id',student).in('brief_id',briefs.slice(i,i+50).map(b=>b.id)).order('attempt_id').range(offset,offset+249);
      if(!current()||r.error||!Array.isArray(r.data))throw Error('Unavailable');count+=r.data.length;if(r.data.length<250)break;
    }}
    return {summary:`${count} independently released assessment results`,items:[]};
  }});
  const panels:OverviewPanel[]=await Promise.all(definitions.map(async d=>{try{return {title:d.title,to:d.to,...await d.load()};}catch{return {title:d.title,to:d.to,summary:'Could not verify this section. Refresh to try again.',items:[],error:true};}}));
  return {module,panels};
}
