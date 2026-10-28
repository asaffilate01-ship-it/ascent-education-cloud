import { createRoot } from "react-dom/client";
import OfflineReader from "./pages/learning/OfflineReader";
import '@fontsource/sora/600.css';
import '@fontsource/sora/700.css';
import '@fontsource/sora/800.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import "./index.css";
import { initialiseAppWorker } from './lib/appServiceWorker';

void initialiseAppWorker();
const root = document.getElementById('root');
if (root) {
 const renderer=createRoot(root);
 const RELOAD_KEY='unipathway:app-load-retry';
 let showingOffline=false;
 const showOffline=()=>{showingOffline=true;renderer.render(<OfflineReader/>);};
 // Only show saved learning when the device is genuinely offline. A failed
 // module load while online (e.g. preview/dev server restarting or a new
 // deploy) must retry instead of trapping the visitor on the offline page.
 const loadApp=(attempt=0):void=>{
  import('./App.tsx').then(({default:App})=>{showingOffline=false;sessionStorage.removeItem(RELOAD_KEY);renderer.render(<App/>);}).catch(()=>{
   if(!navigator.onLine){showOffline();return;}
   if(attempt<3){setTimeout(()=>loadApp(attempt+1),1000*(attempt+1));return;}
   if(!sessionStorage.getItem(RELOAD_KEY)){sessionStorage.setItem(RELOAD_KEY,'1');window.location.reload();return;}
   showOffline();
  });
 };
 window.addEventListener('online',()=>{if(showingOffline)loadApp();});
 if(!navigator.onLine)showOffline();
 else loadApp();
}
