<script lang="ts">
	import {resolve} from '$app/paths';

	import ModuleLink from '$routes/ModuleLink.svelte';
	import UnfinishedImplementationWarning from '$routes/docs/UnfinishedImplementationWarning.svelte';
</script>

<p>
	Fuz CSS is a framework and design system built on semantic styles and style variables. It styles
	HTML elements by default and integrates custom properties, themes, and utility classes into a
	coherent system. It's Svelte-first but works with plain HTML/JS/TS, React, Preact, Solid, and
	other JSX frameworks. See the
	<a href={resolve('/docs/classes#Framework-support' as any)}>framework support docs</a> and
	<a href="https://ui.fuz.dev/">Fuz UI</a> for the companion Svelte components.
</p>
<p>
	The only required parts are a
	<ModuleLink path="style.css">reset stylesheet</ModuleLink> with the semantic defaults and a replaceable
	<ModuleLink path="theme.css">theme stylesheet</ModuleLink> containing the variables used in the reset
	-- these require no additional dependencies. There's also a
	<a href={resolve('/docs/classes')}>utility class system</a>
	for composition and convenience, and it <a href="https://css.fuz.dev/docs/api">exports</a> the underlying
	data, types, and helpers for more complex usage.
</p>
<p>
	More at <a href={resolve('/docs')}>the docs</a>
	and <a href="https://github.com/fuzdev/fuz_css">repo</a>.
</p>

<UnfinishedImplementationWarning>
	Fuz CSS is in early alpha with breaking changes ahead. Input and feedback is appreciated in the
	GitHub
	<a href="https://github.com/fuzdev/fuz_css/issues">issues</a> and
	<a href="https://github.com/fuzdev/fuz_css/discussions">discussions</a>.
</UnfinishedImplementationWarning>
