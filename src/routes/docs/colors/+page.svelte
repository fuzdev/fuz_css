<script lang="ts">
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import { tome_get_by_slug } from '@fuzdev/fuz_ui/tome.ts';
	import TomeLink from '@fuzdev/fuz_ui/TomeLink.svelte';
	import MdnLink from '@fuzdev/fuz_ui/MdnLink.svelte';
	import ColorSchemeInput from '@fuzdev/fuz_ui/ColorSchemeInput.svelte';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';
	import Code from '@fuzdev/fuz_code/Code.svelte';

	import HueSwatch from './HueSwatch.svelte';
	import ColorSwatch from './ColorSwatch.svelte';
	import {
		palette_variants,
		intent_variants,
		palette_glosses,
		format_palette_gloss,
		type IntentVariant,
		type PaletteVariant
	} from '$lib/variable_data.ts';

	const LIBRARY_ITEM_NAME = 'colors';

	const tome = tome_get_by_slug(LIBRARY_ITEM_NAME);

	// the letter each intent hue binds to by default
	const intent_letter = (intent: IntentVariant): PaletteVariant =>
		palette_variants.find((letter) => palette_glosses[letter].binding === intent)!;

	// TODO button to add an inline hue input for runtime modification of the theme
</script>

<TomeContent {tome}>
	<section>
		<p>
			fuz_css's colors are <em>derived</em>: a handful of high-leverage
			<TomeLink slug="colors" hash="Color-knobs">knobs</TomeLink> produce every color
			<TomeLink slug="variables" /> in pure CSS, in the <MdnLink path="Web/CSS/color_value/oklch" />
			colorspace, adapting to the <MdnLink path="Web/CSS/color-scheme" /> automatically. OKLCH
			lightness is perceptually uniform (equal lightness reads equally light in every hue), so
			rotating a hue knob is safe: contrast and visual weight hold.
		</p>
		<p>
			Hues use letters so themes can reassign colors without breaking semantics ("a" is blue by
			default but could be any color). Meaning attaches through the intent knobs layered on top:
			<code>--hue_accent</code> (links, focus, selection, selected states - what other systems call
			"primary") defaults to <code>--hue_a</code>, <code>--hue_negative</code> to
			<code>--hue_c</code>, and so on. Retarget an intent to move just that meaning; rotate a letter
			to move the palette.
		</p>
	</section>
	<TomeSection>
		<TomeSectionHeader text="Hue variables" />
		<p>
			Hue variables contain a single OKLCH <MdnLink path="Web/CSS/hue" /> angle. Because lightness
			and chroma are shared across all hues at each stop, the scales are interchangeable: setting a
			hue alone is enough, no per-hue tuning required. The one deliberate exception is the per-slot
			chroma multiplier - the brown slot ships muted because no hue angle renders brown at full
			palette chroma.
		</p>
		<p>
			Hue variables are also useful to construct custom colors not covered by the palette. For
			example, fuz_css's selection color derives from <code>--hue_accent</code> (try selecting some
			text - <span class="accent_60">same hue!</span>).
		</p>
		<p>Hue variables are the same in both light and dark modes (non-adaptive).</p>
		<ul class="palette unstyled">
			{#each palette_variants as letter (letter)}
				<HueSwatch {letter} description={format_palette_gloss(letter)} />
			{/each}
		</ul>
	</TomeSection>
	<section class="box">
		<ColorSchemeInput />
	</section>
	<TomeSection>
		<TomeSectionHeader text="Palette variables" />
		<p>
			Each hue has intensity variants from subtle to bold (00, 05, 10, 20, ..., 80, 90, 95, 100),
			with 50 at the middle of the ramp. The 60 variant is the text-safe stop: links, the labels of
			<code>.palette_X</code> <TomeLink slug="buttons" /> and <TomeLink slug="chips" />, and a
			selected <code>.palette_X</code> button's fill use it, and <code>check_theme</code> gates
			those pairings at AA.
		</p>
		<p>
			Palette variables work for both text and backgrounds through utility classes:
			<code>.color_a_50</code> sets the text color and <code>.bg_a_50</code> the background, and the
			<a href="#Intent-variables">intent scales</a> below do the same. The
			<TomeLink slug="shading">shade</TomeLink> and
			<TomeLink slug="typography" hash="Text-colors">text</TomeLink> scales are split by role
			instead, one for surfaces and one for text.
		</p>
		<p>
			Palette stops are adaptive: they switch between light and dark ramps based on color scheme.
			There are no absolute variants; for a color that doesn't adapt, write the literal color or
			define one custom property.
		</p>
		<ul class="palette unstyled pt_xl2">
			{#each palette_variants as letter (letter)}
				<ColorSwatch prefix="palette_{letter}" />
			{/each}
		</ul>
	</TomeSection>
	<section class="box">
		<ColorSchemeInput />
	</section>
	<TomeSection>
		<TomeSectionHeader text="Intent variables" />
		<p>
			Intent scales name colors by meaning: <code>--accent_NN</code>, <code>--positive_NN</code>,
			<code>--negative_NN</code>, <code>--caution_NN</code>, and <code>--info_NN</code>, with the
			palette's stops, derived through the same ramps from each intent's hue knob
			(<code>--hue_accent</code> and the rest). Each hue binds to a palette letter by default, so an
			intent scale matches its letter's until a theme rebinds it:
			{#each intent_variants as intent, i (intent)}
				{i ? ', ' : ''}<code>{intent}</code> → <code>{intent_letter(intent)}</code>
			{/each}.
		</p>
		<p>
			Reach for an intent when the color carries meaning, like an error or a success, and for a
			letter when it's only a color, so a theme can move the meaning without recoloring every use of
			the letter. The classes follow the palette's: <code>.positive_50</code> sets the text color
			and <code>.bg_positive_50</code> the background. Border, outline, and shadow classes exist
			only for the letters, so reach an intent there with a literal like
			<code>border-color:var(--negative_50)</code>.
		</p>
		<ul class="palette unstyled pt_xl2">
			{#each intent_variants as intent (intent)}
				<ColorSwatch prefix={intent} />
			{/each}
		</ul>
	</TomeSection>
	<section class="box">
		<ColorSchemeInput />
	</section>
	<TomeSection>
		<TomeSectionHeader text="Color knobs" />
		<p>
			The knobs are the <TomeLink slug="themes">theme</TomeLink> API, and the first few carry most
			themes:
		</p>
		<ul>
			<li>
				intent hues - <code>--hue_accent</code>, <code>--hue_positive</code>,
				<code>--hue_negative</code>, <code>--hue_caution</code>, <code>--hue_info</code> - each
				pointing a meaning at a palette letter (<code>var(--hue_c)</code>) or a literal angle, and
				deriving its full stop scale (<code>--accent_00</code> … <code>--accent_100</code>)
			</li>
			<li>
				<code>--hue_neutral</code> + <code>--neutral_chroma</code> - the temperature and strength of
				every surface, text, border, and shadow tint (the neutral intent, whose scales are the shade
				and text ramps)
			</li>
			<li>
				<code>--chroma_scale</code> - one multiplier from grayscale (0) through calm (1) to vivid
				(above 1, deliberately clipping the weakest hues)
			</li>
			<li>
				lightness ramps - <code>--palette_lightness_00</code>/<code>_100</code>/<code>_curve</code>
				(and the same trio for <code>shade_</code> and <code>text_</code>): the endpoint stops plus
				a curve exponent bending the ramp between them, per color scheme
			</li>
			<li>
				chroma curve - <code>--palette_chroma_min</code>/<code>_max</code> and
				<code>--chroma_curve</code>: a mid-peaked curve, clamped per stop by gamut caps computed
				from the worst hue
			</li>
			<li>
				per-slot chroma multipliers - <code>--palette_a_chroma_scale</code> …
				<code>--palette_j_chroma_scale</code> and intent twins (<code>--accent_chroma_scale</code>,
				…), each multiplying one slot's chroma under <code>--chroma_scale</code>. A binding shares
				only the hue angle, so an intent bound to the muted brown slot needs its twin set too, and
				<code>validate_theme</code> warns when it isn't
			</li>
			<li>
				<code>--hue_a</code> … <code>--hue_j</code> - the palette letters' angles. Rotating one
				recolors every use of that letter, so registered themes leave them alone and move intents
				instead
			</li>
		</ul>
		<p>
			Every intermediate value these produce is also its own variable
			(<code>--palette_lightness_30</code>, <code>--palette_chroma_50</code>, …), so a theme can pin
			any individual stop as an escape hatch.
		</p>
		<Code
			lang="ts"
			content={`// a warm, slightly vivid theme in three moves
const warm_theme: Theme = {
	name: 'warm',
	variables: [
		{name: 'hue_neutral', light: '55'},
		{name: 'neutral_chroma', light: '0.03'},
		{name: 'chroma_scale', light: '1.15'},
	],
};`}
		/>
	</TomeSection>
</TomeContent>

<style>
	.palette {
		width: 100%;
	}
</style>
