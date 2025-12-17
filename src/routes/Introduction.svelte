<script lang="ts">
	import MdnLink from '@fuzdev/fuz_ui/MdnLink.svelte';
	import {resolve} from '$app/paths';

	import ModuleLink from '$routes/ModuleLink.svelte';
	import UnfinishedImplementationWarning from '$routes/docs/UnfinishedImplementationWarning.svelte';
</script>

<p>
	Fuz CSS is a CSS framework and design system that's built around <em>style variables</em>, which
	are design tokens and <MdnLink path="Web/CSS/--*">CSS custom properties</MdnLink> with particular capabilities
	and conventions.
</p>
<p>
	Fuz CSS can be used with any website and JS framework. It exports
	<ModuleLink path="style.css">one main stylesheet</ModuleLink>
	and a replaceable <ModuleLink path="theme.css">theme stylesheet</ModuleLink>, and it also
	<a href="https://css.fuz.dev/about">exports</a> the underlying CSS data, types, and helpers for more
	complex usage.
</p>
<p>
	See <a href={resolve('/docs')}>the docs</a>
	and <a href="https://github.com/fuzdev/fuz_css#readme">readme</a>.
</p>

<UnfinishedImplementationWarning>
	Fuz CSS is in early alpha with breaking changes ahead. Your input is appreciated in the GitHub
	<a href="https://github.com/fuzdev/fuz_css/issues">issues</a> and
	<a href="https://github.com/fuzdev/fuz_css/discussions">discussions</a>.
</UnfinishedImplementationWarning>
