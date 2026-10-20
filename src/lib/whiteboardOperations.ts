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
export function replayWhiteboard(events:WhiteboardEvent[],untilMs:number):WhiteboardShape[]{
 if(!events.length)return [];
 const first=new Date(events[0].created_at).getTime();
 return restoreWhiteboardSnapshot([],events.filter(e=>new Date(e.created_at).getTime()-first<=untilMs));
}
export function whiteboardTimelineMs(events:WhiteboardEvent[]):number{
 if(events.length<2)return 0;
 return Math.max(0,new Date(events[events.length-1].created_at).getTime()-new Date(events[0].created_at).getTime());
}
export function toCanvasPoint(clientX:number,clientY:number,rect:Pick<DOMRect,'left'|'top'|'width'|'height'>):Point{
 const x=Math.max(0,Math.min(WHITEBOARD_WIDTH,Math.round((clientX-rect.left)/rect.width*WHITEBOARD_WIDTH)));
 const y=Math.max(0,Math.min(WHITEBOARD_HEIGHT,Math.round((clientY-rect.top)/rect.height*WHITEBOARD_HEIGHT)));
 return [x,y];
}
export function sampleStroke(points:Point[],max=240):Point[]{
 if(points.length<=max)return points;
 const step=(points.length-1)/(max-1);
 return Array.from({length:max},(_,i)=>points[Math.round(i*step)]);
}
