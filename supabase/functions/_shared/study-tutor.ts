export function tutorMessages(value:unknown):{role:'user'|'assistant';content:string}[]{
 if(!Array.isArray(value)||!value.length||value.length>20)throw Error('Send up to 20 conversation messages.');
 let size=0;
 const messages=value.map(m=>{
  if(!m||!['user','assistant'].includes(m.role)||typeof m.content!=='string'||!m.content.trim()||m.content.length>(m.role==='assistant'?12000:2000))throw Error('Question is empty or message is too long.');
  size+=m.content.length;return{role:m.role as 'user'|'assistant',content:m.content.trim()};
 });
 if(size>20000||messages[messages.length-1].role!=='user')throw Error('Conversation is too long or missing a question. Start a new chat.');
 return messages;
}
export function tutorEndpoint(value:string){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw Error('Invalid tutor endpoint');return u.href;}
