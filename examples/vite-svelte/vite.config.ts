import {defineConfig} from 'vite';
import {svelte} from '@sveltejs/vite-plugin-svelte';
import {vite_plugin_fuz_css} from '@fuzdev/fuz_css/vite_plugin_fuz_css.js';

export default defineConfig({
	plugins: [
		// fuz_css must be listed first for svelte (enforce: 'pre' alone isn't sufficient)
		vite_plugin_fuz_css(),
		svelte(),
	],
});
