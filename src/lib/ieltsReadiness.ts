/**
 * Formative learning evidence coverage, NOT an IELTS mark, band,
 * university admission decision, or a certification of exam readiness.
 */
export type ReadinessSubmission={
 unit_week:number;skill:string;teacher_feedback?:string|null;reviewed_at?:string|null;
};
export type ReadinessSpeaking={reviewed_at?:string|null;teacher_feedback?:string|null};
export type ReadinessItem={
 week:number;key:string;label:string;status:'not_started'|'awaiting_tutor'|'reviewed'|'submitted';
 detail:string;
};
export type ReadinessResult={
 items:ReadinessItem[];reviewedCount:number;engagedCount:number;total:number;coveragePercent:number;
 nextAction:ReadinessItem|null;
};
export function buildIeltsEvidenceCoverage(submissions:ReadinessSubmission[],speaking:ReadinessSpeaking[]):ReadinessResult{
 const evidence=(week:number)=>submissions.filter(r=>r.unit_week===week);
 const reviewed=(arr:ReadinessSubmission[])=>arr.some(x=>!!x.teacher_feedback&&!!x.reviewed_at);
 const step=(week:number,key:string,label:string,requiresHuman:boolean):ReadinessItem=>{
   const rows=evidence(week);
   const status:ReadinessItem['status']=rows.length===0?'not_started':
     reviewed(rows)?'reviewed':requiresHuman?'awaiting_tutor':'submitted';
   const details:Record<ReadinessItem['status'],string>={
     not_started:'Begin this practice activity',
     submitted:'Practice recorded. Revisit teacher recommendations as needed',
     awaiting_tutor:'Submitted and waiting for human tutor feedback',
     reviewed:'Tutor feedback available'
   };
   return {week,key,label,status,detail:details[status]};
 };
 const speakingReviewed=speaking.some(x=>!!x.reviewed_at&&!!x.teacher_feedback);
 const items:ReadinessItem[]=[
   step(1,'diagnostic','Initial English diagnostic and goals',false),
   step(2,'listening','Listening practice',false),
   step(3,'reading','Reading practice',false),
   step(4,'task1','Writing Task 1 — tutor feedback',true),
   step(5,'task2','Writing Task 2 — tutor feedback',true),
   {
     week:6,key:'speaking',label:'Speaking — human observation',
     status:speakingReviewed?'reviewed':speaking.length?'awaiting_tutor':'not_started',
     detail:speakingReviewed?'Tutor feedback on audio evidence available':
       speaking.length?'Recording submitted; a tutor must listen to it':
       'Submit consented audio or arrange a live tutor-observed Speaking session'
   },
   step(7,'timed','Timed practice and error review',false),
   step(8,'final','Final self-review and exam booking plan',false)
 ];
 const engagedCount=items.filter(x=>x.status!=='not_started').length;
 const reviewedCount=items.filter(x=>x.status==='reviewed'||x.status==='submitted').length;
 return {
  items,engagedCount,reviewedCount,total:items.length,
  coveragePercent:Math.round(reviewedCount/items.length*100),
  nextAction:items.find(x=>x.status==='not_started'||x.status==='awaiting_tutor')||null
 };
}
