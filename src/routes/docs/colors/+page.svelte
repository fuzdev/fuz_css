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
	import UnfinishedImplementationWarning from '$routes/docs/UnfinishedImplementationWarning.svelte';
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
	<TomeSection>
		<TomeSectionHeader text="Color semantics" />
		<p>
			Fuz CSS provides a palette of color and hue <TomeLink name="variables" /> designed to support concise
			authoring in light and dark modes, as well as straightforward <TomeLink name="themes"
				>theming</TomeLink
			> by both developers and end-users at runtime. The colors have more semantics than just plain values,
			so they automatically adapt to dark mode and custom themes, at the cost of having different values
			depending on color scheme and theme.
		</p>
		<h4>Adapting colors to dark mode</h4>
		<p>
			A color's subjective appearance depends on the context in which it's viewed, especially the
			surrounding colors and values. Fuz CSS's semantic colors are designed to work across color
			schemes, so each Fuz CSS color <TomeLink name="variables">variable</TomeLink> has two values, one
			for light and one for dark mode. The exceptions are the lightest (1) and darkest (9) variants, although
			this may change if it yields better results.
		</p>
		<h4>Custom themes</h4>
		<p>
			Instead of "blue" and "red", colors are named with letters like "a" and "b", so you can change
			the primary "a" from blue to any color in a theme without breaking the name-to-color
			correspondence everywhere. This also flexibly handles more colors and cases than using names
			like "primary", and although it takes some learning, it's a simple pattern to remember.
			("primary" and its ilk require learning too!)
		</p>
		<p>
			A downside of this approach is that changing a color like the primary "a" affects the many
			places it's used. Sometimes you may want to change the color of a specific element or state,
			not all the things. In those cases, use plain CSS and optionally Fuz CSS variables. Compared
			to most libraries, Fuz CSS provides fewer handles for granular color customizations, but the
			benefits include consistency, efficiency, DRY authoring, and ease of app-wide theming.
		</p>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Caveats" />
		<p>
			For performance reasons, Fuz CSS does not currently have an extensive set of variants, like
			specialized states for elements or color values like "blue". Each of the 7 hues has 9 HSL
			color values (e.g. <code>hsl(120 55% 36%)</code>) and 9 HSL component values (e.g.
			<code>120 55% 36%</code>, useful to efficiently apply custom alpha), handling most cases, and
			the base colors can be customized with platform APIs like the <MdnLink
				path="Web/CSS/color_value/color-mix"
			/> CSS function.
		</p>
		<p>
			Variants will be expanded when Fuz CSS includes a Vite plugin or other build tooling for
			optimization. A downside of removing unused styles is that they won't be available to your
			end-users at runtime. We'll probably end up with an interpreted language like Tailwind's
			just-in-time compiler.
		</p>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Hue variables" />
		<UnfinishedImplementationWarning>
			Colors are unfinished. I'm thinking of adding orange and cyan for a total of 9 hues. Fuz CSS
			may also change from HSL to <MdnLink
				path="https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch"
			/>.
		</UnfinishedImplementationWarning>
		<p>
			Hue variables contain a single <MdnLink path="Web/CSS/hue" /> number. Each color variable combines
			a hue variable with hardcoded saturation and lightness values for light and dark modes.
		</p>
		<p>
			Hue variables therefore provide a single source of truth that's easy to theme, but to achieve
			pleasing results, setting the hue alone is not always sufficient. Custom colors will often
			require you to set per-variable saturation and lightness values.
		</p>
		<p>
			Hue variables are also useful to construct custom colors not covered by the color variables.
			For example, Fuz CSS's base stylesheet uses <code>hue_a</code> for the semi-transparent
			<code>::selection</code>. (try selecting some text -
			<span class="color_a_5">same hue!</span>)
		</p>
		<p>Unlike the color variables, the hue variables are the same in both light and dark modes.</p>
		<ul class="palette unstyled">
			{#each color_variants as color_name, i (color_name)}
				<HueSwatch {color_name} {computed_styles} description={descriptions[i]!} />
			{/each}
		</ul>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Color variables" />
		<p>
			There are 9 variables per color, numbered 1 to 9, lightest to darkest. The 5th variable of
			each color is used as the base for things like <TomeLink name="buttons" />.
		</p>
		<p>
			Note that these values differ between light and dark modes! See the discussion above for why.
		</p>
		<p>These colors were eyeballed by a programmer, and will change :]</p>
		<ul class="palette unstyled pt_xl2">
			{#each color_variants as color_name (color_name)}
				<ColorSwatch {color_name} {computed_styles} />
			{/each}
		</ul>
	</TomeSection>
	<div class="box width_100 mb_lg">
		<ColorSchemeInput />
	</div>
</TomeContent>

<style>
	.palette {
		width: 100%;
	}
</style>
