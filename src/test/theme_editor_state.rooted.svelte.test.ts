/**
 * @vitest-environment jsdom
 */

// the client build: on the server `$effect.root` never runs its callback

import { test, assert, describe } from 'vitest';

import { ThemeEditorState, create_rooted_theme_editor } from '#routes/theme_editor_state.svelte.ts';
import { base_theme } from '#lib/themes/base.ts';
import { marquee_theme } from '#lib/themes/marquee.ts';

const themes = [base_theme, marquee_theme];

describe('create_rooted_theme_editor', () => {
	// a destroyed effect root stands in for the page component that first
	// creates the session editor and is destroyed by navigating away
	const create_in_destroyed_owner = (create: () => ThemeEditorState): ThemeEditorState => {
		let editor: ThemeEditorState | null = null;
		const destroy = $effect.root(() => {
			editor = create();
			assert.isFalse(editor.dirty); // read while the owner is alive
		});
		destroy();
		return editor!;
	};

	test('an editor owned by a destroyed effect stops updating', () => {
		const editor = create_in_destroyed_owner(() => new ThemeEditorState({ themes }));
		editor.set_value('chroma_scale', '0.5', 'light');
		assert.isFalse(editor.dirty, 'the inert derived is stale');
	});

	test('a rooted editor keeps updating after its creator is destroyed', () => {
		const editor = create_in_destroyed_owner(() => create_rooted_theme_editor({ themes }));
		editor.set_value('chroma_scale', '0.5', 'light');
		assert.isTrue(editor.dirty);
	});
});
