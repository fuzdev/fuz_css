import {defineConfig} from 'vite';
import {sveltekit} from '@sveltejs/kit/vite';
import svelte_docinfo from 'svelte-docinfo/vite.js';
import {vite_plugin_pkg_json} from '@fuzdev/fuz_ui/vite_plugin_pkg_json.js';

import {vite_plugin_fuz_css} from './src/lib/vite_plugin_fuz_css.js';

export default defineConfig({
	plugins: [
		sveltekit(),
		svelte_docinfo(),
		vite_plugin_fuz_css({additional_variables: 'all'}),
		vite_plugin_pkg_json(),
	],
	optimizeDeps: {exclude: ['@fuzdev/blake3_wasm']},
});
