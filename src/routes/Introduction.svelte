<script lang="ts">
	import { resolve } from '$app/paths';

	import UnfinishedImplementationWarning from './docs/UnfinishedImplementationWarning.svelte';
</script>

<p>
	fuz_css is a semantic-first CSS framework and design system. Semantic HTML looks finished with
	zero classes: headings, links, buttons, forms, tables, and callouts come styled, and block
	elements space themselves. Themes are a handful of knobs, not a stylesheet: hues, intents,
	lightness curves, and scales re-derive every color and size in plain CSS, and the contrast, gamut,
	and ramp-order checks the shipped themes pass are an API for checking your own. See the
	<a href={resolve('/docs/themes')}>themes</a> and try the editor.
</p>
<p>
	The <a href={resolve('/docs/setup')}>Vite plugin</a> generates one stylesheet with the theme
	variables, base styles, and <a href={resolve('/docs/classes')}>utility classes</a> your code uses,
	for Svelte, React, Preact, Solid, and plain HTML. Without a build step, link the package's two
	plain stylesheets. For companion Svelte components see <a href="https://ui.fuz.dev/">fuz_ui</a>.
</p>
<p>
	More at the <a href={resolve('/docs')}>docs</a> and
	<a href="https://github.com/fuzdev/fuz_css">repo</a>.
</p>

<UnfinishedImplementationWarning>
	fuz_css is in early alpha with breaking changes ahead. Your input and feedback is appreciated in
	the GitHub issues for bugs and
	<a href="https://github.com/fuzdev/fuz_css/discussions">discussions</a> for everything else.
</UnfinishedImplementationWarning>
