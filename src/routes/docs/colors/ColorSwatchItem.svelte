<script lang="ts">
	import {hsl_to_hex_string, hsl_to_rgb, parse_hsl_string} from '@fuzdev/fuz_util/colors.js';
	import {themer_context} from '@fuzdev/fuz_ui/themer.svelte.js';

	import StyleVariableButton from '$routes/StyleVariableButton.svelte';

	const {
		intensity,
		color_name,
		computed_styles,
	}: {
		intensity: number;
		color_name: string;
		computed_styles: CSSStyleDeclaration | null;
	} = $props();

	const themer = themer_context.get();

	const name = $derived(`color_${color_name}_${intensity}`);
	const value = $derived.by(() => {
		// handle the user switching between light/dark mode
		// TODO could refactor to a class for variables
		themer.color_scheme;
		return computed_styles?.getPropertyValue('--' + name);
	});
	const hsl = $derived(value && parse_hsl_string(value));
</script>

<li style:--bg_color="var(--{name})">
	<div class="color"></div>
	<div class="text">
		<StyleVariableButton {name} />
		<div class="hex">{hsl && hsl_to_hex_string(...hsl)}</div>
		<div class="hsl">{value}</div>
		<div class="rgb">rgb({hsl && hsl_to_rgb(...hsl).join(' ')})</div>
	</div>
</li>

<style>
	li {
		display: flex;
		align-items: stretch;
		font-family: var(--font_family_mono);
		min-height: var(--input_height_sm);
	}
	li:hover {
		background-color: var(--bg);
	}
	.text {
		display: flex;
		align-items: center;
		flex: 1;
		padding-left: var(--space_sm);
	}
	.hex {
		width: 73px;
		font-size: var(--font_size_sm);
		padding-left: var(--space_sm);
	}
	.hsl {
		width: 149px;
		font-size: var(--font_size_sm);
		padding-left: var(--space_sm);
	}
	.rgb {
		font-size: var(--font_size_sm);
		padding-left: var(--space_sm);
	}
	.color {
		width: 100px;
		min-width: 50px;
		background-color: var(--bg_color);
		color: hsl(210 55% 62%);
	}
	@media (max-width: 630px) {
		.text {
			flex-direction: column;
			align-items: flex-start;
			padding: var(--space_sm);
		}
	}
</style>
