/** The production website must never send demo credentials to a live-data
 * project. A separate, explicitly enabled host is the only demo destination. */
export function demoLoginUrl(config:unknown,role:string):string|null{
 if(typeof config!=='string'||!config)return null;
 try{
  const url=new URL(config);
  if(url.origin!=='https://demo.unipathway.pk'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)return null;
  const target=new URL('/login',url.origin);target.searchParams.set('role',role);target.searchParams.set('demo','1');return target.href;
 }catch{return null;}
}
