/**
 * Connect-time HMR resync over a real websocket: a client whose socket opens
 * after a missed CSS update must be pushed the fresh virtual module. The
 * middleware-mode dev tests can't reach this path (the plugin's connection
 * listener registers against Vite's noop ws stub), so this suite runs a
 * listening dev server and speaks the `vite-hmr` protocol with Node's global
 * `WebSocket`.
 *
 * @module
 */

import { describe, test, assert, afterAll } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { rm } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';

import { vite_plugin_fuz_css } from '$lib/vite_plugin_fuz_css.ts';

const fixture_root = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/vite_dev');

// scope extraction to the fixture's files (the default filter excludes
// src/test/ paths); .ts included so late_module.ts ingests on transform
const filter_fixture_file = (path: string): boolean =>
	path.endsWith('.html') || path.endsWith('late_module.ts');

afterAll(async () => {
	await rm(join(fixture_root, '.fuz'), { recursive: true, force: true });
});

interface WsSession {
	socket: WebSocket;
	messages: Array<{ type: string; [key: string]: unknown }>;
	close: () => void;
}

/** Opens a `vite-hmr` websocket and collects parsed messages. */
const connect_hmr = (port: number): Promise<WsSession> =>
	new Promise((resolve, reject) => {
		const socket = new WebSocket(`ws://127.0.0.1:${port}`, 'vite-hmr');
		const messages: Array<{ type: string; [key: string]: unknown }> = [];
		socket.addEventListener('message', (e) => {
			messages.push(JSON.parse(String(e.data)));
		});
		socket.addEventListener('open', () => {
			resolve({ socket, messages, close: () => socket.close() });
		});
		socket.addEventListener('error', () => {
			reject(new Error('websocket failed to connect'));
		});
	});

/** Polls until `predicate` or times out; resolves the predicate's result. */
const wait_for = async <T>(
	predicate: () => T | undefined,
	timeout = 3000,
	interval = 25
): Promise<T> => {
	const deadline = Date.now() + timeout;
	for (;;) {
		const result = predicate();
		if (result !== undefined) return result;
		if (Date.now() > deadline) throw new Error('timed out waiting');
		await new Promise((r) => setTimeout(r, interval));
	}
};

describe('vite_plugin_fuz_css connect-time resync', () => {
	test('a socket opening after a missed update is pushed the fresh CSS', async () => {
		let server: ViteDevServer | null = null;
		const sessions: Array<WsSession> = [];
		try {
			server = await createServer({
				root: fixture_root,
				configFile: false,
				logLevel: 'silent',
				server: { host: '127.0.0.1', port: 0 },
				optimizeDeps: { noDiscovery: true },
				plugins: [vite_plugin_fuz_css({ filter_file: filter_fixture_file })]
			});
			await server.listen();
			const port = (server.httpServer!.address() as AddressInfo).port;

			// first serve: the state every already-connected client holds
			const first = await server.transformRequest('/__fuz.css');
			assert(first);
			assert(first.code.includes('.p_md'), 'prescan classes served');
			assert(!first.code.includes('.mb_xl3'), 'late module not yet ingested');

			// a client connected while the CSS is current gets no update push
			const idle = await connect_hmr(port);
			sessions.push(idle);
			await wait_for(() => (idle.messages.some((m) => m.type === 'connected') ? true : undefined));
			await new Promise((r) => setTimeout(r, 150));
			assert.isFalse(
				idle.messages.some((m) => m.type === 'update'),
				'no update for an in-sync client'
			);
			idle.close();

			// diverge with no client connected: transforming the late module
			// ingests new classes and schedules the debounced push, which is
			// dropped because no socket is open
			await server.transformRequest('/extra/late_module.ts');
			await new Promise((r) => setTimeout(r, 100)); // let the debounce fire unheard

			// the resync: a socket opening now gets pushed the virtual module
			const late = await connect_hmr(port);
			sessions.push(late);
			const update = await wait_for(() =>
				late.messages.find(
					(m) =>
						m.type === 'update' &&
						JSON.stringify((m as { updates?: unknown }).updates ?? '').includes('__fuz.css')
				)
			);
			assert(update, 'the late client received the virtual CSS update');

			// the refetch the update triggers serves the diverged CSS
			const refetched = await server.transformRequest('/__fuz.css');
			assert(refetched);
			assert(refetched.code.includes('.mb_xl3'), 'refetch serves the late class');
		} finally {
			for (const s of sessions) s.close();
			await server?.close();
		}
	}, 20_000);
});
