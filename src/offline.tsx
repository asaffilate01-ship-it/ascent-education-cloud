import {createRoot} from 'react-dom/client';
import OfflineReader from './pages/learning/OfflineReader';
import '@fontsource/sora/600.css';
import '@fontsource/sora/700.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/600.css';
import './index.css';
const root=document.getElementById('root');if(root)createRoot(root).render(<OfflineReader/>);
