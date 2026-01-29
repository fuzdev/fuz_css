/**
 * Hash utilities for cache invalidation.
 *
 * Provides both async (SHA-256) and sync (DJB2-style) hash functions
 * for different use cases in the CSS generation pipeline.
 *
 * @module
 */

// TODO BLOCK upstream to fuz_util

/**
 * Computes SHA-256 hash of content using Web Crypto API.
 * Use for file content hashing where async is acceptable.
 *
 * @param content - String content to hash
 * @returns Hex-encoded SHA-256 hash
 */
export const compute_hash = async (content: string): Promise<string> => {
	const encoder = new TextEncoder();
	const buffer = encoder.encode(content);
	const digested = await crypto.subtle.digest('SHA-256', buffer);
	const bytes = Array.from(new Uint8Array(digested));
	let hex = '';
	for (const h of bytes) {
		hex += h.toString(16).padStart(2, '0');
	}
	return hex;
};

/**
 * Computes a simple synchronous hash for content-based cache invalidation.
 * Uses DJB2 algorithm - not cryptographic, just for comparison.
 * Use for in-memory content where sync is preferred (variable graphs, etc).
 *
 * @param str - String content to hash
 * @returns Hex-encoded hash
 */
export const compute_hash_sync = (str: string): string => {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash |= 0; // Convert to 32-bit integer
	}
	return hash.toString(16);
};
