import type {FormativeQuestion} from './formativeQuestions';

export const practiceSizes=[5,10,20] as const;
export type PracticeSize=typeof practiceSizes[number];
export type PracticeAnswer={questionId:string;choice:string};
/** Distribute a practice session across topics rather than selecting adjacent variants. */
export function practiceSelection(matches:readonly FormativeQuestion[],size:PracticeSize):FormativeQuestion[]{
 if(!practiceSizes.includes(size))return [];
 const groups=new Map<string,FormativeQuestion[]>(),ids=new Set<string>();
 for(const q of matches){
  if(ids.has(q.id))continue;ids.add(q.id);
  const key=q.subject+':'+q.topic;
  const group=groups.get(key)??[];group.push(q);groups.set(key,group);
 }
 const result:FormativeQuestion[]=[];
 for(let index=0;result.length<size;index++){
  let added=false;
  for(const group of groups.values()){
   if(group[index]){result.push(group[index]);added=true;}
   if(result.length===size)break;
  }
  if(!added)break;
 }
 return result;
}
export function practiceResults(questions:readonly FormativeQuestion[],answers:readonly PracticeAnswer[]){
 const chosen=new Map<string,string>();
 for(const answer of answers){
  if(chosen.has(answer.questionId))continue;
  const question=questions.find(q=>q.id===answer.questionId);
  if(question?.options.includes(answer.choice))chosen.set(answer.questionId,answer.choice);
 }
 const correct=questions.filter(q=>chosen.get(q.id)===q.answer).length;
 const missed=questions.filter(q=>chosen.has(q.id)&&chosen.get(q.id)!==q.answer);
 return {answered:chosen.size,total:questions.length,correct,missed,complete:questions.length>0&&chosen.size===questions.length};
}
