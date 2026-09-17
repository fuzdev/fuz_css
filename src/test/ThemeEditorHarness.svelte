<script lang="ts">
	// Test harness: sets the theme-state context `ThemeEditor` and its
	// children (`ResolvedColor` probes, fuz_ui pickers) read during init.
	import { theme_state_context, type ThemeState } from '@fuzdev/fuz_ui/theme_state.svelte.ts';

	import ThemeEditor from '$routes/ThemeEditor.svelte';
	import type { ThemeEditorState } from '$routes/theme_editor_state.svelte.ts';

	const { editor, theme_state }: { editor: ThemeEditorState; theme_state: ThemeState } = $props();

	theme_state_context.set(() => theme_state);
</script>

<ThemeEditor {editor} {theme_state} />
