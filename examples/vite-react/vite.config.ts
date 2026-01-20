import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import jsx from 'acorn-jsx';
import {vite_plugin_fuz_css} from '@fuzdev/fuz_css/vite_plugin_fuz_css.js';

export default defineConfig({
	plugins: [
		// Plugin order doesn't matter for react (fuz_css uses enforce: 'pre')
		react(),
		vite_plugin_fuz_css({
			acorn_plugins: [jsx()],
		}),
	],
});
