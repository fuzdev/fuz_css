import {z} from 'zod';

// TODO maybe rename this module to `style_variable` for consistency? what about `variables`?

export const STYLE_VARIABLE_NAME_MATCHER = /^[a-z][a-z0-9_]*(?<!_)$/;

export const StyleVariableName = z
	.string()
	.regex(STYLE_VARIABLE_NAME_MATCHER, 'invalid style variable name');
export type StyleVariableName = z.infer<typeof StyleVariableName>;

/**
 * Zod schema for validating `StyleVariable` objects.
 * Use `safeParse` for validation; the `StyleVariable` type is defined separately
 * to preserve the `Flavored` brand on `name`.
 */
export const StyleVariable = z
	.object({
		name: StyleVariableName,
		light: z.string().optional(),
		dark: z.string().optional(),
		summary: z.string().optional(),
	})
	.refine((v) => v.light !== undefined || v.dark !== undefined, {
		message: 'must have at least one of light or dark',
	})
	.refine((v) => !(v.light !== undefined && v.dark !== undefined && v.light === v.dark), {
		message: 'light and dark must differ when both specified',
		path: ['dark'],
	});
export type StyleVariable = z.infer<typeof StyleVariable>;
