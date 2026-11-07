/**
 * CI detection, read once from `process.env.CI`. CI flips two generator
 * defaults: the extraction cache is skipped, since the next run won't reuse
 * it, and `on_error` throws rather than logs.
 *
 * @internal
 *
 * @module
 */

/**
 * Parses a `CI` environment variable value. Any value is CI except unset,
 * empty, `false`, and `0` (case-insensitive, surrounding whitespace
 * ignored), so `CI=false` turns CI behavior off rather than on.
 *
 * @param value - the `CI` environment variable, if set
 * @returns whether the value marks a CI run
 */
export const parse_ci_value = (value: string | undefined): boolean => {
	if (value === undefined) return false;
	const normalized = value.trim().toLowerCase();
	return normalized !== '' && normalized !== 'false' && normalized !== '0';
};

/**
 * Whether this is a CI run, per `parse_ci_value` on `process.env.CI`. Read by
 * the generator for its cache and `on_error` defaults.
 */
export const is_ci = parse_ci_value(process.env.CI);
