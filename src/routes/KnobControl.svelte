<script lang="ts">
	import HueInput from '@fuzdev/fuz_ui/HueInput.svelte';

	import type {ThemeKnob} from '$lib/knobs.ts';
	import {PALETTE_HUES} from '$lib/ramps.ts';

	const {
		knob,
		value,
		changed,
		onchange,
		onreset,
		compact = false,
	}: {
		knob: ThemeKnob;
		/**
		 * The value the editing scheme currently renders, `undefined` for unset
		 * hooks.
		 */
		value: string | undefined;
		changed: boolean;
		onchange: (value: string) => void;
		onreset: () => void;
		/**
		 * Renders small regardless of the knob's leverage tier, for the
		 * high-leverage strip duplicated above the granular controls.
		 */
		compact?: boolean;
	} = $props();

	// resolve `var(--hue_x)` role bindings to their default angles so the
	// slider can represent them; dragging writes the literal angle
	const resolve_numeric = (v: string | undefined): number | null => {
		if (v === undefined) return null;
		const var_match = /^var\(--hue_([a-j])\)$/u.exec(v);
		if (var_match) return PALETTE_HUES[var_match[1] as keyof typeof PALETTE_HUES];
		const n = Number(knob.kind === 'percent' ? v.replace(/%$/u, '') : v);
		return Number.isNaN(n) ? null : n;
	};

	const numeric_value = $derived(resolve_numeric(value));
	const scalar = $derived(knob.kind === 'hue' || knob.kind === 'number' || knob.kind === 'percent');
	const min = $derived(knob.range?.[0] ?? 0);
	const max = $derived(knob.range?.[1] ?? 100);
	const step = $derived(knob.step ?? 1);

	const emit_numeric = (raw: string): void => {
		const n = Number(raw);
		if (Number.isNaN(n)) return;
		onchange(knob.kind === 'percent' ? `${n}%` : String(n));
	};
</script>

<div class="knob {compact ? 'sm' : knob.leverage}" class:compact>
	<div class="knob_header row">
		<code class="knob_name">--{knob.name}</code>
		{#if changed}
			<button type="button" class="plain icon_button" title="reset to base" onclick={onreset}
				>↺</button
			>
		{/if}
	</div>
	{#if knob.kind === 'enum'}
		<select
			aria-label={knob.name}
			value={value ?? ''}
			onchange={(e) => onchange(e.currentTarget.value)}
		>
			{#each knob.values ?? [] as v (v)}
				<option value={v}>{v}</option>
			{/each}
		</select>
	{:else if knob.kind === 'hue' && numeric_value !== null}
		<HueInput bind:value={() => numeric_value ?? 0, (v) => emit_numeric(String(v))} />
	{:else if scalar && numeric_value !== null}
		<div class="row gap_sm">
			<!-- the slider clamps to the knob's safe range; the number input is the
				knowing escape past it -->
			<input
				type="range"
				aria-label="{knob.name} slider"
				{min}
				{max}
				{step}
				value={numeric_value}
				oninput={(e) => emit_numeric(e.currentTarget.value)}
			/>
			<input
				type="number"
				aria-label={knob.name}
				class="knob_number"
				{step}
				value={numeric_value}
				oninput={(e) => emit_numeric(e.currentTarget.value)}
			/>
		</div>
	{:else}
		<input
			type="text"
			aria-label={knob.name}
			value={value ?? ''}
			placeholder={knob.hook ? 'unset (per-tier fallbacks)' : ''}
			onchange={(e) => onchange(e.currentTarget.value)}
		/>
	{/if}
</div>

<style>
	.knob {
		flex: 1 1 260px;
		max-width: 420px;
	}
	.knob.compact {
		flex: 1 1 190px;
		max-width: 300px;
	}
	.knob_header {
		justify-content: space-between;
		min-height: var(--icon_size_xs);
	}
	.knob_name {
		background: transparent;
		padding: 0;
		font-size: var(--font_size_sm);
	}
	.knob_number {
		width: 90px;
		flex-shrink: 0;
	}
	input[type='range'] {
		flex: 1;
	}
</style>
