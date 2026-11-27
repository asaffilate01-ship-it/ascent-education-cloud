import type {FormativeQuestion} from './formativeQuestions';
import {FORMATIVE_SUBJECTS} from './formativeQuestionSearch';

export const draftProviders=['OpenAI','Claude','Gemini','Qwen','Other / human-authored'] as const;
export const MAX_DRAFT_BATCH=20;
export const MAX_DRAFT_INPUT=50000;
export type ProposedQuestion=Pick<FormativeQuestion,'subject'|'scope'|'topic'|'question'|'options'|'answer'|'explanation'>;
export type DraftReview={items:ProposedQuestion[];issues:{row:number;message:string}[]};
const keys=['subject','scope','topic','question','options','answer','explanation'] as const;
const norm=(v:string)=>v.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
const bounded=(v:unknown,max:number):v is string=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function reviewFormativeDrafts(raw:string,existing:readonly FormativeQuestion[]):DraftReview{
 const issues:DraftReview['issues']=[];
 const items:ProposedQuestion[]=[];
 if(raw.length>MAX_DRAFT_INPUT)return {items,issues:[{row:0,message:'Draft input exceeds the size limit.'}]};
 let parsed:unknown;
 try{parsed=JSON.parse(raw);}catch{return {items,issues:[{row:0,message:'Paste a valid JSON array, not markdown or a prose answer.'}]};}
 if(!Array.isArray(parsed)||parsed.length<1||parsed.length>MAX_DRAFT_BATCH)return {items,issues:[{row:0,message:'Provide 1–20 proposed questions in a JSON array.'}]};
 const seen=new Set(existing.map(q=>norm(q.question)));
 for(const [i,value] of parsed.entries()){
  const fail=(message:string)=>issues.push({row:i+1,message});
  if(!object(value)||Object.keys(value).length!==keys.length||keys.some(key=>!Object.prototype.hasOwnProperty.call(value,key))){fail('Expected exactly the seven question fields. No IDs, approval status, instructions or tool calls are accepted.');continue;}
  const {subject,scope,topic,question,options,answer,explanation}=value;
  if(!bounded(subject,100)||!FORMATIVE_SUBJECTS.includes(subject)||!bounded(scope,160)||!bounded(topic,100)||!bounded(question,500)||!bounded(answer,200)||!bounded(explanation,1500)||explanation.trim().length<13){fail('Use an existing subject and bounded non-empty question, level, topic, answer and worked explanation.');continue;}
  if(!Array.isArray(options)||options.length!==4||!options.every(o=>bounded(o,200))||new Set(options.map(norm)).size!==4||options.filter(o=>o===answer).length!==1){fail('Four distinct options and exactly one matching answer are required.');continue;}
  const fingerprint=norm(question);
  if(seen.has(fingerprint)){fail('Question duplicates an existing or earlier accepted draft.');continue;}
  seen.add(fingerprint);
  items.push({subject,scope:scope.trim(),topic:topic.trim(),question:question.trim(),options:options.map(o=>o.trim()),answer:answer.trim(),explanation:explanation.trim()});
 }
 return {items,issues};
}
export function formativeDraftPrompt(subject:string){
 const selected=FORMATIVE_SUBJECTS.includes(subject)?subject:'one of these subject areas: '+FORMATIVE_SUBJECTS.join(', ');
 return 'Propose original multiple-choice formative practice drafts for '+selected+'. Return only a JSON array of at most 20 objects, with exactly subject, scope, topic, question, options, answer, explanation. options must be an array of four distinct strings; answer must exactly match one option. Provide a worked explanation. Do not copy exam papers, use real learner data, claim official board approval or include tools, URLs, IDs or publication instructions. Use UK English where appropriate. Subject must match one of the listed library subjects. Every item will require independent academic review.';
}
