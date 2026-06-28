<script lang="ts">
	import {resolve} from '$app/paths';

	import UnfinishedImplementationWarning from './docs/UnfinishedImplementationWarning.svelte';
</script>

<p>
	fuz_css is a CSS framework and design system for semantic HTML. It styles elements by default and
	integrates custom properties, themes, and utility classes into a complete system. It ships two
	plain CSS files, the base <code>style.css</code> and replaceable <code>theme.css</code>, that work
	with any framework and plain HTML, and its class generator supports HTML/JS/TS, Svelte, React,
	Preact, Solid, and other JSX frameworks. For more see the
	<a href={resolve('/docs/classes#Framework-support' as any)}>framework support</a> docs, and for
	the companion Svelte components see <a href="https://ui.fuz.dev/">fuz_ui</a>.
</p>
<p>
	The only required parts are a reset stylesheet with the semantic defaults and a replaceable theme
	stylesheet containing the variables used in the reset, and these require no dependencies. There's
	also
	<a href={resolve('/docs/classes')}>utility classes</a>
	for composition and convenience with a Vite plugin, and the library exports the full API for
	complex usage.
</p>
<p>
	More at the <a href={resolve('/docs')}>docs</a>
	and <a href="https://github.com/fuzdev/fuz_css">repo</a>.
</p>

<UnfinishedImplementationWarning>
	fuz_css is in early alpha with breaking changes ahead. Your input and feedback is appreciated in
	the GitHub issues for bugs and <a href="https://github.com/fuzdev/fuz_css/discussions"
		>discussions</a
	> for everything else.
</UnfinishedImplementationWarning>
