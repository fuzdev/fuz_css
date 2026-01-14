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
			// Include dynamically constructed classes that can't be statically extracted
			// The example uses `bg_${hue}_5` in a .map() which produces these at runtime
			include_classes: ['bg_a_5', 'bg_b_5', 'bg_c_5', 'bg_d_5', 'bg_e_5'],
		}),
	],
});
