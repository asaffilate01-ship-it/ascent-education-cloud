import {workspacePath} from '@/lib/workspaceContext';
import {useEffect,useMemo,useState} from 'react';
import {useNavigate,useLocation} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {useAuth} from '@/contexts/AuthContext';
import {searchNavigation} from '@/lib/searchNavigation';
import {matchesSearch,searchWorkspace,SEARCH_LIMIT} from '@/lib/workspaceSearch';
import {CommandDialog,CommandInput,CommandList,CommandGroup,CommandItem} from '@/components/ui/command';
import {DialogTitle,DialogDescription} from '@/components/ui/dialog';
type Props={open:boolean;onOpenChange:(open:boolean)=>void};
export default function CommandPalette({open,onOpenChange}:Props){
 const {user}=useAuth();
 useEffect(()=>{const handler=(event:KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&event.key==='k'){event.preventDefault();onOpenChange(!open);}};document.addEventListener('keydown',handler);return()=>document.removeEventListener('keydown',handler);},[open,onOpenChange]);
 return open?<WorkspaceSearch key={`${user?.id}:${user?.tenantId}:${user?.role}`} onOpenChange={onOpenChange}/>:null;
}
function WorkspaceSearch({onOpenChange}:Pick<Props,'onOpenChange'>){
 const {user}=useAuth(),navigate=useNavigate(),location=useLocation();
 const [query,setQuery]=useState(''),[term,setTerm]=useState('');
 const canSearch=!!user?.tenantId&&['student','lecturer'].includes(user.role);
 const pages=useMemo(()=>searchNavigation(user?.role).filter(p=>matchesSearch(`${p.label} ${p.section}`,query)),[user?.role,query]);
 useEffect(()=>{const timer=setTimeout(()=>setTerm(query.trim()),250);return()=>clearTimeout(timer);},[query]);
 const records=useQuery({queryKey:['workspace-search',user?.id,user?.tenantId,user?.role,term],enabled:canSearch&&term.length>=2,gcTime:0,staleTime:0,retry:false,
  queryFn:({signal})=>searchWorkspace({id:user!.id,tenantId:user!.tenantId!,role:user!.role},term,signal)});
 const current=term===query.trim(),ready=canSearch&&current&&term.length>=2&&!records.isFetching&&!records.isError;
 const groups=ready&&records.data?Object.entries(records.data):[];
 const searching=canSearch&&query.trim().length>=2&&(!current||records.isFetching);
 const total=groups.reduce((n,[,rows])=>n+rows.length,0);
 const go=(path:string,preserve=true)=>{onOpenChange(false);navigate(preserve?workspacePath(path,location.search):path);};
 return <CommandDialog open onOpenChange={onOpenChange} shouldFilter={false} label="Search your workspace">
  <DialogTitle className="sr-only">Search your workspace</DialogTitle>
  <DialogDescription className="sr-only">Find pages for your current role and titles of your assigned courses, lessons and materials. Use arrow keys to choose and Enter to open.</DialogDescription>
  <CommandInput value={query} maxLength={100} onValueChange={setQuery} aria-label="Search your workspace" placeholder={canSearch?'Search courses, lessons, materials and pages…':'Search your workspace pages…'}/>
  <CommandList>
   {searching&&<p role="status" className="px-4 py-3 text-sm">Searching your learning content…</p>}
   {canSearch&&current&&term.length>=2&&records.isError&&<div role="alert" className="px-4 py-3 text-sm">Learning search could not be verified. <button className="underline" onClick={()=>void records.refetch()}>Retry search</button></div>}
   {!searching&&!pages.length&&!total&&!records.isError&&<p role="status" className="px-4 py-3 text-sm">No matches. Try another title or course code.</p>}
   {canSearch&&query.trim().length<2&&<p className="px-4 py-2 text-sm text-muted-foreground">Type at least two characters to search learning content.</p>}
   {groups.map(([kind,rows])=>rows.length>0&&<CommandGroup key={kind} heading={kind==='courses'?'Your courses':kind==='lessons'?'Your lessons':'Your materials'}>
    {rows.slice(0,SEARCH_LIMIT).map(row=><CommandItem key={row.id} value={`${kind}:${row.id}`} onSelect={()=>go(row.path,false)}><span className="min-w-0 break-words">{row.title}<span className="block text-xs text-muted-foreground">{row.detail}</span></span></CommandItem>)}
    {rows.length>SEARCH_LIMIT&&<p className="px-2 py-2 text-xs text-muted-foreground">Showing the first {SEARCH_LIMIT} matches. Add more words to narrow your search.</p>}
   </CommandGroup>)}
   {pages.length>0&&<CommandGroup heading="Your pages">{pages.map(item=><CommandItem key={item.path} value={item.path} onSelect={()=>go(item.path)}><item.icon className="mr-3 size-4 shrink-0" aria-hidden="true"/><span>{item.label}<span className="block text-xs text-muted-foreground">{item.section}</span></span></CommandItem>)}</CommandGroup>}
  </CommandList>
  <p className="border-t px-4 py-3 text-xs text-muted-foreground">↑ ↓ Choose · Enter Open · Esc Close</p>
 </CommandDialog>;
}
