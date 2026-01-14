import {defineConfig} from 'vite';
import solid from 'vite-plugin-solid';
import jsx from 'acorn-jsx';
import {vite_plugin_fuz_css} from '@fuzdev/fuz_css/vite_plugin_fuz_css.js';

export default defineConfig({
	plugins: [
		// fuz_css must be listed first for solid (enforce: 'pre' alone isn't sufficient)
		vite_plugin_fuz_css({
			acorn_plugins: [jsx()],
			// Include dynamically constructed classes that can't be statically extracted
			// The example uses `bg_${hue}_5` in a <For> which produces these at runtime
			include_classes: ['bg_a_5', 'bg_b_5', 'bg_c_5', 'bg_d_5', 'bg_e_5'],
		}),
		solid(),
	],
});
