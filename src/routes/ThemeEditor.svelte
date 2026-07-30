<script lang="ts">
	// TODO upstream to fuz_ui

	import Code from '@fuzdev/fuz_code/Code.svelte';
	import CopyToClipboard from '@fuzdev/fuz_ui/CopyToClipboard.svelte';
	import ColorSchemeInput from '@fuzdev/fuz_ui/ColorSchemeInput.svelte';
	import type { ThemeState } from '@fuzdev/fuz_ui/theme_state.svelte.ts';

	import { render_theme_style, type Theme, type ThemeScheme } from '$lib/theme.ts';
	import { theme_knobs, knob_axes, type KnobAxis, type ThemeKnob } from '$lib/knobs.ts';
	import type { ThemeGateEntry } from '$lib/theme_check.ts';
	import { PALETTE_HUES } from '$lib/ramps.ts';
	import {
		palette_variants,
		intent_variants,
		type ColorSchemeVariant,
		type PaletteVariant
	} from '$lib/variable_data.ts';
	import {
		discard_confirm_message,
		render_theme_ts,
		UNSAVED_THEME_NAME,
		type ThemeEditorState
	} from '$routes/theme_editor_state.svelte.ts';
	import KnobControl from '$routes/KnobControl.svelte';
	import RampStrip from '$routes/RampStrip.svelte';

	// @fuz-classes sm md lg

	const {
		editor,
		theme_state,
		onload_theme
	}: {
		editor: ThemeEditorState;
		theme_state: ThemeState;
		/**
		 * Called after the "based on" select loads a theme as the new base, so
		 * the page can apply it and sync its own picker selection.
		 */
		onload_theme?: (theme: Theme) => void;
	} = $props();

	// the scheme whose slots edits write to; OS changes while 'auto' aren't
	// tracked live, acceptable for now
	const editing_scheme: ColorSchemeVariant = $derived.by(() => {
		const c = theme_state.color_scheme;
		if (c === 'dark') return 'dark';
		if (c === 'light') return 'light';
		return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches
			? 'dark'
			: 'light';
	});

	const failing_gates: Array<ThemeGateEntry> = $derived(
		editor.check_report.entries.filter((e) => !e.pass)
	);

	const format_gate_value = (entry: ThemeGateEntry): string => {
		switch (entry.gate) {
			case 'contrast':
				return `${entry.value.toFixed(2)}:1 (needs ${entry.threshold}:1)`;
			case 'gamut':
				return `${entry.value.toFixed(4)} past the sRGB gamut`;
			case 'monotonicity':
				return `min ramp step ${entry.value.toFixed(4)} (needs > ${entry.threshold})`;
		}
	};

	const semantic_knobs = (axis: KnobAxis): Array<ThemeKnob> =>
		theme_knobs.filter((k) => k.axis === axis && k.tier === 'semantic');
	const palette_knobs = theme_knobs.filter((k) => k.tier === 'palette');
	// the design band: intent/neutral bindings plus the highest-leverage levers,
	// duplicated compactly above the granular flow - same state, two densities
	const binding_knobs = theme_knobs.filter((k) => k.bindable);
	const lever_knobs = theme_knobs.filter((k) => k.leverage === 'lg' && !k.bindable);

	// the sm knobs fold behind a disclosure per axis so the levers stay the
	// visual main flow; each axis labels what its disclosure actually holds
	const sm_details: Partial<Record<KnobAxis, { title: string; hint: string }>> = {
		color: {
			title: 'chroma character & surface colors',
			hint: 'per-slot multipliers and micro-surface colors'
		},
		shape: {
			title: 'border width & radius tokens',
			hint: 'escape hatches - pin individual tokens'
		},
		density: { title: 'space tokens', hint: 'escape hatches - pin individual tokens' },
		depth: { title: 'backdrop', hint: 'the dialog and fullscreen backdrop dim' },
		typography: { title: 'line height tokens', hint: 'escape hatches - pin individual tokens' },
		motion: { title: 'duration tokens', hint: 'escape hatches - pin individual tokens' }
	};

	// resolves a letter's current angle from the same merge the renderer uses,
	// so binding chips and detachment track theme overrides - through the
	// shared resolver, so chained bindings resolve instead of silently
	// falling back to the shipped default
	const resolve_hue = (letter: PaletteVariant): number =>
		editor.resolved_value(`hue_${letter}`, editing_scheme) ?? PALETTE_HUES[letter];

	// switching the "based on" theme flattens it as the new base, discarding any
	// edits, so guard the switch behind a confirm when the draft is dirty
	const on_base_change = (e: Event & { currentTarget: EventTarget & HTMLSelectElement }): void => {
		const name = e.currentTarget.value;
		if (
			editor.dirty &&
			// eslint-disable-next-line no-alert -- deliberate guard against silently discarding edits
			!confirm(discard_confirm_message(editor, name))
		) {
			e.currentTarget.value = editor.based_on;
			return;
		}
		const theme = editor.themes.find((t) => t.name === name);
		if (theme) {
			editor.load_theme(theme);
			onload_theme?.(theme);
		}
	};

	const trimmed_name = $derived(editor.name.trim());
	const name_collides = $derived(
		trimmed_name === UNSAVED_THEME_NAME || editor.themes.some((t) => t.name === trimmed_name)
	);

	const output_ts = $derived(render_theme_ts(editor.output));
	const output_css = $derived(render_theme_style(editor.output));
</script>

{#snippet knob_control(knob: ThemeKnob, compact: boolean)}
	<KnobControl
		{compact}
		{knob}
		{resolve_hue}
		value={editor.display_value(knob.name, editing_scheme)}
		resolved={editor.resolved_value(knob.name, editing_scheme)}
		changed={editor.changed(knob.name)}
		onchange={(value) => editor.set_value(knob.name, value, editing_scheme)}
		onreset={() => editor.reset(knob.name)}
	/>
{/snippet}

<div class="theme_editor width:100%">
	<header class="mb_flow">
		<div class="row gap_lg flex-wrap:wrap mb_lg">
			<label>
				<div class="title">name</div>
				<input bind:value={editor.name} />
			</label>
			<label>
				<div class="title">based on</div>
				<select value={editor.based_on} onchange={on_base_change}>
					{#each editor.themes as theme (theme.name)}
						<option value={theme.name}>{theme.name}</option>
					{/each}
				</select>
			</label>
			<label>
				<div class="title">scheme</div>
				<select
					value={editor.scheme}
					onchange={(e) => editor.set_scheme(e.currentTarget.value as ThemeScheme)}
				>
					<option value="dual">dual</option>
					<option value="light">light only</option>
					<option value="dark">dark only</option>
				</select>
			</label>
			<div class="box gap_sm align-items:flex-start">
				<span
					class="chip"
					title={editor.is_palette_tier
						? 'moves palette letter hues - exemplar tier, stays out of registries'
						: 'moves only intent bindings and levers - safe for theme registries'}
				>
					{editor.is_palette_tier ? 'palette-tier' : 'semantic-tier'}
				</span>
				{#if editor.dirty}
					<button type="button" class="sm" onclick={() => editor.reset_all()}>
						reset all{editor.overrides.size ? ` (${editor.overrides.size})` : ''}
					</button>
				{/if}
			</div>
		</div>
		{#if name_collides}
			<aside>the name "{trimmed_name}" collides with an existing theme - consider renaming</aside>
		{/if}
		<div class="row gap_lg">
			<ColorSchemeInput />
			{#if editor.stance}
				<small>
					single-scheme theme - edits write to the base slots and the
					<strong>{editor.stance}</strong>
					appearance renders in both color schemes
				</small>
			{:else}
				<small>edits write to the <strong>{editing_scheme}</strong> scheme's slots</small>
			{/if}
		</div>
	</header>

	<!-- the same knobs appear again in their axis sections below - same state,
		two densities -->
	<section class="design_band panel p_md">
		<div class="mb_md">
			<small>intents - what each meaning points at</small>
			<div class="knobs row flex-wrap:wrap gap_md">
				{#each binding_knobs as knob (knob.name)}
					{@render knob_control(knob, true)}
				{/each}
			</div>
		</div>
		<div>
			<small>levers - the highest-leverage knobs</small>
			<div class="knobs compact row flex-wrap:wrap">
				{#each lever_knobs as knob (knob.name)}
					{@render knob_control(knob, true)}
				{/each}
			</div>
		</div>
	</section>

	{#each knob_axes as { axis, title } (axis)}
		{@const inline_knobs = semantic_knobs(axis).filter((k) => k.leverage !== 'sm')}
		{@const sm_knobs = semantic_knobs(axis).filter((k) => k.leverage === 'sm')}
		{#if inline_knobs.length || sm_knobs.length}
			<section>
				<h3>{title}</h3>
				{#if axis === 'color'}
					<!-- live feedback: the derived neutral and intent scales repaint as
						knobs move -->
					<div class="ramp_strips mb_lg">
						<RampStrip prefix="shade" />
						<RampStrip prefix="text" />
						{#each intent_variants as intent (intent)}
							<RampStrip prefix={intent} />
						{/each}
					</div>
				{/if}
				{#if inline_knobs.length}
					<div class="knobs row flex-wrap:wrap gap_lg align-items:flex-end">
						{#each inline_knobs as knob (knob.name)}
							{@render knob_control(knob, false)}
						{/each}
					</div>
				{/if}
				{#if sm_knobs.length}
					{@const sm_meta = sm_details[axis]}
					<details class="mt_lg">
						<summary>
							{sm_meta?.title ?? 'granular tokens'}
							<small>({sm_meta?.hint ?? 'escape hatches - pin individual tokens'})</small>
						</summary>
						<div class="knobs row flex-wrap:wrap gap_lg align-items:flex-end mt_md">
							{#each sm_knobs as knob (knob.name)}
								{@render knob_control(knob, false)}
							{/each}
						</div>
					</details>
				{/if}
				{#if axis === 'color'}
					<details class="mt_lg">
						<summary>
							palette hues <small>
								(the letter slots - moving these makes the theme palette-tier)
							</small>
						</summary>
						<div class="ramp_strips mt_md mb_lg">
							{#each palette_variants as letter (letter)}
								<RampStrip prefix="palette_{letter}" label="palette_{letter}" />
							{/each}
						</div>
						<div class="knobs row flex-wrap:wrap gap_lg align-items:flex-end">
							{#each palette_knobs as knob (knob.name)}
								{@render knob_control(knob, false)}
							{/each}
						</div>
					</details>
				{/if}
			</section>
		{/if}
	{/each}

	<section>
		<h3>Gates</h3>
		<p>
			<code>validate_theme</code> and <code>check_theme</code> run live against the draft - the same
			lint and gamut/monotonicity/contrast gates the shipped themes pass in CI.
		</p>
		{#if editor.issues.length === 0 &&
			failing_gates.length === 0 &&
			editor.check_report.unchecked.length === 0
		}
			<p class="positive_50">
				all gates pass <small>({editor.check_report.entries.length} checks)</small>
			</p>
		{:else}
			{#if editor.issues.length}
				<ul class="unstyled">
					{#each editor.issues as issue, i (i)}
						<li class={issue.level === 'error' ? 'negative_50' : 'caution_50'}>
							{issue.level}: {issue.message}
						</li>
					{/each}
				</ul>
			{/if}
			{#if failing_gates.length}
				<ul class="unstyled">
					{#each failing_gates as entry, i (i)}
						<li class="negative_50">
							{entry.gate} · {entry.scheme} · {entry.subject}: {format_gate_value(entry)}
						</li>
					{/each}
				</ul>
			{/if}
			{#if editor.check_report.unchecked.length}
				<details>
					<summary>
						{editor.check_report.unchecked.length} unchecked <small>
							(values the numeric gates can't resolve)
						</small>
					</summary>
					<ul class="unstyled">
						{#each editor.check_report.unchecked as u (u.variable + u.value)}
							<li><code>{u.variable}</code>: {u.value} <small>({u.reason})</small></li>
						{/each}
					</ul>
				</details>
			{/if}
		{/if}
	</section>

	<section>
		<h3>Output</h3>
		<p>
			The copyable <code>Theme</code> object, and the CSS it renders - the variables the theme sets,
			plus the scheme-stance mirror when the theme is single-scheme.
		</p>
		<div class="rendered mb_lg">
			<div class="copy">
				<CopyToClipboard text={output_ts} />
			</div>
			<Code content={output_ts} lang="ts" />
		</div>
		{#if editor.output.variables.length || editor.output.scheme_mirror?.length}
			<div class="rendered mb_lg">
				<div class="copy">
					<CopyToClipboard text={output_css} />
				</div>
				<Code content={output_css} lang="css" />
			</div>
		{:else}
			<p>
				The theme is empty: every variable keeps its base default, so it renders no CSS. Move a knob
				to see its output.
			</p>
		{/if}
	</section>
</div>

<style>
	/* dense horizontally, normal rhythm between wrapped rows */
	.knobs.compact {
		gap: var(--space_lg) var(--space_md);
	}
	.ramp_strips {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: var(--space_sm) var(--space_lg);
	}
	.rendered {
		position: relative; /* for the .copy button */
	}
	.rendered :global(.code_example) {
		width: 100%;
		max-height: 320px;
		overflow: auto;
	}
	.copy {
		position: absolute;
		top: var(--space_md);
		right: var(--space_md);
		z-index: 1;
	}
</style>
