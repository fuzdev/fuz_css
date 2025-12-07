import type {Flavored} from '@fuzdev/fuz_util/types.js';

// TODO maybe rename this module to `style_variable` for consistency? what about `variables`?

export type StyleVariableName = Flavored<string, 'StyleVariableName'>;

export interface StyleVariable {
	name: StyleVariableName;
	light?: string;
	dark?: string;
	summary?: string;
}

export const STYLE_VARIABLE_NAME_MATCHER = /^[a-z][a-z0-9_]*(?<!_)$/;

export const is_style_variable_name = (name: string): name is StyleVariableName =>
	STYLE_VARIABLE_NAME_MATCHER.test(name);
