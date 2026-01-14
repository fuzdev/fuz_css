import {defineConfig} from 'vite';
import {svelte} from '@sveltejs/vite-plugin-svelte';
import {vite_plugin_fuz_css} from '@fuzdev/fuz_css/vite_plugin_fuz_css.js';

export default defineConfig({
	plugins: [
		// fuz_css must be listed first for svelte (enforce: 'pre' alone isn't sufficient)
		vite_plugin_fuz_css({
			// Include dynamically constructed classes that can't be statically extracted
			// The example uses `bg_${hue}_5` in an {#each} which produces these at runtime
			include_classes: ['bg_a_5', 'bg_b_5', 'bg_c_5', 'bg_d_5', 'bg_e_5'],
		}),
		svelte(),
	],
});
