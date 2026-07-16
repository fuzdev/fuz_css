<script lang="ts">
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import {tome_get_by_slug} from '@fuzdev/fuz_ui/tome.ts';
	import ColorSchemeInput from '@fuzdev/fuz_ui/ColorSchemeInput.svelte';
	import TomeLink from '@fuzdev/fuz_ui/TomeLink.svelte';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';
	import ThemeInput from '@fuzdev/fuz_ui/ThemeInput.svelte';
	import MdnLink from '@fuzdev/fuz_ui/MdnLink.svelte';
	import ModuleLink from '@fuzdev/fuz_ui/ModuleLink.svelte';
	import Code from '@fuzdev/fuz_code/Code.svelte';
	import {theme_state_context} from '@fuzdev/fuz_ui/theme_state.svelte.ts';

	import {default_themes} from '$lib/themes.ts';
	import {necromancer_theme} from '$lib/themes/necromancer.ts';
	import {sunset_ember_theme} from '$lib/themes/sunset_ember.ts';
	import {brutalish_theme} from '$lib/themes/brutalish.ts';
	import {terminal_theme} from '$lib/themes/terminal.ts';
	import type {Theme} from '$lib/theme.ts';
	import UnfinishedImplementationWarning from '$routes/docs/UnfinishedImplementationWarning.svelte';
	import ThemeEditor from '$routes/ThemeEditor.svelte';
	import {
		ThemeEditorState,
		UNSAVED_THEME_NAME,
		type ThemeEditorSnapshotData,
	} from '$routes/theme_editor_state.svelte.ts';
	import type {Snapshot} from '@sveltejs/kit';

	const LIBRARY_ITEM_NAME = 'themes';

	const tome = tome_get_by_slug(LIBRARY_ITEM_NAME);

	const get_theme_state = theme_state_context.get();
	const theme_state = get_theme_state();

	const themes = default_themes.slice();
	const exemplar_themes = [necromancer_theme, sunset_ember_theme, brutalish_theme, terminal_theme];

	const editor = new ThemeEditorState([...themes, ...exemplar_themes]);

	// the in-progress theme appears in the picker as soon as a knob moves
	const picker_themes: Array<Theme> = $derived([
		...themes,
		...(editor.dirty ? [editor.draft] : []),
	]);

	// passed as ThemeInput's `select` (not `onselect`, which collides with the
	// DOM handler type in its menu-attribute props): applies the theme like the
	// default select and loads it into the editor
	const select_theme = (theme: Theme): void => {
		theme_state.theme = theme;
		if (theme.name !== UNSAVED_THEME_NAME) editor.load_theme(theme);
	};

	// live scope is global with no pin: the draft writes to `:root` through the
	// normal ThemeRoot pipeline, so the whole page rethemes including the editor
	$effect(() => {
		if (editor.dirty) {
			theme_state.theme = editor.draft;
		} else if (theme_state.theme.name === UNSAVED_THEME_NAME) {
			theme_state.theme = editor.base_theme;
		}
	});

	// persist the in-progress theme across navigation (history-entry-scoped)
	export const snapshot: Snapshot<ThemeEditorSnapshotData> = {
		capture: () => editor.to_snapshot(),
		restore: (data) => editor.restore_snapshot(data),
	};
</script>

<TomeContent {tome}>
	<section>
		<p>
			fuz_css supports both the browser's
			<MdnLink path="Web/CSS/color-scheme" />
			and custom themes based on <TomeLink slug="variables" />, which use
			<MdnLink path="Web/CSS/--*">CSS custom properties</MdnLink>.
		</p>
		<p>
			fuz_css works with any JS framework, but it provides only stylesheets, not integrations. This
			website uses the companion Svelte UI library <a href="https://ui.fuz.dev/">fuz_ui</a>
			to provide the UI below to control the fuz_css color scheme and themes.
		</p>
	</section>
	<TomeSection>
		<TomeSectionHeader text="Color scheme" />
		<p>
			fuz_css supports
			<MdnLink path="Web/CSS/color-scheme" /> with dark and light modes. To apply dark mode
			manually, add the <code>dark</code> class to the root <code>html</code>
			element.
		</p>
		<p>
			The Fuz integration detects the default with
			<MdnLink path="Web/CSS/@media/prefers-color-scheme" />, and users can also set it directly
			with a component like
			<a href="https://github.com/fuzdev/fuz_ui/blob/main/src/lib/ColorSchemeInput.svelte"
				>this one</a
			>:
		</p>
		<div class="display:flex mb_lg">
			<ColorSchemeInput />
		</div>
		<p>
			The builtin themes support both dark and light color schemes. Custom themes may support one or
			both color schemes.
		</p>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Builtin themes" />
		<UnfinishedImplementationWarning
			>The builtin themes need more work, but the proof of concept is
			ready!</UnfinishedImplementationWarning
		>
		<p>
			A theme is a simple JSON collection of <TomeLink slug="variables" /> that can be transformed
			into CSS that set custom properties. Each variable can have values for light and/or dark color
			schemes. In other words, "dark" isn't a theme, it's a mode that any theme can implement.
		</p>
		<p>
			Because the color system is derived, a theme is a set of <em>knob</em> values, not a
			stylesheet: a handful of high-leverage variables (hue angles, <code>chroma_scale</code>, the
			lightness curve knobs -- see <TomeLink slug="colors" />) reshape everything downstream. Theme
			CSS renders into the <code>fuz.theme</code> cascade layer, above the
			<code>fuz.base</code> defaults, so overrides win regardless of stylesheet order.
		</p>
		<p>
			These docs are a work in progress, for now see <ModuleLink
				module_path="theme.ts"
			/> and <ModuleLink module_path="themes.ts" />.
		</p>
		<p>Selecting a theme loads its knobs into the editor below.</p>
		<div class="width_atmost_xs mb_lg">
			<ThemeInput themes={picker_themes} select={select_theme} />
		</div>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Exemplar themes" />
		<p>
			Beyond the registry, fuz_css ships expressive exemplar themes as importable modules under
			<code>themes/</code> -- registry membership, not file location, is what separates builtins
			from exemplars. Import one and pass it to your theme setup:
		</p>
		<Code
			lang="ts"
			content={`import {necromancer_theme} from '@fuzdev/fuz_css/themes/necromancer.ts';`}
		/>
		<p>
			A theme can declare a single-scheme stance with <code>scheme: 'light' | 'dark'</code> -- the
			renderer then mirrors every scheme-adaptive default the theme doesn't override, so its one
			appearance renders in both color schemes, and pins
			<MdnLink path="Web/CSS/color-scheme" /> to match so form controls and scrollbars agree. The
			necromancer and terminal exemplars are dark-only this way, without hand-mirrored knob values.
		</p>
		<div class="width_atmost_xs mb_lg">
			<ThemeInput themes={exemplar_themes} select={select_theme} />
		</div>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Theme editor" />
		<p>
			Drag a knob and the whole page rethemes live -- extreme values can make the page hard to read,
			which is an honest signal, not a bug. Every edit updates a temporary "{UNSAVED_THEME_NAME}"
			theme in the picker above; it persists across navigation until you leave or reset, so copy
			the <code>Theme</code> object below to keep it. The scheme selector sets the theme's stance --
			a single-scheme theme renders its one appearance in both color schemes, so edits write the
			base slots. The top band holds the semantic-tier moves: assign each intent (accent, neutral,
			positive, negative, caution, info) to a palette letter -- or a custom angle -- and pull the
			high-leverage levers. Below it, each axis section carries the granular knobs, with per-token
			escape hatches folded away; the ramp strips repaint live as the derived scales move.
		</p>
		<ThemeEditor {editor} {theme_state} />
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Validating and compiling themes" />
		<p>
			<ModuleLink module_path="theme_check.ts" /> provides three pure functions for checking a
			<code>Theme</code> in tests or CI.
		</p>
		<p>
			<code>validate_theme(theme)</code> is the structural lint: unknown variable names are errors,
			while type and range mismatches on the knob-tier variables are advisory warnings. It returns
			an array of issues -- empty means the theme is structurally sound.
		</p>
		<p>
			<code>check_theme(theme)</code> runs the gamut, ramp-monotonicity, and contrast gates against
			the theme's resolved values. It is report-only and never throws, returning
			<code>{'{ok, entries, unchecked}'}</code> -- suited to a CI or test assertion:
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
			<code>compile_theme(theme)</code> is for themes that move hues or lightness ramps --
			monochrome, rotated, or dark-only. It recomputes the per-stop sRGB gamut caps from the theme's
			actual hues and appends the corrected <code>palette_chroma_NN</code> stop overrides, returning
			<code>{'{theme, report, issues}'}</code>.
		</p>
		<p>
			fuz_css gates its own registry and exemplar themes with these functions in its test suite.
		</p>
	</TomeSection>
</TomeContent>
