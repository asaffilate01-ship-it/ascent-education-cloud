import {accountKey,isLearningAccount,PACK_TTL,type LearningAccount} from './offlineLessons';
export const RECORDING_PROGRESS_KEY='unipathway-recording-progress';
type Bookmark={id:string;seconds:number;savedAt:number};
const LIMIT=100;
function read(account:LearningAccount):Bookmark[]{
 if(!isLearningAccount(account))throw Error('Your learning account changed.');
 const raw=JSON.parse(localStorage.getItem(RECORDING_PROGRESS_KEY)||'null');
 if(raw?.owner!==accountKey(account)||!Array.isArray(raw.items))return [];
 const now=Date.now();
 return raw.items.filter((x:Bookmark)=>typeof x.id==='string'&&Number.isFinite(x.seconds)&&x.seconds>=0&&x.seconds<=86400&&Number.isFinite(x.savedAt)&&x.savedAt<=now&&now-x.savedAt<PACK_TTL).slice(0,LIMIT);
}
export function recordingPosition(account:LearningAccount,id:string){
 try{return read(account).find(x=>x.id===id)?.seconds||0;}catch{return 0;}
}
export function saveRecordingPosition(account:LearningAccount,id:string,seconds:number){
 if(!id||!Number.isFinite(seconds)||seconds<0||seconds>86400)throw Error('Invalid recording position.');
 let items:Bookmark[];
 try{items=read(account);}catch{if(!isLearningAccount(account))throw Error('Your learning account changed.');items=[];}
 items=[{id,seconds,savedAt:Date.now()},...items.filter(x=>x.id!==id)].slice(0,LIMIT);
 localStorage.setItem(RECORDING_PROGRESS_KEY,JSON.stringify({owner:accountKey(account),items}));
}
