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
 * tier and stay out. A few catalog entries are hooks (`hook: true`) consumed
 * by `style.css` with fallbacks rather than declared variables - they exist
 * here so themes can set them without tripping the no-invented-variables
 * check.
 *
 * @module
 */

import type { StyleVariableName } from './variable.ts';

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
	 * being declared in `default_variables` (e.g. `heading_font_weight`, whose
	 * per-tier fallbacks flatten when set).
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
	chroma_multiplier('accent_chroma_scale', 'semantic'),
	chroma_multiplier('positive_chroma_scale', 'semantic'),
	chroma_multiplier('negative_chroma_scale', 'semantic'),
	chroma_multiplier('caution_chroma_scale', 'semantic'),
	chroma_multiplier('info_chroma_scale', 'semantic'),
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
	// color - micro-surface hooks consumed by style.css via var() fallbacks
	{
		name: 'caret_color',
		kind: 'color',
		axis: 'color',
		leverage: 'sm',
		tier: 'semantic',
		hook: true
	},
	{
		name: 'scrollbar_thumb_color',
		kind: 'color',
		axis: 'color',
		leverage: 'sm',
		tier: 'semantic',
		hook: true
	},
	{
		name: 'scrollbar_track_color',
		kind: 'color',
		axis: 'color',
		leverage: 'sm',
		tier: 'semantic',
		hook: true
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
	hue('hue_a', 'sm', 'palette'),
	hue('hue_b', 'sm', 'palette'),
	hue('hue_c', 'sm', 'palette'),
	hue('hue_d', 'sm', 'palette'),
	hue('hue_e', 'sm', 'palette'),
	hue('hue_f', 'sm', 'palette'),
	hue('hue_g', 'sm', 'palette'),
	hue('hue_h', 'sm', 'palette'),
	hue('hue_i', 'sm', 'palette'),
	hue('hue_j', 'sm', 'palette'),
	// per-slot chroma multipliers - a slot's chroma character under chroma_scale
	chroma_multiplier('palette_a_chroma_scale', 'palette'),
	chroma_multiplier('palette_b_chroma_scale', 'palette'),
	chroma_multiplier('palette_c_chroma_scale', 'palette'),
	chroma_multiplier('palette_d_chroma_scale', 'palette'),
	chroma_multiplier('palette_e_chroma_scale', 'palette'),
	chroma_multiplier('palette_f_chroma_scale', 'palette'),
	chroma_multiplier('palette_g_chroma_scale', 'palette'),
	chroma_multiplier('palette_h_chroma_scale', 'palette'),
	chroma_multiplier('palette_i_chroma_scale', 'palette'),
	chroma_multiplier('palette_j_chroma_scale', 'palette'),
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
		// the gap between an element's border and its focus/active ring, a
		// style.css var() fallback hook (default 1px)
		name: 'outline_offset',
		kind: 'length',
		axis: 'shape',
		leverage: 'sm',
		tier: 'semantic',
		hook: true
	},
	{ name: 'border_width', kind: 'length', axis: 'shape', leverage: 'sm', tier: 'semantic' },
	{ name: 'border_width_1', kind: 'length', axis: 'shape', leverage: 'sm', tier: 'semantic' },
	{ name: 'border_width_2', kind: 'length', axis: 'shape', leverage: 'sm', tier: 'semantic' },
	{ name: 'border_width_3', kind: 'length', axis: 'shape', leverage: 'sm', tier: 'semantic' },
	{ name: 'border_width_4', kind: 'length', axis: 'shape', leverage: 'sm', tier: 'semantic' },
	{ name: 'border_width_5', kind: 'length', axis: 'shape', leverage: 'sm', tier: 'semantic' },
	{ name: 'border_width_6', kind: 'length', axis: 'shape', leverage: 'sm', tier: 'semantic' },
	{ name: 'border_width_7', kind: 'length', axis: 'shape', leverage: 'sm', tier: 'semantic' },
	{ name: 'border_width_8', kind: 'length', axis: 'shape', leverage: 'sm', tier: 'semantic' },
	{ name: 'border_width_9', kind: 'length', axis: 'shape', leverage: 'sm', tier: 'semantic' },
	{ name: 'border_radius_xs3', kind: 'length', axis: 'shape', leverage: 'sm', tier: 'semantic' },
	{ name: 'border_radius_xs2', kind: 'length', axis: 'shape', leverage: 'sm', tier: 'semantic' },
	{ name: 'border_radius_xs', kind: 'length', axis: 'shape', leverage: 'sm', tier: 'semantic' },
	{ name: 'border_radius_sm', kind: 'length', axis: 'shape', leverage: 'sm', tier: 'semantic' },
	{ name: 'border_radius_md', kind: 'length', axis: 'shape', leverage: 'sm', tier: 'semantic' },
	{ name: 'border_radius_lg', kind: 'length', axis: 'shape', leverage: 'sm', tier: 'semantic' },
	{ name: 'border_radius_xl', kind: 'length', axis: 'shape', leverage: 'sm', tier: 'semantic' },
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
	{ name: 'space_xs5', kind: 'length', axis: 'density', leverage: 'sm', tier: 'semantic' },
	{ name: 'space_xs4', kind: 'length', axis: 'density', leverage: 'sm', tier: 'semantic' },
	{ name: 'space_xs3', kind: 'length', axis: 'density', leverage: 'sm', tier: 'semantic' },
	{ name: 'space_xs2', kind: 'length', axis: 'density', leverage: 'sm', tier: 'semantic' },
	{ name: 'space_xs', kind: 'length', axis: 'density', leverage: 'sm', tier: 'semantic' },
	{ name: 'space_sm', kind: 'length', axis: 'density', leverage: 'sm', tier: 'semantic' },
	{ name: 'space_md', kind: 'length', axis: 'density', leverage: 'sm', tier: 'semantic' },
	{ name: 'space_lg', kind: 'length', axis: 'density', leverage: 'sm', tier: 'semantic' },
	{ name: 'space_xl', kind: 'length', axis: 'density', leverage: 'sm', tier: 'semantic' },
	{ name: 'space_xl2', kind: 'length', axis: 'density', leverage: 'sm', tier: 'semantic' },
	{ name: 'space_xl3', kind: 'length', axis: 'density', leverage: 'sm', tier: 'semantic' },
	{ name: 'space_xl4', kind: 'length', axis: 'density', leverage: 'sm', tier: 'semantic' },
	{ name: 'space_xl5', kind: 'length', axis: 'density', leverage: 'sm', tier: 'semantic' },
	{ name: 'space_xl6', kind: 'length', axis: 'density', leverage: 'sm', tier: 'semantic' },
	{ name: 'space_xl7', kind: 'length', axis: 'density', leverage: 'sm', tier: 'semantic' },
	{ name: 'space_xl8', kind: 'length', axis: 'density', leverage: 'sm', tier: 'semantic' },
	{ name: 'space_xl9', kind: 'length', axis: 'density', leverage: 'sm', tier: 'semantic' },
	{ name: 'space_xl10', kind: 'length', axis: 'density', leverage: 'sm', tier: 'semantic' },
	{ name: 'space_xl11', kind: 'length', axis: 'density', leverage: 'sm', tier: 'semantic' },
	{ name: 'space_xl12', kind: 'length', axis: 'density', leverage: 'sm', tier: 'semantic' },
	{ name: 'space_xl13', kind: 'length', axis: 'density', leverage: 'sm', tier: 'semantic' },
	{ name: 'space_xl14', kind: 'length', axis: 'density', leverage: 'sm', tier: 'semantic' },
	{ name: 'space_xl15', kind: 'length', axis: 'density', leverage: 'sm', tier: 'semantic' },
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
	// the dialog/fullscreen ::backdrop dim, a style.css var() fallback hook
	{
		name: 'backdrop_color',
		kind: 'color',
		axis: 'depth',
		leverage: 'sm',
		tier: 'semantic',
		hook: true
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
	{
		name: 'line_height_xs',
		kind: 'number',
		axis: 'typography',
		leverage: 'sm',
		tier: 'semantic',
		range: [0.8, 3],
		step: 0.05
	},
	{
		name: 'line_height_sm',
		kind: 'number',
		axis: 'typography',
		leverage: 'sm',
		tier: 'semantic',
		range: [0.8, 3],
		step: 0.05
	},
	{
		name: 'line_height_md',
		kind: 'number',
		axis: 'typography',
		leverage: 'sm',
		tier: 'semantic',
		range: [0.8, 3],
		step: 0.05
	},
	{
		name: 'line_height_lg',
		kind: 'number',
		axis: 'typography',
		leverage: 'sm',
		tier: 'semantic',
		range: [0.8, 3],
		step: 0.05
	},
	{
		name: 'line_height_xl',
		kind: 'number',
		axis: 'typography',
		leverage: 'sm',
		tier: 'semantic',
		range: [0.8, 3],
		step: 0.05
	},
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
