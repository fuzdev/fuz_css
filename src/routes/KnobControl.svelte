<script lang="ts">
	// TODO upstream to fuz_ui

	import HueInput from '@fuzdev/fuz_ui/HueInput.svelte';

	import { HUE_BINDING_MATCHER, type ThemeKnob } from '$lib/knobs.ts';
	import { PALETTE_HUES } from '$lib/ramps.ts';
	import {
		palette_variants,
		format_palette_gloss,
		type PaletteVariant
	} from '$lib/variable_data.ts';

	const {
		knob,
		value,
		resolved = null,
		changed,
		onchange,
		onreset,
		compact = false,
		resolve_hue = (letter) => PALETTE_HUES[letter]
	}: {
		knob: ThemeKnob;
		/**
		 * The value the editing scheme currently renders, `undefined` for unset
		 * hooks.
		 */
		value: string | undefined;
		/**
		 * The numeric resolution of `value` through derivation chains (the
		 * editor state's `resolved_value`), so a knob whose value is an
		 * expression (e.g. `border_color_chroma`'s scaled-reference default)
		 * still gets a positioned slider and a placeholder readout. `null` when
		 * unresolvable.
		 */
		resolved?: number | null;
		changed: boolean;
		onchange: (value: string) => void;
		onreset: () => void;
		/**
		 * Renders small regardless of the knob's leverage tier, for the
		 * high-leverage band duplicated above the granular controls.
		 */
		compact?: boolean;
		/**
		 * Resolves a palette letter's current hue angle, so binding displays and
		 * detachment track theme overrides instead of the shipped defaults.
		 */
		resolve_hue?: (letter: PaletteVariant) => number;
	} = $props();

	// the palette letter a bindable knob currently points at, null when detached
	const bound_letter: PaletteVariant | null = $derived.by(() => {
		if (!knob.bindable || value === undefined) return null;
		const m = HUE_BINDING_MATCHER.exec(value);
		return m ? (m[1] as PaletteVariant) : null;
	});

	// resolve `var(--hue_x)` bindings to their current angles so the slider can
	// represent them; dragging writes the literal angle
	const resolve_numeric = (v: string | undefined): number | null => {
		if (v === undefined) return null;
		const m = HUE_BINDING_MATCHER.exec(v);
		if (m) return resolve_hue(m[1] as PaletteVariant);
		let s = v;
		if (knob.kind === 'percent') s = s.replace(/%$/u, '');
		else if (knob.kind === 'time') s = s.replace(/(?<=\d)s$/u, '');
		const n = Number(s);
		return Number.isNaN(n) ? null : n;
	};

	const numeric_value = $derived(resolve_numeric(value));
	// a live swatch of the current angle for the detach ("custom") button, so it
	// tracks the hue the way the letter buttons track their palette slot;
	// same L/C as HueSwatch's gradient so hue displays read consistently
	const custom_color = $derived(`oklch(0.65 0.17 ${numeric_value ?? 0})`);
	const scalar = $derived(
		knob.kind === 'hue' || knob.kind === 'number' || knob.kind === 'percent' || knob.kind === 'time'
	);
	const min = $derived(knob.range?.[0] ?? 0);
	const max = $derived(knob.range?.[1] ?? 100);
	const step = $derived(knob.step ?? 1);

	// a derived (unpinned-expression) value the literal parse can't represent:
	// position the slider at it and show it as a placeholder, never as a value -
	// the filled number box stays the "the theme sets this" signal
	const derived_numeric = $derived(
		scalar && numeric_value === null && resolved !== null ? resolved : null
	);
	const format_step = (n: number): string => {
		const s = String(step);
		const decimals = s.includes('.') ? s.split('.')[1]!.length : 0;
		return n.toFixed(decimals);
	};

	const emit_numeric = (raw: string): void => {
		if (raw.trim() === '') return; // `Number('')` is 0 - don't slam the knob mid-edit
		const n = Number(raw);
		if (Number.isNaN(n)) return;
		onchange(knob.kind === 'percent' ? `${n}%` : knob.kind === 'time' ? `${n}s` : String(n));
	};

	const gloss_title = (letter: PaletteVariant): string =>
		`${letter} - ${format_palette_gloss(letter)}`;
</script>

<!-- @fuz-classes sm md lg -->
<div class="knob {compact ? 'sm' : knob.leverage}" class:compact>
	{#if knob.bindable}
		<!-- intent/neutral hues: a palette-letter binding picker with a
			custom-angle escape; chips write `var(--hue_x)`, custom detaches to a
			literal angle -->
		<div class="title"><code class="knob_name">--{knob.name}</code></div>
		<div class="letter_chips" role="radiogroup" aria-label="--{knob.name} binding">
			{#each palette_variants as letter (letter)}
				<button
					type="button"
					class="letter_chip palette_{letter}"
					class:selected={bound_letter === letter}
					role="radio"
					aria-checked={bound_letter === letter}
					title={gloss_title(letter)}
					onclick={() => onchange(`var(--hue_${letter})`)}
				>
					{letter}
				</button>
			{/each}
			<button
				type="button"
				class="letter_chip"
				class:selected={bound_letter === null}
				role="radio"
				aria-checked={bound_letter === null}
				style:--fill={custom_color}
				style:--text_color={custom_color}
				style:--border_color={custom_color}
				style:--outline_color={custom_color}
				title="detach from the palette and set a literal angle"
				onclick={() => onchange(String(numeric_value ?? 0))}
			>
				custom
			</button>
		</div>
		{#if bound_letter === null && numeric_value !== null}
			<HueInput bind:value={() => numeric_value ?? 0, (v) => emit_numeric(String(v))} />
		{:else if bound_letter === null}
			<!-- a detached value the slider can't represent (e.g. a calc()) -
				raw text entry as the escape hatch -->
			<input
				type="text"
				aria-label={knob.name}
				value={value ?? ''}
				onchange={(e) => onchange(e.currentTarget.value)}
			/>
		{/if}
	{:else if knob.kind === 'hue' && (numeric_value ?? derived_numeric) !== null}
		<!-- HueInput carries its own internal label; the name renders as its title -->
		<HueInput
			bind:value={() => numeric_value ?? derived_numeric ?? 0, (v) => emit_numeric(String(v))}
		>
			<code class="knob_name">--{knob.name}</code>
		</HueInput>
	{:else}
		<label>
			<div class="title"><code class="knob_name">--{knob.name}</code></div>
			{#if knob.kind === 'enum'}
				<select value={value ?? ''} onchange={(e) => onchange(e.currentTarget.value)}>
					{#if value === undefined}
						<option value="" disabled>unset</option>
					{/if}
					{#each knob.values ?? [] as v (v)}
						<option value={v}>{v}</option>
					{/each}
				</select>
			{:else if scalar && (numeric_value !== null || derived_numeric !== null)}
				<div class="row gap_sm">
					<!-- the slider clamps to the knob's safe range; the number input is the
						knowing escape past it. A derived value positions the slider but
						renders as placeholder only - dragging or typing pins it -->
					<input
						type="range"
						class="flex:1"
						{min}
						{max}
						{step}
						value={numeric_value ?? derived_numeric}
						oninput={(e) => emit_numeric(e.currentTarget.value)}
					/>
					<input
						type="number"
						aria-label={derived_numeric !== null
							? `${knob.name} (derived ${format_step(derived_numeric)})`
							: knob.name}
						title={derived_numeric !== null ? `derived: ${value} - drag or type to pin` : undefined}
						class="knob_number"
						{step}
						value={numeric_value ?? ''}
						placeholder={derived_numeric !== null ? format_step(derived_numeric) : undefined}
						oninput={(e) => emit_numeric(e.currentTarget.value)}
					/>
				</div>
			{:else}
				<input
					type="text"
					value={value ?? ''}
					placeholder={knob.hook ? 'unset (falls back in style.css)' : ''}
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
			aria-label="reset to base"
			onclick={onreset}
		>
			↺
		</button>
	{/if}
</div>

<style>
	.knob {
		/* control-column sizing; no distance token sits near these */
		--knob_basis: 260px;
		--knob_max_width: 420px;
		position: relative; /* for the .knob_reset button */
		flex: 1 1 var(--knob_basis);
		max-width: var(--knob_max_width);
	}
	.knob.compact {
		--knob_basis: 190px;
		--knob_max_width: 300px;
	}
	.knob:has(.knob_reset) .title {
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
	.letter_chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space_xs2);
	}
	.letter_chip {
		min-height: 0;
		padding: var(--space_xs2) var(--space_xs);
		font-size: var(--font_size_sm);
		font-family: var(--font_family_mono);
	}
</style>
