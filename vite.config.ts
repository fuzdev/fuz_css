import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import svelte_docinfo from 'svelte-docinfo/vite.js';
import { vite_plugin_pkg_json } from '@fuzdev/fuz_ui/vite_plugin_pkg_json.ts';

import { vite_plugin_fuz_css } from './src/lib/vite_plugin_fuz_css.ts';
import {
	alpha_variants,
	intensity_variants,
	outline_width_variants,
	palette_variants,
	shadow_alpha_variants,
	shadow_semantic_values,
	shadow_size_variants,
	shadow_variant_prefixes
} from './src/lib/variable_data.ts';

// the docs pages construct these class families dynamically from pickers, so
// static extraction can't see them - declared here from the variant lists
// instead of per-page @fuz-classes hint walls
const docs_classes: Array<string> = [
	...alpha_variants.map((v) => `border_color_${v}`),
	...outline_width_variants.map((v) => `outline_width_${v}`),
	...shadow_variant_prefixes.flatMap((p) => shadow_size_variants.map((s) => `${p}${s}`)),
	...shadow_alpha_variants.map((v) => `shadow_alpha_${v}`),
	...shadow_semantic_values.map((v) => `shadow_color_${v}`),
	...palette_variants.flatMap((l) => intensity_variants.map((i) => `shadow_${l}_${i}`)),
	...palette_variants.map((l) => `color_${l}_50`)
];

export default defineConfig(({ mode }) => ({
	plugins: [
		sveltekit(),
		svelte_docinfo(),
		vite_plugin_fuz_css({
			additional_elements: 'all',
			additional_variables: 'all',
			additional_classes: docs_classes
		}),
		vite_plugin_pkg_json()
	],
	// in test mode, use browser conditions so svelte's mount() resolves to the client version
	resolve: mode === 'test' ? { conditions: ['browser'] } : undefined,
	optimizeDeps: { exclude: ['@fuzdev/blake3_wasm'] }
}));
