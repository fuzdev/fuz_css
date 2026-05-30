import {defineConfig} from 'vite';
import {sveltekit} from '@sveltejs/kit/vite';
import svelte_docinfo from 'svelte-docinfo/vite.js';

import {vite_plugin_fuz_css} from './src/lib/vite_plugin_fuz_css.js';

export default defineConfig({
	plugins: [vite_plugin_fuz_css({additional_variables: 'all'}), sveltekit(), svelte_docinfo()],
	optimizeDeps: {exclude: ['@fuzdev/blake3_wasm']},
});
