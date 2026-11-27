import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {Mail} from 'lucide-react';
import {db} from '@/lib/db';
import {useAuth} from '@/contexts/AuthContext';

type AlertCount = {scope:string; count:number|null; failed:boolean};

export default function CommsBadge(){
 const {user}=useAuth();
 const scope=user?.id ? JSON.stringify([user.id,user.tenantId,user.role]) : '';
 const [result,setResult]=useState<AlertCount>({scope:'',count:null,failed:false});
 useEffect(()=>{
  if(!user?.id)return;
  let alive=true, busy=false;
  const refresh=async()=>{
   if(busy)return;
   busy=true;
   try{
    const r=await db.from('uni_mail_alerts').select('id',{count:'exact',head:true}).eq('user_id',user.id).is('read_at',null);
    if(alive)setResult({scope,count:!r.error&&typeof r.count==='number'?r.count:null,failed:!!r.error||typeof r.count!=='number'});
   }catch{if(alive)setResult({scope,count:null,failed:true});}
   finally{busy=false;}
  };
  void refresh();
  const timer=setInterval(()=>void refresh(),60000);
  const onFocus=()=>void refresh();
  window.addEventListener('focus',onFocus);
  return()=>{alive=false;clearInterval(timer);window.removeEventListener('focus',onFocus);};
 },[scope,user?.id]);
 const count=result.scope===scope?result.count:null;
 const failed=result.scope===scope&&result.failed;
 return <Link to="/communications" aria-label={failed?'Communications, unread count unavailable':`Communications${count?`, ${count} unread alerts`:''}`} className="relative flex min-h-11 min-w-11 items-center justify-center rounded-lg border hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary"><Mail className="size-4" aria-hidden="true"/>{failed?<span aria-hidden="true" className="absolute right-0 top-0 rounded-full bg-muted px-1.5 text-xs">?</span>:count!==null&&count>0&&<span aria-hidden="true" className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{count>99?'99+':count}</span>}</Link>;
}
