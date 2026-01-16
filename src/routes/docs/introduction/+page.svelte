<script lang="ts">
	import Code from '@fuzdev/fuz_code/Code.svelte';
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import MdnLink from '@fuzdev/fuz_ui/MdnLink.svelte';
	import {get_tome_by_name} from '@fuzdev/fuz_ui/tome.js';
	import TomeLink from '@fuzdev/fuz_ui/TomeLink.svelte';

	import SourceFileLink from '$routes/SourceFileLink.svelte';
	import Introduction from '$routes/Introduction.svelte';

	const LIBRARY_ITEM_NAME = 'introduction';

	const tome = get_tome_by_name(LIBRARY_ITEM_NAME);
</script>

<TomeContent {tome}>
	<section>
		<Introduction />
		<TomeSection>
			<TomeSectionHeader text="Usage" />
			<Code lang={null} content="npm i -D @fuzdev/fuz_css" />
			<p>Import the two required stylesheets:</p>
			<Code
				lang="ts"
				content={`import '@fuzdev/fuz_css/style.css';
import '@fuzdev/fuz_css/theme.css'; // or bring your own`}
			/>
			<p>
				For utility classes, see the <TomeLink name="classes" /> reference which covers the Vite plugin
				and alternative Gro generator.
			</p>
		</TomeSection>
		<TomeSection>
			<TomeSectionHeader text="Details" />
			<ul>
				<li>plain CSS</li>
				<li>minimal dependencies, all optional -- none needed if you only use the stylesheets</li>
				<li>
					exports a reset stylesheet with <TomeLink name="semantic" /> defaults that styles HTML elements,
					see <SourceFileLink path="style.css" />, and also exports the underlying data, helpers, and
					types for open-ended usage
				</li>
				<li>
					supports <TomeLink name="themes" /> with a basic theme stylesheet, <SourceFileLink
						path="theme.css"
					/>, that can be replaced with your own -- dark mode is a first-class concept, not a theme;
					instead, each theme can support light and/or dark <MdnLink path="Web/CSS/color-scheme"
						>color-schemes</MdnLink
					>
				</li>
				<li>
					supports optional <TomeLink name="classes">utility classes</TomeLink> with three types (token,
					composite, CSS-literal) and modifiers for responsive, state, color-scheme, and pseudo-elements
				</li>
				<li>
					uses its own concept of style <TomeLink name="variables" />, a specialization of CSS
					custom properties and design tokens that integrate with the other systems (e.g. themes are
					groups of variables, and token classes use variables)
				</li>
				<li>
					the stylesheets work with any framework and plain HTML; utility class generation supports
					Svelte, JSX, and TypeScript/JS -- see
					<TomeLink name="classes" hash="Framework-support">framework support</TomeLink> and
					<a href="https://ui.fuz.dev/docs/Themed"><code>Themed</code></a> in
					<a href="https://ui.fuz.dev/">fuz_ui</a> for Svelte integration
				</li>
				<li>
					see the <TomeLink name="classes" hash="Compared-to-alternatives"
						>comparison to alternatives</TomeLink
					> to understand fuz_css relative to TailwindCSS and UnoCSS
				</li>
			</ul>
		</TomeSection>
	</section>
</TomeContent>
