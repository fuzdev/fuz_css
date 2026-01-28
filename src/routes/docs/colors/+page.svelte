<script lang="ts">
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import {get_tome_by_name} from '@fuzdev/fuz_ui/tome.js';
	import TomeLink from '@fuzdev/fuz_ui/TomeLink.svelte';
	import MdnLink from '@fuzdev/fuz_ui/MdnLink.svelte';
	import ColorSchemeInput from '@fuzdev/fuz_ui/ColorSchemeInput.svelte';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';

	import HueSwatch from '$routes/docs/colors/HueSwatch.svelte';
	import ColorSwatch from '$routes/docs/colors/ColorSwatch.svelte';
	import {color_variants} from '$lib/variable_data.js';

	const LIBRARY_ITEM_NAME = 'colors';

	const tome = get_tome_by_name(LIBRARY_ITEM_NAME);

	const computed_styles =
		typeof window === 'undefined' ? null : window.getComputedStyle(document.documentElement);

	// TODO button to add an inline hue input for runtime modification of the theme

	// TODO maybe add this to the variable data as comments
	// Note: This array must stay in sync with color_variants (a-j = 10 elements)
	const descriptions = [
		'primary',
		'success',
		'error/danger',
		'secondary/accent',
		'tertiary/highlight',
		'quaternary/muted',
		'quinary/decorative',
		'senary/caution',
		'septenary/info',
		'octonary/flourish',
	];
</script>

<TomeContent {tome}>
	<section>
		<p>
			fuz_css provides color <TomeLink name="variables" /> that adapt to the
			<MdnLink path="Web/CSS/color-scheme" />, working naturally in both light and dark modes. Each
			<TomeLink name="themes">theme</TomeLink> can customize the 10 hues (a-j) and their intensity variants
			(00-100).
		</p>
		<p>
			Hues use letters so themes can reassign colors without breaking semantics -- "a" is blue by
			default but could be any color. Each hue has 13 intensity variants (00,05,10,20,...90,95,100)
			tuned independently for visual balance across color schemes.
		</p>
	</section>
	<TomeSection>
		<TomeSectionHeader text="Hue variables" />
		<p>
			Hue variables contain a single <MdnLink path="Web/CSS/hue" /> number. Each color variable combines
			a hue variable with saturation and lightness values for light and dark modes.
		</p>
		<p>
			Hue variables therefore provide a single source of truth that's easy to theme, but to achieve
			pleasing results, setting the hue alone is not always sufficient. Custom colors generally need
			tuning for saturation and lightness.
		</p>
		<p>
			Hue variables are also useful to construct custom colors not covered by the color variables.
			For example, fuz_css's base stylesheet uses <code>hue_a</code> for the semi-transparent
			<code>::selection</code>. (try selecting some text --
			<span class="color_a_50">same hue!</span>)
		</p>
		<p>Hue variables are the same in both light and dark modes (non-adaptive).</p>
		<ul class="palette unstyled">
			{#each color_variants as color_name, i (color_name)}
				<HueSwatch {color_name} {computed_styles} description={descriptions[i]!} />
			{/each}
		</ul>
	</TomeSection>
	<section class="box">
		<ColorSchemeInput />
	</section>
	<TomeSection>
		<TomeSectionHeader text="Color variables" />
		<p>
			There are 13 intensity variants per hue (00, 05, 10, 20, ..., 80, 90, 95, 100), from subtle to
			bold. The 50 variant of each color is used as the base for things like
			<TomeLink name="buttons" />.
		</p>
		<p>
			Unlike the <TomeLink name="shading">shade</TomeLink> and
			<TomeLink name="typography" hash="Text-colors">text</TomeLink> scales (which are separate), color
			variables can be used for both text and backgrounds via utility classes:
			<code>.color_a_50</code> sets text color, <code>.bg_a_50</code> sets background color.
		</p>
		<p>Each color exists in two forms:</p>
		<ul>
			<li>
				<strong>Adaptive</strong> (<code>color_a_50</code>) — switches between light and dark values
				based on color scheme. Use for most UI work.
			</li>
			<li>
				<strong>Absolute</strong> (<code>color_a_50_light</code>, <code>color_a_50_dark</code>) —
				stable values that never change. Use when you need a pinned color.
			</li>
		</ul>
		<TomeSection>
			<TomeSectionHeader tag="h3" text="Adaptive colors" />
			<p>
				The colors you'll use most often. They automatically adjust to maintain visual consistency
				across color schemes. Note that these values differ between light and dark modes! See the
				discussion above for why.
			</p>
			<ul class="palette unstyled pt_xl2">
				{#each color_variants as color_name (color_name)}
					<ColorSwatch {color_name} {computed_styles} />
				{/each}
			</ul>
		</TomeSection>
		<section class="box">
			<ColorSchemeInput />
		</section>
		<TomeSection>
			<TomeSectionHeader tag="h3" text="Absolute colors" />
			<p>
				Sometimes you need a color that <em>doesn't</em> adapt — logos, charts, color-coded data, or elements
				that must match across screenshots. Every adaptive color has two absolute variants:
			</p>
			<ul>
				<li><code>color_a_50_light</code> — the value used in light mode</li>
				<li><code>color_a_50_dark</code> — the value used in dark mode</li>
			</ul>
			<p>
				These are stable regardless of color scheme. Light and dark variants are tuned independently
				for visual balance -- achieving equivalent appearance across color schemes requires
				different saturation and lightness values.
			</p>
			<ul class="palette unstyled pt_xl2">
				{#each color_variants as color_name (color_name)}
					<ColorSwatch {color_name} {computed_styles} absolute />
				{/each}
			</ul>
		</TomeSection>
	</TomeSection>
	<section class="box">
		<ColorSchemeInput />
	</section>
</TomeContent>

<style>
	.palette {
		width: 100%;
	}
</style>
