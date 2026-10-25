export const pakistanClassTime = (value: string) => new Intl.DateTimeFormat('en-PK', {timeZone:'Asia/Karachi',weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}).format(new Date(value));
export function classJoinState(session: {starts_at:string;ends_at:string;status:string}, now:number){
 const start=Date.parse(session.starts_at),end=Date.parse(session.ends_at);
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return 'unavailable';
 if(['cancelled','ended','completed'].includes(session.status)||now>end+30*60_000)return 'ended';
 return now>=start-20*60_000?'open':'scheduled';
}
