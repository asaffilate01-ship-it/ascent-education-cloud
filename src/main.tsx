import { createRoot } from "react-dom/client";
import { demoDeploymentBlocked } from "./lib/demoAccess";
import '@fontsource/sora/600.css';
import '@fontsource/sora/700.css';
import '@fontsource/sora/800.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import "./index.css";
import { initialiseAppWorker } from './lib/appServiceWorker';

const root = document.getElementById('root');
if (root) {
 const renderer=createRoot(root);
 const demoHost=window.location.hostname==='demo.unipathway.pk';
 if(demoDeploymentBlocked(window.location.hostname,import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_UNIPATHWAY_DEMO_PROJECT_REF)){
  document.title='UniPathway | Demo unavailable';
  const robots=document.createElement('meta');robots.name='robots';robots.content='noindex, nofollow';document.head.appendChild(robots);
  renderer.render(<main className="min-h-dvh grid place-items-center bg-background p-5"><section className="w-full max-w-md space-y-4 rounded-xl border bg-card p-6"><img src="/brand/unipathway-mark.svg" alt="UniPathway" className="size-12"/><h1 className="text-2xl font-bold">Demo unavailable</h1><p role="alert" className="text-sm text-muted-foreground">The isolated demonstration environment has not been verified. No account or dashboard requests have been started.</p><a href="https://unipathway.pk/demo" className="inline-flex min-h-11 items-center underline">Back to UniPathway</a></section></main>);
 }else{
 void initialiseAppWorker();
 const RELOAD_KEY='unipathway:app-load-retry';
 let showingOffline=false;
 const showOffline=()=>{
  showingOffline=true;
  if(demoHost){renderer.render(<main className="min-h-dvh grid place-items-center p-5"><section className="max-w-md space-y-3"><h1 className="text-xl font-bold">Demo connection unavailable</h1><p>The demonstration requires an online connection. Reconnect and reload to continue.</p></section></main>);return;}
  void import('./pages/learning/OfflineReader').then(({default:OfflineReader})=>{if(showingOffline)renderer.render(<OfflineReader/>);});
 };
 // Only show saved learning when the device is genuinely offline. A failed
 // module load while online (e.g. preview/dev server restarting or a new
 // deploy) must retry instead of trapping the visitor on the offline page.
 const loadApp=(attempt=0):void=>{
  import('./App.tsx').then(({default:App})=>{showingOffline=false;sessionStorage.removeItem(RELOAD_KEY);renderer.render(<App/>);}).catch((error)=>{
   if(import.meta.env.DEV)console.error('UniPathway app module load failed:',error);
   if(!navigator.onLine){showOffline();return;}
   if(attempt<3){setTimeout(()=>loadApp(attempt+1),1000*(attempt+1));return;}
   if(!sessionStorage.getItem(RELOAD_KEY)){sessionStorage.setItem(RELOAD_KEY,'1');window.location.reload();return;}
   showOffline();
  });
 };
 window.addEventListener('online',()=>{if(showingOffline)loadApp();});
 // A loaded first-party app entry proves the origin can serve modules even when
 // navigator.onLine is a false negative (restricted networks, CI or captive portals).
 // Attempt the app first; show the saved-learning reader only if loading fails.
 loadApp();
 }
}
