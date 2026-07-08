<script lang="ts">
	// TODO upsteam to fuz_ui

	import Code from '@fuzdev/fuz_code/Code.svelte';
	import CopyToClipboard from '@fuzdev/fuz_ui/CopyToClipboard.svelte';
	import ColorSchemeInput from '@fuzdev/fuz_ui/ColorSchemeInput.svelte';
	import type {ThemeState} from '@fuzdev/fuz_ui/theme_state.svelte.ts';

	import {render_theme_style} from '$lib/theme.ts';
	import {theme_knobs, type KnobAxis, type ThemeKnob} from '$lib/knobs.ts';
	import type {ColorSchemeVariant} from '$lib/variable_data.ts';
	import {
		render_theme_ts,
		UNSAVED_THEME_NAME,
		type ThemeEditorState,
	} from '$routes/theme_editor_state.svelte.ts';
	import KnobControl from '$routes/KnobControl.svelte';

	// @fuz-classes sm md lg

	const {
		editor,
		theme_state,
	}: {
		editor: ThemeEditorState;
		theme_state: ThemeState;
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

	const axes: Array<{axis: KnobAxis; title: string}> = [
		{axis: 'color', title: 'Color'},
		{axis: 'shape', title: 'Shape'},
		{axis: 'density', title: 'Density'},
		{axis: 'depth', title: 'Depth'},
		{axis: 'typography', title: 'Typography'},
		{axis: 'motion', title: 'Motion'},
		{axis: 'decoration', title: 'Decoration'},
	];

	const semantic_knobs = (axis: KnobAxis): Array<ThemeKnob> =>
		theme_knobs.filter((k) => k.axis === axis && k.tier === 'semantic');
	const palette_knobs = theme_knobs.filter((k) => k.tier === 'palette');
	// the highest-leverage knobs duplicated compactly above the granular flow
	const quick_knobs = theme_knobs.filter((k) => k.leverage === 'lg');

	const trimmed_name = $derived(editor.name.trim());
	const name_collides = $derived(
		trimmed_name === UNSAVED_THEME_NAME || editor.themes.some((t) => t.name === trimmed_name),
	);

	const output_ts = $derived(render_theme_ts(editor.output));
	const output_css = $derived(render_theme_style(editor.output));
</script>

<div class="theme_editor">
	<header>
		<div class="row gap_lg flex_wrap">
			<label>
				<div class="title">name</div>
				<input bind:value={editor.name} />
			</label>
			<label>
				<div class="title">based on</div>
				<select
					value={editor.based_on}
					onchange={(e) => {
						const theme = editor.themes.find((t) => t.name === e.currentTarget.value);
						if (theme) editor.load_theme(theme);
					}}
				>
					{#each editor.themes as theme (theme.name)}
						<option value={theme.name}>{theme.name}</option>
					{/each}
				</select>
			</label>
			<div class="box gap_sm align_items_flex_start">
				<span
					class="chip"
					title={editor.is_palette_tier
						? 'moves palette letter hues - exemplar tier, stays out of registries'
						: 'moves only role bindings and levers - safe for theme registries'}
					>{editor.is_palette_tier ? 'palette-tier' : 'semantic-tier'}</span
				>
				{#if editor.dirty}
					<button type="button" onclick={() => editor.reset_all()}
						>reset all ({editor.overrides.size})</button
					>
				{/if}
			</div>
		</div>
		{#if name_collides}
			<aside>the name "{trimmed_name}" collides with an existing theme - consider renaming</aside>
		{/if}
		<div class="row gap_lg">
			<ColorSchemeInput />
			<small>edits write to the <strong>{editing_scheme}</strong> scheme's slots</small>
		</div>
	</header>

	<!-- the same knobs appear again in their axis sections below - same state,
		two densities -->
	<section class="quick_knobs panel p_md">
		<div class="knobs row flex_wrap gap_md">
			{#each quick_knobs as knob (knob.name)}
				<KnobControl
					compact
					{knob}
					value={editor.display_value(knob.name, editing_scheme)}
					changed={editor.changed(knob.name)}
					onchange={(value) => editor.set_value(knob.name, value, editing_scheme)}
					onreset={() => editor.reset(knob.name)}
				/>
			{/each}
		</div>
	</section>

	{#each axes as { axis, title } (axis)}
		{@const knobs = semantic_knobs(axis)}
		{#if knobs.length}
			<section>
				<h3>{title}</h3>
				<div class="knobs row flex_wrap gap_lg align_items_flex_end">
					{#each knobs as knob (knob.name)}
						<KnobControl
							{knob}
							value={editor.display_value(knob.name, editing_scheme)}
							changed={editor.changed(knob.name)}
							onchange={(value) => editor.set_value(knob.name, value, editing_scheme)}
							onreset={() => editor.reset(knob.name)}
						/>
					{/each}
				</div>
				{#if axis === 'color'}
					<details class="mt_lg">
						<summary
							>palette hues <small
								>(the letter slots - moving these makes the theme palette-tier)</small
							></summary
						>
						<div class="knobs row flex_wrap gap_lg align_items_flex_end">
							{#each palette_knobs as knob (knob.name)}
								<KnobControl
									{knob}
									value={editor.display_value(knob.name, editing_scheme)}
									changed={editor.changed(knob.name)}
									onchange={(value) => editor.set_value(knob.name, value, editing_scheme)}
									onreset={() => editor.reset(knob.name)}
								/>
							{/each}
						</div>
					</details>
				{/if}
			</section>
		{/if}
	{/each}

	<section>
		<h3>Output</h3>
		<p>
			The copyable <code>Theme</code> object, and the CSS it renders — the theme's own footprint.
		</p>
		<div class="rendered">
			<div class="copy">
				<CopyToClipboard text={output_ts} />
			</div>
			<Code content={output_ts} lang="ts" />
		</div>
		<div class="rendered">
			<div class="copy">
				<CopyToClipboard text={output_css} />
			</div>
			<Code content={output_css} lang="css" />
		</div>
	</section>
</div>

<style>
	.theme_editor {
		width: 100%;
	}
	header {
		margin-bottom: var(--space_lg);
	}
	.flex_wrap {
		flex-wrap: wrap;
	}
	.align_items_flex_end {
		align-items: flex-end;
	}
	.align_items_flex_start {
		align-items: flex-start;
	}
	.knobs {
		row-gap: var(--space_lg);
	}
	.rendered {
		position: relative; /* for the .copy button */
		margin-bottom: var(--space_lg);
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
