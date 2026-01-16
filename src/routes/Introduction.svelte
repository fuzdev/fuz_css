<script lang="ts">
	import {resolve} from '$app/paths';

	import UnfinishedImplementationWarning from '$routes/docs/UnfinishedImplementationWarning.svelte';
</script>

<p>
	fuz_css is a framework and design system built on semantic styles and style variables. It styles
	HTML elements by default and integrates custom properties, themes, and utility classes into a
	complete system. It's Svelte-first but works with plain HTML/JS/TS, React, Preact, Solid, and
	other JSX frameworks. For more see the
	<a href={resolve('/docs/classes#Framework-support' as any)}>framework support</a> docs, and for
	the companion Svelte components, see <a href="https://ui.fuz.dev/">fuz_ui</a>.
</p>
<p>
	The only required parts are a reset stylesheet with the semantic defaults and a replaceable theme
	stylesheet containing the variables used in the reset, and these require no dependencies. There's
	also
	<a href={resolve('/docs/classes')}>utility classes</a>
	for composition and convenience with a Vite plugin, and the library exports the full API for complex
	usage.
</p>
<p>
	More at the <a href={resolve('/docs')}>docs</a>
	and <a href="https://github.com/fuzdev/fuz_css">repo</a>.
</p>

<UnfinishedImplementationWarning>
	fuz_css is in early alpha with breaking changes ahead. Your input and feedback is appreciated in
	the GitHub <a href="https://github.com/fuzdev/fuz_css/discussions">discussions</a>.
</UnfinishedImplementationWarning>
