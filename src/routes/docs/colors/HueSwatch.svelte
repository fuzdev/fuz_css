<script lang="ts">
	import StyleVariableButton from '$routes/StyleVariableButton.svelte';

	const {
		color_name,
		computed_styles,
		width = 48,
		height = 48,
		description,
	}: {
		color_name: string;
		computed_styles: CSSStyleDeclaration | null;
		width?: number;
		height?: number;
		description: string;
	} = $props();

	const get_color_hue_string = (name: string) => computed_styles?.getPropertyValue('--' + name);

	const variable_name = $derived(`hue_${color_name}`);
	const hue = $derived(Number(get_color_hue_string(variable_name)));
</script>

<li style:--hue="var(--{variable_name})">
	<div class="color" style:width="{width}px" style:height="{height}px"></div>
	<div class="text">
		<StyleVariableButton name={variable_name} />
		<div class="hue">{hue}</div>
		<small class="description">{description}</small>
	</div>
</li>

<style>
	li {
		display: flex;
		align-items: stretch;
		font-family: var(--font_family_mono);
		padding: var(--space_xs2);
	}
	li:hover {
		background-color: var(--surface);
	}
	.text {
		display: flex;
		align-items: center;
		flex: 1;
		padding-left: var(--space_sm);
	}
	.hue {
		width: 55px;
		padding-left: var(--space_sm);
	}
	.color {
		background: linear-gradient(-90deg, hsl(var(--hue), 100%, 50%), hsl(var(--hue), 0%, 50%));
		position: relative;
		border-radius: 50%;
		overflow: hidden;
		flex-shrink: 0;
	}
	.color::before {
		content: '';
		display: block;
		position: absolute;
		inset: 0;
		background: linear-gradient(#fff8, transparent 50%, transparent);
		mix-blend-mode: screen;
	}
	.color::after {
		content: '';
		display: block;
		position: absolute;
		inset: 0;
		background: linear-gradient(transparent 50%, #0008);
		mix-blend-mode: multiply;
	}
	small {
		display: flex;
	}
	.description {
		font-family: var(--font_family_sans);
	}
</style>
