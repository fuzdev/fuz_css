import {defineConfig} from 'vite';
import preact from '@preact/preset-vite';
import jsx from 'acorn-jsx';
import {vite_plugin_fuz_css} from '@fuzdev/fuz_css/vite_plugin_fuz_css.js';

export default defineConfig({
	plugins: [
		// Plugin order doesn't matter for preact (fuz_css uses enforce: 'pre')
		preact(),
		vite_plugin_fuz_css({
			acorn_plugins: [jsx()],
		}),
	],
});
