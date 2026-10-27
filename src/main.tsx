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
 if(!navigator.onLine)renderer.render(<OfflineReader/>);
 else import('./App.tsx').then(({default:App})=>renderer.render(<App/>)).catch(()=>renderer.render(<OfflineReader/>));
}
