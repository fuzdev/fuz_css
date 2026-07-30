/**
 * The theme knob catalog: typed metadata for the style variables that themes
 * are expected to turn, keyed by variable name.
 *
 * This is a side catalog over `variables.ts` - `StyleVariable` stays the
 * authored and rendered value form, and the catalog adds the metadata that
 * value form can't carry: what kind of value a knob takes (which widget edits
 * it), which axis of the theme space it moves, how much leverage it has (its
 * control size in the editor), and which tier of the two-tier theme policy it
 * belongs to. Defaults and light/dark slots are not duplicated here - join
 * against `default_variables` by name.
 *
 * The catalog deliberately covers only the knob tier, not all ~490 variables:
 * derived ramp stops, color stops, and most site hooks are the escape-hatch
 * tier and stay out. A catalog entry may be a hook (`hook: true`) consumed by
 * `style.css` with per-site fallbacks rather than a declared variable - it
 * exists here so themes can set it without tripping the no-invented-variables
 * check.
 *
 * @module
 */

import type { StyleVariableName } from './variable.ts';
import {
	border_radius_variants,
	border_width_variants,
	intent_variants,
	line_height_variants,
	palette_variants,
	space_variants
} from './variable_data.ts';

/**
 * Matches a `var(--hue_X)` palette-letter binding, capturing the letter -
 * the value form `bindable` hue knobs default to.
 */
export const HUE_BINDING_MATCHER: RegExp = /^var\(--hue_([a-j])\)$/u;

/**
 * The value kind of a knob, determining the editor widget and how the value
 * validates. `text` is the unenriched fallback kind.
 */
export type KnobKind =
	| 'hue' // OKLCH hue angle in degrees
	| 'number' // unitless scalar (multipliers, curves, chroma, weights)
	| 'percent'
	| 'length' // CSS length like '0.8rem'
	| 'time' // CSS time in seconds like '0.2s'
	| 'color'
	| 'font_stack'
	| 'enum'
	| 'shadow' // box-shadow value list
	| 'text';

/**
 * The axis of the theme-space taxonomy a knob moves.
 */
export type KnobAxis =
	'color' | 'shape' | 'density' | 'depth' | 'typography' | 'motion' | 'decoration';

/**
 * Leverage tier: how much of the system a knob reshapes, which the editor
 * renders as control size (`lg` headline knobs down to `sm` escape hatches).
 */
export type KnobLeverage = 'lg' | 'md' | 'sm';

/**
 * The two-tier theme policy: semantic-tier knobs (intent bindings + levers)
 * are safe for registry themes; palette-tier knobs (the letter hues) mark a
 * theme as an exemplar.
 */
export type KnobTier = 'semantic' | 'palette';

export interface ThemeKnob {
	name: StyleVariableName;
	kind: KnobKind;
	axis: KnobAxis;
	leverage: KnobLeverage;
	tier: KnobTier;
	/**
	 * The safe envelope for scalar kinds - editor sliders clamp to it, while
	 * direct numeric entry may exceed it knowingly.
	 */
	range?: [number, number];
	step?: number;
	/** Allowed values for the `enum` kind. */
	values?: Array<string>;
	/**
	 * True for knobs consumed by `style.css` via `var()` fallbacks instead of
	 * being declared in `default_variables`. Only for knobs whose fallbacks
	 * differ per site, so no single declared default exists -
	 * `heading_font_weight`, whose per-tier fallbacks flatten when set.
	 */
	hook?: boolean;
	/**
	 * True for hue knobs whose default is a palette-letter binding
	 * (`var(--hue_X)`) - the intent and neutral hues. Editors render these as
	 * a letter picker with a custom-angle escape, and edits may write either a
	 * binding or a literal angle.
	 */
	bindable?: boolean;
}

const hue = (
	name: StyleVariableName,
	leverage: KnobLeverage,
	tier: KnobTier = 'semantic',
	bindable = false
): ThemeKnob => ({
	name,
	kind: 'hue',
	axis: 'color',
	leverage,
	tier,
	range: [0, 360],
	step: 1,
	...(bindable ? { bindable } : null)
});

// a slot chroma multiplier: [0, 1] is the safe envelope (1 = at the gamut
// caps); direct entry above 1 knowingly clips, like the global chroma_scale
const chroma_multiplier = (name: StyleVariableName, tier: KnobTier): ThemeKnob => ({
	name,
	kind: 'number',
	axis: 'color',
	leverage: 'sm',
	tier,
	range: [0, 1],
	step: 0.01
});

// an escape-hatch-leverage CSS length token, pinnable under its family's scale knob
const length_knob = (name: StyleVariableName, axis: KnobAxis): ThemeKnob => ({
	name,
	kind: 'length',
	axis,
	leverage: 'sm',
	tier: 'semantic'
});

const lightness_ramp = (family: string): Array<ThemeKnob> => [
	{
		name: `${family}_lightness_00`,
		kind: 'number',
		axis: 'color',
		leverage: 'md',
		tier: 'semantic',
		range: [0, 1],
		step: 0.001
	},
	{
		name: `${family}_lightness_100`,
		kind: 'number',
		axis: 'color',
		leverage: 'md',
		tier: 'semantic',
		range: [0, 1],
		step: 0.001
	},
	{
		name: `${family}_lightness_curve`,
		kind: 'number',
		axis: 'color',
		leverage: 'md',
		tier: 'semantic',
		range: [0.2, 4],
		step: 0.01
	}
];

/**
 * The theme knobs in editor display order: by axis, high leverage first,
 * with the palette tier last within the color axis.
 */
export const theme_knobs: Array<ThemeKnob> = [
	// color - the leverage core
	hue('hue_neutral', 'lg', 'semantic', true),
	{
		name: 'neutral_chroma',
		kind: 'number',
		axis: 'color',
		leverage: 'lg',
		tier: 'semantic',
		range: [0, 0.1],
		step: 0.001
	},
	hue('hue_accent', 'lg', 'semantic', true),
	{
		name: 'chroma_scale',
		kind: 'number',
		axis: 'color',
		leverage: 'lg',
		tier: 'semantic',
		range: [0, 2],
		step: 0.05
	},
	hue('hue_positive', 'md', 'semantic', true),
	hue('hue_negative', 'md', 'semantic', true),
	hue('hue_caution', 'md', 'semantic', true),
	hue('hue_info', 'md', 'semantic', true),
	// intent chroma-character twins - pair with a binding to a muted slot
	...intent_variants.map((i) => chroma_multiplier(`${i}_chroma_scale`, 'semantic')),
	...lightness_ramp('palette'),
	...lightness_ramp('shade'),
	...lightness_ramp('text'),
	{
		name: 'palette_chroma_min',
		kind: 'number',
		axis: 'color',
		leverage: 'md',
		tier: 'semantic',
		range: [0, 0.06],
		step: 0.001
	},
	{
		// requests up to the per-stop gamut caps; chroma_scale pushes past them
		name: 'palette_chroma_max',
		kind: 'number',
		axis: 'color',
		leverage: 'md',
		tier: 'semantic',
		range: [0, 0.125],
		step: 0.001
	},
	{
		name: 'palette_chroma_curve',
		kind: 'number',
		axis: 'color',
		leverage: 'md',
		tier: 'semantic',
		range: [0.2, 4],
		step: 0.01
	},
	{
		// mid-ramp so borders read against both the page background and fills
		name: 'border_color_lightness',
		kind: 'number',
		axis: 'color',
		leverage: 'sm',
		tier: 'semantic',
		range: [0, 1],
		step: 0.001
	},
	{
		// the default derives from the neutral (calc(var(--neutral_chroma) * k));
		// setting a literal number pins the border family's chroma
		name: 'border_color_chroma',
		kind: 'number',
		axis: 'color',
		leverage: 'sm',
		tier: 'semantic',
		range: [0, 0.15],
		step: 0.001
	},
	// color - micro-surface variables consumed by style.css
	{
		name: 'caret_color',
		kind: 'color',
		axis: 'color',
		leverage: 'sm',
		tier: 'semantic'
	},
	{
		name: 'scrollbar_thumb_color',
		kind: 'color',
		axis: 'color',
		leverage: 'sm',
		tier: 'semantic'
	},
	{
		name: 'scrollbar_track_color',
		kind: 'color',
		axis: 'color',
		leverage: 'sm',
		tier: 'semantic'
	},
	{
		// how muted disabled UI reads - a perceptual/color move, not motion
		name: 'disabled_opacity',
		kind: 'percent',
		axis: 'color',
		leverage: 'sm',
		tier: 'semantic',
		range: [0, 100],
		step: 1
	},
	// color - the palette tier (moving these makes a theme an exemplar)
	...palette_variants.map((l) => hue(`hue_${l}`, 'sm', 'palette')),
	// per-slot chroma multipliers - a slot's chroma character under chroma_scale
	...palette_variants.map((l) => chroma_multiplier(`palette_${l}_chroma_scale`, 'palette')),
	// shape
	{
		name: 'radius_scale',
		kind: 'number',
		axis: 'shape',
		leverage: 'lg',
		tier: 'semantic',
		range: [0, 3],
		step: 0.05
	},
	{
		name: 'border_style',
		kind: 'enum',
		axis: 'shape',
		leverage: 'md',
		tier: 'semantic',
		values: ['solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'none']
	},
	{
		// the gap between an element's border and its focus/active ring
		name: 'outline_offset',
		kind: 'length',
		axis: 'shape',
		leverage: 'sm',
		tier: 'semantic'
	},
	length_knob('border_width', 'shape'),
	...border_width_variants.map((v) => length_knob(`border_width_${v}`, 'shape')),
	...border_radius_variants.map((v) => length_knob(`border_radius_${v}`, 'shape')),
	// density
	{
		name: 'scale_factor',
		kind: 'number',
		axis: 'density',
		leverage: 'lg',
		tier: 'semantic',
		range: [0.25, 2],
		step: 0.05
	},
	...space_variants.map((v) => length_knob(`space_${v}`, 'density')),
	// depth
	{
		name: 'shadow_alpha_scale',
		kind: 'number',
		axis: 'depth',
		leverage: 'lg',
		tier: 'semantic',
		range: [0, 2],
		step: 0.05
	},
	{ name: 'shadow_color_umbra', kind: 'color', axis: 'depth', leverage: 'md', tier: 'semantic' },
	{
		name: 'shadow_color_highlight',
		kind: 'color',
		axis: 'depth',
		leverage: 'md',
		tier: 'semantic'
	},
	{ name: 'shadow_color_glow', kind: 'color', axis: 'depth', leverage: 'md', tier: 'semantic' },
	{ name: 'shadow_color_shroud', kind: 'color', axis: 'depth', leverage: 'md', tier: 'semantic' },
	// the dialog/fullscreen ::backdrop dim
	{
		name: 'backdrop_color',
		kind: 'color',
		axis: 'depth',
		leverage: 'sm',
		tier: 'semantic'
	},
	{ name: 'button_shadow', kind: 'shadow', axis: 'depth', leverage: 'md', tier: 'semantic' },
	{ name: 'button_shadow_hover', kind: 'shadow', axis: 'depth', leverage: 'md', tier: 'semantic' },
	{ name: 'button_shadow_active', kind: 'shadow', axis: 'depth', leverage: 'md', tier: 'semantic' },
	// typography
	{
		name: 'font_family_sans',
		kind: 'font_stack',
		axis: 'typography',
		leverage: 'md',
		tier: 'semantic'
	},
	{
		name: 'font_family_serif',
		kind: 'font_stack',
		axis: 'typography',
		leverage: 'md',
		tier: 'semantic'
	},
	{
		name: 'font_family_mono',
		kind: 'font_stack',
		axis: 'typography',
		leverage: 'md',
		tier: 'semantic'
	},
	{
		name: 'heading_font_family',
		kind: 'font_stack',
		axis: 'typography',
		leverage: 'md',
		tier: 'semantic'
	},
	{
		name: 'font_weight',
		kind: 'number',
		axis: 'typography',
		leverage: 'md',
		tier: 'semantic',
		range: [100, 900],
		step: 100
	},
	{
		// setting this flattens the per-tier heading weight ladder deliberately
		name: 'heading_font_weight',
		kind: 'number',
		axis: 'typography',
		leverage: 'md',
		tier: 'semantic',
		range: [100, 900],
		step: 100,
		hook: true
	},
	...line_height_variants.map((v): ThemeKnob => ({
		name: `line_height_${v}`,
		kind: 'number',
		axis: 'typography',
		leverage: 'sm',
		tier: 'semantic',
		range: [0.8, 3],
		step: 0.05
	})),
	// motion
	{
		name: 'duration_1',
		kind: 'time',
		axis: 'motion',
		leverage: 'sm',
		tier: 'semantic',
		range: [0, 5],
		step: 0.01
	},
	{
		name: 'duration_2',
		kind: 'time',
		axis: 'motion',
		leverage: 'sm',
		tier: 'semantic',
		range: [0, 5],
		step: 0.01
	},
	{
		name: 'duration_3',
		kind: 'time',
		axis: 'motion',
		leverage: 'sm',
		tier: 'semantic',
		range: [0, 5],
		step: 0.01
	},
	{
		name: 'duration_4',
		kind: 'time',
		axis: 'motion',
		leverage: 'sm',
		tier: 'semantic',
		range: [0, 5],
		step: 0.01
	},
	{
		name: 'duration_5',
		kind: 'time',
		axis: 'motion',
		leverage: 'sm',
		tier: 'semantic',
		range: [0, 5],
		step: 0.01
	},
	{
		name: 'duration_6',
		kind: 'time',
		axis: 'motion',
		leverage: 'sm',
		tier: 'semantic',
		range: [0, 5],
		step: 0.01
	},
	// decoration
	{ name: 'background_image', kind: 'text', axis: 'decoration', leverage: 'md', tier: 'semantic' }
];

/**
 * The theme-space axes in editor display order, with display titles.
 */
export const knob_axes: Array<{ axis: KnobAxis; title: string }> = [
	{ axis: 'color', title: 'Color' },
	{ axis: 'shape', title: 'Shape' },
	{ axis: 'density', title: 'Density' },
	{ axis: 'depth', title: 'Depth' },
	{ axis: 'typography', title: 'Typography' },
	{ axis: 'motion', title: 'Motion' },
	{ axis: 'decoration', title: 'Decoration' }
];

/**
 * The catalog indexed by variable name.
 */
export const theme_knob_by_name: Map<string, ThemeKnob> = new Map(
	theme_knobs.map((k) => [k.name, k])
);

/**
 * Names of hook knobs - consumed by `style.css` via fallbacks, not declared
 * in `default_variables`. Theme validation unions these with the declared
 * variable names.
 */
export const theme_knob_hook_names: Set<string> = new Set(
	theme_knobs.filter((k) => k.hook).map((k) => k.name)
);
