import {defineConfig} from 'vite';
import solid from 'vite-plugin-solid';
import jsx from 'acorn-jsx';
import {vite_plugin_fuz_css} from '@fuzdev/fuz_css/vite_plugin_fuz_css.js';

export default defineConfig({
	plugins: [
		// fuz_css must be listed first for solid (enforce: 'pre' alone isn't sufficient)
		vite_plugin_fuz_css({
			acorn_plugins: [jsx()],
		}),
		solid(),
	],
});
