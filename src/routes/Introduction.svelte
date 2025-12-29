<script lang="ts">
	import MdnLink from '@fuzdev/fuz_ui/MdnLink.svelte';
	import {resolve} from '$app/paths';

	import ModuleLink from '$routes/ModuleLink.svelte';
	import UnfinishedImplementationWarning from '$routes/docs/UnfinishedImplementationWarning.svelte';
</script>

<p>
	Fuz CSS is a CSS framework and design system built around semantic styles and style variables.
	Semantic styles mean HTML elements are styled by default, with <code>.unstyled</code>
	to opt out when needed. Style variables are design tokens and <MdnLink path="Web/CSS/--*"
		>CSS custom properties</MdnLink
	> with particular capabilities and conventions that integrate with the semantic styles and other features
	like utility classes.
</p>
<p>
	The only required parts are a
	<ModuleLink path="style.css">reset stylesheet</ModuleLink> with the semantic defaults and a replaceable
	<ModuleLink path="theme.css">theme stylesheet</ModuleLink> containing the variables used in the reset.
	There's also a <a href={resolve('/docs/classes')}>utility class system</a> for convenience and
	composition, and it <a href="https://css.fuz.dev/docs/api">exports</a> the underlying data, types,
	and helpers for more complex usage. It works with any website and JS framework, and
	<a href="https://ui.fuz.dev/">Fuz UI</a>
	integrates it with Svelte.
</p>
<p>
	See <a href={resolve('/docs')}>the docs</a>
	and <a href="https://github.com/fuzdev/fuz_css#readme">readme</a>.
</p>

<UnfinishedImplementationWarning>
	Fuz CSS is in early alpha with breaking changes ahead. Input and feedback is appreciated in the
	GitHub
	<a href="https://github.com/fuzdev/fuz_css/issues">issues</a> and
	<a href="https://github.com/fuzdev/fuz_css/discussions">discussions</a>.
</UnfinishedImplementationWarning>
