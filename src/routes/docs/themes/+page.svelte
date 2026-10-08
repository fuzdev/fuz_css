<script lang="ts" module>
	import { BROWSER } from 'esm-env';

	import { default_themes, contrast_modifiers } from '$lib/themes.ts';
	import { zine_theme } from '$lib/themes/zine.ts';
	import { pebble_theme } from '$lib/themes/pebble.ts';
	import { parchment_theme } from '$lib/themes/parchment.ts';
	import { phosphor_theme } from '$lib/themes/phosphor.ts';
	import { guestbook_theme } from '$lib/themes/guestbook.ts';
	import { marquee_theme } from '$lib/themes/marquee.ts';
	import { signage_theme } from '$lib/themes/signage.ts';
	import {
		ThemeEditorState,
		type ThemeEditorSnapshotData
	} from '$routes/theme_editor_state.svelte.ts';

	// one gallery: the registry and the shipped exemplars are a single list to
	// users - registry membership is policy for consumer pickers, not UX
	const themes = [
		...default_themes,
		zine_theme,
		pebble_theme,
		parchment_theme,
		phosphor_theme,
		guestbook_theme,
		marquee_theme,
		signage_theme
	];

	const create_editor = (): ThemeEditorState =>
		new ThemeEditorState({ themes, contrast_modifiers });

	// one editor per browser session, so a draft survives navigating to another
	// page and back by link - the page component is recreated, and the
	// snapshot below only covers history navigation
	let session_editor: ThemeEditorState | null = null;
</script>

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

	import type { Theme } from '$lib/variable.ts';
	import ThemeEditor from '$routes/ThemeEditor.svelte';
	import ThemePreview from '$routes/ThemePreview.svelte';
	import ContrastInput from '$routes/ContrastInput.svelte';
	import { UNSAVED_THEME_NAME } from '$routes/theme_draft.ts';
	import type { Snapshot } from '@sveltejs/kit';

	const LIBRARY_ITEM_NAME = 'themes';

	const tome = tome_get_by_slug(LIBRARY_ITEM_NAME);

	const get_theme_state = theme_state_context.get();
	const theme_state = get_theme_state();

	// the server renders a fresh editor per request; the browser keeps one
	const editor = BROWSER ? (session_editor ??= create_editor()) : create_editor();

	// adopt whatever the page already applies - a theme persisted from an
	// earlier visit, possibly a contrast composition - before the effect below
	// starts writing; a dirty editor keeps its draft
	editor.sync_applied_theme(theme_state.theme);

	// the applied theme renders through the layout's ThemeRoot onto `:root`,
	// so the whole page rethemes live, the editor included
	$effect(() => {
		theme_state.theme = editor.applied_theme;
	});

	// passed as ThemeInput's `select` (not `onselect`, which collides with the
	// DOM handler type in its menu-attribute props): loads the picked theme
	// into the editor behind the dirty-draft guard
	const select_theme = (theme: Theme): void => {
		// eslint-disable-next-line no-alert -- deliberate guard against silently discarding edits
		editor.load_theme_guarded(theme, (message) => confirm(message));
	};

	// persist the in-progress theme across history navigation and reloads
	export const snapshot: Snapshot<ThemeEditorSnapshotData> = {
		capture: () => editor.to_snapshot(),
		restore: (data) => editor.restore_snapshot(data)
	};
</script>

<TomeContent {tome}>
	<TomeSection>
		<TomeSectionHeader text="Themes" />
		<p>
			A theme is a set of <em>knob</em> values, not a stylesheet: plain data naming
			<TomeLink slug="variables" />, where a handful of high-leverage knobs (hue angles,
			<code>chroma_scale</code>, the lightness curves - see <TomeLink slug="colors" />) reshape
			everything derived from them. Selecting a theme applies it to this whole website and loads its
			knobs into the editor below.
		</p>
		<!-- the picker and a preview of the picked theme share a row, the
			preview wrapping below the picker on narrow screens -->
		<div class="display:flex flex-wrap:wrap align-items:flex-start gap_lg mb_lg">
			<div class="width_atmost_xs flex:1">
				<ThemeInput
					themes={editor.picker_themes}
					selected_theme={{ theme: editor.picked_theme }}
					select={select_theme}
				/>
			</div>
			<ThemePreview
				theme={editor.picked_theme}
				edited_from={editor.dirty ? editor.base_theme : null}
			>
				{#snippet link()}<TomeLink slug="colors">a link</TomeLink>{/snippet}
			</ThemePreview>
		</div>
		<div class="row flex-wrap:wrap align-items:flex-start gap_lg mb_lg">
			<div>
				<div class="title">Contrast</div>
				<ContrastInput
					modifiers={editor.contrast_modifiers}
					selected={editor.contrast_modifier}
					select={(modifier) => (editor.contrast_modifier = modifier)}
				/>
			</div>
			<div>
				<div class="title">Color scheme</div>
				<ColorSchemeInput />
			</div>
		</div>
		<p>
			Contrast is a <em>modifier</em>, not a theme: the low and high contrast modifiers compose over
			any theme with <code>compose_themes</code> (flatten + last-wins), so every theme gets both
			variants for free. The OS <code>prefers-contrast: more</code> preference maps onto the same
			variables the high contrast modifier sets, so it reaches every theme with no modifier picked.
		</p>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Color scheme" />
		<p>
			Light and dark are color schemes within a theme (<MdnLink path="Web/CSS/color-scheme" />), not
			separate themes: each variable can carry a value for either, so any theme can implement dark
			mode. The scheme follows <MdnLink path="Web/CSS/@media/prefers-color-scheme" /> by default. To
			set it manually, add the <code>dark</code> class to the root <code>html</code> element, or use
			a component like
			<a href="https://github.com/fuzdev/fuz_ui/blob/main/src/lib/ColorSchemeInput.svelte">
				<code>ColorSchemeInput</code>
			</a>
			(the picker at the top of this page) from the companion Svelte library
			<a href="https://ui.fuz.dev/">fuz_ui</a>.
		</p>
		<p>
			A theme can instead take a single-scheme stance with <code>scheme: 'light' | 'dark'</code>:
			its one appearance renders in both color schemes, and <code>color-scheme</code> is pinned to
			match. The phosphor and marquee themes are dark-only this way, since a CRT and a lit sign have
			no daytime appearance. Every other theme is dual-scheme, parchment included, whose dark
			appearance is the same page by candlelight.
		</p>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Applying a theme" />
		<p>
			A theme applies at build time or at runtime, and most projects want build time. Every theme on
			this page ships as its own module under <code>themes/</code>, and
			<ModuleLink module_path="themes.ts" /> holds the registry and the contrast modifiers.
		</p>
		<p>
			Pass a theme to the <TomeLink slug="classes" hash="Vite-plugin">Vite plugin</TomeLink> or
			<TomeLink slug="classes" hash="Gro-generator">Gro generator</TomeLink> and its values bake
			into the generated CSS - no runtime rendering, no JavaScript shipped, and the output stays
			tree-shaken:
		</p>
		<Code
			lang="ts"
			content={`// vite.config.ts
import {vite_plugin_fuz_css} from '@fuzdev/fuz_css/vite_plugin_fuz_css.ts';
import {phosphor_theme} from '@fuzdev/fuz_css/themes/phosphor.ts';

export default defineConfig({plugins: [vite_plugin_fuz_css({theme: phosphor_theme})]});`}
		/>
		<p>
			The theme's variables replace the defaults by name, so it composes with the
			<code>variables</code> option. They also render into the <code>fuz.theme.baked</code> cascade
			layer, above the OS preference mappings and with <code>color-scheme</code> pinned for a
			stance, so a baked theme behaves the same as one applied at runtime.
		</p>
		<p>
			For runtime switching - a picker, or a theme loaded per user - use <code>ThemeRoot</code> from
			<a href="https://ui.fuz.dev/">fuz_ui</a>, which renders the theme to a
			<code>&lt;style&gt;</code> element in the <code>fuz.theme</code> layer. The two paths compose:
			a runtime theme overrides a baked one, since a layer's direct styles outrank its sublayers.
			Outside Svelte, <code>render_theme_style</code> in <ModuleLink module_path="theme.ts" /> does
			the same rendering for any framework.
		</p>
		<p>
			Knobs take effect at the root: the derived color stops compute on <code>:root</code> and
			descendants inherit the result, so setting a knob like <code>--chroma_scale</code> on an
			element changes nothing below it. Set knobs through a theme, and when a subtree needs its own
			color, set the variable its styles read there instead.
		</p>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Theme editor" />
		<p>
			Drag a knob and the whole page rethemes live. Extreme values can make the page hard to read,
			which is an honest signal, not a bug. Every edit updates a temporary "{UNSAVED_THEME_NAME}"
			theme in the picker above; it survives navigating away and back, but copy the
			<code>Theme</code> object from the output below to keep it.
		</p>
		<ThemeEditor {editor} />
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Validating and compiling themes" />
		<p>
			<code>validate_theme(theme)</code> in <ModuleLink module_path="theme_validate.ts" /> is the
			structural lint. Unknown variable names are errors, and everything else it flags is an
			advisory warning: type and range mismatches on the knob-tier variables, a stance without its
			resolved mirror, and intent bindings that put the accent beside a status hue or drop a palette
			slot's chroma character. It returns an array of issues - empty means the theme is structurally
			sound.
		</p>
		<p>
			<code>check_theme(theme)</code> in <ModuleLink module_path="theme_check.ts" /> runs the gamut,
			ramp-monotonicity, and contrast gates against the theme's resolved values. It reports rather
			than throws, returning <code>{'{ok, entries, unchecked}'}</code>. The contrast gates measure
			the pairings the default styles make on the page background - body and subtle text, links,
			borders, fills, and colored labels, including a <code>.palette_a</code> button's label on its
			own tinted fill. They follow the role variables those styles paint through, so a theme that
			sets <code>border_color</code> to <code>var(--text_60)</code> has its borders measured at
			<code>text_60</code>, in an entry named <code>border_color vs shade_00</code>.
		</p>
		<p>
			A value a gate depends on but can't evaluate lands in <code>unchecked</code> instead of
			passing unread: a knob that doesn't resolve to a number, or a color stop or role set to
			anything other than an <code>oklch(L C H)</code> numeric literal or an exact
			<code>var()</code> reference to another gated color. <code>ok</code> is true only when every
			entry passes and nothing is unchecked, which suits a CI or test assertion:
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
			<code>compile_theme(theme)</code> is for themes that move hues or palette lightness -
			monochrome, rotated, or dark-only. It recomputes the per-stop sRGB gamut caps from the theme's
			actual hues and the lightness each stop resolves to, a pinned
			<code>palette_lightness_NN</code> included, and appends the corrected
			<code>palette_chroma_NN</code> stop overrides, returning
			<code>{'{theme, report, issues}'}</code>. Chroma pushed past the caps on purpose
			(<code>chroma_scale</code> above 1) still clips afterward, and the report says so.
		</p>
		<p>
			fuz_css gates its own themes with these functions in its test suite, every theme ×
			contrast-modifier composition included, and declares the pairings an exemplar knowingly gives
			up as exact exceptions. The editor above runs the same lint and gates live on every edit.
		</p>
	</TomeSection>
</TomeContent>
