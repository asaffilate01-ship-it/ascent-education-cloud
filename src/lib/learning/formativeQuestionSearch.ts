import {FORMATIVE_QUESTIONS,type FormativeQuestion} from '@/lib/learning/formativeQuestions';
import {matchesLocalSearch} from '@/lib/localSearch';
export const FORMATIVE_SUBJECTS=[...new Set(FORMATIVE_QUESTIONS.map(q=>q.subject))];
export function filterFormativeQuestions(subject:string,query:string){
 return FORMATIVE_QUESTIONS.filter(q=>(subject==='all'||q.subject===subject)&&matchesLocalSearch([q.id,q.subject,q.scope,q.topic,q.question].join(' '),query));
}
export function formativeFeedback(item:FormativeQuestion,choice:string){
 if(!item.options.includes(choice))return null;
 return {correct:choice===item.answer,answer:item.answer,explanation:item.explanation};
}
