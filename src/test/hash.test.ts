import {test, expect, describe} from 'vitest';

import {compute_hash, compute_hash_sync} from '$lib/hash.js';

describe('compute_hash (SHA-256)', () => {
	test('identical inputs produce identical outputs', async () => {
		const input = 'hello world';
		const hash1 = await compute_hash(input);
		const hash2 = await compute_hash(input);
		expect(hash1).toBe(hash2);
	});

	test('different inputs produce different outputs', async () => {
		const hash1 = await compute_hash('hello');
		const hash2 = await compute_hash('world');
		expect(hash1).not.toBe(hash2);
	});

	test('unicode/special characters', async () => {
		const hash1 = await compute_hash('こんにちは');
		const hash2 = await compute_hash('🎉🎊');
		const hash3 = await compute_hash('café');

		expect(typeof hash1).toBe('string');
		expect(typeof hash2).toBe('string');
		expect(typeof hash3).toBe('string');
		expect(hash1.length).toBe(64);
		expect(hash2.length).toBe(64);
		expect(hash3.length).toBe(64);
	});

	test('consistent across multiple calls', async () => {
		const input = 'test content for consistency';
		const hashes = await Promise.all([
			compute_hash(input),
			compute_hash(input),
			compute_hash(input),
		]);
		expect(hashes[0]).toBe(hashes[1]);
		expect(hashes[1]).toBe(hashes[2]);
	});

	test('produces valid hex string', async () => {
		const hash = await compute_hash('test');
		expect(hash).toMatch(/^[0-9a-f]{64}$/);
	});

	test('produces known hash for known input', async () => {
		// SHA-256 of empty string is a well-known value
		const hash = await compute_hash('');
		expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
	});
});

describe('compute_hash_sync (DJB2)', () => {
	test('identical inputs produce identical outputs', () => {
		const input = 'hello world';
		const hash1 = compute_hash_sync(input);
		const hash2 = compute_hash_sync(input);
		expect(hash1).toBe(hash2);
	});

	test('different inputs produce different outputs', () => {
		const hash1 = compute_hash_sync('hello');
		const hash2 = compute_hash_sync('world');
		expect(hash1).not.toBe(hash2);
	});

	test('empty string returns consistent hash', () => {
		const hash1 = compute_hash_sync('');
		const hash2 = compute_hash_sync('');
		expect(hash1).toBe(hash2);
		expect(hash1).toBe('0'); // DJB2 of empty string is 0
	});

	test('negative hash values handled correctly', () => {
		// DJB2 can produce negative values before |= 0 conversion
		// The result should still be a valid hex string
		const hash = compute_hash_sync('a string that might produce negative hash');
		expect(typeof hash).toBe('string');
		// Hex string may start with '-' for negative numbers
		expect(hash).toMatch(/^-?[0-9a-f]+$/);
	});

	test('unicode characters produce valid hashes', () => {
		const hash1 = compute_hash_sync('こんにちは');
		const hash2 = compute_hash_sync('🎉');
		const hash3 = compute_hash_sync('café');

		// All produce valid hex strings
		expect(hash1).toMatch(/^-?[0-9a-f]+$/);
		expect(hash2).toMatch(/^-?[0-9a-f]+$/);
		expect(hash3).toMatch(/^-?[0-9a-f]+$/);

		// Same input produces same output (consistency, not uniqueness)
		expect(compute_hash_sync('こんにちは')).toBe(hash1);
		expect(compute_hash_sync('🎉')).toBe(hash2);
	});

	test('consistent across multiple calls', () => {
		const input = 'test content for consistency';
		const hashes = [
			compute_hash_sync(input),
			compute_hash_sync(input),
			compute_hash_sync(input),
		];
		expect(hashes[0]).toBe(hashes[1]);
		expect(hashes[1]).toBe(hashes[2]);
	});

	test('produces known hash for known input (algorithm stability)', () => {
		// Lock in DJB2 algorithm - changing this would invalidate all caches
		expect(compute_hash_sync('hello')).toBe('5e918d2');
		expect(compute_hash_sync('hello world')).toBe('6aefe2c4');
	});
});
