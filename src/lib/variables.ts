/**
 * The default style variables - the `base` theme's values, and the only
 * declaration of what variable names exist.
 *
 * The module exports a single array, and holds no data of its own: families
 * whose members follow one template are built by loop from the variant lists
 * and value tables in `variable_data.ts` and the emitters in `ramps.ts`, then
 * spread into `default_variables` in place - array order is the order the CSS
 * renders in, so a family's spread sits where its members used to be
 * declared. What lives here is the assembly: the loop templates, the units
 * and `calc()` wrappers the tables' unitless numbers get dressed in, and the
 * one-off variables that belong to no family.
 *
 * @module
 */

import type { StyleVariable } from './variable.ts';
import {
	BORDER_RADII,
	DISTANCES,
	DURATIONS,
	FONT_SIZES,
	ICON_SIZES,
	LINE_HEIGHTS,
	OVERLAY_ALPHAS,
	SHADOW_ALPHAS,
	SHADOW_GEOMETRY,
	SPACE_SIZES,
	numeric_scale_variants,
	palette_variants,
	palette_glosses,
	intent_variants,
	font_size_variants,
	line_height_variants,
	space_variants,
	distance_variants,
	border_radius_variants,
	border_width_variants,
	icon_size_variants,
	shadow_size_variants,
	duration_variants,
	type ColorSchemeVariant,
	type IntentVariant,
	type NumericScaleVariant,
	type PaletteVariant,
	type ShadowSizeVariant
} from './variable_data.ts';
import {
	NEUTRAL_CHROMA,
	BORDER_CHROMA_MULTIPLIER,
	BORDER_COLOR_LIGHTNESS,
	PALETTE_CHROMA_KNOBS,
	PALETTE_CHROMA_MULTIPLIERS,
	PALETTE_HUES,
	PALETTE_LIGHTNESS_KNOBS,
	SHADE_LIGHTNESS_KNOBS,
	TEXT_LIGHTNESS_KNOBS,
	render_border_color_stop_css,
	render_chroma_shape_css,
	render_chroma_stop_css,
	render_shadow_tint_css,
	PALETTE_CHROMA_CAPS,
	render_lightness_stop_css,
	render_neutral_stop_css,
	render_ramp_color_css,
	type LightnessRampKnobs,
	type RampFamily
} from './ramps.ts';

/*

TODO lots of things here to address:

- the alpha families (`border_color_*`, `fg_*`/`bg_*`, `darken_*`/`lighten_*`, shadows)
	are alpha by design, but the base-case compositing cost is unmeasured
	- maybe move all shadows out of the base theme?
- lots of inconsistencies, like the relationship between base and modified values
	- in some cases the base value is just a value, in other cases it's the "current" value


*/

/*

family builders - the loop templates the uniform families are built from

*/

// the stops between a ramp's endpoints; 00/100 are the endpoint knobs themselves
const derived_lightness_stops: Array<NumericScaleVariant> = numeric_scale_variants.slice(1, -1);

// a lightness ramp's endpoint/curve knobs followed by its derived stops
const lightness_ramp_variables = (
	family: RampFamily,
	knobs: Record<ColorSchemeVariant, LightnessRampKnobs>
): Array<StyleVariable> => [
	{
		name: `${family}_lightness_00`,
		light: String(knobs.light.lightness_00),
		dark: String(knobs.dark.lightness_00)
	},
	{
		name: `${family}_lightness_100`,
		light: String(knobs.light.lightness_100),
		dark: String(knobs.dark.lightness_100)
	},
	{
		name: `${family}_lightness_curve`,
		light: String(knobs.light.curve),
		dark: String(knobs.dark.curve)
	},
	...derived_lightness_stops.map((stop) => ({
		name: `${family}_lightness_${stop}`,
		light: render_lightness_stop_css(family, stop)
	}))
];

// a full 13-stop color scale for one hue slot - a palette letter or an intent
const ramp_color_variables = (slot: PaletteVariant | IntentVariant): Array<StyleVariable> =>
	numeric_scale_variants.map((stop) => ({
		name: `${slot}_${stop}`,
		light: render_ramp_color_css(slot, stop)
	}));

// a neutral (shade/text) scale, riding the palette's chroma shape
const neutral_scale_variables = (family: Exclude<RampFamily, 'palette'>): Array<StyleVariable> =>
	numeric_scale_variants.map((stop) => ({
		name: `${family}_${stop}`,
		light: render_neutral_stop_css(family, stop)
	}));

/*

colors

The color system is derived: the hue knobs plus a handful of curve knobs
produce every palette/shade/text stop at computed-value time in pure CSS.
The fitted default knob values, the formulas, and the CSS emitters live in
`ramps.ts` (a faithful port of the previous HSL palette); tests gate the
defaults for gamut, ramp monotonicity, and contrast.

Layers, each derivable from the one above and each overridable per stop:
curve knobs → ramp stops (`--palette_lightness_50`, `--palette_chroma_50`)
→ color stops (`--palette_a_50`) → utility classes (`.color_a_50`).

*/

const slot_chroma_summary = "the slot's chroma multiplier under the global chroma_scale";
const intent_chroma_summary =
	"the intent's chroma multiplier; set it when binding the intent to a muted palette slot";

/*

darken/lighten - non-adaptive alpha overlays

Color-scheme-agnostic overlays for consistent darkening/lightening regardless of
light or dark mode. Use for backdrops, overlays, and demo backgrounds that need
consistent contrast. Unlike the adaptive shade scale, these don't flip.

*/

const overlay_variables = (family: 'darken' | 'lighten', rgb: string): Array<StyleVariable> =>
	numeric_scale_variants.map((stop) => {
		const { hex, percent } = OVERLAY_ALPHAS[stop];
		return { name: `${family}_${stop}`, light: rgb + hex, summary: percent };
	});

/*

fg/bg - adaptive alpha overlays

Color-scheme-adaptive overlays that swap direction per color scheme:
- fg (foreground direction) = toward contrast (darkens in light mode, lightens in dark mode)
- bg (background direction) = toward surface (lightens in light mode, darkens in dark mode)

Use for subtle backgrounds that work in both color schemes without explicit conditionals.
These stack when nested (alpha accumulates), unlike the opaque shade scale.

*/

const adaptive_overlay_variables = (family: 'fg' | 'bg'): Array<StyleVariable> => {
	const toward = family === 'fg' ? 'darken' : 'lighten';
	const away = family === 'fg' ? 'lighten' : 'darken';
	return numeric_scale_variants.map((stop) => ({
		name: `${family}_${stop}`,
		light: `var(--${toward}_${stop})`,
		dark: `var(--${away}_${stop})`
	}));
};

/*

shadows

*/

// TODO these shouldn't use tint, use lighten/darken instead,
// but ideally we'd have a blend mode make the colors right,
// which would require a pseduo-element,
// but that's heavier and requires the element to be positioned (I think?)

// TODO maybe:
// - make shadow and glow color-scheme-agnostic?
// - lift and depth that have both shadow and glow, color-scheme-aware

const shadow_variables = (size: ShadowSizeVariant): Array<StyleVariable> => {
	const { offset, blur, spread } = SHADOW_GEOMETRY[size];
	const tail = `${blur}px ${spread}px`;
	return [
		{ name: `shadow_${size}`, light: `0 0 ${tail}` },
		{ name: `shadow_top_${size}`, light: `0 -${offset}px ${tail}` },
		{ name: `shadow_bottom_${size}`, light: `0 ${offset}px ${tail}` },
		{ name: `shadow_inset_${size}`, light: `inset 0 0 ${tail}` },
		{ name: `shadow_inset_top_${size}`, light: `inset 0 ${offset}px ${tail}` },
		{ name: `shadow_inset_bottom_${size}`, light: `inset 0 -${offset}px ${tail}` }
	];
};

// the inset direction flips per color scheme so the highlight always reads as
// lit from above; `active` is `hover` inverted, pressing the button inward
//
// the umbra names `--shadow_color_umbra` outright rather than going through
// the contextual `var(--shadow_color, ...)` the `.shadow_*` classes set: a
// custom property's var()s substitute against the declaring element, and
// these are declared on `:root`, so that indirection could never see a value
// set further down the tree - it only ever resolved to the fallback
const button_shadow_slots = (
	size: ShadowSizeVariant,
	alpha: NumericScaleVariant
): { light: string; dark: string } => {
	const umbra = (edge: string) =>
		`var(--shadow_inset_${edge}_${size}) color-mix(in oklab, var(--shadow_color_umbra) var(--shadow_alpha_${alpha}), transparent)`;
	const highlight = (edge: string) =>
		`var(--shadow_inset_${edge}_${size}) color-mix(in oklab, var(--shadow_color_highlight) var(--shadow_alpha_${alpha}), transparent)`;
	return {
		light: `${umbra('bottom')}, ${highlight('top')}`,
		dark: `${umbra('top')}, ${highlight('bottom')}`
	};
};

const button_shadow_hover_slots = button_shadow_slots('sm', '40');

/**
 * These are implicitly the variables for the `base` theme.
 * See also the empty `variables` array of the `base` theme in `themes/base.ts`.
 */
export const default_variables: Array<StyleVariable> = [
	// hue knobs - OKLCH hue angles; equal lightness/chroma across hues makes rotation safe
	...palette_variants.map((letter) => ({
		name: `hue_${letter}`,
		light: String(PALETTE_HUES[letter]),
		summary: palette_glosses[letter].color
	})),

	// per-slot chroma-character knobs - each multiplies its slot's chroma under
	// the global chroma_scale, so the slot's character holds at any global
	// setting; at or below 1 stays inside the gamut caps, above 1 knowingly clips
	...palette_variants.map((letter) => ({
		name: `palette_${letter}_chroma_scale`,
		light: String(PALETTE_CHROMA_MULTIPLIERS[letter]),
		summary:
			letter === 'f'
				? 'mutes the brown slot - brown is low-chroma orange, unreachable by hue alone'
				: slot_chroma_summary
	})),

	// global color-character knobs
	{
		name: 'chroma_scale',
		light: '1',
		summary:
			'0 makes the palette grayscale (the neutral scales have their own knob), above 1 is vivid and can clip past the sRGB gamut caps'
	},

	/*

	neutral intent knobs - the temperature of every surface, text, border, and
	shadow; the neutral is an intent whose scales are shade_* and text_* rather
	than a neutral_00-100 family

	*/
	{ name: 'hue_neutral', light: 'var(--hue_f)' },
	{
		name: 'neutral_chroma',
		light: String(NEUTRAL_CHROMA.light),
		dark: String(NEUTRAL_CHROMA.dark),
		summary: 'peak chroma of the neutral scales, applied through the shared chroma shape'
	},

	/*

	semantic color intents - meaning-first aliases over the palette letters

	Intent hues retarget what a color communicates without touching the palette:
	rotating --hue_accent recolors links, focus, selection, and selected states
	in one move. The letters stay abstract palette slots. Intent stops derive
	through the same ramps as the palette, so they respond to every curve knob;
	full 13-stop scales derive per intent, mirroring the palette
	scales, and tree-shake like everything else - unused stops cost nothing.

	*/
	{
		name: 'hue_accent',
		light: 'var(--hue_a)',
		summary: 'links, focus, selection, selected states'
	},
	{ name: 'hue_positive', light: 'var(--hue_b)', summary: 'success affordances' },
	{ name: 'hue_negative', light: 'var(--hue_c)', summary: 'errors, destructive actions' },
	{ name: 'hue_caution', light: 'var(--hue_h)', summary: 'warnings' },
	{ name: 'hue_info', light: 'var(--hue_i)', summary: 'informational callouts' },
	// intent chroma-character twins - an intent hue binding shares only the
	// angle, so binding an intent to a muted palette slot needs the twin set too
	...intent_variants.map((intent) => ({
		name: `${intent}_chroma_scale`,
		light: '1',
		summary: intent_chroma_summary
	})),
	// intent stops - the full scales derive through the shared ramps
	...intent_variants.flatMap((intent) => ramp_color_variables(intent)),

	/*

	palette lightness ramp - endpoint knobs (the 00/100 stops themselves) + curve,
	then the derived intermediate stops

	*/
	...lightness_ramp_variables('palette', PALETTE_LIGHTNESS_KNOBS),

	/*

	palette chroma - request knobs + the shared normalized shape, with the derived
	stops clamped per stop by the worst-hue sRGB gamut caps (see ramps.ts);
	chroma_scale multiplies outside the clamp at the color stops

	*/
	{
		name: 'palette_chroma_min',
		light: String(PALETTE_CHROMA_KNOBS.light.chroma_min),
		dark: String(PALETTE_CHROMA_KNOBS.dark.chroma_min)
	},
	{
		name: 'palette_chroma_max',
		light: String(PALETTE_CHROMA_KNOBS.light.chroma_max),
		dark: String(PALETTE_CHROMA_KNOBS.dark.chroma_max)
	},
	{
		name: 'chroma_curve',
		light: String(PALETTE_CHROMA_KNOBS.light.curve),
		dark: String(PALETTE_CHROMA_KNOBS.dark.curve),
		summary: 'falloff of the chroma peak, shared by the palette ramp and the neutral scales'
	},

	// normalized chroma shape per stop - 0 at the endpoints, 1 at the midpoint;
	// shared by the palette chroma ramp and the neutral scales
	...numeric_scale_variants.map((stop) => ({
		name: `chroma_shape_${stop}`,
		light: render_chroma_shape_css(stop)
	})),

	// capped palette chroma stops (per-scheme caps)
	...numeric_scale_variants.map((stop) => ({
		name: `palette_chroma_${stop}`,
		light: render_chroma_stop_css(stop, PALETTE_CHROMA_CAPS.light[stop]),
		dark: render_chroma_stop_css(stop, PALETTE_CHROMA_CAPS.dark[stop])
	})),

	// palette color stops - one definition per stop; the scheme flip lives in the knobs
	...palette_variants.flatMap((letter) =>
		numeric_scale_variants.map((stop) => ({
			name: `palette_${letter}_${stop}`,
			light: render_ramp_color_css(letter, stop)
		}))
	),

	/*

	shade scale - the primary system for backgrounds and surfaces

	Derived from the shade lightness knobs (see ramps.ts). The old alpha-derived
	S-curve was flattened into the pow ramp in the OKLCH migration - uniform OKLCH
	lightness steps are perceptually even, so the compositing compensation had no
	reason to survive.

	*/
	// Untinted adaptive extremes
	{ name: 'shade_min', light: '#fff', dark: '#000' },
	{ name: 'shade_max', light: '#000', dark: '#fff' },
	...lightness_ramp_variables('shade', SHADE_LIGHTNESS_KNOBS),
	// Tinted shade scale (00-100)
	...neutral_scale_variables('shade'),

	// non-adaptive alpha overlays (see `OVERLAY_ALPHAS`)
	...overlay_variables('darken', '#000000'),
	...overlay_variables('lighten', '#ffffff'),

	// adaptive alpha overlays (see `adaptive_overlay_variables`)
	...adaptive_overlay_variables('fg'),
	...adaptive_overlay_variables('bg'),

	/*

	border_color alpha - tinted alpha borders for accessibility

	Theme-integrated borders with alpha transparency, colored by the neutral
	intent: the hue is `--hue_neutral` and the chroma derives from
	`--neutral_chroma` (borders carry a stronger tint than surfaces, hence the
	multiplier), so grayscale and retinted themes reshape borders in the same
	move as everything else. The lightness sits mid-ramp as its own pinnable
	knob. Higher alpha in dark mode compensates for lower perceived contrast.

	*/
	{
		name: 'border_color_lightness',
		light: String(BORDER_COLOR_LIGHTNESS.light),
		dark: String(BORDER_COLOR_LIGHTNESS.dark),
		summary: 'OKLCH lightness of the border color family'
	},
	{
		name: 'border_color_chroma',
		// stronger tint than the surfaces so borders read at low alpha
		light: `calc(var(--neutral_chroma) * ${BORDER_CHROMA_MULTIPLIER.light})`,
		dark: `calc(var(--neutral_chroma) * ${BORDER_CHROMA_MULTIPLIER.dark})`,
		summary: "the border family's chroma, derived from the neutral's"
	},
	// the color part is scheme-agnostic (the flip lives in the knobs), so stops
	// whose alpha matches across schemes define a single slot
	...numeric_scale_variants.map((stop) => {
		const light = render_border_color_stop_css(stop, 'light');
		const dark = render_border_color_stop_css(stop, 'dark');
		return dark === light
			? { name: `border_color_${stop}`, light }
			: { name: `border_color_${stop}`, light, dark };
	}),

	/*

	text colors - flipped scale where low numbers = subtle, high numbers = bold

	Derived from the text lightness knobs (see ramps.ts).

	*/
	/* text colors don't use alpha because it affects performance too much */

	// Untinted text extremes (parallel to shade_min/shade_max)
	{ name: 'text_min', light: '#fff', dark: '#000' },
	{ name: 'text_max', light: '#000', dark: '#fff' },

	{ name: 'text_color', light: 'var(--text_80)' },
	...lightness_ramp_variables('text', TEXT_LIGHTNESS_KNOBS),
	...neutral_scale_variables('text'),
	{ name: 'text_disabled', light: 'var(--text_50)' },

	/* decoration */
	// hook on the page background (`:root`) for gradient skies, vignettes, and
	// textures - the minimal decoration channel themes kept hitting walls on
	{ name: 'background_image', light: 'none' },

	/* fonts */
	{
		name: 'font_family_sans',
		light:
			"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'"
	},
	{ name: 'font_family_serif', light: 'Georgia, serif' },
	{ name: 'font_family_mono', light: 'ui-monospace, monospace' },
	// the body font, kept apart from the three stacks so retargeting it doesn't
	// make one of them mean something it isn't
	{ name: 'font_family', light: 'var(--font_family_sans)', summary: 'the body font' },
	{ name: 'font_weight', light: '400', summary: 'base body font weight' },
	{ name: 'heading_font_family', light: 'var(--font_family_serif)' },
	// `--heading_font_weight` is a hook consumed by `style.css` with per-tier
	// fallbacks (h1 300 … h5 900), not a declared variable - setting it flattens
	// the heading weight ladder deliberately (display-heavy themes); see `knobs.ts`

	/* sizes like font-size */
	...font_size_variants.map((size) => ({
		name: `font_size_${size}`,
		light: `${FONT_SIZES[size]}rem`
	})),

	...line_height_variants.map((size) => ({
		name: `line_height_${size}`,
		light: String(LINE_HEIGHTS[size])
	})),

	/* links */
	{ name: 'link_color', light: 'var(--accent_60)' },
	{ name: 'text_decoration', light: 'none' },
	{ name: 'text_decoration_hover', light: 'underline' },
	{ name: 'text_decoration_selected', light: 'underline' },
	{ name: 'link_color_selected', light: 'var(--text_color)' },
	// ports the old bespoke selection lightness in both schemes (light stop 20,
	// dark stop 80) while following the accent intent and every ramp knob
	{
		name: 'selection_color',
		light: render_ramp_color_css('accent', '20', '40%'),
		dark: render_ramp_color_css('accent', '80', '40%')
	},

	/* spacings, rounded to pixels for the default 16px case (at the default scale factor of 1) */
	{
		name: 'scale_factor',
		light: '1',
		summary: 'multiplies the space scale, below 1 is tighter and above 1 is more spacious'
	},
	...space_variants.map((size) => ({
		name: `space_${size}`,
		light: `calc(${SPACE_SIZES[size]}rem * var(--scale_factor))`
	})),
	...distance_variants.map((size) => ({
		name: `distance_${size}`,
		light: `${DISTANCES[size]}px`
	})),

	/* borders and outlines */
	{ name: 'border_color', light: 'var(--shade_30)' },
	{ name: 'border_style', light: 'solid' },
	{ name: 'border_width', light: 'var(--border_width_1)' },
	// These use numbers instead of named size variants because
	// they more directly map to how I think about border widths.
	// But maye this could be expanded/rethought.
	...border_width_variants.map((width) => ({
		name: `border_width_${width}`,
		light: `${width}px`
	})),
	{ name: 'outline_width', light: '0' },
	// TODO maybe rename _2 to `focus`
	{ name: 'outline_width_focus', light: 'var(--border_width_2)' },
	// TODO maybe rename _3 to `active`
	{ name: 'outline_width_active', light: 'var(--border_width_1)' },
	{ name: 'outline_style', light: 'solid' },
	{ name: 'outline_color', light: 'var(--accent_50)' },
	{
		name: 'outline_offset',
		light: '1px',
		summary: 'the gap between an element border and its focus ring'
	},

	/* border radii - the tokens multiply a per-tier base by the radius scale, so
		"sharp"/"soft"/"pill" is one knob move while per-element tiers survive;
		pinning an individual token opts that tier out of the scale */
	{
		name: 'radius_scale',
		light: '1',
		summary: '0 is sharp, below 1 is squarer, above 1 is rounder'
	},
	...border_radius_variants.map((size) => ({
		name: `border_radius_${size}`,
		light: `calc(${BORDER_RADII[size]}rem * var(--radius_scale))`
	})),

	/* buttons - the raised/pressed affordance, which no other element has, so
		the border style splits from `--border_style` here rather than globally */
	{ name: 'button_border_style', light: 'var(--border_style)' },
	{
		name: 'button_border_style_active',
		light: 'var(--button_border_style)',
		summary: 'the pressed border style, e.g. `inset` against an `outset` rest state'
	},
	{ name: 'button_shadow', ...button_shadow_slots('xs', '30') },
	{ name: 'button_shadow_hover', ...button_shadow_hover_slots },
	{
		name: 'button_shadow_active',
		light: button_shadow_hover_slots.dark,
		dark: button_shadow_hover_slots.light
	},

	/* inputs */
	{ name: 'input_fill', light: 'var(--bg_80)' },
	{ name: 'input_padding_y', light: '0' },
	{ name: 'input_padding_x', light: 'var(--space_lg)' },
	{ name: 'input_width_min', light: '100px' },
	{ name: 'input_height', light: 'var(--space_xl5)' },
	{ name: 'input_height_compact', light: 'var(--space_xl4)' },

	/* micro-surfaces */
	{ name: 'caret_color', light: 'var(--accent_50)' },
	{ name: 'scrollbar_thumb_color', light: 'var(--shade_40)' },
	{ name: 'scrollbar_track_color', light: 'transparent' },
	{ name: 'backdrop_color', light: 'var(--darken_60)', summary: 'the dim behind an open dialog' },

	/* shadows (see `SHADOW_GEOMETRY`) */
	...shadow_size_variants.flatMap((size) => shadow_variables(size)),
	{ name: 'shadow_color_umbra', light: '#000', dark: render_shadow_tint_css('dim') },
	{ name: 'shadow_color_highlight', light: render_shadow_tint_css('bright'), dark: '#000' },
	{
		name: 'shadow_color_glow',
		light: render_shadow_tint_css('bright'),
		dark: render_shadow_tint_css('dim')
	},
	{ name: 'shadow_color_shroud', light: '#000' },
	// the stops multiply their base alphas (see `SHADOW_ALPHAS`) by the shadow
	// alpha scale, so "flat" is one knob move (button shadows follow too, via
	// their alpha-stop references); calc() results clamp to the valid range at
	// computed-value time
	{
		name: 'shadow_alpha_scale',
		light: '1',
		summary: '0 flattens all shadows including button shadows, above 1 deepens them'
	},
	...numeric_scale_variants.map((stop) => {
		const { light: light_alpha, dark: dark_alpha } = SHADOW_ALPHAS[stop];
		const name = `shadow_alpha_${stop}`;
		// zero is zero at any scale, so it stays a literal
		if (!light_alpha && !dark_alpha) return { name, light: '0%' };
		const scaled = (alpha: number): string => `calc(${alpha}% * var(--shadow_alpha_scale))`;
		return light_alpha === dark_alpha
			? { name, light: scaled(light_alpha) }
			: { name, light: scaled(light_alpha), dark: scaled(dark_alpha) };
	}),

	/* icons (see `ICON_SIZES`) */
	...icon_size_variants.map((size) => ({
		name: `icon_size_${size}`,
		light: `${ICON_SIZES[size]}px`
	})),

	/* durations */
	// TODO maybe change the scale from xs-xl, and add an xs here around 0.04s or 0.03s (2 frames at 60fps)
	// TODO docs
	...duration_variants.map((n) => ({ name: `duration_${n}`, light: `${DURATIONS[n]}s` })),

	{ name: 'disabled_opacity', light: '60%' }
];
