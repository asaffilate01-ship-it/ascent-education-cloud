import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,Pause,Play,School,Video} from 'lucide-react';
import {Button} from '@/components/ui/button';
import heroImage from '@/assets/promo-hero-1200.webp';
import heroImageSmall from '@/assets/promo-hero-640.webp';

type Connection=EventTarget & {saveData?:boolean;effectiveType?:string};
export default function LearningHero(){
 const video=useRef<HTMLVideoElement>(null);
 const [allowed,setAllowed]=useState(false),[paused,setPaused]=useState(false),[ready,setReady]=useState(false),[failed,setFailed]=useState(false);
 useEffect(()=>{
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop=window.matchMedia('(min-width: 1024px)');
  const connection=(navigator as Navigator & {connection?:Connection}).connection;
  const update=()=>setAllowed(desktop.matches&&!reduced.matches&&!connection?.saveData&&!['slow-2g','2g'].includes(connection?.effectiveType||'')&&document.visibilityState!=='hidden');
  update();desktop.addEventListener('change',update);reduced.addEventListener('change',update);connection?.addEventListener('change',update);document.addEventListener('visibilitychange',update);
  return()=>{desktop.removeEventListener('change',update);reduced.removeEventListener('change',update);connection?.removeEventListener('change',update);document.removeEventListener('visibilitychange',update);};
 },[]);
 useEffect(()=>{
  const element=video.current;
  if(!element)return;
  if(paused||!allowed){element.pause();return;}
  let active=true;
  const attempt=element.play();
  attempt?.catch(()=>{if(active)setFailed(true);});
  return()=>{active=false;element.pause();};
 },[allowed,paused]);
 return <section aria-labelledby="home-hero-title" className="relative isolate overflow-hidden rounded-b-[2rem] bg-[#102e2a] text-white sm:rounded-b-[3rem]">
  <div className="relative lg:absolute lg:inset-0 lg:-z-20" aria-hidden="true">
   <img src={heroImage} srcSet={`${heroImageSmall} 640w, ${heroImage} 1200w`} sizes="100vw" width={1200} height={756} alt="" fetchPriority="high" className="block h-auto w-full lg:h-full lg:object-cover lg:object-[62%_center]" />
   {allowed&&!failed&&<video ref={video} muted loop playsInline preload="none" poster={heroImage} aria-hidden="true" tabIndex={-1} onPlaying={()=>setReady(true)} onError={()=>{setFailed(true);setReady(false);}} className={`absolute inset-0 h-full w-full object-cover object-[62%_center] transition-opacity duration-700 ${ready?'opacity-100':'opacity-0'}`}>
    <source src="/media/unipathway-learning-hero.mp4" type="video/mp4" />
   </video>}
  </div>
  <div aria-hidden="true" className="absolute inset-0 -z-10 hidden lg:block bg-[linear-gradient(90deg,rgba(6,28,25,0.94)_0%,rgba(6,28,25,0.83)_35%,rgba(6,28,25,0.22)_100%)]" />
  <div aria-hidden="true" className="absolute inset-0 -z-10 hidden lg:block bg-gradient-to-t from-[#061c19]/80 via-transparent to-transparent" />
  <div className="mx-auto max-w-7xl px-5 pb-7 pt-8 sm:px-8 sm:pt-10 lg:pt-24">
   <div className="max-w-2xl pb-8 sm:pb-10 lg:pb-24">
    <p className="inline-flex rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white">Your next chapter starts in Pakistan</p>
    <h1 id="home-hero-title" className="mt-6 text-[clamp(2.6rem,5.3vw,4.5rem)] font-extrabold leading-[1.08] tracking-tight">Learn online.<br/>Learn in class.<br/><span className="text-[#e9ca7a]">Move forward.</span></h1>
    <p className="mt-6 max-w-lg text-base leading-relaxed text-white/90 sm:text-lg">Build your skills, prepare for exams or take your next academic step. Online across Pakistan. In class at our Jhelum centre.</p>
    <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button size="lg" className="h-12 bg-[#e9ca7a] px-6 text-[#102e2a] hover:bg-[#f3dca0]" asChild><a href="#study">Find your course <ArrowRight/></a></Button><Button variant="outline" size="lg" className="h-12 border-white/50 bg-transparent text-white hover:bg-white/10 hover:text-white" asChild><Link to="/apply">Plan your application <ArrowRight/></Link></Button></div>
    <a href="#how-it-works" className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-white underline underline-offset-4">See how learning works</a>
   </div>
   <div className="flex flex-col justify-between gap-4 border-t border-white/25 pt-5 text-sm sm:flex-row sm:items-end">
    <div className="flex flex-wrap gap-x-6 gap-y-3 font-semibold"><span className="flex items-center gap-2"><Video className="size-4 text-[#e9ca7a]"/>Online across Pakistan</span><span className="flex items-center gap-2"><School className="size-4 text-[#e9ca7a]"/>In class in Jhelum</span></div>
    <div className="flex flex-wrap items-center gap-3"><p className="text-xs text-white/75">Illustrative learning scenes</p>{allowed&&!failed&&<button type="button" onClick={()=>setPaused(value=>!value)} aria-label={paused?'Play background animation':'Pause background animation'} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/40 px-4 text-xs font-semibold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">{paused?<Play className="size-3"/>:<Pause className="size-3"/>}{paused?'Play':'Pause'}</button>}</div>
   </div>
  </div>
 </section>;
}
