import '@fuzdev/fuz_css/style.css';
import '@fuzdev/fuz_css/theme.css';
import 'virtual:fuz.css';

import {createRoot} from 'react-dom/client';
import {App} from './App.tsx';

createRoot(document.getElementById('root')!).render(<App />);
