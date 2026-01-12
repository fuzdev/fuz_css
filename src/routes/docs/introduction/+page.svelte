<script lang="ts">
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import MdnLink from '@fuzdev/fuz_ui/MdnLink.svelte';
	import {get_tome_by_name} from '@fuzdev/fuz_ui/tome.js';
	import TomeLink from '@fuzdev/fuz_ui/TomeLink.svelte';

	import ModuleLink from '$routes/ModuleLink.svelte';
	import FileLink from '$routes/FileLink.svelte';
	import Introduction from '$routes/Introduction.svelte';

	const LIBRARY_ITEM_NAME = 'introduction';

	const tome = get_tome_by_name(LIBRARY_ITEM_NAME);
</script>

<TomeContent {tome}>
	<section>
		<Introduction />
		<p>Details:</p>
		<ul>
			<li>plain CSS</li>
			<li>minimal dependencies, all optional -- none needed if you only use the stylesheets</li>
			<li>
				exports a reset stylesheet with <TomeLink name="semantic" /> defaults that styles HTML elements,
				see <ModuleLink path="style.css" />
			</li>
			<li>
				exports a basic theme stylesheet, <ModuleLink path="theme.css" />, that can be replaced with
				your own
			</li>
			<li>
				also exports the underlying CSS data, helpers, and types, which can be used in many ways,
				including outputting an optimized utility class file
			</li>
			<li>
				uses its own concept of style variables, a specialization of CSS custom properties and
				design tokens
				<ul>
					<li>variables are the main source of truth and are used in the main stylesheet</li>
					<li>each variable provides values to light and/or dark mode</li>
					<li>includes optional utility classes that use the variables</li>
				</ul>
			</li>
			<li>themes are groups of variables</li>
			<li>
				dark mode is a first-class concept in the system, not a theme; instead, each theme can
				support light and/or dark <MdnLink path="Web/CSS/color-scheme">color-schemes</MdnLink>
			</li>
			<li>
				supports three types of utility classes
				<ul>
					<li>
						token classes: using variables, like <code>.p_md</code> and
						<code>.color_a_5</code>
					</li>
					<li>
						composite classes: arbitrary groups of rules, like <code>.box</code> and
						<code>.selectable</code>
					</li>
					<li>
						CSS-literal classes: arbitrary styles, like <code>.display:flex</code> and
						<code>.opacity:55%</code>
					</li>
				</ul>
			</li>
			<li>
				all class types support modifiers for responsive (<code>md:</code>), state (<code
					>hover:</code
				>), color-scheme (<code>dark:</code>), and pseudo-elements (<code>before:</code>) -- see
				<TomeLink name="classes" /> for the full reference
			</li>
			<li>
				is agnostic to JS frameworks, for example usage see <a href="https://ui.fuz.dev/docs/Themed"
					><code>Themed</code></a
				>
				in my Svelte UI library <a href="https://ui.fuz.dev/">Fuz UI</a>
			</li>
		</ul>
		<p>The stylesheets:</p>
		<ul>
			<li>
				<ModuleLink path="style.css" /> -- reset stylesheet with semantic defaults
			</li>
			<li>
				<ModuleLink path="theme.css" /> -- or bring your own
			</li>
			<li>
				<FileLink path="src/routes/fuz.css">src/routes/fuz.css</FileLink> -- the generated file for this
				docs website, using Fuz CSS's helpers that includes only the utility classes your code uses, generated
				by
				<a href="https://github.com/ryanatkn/gro">Gro</a> with <FileLink
					path="src/routes/fuz.gen.css.ts">src/routes/fuz.gen.css.ts</FileLink
				> using the Fuz CSS helpers in
				<ModuleLink path="gen_fuz_css.js" />. I can add a Vite plugin if there's demand.
			</li>
			<li>
				There are not yet tools for optimizing away unused variables or main stylesheet rulesets, so <code
					>style.css</code
				>
				and
				<code>theme.css</code> have some bloat, but at ~750 and ~500 lines they're not huge.
			</li>
		</ul>
		<p>
			In the docs, you'll see <code>⚠️ asides</code> with open questions and other uncertainties as
			Fuz CSS evolves towards v1. Your input is appreciated in the GitHub
			<a href="https://github.com/fuzdev/fuz_css/issues">issues</a> and
			<a href="https://github.com/fuzdev/fuz_css/discussions">discussions</a> 🌿
		</p>
	</section>
</TomeContent>
