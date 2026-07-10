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
	{#if knob.kind === 'hue' && numeric_value !== null}
		<!-- HueInput carries its own internal label; the name renders as its title -->
		<HueInput bind:value={() => numeric_value ?? 0, (v) => emit_numeric(String(v))}>
			<code class="knob_name">--{knob.name}</code>
		</HueInput>
	{:else}
		<label>
			<div class="title"><code class="knob_name">--{knob.name}</code></div>
			{#if knob.kind === 'enum'}
				<select value={value ?? ''} onchange={(e) => onchange(e.currentTarget.value)}>
					{#each knob.values ?? [] as v (v)}
						<option value={v}>{v}</option>
					{/each}
				</select>
			{:else if scalar && numeric_value !== null}
				<div class="row gap_sm">
					<!-- the slider clamps to the knob's safe range; the number input is the
						knowing escape past it -->
					<input
						type="range"
						class="flex:1"
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
					value={value ?? ''}
					placeholder={knob.hook ? 'unset (per-tier fallbacks)' : ''}
					onchange={(e) => onchange(e.currentTarget.value)}
				/>
			{/if}
		</label>
	{/if}
	{#if changed}
		<!-- a sibling of the label, not a child - a preceding button inside it
			would become the label's implicit control -->
		<button
			type="button"
			class="plain icon_button sm knob_reset"
			title="reset to base"
			onclick={onreset}>↺</button
		>
	{/if}
</div>

<style>
	.knob {
		position: relative; /* for the .knob_reset button */
		flex: 1 1 260px;
		max-width: 420px;
	}
	.knob.compact {
		flex: 1 1 190px;
		max-width: 300px;
	}
	.title {
		/* keep long names clear of the reset button (an sm icon_button,
			--input_height under sm = --space_xl4) */
		padding-right: var(--space_xl4);
	}
	.knob_reset {
		position: absolute;
		top: 0;
		right: 0;
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
</style>
