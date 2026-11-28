import {KNOWN_UNIPATHWAY_ROLES} from '@/lib/roleMembership';
import type {UserRole} from '@/types/platform';
/** The production website must never send demo credentials to a live-data
 * project. A separate, explicitly enabled host is the only demo destination. */
export function demoLoginUrl(config:unknown,role:string):string|null{
 if(typeof config!=='string'||!config||!KNOWN_UNIPATHWAY_ROLES.includes(role as UserRole))return null;
 try{
  const url=new URL(config);
  if(url.origin!=='https://demo.unipathway.pk'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)return null;
  const target=new URL('/login',url.origin);target.searchParams.set('role',role);target.searchParams.set('demo','1');return target.href;
 }catch{return null;}
}

export const DEMO_ACCOUNT_EMAIL='demo@unipathway.pk';
const LIVE_PROJECT_REF='sthrhcmjypwuorlbscfw';
export function isDemoAccount(email:unknown):boolean{
 return typeof email==='string'&&email.trim().toLowerCase()===DEMO_ACCOUNT_EMAIL;
}
/** Client-side defence only. The demo identity must never be provisioned in
 * production; server permissions and a separate project enforce isolation. */
export function isolatedDemoDeployment(host:string,url:unknown,ref:unknown):boolean{
 if(host!=='demo.unipathway.pk'||typeof ref!=='string'||!(/^[a-z0-9]{20}$/).test(ref)||ref===LIVE_PROJECT_REF||typeof url!=='string')return false;
 try{const u=new URL(url);return u.origin==='https://'+ref+'.supabase.co'&&u.pathname==='/'&&!u.username&&!u.password&&!u.search&&!u.hash;}catch{return false;}
}
export function demoIdentityAllowed(email:unknown):boolean{
 return typeof window!=='undefined'&&signInBoundary(email,window.location.hostname,import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_UNIPATHWAY_DEMO_PROJECT_REF);
}

/** URL preferences may select an existing role, never grant a membership. */
export function demoRolePreference(value:unknown):UserRole|null{
 return typeof value==='string'&&KNOWN_UNIPATHWAY_ROLES.includes(value as UserRole)?value as UserRole:null;
}
/** Browser defence in depth: no institutional sign-in on a misconfigured
 * demo host, and no shared demonstration identity on the main site. */
export function signInBoundary(email:unknown,host:string,url:unknown,ref:unknown):boolean{
 const demoHost=host==='demo.unipathway.pk';
 if(demoHost)return isolatedDemoDeployment(host,url,ref)&&isDemoAccount(email);
 return !isDemoAccount(email);
}
