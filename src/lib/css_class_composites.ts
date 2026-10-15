import type { CssClassDefinition } from './css_class_generation.ts';
import { palette_variants } from './variable_data.ts';

/**
 * The builtin composite classes. The multi-property ones render in the
 * `fuz.utilities.composites` sublayer (`composite: true`, the default for
 * rulesets), so a token or literal class on the same element wins over them;
 * the single-property shortcuts (`circular`, `pixelated`, `mb_flow`,
 * `mt_flow`) are single-purpose and order with the token classes. Their
 * forced-colors rules nest inside their own rules (`@media (forced-colors:
 * active)`), so a modified variant keeps them conditional, and a browser
 * without CSS nesting, which also has no forced-colors mode, skips them.
 */
export const css_class_composites: Record<string, CssClassDefinition | undefined> = {
	pixelated: {
		declaration: `
			image-rendering: -webkit-optimize-contrast; /* Safari */
			image-rendering: -o-crisp-edges; /* OS X & Windows Opera (12.02+) */
			image-rendering: pixelated; /* in case crisp-edges isn't supported */
			image-rendering: crisp-edges; /* the recommended pixel art setting according to MDN */
		`
	},
	circular: {
		declaration: 'border-radius: 50%;'
	},
	box: {
		composite: true,
		declaration: `
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
		`
	},
	column: {
		composite: true,
		comment: 'like `.box` but uncentered',
		declaration: `
			display: flex;
			flex-direction: column;
		`
	},
	row: {
		composite: true,
		comment: 'can be used to override the direction of a `.box`',
		declaration: `
			display: flex;
			flex-direction: row;
			align-items: center;
		`
	},
	ellipsis: {
		composite: true,
		declaration: `
			display: block;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		`
	},
	selectable: {
		ruleset: `
			.selectable {
				--button_fill: color-mix(in oklab, var(--shade_50) 8%, transparent);
				--button_fill_hover: color-mix(in oklab, var(--shade_50) 16%, transparent);
				--button_fill_active: color-mix(in oklab, var(--shade_50) 24%, transparent);
				cursor: pointer;
				background-color: var(--button_fill);
				border-color: var(--border_color_30);
				border-style: var(--border_style);
				border-width: var(--border_width);
			}
			.selectable:hover {
				background-color: var(--button_fill_hover);
				border-color: var(--border_color_20);
			}
			.selectable.selected,
			.selectable[aria-pressed='true'],
			.selectable:active {
				background-color: var(--button_fill_active);
				border-color: var(--accent_50);
			}
			/* a selected button's label is the inverse for its solid fill, so over
				this light tint it returns to the text color, hovered or not */
			.selectable:is(.selected, [aria-pressed='true']) {
				--button_text_color: var(--text_color);
			}
			.selectable.selected {
				cursor: default;
			}
			.selectable.selected.deselectable:not(:disabled):not([aria-disabled='true']) {
				cursor: pointer;
			}
			/* Highlight marks selection alone, so a focus ring and the edge take the
				text color; before the selected rules, which outrank it to keep their ring */
			.selectable:focus-visible {
				@media (forced-colors: active) {
					border-color: CanvasText;
					outline-color: CanvasText;
				}
			}
			/* native :disabled is grayed by the browser, aria-disabled is not */
			.selectable[aria-disabled='true'] {
				@media (forced-colors: active) {
					border-color: GrayText;
				}
			}
			/* forced colors drop the fill, so selection shows as a Highlight band
				inside the edge, moving out as a double ring when focused - the base
				button rules' pattern, restated here since those lose to composites.
				The band sits inside the border box, so content with less padding
				than the border width plus the focus outline width (an unpadded
				li.selectable) has its first glyph partly under it */
			.selectable:is(.selected, [aria-pressed='true']) {
				@media (forced-colors: active) {
					border-color: Highlight;
					outline: var(--outline_width_focus) solid Highlight;
					outline-offset: calc(-1 * (var(--border_width) + var(--outline_width_focus)));
				}
			}
			.selectable:is(.selected, [aria-pressed='true']):focus-visible {
				@media (forced-colors: active) {
					outline: calc(2 * var(--outline_width_focus)) double Highlight;
					outline-offset: var(--outline_offset);
				}
			}
			.selectable:is(.selected, [aria-pressed='true']):is(:disabled, [aria-disabled='true']) {
				@media (forced-colors: active) {
					border-color: GrayText;
					outline-color: GrayText;
				}
			}
		`
	},
	clickable: {
		ruleset: `
			.clickable {
				cursor: pointer;
				transform: var(--clickable_transform, scale3d(1, 1, 1));
				transform-origin: var(--clickable_transform_origin);
				transition-duration: var(--clickable_transition_duration); /* default to instant, chunky/lofi */
			}
			.clickable:focus-visible {
				transform: var(--clickable_transform_focus, scale3d(1.07, 1.07, 1.07));
			}
			.clickable:hover {
				transform: var(--clickable_transform_hover, scale3d(1.1, 1.1, 1.1));
			}
			.clickable:active,
			.clickable.active {
				transform: var(--clickable_transform_active, scale3d(1.2, 1.2, 1.2));
			}
		`
	},
	pane: {
		composite: true,
		comment:
			"A pane is a box floating over the page, like for dialogs. By default it's opaque, resetting the background to the initial depth.",
		declaration: `
			background-color: var(--shade_00);
			box-shadow: var(--pane_shadow);
			border-radius: var(--border_radius, var(--border_radius_xs));
			@media (forced-colors: active) {
				border: var(--border_width) solid CanvasText; /* forced colors drop the shadow */
			}
		`
	},
	panel: {
		composite: true,
		comment: 'A panel is a box embedded into the page, useful for visually isolating content.',
		declaration: `
			border-radius: var(--border_radius, var(--border_radius_xs));
			background-color: var(--fg_10);
			box-shadow: var(--panel_shadow);
			@media (forced-colors: active) {
				border: var(--border_width) solid CanvasText; /* forced colors drop the background and shadow */
			}
		`
	},
	/*
	Size composites scale a region up or down on the fuz_css scales. Each variable
	is offset a fixed number of steps from its `.sized_md` default on the variable's
	own scale: `.sized_xs` two steps down, `.sized_sm` one down, `.sized_lg` one up,
	`.sized_xl` two up. `.sized_md` restates the defaults so it works as a cascade
	reset inside a sized parent.
	*/
	sized_xs: {
		composite: true,
		comment:
			'Smallest sizing, two steps down from the default, cascading to children. Works on individual elements or containers.',
		declaration: `
			--font_size: var(--font_size_xs);
			--input_height: var(--space_xl3);
			--input_height_compact: var(--space_xl2);
			--input_padding_x: var(--space_sm);
			--chip_padding_x: var(--space_xs3);
			--icon_size: var(--icon_size_xs);
			--menuitem_padding: var(--space_xs5) var(--space_xs3);
			--flow_margin: var(--space_sm);
		`
	},
	sized_sm: {
		composite: true,
		comment:
			'Smaller sizing, one step down from the default, cascading to children. Works on individual elements or containers.',
		declaration: `
			--font_size: var(--font_size_sm);
			--input_height: var(--space_xl4);
			--input_height_compact: var(--space_xl3);
			--input_padding_x: var(--space_md);
			--chip_padding_x: var(--space_xs2);
			--icon_size: var(--icon_size_sm);
			--menuitem_padding: var(--space_xs4) var(--space_xs2);
			--flow_margin: var(--space_md);
		`
	},
	sized_md: {
		composite: true,
		comment: 'Default sizing restated explicitly, useful as a cascade reset within a sized parent.',
		declaration: `
			--font_size: var(--font_size_md);
			--input_height: var(--space_xl5);
			--input_height_compact: var(--space_xl4);
			--input_padding_x: var(--space_lg);
			--chip_padding_x: var(--space_xs);
			--icon_size: var(--icon_size_md);
			--menuitem_padding: var(--space_xs3) var(--space_xs);
			--flow_margin: var(--space_lg);
		`
	},
	sized_lg: {
		composite: true,
		comment:
			'Larger sizing, one step up from the default, cascading to children. Works on individual elements or containers.',
		declaration: `
			--font_size: var(--font_size_lg);
			--input_height: var(--space_xl6);
			--input_height_compact: var(--space_xl5);
			--input_padding_x: var(--space_xl);
			--chip_padding_x: var(--space_sm);
			--icon_size: var(--icon_size_lg);
			--menuitem_padding: var(--space_xs2) var(--space_sm);
			--flow_margin: var(--space_xl);
		`
	},
	sized_xl: {
		composite: true,
		comment:
			'Largest sizing, two steps up from the default, cascading to children. Works on individual elements or containers.',
		declaration: `
			--font_size: var(--font_size_xl);
			--input_height: var(--space_xl7);
			--input_height_compact: var(--space_xl6);
			--input_padding_x: var(--space_xl2);
			--chip_padding_x: var(--space_md);
			--icon_size: var(--icon_size_xl);
			--menuitem_padding: var(--space_xs) var(--space_md);
			--flow_margin: var(--space_xl2);
		`
	},
	mb_flow: {
		comment:
			'Flow-aware margin-bottom that responds to --flow_margin overrides from size composites.',
		declaration: 'margin-bottom: var(--flow_margin, var(--space_lg));'
	},
	mt_flow: {
		comment: 'Flow-aware margin-top that responds to --flow_margin overrides from size composites.',
		declaration: 'margin-top: var(--flow_margin, var(--space_lg));'
	},
	icon_button: {
		composite: true,
		comment: `
			TODO other button variants?
			TODO this is slightly strange that it doesn't use --icon_size.
			These are used as modifiers to buttons.
		`,
		declaration: `
			width: var(--input_height);
			height: var(--input_height);
			min-width: var(--input_height);
			min-height: var(--input_height);
			flex-shrink: 0;
			line-height: 1;
			font-weight: 900;
			padding: 0;
		`
	},
	plain: {
		comment:
			'TODO maybe this belongs with the reset, like `selected`? or does `selected` belong here?',
		ruleset: `
			.plain:not(.selected, [aria-pressed='true']) {
				--border_color: transparent;
			}
			.plain:not(.selected, [aria-pressed='true'], :hover) {
				box-shadow: none;
				--button_fill: transparent;
			}
		`
	},
	menuitem: {
		ruleset: `
			.menuitem {
				--border_color: var(--border_color_30);
				border-radius: 0;
				position: relative;
				cursor: pointer;
				width: 100%;
				min-height: var(--menuitem_min_height, var(--input_height_compact));
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: var(--menuitem_padding, var(--space_xs3) var(--space_xs));
			}
			/* aria-pressed takes the selected look but not its default cursor,
				since a pressed toggle can be unpressed, like .deselectable */
			.menuitem:is(.selected, [aria-pressed='true']) {
				/* TODO different patterns for border and surface? */
				--border_color: var(--accent_50);
				/* a selected button's label is the inverse for its solid fill, so over
					this light one it returns to the text color, hovered or not */
				--button_text_color: var(--text_color);
				background-color: var(--fg_10);
			}
			.menuitem.selected {
				cursor: default;
			}
			.menuitem.selected.deselectable:not(:disabled):not([aria-disabled='true']) {
				cursor: pointer;
			}
			.menuitem:hover {
				--border_color: var(--border_color_30);
				background-color: var(--fg_10);
			}
			.menuitem:active,
			.menuitem:is(.selected, [aria-pressed='true']):hover {
				--border_color: var(--border_color_30);
				background-color: var(--fg_20);
			}
			.menuitem.plain {
				border: none;
			}
			/* Highlight marks selection alone, so a focus ring takes the text color;
				before the selected rules, which outrank it to keep their ring */
			.menuitem:focus-visible {
				@media (forced-colors: active) {
					outline-color: CanvasText;
				}
			}
			/* forced colors drop the fill, so selection shows as a Highlight band
				inside the edge, moving out as a double ring when focused - the base
				button rules' pattern, restated here since those lose to composites */
			.menuitem:is(.selected, [aria-pressed='true']) {
				@media (forced-colors: active) {
					border-color: Highlight;
					outline: var(--outline_width_focus) solid Highlight;
					outline-offset: calc(-1 * (var(--border_width) + var(--outline_width_focus)));
				}
			}
			.menuitem:is(.selected, [aria-pressed='true']):focus-visible {
				@media (forced-colors: active) {
					outline: calc(2 * var(--outline_width_focus)) double Highlight;
					outline-offset: var(--outline_offset);
				}
			}
			.menuitem:is(.selected, [aria-pressed='true']):is(:disabled, [aria-disabled='true']) {
				@media (forced-colors: active) {
					border-color: GrayText;
					outline-color: GrayText;
				}
			}
			.menuitem .content {
				display: flex;
				align-items: center;
				flex: 1;
				/* allows the flex children to shrink */
				min-width: 0;
			}
			.menuitem .icon {
				width: var(--icon_size, var(--icon_size_md));
				margin-right: var(--space_sm);
				flex-shrink: 0;
				text-align: center;
				font-weight: 900;
			}
			.menuitem .title {
				margin-right: var(--space_lg);
				flex-shrink: 1;
				overflow: hidden;
				white-space: nowrap;
				text-overflow: ellipsis;
				line-height: var(--line_height_lg); /* prevents the bottom of g's and others from being cut off */
			}
		`
	},
	chevron: {
		ruleset: `
			.chevron {
				position: relative;
				height: 8px;
			}
			.chevron::before {
				display: block;
				content: '';
				border: 4px solid transparent;
				border-left-color: var(--text_70);
			}
		`
	},
	chip: {
		ruleset: `
			.chip {
				font-weight: 500;
				font-size: var(--font_size, revert-layer); /* without a size context, the element's base size wins */
				padding-left: var(--chip_padding_x, var(--space_xs));
				padding-right: var(--chip_padding_x, var(--space_xs));
				background-color: var(--fg_10);
				border-radius: var(--border_radius, var(--border_radius_xs));
			}
			a.chip {
				font-weight: 600;
			}
			${palette_variants
				.map(
					(letter) => `.chip.palette_${letter} {
				color: var(--palette_${letter}_60);
				--text_color: var(--palette_${letter}_60);
				background-color: var(--palette_${letter}_10);
			}`
				)
				.join('\n\t\t\t')}
		`
	}
};
