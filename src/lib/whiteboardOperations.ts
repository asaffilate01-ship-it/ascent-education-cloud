/** Durable classroom whiteboard protocol.
 * One completed stroke is one append-only DB operation regardless of how many
 * students watch it. Realtime packets mirror DB records; DB/RLS is authoritative.
 */
export const WHITEBOARD_WIDTH=1000;
export const WHITEBOARD_HEIGHT=563;
export type Point=[number,number];
export type StrokeOperation={type:'stroke';points:Point[];color:string;width:number};
export type TextOperation={type:'text';x:number;y:number;text:string;color:string};
export type ClearOperation={type:'clear'};
export type WhiteboardOperation=StrokeOperation|TextOperation|ClearOperation;
export type WhiteboardShape=StrokeOperation|TextOperation;
export type WhiteboardEvent={sequence:number;operation:WhiteboardOperation;created_at:string};
const within=(value:unknown,max:number):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=max;
export function isWhiteboardOperation(value:unknown):value is WhiteboardOperation{
 if(!value||typeof value!=='object')return false;
 const v=value as Record<string,unknown>;
 if(v.type==='clear')return true;
 if(typeof v.color!=='string'||!/^#[\da-fA-F]{6}$/.test(v.color))return false;
 if(v.type==='text'){
  return within(v.x,WHITEBOARD_WIDTH)&&within(v.y,WHITEBOARD_HEIGHT)&&
   typeof v.text==='string'&&v.text.trim().length>0&&v.text.length<=180;
 }
 if(v.type==='stroke'){
  return within(v.width,24)&&v.width>=1&&Array.isArray(v.points)&&
   v.points.length>=2&&v.points.length<=240&&v.points.every((p:unknown)=>Array.isArray(p)&&
    p.length===2&&within(p[0],WHITEBOARD_WIDTH)&&within(p[1],WHITEBOARD_HEIGHT));
 }
 return false;
}
export function applyWhiteboardOperation(shapes:WhiteboardShape[],op:WhiteboardOperation):WhiteboardShape[]{
 return op.type==='clear'?[]:[...shapes,op];
}
export function restoreWhiteboardSnapshot(snapshot:unknown,events:WhiteboardEvent[]):WhiteboardShape[]{
 let shapes:WhiteboardShape[]=Array.isArray(snapshot)?snapshot.filter((x):x is WhiteboardShape=>isWhiteboardOperation(x)&&x.type!=='clear'):[];
 for(const event of [...events].sort((a,b)=>a.sequence-b.sequence)){
  if(!isWhiteboardOperation(event.operation))continue;
  shapes=applyWhiteboardOperation(shapes,event.operation);
 }
 return shapes;
}
function orderedWhiteboardEvents(events:readonly WhiteboardEvent[]):WhiteboardEvent[]{
 return [...events].filter(event=>Number.isSafeInteger(event.sequence)&&event.sequence>0&&
  Number.isFinite(Date.parse(event.created_at))&&isWhiteboardOperation(event.operation))
  .sort((a,b)=>a.sequence-b.sequence);
}
export function replayWhiteboard(events:WhiteboardEvent[],untilMs:number):WhiteboardShape[]{
 const ordered=orderedWhiteboardEvents(events);
 if(!ordered.length||!Number.isFinite(untilMs)||untilMs<0)return [];
 const first=Date.parse(ordered[0].created_at);
 return restoreWhiteboardSnapshot([],ordered.filter(e=>Date.parse(e.created_at)-first<=untilMs));
}
export function whiteboardTimelineMs(events:WhiteboardEvent[]):number{
 const ordered=orderedWhiteboardEvents(events);
 if(ordered.length<2)return 0;
 const first=Date.parse(ordered[0].created_at);
 return Math.max(0,...ordered.map(e=>Date.parse(e.created_at)-first));
}
/** Export only validated classroom strokes and text. Never add meeting links, student IDs or private metadata. */
export function whiteboardSvg(shapes:readonly WhiteboardShape[]):string{
 const escapeText=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
 const parts=shapes.map(shape=>{
  if(!isWhiteboardOperation(shape))throw Error('Cannot export invalid whiteboard content');
  if(shape.type==='text')return `<text x="${shape.x}" y="${shape.y}" fill="${shape.color}" font-family="sans-serif" font-size="27">${escapeText(shape.text)}</text>`;
  return `<polyline points="${shape.points.map(p=>p.join(',')).join(' ')}" stroke="${shape.color}" stroke-width="${shape.width}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
 }).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WHITEBOARD_WIDTH} ${WHITEBOARD_HEIGHT}" width="${WHITEBOARD_WIDTH}" height="${WHITEBOARD_HEIGHT}"><rect width="100%" height="100%" fill="#ffffff"/>${parts}</svg>`;
}
export function toCanvasPoint(clientX:number,clientY:number,rect:Pick<DOMRect,'left'|'top'|'width'|'height'>):Point{
 if(!Number.isFinite(clientX)||!Number.isFinite(clientY)||!Number.isFinite(rect.width)||
  !Number.isFinite(rect.height)||rect.width<=0||rect.height<=0)return [0,0];
 const x=Math.max(0,Math.min(WHITEBOARD_WIDTH,Math.round((clientX-rect.left)/rect.width*WHITEBOARD_WIDTH)));
 const y=Math.max(0,Math.min(WHITEBOARD_HEIGHT,Math.round((clientY-rect.top)/rect.height*WHITEBOARD_HEIGHT)));
 return [x,y];
}
export function sampleStroke(points:Point[],max=240):Point[]{
 if(points.length<=max)return points;
 const step=(points.length-1)/(max-1);
 return Array.from({length:max},(_,i)=>points[Math.round(i*step)]);
}
