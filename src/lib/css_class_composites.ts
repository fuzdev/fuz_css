import type {CssClassDefinition} from './css_class_generation.js';

export const css_class_composites: Record<string, CssClassDefinition | undefined> = {
	pixelated: {
		declaration: `
			image-rendering: -webkit-optimize-contrast; /* Safari */
			image-rendering: -o-crisp-edges; /* OS X & Windows Opera (12.02+) */
			image-rendering: pixelated; /* in case crisp-edges isn't supported */
			image-rendering: crisp-edges; /* the recommended pixel art setting according to MDN */
		`,
	},
	circular: {
		declaration: 'border-radius: 50%;',
	},
	box: {
		declaration: `
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
		`,
	},
	column: {
		comment: 'like `.box` but uncentered',
		declaration: `
			display: flex;
			flex-direction: column;
		`,
	},
	row: {
		comment: 'can be used to override the direction of a `.box`',
		declaration: `
			display: flex;
			flex-direction: row;
			align-items: center;
		`,
	},
	formatted: {
		comment: 'Formats content to wrap long strings and preserve displayed whitespace.',
		declaration: `
			overflow: hidden;
			white-space: break-spaces;
		`,
	},
	ellipsis: {
		declaration: `
			display: block;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		`,
	},
	width_upto_xs: {
		declaration: 'width: 100%; max-width: var(--distance_xs);',
	},
	width_upto_sm: {
		declaration: 'width: 100%; max-width: var(--distance_sm);',
	},
	width_upto_md: {
		declaration: 'width: 100%; max-width: var(--distance_md);',
	},
	width_upto_lg: {
		declaration: 'width: 100%; max-width: var(--distance_lg);',
	},
	width_upto_xl: {
		declaration: 'width: 100%; max-width: var(--distance_xl);',
	},
	width_atleast_xs: {
		declaration: 'width: 100%; min-width: var(--distance_xs);',
	},
	width_atleast_sm: {
		declaration: 'width: 100%; min-width: var(--distance_sm);',
	},
	width_atleast_md: {
		declaration: 'width: 100%; min-width: var(--distance_md);',
	},
	width_atleast_lg: {
		declaration: 'width: 100%; min-width: var(--distance_lg);',
	},
	width_atleast_xl: {
		declaration: 'width: 100%; min-width: var(--distance_xl);',
	},
	// TODO rethink if this breaks too often or confusingly, `height: 100%` depends on the parent and often won't take effect
	height_upto_xs: {
		declaration: 'height: 100%; max-height: var(--distance_xs);',
	},
	height_upto_sm: {
		declaration: 'height: 100%; max-height: var(--distance_sm);',
	},
	height_upto_md: {
		declaration: 'height: 100%; max-height: var(--distance_md);',
	},
	height_upto_lg: {
		declaration: 'height: 100%; max-height: var(--distance_lg);',
	},
	height_upto_xl: {
		declaration: 'height: 100%; max-height: var(--distance_xl);',
	},
	height_atleast_xs: {
		declaration: 'height: 100%; min-height: var(--distance_xs);',
	},
	height_atleast_sm: {
		declaration: 'height: 100%; min-height: var(--distance_sm);',
	},
	height_atleast_md: {
		declaration: 'height: 100%; min-height: var(--distance_md);',
	},
	height_atleast_lg: {
		declaration: 'height: 100%; min-height: var(--distance_lg);',
	},
	height_atleast_xl: {
		declaration: 'height: 100%; min-height: var(--distance_xl);',
	},
	selectable: {
		ruleset: `
			.selectable {
				--button_fill: color-mix(in hsl, var(--fill) 8%, transparent);
				--button_fill_hover: color-mix(in hsl, var(--fill) 16%, transparent);
				--button_fill_active: color-mix(in hsl, var(--fill) 24%, transparent);
				cursor: pointer;
				background-color: var(--button_fill);
				border-color: var(--border_color_3);
				border-style: var(--border_style);
				border-width: var(--border_width);
			}
			.selectable:hover {
				background-color: var(--button_fill_hover);
				border-color: var(--border_color_2);
			}
			.selectable.selected,
			.selectable:active {
				background-color: var(--button_fill_active);
				border-color: var(--color_a_5);
			}
			.selectable.selected {
				cursor: default;
			}
			.selectable.selected.deselectable:not(:disabled) {
				cursor: pointer;
			}
		`,
	},
	clickable: {
		ruleset: `
			.clickable {
				cursor: pointer;
				transform: var(--clickable_transform, scale3d(1, 1, 1));
				transform-origin: var(--clickable_transform_origin);
				transition-duration: var(--clickable_transition_duration); /* default to instant, chunky/lofi */
			}
			.clickable:focus {
				transform: var(--clickable_transform_focus, scale3d(1.07, 1.07, 1.07));
			}
			.clickable:hover {
				transform: var(--clickable_transform_hover, scale3d(1.1, 1.1, 1.1));
			}
			.clickable:active,
			.clickable.active {
				transform: var(--clickable_transform_active, scale3d(1.2, 1.2, 1.2));
			}
		`,
	},
	pane: {
		comment:
			"A pane is a box floating over the page, like for dialogs. By default it's opaque, resetting the background to the initial depth.",
		declaration: `
			background-color: var(--pane_bg, var(--bg));
			box-shadow: var(--pane_shadow, var(--shadow_bottom_md) color-mix(in hsl, var(--shadow_color) var(--shadow_alpha_3), transparent));
			border-radius: var(--border_radius_xs);
		`,
	},
	panel: {
		comment: 'A panel is a box embedded into the page, useful for visually isolating content.',
		declaration: `
			border-radius: var(--border_radius_xs);
			background-color: var(--panel_bg, var(--fg_1));
		`,
	},
	icon_button: {
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
		`,
	},
	plain: {
		comment:
			'TODO maybe this belongs with the reset, like `selected`? or does `selected` belong here?',
		ruleset: `
			.plain:not(:hover) {
				--border_color: transparent;
				box-shadow: none;
				--button_fill: transparent;
			}
			.plain:hover, .plain:active {
				--border_color: transparent;
			}
		`,
	},
	menu_item: {
		ruleset: `
			.menu_item {
				--border_radius: 0;
				--border_color: var(--border_color_3);
				position: relative;
				z-index: 2;
				cursor: pointer;
				width: 100%;
				min-height: var(--min_height, var(--icon_size_sm));
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: var(--menu_item_padding, var(--space_xs3) var(--space_xs));
			}
			.menu_item.selected {
				/* TODO different patterns for border and bg? */
				--border_color: var(--color_a_5);
				background-color: var(--fg_1);
				z-index: 1;
				cursor: default;
			}
			.menu_item.selected.deselectable:not(:disabled) {
				cursor: pointer;
			}
			.menu_item:hover {
				--border_color: var(--border_color_3);
				background-color: var(--fg_0);
			}
			.menu_item:active,
			.menu_item.selected:hover {
				--border_color: var(--border_color_3);
				background-color: var(--fg_2);
			}
			.menu_item.plain {
				border: none;
			}
			.menu_item .content {
				display: flex;
				align-items: center;
				flex: 1;
				/* allows the flex children to shrink */
				min-width: 0;
			}
			.menu_item .icon {
				width: var(--icon_size, var(--icon_size_md));
				margin-right: var(--space_sm);
				flex-shrink: 0;
				text-align: center;
				font-weight: 900;
			}
			.menu_item .title {
				margin-right: var(--space_lg);
				flex-shrink: 1;
				overflow: hidden;
				white-space: nowrap;
				text-overflow: ellipsis;
				line-height: var(--line_height_lg); /* prevents the bottom of g's and others from being cut off */
			}
		`,
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
				border-left-color: var(--text_color_3);
			}
		`,
	},
	chip: {
		ruleset: `
			.chip {
				font-weight: 500;
				padding-left: var(--space_xs);
				padding-right: var(--space_xs);
				background-color: var(--fg_1);
				border-radius: var(--border_radius_xs);
			}
			a.chip {
				font-weight: 600;
			}
		`,
	},
};
