<script lang="ts" module>
	import { BROWSER } from 'esm-env';

	import { contrast_modifiers } from '#lib/themes.ts';
	import {
		ThemeEditorState,
		create_rooted_theme_editor,
		type ThemeEditorSnapshotData
	} from '#routes/theme_editor_state.svelte.ts';
	import { site_themes } from '#routes/site_themes.ts';
	import { UNSAVED_THEME_NAME, register_draft_caps_source } from '#routes/theme_draft.svelte.ts';

	const create_editor = (): ThemeEditorState =>
		new ThemeEditorState({ themes: site_themes, contrast_modifiers });

	// one editor per browser session, so a draft survives navigating to another
	// page and back by link - the page component is recreated, and the
	// snapshot below only covers history navigation; rooted, since the page
	// instance that first creates it is destroyed by that navigation
	let session_editor: ThemeEditorState | null = null;

	// the session editor outlives the page, and so does its draft, applied on
	// every page - so its caps source is registered once and never removed
	const create_session_editor = (): ThemeEditorState => {
		const editor = create_rooted_theme_editor({ themes: site_themes, contrast_modifiers });
		register_draft_caps_source(() => editor.compiled.caps);
		return editor;
	};
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

	import type { Theme } from '#lib/variable.ts';
	import ThemeEditor from '#routes/ThemeEditor.svelte';
	import ThemePreview from '#routes/ThemePreview.svelte';
	import ContrastInput from '#routes/ContrastInput.svelte';
	import { snapshot } from '$app/navigation';

	const LIBRARY_ITEM_NAME = 'themes';

	const tome = tome_get_by_slug(LIBRARY_ITEM_NAME);

	const get_theme_state = theme_state_context.get();
	const theme_state = get_theme_state();

	// the server renders a fresh editor per request; the browser keeps one
	const editor = BROWSER ? (session_editor ??= create_session_editor()) : create_editor();

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

	// persist the in-progress theme across history navigation and reloads; an
	// explicit id, since the default call-site id changes between deployments
	snapshot<ThemeEditorSnapshotData>({
		id: 'theme_editor',
		capture: () => editor.to_snapshot(),
		restore: (data) => editor.restore_snapshot(data)
	});
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
		<!-- the controls get their own right-justified row above the picker and
			preview, so they can reach left over the picker without forcing a wrap -->
		<div class="row_wrap justify-content:flex-end align-items:flex-start gap_lg mb_flow">
			<div>
				<div class="title text-align:center pb_xs3">Contrast</div>
				<ContrastInput
					modifiers={contrast_modifiers}
					selected={editor.contrast_modifier}
					select={(modifier) => (editor.contrast_modifier = modifier)}
				/>
			</div>
			<div>
				<div class="title text-align:center pb_xs3">Color scheme</div>
				<ColorSchemeInput />
			</div>
		</div>
		<!-- the picker shares a row with the preview, which wraps below it on
			narrow screens -->
		<div class="display:flex flex-wrap:wrap align-items:flex-start gap_lg mb_flow">
			<div class="width_atmost_xs flex:1">
				<div class="title text-align:center pb_xs3">Theme</div>
				<ThemeInput
					themes={editor.picker_themes}
					selected_theme={{ theme: editor.picked_theme }}
					select={select_theme}
				/>
			</div>
			<div class="theme-preview-column">
				<ThemePreview
					theme={editor.picked_theme}
					edited_from={editor.dirty ? editor.base_theme : null}
				>
					{#snippet link()}<TomeLink slug="colors" class="">a link</TomeLink>{/snippet}
				</ThemePreview>
			</div>
		</div>
		<p>
			Contrast is a knob, not a theme: <code>--contrast</code> moves the page ground toward white in
			light mode or near-black in dark, bends the text curve toward the contrast end, bends the
			shade curve only slightly so raised surfaces stay close to the ground, and moves the default
			control border from <code>shade_30</code> toward <code>shade_50</code>, strengthening whatever
			theme it sits on. A theme may set it like any knob. The high contrast modifier sets it alone
			and composes over any theme with <code>compose_themes</code> (flatten + last-wins), so every
			theme gets the variant for free: picking it sets <code>--contrast</code> to 0.5, as picking a
			theme sets that theme's knobs, replacing whatever value the theme authored. The OS
			<code>prefers-contrast: more</code> preference instead sets its own input to the same value,
			and the effective contrast is the larger of the two - so the preference renders what the
			modifier does over a theme at the default, only ever raises a theme's own contrast, and no
			theme can silence it.
		</p>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Color scheme" />
		<p>
			Light and dark are color schemes within a theme (<MdnLink path="Web/CSS/color-scheme" />), not
			separate themes: each variable carries a <code>base</code> value that applies in both and an
			optional <code>dark</code> value that replaces it in dark mode, so any theme can implement
			dark mode. The scheme follows <MdnLink path="Web/CSS/@media/prefers-color-scheme" /> by
			default. To set it manually, add the <code>dark</code> or <code>light</code> class to the root
			<code>html</code> element, or use a component like
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
		<p>
			A stanced theme stays plain data. What the stance implies, the scheme-adaptive defaults
			re-slotted into its one appearance, is computed where the theme renders rather than stored in
			it, so a saved theme never carries a stale copy: <code>resolve_theme_stance(theme)</code> in
			<ModuleLink module_path="theme_stance.ts" /> returns the theme with its
			<code>scheme_mirror</code> beside it, ready for
			<code>render_theme_style(resolved.theme, resolved)</code>.
		</p>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Applying a theme" />
		<p>
			A theme applies at build time or at runtime, and most projects want build time. Every theme on
			this page ships as its own module under <code>themes/</code>, and
			<ModuleLink module_path="themes.ts" /> holds the registry and the contrast modifier.
		</p>
		<p>
			Pass a theme to the <TomeLink slug="setup">Vite plugin</TomeLink> and its values bake into the
			generated CSS - no runtime rendering, no JavaScript shipped, and the output stays tree-shaken:
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
			<code>variables</code> option, and a stance mirrors the configured variables. They also render
			into the <code>fuz.theme.baked</code> cascade layer, above the OS preference mappings and with
			<code>color-scheme</code> pinned for a stance, so a baked theme behaves the same as one
			applied at runtime.
		</p>
		<p>
			For runtime switching - a picker, or a theme loaded per user - use <code>ThemeRoot</code> from
			<a href="https://ui.fuz.dev/">fuz_ui</a>, which renders the theme to a
			<code>&lt;style&gt;</code> element in the <code>fuz.theme</code> layer. The two paths compose:
			a runtime theme overrides a baked one, since a layer's direct styles outrank its sublayers.
			Pass it your registry as <code>themes</code> so a picked theme persists by name, and
			<code>resolve_theme=&lbrace;resolve_theme_stance&rbrace;</code> from
			<ModuleLink module_path="theme_stance.ts" /> so a single-scheme theme like phosphor renders
			its stance mirror. Outside Svelte, <code>render_theme_style</code> in
			<ModuleLink module_path="theme.ts" /> does the same rendering for any framework.
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
			advisory warning: type and range mismatches on the knob-tier variables, a dark slot under a
			single-scheme stance, and intent bindings that put the accent beside a status hue or drop a
			palette slot's chroma character. It returns an array of issues - empty means the theme is
			structurally sound.
		</p>
		<p>
			<code>check_theme(theme)</code> in <ModuleLink module_path="theme_check.ts" /> runs the gamut,
			ramp-monotonicity, and contrast gates against the theme's resolved values. It reports rather
			than throws, returning <code>{'{passed, complete, entries, unchecked}'}</code>. The contrast
			gates measure the pairings the default styles make on the page background - body and subtle
			text, links, borders, fills, and colored labels, including a <code>.palette_a</code> button's
			label on its own tinted fill at rest, hovered, and pressed. They follow the role variables
			those styles paint through, so a theme that sets <code>border_color</code> to
			<code>var(--text_60)</code> has its borders measured at <code>text_60</code>, in an entry
			named <code>border_color vs shade_00</code>. The control border's floor rises with the theme's
			contrast: deliberately soft at the default, and 3:1 against the ground once
			<code>--contrast</code> reaches the high contrast value.
		</p>
		<p>
			A value a gate depends on but can't evaluate lands in <code>unchecked</code> instead of
			passing unread: a knob that doesn't resolve to a number, or a color stop or role set to
			anything other than an <code>oklch(L C H)</code> numeric literal or an exact
			<code>var()</code> reference to another gated color. <code>passed</code> says every evaluated
			entry passes and <code>complete</code> that nothing is unchecked - a theme can pass everything
			the gates could read and still leave inputs unread. Called alone, <code>check_theme</code>
			measures at the default chroma caps, so a theme that moves hues or lightness can fail gamut
			where its own caps would hold. For a CI or test assertion, check the report
			<code>compile_theme</code> (below) returns, which runs the gates with the caps it recomputes -
			what the theme renders with when baked over the default variables, or rendered as
			<code>render_theme_style(compiled.theme, compiled)</code> (pass the build's configured set,
			<code>compile_theme(theme, {'{variables}'})</code>, to measure what a build with those
			<code>variables</code> bakes):
		</p>
		<Code
			lang="ts"
			content={`import {test, assert} from 'vitest';
import {compile_theme} from '@fuzdev/fuz_css/theme_compile.ts';
import {my_theme} from './my_theme.ts';

test('my theme clears the accessibility gates', () => {
	const {report} = compile_theme(my_theme);
	assert.isTrue(report.passed);
	assert.isTrue(report.complete);
});`}
		/>
		<p>
			<code>compile_theme(theme)</code> in <ModuleLink module_path="theme_compile.ts" /> is for
			themes that move hues or palette lightness - monochrome, rotated, or dark-only. It recomputes
			the per-stop sRGB gamut caps from the theme's actual hues and the lightness each stop resolves
			to, returning the corrected <code>_palette_chroma_NN</code> caps beside the theme rather than
			in it: <code>{'{theme, scheme_mirror, caps, report, issues}'}</code>, which renders as
			<code>render_theme_style(compiled.theme, compiled)</code>. The theme comes back untouched, so
			compiling again gives the same caps. Chroma pushed past the caps on purpose
			(<code>chroma_scale</code> above 1) still clips afterward, and the report says so. A theme
			baked in at build time gets its caps recomputed automatically, with its gate failures reported
			as build warnings and its <code>validate_theme</code> issues as build errors and warnings.
		</p>
		<p>
			fuz_css gates its own themes with these functions in its test suite, every theme alone and
			composed with high contrast, and declares what an exemplar knowingly gives up, like marquee's
			clipped gamut, as exact exceptions. The editor above runs the same lint and gates live on
			every edit.
		</p>
	</TomeSection>
</TomeContent>

<style>
	.theme-preview-column {
		/* the picker's partner: shares its row on wide screens, wraps below it on narrow */
		flex: 1 1 var(--distance_sm);
		min-width: 0;
	}
</style>
