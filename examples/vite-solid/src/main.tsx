import '@fuzdev/fuz_css/style.css';
import '@fuzdev/fuz_css/theme.css';
import 'virtual:fuz.css';

import {render} from 'solid-js/web';
import {App} from './App.tsx';

render(() => <App />, document.getElementById('root')!);
