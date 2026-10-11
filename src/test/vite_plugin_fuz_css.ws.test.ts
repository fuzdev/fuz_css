/**
 * The evaluation handshake over a real websocket: a client reporting that it
 * evaluated the virtual module must be pushed an update when it holds code a
 * refetch would replace, and left alone when it doesn't. The middleware-mode
 * dev tests can't reach this path (the hot channel there is Vite's noop
 * stub), so this suite runs a listening dev server and speaks the `vite-hmr`
 * protocol with Node's global `WebSocket`.
 *
 * @module
 */

import { describe, test, assert } from 'vitest';
import {
	createServer,
	type Logger,
	type Plugin,
	type ServerOptions,
	type UserConfig,
	type ViteDevServer
} from 'vite';
import type { AddressInfo } from 'node:net';

import { vite_plugin_fuz_css } from '#lib/vite_plugin_fuz_css.ts';
import {
	vite_dev_fixture_root as fixture_root,
	filter_dev_fixture_html_and_late_module as filter_fixture_file,
	use_suite_cache_dir,
	wait_for,
	create_capturing_logger,
	type CapturedLogs
} from './vite_plugin_test_helpers.ts';

const cache_dir = use_suite_cache_dir(fixture_root, '.fuz/ws_test');

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

// room for a listening server's startup and the waits on a loaded machine
const TEST_TIMEOUT = 20_000;

/**
 * The `fuz_css:evaluated` report in the virtual module's client code. Either
 * quote around the event name, for the test whose plugin reprints it.
 */
const EVALUATED_REPORT_MATCHER =
	/import\.meta\.hot\.send\(["']fuz_css:evaluated["'], \{"hash":"([0-9a-f]+)"\}\)/;

/** Reads the hash the virtual module's client code reports when evaluated. */
const parse_evaluated_hash = (code: string): string => {
	const match = EVALUATED_REPORT_MATCHER.exec(code);
	assert(match, 'the client code reports its evaluation');
	return match[1]!;
};

/** Sends the report a client makes when it evaluates the virtual module. */
const send_evaluated = (session: WsSession, hash: unknown): void => {
	session.socket.send(
		JSON.stringify({ type: 'custom', event: 'fuz_css:evaluated', data: { hash } })
	);
};

const count_css_updates = (session: WsSession): number =>
	session.messages.filter(
		(m) => m.type === 'update' && JSON.stringify(m.updates ?? '').includes('__fuz.css')
	).length;

/**
 * A test-only plugin that answers each `test:ping` with a `test:pong` to the
 * client that sent it - see `settle`.
 */
const plugin_ping: Plugin = {
	name: 'test-ping',
	configureServer(server) {
		server.environments.client.hot.on('test:ping', (_data, client) => client.send('test:pong', {}));
	}
};

const count_pongs = (session: WsSession): number =>
	session.messages.filter((m) => m.type === 'custom' && m.event === 'test:pong').length;

/**
 * Waits until the server has handled every message this session sent and
 * sent whatever it answers them with. The server handles a socket's messages
 * in order and answers a report synchronously, so once the pong for a ping
 * sent after them arrives, any push they caused has arrived before it.
 */
const settle = async (session: WsSession): Promise<void> => {
	const pongs = count_pongs(session);
	session.socket.send(JSON.stringify({ type: 'custom', event: 'test:ping', data: {} }));
	await wait_for(() => (count_pongs(session) > pongs ? true : undefined));
};

describe('vite_plugin_fuz_css evaluation handshake', () => {
	const with_listening_server = async (
		fn: (server: ViteDevServer, connect: () => Promise<WsSession>) => Promise<void>,
		config?: {
			server?: ServerOptions;
			plugins?: Array<Plugin>;
			future?: UserConfig['future'];
			customLogger?: Logger;
		}
	): Promise<void> => {
		let server: ViteDevServer | null = null;
		const sessions: Array<WsSession> = [];
		try {
			server = await createServer({
				root: fixture_root,
				configFile: false,
				logLevel: 'silent',
				server: { host: '127.0.0.1', port: 0, ...config?.server },
				optimizeDeps: { noDiscovery: true },
				future: config?.future,
				customLogger: config?.customLogger,
				plugins: [
					vite_plugin_fuz_css({ filter_file: filter_fixture_file, cache_dir }),
					plugin_ping,
					...(config?.plugins ?? [])
				]
			});
			await server.listen();
			const port = (server.httpServer!.address() as AddressInfo).port;
			await fn(server, async () => {
				const session = await connect_hmr(port);
				sessions.push(session);
				await wait_for(() =>
					session.messages.some((m) => m.type === 'connected') ? true : undefined
				);
				return session;
			});
		} finally {
			for (const s of sessions) s.close();
			await server?.close();
		}
	};

	test(
		'only the client code of the bare module reports its evaluation',
		async () => {
			await with_listening_server(async (server) => {
				const client = await server.transformRequest('/__fuz.css');
				assert(client);
				parse_evaluated_hash(client.code);

				const direct = await server.transformRequest('/__fuz.css?direct');
				assert(direct);
				assert(!direct.code.includes('fuz_css:evaluated'), 'the direct CSS has no report');

				const ssr = await server.environments.ssr.transformRequest('/__fuz.css');
				assert(ssr);
				assert(!ssr.code.includes('fuz_css:evaluated'), 'the server module has no report');

				const inlined = await server.ssrLoadModule('/__fuz.css?inline');
				assert(!inlined.default.includes('fuz_css:evaluated'), 'the inlined CSS has no report');
			});
		},
		TEST_TIMEOUT
	);

	test(
		'a client that evaluated the current module is not pushed',
		async () => {
			await with_listening_server(async (server, connect) => {
				const first = await server.transformRequest('/__fuz.css');
				assert(first);
				const client = await connect();
				await settle(client);
				assert.strictEqual(count_css_updates(client), 0, 'connecting alone pushes nothing');

				send_evaluated(client, parse_evaluated_hash(first.code));
				await settle(client);
				assert.strictEqual(count_css_updates(client), 0);
			});
		},
		TEST_TIMEOUT
	);

	test(
		'a client that evaluated a module it missed the update for is pushed, once',
		async () => {
			await with_listening_server(async (server, connect) => {
				// first serve: the code a page loading now starts to evaluate
				const first = await server.transformRequest('/__fuz.css');
				assert(first);
				assert(first.code.includes('.p_md'), 'prescan classes served');
				assert(!first.code.includes('.mb_xl3'), 'late module not yet ingested');
				const stale_hash = parse_evaluated_hash(first.code);

				// a bystander that holds the same code and takes the broadcast update
				const bystander = await connect();

				// diverge: transforming the late module ingests new classes and
				// schedules the debounced update, which the loading page's client
				// drops because the module hasn't evaluated yet
				await server.transformRequest('/extra/late_module.ts');
				await wait_for(() => (count_css_updates(bystander) === 1 ? true : undefined));

				// the page finishes loading and reports the code it evaluated, while
				// the module is invalidated and nothing has refetched it
				const late = await connect();
				send_evaluated(late, stale_hash);
				await wait_for(() => (count_css_updates(late) === 1 ? true : undefined));

				// the refetch the update triggers serves the diverged CSS
				const refetched = await server.transformRequest('/__fuz.css');
				assert(refetched);
				assert(refetched.code.includes('.mb_xl3'), 'refetch serves the late class');
				const current_hash = parse_evaluated_hash(refetched.code);
				assert.notStrictEqual(current_hash, stale_hash);

				// the refetched module evaluates and reports again: the exchange ends
				send_evaluated(late, current_hash);
				await settle(late);
				assert.strictEqual(count_css_updates(late), 1, 'no second update for the current code');
				assert.strictEqual(count_css_updates(bystander), 1, 'the push went to the reporter only');

				// another client still holding the first code, now that the module
				// is cached with the current one
				const later = await connect();
				send_evaluated(later, stale_hash);
				await wait_for(() => (count_css_updates(later) === 1 ? true : undefined));
				assert.strictEqual(count_css_updates(late), 1);
				assert.strictEqual(count_css_updates(bystander), 1);
			});
		},
		TEST_TIMEOUT
	);

	test(
		'a client pushed for a hash is pushed for it again after holding the current code',
		async () => {
			await with_listening_server(async (server, connect) => {
				const first = await server.transformRequest('/__fuz.css');
				assert(first);
				const earlier_hash = parse_evaluated_hash(first.code);
				const client = await connect();

				// the CSS moves on: the broadcast update, then a push for the
				// client's report of the code it held before
				await server.transformRequest('/extra/late_module.ts');
				await wait_for(() => (count_css_updates(client) === 1 ? true : undefined));
				send_evaluated(client, earlier_hash);
				await wait_for(() => (count_css_updates(client) === 2 ? true : undefined));

				// its refetch reports the current code, which ends that exchange
				const refetched = await server.transformRequest('/__fuz.css');
				assert(refetched);
				send_evaluated(client, parse_evaluated_hash(refetched.code));
				await settle(client);
				assert.strictEqual(count_css_updates(client), 2);

				// holding the earlier code again while it's stale - CSS that
				// returned to a prior state, then moved on - is answered anew
				send_evaluated(client, earlier_hash);
				await wait_for(() => (count_css_updates(client) === 3 ? true : undefined));

				// and still only once until it reports the current code
				send_evaluated(client, earlier_hash);
				await settle(client);
				assert.strictEqual(count_css_updates(client), 3);
			});
		},
		TEST_TIMEOUT
	);

	test(
		'a report whose statement a later plugin reprinted is pushed once per code',
		async () => {
			// a stand-in for an `enforce: 'post'` plugin that reprints modules: the
			// cached transform no longer holds the report statement verbatim, so no
			// report can match it
			const plugin_reprint: Plugin = {
				name: 'reprint',
				enforce: 'post',
				transform(code, id) {
					if (id !== '/__fuz.css') return null;
					return { code: code.replace('"fuz_css:evaluated"', "'fuz_css:evaluated'"), map: null };
				}
			};
			await with_listening_server(
				async (server, connect) => {
					const first = await server.transformRequest('/__fuz.css');
					assert(first);
					assert(first.code.includes("'fuz_css:evaluated'"), 'the statement was reprinted');
					const hash = parse_evaluated_hash(first.code);
					const client = await connect();

					// each refetch serves the same code, which reports the same hash
					send_evaluated(client, hash);
					await wait_for(() => (count_css_updates(client) === 1 ? true : undefined));
					send_evaluated(client, hash);
					send_evaluated(client, hash);
					await settle(client);
					assert.strictEqual(count_css_updates(client), 1, 'the exchange ends');

					// a later change still reaches the client: the broadcast update,
					// then one push for the new code's report
					await server.transformRequest('/extra/late_module.ts');
					await wait_for(() => (count_css_updates(client) === 2 ? true : undefined));
					const refetched = await server.transformRequest('/__fuz.css');
					assert(refetched);
					assert(refetched.code.includes('.mb_xl3'));
					const next_hash = parse_evaluated_hash(refetched.code);
					assert.notStrictEqual(next_hash, hash);
					send_evaluated(client, next_hash);
					await wait_for(() => (count_css_updates(client) === 3 ? true : undefined));
					send_evaluated(client, next_hash);
					await settle(client);
					assert.strictEqual(count_css_updates(client), 3);

					// the bound is per client: another one holding the first code is answered
					const other = await connect();
					send_evaluated(other, hash);
					await wait_for(() => (count_css_updates(other) === 1 ? true : undefined));
				},
				{ plugins: [plugin_reprint] }
			);
		},
		TEST_TIMEOUT
	);

	test(
		'the module does not report where no hot update could answer',
		async () => {
			// with HMR off the server sends no updates
			await with_listening_server(
				async (server) => {
					const client = await server.transformRequest('/__fuz.css');
					assert(client);
					assert(client.code.includes('.p_md'));
					assert(!client.code.includes('fuz_css:evaluated'));
				},
				{ server: { hmr: false } }
			);
			// without a websocket the report could not be sent at all
			await with_listening_server(
				async (server) => {
					const client = await server.transformRequest('/__fuz.css');
					assert(client);
					assert(client.code.includes('.p_md'));
					assert(!client.code.includes('fuz_css:evaluated'));
				},
				{ server: { ws: false } }
			);
		},
		TEST_TIMEOUT
	);

	test(
		'the update and the handshake reach none of the dev server APIs Vite is removing',
		async () => {
			// Vite replaces the mixed `server.moduleGraph` and `server.hot` with
			// per-environment ones, and these flags warn on each use of the old
			const logs: CapturedLogs = { warnings: [], errors: [] };
			await with_listening_server(
				async (server, connect) => {
					const first = await server.transformRequest('/__fuz.css');
					assert(first);
					const client = await connect();

					// the debounced update: invalidation and the broadcast push
					await server.transformRequest('/extra/late_module.ts');
					await wait_for(() => (count_css_updates(client) === 1 ? true : undefined));

					// the handshake: a report of stale code, answered with a push
					send_evaluated(client, parse_evaluated_hash(first.code));
					await wait_for(() => (count_css_updates(client) === 2 ? true : undefined));
				},
				{
					future: { removeServerModuleGraph: 'warn', removeServerHot: 'warn' },
					customLogger: create_capturing_logger(logs)
				}
			);
			assert.deepEqual(
				logs.warnings.filter((w) => w.includes('vite future')),
				[],
				'no deprecated server API was reached'
			);
		},
		TEST_TIMEOUT
	);

	test(
		'a malformed report is ignored',
		async () => {
			await with_listening_server(async (server, connect) => {
				const first = await server.transformRequest('/__fuz.css');
				assert(first);
				const client = await connect();
				send_evaluated(client, 123);
				client.socket.send(JSON.stringify({ type: 'custom', event: 'fuz_css:evaluated' }));
				await settle(client);
				assert.strictEqual(count_css_updates(client), 0);

				// the server is still answering reports
				send_evaluated(client, 'not the current hash');
				await wait_for(() => (count_css_updates(client) === 1 ? true : undefined));
			});
		},
		TEST_TIMEOUT
	);
});
