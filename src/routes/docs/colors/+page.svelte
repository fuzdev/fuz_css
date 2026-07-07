<script lang="ts">
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import {tome_get_by_slug} from '@fuzdev/fuz_ui/tome.ts';
	import TomeLink from '@fuzdev/fuz_ui/TomeLink.svelte';
	import MdnLink from '@fuzdev/fuz_ui/MdnLink.svelte';
	import ColorSchemeInput from '@fuzdev/fuz_ui/ColorSchemeInput.svelte';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';
	import Code from '@fuzdev/fuz_code/Code.svelte';

	import HueSwatch from './HueSwatch.svelte';
	import ColorSwatch from './ColorSwatch.svelte';
	import {color_variants} from '$lib/variable_data.ts';

	const LIBRARY_ITEM_NAME = 'colors';

	const tome = tome_get_by_slug(LIBRARY_ITEM_NAME);

	const computed_styles =
		typeof window === 'undefined' ? null : window.getComputedStyle(document.documentElement);

	// TODO button to add an inline hue input for runtime modification of the theme

	// letter glosses: color name plus the default role binding where one exists
	// Note: This array must stay in sync with color_variants (a-j = 10 elements)
	const descriptions = [
		'blue · default accent',
		'green · default positive',
		'red · default negative',
		'purple',
		'yellow',
		'brown · default neutral',
		'pink',
		'orange · default caution',
		'cyan · default info',
		'teal',
	];
</script>

<TomeContent {tome}>
	<section>
		<p>
			fuz_css's colors are <em>derived</em>: around a dozen knobs produce every color <TomeLink
				slug="variables"
			/> in pure CSS, in the
			<MdnLink path="Web/CSS/color_value/oklch" /> colorspace, adapting to the
			<MdnLink path="Web/CSS/color-scheme" /> automatically. OKLCH lightness is perceptually uniform
			-- equal lightness reads equally light in every hue -- so rotating a hue knob is safe:
			contrast and visual weight hold, which is what makes <TomeLink slug="themes">themes</TomeLink
			> a small set of knob values instead of hundreds of hand-tuned stops.
		</p>
		<p>
			Hues use letters so themes can reassign colors without breaking semantics -- "a" is blue by
			default but could be any color. Meaning attaches through the role knobs layered on top:
			<code>--hue_accent</code> (links, focus, selection, selected states) defaults to
			<code>--hue_a</code>, <code>--hue_negative</code> to <code>--hue_c</code>, and so on. Retarget
			a role to move just that meaning; rotate a letter to move the palette.
		</p>
	</section>
	<TomeSection>
		<TomeSectionHeader text="Curve knobs" />
		<p>The knobs are the theme API, from highest leverage down:</p>
		<ul>
			<li>
				<code>--hue_a</code> … <code>--hue_j</code> -- OKLCH hue angles for the 10 palette slots
			</li>
			<li>
				<code>--hue_neutral</code> + <code>--neutral_chroma</code> -- the temperature and strength
				of every surface, text, border, and shadow tint
			</li>
			<li>
				<code>--chroma_scale</code> -- one multiplier from grayscale (0) through calm (1) to vivid
				(above 1, knowingly clipping the weakest hues)
			</li>
			<li>
				<code>--hue_shift</code> -- degrees of hue rotation across each ramp for painterly
				warm-light/cool-shadow character (default 0)
			</li>
			<li>
				role hues -- <code>--hue_accent</code>, <code>--hue_positive</code>,
				<code>--hue_negative</code>, <code>--hue_caution</code>, <code>--hue_info</code>
			</li>
			<li>
				lightness ramps -- <code>--palette_lightness_00</code>/<code>_100</code>/<code>_curve</code>
				(and the same trio for <code>shade_</code> and <code>text_</code>): the endpoint stops plus
				a curve exponent bending the ramp between them, per color scheme
			</li>
			<li>
				chroma curve -- <code>--palette_chroma_min</code>/<code>_max</code>/<code>_curve</code>: a
				mid-peaked curve, clamped per stop by gamut caps computed from the worst hue
			</li>
		</ul>
		<p>
			Every intermediate value these produce is also its own variable (<code
				>--palette_lightness_30</code
			>, <code>--palette_chroma_50</code>, …), so a theme can pin any individual stop as a surgical
			escape hatch -- but the knobs come first.
		</p>
		<Code
			lang="css"
			content={`/* a warm, slightly vivid theme in three moves */
:root {
	--hue_neutral: 55;
	--neutral_chroma: 0.03;
	--chroma_scale: 1.15;
}`}
		/>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Hue variables" />
		<p>
			Hue variables contain a single OKLCH <MdnLink path="Web/CSS/hue" /> angle. Because lightness
			and chroma are shared across all hues at each stop, the scales are interchangeable -- setting
			a hue alone is enough, no per-hue tuning required.
		</p>
		<p>
			Hue variables are also useful to construct custom colors not covered by the palette. For
			example, fuz_css's selection color derives from <code>--hue_accent</code> (try selecting some
			text --
			<span class="palette_a_50">same hue!</span>)
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
		<TomeSectionHeader text="Palette variables" />
		<p>
			There are 13 intensity variants per hue (00, 05, 10, 20, ..., 80, 90, 95, 100), from subtle to
			bold. The 50 variant of each color is used as the base for things like
			<TomeLink slug="buttons" />.
		</p>
		<p>
			Unlike the <TomeLink slug="shading">shade</TomeLink> and
			<TomeLink slug="typography" hash="Text-colors">text</TomeLink> scales (which are separate),
			palette variables can be used for both text and backgrounds via utility classes:
			<code>.palette_a_50</code> sets text color, <code>.bg_a_50</code> sets background color.
		</p>
		<p>
			Palette stops are adaptive: they switch between light and dark ramps based on color scheme.
			For a color that doesn't adapt, write the literal color or define one custom property -- the
			old generated absolute variants (<code>color_a_50_light</code>-style) were removed with the
			OKLCH migration.
		</p>
		<ul class="palette unstyled pt_xl2">
			{#each color_variants as color_name (color_name)}
				<ColorSwatch {color_name} />
			{/each}
		</ul>
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
