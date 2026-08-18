<script lang="ts">
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import { tome_get_by_slug } from '@fuzdev/fuz_ui/tome.ts';
	import ColorSchemeInput from '@fuzdev/fuz_ui/ColorSchemeInput.svelte';
	import TomeLink from '@fuzdev/fuz_ui/TomeLink.svelte';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';
	import ThemeInput from '@fuzdev/fuz_ui/ThemeInput.svelte';
	import MdnLink from '@fuzdev/fuz_ui/MdnLink.svelte';
	import ModuleLink from '@fuzdev/fuz_ui/ModuleLink.svelte';
	import Code from '@fuzdev/fuz_code/Code.svelte';
	import { theme_state_context } from '@fuzdev/fuz_ui/theme_state.svelte.ts';

	import { default_themes, contrast_modifiers } from '$lib/themes.ts';
	import { ember_theme } from '$lib/themes/ember.ts';
	import { parchment_theme } from '$lib/themes/parchment.ts';
	import { concrete_theme } from '$lib/themes/concrete.ts';
	import { phosphor_theme } from '$lib/themes/phosphor.ts';
	import { neon_theme } from '$lib/themes/neon.ts';
	import { compose_themes, type Theme } from '$lib/theme.ts';
	import UnfinishedImplementationWarning from '$routes/docs/UnfinishedImplementationWarning.svelte';
	import ThemeEditor from '$routes/ThemeEditor.svelte';
	import {
		discard_confirm_message,
		ThemeEditorState,
		type ThemeEditorSnapshotData
	} from '$routes/theme_editor_state.svelte.ts';
	import { UNSAVED_THEME_NAME } from '$routes/theme_draft.ts';
	import type { Snapshot } from '@sveltejs/kit';

	const LIBRARY_ITEM_NAME = 'themes';

	const tome = tome_get_by_slug(LIBRARY_ITEM_NAME);

	const get_theme_state = theme_state_context.get();
	const theme_state = get_theme_state();

	// one gallery: the registry and the shipped exemplars are a single list to
	// users - registry membership is policy for consumer pickers, not UX
	const themes = [
		...default_themes,
		ember_theme,
		parchment_theme,
		concrete_theme,
		phosphor_theme,
		neon_theme
	];

	const editor = new ThemeEditorState(themes);

	// the picked base theme, tracked apart from the applied theme so the picker
	// highlight survives contrast composition (compositions rename themselves);
	// a persisted unsaved draft isn't a base, so fall back to the editor's
	let selected_base: Theme = $state.raw(
		theme_state.theme.name === UNSAVED_THEME_NAME ? editor.base_theme : theme_state.theme
	);
	let contrast_modifier: Theme | null = $state.raw(null);

	// the in-progress theme appears in the picker as soon as a knob moves
	const picker_themes: Array<Theme> = $derived([
		...themes,
		...(editor.dirty ? [editor.draft] : [])
	]);

	// the single source for what the page applies: the dirty draft (or the
	// picked base) composed with the active contrast modifier - one derived
	// value instead of two writers racing for theme_state.theme
	const applied_theme: Theme = $derived.by(() => {
		const base = editor.dirty ? editor.draft : selected_base;
		if (!contrast_modifier) return base;
		const composed = compose_themes(base, contrast_modifier);
		// compose_themes renames ("unsaved (high contrast)"); keep the draft's
		// stable name so the picker keys it and +layout.svelte still skips
		// persisting the composition
		return editor.dirty ? { ...composed, name: UNSAVED_THEME_NAME } : composed;
	});

	// live scope is global with no pin: the applied theme writes to `:root`
	// through the normal ThemeRoot pipeline, so the whole page rethemes
	// including the editor
	$effect(() => {
		theme_state.theme = applied_theme;
	});

	// passed as ThemeInput's `select` (not `onselect`, which collides with the
	// DOM handler type in its menu-attribute props): loads the picked theme
	// into the editor, with the same dirty-draft guard as the editor's "based
	// on" select; the effect above applies it composed with the contrast
	const select_theme = (theme: Theme): void => {
		if (theme.name === UNSAVED_THEME_NAME) return; // already applied while dirty
		if (
			editor.dirty &&
			// eslint-disable-next-line no-alert -- deliberate guard against silently discarding edits
			!confirm(discard_confirm_message(editor, theme.name))
		) {
			return;
		}
		editor.load_theme(theme);
		selected_base = theme;
	};

	const select_contrast = (name: string): void => {
		contrast_modifier = contrast_modifiers.find((m) => m.name === name) ?? null;
	};

	// tracks a theme the editor's "based on" select loaded as the new base
	const on_editor_load_theme = (theme: Theme): void => {
		selected_base = theme;
	};

	// persist the in-progress theme across navigation (history-entry-scoped)
	export const snapshot: Snapshot<ThemeEditorSnapshotData> = {
		capture: () => editor.to_snapshot(),
		restore: (data) => {
			editor.restore_snapshot(data);
			// re-sync the picker highlight with the restored base; the applied
			// theme follows through the derived effect
			selected_base = editor.base_theme;
		}
	};
</script>

<TomeContent {tome}>
	<TomeSection>
		<TomeSectionHeader text="Themes" />
		<UnfinishedImplementationWarning>
			The theme set is still growing, but the proof of concept is ready!
		</UnfinishedImplementationWarning>
		<p>
			A theme is a set of <em>knob</em> values, not a stylesheet: a JSON collection of
			<TomeLink slug="variables" /> where a handful of high-leverage variables (hue angles,
			<code>chroma_scale</code>, the lightness curve knobs - see <TomeLink slug="colors" />) reshape
			everything downstream. Each variable can have values for light and/or dark color schemes, so
			"dark" isn't a theme, it's a mode that any theme can implement. Selecting a theme applies it
			to this whole website and loads its knobs into the editor below.
		</p>
		<div class="width_atmost_xs mb_lg">
			<ThemeInput
				themes={picker_themes}
				selected_theme={{ theme: selected_base }}
				select={select_theme}
			/>
		</div>
		<label class="width_atmost_xs mb_lg">
			<span class="title">Contrast</span>
			<select
				value={contrast_modifier?.name ?? ''}
				onchange={(e) => select_contrast(e.currentTarget.value)}
			>
				<option value="">default</option>
				{#each contrast_modifiers as modifier (modifier.name)}
					<option value={modifier.name}>{modifier.name}</option>
				{/each}
			</select>
		</label>
		<p>
			Contrast is a <em>modifier</em>, not a theme: the low/high contrast pair compose over any
			selected theme with <code>compose_themes</code> (flatten + last-wins), so every theme has low
			and high contrast variants for free.
		</p>
		<p>
			Every theme ships as an importable module under <code>themes/</code>, and theme CSS renders
			into the <code>fuz.theme</code> cascade layer, above the <code>fuz.base</code> defaults, so
			overrides win regardless of stylesheet order. See <ModuleLink module_path="theme.ts" /> and
			<ModuleLink module_path="themes.ts" />
			for the API:
		</p>
		<Code
			lang="ts"
			content={`import {phosphor_theme} from '@fuzdev/fuz_css/themes/phosphor.ts';`}
		/>
		<p>
			A theme can declare a single-scheme stance with <code>scheme: 'light' | 'dark'</code> - its
			one appearance then renders in both color schemes and
			<MdnLink path="Web/CSS/color-scheme" />
			is pinned to match. The neon and phosphor themes are dark-only this way, and parchment is
			light-only.
		</p>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Applying a theme" />
		<p>
			A theme is plain data - an array of style variables - so it can be applied at build time or at
			runtime. Most projects want build time.
		</p>
		<p>
			Pass a theme to the <TomeLink slug="classes" hash="Vite-plugin">Vite plugin</TomeLink> or
			<TomeLink slug="classes" hash="Gro-generator">Gro generator</TomeLink>
			and its values bake into the generated CSS - no runtime rendering, no JavaScript shipped, and
			the output stays tree-shaken:
		</p>
		<Code
			lang="ts"
			content={`// vite.config.ts
import {vite_plugin_fuz_css} from '@fuzdev/fuz_css/vite_plugin_fuz_css.ts';
import {phosphor_theme} from '@fuzdev/fuz_css/themes/phosphor.ts';

export default defineConfig({plugins: [vite_plugin_fuz_css({theme: phosphor_theme})]});`}
		/>
		<p>
			It overlays the default variables last-wins by name, so it composes with the
			<code>variables</code> option. The theme's own overlay also renders into the
			<code>fuz.theme</code> layer - above the OS preference mappings, with
			<MdnLink path="Web/CSS/color-scheme" />
			pinned for a single-scheme stance - so a baked theme behaves the same as the runtime path.
		</p>
		<p>
			For runtime switching - a picker, or a theme loaded per user - use <code>ThemeRoot</code> from
			<a href="https://ui.fuz.dev/">fuz_ui</a>, which renders the theme to a
			<code>style</code>
			element. The two compose: the build-time theme is the starting point, and a runtime theme
			overrides it by cascade layer.
		</p>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Color scheme" />
		<p>
			fuz_css supports
			<MdnLink path="Web/CSS/color-scheme" /> with dark and light modes, detected from
			<MdnLink path="Web/CSS/@media/prefers-color-scheme" /> by default. To apply dark mode
			manually, add the <code>dark</code> class to the root <code>html</code> element, or use a
			component like
			<a href="https://github.com/fuzdev/fuz_ui/blob/main/src/lib/ColorSchemeInput.svelte">
				this one
			</a>
			from the companion Svelte library <a href="https://ui.fuz.dev/">fuz_ui</a>:
		</p>
		<div class="display:flex mb_lg">
			<ColorSchemeInput />
		</div>
		<p>
			fuz_css itself works with any JS framework - it provides only stylesheets, and themes are
			plain data any integration can render.
		</p>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Theme editor" />
		<p>
			Drag a knob and the whole page rethemes live - extreme values can make the page hard to read,
			which is an honest signal, not a bug. Every edit updates a temporary "{UNSAVED_THEME_NAME}"
			theme in the picker above; it survives navigating away and back, but copy the
			<code>Theme</code>
			object below to keep it.
		</p>
		<ThemeEditor {editor} {theme_state} onload_theme={on_editor_load_theme} />
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Validating and compiling themes" />
		<p>
			<ModuleLink module_path="theme_check.ts" /> provides three pure functions for checking a
			<code>Theme</code>.
		</p>
		<p>
			<code>validate_theme(theme)</code> is the structural lint: unknown variable names are errors,
			while type and range mismatches on the knob-tier variables are advisory warnings. It returns
			an array of issues - empty means the theme is structurally sound.
		</p>
		<p>
			<code>check_theme(theme)</code> runs the gamut, ramp-monotonicity, and contrast gates against
			the theme's resolved values. It is report-only and never throws, returning
			<code>{'{ok, entries, unchecked}'}</code>
			- suited to a CI or test assertion:
		</p>
		<Code
			lang="ts"
			content={`import {test, assert} from 'vitest';
import {check_theme} from '@fuzdev/fuz_css/theme_check.ts';
import {my_theme} from './my_theme.ts';

test('my theme clears the accessibility gates', () => {
	assert.isTrue(check_theme(my_theme).ok);
});`}
		/>
		<p>
			<code>compile_theme(theme)</code> is for themes that move hues or lightness ramps -
			monochrome, rotated, or dark-only. It recomputes the per-stop sRGB gamut caps from the theme's
			actual hues and appends the corrected <code>palette_chroma_NN</code> stop overrides, returning
			<code>{'{theme, report, issues}'}</code>.
		</p>
		<p>
			fuz_css gates its own themes - including every theme × contrast-modifier composition - with
			these functions in its test suite, and the editor above runs the same lint and gates live on
			every edit.
		</p>
	</TomeSection>
</TomeContent>
